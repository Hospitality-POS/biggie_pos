import React, { useState } from 'react';
import {
    Card, Table, Button, Space, Typography, Tag, Input, Select, Popconfirm, Alert
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    SearchOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllAccounts, deleteAccount } from '@services/accounting/accounts';
import { reseedChartOfAccounts, getCurrentTenantId } from '@services/tenants';
import AccountForm from './AccountForm';

const { Title, Text } = Typography;
const { Option } = Select;

const ChartOfAccounts: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any>(null);
    const [isReseeding, setIsReseeding] = useState(false);
    const queryClient = useQueryClient();

    const { data: accountsData, isLoading } = useQuery({
        queryKey: ['chartOfAccounts'],
        queryFn: () => fetchAllAccounts({}),
    });

    console.log('accs', accountsData);

    const accounts = accountsData?.data || [];
    const isEmpty = accounts.length === 0;

    const deleteMutation = useMutation({
        mutationFn: deleteAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
        },
    });

    const handleReseed = async () => {
        const tenantId = getCurrentTenantId();
        if (!tenantId) {
            return;
        }

        setIsReseeding(true);
        try {
            await reseedChartOfAccounts(tenantId);
            queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
        } catch (error) {
            console.error('Failed to reseed chart of accounts:', error);
        } finally {
            setIsReseeding(false);
        }
    };

    const handleEdit = (record: any) => {
        setEditingAccount(record);
        setIsModalVisible(true);
    };

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id);
    };

    const handleAdd = () => {
        if (isEmpty) {
            return; // Prevent adding when empty
        }
        setEditingAccount(null);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingAccount(null);
    };

    const columns = [
        {
            title: 'Account Code',
            dataIndex: 'code',
            key: 'code',
            width: 120,
        },
        {
            title: 'Account Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Account Type',
            dataIndex: 'account_type',
            key: 'account_type',
            render: (type: string) => {
                const colors: Record<string, string> = {
                    Asset: 'blue',
                    Liability: 'red',
                    Equity: 'green',
                    Revenue: 'cyan',
                    Expense: 'orange'
                };
                return <Tag color={colors[type] || 'default'}>{type?.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
        },
        {
            title: 'Currency',
            dataIndex: 'currency',
            key: 'currency',
        },
        {
            title: 'Balance',
            dataIndex: 'current_balance',
            key: 'current_balance',
            align: 'right' as const,
            render: (balance: number) => (
                <Text strong>KES {balance?.toLocaleString() || '0.00'}</Text>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (active: boolean) => (
                <Tag color={active ? 'green' : 'default'}>
                    {active ? 'ACTIVE' : 'INACTIVE'}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (record: any) => (
                <Space size="small">
                    <Button type="link" icon={<EyeOutlined />} size="small" />
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="Delete Account"
                        description="Are you sure you want to delete this account?"
                        onConfirm={() => handleDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="link" danger icon={<DeleteOutlined />} size="small" />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <div
                    style={{
                        marginBottom: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            Chart of Accounts
                        </Title>
                        <Text type="secondary">Manage your accounting accounts</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={handleAdd}
                        disabled={isEmpty}
                        title={isEmpty ? 'Please activate chart of accounts first' : 'Add Account'}
                    >
                        Add Account
                    </Button>
                </div>

                {/* Empty State Alert */}
                {isEmpty && !isLoading && (
                    <Alert
                        message="Chart of Accounts Not Initialized"
                        description={
                            <div>
                                <p style={{ marginBottom: '12px' }}>
                                    Your chart of accounts is empty. You need to initialize the default accounts
                                    before you can start managing your accounting records.
                                </p>
                                <Button
                                    type="primary"
                                    icon={<ReloadOutlined />}
                                    onClick={handleReseed}
                                    loading={isReseeding}
                                    size="large"
                                >
                                    {isReseeding ? 'Activating Chart of Accounts...' : 'Activate Chart of Accounts'}
                                </Button>
                            </div>
                        }
                        type="warning"
                        showIcon
                        closable={false}
                        style={{ marginBottom: '24px' }}
                    />
                )}

                {!isEmpty && (
                    <Space style={{ marginBottom: 16 }} wrap>
                        <Input
                            placeholder="Search accounts..."
                            prefix={<SearchOutlined />}
                            style={{ width: 250 }}
                        />
                        <Select placeholder="Account Type" style={{ width: 150 }} allowClear>
                            <Option value="Asset">Asset</Option>
                            <Option value="Liability">Liability</Option>
                            <Option value="Equity">Equity</Option>
                            <Option value="Revenue">Revenue</Option>
                            <Option value="Expense">Expense</Option>
                        </Select>
                        <Select placeholder="Status" style={{ width: 150 }} allowClear>
                            <Option value="active">Active</Option>
                            <Option value="inactive">Inactive</Option>
                        </Select>
                    </Space>
                )}

                <Table
                    columns={columns}
                    dataSource={accounts}
                    loading={isLoading}
                    rowKey="_id"
                    pagination={{
                        pageSize: 20,
                        showTotal: (total) => `Total ${total} accounts`,
                    }}
                    locale={{
                        emptyText: isEmpty ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}>
                                <Text type="secondary">
                                    Please activate the chart of accounts to get started
                                </Text>
                            </div>
                        ) : undefined
                    }}
                />

                <AccountForm
                    visible={isModalVisible}
                    onCancel={handleCancel}
                    editingAccount={editingAccount}
                />
            </Card>
        </div>
    );
};

export default ChartOfAccounts;