import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Row,
  Col,
  message,
  DatePicker,
  Divider,
  Typography,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { fetchLeases } from '@services/dala';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface AddEditRentPaymentModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  edit?: boolean;
  initialData?: any;
  invoices?: any[];
}

const AddEditRentPaymentModal: React.FC<AddEditRentPaymentModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  edit = false,
  initialData,
  invoices = [],
}) => {
  const [form] = Form.useForm();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const { data: leases } = useQuery({
    queryKey: ['dala-leases'],
    queryFn: fetchLeases,
    enabled: visible,
  });

  useEffect(() => {
    if (visible) {
      if (edit && initialData) {
        form.setFieldsValue({
          leaseId: initialData.leaseId,
          invoiceId: initialData.invoiceId,
          paymentDate: initialData.paymentDate ? dayjs(initialData.paymentDate) : dayjs(),
          amount: initialData.amount,
          currency: initialData.currency || 'KES',
          paymentMethod: initialData.paymentMethod || 'mpesa',
          mpesaCode: initialData.mpesaCode,
          bankReference: initialData.bankReference,
          chequeNumber: initialData.chequeNumber,
          paymentType: initialData.paymentType || 'rent',
          periodCovered: initialData.periodCovered,
          status: initialData.status || 'confirmed',
          notes: initialData.notes || '',
        });
        if (initialData.invoiceId) {
          const invoice = invoices.find((inv: any) => inv._id === initialData.invoiceId);
          setSelectedInvoice(invoice);
        }
      } else {
        form.resetFields();
        form.setFieldsValue({
          paymentDate: dayjs(),
          currency: 'KES',
          paymentMethod: 'mpesa',
          paymentType: 'rent',
          status: 'confirmed',
        });
      }
    }
  }, [visible, edit, initialData, form, invoices]);

  const handleInvoiceChange = (value: string) => {
    const invoice = invoices.find((inv: any) => inv._id === value);
    setSelectedInvoice(invoice);
    if (invoice) {
      form.setFieldsValue({
        leaseId: invoice.leaseId,
        amount: invoice.balance,
        occupantId: invoice.occupantId,
        propertyId: invoice.propertyId,
        unitId: invoice.unitId,
        periodCovered: invoice.periodStart.substring(0, 7),
      });
    }
  };

  const handlePaymentMethodChange = (value: string) => {
    // Clear method-specific fields when changing payment method
    if (value !== 'mpesa') {
      form.setFieldValue('mpesaCode', undefined);
    }
    if (value !== 'bank_transfer') {
      form.setFieldValue('bankReference', undefined);
    }
    if (value !== 'cheque') {
      form.setFieldValue('chequeNumber', undefined);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const formattedValues = {
        ...values,
        paymentDate: values.paymentDate.format('YYYY-MM-DD'),
        receiptNumber: `RCPT-${Date.now()}`,
      };
      
      onSubmit(formattedValues);
      form.resetFields();
      setSelectedInvoice(null);
      return true;
    } catch (error) {
      message.error('Please check all fields');
      return false;
    }
  };

  const getInvoicesForLease = (leaseId: string) => {
    return invoices.filter((inv: any) => inv.leaseId === leaseId && inv.balance > 0);
  };

  return (
    <Modal
      title={edit ? 'Edit Rent Payment' : 'Record Rent Payment'}
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={null}
      destroyOnClose
    >
      <div style={{ padding: '24px 0' }}>
        <Form form={form} layout="vertical">
          {/* Lease & Invoice Selection */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Invoice"
                name="invoiceId"
                rules={[{ required: true, message: 'Please select an invoice' }]}
              >
                <Select
                  placeholder="Select invoice"
                  onChange={handleInvoiceChange}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {invoices
                    .filter((inv: any) => inv.balance > 0)
                    .map((invoice: any) => (
                      <Option key={invoice._id} value={invoice._id}>
                        {invoice.invoiceNumber} - Balance: KES {invoice.balance.toLocaleString()}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Lease ID" name="leaseId">
                <Input disabled placeholder="Auto-populated" />
              </Form.Item>
            </Col>
          </Row>

          {/* Payment Details */}
          <Divider orientation="left">Payment Details</Divider>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Payment Date"
                name="paymentDate"
                rules={[{ required: true, message: 'Please select payment date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Amount"
                name="amount"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value: string | undefined) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
                />
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
                <Select onChange={handlePaymentMethodChange}>
                  <Option value="cash">Cash</Option>
                  <Option value="mpesa">M-Pesa</Option>
                  <Option value="bank_transfer">Bank Transfer</Option>
                  <Option value="cheque">Cheque</Option>
                  <Option value="card">Card</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Payment Type"
                name="paymentType"
                rules={[{ required: true, message: 'Please select payment type' }]}
              >
                <Select>
                  <Option value="rent">Rent</Option>
                  <Option value="deposit">Deposit</Option>
                  <Option value="service_charge">Service Charge</Option>
                  <Option value="penalty">Penalty</Option>
                  <Option value="advance">Advance Payment</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Method-specific fields */}
          {form.getFieldValue('paymentMethod') === 'mpesa' && (
            <Form.Item
              label="M-Pesa Transaction Code"
              name="mpesaCode"
              rules={[{ required: true, message: 'Please enter M-Pesa code' }]}
            >
              <Input placeholder="e.g., XYZ123ABC" />
            </Form.Item>
          )}

          {form.getFieldValue('paymentMethod') === 'bank_transfer' && (
            <Form.Item
              label="Bank Reference Number"
              name="bankReference"
              rules={[{ required: true, message: 'Please enter bank reference' }]}
            >
              <Input placeholder="e.g., REF-2024-001" />
            </Form.Item>
          )}

          {form.getFieldValue('paymentMethod') === 'cheque' && (
            <Form.Item
              label="Cheque Number"
              name="chequeNumber"
              rules={[{ required: true, message: 'Please enter cheque number' }]}
            >
              <Input placeholder="e.g., 001234" />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Currency" name="currency">
                <Select>
                  <Option value="KES">KES</Option>
                  <Option value="USD">USD</Option>
                  <Option value="EUR">EUR</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Period Covered" name="periodCovered">
                <Input placeholder="e.g., 2026-04" />
              </Form.Item>
            </Col>
          </Row>

          {selectedInvoice && (
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">
                Invoice: {selectedInvoice.invoiceNumber} | 
                Total: KES {selectedInvoice.totalAmount.toLocaleString()} | 
                Paid: KES {selectedInvoice.paidAmount.toLocaleString()} | 
                Balance: KES {selectedInvoice.balance.toLocaleString()}
              </Text>
            </div>
          )}

          <Form.Item label="Notes" name="notes">
            <TextArea rows={3} placeholder="Additional payment notes" />
          </Form.Item>

          <Form.Item label="Status" name="status" initialValue="confirmed">
            <Select>
              <Option value="pending">Pending</Option>
              <Option value="confirmed">Confirmed</Option>
              <Option value="reversed">Reversed</Option>
            </Select>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleSubmit}>
            {edit ? 'Update Payment' : 'Record Payment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddEditRentPaymentModal;
