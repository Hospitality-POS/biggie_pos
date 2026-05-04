import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Space,
  message,
  Divider,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UserOutlined,
  HomeOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchProperties, 
  fetchUnits, 
  createLease 
} from '@services/dala';
import { 
  useDalaProperties, 
  useDalaUnitsByProperty 
} from '../../../stores/dalaStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface CreateLeaseData {
  property_id: string;
  unit_id: string;
  tenant_id: string;
  lease_start: string;
  lease_end: string;
  monthly_rent: number;
  security_deposit: number;
  payment_frequency: string;
  notes?: string;
}

const CreateLease: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [leaseDuration, setLeaseDuration] = useState<number>(12);
  
  const properties = useDalaProperties();
  const propertyUnits = useDalaUnitsByProperty(selectedProperty);

  // Get unit_id from URL params if provided
  useEffect(() => {
    const unitId = searchParams.get('unit_id');
    if (unitId) {
      setSelectedUnit(unitId);
      form.setFieldValue('unit_id', unitId);
    }
  }, [searchParams, form]);

  const { data: propertiesData } = useQuery({
    queryKey: ['dala-properties'],
    queryFn: fetchProperties,
    onSuccess: (data) => {
      properties.setProperties(data.data);
    },
  });

  const { data: unitsData } = useQuery({
    queryKey: ['dala-units', { property_id: selectedProperty }],
    queryFn: () => fetchUnits({ property_id: selectedProperty }),
    enabled: !!selectedProperty,
    onSuccess: (data) => {
      propertyUnits.setUnits(data.data);
    },
  });

  const createMutation = useMutation({
    mutationFn: createLease,
    onSuccess: () => {
      message.success('Lease created successfully');
      queryClient.invalidateQueries(['dala-leases']);
      navigate('/dala/leases');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error || 'Failed to create lease');
    },
  });

  const handleSubmit = (values: any) => {
    const leaseData: CreateLeaseData = {
      ...values,
      lease_start: values.lease_start.format('YYYY-MM-DD'),
      lease_end: values.lease_end.format('YYYY-MM-DD'),
    };
    createMutation.mutate(leaseData);
  };

  const handlePropertyChange = (propertyId: string) => {
    setSelectedProperty(propertyId);
    setSelectedUnit('');
    form.setFieldValue('unit_id', undefined);
  };

  const handleUnitChange = (unitId: string) => {
    setSelectedUnit(unitId);
    const unit = propertyUnits.find(u => u._id === unitId);
    if (unit) {
      // Set default monthly rent based on unit price (1% of unit price as monthly rent)
      const defaultRent = Math.round(unit.base_price * 0.01);
      form.setFieldValue('monthly_rent', defaultRent);
      form.setFieldValue('security_deposit', defaultRent * 2); // 2 months security deposit
    }
  };

  const handleLeaseStartChange = (date: any) => {
    if (date) {
      const endDate = date.add(leaseDuration, 'month');
      form.setFieldValue('lease_end', endDate);
    }
  };

  const calculateTotalRent = (monthlyRent: number, leaseStart: any, leaseEnd: any) => {
    if (monthlyRent && leaseStart && leaseEnd) {
      const months = leaseEnd.diff(leaseStart, 'month');
      return monthlyRent * months;
    }
    return 0;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dala/leases')}
          >
            Back to Leases
          </Button>
          <Title level={2}>Create New Lease</Title>
        </Space>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            lease_start: dayjs(),
            lease_end: dayjs().add(12, 'month'),
            payment_frequency: 'monthly',
          }}
        >
          <Row gutter={[24, 24]}>
            {/* Property and Unit Selection */}
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
                label="Unit"
                name="unit_id"
                rules={[{ required: true, message: 'Unit is required' }]}
              >
                <Select
                  placeholder="Select unit"
                  onChange={handleUnitChange}
                  disabled={!selectedProperty}
                  value={selectedUnit}
                >
                  {propertyUnits
                    .filter(unit => unit.status === 'available')
                    .map((unit) => (
                    <Option key={unit._id} value={unit._id}>
                      {unit.name} ({unit.code}) - {unit.size_sqft} sqft
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            {/* Tenant Information */}
            <Col xs={24} md={12}>
              <Form.Item
                label="Tenant Name"
                name="tenant_id"
                rules={[{ required: true, message: 'Tenant name is required' }]}
              >
                <Input
                  placeholder="Enter tenant name"
                  prefix={<UserOutlined />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Payment Frequency"
                name="payment_frequency"
                rules={[{ required: true, message: 'Payment frequency is required' }]}
              >
                <Select placeholder="Select payment frequency">
                  <Option value="monthly">Monthly</Option>
                  <Option value="quarterly">Quarterly</Option>
                  <Option value="semi_annually">Semi-Annually</Option>
                  <Option value="annually">Annually</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            {/* Lease Period */}
            <Col xs={24} md={8}>
              <Form.Item
                label="Lease Start Date"
                name="lease_start"
                rules={[{ required: true, message: 'Lease start date is required' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  onChange={handleLeaseStartChange}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Lease End Date"
                name="lease_end"
                rules={[{ required: true, message: 'Lease end date is required' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Lease Duration">
                <InputNumber
                  style={{ width: '100%' }}
                  value={leaseDuration}
                  onChange={(value) => {
                    setLeaseDuration(value || 12);
                    const startDate = form.getFieldValue('lease_start');
                    if (startDate) {
                      const endDate = startDate.add(value || 12, 'month');
                      form.setFieldValue('lease_end', endDate);
                    }
                  }}
                  min={1}
                  max={120}
                  formatter={(value) => `${value} months`}
                  parser={(value) => value!.replace(' months', '') as unknown as number}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            {/* Financial Details */}
            <Col xs={24} md={12}>
              <Form.Item
                label="Monthly Rent (KES)"
                name="monthly_rent"
                rules={[{ required: true, message: 'Monthly rent is required' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter monthly rent"
                  min={0}
                  formatter={(value) => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/KES\s?|(,*)/g, '') as unknown as number}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Security Deposit (KES)"
                name="security_deposit"
                rules={[{ required: true, message: 'Security deposit is required' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter security deposit"
                  min={0}
                  formatter={(value) => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/KES\s?|(,*)/g, '') as unknown as number}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Summary */}
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Alert
                message="Lease Summary"
                description={
                  <div>
                    <Text>Monthly Rent: KES {form.getFieldValue('monthly_rent')?.toLocaleString() || 0}</Text><br />
                    <Text>Security Deposit: KES {form.getFieldValue('security_deposit')?.toLocaleString() || 0}</Text><br />
                    <Text>Total Rent for Lease Period: KES {calculateTotalRent(
                      form.getFieldValue('monthly_rent') || 0,
                      form.getFieldValue('lease_start'),
                      form.getFieldValue('lease_end')
                    ).toLocaleString()}</Text><br />
                    <Text>Payment Frequency: {form.getFieldValue('payment_frequency') || 'monthly'}</Text>
                  </div>
                }
                type="info"
                showIcon
              />
            </Col>
          </Row>

          <Divider />

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
                  Create Lease
                </Button>
                <Button onClick={() => navigate('/dala/leases')}>
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

export default CreateLease;
