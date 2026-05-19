import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  addMaintenanceTicketCost,
  addMaintenanceTicketUpdate,
  createMaintenanceTicket,
  deleteMaintenanceTicket,
  fetchMaintenanceStats,
  fetchMaintenanceTickets,
  fetchLeases,
  fetchUnits,
  updateMaintenanceTicket,
  updateMaintenanceTicketStatus,
} from '@services/dala';
import { fetchAllUsersList } from '@services/users';
import { fetchProperties } from '@services/dala';
import { fetchAllCustomers } from '@services/customers';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const TICKET_TYPES = [
  { label: 'Property Maintenance', value: 'property_maintenance' },
  { label: 'General', value: 'general' },
];

const STATUSES = ['open', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'cancelled'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = [
  'plumbing',
  'electrical',
  'hvac',
  'cleaning',
  'security',
  'landscaping',
  'appliance',
  'structural',
  'internet',
  'utilities',
  'billing',
  'customer_service',
  'technical',
  'other',
];

const pretty = (value?: string) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-';
const money = (value?: number) => `KES ${(value || 0).toLocaleString()}`;

const statusColor = (status?: string) => {
  if (['resolved', 'closed'].includes(status || '')) return 'green';
  if (status === 'in_progress') return 'blue';
  if (status === 'on_hold') return 'orange';
  if (status === 'cancelled') return 'red';
  return 'default';
};

const priorityColor = (priority?: string) => {
  if (priority === 'urgent') return 'red';
  if (priority === 'high') return 'orange';
  if (priority === 'medium') return 'blue';
  return 'default';
};

const MaintenanceManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const shopId = localStorage.getItem('shop_id') || '678409b73f1321be48285b3f';
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState<any>({ page: 1, limit: 20 });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [costModalVisible, setCostModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [updateForm] = Form.useForm();
  const [costForm] = Form.useForm();
  const selectedPropertyId = Form.useWatch('propertyId', form);

  const queryParams = useMemo(() => {
    const params: any = { shop_id: shopId, ...filters };
    if (activeTab === 'property_maintenance') params.ticketType = 'property_maintenance';
    if (activeTab === 'general') params.ticketType = 'general';
    if (['open', 'in_progress', 'resolved'].includes(activeTab)) params.status = activeTab;
    return params;
  }, [activeTab, filters, shopId]);

  const { data: ticketsData, isLoading, refetch } = useQuery({
    queryKey: ['dala-maintenance-tickets', queryParams],
    queryFn: () => fetchMaintenanceTickets(queryParams),
  });

  const { data: statsData } = useQuery({
    queryKey: ['dala-maintenance-stats', shopId],
    queryFn: () => fetchMaintenanceStats({ shop_id: shopId }),
  });

  const { data: usersData } = useQuery({
    queryKey: ['dala-maintenance-users', shopId],
    queryFn: () => fetchAllUsersList(shopId),
  });

  const { data: propertiesData } = useQuery({
    queryKey: ['dala-maintenance-properties'],
    queryFn: fetchProperties,
  });

  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ['dala-maintenance-units', selectedPropertyId],
    queryFn: () => fetchUnits({ property_id: selectedPropertyId }),
    enabled: !!selectedPropertyId,
  });

  const { data: leasesData, isLoading: leasesLoading } = useQuery({
    queryKey: ['dala-maintenance-leases', selectedPropertyId, shopId],
    queryFn: () => fetchLeases({ propertyId: selectedPropertyId, shop_id: shopId, limit: 100 }),
    enabled: !!selectedPropertyId,
  });

  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['dala-maintenance-customers'],
    queryFn: () => fetchAllCustomers({ limit: 200 }),
  });

  const tickets = Array.isArray(ticketsData?.data) ? ticketsData.data : [];
  const pagination = ticketsData?.pagination;
  const apiStats = statsData?.data || {};
  const calculatedStats = {
    totalTickets: pagination?.total || tickets.length,
    propertyMaintenanceTickets: tickets.filter((ticket: any) => ticket.ticketType === 'property_maintenance').length,
    generalTickets: tickets.filter((ticket: any) => ticket.ticketType === 'general').length,
    openTickets: tickets.filter((ticket: any) => ticket.status === 'open').length,
    inProgressTickets: tickets.filter((ticket: any) => ticket.status === 'in_progress').length,
    urgentTickets: tickets.filter((ticket: any) => ticket.priority === 'urgent').length,
    estimatedCost: tickets.reduce((sum: number, ticket: any) => sum + (ticket.estimatedCost || 0), 0),
    actualCost: tickets.reduce((sum: number, ticket: any) => sum + (ticket.actualCost || 0), 0),
  };
  const stats = {
    totalTickets: apiStats.totalTickets || calculatedStats.totalTickets,
    propertyMaintenanceTickets: apiStats.propertyMaintenanceTickets || calculatedStats.propertyMaintenanceTickets,
    generalTickets: apiStats.generalTickets || calculatedStats.generalTickets,
    openTickets: apiStats.openTickets || calculatedStats.openTickets,
    inProgressTickets: apiStats.inProgressTickets || calculatedStats.inProgressTickets,
    urgentTickets: apiStats.urgentTickets || calculatedStats.urgentTickets,
    estimatedCost: apiStats.estimatedCost || calculatedStats.estimatedCost,
    actualCost: apiStats.actualCost || calculatedStats.actualCost,
  };
  const users = Array.isArray(usersData?.data) ? usersData.data : Array.isArray(usersData) ? usersData : [];
  const properties = Array.isArray(propertiesData?.data) ? propertiesData.data : [];
  const selectedProperty = properties.find((property: any) => property._id === selectedPropertyId);
  const units = [
    ...(Array.isArray(unitsData?.data) ? unitsData.data : []),
    ...(Array.isArray(selectedProperty?.units) ? selectedProperty.units : []),
    ...(Array.isArray(selectedProperty?.propertyUnits) ? selectedProperty.propertyUnits : []),
    ...(Array.isArray(selectedProperty?.apartments) ? selectedProperty.apartments : []),
  ].filter((unit: any, index: number, all: any[]) => {
    const id = unit._id || unit.id || unit.unitId || unit.apartmentId || unit.apartmentNumber || unit.unitNumber || unit.name;
    return id && all.findIndex((item: any) => (item._id || item.id || item.unitId || item.apartmentId || item.apartmentNumber || item.unitNumber || item.name) === id) === index;
  });
  const leases = Array.isArray(leasesData?.data) ? leasesData.data : [];
  const customers = Array.isArray(customersData?.data) ? customersData.data : Array.isArray(customersData) ? customersData : [];
  const occupants = [
    ...leases.map((lease: any) => lease.occupant || lease.tenant || lease.customer || lease.tenant_id || lease.occupantId).filter(Boolean),
    ...units.map((unit: any) => unit.currentOccupant || unit.customerId || unit.occupant || unit.tenant).filter(Boolean),
    ...(selectedProperty?.currentOccupant ? [selectedProperty.currentOccupant] : []),
    ...customers,
  ].filter((occupant: any, index: number, all: any[]) => {
    const id = typeof occupant === 'string' ? occupant : occupant._id || occupant.id || occupant.customer_id;
    return id && all.findIndex((item: any) => (typeof item === 'string' ? item : item._id || item.id || item.customer_id) === id) === index;
  });

  const getPersonName = (person: any) => {
    if (!person) return '';
    if (typeof person === 'string') return person;
    return person.customer_name || person.name || person.fullName || person.username || person.email || '';
  };

  const getAssignedLabel = (person: any) => {
    if (!person) return '-';
    if (typeof person === 'string') return person;
    return person.name || person.username || person.email || person.phone || '-';
  };

  const getPersonPhone = (person: any) => {
    if (!person || typeof person === 'string') return '';
    return person.phone || person.phone_number || person.mobile || person.customer_phone || person.alt_phone || '';
  };

  const getPersonEmail = (person: any) => {
    if (!person || typeof person === 'string') return '';
    return person.email || person.customer_email || person.alt_email || '';
  };

  const getPersonId = (person: any) => typeof person === 'string' ? person : person?._id || person?.id || person?.customer_id;
  const getUnitId = (unit: any) => unit?._id || unit?.id || unit?.unitId || unit?.apartmentId || unit?.apartmentNumber || unit?.unitNumber || unit?.name;
  const getUnitLabel = (unit: any) => unit?.unitNumber || unit?.apartmentNumber || unit?.name || unit?.code || getUnitId(unit);

  const handleOccupantChange = (occupantId: string) => {
    const occupant = occupants.find((item: any) => getPersonId(item) === occupantId);
    form.setFieldsValue({
      requesterName: getPersonName(occupant),
      requesterPhone: getPersonPhone(occupant),
      requesterEmail: getPersonEmail(occupant),
    });
  };

  const handleLeaseChange = (leaseId: string) => {
    const lease = leases.find((item: any) => item._id === leaseId || item.id === leaseId);
    const occupant = lease?.occupant || lease?.tenant || lease?.customer || lease?.tenant_id || lease?.occupantId;
    const occupantId = getPersonId(occupant);
    form.setFieldsValue({
      unitId: lease?.unitId || lease?.unit_id || lease?.unit?._id,
      occupantId,
      requesterName: getPersonName(occupant),
      requesterPhone: getPersonPhone(occupant),
      requesterEmail: getPersonEmail(occupant),
    });
  };

  const handleUnitChange = (unitId: string) => {
    const unit = units.find((item: any) => getUnitId(item) === unitId);
    const occupant = unit?.currentOccupant || unit?.customerId || unit?.occupant || unit?.tenant;
    const occupantId = getPersonId(occupant);
    if (!occupantId) return;
    form.setFieldsValue({
      occupantId,
      requesterName: getPersonName(occupant),
      requesterPhone: getPersonPhone(occupant),
      requesterEmail: getPersonEmail(occupant),
    });
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['dala-maintenance-tickets'] });
    queryClient.invalidateQueries({ queryKey: ['dala-maintenance-stats'] });
    queryClient.invalidateQueries({ queryKey: ['dala-dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: createMaintenanceTicket,
    onSuccess: () => {
      setModalVisible(false);
      setEditingTicket(null);
      form.resetFields();
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateMaintenanceTicket(id, data),
    onSuccess: (response: any) => {
      setModalVisible(false);
      setEditingTicket(null);
      form.resetFields();
      setSelectedTicket(response?.data || selectedTicket);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMaintenanceTicket,
    onSuccess: invalidate,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateMaintenanceTicketStatus(id, data),
    onSuccess: (response: any) => {
      setStatusModalVisible(false);
      statusForm.resetFields();
      setSelectedTicket(response?.data || selectedTicket);
      invalidate();
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => addMaintenanceTicketUpdate(id, data),
    onSuccess: (response: any) => {
      setUpdateModalVisible(false);
      updateForm.resetFields();
      setSelectedTicket(response?.data || selectedTicket);
      invalidate();
    },
  });

  const costMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => addMaintenanceTicketCost(id, data),
    onSuccess: (response: any) => {
      setCostModalVisible(false);
      costForm.resetFields();
      setSelectedTicket(response?.data || selectedTicket);
      invalidate();
    },
  });

  const openCreateModal = () => {
    setEditingTicket(null);
    form.resetFields();
    form.setFieldsValue({ ticketType: 'property_maintenance', priority: 'medium', category: 'other' });
    setModalVisible(true);
  };

  const openEditModal = (ticket: any) => {
    setEditingTicket(ticket);
    form.setFieldsValue({
      ...ticket,
      dueDate: ticket.dueDate ? dayjs(ticket.dueDate) : undefined,
      scheduledDate: ticket.scheduledDate ? dayjs(ticket.scheduledDate) : undefined,
    });
    setModalVisible(true);
  };

  const handleSaveTicket = (values: any) => {
    const payload = {
      ...values,
      shop_id: shopId,
      dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
      scheduledDate: values.scheduledDate ? values.scheduledDate.format('YYYY-MM-DD') : undefined,
    };
    if (payload.ticketType === 'general') {
      delete payload.propertyId;
      delete payload.unitId;
      delete payload.leaseId;
      delete payload.occupantId;
    }
    if (editingTicket?._id) {
      const { tenant_id, ticketNumber, createdBy, createdAt, updates, costs, ...updatePayload } = payload;
      updateMutation.mutate({ id: editingTicket._id, data: updatePayload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDateFilter = (dates: any) => {
    setFilters((prev: any) => ({
      ...prev,
      page: 1,
      startDate: dates?.[0] ? dates[0].format('YYYY-MM-DD') : undefined,
      endDate: dates?.[1] ? dates[1].format('YYYY-MM-DD') : undefined,
    }));
  };

  const statCards = [
    { title: 'Total Tickets', value: stats.totalTickets || 0, color: '#1677ff' },
    { title: 'Open Tickets', value: stats.openTickets || 0, color: '#faad14' },
    { title: 'In Progress', value: stats.inProgressTickets || 0, color: '#1677ff' },
    { title: 'Urgent Tickets', value: stats.urgentTickets || 0, color: '#ff4d4f' },
    { title: 'Property Maintenance', value: stats.propertyMaintenanceTickets || 0, color: '#52c41a' },
    { title: 'General Tickets', value: stats.generalTickets || 0, color: '#722ed1' },
    { title: 'Estimated Cost', value: stats.estimatedCost || 0, color: '#13c2c2', prefix: 'KES' },
    { title: 'Actual Cost', value: stats.actualCost || 0, color: '#eb2f96', prefix: 'KES' },
  ];

  const columns = [
    { title: 'Ticket No', dataIndex: 'ticketNumber', width: 130, render: (v: string) => <Text strong>{v || '-'}</Text> },
    { title: 'Type', dataIndex: 'ticketType', width: 150, render: (v: string) => <Tag color={v === 'property_maintenance' ? 'green' : 'purple'}>{pretty(v)}</Tag> },
    { title: 'Title', dataIndex: 'title', ellipsis: true },
    { title: 'Property', dataIndex: 'propertyName', render: (_: string, record: any) => record.propertyName || record.property?.name || record.propertyId?.name || '-' },
    { title: 'Unit', dataIndex: 'unitName', render: (_: string, record: any) => record.unitName || record.unit?.unitNumber || record.unit?.name || record.unitId?.unitNumber || record.unitId?.name || '-' },
    { title: 'Category', dataIndex: 'category', render: (v: string) => pretty(v) },
    { title: 'Priority', dataIndex: 'priority', render: (v: string) => <Tag color={priorityColor(v)}>{pretty(v)}</Tag> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={statusColor(v)}>{pretty(v)}</Tag> },
    { title: 'Assigned To', dataIndex: 'assignedTo', render: (v: any) => getAssignedLabel(v) },
    { title: 'Estimated Cost', dataIndex: 'estimatedCost', align: 'right' as const, render: (v: number) => money(v) },
    { title: 'Actual Cost', dataIndex: 'actualCost', align: 'right' as const, render: (v: number) => money(v) },
    { title: 'Created At', dataIndex: 'createdAt', render: (v: string) => v ? dayjs(v).format('DD MMM YYYY') : '-' },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right' as const,
      width: 190,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Tooltip title="View">
            <Button type="link" icon={<EyeOutlined />} onClick={() => { setSelectedTicket(record); setDrawerVisible(true); }} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          </Tooltip>
          <Tooltip title="Change Status">
            <Button type="link" onClick={() => { setSelectedTicket(record); statusForm.setFieldsValue({ status: record.status, visibility: 'public' }); setStatusModalVisible(true); }}>Status</Button>
          </Tooltip>
          <Tooltip title="Add Cost">
            <Button type="link" icon={<DollarOutlined />} onClick={() => { setSelectedTicket(record); costForm.resetFields(); costForm.setFieldsValue({ currency: 'KES', paid: true }); setCostModalVisible(true); }} />
          </Tooltip>
          <Popconfirm title="Delete ticket?" onConfirm={() => deleteMutation.mutate(record._id)}>
            <Button danger type="link" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Dala Maintenance</Title>
          <Text type="secondary">Manage property maintenance and general support tickets</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>New Ticket</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {statCards.map((card) => (
          <Col xs={24} sm={12} md={6} lg={6} key={card.title}>
            <Card size="small">
              <Statistic title={card.title} value={card.value} prefix={card.prefix} valueStyle={{ color: card.color, fontSize: 20 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          { key: 'all', label: 'All Tickets' },
          { key: 'property_maintenance', label: 'Property Maintenance' },
          { key: 'general', label: 'General Tickets' },
          { key: 'open', label: 'Open' },
          { key: 'in_progress', label: 'In Progress' },
          { key: 'resolved', label: 'Resolved' },
          { key: 'costs', label: 'Costs' },
        ]} />

        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={6}>
            <Input.Search placeholder="Search tickets" allowClear onSearch={(search) => setFilters((prev: any) => ({ ...prev, page: 1, search }))} />
          </Col>
          <Col xs={24} md={4}>
            <Select allowClear placeholder="Status" style={{ width: '100%' }} onChange={(status) => setFilters((prev: any) => ({ ...prev, page: 1, status }))} options={STATUSES.map((value) => ({ value, label: pretty(value) }))} />
          </Col>
          <Col xs={24} md={4}>
            <Select allowClear placeholder="Priority" style={{ width: '100%' }} onChange={(priority) => setFilters((prev: any) => ({ ...prev, page: 1, priority }))} options={PRIORITIES.map((value) => ({ value, label: pretty(value) }))} />
          </Col>
          <Col xs={24} md={4}>
            <Select allowClear placeholder="Category" style={{ width: '100%' }} onChange={(category) => setFilters((prev: any) => ({ ...prev, page: 1, category }))} options={CATEGORIES.map((value) => ({ value, label: pretty(value) }))} />
          </Col>
          <Col xs={24} md={6}>
            <RangePicker style={{ width: '100%' }} onChange={handleDateFilter} />
          </Col>
        </Row>

        <Table
          rowKey="_id"
          loading={isLoading}
          dataSource={tickets}
          columns={columns}
          scroll={{ x: 1500 }}
          pagination={{
            current: pagination?.page || filters.page,
            pageSize: pagination?.limit || filters.limit,
            total: pagination?.total || tickets.length,
            onChange: (page, limit) => setFilters((prev: any) => ({ ...prev, page, limit })),
          }}
        />
      </Card>

      <Modal
        title={editingTicket ? 'Edit Ticket' : 'Create Ticket'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isLoading || updateMutation.isLoading}
        width={820}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveTicket}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ticketType" label="Ticket Type" rules={[{ required: true }]}>
                <Select options={TICKET_TYPES} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                <Select options={PRIORITIES.map((value) => ({ value, label: pretty(value) }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                <Select showSearch options={CATEGORIES.map((value) => ({ value, label: pretty(value) }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="assignedTo" label="Assigned To">
                <Select allowClear showSearch optionFilterProp="label" options={users.map((user: any) => ({ value: user._id || user.id, label: user.name || user.username || user.email }))} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prev, current) => prev.ticketType !== current.ticketType}>
            {({ getFieldValue }) => getFieldValue('ticketType') === 'property_maintenance' && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="propertyId" label="Property" rules={[{ required: true, message: 'Property is required for property maintenance' }]}>
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      onChange={() => form.setFieldsValue({ unitId: undefined, leaseId: undefined, occupantId: undefined, requesterName: undefined, requesterPhone: undefined, requesterEmail: undefined })}
                      options={properties.map((property: any) => ({ value: property._id, label: property.name }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="unitId" label="Unit / Apartment">
                    <Select
                      allowClear
                      showSearch
                      loading={unitsLoading}
                      optionFilterProp="label"
                      placeholder="Select unit"
                      onChange={handleUnitChange}
                      options={units.map((unit: any) => ({ value: getUnitId(unit), label: getUnitLabel(unit) }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="leaseId" label="Lease">
                    <Select
                      allowClear
                      showSearch
                      loading={leasesLoading}
                      optionFilterProp="label"
                      placeholder="Select lease"
                      onChange={handleLeaseChange}
                      options={leases.map((lease: any) => ({
                        value: lease._id || lease.id,
                        label: `${lease.leaseCode || lease.leaseNumber || lease._id || lease.id} - ${getPersonName(lease.occupant || lease.tenant || lease.customer || lease.tenant_id || lease.occupantId) || 'No occupant'}`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="occupantId" label="Occupant / Customer">
                    <Select
                      allowClear
                      showSearch
                      loading={customersLoading || leasesLoading}
                      optionFilterProp="label"
                      placeholder="Select occupant"
                      onChange={handleOccupantChange}
                      options={occupants.map((occupant: any) => ({
                        value: getPersonId(occupant),
                        label: `${getPersonName(occupant) || getPersonId(occupant)}${getPersonPhone(occupant) ? ` - ${getPersonPhone(occupant)}` : ''}`,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="requesterName" label="Requester Name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="requesterPhone" label="Requester Phone">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="requesterEmail" label="Requester Email">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dueDate" label="Due Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="scheduledDate" label="Scheduled Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="estimatedCost" label="Estimated Cost">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer title={selectedTicket?.ticketNumber || 'Ticket Details'} open={drawerVisible} onClose={() => setDrawerVisible(false)} width={760} extra={selectedTicket && <Space><Button onClick={() => setUpdateModalVisible(true)}>Add Update</Button><Button onClick={() => setCostModalVisible(true)}>Add Cost</Button></Space>}>
        {selectedTicket && (
          <Tabs defaultActiveKey="overview" items={[
            {
              key: 'overview',
              label: 'Overview',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                  <Row gutter={16}>
                    <Col span={8}><Card><Statistic title="Estimated" value={selectedTicket.estimatedCost || 0} prefix="KES" /></Card></Col>
                    <Col span={8}><Card><Statistic title="Actual" value={selectedTicket.actualCost || 0} prefix="KES" /></Card></Col>
                    <Col span={8}><Card><Statistic title="Priority" value={pretty(selectedTicket.priority)} /></Card></Col>
                  </Row>
                  <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="Title">{selectedTicket.title}</Descriptions.Item>
                    <Descriptions.Item label="Description">{selectedTicket.description}</Descriptions.Item>
                    <Descriptions.Item label="Type"><Tag>{pretty(selectedTicket.ticketType)}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Status"><Tag color={statusColor(selectedTicket.status)}>{pretty(selectedTicket.status)}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Category">{pretty(selectedTicket.category)}</Descriptions.Item>
                    <Descriptions.Item label="Property">{selectedTicket.propertyName || selectedTicket.property?.name || selectedTicket.propertyId?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Unit">{selectedTicket.unitName || selectedTicket.unit?.unitNumber || selectedTicket.unit?.name || selectedTicket.unitId?.unitNumber || selectedTicket.unitId?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Requester">{selectedTicket.requesterName || '-'} / {selectedTicket.requesterPhone || '-'} / {selectedTicket.requesterEmail || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Assigned To">{getAssignedLabel(selectedTicket.assignedTo)}</Descriptions.Item>
                    <Descriptions.Item label="Due Date">{selectedTicket.dueDate ? dayjs(selectedTicket.dueDate).format('DD MMM YYYY') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="Scheduled Date">{selectedTicket.scheduledDate ? dayjs(selectedTicket.scheduledDate).format('DD MMM YYYY') : '-'}</Descriptions.Item>
                  </Descriptions>
                </Space>
              ),
            },
            {
              key: 'updates',
              label: 'Updates',
              children: selectedTicket.updates?.length ? (
                <Timeline items={selectedTicket.updates.map((update: any) => ({ children: <div><Text>{update.message}</Text><br /><Text type="secondary">{pretty(update.visibility)} · {update.createdAt ? dayjs(update.createdAt).format('DD MMM YYYY HH:mm') : ''}</Text></div> }))} />
              ) : <Text type="secondary">No updates yet</Text>,
            },
            {
              key: 'costs',
              label: 'Costs',
              children: selectedTicket.costs?.length ? (
                <Table rowKey={(record: any, index) => record._id || index} pagination={false} dataSource={selectedTicket.costs} columns={[{ title: 'Description', dataIndex: 'description' }, { title: 'Vendor', dataIndex: 'vendorName' }, { title: 'Amount', dataIndex: 'amount', render: money }, { title: 'Paid', dataIndex: 'paid', render: (paid: boolean) => <Tag color={paid ? 'green' : 'orange'}>{paid ? 'Paid' : 'Unpaid'}</Tag> }]} />
              ) : <Text type="secondary">No costs added</Text>,
            },
          ]} />
        )}
      </Drawer>

      <Modal title="Change Ticket Status" open={statusModalVisible} onCancel={() => setStatusModalVisible(false)} onOk={() => statusForm.submit()} confirmLoading={statusMutation.isLoading}>
        <Form form={statusForm} layout="vertical" onFinish={(values) => selectedTicket && statusMutation.mutate({ id: selectedTicket._id, data: values })}>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}><Select options={STATUSES.map((value) => ({ value, label: pretty(value) }))} /></Form.Item>
          <Form.Item name="message" label="Message"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="visibility" label="Visibility" initialValue="public"><Select options={[{ value: 'public', label: 'Public' }, { value: 'internal', label: 'Internal' }]} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Add Ticket Update" open={updateModalVisible} onCancel={() => setUpdateModalVisible(false)} onOk={() => updateForm.submit()} confirmLoading={updateTicketMutation.isLoading}>
        <Form form={updateForm} layout="vertical" onFinish={(values) => selectedTicket && updateTicketMutation.mutate({ id: selectedTicket._id, data: values })}>
          <Form.Item name="message" label="Message" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="status" label="Optional Status"><Select allowClear options={STATUSES.map((value) => ({ value, label: pretty(value) }))} /></Form.Item>
          <Form.Item name="visibility" label="Visibility" initialValue="public"><Select options={[{ value: 'public', label: 'Public' }, { value: 'internal', label: 'Internal' }]} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Add Ticket Cost" open={costModalVisible} onCancel={() => setCostModalVisible(false)} onOk={() => costForm.submit()} confirmLoading={costMutation.isLoading}>
        <Form form={costForm} layout="vertical" onFinish={(values) => selectedTicket && costMutation.mutate({ id: selectedTicket._id, data: { ...values, paidDate: values.paidDate ? values.paidDate.format('YYYY-MM-DD') : undefined } })}>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="currency" label="Currency" initialValue="KES"><Input /></Form.Item>
          <Form.Item name="vendorName" label="Vendor"><Input /></Form.Item>
          <Form.Item name="receiptUrl" label="Receipt URL"><Input /></Form.Item>
          <Form.Item name="paidDate" label="Paid Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="paid" label="Paid" initialValue={true}><Select options={[{ value: true, label: 'Paid' }, { value: false, label: 'Unpaid' }]} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MaintenanceManagement;
