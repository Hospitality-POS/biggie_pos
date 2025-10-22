import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Input, Avatar, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, TeamOutlined, EyeOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllCustomers, deleteCustomer } from '@services/accounting/customers';
import CustomerForm from './CustomerForm';

const { Title, Text } = Typography;

const CustomersList: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any>(null);
    const queryClient = useQueryClient();

    const { data: customersData, isLoading } = useQuery({
        queryKey: ['accountingCustomers'],
        queryFn: () => fetchAllCustomers({}),
    });

    const customers = customersData?.data || [];

    const deleteMutation = useMutation({
        mutationFn: deleteCustomer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accountingCustomers'] });
        },
    });

    const handleEdit = (record: any) => {
        setEditingCustomer(record);
        setIsModalVisible(true);
    };

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id);
    };

    const handleAdd = () => {
        setEditingCustomer(null);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingCustomer(null);
    };

    const columns = [
        {
            title: 'Customer',
            key: 'customer',
            render: (record: any) => (
                <Space>
                    <Avatar icon={<UserOutlined />} src={record.avatar} />
                    <div>
                        <Text strong>{record.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Company',
            dataIndex: 'company',
            key: 'company',
        },
        {
            title: 'Total Invoices',
            dataIndex: 'total_invoices',
            key: 'total_invoices',
            align: 'center' as const,
            render: (count: number) => <Tag color="blue">{count || 0}</Tag>,
        },
        {
            title: 'Outstanding',
            dataIndex: 'outstanding_balance',
            key: 'outstanding_balance',
            align: 'right' as const,
            render: (amount: number) => (
                <Text strong style={{ color: amount > 0 ? '#f5222d' : '#52c41a' }}>
                    KES {amount?.toLocaleString() || '0.00'}
                </Text>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const colors: Record<string, string> = {
                    active: 'green',
                    inactive: 'default',
                    blocked: 'red'
                };
                return <Tag color={colors[status]}>{status?.toUpperCase()}</Tag>;
            },
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
                        title="Delete Customer"
                        description="Are you sure you want to delete this customer?"
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
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            <TeamOutlined /> Customers
                        </Title>
                        <Text type="secondary">Manage accounting customers</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={handleAdd}
                    >
                        Add Customer
                    </Button>
                </div>

                <Space style={{ marginBottom: 16 }} wrap>
                    <Input placeholder="Search customers..." prefix={<SearchOutlined />} style={{ width: 300 }} />
                </Space>

                <Table
                    columns={columns}
                    dataSource={customers}
                    loading={isLoading}
                    rowKey="_id"
                    pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} customers` }}
                />

                <CustomerForm
                    visible={isModalVisible}
                    onCancel={handleCancel}
                    editingCustomer={editingCustomer}
                />
            </Card>
        </div>
    );
};

export default CustomersList;