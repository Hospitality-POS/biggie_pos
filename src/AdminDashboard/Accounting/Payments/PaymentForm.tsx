import React, { useEffect } from 'react';
import { Form, Input, Select, InputNumber, Modal, DatePicker, Divider, Alert } from 'antd';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { addNewPayment, editPayment } from '@services/accounting/payments';
import { fetchAllInvoices } from '@services/accounting/invoices';
import { fetchAllBills } from '@services/accounting/bills';
import { fetchAllExpenses } from '@services/accounting/expenses';
import { fetchAllAccounts } from '@services/accounting/accounts';
import { fetchAllCustomers } from '@services/accounting/customers';
import { fetchAllVendors } from '@services/accounting/vendors';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface PaymentFormProps {
    visible: boolean;
    onCancel: () => void;
    editingPayment: any;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ visible, onCancel, editingPayment }) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();
    const paymentFor = Form.useWatch('payment_for', form); // 'invoice', 'bill', or 'expense'
    const paymentMethod = Form.useWatch('payment_method', form);

    // Fetch invoices (unpaid/partially paid)
    const { data: invoicesData } = useQuery({
        queryKey: ['invoices', 'unpaid'],
        queryFn: () => fetchAllInvoices({ status: 'sent,partial,overdue' }),
        enabled: visible && paymentFor === 'invoice',
    });

    // Fetch bills (unpaid/partially paid)
    const { data: billsData } = useQuery({
        queryKey: ['bills', 'unpaid'],
        queryFn: () => fetchAllBills({ status: 'open,partial' }),
        enabled: visible && paymentFor === 'bill',
    });

    // Fetch expenses (pending and approved only)
    const { data: expensesData } = useQuery({
        queryKey: ['expenses', 'unpaid'],
        queryFn: () => fetchAllExpenses({ status: 'pending,approved' }),
        enabled: visible && paymentFor === 'expense',
    });

    // Fetch customers
    const { data: customersData } = useQuery({
        queryKey: ['customers'],
        queryFn: () => fetchAllCustomers({}),
        enabled: visible,
    });

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
        enabled: visible,
    });

    const invoices = invoicesData?.data || [];
    const bills = billsData?.data || [];
    const expenses = expensesData?.data || [];
    const customers = customersData?.data || [];
    const vendors = vendorsData?.data || [];
    const accounts = accountsData?.data || [];

    // Filter accounts by type
    const cashAccounts = accounts.filter((acc: any) =>
        acc.account_type === 'Asset' &&
        (acc.category === 'Cash' || acc.name?.toLowerCase().includes('cash'))
    );

    const bankAccounts = accounts.filter((acc: any) =>
        acc.account_type === 'Asset' &&
        (acc.category === 'Bank' || acc.name?.toLowerCase().includes('bank'))
    );

    const arAccounts = accounts.filter((acc: any) =>
        acc.account_type === 'Asset' &&
        (acc.category === 'Accounts Receivable' || acc.name?.toLowerCase().includes('receivable'))
    );

    const apAccounts = accounts.filter((acc: any) =>
        acc.account_type === 'Liability' &&
        (acc.category === 'Accounts Payable' || acc.name?.toLowerCase().includes('payable'))
    );

    const expenseAccounts = accounts.filter((acc: any) =>
        acc.account_type === 'Expense'
    );

    const addMutation = useMutation({
        mutationFn: addNewPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            form.resetFields();
            onCancel();
        },
    });

    const editMutation = useMutation({
        mutationFn: editPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            form.resetFields();
            onCancel();
        },
    });

    useEffect(() => {
        if (visible && editingPayment) {
            form.setFieldsValue({
                payment_for: editingPayment.payment_for,
                invoice_id: editingPayment.invoice_id,
                bill_id: editingPayment.bill_id,
                expense_id: editingPayment.expense_id,
                payment_date: editingPayment.payment_date ? dayjs(editingPayment.payment_date) : null,
                amount: editingPayment.amount,
                payment_method: editingPayment.payment_method,
                reference_number: editingPayment.reference_number,
                notes: editingPayment.notes,
            });
        } else if (visible) {
            form.resetFields();
            form.setFieldsValue({
                payment_date: dayjs(),
                payment_method: 'cash',
            });
        }
    }, [visible, editingPayment, form]);

    // Auto-fill amount when invoice is selected
    const handleInvoiceChange = (invoiceId: string) => {
        const selectedInvoice = invoices.find((inv: any) => inv._id === invoiceId);
        if (selectedInvoice) {
            form.setFieldsValue({
                amount: selectedInvoice.balance_due || selectedInvoice.total,
            });
        }
    };

    // Auto-fill amount when bill is selected
    const handleBillChange = (billId: string) => {
        const selectedBill = bills.find((bill: any) => bill._id === billId);
        if (selectedBill) {
            form.setFieldsValue({
                amount: selectedBill.balance_due || selectedBill.total,
            });
        }
    };

    // Auto-fill amount when expense is selected
    const handleExpenseChange = (expenseId: string) => {
        const selectedExpense = expenses.find((exp: any) => exp._id === expenseId);
        if (selectedExpense) {
            form.setFieldsValue({
                amount: selectedExpense.amount,
                payment_method: selectedExpense.payment_method || 'cash',
                notes: `Payment for expense: ${selectedExpense.description}`,
            });
        }
    };

    const handleSubmit = () => {
        form.validateFields().then((values) => {
            const payload: any = {
                payment_date: values.payment_date?.format('YYYY-MM-DD'),
                amount: values.amount,
                payment_method: values.payment_method,
                reference_number: values.reference_number,
                notes: values.notes,
            };

            // Handle based on payment_for type
            if (values.payment_for === 'expense') {
                // Expense payment
                payload.expense_id = values.expense_id;

                // Add account codes for expense payment
                if (values.payment_method === 'cash' && values.cash_account_code) {
                    payload.cash_account_code = values.cash_account_code;
                } else if (values.bank_account_code) {
                    payload.bank_account_code = values.bank_account_code;
                }
                if (values.expense_account_code) {
                    payload.expense_account_code = values.expense_account_code;
                }
            } else if (values.payment_for === 'invoice') {
                // Invoice payment (received from customer)
                payload.payment_type = 'received';
                payload.party_type = 'customer';

                // Get customer from selected invoice
                const selectedInvoice = invoices.find((inv: any) => inv._id === values.invoice_id);
                if (selectedInvoice) {
                    payload.party_id = selectedInvoice.customer_id;
                }

                // Add allocation
                payload.allocations = [{
                    document_type: 'invoice',
                    document_id: values.invoice_id,
                    invoice_id: values.invoice_id,
                    allocated_amount: values.amount
                }];

                // Add account codes
                if (values.payment_method === 'cash' && values.cash_account_code) {
                    payload.cash_account_code = values.cash_account_code;
                } else if (values.bank_account_code) {
                    payload.bank_account_code = values.bank_account_code;
                }
                if (values.ar_account_code) {
                    payload.ar_account_code = values.ar_account_code;
                }
            } else if (values.payment_for === 'bill') {
                // Bill payment (made to vendor)
                payload.payment_type = 'made';
                payload.party_type = 'vendor';

                // Get vendor from selected bill
                const selectedBill = bills.find((bill: any) => bill._id === values.bill_id);
                if (selectedBill) {
                    payload.party_id = selectedBill.vendor_id;
                }

                // Add allocation
                payload.allocations = [{
                    document_type: 'bill',
                    document_id: values.bill_id,
                    bill_id: values.bill_id,
                    allocated_amount: values.amount
                }];

                // Add account codes
                if (values.payment_method === 'cash' && values.cash_account_code) {
                    payload.cash_account_code = values.cash_account_code;
                } else if (values.bank_account_code) {
                    payload.bank_account_code = values.bank_account_code;
                }
                if (values.ap_account_code) {
                    payload.ap_account_code = values.ap_account_code;
                }
            }

            if (editingPayment) {
                editMutation.mutate({ _id: editingPayment._id, value: payload });
            } else {
                addMutation.mutate(payload);
            }
        });
    };

    return (
        <Modal
            title={editingPayment ? 'Edit Payment' : 'Record New Payment'}
            open={visible}
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={addMutation.isPending || editMutation.isPending}
            width={700}
            okText={editingPayment ? 'Update' : 'Record'}
        >
            <Form
                form={form}
                layout="vertical"
                style={{ marginTop: 24 }}
            >
                <Alert
                    message="Payment Type"
                    description="Select what this payment is for: Customer Invoice (received), Vendor Bill (made), or Direct Expense"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Form.Item
                    name="payment_for"
                    label="Payment For"
                    rules={[{ required: true, message: 'Please select what this payment is for' }]}
                >
                    <Select placeholder="Select payment type">
                        <Option value="invoice">Invoice Payment (Received from Customer)</Option>
                        <Option value="bill">Bill Payment (Made to Vendor)</Option>
                        <Option value="expense">Expense Payment (Direct)</Option>
                    </Select>
                </Form.Item>

                {paymentFor === 'invoice' && (
                    <Form.Item
                        name="invoice_id"
                        label="Select Invoice"
                        rules={[{ required: true, message: 'Please select an invoice' }]}
                    >
                        <Select
                            placeholder="Select invoice to receive payment for"
                            showSearch
                            optionFilterProp="children"
                            onChange={handleInvoiceChange}
                        >
                            {invoices.map((invoice: any) => (
                                <Option key={invoice._id} value={invoice._id}>
                                    {invoice.invoice_number} - {invoice.customer_name} - KES {invoice.total?.toLocaleString()} (Balance: KES {invoice.balance_due?.toLocaleString()})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                {paymentFor === 'bill' && (
                    <Form.Item
                        name="bill_id"
                        label="Select Bill"
                        rules={[{ required: true, message: 'Please select a bill' }]}
                    >
                        <Select
                            placeholder="Select bill to make payment for"
                            showSearch
                            optionFilterProp="children"
                            onChange={handleBillChange}
                        >
                            {bills.map((bill: any) => (
                                <Option key={bill._id} value={bill._id}>
                                    {bill.bill_number} - {bill.vendor_name} - KES {bill.total?.toLocaleString()} (Balance: KES {bill.balance_due?.toLocaleString()})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                {paymentFor === 'expense' && (
                    <Form.Item
                        name="expense_id"
                        label="Select Expense"
                        rules={[{ required: true, message: 'Please select an expense' }]}
                    >
                        <Select
                            placeholder="Select expense to pay"
                            showSearch
                            optionFilterProp="children"
                            onChange={handleExpenseChange}
                        >
                            {expenses.map((expense: any) => (
                                <Option key={expense._id} value={expense._id}>
                                    {expense.expense_number} - {expense.description} - {expense.category?.toUpperCase()} - KES {expense.amount?.toLocaleString()} ({expense.status})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                <Form.Item
                    name="payment_date"
                    label="Payment Date"
                    rules={[{ required: true, message: 'Please select payment date' }]}
                >
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                    name="amount"
                    label="Amount"
                    rules={[{ required: true, message: 'Please enter amount' }]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        placeholder="0.00"
                        prefix="KES"
                        min={0}
                        precision={2}
                    />
                </Form.Item>

                <Form.Item
                    name="payment_method"
                    label="Payment Method"
                    rules={[{ required: true, message: 'Please select payment method' }]}
                >
                    <Select placeholder="Select payment method">
                        <Option value="cash">Cash</Option>
                        <Option value="bank_transfer">Bank Transfer</Option>
                        <Option value="credit_card">Credit Card</Option>
                        <Option value="debit_card">Debit Card</Option>
                        <Option value="cheque">Cheque</Option>
                        <Option value="mpesa">M-Pesa</Option>
                        <Option value="paypal">PayPal</Option>
                        <Option value="other">Other</Option>
                    </Select>
                </Form.Item>

                <Divider orientation="left">Accounting Details (Optional)</Divider>

                {paymentMethod === 'cash' ? (
                    <Form.Item
                        name="cash_account_code"
                        label="Cash Account"
                        tooltip="Select the cash account for this payment"
                    >
                        <Select
                            placeholder="Select cash account (optional)"
                            allowClear
                            showSearch
                            optionFilterProp="children"
                        >
                            {cashAccounts.map((account: any) => (
                                <Option key={account._id} value={account.code}>
                                    {account.code} - {account.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                ) : (
                    <Form.Item
                        name="bank_account_code"
                        label="Bank Account"
                        tooltip="Select the bank account for this payment"
                    >
                        <Select
                            placeholder="Select bank account (optional)"
                            allowClear
                            showSearch
                            optionFilterProp="children"
                        >
                            {bankAccounts.map((account: any) => (
                                <Option key={account._id} value={account.code}>
                                    {account.code} - {account.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                {paymentFor === 'invoice' && (
                    <Form.Item
                        name="ar_account_code"
                        label="Accounts Receivable Account"
                        tooltip="Select the AR account"
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
                )}

                {paymentFor === 'bill' && (
                    <Form.Item
                        name="ap_account_code"
                        label="Accounts Payable Account"
                        tooltip="Select the AP account"
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
                )}

                {paymentFor === 'expense' && (
                    <Form.Item
                        name="expense_account_code"
                        label="Expense Account"
                        tooltip="Select the expense account"
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
                )}

                <Form.Item
                    name="reference_number"
                    label="Reference Number"
                >
                    <Input placeholder="Transaction/reference number" />
                </Form.Item>

                <Form.Item
                    name="notes"
                    label="Notes"
                >
                    <TextArea rows={3} placeholder="Additional notes about the payment" />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default PaymentForm;