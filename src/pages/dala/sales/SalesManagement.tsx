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
  message,
  Tooltip,
  DatePicker,
  Drawer,
  Descriptions,
  Tabs,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DollarOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPropertySales, fetchProperties, createPropertySale, updatePropertySale } from '@services/dala';
import { useDalaSales, useDalaProperties } from '../../../stores/dalaStore';
import dayjs from 'dayjs';
import AddEditSaleModal from './AddEditSaleModal';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const SalesManagement: React.FC = () => {
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editSale, setEditSale] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  
  const storeSales = useDalaSales();
  const properties = useDalaProperties();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['dala-sales'],
    queryFn: () => fetchPropertySales(),
  });

  const sales = (Array.isArray(data?.data) ? data.data : storeSales).map((sale: any) => ({
    ...sale,
    property_id: sale.property_id || sale.property?._id,
    unit_id: sale.unit_id || sale.unitTypeID?._id,
    sale_date: sale.sale_date || sale.saleDate,
    sale_price: sale.sale_price || sale.salePrice || 0,
    payment_plan: sale.payment_plan || sale.paymentPlanType,
    deposit_paid: sale.deposit_paid || sale.initialPayment || sale.paymentTotals?.depositPaid || sale.deposit?.amount || 0,
    commission_rate: sale.commission_rate || sale.commissionPercentage || 0,
    commission_amount: sale.commission_amount || sale.commission || 0,
    client: sale.client || sale.customer,
    unit: sale.unit || sale.unitTypeID,
    installments: sale.installments || sale.paymentSchedule || sale.paymentInstallments || [],
    payments: sale.payments || [],
    paymentPlans: sale.paymentPlans || [],
    paymentTotals: sale.paymentTotals,
    deposit: sale.deposit,
    documents: sale.documents || sale.attachments || sale.saleDocuments || [],
  }));

  const propertiesQuery = useQuery({
    queryKey: ['dala-properties'],
    queryFn: fetchProperties,
  });

  const createMutation = useMutation({
    mutationFn: createPropertySale,
    onSuccess: () => {
      message.success('Sale created successfully');
      setModalVisible(false);
      setEditSale(null);
      queryClient.invalidateQueries(['dala-sales']);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error || 'Failed to create sale');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updatePropertySale(id, data),
    onSuccess: () => {
      message.success('Sale updated successfully');
      setModalVisible(false);
      setEditSale(null);
      queryClient.invalidateQueries(['dala-sales']);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error || 'Failed to update sale');
    },
  });

  console.log('Properties query state:', {
    isLoading: propertiesQuery.isLoading,
    error: propertiesQuery.error,
    data: propertiesQuery.data,
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
      render: (name: string, record: any) => (
        <Text strong>{name || record.property?.propertyType || record.property_id || '-'}</Text>
      ),
    },
    {
      title: 'Unit',
      dataIndex: ['unit', 'name'],
      key: 'unit',
      render: (name: string, record: any) => (
        <Text>{name || record.apartmentName || record.unit?.totalUnits || record.unit_id || '-'}</Text>
      ),
    },
    {
      title: 'Client',
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (name: string, record: any) => (
        <Text>{name || record.client?.email || record.client?.phone || '-'}</Text>
      ),
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
      render: (plan: string) => <Tag color="blue">{plan?.toUpperCase() || '-'}</Tag>,
    },
    {
      title: 'Deposit',
      dataIndex: 'deposit_paid',
      key: 'deposit',
      render: (deposit: number, record: any) => 
        `KES ${(deposit || 0).toLocaleString()} (${record.sale_price ? (((deposit || 0) / record.sale_price) * 100).toFixed(1) : '0.0'}%)`,
    },
    {
      title: 'Commission',
      dataIndex: 'commission_amount',
      key: 'commission',
      render: (commission: number, record: any) => 
        `KES ${(commission || 0).toLocaleString()} (${record.commission_rate || 0}%)`,
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
        return <Tag color={colors[status] || 'default'}>{status?.replace('_', ' ').toUpperCase() || '-'}</Tag>;
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
              onClick={() => handleViewSale(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Sale">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditSale(record)}
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

  const handleAddSale = () => {
    setEditSale(null);
    setModalVisible(true);
  };

  const handleEditSale = (sale: any) => {
    setEditSale(sale);
    setModalVisible(true);
  };

  const handleViewSale = (sale: any) => {
    setSelectedSale(sale);
    setDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    setSelectedSale(null);
  };

  const handleDownloadClientStatement = () => {
    if (!selectedSale) return;

    const paymentPlans = selectedSale.paymentPlans || [];
    const payments = selectedSale.payments || [];
    const paidAmount = selectedSale.paymentTotals?.totalPaid || payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
    const balance = selectedSale.paymentTotals?.outstandingBalance ?? ((selectedSale.sale_price || 0) - paidAmount);
    const rows: Array<Array<string | number>> = [
      ['Client Statement'],
      ['Sale Code', selectedSale.saleCode || selectedSale._id || '-'],
      ['Client', selectedSale.client?.name || selectedSale.client?.customer_name || selectedSale.client?.email || '-'],
      ['Property', selectedSale.property?.name || selectedSale.property?.propertyType || '-'],
      ['Unit/Apartment', selectedSale.apartmentName || selectedSale.unit?.name || selectedSale.unit_id || '-'],
      ['Sale Price', selectedSale.sale_price || 0],
      ['Deposit Paid', selectedSale.paymentTotals?.depositPaid || selectedSale.deposit?.amount || 0],
      ['Paid Amount', paidAmount],
      ['Balance', balance],
      ['Payment Stage', selectedSale.status || '-'],
      [''],
      ['Payment Plans'],
      ['Start Date', 'End Date', 'Total Amount', 'Installment Amount', 'Frequency', 'Installments', 'Status'],
      ...paymentPlans.map((plan: any) => [
        plan.startDate || '-',
        plan.endDate || '-',
        plan.totalAmount || 0,
        plan.installmentAmount || 0,
        plan.installmentFrequency || '-',
        plan.numberOfInstallments || 0,
        plan.status || '-',
      ]),
      [''],
      ['Payments'],
      ['Payment Date', 'Amount', 'Method', 'Type', 'Status', 'Notes'],
      ...payments.map((payment: any) => [
        payment.payment_date || '-',
        payment.amount || 0,
        payment.method_id?.name || '-',
        payment.payment_type || '-',
        payment.payment_status || '-',
        payment.notes || '-',
      ]),
    ];
    const csv = rows.map((row) => row.map((value: string | number) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client-statement-${selectedSale.saleCode || selectedSale._id || 'sale'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditSale(null);
  };

  const handleModalSubmit = (values: any) => {
    if (editSale) {
      // Update existing sale
      updateMutation.mutate({ id: editSale._id, data: values });
    } else {
      // Create new sale
      createMutation.mutate(values);
    }
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
              onClick={handleAddSale}
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
              {properties && properties.length > 0 && properties.map((property) => (
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
      <Card
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isFetching}
          >
            Refresh
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredSales}
          rowKey="_id"
          loading={isLoading || isFetching}
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

      {/* Add/Edit Sale Modal */}
      <AddEditSaleModal
        visible={modalVisible}
        onCancel={handleModalCancel}
        onSubmit={handleModalSubmit}
        edit={!!editSale}
        initialData={editSale}
        properties={propertiesQuery.data?.data || []}
        propertiesLoading={propertiesQuery.isLoading || propertiesQuery.isFetching}
      />

      <Drawer
        title={`Sale Details${selectedSale?.saleCode ? ` - ${selectedSale.saleCode}` : ''}`}
        open={drawerVisible}
        onClose={handleDrawerClose}
        width={760}
        extra={
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownloadClientStatement}
            disabled={!selectedSale}
          >
            Download Client Statement
          </Button>
        }
      >
        {selectedSale && (
          <Tabs
            defaultActiveKey="overview"
            items={[
              {
                key: 'overview',
                label: 'Sale Details',
                children: (
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Card>
                          <Statistic
                            title="Sale Price"
                            value={selectedSale.sale_price || 0}
                            prefix="KES"
                            precision={0}
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card>
                          <Statistic
                            title="Status"
                            value={selectedSale.status?.replace('_', ' ').toUpperCase() || '-'}
                            valueStyle={{ color: '#1890ff' }}
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Descriptions bordered column={1}>
                      <Descriptions.Item label="Sale Code">{selectedSale.saleCode || selectedSale._id || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Sale Date">
                        {selectedSale.sale_date ? dayjs(selectedSale.sale_date).format('DD MMM YYYY HH:mm') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Payment Plan">
                        <Tag color="blue">{selectedSale.payment_plan?.toUpperCase() || '-'}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Payment Stage">
                        <Tag color={selectedSale.status === 'completed' ? 'green' : selectedSale.status === 'processing' ? 'blue' : 'orange'}>
                          {selectedSale.status?.replace('_', ' ').toUpperCase() || '-'}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Payment Progress">
                        KES {(selectedSale.paymentTotals?.totalPaid || 0).toLocaleString()} paid of KES {(selectedSale.sale_price || 0).toLocaleString()}
                        {' '}({selectedSale.paymentTotals?.paymentPercentage ?? 0}%)
                      </Descriptions.Item>
                      <Descriptions.Item label="Outstanding Balance">
                        KES {(selectedSale.paymentTotals?.outstandingBalance ?? selectedSale.sale_price ?? 0).toLocaleString()}
                      </Descriptions.Item>
                      <Descriptions.Item label="Deposit Paid">
                        KES {(selectedSale.paymentTotals?.depositPaid || selectedSale.deposit?.amount || 0).toLocaleString()}
                      </Descriptions.Item>
                      <Descriptions.Item label="Initial Payment Type">
                        {selectedSale.initialPaymentType?.replace('_', ' ').toUpperCase() || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Commission">
                        KES {(selectedSale.commission_amount || 0).toLocaleString()} ({selectedSale.commission_rate || 0}%)
                      </Descriptions.Item>
                      <Descriptions.Item label="Client">
                        {selectedSale.client?.name || selectedSale.client?.customer_name || selectedSale.client?.email || selectedSale.client?.phone || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Sales Agent">
                        {selectedSale.salesAgent?.name || selectedSale.salesAgent?.fullname || selectedSale.salesAgent?.email || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Property Manager">
                        {selectedSale.propertyManager?.name || selectedSale.propertyManager?.fullname || selectedSale.propertyManager?.email || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Property">
                        {selectedSale.property?.name || selectedSale.property?.propertyType || selectedSale.property_id || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Unit / Apartment">
                        {selectedSale.apartmentName || selectedSale.unit?.name || selectedSale.unit_id || '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  </Space>
                ),
              },
              {
                key: 'installments',
                label: 'Payment Plans & Stage',
                children: (
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Card>
                          <Statistic title="Total Paid" value={selectedSale.paymentTotals?.totalPaid || 0} prefix="KES" precision={0} />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic title="Deposit Paid" value={selectedSale.paymentTotals?.depositPaid || selectedSale.deposit?.amount || 0} prefix="KES" precision={0} />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic title="Outstanding" value={selectedSale.paymentTotals?.outstandingBalance ?? selectedSale.sale_price ?? 0} prefix="KES" precision={0} />
                        </Card>
                      </Col>
                    </Row>

                    {selectedSale.paymentPlans?.length ? (
                      selectedSale.paymentPlans.map((plan: any, index: number) => (
                        (() => {
                          const planPayments = plan.payments || selectedSale.payments?.filter((payment: any) => payment.paymentPlan === plan._id) || [];
                          const planPaid = planPayments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
                          const planBalance = Math.max((plan.totalAmount || 0) - planPaid, 0);
                          const paymentStatus = planBalance <= 0 ? 'PAID' : planPaid > 0 ? 'PARTIAL' : 'PENDING';
                          return (
                            <Card
                              key={plan._id || index}
                              title={`Payment Plan ${index + 1}`}
                              extra={
                                <Space>
                                  <Tag color={plan.status === 'active' ? 'green' : 'default'}>{plan.status?.toUpperCase() || '-'}</Tag>
                                  <Tag color={paymentStatus === 'PAID' ? 'green' : paymentStatus === 'PARTIAL' ? 'blue' : 'orange'}>
                                    {paymentStatus}
                                  </Tag>
                                </Space>
                              }
                            >
                              <Row gutter={16} style={{ marginBottom: 16 }}>
                                <Col span={8}>
                                  <Statistic title="Plan Paid" value={planPaid} prefix="KES" precision={0} />
                                </Col>
                                <Col span={8}>
                                  <Statistic title="Plan Balance" value={planBalance} prefix="KES" precision={0} />
                                </Col>
                                <Col span={8}>
                                  <Statistic title="Payments" value={planPayments.length} />
                                </Col>
                              </Row>
                              <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label="Payment Status">
                                  <Tag color={paymentStatus === 'PAID' ? 'green' : paymentStatus === 'PARTIAL' ? 'blue' : 'orange'}>
                                    {paymentStatus}
                                  </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Plan Status">
                                  <Tag color={plan.status === 'active' ? 'green' : 'default'}>{plan.status?.toUpperCase() || '-'}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Total Amount">KES {(plan.totalAmount || 0).toLocaleString()}</Descriptions.Item>
                                <Descriptions.Item label="Initial Deposit">KES {(plan.initialDeposit || 0).toLocaleString()}</Descriptions.Item>
                                <Descriptions.Item label="Outstanding Balance">KES {(plan.outstandingBalance || 0).toLocaleString()}</Descriptions.Item>
                                <Descriptions.Item label="Installment Amount">KES {(plan.installmentAmount || 0).toLocaleString()}</Descriptions.Item>
                                <Descriptions.Item label="Installment Frequency">{plan.installmentFrequency || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Number of Installments">{plan.numberOfInstallments || 0}</Descriptions.Item>
                                <Descriptions.Item label="Payment Method">{plan.paymentMethod?.replace('_', ' ').toUpperCase() || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Start Date">{plan.startDate ? dayjs(plan.startDate).format('DD MMM YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="End Date">{plan.endDate ? dayjs(plan.endDate).format('DD MMM YYYY') : '-'}</Descriptions.Item>
                              </Descriptions>
                              {planPayments.length > 0 && (
                                <Table
                                  style={{ marginTop: 16 }}
                                  rowKey={(record: any, paymentIndex) => record._id || paymentIndex}
                                  pagination={false}
                                  dataSource={planPayments}
                                  columns={[
                                    {
                                      title: 'Payment Date',
                                      key: 'payment_date',
                                      render: (record: any) => record.payment_date ? dayjs(record.payment_date).format('DD MMM YYYY') : '-',
                                    },
                                    {
                                      title: 'Amount',
                                      dataIndex: 'amount',
                                      key: 'amount',
                                      render: (amount: number) => `KES ${(amount || 0).toLocaleString()}`,
                                    },
                                    {
                                      title: 'Method',
                                      key: 'method',
                                      render: (record: any) => record.method_id?.name?.replace('_', ' ').toUpperCase() || '-',
                                    },
                                    {
                                      title: 'Status',
                                      dataIndex: 'payment_status',
                                      key: 'payment_status',
                                      render: (status: string) => (
                                        <Tag color={status === 'COMPLETED' ? 'green' : 'orange'}>{status || '-'}</Tag>
                                      ),
                                    },
                                  ]}
                                />
                              )}
                            </Card>
                          );
                        })()
                      ))
                    ) : (
                      <Empty description="No payment plans found" />
                    )}

                    <Card title="Payments">
                      {selectedSale.payments?.length ? (
                        <Table
                          rowKey={(record: any, index) => record._id || index}
                          pagination={false}
                          dataSource={selectedSale.payments}
                          columns={[
                            {
                              title: 'Date',
                              key: 'payment_date',
                              render: (record: any) => record.payment_date ? dayjs(record.payment_date).format('DD MMM YYYY') : '-',
                            },
                            {
                              title: 'Amount',
                              dataIndex: 'amount',
                              key: 'amount',
                              render: (amount: number) => `KES ${(amount || 0).toLocaleString()}`,
                            },
                            {
                              title: 'Method',
                              key: 'method',
                              render: (record: any) => record.method_id?.name?.replace('_', ' ').toUpperCase() || '-',
                            },
                            {
                              title: 'Type',
                              dataIndex: 'payment_type',
                              key: 'payment_type',
                              render: (type: string) => type?.replace('_', ' ') || '-',
                            },
                            {
                              title: 'Status',
                              dataIndex: 'payment_status',
                              key: 'payment_status',
                              render: (status: string) => (
                                <Tag color={status === 'COMPLETED' ? 'green' : 'orange'}>{status || '-'}</Tag>
                              ),
                            },
                          ]}
                        />
                      ) : (
                        <Empty description="No payments found" />
                      )}
                    </Card>
                  </Space>
                ),
              },
              {
                key: 'documents',
                label: 'Sale Documents',
                children: selectedSale.documents?.length ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {selectedSale.documents.map((document: any, index: number) => {
                      const url = document.url || document.fileUrl || document.path;
                      return (
                        <Card
                          key={document._id || url || index}
                          size="small"
                          title={
                            <Space>
                              <FileTextOutlined />
                              {document.name || document.fileName || document.title || `Document ${index + 1}`}
                            </Space>
                          }
                          extra={
                            url ? (
                              <Button type="link" href={url} target="_blank" icon={<DownloadOutlined />}>
                                Download
                              </Button>
                            ) : null
                          }
                        >
                          <Text type="secondary">{document.type || document.mimeType || 'Sale document'}</Text>
                        </Card>
                      );
                    })}
                  </Space>
                ) : (
                  <Empty description="No sale documents found" />
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
};

export default SalesManagement;
