import { EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Descriptions, Form, Input, InputNumber, message, Modal, Radio, Row, Select, Spin, Steps, Tag, Typography, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import moment from 'moment';
import React, { useState, useEffect, useMemo } from 'react';
import { fetchAllCustomers } from '../../../services/customers';
import { recordSalePayment, fetchProperties, fetchSalesByCustomer } from '../../../services/dala';

const { Text } = Typography;

interface Customer {
  _id: string;
  customer_name?: string;
  name?: string;
  email?: string;
  phone?: number;
  address?: any;
}

interface PaymentPlan {
  _id: string;
  isInitialDeposit: boolean;
  status: string;
  outstandingBalance: number;
  startDate: string;
  endDate: string;
  installmentAmount: number;
  installmentFrequency: string;
  numberOfInstallments: number;
  totalAmount: number;
  initialDeposit: number;
  paymentMethod: string;
}

interface Property {
  _id: string;
  name?: string;
  propertyName?: string;
  propertyType?: string;
}

interface UnitType {
  _id: string;
  unitType: string;
  blockId: {
    _id: string;
    name: string;
  };
  floorId: {
    _id: string;
    name: string;
    floorNumber: number;
  };
}

interface Sale {
  _id: string;
  customer?: Customer;
  property?: Property;
  property_id?: string;
  propertyName?: string;
  saleCode?: string;
  paymentPlans?: PaymentPlan[];
  unitTypeID?: UnitType;
  apartmentName?: string;
  paymentTotals?: {
    totalPaid: number;
    depositPaid: number;
    outstandingBalance: number;
    paymentPercentage: number;
  };
  deposit?: {
    amount: number;
  };
}

interface PaymentFormValues {
  customer?: string;
  selectedSale?: string;
  amount?: number;
  paymentDate?: moment.Moment | string;
  paymentMethod?: string;
  reference?: string;
  receiptNumber?: string;
  etimsRefNumber?: string;
  notes?: string;
}

interface PaymentModalProps {
  actionRef?: unknown;
  edit?: boolean;
  data?: unknown;
  editText?: string;
  salesData?: Sale[]; // Still kept for backward compatibility, but no longer used
  onSuccess?: () => void;
  visible?: boolean;
  onCancel?: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  actionRef,
  edit,
  data,
  editText,
  salesData = [],
  onSuccess,
  visible: externalVisible,
  onCancel: externalOnCancel,
}) => {
  // Silence unused parameter warnings
  void actionRef;
  void data;
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [nextPendingPlan, setNextPendingPlan] = useState<PaymentPlan | null>(null);
  const [totalOutstanding, setTotalOutstanding] = useState<number>(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [fileTypes, setFileTypes] = useState<string[]>(['receipt']);
  const [customersData, setCustomersData] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleSelectionMode, setSaleSelectionMode] = useState<'auto' | 'manual'>('auto');
  const [isModalOpen, setIsModalOpen] = useState(externalVisible || false);
  const [propertiesData, setPropertiesData] = useState<Property[]>([]);
  const [loadingCustomerSales, setLoadingCustomerSales] = useState(false);
  const [hasCheckedCustomerSales, setHasCheckedCustomerSales] = useState(false);

  // Sync internal state with external visible prop
  useEffect(() => {
    if (externalVisible !== undefined) {
      setIsModalOpen(externalVisible);
    }
  }, [externalVisible]);

  // Fetch customers and properties data only when modal opens
  useEffect(() => {
    if (isModalOpen && customersData.length === 0) {
      const fetchData = async () => {
        setLoadingCustomers(true);
        try {
          // Fetch customers
          const customersResponse = await fetchAllCustomers();
          const customers = Array.isArray(customersResponse?.data) ? customersResponse.data : Array.isArray(customersResponse) ? customersResponse : [];
          setCustomersData(customers);

          // Fetch properties
          const propertiesResponse = await fetchProperties();
          const properties = Array.isArray(propertiesResponse?.data) ? propertiesResponse.data : Array.isArray(propertiesResponse) ? propertiesResponse : [];
          setPropertiesData(properties);
        } catch (error) {
          console.error('Error fetching data:', error);
          message.error('Failed to load data');
          setCustomersData([]);
          setPropertiesData([]);
        } finally {
          setLoadingCustomers(false);
        }
      };

      fetchData();
    }
  }, [isModalOpen, customersData.length]);

  // Handle customer selection and find next pending installment
  const handleCustomerChange = async (customerId: string) => {
    const customer = customersData.find((c: Customer) => c._id === customerId);
    const isNewCustomer = selectedCustomer?._id !== customerId;
    
    setSelectedCustomer(customer || null);
    setNextPendingPlan(null);
    setTotalOutstanding(0);
    setSelectedSale(null);
    
    // Only reset to auto mode if it's a new customer selection
    if (isNewCustomer) {
      setSaleSelectionMode('auto');
    }
    
    setHasCheckedCustomerSales(false);
    setLoadingCustomerSales(true);

    if (customer) {
      try {
        console.log('🔍 Fetching sales for customer:', customerId);
        console.log('🔍 Current salesData prop length:', salesData.length);
        
        // Fetch sales specifically for this customer
        const salesResponse = await fetchSalesByCustomer(customerId);
        console.log('🔍 API Response:', salesResponse);
        
        const customerSales = Array.isArray(salesResponse?.data) ? salesResponse.data : Array.isArray(salesResponse) ? salesResponse : [];
        
        console.log('� Customer sales fetched:', customerSales.length);
        console.log('📋 Customer sales data:', JSON.stringify(customerSales, null, 2));
        
        setCustomerSales(customerSales);
        setHasCheckedCustomerSales(true);

      // Auto-select mode: collect all payment plans across all sales
      const allPlans: PaymentPlan[] = [];

      for (const sale of customerSales) {
        const plans = calculatePaymentPlans(sale, customer);
        allPlans.push(...plans);
      }

      // Sort by start date to find the first pending
      allPlans.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      // Calculate total outstanding
      const total = allPlans.reduce((sum, plan) => sum + (plan.outstandingBalance || 0), 0);
      setTotalOutstanding(total);

      // Find first pending plan
      const firstPending = allPlans.length > 0 ? allPlans[0] : null;
      setNextPendingPlan(firstPending);

      console.log('Next pending installment:', firstPending);
      console.log('Total outstanding:', total);

      // Reset amount field
      form.setFieldsValue({ amount: undefined });
      } catch (error) {
        console.error('❌ Error fetching customer sales:', error);
        message.error('Failed to load customer sales');
        setCustomerSales([]);
        setHasCheckedCustomerSales(true);
      } finally {
        setLoadingCustomerSales(false);
      }
    } else {
      console.log('❌ No customer selected');
      setCustomerSales([]);
      setHasCheckedCustomerSales(true);
      setLoadingCustomerSales(false);
    }
  };

  // Handle sale selection in manual mode
  const handleSaleChange = (saleId: string) => {
    const sale = customerSales.find((s: Sale) => s._id === saleId);
    setSelectedSale(sale || null);

    if (sale && selectedCustomer) {
      const salePlans = calculatePaymentPlans(sale, selectedCustomer);

      // Sort by start date
      salePlans.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      // Calculate total outstanding for this sale
      const saleTotal = salePlans.reduce((sum, plan) => sum + (plan.outstandingBalance || 0), 0);
      setTotalOutstanding(saleTotal);

      // Find first pending plan for this sale
      const firstPending = salePlans.length > 0 ? salePlans[0] : null;
      setNextPendingPlan(firstPending);

      form.setFieldsValue({ amount: undefined });
    } else {
      setNextPendingPlan(null);
      setTotalOutstanding(0);
    }
  };

  // Helper function to calculate payment plans for a sale
  const calculatePaymentPlans = (sale: Sale, customer: Customer): PaymentPlan[] => {
    const plans: PaymentPlan[] = [];
    
    // Use paymentTotals if available for accurate balance information
    const totalOutstanding = sale.paymentTotals?.outstandingBalance || 0;
    const depositPaid = sale.deposit?.amount || sale.paymentTotals?.depositPaid || 0;
    const depositRequired = sale.paymentPlans?.[0]?.initialDeposit || 0;
    
    // Only add deposit plan if there's an unpaid deposit
    if (depositRequired > 0 && depositPaid < depositRequired) {
      plans.push({
        _id: `deposit-${sale._id}`,
        isInitialDeposit: true,
        status: 'active',
        outstandingBalance: depositRequired - depositPaid,
        startDate: sale.saleDate || new Date().toISOString(),
        endDate: sale.saleDate || new Date().toISOString(),
        installmentAmount: depositRequired - depositPaid,
        installmentFrequency: 'once',
        numberOfInstallments: 1,
        totalAmount: depositRequired,
        initialDeposit: depositRequired,
        paymentMethod: 'mpesa',
        saleName: getPropertyName(sale),
        saleCode: sale.saleCode || 'N/A',
        saleId: sale._id,
        propertyId: getPropertyId(sale),
        unitId: sale.unitTypeID?._id,
        customerId: customer._id,
      });
    }

    // Only add installment plans if there's an outstanding balance
    if (totalOutstanding > 0 && sale.paymentPlans && Array.isArray(sale.paymentPlans)) {
      // Find the next pending installment based on dates
      const pendingPlans = sale.paymentPlans
        .filter(plan => !plan.isInitialDeposit && plan.status !== 'completed')
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      
      if (pendingPlans.length > 0) {
        // Add only the next pending plan with the actual outstanding balance
        const nextPlan = pendingPlans[0];
        plans.push({
          ...nextPlan,
          outstandingBalance: totalOutstanding, // Use the actual outstanding balance from paymentTotals
          saleName: getPropertyName(sale),
          saleCode: sale.saleCode || 'N/A',
          saleId: sale._id,
          propertyId: getPropertyId(sale),
          unitId: sale.unitTypeID?._id,
          customerId: customer._id,
        });
      }
    }
    
    return plans;
  };

  // Calculate sale totals for display - memoized for performance
  const getSaleTotals = useMemo(() => {
    return (sale: Sale) => {
      // Use paymentTotals if available, otherwise calculate from paymentPlans
      if (sale.paymentTotals) {
        return {
          total: sale.paymentTotals.salePrice || sale.salePrice || 0,
          balance: sale.paymentTotals.outstandingBalance || 0,
          paid: sale.paymentTotals.totalPaid || 0,
          percentage: sale.paymentTotals.paymentPercentage || 0
        };
      }

      if (!sale.paymentPlans || !Array.isArray(sale.paymentPlans)) {
        return { total: 0, balance: 0, paid: 0, percentage: 0 };
      }

      let total = 0;
      let balance = 0;

      for (const plan of sale.paymentPlans) {
        total += plan.outstandingBalance || 0;
        if (plan.status !== 'completed' && !plan.isInitialDeposit) {
          balance += plan.outstandingBalance || 0;
        }
      }

      return { total, balance, paid: 0, percentage: 0 };
    };
  }, []);

  // Helper function to get property name from sale
  const getPropertyName = (sale: Sale): string => {
    // First try direct fields on sale
    if (sale.property?.name) return sale.property.name;
    if (sale.propertyName) return sale.propertyName;
    if (sale.property?.propertyName) return sale.property?.propertyName;

    // If not found, look up in propertiesData by property ID
    const propertyId = getPropertyId(sale);
    if (propertyId && propertiesData.length > 0) {
      const property = propertiesData.find((p: Property) => p._id === propertyId);
      if (property?.name) return property.name;
      if (property?.propertyName) return property.propertyName;
    }

    // Try to construct from unit type info
    if (sale.unitTypeID?.blockId?.name && sale.unitTypeID?.floorId?.name) {
      return `${sale.unitTypeID.blockId.name} - ${sale.unitTypeID.floorId.name}`;
    }

    return 'Unnamed Property';
  };

  // Helper function to get property ID from sale
  const getPropertyId = (sale: Sale): string | undefined => {
    return sale.property?._id || sale.property_id || sale.property?.property_id;
  };

  const handleFinish = async (values: PaymentFormValues) => {
    try {
      console.log('🎯 Form values received:', values);

      // Validate that we have a selected customer
      if (!selectedCustomer) {
        message.error('Please select a customer');
        return false;
      }

      if (!nextPendingPlan) {
        message.error('No pending installments found for this customer');
        return false;
      }

      // Properly extract files from fileList
      const files: File[] = [];
      fileList.forEach((file) => {
        if (file.originFileObj) {
          files.push(file.originFileObj);
        }
      });

      // Format the payment data for API
      const paymentData = {
        saleId: nextPendingPlan.saleId,
        paymentPlanId: nextPendingPlan._id.startsWith('deposit-') ? undefined : nextPendingPlan._id,
        customerId: selectedCustomer._id,
        propertyId: nextPendingPlan.propertyId,
        unitId: nextPendingPlan.unitId,
        paymentDate: values?.paymentDate
          ? (moment.isMoment(values.paymentDate) ? values.paymentDate.format('YYYY-MM-DD') : moment(values.paymentDate).format('YYYY-MM-DD'))
          : moment().format('YYYY-MM-DD'),
        amount: values.amount || 0,
        paymentMethod: values.paymentMethod || 'mpesa',
        paymentType: nextPendingPlan.isInitialDeposit ? 'Property_Reservation' : 'Property_Installment',
        reference: values.reference || '',
        receiptNumber: values.receiptNumber || '',
        etimsRefNumber: values.etimsRefNumber || '',
        notes: values.notes || `Payment for ${nextPendingPlan.saleName} - ${nextPendingPlan.saleCode}`,
        attachments: files,
        shop_id: localStorage.getItem("shopId"),
      };

      console.log('📝 Calling API with payment data:', paymentData);

      // Call the API to record the payment
      await recordSalePayment(paymentData);

      // Reset file list
      setFileList([]);
      setFileTypes(['receipt']);

      // Call onSuccess callback to refresh data
      if (onSuccess) {
        onSuccess();
      }

      return true;
    } catch (error) {
      console.error('❌ Error in handleFinish:', error);
      message.error('Failed to create payment');
      return false;
    }
  };

  // Handle file upload
  const handleFileChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    console.log('📎 File list changed:', newFileList);
    setFileList(newFileList);
  };

  // Validate file before upload
  const beforeUpload = (file: File) => {
    const isValidType = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'].includes(file.type);
    if (!isValidType) {
      message.error(`${file.name} is not a valid file type. Only JPG/PNG/WEBP/PDF files are allowed!`);
      return Upload.LIST_IGNORE;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error(`${file.name} is too large. File must be smaller than 10MB!`);
      return Upload.LIST_IGNORE;
    }

    console.log(`✅ File validated: ${file.name}`);
    return false; // Prevent auto upload
  };

  // Step navigation functions
  const goToStep1 = () => setCurrentStep(0);
  const goToStep2 = async () => {
    try {
      await form.validateFields(['customer']);
      if (!selectedCustomer) {
        message.error('Please select a customer');
        return;
      }
      
      // If manual mode, validate sale selection
      if (saleSelectionMode === 'manual' && customerSales.length > 0) {
        await form.validateFields(['selectedSale']);
        if (!selectedSale) {
          message.error('Please select a sale');
          return;
        }
      }
      
      if (!nextPendingPlan) {
        message.error('No pending installments found for this customer');
        return;
      }
      setCurrentStep(1);
    } catch {
      message.error('Please complete all required fields before continuing');
    }
  };
  const goToStep3 = async () => {
    try {
      await form.validateFields(['amount', 'paymentDate', 'paymentMethod']);
      setCurrentStep(2);
    } catch {
      message.error('Please fill in all required payment details before continuing');
    }
  };

  const steps = [
    {
      title: 'Customer Selection',
      description: 'Select customer & view pending payments',
    },
    {
      title: 'Payment Details',
      description: 'Amount, date & payment method',
    },
    {
      title: 'Supporting Documents',
      description: 'Attachments & notes',
    },
  ];

  return (
    <>
      {edit ? (
        <Button key="button" icon={<EditOutlined />} size="small">
          {editText || 'Edit'}
        </Button>
      ) : (
        <Button type="primary" key="button" icon={<PlusOutlined />} onClick={() => {
          form.resetFields();
          form.setFieldsValue({ paymentDate: moment(), paymentMethod: 'mpesa' });
          setIsModalOpen(true);
          if (externalOnCancel) {
            // Don't call onCancel here since we're opening the modal
          }
        }}>
          Add New
        </Button>
      )}
      <Modal
        title="Record New Payment"
        open={isModalOpen}
        onCancel={() => {
          form.resetFields();
          setFileList([]);
          setSelectedCustomer(null);
          setNextPendingPlan(null);
          setTotalOutstanding(0);
          setCurrentStep(0);
          setSelectedSale(null);
          setCustomerSales([]);
          setSaleSelectionMode('auto');
          setHasCheckedCustomerSales(false);
          setLoadingCustomerSales(false);
          setIsModalOpen(false);
          if (externalOnCancel) {
            externalOnCancel();
          }
        }}
        width={1000}
        footer={null}
        destroyOnClose
        centered
        maskClosable={false}
      >
        <div style={{ padding: '24px 0' }}>
          <Row gutter={24}>
            <Col span={6}>
              <Steps
                current={currentStep}
                direction="vertical"
                size="small"
                items={steps}
              />
            </Col>
            <Col span={18}>
              <Form form={form} layout="vertical" initialValues={{
                paymentDate: moment(),
                paymentMethod: 'mpesa',
              }}>
                {/* Step 1: Customer Selection */}
                <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
                  <Form.Item
                    label="Customer"
                    name="customer"
                    rules={[{ required: true, message: 'Please select a customer' }]}
                  >
                    <Select
                      placeholder="Select customer"
                      onChange={handleCustomerChange}
                      showSearch
                      loading={loadingCustomers}
                      filterOption={(input: string, option: { label?: string } | undefined) =>
                        (option?.label ?? '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      options={customersData.map((customer: Customer) => ({
                        label: `${customer.customer_name || customer.name} ${customer.email ? `(${customer.email})` : ''}`,
                        value: customer._id,
                      }))}
                    />
                  </Form.Item>

                  {selectedCustomer && customerSales.length >= 1 && (
                    <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f9f9f9' }}>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        Payment Selection Mode
                      </Text>
                      <Radio.Group
                        value={saleSelectionMode}
                        onChange={(e) => {
                          const newMode = e.target.value;
                          setSaleSelectionMode(newMode);
                          setSelectedSale(null);
                          
                          // Recalculate payment plans based on mode
                          if (selectedCustomer && customerSales.length > 0) {
                            if (newMode === 'auto') {
                              // Auto mode: collect all payment plans across all sales
                              const allPlans: PaymentPlan[] = [];
                              
                              for (const sale of customerSales) {
                                const plans = calculatePaymentPlans(sale, selectedCustomer);
                                allPlans.push(...plans);
                              }

                              allPlans.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
                              const total = allPlans.reduce((sum, plan) => sum + (plan.outstandingBalance || 0), 0);
                              setTotalOutstanding(total);
                              const firstPending = allPlans.length > 0 ? allPlans[0] : null;
                              setNextPendingPlan(firstPending);
                            } else {
                              // Manual mode: clear the payment plan until a sale is selected
                              setNextPendingPlan(null);
                              setTotalOutstanding(0);
                            }
                          }
                        }}
                      >
                        <Radio value="auto">
                          <Text>Auto-select (apply to earliest due payment across all sales)</Text>
                        </Radio>
                        <Radio value="manual">
                          <Text>Select specific sale</Text>
                        </Radio>
                      </Radio.Group>
                    </Card>
                  )}

                  {saleSelectionMode === 'manual' && selectedCustomer && customerSales.length > 0 && (
                    <Form.Item
                      label="Select Sale"
                      name="selectedSale"
                      rules={[{ required: true, message: 'Please select a sale' }]}
                    >
                      <Select
                        placeholder="Select sale to make payment for"
                        onChange={handleSaleChange}
                        showSearch
                        filterOption={(input: string, option: { label?: string } | undefined) =>
                          (option?.label ?? '')
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                      >
                        {customerSales.map((sale: Sale) => {
                          const { balance, percentage } = getSaleTotals(sale);
                          return (
                            <Select.Option key={sale._id} value={sale._id}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                width: '100%',
                                minHeight: '40px'
                              }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div>
                                    <Text strong>{getPropertyName(sale)}</Text>
                                    {sale.apartmentName && (
                                      <Text type="secondary" style={{ marginLeft: 8 }}>
                                        {sale.apartmentName}
                                      </Text>
                                    )}
                                  </div>
                                  <div>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                      {sale.saleCode || 'N/A'}
                                    </Text>
                                  </div>
                                </div>
                                <div style={{ 
                                  textAlign: 'right', 
                                  marginLeft: 12,
                                  flexShrink: 0 
                                }}>
                                  <div>
                                    <Text strong style={{ color: '#1890ff' }}>
                                      KES {balance.toLocaleString()}
                                    </Text>
                                  </div>
                                  <div>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                      {percentage.toFixed(1)}% due
                                    </Text>
                                  </div>
                                </div>
                              </div>
                            </Select.Option>
                          );
                        })}
                      </Select>
                    </Form.Item>
                  )}

                  {nextPendingPlan && (saleSelectionMode === 'auto' || (saleSelectionMode === 'manual' && selectedSale)) && (
                    <Card
                      size="small"
                      title={
                        <Text strong style={{ fontSize: 16 }}>
                          {saleSelectionMode === 'manual' ? 'Selected Sale Payment' : 'Next Payment Due'}
                        </Text>
                      }
                      style={{ marginBottom: 16, backgroundColor: '#f0f5ff', borderColor: '#1890ff' }}
                    >
                      <Descriptions column={2} size="small">
                        <Descriptions.Item label="Property">
                          <Text strong>{nextPendingPlan.saleName}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Sale Code">
                          {nextPendingPlan.saleCode}
                        </Descriptions.Item>
                        <Descriptions.Item label="Amount Due">
                          <Text strong style={{ color: '#1890ff', fontSize: 16 }}>
                            KES {nextPendingPlan.outstandingBalance?.toLocaleString() || '0'}
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Payment Type">
                          <Tag color={nextPendingPlan.isInitialDeposit ? 'orange' : 'blue'}>
                            {nextPendingPlan.isInitialDeposit ? 'DEPOSIT' : 'INSTALLMENT'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Due Date">
                          {new Date(nextPendingPlan.startDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Descriptions.Item>
                        <Descriptions.Item label="Status">
                          <Tag color={nextPendingPlan.status === 'active' ? 'blue' : 'orange'}>
                            {nextPendingPlan.status?.toUpperCase()}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Total Outstanding">
                          <Text type="secondary">
                            {saleSelectionMode === 'manual' ? 'Sale Balance: ' : 'Total: '}
                            KES {totalOutstanding.toLocaleString()}
                          </Text>
                        </Descriptions.Item>
                      </Descriptions>

                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                        💡 <Text italic>
                          {saleSelectionMode === 'manual' 
                            ? 'Payment will be applied to this specific sale. Any overpayment will cascade to the next installment within this sale.'
                            : 'Payments are applied sequentially across all sales. Any overpayment will automatically cascade to the next installment.'}
                        </Text>
                      </Text>
                    </Card>
                  )}

                  {!nextPendingPlan && selectedCustomer && hasCheckedCustomerSales && !loadingCustomerSales && (
                    <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed', borderColor: '#52c41a' }}>
                      <Text type="success" strong>
                        {saleSelectionMode === 'manual' && !selectedSale 
                          ? '👆 Please select a sale above to view pending payments' 
                          : '✅ All installments are fully paid! No pending payments for this customer.'}
                      </Text>
                    </Card>
                  )}

                  {loadingCustomerSales && selectedCustomer && (
                    <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f0f5ff', borderColor: '#1890ff' }}>
                      <Text type="secondary">
                        <Spin size="small" style={{ marginRight: 8 }} />
                        Loading customer sales...
                      </Text>
                    </Card>
                  )}

                  <div style={{ marginTop: 24, textAlign: 'right' }}>
                    <Button 
                      type="primary" 
                      onClick={goToStep2} 
                      disabled={
                        !selectedCustomer || 
                        (saleSelectionMode === 'auto' && !nextPendingPlan) ||
                        (saleSelectionMode === 'manual' && (!selectedSale || !nextPendingPlan))
                      }
                    >
                      Next: Payment Details
                    </Button>
                  </div>
                </div>

                {/* Step 2: Payment Details */}
                <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="Payment Amount (KES)"
                        name="amount"
                        rules={[
                          { required: true, message: 'Please enter payment amount' },
                          {
                            type: 'number',
                            min: 1,
                            message: 'Amount must be greater than 0',
                          },
                          {
                            validator: async (_, value) => {
                              if (value && totalOutstanding && value > totalOutstanding) {
                                throw new Error(
                                  `Amount cannot exceed total outstanding (KES ${totalOutstanding.toLocaleString()})` 
                                );
                              }
                            },
                          },
                        ]}
                        extra={
                          nextPendingPlan && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Max: KES {totalOutstanding.toLocaleString()}
                            </Text>
                          )
                        }
                      >
                        <InputNumber
                          min={1}
                          max={totalOutstanding || undefined}
                          precision={0}
                          step={1000}
                          formatter={(value) =>
                            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                          }
                          parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as unknown as number}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="Payment Date"
                        name="paymentDate"
                        rules={[{ required: true, message: 'Please select payment date' }]}
                      >
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="Payment Method"
                        name="paymentMethod"
                        rules={[{ required: true, message: 'Please select payment method' }]}
                      >
                        <Select
                          options={[
                            { label: 'M-Pesa', value: 'mpesa' },
                            { label: 'Bank Transfer', value: 'bank_transfer' },
                            { label: 'Cash', value: 'Cash' },
                            { label: 'Cheque', value: 'cheque' },
                            { label: 'Card', value: 'card' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="Reference Number (Optional)"
                        name="reference"
                      >
                        <Input placeholder="e.g., Transaction ID, Check number" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        label="eTIMS Reference (Optional)"
                        name="etimsRefNumber"
                        tooltip="Kenya Revenue Authority (KRA) eTIMS reference number for tax compliance"
                      >
                        <Input placeholder="e.g., ETIMS-2026-001234" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <div style={{ marginTop: 24, textAlign: 'right' }}>
                    <Button onClick={goToStep1} style={{ marginRight: 8 }}>
                      Back
                    </Button>
                    <Button type="primary" onClick={goToStep3}>
                      Next: Supporting Documents
                    </Button>
                  </div>
                </div>

                {/* Step 3: Supporting Documents */}
                <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Document Types">
                        <Select
                          mode="multiple"
                          value={fileTypes}
                          onChange={(value) => {
                            console.log('📋 Document types changed to:', value);
                            setFileTypes(value || []);
                          }}
                          placeholder="Select document types"
                          options={[
                            { label: 'Receipt', value: 'receipt' },
                            { label: 'Cheque', value: 'cheque' },
                            { label: 'Bank Slip', value: 'bank_slip' },
                            { label: 'M-Pesa Confirmation', value: 'mpesa_confirmation' },
                            { label: 'Invoice', value: 'invoice' },
                            { label: 'Other', value: 'other' },
                          ]}
                        />
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                          Select all applicable document types you're uploading
                        </Text>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Attachments">
                        <Upload
                          fileList={fileList}
                          onChange={handleFileChange}
                          beforeUpload={beforeUpload}
                          accept=".jpg,.jpeg,.png,.pdf,.webp"
                          multiple
                          listType="picture"
                        >
                          <Button icon={<UploadOutlined />}>
                            Select Multiple Files
                          </Button>
                        </Upload>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                          Supported: JPG, PNG, WEBP, PDF (Max 10MB per file) - Upload multiple documents at once
                        </Text>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label="Notes (Optional)"
                    name="notes"
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="Add any additional notes about this payment"
                    />
                  </Form.Item>

                  <div style={{ marginTop: 24, textAlign: 'right' }}>
                    <Button onClick={goToStep2} style={{ marginRight: 8 }}>
                      Back
                    </Button>
                    <Button 
                      type="primary" 
                      onClick={async () => {
                        try {
                          const values = await form.validateFields();
                          const success = await handleFinish(values);
                          if (success) {
                            form.resetFields();
                            setFileList([]);
                            setSelectedCustomer(null);
                            setNextPendingPlan(null);
                            setTotalOutstanding(0);
                            setCurrentStep(0);
                            setSelectedSale(null);
                            setCustomerSales([]);
                            setSaleSelectionMode('auto');
                            setIsModalOpen(false);
                            if (externalOnCancel) {
                              externalOnCancel();
                            }
                          }
                        } catch (error) {
                          console.error('Form validation failed:', error);
                        }
                      }}
                    >
                      Submit Payment
                    </Button>
                  </div>
                </div>
              </Form>
            </Col>
          </Row>
        </div>
      </Modal>
    </>
  );
};

export default PaymentModal;
