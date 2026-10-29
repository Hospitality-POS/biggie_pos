import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  message,
  Tooltip,
  DatePicker,
  Drawer,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  DollarOutlined,
  BankOutlined,
  ReloadOutlined,
  UserOutlined,
  HomeOutlined,
  CalendarOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchRentPayments, recordRentPayment, fetchRentInvoices } from '@services/dala';
import dayjs from 'dayjs';
import AddEditRentPaymentModal from './AddEditRentPaymentModal';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const RentCollection: React.FC = () => {
  const shopId = localStorage.getItem('shop_id') || '678409b73f1321be48285b3f';

  const { data: rentPaymentsData, isLoading, refetch } = useQuery({
    queryKey: ['dala-rent-payments', shopId],
    queryFn: () => fetchRentPayments({ shop_id: shopId }),
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['dala-rent-invoices', shopId],
    queryFn: () => fetchRentInvoices({ shop_id: shopId }),
  });

  const rentPayments = rentPaymentsData?.data || [];
  const invoices = invoicesData?.data || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editPayment, setEditPayment] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const recordMutation = useMutation({
    mutationFn: recordRentPayment,
    onSuccess: () => {
      message.success('Payment recorded successfully');
      setModalVisible(false);
      setEditPayment(null);
      refetch();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error || 'Failed to record payment');
    },
  });

  const handleViewDetails = (payment: any) => {
    setSelectedPayment(payment);
    setDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    setSelectedPayment(null);
  };

  const filteredPayments = rentPayments.filter((payment: any) => {
    const matchesSearch = !searchTerm ||
      payment.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.occupant?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.property?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || payment.status === statusFilter;
    const matchesMethod = !methodFilter || payment.paymentMethod === methodFilter;

    let matchesDateRange = true;
    if (dateRange) {
      const paymentDate = dayjs(payment.paymentDate);
      matchesDateRange = paymentDate.isAfter(dateRange[0]) && paymentDate.isBefore(dateRange[1]);
    }

    return matchesSearch && matchesStatus && matchesMethod && matchesDateRange;
  });

  const columns = [
    {
      title: 'Payment Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Receipt #',
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
      render: (receipt: string) => <Text strong>{receipt}</Text>,
    },
    {
      title: 'Occupant',
      dataIndex: ['occupant', 'customer_name'],
      key: 'occupant',
      render: (name: string) => <Text>{name || '-'}</Text>,
    },
    {
      title: 'Property',
      dataIndex: ['property', 'name'],
      key: 'property',
      render: (name: string) => <Text>{name}</Text>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: any) =>
        `${record.currency || 'KES'} ${amount.toLocaleString()}`,
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => {
        const colors: Record<string, string> = {
          cash: 'green',
          mpesa: 'orange',
          bank_transfer: 'blue',
          cheque: 'purple',
          card: 'cyan',
          other: 'default',
        };
        return <Tag color={colors[method]}>{method.replace('_', ' ').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Payment Type',
      dataIndex: 'paymentType',
      key: 'paymentType',
      render: (type: string) => <Tag color="blue">{type.replace('_', ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          pending: 'orange',
          confirmed: 'green',
          reversed: 'red',
        };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Payment">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditPayment(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const stats = {
    total: rentPayments.length,
    totalCollected: rentPayments.reduce((sum, p) => sum + p.amount, 0),
    confirmed: rentPayments.filter(p => p.status === 'confirmed').length,
    pending: rentPayments.filter(p => p.status === 'pending').length,
  };

  const handleAddPayment = () => {
    setEditPayment(null);
    setModalVisible(true);
  };

  const handleEditPayment = (payment: any) => {
    setEditPayment(payment);
    setModalVisible(true);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditPayment(null);
  };

  const handleModalSubmit = (values: any) => {
    if (editPayment) {
      message.success('Payment updated successfully');
      setModalVisible(false);
      setEditPayment(null);
      refetch();
    } else {
      recordMutation.mutate(values);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Rent Collection</Title>
            <Text type="secondary">Collect rent payments for rented properties</Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddPayment}
              >
                Record Payment
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Payments"
              value={stats.total}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Collected"
              value={stats.totalCollected}
              prefix="KES"
              precision={0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Confirmed"
              value={stats.confirmed}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Pending"
              value={stats.pending}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Search
              placeholder="Search payments..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="Filter by Status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="pending">Pending</Option>
              <Option value="confirmed">Confirmed</Option>
              <Option value="reversed">Reversed</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="Filter by Method"
              value={methodFilter}
              onChange={setMethodFilter}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="cash">Cash</Option>
              <Option value="mpesa">M-Pesa</Option>
              <Option value="bank_transfer">Bank Transfer</Option>
              <Option value="cheque">Cheque</Option>
              <Option value="card">Card</Option>
              <Option value="other">Other</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <RangePicker
              placeholder={['Start Date', 'End Date']}
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={4}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setMethodFilter('');
                setDateRange(null);
              }}
            >
              Clear
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Payments Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredPayments}
          rowKey="_id"
          loading={isLoading}
          pagination={{
            total: filteredPayments.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} payments`,
          }}
        />
      </Card>

      {/* Add/Edit Rent Payment Modal */}
      <AddEditRentPaymentModal
        visible={modalVisible}
        onCancel={handleModalCancel}
        onSubmit={handleModalSubmit}
        edit={!!editPayment}
        initialData={editPayment}
        invoices={invoices}
      />

      {/* Payment Details Drawer */}
      <Drawer
        title="Payment Details"
        placement="right"
        width={600}
        open={drawerVisible}
        onClose={handleDrawerClose}
      >
        {selectedPayment && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Amount"
                    value={selectedPayment.amount}
                    prefix={selectedPayment.currency || 'KES'}
                    valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Status"
                    value={selectedPayment.status?.toUpperCase() || 'N/A'}
                    valueStyle={{
                      color: selectedPayment.status === 'confirmed' ? '#52c41a' :
                             selectedPayment.status === 'pending' ? '#fa8c16' : '#f5222d'
                    }}
                  />
                </Col>
              </Row>
            </Card>

            <Descriptions column={1} bordered>
              <Descriptions.Item label="Receipt Number">
                <Text strong>{selectedPayment.receiptNumber || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Date">
                {dayjs(selectedPayment.paymentDate).format('DD MMM YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                <Tag color={
                  selectedPayment.paymentMethod === 'cash' ? 'green' :
                  selectedPayment.paymentMethod === 'mpesa' ? 'orange' :
                  selectedPayment.paymentMethod === 'bank_transfer' ? 'blue' :
                  selectedPayment.paymentMethod === 'cheque' ? 'purple' :
                  selectedPayment.paymentMethod === 'card' ? 'cyan' : 'default'
                }>
                  {selectedPayment.paymentMethod?.replace('_', ' ').toUpperCase() || '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Type">
                <Tag color="blue">{selectedPayment.paymentType?.replace('_', ' ').toUpperCase() || '-'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Period Covered">
                {selectedPayment.periodCovered || '-'}
              </Descriptions.Item>
              {selectedPayment.mpesaCode && (
                <Descriptions.Item label="M-Pesa Code">
                  <Text strong>{selectedPayment.mpesaCode}</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Notes">
                {selectedPayment.notes || '-'}
              </Descriptions.Item>
            </Descriptions>

            {selectedPayment.occupant && (
              <Card title={<><UserOutlined /> Occupant Information</>} style={{ marginTop: 16 }}>
                <Descriptions column={1}>
                  <Descriptions.Item label="Name">
                    {selectedPayment.occupant.customer_name || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">
                    {selectedPayment.occupant.email || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Phone">
                    {selectedPayment.occupant.phone || '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            <Card title={<><HomeOutlined /> Property Information</>} style={{ marginTop: 16 }}>
              <Descriptions column={1}>
                <Descriptions.Item label="Property Name">
                  {selectedPayment.property?.name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Property Type">
                  <Tag color="blue">{selectedPayment.property?.propertyType?.replace('_', ' ').toUpperCase() || '-'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Purpose">
                  <Tag color="green">{selectedPayment.property?.purpose?.toUpperCase() || '-'}</Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title={<><HomeOutlined /> Unit Information</>} style={{ marginTop: 16 }}>
              <Descriptions column={1}>
                <Descriptions.Item label="Unit Number">
                  <Text strong>{selectedPayment.unit?.unitNumber || '-'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Unit Type">
                  <Tag color="purple">{selectedPayment.unit?.unitType?.replace('_', ' ').toUpperCase() || '-'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Area">
                  {selectedPayment.unit?.areaSqm ? `${selectedPayment.unit.areaSqm} sqm` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={selectedPayment.unit?.status === 'occupied' ? 'green' : 'orange'}>
                    {selectedPayment.unit?.status?.toUpperCase() || '-'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title={<><CalendarOutlined /> Timestamps</>} style={{ marginTop: 16 }}>
              <Descriptions column={1}>
                <Descriptions.Item label="Created At">
                  {dayjs(selectedPayment.createdAt).format('DD MMM YYYY HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="Updated At">
                  {dayjs(selectedPayment.updatedAt).format('DD MMM YYYY HH:mm')}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default RentCollection;
