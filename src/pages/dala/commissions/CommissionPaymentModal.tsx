import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  PercentageOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { payCommission } from '../../../services/dala';

const { Option } = Select;
const { Text, Title } = Typography;

// Calculate amount paid for a sale
const calculateAmountPaid = (sale: any): number => {
  if (sale?.status === 'completed') {
    return parseFloat(sale.salePrice) || 0;
  }

  if (sale?.paymentTotals?.totalPaid !== undefined) {
    return parseFloat(sale.paymentTotals.totalPaid) || 0;
  }

  if (sale?.payments && Array.isArray(sale.payments) && sale.payments.length > 0) {
    return sale.payments.reduce((sum: number, payment: any) => {
      const amount = parseFloat(payment.amount) || 0;
      return sum + amount;
    }, 0);
  }

  if (sale?.saleData) {
    if (sale.saleData.status === 'completed') {
      return parseFloat(sale.saleData.salePrice) || 0;
    }

    if (sale.saleData.paymentTotals?.totalPaid !== undefined) {
      return parseFloat(sale.saleData.paymentTotals.totalPaid) || 0;
    }

    if (sale.saleData.payments && Array.isArray(sale.saleData.payments) && sale.saleData.payments.length > 0) {
      return sale.saleData.payments.reduce((sum: number, payment: any) => {
        const amount = parseFloat(payment.amount) || 0;
        return sum + amount;
      }, 0);
    }
  }

  return parseFloat(sale?.amountPaid) || 0;
};

// Calculate the accrued commission based on amount paid
const calculateAccruedCommission = (sale: any): number => {
  const amountPaid = calculateAmountPaid(sale);

  let commissionRate = 0;
  if (sale?.commission?.percentage) {
    commissionRate = parseFloat(sale.commission.percentage) / 100;
  } else if (sale?.commissionPercentage) {
    commissionRate = parseFloat(sale.commissionPercentage) / 100;
  } else {
    commissionRate = 0.05;
  }

  return amountPaid * commissionRate;
};

interface CommissionPaymentModalProps {
  visible: boolean;
  onCancel: () => void;
  sale: any;
  onSuccess?: () => void;
  agents?: any[];
  paymentMethods?: string[];
}

