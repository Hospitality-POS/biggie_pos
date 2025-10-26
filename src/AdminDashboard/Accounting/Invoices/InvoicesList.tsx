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
const { TextArea } = Input;
const { confirm } = Modal;

const InvoicesList: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<any>(null);
    const [viewDrawerVisible, setViewDrawerVisible] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [postModalVisible, setPostModalVisible] = useState(false);
    const [sendModalVisible, setSendModalVisible] = useState(false);
    const [invoiceToPost, setInvoiceToPost] = useState<any>(null);
    const [invoiceToSend, setInvoiceToSend] = useState<any>(null);
    const [postForm] = Form.useForm();
    const [sendForm] = Form.useForm();
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
        mutationFn: ({ id, params }: { id: string; params?: any }) => sendInvoice(id, params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            message.success('Invoice sent successfully');
            setSendModalVisible(false);
            setInvoiceToSend(null);
            sendForm.resetFields();
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
        setInvoiceToSend(record);
        setSendModalVisible(true);
        sendForm.resetFields();
    };

    const handleSendSubmit = () => {
        sendForm.validateFields().then((values) => {
            const params: any = {};

            if (values.message) {
                params.message = values.message;
            }

            if (values.cc && values.cc.length > 0) {
                params.cc = values.cc;
            }

            sendMutation.mutate({
                id: invoiceToSend._id,
                params: Object.keys(params).length > 0 ? params : undefined
            });
        });
    };

    const handleMarkPaid = (record: any) => {
        confirm({
            title: 'Mark as Paid',
            content: `Mark invoice ${record.invoice_number} as paid?`,
            okText: 'Yes, Mark as Paid',
            okType: 'primary',
            cancelText: 'Cancel',
            onOk: () => {
                markPaidMutation.mutate({
                    id: record._id,
                    data: {
                        amount: record.balance_due,
                        payment_date: new Date().toISOString()
                    }
                });
            }
        });
    };

    const columns = [
        {
            title: 'Invoice #',
            dataIndex: 'invoice_number',
            key: 'invoice_number',
            fixed: 'left' as const,
            width: 120,
        },
        {
            title: 'Customer',
            dataIndex: 'customer_name',
            key: 'customer_name',
            width: 200,
        },
        {
            title: 'Date',
            dataIndex: 'invoice_date',
            key: 'invoice_date',
            width: 120,
            render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
        },
        {
            title: 'Due Date',
            dataIndex: 'due_date',
            key: 'due_date',
            width: 120,
            render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 120,
            render: (amount: number) => `KES ${amount?.toLocaleString()}`,
        },
        {
            title: 'Paid',
            dataIndex: 'amount_paid',
            key: 'amount_paid',
            width: 120,
            render: (amount: number) => (
                <Text style={{ color: '#52c41a' }}>KES {amount?.toLocaleString()}</Text>
            ),
        },
        {
            title: 'Balance',
            dataIndex: 'balance_due',
            key: 'balance_due',
            width: 120,
            render: (amount: number) => (
                <Text style={{ color: '#fa8c16', fontWeight: 500 }}>
                    KES {amount?.toLocaleString()}
                </Text>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => {
                const colors: any = {
                    draft: 'default',
                    sent: 'blue',
                    open: 'cyan',
                    partial: 'orange',
                    paid: 'green',
                    overdue: 'red'
                };
                return <Tag color={colors[status]}>{status?.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            fixed: 'right' as const,
            width: 300,
            render: (_: any, record: any) => (
                <Space size="small" wrap>
                    <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleView(record)}
                        loading={loadingInvoiceId === record._id}
                    >
                        View
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                        disabled={record.status === 'paid' || record.is_posted}
                    >
                        Edit
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<SendOutlined />}
                        onClick={() => handleSend(record)}
                        disabled={record.status === 'paid'}
                    >
                        Send
                    </Button>
                    {!record.is_posted && (
                        <Button
                            type="link"
                            size="small"
                            icon={<FileAddOutlined />}
                            onClick={() => handlePost(record)}
                            disabled={record.status === 'draft'}
                        >
                            Post
                        </Button>
                    )}
                    {/* {record.balance_due > 0 && (
                        <Button
                            type="link"
                            size="small"
                            icon={<CheckCircleOutlined />}
                            onClick={() => handleMarkPaid(record)}
                        >
                            Mark Paid
                        </Button>
                    )} */}
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

                {/* Send Invoice Modal */}
                <Modal
                    title={`Send Invoice ${invoiceToSend?.invoice_number || ''}`}
                    open={sendModalVisible}
                    onOk={handleSendSubmit}
                    onCancel={() => {
                        setSendModalVisible(false);
                        setInvoiceToSend(null);
                        sendForm.resetFields();
                    }}
                    confirmLoading={sendMutation.isPending}
                    okText="Send Invoice"
                    width={600}
                >
                    <div style={{
                        marginBottom: 24,
                        padding: 12,
                        background: '#f0f5ff',
                        borderRadius: 4,
                        border: '1px solid #adc6ff'
                    }}>
                        <Text style={{ fontSize: 12 }}>
                            <strong>Invoice Details:</strong><br />
                            Customer: {invoiceToSend?.customer_name}<br />
                            Email: {invoiceToSend?.customer_email}<br />
                            Amount: KES {invoiceToSend?.total?.toLocaleString()}
                        </Text>
                    </div>

                    <Form
                        form={sendForm}
                        layout="vertical"
                    >
                        <Form.Item
                            name="message"
                            label="Custom Message"
                            tooltip="Add a custom message to include in the email (optional)"
                        >
                            <TextArea
                                placeholder="Enter a custom message to include with the invoice..."
                                rows={4}
                                maxLength={500}
                                showCount
                            />
                        </Form.Item>

                        <Form.Item
                            name="cc"
                            label="CC Email Addresses"
                            tooltip="Add additional email addresses to CC (comma-separated or one per line)"
                            rules={[
                                {
                                    validator: async (_, value) => {
                                        if (!value || value.length === 0) return;

                                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                        const invalidEmails = value.filter((email: string) => !emailRegex.test(email.trim()));

                                        if (invalidEmails.length > 0) {
                                            throw new Error(`Invalid email(s): ${invalidEmails.join(', ')}`);
                                        }
                                    }
                                }
                            ]}
                        >
                            <Select
                                mode="tags"
                                placeholder="Enter email addresses to CC..."
                                tokenSeparators={[',', '\n', ' ']}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                    </Form>

                    <div style={{
                        marginTop: 16,
                        padding: 12,
                        background: '#fffbe6',
                        borderRadius: 4,
                        border: '1px solid #ffe58f'
                    }}>
                        <Text style={{ fontSize: 12, color: '#8c8c8c' }}>
                            <strong>Note:</strong> The invoice will be sent to the customer's email address ({invoiceToSend?.customer_email})
                            {sendForm.getFieldValue('cc')?.length > 0 && ' and the CC addresses you specify'}.
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