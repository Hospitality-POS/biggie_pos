import React, { useEffect, useState } from 'react';
import { Form, Input, Select, InputNumber, Modal, DatePicker, Button, Table, Checkbox, Divider, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { addNewInvoice, editInvoice } from '@services/accounting/invoices';
import { fetchAllCustomers } from '@services/accounting/customers';
import { fetchAllAccounts } from '@services/accounting/accounts';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;

interface InvoiceFormProps {
    visible: boolean;
    onCancel: () => void;
    editingInvoice: any;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ visible, onCancel, editingInvoice }) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();
    const [lineItems, setLineItems] = useState<any[]>([]);
    const [autoPost, setAutoPost] = useState(false);

    // Fetch customers
    const { data: customersData } = useQuery({
        queryKey: ['accountingCustomers'],
        queryFn: () => fetchAllCustomers({}),
        enabled: visible,
    });

    // Fetch accounts
    const { data: accountsData } = useQuery({
        queryKey: ['accountingAccounts'],
        queryFn: () => fetchAllAccounts({}),
        enabled: visible && autoPost,
    });

    const customers = customersData?.data || [];
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

    const addMutation = useMutation({
        mutationFn: addNewInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            form.resetFields();
            setLineItems([]);
            setAutoPost(false);
            onCancel();
        },
    });

    const editMutation = useMutation({
        mutationFn: editInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            form.resetFields();
            setLineItems([]);
            setAutoPost(false);
            onCancel();
        },
    });

    useEffect(() => {
        if (visible && editingInvoice) {
            form.setFieldsValue({
                customer_id: editingInvoice.customer_id,
                invoice_date: editingInvoice.invoice_date ? dayjs(editingInvoice.invoice_date) : null,
                due_date: editingInvoice.due_date ? dayjs(editingInvoice.due_date) : null,
                payment_terms: editingInvoice.payment_terms,
                notes: editingInvoice.notes,
                status: editingInvoice.status,
            });
            setLineItems(editingInvoice.line_items || []);
        } else if (visible) {
            form.resetFields();
            form.setFieldsValue({
                status: 'draft',
                invoice_date: dayjs(),
                due_date: dayjs().add(30, 'days'),
            });
            setLineItems([]);
            setAutoPost(false);
        }
    }, [visible, editingInvoice, form]);

    const handleAddLineItem = () => {
        const newItem = {
            key: Date.now(),
            description: '',
            quantity: 1,
            unit_price: 0,
            amount: 0,
        };
        setLineItems([...lineItems, newItem]);
    };

    const handleDeleteLineItem = (key: number) => {
        setLineItems(lineItems.filter(item => item.key !== key));
    };

    const handleLineItemChange = (key: number, field: string, value: any) => {
        const updatedItems = lineItems.map(item => {
            if (item.key === key) {
                const updated = { ...item, [field]: value };
                if (field === 'quantity' || field === 'unit_price') {
                    updated.amount = (updated.quantity || 0) * (updated.unit_price || 0);
                }
                return updated;
            }
            return item;
        });
        setLineItems(updatedItems);
    };

    const calculateTotal = () => {
        return lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    };

    const lineItemColumns = [
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (text: string, record: any) => (
                <Input
                    value={text}
                    onChange={(e) => handleLineItemChange(record.key, 'description', e.target.value)}
                    placeholder="Item description"
                />
            ),
        },
        {
            title: 'Quantity',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 120,
            render: (value: number, record: any) => (
                <InputNumber
                    value={value}
                    onChange={(val) => handleLineItemChange(record.key, 'quantity', val)}
                    min={0}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Unit Price',
            dataIndex: 'unit_price',
            key: 'unit_price',
            width: 150,
            render: (value: number, record: any) => (
                <InputNumber
                    value={value}
                    onChange={(val) => handleLineItemChange(record.key, 'unit_price', val)}
                    min={0}
                    prefix="KES"
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            width: 150,
            render: (value: number) => `KES ${value?.toLocaleString() || '0.00'}`,
        },
        {
            title: 'Action',
            key: 'action',
            width: 80,
            render: (record: any) => (
                <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteLineItem(record.key)}
                />
            ),
        },
    ];

    const handleSubmit = () => {
        form.validateFields().then((values) => {
            const payload = {
                ...values,
                invoice_date: values.invoice_date?.format('YYYY-MM-DD'),
                due_date: values.due_date?.format('YYYY-MM-DD'),
                line_items: lineItems,
                total_amount: calculateTotal(),
                auto_post: autoPost,
                // Include account codes if auto-post is enabled
                ...(autoPost && {
                    ar_account_code: values.ar_account_code,
                    revenue_account_code: values.revenue_account_code,
                    tax_payable_account_code: values.tax_payable_account_code,
                })
            };

            if (editingInvoice) {
                editMutation.mutate({ _id: editingInvoice._id, value: payload });
            } else {
                addMutation.mutate(payload);
            }
        });
    };

    return (
        <Modal
            title={editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
            open={visible}
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={addMutation.isPending || editMutation.isPending}
            width={1000}
            okText={editingInvoice ? 'Update' : 'Create'}
        >
            <Form
                form={form}
                layout="vertical"
                style={{ marginTop: 24 }}
            >
                <Form.Item
                    name="customer_id"
                    label="Customer"
                    rules={[{ required: true, message: 'Please select a customer' }]}
                >
                    <Select placeholder="Select customer" showSearch optionFilterProp="children">
                        {customers.map((customer: any) => (
                            <Option key={customer._id} value={customer._id}>
                                {customer.name} - {customer.email}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="invoice_date"
                    label="Invoice Date"
                    rules={[{ required: true, message: 'Please select invoice date' }]}
                >
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                    name="due_date"
                    label="Due Date"
                    rules={[{ required: true, message: 'Please select due date' }]}
                >
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                    name="payment_terms"
                    label="Payment Terms"
                >
                    <Select placeholder="Select payment terms">
                        <Option value="net_15">Net 15</Option>
                        <Option value="net_30">Net 30</Option>
                        <Option value="net_45">Net 45</Option>
                        <Option value="net_60">Net 60</Option>
                        <Option value="due_on_receipt">Due on Receipt</Option>
                    </Select>
                </Form.Item>

                <Form.Item label="Line Items">
                    <Table
                        columns={lineItemColumns}
                        dataSource={lineItems}
                        pagination={false}
                        size="small"
                        rowKey="key"
                    />
                    <Button
                        type="dashed"
                        onClick={handleAddLineItem}
                        icon={<PlusOutlined />}
                        style={{ width: '100%', marginTop: 8 }}
                    >
                        Add Line Item
                    </Button>
                </Form.Item>

                <Form.Item>
                    <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 'bold' }}>
                        Total: KES {calculateTotal().toLocaleString()}
                    </div>
                </Form.Item>

                <Divider />

                {/* Auto-Post Settings */}
                {!editingInvoice && (
                    <>
                        <Form.Item>
                            <Checkbox
                                checked={autoPost}
                                onChange={(e) => setAutoPost(e.target.checked)}
                            >
                                Auto-post invoice after creation
                            </Checkbox>
                        </Form.Item>

                        {autoPost && (
                            <Collapse
                                defaultActiveKey={['1']}
                                style={{ marginBottom: 16 }}
                            >
                                <Panel header="Accounting Configuration (Optional)" key="1">
                                    <p style={{ marginBottom: 16, color: '#666' }}>
                                        Select account codes for posting. Leave empty to use default accounts from your chart of accounts.
                                    </p>

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
                                </Panel>
                            </Collapse>
                        )}
                    </>
                )}

                <Form.Item
                    name="notes"
                    label="Notes"
                >
                    <TextArea rows={3} placeholder="Additional notes" />
                </Form.Item>

                <Form.Item
                    name="status"
                    label="Status"
                    initialValue="draft"
                    rules={[{ required: true, message: 'Please select status' }]}
                >
                    <Select>
                        <Option value="draft">Draft</Option>
                        <Option value="sent">Sent</Option>
                        <Option value="paid">Paid</Option>
                        <Option value="cancelled">Cancelled</Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default InvoiceForm;