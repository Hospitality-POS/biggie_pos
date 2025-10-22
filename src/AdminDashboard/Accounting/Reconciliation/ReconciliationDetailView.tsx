import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Row, Col, Statistic, Checkbox, message, Spin, Alert, Modal } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getReconciliationById,
    completeReconciliation,
    reloadReconciliationItems,
    clearReconciliationItem,
    unclearReconciliationItem
} from '@services/accounting/reconciliation';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ReconciliationDetailView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: reconciliationData, isLoading } = useQuery({
        queryKey: ['reconciliation', id],
        queryFn: () => getReconciliationById(id!),
        enabled: !!id,
    });

    const reconciliation = reconciliationData?.data;

    const completeMutation = useMutation({
        mutationFn: completeReconciliation,
        onSuccess: () => {
            message.success('Reconciliation completed successfully');
            queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation', id] });
            navigate('/admin/accounting/reconciliation');
        },
        onError: (error: any) => {
            message.error(error?.response?.data?.message || 'Failed to complete reconciliation');
        }
    });

    const reloadMutation = useMutation({
        mutationFn: reloadReconciliationItems,
        onSuccess: (data) => {
            message.success(data.message || 'Transactions reloaded successfully');
            queryClient.invalidateQueries({ queryKey: ['reconciliation', id] });
        },
        onError: (error: any) => {
            message.error(error?.response?.data?.message || 'Failed to reload transactions');
        }
    });

    const clearItemMutation = useMutation({
        mutationFn: ({ reconciliationId, itemId }: { reconciliationId: string; itemId: string }) =>
            clearReconciliationItem(reconciliationId, itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reconciliation', id] });
        },
        onError: (error: any) => {
            message.error(error?.response?.data?.message || 'Failed to clear item');
        }
    });

    const unclearItemMutation = useMutation({
        mutationFn: ({ reconciliationId, itemId }: { reconciliationId: string; itemId: string }) =>
            unclearReconciliationItem(reconciliationId, itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reconciliation', id] });
        },
        onError: (error: any) => {
            message.error(error?.response?.data?.message || 'Failed to unclear item');
        }
    });

    // Show reload prompt if no items
    useEffect(() => {
        if (reconciliation && reconciliation.items.length === 0 && reconciliation.status === 'in-progress') {
            const timer = setTimeout(() => {
                Modal.confirm({
                    title: 'No Transactions Found',
                    content: 'This reconciliation has no transactions. Would you like to load transactions for the selected period?',
                    okText: 'Load Transactions',
                    cancelText: 'Cancel',
                    onOk: () => {
                        if (id) {
                            reloadMutation.mutate(id);
                        }
                    }
                });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [reconciliation?.items?.length, reconciliation?.status, id, reloadMutation]);

    const handleToggleClear = (item: any) => {
        if (!id || reconciliation?.status === 'completed') return;

        if (item.is_cleared) {
            unclearItemMutation.mutate({ reconciliationId: id, itemId: item._id });
        } else {
            clearItemMutation.mutate({ reconciliationId: id, itemId: item._id });
        }
    };

    const handleComplete = () => {
        if (reconciliation?.difference !== 0) {
            message.error('Cannot complete reconciliation with a difference. Please reconcile all items.');
            return;
        }
        if (reconciliation?.items.length === 0) {
            message.error('Cannot complete reconciliation without any transactions.');
            return;
        }
        if (id) {
            completeMutation.mutate(id);
        }
    };

    const handleReload = () => {
        Modal.confirm({
            title: 'Reload Transactions',
            content: 'This will reload all transactions for the selected period. Any cleared items will be reset. Continue?',
            okText: 'Yes, Reload',
            okType: 'primary',
            cancelText: 'Cancel',
            onOk: () => {
                if (id) {
                    reloadMutation.mutate(id);
                }
            }
        });
    };

    const columns = [
        {
            title: 'Cleared',
            key: 'cleared',
            width: 80,
            render: (_: any, record: any) => (
                <Checkbox
                    checked={record.is_cleared}
                    onChange={() => handleToggleClear(record)}
                    disabled={reconciliation?.status === 'completed'}
                    loading={clearItemMutation.isPending || unclearItemMutation.isPending}
                />
            ),
        },
        {
            title: 'Date',
            dataIndex: 'transaction_date',
            key: 'transaction_date',
            width: 120,
            render: (date: string) => dayjs(date).format('MMM D, YYYY'),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: 'Reference',
            dataIndex: 'reference',
            key: 'reference',
            width: 150,
        },
        {
            title: 'Debit',
            dataIndex: 'debit',
            key: 'debit',
            align: 'right' as const,
            width: 130,
            render: (amount: number) => amount > 0 ? (
                <Text strong style={{ color: '#f5222d' }}>
                    KES {amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
            ) : '-',
        },
        {
            title: 'Credit',
            dataIndex: 'credit',
            key: 'credit',
            align: 'right' as const,
            width: 130,
            render: (amount: number) => amount > 0 ? (
                <Text strong style={{ color: '#52c41a' }}>
                    KES {amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
            ) : '-',
        },
        {
            title: 'Status',
            key: 'status',
            width: 100,
            render: (_: any, record: any) => {
                return record.is_cleared ? (
                    <Tag color="green" icon={<CheckCircleOutlined />}>Cleared</Tag>
                ) : (
                    <Tag color="orange" icon={<CloseCircleOutlined />}>Uncleared</Tag>
                );
            },
        },
    ];

    if (isLoading) {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                <Spin size="large" tip="Loading reconciliation..." />
            </div>
        );
    }

    if (!reconciliation) {
        return (
            <div style={{ padding: '24px' }}>
                <Alert
                    message="Reconciliation not found"
                    type="error"
                    action={
                        <Button onClick={() => navigate('/admin/accounting/reconciliation')}>
                            Back to Reconciliations
                        </Button>
                    }
                />
            </div>
        );
    }

    const isBalanced = Math.abs(reconciliation.difference) < 0.01;

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                            <Button
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate('/admin/accounting/reconciliation')}
                            >
                                Back
                            </Button>
                            <div>
                                <Title level={3} style={{ margin: 0 }}>
                                    {reconciliation.reconciliation_number}
                                </Title>
                                <Text type="secondary">
                                    {reconciliation.account_name} - {dayjs(reconciliation.start_date).format('MMM D, YYYY')} to {dayjs(reconciliation.end_date).format('MMM D, YYYY')}
                                </Text>
                            </div>
                        </Space>
                        <Space>
                            {reconciliation.status === 'in-progress' && (
                                <>
                                    <Button
                                        icon={<ReloadOutlined />}
                                        size="large"
                                        onClick={handleReload}
                                        loading={reloadMutation.isPending}
                                    >
                                        Reload Transactions
                                    </Button>
                                    <Button
                                        type="primary"
                                        size="large"
                                        onClick={handleComplete}
                                        loading={completeMutation.isPending}
                                        disabled={!isBalanced || reconciliation.items.length === 0}
                                    >
                                        Complete Reconciliation
                                    </Button>
                                </>
                            )}
                            {reconciliation.status === 'completed' && (
                                <Tag color="green" style={{ fontSize: 16, padding: '8px 16px' }}>
                                    <CheckCircleOutlined /> Completed
                                </Tag>
                            )}
                        </Space>
                    </div>

                    {/* No Items Alert */}
                    {reconciliation.items.length === 0 && reconciliation.status === 'in-progress' && (
                        <Alert
                            message="No Transactions"
                            description="No transactions were found for this reconciliation period. Click 'Reload Transactions' to load them now."
                            type="warning"
                            showIcon
                            action={
                                <Button
                                    type="primary"
                                    onClick={handleReload}
                                    loading={reloadMutation.isPending}
                                >
                                    Load Now
                                </Button>
                            }
                        />
                    )}

                    {/* Summary Statistics */}
                    <Row gutter={16}>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Opening Balance"
                                    value={reconciliation.opening_balance}
                                    prefix="KES"
                                    precision={2}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Statement Balance"
                                    value={reconciliation.statement_balance}
                                    prefix="KES"
                                    precision={2}
                                    valueStyle={{ color: '#1890ff' }}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Book Balance"
                                    value={reconciliation.book_balance}
                                    prefix="KES"
                                    precision={2}
                                    valueStyle={{ color: '#52c41a' }}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Difference"
                                    value={reconciliation.difference}
                                    prefix="KES"
                                    precision={2}
                                    valueStyle={{ color: isBalanced ? '#52c41a' : '#f5222d' }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    {/* Alert */}
                    {reconciliation.items.length > 0 && !isBalanced && (
                        <Alert
                            message="Reconciliation Incomplete"
                            description={`There is a difference of KES ${Math.abs(reconciliation.difference)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Please clear or unclear transactions to match your bank statement.`}
                            type="warning"
                            showIcon
                        />
                    )}

                    {reconciliation.items.length > 0 && isBalanced && reconciliation.status === 'in-progress' && (
                        <Alert
                            message="Ready to Complete"
                            description="All transactions are reconciled! You can now complete this reconciliation."
                            type="success"
                            showIcon
                        />
                    )}

                    {/* Cleared/Uncleared Summary */}
                    {reconciliation.items.length > 0 && (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Card title="Cleared Transactions" size="small">
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text>Count:</Text>
                                            <Text strong>{reconciliation.cleared_items_count}</Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text>Debits:</Text>
                                            <Text strong style={{ color: '#f5222d' }}>
                                                KES {(reconciliation.cleared_debits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text>Credits:</Text>
                                            <Text strong style={{ color: '#52c41a' }}>
                                                KES {(reconciliation.cleared_credits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </Text>
                                        </div>
                                    </Space>
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card title="Uncleared Transactions" size="small">
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text>Count:</Text>
                                            <Text strong>{reconciliation.uncleared_items_count}</Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text>Debits:</Text>
                                            <Text strong style={{ color: '#f5222d' }}>
                                                KES {(reconciliation.uncleared_debits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text>Credits:</Text>
                                            <Text strong style={{ color: '#52c41a' }}>
                                                KES {(reconciliation.uncleared_credits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </Text>
                                        </div>
                                    </Space>
                                </Card>
                            </Col>
                        </Row>
                    )}

                    {/* Transactions Table */}
                    {reconciliation.items.length > 0 && (
                        <Card title={`Transactions (${reconciliation.items.length})`} size="small">
                            <Table
                                columns={columns}
                                dataSource={reconciliation.items || []}
                                rowKey="_id"
                                pagination={{
                                    pageSize: 20,
                                    showTotal: (total) => `Total ${total} transactions`,
                                    showSizeChanger: true,
                                    pageSizeOptions: ['10', '20', '50', '100']
                                }}
                                size="small"
                                scroll={{ x: 1000 }}
                                loading={clearItemMutation.isPending || unclearItemMutation.isPending}
                            />
                        </Card>
                    )}
                </Space>
            </Card>
        </div>
    );
};

export default ReconciliationDetailView;