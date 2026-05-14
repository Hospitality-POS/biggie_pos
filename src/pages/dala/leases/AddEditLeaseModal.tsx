import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Steps,
  Row,
  Col,
  Card,
  message,
  DatePicker,
  Divider,
  Upload,
  Checkbox,
  Typography,
} from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { fetchProperties } from '@services/dala';
import { fetchAllCustomers } from '@services/customers';
import { useDalaProperties } from '../../../stores/dalaStore';
import dayjs from 'dayjs';
import type { UploadFile } from 'antd/es/upload/interface';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface AddEditLeaseModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  edit?: boolean;
  initialData?: any;
  tenants?: any[];
}

interface LeaseEscalation {
  key: string;
  effectiveDate: string;
  newLeaseAmount: number;
  escalationType: string;
  escalationValue?: number;
  notes?: string;
  applied: boolean;
}


const AddEditLeaseModal: React.FC<AddEditLeaseModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  edit = false,
  initialData,
  tenants = [],
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [rentEscalations, setRentEscalations] = useState<LeaseEscalation[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [blockName, setBlockName] = useState<string>('');
  const [floorName, setFloorName] = useState<string>('');

  const properties = useDalaProperties();

  const { data: fetchedProperties } = useQuery({
    queryKey: ['dala-properties'],
    queryFn: fetchProperties,
    enabled: visible,
    onSuccess: (data: any) => {
      properties.setProperties(data?.data || []);
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchAllCustomers({}),
    enabled: visible,
  });

  const customers = Array.isArray(customersData) ? customersData : (customersData as any)?.data || [];

  // Filter properties to show both lease and rental properties
  const allProperties = fetchedProperties?.data || properties.data || [];
  const leaseProperties = allProperties.filter((p: any) => p.purpose === 'lease' || p.purpose === 'rent' || p.purpose === 'rental');

  useEffect(() => {
    if (visible) {
      if (edit && initialData) {
        form.setFieldsValue({
          propertyId: initialData.propertyId,
          unitId: initialData.unitId,
          blockId: initialData.blockId,
          floorId: initialData.floorId,
          occupantId: initialData.occupantId,
          leaseType: initialData.leaseType || 'monthly',
          startDate: initialData.startDate ? dayjs(initialData.startDate) : dayjs(),
          endDate: initialData.endDate ? dayjs(initialData.endDate) : dayjs().add(12, 'month'),
          unitAreaSqm: initialData.unitAreaSqm,
          leaseAmount: initialData.leaseAmount || initialData.rentAmount,
          leasePerSqm: initialData.leasePerSqm || initialData.rentPerSqm,
          paymentFrequency: initialData.paymentFrequency || initialData.rentFrequency || 'monthly',
          currency: initialData.currency || 'KES',
          paymentDueDay: initialData.paymentDueDay || initialData.rentDueDay || 1,
          depositAmount: initialData.depositAmount || 0,
          depositPaid: initialData.depositPaid || 0,
          depositPaidDate: initialData.depositPaidDate ? dayjs(initialData.depositPaidDate) : undefined,
          depositRefunded: initialData.depositRefunded || 0,
          depositRefundedDate: initialData.depositRefundedDate ? dayjs(initialData.depositRefundedDate) : undefined,
          depositDeductions: initialData.depositDeductions || 0,
          depositNotes: initialData.depositNotes || '',
          serviceChargeAmount: initialData.serviceChargeAmount || 0,
          serviceChargeFrequency: initialData.serviceChargeFrequency || 'monthly',
          utilities: initialData.utilities || {
            water: false,
            electricity: false,
            internet: false,
            garbage: false,
          },
          status: initialData.status || 'pending',
          signedDate: initialData.signedDate ? dayjs(initialData.signedDate) : undefined,
          noticeDate: initialData.noticeDate ? dayjs(initialData.noticeDate) : undefined,
          vacateDate: initialData.vacateDate ? dayjs(initialData.vacateDate) : undefined,
          terminationDate: initialData.terminationDate ? dayjs(initialData.terminationDate) : undefined,
          terminationReason: initialData.terminationReason || '',
          notes: initialData.notes || '',
        });
        if (initialData.rentEscalations) {
          setRentEscalations(initialData.rentEscalations.map((e: any, i: number) => ({
            ...e,
            newRentAmount: e.newLeaseAmount,
            key: e.key || `escalation-${Date.now()}-${i}`,
          })));
        }
        setSelectedPropertyId(initialData.propertyId);
      } else {
        form.resetFields();
        form.setFieldsValue({
          leaseType: 'monthly',
          startDate: dayjs(),
          endDate: dayjs().add(12, 'month'),
          paymentFrequency: 'monthly',
          currency: 'KES',
          serviceChargeFrequency: 'monthly',
          utilities: {
            water: false,
            electricity: false,
            internet: false,
            garbage: false,
          },
          status: 'pending',
        });
        setSelectedPropertyId(null);
        setRentEscalations([]);
      }
      setCurrentStep(0);
      setFileList([]);
    }
  }, [visible, edit, initialData, form]);

  const goToStep2 = async () => {
    try {
      await form.validateFields(['propertyId', 'unitId', 'occupantId', 'leaseType', 'startDate', 'leaseAmount']);
      setCurrentStep(1);
    } catch {
      message.error('Please fill in all required fields before continuing');
    }
  };

  const goToStep3 = async () => {
    try {
      await form.validateFields(['depositAmount', 'paymentDueDay']);
      setCurrentStep(2);
    } catch {
      message.error('Please fill in all required fields before continuing');
    }
  };

  const goToStep1 = () => setCurrentStep(0);
  const goToStep2Back = () => setCurrentStep(1);

  const handlePropertyChange = (value: string) => {
    setSelectedPropertyId(value);
    setBlockName('');
    setFloorName('');
    form.setFieldsValue({
      unitId: undefined,
      blockId: undefined,
      floorId: undefined,
    });
  };

  const handleUnitChange = (value: string) => {
    const property = leaseProperties.find((p: any) => p._id === selectedPropertyId);
    const unit = property?.units?.find((u: any) => u._id === value);

    if (unit) {
      const block = property?.blocks?.find((b: any) => b._id === unit.blockId);
      const floor = block?.floors?.find((f: any) => f._id === unit.floorId);
      setBlockName(block?.name || unit.blockId || '');
      setFloorName(floor?.name || unit.floorId || '');
      form.setFieldsValue({
        blockId: unit.blockId,
        floorId: unit.floorId,
        unitAreaSqm: unit.areaSqm,
        leasePerSqm: unit.rentPerSqm || unit.pricePerSqm || 0,
        leaseAmount: unit.monthlyRent
          || (unit.rentPerSqm && unit.areaSqm ? unit.rentPerSqm * unit.areaSqm : 0)
          || (unit.pricePerSqm && unit.areaSqm ? unit.pricePerSqm * unit.areaSqm : 0)
          || unit.listPrice
          || unit.pricing?.basePrice
          || 0,
        depositAmount: unit.depositAmount || 0,
        serviceChargeAmount: unit.serviceCharge || 0,
        utilities: unit.utilities || {
          water: false,
          electricity: false,
          internet: false,
          garbage: false,
        },
      });
    }
  };

  const addEscalation = () => {
    const newEscalation: LeaseEscalation = {
      key: `escalation-${Date.now()}`,
      effectiveDate: dayjs().add(12, 'month').format('YYYY-MM-DD'),
      newLeaseAmount: 0,
      escalationType: 'fixed',
      escalationValue: 0,
      notes: '',
      applied: false,
    };
    setRentEscalations([...rentEscalations, newEscalation]);
  };

  const updateEscalation = (key: string, field: string, value: any) => {
    setRentEscalations(rentEscalations.map(e => 
      e.key === key ? { ...e, [field]: value } : e
    ));
  };

  const removeEscalation = (key: string) => {
    setRentEscalations(rentEscalations.filter(e => e.key !== key));
  };

  const handleFileChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList);
  };

  const beforeUpload = (file: File) => {
    const isValidType = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'].includes(file.type);
    if (!isValidType) {
      message.error(`${file.name} is not a valid file type. Only JPG/PNG/WEBP/PDF files are allowed!`);
      return Upload.LIST_IGNORE;
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error(`${file.name} is too large. File must be smaller than 10MB!`);
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const formattedValues = {
        ...values,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined,
        signedDate: values.signedDate ? values.signedDate.format('YYYY-MM-DD') : undefined,
        noticeDate: values.noticeDate ? values.noticeDate.format('YYYY-MM-DD') : undefined,
        vacateDate: values.vacateDate ? values.vacateDate.format('YYYY-MM-DD') : undefined,
        terminationDate: values.terminationDate ? values.terminationDate.format('YYYY-MM-DD') : undefined,
        depositPaidDate: values.depositPaidDate ? values.depositPaidDate.format('YYYY-MM-DD') : undefined,
        depositRefundedDate: values.depositRefundedDate ? values.depositRefundedDate.format('YYYY-MM-DD') : undefined,
        leaseAmount: values.leaseAmount,
        leasePerSqm: values.leasePerSqm,
        paymentFrequency: values.paymentFrequency,
        paymentDueDay: values.paymentDueDay,
        leaseEscalations: rentEscalations.map((e: any) => ({
          ...e,
          newLeaseAmount: e.newLeaseAmount,
        })),
        documents: fileList.map((file: any) => ({
          url: file.url || '',
          fileName: file.name,
          documentType: 'signed_lease',
          uploadedAt: new Date(),
        })),
      };
      
      onSubmit(formattedValues);
      form.resetFields();
      setCurrentStep(0);
      setRentEscalations([]);
      setFileList([]);
      return true;
    } catch (error) {
      message.error('Please check all fields');
      return false;
    }
  };

  const getUnitsForProperty = (propertyId: string) => {
    const property = leaseProperties.find((p: any) => p._id === propertyId);
    if (!property) return [];
    return (property as any).units || [];
  };

  const formatUnitLabel = (unit: any) => {
    const type = unit.unitType || unit.type || 'Unit';
    const typeLabel = type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    const price = unit.monthlyRent || (unit.rentPerSqm && unit.areaSqm ? unit.rentPerSqm * unit.areaSqm : 0) || unit.listPrice || unit.pricing?.basePrice || 0;
    const formattedPrice = price.toLocaleString('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    });
    return `${typeLabel} - ${formattedPrice}/mo (${unit.status || 'available'})`;
  };

  const steps = [
    {
      title: 'Lease Details',
      description: 'Property, unit & occupant',
    },
    {
      title: 'Payment Terms',
      description: 'Rent, deposit & utilities',
    },
    {
      title: 'Terms & Submit',
      description: 'Escalations & documents',
    },
  ];

  return (
    <Modal
      title={edit ? 'Edit Lease/Rental' : 'New Lease/Rental'}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      destroyOnClose
    >
      <div style={{ padding: '24px 0' }}>
        <Row gutter={24}>
          <Col span={6}>
            <Steps
              current={currentStep}
              direction="vertical"
              size="small"
              items={steps}
            />
          </Col>
          <Col span={18}>
            {/* Step 1: Lease Details */}
            <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
              <Form form={form} layout="vertical">
                <Form.Item
                  label="Property"
                  name="propertyId"
                  rules={[{ required: true, message: 'Please select a property' }]}
                >
                  <Select
                    placeholder="Select property"
                    onChange={handlePropertyChange}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {leaseProperties.map((property: any) => (
                      <Option key={property._id} value={property._id}>
                        {property.name} - {property.propertyType}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Unit"
                  name="unitId"
                  rules={[{ required: true, message: 'Please select a unit' }]}
                >
                  <Select
                    placeholder="Select unit"
                    disabled={!selectedPropertyId}
                    onChange={handleUnitChange}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {getUnitsForProperty(selectedPropertyId || '').map((unit: any) => (
                      <Option key={unit._id} value={unit._id}>
                        {formatUnitLabel(unit)}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Block</label>
                      <Input disabled value={blockName} placeholder="Auto-populated" />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Floor</label>
                      <Input disabled value={floorName} placeholder="Auto-populated" />
                    </div>
                  </Col>
                </Row>
                <Form.Item name="blockId" hidden>
                  <Input />
                </Form.Item>
                <Form.Item name="floorId" hidden>
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Occupant (Tenant)"
                  name="occupantId"
                  rules={[{ required: true, message: 'Please select an occupant' }]}
                >
                  <Select
                    placeholder="Select occupant"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {customers.map((customer: any) => (
                      <Option key={customer._id} value={customer._id}>
                        {customer.customer_name} - {customer.phone}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Lease Type"
                  name="leaseType"
                  rules={[{ required: true, message: 'Please select lease type' }]}
                >
                  <Select placeholder="Select lease type">
                    <Option value="monthly">Monthly</Option>
                    <Option value="short_stay">Short Stay</Option>
                    <Option value="annual">Annual</Option>
                    <Option value="lease_to_own">Lease to Own</Option>
                    <Option value="commercial">Commercial</Option>
                  </Select>
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Start Date"
                      name="startDate"
                      rules={[{ required: true, message: 'Please select start date' }]}
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="End Date" name="endDate">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Unit Area (sqm)" name="unitAreaSqm">
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        placeholder="Auto from unit"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Currency" name="currency">
                      <Select>
                        <Option value="KES">KES</Option>
                        <Option value="USD">USD</Option>
                        <Option value="EUR">EUR</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Button onClick={onCancel} style={{ marginRight: 8 }}>
                  Cancel
                </Button>
                <Button type="primary" onClick={goToStep2}>
                  Next: Payment Terms →
                </Button>
              </div>
            </div>

            {/* Step 2: Payment Terms */}
            <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Lease Amount"
                      name="leaseAmount"
                      rules={[{ required: true, message: 'Please enter lease amount' }]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value: string | undefined) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Amount per sqm" name="leasePerSqm">
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value: string | undefined) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Payment Frequency"
                      name="paymentFrequency"
                      rules={[{ required: true, message: 'Please select payment frequency' }]}
                    >
                      <Select>
                        <Option value="monthly">Monthly</Option>
                        <Option value="quarterly">Quarterly</Option>
                        <Option value="annually">Annually</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Payment Due Day"
                      name="paymentDueDay"
                      rules={[{ required: true, message: 'Please select payment due day' }]}
                    >
                      <Select placeholder="Select day of month">
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                          const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
                          return (
                            <Option key={day} value={day}>{day}{suffix} of each month</Option>
                          );
                        })}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left">Deposit</Divider>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="Deposit Amount" name="depositAmount">
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value: string | undefined) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Deposit Paid" name="depositPaid">
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value: string | undefined) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Deposit Paid Date" name="depositPaidDate">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="Deposit Refunded" name="depositRefunded">
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value: string | undefined) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Refund Date" name="depositRefundedDate">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Deposit Deductions" name="depositDeductions">
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value: string | undefined) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="Deposit Notes" name="depositNotes">
                  <TextArea rows={2} placeholder="Deposit refund notes" />
                </Form.Item>

                <Divider orientation="left">Service Charge</Divider>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Service Charge Amount" name="serviceChargeAmount">
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value: string | undefined) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Service Charge Frequency" name="serviceChargeFrequency">
                      <Select>
                        <Option value="monthly">Monthly</Option>
                        <Option value="quarterly">Quarterly</Option>
                        <Option value="annually">Annually</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left">Utilities (Tenant Pays)</Divider>
                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item name={['utilities', 'water']} valuePropName="checked">
                      <Checkbox>Water</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name={['utilities', 'electricity']} valuePropName="checked">
                      <Checkbox>Electricity</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name={['utilities', 'internet']} valuePropName="checked">
                      <Checkbox>Internet</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name={['utilities', 'garbage']} valuePropName="checked">
                      <Checkbox>Garbage</Checkbox>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Button onClick={goToStep1} style={{ marginRight: 8 }}>
                  ← Back
                </Button>
                <Button onClick={onCancel} style={{ marginRight: 8 }}>
                  Cancel
                </Button>
                <Button type="primary" onClick={goToStep3}>
                  Next: Terms & Submit →
                </Button>
              </div>
            </div>
            {/* Step 3: Terms & Submit */}
            <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
              <Form form={form} layout="vertical">
                <Form.Item
                  label="Status"
                  name="status"
                  rules={[{ required: true, message: 'Please select status' }]}
                >
                  <Select>
                    <Option value="pending">Pending</Option>
                    <Option value="active">Active</Option>
                    <Option value="notice">Notice</Option>
                    <Option value="expired">Expired</Option>
                    <Option value="terminated">Terminated</Option>
                    <Option value="vacated">Vacated</Option>
                  </Select>
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Signed Date" name="signedDate">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Notice Date" name="noticeDate">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Vacate Date" name="vacateDate">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Termination Date" name="terminationDate">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="Termination Reason" name="terminationReason">
                  <TextArea rows={2} placeholder="Reason for termination" />
                </Form.Item>

                <Divider orientation="left">Lease Escalations</Divider>
                {rentEscalations.map((escalation, index) => (
                  <Card
                    key={escalation.key}
                    size="small"
                    style={{ marginBottom: 8 }}
                    title={`Escalation ${index + 1}`}
                    extra={
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => removeEscalation(escalation.key)}
                      />
                    }
                  >
                    <Row gutter={16}>
                      <Col span={8}>
                        <label>Effective Date</label>
                        <DatePicker
                          value={dayjs(escalation.effectiveDate)}
                          onChange={(date) =>
                            updateEscalation(escalation.key, 'effectiveDate', date?.format('YYYY-MM-DD') || '')
                          }
                          style={{ width: '100%' }}
                        />
                      </Col>
                      <Col span={8}>
                        <label>New Lease Amount</label>
                        <InputNumber
                          value={escalation.newLeaseAmount}
                          onChange={(value) => updateEscalation(escalation.key, 'newLeaseAmount', value || 0)}
                          style={{ width: '100%' }}
                          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={(value: string) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
                        />
                      </Col>
                      <Col span={8}>
                        <label>Escalation Type</label>
                        <Select
                          value={escalation.escalationType}
                          onChange={(value) => updateEscalation(escalation.key, 'escalationType', value)}
                          style={{ width: '100%' }}
                        >
                          <Option value="fixed">Fixed Amount</Option>
                          <Option value="percentage">Percentage</Option>
                        </Select>
                      </Col>
                    </Row>
                    {escalation.escalationType === 'percentage' && (
                      <Row gutter={16} style={{ marginTop: 8 }}>
                        <Col span={12}>
                          <label>Percentage Value</label>
                          <InputNumber
                            value={escalation.escalationValue}
                            onChange={(value) => updateEscalation(escalation.key, 'escalationValue', value || 0)}
                            style={{ width: '100%' }}
                            suffix="%"
                          />
                        </Col>
                      </Row>
                    )}
                    <Row gutter={16} style={{ marginTop: 8 }}>
                      <Col span={24}>
                        <label>Notes</label>
                        <Input
                          value={escalation.notes}
                          onChange={(e) => updateEscalation(escalation.key, 'notes', e.target.value)}
                          placeholder="Escalation notes"
                        />
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={addEscalation}
                  block
                  style={{ marginTop: 8 }}
                >
                  Add Lease Escalation
                </Button>

                <Divider orientation="left">Documents</Divider>
                <Form.Item label="Upload Documents">
                  <Upload
                    fileList={fileList}
                    onChange={handleFileChange}
                    beforeUpload={beforeUpload}
                    accept=".jpg,.jpeg,.png,.pdf,.webp"
                    multiple
                    listType="picture"
                  >
                    <Button icon={<UploadOutlined />}>Select Files</Button>
                  </Upload>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    Supported: JPG, PNG, WEBP, PDF (Max 10MB per file)
                  </Text>
                </Form.Item>

                <Form.Item label="Notes" name="notes">
                  <TextArea rows={4} placeholder="Additional lease notes" />
                </Form.Item>
              </Form>
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Button onClick={goToStep2Back} style={{ marginRight: 8 }}>
                  ← Back
                </Button>
                <Button onClick={onCancel} style={{ marginRight: 8 }}>
                  Cancel
                </Button>
                <Button type="primary" onClick={handleSubmit}>
                  {edit ? 'Update Lease' : 'Create Lease'}
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};

export default AddEditLeaseModal;
