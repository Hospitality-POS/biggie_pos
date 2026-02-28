import React, { useState } from "react";
import {
    Modal, Form, Input, InputNumber, Select, DatePicker,
    Button, Space, App, Row, Col, Tabs, Divider, Tag,
} from "antd";
import {
    DollarOutlined, ArrowDownOutlined, ArrowUpOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllAccounts } from "@services/accounting/accounts";
import { postDirectIncome, postExpense, settleInvoice } from "@services/accounting/income";
import { getAllInvoices } from "@services/accounting/invoice";
import dayjs from "dayjs";

const { TextArea } = Input;

interface Props {
    open: boolean;
    onClose: () => void;
}

// ── Shared: payment method selector data ─────────────────────────────────────
// Payment methods come from /payment-methods — reuse existing service
import { fetchAllPaymentMethods } from "@services/paymentMethod";

const ManualIncomeModal: React.FC<Props> = ({ open, onClose }) => {
    const [incomeForm] = Form.useForm();
    const [expenseForm] = Form.useForm();
    const [settleForm] = Form.useForm();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("income");

    // ── Shared data ─────────────────────────────────────────────────────────────
    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts"],
        queryFn: () => getAllAccounts({}),
        enabled: open,
    });
    const allAccounts = accountsData?.accounts || [];
    const revenueAccts = allAccounts.filter((a: any) => a.account_type === "REVENUE" && a.is_active);
    const expenseAccts = allAccounts.filter((a: any) => a.account_type === "EXPENSE" && a.is_active);

    const { data: methodsData } = useQuery({
        queryKey: ["payment-methods"],
        queryFn: () => fetchAllPaymentMethods({}),
        enabled: open,
    });
    const paymentMethods = methodsData || [];

    // Unpaid / partially paid customer invoices for settle tab
    const { data: invoicesData } = useQuery({
        queryKey: ["invoices-unsettled"],
        queryFn: () => getAllInvoices({ direction: "customer", status: "Pending" }),
        enabled: open && activeTab === "settle",
    });
    const openInvoices = invoicesData?.invoices || [];

    // ── Account selector options ─────────────────────────────────────────────
    const methodOptions = paymentMethods.map((m: any) => ({
        label: m.name,
        value: m._id,
    }));
    const revenueOptions = revenueAccts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));
    const expenseOptions = expenseAccts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));
    const invoiceOptions = openInvoices.map((inv: any) => ({
        label: `${inv.order_no} — ${inv.counterparty_name || "Customer"} — KES ${inv.amount_due?.toFixed(2)}`,
        value: inv._id,
        amount_due: inv.amount_due,
    }));

    // ── Mutations ────────────────────────────────────────────────────────────────
    const incomeMutation = useMutation({
        mutationFn: postDirectIncome,
        onSuccess: () => {
            incomeForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ["income-history"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            onClose();
        },
    });

    const expenseMutation = useMutation({
        mutationFn: postExpense,
        onSuccess: () => {
            expenseForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ["income-history"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            onClose();
        },
    });

    const settleMutation = useMutation({
        mutationFn: ({ invoiceId, data }: { invoiceId: string; data: any }) =>
            settleInvoice(invoiceId, data),
        onSuccess: () => {
            settleForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
            queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            onClose();
        },
    });

    // ── Submit handlers ───────────────────────────────────────────────────────
    const handleIncome = async () => {
        const v = await incomeForm.validateFields();
        incomeMutation.mutate({
            method_id: v.method_id,
            revenue_account_id: v.revenue_account_id,
            amount: v.amount,
            description: v.description,
            reference: v.reference,
            income_date: v.income_date?.toISOString(),
            notes: v.notes,
        });
    };

    const handleExpense = async () => {
        const v = await expenseForm.validateFields();
        expenseMutation.mutate({
            method_id: v.method_id,
            expense_account_id: v.expense_account_id,
            amount: v.amount,
            vat_amount: v.vat_amount || 0,
            description: v.description,
            reference: v.reference,
            expense_date: v.expense_date?.toISOString(),
            notes: v.notes,
        });
    };

    const handleSettle = async () => {
        const v = await settleForm.validateFields();
        settleMutation.mutate({
            invoiceId: v.invoice_id,
            data: {
                method_id: v.method_id,
                amount: v.amount,
                reference: v.reference,
                notes: v.notes,
            },
        });
    };

    const isLoading =
        incomeMutation.isPending ||
        expenseMutation.isPending ||
        settleMutation.isPending;

    const handleOk = () => {
        if (activeTab === "income") handleIncome();
        if (activeTab === "expense") handleExpense();
        if (activeTab === "settle") handleSettle();
    };

    const handleCancel = () => {
        incomeForm.resetFields();
        expenseForm.resetFields();
        settleForm.resetFields();
        onClose();
    };

    // ── Tab items ─────────────────────────────────────────────────────────────
    const tabItems = [
        {
            key: "income",
            label: <Space><ArrowDownOutlined style={{ color: "#52c41a" }} />Post Income</Space>,
            children: (
                <Form form={incomeForm} layout="vertical" initialValues={{ income_date: dayjs() }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="income_date" label="Date" rules={[{ required: true }]}>
                                <DatePicker showTime style={{ width: "100%" }} format="DD MMM YYYY HH:mm" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="reference" label="Reference / Receipt No.">
                                <Input placeholder="RCP-001" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Consulting fee — Acme Ltd" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="method_id" label="Received Via (DR)"
                                rules={[{ required: true }]}
                                tooltip="Which payment method / bank account received the money?"
                            >
                                <Select showSearch placeholder="M-Pesa / Bank / Cash"
                                    options={methodOptions} optionFilterProp="label" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="revenue_account_id" label="Income Account (CR)"
                                rules={[{ required: true }]}
                                tooltip="Which revenue account does this belong to?"
                            >
                                <Select showSearch placeholder="Revenue account"
                                    options={revenueOptions} optionFilterProp="label" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="amount" label="Amount (KES)" rules={[{ required: true }, { type: "number", min: 0.01 }]}>
                        <InputNumber style={{ width: "100%" }} min={0.01} precision={2} placeholder="0.00"
                            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                            parser={(v) => v!.replace(/,/g, "") as any} />
                    </Form.Item>

                    <Form.Item name="notes" label="Notes">
                        <TextArea rows={2} />
                    </Form.Item>
                </Form>
            ),
        },
        {
            key: "expense",
            label: <Space><ArrowUpOutlined style={{ color: "#ff4d4f" }} />Post Expense</Space>,
            children: (
                <Form form={expenseForm} layout="vertical" initialValues={{ expense_date: dayjs() }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="expense_date" label="Date" rules={[{ required: true }]}>
                                <DatePicker showTime style={{ width: "100%" }} format="DD MMM YYYY HH:mm" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="reference" label="Reference">
                                <Input placeholder="Cheque / M-Pesa ref" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Office rent — January 2025" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="method_id" label="Paid From (CR)"
                                rules={[{ required: true }]}
                                tooltip="Which account was debited to make this payment?"
                            >
                                <Select showSearch placeholder="M-Pesa / Bank / Cash"
                                    options={methodOptions} optionFilterProp="label" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="expense_account_id" label="Expense Account (DR)"
                                rules={[{ required: true }]}
                                tooltip="Which expense category is this?"
                            >
                                <Select showSearch placeholder="Expense account"
                                    options={expenseOptions} optionFilterProp="label" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="amount" label="Net Amount (KES)" rules={[{ required: true }, { type: "number", min: 0.01 }]}>
                                <InputNumber style={{ width: "100%" }} min={0.01} precision={2} placeholder="0.00"
                                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                    parser={(v) => v!.replace(/,/g, "") as any} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="vat_amount" label="Input VAT (optional)"
                                tooltip="VAT you can reclaim — auto-posted to VAT Input account">
                                <InputNumber style={{ width: "100%" }} min={0} precision={2} placeholder="0.00"
                                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                    parser={(v) => v!.replace(/,/g, "") as any} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="notes" label="Notes">
                        <TextArea rows={2} />
                    </Form.Item>
                </Form>
            ),
        },
        {
            key: "settle",
            label: <Space><DollarOutlined style={{ color: "#1890ff" }} />Settle Invoice</Space>,
            children: (
                <Form form={settleForm} layout="vertical">
                    <Form.Item
                        name="invoice_id" label="Invoice to Settle"
                        rules={[{ required: true }]}
                        tooltip="Select an outstanding customer invoice to record payment against"
                    >
                        <Select showSearch placeholder="Select invoice"
                            options={invoiceOptions} optionFilterProp="label" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="method_id" label="Payment Method" rules={[{ required: true }]}>
                                <Select showSearch placeholder="M-Pesa / Bank / Cash"
                                    options={methodOptions} optionFilterProp="label" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="amount" label="Amount (KES)" rules={[{ required: true }, { type: "number", min: 0.01 }]}>
                                <InputNumber style={{ width: "100%" }} min={0.01} precision={2} placeholder="0.00"
                                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                    parser={(v) => v!.replace(/,/g, "") as any} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="reference" label="Reference">
                        <Input placeholder="Transaction / cheque reference" />
                    </Form.Item>
                    <Form.Item name="notes" label="Notes">
                        <TextArea rows={2} />
                    </Form.Item>
                </Form>
            ),
        },
    ];

    return (
        <Modal
            open={open}
            onCancel={handleCancel}
            title={
                <Space>
                    <DollarOutlined style={{ color: "#52c41a" }} />
                    Finance Entry
                </Space>
            }
            width={620}
            footer={[
                <Button key="cancel" onClick={handleCancel}>Cancel</Button>,
                <Button
                    key="submit" type="primary" loading={isLoading} onClick={handleOk}
                    style={
                        activeTab === "income" ? { background: "#52c41a", borderColor: "#52c41a" } :
                            activeTab === "expense" ? { background: "#ff4d4f", borderColor: "#ff4d4f" } :
                                {}
                    }
                >
                    {activeTab === "income" ? "Post Income" :
                        activeTab === "expense" ? "Post Expense" :
                            "Settle Invoice"}
                </Button>,
            ]}
            destroyOnClose
        >
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="small"
                style={{ marginTop: -8 }}
            />
        </Modal>
    );
};

export default ManualIncomeModal;