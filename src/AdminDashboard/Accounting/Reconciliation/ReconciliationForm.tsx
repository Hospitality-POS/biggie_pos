import React, { useEffect } from 'react';
import { Form, Input, Select, InputNumber, Modal, DatePicker, Alert, message } from 'antd';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { addNewReconciliation, updateReconciliation } from '@services/accounting/reconciliation';
import { fetchAllAccounts } from '@services/accounting/accounts';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

interface ReconciliationFormProps {
    visible: boolean;
    onCancel: () => void;
    editingReconciliation?: any;
}

const ReconciliationForm: React.FC<ReconciliationFormProps> = ({
    visible,
    onCancel,
    editingReconciliation
}) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Fetch accounts (only bank/cash accounts)
    const { data: accountsData } = useQuery({
        queryKey: ['chartOfAccounts'],
        queryFn: () => fetchAllAccounts({}),
        enabled: visible,
    });

    // Filter for bank and cash accounts
    const accounts = (accountsData?.data || []).filter((acc: any) =>
        (acc.name?.toLowerCase().includes('bank') ||
            acc.name?.toLowerCase().includes('cash') ||
            acc.account_type === 'Asset') &&
        !acc.is_header_account &&
        acc.is_active
    );

    const addMutation = useMutation({
        mutationFn: addNewReconciliation,
        onSuccess: (data) => {
            console.log('Reconciliation created:', data);
            queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
            form.resetFields();
            onCancel();
            message.success('Reconciliation started successfully');

            // Navigate with /admin prefix
            const reconciliationId = data?.data?._id;
            if (reconciliationId) {
                console.log('Navigating to:', `/admin/accounting/reconciliation/${reconciliationId}`);
                navigate(`/admin/accounting/reconciliation/${reconciliationId}`);
            }
        },
        onError: (error: any) => {
            console.error('Error creating reconciliation:', error);
            message.error(error?.response?.data?.message || 'Failed to create reconciliation');
        }
    });

    const editMutation = useMutation({
        mutationFn: updateReconciliation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
            form.resetFields();
            onCancel();
            message.success('Reconciliation updated successfully');
        },
        onError: (error: any) => {
            message.error(error?.response?.data?.message || 'Failed to update reconciliation');
        }
    });

    useEffect(() => {
        if (visible && editingReconciliation) {
            form.setFieldsValue({
                account_id: editingReconciliation.account_id?._id || editingReconciliation.account_id,
                date_range: [
                    dayjs(editingReconciliation.start_date),
                    dayjs(editingReconciliation.end_date)
                ],
                opening_balance: editingReconciliation.opening_balance,
                statement_balance: editingReconciliation.statement_balance,
                notes: editingReconciliation.notes,
            });
        } else if (visible) {
            form.resetFields();
            // Set default date range to current month
            const startOfMonth = dayjs().startOf('month');
            const endOfMonth = dayjs().endOf('month');
            form.setFieldsValue({
                date_range: [startOfMonth, endOfMonth],
                opening_balance: 0,
                statement_balance: 0,
            });
        }
    }, [visible, editingReconciliation, form]);

    const handleSubmit = () => {
        form.validateFields().then((values) => {
            const payload = {
                account_id: values.account_id,
                start_date: values.date_range[0].format('YYYY-MM-DD'),
                end_date: values.date_range[1].format('YYYY-MM-DD'),
                opening_balance: parseFloat(values.opening_balance) || 0,
                statement_balance: parseFloat(values.statement_balance) || 0,
                notes: values.notes,
            };

            console.log('Submitting reconciliation:', payload);

            if (editingReconciliation) {
                editMutation.mutate({
                    _id: editingReconciliation._id,
                    value: payload
                });
            } else {
                addMutation.mutate(payload);
            }
        }).catch((error) => {
            console.error('Validation error:', error);
            message.error('Please fill in all required fields');
        });
    };

    return (
        <Modal
            title={editingReconciliation ? 'Update Reconciliation' : 'Start Bank Reconciliation'}
            open={visible}
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={addMutation.isPending || editMutation.isPending}
            width={600}
            okText={editingReconciliation ? 'Update' : 'Start Reconciliation'}
        >
            <Alert
                message="Bank Reconciliation"
                description="Select the bank account and period you want to reconcile. The system will load all transactions for this period."
                type="info"
                showIcon
                style={{ marginBottom: 16, marginTop: 16 }}
            />

            <Form
                form={form}
                layout="vertical"
            >
                <Form.Item
                    name="account_id"
                    label="Bank Account"
                    rules={[{ required: true, message: 'Please select a bank account' }]}
                >
                    <Select
                        placeholder="Select bank account"
                        showSearch
                        optionFilterProp="children"
                        size="large"
                        filterOption={(input, option: any) =>
                            (option?.children?.toString() || '').toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {accounts.map((account: any) => (
                            <Option key={account._id} value={account._id}>
                                {account.code} - {account.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="date_range"
                    label="Reconciliation Period"
                    rules={[{ required: true, message: 'Please select a date range' }]}
                >
                    <RangePicker
                        style={{ width: '100%' }}
                        size="large"
                        format="YYYY-MM-DD"
                    />
                </Form.Item>

                <Form.Item
                    name="opening_balance"
                    label="Opening Balance"
                    rules={[{ required: true, message: 'Please enter opening balance' }]}
                    tooltip="The balance at the start of the reconciliation period"
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        placeholder="0.00"
                        prefix="KES"
                        size="large"
                        precision={2}
                    />
                </Form.Item>

                <Form.Item
                    name="statement_balance"
                    label="Bank Statement Ending Balance"
                    rules={[{ required: true, message: 'Please enter statement balance' }]}
                    tooltip="The ending balance from your bank statement"
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        placeholder="0.00"
                        prefix="KES"
                        size="large"
                        precision={2}
                    />
                </Form.Item>

                <Form.Item
                    name="notes"
                    label="Notes"
                >
                    <TextArea
                        rows={3}
                        placeholder="Any additional notes about this reconciliation"
                    />
                </Form.Item>
            </Form>

            <Alert
                message="Next Steps"
                description="After starting the reconciliation, you'll be able to match transactions from your books with your bank statement."
                type="success"
                showIcon
                style={{ marginTop: 16 }}
            />
        </Modal>
    );
};

export default ReconciliationForm;