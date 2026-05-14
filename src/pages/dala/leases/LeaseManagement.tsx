import React, { useState } from 'react';
import { Drawer, Tabs, Modal, InputNumber, Form, Upload } from 'antd';
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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  HomeOutlined,
  CalendarOutlined,
  ReloadOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useDalaProperties } from '../../../stores/dalaStore';
import dayjs from 'dayjs';
import AddEditLeaseModal from './AddEditLeaseModal';
import { createLease, updateLease, fetchLeases, generateBulkInvoices } from '@services/dala';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const LeaseManagement: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: propertiesData } = useDalaProperties();
  const shopId = localStorage.getItem('shop_id') || '678409b73f1321be48285b3f';

  const { data: leasesData, isLoading, refetch } = useQuery({
    queryKey: ['dala-leases', shopId],
    queryFn: () => fetchLeases({ shop_id: shopId }),
  });

  const leases = leasesData?.data || [];

  const createMutation = useMutation({
    mutationFn: createLease,
    onSuccess: () => {
      message.success('Lease created successfully');
      setModalVisible(false);
      setEditLease(null);
      queryClient.invalidateQueries(['dala-leases']);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error || 'Failed to create lease');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateLease(id, data),
    onSuccess: (response: any) => {
      message.success('Lease updated successfully');
      setModalVisible(false);
      setEditLease(null);
      queryClient.invalidateQueries(['dala-leases']);
      // Update selectedLease with new data if drawer is open
      if (selectedLease && response?.data) {
        setSelectedLease(response.data);
      }
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error || 'Failed to update lease');
    },
  });

  const generateInvoicesMutation = useMutation({
    mutationFn: generateBulkInvoices,
    onSuccess: () => {
      message.success('Invoices generated successfully');
      setInvoiceModalVisible(false);
      invoiceForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error || 'Failed to generate invoices');
    },
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editLease, setEditLease] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedLease, setSelectedLease] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('deposit');
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [serviceChargeModalVisible, setServiceChargeModalVisible] = useState(false);
  const [escalationsModalVisible, setEscalationsModalVisible] = useState(false);
  const [documentsModalVisible, setDocumentsModalVisible] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [invoiceForm] = Form.useForm();
  const [depositForm] = Form.useForm();
  const [serviceChargeForm] = Form.useForm();
  const [escalationsForm] = Form.useForm();

  const filteredLeases = leases.filter((lease: any) => {
    const matchesSearch = !searchTerm ||
      lease.property?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.unit?.unitNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.occupant?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || lease.status === statusFilter;
    const matchesProperty = !propertyFilter || lease.propertyId === propertyFilter;
    const matchesType = !typeFilter || (
      typeFilter === 'rental' && (lease.property?.purpose === 'rent' || lease.property?.purpose === 'rental')
    ) || (
      typeFilter === 'lease' && lease.property?.purpose === 'lease'
    );

    let matchesDateRange = true;
    if (dateRange) {
      const startDate = dayjs(lease.startDate);
      matchesDateRange = startDate.isAfter(dateRange[0]) && startDate.isBefore(dateRange[1]);
    }

    return matchesSearch && matchesStatus && matchesProperty && matchesType && matchesDateRange;
  });

  const columns = [
    {
      title: 'Type',
      dataIndex: ['property', 'purpose'],
      key: 'type',
      render: (purpose: string) => {
        const type = purpose === 'rent' || purpose === 'rental' ? 'Rental' : 'Lease';
        const color = purpose === 'rent' || purpose === 'rental' ? 'purple' : 'blue';
        return <Tag color={color}>{type}</Tag>;
      },
    },
    {
      title: 'Lease Start',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date: string) => date ? dayjs(date).format('DD MMM YYYY') : '-',
    },
    {
      title: 'Property',
      dataIndex: ['property', 'name'],
      key: 'property',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Unit',
      dataIndex: ['unit', 'unitNumber'],
      key: 'unit',
      render: (name: string) => <Text>{name}</Text>,
    },
    {
      title: 'Tenant',
      dataIndex: ['occupant', 'customer_name'],
      key: 'occupant',
      render: (name: string) => <Text>{name || '-'}</Text>,
    },
    {
      title: 'Monthly Rent',
      dataIndex: 'rentAmount',
      key: 'rentAmount',
      render: (amount: number) => `KES ${(amount || 0).toLocaleString()}`,
    },
    {
      title: 'Payment Frequency',
      dataIndex: 'rentFrequency',
      key: 'rentFrequency',
      render: (type: string) => type ? <Tag color="blue">{type.replace('_', ' ').toUpperCase()}</Tag> : '-',
    },
    {
      title: 'Deposit',
      dataIndex: 'depositAmount',
      key: 'depositAmount',
      render: (deposit: number) => `KES ${(deposit || 0).toLocaleString()}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          pending: 'orange',
          active: 'green',
          notice: 'blue',
          expired: 'red',
          terminated: 'default',
          vacated: 'default',
        };
        return <Tag color={colors[status]}>{status.replace('_', ' ').toUpperCase()}</Tag>;
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
              onClick={() => {
                setSelectedLease(record);
                setDrawerVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Edit Lease">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditLease(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const stats = {
    total: leases.length,
    totalLeaseAmount: leases.reduce((sum: number, lease: any) => sum + (lease.rentAmount || 0), 0),
    active: leases.filter((l: any) => l.status === 'active').length,
    expiringSoon: leases.filter((l: any) => {
      const endDate = dayjs(l.endDate);
      const now = dayjs();
      return endDate.diff(now, 'days') <= 30 && endDate.isAfter(now);
    }).length,
  };

  const handleAddLease = () => {
    setEditLease(null);
    setModalVisible(true);
  };

  const handleEditLease = (lease: any) => {
    setEditLease(lease);
    setModalVisible(true);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditLease(null);
  };

  const handleModalSubmit = (values: any) => {
    if (editLease) {
      updateMutation.mutate({ id: editLease._id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    setSelectedLease(null);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Lease & Rental Management</Title>
            <Text type="secondary">Manage property leases and rentals</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading}>
                Refresh
              </Button>
              <Button icon={<DollarOutlined />} onClick={() => setInvoiceModalVisible(true)}>
                Generate Invoices
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
                New Lease/Rental
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
              title="Total Leases/Rentals"
              value={stats.total}
              prefix={<HomeOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Amount"
              value={stats.totalLeaseAmount}
              prefix="KES"
              precision={0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Active"
              value={stats.active}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Expiring Soon"
              value={stats.expiringSoon}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Search</Text>
              <Search
                placeholder="Search leases..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
              />
            </Space>
          </Col>
          <Col xs={24} sm={4}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
              <Select
                placeholder="Filter by Status"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="pending">Pending</Option>
                <Option value="active">Active</Option>
                <Option value="notice">Notice</Option>
                <Option value="expired">Expired</Option>
                <Option value="terminated">Terminated</Option>
                <Option value="vacated">Vacated</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={4}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Type</Text>
              <Select
                placeholder="Filter by Type"
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="lease">Lease</Option>
                <Option value="rental">Rental</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={4}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Property</Text>
              <Select
                placeholder="Filter by Property"
                value={propertyFilter}
                onChange={setPropertyFilter}
                style={{ width: '100%' }}
                allowClear
              >
                {propertiesData && propertiesData.map((property) => (
                  <Option key={property._id} value={property._id}>
                    {property.name}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Date Range</Text>
              <RangePicker
                placeholder={['Start Date', 'End Date']}
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                style={{ width: '100%' }}
              />
            </Space>
          </Col>
          <Col xs={24} sm={4}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>&nbsp;</Text>
              <Button
                icon={<FilterOutlined />}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setTypeFilter('');
                  setPropertyFilter('');
                  setDateRange(null);
                }}
              >
                Clear
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Leases Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredLeases}
          rowKey="_id"
          pagination={{
            total: filteredLeases.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} leases`,
          }}
        />
      </Card>

      {/* Add/Edit Lease Modal */}
      <AddEditLeaseModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditLease(null);
        }}
        onSubmit={handleModalSubmit}
        edit={!!editLease}
        initialData={editLease}
        tenants={[]}
      />

      {/* Generate Invoices Modal */}
      <Modal
        title="Generate Bulk Invoices"
        open={invoiceModalVisible}
        onCancel={() => {
          setInvoiceModalVisible(false);
          invoiceForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={invoiceForm}
          layout="vertical"
          onFinish={(values) => {
            generateInvoicesMutation.mutate({
              propertyId: values.propertyId,
              periodStart: values.periodStart.format('YYYY-MM-DD'),
              periodEnd: values.periodEnd.format('YYYY-MM-DD'),
              dueDate: values.dueDate.format('YYYY-MM-DD'),
              shop_id: shopId,
            });
          }}
        >
          <Form.Item
            label="Property"
            name="propertyId"
            rules={[{ required: true, message: 'Please select a property' }]}
          >
            <Select placeholder="Select property">
              {propertiesData && propertiesData.map((property) => (
                <Option key={property._id} value={property._id}>
                  {property.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="Period Start"
            name="periodStart"
            rules={[{ required: true, message: 'Please select period start date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Period End"
            name="periodEnd"
            rules={[{ required: true, message: 'Please select period end date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Due Date"
            name="dueDate"
            rules={[{ required: true, message: 'Please select due date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={generateInvoicesMutation.isLoading} block>
              Generate Invoices
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Lease Details Drawer */}
      <Drawer
        title="Lease Details"
        placement="right"
        width={720}
        open={drawerVisible}
        onClose={handleDrawerClose}
      >
        {selectedLease && (
          <>
            {/* Lease Summary */}
            <Card title="Lease Summary" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong>Property:</Text> {selectedLease.property?.name || '-'}
                </Col>
                <Col span={12}>
                  <Text strong>Unit:</Text> {selectedLease.unit?.unitNumber || '-'}
                </Col>
                <Col span={12}>
                  <Text strong>Tenant:</Text> {selectedLease.occupant?.customer_name || '-'}
                </Col>
                <Col span={12}>
                  <Text strong>Status:</Text> <Tag color={selectedLease.status === 'active' ? 'green' : 'orange'}>{selectedLease.status?.toUpperCase()}</Tag>
                </Col>
                <Col span={12}>
                  <Text strong>Start Date:</Text> {dayjs(selectedLease.startDate).format('DD MMM YYYY')}
                </Col>
                <Col span={12}>
                  <Text strong>End Date:</Text> {selectedLease.endDate ? dayjs(selectedLease.endDate).format('DD MMM YYYY') : '-'}
                </Col>
                <Col span={12}>
                  <Text strong>Monthly Rent:</Text> KES {(selectedLease.rentAmount || 0).toLocaleString()}
                </Col>
                <Col span={12}>
                  <Text strong>Payment Frequency:</Text> {selectedLease.rentFrequency || '-'}
                </Col>
              </Row>
            </Card>

            {/* Tabs */}
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <Tabs.TabPane tab="Deposit" key="deposit">
                <div style={{ padding: 16 }}>
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Statistic title="Deposit Amount" value={selectedLease.depositAmount || 0} prefix="KES" />
                    </Col>
                    <Col span={12}>
                      <Statistic title="Deposit Paid" value={selectedLease.depositPaid || 0} prefix="KES" />
                    </Col>
                    <Col span={12}>
                      <Statistic title="Deposit Refunded" value={selectedLease.depositRefunded || 0} prefix="KES" />
                    </Col>
                    <Col span={12}>
                      <Statistic title="Deposit Deductions" value={selectedLease.depositDeductions || 0} prefix="KES" />
                    </Col>
                  </Row>
                  {selectedLease.depositPaidDate && (
                    <div style={{ marginTop: 16 }}>
                      <Text strong>Paid Date:</Text> {dayjs(selectedLease.depositPaidDate).format('DD MMM YYYY')}
                    </div>
                  )}
                  {selectedLease.depositRefundedDate && (
                    <div style={{ marginTop: 8 }}>
                      <Text strong>Refunded Date:</Text> {dayjs(selectedLease.depositRefundedDate).format('DD MMM YYYY')}
                    </div>
                  )}
                  {selectedLease.depositNotes && (
                    <div style={{ marginTop: 16 }}>
                      <Text strong>Notes:</Text> {selectedLease.depositNotes}
                    </div>
                  )}
                  <div style={{ marginTop: 16 }}>
                    <Button type="primary" onClick={() => setDepositModalVisible(true)}>Update Deposit</Button>
                  </div>
                </div>
              </Tabs.TabPane>
              <Tabs.TabPane tab="Service Charge" key="serviceCharge">
                <div style={{ padding: 16 }}>
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Statistic title="Service Charge Amount" value={selectedLease.serviceChargeAmount || 0} prefix="KES" />
                    </Col>
                    <Col span={12}>
                      <Statistic title="Frequency" value={selectedLease.serviceChargeFrequency || 'monthly'} />
                    </Col>
                  </Row>
                  <div style={{ marginTop: 16 }}>
                    <Button type="primary" onClick={() => setServiceChargeModalVisible(true)}>Update Service Charge</Button>
                  </div>
                </div>
              </Tabs.TabPane>
              <Tabs.TabPane tab="Escalations" key="escalations">
                <div style={{ padding: 16 }}>
                  {selectedLease.rentEscalations && selectedLease.rentEscalations.length > 0 ? (
                    <Table
                      dataSource={selectedLease.rentEscalations}
                      columns={[
                        { title: 'Effective Date', dataIndex: 'effectiveDate', render: (date: string) => dayjs(date).format('DD MMM YYYY') },
                        { title: 'New Rent', dataIndex: 'newRentAmount', render: (amount: number) => `KES ${amount?.toLocaleString()}` },
                        { title: 'Type', dataIndex: 'escalationType' },
                        { title: 'Value', dataIndex: 'escalationValue' },
                        { title: 'Applied', dataIndex: 'applied', render: (applied: boolean) => <Tag color={applied ? 'green' : 'orange'}>{applied ? 'Yes' : 'No'}</Tag> },
                      ]}
                      rowKey="effectiveDate"
                      pagination={false}
                    />
                  ) : (
                    <Text type="secondary">No rent escalations configured</Text>
                  )}
                  <div style={{ marginTop: 16 }}>
                    <Button type="primary" onClick={() => setEscalationsModalVisible(true)}>Manage Escalations</Button>
                  </div>
                </div>
              </Tabs.TabPane>
              <Tabs.TabPane tab="Documents" key="documents">
                <div style={{ padding: 16 }}>
                  {selectedLease.documents && selectedLease.documents.length > 0 ? (
                    <Table
                      dataSource={selectedLease.documents}
                      columns={[
                        { title: 'File Name', dataIndex: 'fileName' },
                        { title: 'Type', dataIndex: 'documentType' },
                        { title: 'Uploaded', dataIndex: 'uploadedAt', render: (date: string) => dayjs(date).format('DD MMM YYYY') },
                        {
                          title: 'Action',
                          render: (_: any, record: any) => (
                            <Button type="link" onClick={() => window.open(record.url, '_blank')}>View</Button>
                          ),
                        },
                      ]}
                      rowKey="url"
                      pagination={false}
                    />
                  ) : (
                    <Text type="secondary">No documents uploaded</Text>
                  )}
                  <div style={{ marginTop: 16 }}>
                    <Button type="primary" onClick={() => setDocumentsModalVisible(true)}>Upload Documents</Button>
                  </div>
                </div>
              </Tabs.TabPane>
            </Tabs>
          </>
        )}
      </Drawer>

      {/* Deposit Update Modal */}
      <Modal
        title="Update Deposit"
        open={depositModalVisible}
        onCancel={() => {
          setDepositModalVisible(false);
          depositForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setDepositModalVisible(false);
            depositForm.resetFields();
          }}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={() => depositForm.submit()}>Save</Button>,
        ]}
      >
        <Form
          form={depositForm}
          layout="vertical"
          initialValues={{
            depositAmount: selectedLease?.depositAmount || 0,
            depositPaid: selectedLease?.depositPaid || 0,
            depositRefunded: selectedLease?.depositRefunded || 0,
            depositDeductions: selectedLease?.depositDeductions || 0,
          }}
          onFinish={(values) => {
            updateMutation.mutate({ id: selectedLease?._id, data: values });
            setDepositModalVisible(false);
            depositForm.resetFields();
          }}
        >
          <Form.Item name="depositAmount" label="Deposit Amount">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="depositPaid" label="Deposit Paid">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="depositRefunded" label="Deposit Refunded">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="depositDeductions" label="Deposit Deductions">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Service Charge Update Modal */}
      <Modal
        title="Update Service Charge"
        open={serviceChargeModalVisible}
        onCancel={() => {
          setServiceChargeModalVisible(false);
          serviceChargeForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setServiceChargeModalVisible(false);
            serviceChargeForm.resetFields();
          }}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={() => serviceChargeForm.submit()}>Save</Button>,
        ]}
      >
        <Form
          form={serviceChargeForm}
          layout="vertical"
          initialValues={{
            serviceChargeAmount: selectedLease?.serviceChargeAmount || 0,
            serviceChargeFrequency: selectedLease?.serviceChargeFrequency || 'monthly',
          }}
          onFinish={(values) => {
            updateMutation.mutate({ id: selectedLease?._id, data: values });
            setServiceChargeModalVisible(false);
            serviceChargeForm.resetFields();
          }}
        >
          <Form.Item name="serviceChargeAmount" label="Service Charge Amount">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="serviceChargeFrequency" label="Frequency">
            <Select>
              <Option value="monthly">Monthly</Option>
              <Option value="quarterly">Quarterly</Option>
              <Option value="annually">Annually</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Escalations Modal */}
      <Modal
        title="Manage Escalations"
        open={escalationsModalVisible}
        onCancel={() => {
          setEscalationsModalVisible(false);
          escalationsForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setEscalationsModalVisible(false);
            escalationsForm.resetFields();
          }}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={() => escalationsForm.submit()}>Save</Button>,
        ]}
      >
        <Form
          form={escalationsForm}
          layout="vertical"
          onFinish={(values) => {
            const newEscalation = {
              effectiveDate: values.effectiveDate?.toISOString(),
              newRentAmount: values.newRentAmount,
              escalationType: values.escalationType,
              escalationValue: values.escalationValue,
              applied: false,
            };
            const updatedEscalations = [...(selectedLease?.rentEscalations || []), newEscalation];
            updateMutation.mutate({ id: selectedLease?._id, data: { rentEscalations: updatedEscalations } });
            setEscalationsModalVisible(false);
            escalationsForm.resetFields();
          }}
        >
          <Form.Item name="effectiveDate" label="Effective Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="newRentAmount" label="New Lease Amount">
            <InputNumber style={{ width: '100%' }} placeholder="Enter new lease amount" />
          </Form.Item>
          <Form.Item name="escalationType" label="Escalation Type">
            <Select placeholder="Select type">
              <Option value="fixed">Fixed Amount</Option>
              <Option value="percentage">Percentage</Option>
            </Select>
          </Form.Item>
          <Form.Item name="escalationValue" label="Escalation Value">
            <InputNumber style={{ width: '100%' }} placeholder="Enter value" />
          </Form.Item>
        </Form>
        {selectedLease?.rentEscalations && selectedLease.rentEscalations.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong>Existing Escalations:</Text>
            {selectedLease.rentEscalations.map((escalation: any, index: number) => (
              <div key={index} style={{ marginTop: 8 }}>
                <Tag>{dayjs(escalation.effectiveDate).format('DD MMM YYYY')} - KES {escalation.newRentAmount?.toLocaleString()}</Tag>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Documents Upload Modal */}
      <Modal
        title="Upload Documents"
        open={documentsModalVisible}
        onCancel={() => setDocumentsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setDocumentsModalVisible(false)}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={() => {
            message.success('Document upload functionality to be implemented');
            setDocumentsModalVisible(false);
          }}>Upload</Button>,
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="Upload Files">
            <Upload.Dragger>
              <p className="ant-upload-drag-icon">Click or drag files to this area to upload</p>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LeaseManagement;
