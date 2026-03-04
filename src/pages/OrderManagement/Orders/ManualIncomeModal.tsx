import React, { useState } from "react";
import {
    Modal, Form, Input, InputNumber, Select, DatePicker,
    Button, Space, App, Row, Col, Tabs, Switch, Alert, DatePickerProps,
} from "antd";
import {
    DollarOutlined, ArrowDownOutlined, ArrowUpOutlined, FileTextOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllAccounts } from "@services/accounting/accounts";
import { postDirectIncome, postExpense, settleInvoice } from "@services/accounting/income";
import { getAllInvoices, createInvoice } from "@services/accounting/invoice";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { fetchAllCustomers } from "@services/customers";
import { fetchAllSuppliers } from "@services/supplier";
import dayjs from "dayjs";

const { TextArea } = Input;

interface Props {
    open: boolean;
    onClose: () => void;
}

const ManualIncomeModal: React.FC<Props> = ({ open, onClose }) => {
    const [incomeForm] = Form.useForm();
    const [expenseForm] = Form.useForm();
    const [settleForm] = Form.useForm();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("income");

    const [customerSearch, setCustomerSearch] = useState("");
    const [supplierSearch, setSupplierSearch] = useState("");

    // When supplier is selected on expense tab, show bill creation option
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [createSupplierBill, setCreateSupplierBill] = useState(true);

    const shopId = localStorage.getItem("shopId");

    // ── Data ──────────────────────────────────────────────────────────────────
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

    const { data: customersData, isFetching: customersFetching } = useQuery({
        queryKey: ["customers-dropdown", customerSearch],
        queryFn: () => fetchAllCustomers({ customer_name: customerSearch }),
        enabled: open && activeTab === "income",
        select: (res: any) => Array.isArray(res) ? res : (res?.customers || res?.data || []),
        staleTime: 30_000,
    });

    const { data: suppliersData, isFetching: suppliersFetching } = useQuery({
        queryKey: ["suppliers-dropdown", supplierSearch],
        queryFn: () => fetchAllSuppliers({ name: supplierSearch }),
        enabled: open && activeTab === "expense",
        select: (res: any) => Array.isArray(res) ? res : (res?.suppliers || res?.data || []),
        staleTime: 30_000,
    });

    const { data: invoicesData } = useQuery({
        queryKey: ["invoices-unsettled"],
        queryFn: () => getAllInvoices({ direction: "customer", status: "Pending" }),
        enabled: open && activeTab === "settle",
    });
    const openInvoices = invoicesData?.invoices || [];

    // ── Options ───────────────────────────────────────────────────────────────
    const methodOptions = paymentMethods.map((m: any) => ({ label: m.name, value: m._id }));
    const revenueOptions = revenueAccts.map((a: any) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));
    const expenseOptions = expenseAccts.map((a: any) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));
    const customerOptions = (customersData || []).map((c: any) => ({
        label: `${c.customer_name}${c.phone ? ` — ${c.phone}` : ""}`,
        value: c._id,
    }));
    const supplierOptions = (suppliersData || []).map((s: any) => ({
        label: `${s.name}${s.phone ? ` — ${s.phone}` : ""}`,
        value: s._id,
        raw: s,
    }));
    const invoiceOptions = openInvoices.map((inv: any) => ({
        label: `${inv.order_no} — ${inv.counterparty_name || "Customer"} — KES ${inv.amount_due?.toFixed(2)}`,
        value: inv._id,
    }));

    // ── Mutations ─────────────────────────────────────────────────────────────
    const incomeMutation = useMutation({
        mutationFn: postDirectIncome,
        onSuccess: () => {
            incomeForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ["income-history"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            message.success("Income posted");
            onClose();
        },
        onError: (err: any) => message.error(err?.response?.data?.message || "Failed to post income"),
    });

    // Supplier bill mutation — runs alongside expenseMutation when toggled on
    const billMutation = useMutation({
        mutationFn: createInvoice,
        onError: (err: any) =>
            message.warning(`Expense posted but supplier bill failed: ${err?.response?.data?.message || err.message}`),
    });

    const expenseMutation = useMutation({
        mutationFn: postExpense,
        onSuccess: async (_, variables: any) => {
            // If supplier selected + bill toggle on, create a supplier AP bill
            if (createSupplierBill && variables.supplier_id && shopId) {
                const selectedSupplier = (suppliersData || []).find(
                    (s: any) => s._id === variables.supplier_id
                );
                await billMutation.mutateAsync({
                    direction: "supplier",
                    shop_id: shopId,
                    supplier_id: variables.supplier_id,
                    counterparty_name: selectedSupplier?.name || "Supplier",
                    issue_date: variables.expense_date || new Date().toISOString(),
                    due_date: variables.due_date || variables.expense_date || new Date().toISOString(),
                    status: "Paid", // already paid — this is for aging history
                    notes: variables.notes || variables.description,
                    lines: [
                        {
                            description: variables.description,
                            account_id: variables.expense_account_id,
                            quantity: 1,
                            price: variables.amount,
                            vat_rate: variables.vat_amount
                                ? parseFloat((variables.vat_amount / variables.amount).toFixed(4))
                                : 0,
                            vat_amount: variables.vat_amount || 0,
                        },
                    ],
                });
            }

            expenseForm.resetFields();
            setSelectedSupplierId(null);
            setCreateSupplierBill(true);
            queryClient.invalidateQueries({ queryKey: ["income-history"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
            message.success(
                createSupplierBill && variables.supplier_id
                    ? "Expense posted + supplier bill created for aging"
                    : "Expense posted"
            );
            onClose();
        },
        onError: (err: any) => message.error(err?.response?.data?.message || "Failed to post expense"),
    });

    const settleMutation = useMutation({
        mutationFn: ({ invoiceId, data }: { invoiceId: string; data: any }) =>
            settleInvoice(invoiceId, data),
        onSuccess: () => {
            settleForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
            queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            message.success("Invoice settled");
            onClose();
        },
        onError: (err: any) => message.error(err?.response?.data?.message || "Failed to settle invoice"),
    });

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleIncome = async () => {
        const v = await incomeForm.validateFields();
        incomeMutation.mutate({
            method_id: v.method_id,
            revenue_account_id: v.revenue_account_id,
            customer_id: v.customer_id || undefined,
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
            supplier_id: v.supplier_id || undefined,
            amount: v.amount,
            vat_amount: v.vat_amount || 0,
            description: v.description,
            reference: v.reference,
            expense_date: v.expense_date?.toISOString(),
            due_date: v.due_date?.toISOString(),
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
        billMutation.isPending ||
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
        setCustomerSearch("");
        setSupplierSearch("");
        setSelectedSupplierId(null);
        setCreateSupplierBill(true);
        onClose();
    };

    // ── Tabs ──────────────────────────────────────────────────────────────────
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

                    <Form.Item name="customer_id" label="Customer (optional)"
                        tooltip="Link this income to a customer for reporting">
                        <Select showSearch allowClear placeholder="Search customer..."
                            filterOption={false}
                            onSearch={setCustomerSearch}
                            loading={customersFetching}
                            options={customerOptions}
                            notFoundContent={customersFetching ? "Searching..." : "No customers found"} />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="method_id" label="Received Via (DR)"
                                rules={[{ required: true }]}
                                tooltip="Which payment method / bank account received the money?">
                                <Select showSearch placeholder="M-Pesa / Bank / Cash"
                                    options={methodOptions} optionFilterProp="label" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="revenue_account_id" label="Income Account (CR)"
                                rules={[{ required: true }]}
                                tooltip="Which revenue account does this belong to?">
                                <Select showSearch placeholder="Revenue account"
                                    options={revenueOptions} optionFilterProp="label" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="amount" label="Amount (KES)"
                        rules={[{ required: true }, { type: "number", min: 0.01 }]}>
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

                    {/* Supplier selector — triggers bill creation option */}
                    <Form.Item name="supplier_id" label="Supplier (optional)"
                        tooltip="Link to a supplier to track in aging statements">
                        <Select
                            showSearch allowClear
                            placeholder="Search supplier..."
                            filterOption={false}
                            onSearch={setSupplierSearch}
                            loading={suppliersFetching}
                            options={supplierOptions}
                            notFoundContent={suppliersFetching ? "Searching..." : "No suppliers found"}
                            onChange={(val) => {
                                setSelectedSupplierId(val || null);
                                if (!val) setCreateSupplierBill(false);
                                else setCreateSupplierBill(true);
                            }}
                        />
                    </Form.Item>

                    {/* Bill creation toggle — only shown when supplier is selected */}
                    {selectedSupplierId && (
                        <>
                            <Alert
                                type="info"
                                showIcon
                                icon={<FileTextOutlined />}
                                style={{ marginBottom: 12 }}
                                message={
                                    <Space>
                                        <span>Create supplier bill for aging statement</span>
                                        <Switch
                                            size="small"
                                            checked={createSupplierBill}
                                            onChange={setCreateSupplierBill}
                                        />
                                    </Space>
                                }
                                description={
                                    createSupplierBill
                                        ? "A paid supplier bill will be created — this expense will appear in the supplier aging report."
                                        : "No bill will be created. Expense posts to books only, supplier aging unaffected."
                                }
                            />
                            {createSupplierBill && (
                                <Form.Item name="due_date" label="Bill Due Date"
                                    tooltip="Used for aging buckets (current / 30 / 60 / 90 days)"
                                    rules={[{ required: true, message: "Due date required for supplier bill" }]}>
                                    <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                                </Form.Item>
                            )}
                        </>
                    )}

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="method_id" label="Paid From (CR)"
                                rules={[{ required: true }]}
                                tooltip="Which account was debited to make this payment?">
                                <Select showSearch placeholder="M-Pesa / Bank / Cash"
                                    options={methodOptions} optionFilterProp="label" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="expense_account_id" label="Expense Account (DR)"
                                rules={[{ required: true }]}
                                tooltip="Which expense category is this?">
                                <Select showSearch placeholder="Expense account"
                                    options={expenseOptions} optionFilterProp="label" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="amount" label="Net Amount (KES)"
                                rules={[{ required: true }, { type: "number", min: 0.01 }]}>
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
                    <Form.Item name="invoice_id" label="Invoice to Settle"
                        rules={[{ required: true }]}
                        tooltip="Select an outstanding customer invoice to record payment against">
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
                            <Form.Item name="amount" label="Amount (KES)"
                                rules={[{ required: true }, { type: "number", min: 0.01 }]}>
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
            title={<Space><DollarOutlined style={{ color: "#52c41a" }} />Finance Entry</Space>}
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
                        activeTab === "expense"
                            ? (createSupplierBill && selectedSupplierId ? "Post Expense + Create Bill" : "Post Expense")
                            : "Settle Invoice"}
                </Button>,
            ]}
            destroyOnClose
        >
            <Tabs
                activeKey={activeTab}
                onChange={(key) => {
                    setActiveTab(key);
                    setSelectedSupplierId(null);
                    setCreateSupplierBill(true);
                }}
                items={tabItems}
                size="small"
                style={{ marginTop: -8 }}
            />
        </Modal>
    );
};

export default ManualIncomeModal;