const CommissionPaymentModal: React.FC<CommissionPaymentModalProps> = ({
  visible,
  onCancel,
  sale,
  onSuccess,
  agents = [],
  paymentMethods = ['bank transfer', 'm-pesa', 'cash', 'check', 'other'],
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [commission, setCommission] = useState<any>({});
  const [exceedsAccrued, setExceedsAccrued] = useState(false);
  const [applyWithholding, setApplyWithholding] = useState(false);
  const [withholdingPercentage, setWithholdingPercentage] = useState(5);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [withholdingAmount, setWithholdingAmount] = useState(0);
  const [netAmount, setNetAmount] = useState(0);
  const [fileList, setFileList] = useState<any>([]);
  const [documentType, setDocumentType] = useState('receipt');

  useEffect(() => {
    if (sale && visible) {
      const accruedCommission = calculateAccruedCommission(sale);

      const commissionData = {
        total: parseFloat(sale.commissionAmount || sale.commission?.amount || 0),
        paid:
          sale.commission?.commissionPayments?.reduce(
            (sum: number, payment: any) => sum + (payment.netAmount || payment.amount),
            0,
          ) || 0,
        status: sale.commission?.status || 'pending',
        payments: sale.commission?.commissionPayments || [],
        accrued: accruedCommission,
      };

      const normalRemaining = commissionData.total - commissionData.paid;
      const accruedRemaining = commissionData.accrued - commissionData.paid;

      commissionData.remaining = Math.min(normalRemaining, accruedRemaining);
      commissionData.percentagePaid = (
        (commissionData.paid / commissionData.total) *
        100
      ).toFixed(2);

      setCommission(commissionData);

      const defaultAmount =
        commissionData.remaining > 0 ? commissionData.remaining : undefined;

      form.setFieldsValue({
        amount: defaultAmount,
        paymentMethod: 'bank transfer',
        paymentDate: moment(),
        reference: '',
        notes: '',
      });

      if (defaultAmount && applyWithholding) {
        calculateWithholding(defaultAmount, withholdingPercentage);
      }

      setFileList([]);
      setDocumentType('receipt');
    }
  }, [sale, visible, form, applyWithholding, withholdingPercentage]);

  const calculateWithholding = (amount: number, percentage: number) => {
    const tax = (amount * percentage) / 100;
    const net = amount - tax;

    setPaymentAmount(amount);
    setWithholdingAmount(tax);
    setNetAmount(net);
  };

  const handleAmountChange = (value: number | null) => {
    const numValue = value || 0;
    if (numValue > commission.accrued - commission.paid) {
      setExceedsAccrued(true);
    } else {
      setExceedsAccrued(false);
    }

    if (applyWithholding && numValue) {
      calculateWithholding(numValue, withholdingPercentage);
    } else {
      setPaymentAmount(numValue);
      setWithholdingAmount(0);
      setNetAmount(numValue);
    }
  };

  const handleWithholdingChange = (checked: boolean) => {
    setApplyWithholding(checked);

    const currentAmount = form.getFieldValue('amount');
    if (checked && currentAmount) {
      calculateWithholding(currentAmount, withholdingPercentage);
    } else {
      setWithholdingAmount(0);
      setNetAmount(currentAmount || 0);
    }
  };

  const handleWithholdingPercentageChange = (value: number | null) => {
    setWithholdingPercentage(value || 5);

    const currentAmount = form.getFieldValue('amount');
    if (applyWithholding && currentAmount) {
      calculateWithholding(currentAmount, value || 5);
    }
  };

  const handleFileChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (values.amount > commission.accrued - commission.paid) {
        message.error('Payment amount cannot exceed accrued commission');
        return;
      }

      setLoading(true);

      // Build withholding tax object if applied
      const withholdingTax = applyWithholding ? {
        applied: true,
        percentage: withholdingPercentage,
        amount: withholdingAmount,
        netAmount: netAmount,
      } : undefined;

      // Call payCommission with new API signature
      await payCommission(
        sale._id,
        values.amount,
        values.notes || '',
        values.paymentMethod,
        values.reference || '',
        withholdingTax
      );
      
      message.success(
        applyWithholding
          ? `Commission payment added. Net amount: KES ${netAmount.toLocaleString()}`
          : 'Commission payment added successfully'
      );

      form.resetFields();
      setFileList([]);
      onCancel();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error adding commission payment:', error);
      
      // Handle form validation errors
      if (error.errorFields && error.errorFields.length > 0) {
        const fieldErrors = error.errorFields.map((fieldError: any) => {
          const fieldName = fieldError.name[0];
          const errorMessage = fieldError.errors[0];
          return `${fieldName}: ${errorMessage}`;
        }).join(', ');
        message.error(`Please fix the following errors: ${fieldErrors}`);
      } else if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Failed to add commission payment. Please check all required fields.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (numAmount === undefined || numAmount === null || isNaN(numAmount)) {
      return 'KES 0';
    }
    return `KES ${numAmount.toLocaleString()}`;
  };

  const getCommissionStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#52c41a';
      case 'partial':
        return '#faad14';
      default:
        return '#ff4d4f';
    }
  };

  const uploadProps = {
    onRemove: (file: any) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file: any) => {
      const isValidType = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/webp',
        'application/pdf',
      ].includes(file.type);

      if (!isValidType) {
        message.error('You can only upload JPG, PNG, or PDF files!');
        return false;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('File must be smaller than 10MB!');
        return false;
      }

      setFileList([...fileList, file]);
      return false;
    },
    fileList,
    multiple: true,
    maxCount: 10,
  };

  return (
    <Modal
      title={`Add Commission Payment - ${sale?.saleCode || 'Sale'}`}
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={null}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Total Commission"
                  value={formatCurrency(commission.total)}
                  prefix={<DollarOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={
                    <span>
                      Accrued Commission
                      <Tooltip title="Commission based on actual client payments">
                        <InfoCircleOutlined style={{ marginLeft: 5 }} />
                      </Tooltip>
                    </span>
                  }
                  value={formatCurrency(commission.accrued)}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Paid Amount"
                  value={formatCurrency(commission.paid)}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={
                    <span>
                      Available to Pay
                      <Tooltip title="Maximum commission that can be paid based on client payments">
                        <InfoCircleOutlined style={{ marginLeft: 5 }} />
                      </Tooltip>
                    </span>
                  }
                  value={formatCurrency(commission.accrued - commission.paid)}
                  valueStyle={{
                    color:
                      commission.accrued - commission.paid > 0
                        ? '#ff4d4f'
                        : '#52c41a',
                  }}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
            </Row>
            <Divider />
            <Row>
              <Col span={12}>
                <Text>
                  Sale Reference: <strong>{sale?.saleCode || 'N/A'}</strong>
                </Text>
              </Col>
              <Col span={12}>
                <Text>
                  Status:{' '}
                  <span
                    style={{
                      color: getCommissionStatusColor(commission.status),
                    }}
                  >
                    {commission.status?.toUpperCase() || 'PENDING'}
                  </span>
                </Text>
              </Col>
            </Row>
            <Row>
              <Col span={12}>
                <Text>
                  Property: <strong>{sale?.property || 'N/A'}</strong>
                </Text>
              </Col>
              <Col span={12}>
                <Text>
                  Unit: <strong>{sale?.unit || 'N/A'}</strong>
                </Text>
              </Col>
            </Row>
            <Row>
              <Col span={12}>
                <Text>
                  Sale Price: <strong>{formatCurrency(sale?.salePrice)}</strong>
                </Text>
              </Col>
              <Col span={12}>
                <Text>
                  Agent: <strong>{sale?.agent?.name || sale?.salesAgent?.name || 'N/A'}</strong>
                </Text>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={24}>
          <Title level={5}>Payment Details</Title>
          {commission.accrued - commission.paid <= 0 && (
            <Alert
              message="No Commission Available"
              description="There is no accrued commission available to pay at this time. Commission can only be paid based on the amount already paid by the client."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="amount"
                  label="Gross Payment Amount"
                  rules={[
                    { required: true, message: 'Please enter payment amount' },
                    {
                      type: 'number',
                      min: 0.01,
                      message: 'Amount must be greater than 0',
                    },
                    {
                      validator: (_: any, value: number) => {
                        if (value > commission.accrued - commission.paid) {
                          return Promise.reject(
                            new Error('Amount exceeds available accrued commission'),
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                  help={
                    exceedsAccrued
                      ? 'Payment cannot exceed accrued commission'
                      : null
                  }
                  validateStatus={exceedsAccrued ? 'error' : null}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter payment amount"
                    formatter={(value) =>
                      `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                    }
                    parser={(value) => value?.replace(/KES\s?|(,*)/g, '') as unknown as number}
                    onChange={handleAmountChange}
                    max={commission.accrued - commission.paid}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="paymentDate"
                  label="Payment Date"
                  rules={[
                    { required: true, message: 'Please select payment date' },
                  ]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Card style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
              <Row gutter={16}>
                <Col span={24}>
                  <Checkbox
                    checked={applyWithholding}
                    onChange={(e) => handleWithholdingChange(e.target.checked)}
                  >
                    <Text strong>Apply Withholding Tax</Text>
                  </Checkbox>
                </Col>
              </Row>

              {applyWithholding && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text type="secondary">Tax Percentage:</Text>
                      <InputNumber
                        min={0}
                        max={100}
                        value={withholdingPercentage}
                        onChange={handleWithholdingPercentageChange}
                        formatter={(value) => `${value}%`}
                        parser={(value) => value?.replace('%', '') as unknown as number}
                        style={{ width: '100%', marginTop: 4 }}
                        suffix={<PercentageOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Tax Amount"
                        value={formatCurrency(withholdingAmount)}
                        valueStyle={{ color: '#ff4d4f', fontSize: 16 }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Net Amount (After Tax)"
                        value={formatCurrency(netAmount)}
                        valueStyle={{
                          color: '#52c41a',
                          fontSize: 16,
                          fontWeight: 'bold',
                        }}
                      />
                    </Col>
                  </Row>
                </>
              )}
            </Card>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="paymentMethod"
                  label="Payment Method"
                  rules={[
                    { required: true, message: 'Please select payment method' },
                  ]}
                >
                  <Select placeholder="Select payment method">
                    {paymentMethods.map((method) => (
                      <Option key={method} value={method}>
                        {method.toUpperCase()}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="reference"
              label="Reference Number"
              rules={[{ required: true, message: 'Reference Number required' }]}
            >
              <Input placeholder="Enter reference number or transaction ID" />
            </Form.Item>

            <Form.Item name="notes" label="Notes">
              <Input.TextArea
                rows={3}
                placeholder="Enter any notes about this payment"
              />
            </Form.Item>

            <Divider>Payment Documents</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Document Type">
                  <Select
                    value={documentType}
                    onChange={setDocumentType}
                    placeholder="Select document type"
                  >
                    <Option value="receipt">Receipt</Option>
                    <Option value="payment_proof">Payment Proof</Option>
                    <Option value="bank_statement">Bank Statement</Option>
                    <Option value="mpesa_confirmation">M-Pesa Confirmation</Option>
                    <Option value="check_image">Check Image</Option>
                    <Option value="invoice">Invoice</Option>
                    <Option value="authorization">Authorization Letter</Option>
                    <Option value="withholding_certificate">Withholding Tax Certificate</Option>
                    <Option value="other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="Upload Documents (Optional)"
                  extra="Max 10 files, 10MB each. Supported: JPG, PNG, PDF"
                >
                  <Upload {...uploadProps} listType="picture">
                    <Button icon={<UploadOutlined />}>
                      Select Files
                    </Button>
                  </Upload>
                  {fileList.length > 0 && (
                    <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                      {fileList.length} file(s) selected
                    </Text>
                  )}
                </Form.Item>
              </Col>
            </Row>

            <Row justify="end">
              <Space>
                <Button onClick={onCancel}>Cancel</Button>
                <Button
                  type="primary"
                  loading={loading}
                  onClick={handleSubmit}
                  disabled={
                    commission.accrued - commission.paid <= 0 || exceedsAccrued
                  }
                >
                  {applyWithholding
                    ? `Add Payment (Net: ${formatCurrency(netAmount)})`
                    : 'Add Payment'}
                </Button>
              </Space>
            </Row>
          </Form>
        </Col>
      </Row>
    </Modal>
  );
};

export default CommissionPaymentModal;
