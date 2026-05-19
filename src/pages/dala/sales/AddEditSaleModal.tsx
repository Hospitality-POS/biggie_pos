import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Steps,
  Row,
  Col,
  Card,
  message,
  DatePicker,
  Divider,
  Space,
  Alert,
  Upload,
  Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { fetchAllCustomers } from '@services/customers';
import { fetchAllUsersList } from '@services/users';
import dayjs from 'dayjs';
import type { UploadFile } from 'antd/es/upload/interface';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface AddEditSaleModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  edit?: boolean;
  initialData?: any;
  properties?: any[];
  propertiesLoading?: boolean;
}

interface Installment {
  key: string;
  amount: number;
  dueDate: string;
}

const AddEditSaleModal: React.FC<AddEditSaleModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  edit = false,
  initialData,
  properties = [],
  propertiesLoading = false,
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [availableApartments, setAvailableApartments] = useState<any[]>([]);

  // Payment plan state
  const [paymentFrequency, setPaymentFrequency] = useState<string>('monthly');
  const [numberOfMonths, setNumberOfMonths] = useState<number>(2);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [showInstallmentGenerator, setShowInstallmentGenerator] = useState<boolean>(false);

  // Initial payment state
  const [initialPaymentType, setInitialPaymentType] = useState<string>('booking_fee');
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Filter properties to only show sale properties
  const saleProperties = properties.filter((p: any) => {
    const purpose = String(p.purpose || '').toLowerCase();
    return purpose === 'sale' || purpose === 'mixed';
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchAllCustomers({}),
    enabled: visible,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchAllUsersList({}),
    enabled: visible,
  });

  console.log('my customers', customers);

  useEffect(() => {
    if (visible) {
      if (edit && initialData) {
        form.setFieldsValue({
          property_id: initialData.property_id,
          unit_id: initialData.unit_id,
          apartment_id: initialData.apartment_id,
          client_id: initialData.client_id,
          sale_date: initialData.sale_date ? dayjs(initialData.sale_date) : dayjs(),
          sale_price: initialData.sale_price,
          list_price: initialData.list_price || initialData.sale_price,
          discount: initialData.discount || 0,
          payment_plan: initialData.payment_plan || 'full_payment',
          initial_payment_type: initialData.initial_payment_type || 'booking_fee',
          initial_payment: initialData.initial_payment || 5000,
          payment_date: initialData.payment_date ? dayjs(initialData.payment_date) : dayjs(),
          payment_method: initialData.payment_method,
          commission_rate: initialData.commission_rate || 0,
          status: initialData.status || 'pending',
          salesAgent: initialData.salesAgent,
          propertyManager: initialData.propertyManager,
          notes: initialData.notes || '',
        });
        setSelectedPropertyId(initialData.property_id);
        // Restore installments if they exist
        if (initialData.installments) {
          setInstallments(initialData.installments);
        }
      } else {
        form.resetFields();
        form.setFieldsValue({
          initial_payment_type: 'booking_fee',
          initial_payment: 5000,
          payment_plan: 'full_payment',
          commission_rate: 5,
          status: 'pending',
        });
        setSelectedPropertyId(null);
        setInstallments([]);
      }
      setCurrentStep(0);
    }
  }, [visible, edit, initialData, form]);

  const goToStep2 = async () => {
    try {
      await form.validateFields(['property_id', 'unit_id', 'client_id', 'sale_date', 'sale_price']);
      setCurrentStep(1);
    } catch {
      message.error('Please fill in all required fields before continuing');
    }
  };

  const goToStep1 = () => setCurrentStep(0);

  const handlePropertyChange = (value: string) => {
    const property = properties.find((p: any) => p._id === value);
    setSelectedProperty(property);
    setSelectedPropertyId(value);
    setSelectedUnit(null);
    setAvailableApartments([]);
    form.setFieldsValue({
      unit_id: undefined,
      apartment_id: undefined,
      list_price: undefined,
      sale_price: undefined,
      discount: 0,
    });
  };

  const handleUnitChange = (value: string) => {
    const property = properties.find((p: any) => p._id === selectedPropertyId);
    const unit = property?.units?.find((u: any) => u._id === value);
    setSelectedUnit(unit);

    if (unit?.trackIndividualUnits && unit.apartments) {
      const available = unit.apartments.filter((apt: any) => apt.status === 'available');
      setAvailableApartments(available);
    } else {
      setAvailableApartments([]);
    }

    // Set price based on current phase
    const currentPhase = property?.currentPhase;
    const phasePricing = unit?.phasePricing?.find((p: any) => p.phaseName === currentPhase?.name);
    const price = phasePricing?.price || unit?.listPrice || unit?.pricing?.basePrice || 0;

    form.setFieldsValue({
      list_price: price,
      sale_price: price,
      discount: 0,
    });
  };

  const handleApartmentChange = (value: string) => {
    const apartment = availableApartments.find((apt: any) => apt._id === value);
    if (apartment) {
      form.setFieldsValue({
        sale_price: apartment.saleListPrice,
      });
    }
  };

  const handlePaymentPlanChange = (value: string) => {
    setShowInstallmentGenerator(value !== 'full_payment');
    if (value === 'full_payment') {
      setInstallments([]);
    }
  };

  const handleInitialPaymentTypeChange = (value: string) => {
    setInitialPaymentType(value);
    if (value === 'booking_fee') {
      form.setFieldsValue({ initial_payment: 5000 });
    } else {
      form.setFieldsValue({ initial_payment: undefined });
    }
  };

  const handleDiscountChange = (value: number | null) => {
    const listPrice = form.getFieldValue('list_price') || 0;
    const salePrice = listPrice - (value || 0);
    form.setFieldsValue({ sale_price: salePrice > 0 ? salePrice : 0 });
  };

  const handleSalePriceChange = (value: number | null) => {
    const listPrice = form.getFieldValue('list_price') || 0;
    const discount = listPrice - (value || 0);
    form.setFieldsValue({ discount: discount > 0 ? discount : 0 });
  };

  const calculatePaymentPlanDetails = () => {
    const salePrice = form.getFieldValue('sale_price') || 0;
    const discount = form.getFieldValue('discount') || 0;
    const initialPayment = form.getFieldValue('initial_payment') || 0;

    const totalAfterDiscount = salePrice;
    const toFinance = totalAfterDiscount - initialPayment;
    const monthlyPayment = numberOfMonths > 0 ? toFinance / numberOfMonths : 0;

    return {
      totalAfterDiscount,
      initialPayment,
      toFinance,
      monthlyPayment,
    };
  };

  const generateInstallmentSchedule = () => {
    const { toFinance, monthlyPayment } = calculatePaymentPlanDetails();
    const startDate = form.getFieldValue('payment_date') || dayjs();

    if (toFinance <= 0 || numberOfMonths <= 0) {
      message.warning('Please enter valid payment details');
      return;
    }

    const newInstallments: Installment[] = [];
    const frequencyMonths = {
      weekly: 0.25,
      biweekly: 0.5,
      monthly: 1,
      quarterly: 3,
      biannually: 6,
      annually: 12,
    };

    const monthIncrement = frequencyMonths[paymentFrequency as keyof typeof frequencyMonths] || 1;

    for (let i = 0; i < numberOfMonths; i++) {
      const dueDate = dayjs(startDate).add(i * monthIncrement, 'months');
      newInstallments.push({
        key: `installment-${Date.now()}-${i}`,
        amount: Math.round(monthlyPayment),
        dueDate: dueDate.format('YYYY-MM-DD'),
      });
    }

    setInstallments(newInstallments);
    message.success(`Generated ${numberOfMonths} installments`);
  };

  const addInstallmentManually = () => {
    const newInstallment: Installment = {
      key: `installment-${Date.now()}`,
      amount: 0,
      dueDate: dayjs().format('YYYY-MM-DD'),
    };
    setInstallments([...installments, newInstallment]);
  };

  const updateInstallmentAmount = (key: string, amount: number) => {
    setInstallments(installments.map((inst) => (inst.key === key ? { ...inst, amount } : inst)));
  };

  const updateInstallmentDueDate = (key: string, dueDate: string) => {
    setInstallments(installments.map((inst) => (inst.key === key ? { ...inst, dueDate } : inst)));
  };

  const removeInstallment = (key: string) => {
    setInstallments(installments.filter((inst) => inst.key !== key));
  };

  const handleFileChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList);
  };

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
    return false;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Validate apartment selection for units with individual tracking
      if (selectedUnit?.trackIndividualUnits && !values.apartment_id) {
        message.error('Please select an apartment for this unit');
        return false;
      }

      // Validate installments if payment plan is not full payment
      if (values.payment_plan !== 'full_payment' && installments.length === 0) {
        message.error('Please generate installment schedule or add installments manually');
        return false;
      }

      // Find selected apartment details
      let apartmentName = undefined;
      if (values.apartment_id && selectedUnit?.apartments) {
        const apartment = selectedUnit.apartments.find((apt: any) => apt._id === values.apartment_id);
        apartmentName = apartment?.apartmentName;
      }

      const formattedValues = {
        ...values,
        sale_date: values.sale_date.format('YYYY-MM-DD'),
        payment_date: values.payment_date ? values.payment_date.format('YYYY-MM-DD') : undefined,
        apartment_id: values.apartment_id || undefined,
        apartment_name: apartmentName,
        installments: values.payment_plan !== 'full_payment' ? installments : [],
        commission_amount: (values.sale_price * (values.commission_rate || 0)) / 100,
        paymentPlanType: values.payment_plan,
        salesAgent: values.salesAgent,
        propertyManager: values.propertyManager,
      };
      
      onSubmit(formattedValues);
      return true;
    } catch (error) {
      message.error('Please check all fields');
      return false;
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setCurrentStep(0);
    setInstallments([]);
    setFileList([]);
    onCancel();
  };

  const getUnitsForProperty = (propertyId: string) => {
    const property = properties.find((p: any) => p._id === propertyId);
    if (!property) return [];
    return property.units || [];
  };

  const formatUnitLabel = (unit: any) => {
    const type = unit.unitType || unit.type || 'Unit';
    const typeLabel = type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    const price = unit.listPrice || unit.pricing?.basePrice || 0;
    const formattedPrice = price.toLocaleString('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    });
    const trackingLabel = unit.trackIndividualUnits ? ` [${unit.apartments?.length || 0} apartments]` : '';
    return `${typeLabel} - ${formattedPrice} (${unit.availableUnits || 1} available)${trackingLabel}`;
  };

  const steps = [
    {
      title: 'Sale Details',
      description: 'Property, unit & client info',
    },
    {
      title: 'Payment Details',
      description: 'Payment plan & installments',
    },
    {
      title: 'Terms & Submit',
      description: 'Commission & notes',
    },
  ];

  const paymentDetails = calculatePaymentPlanDetails();

  return (
    <Modal
      title={edit ? 'Edit Sale' : 'New Sale'}
      open={visible}
      onCancel={handleCancel}
      width={1000}
      footer={null}
      destroyOnClose
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
            {/* Step 1: Sale Details */}
            <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
              <Form form={form} layout="vertical">
                <Form.Item
                  label="Property"
                  name="property_id"
                  rules={[{ required: true, message: 'Please select a property' }]}
                >
                  <Select
                    placeholder="Select property"
                    onChange={handlePropertyChange}
                    showSearch
                    loading={propertiesLoading}
                    disabled={propertiesLoading}
                    notFoundContent={propertiesLoading ? 'Loading properties...' : 'No sale properties found'}
                    filterOption={(input, option) =>
                      (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {saleProperties.map((property: any) => (
                      <Option key={property._id} value={property._id}>
                        {property.name} - {property.propertyType}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Unit"
                  name="unit_id"
                  rules={[{ required: true, message: 'Please select a unit' }]}
                >
                  <Select
                    placeholder="Select unit"
                    disabled={!selectedPropertyId}
                    onChange={handleUnitChange}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {getUnitsForProperty(selectedPropertyId || '').map((unit: any) => (
                      <Option key={unit._id} value={unit._id}>
                        {formatUnitLabel(unit)}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {selectedUnit?.trackIndividualUnits && availableApartments.length > 0 && (
                  <Form.Item
                    label="Apartment"
                    name="apartment_id"
                    rules={[{ required: true, message: 'Please select an apartment' }]}
                  >
                    <Select
                      placeholder="Select apartment"
                      onChange={handleApartmentChange}
                      showSearch
                    >
                      {availableApartments.map((apt: any) => (
                        <Option key={apt._id} value={apt._id}>
                          {apt.apartmentName} - {apt.area?.value} {apt.area?.unit}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}

                {selectedUnit?.trackIndividualUnits && (
                  <Alert
                    message="Individual Apartment Tracking"
                    description={`This unit tracks individual apartments. ${availableApartments.length} apartments available.`}
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}

                <Form.Item
                  label="Client"
                  name="client_id"
                  rules={[{ required: true, message: 'Please select a client' }]}
                >
                  <Select
                    placeholder="Select client"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {customers?.map((customer: any) => (
                      <Option key={customer._id} value={customer._id}>
                        {customer.name || customer.customer_name} - {customer.email || customer.phone}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      label="List Price (KES)"
                      name="list_price"
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        disabled
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value: string) => value!.replace(/\$\s?|(,*)/g, '')}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="Sale Price (KES)"
                      name="sale_price"
                      rules={[{ required: true, message: 'Please enter sale price' }]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value: string) => value!.replace(/\$\s?|(,*)/g, '')}
                        onChange={handleSalePriceChange}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="Discount (KES)"
                      name="discount"
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value: string) => value!.replace(/\$\s?|(,*)/g, '')}
                        onChange={handleDiscountChange}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label="Sale Date"
                  name="sale_date"
                  rules={[{ required: true, message: 'Please select sale date' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Form>
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Button onClick={handleCancel} style={{ marginRight: 8 }}>
                  Cancel
                </Button>
                <Button type="primary" onClick={goToStep2}>
                  Next: Payment Details →
                </Button>
              </div>
            </div>

            {/* Step 2: Payment Details */}
            <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
              <Form form={form} layout="vertical">
                <Form.Item
                  label="Initial Payment Type"
                  name="initial_payment_type"
                  rules={[{ required: true, message: 'Please select initial payment type' }]}
                >
                  <Select onChange={handleInitialPaymentTypeChange}>
                    <Option value="booking_fee">Booking Fee (KES 5,000 - Non-refundable)</Option>
                    <Option value="down_payment">Down Payment (Custom Amount)</Option>
                  </Select>
                </Form.Item>

                {initialPaymentType === 'booking_fee' && (
                  <Alert
                    message="Booking Fee - Non-Refundable"
                    description={
                      <div>
                        <Text strong>KES 5,000</Text> booking fee reserves this property for <Text strong>7 working days</Text>.
                        <br />
                        <Text type="warning">⚠️ This fee is non-refundable and will be applied to your total purchase price.</Text>
                      </div>
                    }
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}

                <Form.Item
                  label="Initial Payment Amount (KES)"
                  name="initial_payment"
                  rules={[{ required: true, message: 'Please enter initial payment amount' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={initialPaymentType === 'booking_fee' ? 5000 : 0}
                    disabled={initialPaymentType === 'booking_fee'}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value: string) => value!.replace(/\$\s?|(,*)/g, '')}
                  />
                </Form.Item>

                <Form.Item
                  label="Payment Plan"
                  name="payment_plan"
                  rules={[{ required: true, message: 'Please select payment plan' }]}
                >
                  <Select onChange={handlePaymentPlanChange}>
                    <Option value="full_payment">Full Payment</Option>
                    <Option value="installment">Installment</Option>
                    <Option value="mortgage">Mortgage</Option>
                    <Option value="cash">Cash</Option>
                  </Select>
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Payment Date"
                      name="payment_date"
                      rules={[{ required: true, message: 'Please select payment date' }]}
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Payment Method"
                      name="payment_method"
                      rules={[{ required: true, message: 'Please select payment method' }]}
                    >
                      <Select>
                        <Option value="mpesa">M-Pesa</Option>
                        <Option value="bank_transfer">Bank Transfer</Option>
                        <Option value="cash">Cash</Option>
                        <Option value="cheque">Cheque</Option>
                        <Option value="card">Card</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {showInstallmentGenerator && (
                  <>
                    <Divider orientation="left">Installment Schedule</Divider>
                    <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f0f5ff' }}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <div style={{ marginBottom: 16 }}>
                            <label style={{ fontWeight: 500 }}>Payment Frequency</label>
                            <Select
                              value={paymentFrequency}
                              onChange={setPaymentFrequency}
                              style={{ width: '100%' }}
                            >
                              <Option value="weekly">Weekly</Option>
                              <Option value="biweekly">Bi-weekly</Option>
                              <Option value="monthly">Monthly</Option>
                              <Option value="quarterly">Quarterly</Option>
                              <Option value="biannually">Bi-annually</Option>
                              <Option value="annually">Annually</Option>
                            </Select>
                          </div>
                        </Col>
                        <Col span={8}>
                          <div style={{ marginBottom: 16 }}>
                            <label style={{ fontWeight: 500 }}>Number of Installments</label>
                            <InputNumber
                              min={1}
                              max={120}
                              value={numberOfMonths}
                              onChange={(value) => setNumberOfMonths(value || 2)}
                              style={{ width: '100%' }}
                            />
                          </div>
                        </Col>
                        <Col span={8}>
                          <div style={{ marginBottom: 16 }}>
                            <label style={{ fontWeight: 500, visibility: 'hidden' }}>Action</label>
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={generateInstallmentSchedule}
                              block
                            >
                              Generate Payment Plan
                            </Button>
                          </div>
                        </Col>
                      </Row>
                      <Alert
                        message={
                          <div>
                            <strong>Total after discount: KES {paymentDetails.totalAfterDiscount.toLocaleString()}</strong>
                            {' | '}
                            <span>Initial payment: KES {paymentDetails.initialPayment.toLocaleString()}</span>
                            {' | '}
                            <span>To finance: KES {paymentDetails.toFinance.toLocaleString()}</span>
                            {' | '}
                            <span>{paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1)} payment: KES {Math.round(paymentDetails.monthlyPayment).toLocaleString()}</span>
                          </div>
                        }
                        type="info"
                        style={{ marginTop: 8 }}
                      />
                    </Card>

                    {installments.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        {installments.map((installment, index) => (
                          <Card
                            key={installment.key}
                            size="small"
                            style={{ marginBottom: 8 }}
                            title={`Installment ${index + 1}`}
                            extra={
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => removeInstallment(installment.key)}
                              />
                            }
                          >
                            <Row gutter={16}>
                              <Col span={12}>
                                <label>Amount (KES)</label>
                                <InputNumber
                                  value={installment.amount}
                                  onChange={(value) => updateInstallmentAmount(installment.key, value || 0)}
                                  min={0}
                                  style={{ width: '100%' }}
                                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                  parser={(value: string) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
                                />
                              </Col>
                              <Col span={12}>
                                <label>Due Date</label>
                                <DatePicker
                                  value={dayjs(installment.dueDate)}
                                  onChange={(date) =>
                                    updateInstallmentDueDate(
                                      installment.key,
                                      date?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD')
                                    )
                                  }
                                  style={{ width: '100%' }}
                                  format="YYYY-MM-DD"
                                />
                              </Col>
                            </Row>
                          </Card>
                        ))}
                        <Button
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={addInstallmentManually}
                          block
                          style={{ marginTop: 16 }}
                        >
                          Add Installment Manually
                        </Button>
                      </div>
                    )}

                    {installments.length === 0 && (
                      <Alert
                        message="No installments generated"
                        description="Click 'Generate Payment Plan' to create installment schedule or add installments manually"
                        type="warning"
                        showIcon
                        style={{ marginTop: 16 }}
                      />
                    )}
                  </>
                )}

                <Divider orientation="left">Supporting Documents (Optional)</Divider>
                <Form.Item label="Attachments">
                  <Upload
                    fileList={fileList}
                    onChange={handleFileChange}
                    beforeUpload={beforeUpload}
                    accept=".jpg,.jpeg,.png,.pdf,.webp"
                    multiple
                    listType="picture"
                  >
                    <Button icon={<UploadOutlined />}>Select Multiple Files</Button>
                  </Upload>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    Supported: JPG, PNG, WEBP, PDF (Max 10MB per file)
                  </Text>
                </Form.Item>
              </Form>
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Button onClick={goToStep1} style={{ marginRight: 8 }}>
                  ← Back
                </Button>
                <Button type="primary" onClick={() => setCurrentStep(2)}>
                  Next: Terms & Submit →
                </Button>
              </div>
            </div>

            {/* Step 3: Terms & Submit */}
            <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
              <Form form={form} layout="vertical">
                <Form.Item
                  label="Sales Agent"
                  name="salesAgent"
                  rules={[{ required: true, message: 'Please select a sales agent' }]}
                >
                  <Select
                    placeholder="Select sales agent"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {users?.map((user: any) => (
                      <Option key={user._id} value={user._id}>
                        {user.fullname || user.name} - {user.email}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Property Manager"
                  name="propertyManager"
                  rules={[{ required: true, message: 'Please select a property manager' }]}
                >
                  <Select
                    placeholder="Select property manager"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {users?.map((user: any) => (
                      <Option key={user._id} value={user._id}>
                        {user.fullname || user.name} - {user.email}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Commission Rate (%)"
                  name="commission_rate"
                  rules={[{ required: true, message: 'Please enter commission rate' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    max={100}
                    precision={2}
                  />
                </Form.Item>

                <Form.Item
                  label="Status"
                  name="status"
                  rules={[{ required: true, message: 'Please select status' }]}
                >
                  <Select>
                    <Option value="pending">Pending</Option>
                    <Option value="active">Active</Option>
                    <Option value="completed">Completed</Option>
                    <Option value="cancelled">Cancelled</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Notes"
                  name="notes"
                >
                  <TextArea rows={4} placeholder="Enter any additional notes" />
                </Form.Item>
              </Form>
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Button onClick={goToStep1} style={{ marginRight: 8 }}>
                  ← Back
                </Button>
                <Button onClick={handleCancel} style={{ marginRight: 8 }}>
                  Cancel
                </Button>
                <Button type="primary" onClick={handleSubmit}>
                  {edit ? 'Update Sale' : 'Create Sale'}
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};

export default AddEditSaleModal;
