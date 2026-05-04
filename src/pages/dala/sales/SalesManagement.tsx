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
  Modal,
  message,
  Tooltip,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DollarOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPropertySales } from '@services/dala';
import { useDalaSales, useDalaProperties } from '../../../stores/dalaStore';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const SalesManagement: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  
  const sales = useDalaSales();
  const properties = useDalaProperties();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dala-sales'],
    queryFn: fetchPropertySales,
    onSuccess: (data) => {
      sales.setSales(data.data);
    },
  });

  const filteredSales = sales.filter((sale) => {
    const matchesSearch = !searchTerm || 
      sale.property?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.unit?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || sale.status === statusFilter;
    const matchesProperty = !propertyFilter || sale.property_id === propertyFilter;
    
    let matchesDateRange = true;
    if (dateRange) {
      const saleDate = dayjs(sale.sale_date);
      matchesDateRange = saleDate.isAfter(dateRange[0]) && saleDate.isBefore(dateRange[1]);
    }
    
    return matchesSearch && matchesStatus && matchesProperty && matchesDateRange;
  });

  const columns = [
    {
      title: 'Sale Date',
      dataIndex: 'sale_date',
      key: 'sale_date',
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Property',
      dataIndex: ['property', 'name'],
      key: 'property',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Unit',
      dataIndex: ['unit', 'name'],
      key: 'unit',
      render: (name: string) => <Text>{name}</Text>,
    },
    {
      title: 'Client',
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (name: string) => <Text>{name}</Text>,
    },
    {
      title: 'Sale Price',
      dataIndex: 'sale_price',
      key: 'sale_price',
      render: (price: number) => `KES ${price.toLocaleString()}`,
    },
    {
      title: 'Payment Plan',
      dataIndex: 'payment_plan',
      key: 'payment_plan',
      render: (plan: string) => <Tag color="blue">{plan.toUpperCase()}</Tag>,
    },
    {
      title: 'Deposit',
      dataIndex: 'deposit_paid',
      key: 'deposit',
      render: (deposit: number, record: any) => 
        `KES ${deposit.toLocaleString()} (${((deposit / record.sale_price) * 100).toFixed(1)}%)`,
    },
    {
      title: 'Commission',
      dataIndex: 'commission_amount',
      key: 'commission',
      render: (commission: number, record: any) => 
        `KES ${commission.toLocaleString()} (${record.commission_rate}%)`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          pending: 'orange',
          deposit_paid: 'blue',
          active: 'green',
          completed: 'success',
          cancelled: 'red',
        };
        return <Tag color={colors[status]}>{status.replace('_', ' ').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: any) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/dala/sales/${record._id}`)}
            />
          </Tooltip>
          <Tooltip title="Edit Sale">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/dala/sales/${record._id}/edit`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const stats = {
    total: sales.length,
    totalValue: sales.reduce((sum, sale) => sum + sale.sale_price, 0),
    pending: sales.filter(s => s.status === 'pending').length,
    completed: sales.filter(s => s.status === 'completed').length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Sales Management</Title>
            <Text type="secondary">Track property sales and commissions</Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/dala/sales/create')}
            >
              New Sale
            </Button>
          </Col>
        </Row>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Sales"
              value={stats.total}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Value"
              value={stats.totalValue}
              prefix="KES"
              precision={0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Pending"
              value={stats.pending}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completed}
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
              placeholder="Search sales..."
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
              <Option value="deposit_paid">Deposit Paid</Option>
              <Option value="active">Active</Option>
              <Option value="completed">Completed</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="Filter by Property"
              value={propertyFilter}
              onChange={setPropertyFilter}
              style={{ width: '100%' }}
              allowClear
            >
              {properties.map((property) => (
                <Option key={property._id} value={property._id}>
                  {property.name}
                </Option>
              ))}
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
                setPropertyFilter('');
                setDateRange(null);
              }}
            >
              Clear
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Sales Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredSales}
          rowKey="_id"
          loading={isLoading}
          pagination={{
            total: filteredSales.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} sales`,
          }}
        />
      </Card>
    </div>
  );
};

export default SalesManagement;
