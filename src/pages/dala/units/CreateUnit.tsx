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
  Switch,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
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
  unitType?: string;
  unitNumber?: string;
  areaSqm: number;
  blockId: string;
  floorId: string;
  propertyId: string;
  pricing?: {
    basePrice: number;
    pricePerSqm: number;
    minPrice: number;
    maxPrice: number;
    currency: 'KES' | 'USD' | 'EUR' | 'GBP';
  };
  rentPerSqm?: number;
  monthlyRent?: number;
  serviceCharge?: number;
  status: string;
  trackIndividualUnits?: boolean;
  apartments?: Array<{
    apartmentName: string;
    apartmentNumber?: string;
    area: {
      value: number;
      unit: 'sqm' | 'sqft';
    };
    status: string;
  }>;
}

const CreateUnit: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [propertyPurpose, setPropertyPurpose] = useState<'sale' | 'rental' | 'mixed'>('sale');
  const [trackIndividualUnits, setTrackIndividualUnits] = useState<boolean>(false);

  const properties = useDalaProperties();
  const propertyBlocks = useDalaBlocksByProperty(selectedProperty);
  const blockFloors = useDalaFloorsByBlock(selectedBlock);

  // Get propertyId from URL params if provided
  useEffect(() => {
    const propertyId = searchParams.get('property_id');
    if (propertyId) {
      setSelectedProperty(propertyId);
      form.setFieldValue('propertyId', propertyId);
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
    form.setFieldValue('blockId', undefined);
    form.setFieldValue('floorId', undefined);
  };

  const handleBlockChange = (blockId: string) => {
    setSelectedBlock(blockId);
    form.setFieldValue('floorId', undefined);
  };

  const isSaleOrMixed = propertyPurpose === 'sale' || propertyPurpose === 'mixed';
  const isRentalOrMixed = propertyPurpose === 'rental' || propertyPurpose === 'mixed';

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
            {/* Property Purpose */}
            <Col xs={24} md={12}>
              <Form.Item
                label="Property Purpose"
                name="propertyPurpose"
                rules={[{ required: true, message: 'Property purpose is required' }]}
              >
                <Select
                  placeholder="Select property purpose"
                  value={propertyPurpose}
                  onChange={(value) => setPropertyPurpose(value)}
                >
                  <Option value="sale">Sale</Option>
                  <Option value="rental">Rental</Option>
                  <Option value="mixed">Mixed (Sale & Rental)</Option>
                </Select>
              </Form.Item>
            </Col>
            {/* Basic Information */}
            <Col xs={24} md={12}>
              <Form.Item
                label="Property"
                name="propertyId"
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
                name="blockId"
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
                name="floorId"
                rules={[{ required: true, message: 'Floor is required' }]}
              >
                <Select
                  placeholder="Select floor"
                  disabled={!selectedBlock}
                >
                  {blockFloors.map((floor) => (
                    <Option key={floor._id} value={floor._id}>
                      {floor.name} (Floor {floor.floorNumber})
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
                label="Area (sqm)"
                name="areaSqm"
                rules={[{ required: true, message: 'Area is required' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter area in square meters"
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

          {/* Pricing - Sale */}
          {isSaleOrMixed && (
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Base Price"
                  name={['pricing', 'basePrice']}
                  rules={[{ required: isSaleOrMixed, message: 'Base price is required for sale units' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter base price"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Price per SQM"
                  name={['pricing', 'pricePerSqm']}
                  rules={[{ required: isSaleOrMixed, message: 'Price per SQM is required for sale units' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter price per square meter"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Min Price"
                  name={['pricing', 'minPrice']}
                  rules={[{ required: isSaleOrMixed, message: 'Min price is required for sale units' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter minimum price"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Max Price"
                  name={['pricing', 'maxPrice']}
                  rules={[{ required: isSaleOrMixed, message: 'Max price is required for sale units' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter maximum price"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Currency"
                  name={['pricing', 'currency']}
                  rules={[{ required: isSaleOrMixed, message: 'Currency is required for sale units' }]}
                  initialValue="KES"
                >
                  <Select placeholder="Select currency">
                    <Option value="KES">KES (Kenyan Shilling)</Option>
                    <Option value="USD">USD (US Dollar)</Option>
                    <Option value="EUR">EUR (Euro)</Option>
                    <Option value="GBP">GBP (British Pound)</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Pricing - Rental */}
          {isRentalOrMixed && (
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Rent per SQM"
                  name="rentPerSqm"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter rent per square meter"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Monthly Rent"
                  name="monthlyRent"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter monthly rent"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Service Charge"
                  name="serviceCharge"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter service charge"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Apartment Tracking */}
          <Row gutter={[24, 24]}>
            <Col xs={24}>
              <Form.Item
                label="Track Individual Units (Apartments)"
                name="trackIndividualUnits"
                valuePropName="checked"
              >
                <Switch
                  checked={trackIndividualUnits}
                  onChange={setTrackIndividualUnits}
                />
              </Form.Item>
            </Col>
          </Row>

          {trackIndividualUnits && (
            <Form.List name="apartments">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Card
                      key={key}
                      size="small"
                      title={`Apartment ${name + 1}`}
                      extra={
                        <Button type="link" danger onClick={() => remove(name)}>
                          Remove
                        </Button>
                      }
                      style={{ marginBottom: 16 }}
                    >
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            {...restField}
                            label="Apartment Name"
                            name={[name, 'apartmentName']}
                            rules={[{ required: true, message: 'Apartment name is required' }]}
                          >
                            <Input placeholder="Enter apartment name" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            {...restField}
                            label="Apartment Number"
                            name={[name, 'apartmentNumber']}
                          >
                            <Input placeholder="Enter apartment number" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            {...restField}
                            label="Area Value"
                            name={[name, 'area', 'value']}
                            rules={[{ required: true, message: 'Area value is required' }]}
                          >
                            <InputNumber
                              style={{ width: '100%' }}
                              placeholder="Enter area value"
                              min={0}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            {...restField}
                            label="Area Unit"
                            name={[name, 'area', 'unit']}
                            initialValue="sqm"
                          >
                            <Select>
                              <Option value="sqm">Square Meters (sqm)</Option>
                              <Option value="sqft">Square Feet (sqft)</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            {...restField}
                            label="Status"
                            name={[name, 'status']}
                            initialValue="available"
                          >
                            <Select>
                              <Option value="available">Available</Option>
                              <Option value="reserved">Reserved</Option>
                              <Option value="sold">Sold</Option>
                              <Option value="occupied">Occupied</Option>
                              <Option value="under_construction">Under Construction</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Add Apartment
                  </Button>
                </>
              )}
            </Form.List>
          )}

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
