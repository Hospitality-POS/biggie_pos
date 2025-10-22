import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Modal, DatePicker, Button, Table, InputNumber, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { addNewJournal, editJournal } from '@services/accounting/journals';
import { fetchAllAccounts } from '@services/accounting/accounts';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface JournalFormProps {
    visible: boolean;
    onCancel: () => void;
    editingJournal: any;
}

const JournalForm: React.FC<JournalFormProps> = ({ visible, onCancel, editingJournal }) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();
    const [journalEntries, setJournalEntries] = useState<any[]>([]);

    // Fetch accounts - filter out header accounts
    const { data: accountsData } = useQuery({
        queryKey: ['chartOfAccounts'],
        queryFn: () => fetchAllAccounts({}),
        enabled: visible,
    });

    const accounts = (accountsData?.data || []).filter((acc: any) =>
        !acc.is_header_account && acc.is_active
    );

    const addMutation = useMutation({
        mutationFn: addNewJournal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journals'] });
            form.resetFields();
            setJournalEntries([]);
            onCancel();
        },
        onError: (error: any) => {
            message.error(error?.response?.data?.message || 'Failed to create journal entry');
        }
    });

    const editMutation = useMutation({
        mutationFn: editJournal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journals'] });
            form.resetFields();
            setJournalEntries([]);
            onCancel();
        },
        onError: (error: any) => {
            message.error(error?.response?.data?.message || 'Failed to update journal entry');
        }
    });

    useEffect(() => {
        if (visible && editingJournal) {
            form.setFieldsValue({
                journal_date: editingJournal.entry_date ? dayjs(editingJournal.entry_date) : null,
                type: editingJournal.entry_type || editingJournal.type,
                reference: editingJournal.reference,
                description: editingJournal.description,
                status: editingJournal.status,
            });

            // Map items from backend format
            const mappedEntries = (editingJournal.items || []).map((item: any, index: number) => ({
                key: item._id || Date.now() + index,
                account_id: item.account_id?._id || item.account_id,
                description: item.description,
                debit: item.debit || 0,
                credit: item.credit || 0,
            }));

            setJournalEntries(mappedEntries);
        } else if (visible) {
            form.resetFields();
            form.setFieldsValue({
                status: 'draft',
                journal_date: dayjs(),
                type: 'general',
            });
            setJournalEntries([]);
        }
    }, [visible, editingJournal, form]);

    const handleAddEntry = () => {
        const newEntry = {
            key: Date.now(),
            account_id: null,
            description: '',
            debit: 0,
            credit: 0,
        };
        setJournalEntries([...journalEntries, newEntry]);
    };

    const handleDeleteEntry = (key: number) => {
        setJournalEntries(journalEntries.filter(entry => entry.key !== key));
    };

    const handleEntryChange = (key: number, field: string, value: any) => {
        const updatedEntries = journalEntries.map(entry => {
            if (entry.key === key) {
                return { ...entry, [field]: value };
            }
            return entry;
        });
        setJournalEntries(updatedEntries);
    };

    const calculateTotals = () => {
        const totalDebit = journalEntries.reduce((sum, entry) => sum + (parseFloat(entry.debit) || 0), 0);
        const totalCredit = journalEntries.reduce((sum, entry) => sum + (parseFloat(entry.credit) || 0), 0);
        return { totalDebit, totalCredit };
    };

    const { totalDebit, totalCredit } = calculateTotals();
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

    const entryColumns = [
        {
            title: 'Account',
            dataIndex: 'account_id',
            key: 'account_id',
            width: 250,
            render: (value: string, record: any) => (
                <Select
                    value={value}
                    onChange={(val) => handleEntryChange(record.key, 'account_id', val)}
                    placeholder="Select account"
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="children"
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
            ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (text: string, record: any) => (
                <Input
                    value={text}
                    onChange={(e) => handleEntryChange(record.key, 'description', e.target.value)}
                    placeholder="Entry description"
                />
            ),
        },
        {
            title: 'Debit',
            dataIndex: 'debit',
            key: 'debit',
            width: 150,
            render: (value: number, record: any) => (
                <InputNumber
                    value={value}
                    onChange={(val) => handleEntryChange(record.key, 'debit', val || 0)}
                    min={0}
                    prefix="KES"
                    style={{ width: '100%' }}
                    precision={2}
                />
            ),
        },
        {
            title: 'Credit',
            dataIndex: 'credit',
            key: 'credit',
            width: 150,
            render: (value: number, record: any) => (
                <InputNumber
                    value={value}
                    onChange={(val) => handleEntryChange(record.key, 'credit', val || 0)}
                    min={0}
                    prefix="KES"
                    style={{ width: '100%' }}
                    precision={2}
                />
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 80,
            render: (_: any, record: any) => (
                <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteEntry(record.key)}
                />
            ),
        },
    ];

    const handleSubmit = () => {
        if (!isBalanced) {
            message.error('Journal entry must be balanced! Debits must equal credits.');
            return;
        }

        if (journalEntries.length === 0) {
            message.error('Please add at least one journal entry line.');
            return;
        }

        // Validate all entries have accounts
        const invalidEntry = journalEntries.find(entry => !entry.account_id);
        if (invalidEntry) {
            message.error('All journal entries must have an account selected.');
            return;
        }

        form.validateFields().then((values) => {
            const payload = {
                journal_date: values.journal_date?.format('YYYY-MM-DD'),
                type: values.type,
                reference: values.reference,
                description: values.description,
                status: values.status,
                entries: journalEntries.map(entry => ({
                    account_id: entry.account_id,
                    description: entry.description,
                    debit: parseFloat(entry.debit) || 0,
                    credit: parseFloat(entry.credit) || 0,
                })),
                total_debit: totalDebit,
                total_credit: totalCredit,
            };

            if (editingJournal) {
                editMutation.mutate({ _id: editingJournal._id, value: payload });
            } else {
                addMutation.mutate(payload);
            }
        }).catch((error) => {
            message.error('Please fill in all required fields.');
        });
    };

    return (
        <Modal
            title={editingJournal ? 'Edit Journal Entry' : 'Create New Journal Entry'}
            open={visible}
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={addMutation.isPending || editMutation.isPending}
            width={1000}
            okText={editingJournal ? 'Update' : 'Create'}
            okButtonProps={{ disabled: !isBalanced }}
        >
            <Form
                form={form}
                layout="vertical"
                style={{ marginTop: 24 }}
            >
                <Form.Item
                    name="journal_date"
                    label="Journal Date"
                    rules={[{ required: true, message: 'Please select journal date' }]}
                >
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                    name="type"
                    label="Journal Type"
                    rules={[{ required: true, message: 'Please select journal type' }]}
                >
                    <Select placeholder="Select journal type">
                        <Option value="general">General Journal</Option>
                        <Option value="adjusting">Adjusting Entry</Option>
                        <Option value="closing">Closing Entry</Option>
                        <Option value="reversing">Reversing Entry</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="reference"
                    label="Reference Number"
                >
                    <Input placeholder="Reference/document number" />
                </Form.Item>

                <Form.Item
                    name="description"
                    label="Description"
                    rules={[{ required: true, message: 'Please enter description' }]}
                >
                    <TextArea rows={2} placeholder="Brief description of the journal entry" />
                </Form.Item>

                <Form.Item label="Journal Entries">
                    <Table
                        columns={entryColumns}
                        dataSource={journalEntries}
                        pagination={false}
                        size="small"
                        rowKey="key"
                    />
                    <Button
                        type="dashed"
                        onClick={handleAddEntry}
                        icon={<PlusOutlined />}
                        style={{ width: '100%', marginTop: 8 }}
                    >
                        Add Entry Line
                    </Button>
                </Form.Item>

                <Form.Item>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 16,
                        fontWeight: 'bold',
                        padding: '16px',
                        backgroundColor: isBalanced ? '#f6ffed' : '#fff1f0',
                        border: `1px solid ${isBalanced ? '#b7eb8f' : '#ffa39e'}`,
                        borderRadius: '4px'
                    }}>
                        <div>
                            <span>Total Debit: KES {totalDebit.toFixed(2)}</span>
                        </div>
                        <div>
                            <span>Total Credit: KES {totalCredit.toFixed(2)}</span>
                        </div>
                        <div>
                            <span style={{ color: isBalanced ? '#52c41a' : '#f5222d' }}>
                                {isBalanced ? '✓ Balanced' : `✗ Difference: KES ${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
                            </span>
                        </div>
                    </div>
                </Form.Item>

                <Form.Item
                    name="status"
                    label="Status"
                    initialValue="draft"
                    rules={[{ required: true, message: 'Please select status' }]}
                >
                    <Select>
                        <Option value="draft">Draft</Option>
                        <Option value="posted">Posted</Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default JournalForm;