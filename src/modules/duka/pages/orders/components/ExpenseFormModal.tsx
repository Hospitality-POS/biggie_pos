import React, { useState, useEffect } from "react";
import {
    Form, Input, InputNumber, Select, DatePicker,
    Button, App, Row, Col, Alert, Divider, Typography, Descriptions, Table, Checkbox,
} from "antd";
import {
    ArrowUpOutlined, PlusOutlined, DeleteOutlined, BankOutlined,
    UnorderedListOutlined, FileSearchOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllAccounts } from "@services/accounting/accounts";
import { createExpense, updateExpense } from "@services/accounting/expense";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { fetchAllSuppliers } from "@services/supplier";
import { fetchAllCustomers } from "@services/customers";
import AddProSupplierModal from "@components/MODALS/pro/AddProSupplierModal";
import StepperModal from "@components/MODALS/StepperModal";
import AccountFormDrawer from "@pages/ChartOfAccounts/AccountFormDrawer";
import { getVATConfigSync, calculateVAT } from "@utils/vat";
import { CurrencySelector, useCurrency } from "@components/Currency";
import ProjectSelect from "@components/accounting/ProjectSelect";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Text } = Typography;

const ACCENT = "#ff4d4f";

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    expenseToEdit?: any;
    // Pre-fill a NEW expense from this one (Clone) — saved with createExpense
    expenseToClone?: any;
}

