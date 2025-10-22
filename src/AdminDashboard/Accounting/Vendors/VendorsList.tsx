import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Input, Avatar, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, ShoppingCartOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ShopOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllVendors, deleteVendor } from '@services/accounting/vendors';
import VendorForm from './VendorForm';

const { Title, Text } = Typography;

const VendorsList: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingVendor, setEditingVendor] = useState<any>(null);
    const queryClient = useQueryClient();

    const { data: vendorsData, isLoading } = useQuery({
        queryKey: ['vendors'],
        queryFn: () => fetchAllVendors({}),
    });

    const vendors = vendorsData?.data || [];

    const deleteMutation = useMutation({
        mutationFn: deleteVendor,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
        },
    });

    const handleEdit = (record: any) => {
        setEditingVendor(record);
        setIsModalVisible(true);
    };

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id);
    };

    const handleAdd = () => {
        setEditingVendor(null);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingVendor(null);
    };

    const columns = [
        {
            title: 'Vendor',
            key: 'vendor',
            render: (record: any) => (
                <Space>
                    <Avatar icon={<ShopOutlined />} src={record.avatar} style={{ backgroundColor: '#f5222d' }} />
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
            title: 'Total Bills',
            dataIndex: 'total_bills',
            key: 'total_bills',
            align: 'center' as const,
            render: (count: number) => <Tag color="red">{count || 0}</Tag>,
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
                        title="Delete Vendor"
                        description="Are you sure you want to delete this vendor?"
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
                            <ShoppingCartOutlined /> Vendors
                        </Title>
                        <Text type="secondary">Manage suppliers and vendors</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={handleAdd}
                    >
                        Add Vendor
                    </Button>
                </div>

                <Space style={{ marginBottom: 16 }} wrap>
                    <Input placeholder="Search vendors..." prefix={<SearchOutlined />} style={{ width: 300 }} />
                </Space>

                <Table
                    columns={columns}
                    dataSource={vendors}
                    loading={isLoading}
                    rowKey="_id"
                    pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} vendors` }}
                />

                <VendorForm
                    visible={isModalVisible}
                    onCancel={handleCancel}
                    editingVendor={editingVendor}
                />
            </Card>
        </div>
    );
};

export default VendorsList;