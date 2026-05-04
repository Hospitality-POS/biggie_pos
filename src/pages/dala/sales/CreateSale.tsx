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
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchProperties, 
  fetchUnits, 
  createPropertySale 
} from '@services/dala';
import { 
  useDalaProperties, 
  useDalaUnitsByProperty 
} from '../../../stores/dalaStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface CreateSaleData {
  property_id: string;
  unit_id: string;
  client_id: string;
  sale_date: string;
  sale_price: number;
  payment_plan: string;
  installment_months?: number;
  deposit_paid: number;
  commission_rate: number;
  sales_agent_id?: string;
  notes?: string;
}

const CreateSale: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  
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
    mutationFn: createPropertySale,
    onSuccess: () => {
      message.success('Sale created successfully');
      queryClient.invalidateQueries(['dala-sales']);
      navigate('/dala/sales');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error || 'Failed to create sale');
    },
  });

  const handleSubmit = (values: any) => {
    const saleData: CreateSaleData = {
      ...values,
      sale_date: values.sale_date.format('YYYY-MM-DD'),
    };
    createMutation.mutate(saleData);
  };

  const handlePropertyChange = (propertyId: string) => {
    setSelectedProperty(propertyId);
    setSelectedUnit('');
    form.setFieldValue('unit_id', undefined);
    form.setFieldValue('sale_price', undefined);
    setUnitPrice(0);
  };

  const handleUnitChange = (unitId: string) => {
    setSelectedUnit(unitId);
    const unit = propertyUnits.find(u => u._id === unitId);
    if (unit) {
      setUnitPrice(unit.base_price);
      form.setFieldValue('sale_price', unit.base_price);
    }
  };

  const calculateCommission = (salePrice: number, commissionRate: number) => {
    return (salePrice * commissionRate) / 100;
  };

  const calculateBalance = (salePrice: number, depositPaid: number) => {
    return salePrice - depositPaid;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dala/sales')}
          >
            Back to Sales
          </Button>
          <Title level={2}>Create New Sale</Title>
        </Space>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            sale_date: dayjs(),
            payment_plan: 'cash',
            commission_rate: 5,
            deposit_paid: 0,
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
                      {unit.name} ({unit.code}) - KES {unit.base_price.toLocaleString()}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            {/* Client Information */}
            <Col xs={24} md={12}>
              <Form.Item
                label="Client Name"
                name="client_id"
                rules={[{ required: true, message: 'Client name is required' }]}
              >
                <Input
                  placeholder="Enter client name"
                  prefix={<UserOutlined />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Sale Date"
                name="sale_date"
                rules={[{ required: true, message: 'Sale date is required' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            {/* Pricing */}
            <Col xs={24} md={8}>
              <Form.Item
                label="Sale Price (KES)"
                name="sale_price"
                rules={[{ required: true, message: 'Sale price is required' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter sale price"
                  min={0}
                  formatter={(value) => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/KES\s?|(,*)/g, '') as unknown as number}
                  onChange={(value) => {
                    const commissionRate = form.getFieldValue('commission_rate') || 0;
                    const commission = calculateCommission(value || 0, commissionRate);
                    form.setFieldValue('commission_amount', commission);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Payment Plan"
                name="payment_plan"
                rules={[{ required: true, message: 'Payment plan is required' }]}
              >
                <Select placeholder="Select payment plan">
                  <Option value="cash">Cash</Option>
                  <Option value="installment">Installment</Option>
                  <Option value="mortgage">Mortgage</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Installment Months"
                name="installment_months"
                dependencies={['payment_plan']}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Number of months"
                  min={1}
                  max={360}
                  disabled={form.getFieldValue('payment_plan') !== 'installment'}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            {/* Deposit and Commission */}
            <Col xs={24} md={8}>
              <Form.Item
                label="Deposit Paid (KES)"
                name="deposit_paid"
                rules={[{ required: true, message: 'Deposit amount is required' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter deposit amount"
                  min={0}
                  max={unitPrice}
                  formatter={(value) => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/KES\s?|(,*)/g, '') as unknown as number}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Commission Rate (%)"
                name="commission_rate"
                rules={[{ required: true, message: 'Commission rate is required' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Commission percentage"
                  min={0}
                  max={50}
                  formatter={(value) => `${value}%`}
                  parser={(value) => value!.replace('%', '') as unknown as number}
                  onChange={(value) => {
                    const salePrice = form.getFieldValue('sale_price') || 0;
                    const commission = calculateCommission(salePrice, value || 0);
                    form.setFieldValue('commission_amount', commission);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Commission Amount (KES)">
                <InputNumber
                  style={{ width: '100%' }}
                  value={form.getFieldValue('commission_amount')}
                  disabled
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
                message="Sale Summary"
                description={
                  <div>
                    <Text>Sale Price: KES {form.getFieldValue('sale_price')?.toLocaleString() || 0}</Text><br />
                    <Text>Deposit Paid: KES {form.getFieldValue('deposit_paid')?.toLocaleString() || 0}</Text><br />
                    <Text>Balance Amount: KES {calculateBalance(form.getFieldValue('sale_price') || 0, form.getFieldValue('deposit_paid') || 0).toLocaleString()}</Text><br />
                    <Text>Commission: KES {form.getFieldValue('commission_amount')?.toLocaleString() || 0}</Text>
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
                  Create Sale
                </Button>
                <Button onClick={() => navigate('/dala/sales')}>
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

export default CreateSale;
