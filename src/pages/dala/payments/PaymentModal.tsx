import { EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import {
  ModalForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormGroup,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Button, Card, Col, Descriptions, Form, message, Row, Tag, Typography, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import moment from 'moment';
import React, { useState, useEffect } from 'react';
import { fetchAllCustomers } from '../../../services/customers';
import { recordSalePayment } from '../../../services/dala';

const { Text } = Typography;

interface PaymentModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
  editText?: string;
  salesData?: any[];
  onSuccess?: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  actionRef,
  edit,
  data,
  editText,
  salesData = [],
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [nextPendingPlan, setNextPendingPlan] = useState<any>(null);
  const [totalOutstanding, setTotalOutstanding] = useState<number>(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [fileTypes, setFileTypes] = useState<string[]>(['receipt']);
  const [customersData, setCustomersData] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Fetch customers data
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const response = await fetchAllCustomers();
        const customers = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
        setCustomersData(customers);
      } catch (error) {
        console.error('Error fetching customers:', error);
        message.error('Failed to load customers');
        setCustomersData([]);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, []);

  // Handle customer selection and find next pending installment
  const handleCustomerChange = (customerId: string) => {
    const customer = customersData.find((c: any) => c._id === customerId);
    setSelectedCustomer(customer);
    setNextPendingPlan(null);
    setTotalOutstanding(0);

    if (customer && salesData && salesData.length > 0) {
      const allPlans: any[] = [];

      // Filter sales by customer and collect payment plans
      const customerSales = salesData.filter((sale: any) => sale.customer?._id === customerId);
      
      customerSales.forEach((sale: any) => {
        if (sale.paymentPlans && Array.isArray(sale.paymentPlans)) {
          sale.paymentPlans.forEach((plan: any) => {
            // Exclude initial deposit plans and completed plans
            if (!plan.isInitialDeposit && plan.status !== 'completed' && plan.outstandingBalance > 0) {
              allPlans.push({
                ...plan,
                saleName: sale.property?.name || 'Unnamed Property',
                saleCode: sale.saleCode || 'N/A',
                saleId: sale._id,
                propertyId: sale.property?._id,
                customerId: customer._id,
              });
            }
          });
        }
      });

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
    }
  };

  const handleFinish = async (values: any) => {
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
        paymentPlanId: nextPendingPlan._id,
        customerId: selectedCustomer._id,
        propertyId: nextPendingPlan.propertyId,
        unitId: nextPendingPlan.unitId,
        paymentDate: values?.paymentDate
          ? moment(values.paymentDate).format('YYYY-MM-DD')
          : moment().format('YYYY-MM-DD'),
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        paymentType: 'installment',
        reference: values.reference || '',
        receiptNumber: values.receiptNumber || '',
        etimsRefNumber: values.etimsRefNumber || '',
        notes: values.notes || `Payment for ${nextPendingPlan.saleName} - ${nextPendingPlan.saleCode}`,
        attachments: files,
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
  const handleFileChange = ({ fileList: newFileList }: any) => {
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

  return (
    <ModalForm
      title="Record New Payment"
      form={form}
      onFinish={handleFinish}
      initialValues={
        edit
          ? {
            ...data,
            paymentDate: data?.paymentDate
              ? moment(data.paymentDate)
              : undefined,
          }
          : {
            paymentDate: moment(),
            paymentMethod: 'mpesa',
          }
      }
      autoFocusFirstInput
      trigger={
        edit ? (
          <Button key="button" icon={<EditOutlined />} size="small">
            {editText || 'Edit'}
          </Button>
        ) : (
          <Button type="primary" key="button" icon={<PlusOutlined />}>
            Add New 
          </Button>
        )
      }
      modalProps={{
        destroyOnClose: true,
        centered: true,
        maskClosable: false,
        width: 900,
        onCancel: () => {
          setFileList([]);
        }
      }}
    >
      <ProFormGroup title="Customer Selection">
        <ProFormSelect
          name="customer"
          label="Customer"
          width="xl"
          placeholder="Select customer"
          options={customersData.map((customer: any) => ({
            label: `${customer.customer_name || customer.name} ${customer.email ? `(${customer.email})` : ''}`,
            value: customer._id,
          }))}
          fieldProps={{
            onChange: (value: string) => handleCustomerChange(value),
            showSearch: true,
            loading: loadingCustomers,
            filterOption: (input: string, option: any) =>
              (option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase()),
          }}
          rules={[{ required: true, message: 'Please select a customer' }]}
        />
      </ProFormGroup>

      {nextPendingPlan && (
        <Card
          size="small"
          title={
            <Text strong style={{ fontSize: 16 }}>
              Next Payment Due
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
                KES {totalOutstanding.toLocaleString()}
              </Text>
            </Descriptions.Item>
          </Descriptions>

          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
            💡 <Text italic>Payments are applied sequentially. Any overpayment will automatically cascade to the next installment.</Text>
          </Text>
        </Card>
      )}

      {!nextPendingPlan && selectedCustomer && (
        <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed', borderColor: '#52c41a' }}>
          <Text type="success" strong>
            ✅ All installments are fully paid! No pending payments for this customer.
          </Text>
        </Card>
      )}

      <ProFormGroup title="Payment Details">
        <Row gutter={16}>
          <Col span={12}>
            <ProFormDigit
              name="amount"
              label="Payment Amount (KES)"
              min={1}
              max={totalOutstanding || undefined}
              width="md"
              fieldProps={{
                precision: 0,
                step: 1000,
                formatter: (value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
                parser: (value) => value?.replace(/\$\s?|(,*)/g, ''),
                disabled: !nextPendingPlan,
              }}
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
            />
          </Col>
          <Col span={12}>
            <ProFormDatePicker
              name="paymentDate"
              label="Payment Date"
              width="md"
              fieldProps={{
                disabled: !nextPendingPlan,
              }}
              rules={[
                { required: true, message: 'Please select payment date' },
              ]}
            />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <ProFormSelect
              name="paymentMethod"
              label="Payment Method"
              width="md"
              options={[
                { label: 'M-Pesa', value: 'mpesa' },
                { label: 'Bank Transfer', value: 'bank_transfer' },
                { label: 'Cash', value: 'cash' },
                { label: 'Cheque', value: 'cheque' },
                { label: 'Card', value: 'card' },
              ]}
              fieldProps={{
                disabled: !nextPendingPlan,
              }}
              rules={[
                { required: true, message: 'Please select payment method' },
              ]}
            />
          </Col>
          <Col span={12}>
            <ProFormText
              name="reference"
              label="Reference Number (Optional)"
              width="md"
              placeholder="e.g., Transaction ID, Check number"
              fieldProps={{
                disabled: !nextPendingPlan,
              }}
            />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <ProFormText
              name="etimsRefNumber"
              label="eTIMS Reference (Optional)"
              placeholder="e.g., ETIMS-2026-001234"
              tooltip="Kenya Revenue Authority (KRA) eTIMS reference number for tax compliance"
              fieldProps={{
                disabled: !nextPendingPlan,
              }}
            />
          </Col>
        </Row>
      </ProFormGroup>

      <ProFormGroup title="Supporting Documents (Optional)">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Document Types">
              <ProFormSelect
                name="docTypes"
                mode="multiple"
                options={[
                  { label: 'Receipt', value: 'receipt' },
                  { label: 'Cheque', value: 'cheque' },
                  { label: 'Bank Slip', value: 'bank_slip' },
                  { label: 'M-Pesa Confirmation', value: 'mpesa_confirmation' },
                  { label: 'Invoice', value: 'invoice' },
                  { label: 'Other', value: 'other' },
                ]}
                fieldProps={{
                  value: fileTypes,
                  onChange: (value) => {
                    console.log('📋 Document types changed to:', value);
                    setFileTypes(value || []);
                  },
                  placeholder: 'Select document types',
                  disabled: !nextPendingPlan,
                }}
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
                disabled={!nextPendingPlan}
                listType="picture"
              >
                <Button
                  icon={<UploadOutlined />}
                  disabled={!nextPendingPlan}
                >
                  Select Multiple Files
                </Button>
              </Upload>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                Supported: JPG, PNG, WEBP, PDF (Max 10MB per file) - Upload multiple documents at once
              </Text>
            </Form.Item>
          </Col>
        </Row>
      </ProFormGroup>

      <ProFormTextArea
        name="notes"
        label="Notes (Optional)"
        placeholder="Add any additional notes about this payment"
        fieldProps={{
          rows: 3,
          disabled: !nextPendingPlan,
        }}
      />
    </ModalForm>
  );
};

export default PaymentModal;
