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
import { createBill, updateBill } from "@services/accounting/bill";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { fetchAllSuppliers } from "@services/supplier";
import { fetchAllCustomers } from "@services/customers";
import AddProSupplierModal from "@components/MODALS/pro/AddProSupplierModal";
import AccountFormDrawer from "@pages/ChartOfAccounts/AccountFormDrawer";
import { getVATConfigSync, calculateVAT } from "@utils/vat";
import { CurrencySelector, useCurrency } from "@components/Currency";
import dayjs from "dayjs";

const { TextArea } = Input;

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    defaultTab?: "expense" | "bill";
    billToEdit?: any;
}

const numFormatter = (v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const numParser = (v: any) => v!.replace(/,/g, "") as any;

const ManualExpenseBillModal: React.FC<Props> = ({
    open, onClose, onSuccess, defaultTab = "expense", billToEdit,
}) => {
    const [expenseForm] = Form.useForm();
    const [billForm] = Form.useForm();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const { functionalCurrency } = useCurrency();

    const [activeTab, setActiveTab] = useState<"expense" | "bill">(defaultTab);
    const [expenseSupplierSearch, setExpenseSupplierSearch] = useState("");
    const [billSupplierSearch, setBillSupplierSearch] = useState("");
    const [expenseCustomerSearch, setExpenseCustomerSearch] = useState("");

    const [expenseAddSupplierOpen, setExpenseAddSupplierOpen] = useState(false);
    const [billAddSupplierOpen, setBillAddSupplierOpen] = useState(false);
    const [addAccountOpen, setAddAccountOpen] = useState(false);

    const shopId = localStorage.getItem("shopId") || undefined;

    useEffect(() => {
        if (open) setActiveTab(defaultTab);
    }, [open, defaultTab]);

    // ── Populate form for bill editing ───────────────────────────────────────────
    useEffect(() => {
        if (open && billToEdit && activeTab === "bill") {
            billForm.setFieldsValue({
                supplier_id: billToEdit.supplier_id?._id || billToEdit.supplier_id,
                issue_date: dayjs(billToEdit.bill_date),
                due_date: billToEdit.due_date ? dayjs(billToEdit.due_date) : null,
                expense_account_id: billToEdit.bill_lines?.[0]?.account_id,
                amount: billToEdit.subtotal || billToEdit.bill_lines?.[0]?.amount,
                vat_amount: billToEdit.total_vat_amount || billToEdit.total_vat,
                notes: billToEdit.notes,
                description: billToEdit.bill_lines?.[0]?.description,
                currency: billToEdit.currency || functionalCurrency?.code || 'KES',
            });
        }
    }, [open, billToEdit, activeTab, billForm, functionalCurrency]);

    // ── Tenant VAT config ─────────────────────────────────────────────────────
    // Get VAT config from localStorage for real-time updates
    const vatConfig = getVATConfigSync();
    const vatEnabled = vatConfig.is_vat_enabled;
    const standardVatRate = vatConfig.vat_standard_rate;

    // ── Auto-calculate VAT for bills ───────────────────────────────────────────
    const amountValue = Form.useWatch("amount", billForm);
    
    useEffect(() => {
        if (activeTab === "bill" && vatEnabled && amountValue && amountValue > 0) {
            // Use the corrected VAT calculation
            const vatCalculation = calculateVAT(amountValue, vatConfig);
            billForm.setFieldsValue({ vat_amount: vatCalculation.vat_amount });
        }
    }, [activeTab, vatEnabled, amountValue, vatConfig, billForm]);

    // ── Auto-calculate VAT for expenses ───────────────────────────────────────────
    const expenseAmountValue = Form.useWatch("amount", expenseForm);
    
    useEffect(() => {
        if (activeTab === "expense" && vatEnabled && expenseAmountValue && expenseAmountValue > 0) {
            // Use the corrected VAT calculation
            const vatCalculation = calculateVAT(expenseAmountValue, vatConfig);
            expenseForm.setFieldsValue({ vat_amount: vatCalculation.vat_amount });
        }
    }, [activeTab, vatEnabled, expenseAmountValue, vatConfig, expenseForm]);

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts"],
        queryFn: () => getAllAccounts({ shop_id: shopId }),
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
    const paymentMethods: any[] = methodsData || [];

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

    const { data: expenseCustomersData, isFetching: expenseCustomersFetching } = useQuery({
        queryKey: ["customers-dropdown-expense", expenseCustomerSearch],
        queryFn: () => fetchAllCustomers({ customer_name: expenseCustomerSearch }),
        enabled: open,
        select: (res: any) => Array.isArray(res) ? res : (res?.customers || res?.data || []),
        staleTime: 30_000,
    });

    // ── Options ───────────────────────────────────────────────────────────────
    // FIX: keep full method object in value so we can read account_id on submit
    const methodOptions = paymentMethods.map((m: any) => ({
        label: m.name,
        value: m._id,
        // Store the linked COA account_id alongside so we can resolve it on submit
        account_id: m.account_id || null,
    }));

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

    const expenseCustomerOptions = (expenseCustomersData || []).map((c: any) => ({
        label: `${c.customer_name}${c.phone ? ` — ${c.phone}` : ""}`,
        value: c._id,
    }));

    // ── Invalidation helpers ──────────────────────────────────────────────────
    const handleSupplierAdded = () => {
        queryClient.invalidateQueries({ queryKey: ["suppliers-dropdown-expense"] });
        queryClient.invalidateQueries({ queryKey: ["suppliers-dropdown-bill"] });
    };

    const handleAccountAdded = () => {
        queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    };

    // ── Dropdown render helpers ───────────────────────────────────────────────
    const supplierDropdownRender = (menu: React.ReactNode, onAdd: () => void) => (
        <>
            {menu}
            <Divider style={{ margin: "4px 0" }} />
            <Button
                type="link" icon={<PlusOutlined />}
                style={{ width: "100%", textAlign: "left", padding: "4px 8px" }}
                onMouseDown={(e) => { e.preventDefault(); onAdd(); }}
            >
                Add New Supplier
            </Button>
        </>
    );

    const accountDropdownRender = (menu: React.ReactNode) => (
        <>
            {menu}
            <Divider style={{ margin: "4px 0" }} />
            <Button
                type="link" icon={<PlusOutlined />}
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
        onSuccess: (res: any) => {
            if (res?.warning) message.warning(res.warning);
            expenseForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            onSuccess?.();
            onClose();
        },
        onError: (err: any) =>
            message.error(err?.response?.data?.message || "Failed to post expense"),
    });

    const createBillMutation = useMutation({
        mutationFn: createBill,
        onSuccess: (res: any) => {
            if (res?.warning) message.warning(res.warning);
            billForm.resetFields();
            setBillSupplierSearch("");
            queryClient.invalidateQueries({ queryKey: ["bills-dropdown-bill"] });
            queryClient.invalidateQueries({ queryKey: ["bills"] });
            onSuccess?.();
            onClose();
        },
        onError: (err: any) =>
            message.error(err?.response?.data?.message || "Failed to create bill"),
    });

    const updateBillMutation = useMutation({
        mutationFn: (data: any) => updateBill(billToEdit!._id, data),
        onSuccess: (res: any) => {
            if (res?.warning) message.warning(res.warning);
            billForm.resetFields();
            setBillSupplierSearch("");
            queryClient.invalidateQueries({ queryKey: ["bills-dropdown-bill"] });
            queryClient.invalidateQueries({ queryKey: ["bills"] });
            onSuccess?.();
            onClose();
        },
        onError: (err: any) =>
            message.error(err?.response?.data?.message || "Failed to update bill"),
    });

    // ── Submit handlers ───────────────────────────────────────────────────────
    const handleExpenseSubmit = async () => {
        const v = await expenseForm.validateFields();
        const netAmount = v.amount as number;
        const vatAmount = (v.vat_amount as number) || 0;

        expenseMutation.mutate({
            expense_date: v.expense_date?.toISOString(),
            reference: v.reference || undefined,
            customer_id: v.customer_id || undefined,
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
            // Direct COA account selected by user — no method lookup needed
            payment_account_id: v.payment_account_id,
            payment_method_id: v.method_id || undefined,
            payment_method: v.method_id
                ? (paymentMethods.find((m: any) => m._id === v.method_id)?.name || "Cash")
                : "Cash",
            notes: v.notes || undefined,
            status: "Approved",
            currency: v.currency || functionalCurrency?.code || "KES",
        });
    };

    const handleBillSubmit = async () => {
        const v = await billForm.validateFields();
        const netAmount = v.amount as number;
        const vatAmount = (v.vat_amount as number) || 0;

        if (billToEdit) {
            // Update existing bill - only send editable fields
            updateBillMutation.mutate({
                bill_date: v.issue_date?.toISOString(),
                due_date: v.due_date?.toISOString(),
                supplier_ref: v.supplier_id,
                notes: v.notes || undefined,
                terms: undefined,
                internal_notes: undefined,
                currency: v.currency,
            });
        } else {
            // Create new bill
            createBillMutation.mutate({
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
                // Bills are deferred — Pending until paid via Record Payment
                status: "Pending",
                currency: v.currency || functionalCurrency?.code || "KES",
            });
        }
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

    const isLoading = expenseMutation.isPending || createBillMutation.isPending || updateBillMutation.isPending;

    const handleTabChange = (key: string) => {
        if (key === "expense") billForm.resetFields();
        else expenseForm.resetFields();
        setActiveTab(key as "expense" | "bill");
        setExpenseSupplierSearch("");
        setBillSupplierSearch("");
    };

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
                        {activeTab === "expense" 
                            ? "Post Expense" 
                            : billToEdit ? "Edit Supplier Bill" : "Create Supplier Bill"
                        }
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
                        {activeTab === "expense" 
    ? "Post Expense" 
    : billToEdit ? "Update Bill" : "Create Bill"
}
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
                    <Alert
                        type="success"
                        showIcon
                        message="Expense posts instantly — cash is recorded as paid now."
                        style={{ marginBottom: 16 }}
                    />
                    <Form
                        form={expenseForm}
                        layout="vertical"
                        initialValues={{ expense_date: dayjs() }}
                    >
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="expense_date" label="Date" rules={[{ required: true }]}>
                                    <DatePicker
                                        showTime style={{ width: "100%" }}
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

                        <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                            <Input placeholder="e.g. Office rent — January 2025" />
                        </Form.Item>

                        <Form.Item
                            name="customer_id"
                            label="Customer (optional)"
                            tooltip="Link to a customer for customer statements"
                        >
                            <Select
                                showSearch allowClear placeholder="Search customer..."
                                filterOption={false}
                                onSearch={setExpenseCustomerSearch}
                                loading={expenseCustomersFetching}
                                options={expenseCustomerOptions}
                                notFoundContent={expenseCustomersFetching ? "Searching..." : "No customers found"}
                            />
                        </Form.Item>

                        <Form.Item
                            name="supplier_id"
                            label="Supplier (optional)"
                            tooltip="Link to a supplier for reporting"
                        >
                            <Select
                                showSearch allowClear placeholder="Search supplier..."
                                filterOption={false}
                                onSearch={setExpenseSupplierSearch}
                                loading={expenseSuppliersFetching}
                                options={expenseSupplierOptions}
                                notFoundContent={expenseSuppliersFetching ? "Searching..." : "No suppliers found"}
                                dropdownRender={(menu) =>
                                    supplierDropdownRender(menu, () => setExpenseAddSupplierOpen(true))
                                }
                            />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="method_id"
                                    label="Payment Method"
                                    tooltip="How was this paid?"
                                >
                                    <Select
                                        showSearch allowClear
                                        placeholder="M-Pesa / Bank / Cash"
                                        options={methodOptions}
                                        optionFilterProp="label"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="payment_account_id"
                                    label="Paid From Account (CR)"
                                    rules={[{ required: true, message: "Select the account cash left from" }]}
                                    tooltip="Which bank/cash COA account was credited?"
                                >
                                    <Select
                                        showSearch
                                        placeholder="e.g. Cash on Hand, M-Pesa Float"
                                        optionFilterProp="label"
                                        options={allAccounts
                                            .filter((a: any) => a.account_type === "ASSET" && a.is_active)
                                            .map((a: any) => ({
                                                label: `${a.account_code} — ${a.account_name}`,
                                                value: a._id,
                                            }))
                                        }
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item
                                    name="expense_account_id"
                                    label="Expense Account (DR)"
                                    rules={[{ required: true }]}
                                    tooltip="Which expense category is this?"
                                >
                                    <Select
                                        showSearch
                                        placeholder="e.g. Rent, Utilities, Salaries"
                                        options={expenseAccountOptions}
                                        optionFilterProp="label"
                                        dropdownRender={accountDropdownRender}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            name="currency"
                            label="Currency"
                            rules={[{ required: true }]}
                            initialValue={functionalCurrency?.code || "KES"}
                        >
                            <CurrencySelector placeholder="Select currency" />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="amount"
                                    label="Net Amount"
                                    rules={[{ required: true }, { type: "number", min: 0.01 }]}
                                >
                                    <InputNumber
                                        style={{ width: "100%" }} min={0.01} precision={2}
                                        placeholder="0.00" formatter={numFormatter} parser={numParser}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="vat_amount"
                                    label={`VAT Amount (${(standardVatRate * 100).toFixed(0)}% - Auto-calculated)`}
                                    tooltip="VAT is automatically calculated based on the net amount and VAT settings"
                                >
                                    <InputNumber
                                        style={{ width: "100%" }} min={0} precision={2}
                                        placeholder="0.00" formatter={numFormatter} parser={numParser}
                                        readOnly
                                        disabled
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
                    <Alert
                        type="info"
                        showIcon
                        message="Supplier bill stays Pending — use Record Payment on the Bills list when you pay."
                        style={{ marginBottom: 16 }}
                    />
                    <Form
                        form={billForm}
                        layout="vertical"
                        initialValues={{ issue_date: dayjs() }}
                    >
                        <Form.Item
                            name="supplier_id"
                            label="Supplier"
                            rules={[{ required: true, message: "Supplier is required" }]}
                        >
                            <Select
                                showSearch allowClear placeholder="Search supplier..."
                                filterOption={false}
                                onSearch={setBillSupplierSearch}
                                loading={billSuppliersFetching}
                                options={billSupplierOptions}
                                notFoundContent={billSuppliersFetching ? "Searching..." : "No suppliers found"}
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
                                <Form.Item name="issue_date" label="Bill Date" rules={[{ required: true }]}>
                                    <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="due_date" label="Due Date" rules={[]}>
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
                                placeholder="e.g. Rent, Utilities, COGS"
                                options={expenseAccountOptions}
                                optionFilterProp="label"
                                dropdownRender={accountDropdownRender}
                            />
                        </Form.Item>

                        <Form.Item
                            name="currency"
                            label="Currency"
                            rules={[{ required: true }]}
                            initialValue={functionalCurrency?.code || "KES"}
                        >
                            <CurrencySelector placeholder="Select currency" />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="amount"
                                    label="Net Amount"
                                    rules={[{ required: true }, { type: "number", min: 0.01 }]}
                                >
                                    <InputNumber
                                        style={{ width: "100%" }} min={0.01} precision={2}
                                        placeholder="0.00" formatter={numFormatter} parser={numParser}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="vat_amount" label={`VAT Amount (${(standardVatRate * 100).toFixed(0)}% - Auto-calculated)`}>
                                    <InputNumber
                                        style={{ width: "100%" }} min={0} precision={2}
                                        placeholder="0.00" formatter={numFormatter} parser={numParser}
                                        readOnly
                                        disabled
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

            <AddProSupplierModal
                externalOpen={expenseAddSupplierOpen}
                onExternalClose={() => { setExpenseAddSupplierOpen(false); handleSupplierAdded(); }}
            />
            <AddProSupplierModal
                externalOpen={billAddSupplierOpen}
                onExternalClose={() => { setBillAddSupplierOpen(false); handleSupplierAdded(); }}
            />
            <AccountFormDrawer
                open={addAccountOpen}
                onClose={() => setAddAccountOpen(false)}
                onSuccess={() => { setAddAccountOpen(false); handleAccountAdded(); }}
                accounts={allAccounts}
                shopId={shopId}
            />
        </>
    );
};

export default ManualExpenseBillModal;