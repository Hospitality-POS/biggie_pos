import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Modal, Switch } from 'antd';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { addNewAccount, editAccount, fetchAllAccounts } from '@services/accounting/accounts';

const { Option } = Select;
const { TextArea } = Input;

interface AccountFormProps {
    visible: boolean;
    onCancel: () => void;
    editingAccount: any;
}

// Category options based on account type
const getCategoryOptions = (accountType: string) => {
    const categoryMap: Record<string, string[]> = {
        'Asset': [
            'Current Asset',
            'Fixed Asset',
            'Other Asset',
            'Cash',
            'Bank',
            'Accounts Receivable',
            'Inventory'
        ],
        'Liability': [
            'Current Liability',
            'Long-term Liability',
            'Accounts Payable',
            'Credit Card',
            'Tax Payable'
        ],
        'Equity': [
            "Owner's Equity",
            'Retained Earnings'
        ],
        'Revenue': [
            'Sales Revenue',
            'Service Revenue',
            'Other Income'
        ],
        'Expense': [
            'Operating Expense',
            'Administrative Expense',
            'Cost of Sales'
        ],
        'Cost of Goods Sold': [
            'Cost of Sales'
        ]
    };

    return categoryMap[accountType] || [];
};

const AccountForm: React.FC<AccountFormProps> = ({ visible, onCancel, editingAccount }) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();
    const [selectedAccountType, setSelectedAccountType] = useState<string>('');

    // Fetch accounts for parent selection
    const { data: accountsData } = useQuery({
        queryKey: ['chartOfAccounts'],
        queryFn: () => fetchAllAccounts({}),
        enabled: visible,
    });

    const accounts = accountsData?.data || [];

    const addMutation = useMutation({
        mutationFn: addNewAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
            form.resetFields();
            onCancel();
        },
    });

    const editMutation = useMutation({
        mutationFn: editAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
            form.resetFields();
            onCancel();
        },
    });

    useEffect(() => {
        if (visible && editingAccount) {
            form.setFieldsValue({
                code: editingAccount.code,
                name: editingAccount.name,
                account_type: editingAccount.account_type,
                category: editingAccount.category,
                parent_account: editingAccount.parent_account?._id || editingAccount.parent_account || null,
                description: editingAccount.description,
                currency: editingAccount.currency || 'KES',
                is_active: editingAccount.is_active ?? true,
            });
            setSelectedAccountType(editingAccount.account_type || '');
        } else if (visible) {
            form.resetFields();
            form.setFieldsValue({
                is_active: true,
                currency: 'KES',
            });
            setSelectedAccountType('');
        }
    }, [visible, editingAccount, form]);

    const handleAccountTypeChange = (value: string) => {
        setSelectedAccountType(value);
        // Reset category when account type changes
        form.setFieldsValue({ category: undefined });
    };

    const handleSubmit = () => {
        form.validateFields().then((values) => {
            const payload = {
                code: values.code,
                name: values.name,
                account_type: values.account_type,
                category: values.category,
                parent_account: values.parent_account || null,
                description: values.description || '',
                currency: values.currency || 'KES',
                is_active: values.is_active,
            };

            if (editingAccount) {
                editMutation.mutate({ _id: editingAccount._id, value: payload });
            } else {
                addMutation.mutate(payload);
            }
        });
    };

    return (
        <Modal
            title={editingAccount ? 'Edit Account' : 'Add New Account'}
            open={visible}
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={addMutation.isPending || editMutation.isPending}
            width={600}
            okText={editingAccount ? 'Update' : 'Create'}
        >
            <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
                <Form.Item
                    name="code"
                    label="Account Code"
                    rules={[{ required: true, message: 'Please enter account code' }]}
                >
                    <Input placeholder="e.g., 3000" />
                </Form.Item>

                <Form.Item
                    name="name"
                    label="Account Name"
                    rules={[{ required: true, message: 'Please enter account name' }]}
                >
                    <Input placeholder="e.g., Owner's Capital" />
                </Form.Item>

                <Form.Item
                    name="account_type"
                    label="Account Type"
                    rules={[{ required: true, message: 'Please select account type' }]}
                >
                    <Select
                        placeholder="Select account type"
                        onChange={handleAccountTypeChange}
                    >
                        <Option value="Asset">Asset</Option>
                        <Option value="Liability">Liability</Option>
                        <Option value="Equity">Equity</Option>
                        <Option value="Revenue">Revenue</Option>
                        <Option value="Expense">Expense</Option>
                        <Option value="Cost of Goods Sold">Cost of Goods Sold</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="category"
                    label="Category"
                    rules={[{ required: true, message: 'Please select category' }]}
                >
                    <Select
                        placeholder="Select category"
                        disabled={!selectedAccountType}
                    >
                        {getCategoryOptions(selectedAccountType).map((category) => (
                            <Option key={category} value={category}>
                                {category}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item name="parent_account" label="Parent Account">
                    <Select
                        placeholder="Select parent account (optional)"
                        allowClear
                        showSearch
                        optionFilterProp="children"
                    >
                        {accounts
                            .filter((account: any) => account._id !== editingAccount?._id)
                            .map((account: any) => (
                                <Option key={account._id} value={account._id}>
                                    {account.code} - {account.name}
                                </Option>
                            ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="currency"
                    label="Currency"
                    rules={[{ required: true, message: 'Please select currency' }]}
                >
                    <Select placeholder="Select currency">
                        <Option value="KES">KES - Kenyan Shilling</Option>
                        <Option value="USD">USD - US Dollar</Option>
                        <Option value="EUR">EUR - Euro</Option>
                        <Option value="GBP">GBP - British Pound</Option>
                    </Select>
                </Form.Item>

                <Form.Item name="description" label="Description">
                    <TextArea rows={3} placeholder="Account description" />
                </Form.Item>

                <Form.Item name="is_active" label="Status" valuePropName="checked">
                    <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AccountForm;