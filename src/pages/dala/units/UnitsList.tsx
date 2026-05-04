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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  HomeOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUnits, deleteUnit } from '@services/dala';
import { useDalaUnits, useDalaProperties } from '../../../stores/dalaStore';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const UnitsList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  
  const units = useDalaUnits();
  const properties = useDalaProperties();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dala-units'],
    queryFn: fetchUnits,
    onSuccess: (data) => {
      units.setUnits(data.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUnit,
    onSuccess: () => {
      message.success('Unit deleted successfully');
      queryClient.invalidateQueries(['dala-units']);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error || 'Failed to delete unit');
    },
  });

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: 'Delete Unit',
      content: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const filteredUnits = units.filter((unit) => {
    const matchesSearch = !searchTerm || 
      unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || unit.status === statusFilter;
    const matchesType = !typeFilter || unit.type === typeFilter;
    const matchesProperty = !propertyFilter || unit.property_id === propertyFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesProperty;
  });

  const columns = [
    {
      title: 'Unit Code',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => (
        <Space>
          <HomeOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Unit Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Property',
      dataIndex: 'property_id',
      key: 'property',
      render: (propertyId: string) => {
        const property = properties.find(p => p._id === propertyId);
        return property ? <Text>{property.name}</Text> : <Text>-</Text>;
      },
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type.toUpperCase()}</Tag>,
    },
    {
      title: 'Size',
      dataIndex: 'size_sqft',
      key: 'size',
      render: (size: number) => `${size.toLocaleString()} sqft`,
    },
    {
      title: 'Bedrooms',
      dataIndex: 'bedrooms',
      key: 'bedrooms',
      render: (bedrooms: number) => bedrooms || '-',
    },
    {
      title: 'Bathrooms',
      dataIndex: 'bathrooms',
      key: 'bathrooms',
      render: (bathrooms: number) => bathrooms || '-',
    },
    {
      title: 'Price',
      dataIndex: 'base_price',
      key: 'price',
      render: (price: number) => `KES ${price.toLocaleString()}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          available: 'green',
          reserved: 'orange',
          sold: 'red',
          rented: 'blue',
          maintenance: 'default',
        };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
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
              onClick={() => navigate(`/dala/units/${record._id}`)}
            />
          </Tooltip>
          <Tooltip title="Edit Unit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/dala/units/${record._id}/edit`)}
            />
          </Tooltip>
          <Tooltip title="Delete Unit">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record._id, record.name)}
              loading={deleteMutation.isLoading}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const stats = {
    total: units.length,
    available: units.filter(u => u.status === 'available').length,
    sold: units.filter(u => u.status === 'sold').length,
    rented: units.filter(u => u.status === 'rented').length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Units</Title>
            <Text type="secondary">Manage property units</Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/dala/units/create')}
            >
              Add Unit
            </Button>
          </Col>
        </Row>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Units"
              value={stats.total}
              prefix={<HomeOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Available"
              value={stats.available}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Sold"
              value={stats.sold}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Rented"
              value={stats.rented}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Search
              placeholder="Search units..."
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
              <Option value="available">Available</Option>
              <Option value="reserved">Reserved</Option>
              <Option value="sold">Sold</Option>
              <Option value="rented">Rented</Option>
              <Option value="maintenance">Maintenance</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="Filter by Type"
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="residential">Residential</Option>
              <Option value="commercial">Commercial</Option>
              <Option value="industrial">Industrial</Option>
              <Option value="mixed">Mixed</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
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
          <Col xs={24} sm={2}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setTypeFilter('');
                setPropertyFilter('');
              }}
            >
              Clear
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Units Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredUnits}
          rowKey="_id"
          loading={isLoading}
          pagination={{
            total: filteredUnits.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} units`,
          }}
        />
      </Card>
    </div>
  );
};

export default UnitsList;
