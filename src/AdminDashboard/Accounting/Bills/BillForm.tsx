import React, { useEffect, useState } from 'react';
import { Form, Input, Select, InputNumber, Modal, DatePicker, Button, Table, Checkbox, Divider, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { addNewBill, editBill } from '@services/accounting/bills';
import { fetchAllVendors } from '@services/accounting/vendors';
import { fetchAllAccounts } from '@services/accounting/accounts';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;

interface BillFormProps {
    visible: boolean;
    onCancel: () => void;
    editingBill: any;
}

const BillForm: React.FC<BillFormProps> = ({ visible, onCancel, editingBill }) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();
    const [lineItems, setLineItems] = useState<any[]>([]);
    const [autoPost, setAutoPost] = useState(false);

    // Fetch vendors
    const { data: vendorsData } = useQuery({
        queryKey: ['vendors'],
        queryFn: () => fetchAllVendors({}),
        enabled: visible,
    });

    // Fetch accounts
    const { data: accountsData } = useQuery({
        queryKey: ['accountingAccounts'],
        queryFn: () => fetchAllAccounts({}),
        enabled: visible && autoPost,
    });

    const vendors = vendorsData?.data || [];
    const accounts = accountsData?.data || [];

    // Filter accounts by type
    const apAccounts = accounts.filter((acc: any) =>
        acc.account_type === 'Liability' &&
        (acc.category === 'Accounts Payable' || acc.name?.toLowerCase().includes('payable'))
    );

    const expenseAccounts = accounts.filter((acc: any) =>
        acc.account_type === 'Expense'
    );

    const taxReceivableAccounts = accounts.filter((acc: any) =>
        acc.account_type === 'Asset' &&
        (acc.category === 'Tax Receivable' || acc.name?.toLowerCase().includes('tax') || acc.name?.toLowerCase().includes('vat'))
    );

    const addMutation = useMutation({
        mutationFn: addNewBill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            form.resetFields();
            setLineItems([]);
            setAutoPost(false);
            onCancel();
        },
    });

    const editMutation = useMutation({
        mutationFn: editBill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            form.resetFields();
            setLineItems([]);
            setAutoPost(false);
            onCancel();
        },
    });

    useEffect(() => {
        if (visible && editingBill) {
            form.setFieldsValue({
                vendor_id: editingBill.vendor_id,
                bill_date: editingBill.bill_date ? dayjs(editingBill.bill_date) : null,
                due_date: editingBill.due_date ? dayjs(editingBill.due_date) : null,
                reference_number: editingBill.reference_number,
                payment_terms: editingBill.payment_terms,
                notes: editingBill.notes,
                status: editingBill.status,
            });
            setLineItems(editingBill.items || editingBill.line_items || []);
        } else if (visible) {
            form.resetFields();
            form.setFieldsValue({
                status: 'draft',
                bill_date: dayjs(),
                due_date: dayjs().add(30, 'days'),
            });
            // ✅ Initialize with one default line item
            setLineItems([
                {
                    key: Date.now(),
                    description: '',
                    quantity: 1,
                    unit_price: 0,
                    amount: 0,
                },
            ]);
            setAutoPost(false);
        }
    }, [visible, editingBill, form]);


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
                bill_date: values.bill_date?.format('YYYY-MM-DD'),
                due_date: values.due_date?.format('YYYY-MM-DD'),
                items: lineItems,
                total_amount: calculateTotal(),
                auto_post: autoPost,
                // Include account codes if auto-post is enabled
                ...(autoPost && {
                    ap_account_code: values.ap_account_code,
                    expense_account_code: values.expense_account_code,
                    tax_receivable_account_code: values.tax_receivable_account_code,
                })
            };

            if (editingBill) {
                editMutation.mutate({ _id: editingBill._id, value: payload });
            } else {
                addMutation.mutate(payload);
            }
        });
    };

    return (
        <Modal
            title={editingBill ? 'Edit Bill' : 'Create New Bill'}
            open={visible}
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={addMutation.isPending || editMutation.isPending}
            width={1000}
            okText={editingBill ? 'Update' : 'Create'}
        >
            <Form
                form={form}
                layout="vertical"
                style={{ marginTop: 24 }}
            >
                <Form.Item
                    name="vendor_id"
                    label="Vendor"
                    rules={[{ required: true, message: 'Please select a vendor' }]}
                >
                    <Select placeholder="Select vendor" showSearch optionFilterProp="children">
                        {vendors.map((vendor: any) => (
                            <Option key={vendor._id} value={vendor._id}>
                                {vendor.name} - {vendor.email}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="bill_date"
                    label="Bill Date"
                    rules={[{ required: true, message: 'Please select bill date' }]}
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
                    name="reference_number"
                    label="Reference Number"
                >
                    <Input placeholder="Vendor's invoice/reference number" />
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
                {!editingBill && (
                    <>
                        <Form.Item>
                            <Checkbox
                                checked={autoPost}
                                onChange={(e) => setAutoPost(e.target.checked)}
                            >
                                Auto-post bill after creation
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
                                        name="ap_account_code"
                                        label="Accounts Payable Account"
                                        tooltip="Select the Accounts Payable account"
                                    >
                                        <Select
                                            placeholder="Select AP account (optional)"
                                            allowClear
                                            showSearch
                                            optionFilterProp="children"
                                        >
                                            {apAccounts.map((account: any) => (
                                                <Option key={account._id} value={account.code}>
                                                    {account.code} - {account.name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item
                                        name="expense_account_code"
                                        label="Expense Account"
                                        tooltip="Select the default expense account"
                                    >
                                        <Select
                                            placeholder="Select expense account (optional)"
                                            allowClear
                                            showSearch
                                            optionFilterProp="children"
                                        >
                                            {expenseAccounts.map((account: any) => (
                                                <Option key={account._id} value={account.code}>
                                                    {account.code} - {account.name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item
                                        name="tax_receivable_account_code"
                                        label="Tax Receivable Account"
                                        tooltip="Select the VAT/Tax Receivable account"
                                    >
                                        <Select
                                            placeholder="Select tax receivable account (optional)"
                                            allowClear
                                            showSearch
                                            optionFilterProp="children"
                                        >
                                            {taxReceivableAccounts.map((account: any) => (
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
                        <Option value="pending">Pending</Option>
                        {/* <Option value="paid">Paid</Option> */}
                        <Option value="cancelled">Cancelled</Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default BillForm;