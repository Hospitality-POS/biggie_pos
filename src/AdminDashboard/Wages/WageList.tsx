import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Input, Select, Modal, message, Drawer, Form, Statistic, Row, Col, DatePicker } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    StopOutlined,
    HistoryOutlined,
    DollarOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchAllWages,
    fetchWageById,
    deactivateWage,
    deleteWageById,
    calculateShopPayroll
} from '@services/wages';
import WageForm from './WageForm';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const WagesList: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingWage, setEditingWage] = useState<any>(null);
    const [viewDrawerVisible, setViewDrawerVisible] = useState(false);
    const [selectedWage, setSelectedWage] = useState<any>(null);
    const [loadingWageId, setLoadingWageId] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        search: '',
        wageType: undefined,
        isActive: undefined,
        dateRange: null
    });

    const queryClient = useQueryClient();

    // ✅ Read shopId once — used to guard payroll query
    const shopId = localStorage.getItem("shopId");

    const { data: wagesData, isLoading } = useQuery({
        queryKey: ['wages', filters.wageType, filters.isActive, filters.search],
        queryFn: () => fetchAllWages({
            wageType: filters.wageType,
            isActive: filters.isActive,
            search: filters.search
        }),
    });

    // ✅ Only run payroll query when shopId is a valid non-empty string
    const { data: payrollData } = useQuery({
        queryKey: ['shopPayroll', shopId],
        queryFn: () => calculateShopPayroll(shopId!),
        enabled: !!shopId && shopId !== 'undefined' && shopId !== 'null',
        retry: false, // ✅ don't retry on 400 — shopId is simply not set yet
    });

    const wages = wagesData?.data || [];
    const payroll = payrollData?.data || null;

    // Deactivate wage mutation
    const deactivateMutation = useMutation({
        mutationFn: deactivateWage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wages'] });
            queryClient.invalidateQueries({ queryKey: ['shopPayroll'] });
        },
        onError: () => {
            message.error('Failed to deactivate wage');
        }
    });

    // Delete wage mutation
    const deleteMutation = useMutation({
        mutationFn: deleteWageById,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wages'] });
            queryClient.invalidateQueries({ queryKey: ['shopPayroll'] });
        },
        onError: () => {
            message.error('Failed to delete wage');
        }
    });

    const handleView = async (record: any) => {
        try {
            setLoadingWageId(record._id);
            const response = await fetchWageById(record._id);
            setSelectedWage(response.data);
            setViewDrawerVisible(true);
        } catch (error) {
            message.error('Failed to load wage details');
        } finally {
            setLoadingWageId(null);
        }
    };

    const handleEdit = (record: any) => {
        setEditingWage(record);
        setIsModalVisible(true);
    };

    const handleAdd = () => {
        setEditingWage(null);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingWage(null);
    };

    const handleDeactivate = (record: any) => {
        confirm({
            title: 'Deactivate Wage',
            content: `Are you sure you want to deactivate the wage for ${record.user_id?.fullname || 'this employee'}?`,
            okText: 'Yes, Deactivate',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => {
                deactivateMutation.mutate(record._id);
            }
        });
    };

    const handleDelete = (record: any) => {
        confirm({
            title: 'Delete Wage',
            content: `Are you sure you want to permanently delete the wage for ${record.user_id?.fullname || 'this employee'}? This action cannot be undone.`,
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => {
                deleteMutation.mutate(record._id);
            }
        });
    };

    // Filter wages by search term and date range
    const filteredWages = wages.filter((wage: any) => {
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const employeeName = wage.user_id?.fullname?.toLowerCase() || '';
            const employeeEmail = wage.user_id?.email?.toLowerCase() || '';
            if (!employeeName.includes(searchLower) && !employeeEmail.includes(searchLower)) {
                return false;
            }
        }

        if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
            const effectiveDate = dayjs(wage.effectiveDate);
            const startDate = dayjs(filters.dateRange[0]).startOf('day');
            const endDate = dayjs(filters.dateRange[1]).endOf('day');
            if (!effectiveDate.isBetween(startDate, endDate, null, '[]')) {
                return false;
            }
        }

        return true;
    });

    const totalActiveWages = filteredWages.filter((w: any) => w.isActive).length;
    const totalInactiveWages = filteredWages.filter((w: any) => !w.isActive).length;

    const columns = [
        {
            title: 'Employee',
            dataIndex: ['user_id', 'fullname'],
            key: 'employee',
            render: (text: string, record: any) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{text || 'N/A'}</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                        {record.user_id?.email || ''}
                    </div>
                </div>
            ),
        },
        {
            title: 'Wage Type',
            dataIndex: 'wageType',
            key: 'wageType',
            render: (type: string) => (
                <Tag color={type === 'daily' ? 'blue' : type === 'weekly' ? 'green' : 'purple'}>
                    {type?.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Base Amount',
            dataIndex: 'baseAmount',
            key: 'baseAmount',
            render: (amount: number, record: any) => (
                <span style={{ fontWeight: 500 }}>
                    {record.currency} {amount?.toLocaleString()}
                </span>
            ),
        },
        {
            title: 'Total Allowances',
            key: 'allowances',
            render: (_: any, record: any) => {
                const total = record.allowances?.reduce((sum: number, a: any) => sum + a.amount, 0) || 0;
                return (
                    <span style={{ color: '#52c41a', fontWeight: 500 }}>
                        + {record.currency} {total.toLocaleString()}
                    </span>
                );
            },
        },
        {
            title: 'Total Deductions',
            key: 'deductions',
            render: (_: any, record: any) => {
                const total = record.deductions?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0;
                return (
                    <span style={{ color: '#ff4d4f', fontWeight: 500 }}>
                        - {record.currency} {total.toLocaleString()}
                    </span>
                );
            },
        },
        {
            title: 'Net Wage',
            key: 'netWage',
            render: (_: any, record: any) => {
                const allowances = record.allowances?.reduce((sum: number, a: any) => sum + a.amount, 0) || 0;
                const deductions = record.deductions?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0;
                const net = record.baseAmount + allowances - deductions;
                return (
                    <span style={{ fontWeight: 600, color: '#1890ff', fontSize: 14 }}>
                        {record.currency} {net.toLocaleString()}
                    </span>
                );
            },
        },
        {
            title: 'Effective Date',
            dataIndex: 'effectiveDate',
            key: 'effectiveDate',
            render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
        },
        {
            title: 'Status',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive: boolean) => (
                <Tag color={isActive ? 'success' : 'default'}>
                    {isActive ? 'Active' : 'Inactive'}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            fixed: 'right' as const,
            width: 200,
            render: (_: any, record: any) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleView(record)}
                        loading={loadingWageId === record._id}
                    >
                        View
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        Edit
                    </Button>
                    {record.isActive ? (
                        <Button
                            type="link"
                            size="small"
                            danger
                            icon={<StopOutlined />}
                            onClick={() => handleDeactivate(record)}
                        >
                            Deactivate
                        </Button>
                    ) : (
                        <Button
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(record)}
                        >
                            Delete
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <Title level={3} style={{ margin: 0 }}>
                                <DollarOutlined /> Employee Wages
                            </Title>
                            <Text type="secondary">Manage employee wage structures</Text>
                        </div>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            size="large"
                            onClick={handleAdd}
                        >
                            Add Wage
                        </Button>
                    </div>

                    {/* Summary Statistics */}
                    <Row gutter={16}>
                        <Col span={6}>
                            <Card size="small" style={{ background: '#f0f5ff', borderColor: '#adc6ff' }}>
                                <Statistic
                                    title="Total Wages"
                                    value={filteredWages.length}
                                    prefix={<HistoryOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                                <Statistic
                                    title="Active Wages"
                                    value={totalActiveWages}
                                    valueStyle={{ color: '#52c41a' }}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small" style={{ background: '#fff7e6', borderColor: '#ffd591' }}>
                                <Statistic
                                    title="Inactive Wages"
                                    value={totalInactiveWages}
                                    valueStyle={{ color: '#fa8c16' }}
                                />
                            </Card>
                        </Col>
                        {payroll && (
                            <Col span={6}>
                                <Card size="small" style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
                                    <Statistic
                                        title="Total Monthly Payroll"
                                        value={payroll.totalPayroll || 0}
                                        prefix="KES"
                                        precision={0}
                                        valueStyle={{ color: '#1890ff' }}
                                    />
                                </Card>
                            </Col>
                        )}
                    </Row>

                    {/* Filters */}
                    <Space wrap>
                        <Input
                            placeholder="Search employees..."
                            prefix={<SearchOutlined />}
                            style={{ width: 250 }}
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            allowClear
                        />
                        <RangePicker
                            value={filters.dateRange as any}
                            onChange={(dates) => setFilters({ ...filters, dateRange: dates as any })}
                            placeholder={['Start Date', 'End Date']}
                            format="MMM DD, YYYY"
                        />
                        <Select
                            placeholder="Wage Type"
                            style={{ width: 150 }}
                            value={filters.wageType}
                            onChange={(value) => setFilters({ ...filters, wageType: value })}
                            allowClear
                        >
                            <Option value="daily">Daily</Option>
                            <Option value="weekly">Weekly</Option>
                            <Option value="monthly">Monthly</Option>
                        </Select>
                        <Select
                            placeholder="Status"
                            style={{ width: 150 }}
                            value={filters.isActive}
                            onChange={(value) => setFilters({ ...filters, isActive: value })}
                            allowClear
                        >
                            <Option value="true">Active</Option>
                            <Option value="false">Inactive</Option>
                        </Select>
                    </Space>

                    {/* Table */}
                    <Table
                        columns={columns}
                        dataSource={filteredWages}
                        rowKey="_id"
                        loading={isLoading}
                        scroll={{ x: 1500 }}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} wages`,
                        }}
                    />
                </Space>

                {/* ✅ WageForm only mounts when modal is open — prevents useForm disconnected warning */}
                {isModalVisible && (
                    <WageForm
                        visible={isModalVisible}
                        onCancel={handleCancel}
                        editingWage={editingWage}
                    />
                )}

                {/* View Wage Drawer */}
                <Drawer
                    title={`Wage Details - ${selectedWage?.user_id?.fullname || ''}`}
                    placement="right"
                    width={600}
                    onClose={() => setViewDrawerVisible(false)}
                    open={viewDrawerVisible}
                >
                    {selectedWage && (
                        <div>
                            <Space direction="vertical" style={{ width: '100%' }} size="large">
                                <div>
                                    <Text strong>Employee Information:</Text>
                                    <div style={{ marginTop: 8 }}>
                                        <div><Text type="secondary">Name:</Text> {selectedWage.user_id?.fullname}</div>
                                        <div><Text type="secondary">Email:</Text> {selectedWage.user_id?.email}</div>
                                        <div><Text type="secondary">Phone:</Text> {selectedWage.user_id?.phone}</div>
                                    </div>
                                </div>

                                <div>
                                    <Text strong>Wage Information:</Text>
                                    <div style={{ marginTop: 8 }}>
                                        <div>
                                            <Text type="secondary">Type:</Text>{' '}
                                            <Tag color={selectedWage.wageType === 'daily' ? 'blue' : selectedWage.wageType === 'weekly' ? 'green' : 'purple'}>
                                                {selectedWage.wageType?.toUpperCase()}
                                            </Tag>
                                        </div>
                                        <div><Text type="secondary">Payment Frequency:</Text> {selectedWage.paymentFrequency}</div>
                                        <div><Text type="secondary">Effective Date:</Text> {dayjs(selectedWage.effectiveDate).format('MMM DD, YYYY')}</div>
                                        <div>
                                            <Text type="secondary">Status:</Text>{' '}
                                            <Tag color={selectedWage.isActive ? 'success' : 'default'}>
                                                {selectedWage.isActive ? 'Active' : 'Inactive'}
                                            </Tag>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Text strong>Allowances:</Text>
                                    {selectedWage.allowances?.length > 0 ? (
                                        <Table
                                            size="small"
                                            columns={[
                                                { title: 'Name', dataIndex: 'name', key: 'name' },
                                                { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (val: number) => `KES ${val.toLocaleString()}` },
                                                { title: 'Frequency', dataIndex: 'frequency', key: 'frequency' },
                                            ]}
                                            dataSource={selectedWage.allowances}
                                            pagination={false}
                                            rowKey={(record, index) => index?.toString() || '0'}
                                            style={{ marginTop: 8 }}
                                        />
                                    ) : (
                                        <div style={{ marginTop: 8, color: '#8c8c8c' }}>No allowances</div>
                                    )}
                                </div>

                                <div>
                                    <Text strong>Deductions:</Text>
                                    {selectedWage.deductions?.length > 0 ? (
                                        <Table
                                            size="small"
                                            columns={[
                                                { title: 'Name', dataIndex: 'name', key: 'name' },
                                                { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (val: number) => `KES ${val.toLocaleString()}` },
                                                { title: 'Frequency', dataIndex: 'frequency', key: 'frequency' },
                                            ]}
                                            dataSource={selectedWage.deductions}
                                            pagination={false}
                                            rowKey={(record, index) => index?.toString() || '0'}
                                            style={{ marginTop: 8 }}
                                        />
                                    ) : (
                                        <div style={{ marginTop: 8, color: '#8c8c8c' }}>No deductions</div>
                                    )}
                                </div>

                                <div>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text>Base Wage:</Text>
                                            <Text strong>{selectedWage.currency} {selectedWage.baseAmount?.toLocaleString()}</Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text>Total Allowances:</Text>
                                            <Text strong style={{ color: '#52c41a' }}>
                                                + {selectedWage.currency} {selectedWage.allowances?.reduce((sum: number, a: any) => sum + a.amount, 0)?.toLocaleString() || '0'}
                                            </Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text>Total Deductions:</Text>
                                            <Text strong style={{ color: '#ff4d4f' }}>
                                                - {selectedWage.currency} {selectedWage.deductions?.reduce((sum: number, d: any) => sum + d.amount, 0)?.toLocaleString() || '0'}
                                            </Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                                            <Text strong>Net Wage:</Text>
                                            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                                                {selectedWage.currency} {(
                                                    selectedWage.baseAmount +
                                                    (selectedWage.allowances?.reduce((sum: number, a: any) => sum + a.amount, 0) || 0) -
                                                    (selectedWage.deductions?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0)
                                                ).toLocaleString()}
                                            </Title>
                                        </div>
                                        {selectedWage.overtimeRate > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Text>Overtime Rate:</Text>
                                                <Text>{selectedWage.currency} {selectedWage.overtimeRate?.toLocaleString()}</Text>
                                            </div>
                                        )}
                                    </Space>
                                </div>

                                {selectedWage.notes && (
                                    <div>
                                        <Text strong>Notes:</Text>
                                        <div style={{ marginTop: 8 }}>{selectedWage.notes}</div>
                                    </div>
                                )}

                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Created: {dayjs(selectedWage.createdAt).format('MMM DD, YYYY HH:mm')}
                                    </Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Last Updated: {dayjs(selectedWage.updatedAt).format('MMM DD, YYYY HH:mm')}
                                    </Text>
                                </div>
                            </Space>
                        </div>
                    )}
                </Drawer>
            </Card>
        </div>
    );
};

export default WagesList;