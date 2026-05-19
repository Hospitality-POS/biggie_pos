import React, { useState, useRef, useEffect } from 'react';
import { Card, Table, Typography, Button, Space, Tag, message, DatePicker, Select, Input, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import PaymentDrawer from './PaymentDrawer';
import PaymentModal from './PaymentModal';
import PaymentStats from './PaymentStats';
import { fetchSalePayments } from '../../../services/dala';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface PaymentRecord {
  _id?: string;
  id?: string;
  amount: number;
  status?: string;
  paymentDate?: string;
  paymentMethod?: string;
  reference?: string;
  receiptNo?: string;
  receiptNumber?: string;
  etimsRefNumber?: string;
  notes?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  sale?: {
    property?: {
      name?: string;
    };
  };
  createdAt?: string;
}

interface SalesPaymentsTabProps {
  salesData?: any[];
  propertiesData?: any[];
}

const SalesPaymentsTab: React.FC<SalesPaymentsTabProps> = ({
  salesData = [],
  propertiesData = [],
}) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [paymentsData, setPaymentsData] = useState<PaymentRecord[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [selectedMethod, setSelectedMethod] = useState<string | undefined>(undefined);
  const actionRef = useRef<any>(null);

  // Fetch payments data from API
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await fetchSalePayments();
      const payments = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      
      // Map API response to PaymentRecord interface
      const mappedPayments: PaymentRecord[] = payments.map((payment: any) => ({
        _id: payment._id,
        id: payment._id,
        amount: payment.amount,
        status: payment.payment_status || payment.status,
        paymentDate: payment.payment_date,
        paymentMethod: payment.method_id?.name || payment.paymentMethod,
        reference: payment.reference,
        receiptNo: payment.receiptNumber,
        receiptNumber: payment.receiptNumber,
        etimsRefNumber: payment.etimsRefNumber,
        notes: payment.notes,
        customer: payment.customer || {
          name: payment.customer_name,
        },
        sale: {
          property: {
            name: payment.sale?.property?.name || payment.propertyName,
          },
        },
        createdAt: payment.createdAt,
      }));
      
      setPaymentsData(mappedPayments);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      message.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  // Fetch payments on component mount
  useEffect(() => {
    fetchPayments();
  }, []);

  // Handle view payment details
  const handleViewPayment = (record: PaymentRecord) => {
    setSelectedPayment(record);
    setDrawerVisible(true);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchPayments();
  };

  // Handle payment success - refresh sales data
  const handlePaymentSuccess = () => {
    // Invalidate sales query to refresh data in SalesManagement
    queryClient.invalidateQueries(['dala-sales']);
    // Refresh payments data
    fetchPayments();
  };

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `KES ${num.toLocaleString()}`;
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('DD MMM YYYY');
  };

  // Get payment method display
  const getPaymentMethodDisplay = (method?: string) => {
    if (!method) return <Tag>Unknown</Tag>;
    const methodMap: Record<string, { color: string; label: string }> = {
      mpesa: { color: 'green', label: 'M-Pesa' },
      bank_transfer: { color: 'blue', label: 'Bank Transfer' },
      cash: { color: 'gold', label: 'Cash' },
      cheque: { color: 'purple', label: 'Cheque' },
      card: { color: 'cyan', label: 'Card' },
    };
    const config = methodMap[method] || { color: 'default', label: method };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  // Get status display
  const getStatusDisplay = (status?: string) => {
    if (!status) return <Tag>Unknown</Tag>;
    const statusMap: Record<string, string> = {
      pending: 'orange',
      completed: 'green',
      failed: 'red',
      refunded: 'purple',
    };
    const color = statusMap[status] || 'default';
    return <Tag color={color}>{status.charAt(0).toUpperCase() + status.slice(1)}</Tag>;
  };

  // Filter payments
  const filteredPayments = paymentsData.filter((payment) => {
    const matchesSearch = 
      payment.customer?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(searchText.toLowerCase()) ||
      payment.receiptNo?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = !selectedStatus || payment.status === selectedStatus;
    const matchesMethod = !selectedMethod || payment.paymentMethod === selectedMethod;
    
    let matchesDate = true;
    if (dateRange[0] && dateRange[1]) {
      const paymentDate = dayjs(payment.paymentDate);
      matchesDate = paymentDate.isAfter(dateRange[0]) && paymentDate.isBefore(dateRange[1].add(1, 'day'));
    }
    
    return matchesSearch && matchesStatus && matchesMethod && matchesDate;
  });

  // Table columns
  const columns: ColumnsType<PaymentRecord> = [
    {
      title: 'Receipt No',
      dataIndex: 'receiptNo',
      key: 'receiptNo',
      render: (text, record) => text || record.receiptNumber || record._id?.slice(-8),
    },
    {
      title: 'Customer',
      dataIndex: ['customer', 'name'],
      key: 'customer',
    },
    {
      title: 'Property',
      dataIndex: ['sale', 'property', 'name'],
      key: 'property',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (text) => formatCurrency(text),
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (text) => getPaymentMethodDisplay(text),
    },
    {
      title: 'Payment Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (text) => formatDate(text),
      sorter: (a, b) => dayjs(a.paymentDate).unix() - dayjs(b.paymentDate).unix(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text) => getStatusDisplay(text),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewPayment(record)}
          >
            View
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>Sales Payments</Title>
      
      {/* Payment Statistics */}
      <PaymentStats paymentsData={paymentsData} loading={loading} />

      {/* Filters Card */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search by customer, receipt, or reference"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Status"
              value={selectedStatus}
              onChange={setSelectedStatus}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="completed">Completed</Select.Option>
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="failed">Failed</Select.Option>
              <Select.Option value="refunded">Refunded</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Payment Method"
              value={selectedMethod}
              onChange={setSelectedMethod}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="mpesa">M-Pesa</Select.Option>
              <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
              <Select.Option value="cash">Cash</Select.Option>
              <Select.Option value="cheque">Cheque</Select.Option>
              <Select.Option value="card">Card</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                Refresh
              </Button>
              <PaymentModal actionRef={actionRef} salesData={salesData} onSuccess={handlePaymentSuccess} />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Payments Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredPayments}
          rowKey={(record) => record._id || record.id || ''}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} payments`,
          }}
        />
      </Card>

      {/* Payment Details Drawer */}
      <PaymentDrawer
        record={selectedPayment}
        visible={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedPayment(null);
        }}
        onRefresh={handleRefresh}
      />
    </div>
  );
};

export default SalesPaymentsTab;
