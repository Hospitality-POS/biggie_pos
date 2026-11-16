import React, { useEffect } from "react";
import { Drawer, Form, Input, Select, DatePicker, InputNumber, Button, Space, App } from "antd";
import { SaveOutlined, CloseOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
    createPettyCashTransaction,
    updatePettyCashTransaction,
    PettyCashTransaction,
    PettyCashTransactionType,
    PettyCashPaymentMethod,
    PettyCashCategory,
    CreatePettyCashParams,
    UpdatePettyCashParams,
} from "@services/accounting/pettyCash";
import { fetchAllUsersList } from "@services/users";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

interface PettyCashFormDrawerProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    transaction?: PettyCashTransaction | null;
    onSuccess: () => void;
}

const PettyCashFormDrawer: React.FC<PettyCashFormDrawerProps> = ({
    open,
    setOpen,
    transaction,
    onSuccess,
}) => {
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const queryClient = useQueryClient();

    // Fetch shop users for payee selection
    const { data: usersData } = useQuery({
        queryKey: ['users'],
        queryFn: () => fetchAllUsersList({}),
        enabled: open,
    });

    const createMutation = useMutation({
        mutationFn: createPettyCashTransaction,
        onSuccess: () => {
            message.success("Petty cash transaction created successfully");
            onSuccess();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdatePettyCashParams }) =>
            updatePettyCashTransaction(id, data),
        onSuccess: () => {
            message.success("Petty cash transaction updated successfully");
            onSuccess();
        },
    });

    useEffect(() => {
        if (open && transaction) {
            form.setFieldsValue({
                ...transaction,
                transaction_date: dayjs(transaction.transaction_date),
                receipt_date: transaction.receipt_date ? dayjs(transaction.receipt_date) : undefined,
            });
        } else if (open) {
            form.resetFields();
            form.setFieldsValue({
                transaction_date: dayjs(),
                currency: "KES",
                payment_method: "Cash",
                category: "Other",
                status: "Pending",
            });
        }
    }, [open, transaction, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const submitData = {
                ...values,
                transaction_date: values.transaction_date.format("YYYY-MM-DD"),
                receipt_date: values.receipt_date?.format("YYYY-MM-DD"),
            };

            if (transaction) {
                updateMutation.mutate({ id: transaction._id, data: submitData });
            } else {
                createMutation.mutate(submitData as CreatePettyCashParams);
            }
        } catch (error) {
            console.error("Validation failed:", error);
        }
    };

    const isLoading = createMutation.isLoading || updateMutation.isLoading;

    return (
        <Drawer
            title={transaction ? "Edit Petty Cash Transaction" : "New Petty Cash Transaction"}
            width={600}
            open={open}
            onClose={() => setOpen(false)}
            extra={
                <Space>
                    <Button icon={<CloseOutlined />} onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSubmit}
                        loading={isLoading}
                    >
                        {transaction ? "Update" : "Create"}
                    </Button>
                </Space>
            }
        >
            <Form
                form={form}
                layout="vertical"
                requiredMark={false}
            >
                <Form.Item
                    name="transaction_date"
                    label="Transaction Date"
                    rules={[{ required: true, message: "Please select transaction date" }]}
                >
                    <DatePicker style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item
                    name="transaction_type"
                    label="Transaction Type"
                    rules={[{ required: true, message: "Please select transaction type" }]}
                >
                    <Select placeholder="Select transaction type">
                        <Option value="Deposit">Deposit</Option>
                        <Option value="Withdrawal">Withdrawal</Option>
                        <Option value="Expense">Expense</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="amount"
                    label="Amount"
                    rules={[
                        { required: true, message: "Please enter amount" },
                        { type: "number", min: 0.01, message: "Amount must be greater than 0" },
                    ]}
                >
                    <InputNumber
                        style={{ width: "100%" }}
                        formatter={(value) => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                        parser={(value) => value!.replace(/KES\s?|(,*)/g, "")}
                        precision={2}
                    />
                </Form.Item>

                <Form.Item
                    name="currency"
                    label="Currency"
                    initialValue="KES"
                >
                    <Select>
                        <Option value="KES">KES</Option>
                        <Option value="USD">USD</Option>
                        <Option value="EUR">EUR</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="description"
                    label="Description"
                    rules={[{ required: true, message: "Please enter description" }]}
                >
                    <Input placeholder="Enter transaction description" />
                </Form.Item>

                <Form.Item
                    name="category"
                    label="Category"
                    rules={[{ required: true, message: "Please select category" }]}
                >
                    <Select placeholder="Select category">
                        <Option value="Office Supplies">Office Supplies</Option>
                        <Option value="Transport">Transport</Option>
                        <Option value="Meals">Meals</Option>
                        <Option value="Utilities">Utilities</Option>
                        <Option value="Repairs">Repairs</Option>
                        <Option value="Other">Other</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="payee_type"
                    label="Payee Type"
                    rules={[{ required: true, message: "Please select payee type" }]}
                >
                    <Select 
                        placeholder="Select payee type"
                        onChange={(value) => {
                            if (value === "custom") {
                                form.setFieldsValue({
                                    payee_user_id: undefined,
                                    payee_name: ""
                                });
                            } else if (value === "user") {
                                form.setFieldsValue({
                                    payee_name: ""
                                });
                            }
                        }}
                    >
                        <Option value="user">Shop User</Option>
                        <Option value="custom">Custom Payee</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) => prevValues.payee_type !== currentValues.payee_type}
                >
                    {({ getFieldValue }) => {
                        const payeeType = getFieldValue('payee_type');
                        if (payeeType === "user") {
                            return (
                                <Form.Item
                                    name="payee_user_id"
                                    label="Select User"
                                    rules={[{ required: true, message: "Please select a user" }]}
                                >
                                    <Select
                                        placeholder="Select shop user"
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                                        }
                                        onChange={(value) => {
                                            const selectedUser = usersData?.find((user: any) => user._id === value);
                                            if (selectedUser) {
                                                form.setFieldsValue({
                                                    payee_name: selectedUser.fullname || selectedUser.username
                                                });
                                            }
                                        }}
                                    >
                                        {usersData?.map((user: any) => (
                                            <Option key={user._id} value={user._id}>
                                                {user.fullname || user.username || user.email}
                                                {user.role?.role_type && ` (${user.role.role_type})`}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            );
                        }
                        return null;
                    }}
                </Form.Item>

                <Form.Item
                    name="payee_name"
                    label="Payee Name"
                    rules={[
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                const payeeType = getFieldValue('payee_type');
                                if (payeeType === "custom" && !value) {
                                    return Promise.reject(new Error('Please enter payee name for custom payee'));
                                }
                                return Promise.resolve();
                            },
                        }),
                    ]}
                >
                    <Input 
                        placeholder={
                            form.getFieldValue('payee_type') === "user" 
                                ? "Auto-populated from selected user" 
                                : "Enter payee name"
                        }
                        disabled={form.getFieldValue('payee_type') === "user"}
                    />
                </Form.Item>

                <Form.Item
                    name="payment_method"
                    label="Payment Method"
                    rules={[{ required: true, message: "Please select payment method" }]}
                >
                    <Select placeholder="Select payment method">
                        <Option value="Cash">Cash</Option>
                        <Option value="M-Pesa">M-Pesa</Option>
                        <Option value="Bank_Transfer">Bank Transfer</Option>
                        <Option value="Card">Card</Option>
                        <Option value="Cheque">Cheque</Option>
                        <Option value="Other">Other</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="receipt_no"
                    label="Receipt Number"
                >
                    <Input placeholder="Enter receipt number" />
                </Form.Item>

                <Form.Item
                    name="receipt_date"
                    label="Receipt Date"
                >
                    <DatePicker style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item
                    name="notes"
                    label="Notes"
                >
                    <TextArea rows={3} placeholder="Enter additional notes" />
                </Form.Item>

                {!transaction && (
                    <Form.Item
                        name="status"
                        label="Status"
                        initialValue="Pending"
                    >
                        <Select>
                            <Option value="Pending">Pending</Option>
                            <Option value="Approved">Approved</Option>
                        </Select>
                    </Form.Item>
                )}
            </Form>
        </Drawer>
    );
};

export default PettyCashFormDrawer;