const numFormatter = (v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const numParser = (v: any) => v!.replace(/,/g, "") as any;
const fmt2 = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const accountIdOf = (a: any) => (a && typeof a === "object" ? a._id : a);

const STEPS = [
    { title: "Payment", description: "Date & paid-from account", icon: <BankOutlined /> },
    { title: "Expense Lines", description: "Split across accounts", icon: <UnorderedListOutlined /> },
    { title: "Review", description: "Payee, notes & post", icon: <FileSearchOutlined /> },
];

const ExpenseFormModal: React.FC<Props> = ({ open, onClose, onSuccess, expenseToEdit, expenseToClone }) => {
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const { functionalCurrency } = useCurrency();

    const [step, setStep] = useState(0);
    const [supplierSearch, setSupplierSearch] = useState("");
    const [customerSearch, setCustomerSearch] = useState("");
    const [addSupplierOpen, setAddSupplierOpen] = useState(false);
    const [addAccountOpen, setAddAccountOpen] = useState(false);

    const shopId = localStorage.getItem("shopId") || undefined;
    const locked = expenseToEdit?.status === "Approved";

    useEffect(() => {
        if (open) setStep(0);
    }, [open]);

    // ── Populate form for editing ─────────────────────────────────────────────
    useEffect(() => {
        if (open && expenseToEdit) {
            form.setFieldsValue({
                expense_date: dayjs(expenseToEdit.expense_date),
                reference: expenseToEdit.reference,
                customer_id: expenseToEdit.customer_id?._id || expenseToEdit.customer_id,
                supplier_id: expenseToEdit.supplier_id?._id || expenseToEdit.supplier_id,
                method_id: expenseToEdit.payment_method_id,
                payment_account_id: accountIdOf(expenseToEdit.payment_account_id),
                lines: (expenseToEdit.expense_lines || []).map((l: any) => ({
                    account_id: accountIdOf(l.account_id),
                    description: l.description,
                    amount: l.amount,
                    vat_amount: l.vat_amount || 0,
                    date: l.date ? dayjs(l.date) : undefined,
                })),
                notes: expenseToEdit.notes,
                project_id: accountIdOf(expenseToEdit.project_id) || undefined,
                currency: expenseToEdit.currency || functionalCurrency?.code || "KES",
                vat_exempt: !!expenseToEdit.vat_exempt,
            });
        }
    }, [open, expenseToEdit, form, functionalCurrency]);

    // ── Clone: same payee, paid-from account, lines and notes, dated today.
    // The reference (receipt no.) is left blank and line VAT is recomputed.
    const isClone = !expenseToEdit && !!expenseToClone;
    useEffect(() => {
        if (!open || !isClone) return;
        const src = expenseToClone;
        const exempt = !!src.vat_exempt;
        form.setFieldsValue({
            expense_date: dayjs(),
            customer_id: src.customer_id?._id || src.customer_id,
            supplier_id: src.supplier_id?._id || src.supplier_id,
            method_id: src.payment_method_id,
            payment_account_id: accountIdOf(src.payment_account_id),
            lines: (src.expense_lines || []).map((l: any) => ({
                account_id: accountIdOf(l.account_id),
                description: l.description,
                amount: l.amount,
                vat_amount: lineVat(Number(l.amount) || 0, exempt),
            })),
            notes: src.notes,
            currency: src.currency || functionalCurrency?.code || "KES",
            vat_exempt: exempt,
        });
        // lineVat only depends on the VAT settings, read once per open
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, isClone, expenseToClone, form, functionalCurrency]);

    // ── VAT ───────────────────────────────────────────────────────────────────
    const vatConfig = getVATConfigSync();
    const vatEnabled = vatConfig.is_vat_enabled;
    const standardVatRate = vatConfig.vat_standard_rate;

    // The line amount is NET (saved with vat_inclusive: false) — VAT goes on top
    // whatever the tenant's POS pricing mode, rounded to the cent. Exempt → 0.
    const lineVat = (amt: number, exempt: boolean) =>
        exempt || !vatEnabled || !(amt > 0)
            ? 0
            : Math.round(calculateVAT(amt, { ...vatConfig, vat_pricing_mode: "EXCLUSIVE" }).vat_amount * 100) / 100;

    const handleValuesChange = (changed: any, all: any) => {
        // Toggling the exemption re-prices every line
        if ("vat_exempt" in (changed || {})) {
            (all?.lines || []).forEach((l: any, idx: number) => {
                form.setFieldValue(["lines", idx, "vat_amount"], lineVat(Number(l?.amount) || 0, !!changed.vat_exempt));
            });
            return;
        }
        if (!Array.isArray(changed?.lines)) return;
        changed.lines.forEach((l: any, idx: number) => {
            if (l && "amount" in l) {
                form.setFieldValue(["lines", idx, "vat_amount"], lineVat(l.amount as number, !!all?.vat_exempt));
            }
        });
    };

    // ── Total expense = sum of lines; this is what leaves the Paid From account ─
    const watchedLines: any[] = Form.useWatch("lines", form) || [];
    const watchedPaymentAccount: string | undefined = Form.useWatch("payment_account_id", form);
    const linesNet = watchedLines.reduce((s, l) => s + (Number(l?.amount) || 0), 0);
    const linesVat = watchedLines.reduce((s, l) => s + (Number(l?.vat_amount) || 0), 0);
    const linesTotal = parseFloat((linesNet + linesVat).toFixed(2));

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts"],
        queryFn: () => getAllAccounts({ shop_id: shopId }),
        enabled: open,
    });
    const allAccounts = accountsData?.accounts || [];

    const { data: methodsData } = useQuery({
        queryKey: ["payment-methods"],
        queryFn: () => fetchAllPaymentMethods({}),
        enabled: open,
    });
    const paymentMethods: any[] = methodsData || [];

    const { data: suppliersData, isFetching: suppliersFetching } = useQuery({
        queryKey: ["suppliers-dropdown-expense", supplierSearch],
        queryFn: () => fetchAllSuppliers({ name: supplierSearch }),
        enabled: open,
        select: (res: any) => Array.isArray(res) ? res : (res?.suppliers || res?.data || []),
        staleTime: 30_000,
    });

    const { data: customersData, isFetching: customersFetching } = useQuery({
        queryKey: ["customers-dropdown-expense", customerSearch],
        queryFn: () => fetchAllCustomers({ customer_name: customerSearch }),
        enabled: open,
        select: (res: any) => Array.isArray(res) ? res : (res?.customers || res?.data || []),
        staleTime: 30_000,
    });

    const methodOptions = paymentMethods.map((m: any) => ({ label: m.name, value: m._id }));

    const expenseAccountOptions = allAccounts
        .filter((a: any) => a.account_type === "EXPENSE" && a.is_active)
        .map((a: any) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));

    const paymentAccountOptions = allAccounts
        .filter((a: any) => a.account_type === "ASSET" && a.is_active)
        .map((a: any) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));

    const supplierOptions = (suppliersData || []).map((s: any) => ({
        label: `${s.name}${s.phone ? ` — ${s.phone}` : ""}`,
        value: s._id,
    }));

    // Business customers keep their name in company_name (customer_name is optional)
    const customerLabel = (c: any) => {
        const name = c?.customer_name?.trim() || c?.company_name?.trim() || c?.contact_person?.name?.trim() || c?.code || "Customer";
        return `${name}${c?.phone ? ` — ${c.phone}` : ""}`;
    };
    const customerOptions = (customersData || []).map((c: any) => ({
        label: customerLabel(c),
        value: c._id,
    }));

    // Keep the edited / cloned expense's payee visible even if the search list doesn't include it
    const source = expenseToEdit || expenseToClone;
    if (source?.supplier_id?._id && !supplierOptions.some((o: any) => o.value === source.supplier_id._id)) {
        supplierOptions.unshift({ label: source.supplier_id.name, value: source.supplier_id._id });
    }
    if (source?.customer_id?._id && !customerOptions.some((o: any) => o.value === source.customer_id._id)) {
        customerOptions.unshift({ label: customerLabel(source.customer_id), value: source.customer_id._id });
    }

    const labelOf = (opts: { label: string; value: string }[], id?: string) =>
        opts.find((o) => o.value === id)?.label;

    // ── Dropdown footers ──────────────────────────────────────────────────────
    const addButton = (label: string, onAdd: () => void) => (
        <>
            <Divider style={{ margin: "4px 0" }} />
            <Button
                type="link" icon={<PlusOutlined />}
                style={{ width: "100%", textAlign: "left", padding: "4px 8px" }}
                onMouseDown={(e) => { e.preventDefault(); onAdd(); }}
            >
                {label}
            </Button>
        </>
    );

    // ── Mutations ─────────────────────────────────────────────────────────────
    const afterSave = (res: any) => {
        if (res?.warning) message.warning(res.warning);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["expense"] });
        queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
        queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
        onSuccess?.();
        onClose();
    };

    const createMutation = useMutation({ mutationFn: createExpense, onSuccess: afterSave });
    const updateMutation = useMutation({
        mutationFn: (data: any) => updateExpense(expenseToEdit!._id, data),
        onSuccess: afterSave,
    });
    const saving = createMutation.isPending || updateMutation.isPending;

    // ── Step navigation ───────────────────────────────────────────────────────
    const validateStep = async (s: number) => {
        if (s === 0) {
            await form.validateFields(["expense_date", "payment_account_id", "currency"]);
        } else if (s === 1) {
            const lines = form.getFieldValue("lines") || [];
            await form.validateFields(
                lines.flatMap((_: any, i: number) => [
                    ["lines", i, "account_id"], ["lines", i, "description"], ["lines", i, "amount"],
                ])
            );
        }
    };

    const next = async () => {
        try {
            await validateStep(step);
            setStep((s) => s + 1);
        } catch { /* field errors are shown inline */ }
    };

    const handleSubmit = async () => {
        // Re-check earlier steps and jump back to the first one with an error
        for (const s of [0, 1]) {
            try {
                await validateStep(s);
            } catch {
                setStep(s);
                return;
            }
        }
        const v = await form.validateFields();

        // One bank payment → one expense, one DR line per expense account
        const expenseLines = (v.lines || []).map((l: any) => {
            const netAmount = l.amount as number;
            const vatAmount = v.vat_exempt ? 0 : (l.vat_amount as number) || 0;
            return {
                account_id: l.account_id,
                description: l.description,
                amount: netAmount,
                vat_amount: vatAmount,
                vat_rate: vatAmount > 0 ? parseFloat((vatAmount / netAmount).toFixed(4)) : 0,
                vat_inclusive: false,
                // Empty = the expense date; another day posts as its own entry
                date: l.date ? dayjs(l.date).format("YYYY-MM-DD") : null,
            };
        });

        const payload = {
            expense_date: v.expense_date?.toISOString(),
            reference: v.reference || undefined,
            customer_id: v.customer_id || undefined,
            supplier_id: v.supplier_id || undefined,
            expense_lines: expenseLines,
            payment_account_id: v.payment_account_id,
            payment_method_id: v.method_id || undefined,
            payment_method: v.method_id
                ? (paymentMethods.find((m: any) => m._id === v.method_id)?.name || "Cash")
                : "Cash",
            notes: v.notes || undefined,
            project_id: v.project_id || null,
            currency: v.currency || functionalCurrency?.code || "KES",
            vat_exempt: !!v.vat_exempt,
        };

        if (expenseToEdit) updateMutation.mutate(payload);
        else createMutation.mutate({ ...payload, status: "Approved" });
    };

    const handleCancel = () => {
        form.resetFields();
        setSupplierSearch("");
        setCustomerSearch("");
        onClose();
    };

    const isLast = step === STEPS.length - 1;
    const show = (s: number) => ({ display: step === s ? "block" : "none" });

    const footer = [
        <Button key="cancel" onClick={handleCancel}>Cancel</Button>,
        step > 0 && <Button key="back" onClick={() => setStep((s) => s - 1)}>Back</Button>,
        isLast ? (
            <Button
                key="submit" type="primary" loading={saving} onClick={handleSubmit}
                style={{ background: ACCENT, borderColor: ACCENT }}
            >
                {expenseToEdit ? "Update Expense" : "Post Expense"}
            </Button>
        ) : (
            <Button key="next" type="primary" onClick={next}>Next</Button>
        ),
    ];

    const reviewValues = form.getFieldsValue(true);

    return (
        <>
            <StepperModal
                open={open}
                onCancel={handleCancel}
                icon={<ArrowUpOutlined />}
                accent={ACCENT}
                title={
                    expenseToEdit
                        ? `Edit Expense — ${expenseToEdit.expense_no || ""}`
                        : isClone
                            ? `Clone Expense — from ${expenseToClone.expense_no || ""}`
                            : "Post Expense"
                }
                steps={STEPS}
                current={step}
                onStepClick={setStep}
                footer={footer}
                width={960}
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ expense_date: dayjs(), lines: [{}] }}
                    onValuesChange={handleValuesChange}
                >
                    {/* ── Step 1: Payment ─────────────────────────────────── */}
                    <div style={show(0)}>
                        <Alert
                            type="success" showIcon
                            message={
                                isClone
                                    ? `Cloned from ${expenseToClone.expense_no || "an existing expense"} — dated today; check the details, then post. The original isn't changed.`
                                    : "Expense posts instantly — cash is recorded as paid now."
                            }
                            style={{ marginBottom: 16 }}
                        />
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="expense_date" label="Date" rules={[{ required: true }]}>
                                    <DatePicker showTime style={{ width: "100%" }} format="DD MMM YYYY HH:mm" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name="reference" label="Reference">
                                    <Input placeholder="Cheque / M-Pesa / bank ref" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="project_id" label="Project (optional)" tooltip="Optional — tag this expense to a project so it shows in that project's Profit & Loss">
                            <ProjectSelect placeholder="No project" />
                        </Form.Item>
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="method_id" label="Payment Method" tooltip="How was this paid?">
                                    <Select
                                        showSearch allowClear placeholder="M-Pesa / Bank / Cash"
                                        options={methodOptions} optionFilterProp="label"
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    name="payment_account_id"
                                    label="Paid From Account (CR)"
                                    rules={[{ required: true, message: "Select the account cash left from" }]}
                                    tooltip="Which bank/cash COA account was credited?"
                                >
                                    <Select
                                        showSearch placeholder="e.g. Cash on Hand, M-Pesa Float"
                                        optionFilterProp="label" disabled={locked}
                                        options={paymentAccountOptions}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item
                            name="currency" label="Currency" rules={[{ required: true }]}
                            initialValue={functionalCurrency?.code || "KES"}
                        >
                            <CurrencySelector placeholder="Select currency" />
                        </Form.Item>
                    </div>

                    {/* ── Step 2: Expense lines ───────────────────────────── */}
                    <div style={show(1)}>
                        <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 12 }}>
                            One payment can cover several expenses — add a line per expense account (DR).
                            Give a line its own date to post it on another day; each date gets its own journal entry.
                        </Text>
                        <Form.List name="lines">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name }) => (
                                        <Row gutter={8} key={key} align="top">
                                            <Col span={6}>
                                                <Form.Item
                                                    name={[name, "account_id"]}
                                                    label={name === 0 ? "Expense Account" : undefined}
                                                    rules={[{ required: true, message: "Select account" }]}
                                                >
                                                    <Select
                                                        showSearch placeholder="e.g. Rent, Fuel"
                                                        options={expenseAccountOptions} optionFilterProp="label"
                                                        disabled={locked}
                                                        dropdownRender={(menu) => (
                                                            <>{menu}{addButton("Add Expense Account", () => setAddAccountOpen(true))}</>
                                                        )}
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <Form.Item
                                                    name={[name, "description"]}
                                                    label={name === 0 ? "Description" : undefined}
                                                    rules={[{ required: true, message: "Required" }]}
                                                >
                                                    <Input placeholder="e.g. Office rent — Jan" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={4}>
                                                <Form.Item
                                                    name={[name, "amount"]}
                                                    label={name === 0 ? "Net Amount" : undefined}
                                                    rules={[{ required: true, message: "Required" }, { type: "number", min: 0.01 }]}
                                                >
                                                    <InputNumber
                                                        style={{ width: "100%" }} min={0.01} precision={2}
                                                        placeholder="0.00" formatter={numFormatter} parser={numParser}
                                                        disabled={locked}
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col span={3}>
                                                <Form.Item
                                                    name={[name, "vat_amount"]}
                                                    label={name === 0 ? `VAT (${(standardVatRate * 100).toFixed(0)}%)` : undefined}
                                                    tooltip={name === 0 ? "Auto-calculated from the net amount and VAT settings" : undefined}
                                                >
                                                    <InputNumber
                                                        style={{ width: "100%" }} min={0} precision={2}
                                                        placeholder="0.00" formatter={numFormatter} parser={numParser}
                                                        readOnly disabled
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col span={4}>
                                                <Form.Item
                                                    name={[name, "date"]}
                                                    label={name === 0 ? "Post On" : undefined}
                                                    tooltip={name === 0 ? "Leave empty to post on the expense date" : undefined}
                                                >
                                                    <DatePicker
                                                        style={{ width: "100%" }} format="DD MMM YYYY"
                                                        placeholder="Expense date"
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col span={1} style={{ paddingTop: name === 0 ? 30 : 0 }}>
                                                <Button
                                                    type="text" danger icon={<DeleteOutlined />}
                                                    disabled={fields.length === 1 || locked}
                                                    onClick={() => remove(name)}
                                                    aria-label="Remove line"
                                                />
                                            </Col>
                                        </Row>
                                    ))}
                                    <Button
                                        type="dashed" block icon={<PlusOutlined />}
                                        onClick={() => add({})} disabled={locked}
                                        style={{ marginBottom: 12 }}
                                    >
                                        Add Expense Line
                                    </Button>
                                </>
                            )}
                        </Form.List>

                        <Form.Item
                            name="vat_exempt"
                            valuePropName="checked"
                            initialValue={false}
                            style={{ marginBottom: 12 }}
                            extra={
                                locked
                                    ? "Changing this on an approved expense reposts its journal entry without VAT Input."
                                    : "For payees whose goods or services carry no VAT — no VAT Input is claimed."
                            }
                        >
                            <Checkbox>VAT exempt — no VAT on this expense</Checkbox>
                        </Form.Item>

                        <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
                            padding: "10px 14px", borderRadius: 8,
                            background: "#fef2f2", border: "1px solid #fecaca",
                        }}>
                            <div>
                                <Text style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                                    Total Expense
                                </Text>
                                <Text style={{ fontSize: 12 }}>
                                    {watchedLines.length} line{watchedLines.length === 1 ? "" : "s"} · Net {fmt2(linesNet)} · VAT {fmt2(linesVat)}
                                </Text>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <Text strong style={{ fontSize: 18, color: ACCENT, display: "block" }}>
                                    {form.getFieldValue("currency") || "KES"} {fmt2(linesTotal)}
                                </Text>
                                <Text style={{ fontSize: 11, color: "#64748b" }}>
                                    deducted from {labelOf(paymentAccountOptions, watchedPaymentAccount) || "Paid From Account (CR)"}
                                </Text>
                            </div>
                        </div>
                    </div>

                    {/* ── Step 3: Payee, notes & review ───────────────────── */}
                    <div style={show(2)}>
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="supplier_id" label="Supplier (optional)" tooltip="Link to a supplier for reporting">
                                    <Select
                                        showSearch allowClear placeholder="Search supplier..."
                                        filterOption={false} onSearch={setSupplierSearch}
                                        loading={suppliersFetching} options={supplierOptions}
                                        notFoundContent={suppliersFetching ? "Searching..." : "No suppliers found"}
                                        dropdownRender={(menu) => (
                                            <>{menu}{addButton("Add New Supplier", () => setAddSupplierOpen(true))}</>
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name="customer_id" label="Customer (optional)" tooltip="Link to a customer for customer statements">
                                    <Select
                                        showSearch allowClear placeholder="Search customer..."
                                        filterOption={false} onSearch={setCustomerSearch}
                                        loading={customersFetching} options={customerOptions}
                                        notFoundContent={customersFetching ? "Searching..." : "No customers found"}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="notes" label="Notes">
                            <TextArea rows={2} />
                        </Form.Item>

                        {step === 2 && (
                            <>
                                <Divider orientation="left" plain style={{ fontSize: 12, margin: "4px 0 12px" }}>Summary</Divider>
                                <Descriptions size="small" column={2} bordered style={{ marginBottom: 12 }}>
                                    <Descriptions.Item label="Date">
                                        {reviewValues.expense_date ? dayjs(reviewValues.expense_date).format("DD MMM YYYY HH:mm") : "—"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Reference">{reviewValues.reference || "—"}</Descriptions.Item>
                                    <Descriptions.Item label="Paid From (CR)" span={2}>
                                        {labelOf(paymentAccountOptions, reviewValues.payment_account_id) || "—"}
                                    </Descriptions.Item>
                                </Descriptions>
                                <Table
                                    size="small" pagination={false}
                                    rowKey={(_, i) => String(i)}
                                    dataSource={watchedLines}
                                    columns={[
                                        { title: "Account (DR)", render: (_: any, l: any) => labelOf(expenseAccountOptions, l?.account_id) || "—" },
                                        { title: "Description", dataIndex: "description" },
                                        {
                                            title: "Posts On",
                                            render: (_: any, l: any) =>
                                                dayjs(l?.date || reviewValues.expense_date).format("DD MMM YYYY"),
                                        },
                                        {
                                            title: "Total", align: "right" as const,
                                            render: (_: any, l: any) => fmt2((Number(l?.amount) || 0) + (Number(l?.vat_amount) || 0)),
                                        },
                                    ]}
                                    summary={() => (
                                        <Table.Summary.Row>
                                            <Table.Summary.Cell index={0} colSpan={3}><Text strong>Total expense (CR {labelOf(paymentAccountOptions, reviewValues.payment_account_id) || "Paid From"})</Text></Table.Summary.Cell>
                                            <Table.Summary.Cell index={3} align="right">
                                                <Text strong style={{ color: ACCENT }}>{fmt2(linesTotal)}</Text>
                                            </Table.Summary.Cell>
                                        </Table.Summary.Row>
                                    )}
                                />
                            </>
                        )}
                    </div>
                </Form>
            </StepperModal>

            <AddProSupplierModal
                externalOpen={addSupplierOpen}
                onExternalClose={() => {
                    setAddSupplierOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["suppliers-dropdown-expense"] });
                }}
            />
            <AccountFormDrawer
                open={addAccountOpen}
                onClose={() => setAddAccountOpen(false)}
                onSuccess={() => {
                    setAddAccountOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
                }}
                accounts={allAccounts}
                shopId={shopId}
            />
        </>
    );
};

export default ExpenseFormModal;
