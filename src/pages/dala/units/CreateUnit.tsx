import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Space,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchProperties, 
  fetchBlocks, 
  fetchFloors, 
  createUnit 
} from '@services/dala';
import { 
  useDalaProperties, 
  useDalaBlocksByProperty,
  useDalaFloorsByBlock 
} from '../../../stores/dalaStore';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface CreateUnitData {
  name: string;
  code: string;
  type: string;
  bedrooms?: number;
  bathrooms?: number;
  size_sqft: number;
  block_id: string;
  floor_id: string;
  property_id: string;
  base_price: number;
  current_price?: number;
  status: string;
}

const CreateUnit: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  
  const properties = useDalaProperties();
  const propertyBlocks = useDalaBlocksByProperty(selectedProperty);
  const blockFloors = useDalaFloorsByBlock(selectedBlock);

  // Get property_id from URL params if provided
  useEffect(() => {
    const propertyId = searchParams.get('property_id');
    if (propertyId) {
      setSelectedProperty(propertyId);
      form.setFieldValue('property_id', propertyId);
    }
  }, [searchParams, form]);

  const { data: propertiesData } = useQuery({
    queryKey: ['dala-properties'],
    queryFn: fetchProperties,
    onSuccess: (data) => {
      properties.setProperties(data.data);
    },
  });

  const { data: blocksData } = useQuery({
    queryKey: ['dala-blocks', { property_id: selectedProperty }],
    queryFn: () => fetchBlocks({ property_id: selectedProperty }),
    enabled: !!selectedProperty,
    onSuccess: (data) => {
      propertyBlocks.setBlocks(data.data);
    },
  });

  const { data: floorsData } = useQuery({
    queryKey: ['dala-floors', { block_id: selectedBlock }],
    queryFn: () => fetchFloors({ block_id: selectedBlock }),
    enabled: !!selectedBlock,
    onSuccess: (data) => {
      blockFloors.setFloors(data.data);
    },
  });

  const createMutation = useMutation({
    mutationFn: createUnit,
    onSuccess: () => {
      message.success('Unit created successfully');
      queryClient.invalidateQueries(['dala-units']);
      navigate('/dala/units');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error || 'Failed to create unit');
    },
  });

  const handleSubmit = (values: any) => {
    const unitData: CreateUnitData = {
      ...values,
    };
    createMutation.mutate(unitData);
  };

  const handlePropertyChange = (propertyId: string) => {
    setSelectedProperty(propertyId);
    setSelectedBlock('');
    form.setFieldValue('block_id', undefined);
    form.setFieldValue('floor_id', undefined);
  };

  const handleBlockChange = (blockId: string) => {
    setSelectedBlock(blockId);
    form.setFieldValue('floor_id', undefined);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dala/units')}
          >
            Back to Units
          </Button>
          <Title level={2}>Create New Unit</Title>
        </Space>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            status: 'available',
          }}
        >
          <Row gutter={[24, 24]}>
            {/* Basic Information */}
            <Col xs={24} md={12}>
              <Form.Item
                label="Property"
                name="property_id"
                rules={[{ required: true, message: 'Property is required' }]}
              >
                <Select
                  placeholder="Select property"
                  onChange={handlePropertyChange}
                  value={selectedProperty}
                >
                  {properties.map((property) => (
                    <Option key={property._id} value={property._id}>
                      {property.name} ({property.code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Block"
                name="block_id"
                rules={[{ required: true, message: 'Block is required' }]}
              >
                <Select
                  placeholder="Select block"
                  onChange={handleBlockChange}
                  disabled={!selectedProperty}
                  value={selectedBlock}
                >
                  {propertyBlocks.map((block) => (
                    <Option key={block._id} value={block._id}>
                      {block.name} ({block.code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Floor"
                name="floor_id"
                rules={[{ required: true, message: 'Floor is required' }]}
              >
                <Select
                  placeholder="Select floor"
                  disabled={!selectedBlock}
                >
                  {blockFloors.map((floor) => (
                    <Option key={floor._id} value={floor._id}>
                      {floor.name} (Floor {floor.number})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Unit Name"
                name="name"
                rules={[{ required: true, message: 'Unit name is required' }]}
              >
                <Input placeholder="Enter unit name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Unit Code"
                name="code"
                rules={[{ required: true, message: 'Unit code is required' }]}
              >
                <Input placeholder="Enter unit code" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Unit Type"
                name="type"
                rules={[{ required: true, message: 'Unit type is required' }]}
              >
                <Select placeholder="Select unit type">
                  <Option value="residential">Residential</Option>
                  <Option value="commercial">Commercial</Option>
                  <Option value="industrial">Industrial</Option>
                  <Option value="mixed">Mixed</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Status"
                name="status"
                rules={[{ required: true, message: 'Status is required' }]}
              >
                <Select placeholder="Select status">
                  <Option value="available">Available</Option>
                  <Option value="reserved">Reserved</Option>
                  <Option value="sold">Sold</Option>
                  <Option value="rented">Rented</Option>
                  <Option value="maintenance">Maintenance</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Unit Specifications */}
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Size (sqft)"
                name="size_sqft"
                rules={[{ required: true, message: 'Size is required' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter size in square feet"
                  min={1}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Bedrooms"
                name="bedrooms"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Number of bedrooms"
                  min={0}
                  max={20}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Bathrooms"
                name="bathrooms"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Number of bathrooms"
                  min={0}
                  max={20}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Pricing */}
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Base Price (KES)"
                name="base_price"
                rules={[{ required: true, message: 'Base price is required' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter base price"
                  min={0}
                  formatter={(value) => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\KES\s?|(,*)/g, '') as unknown as number}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Current Price (KES)"
                name="current_price"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter current price (optional)"
                  min={0}
                  formatter={(value) => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\KES\s?|(,*)/g, '') as unknown as number}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Form Actions */}
          <Row>
            <Col span={24}>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={createMutation.isLoading}
                >
                  Create Unit
                </Button>
                <Button onClick={() => navigate('/dala/units')}>
                  Cancel
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

export default CreateUnit;
