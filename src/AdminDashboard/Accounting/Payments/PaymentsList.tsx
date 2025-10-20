import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Input, DatePicker, Select, Modal, Badge } from 'antd';
import { PlusOutlined, SearchOutlined, DollarOutlined, EyeOutlined, EditOutlined, CheckCircleOutlined, StopOutlined, ClearOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllPayments, voidPayment } from '@services/accounting/payments';
import PaymentForm from './PaymentForm';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { confirm } = Modal;

const PaymentsList: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingPayment, setEditingPayment] = useState<any>(null);
    const [filters, setFilters] = useState<any>({
        search: undefined,
        payment_type: undefined,
        payment_method: undefined,
        status: undefined,
        start_date: undefined,
        end_date: undefined,
    });

    const queryClient = useQueryClient();

    const { data: paymentsData, isLoading, isFetching } = useQuery({
        queryKey: ['payments', filters],
        queryFn: () => {
            console.log('Query function called with filters:', filters);
            return fetchAllPayments(filters);
        },
    });

    const voidMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => voidPayment(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] });
        },
    });

    const payments = paymentsData?.data || [];

    console.log('Payments data:', paymentsData);
    console.log('Payments array:', payments);

    const handleEdit = (record: any) => {
        setEditingPayment(record);
        setIsModalVisible(true);
    };

    const handleAdd = () => {
        setEditingPayment(null);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingPayment(null);
    };

    const handleVoid = (record: any) => {
        confirm({
            title: 'Void Payment',
            content: 'Are you sure you want to void this payment? This action will reverse all allocations.',
            okText: 'Yes, Void Payment',
            okType: 'danger',
            onOk: () => {
                const reason = prompt('Please enter a reason for voiding:');
                if (reason) {
                    voidMutation.mutate({ id: record._id, reason });
                }
            },
        });
    };

    const handleDateRangeChange = (dates: any) => {
        if (dates && dates.length === 2) {
            setFilters({
                ...filters,
                start_date: dates[0].format('YYYY-MM-DD'),
                end_date: dates[1].format('YYYY-MM-DD'),
            });
        } else {
            setFilters({
                ...filters,
                start_date: undefined,
                end_date: undefined,
            });
        }
    };

    const clearFilters = () => {
        setFilters({
            search: undefined,
            payment_type: undefined,
            payment_method: undefined,
            status: undefined,
            start_date: undefined,
            end_date: undefined,
        });
    };

    // Count active filters
    const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

    const columns = [
        {
            title: 'Payment #',
            dataIndex: 'payment_number',
            key: 'payment_number',
            width: 150,
        },
        {
            title: 'Type',
            dataIndex: 'payment_type',
            key: 'payment_type',
            width: 120,
            render: (type: string) => {
                const colors: Record<string, string> = {
                    received: 'green',
                    made: 'red',
                };
                return <Tag color={colors[type]}>{type?.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Party',
            dataIndex: 'party_name',
            key: 'party_name',
            ellipsis: true,
        },
        {
            title: 'Date',
            dataIndex: 'payment_date',
            key: 'payment_date',
            width: 120,
            render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right' as const,
            width: 130,
            render: (amount: number, record: any) => {
                const color = record.payment_type === 'received' ? '#52c41a' : '#f5222d';
                return <Text strong style={{ color }}>KES {amount?.toLocaleString() || '0.00'}</Text>;
            },
        },
        {
            title: 'Method',
            dataIndex: 'payment_method',
            key: 'payment_method',
            width: 120,
            render: (method: string) => method?.toUpperCase().replace('_', ' '),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => {
                const colors: Record<string, string> = {
                    pending: 'orange',
                    completed: 'green',
                    failed: 'red',
                    voided: 'default',
                    cancelled: 'default'
                };
                return (
                    <Tag color={colors[status]} icon={status === 'completed' ? <CheckCircleOutlined /> : undefined}>
                        {status?.toUpperCase()}
                    </Tag>
                );
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            fixed: 'right' as const,
            render: (record: any) => (
                <Space size="small">
                    <Button type="link" icon={<EyeOutlined />} size="small" title="View" />
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEdit(record)}
                        disabled={record.status === 'completed' || record.status === 'voided'}
                        title="Edit"
                    />
                    {record.status === 'completed' && !record.voided_at && (
                        <Button
                            type="link"
                            icon={<StopOutlined />}
                            size="small"
                            onClick={() => handleVoid(record)}
                            danger
                            title="Void"
                        />
                    )}
                </Space>
            ),
        },
    ];

    // Calculate summary - include pending and completed, exclude voided
    const totalReceived = payments
        .filter((p: any) =>
            p.payment_type === 'received' &&
            (p.status === 'completed' || p.status === 'pending') &&
            !p.voided_at
        )
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const totalMade = payments
        .filter((p: any) =>
            p.payment_type === 'made' &&
            (p.status === 'completed' || p.status === 'pending') &&
            !p.voided_at
        )
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const netCashFlow = totalReceived - totalMade;

    const completedReceived = payments
        .filter((p: any) =>
            p.payment_type === 'received' &&
            p.status === 'completed' &&
            !p.voided_at
        )
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const completedMade = payments
        .filter((p: any) =>
            p.payment_type === 'made' &&
            p.status === 'completed' &&
            !p.voided_at
        )
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const pendingReceived = payments
        .filter((p: any) =>
            p.payment_type === 'received' &&
            p.status === 'pending'
        )
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const pendingMade = payments
        .filter((p: any) =>
            p.payment_type === 'made' &&
            p.status === 'pending'
        )
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            <DollarOutlined /> Payments
                        </Title>
                        <Text type="secondary">Manage all payments ({payments.length} total)</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={handleAdd}
                    >
                        Record Payment
                    </Button>
                </div>

                {/* Summary Cards */}
                <Space style={{ marginBottom: 16, width: '100%' }} size="large" wrap>
                    <Card size="small" style={{ minWidth: 200 }}>
                        <Text type="secondary">Total Received</Text>
                        <Title level={4} style={{ margin: '8px 0 0 0', color: '#52c41a' }}>
                            KES {totalReceived.toLocaleString()}
                        </Title>
                        {pendingReceived > 0 && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                (Pending: KES {pendingReceived.toLocaleString()})
                            </Text>
                        )}
                    </Card>
                    <Card size="small" style={{ minWidth: 200 }}>
                        <Text type="secondary">Total Made</Text>
                        <Title level={4} style={{ margin: '8px 0 0 0', color: '#f5222d' }}>
                            KES {totalMade.toLocaleString()}
                        </Title>
                        {pendingMade > 0 && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                (Pending: KES {pendingMade.toLocaleString()})
                            </Text>
                        )}
                    </Card>
                    <Card size="small" style={{ minWidth: 200 }}>
                        <Text type="secondary">Net Cash Flow</Text>
                        <Title level={4} style={{ margin: '8px 0 0 0', color: netCashFlow >= 0 ? '#52c41a' : '#f5222d' }}>
                            KES {netCashFlow.toLocaleString()}
                        </Title>
                    </Card>
                    <Card size="small" style={{ minWidth: 200 }}>
                        <Text type="secondary">Completed Received</Text>
                        <Title level={4} style={{ margin: '8px 0 0 0', color: '#52c41a' }}>
                            KES {completedReceived.toLocaleString()}
                        </Title>
                    </Card>
                    <Card size="small" style={{ minWidth: 200 }}>
                        <Text type="secondary">Completed Made</Text>
                        <Title level={4} style={{ margin: '8px 0 0 0', color: '#f5222d' }}>
                            KES {completedMade.toLocaleString()}
                        </Title>
                    </Card>
                </Space>

                {/* Filters */}
                <Space style={{ marginBottom: 16 }} wrap>
                    <Input
                        placeholder="Search payment number..."
                        prefix={<SearchOutlined />}
                        style={{ width: 250 }}
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
                        allowClear
                    />
                    <RangePicker
                        onChange={handleDateRangeChange}
                        format="YYYY-MM-DD"
                    />
                    <Select
                        placeholder="Payment Type"
                        style={{ width: 150 }}
                        allowClear
                        value={filters.payment_type}
                        onChange={(value) => setFilters({ ...filters, payment_type: value })}
                    >
                        <Option value="received">Received</Option>
                        <Option value="made">Made</Option>
                    </Select>
                    <Select
                        placeholder="Payment Method"
                        style={{ width: 150 }}
                        allowClear
                        value={filters.payment_method}
                        onChange={(value) => setFilters({ ...filters, payment_method: value })}
                    >
                        <Option value="cash">Cash</Option>
                        <Option value="bank_transfer">Bank Transfer</Option>
                        <Option value="mpesa">M-Pesa</Option>
                        <Option value="credit_card">Credit Card</Option>
                        <Option value="cheque">Cheque</Option>
                    </Select>
                    <Select
                        placeholder="Status"
                        style={{ width: 150 }}
                        allowClear
                        value={filters.status}
                        onChange={(value) => setFilters({ ...filters, status: value })}
                    >
                        <Option value="pending">Pending</Option>
                        <Option value="completed">Completed</Option>
                        <Option value="failed">Failed</Option>
                        <Option value="voided">Voided</Option>
                    </Select>
                    {activeFiltersCount > 0 && (
                        <Badge count={activeFiltersCount}>
                            <Button
                                icon={<ClearOutlined />}
                                onClick={clearFilters}
                            >
                                Clear Filters
                            </Button>
                        </Badge>
                    )}
                </Space>

                <Table
                    columns={columns}
                    dataSource={payments}
                    loading={isLoading || isFetching || voidMutation.isPending}
                    rowKey="_id"
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `Total ${total} payments`,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100']
                    }}
                    scroll={{ x: 1200 }}
                />

                <PaymentForm
                    visible={isModalVisible}
                    onCancel={handleCancel}
                    editingPayment={editingPayment}
                />
            </Card>
        </div>
    );
};

export default PaymentsList;