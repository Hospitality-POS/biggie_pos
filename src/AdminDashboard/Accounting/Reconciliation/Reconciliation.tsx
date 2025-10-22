import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Input, Select, Row, Col, Statistic, Alert } from 'antd';
import { PlusOutlined, SearchOutlined, ReconciliationOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { fetchAllReconciliations } from '@services/accounting/reconciliation';
import { useNavigate } from 'react-router-dom';
import ReconciliationForm from './ReconciliationForm';

const { Title, Text } = Typography;
const { Option } = Select;

const Reconciliation: React.FC = () => {
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingReconciliation, setEditingReconciliation] = useState<any>(null);
    const navigate = useNavigate();

    const { data: reconciliationsData, isLoading } = useQuery({
        queryKey: ['reconciliations', selectedAccount],
        queryFn: () => fetchAllReconciliations({ account_id: selectedAccount }),
    });

    const reconciliations = reconciliationsData?.data || [];

    const handleAdd = () => {
        setEditingReconciliation(null);
        setIsModalVisible(true);
    };

    const handleEdit = (record: any) => {
        setEditingReconciliation(record);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingReconciliation(null);
    };

    const columns = [
        {
            title: 'Reconciliation #',
            dataIndex: 'reconciliation_number',
            key: 'reconciliation_number',
            width: 150,
        },
        {
            title: 'Bank Account',
            dataIndex: 'account_name',
            key: 'account_name',
        },
        {
            title: 'Period',
            key: 'period',
            render: (record: any) => (
                <Text>{new Date(record.start_date).toLocaleDateString()} - {new Date(record.end_date).toLocaleDateString()}</Text>
            ),
        },
        {
            title: 'Statement Balance',
            dataIndex: 'statement_balance',
            key: 'statement_balance',
            align: 'right' as const,
            render: (amount: number) => <Text strong>KES {amount?.toLocaleString() || '0.00'}</Text>,
        },
        {
            title: 'Book Balance',
            dataIndex: 'book_balance',
            key: 'book_balance',
            align: 'right' as const,
            render: (amount: number) => <Text>KES {amount?.toLocaleString() || '0.00'}</Text>,
        },
        {
            title: 'Difference',
            dataIndex: 'difference',
            key: 'difference',
            align: 'right' as const,
            render: (amount: number) => (
                <Text strong style={{ color: amount === 0 ? '#52c41a' : '#f5222d' }}>
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
                    'in-progress': 'orange',
                    completed: 'green',
                    'not-reconciled': 'red'
                };
                const icons: Record<string, any> = {
                    'in-progress': <SyncOutlined spin />,
                    completed: <CheckCircleOutlined />,
                    'not-reconciled': <CloseCircleOutlined />
                };
                return <Tag color={colors[status]} icon={icons[status]}>
                    {status?.toUpperCase().replace('-', ' ')}
                </Tag>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (record: any) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        onClick={() => navigate(`/admin/accounting/reconciliation/${record._id}`)}
                    >
                        View
                    </Button>
                    {record.status === 'in-progress' && (
                        <Button
                            type="link"
                            size="small"
                            onClick={() => navigate(`/admin/accounting/reconciliation/${record._id}`)}
                        >
                            Continue
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
                            <ReconciliationOutlined /> Bank Reconciliation
                        </Title>
                        <Text type="secondary">Reconcile bank accounts with statements</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={handleAdd}
                    >
                        Start Reconciliation
                    </Button>
                </div>

                <Alert
                    message="Bank Reconciliation"
                    description="Match your bank statement transactions with your accounting records to ensure accuracy."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Reconciled This Month"
                                value={reconciliations.filter((r: any) => r.status === 'completed').length}
                                suffix="accounts"
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="In Progress"
                                value={reconciliations.filter((r: any) => r.status === 'in-progress').length}
                                suffix="accounts"
                                valueStyle={{ color: '#faad14' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Pending"
                                value={reconciliations.filter((r: any) => r.status === 'not-reconciled').length}
                                suffix="accounts"
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Total Difference"
                                value={reconciliations.reduce((sum: number, r: any) => sum + (r.difference || 0), 0)}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#f5222d' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Space style={{ marginBottom: 16 }} wrap>
                    <Input placeholder="Search reconciliations..." prefix={<SearchOutlined />} style={{ width: 250 }} />
                    <Select
                        placeholder="Select Bank Account"
                        style={{ width: 200 }}
                        allowClear
                        onChange={(value) => setSelectedAccount(value)}
                    >
                        <Option value="cash">Cash Account</Option>
                        <Option value="bank1">Bank Account 1</Option>
                        <Option value="bank2">Bank Account 2</Option>
                    </Select>
                    <Select placeholder="Status" style={{ width: 150 }} allowClear>
                        <Option value="in-progress">In Progress</Option>
                        <Option value="completed">Completed</Option>
                        <Option value="not-reconciled">Not Reconciled</Option>
                    </Select>
                </Space>

                <Table
                    columns={columns}
                    dataSource={reconciliations}
                    loading={isLoading}
                    rowKey="_id"
                    pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} reconciliations` }}
                />

                <ReconciliationForm
                    visible={isModalVisible}
                    onCancel={handleCancel}
                    editingReconciliation={editingReconciliation}
                />
            </Card>
        </div>
    );
};

export default Reconciliation;