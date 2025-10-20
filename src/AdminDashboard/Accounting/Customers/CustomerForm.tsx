import React, { useEffect } from 'react';
import { Form, Input, Select, Modal } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addNewCustomer, editCustomer } from '@services/accounting/customers';

const { Option } = Select;
const { TextArea } = Input;

interface CustomerFormProps {
    visible: boolean;
    onCancel: () => void;
    editingCustomer: any;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ visible, onCancel, editingCustomer }) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    const addMutation = useMutation({
        mutationFn: addNewCustomer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accountingCustomers'] });
            form.resetFields();
            onCancel();
        },
    });

    const editMutation = useMutation({
        mutationFn: editCustomer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accountingCustomers'] });
            form.resetFields();
            onCancel();
        },
    });

    useEffect(() => {
        if (visible && editingCustomer) {
            form.setFieldsValue({
                name: editingCustomer.name,
                email: editingCustomer.email,
                phone: editingCustomer.phone,
                company: editingCustomer.company,
                tax_id: editingCustomer.tax_id,
                billing_address: editingCustomer.billing_address,
                shipping_address: editingCustomer.shipping_address,
                payment_terms: editingCustomer.payment_terms,
                credit_limit: editingCustomer.credit_limit,
                notes: editingCustomer.notes,
                status: editingCustomer.status,
            });
        } else if (visible) {
            form.resetFields();
            form.setFieldsValue({ status: 'active' });
        }
    }, [visible, editingCustomer, form]);

    const handleSubmit = () => {
        form.validateFields().then((values) => {
            if (editingCustomer) {
                editMutation.mutate({ _id: editingCustomer._id, value: values });
            } else {
                addMutation.mutate(values);
            }
        });
    };

    return (
        <Modal
            title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            open={visible}
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={addMutation.isPending || editMutation.isPending}
            width={700}
            okText={editingCustomer ? 'Update' : 'Create'}
        >
            <Form
                form={form}
                layout="vertical"
                style={{ marginTop: 24 }}
            >
                <Form.Item
                    name="name"
                    label="Customer Name"
                    rules={[{ required: true, message: 'Please enter customer name' }]}
                >
                    <Input placeholder="e.g., John Doe" />
                </Form.Item>

                <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                        { required: true, message: 'Please enter email' },
                        { type: 'email', message: 'Please enter a valid email' }
                    ]}
                >
                    <Input placeholder="customer@example.com" />
                </Form.Item>

                <Form.Item
                    name="phone"
                    label="Phone"
                    rules={[{ required: true, message: 'Please enter phone number' }]}
                >
                    <Input placeholder="+254 700 000000" />
                </Form.Item>

                <Form.Item
                    name="company"
                    label="Company"
                >
                    <Input placeholder="Company name (optional)" />
                </Form.Item>

                <Form.Item
                    name="tax_id"
                    label="Tax ID / KRA PIN"
                >
                    <Input placeholder="Tax identification number" />
                </Form.Item>

                <Form.Item
                    name="billing_address"
                    label="Billing Address"
                >
                    <TextArea rows={2} placeholder="Street address, City, Country" />
                </Form.Item>

                <Form.Item
                    name="shipping_address"
                    label="Shipping Address"
                >
                    <TextArea rows={2} placeholder="Street address, City, Country (if different from billing)" />
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
                        <Option value="custom">Custom</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="credit_limit"
                    label="Credit Limit"
                >
                    <Input prefix="KES" placeholder="0.00" />
                </Form.Item>

                <Form.Item
                    name="notes"
                    label="Notes"
                >
                    <TextArea rows={3} placeholder="Additional notes about the customer" />
                </Form.Item>

                <Form.Item
                    name="status"
                    label="Status"
                    initialValue="active"
                    rules={[{ required: true, message: 'Please select status' }]}
                >
                    <Select>
                        <Option value="active">Active</Option>
                        <Option value="inactive">Inactive</Option>
                        <Option value="blocked">Blocked</Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default CustomerForm;