import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  message,
  DatePicker,
  Select,
  Input,
  Drawer,
  Descriptions,
  Empty,
  Spin,
} from 'antd';
import {
  ReloadOutlined,
  FilterOutlined,
  EyeOutlined,
  DownloadOutlined,
  FileTextOutlined,
  AlertOutlined,
  CalendarOutlined,
  DollarOutlined,
  UserOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@services/request';
import { BASE_URL } from '@utils/config';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  orange: "#f59e0b",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

interface PaymentPlansDueTabProps {
  showAddButton?: boolean;
}

const PaymentPlansDueTab: React.FC<PaymentPlansDueTabProps> = ({ showAddButton = true }) => {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [propertyFilter, setPropertyFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const shop_id = localStorage.getItem("shopId");

  const fetchPaymentPlansDue = async () => {
    try {
      const params: any = { shop_id };
      if (dateRange) {
        params.startDate = dateRange[0].toISOString();
        params.endDate = dateRange[1].toISOString();
      }
      if (propertyFilter) params.property_id = propertyFilter;
      if (customerFilter) params.customer_id = customerFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await axiosInstance.get(`${BASE_URL}/api/dala/reports/payment-plans-due`, {
        params,
        headers: {
          'x-shop-id': shop_id,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch payment plans due:', error);
      throw error;
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payment-plans-due', dateRange, propertyFilter, customerFilter, statusFilter],
    queryFn: fetchPaymentPlansDue,
  });

  const paymentPlans = data?.data?.paymentPlans || data?.paymentPlans || [];
  const summary = data?.data?.summary || data?.summary || {};

  const handleViewDetails = (plan: any) => {
    setSelectedPlan(plan);
    setDrawerVisible(true);
  };

  const handleExport = async (format: 'json' | 'excel' | 'pdf') => {
    try {
      const params: any = { 
        shop_id,
        export: format,
      };
      if (dateRange) {
        params.startDate = dateRange[0].toISOString();
        params.endDate = dateRange[1].toISOString();
      }
      if (propertyFilter) params.property_id = propertyFilter;
      if (customerFilter) params.customer_id = customerFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await axiosInstance.get(`${BASE_URL}/api/dala/reports/payment-plans-due`, {
        params,
        responseType: format === 'json' ? 'json' : 'blob',
        headers: {
          'x-shop-id': shop_id,
        },
      });

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payment-plans-due-${dayjs().format('YYYY-MM-DD')}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `payment-plans-due-${dayjs().format('YYYY-MM-DD')}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
      message.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      message.error('Failed to export');
    }
  };

  const columns = [
    {
      title: 'Sale Code',
      dataIndex: 'saleCode',
      key: 'saleCode',
      render: (code: string) => (
        <Text strong style={{ fontSize: 12 }}>{code || '-'}</Text>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Space size={4}>
            <UserOutlined style={{ color: C.blue }} />
            <Text style={{ fontSize: 12 }}>{name || 'Unknown'}</Text>
          </Space>
          {record.customerEmail && (
            <Text style={{ fontSize: 10, color: C.subText }}>{record.customerEmail}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Property',
      dataIndex: 'propertyName',
      key: 'propertyName',
      render: (name: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Space size={4}>
            <HomeOutlined style={{ color: C.primary }} />
            <Text style={{ fontSize: 12 }}>{name || '-'}</Text>
          </Space>
          {record.propertyType && (
            <Tag style={{ fontSize: 10 }}>{record.propertyType}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Installment',
      dataIndex: 'installmentAmount',
      key: 'installmentAmount',
      align: 'right' as const,
      render: (amount: number) => (
        <Text strong style={{ fontSize: 12, color: C.red }}>
          KES {(amount || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: 'Paid',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      align: 'right' as const,
      render: (amount: number) => (
        <Text style={{ fontSize: 12, color: C.green }}>
          KES {(amount || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: 'Balance',
      dataIndex: 'remainingBalance',
      key: 'remainingBalance',
      align: 'right' as const,
      render: (balance: number) => (
        <Text style={{ fontSize: 12, color: C.subText }}>
          KES {(balance || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => {
        const isOverdue = dayjs(date).isBefore(dayjs(), 'day');
        return (
          <Space>
            <CalendarOutlined style={{ color: isOverdue ? C.red : C.subText }} />
            <Text style={{ fontSize: 12, color: isOverdue ? C.red : C.subText }}>
              {date ? dayjs(date).format('DD MMM YYYY') : '-'}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          active: 'green',
          partial: 'orange',
          completed: 'blue',
          overdue: 'red',
        };
        return <Tag color={colors[status] || 'default'}>{status?.toUpperCase() || '-'}</Tag>;
      },
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => (
        <Tag style={{ fontSize: 11 }}>{method?.replace('_', ' ').toUpperCase() || '-'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <>
      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Plans"
              value={summary.totalPlans || paymentPlans.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Amount"
              value={summary.totalAmount || 0}
              prefix="KES"
              precision={0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Paid"
              value={summary.totalPaid || 0}
              prefix="KES"
              precision={0}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Outstanding Balance"
              value={summary.totalBalance || summary.outstandingBalance || 0}
              prefix="KES"
              precision={0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={4}>
            <div>
              <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>Date Range</Text>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ width: '100%' }}
              />
            </div>
          </Col>
          <Col xs={24} sm={4}>
            <div>
              <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>Property</Text>
              <Select
                placeholder="All Properties"
                value={propertyFilter}
                onChange={setPropertyFilter}
                allowClear
                style={{ width: '100%' }}
              >
                {/* Add property options if needed */}
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={4}>
            <div>
              <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>Customer</Text>
              <Input
                placeholder="Search customer..."
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                allowClear
              />
            </div>
          </Col>
          <Col xs={24} sm={4}>
            <div>
              <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>Status</Text>
              <Select
                placeholder="All Status"
                value={statusFilter}
                onChange={setStatusFilter}
                allowClear
                style={{ width: '100%' }}
              >
                <Option value="active">Active</Option>
                <Option value="partial">Partial</Option>
                <Option value="completed">Completed</Option>
                <Option value="overdue">Overdue</Option>
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={4}>
            <div>
              <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>Export</Text>
              <Space>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => handleExport('json')}
                >
                  JSON
                </Button>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => handleExport('excel')}
                >
                  Excel
                </Button>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => handleExport('pdf')}
                >
                  PDF
                </Button>
              </Space>
            </div>
          </Col>
          <Col xs={24} sm={4}>
            <div style={{ textAlign: 'right' }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                loading={isLoading}
              >
                Refresh
              </Button>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Payment Plans Table */}
      <Card
        extra={
          <Space>
            <AlertOutlined style={{ color: C.red }} />
            <Text type="secondary">
              {paymentPlans.length} payment plans due
            </Text>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={paymentPlans}
          rowKey="_id"
          loading={isLoading}
          pagination={{
            total: paymentPlans.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} payment plans`,
          }}
          locale={{
            emptyText: (
              <Empty
                description="No payment plans due"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      {/* Payment Plan Details Drawer */}
      <Drawer
        title={
          <Space>
            <FileTextOutlined />
            <span>Payment Plan Details</span>
          </Space>
        }
        placement="right"
        width={600}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedPlan(null);
        }}
      >
        {selectedPlan && (
          <Spin spinning={false}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Sale Code">
                <Text strong>{selectedPlan.saleCode || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Customer">
                <Space direction="vertical" size={0}>
                  <Space size={4}>
                    <UserOutlined />
                    <Text>{selectedPlan.customerName || 'Unknown'}</Text>
                  </Space>
                  {selectedPlan.customerEmail && (
                    <Text style={{ fontSize: 11, color: C.subText }}>{selectedPlan.customerEmail}</Text>
                  )}
                  {selectedPlan.customerPhone && (
                    <Text style={{ fontSize: 11, color: C.subText }}>{selectedPlan.customerPhone}</Text>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Property">
                <Space direction="vertical" size={0}>
                  <Space size={4}>
                    <HomeOutlined />
                    <Text>{selectedPlan.propertyName || '-'}</Text>
                  </Space>
                  {selectedPlan.propertyType && (
                    <Tag style={{ fontSize: 10 }}>{selectedPlan.propertyType}</Tag>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                <Text strong style={{ color: C.blue }}>
                  KES {(selectedPlan.totalAmount || 0).toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Initial Deposit">
                <Text style={{ color: C.green }}>
                  KES {(selectedPlan.initialDeposit || 0).toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Installment Amount">
                <Text strong style={{ color: C.red }}>
                  KES {(selectedPlan.installmentAmount || 0).toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Paid Amount">
                <Text style={{ color: C.green }}>
                  KES {(selectedPlan.paidAmount || 0).toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Outstanding Balance">
                <Text strong style={{ color: C.orange }}>
                  KES {(selectedPlan.outstandingBalance || 0).toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Remaining Balance">
                <Text style={{ color: C.subText }}>
                  KES {(selectedPlan.remainingBalance || 0).toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                <Space>
                  <CalendarOutlined />
                  <Text>{selectedPlan.dueDate ? dayjs(selectedPlan.dueDate).format('DD MMM YYYY') : '-'}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Next Due Date">
                <Space>
                  <CalendarOutlined />
                  <Text>{selectedPlan.nextDueDate ? dayjs(selectedPlan.nextDueDate).format('DD MMM YYYY') : '-'}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Installment Frequency">
                <Text>{selectedPlan.installmentFrequency?.replace('_', ' ').toUpperCase() || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Number of Installments">
                <Text>{selectedPlan.numberOfInstallments || 0}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedPlan.status === 'active' ? 'green' : 'orange'}>
                  {selectedPlan.status?.toUpperCase() || '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                <Tag>{selectedPlan.paymentMethod?.replace('_', ' ').toUpperCase() || '-'}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Spin>
        )}
      </Drawer>
    </>
  );
};

export default PaymentPlansDueTab;
