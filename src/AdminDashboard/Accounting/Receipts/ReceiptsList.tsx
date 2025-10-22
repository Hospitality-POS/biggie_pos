import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Input, DatePicker, Drawer, Descriptions, Divider, message, Modal } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    CreditCardOutlined,
    EyeOutlined,
    PrinterOutlined,
    DownloadOutlined,
    StopOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllReceipts, voidReceipt, printReceipt } from '@services/accounting/receipts';
import ReceiptForm from './ReceiptForm';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const ReceiptsList: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState<any>(null);
    const [viewingReceipt, setViewingReceipt] = useState<any>(null);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState<any>(null);
    const queryClient = useQueryClient();

    // Build query params
    const queryParams: any = {};
    if (searchTerm) queryParams.receipt_number = searchTerm;
    if (dateRange && dateRange.length === 2) {
        queryParams.start_date = dateRange[0].format('YYYY-MM-DD');
        queryParams.end_date = dateRange[1].format('YYYY-MM-DD');
    }

    const { data: receiptsData, isLoading } = useQuery({
        queryKey: ['receipts', queryParams],
        queryFn: () => fetchAllReceipts(queryParams),
    });

    const receipts = receiptsData?.data || [];

    const voidMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => voidReceipt(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receipts'] });
            message.success('Receipt voided successfully');
        },
    });

    const handleView = (record: any) => {
        setViewingReceipt(record);
        setDrawerVisible(true);
    };

    const handleEdit = (record: any) => {
        setEditingReceipt(record);
        setIsModalVisible(true);
    };

    const handleAdd = () => {
        setEditingReceipt(null);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingReceipt(null);
    };

    const handleDrawerClose = () => {
        setDrawerVisible(false);
        setViewingReceipt(null);
    };

    const handleVoid = (record: any) => {
        let voidReason = '';
        Modal.confirm({
            title: 'Void Receipt',
            content: (
                <div>
                    <p>Are you sure you want to void this receipt?</p>
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
                    message.error('Please provide a reason for voiding.');
                    return Promise.reject();
                }
                return voidMutation.mutateAsync({ id: record._id, reason: voidReason });
            },
        });
    };

    const handlePrint = async (record: any) => {
        try {
            const response = await printReceipt(record._id);
            // Open print dialog or download PDF
            window.print();
            message.success('Receipt ready for printing');
        } catch (error) {
            message.error('Failed to print receipt');
        }
    };

    const columns = [
        {
            title: 'Receipt #',
            dataIndex: 'receipt_number',
            key: 'receipt_number',
            width: 150,
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Payment Ref',
            dataIndex: ['payment_reference', 'payment_number'],
            key: 'payment_reference',
            width: 150,
            render: (text: string) => text || '-',
        },
        {
            title: 'Customer',
            dataIndex: ['customer_id', 'name'],
            key: 'customer',
            render: (text: string, record: any) => {
                const customerName = text || record.customer_name;
                const email = record.customer_id?.email;
                return (
                    <div>
                        <Text strong>{customerName}</Text>
                        {email && (
                            <>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>{email}</Text>
                            </>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'Date',
            dataIndex: 'receipt_date',
            key: 'receipt_date',
            width: 120,
            render: (date: string) => dayjs(date).format('MMM D, YYYY'),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right' as const,
            width: 130,
            render: (amount: number, record: any) => (
                <Text strong style={{ color: '#52c41a' }}>
                    {record.currency || 'KES'} {amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                </Text>
            ),
        },
        {
            title: 'Payment Method',
            dataIndex: 'payment_method',
            key: 'payment_method',
            width: 130,
            render: (method: string) => {
                const methodMap: Record<string, string> = {
                    cash: 'Cash',
                    bank_transfer: 'Bank Transfer',
                    credit_card: 'Credit Card',
                    debit_card: 'Debit Card',
                    cheque: 'Cheque',
                    mpesa: 'M-Pesa',
                    other: 'Other',
                };
                return <Text>{methodMap[method] || method}</Text>;
            },
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => {
                const colors: Record<string, string> = {
                    issued: 'green',
                    void: 'red',
                };
                return <Tag color={colors[status]}>{status?.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 180,
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
                    <Button
                        type="link"
                        icon={<PrinterOutlined />}
                        size="small"
                        onClick={() => handlePrint(record)}
                    >
                        Print
                    </Button>
                    {record.status !== 'void' && (
                        <Button
                            type="link"
                            danger
                            icon={<StopOutlined />}
                            size="small"
                            onClick={() => handleVoid(record)}
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
                            <CreditCardOutlined /> Receipts
                        </Title>
                        <Text type="secondary">Manage payment receipts</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={handleAdd}
                    >
                        Create Receipt
                    </Button>
                </div>

                <Space style={{ marginBottom: 16 }} wrap>
                    <Input
                        placeholder="Search by receipt number..."
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
                    dataSource={receipts}
                    loading={isLoading || voidMutation.isPending}
                    rowKey="_id"
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `Total ${total} receipts`,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100']
                    }}
                    scroll={{ x: 1200 }}
                />

                <ReceiptForm
                    visible={isModalVisible}
                    onCancel={handleCancel}
                    editingReceipt={editingReceipt}
                />

                {/* Receipt Preview Drawer */}
                <Drawer
                    title="Receipt Details"
                    placement="right"
                    width={700}
                    onClose={handleDrawerClose}
                    open={drawerVisible}
                >
                    {viewingReceipt && (
                        <div>
                            {/* Receipt Header */}
                            <div style={{
                                textAlign: 'center',
                                padding: '24px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                borderRadius: '8px',
                                marginBottom: '24px'
                            }}>
                                <CreditCardOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                                <Title level={2} style={{ color: 'white', margin: 0 }}>
                                    RECEIPT
                                </Title>
                                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18 }}>
                                    {viewingReceipt.receipt_number}
                                </Text>
                            </div>

                            {/* Status Badge */}
                            {viewingReceipt.status === 'void' && (
                                <div style={{
                                    padding: '12px',
                                    background: '#fff1f0',
                                    border: '1px solid #ffa39e',
                                    borderRadius: '4px',
                                    marginBottom: '24px'
                                }}>
                                    <Tag color="red" style={{ fontSize: 14 }}>VOIDED</Tag>
                                    {viewingReceipt.void_reason && (
                                        <Text type="danger">Reason: {viewingReceipt.void_reason}</Text>
                                    )}
                                </div>
                            )}

                            {/* Receipt Details */}
                            <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label="Receipt Number">
                                    <Text strong style={{ fontSize: 16 }}>{viewingReceipt.receipt_number}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Receipt Date">
                                    {dayjs(viewingReceipt.receipt_date).format('MMMM D, YYYY')}
                                </Descriptions.Item>
                                <Descriptions.Item label="Customer">
                                    <div>
                                        <Text strong>{viewingReceipt.customer_id?.name || viewingReceipt.customer_name}</Text>
                                        {viewingReceipt.customer_id?.email && (
                                            <>
                                                <br />
                                                <Text type="secondary">{viewingReceipt.customer_id.email}</Text>
                                            </>
                                        )}
                                        {viewingReceipt.customer_id?.phone && (
                                            <>
                                                <br />
                                                <Text type="secondary">{viewingReceipt.customer_id.phone}</Text>
                                            </>
                                        )}
                                    </div>
                                </Descriptions.Item>
                                <Descriptions.Item label="Payment Reference">
                                    <Text code>{viewingReceipt.payment_reference?.payment_number || '-'}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Payment Method">
                                    <Tag color="blue">
                                        {viewingReceipt.payment_method?.replace('_', ' ').toUpperCase()}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Amount">
                                    <Text strong style={{ fontSize: 20, color: '#52c41a' }}>
                                        {viewingReceipt.currency || 'KES'} {viewingReceipt.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </Text>
                                </Descriptions.Item>
                                {viewingReceipt.notes && (
                                    <Descriptions.Item label="Notes">
                                        {viewingReceipt.notes}
                                    </Descriptions.Item>
                                )}
                                {viewingReceipt.payment_details && Object.keys(viewingReceipt.payment_details).length > 0 && (
                                    <Descriptions.Item label="Payment Details">
                                        {Object.entries(viewingReceipt.payment_details).map(([key, value]) => (
                                            <div key={key}>
                                                <Text strong>{key.replace('_', ' ').toUpperCase()}:</Text> {value as string}
                                            </div>
                                        ))}
                                    </Descriptions.Item>
                                )}
                                <Descriptions.Item label="Status">
                                    <Tag color={viewingReceipt.status === 'issued' ? 'green' : 'red'}>
                                        {viewingReceipt.status?.toUpperCase()}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Created At">
                                    {dayjs(viewingReceipt.createdAt).format('MMM D, YYYY h:mm A')}
                                </Descriptions.Item>
                            </Descriptions>

                            <Divider />

                            {/* Action Buttons */}
                            <Space style={{ width: '100%', justifyContent: 'center' }}>
                                <Button
                                    type="primary"
                                    icon={<PrinterOutlined />}
                                    size="large"
                                    onClick={() => handlePrint(viewingReceipt)}
                                >
                                    Print Receipt
                                </Button>
                                <Button
                                    icon={<DownloadOutlined />}
                                    size="large"
                                >
                                    Download PDF
                                </Button>
                            </Space>

                            {/* Footer */}
                            <div style={{
                                marginTop: '32px',
                                textAlign: 'center',
                                padding: '16px',
                                background: '#f5f5f5',
                                borderRadius: '4px'
                            }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    This is a computer-generated receipt and does not require a signature.
                                </Text>
                            </div>
                        </div>
                    )}
                </Drawer>
            </Card>
        </div>
    );
};

export default ReceiptsList;