import React, { useState, useEffect } from "react";
import {
    Modal, Form, Input, InputNumber, Select, DatePicker,
    Button, Space, App, Row, Col, Tabs, Alert, Divider,
} from "antd";
import {
    ArrowUpOutlined, FileTextOutlined, PlusOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllAccounts } from "@services/accounting/accounts";
import { createExpense } from "@services/accounting/expense";
import { createBill } from "@services/accounting/bill";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { fetchAllSuppliers } from "@services/supplier";
import AddProSupplierModal from "@components/MODALS/pro/AddProSupplierModal";
import AccountFormDrawer from "@pages/ChartOfAccounts/AccountFormDrawer";
import dayjs from "dayjs";

const { TextArea } = Input;

interface Props {
    open: boolean;
    onClose: () => void;
    defaultTab?: "expense" | "bill";
}

const numFormatter = (v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const numParser = (v: any) => v!.replace(/,/g, "") as any;

const ManualExpenseBillModal: React.FC<Props> = ({ open, onClose, defaultTab = "expense" }) => {
    const [expenseForm] = Form.useForm();
    const [billForm] = Form.useForm();
    const { message } = App.useApp();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<"expense" | "bill">(defaultTab);
    const [expenseSupplierSearch, setExpenseSupplierSearch] = useState("");
    const [billSupplierSearch, setBillSupplierSearch] = useState("");

    // ── Inline add modal state ────────────────────────────────────────────────
    const [expenseAddSupplierOpen, setExpenseAddSupplierOpen] = useState(false);
    const [billAddSupplierOpen, setBillAddSupplierOpen] = useState(false);
    const [addAccountOpen, setAddAccountOpen] = useState(false);

    const shopId = localStorage.getItem("shopId") || "";

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
    const expenseAccts = allAccounts.filter(
        (a: any) => a.account_type === "EXPENSE" && a.is_active
    );

    const { data: methodsData } = useQuery({
        queryKey: ["payment-methods"],
        queryFn: () => fetchAllPaymentMethods({}),
        enabled: open,
    });
    const paymentMethods = methodsData || [];

    const { data: expenseSuppliersData, isFetching: expenseSuppliersFetching } = useQuery({
        queryKey: ["suppliers-dropdown-expense", expenseSupplierSearch],
        queryFn: () => fetchAllSuppliers({ name: expenseSupplierSearch }),
        enabled: open,
        select: (res: any) => Array.isArray(res) ? res : (res?.suppliers || res?.data || []),
        staleTime: 30_000,
    });

    const { data: billSuppliersData, isFetching: billSuppliersFetching } = useQuery({
        queryKey: ["suppliers-dropdown-bill", billSupplierSearch],
        queryFn: () => fetchAllSuppliers({ name: billSupplierSearch }),
        enabled: open,
        select: (res: any) => Array.isArray(res) ? res : (res?.suppliers || res?.data || []),
        staleTime: 30_000,
    });

    // ── Options ───────────────────────────────────────────────────────────────
    const methodOptions = paymentMethods.map((m: any) => ({ label: m.name, value: m._id }));

    const expenseAccountOptions = expenseAccts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));

    const expenseSupplierOptions = (expenseSuppliersData || []).map((s: any) => ({
        label: `${s.name}${s.phone ? ` — ${s.phone}` : ""}`,
        value: s._id,
    }));

    const billSupplierOptions = (billSuppliersData || []).map((s: any) => ({
        label: `${s.name}${s.phone ? ` — ${s.phone}` : ""}`,
        value: s._id,
    }));

    // ── Invalidation helpers ──────────────────────────────────────────────────
    const handleSupplierAdded = () => {
        queryClient.invalidateQueries({ queryKey: ["suppliers-dropdown-expense"] });
        queryClient.invalidateQueries({ queryKey: ["suppliers-dropdown-bill"] });
    };

    const handleAccountAdded = () => {
        queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    };

    // ── Reusable dropdown footers ─────────────────────────────────────────────
    // onMouseDown + e.preventDefault() — prevents Select closing before state setter fires.
    const supplierDropdownRender = (menu: React.ReactNode, onAdd: () => void) => (
        <>
            {menu}
            <Divider style={{ margin: "4px 0" }} />
            <Button
                type="link"
                icon={<PlusOutlined />}
                style={{ width: "100%", textAlign: "left", padding: "4px 8px" }}
                onMouseDown={(e) => { e.preventDefault(); onAdd(); }}
            >
                Add New Supplier
            </Button>
        </>
    );

    // Single shared accountDropdownRender — both expense and bill account
    // dropdowns open the same AccountFormDrawer (one instance, shared state).
    const accountDropdownRender = (menu: React.ReactNode) => (
        <>
            {menu}
            <Divider style={{ margin: "4px 0" }} />
            <Button
                type="link"
                icon={<PlusOutlined />}
                style={{ width: "100%", textAlign: "left", padding: "4px 8px" }}
                onMouseDown={(e) => { e.preventDefault(); setAddAccountOpen(true); }}
            >
                Add Expense Account
            </Button>
        </>
    );

    // ── Mutations ─────────────────────────────────────────────────────────────
    const expenseMutation = useMutation({
        mutationFn: createExpense,
        onSuccess: () => {
            expenseForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            onClose();
        },
        onError: (err: any) =>
            message.error(err?.response?.data?.message || "Failed to post expense"),
    });

    const billMutation = useMutation({
        mutationFn: createBill,
        onSuccess: () => {
            billForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ["bills"] });
            queryClient.invalidateQueries({ queryKey: ["bill-summary"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            onClose();
        },
        onError: (err: any) =>
            message.error(err?.response?.data?.message || "Failed to create bill"),
    });

    // ── Submit handlers ───────────────────────────────────────────────────────
    const handleExpenseSubmit = async () => {
        const v = await expenseForm.validateFields();
        const netAmount = v.amount as number;
        const vatAmount = (v.vat_amount as number) || 0;

        expenseMutation.mutate({
            expense_date: v.expense_date?.toISOString(),
            reference: v.reference || undefined,
            supplier_id: v.supplier_id || undefined,
            expense_lines: [
                {
                    account_id: v.expense_account_id,
                    description: v.description,
                    amount: netAmount,
                    vat_amount: vatAmount,
                    vat_rate: vatAmount > 0
                        ? parseFloat((vatAmount / netAmount).toFixed(4))
                        : 0,
                    vat_inclusive: false,
                },
            ],
            payment_account_id: v.method_id || undefined,
            payment_method: "Cash",
            notes: v.notes || undefined,
            status: "Approved",
            currency: "KES",
        });
    };

    const handleBillSubmit = async () => {
        const v = await billForm.validateFields();
        const netAmount = v.amount as number;
        const vatAmount = (v.vat_amount as number) || 0;

        billMutation.mutate({
            supplier_id: v.supplier_id,
            bill_date: v.issue_date?.toISOString(),
            due_date: v.due_date?.toISOString(),
            bill_lines: [
                {
                    account_id: v.expense_account_id,
                    description: v.description,
                    quantity: 1,
                    unit_price: netAmount,
                    amount: netAmount,
                    vat_rate: vatAmount > 0
                        ? parseFloat((vatAmount / netAmount).toFixed(4))
                        : 0,
                    vat_amount: vatAmount,
                    vat_inclusive: false,
                },
            ],
            notes: v.notes || undefined,
            status: "Pending",
            currency: "KES",
        });
    };

    const handleOk = () => {
        if (activeTab === "expense") handleExpenseSubmit();
        else handleBillSubmit();
    };

    const handleCancel = () => {
        expenseForm.resetFields();
        billForm.resetFields();
        setExpenseSupplierSearch("");
        setBillSupplierSearch("");
        onClose();
    };

    const isLoading = expenseMutation.isPending || billMutation.isPending;

    const handleTabChange = (key: string) => {
        if (key === "expense") billForm.resetFields();
        else expenseForm.resetFields();
        setActiveTab(key as "expense" | "bill");
        setExpenseSupplierSearch("");
        setBillSupplierSearch("");
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Both forms are always mounted and toggled via display:none.
    // Ant Design Form instances rely on a stable React subtree — unmounting
    // via Tabs destroyInactiveTabPane causes field state bleed between tabs.
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <>
            <Modal
                open={open}
                onCancel={handleCancel}
                title={
                    <Space>
                        {activeTab === "expense"
                            ? <ArrowUpOutlined style={{ color: "#ff4d4f" }} />
                            : <FileTextOutlined style={{ color: "#8b5cf6" }} />
                        }
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
                    onChange={handleTabChange}
                    size="small"
                    style={{ marginTop: -8, marginBottom: 16 }}
                    items={[
                        {
                            key: "expense",
                            label: (
                                <Space>
                                    <ArrowUpOutlined style={{ color: "#ff4d4f" }} />
                                    Post Expense
                                </Space>
                            ),
                        },
                        {
                            key: "bill",
                            label: (
                                <Space>
                                    <FileTextOutlined style={{ color: "#8b5cf6" }} />
                                    Create Supplier Bill
                                </Space>
                            ),
                        },
                    ]}
                />

                {/* ── EXPENSE FORM ──────────────────────────────────────────── */}
                <div style={{ display: activeTab === "expense" ? "block" : "none" }}>
                    <Form
                        form={expenseForm}
                        layout="vertical"
                        initialValues={{ expense_date: dayjs() }}
                    >
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="expense_date"
                                    label="Date"
                                    rules={[{ required: true }]}
                                >
                                    <DatePicker
                                        showTime
                                        style={{ width: "100%" }}
                                        format="DD MMM YYYY HH:mm"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="reference" label="Reference">
                                    <Input placeholder="Cheque / M-Pesa ref" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            name="description"
                            label="Description"
                            rules={[{ required: true }]}
                        >
                            <Input placeholder="e.g. Office rent — January 2025" />
                        </Form.Item>

                        <Form.Item
                            name="supplier_id"
                            label="Supplier (optional)"
                            tooltip="Link to a supplier for reporting"
                        >
                            <Select
                                showSearch
                                allowClear
                                placeholder="Search supplier..."
                                filterOption={false}
                                onSearch={setExpenseSupplierSearch}
                                loading={expenseSuppliersFetching}
                                options={expenseSupplierOptions}
                                notFoundContent={
                                    expenseSuppliersFetching ? "Searching..." : "No suppliers found"
                                }
                                dropdownRender={(menu) =>
                                    supplierDropdownRender(menu, () => setExpenseAddSupplierOpen(true))
                                }
                            />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="method_id"
                                    label="Paid From (CR)"
                                    rules={[{ required: true }]}
                                    tooltip="Which payment method / bank account was used?"
                                >
                                    <Select
                                        showSearch
                                        placeholder="M-Pesa / Bank / Cash"
                                        options={methodOptions}
                                        optionFilterProp="label"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="expense_account_id"
                                    label="Expense Account (DR)"
                                    rules={[{ required: true }]}
                                    tooltip="Which expense category is this?"
                                >
                                    <Select
                                        showSearch
                                        placeholder="Expense account"
                                        options={expenseAccountOptions}
                                        optionFilterProp="label"
                                        dropdownRender={accountDropdownRender}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="amount"
                                    label="Net Amount (KES)"
                                    rules={[{ required: true }, { type: "number", min: 0.01 }]}
                                >
                                    <InputNumber
                                        style={{ width: "100%" }}
                                        min={0.01}
                                        precision={2}
                                        placeholder="0.00"
                                        formatter={numFormatter}
                                        parser={numParser}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="vat_amount"
                                    label="Input VAT (optional)"
                                    tooltip="VAT you can reclaim — auto-posted to VAT Input account"
                                >
                                    <InputNumber
                                        style={{ width: "100%" }}
                                        min={0}
                                        precision={2}
                                        placeholder="0.00"
                                        formatter={numFormatter}
                                        parser={numParser}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item name="notes" label="Notes">
                            <TextArea rows={2} />
                        </Form.Item>
                    </Form>
                </div>

                {/* ── BILL FORM ─────────────────────────────────────────────── */}
                <div style={{ display: activeTab === "bill" ? "block" : "none" }}>
                    <Form
                        form={billForm}
                        layout="vertical"
                        initialValues={{ issue_date: dayjs() }}
                    >
                        <Alert
                            type="info"
                            showIcon
                            message="Supplier bill records an amount owed to a supplier — stays Pending until paid."
                            style={{ marginBottom: 16 }}
                        />

                        <Form.Item
                            name="supplier_id"
                            label="Supplier"
                            rules={[{ required: true, message: "Supplier is required" }]}
                        >
                            <Select
                                showSearch
                                allowClear
                                placeholder="Search supplier..."
                                filterOption={false}
                                onSearch={setBillSupplierSearch}
                                loading={billSuppliersFetching}
                                options={billSupplierOptions}
                                notFoundContent={
                                    billSuppliersFetching ? "Searching..." : "No suppliers found"
                                }
                                dropdownRender={(menu) =>
                                    supplierDropdownRender(menu, () => setBillAddSupplierOpen(true))
                                }
                            />
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="Description / Item"
                            rules={[{ required: true }]}
                        >
                            <Input placeholder="e.g. Office supplies — February 2025" />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="issue_date"
                                    label="Bill Date"
                                    rules={[{ required: true }]}
                                >
                                    <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="due_date"
                                    label="Due Date"
                                    rules={[{ required: true }]}
                                >
                                    <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            name="expense_account_id"
                            label="Expense Account (DR)"
                            rules={[{ required: true }]}
                            tooltip="Which expense category does this bill fall under?"
                        >
                            <Select
                                showSearch
                                placeholder="Expense account"
                                options={expenseAccountOptions}
                                optionFilterProp="label"
                                dropdownRender={accountDropdownRender}
                            />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="amount"
                                    label="Net Amount (KES)"
                                    rules={[{ required: true }, { type: "number", min: 0.01 }]}
                                >
                                    <InputNumber
                                        style={{ width: "100%" }}
                                        min={0.01}
                                        precision={2}
                                        placeholder="0.00"
                                        formatter={numFormatter}
                                        parser={numParser}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="vat_amount" label="VAT Amount (optional)">
                                    <InputNumber
                                        style={{ width: "100%" }}
                                        min={0}
                                        precision={2}
                                        placeholder="0.00"
                                        formatter={numFormatter}
                                        parser={numParser}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item name="notes" label="Notes">
                            <TextArea rows={2} placeholder="Any additional notes about this bill" />
                        </Form.Item>
                    </Form>
                </div>
            </Modal>

            {/* Add Supplier — Expense tab */}
            <AddProSupplierModal
                externalOpen={expenseAddSupplierOpen}
                onExternalClose={() => {
                    setExpenseAddSupplierOpen(false);
                    handleSupplierAdded();
                }}
            />

            {/* Add Supplier — Bill tab */}
            <AddProSupplierModal
                externalOpen={billAddSupplierOpen}
                onExternalClose={() => {
                    setBillAddSupplierOpen(false);
                    handleSupplierAdded();
                }}
            />

            {/*
             * Add Expense Account — one instance shared by both tabs.
             * Both account dropdowns call setAddAccountOpen(true) and both
             * invalidate ["chart-of-accounts"], so a single drawer handles both.
             */}
            <AccountFormDrawer
                open={addAccountOpen}
                onClose={() => setAddAccountOpen(false)}
                onSuccess={() => {
                    setAddAccountOpen(false);
                    handleAccountAdded();
                }}
                accounts={allAccounts}
                shopId={shopId}
            />
        </>
    );
};

export default ManualExpenseBillModal;