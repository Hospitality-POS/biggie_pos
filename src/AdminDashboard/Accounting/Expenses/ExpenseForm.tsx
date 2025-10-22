import React, { useEffect, useState, useCallback } from 'react';
import { Form, Input, Select, InputNumber, Modal, DatePicker, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { addNewExpense, editExpense } from '@services/accounting/expenses';
import { fetchAllVendors } from '@services/accounting/vendors';
import { fetchAllAccounts } from '@services/accounting/accounts';
import dayjs from 'dayjs';
import { RcFile, UploadFile, UploadProps } from 'antd/lib/upload';

const { Option } = Select;
const { TextArea } = Input;

interface ExpenseFormProps {
    visible: boolean;
    onCancel: () => void;
    editingExpense: any;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ visible, onCancel, editingExpense }) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    // File upload state
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    // Fetch vendors
    const { data: vendorsData } = useQuery({
        queryKey: ['vendors'],
        queryFn: () => fetchAllVendors({}),
        enabled: visible,
    });

    // Fetch expense accounts
    const { data: accountsData } = useQuery({
        queryKey: ['expenseAccounts'],
        queryFn: () => fetchAllAccounts({ account_type: 'Expense' }),
        enabled: visible,
    });

    const vendors = vendorsData?.data || [];
    const accounts = accountsData?.data || [];

    const addMutation = useMutation({
        mutationFn: addNewExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            form.resetFields();
            resetFileState();
            onCancel();
        },
    });

    const editMutation = useMutation({
        mutationFn: editExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            form.resetFields();
            resetFileState();
            onCancel();
        },
    });

    // Reset file state
    const resetFileState = useCallback(() => {
        setFileList([]);
        setUploadedFile(null);
    }, []);

    useEffect(() => {
        if (visible && editingExpense) {
            form.setFieldsValue({
                expense_date: editingExpense.expense_date ? dayjs(editingExpense.expense_date) : null,
                category: editingExpense.category,
                account_id: editingExpense.account_id,
                vendor_id: editingExpense.vendor_id,
                amount: editingExpense.amount,
                payment_method: editingExpense.payment_method,
                reference_number: editingExpense.reference_number,
                description: editingExpense.description,
                notes: editingExpense.notes,
                status: editingExpense.status,
            });

            // Set existing document
            if (editingExpense.document_url) {
                setFileList([{
                    uid: 'existing-0',
                    name: editingExpense.document_name || 'receipt.pdf',
                    status: 'done',
                    url: editingExpense.document_url,
                }]);
            }
        } else if (visible) {
            form.resetFields();
            resetFileState();
            form.setFieldsValue({
                status: 'pending',
                expense_date: dayjs(),
            });
        }
    }, [visible, editingExpense, form, resetFileState]);

    // File upload handlers
    const beforeUpload = useCallback((file: RcFile) => {
        // Check file type - allow common document types
        const allowedTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'application/pdf',
        ];

        if (!allowedTypes.includes(file.type)) {
            message.error('You can only upload images or PDF files!');
            return false;
        }

        const isLt10M = file.size / 1024 / 1024 < 10;
        if (!isLt10M) {
            message.error('File must be smaller than 10MB!');
            return false;
        }

        setUploadedFile(file);
        return false; // Prevent auto upload
    }, []);

    const handleChange: UploadProps['onChange'] = useCallback(({ fileList: newFileList }) => {
        if (newFileList.length > 0 && newFileList[0].originFileObj) {
            const file = newFileList[0].originFileObj;
            setUploadedFile(file);
        } else if (newFileList.length > 0 && newFileList[0].url) {
            // Existing file from edit mode
            setUploadedFile(null);
        } else {
            setUploadedFile(null);
        }

        setFileList(newFileList);
    }, []);

    const customRequest = useCallback(({ onSuccess }: any) => {
        setTimeout(() => {
            onSuccess && onSuccess("ok");
        }, 0);
    }, []);

    const handleSubmit = () => {
        form.validateFields().then((values) => {
            const payload: any = {
                ...values,
                expense_date: values.expense_date?.format('YYYY-MM-DD'),
            };

            // Add file to payload if uploaded
            if (uploadedFile) {
                payload.receiptFile = uploadedFile;
            }

            if (editingExpense) {
                editMutation.mutate({ _id: editingExpense._id, value: payload });
            } else {
                addMutation.mutate(payload);
            }
        });
    };

    return (
        <Modal
            title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
            open={visible}
            onOk={handleSubmit}
            onCancel={() => {
                resetFileState();
                onCancel();
            }}
            confirmLoading={addMutation.isPending || editMutation.isPending}
            width={700}
            okText={editingExpense ? 'Update' : 'Create'}
        >
            <Form
                form={form}
                layout="vertical"
                style={{ marginTop: 24 }}
            >
                <Form.Item
                    name="expense_date"
                    label="Expense Date"
                    rules={[{ required: true, message: 'Please select expense date' }]}
                >
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                    name="category"
                    label="Category"
                    rules={[{ required: true, message: 'Please select a category' }]}
                >
                    <Select placeholder="Select category">
                        <Option value="office">Office Supplies</Option>
                        <Option value="utilities">Utilities</Option>
                        <Option value="travel">Travel</Option>
                        <Option value="meals">Meals & Entertainment</Option>
                        <Option value="rent">Rent</Option>
                        <Option value="salaries">Salaries & Wages</Option>
                        <Option value="marketing">Marketing & Advertising</Option>
                        <Option value="professional_fees">Professional Fees</Option>
                        <Option value="insurance">Insurance</Option>
                        <Option value="maintenance">Maintenance & Repairs</Option>
                        <Option value="other">Other</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="account_id"
                    label="Expense Account"
                    rules={[{ required: true, message: 'Please select an expense account' }]}
                >
                    <Select placeholder="Select expense account" showSearch optionFilterProp="children">
                        {accounts.map((account: any) => (
                            <Option key={account._id} value={account._id}>
                                {account.code} - {account.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="vendor_id"
                    label="Vendor"
                >
                    <Select placeholder="Select vendor (optional)" showSearch optionFilterProp="children" allowClear>
                        {vendors.map((vendor: any) => (
                            <Option key={vendor._id} value={vendor._id}>
                                {vendor.name}
                            </Option>
                        ))}
                    </Select>
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
                    name="reference_number"
                    label="Reference Number"
                >
                    <Input placeholder="Receipt/reference number" />
                </Form.Item>

                <Form.Item
                    name="description"
                    label="Description"
                    rules={[{ required: true, message: 'Please enter description' }]}
                >
                    <Input placeholder="Brief description of the expense" />
                </Form.Item>

                <Form.Item
                    name="notes"
                    label="Notes"
                >
                    <TextArea rows={3} placeholder="Additional notes" />
                </Form.Item>

                <Form.Item
                    label="Receipt/Attachment (Optional)"
                    extra="Upload an image or PDF. Max 10MB."
                >
                    <Upload
                        fileList={fileList}
                        beforeUpload={beforeUpload}
                        onChange={handleChange}
                        maxCount={1}
                        accept="image/*,.pdf"
                        customRequest={customRequest}
                    >
                        <Button icon={<UploadOutlined />}>Upload Receipt</Button>
                    </Upload>
                </Form.Item>

                <Form.Item
                    name="status"
                    label="Status"
                    initialValue="pending"
                    rules={[{ required: true, message: 'Please select status' }]}
                >
                    <Select>
                        <Option value="draft">Draft</Option>
                        <Option value="pending">Pending</Option>
                        <Option value="approved">Approved</Option>
                        <Option value="paid">Paid</Option>
                        <Option value="rejected">Rejected</Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ExpenseForm;