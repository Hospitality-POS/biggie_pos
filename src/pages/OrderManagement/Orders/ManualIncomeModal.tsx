import React, { useState, useEffect } from "react";
import {
    Modal, Form, Input, InputNumber, Select, DatePicker,
    Button, Space, App, Row, Col, Tabs, Alert,
} from "antd";
import {
    ArrowUpOutlined, FileTextOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllAccounts } from "@services/accounting/accounts";
import { postExpense } from "@services/accounting/income";
import { createInvoice } from "@services/accounting/invoice";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { fetchAllSuppliers } from "@services/supplier";
import dayjs from "dayjs";

const { TextArea } = Input;

interface Props {
    open: boolean;
    onClose: () => void;
    defaultTab?: "expense" | "bill";
}

const ManualIncomeModal: React.FC<Props> = ({ open, onClose, defaultTab = "expense" }) => {
    const [expenseForm] = Form.useForm();
    const [billForm] = Form.useForm();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"expense" | "bill">(defaultTab);
    const [supplierSearch, setSupplierSearch] = useState("");
    const [billSupplierSearch, setBillSupplierSearch] = useState("");

    const shopId = localStorage.getItem("shopId");

    useEffect(() => {
        if (open) setActiveTab(defaultTab);
    }, [open, defaultTab]);

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts"],
        queryFn: () => getAllAccounts({}),
        enabled: open,
    });
    const allAccounts = accountsData?.accounts || [];
    const expenseAccts = allAccounts.filter((a: any) => a.account_type === "EXPENSE" && a.is_active);

    const { data: methodsData } = useQuery({
        queryKey: ["payment-methods"],
        queryFn: () => fetchAllPaymentMethods({}),
        enabled: open,
    });
    const paymentMethods = methodsData || [];

    const { data: suppliersData, isFetching: suppliersFetching } = useQuery({
        queryKey: ["suppliers-dropdown-expense", supplierSearch],
        queryFn: () => fetchAllSuppliers({ name: supplierSearch }),
        enabled: open && activeTab === "expense",
        select: (res: any) => Array.isArray(res) ? res : (res?.suppliers || res?.data || []),
        staleTime: 30_000,
    });

    const { data: billSuppliersData, isFetching: billSuppliersFetching } = useQuery({
        queryKey: ["suppliers-dropdown-bill", billSupplierSearch],
        queryFn: () => fetchAllSuppliers({ name: billSupplierSearch }),
        enabled: open && activeTab === "bill",
        select: (res: any) => Array.isArray(res) ? res : (res?.suppliers || res?.data || []),
        staleTime: 30_000,
    });

    // ── Options ───────────────────────────────────────────────────────────────
    const methodOptions = paymentMethods.map((m: any) => ({ label: m.name, value: m._id }));
    const expenseOptions = expenseAccts.map((a: any) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));

    const supplierOptions = (suppliersData || []).map((s: any) => ({
        label: `${s.name}${s.phone ? ` — ${s.phone}` : ""}`,
        value: s._id,
    }));
    const billSupplierOptions = (billSuppliersData || []).map((s: any) => ({
        label: `${s.name}${s.phone ? ` — ${s.phone}` : ""}`,
        value: s._id,
    }));

    // ── Mutations ─────────────────────────────────────────────────────────────
    const expenseMutation = useMutation({
        mutationFn: postExpense,
        onSuccess: () => {
            expenseForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ["income-history"] });
            queryClient.invalidateQueries({ queryKey: ["income-history-expenses"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            message.success("Expense posted");
            onClose();
        },
        onError: (err: any) => message.error(err?.response?.data?.message || "Failed to post expense"),
    });

    const billMutation = useMutation({
        mutationFn: createInvoice,
        onSuccess: () => {
            billForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
            queryClient.invalidateQueries({ queryKey: ["income-history-bills"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            message.success("Supplier bill created");
            onClose();
        },
        onError: (err: any) => message.error(err?.response?.data?.message || "Failed to create bill"),
    });

    // ── Handlers ──────────────────────────────────────────────────────────────
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
            notes: v.notes,
        });
    };

    const handleBill = async () => {
        const v = await billForm.validateFields();
        billMutation.mutate({
            direction: "supplier",
            shop_id: shopId,
            supplier_id: v.supplier_id,
            issue_date: v.issue_date?.toISOString(),
            due_date: v.due_date?.toISOString(),
            notes: v.notes,
            status: "Pending",
            lines: [
                {
                    description: v.description,
                    account_id: v.expense_account_id,
                    quantity: 1,
                    price: v.amount,
                    vat_rate: v.vat_amount
                        ? parseFloat((v.vat_amount / v.amount).toFixed(4))
                        : 0,
                    vat_amount: v.vat_amount || 0,
                },
            ],
        });
    };

    const isLoading = expenseMutation.isPending || billMutation.isPending;

    const handleOk = () => {
        if (activeTab === "expense") handleExpense();
        if (activeTab === "bill") handleBill();
    };

    const handleCancel = () => {
        expenseForm.resetFields();
        billForm.resetFields();
        setSupplierSearch("");
        setBillSupplierSearch("");
        onClose();
    };

    // ── Tabs ──────────────────────────────────────────────────────────────────
    const tabItems = [
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

                    <Form.Item name="supplier_id" label="Supplier (optional)"
                        tooltip="Link to a supplier for reporting">
                        <Select
                            showSearch allowClear
                            placeholder="Search supplier..."
                            filterOption={false}
                            onSearch={setSupplierSearch}
                            loading={suppliersFetching}
                            options={supplierOptions}
                            notFoundContent={suppliersFetching ? "Searching..." : "No suppliers found"}
                        />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="method_id" label="Paid From (CR)"
                                rules={[{ required: true }]}
                                tooltip="Which payment method / bank account was used?">
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
            key: "bill",
            label: <Space><FileTextOutlined style={{ color: "#8b5cf6" }} />Create Supplier Bill</Space>,
            children: (
                <Form form={billForm} layout="vertical" initialValues={{ issue_date: dayjs() }}>
                    <Alert
                        type="info"
                        showIcon
                        message="Supplier bill records an amount owed to a supplier — it stays as Pending until paid."
                        style={{ marginBottom: 16 }}
                    />

                    <Form.Item name="supplier_id" label="Supplier"
                        rules={[{ required: true, message: "Supplier is required" }]}>
                        <Select
                            showSearch allowClear
                            placeholder="Search supplier..."
                            filterOption={false}
                            onSearch={setBillSupplierSearch}
                            loading={billSuppliersFetching}
                            options={billSupplierOptions}
                            notFoundContent={billSuppliersFetching ? "Searching..." : "No suppliers found"}
                        />
                    </Form.Item>

                    <Form.Item name="description" label="Description / Item" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Office supplies — February 2025" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="issue_date" label="Bill Date" rules={[{ required: true }]}>
                                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="due_date" label="Due Date" rules={[{ required: true }]}>
                                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="expense_account_id" label="Expense Account (DR)"
                        rules={[{ required: true }]}
                        tooltip="Which expense category does this bill fall under?">
                        <Select showSearch placeholder="Expense account"
                            options={expenseOptions} optionFilterProp="label" />
                    </Form.Item>

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
                            <Form.Item name="vat_amount" label="VAT Amount (optional)">
                                <InputNumber style={{ width: "100%" }} min={0} precision={2} placeholder="0.00"
                                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                    parser={(v) => v!.replace(/,/g, "") as any} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="notes" label="Notes">
                        <TextArea rows={2} placeholder="Any additional notes about this bill" />
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
                    <ArrowUpOutlined style={{ color: "#ff4d4f" }} />
                    {activeTab === "expense" ? "Post Expense" : "Create Supplier Bill"}
                </Space>
            }
            width={620}
            footer={[
                <Button key="cancel" onClick={handleCancel}>Cancel</Button>,
                <Button
                    key="submit"
                    type="primary"
                    loading={isLoading}
                    onClick={handleOk}
                    style={
                        activeTab === "expense"
                            ? { background: "#ff4d4f", borderColor: "#ff4d4f" }
                            : { background: "#8b5cf6", borderColor: "#8b5cf6" }
                    }
                >
                    {activeTab === "expense" ? "Post Expense" : "Create Bill"}
                </Button>,
            ]}
            destroyOnClose
        >
            <Tabs
                activeKey={activeTab}
                onChange={(key) => {
                    setActiveTab(key as "expense" | "bill");
                    setSupplierSearch("");
                    setBillSupplierSearch("");
                }}
                items={tabItems}
                size="small"
                style={{ marginTop: -8 }}
            />
        </Modal>
    );
};

export default ManualIncomeModal;