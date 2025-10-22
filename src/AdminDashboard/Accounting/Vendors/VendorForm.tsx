import React, { useEffect } from 'react';
import { Form, Input, Select, Modal } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addNewVendor, editVendor } from '@services/accounting/vendors';

const { Option } = Select;
const { TextArea } = Input;

interface VendorFormProps {
    visible: boolean;
    onCancel: () => void;
    editingVendor: any;
}

const VendorForm: React.FC<VendorFormProps> = ({ visible, onCancel, editingVendor }) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    const addMutation = useMutation({
        mutationFn: addNewVendor,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            form.resetFields();
            onCancel();
        },
    });

    const editMutation = useMutation({
        mutationFn: editVendor,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            form.resetFields();
            onCancel();
        },
    });

    useEffect(() => {
        if (visible && editingVendor) {
            form.setFieldsValue({
                name: editingVendor.name,
                email: editingVendor.email,
                phone: editingVendor.phone,
                company: editingVendor.company,
                tax_id: editingVendor.tax_id,
                address: editingVendor.address,
                payment_terms: editingVendor.payment_terms,
                bank_name: editingVendor.bank_name,
                bank_account: editingVendor.bank_account,
                notes: editingVendor.notes,
                status: editingVendor.status,
            });
        } else if (visible) {
            form.resetFields();
            form.setFieldsValue({ status: 'active' });
        }
    }, [visible, editingVendor, form]);

    const handleSubmit = () => {
        form.validateFields().then((values) => {
            if (editingVendor) {
                editMutation.mutate({ _id: editingVendor._id, value: values });
            } else {
                addMutation.mutate(values);
            }
        });
    };

    return (
        <Modal
            title={editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
            open={visible}
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={addMutation.isPending || editMutation.isPending}
            width={700}
            okText={editingVendor ? 'Update' : 'Create'}
        >
            <Form
                form={form}
                layout="vertical"
                style={{ marginTop: 24 }}
            >
                <Form.Item
                    name="name"
                    label="Vendor Name"
                    rules={[{ required: true, message: 'Please enter vendor name' }]}
                >
                    <Input placeholder="e.g., ABC Suppliers" />
                </Form.Item>

                <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                        { required: true, message: 'Please enter email' },
                        { type: 'email', message: 'Please enter a valid email' }
                    ]}
                >
                    <Input placeholder="vendor@example.com" />
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
                    <Input placeholder="Company name" />
                </Form.Item>

                <Form.Item
                    name="tax_id"
                    label="Tax ID / KRA PIN"
                >
                    <Input placeholder="Tax identification number" />
                </Form.Item>

                <Form.Item
                    name="address"
                    label="Address"
                >
                    <TextArea rows={2} placeholder="Street address, City, Country" />
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
                    name="bank_name"
                    label="Bank Name"
                >
                    <Input placeholder="Vendor's bank name" />
                </Form.Item>

                <Form.Item
                    name="bank_account"
                    label="Bank Account Number"
                >
                    <Input placeholder="Vendor's bank account number" />
                </Form.Item>

                <Form.Item
                    name="notes"
                    label="Notes"
                >
                    <TextArea rows={3} placeholder="Additional notes about the vendor" />
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

export default VendorForm;