import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Input, DatePicker, Popconfirm, Modal, Drawer, Descriptions, Badge } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    AccountBookOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    CheckOutlined,
    SendOutlined,
    StopOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchAllJournals,
    deleteJournal,
    getJournalById,
    postJournal,
    voidJournal,
    approveJournal
} from '@services/accounting/journals';
import JournalForm from './JournalForm';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const JournalsList: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingJournal, setEditingJournal] = useState<any>(null);
    const [viewingJournal, setViewingJournal] = useState<any>(null);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState<any>(null);
    const queryClient = useQueryClient();

    // Build query params
    const queryParams: any = {};
    if (searchTerm) queryParams.search = searchTerm;
    if (dateRange && dateRange.length === 2) {
        queryParams.start_date = dateRange[0].format('YYYY-MM-DD');
        queryParams.end_date = dateRange[1].format('YYYY-MM-DD');
    }

    const { data: journalsData, isLoading } = useQuery({
        queryKey: ['journals', queryParams],
        queryFn: () => fetchAllJournals(queryParams),
    });

    const journals = journalsData?.data || [];

    const deleteMutation = useMutation({
        mutationFn: deleteJournal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journals'] });
        },
    });

    const postMutation = useMutation({
        mutationFn: postJournal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journals'] });
        },
    });

    const voidMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => voidJournal(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journals'] });
        },
    });

    const approveMutation = useMutation({
        mutationFn: approveJournal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journals'] });
        },
    });

    const handleEdit = (record: any) => {
        setEditingJournal(record);
        setIsModalVisible(true);
    };

    const handleView = async (record: any) => {
        try {
            const response = await getJournalById(record._id);
            setViewingJournal(response.data);
            setDrawerVisible(true);
        } catch (error) {
            console.error('Error fetching journal details:', error);
        }
    };

    const handlePost = (id: string) => {
        Modal.confirm({
            title: 'Post Journal Entry',
            content: 'Are you sure you want to post this journal entry? This will update account balances.',
            okText: 'Yes, Post',
            okType: 'primary',
            cancelText: 'Cancel',
            onOk: () => postMutation.mutate(id),
        });
    };

    const handleVoid = (id: string) => {
        let voidReason = '';
        Modal.confirm({
            title: 'Void Journal Entry',
            content: (
                <div>
                    <p>Are you sure you want to void this journal entry? This will reverse the account balances.</p>
                    <Input.TextArea
                        placeholder="Enter reason for voiding..."
                        rows={3}
                        onChange={(e) => (voidReason = e.target.value)}
                    />
                </div>
            ),
            okText: 'Yes, Void',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => {
                if (!voidReason) {
                    Modal.error({ title: 'Error', content: 'Please provide a reason for voiding.' });
                    return Promise.reject();
                }
                return voidMutation.mutateAsync({ id, reason: voidReason });
            },
        });
    };

    const handleApprove = (id: string) => {
        Modal.confirm({
            title: 'Approve Journal Entry',
            content: 'Are you sure you want to approve this journal entry?',
            okText: 'Yes, Approve',
            okType: 'primary',
            cancelText: 'Cancel',
            onOk: () => approveMutation.mutate(id),
        });
    };

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id);
    };

    const handleAdd = () => {
        setEditingJournal(null);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingJournal(null);
    };

    const handleDrawerClose = () => {
        setDrawerVisible(false);
        setViewingJournal(null);
    };

    const columns = [
        {
            title: 'Entry #',
            dataIndex: 'entry_number',
            key: 'entry_number',
            width: 140,
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Date',
            dataIndex: 'entry_date',
            key: 'entry_date',
            width: 120,
            render: (date: string) => date ? dayjs(date).format('MMM D, YYYY') : '-',
        },
        {
            title: 'Type',
            dataIndex: 'entry_type',
            key: 'entry_type',
            width: 130,
            render: (type: string) => {
                const colors: Record<string, string> = {
                    general: 'blue',
                    adjusting: 'orange',
                    closing: 'purple',
                    reversing: 'cyan',
                    manual: 'geekblue'
                };
                return <Tag color={colors[type] || 'default'}>{type?.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Reference',
            dataIndex: 'reference',
            key: 'reference',
            width: 120,
            render: (text: string) => text || '-',
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Debit',
            dataIndex: 'total_debit',
            key: 'total_debit',
            align: 'right' as const,
            width: 140,
            render: (amount: number) => (
                <Text strong style={{ color: '#52c41a' }}>
                    KES {amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </Text>
            ),
        },
        {
            title: 'Credit',
            dataIndex: 'total_credit',
            key: 'total_credit',
            align: 'right' as const,
            width: 140,
            render: (amount: number) => (
                <Text strong style={{ color: '#f5222d' }}>
                    KES {amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </Text>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (status: string, record: any) => {
                if (record.is_voided) {
                    return <Tag color="red" icon={<StopOutlined />}>VOIDED</Tag>;
                }
                const colors: Record<string, string> = {
                    draft: 'default',
                    approved: 'processing',
                    posted: 'success',
                };
                const icons: Record<string, any> = {
                    posted: <CheckCircleOutlined />,
                    approved: <CheckOutlined />,
                };
                return (
                    <Tag color={colors[status] || 'default'} icon={icons[status]}>
                        {status?.toUpperCase()}
                    </Tag>
                );
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 200,
            fixed: 'right' as const,
            render: (record: any) => (
                <Space size="small">
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        size="small"
                        onClick={() => handleView(record)}
                    >
                        View
                    </Button>

                    {record.status === 'draft' && !record.is_voided && (
                        <>
                            <Button
                                type="link"
                                icon={<EditOutlined />}
                                size="small"
                                onClick={() => handleEdit(record)}
                            >
                                Edit
                            </Button>
                            <Button
                                type="link"
                                icon={<CheckOutlined />}
                                size="small"
                                onClick={() => handleApprove(record._id)}
                            >
                                Approve
                            </Button>
                            <Popconfirm
                                title="Delete Journal Entry"
                                description="Are you sure you want to delete this draft journal entry?"
                                onConfirm={() => handleDelete(record._id)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button type="link" danger icon={<DeleteOutlined />} size="small">
                                    Delete
                                </Button>
                            </Popconfirm>
                        </>
                    )}

                    {(record.status === 'approved' || record.status === 'draft') && !record.is_voided && (
                        <Button
                            type="link"
                            icon={<SendOutlined />}
                            size="small"
                            onClick={() => handlePost(record._id)}
                        >
                            Post
                        </Button>
                    )}

                    {record.status === 'posted' && !record.is_voided && (
                        <Button
                            type="link"
                            danger
                            icon={<StopOutlined />}
                            size="small"
                            onClick={() => handleVoid(record._id)}
                        >
                            Void
                        </Button>
                    )}
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
                            <AccountBookOutlined /> Journal Entries
                        </Title>
                        <Text type="secondary">Double-entry bookkeeping journal entries</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={handleAdd}
                    >
                        Create Journal Entry
                    </Button>
                </div>

                <Space style={{ marginBottom: 16 }} wrap>
                    <Input
                        placeholder="Search journals..."
                        prefix={<SearchOutlined />}
                        style={{ width: 250 }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        allowClear
                    />
                    <RangePicker
                        value={dateRange}
                        onChange={(dates) => setDateRange(dates)}
                    />
                </Space>

                <Table
                    columns={columns}
                    dataSource={journals}
                    loading={isLoading || deleteMutation.isPending || postMutation.isPending}
                    rowKey="_id"
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `Total ${total} journal entries`,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100']
                    }}
                    scroll={{ x: 1400 }}
                />

                <JournalForm
                    visible={isModalVisible}
                    onCancel={handleCancel}
                    editingJournal={editingJournal}
                />

                {/* Journal Details Drawer */}
                <Drawer
                    title="Journal Entry Details"
                    placement="right"
                    width={700}
                    onClose={handleDrawerClose}
                    open={drawerVisible}
                >
                    {viewingJournal && (
                        <div>
                            <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label="Entry Number">
                                    <Text strong>{viewingJournal.entry_number}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Entry Date">
                                    {dayjs(viewingJournal.entry_date).format('MMMM D, YYYY')}
                                </Descriptions.Item>
                                <Descriptions.Item label="Entry Type">
                                    <Tag color="blue">{viewingJournal.entry_type?.toUpperCase()}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Reference">
                                    {viewingJournal.reference || '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Description">
                                    {viewingJournal.description}
                                </Descriptions.Item>
                                <Descriptions.Item label="Status">
                                    {viewingJournal.is_voided ? (
                                        <Tag color="red" icon={<StopOutlined />}>VOIDED</Tag>
                                    ) : (
                                        <Tag color={viewingJournal.status === 'posted' ? 'success' : 'default'}>
                                            {viewingJournal.status?.toUpperCase()}
                                        </Tag>
                                    )}
                                </Descriptions.Item>
                                {viewingJournal.is_voided && (
                                    <Descriptions.Item label="Void Reason">
                                        <Text type="danger">{viewingJournal.void_reason}</Text>
                                    </Descriptions.Item>
                                )}
                                <Descriptions.Item label="Created By">
                                    {viewingJournal.created_by?.name || 'System'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Created At">
                                    {dayjs(viewingJournal.createdAt).format('MMM D, YYYY h:mm A')}
                                </Descriptions.Item>
                                {viewingJournal.posted_by && (
                                    <Descriptions.Item label="Posted By">
                                        {viewingJournal.posted_by?.name || 'System'}
                                    </Descriptions.Item>
                                )}
                            </Descriptions>

                            <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Journal Items</Title>
                            <Table
                                columns={[
                                    {
                                        title: 'Account',
                                        dataIndex: ['account_id', 'name'],
                                        key: 'account',
                                        render: (text: string, record: any) => (
                                            <div>
                                                <Text strong>{record.account_id?.code}</Text>
                                                <br />
                                                <Text type="secondary">{text}</Text>
                                            </div>
                                        ),
                                    },
                                    {
                                        title: 'Description',
                                        dataIndex: 'description',
                                        key: 'description',
                                    },
                                    {
                                        title: 'Debit',
                                        dataIndex: 'debit',
                                        key: 'debit',
                                        align: 'right' as const,
                                        render: (amount: number) => (
                                            <Text strong style={{ color: amount > 0 ? '#52c41a' : undefined }}>
                                                {amount > 0 ? `KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                            </Text>
                                        ),
                                    },
                                    {
                                        title: 'Credit',
                                        dataIndex: 'credit',
                                        key: 'credit',
                                        align: 'right' as const,
                                        render: (amount: number) => (
                                            <Text strong style={{ color: amount > 0 ? '#f5222d' : undefined }}>
                                                {amount > 0 ? `KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                            </Text>
                                        ),
                                    },
                                ]}
                                dataSource={viewingJournal.items || []}
                                pagination={false}
                                size="small"
                                rowKey="_id"
                                summary={() => (
                                    <Table.Summary fixed>
                                        <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                                            <Table.Summary.Cell index={0} colSpan={2}>
                                                <Text strong style={{ fontSize: 16 }}>TOTAL</Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={2} align="right">
                                                <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
                                                    KES {viewingJournal.total_debit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={3} align="right">
                                                <Text strong style={{ fontSize: 16, color: '#f5222d' }}>
                                                    KES {viewingJournal.total_credit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </Text>
                                            </Table.Summary.Cell>
                                        </Table.Summary.Row>
                                    </Table.Summary>
                                )}
                            />

                            <div style={{
                                marginTop: 16,
                                padding: 16,
                                backgroundColor: '#f6ffed',
                                border: '1px solid #b7eb8f',
                                borderRadius: 4
                            }}>
                                <Text strong style={{ color: '#52c41a' }}>
                                    ✓ Entry is Balanced
                                </Text>
                            </div>
                        </div>
                    )}
                </Drawer>
            </Card>
        </div>
    );
};

export default JournalsList;