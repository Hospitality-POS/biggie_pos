import React, { useEffect } from 'react';
import { Form, Input, Select, InputNumber, Modal, DatePicker, message } from 'antd';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { addNewReceipt, editReceipt } from '@services/accounting/receipts';
import { fetchAllPayments } from '@services/accounting/payments';
import { fetchAllCustomers } from '@services/accounting/customers';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface ReceiptFormProps {
    visible: boolean;
    onCancel: () => void;
    editingReceipt: any;
}

const ReceiptForm: React.FC<ReceiptFormProps> = ({ visible, onCancel, editingReceipt }) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    // Fetch received payments only
    const { data: paymentsData } = useQuery({
        queryKey: ['payments', 'received'],
        queryFn: () => fetchAllPayments({ payment_type: 'received', status: 'completed' }),
        enabled: visible,
    });

    // Fetch customers
    const { data: customersData } = useQuery({
        queryKey: ['accountingCustomers'],
        queryFn: () => fetchAllCustomers({}),
        enabled: visible,
    });

    const payments = paymentsData?.data || [];
    const customers = customersData?.data || [];

    const addMutation = useMutation({
        mutationFn: addNewReceipt,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receipts'] });
            form.resetFields();
            onCancel();
            message.success('Receipt created successfully');
        },
        onError: (error: any) => {
            message.error(error?.response?.data?.message || 'Failed to create receipt');
        },
    });

    const editMutation = useMutation({
        mutationFn: editReceipt,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receipts'] });
            form.resetFields();
            onCancel();
            message.success('Receipt updated successfully');
        },
        onError: (error: any) => {
            message.error(error?.response?.data?.message || 'Failed to update receipt');
        },
    });

    useEffect(() => {
        if (visible && editingReceipt) {
            form.setFieldsValue({
                payment_reference: editingReceipt.payment_reference?._id || editingReceipt.payment_reference,
                customer_id: editingReceipt.customer_id?._id || editingReceipt.customer_id,
                receipt_date: editingReceipt.receipt_date ? dayjs(editingReceipt.receipt_date) : null,
                amount: editingReceipt.amount,
                payment_method: editingReceipt.payment_method,
                notes: editingReceipt.notes,
                status: editingReceipt.status,
            });
        } else if (visible) {
            form.resetFields();
            form.setFieldsValue({
                status: 'issued',
                receipt_date: dayjs(),
            });
        }
    }, [visible, editingReceipt, form]);

    // Handle payment selection - auto-fill customer and amount
    const handlePaymentChange = (paymentId: string) => {
        const selectedPayment = payments.find((p: any) => p._id === paymentId);
        if (selectedPayment) {
            form.setFieldsValue({
                customer_id: selectedPayment.party_id?._id || selectedPayment.party_id,
                amount: selectedPayment.amount,
                payment_method: selectedPayment.payment_method,
            });
        }
    };

    const handleSubmit = () => {
        form.validateFields().then((values) => {
            const payload = {
                ...values,
                receipt_date: values.receipt_date?.format('YYYY-MM-DD'),
            };

            if (editingReceipt) {
                editMutation.mutate({ _id: editingReceipt._id, value: payload });
            } else {
                addMutation.mutate(payload);
            }
        });
    };

    return (
        <Modal
            title={editingReceipt ? 'Edit Receipt' : 'Create New Receipt'}
            open={visible}
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={addMutation.isPending || editMutation.isPending}
            width={600}
            okText={editingReceipt ? 'Update' : 'Create'}
        >
            <Form
                form={form}
                layout="vertical"
                style={{ marginTop: 24 }}
            >
                <Form.Item
                    name="payment_reference"
                    label="Payment Reference"
                    rules={[{ required: true, message: 'Please select a payment' }]}
                >
                    <Select
                        placeholder="Select payment"
                        showSearch
                        optionFilterProp="children"
                        onChange={handlePaymentChange}
                        filterOption={(input, option: any) =>
                            (option?.children?.toString() || '').toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {payments.map((payment: any) => (
                            <Option key={payment._id} value={payment._id}>
                                {payment.payment_number} - {payment.party_name || 'Unknown'} - KES {payment.amount?.toLocaleString()}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="customer_id"
                    label="Customer"
                    rules={[{ required: true, message: 'Please select a customer' }]}
                >
                    <Select
                        placeholder="Select customer"
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option: any) =>
                            (option?.children?.toString() || '').toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {customers.map((customer: any) => (
                            <Option key={customer._id} value={customer._id}>
                                {customer.name} - {customer.email}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="receipt_date"
                    label="Receipt Date"
                    rules={[{ required: true, message: 'Please select receipt date' }]}
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
                        <Option value="other">Other</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="notes"
                    label="Notes"
                >
                    <TextArea rows={3} placeholder="Additional notes" />
                </Form.Item>

                <Form.Item
                    name="status"
                    label="Status"
                    initialValue="issued"
                    rules={[{ required: true, message: 'Please select status' }]}
                >
                    <Select>
                        <Option value="issued">Issued</Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ReceiptForm;