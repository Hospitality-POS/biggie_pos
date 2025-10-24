import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Input, DatePicker, Select, Modal, message, Drawer, Form } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    FileTextOutlined,
    EyeOutlined,
    EditOutlined,
    PrinterOutlined,
    SendOutlined,
    CheckCircleOutlined,
    FileAddOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchAllInvoices,
    getInvoiceById,
    sendInvoice,
    markInvoiceAsPaid,
    postInvoice
} from '@services/accounting/invoices';
import { fetchAllAccounts } from '@services/accounting/accounts';
import InvoiceForm from './InvoiceForm';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { confirm } = Modal;

const InvoicesList: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<any>(null);
    const [viewDrawerVisible, setViewDrawerVisible] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [postModalVisible, setPostModalVisible] = useState(false);
    const [invoiceToPost, setInvoiceToPost] = useState<any>(null);
    const [postForm] = Form.useForm();
    const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        search: '',
        dateRange: null,
        status: undefined
    });

    const queryClient = useQueryClient();

    const { data: invoicesData, isLoading } = useQuery({
        queryKey: ['invoices', filters],
        queryFn: () => fetchAllInvoices({
            status: filters.status,
            search: filters.search
        }),
    });

    // Fetch accounts for post modal
    const { data: accountsData } = useQuery({
        queryKey: ['accountingAccounts'],
        queryFn: () => fetchAllAccounts({}),
        enabled: postModalVisible,
    });

    const invoices = invoicesData?.data || [];
    const accounts = accountsData?.data || [];

    // Filter accounts by type
    const arAccounts = accounts.filter((acc: any) =>
        acc.account_type === 'Asset' &&
        (acc.category === 'Accounts Receivable' || acc.name?.toLowerCase().includes('receivable'))
    );

    const revenueAccounts = accounts.filter((acc: any) =>
        acc.account_type === 'Revenue' || acc.account_type === 'Income'
    );

    const taxPayableAccounts = accounts.filter((acc: any) =>
        acc.account_type === 'Liability' &&
        (acc.category === 'Tax Payable' || acc.name?.toLowerCase().includes('tax') || acc.name?.toLowerCase().includes('vat'))
    );

    // Post invoice mutation
    const postMutation = useMutation({
        mutationFn: ({ id, accountCodes }: { id: string; accountCodes?: any }) => postInvoice(id, accountCodes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            message.success('Invoice posted successfully');
            setPostModalVisible(false);
            setInvoiceToPost(null);
            postForm.resetFields();
        },
        onError: (error: any) => {
            message.error(error?.response?.data?.message || 'Failed to post invoice');
        }
    });

    // Send invoice mutation
    const sendMutation = useMutation({
        mutationFn: (id: string) => sendInvoice(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
        onError: () => {
            message.error('Failed to send invoice');
        }
    });

    // Mark as paid mutation
    const markPaidMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => markInvoiceAsPaid(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
        onError: () => {
            message.error('Failed to mark invoice as paid');
        }
    });

    const handleView = async (record: any) => {
        try {
            setLoadingInvoiceId(record._id);
            const response = await getInvoiceById(record._id);
            setSelectedInvoice(response.data);
            setViewDrawerVisible(true);
        } catch (error) {
            message.error('Failed to load invoice details');
        } finally {
            setLoadingInvoiceId(null);
        }
    };


    const handleEdit = (record: any) => {
        setEditingInvoice(record);
        setIsModalVisible(true);
    };

    const handleAdd = () => {
        setEditingInvoice(null);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingInvoice(null);
    };

    const handlePost = (record: any) => {
        setInvoiceToPost(record);
        setPostModalVisible(true);
        postForm.resetFields();
    };

    const handlePostSubmit = () => {
        postForm.validateFields().then((values) => {
            const accountCodes = {
                ar_account_code: values.ar_account_code,
                revenue_account_code: values.revenue_account_code,
                tax_payable_account_code: values.tax_payable_account_code
            };

            // Remove undefined values
            const cleanedAccountCodes = Object.fromEntries(
                Object.entries(accountCodes).filter(([_, v]) => v !== undefined && v !== '')
            );

            postMutation.mutate({
                id: invoiceToPost._id,
                accountCodes: Object.keys(cleanedAccountCodes).length > 0 ? cleanedAccountCodes : undefined
            });
        });
    };

    const handleSend = (record: any) => {
        confirm({
            title: 'Send Invoice',
            content: `Send invoice ${record.invoice_number} to ${record.customer_email || record.customer_name}?`,
            okText: 'Yes, Send',
            okType: 'primary',
            cancelText: 'Cancel',
            onOk: () => {
                sendMutation.mutate(record._id);
            }
        });
    };

    const handleMarkAsPaid = (record: any) => {
        confirm({
            title: 'Mark as Paid',
            content: `Mark invoice ${record.invoice_number} as fully paid?`,
            okText: 'Yes, Mark Paid',
            okType: 'primary',
            cancelText: 'Cancel',
            onOk: () => {
                markPaidMutation.mutate({
                    id: record._id,
                    data: {
                        payment_date: new Date().toISOString(),
                        payment_method: 'manual',
                        reference: 'Manual payment recording'
                    }
                });
            }
        });
    };

    const handlePrint = (record: any) => {
        // Open invoice in new window for printing
        window.open(`/invoices/${record._id}/print`, '_blank');
    };

    const columns = [
        {
            title: 'Invoice #',
            dataIndex: 'invoice_number',
            key: 'invoice_number',
            render: (text: string, record: any) => (
                <Button
                    type="link"
                    onClick={() => handleView(record)}
                    loading={loadingInvoiceId === record._id}
                    style={{
                        padding: 0,
                        height: 'auto',
                        fontWeight: 500,
                        color: '#1890ff'
                    }}
                >
                    <FileTextOutlined style={{ marginRight: 4 }} />
                    {text}
                </Button>
            ),
        },
        {
            title: 'Customer',
            dataIndex: 'customer_name',
            key: 'customer_name',
            ellipsis: true,
        },
        {
            title: 'Date',
            dataIndex: 'invoice_date',
            key: 'invoice_date',
            width: 120,
            render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
            sorter: (a: any, b: any) => dayjs(a.invoice_date).unix() - dayjs(b.invoice_date).unix(),
        },
        {
            title: 'Due Date',
            dataIndex: 'due_date',
            key: 'due_date',
            width: 120,
            render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
        },
        {
            title: 'Amount',
            dataIndex: 'total',
            key: 'total',
            align: 'right' as const,
            width: 130,
            render: (amount: number) => <Text strong>KES {amount?.toLocaleString() || '0.00'}</Text>,
            sorter: (a: any, b: any) => (a.total || 0) - (b.total || 0),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => {
                const colors: Record<string, string> = {
                    draft: 'default',
                    sent: 'blue',
                    open: 'cyan',
                    partial: 'orange',
                    paid: 'green',
                    overdue: 'red',
                    cancelled: 'red',
                    voided: 'volcano'
                };
                return <Tag color={colors[status] || 'default'}>{status?.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 220,
            fixed: 'right' as const,
            render: (record: any) => (
                <Space size="small">
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        size="small"
                        onClick={() => handleView(record)}
                        title="View"
                    />
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEdit(record)}
                        disabled={record.status === 'paid' || record.status === 'voided'}
                        title="Edit"
                    />
                    {record.status === 'draft' && (
                        <Button
                            type="link"
                            icon={<FileAddOutlined />}
                            size="small"
                            onClick={() => handlePost(record)}
                            title="Post to Accounts"
                        />
                    )}
                    {(record.status === 'draft' || record.status === 'open') && (
                        <Button
                            type="link"
                            icon={<SendOutlined />}
                            size="small"
                            onClick={() => handleSend(record)}
                            title="Send to Customer"
                        />
                    )}
                    {(record.status === 'open' || record.status === 'partial' || record.status === 'overdue') && (
                        <Button
                            type="link"
                            icon={<CheckCircleOutlined />}
                            size="small"
                            onClick={() => handleMarkAsPaid(record)}
                            style={{ color: '#52c41a' }}
                            title="Mark as Paid"
                        />
                    )}
                    <Button
                        type="link"
                        icon={<PrinterOutlined />}
                        size="small"
                        onClick={() => handlePrint(record)}
                        title="Print"
                    />
                </Space>
            ),
        },
    ];

    // Filter invoices by search term
    const filteredInvoices = invoices.filter((invoice: any) => {
        if (!filters.search) return true;
        const searchLower = filters.search.toLowerCase();
        return (
            invoice.invoice_number?.toLowerCase().includes(searchLower) ||
            invoice.customer_name?.toLowerCase().includes(searchLower) ||
            invoice.reference_number?.toLowerCase().includes(searchLower)
        );
    });

    // Calculate summary statistics
    const totalAmount = filteredInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
    const paidAmount = filteredInvoices.reduce((sum: number, inv: any) => sum + (inv.amount_paid || 0), 0);
    const outstandingAmount = filteredInvoices.reduce((sum: number, inv: any) => sum + (inv.balance_due || 0), 0);

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            <FileTextOutlined /> Invoices
                        </Title>
                        <Text type="secondary">Manage customer invoices</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={handleAdd}
                    >
                        Create Invoice
                    </Button>
                </div>

                {/* Summary Cards */}
                <Space style={{ marginBottom: 16, width: '100%' }} size="large">
                    <Card size="small" style={{ minWidth: 200 }}>
                        <Text type="secondary">Total Amount</Text>
                        <Title level={4} style={{ margin: '8px 0 0 0', color: '#1890ff' }}>
                            KES {totalAmount.toLocaleString()}
                        </Title>
                    </Card>
                    <Card size="small" style={{ minWidth: 200 }}>
                        <Text type="secondary">Paid</Text>
                        <Title level={4} style={{ margin: '8px 0 0 0', color: '#52c41a' }}>
                            KES {paidAmount.toLocaleString()}
                        </Title>
                    </Card>
                    <Card size="small" style={{ minWidth: 200 }}>
                        <Text type="secondary">Outstanding</Text>
                        <Title level={4} style={{ margin: '8px 0 0 0', color: '#fa8c16' }}>
                            KES {outstandingAmount.toLocaleString()}
                        </Title>
                    </Card>
                </Space>

                {/* Filters */}
                <Space style={{ marginBottom: 16 }} wrap>
                    <Input
                        placeholder="Search invoices..."
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
                        placeholder="Status"
                        style={{ width: 150 }}
                        allowClear
                        value={filters.status}
                        onChange={(value) => setFilters({ ...filters, status: value })}
                    >
                        <Option value="draft">Draft</Option>
                        <Option value="sent">Sent</Option>
                        <Option value="open">Open</Option>
                        <Option value="partial">Partially Paid</Option>
                        <Option value="paid">Paid</Option>
                        <Option value="overdue">Overdue</Option>
                    </Select>
                </Space>

                <Table
                    columns={columns}
                    dataSource={filteredInvoices}
                    loading={isLoading || postMutation.isPending || sendMutation.isPending || markPaidMutation.isPending}
                    rowKey="_id"
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `Total ${total} invoices`,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100']
                    }}
                    scroll={{ x: 1200 }}
                />

                <InvoiceForm
                    visible={isModalVisible}
                    onCancel={handleCancel}
                    editingInvoice={editingInvoice}
                />

                {/* Post Invoice Modal */}
                <Modal
                    title={`Post Invoice ${invoiceToPost?.invoice_number || ''}`}
                    open={postModalVisible}
                    onOk={handlePostSubmit}
                    onCancel={() => {
                        setPostModalVisible(false);
                        setInvoiceToPost(null);
                        postForm.resetFields();
                    }}
                    confirmLoading={postMutation.isPending}
                    okText="Post Invoice"
                    width={600}
                >
                    <p style={{ marginBottom: 24, color: '#666' }}>
                        This will create accounting journal entries for this invoice.
                        Optionally select account codes to use, or leave empty to use default accounts from your chart of accounts.
                    </p>

                    <Form
                        form={postForm}
                        layout="vertical"
                    >
                        <Form.Item
                            name="ar_account_code"
                            label="Accounts Receivable Account"
                            tooltip="Select the Accounts Receivable account"
                        >
                            <Select
                                placeholder="Select AR account (optional)"
                                allowClear
                                showSearch
                                optionFilterProp="children"
                            >
                                {arAccounts.map((account: any) => (
                                    <Option key={account._id} value={account.code}>
                                        {account.code} - {account.name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="revenue_account_code"
                            label="Revenue Account"
                            tooltip="Select the default revenue/sales account"
                        >
                            <Select
                                placeholder="Select revenue account (optional)"
                                allowClear
                                showSearch
                                optionFilterProp="children"
                            >
                                {revenueAccounts.map((account: any) => (
                                    <Option key={account._id} value={account.code}>
                                        {account.code} - {account.name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="tax_payable_account_code"
                            label="Tax Payable Account"
                            tooltip="Select the VAT/Tax Payable account"
                        >
                            <Select
                                placeholder="Select tax payable account (optional)"
                                allowClear
                                showSearch
                                optionFilterProp="children"
                            >
                                {taxPayableAccounts.map((account: any) => (
                                    <Option key={account._id} value={account.code}>
                                        {account.code} - {account.name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Form>

                    <div style={{
                        marginTop: 16,
                        padding: 12,
                        background: '#f0f5ff',
                        borderRadius: 4,
                        border: '1px solid #adc6ff'
                    }}>
                        <Text style={{ fontSize: 12 }}>
                            <strong>Invoice Details:</strong><br />
                            Customer: {invoiceToPost?.customer_name}<br />
                            Amount: KES {invoiceToPost?.total?.toLocaleString()}
                        </Text>
                    </div>
                </Modal>

                {/* View Invoice Drawer */}
                <Drawer
                    title={`Invoice ${selectedInvoice?.invoice_number || ''}`}
                    placement="right"
                    width={600}
                    onClose={() => setViewDrawerVisible(false)}
                    open={viewDrawerVisible}
                >
                    {selectedInvoice && (
                        <div>
                            <Space direction="vertical" style={{ width: '100%' }} size="large">
                                <div>
                                    <Text strong>Customer:</Text>
                                    <div>{selectedInvoice.customer_name}</div>
                                    {selectedInvoice.customer_email && <div>{selectedInvoice.customer_email}</div>}
                                    {selectedInvoice.customer_phone && <div>{selectedInvoice.customer_phone}</div>}
                                </div>

                                <div>
                                    <Space>
                                        <div>
                                            <Text type="secondary">Invoice Date:</Text>
                                            <div>{dayjs(selectedInvoice.invoice_date).format('MMM DD, YYYY')}</div>
                                        </div>
                                        <div>
                                            <Text type="secondary">Due Date:</Text>
                                            <div>{dayjs(selectedInvoice.due_date).format('MMM DD, YYYY')}</div>
                                        </div>
                                    </Space>
                                </div>

                                <div>
                                    <Text strong>Items:</Text>
                                    <Table
                                        size="small"
                                        columns={[
                                            { title: 'Item', dataIndex: 'name', key: 'name' },
                                            { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 60 },
                                            { title: 'Price', dataIndex: 'unit_price', key: 'unit_price', width: 100, render: (val: number) => `KES ${val.toLocaleString()}` },
                                            { title: 'Total', dataIndex: 'total', key: 'total', width: 120, render: (val: number) => `KES ${val.toLocaleString()}` },
                                        ]}
                                        dataSource={selectedInvoice.items || []}
                                        pagination={false}
                                        rowKey={(record, index) => index?.toString() || '0'}
                                    />
                                </div>

                                <div>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text>Subtotal:</Text>
                                            <Text strong>KES {selectedInvoice.subtotal?.toLocaleString()}</Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text>Tax ({selectedInvoice.tax_rate}%):</Text>
                                            <Text strong>KES {selectedInvoice.tax_amount?.toLocaleString()}</Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                                            <Text strong>Total:</Text>
                                            <Title level={4} style={{ margin: 0 }}>KES {selectedInvoice.total?.toLocaleString()}</Title>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text>Paid:</Text>
                                            <Text strong style={{ color: '#52c41a' }}>KES {selectedInvoice.amount_paid?.toLocaleString()}</Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text>Balance Due:</Text>
                                            <Text strong style={{ color: '#fa8c16' }}>KES {selectedInvoice.balance_due?.toLocaleString()}</Text>
                                        </div>
                                    </Space>
                                </div>

                                {selectedInvoice.notes && (
                                    <div>
                                        <Text strong>Notes:</Text>
                                        <div>{selectedInvoice.notes}</div>
                                    </div>
                                )}
                            </Space>
                        </div>
                    )}
                </Drawer>
            </Card>
        </div>
    );
};

export default InvoicesList;