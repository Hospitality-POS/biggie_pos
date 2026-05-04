import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Tag,
  Table,
  Tabs,
  Descriptions,
  Progress,
  Image,
  Divider,
  Statistic,
  Modal,
  message,
} from 'antd';
import {
  EditOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  PlusOutlined,
  EyeOutlined,
  BuildingOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProperty, fetchUnits, fetchBlocks, fetchFloors } from '@services/dala';
import { useDalaSelectedProperty, useDalaUnitsByProperty, useDalaBlocksByProperty } from '../../../stores/dalaStore';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('overview');
  const selectedProperty = useDalaSelectedProperty();
  const propertyUnits = useDalaUnitsByProperty(id || '');
  const propertyBlocks = useDalaBlocksByProperty(id || '');

  const { data, isLoading, error } = useQuery({
    queryKey: ['dala-property', id],
    queryFn: () => fetchProperty(id!),
    enabled: !!id,
    onSuccess: (data) => {
      selectedProperty.setSelectedProperty(data.data);
    },
  });

  const { data: unitsData } = useQuery({
    queryKey: ['dala-units', { property_id: id }],
    queryFn: () => fetchUnits({ property_id: id }),
    enabled: !!id,
    onSuccess: (data) => {
      propertyUnits.setUnits(data.data);
    },
  });

  const { data: blocksData } = useQuery({
    queryKey: ['dala-blocks', { property_id: id }],
    queryFn: () => fetchBlocks({ property_id: id }),
    enabled: !!id,
    onSuccess: (data) => {
      propertyBlocks.setBlocks(data.data);
    },
  });

  if (isLoading) {
    return <div>Loading property details...</div>;
  }

  if (error || !selectedProperty) {
    return <div>Error loading property details</div>;
  }

  const property = selectedProperty;

  const unitColumns = [
    {
      title: 'Unit Code',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type.toUpperCase()}</Tag>,
    },
    {
      title: 'Size (sqft)',
      dataIndex: 'size_sqft',
      key: 'size_sqft',
      render: (size: number) => `${size.toLocaleString()} sqft`,
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
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/dala/units/${record._id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  const blockColumns = [
    {
      title: 'Block Code',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Block Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Floors',
      dataIndex: 'floors',
      key: 'floors',
      render: (floors: number) => `${floors || 0} floors`,
    },
    {
      title: 'Units',
      dataIndex: 'units',
      key: 'units',
      render: (units: number) => `${units || 0} units`,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
    },
  ];

  const occupancyRate = property.total_units > 0 
    ? ((property.total_units - property.available_units) / property.total_units) * 100 
    : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dala/properties')}
          >
            Back to Properties
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/dala/properties/${id}/edit`)}
          >
            Edit Property
          </Button>
        </Space>
      </div>

      {/* Property Overview */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={16}>
            <Title level={2}>{property.name}</Title>
            <Space direction="vertical" size="small">
              <Space>
                <Tag color="blue">{property.code}</Tag>
                <Tag color={property.status === 'completed' ? 'green' : 'orange'}>
                  {property.status.replace('_', ' ').toUpperCase()}
                </Tag>
              </Space>
              {property.location && (
                <Space>
                  <EnvironmentOutlined />
                  <Text>{property.location}</Text>
                </Space>
              )}
              {property.address && (
                <Space>
                  <BuildingOutlined />
                  <Text>{property.address}</Text>
                </Space>
              )}
              {property.description && (
                <Paragraph>{property.description}</Paragraph>
              )}
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Total Units"
                  value={property.total_units}
                  prefix={<HomeOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Available"
                  value={property.available_units}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Sold"
                  value={property.sold_units}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Rented"
                  value={property.rented_units}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Overview" key="overview">
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Card title="Occupancy Rate" size="small">
                  <Progress
                    type="circle"
                    percent={Math.round(occupancyRate)}
                    format={(percent) => `${percent}%`}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Property Details" size="small">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Developer">
                      {property.developer || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Year Built">
                      {property.year_built || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Property Type">
                      {property.property_type?.name || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Created">
                      {new Date(property.created_at).toLocaleDateString()}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
              {property.amenities && property.amenities.length > 0 && (
                <Col xs={24}>
                  <Card title="Amenities" size="small">
                    <Space wrap>
                      {property.amenities.map((amenity, index) => (
                        <Tag key={index} color="blue">
                          {amenity}
                        </Tag>
                      ))}
                    </Space>
                  </Card>
                </Col>
              )}
            </Row>
          </TabPane>

          <TabPane tab="Units" key="units">
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(`/dala/units/create?property_id=${id}`)}
              >
                Add Unit
              </Button>
            </div>
            <Table
              columns={unitColumns}
              dataSource={propertyUnits}
              rowKey="_id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} units`,
              }}
            />
          </TabPane>

          <TabPane tab="Blocks" key="blocks">
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(`/dala/blocks/create?property_id=${id}`)}
              >
                Add Block
              </Button>
            </div>
            <Table
              columns={blockColumns}
              dataSource={propertyBlocks}
              rowKey="_id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} blocks`,
              }}
            />
          </TabPane>

          {property.images && property.images.length > 0 && (
            <TabPane tab="Gallery" key="gallery">
              <Row gutter={[16, 16]}>
                {property.images.map((image, index) => (
                  <Col xs={24} sm={12} md={8} key={index}>
                    <Image
                      width="100%"
                      height={200}
                      src={image}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                    />
                  </Col>
                ))}
              </Row>
            </TabPane>
          )}
        </Tabs>
      </Card>
    </div>
  );
};

export default PropertyDetail;
