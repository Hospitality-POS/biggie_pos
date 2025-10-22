import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Input, DatePicker, Select, Modal, message } from 'antd';
import { PlusOutlined, SearchOutlined, DollarCircleOutlined, EyeOutlined, EditOutlined, DeleteOutlined, FileOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllExpenses, deleteExpense } from '@services/accounting/expenses';
import ExpenseForm from './ExpenseForm';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { confirm } = Modal;

const ExpensesList: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingExpense, setEditingExpense] = useState<any>(null);
    const [filters, setFilters] = useState({
        search: '',
        dateRange: null,
        category: undefined,
        status: undefined,
    });

    const queryClient = useQueryClient();

    const { data: expensesData, isLoading } = useQuery({
        queryKey: ['expenses', filters],
        queryFn: () => fetchAllExpenses({
            category: filters.category,
            status: filters.status,
            start_date: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
            end_date: filters.dateRange?.[1]?.format('YYYY-MM-DD'),
        }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            message.success('Expense deleted successfully');
        },
        onError: () => {
            message.error('Failed to delete expense');
        },
    });

    const expenses = expensesData?.data || [];

    // Filter expenses by search term on client side
    const filteredExpenses = expenses.filter((expense: any) => {
        if (!filters.search) return true;
        const searchLower = filters.search.toLowerCase();
        return (
            expense.expense_number?.toLowerCase().includes(searchLower) ||
            expense.description?.toLowerCase().includes(searchLower) ||
            expense.vendor_name?.toLowerCase().includes(searchLower) ||
            expense.category?.toLowerCase().includes(searchLower)
        );
    });

    const handleEdit = (record: any) => {
        setEditingExpense(record);
        setIsModalVisible(true);
    };

    const handleAdd = () => {
        setEditingExpense(null);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingExpense(null);
    };

    const handleDelete = (record: any) => {
        confirm({
            title: 'Delete Expense',
            content: `Are you sure you want to delete expense ${record.expense_number}?`,
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => {
                deleteMutation.mutate(record._id);
            },
        });
    };

    const handleViewDocument = (url: string) => {
        window.open(url, '_blank');
    };

    const handleDownloadDocument = (url: string, name: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = name || 'receipt';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const columns = [
        {
            title: 'Expense #',
            dataIndex: 'expense_number',
            key: 'expense_number',
            width: 120,
        },
        {
            title: 'Date',
            dataIndex: 'expense_date',
            key: 'expense_date',
            width: 120,
            render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
            sorter: (a: any, b: any) => dayjs(a.expense_date).unix() - dayjs(b.expense_date).unix(),
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            width: 150,
            render: (category: string) => {
                const colors: Record<string, string> = {
                    office: 'blue',
                    utilities: 'cyan',
                    travel: 'purple',
                    meals: 'orange',
                    rent: 'magenta',
                    salaries: 'green',
                    marketing: 'gold',
                    professional_fees: 'geekblue',
                    insurance: 'lime',
                    maintenance: 'volcano',
                    other: 'default'
                };
                return <Tag color={colors[category] || 'default'}>{category?.toUpperCase().replace('_', ' ')}</Tag>;
            },
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Vendor',
            dataIndex: 'vendor_name',
            key: 'vendor_name',
            width: 150,
            render: (vendor: string) => vendor || <Text type="secondary">-</Text>,
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            width: 120,
            align: 'right' as const,
            render: (amount: number) => <Text strong style={{ color: '#f5222d' }}>KES {amount?.toLocaleString() || '0.00'}</Text>,
            sorter: (a: any, b: any) => a.amount - b.amount,
        },
        {
            title: 'Payment',
            dataIndex: 'payment_method',
            key: 'payment_method',
            width: 130,
            render: (method: string) => method?.replace('_', ' ').toUpperCase(),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => {
                const colors: Record<string, string> = {
                    draft: 'default',
                    pending: 'orange',
                    approved: 'green',
                    paid: 'green',
                    rejected: 'red'
                };
                return <Tag color={colors[status]}>{status?.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Document',
            key: 'document',
            width: 100,
            render: (record: any) => {
                if (record.document_url) {
                    return (
                        <Space size="small">
                            <Button
                                type="link"
                                icon={<EyeOutlined />}
                                size="small"
                                onClick={() => handleViewDocument(record.document_url)}
                                title="View document"
                            />
                            <Button
                                type="link"
                                icon={<DownloadOutlined />}
                                size="small"
                                onClick={() => handleDownloadDocument(record.document_url, record.document_name)}
                                title="Download document"
                            />
                        </Space>
                    );
                }
                return <Text type="secondary">-</Text>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            fixed: 'right' as const,
            render: (record: any) => (
                <Space size="small">
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEdit(record)}
                        disabled={record.status === 'paid'}
                        title={record.status === 'paid' ? 'Cannot edit paid expense' : 'Edit expense'}
                    />
                    <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        onClick={() => handleDelete(record)}
                        disabled={record.status === 'paid'}
                        title={record.status === 'paid' ? 'Cannot delete paid expense' : 'Delete expense'}
                    />
                </Space>
            ),
        },
    ];

    // Calculate summary statistics
    const totalExpenses = filteredExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    const pendingCount = filteredExpenses.filter((exp: any) => exp.status === 'pending').length;
    const paidCount = filteredExpenses.filter((exp: any) => exp.status === 'paid').length;

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            <DollarCircleOutlined /> Expenses
                        </Title>
                        <Text type="secondary">Track and manage business expenses</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={handleAdd}
                    >
                        Add Expense
                    </Button>
                </div>

                {/* Summary Cards */}
                <Space style={{ marginBottom: 16, width: '100%' }} size="large">
                    <Card size="small" style={{ minWidth: 200 }}>
                        <Text type="secondary">Total Expenses</Text>
                        <Title level={4} style={{ margin: '8px 0 0 0', color: '#f5222d' }}>
                            KES {totalExpenses.toLocaleString()}
                        </Title>
                    </Card>
                    <Card size="small" style={{ minWidth: 150 }}>
                        <Text type="secondary">Pending</Text>
                        <Title level={4} style={{ margin: '8px 0 0 0', color: '#fa8c16' }}>
                            {pendingCount}
                        </Title>
                    </Card>
                    <Card size="small" style={{ minWidth: 150 }}>
                        <Text type="secondary">Paid</Text>
                        <Title level={4} style={{ margin: '8px 0 0 0', color: '#52c41a' }}>
                            {paidCount}
                        </Title>
                    </Card>
                </Space>

                {/* Filters */}
                <Space style={{ marginBottom: 16 }} wrap>
                    <Input
                        placeholder="Search expenses..."
                        prefix={<SearchOutlined />}
                        style={{ width: 250 }}
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        allowClear
                    />
                    <RangePicker
                        value={filters.dateRange as any}
                        onChange={(dates) => setFilters({ ...filters, dateRange: dates as any })}
                    />
                    <Select
                        placeholder="Category"
                        style={{ width: 150 }}
                        allowClear
                        value={filters.category}
                        onChange={(value) => setFilters({ ...filters, category: value })}
                    >
                        <Option value="office">Office Supplies</Option>
                        <Option value="utilities">Utilities</Option>
                        <Option value="travel">Travel</Option>
                        <Option value="meals">Meals & Entertainment</Option>
                        <Option value="rent">Rent</Option>
                        <Option value="salaries">Salaries & Wages</Option>
                        <Option value="marketing">Marketing & Advertising</Option>
                        <Option value="professional_fees">Professional Fees</Option>
                        <Option value="insurance">Insurance</Option>
                        <Option value="maintenance">Maintenance & Repairs</Option>
                        <Option value="other">Other</Option>
                    </Select>
                    <Select
                        placeholder="Status"
                        style={{ width: 150 }}
                        allowClear
                        value={filters.status}
                        onChange={(value) => setFilters({ ...filters, status: value })}
                    >
                        <Option value="draft">Draft</Option>
                        <Option value="pending">Pending</Option>
                        <Option value="approved">Approved</Option>
                        <Option value="paid">Paid</Option>
                        <Option value="rejected">Rejected</Option>
                    </Select>
                </Space>

                <Table
                    columns={columns}
                    dataSource={filteredExpenses}
                    loading={isLoading || deleteMutation.isPending}
                    rowKey="_id"
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `Total ${total} expenses`,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100']
                    }}
                    scroll={{ x: 1400 }}
                    summary={() => (
                        <Table.Summary fixed>
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={5}>
                                    <Text strong>Total</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={5} align="right">
                                    <Text strong style={{ color: '#f5222d', fontSize: 16 }}>
                                        KES {totalExpenses.toLocaleString()}
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={6} colSpan={4} />
                            </Table.Summary.Row>
                        </Table.Summary>
                    )}
                />

                <ExpenseForm
                    visible={isModalVisible}
                    onCancel={handleCancel}
                    editingExpense={editingExpense}
                />
            </Card>
        </div>
    );
};

export default ExpensesList;