import React, { useEffect, useState } from "react";
import {
    Form, Button, Select, InputNumber, Input, Table, Typography, Divider,
    Row, Col, DatePicker, Descriptions, Alert, Spin, Space, Switch, Collapse, message,
} from "antd";
import {
    PlusOutlined, DeleteOutlined, AccountBookOutlined, UserOutlined,
    UnorderedListOutlined, FileSearchOutlined, InfoCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    createSalesReceipt,
    updateSalesReceipt,
    getSalesReceiptById,
    SalesReceiptLineItem,
    PaymentMethod,
    VatType,
    VatPricingMode,
} from "@services/accounting/salesReceipts";
import { fetchAllCustomers } from "@services/customers";
import { getAllAccounts, ChartOfAccount } from "@services/accounting/accounts";
import { getAllInvoices } from "@services/accounting/invoice";
import StepperModal from "@components/MODALS/StepperModal";
import ProjectSelect from "@components/accounting/ProjectSelect";
import dayjs from "dayjs";
import { useCateringLevy, computeCateringLevy } from "@hooks/useCateringLevy";
import { useBranchVat } from "@hooks/useBranchVat";
import { formatRate } from "@utils/taxConfig";

const { Text } = Typography;
const { TextArea } = Input;

const ACCENT = "#22c55e";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LineItem {
    key: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount: number;
    vat_rate: number;
    vat_type: VatType;
    product_id?: string;
    account_id?: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    /** null → create a new receipt */
    receiptId: string | null;
    onSuccess: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const emptyLine = (vatOn = true, rate = 0.16): LineItem => ({
    key: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit_price: 0,
    discount: 0,
    vat_rate: vatOn ? rate : 0,
    vat_type: vatOn ? "STANDARD" : "NONE",
});

const fmt2 = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const idOf = (a: any) => (a && typeof a === "object" ? a._id : a);

// Per-line VAT treatment. The rate itself comes from the branch's VAT
// settings — only the treatment is chosen per line.
const vatTypeOptions = (rate: number, current: VatType[]) => {
    const opts: { label: string; value: VatType }[] = [
        { label: `VAT ${formatRate(rate)}`, value: "STANDARD" },
        { label: "Zero-rated", value: "ZERO" },
        { label: "Exempt", value: "EXEMPT" },
    ];
    // Older receipts may carry these — keep them selectable when editing
    if (current.includes("NONE")) opts.push({ label: "No VAT", value: "NONE" });
    if (current.includes("OUT_OF_SCOPE")) opts.push({ label: "Out of scope", value: "OUT_OF_SCOPE" });
    return opts;
};

const SectionLabel: React.FC<{ children: React.ReactNode; first?: boolean }> = ({ children, first }) => (
    <Text style={{
        display: "block", fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase",
        color: "#64748b", margin: first ? "0 0 10px" : "8px 0 10px",
    }}>{children}</Text>
);

/** Collapsed-by-default group for optional fields, kept mounted so the form keeps their values. */
const OptionalGroup: React.FC<{
    label: string; hint?: string; open: boolean; onToggle: (o: boolean) => void; children: React.ReactNode;
}> = ({ label, hint, open, onToggle, children }) => (
    <Collapse
        ghost size="small" style={{ marginTop: 4, background: "#f8fafc", borderRadius: 8 }}
        activeKey={open ? ["o"] : []}
        onChange={(k) => onToggle((Array.isArray(k) ? k : [k]).includes("o"))}
        items={[{
            key: "o", forceRender: true,
            label: (
                <span style={{ fontSize: 13 }}>
                    {label} <Text type="secondary" style={{ fontSize: 12 }}>— optional{hint ? ` · ${hint}` : ""}</Text>
                </span>
            ),
            children,
        }]}
    />
);

const REFERENCE_HINT: Partial<Record<PaymentMethod, string>> = {
    "M-Pesa": "M-Pesa code, e.g. SGH7XK2LQ1",
    Card: "Card slip / approval no.",
    Bank_Transfer: "Bank reference",
    Cheque: "Cheque number",
    Other: "Reference",
};

const PAYMENT_METHOD_OPTIONS: { label: string; value: PaymentMethod }[] = [
    { label: "Cash", value: "Cash" },
    { label: "M-Pesa", value: "M-Pesa" },
    { label: "Card", value: "Card" },
    { label: "Bank Transfer", value: "Bank_Transfer" },
    { label: "Cheque", value: "Cheque" },
    { label: "Other", value: "Other" },
];

const STEPS = [
    { title: "Customer & Payment", description: "Who paid and how", icon: <UserOutlined /> },
    { title: "Line Items", description: "What was sold", icon: <UnorderedListOutlined /> },
    { title: "Review", description: "Revenue account & save", icon: <FileSearchOutlined /> },
];

const STEP_FIELDS = [
    ["receipt_date", "payment_method"],
    [],
];

// ── Component ──────────────────────────────────────────────────────────────────

const SalesReceiptFormModal: React.FC<Props> = ({ open, onClose, receiptId, onSuccess }) => {
    const [form] = Form.useForm();
    const [step, setStep] = useState(0);
    const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
    const [levyExempt, setLevyExempt] = useState(false);
    // Rate saved on the receipt when editing, else the branch's current rate
    const [savedLevyRate, setSavedLevyRate] = useState<number | null>(null);
    const branchLevy = useCateringLevy(open);
    const levyRate = savedLevyRate ?? branchLevy.rate;
    const isEdit = !!receiptId;

    // VAT comes from the branch (or business-wide) settings — new receipts
    // never ask for a rate or pricing mode. Edited receipts keep what they
    // were saved with so historical totals don't shift.
    const branchVat = useBranchVat(open);
    const [savedVat, setSavedVat] = useState<{ on: boolean; mode: VatPricingMode; rate: number } | null>(null);
    const vatOn = savedVat ? savedVat.on : branchVat.enabled;
    const vatPricingMode: VatPricingMode = savedVat ? savedVat.mode : branchVat.mode;
    const vatRate = savedVat ? savedVat.rate : branchVat.rate;
    const lineVatRate = (l: LineItem) => (savedVat ? l.vat_rate : vatRate);

    const [showInvoiceLink, setShowInvoiceLink] = useState(false);
    const [showMoreOptions, setShowMoreOptions] = useState(false);
    const paymentMethod: PaymentMethod | undefined = Form.useWatch("payment_method", form);

    // ── Data ────────────────────────────────────────────────────────────────────

    const { data: customersData } = useQuery({
        queryKey: ["customers"],
        queryFn: () => fetchAllCustomers({ limit: 1000 }),
        enabled: open,
        staleTime: 60_000,
    });
    const customerOptions = ((Array.isArray(customersData) ? customersData : customersData?.customers) || [])
        .map((c: any) => ({ label: c.customer_name, value: c._id }));

    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts"],
        queryFn: () => getAllAccounts({ is_active: true }),
        enabled: open,
        staleTime: 60_000,
    });
    const allAccounts: ChartOfAccount[] = accountsData?.accounts || [];
    const paymentAccountOptions = allAccounts
        .filter((a) => a.account_type === "ASSET" && /cash|bank/i.test(a.account_name))
        .map((a) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));
    const revenueAccountOptions = allAccounts
        .filter((a) => a.account_type === "REVENUE")
        .map((a) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));

    const { data: invoicesData } = useQuery({
        queryKey: ["invoices", "unsettled-for-receipt"],
        queryFn: () => getAllInvoices({ direction: "customer", status: ["Pending", "Partially_Paid"] }),
        enabled: open,
        staleTime: 60_000,
    });
    const invoiceOptions = (invoicesData?.invoices || []).map((inv: any) => ({
        label: `${inv.order_no} - KES ${inv.grand_total?.toLocaleString()} (${inv.status})`,
        value: inv._id,
    }));

    const { data: receipt, isLoading: loadingReceipt } = useQuery({
        queryKey: ["sales-receipt", receiptId],
        queryFn: () => getSalesReceiptById(receiptId!),
        enabled: open && isEdit,
    });

    // ── Reset / populate on open ────────────────────────────────────────────────

    useEffect(() => {
        if (!open) return;
        setStep(0);
        form.resetFields();
        setLevyExempt(false);
        setSavedLevyRate(null);
        setSavedVat(null);
        setShowInvoiceLink(false);
        setShowMoreOptions(false);
        if (isEdit && receipt) {
            form.setFieldsValue({
                customer_id: receipt.customer_id?._id,
                receipt_date: dayjs(receipt.receipt_date),
                payment_method: receipt.payment_method,
                payment_reference: receipt.payment_reference,
                payment_account_id: idOf(receipt.payment_account_id),
                revenue_account_id: idOf((receipt as any).revenue_account_id) || undefined,
                notes: receipt.notes,
                status: receipt.status,
                invoice_id: receipt.invoice_id?._id,
                project_id: idOf(receipt.project_id) || undefined,
            });
            setSavedVat({
                on: (receipt as any).total_vat > 0 || receipt.lines.some((l) => (l.vat_type || "STANDARD") === "STANDARD" && (l.vat_rate ?? 0) > 0),
                mode: receipt.vat_pricing_mode || "EXCLUSIVE",
                rate: receipt.vat_standard_rate ?? 0.16,
            });
            setShowInvoiceLink(!!receipt.invoice_id);
            setShowMoreOptions(!!(idOf(receipt.project_id) || receipt.notes));
            setLevyExempt(!!receipt.catering_levy_exempt);
            setSavedLevyRate(receipt.catering_levy_rate ?? 0);
            setLines(receipt.lines.map((l) => ({
                key: l._id || crypto.randomUUID(),
                description: l.description,
                quantity: l.quantity,
                unit_price: l.unit_price,
                discount: l.discount || 0,
                vat_rate: l.vat_rate ?? 0.16,
                vat_type: l.vat_type || "STANDARD",
                product_id: idOf(l.product_id),
                account_id: idOf(l.account_id),
            })));
        } else if (!isEdit) {
            setLines([emptyLine(branchVat.enabled, branchVat.rate)]);
            form.setFieldsValue({
                receipt_date: dayjs(),
                payment_method: "Cash",
                status: "Pending",
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, isEdit, receipt, form]);

    // Branch VAT may arrive after the modal opens — line treatment follows it
    // for new receipts (VAT off → "NONE", VAT on → standard-rated by default).
    useEffect(() => {
        if (!open || isEdit || branchVat.isLoading) return;
        setLines((prev) => prev.map((l) => ({
            ...l,
            vat_type: branchVat.enabled ? (l.vat_type === "NONE" ? "STANDARD" : l.vat_type) : "NONE",
        })));
    }, [open, isEdit, branchVat.isLoading, branchVat.enabled]);

    // ── Calculations ────────────────────────────────────────────────────────────

    // Mirrors the API: netAmount is always ex-VAT, so net + VAT is what the
    // customer pays in both pricing modes. Only Standard lines carry VAT.
    const calcLine = (line: LineItem) => {
        const amount = line.quantity * line.unit_price - line.discount;
        const rate = vatOn && line.vat_type === "STANDARD" ? lineVatRate(line) : 0;
        const vatAmount = vatPricingMode === "INCLUSIVE"
            ? amount - (amount / (1 + rate))
            : amount * rate;
        const netAmount = vatPricingMode === "INCLUSIVE" ? amount - vatAmount : amount;
        return { netAmount, vatAmount, lineTotal: netAmount + vatAmount };
    };
    const subtotal = lines.reduce((s, l) => s + calcLine(l).netAmount, 0);
    const totalVat = lines.reduce((s, l) => s + calcLine(l).vatAmount, 0);
    // Catering levy on the net sale value (after discounts, ex VAT)
    const levyAmount = computeCateringLevy(subtotal, levyRate, levyExempt);
    const fullLevy = computeCateringLevy(subtotal, levyRate, false);
    const levyPct = parseFloat((levyRate * 100).toFixed(2));
    const grandTotal = subtotal + totalVat + levyAmount;

    const updateLine = (key: string, field: keyof LineItem, value: any) =>
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));

    // ── Mutations ───────────────────────────────────────────────────────────────

    const done = () => {
        onSuccess();
        onClose();
    };
    const createMutation = useMutation({
        mutationFn: createSalesReceipt,
        onSuccess: () => {
            message.success("Sales receipt created successfully");
            done();
        },
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateSalesReceipt(id, data),
        onSuccess: done,
    });
    const saving = createMutation.isLoading || updateMutation.isLoading;

    // ── Step navigation ─────────────────────────────────────────────────────────

    const linesValid = () => {
        if (lines.some((l) => !l.description?.trim() || l.unit_price <= 0)) {
            message.warning("Every line needs a description and a unit price");
            return false;
        }
        return true;
    };

    const next = async () => {
        try {
            if (STEP_FIELDS[step]?.length) await form.validateFields(STEP_FIELDS[step]);
        } catch {
            return;
        }
        if (step === 1 && !linesValid()) return;
        setStep((s) => s + 1);
    };

    const handleSubmit = async () => {
        let values: any;
        try {
            values = await form.validateFields();
        } catch (e: any) {
            const bad = e?.errorFields?.[0]?.name?.[0];
            const idx = STEP_FIELDS.findIndex((f) => f.includes(bad));
            if (idx >= 0) setStep(idx);
            return;
        }
        if (!linesValid()) {
            setStep(1);
            return;
        }

        const lineItems: SalesReceiptLineItem[] = lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unit_price,
            discount: l.discount,
            // Editing keeps each line's stored VAT values unless its treatment
            // was changed, so an untouched posted receipt isn't re-posted.
            vat_rate: savedVat
                ? (l.vat_type === "STANDARD" ? (l.vat_rate || savedVat.rate) : l.vat_rate)
                : (vatOn && l.vat_type === "STANDARD" ? vatRate : 0),
            vat_type: savedVat ? l.vat_type : (vatOn ? l.vat_type : "NONE"),
            product_id: l.product_id,
            account_id: l.account_id,
        }));

        const data = {
            customer_id: values.customer_id || null,
            receipt_date: values.receipt_date
                ? values.receipt_date.format("YYYY-MM-DD")
                : dayjs().format("YYYY-MM-DD"),
            lines: lineItems,
            payment_method: values.payment_method,
            payment_reference: values.payment_reference,
            payment_account_id: values.payment_account_id,
            revenue_account_id: values.revenue_account_id,
            notes: values.notes,
            vat_pricing_mode: vatPricingMode,
            vat_standard_rate: savedVat ? savedVat.rate : (vatOn ? vatRate : 0),
            status: values.status || "Pending",
            invoice_id: values.invoice_id,
            catering_levy_exempt: levyExempt,
            project_id: values.project_id || null,
        };

        if (isEdit) updateMutation.mutate({ id: receiptId!, data });
        else createMutation.mutate(data);
    };

    // ── Line columns ────────────────────────────────────────────────────────────

    const lineVatTypes = lines.map((l) => l.vat_type);
    const lineColumns = [
        {
            title: "Description", dataIndex: "description",
            render: (text: string, r: LineItem) => (
                <Input value={text} placeholder="What was sold"
                    onChange={(e) => updateLine(r.key, "description", e.target.value)} />
            ),
        },
        {
            title: "Qty", dataIndex: "quantity", width: 80,
            render: (v: number, r: LineItem) => (
                <InputNumber value={v} min={1} style={{ width: "100%" }}
                    onChange={(n) => updateLine(r.key, "quantity", n || 1)} />
            ),
        },
        {
            title: vatOn && vatPricingMode === "INCLUSIVE" ? "Price (incl. VAT)" : "Unit Price", dataIndex: "unit_price", width: 130,
            render: (v: number, r: LineItem) => (
                <InputNumber value={v} min={0} style={{ width: "100%" }}
                    onChange={(n) => updateLine(r.key, "unit_price", n || 0)} />
            ),
        },
        {
            title: "Discount", dataIndex: "discount", width: 100,
            render: (v: number, r: LineItem) => (
                <InputNumber value={v} min={0} style={{ width: "100%" }} placeholder="0"
                    onChange={(n) => updateLine(r.key, "discount", n || 0)} />
            ),
        },
        // VAT treatment only when VAT is charged at this branch
        ...(vatOn ? [{
            title: "VAT", dataIndex: "vat_type", width: 130,
            render: (v: VatType, r: LineItem) => (
                <Select value={v} options={vatTypeOptions(savedVat ? lineVatRate(r) : vatRate, lineVatTypes)} style={{ width: "100%" }}
                    onChange={(t) => updateLine(r.key, "vat_type", t)} />
            ),
        }] : []),
        {
            title: "Line Total", key: "lineTotal", width: 120, align: "right" as const,
            render: (_: any, r: LineItem) => <Text strong style={{ fontVariantNumeric: "tabular-nums" }}>{fmt2(calcLine(r).lineTotal)}</Text>,
        },
        {
            title: "", key: "actions", width: 44,
            render: (_: any, r: LineItem) => (
                <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove line"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((l) => l.key !== r.key))} />
            ),
        },
    ];

    const labelOf = (opts: { label: string; value: string }[], id?: string) =>
        opts.find((o) => o.value === id)?.label;

    const isLast = step === STEPS.length - 1;
    const show = (s: number) => ({ display: step === s ? "block" : "none" });
    const reviewValues = form.getFieldsValue(true);

    const footer = [
        <Button key="cancel" onClick={onClose}>Cancel</Button>,
        step > 0 && <Button key="back" onClick={() => setStep((s) => s - 1)}>Back</Button>,
        isLast ? (
            <Button key="submit" type="primary" loading={saving} onClick={handleSubmit}
                style={{ background: ACCENT, borderColor: ACCENT }}>
                {isEdit ? "Update Receipt" : "Create Receipt"}
            </Button>
        ) : (
            <Button key="next" type="primary" onClick={next} disabled={isEdit && loadingReceipt}>Next</Button>
        ),
    ];

    return (
        <StepperModal
            open={open}
            onCancel={onClose}
            icon={<AccountBookOutlined />}
            accent={ACCENT}
            title={isEdit ? `Edit Sales Receipt${receipt ? ` — ${receipt.receipt_no}` : ""}` : "New Sales Receipt"}
            steps={STEPS}
            current={step}
            onStepClick={setStep}
            footer={footer}
            width={1080}
        >
            <Spin spinning={isEdit && loadingReceipt}>
                <Form form={form} layout="vertical">
                    {/* ── Step 1: Customer & payment ─────────────────────── */}
                    <div style={show(0)}>
                        <SectionLabel first>Sale</SectionLabel>
                        <Row gutter={16}>
                            <Col xs={24} sm={16}>
                                <Form.Item name="customer_id" label="Customer" extra="Leave blank for a walk-in cash sale">
                                    <Select
                                        showSearch allowClear optionFilterProp="label"
                                        placeholder="Walk-in customer" options={customerOptions}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Form.Item name="receipt_date" label="Receipt Date" rules={[{ required: true, message: "Required" }]}>
                                    <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <SectionLabel>Payment</SectionLabel>
                        <Row gutter={16}>
                            <Col xs={24} sm={8}>
                                <Form.Item name="payment_method" label="Paid With" rules={[{ required: true, message: "Required" }]}>
                                    <Select options={PAYMENT_METHOD_OPTIONS} placeholder="How was it paid?" />
                                </Form.Item>
                            </Col>
                            {/* Reference sits next to the method and only when the method has one */}
                            {paymentMethod && paymentMethod !== "Cash" && (
                                <Col xs={24} sm={8}>
                                    <Form.Item name="payment_reference" label="Reference">
                                        <Input placeholder={REFERENCE_HINT[paymentMethod] || "Reference"} />
                                    </Form.Item>
                                </Col>
                            )}
                            <Col xs={24} sm={paymentMethod && paymentMethod !== "Cash" ? 8 : 16}>
                                <Form.Item name="payment_account_id" label="Deposit To" tooltip="The cash or bank account the money went into">
                                    <Select
                                        showSearch allowClear optionFilterProp="label"
                                        placeholder="Default cash/bank account" options={paymentAccountOptions}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <OptionalGroup
                            label="Settle an open invoice"
                            hint={invoiceOptions.length ? `${invoiceOptions.length} open` : "none open"}
                            open={showInvoiceLink}
                            onToggle={setShowInvoiceLink}
                        >
                            <Form.Item name="invoice_id" label="Invoice" style={{ marginBottom: 0 }}
                                extra="Use this receipt as payment for an unpaid customer invoice">
                                <Select
                                    showSearch allowClear optionFilterProp="label"
                                    placeholder="Select an invoice" options={invoiceOptions}
                                    notFoundContent="No open customer invoices"
                                />
                            </Form.Item>
                        </OptionalGroup>
                    </div>

                    {/* ── Step 2: Line items ─────────────────────────────── */}
                    <div style={show(1)}>
                        {/* VAT is decided by the branch's tax settings, not on this form */}
                        <div style={{
                            display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 12px",
                            borderRadius: 8, fontSize: 12,
                            background: vatOn ? "#eff6ff" : "#f8fafc",
                            border: `1px solid ${vatOn ? "#bfdbfe" : "#e2e8f0"}`,
                            color: vatOn ? "#1e40af" : "#475569",
                        }}>
                            <InfoCircleOutlined />
                            {branchVat.isLoading && !savedVat ? (
                                <span>Loading VAT settings…</span>
                            ) : vatOn ? (
                                <span>
                                    <b>VAT {formatRate(vatRate)}</b> · prices are{" "}
                                    <b>{vatPricingMode === "INCLUSIVE" ? "VAT inclusive" : "VAT exclusive"}</b>
                                    {savedVat
                                        ? " (as saved on this receipt)"
                                        : branchVat.source === "shop"
                                            ? ` — from ${branchVat.branchName || "this branch"}'s tax settings`
                                            : " — business-wide VAT setting"}
                                </span>
                            ) : (
                                <span>VAT is off for {branchVat.branchName || "this branch"} — no VAT will be charged. Turn it on in the branch's tax settings.</span>
                            )}
                        </div>
                        <Table
                            dataSource={lines} columns={lineColumns} rowKey="key"
                            pagination={false} size="small" scroll={{ x: vatOn ? 760 : 640 }}
                        />
                        <Button
                            type="dashed" icon={<PlusOutlined />} block
                            onClick={() => setLines((prev) => [...prev, emptyLine(vatOn, vatRate)])}
                            style={{ marginTop: 12 }}
                        >
                            Add Line Item
                        </Button>
                        {levyRate > 0 && (
                            <div style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                gap: 12, flexWrap: "wrap", marginTop: 12,
                            }}>
                                <Space size={10} wrap>
                                    <Text>Catering Levy ({levyPct}%)</Text>
                                    <Switch size="small" checked={levyExempt} onChange={setLevyExempt} />
                                    <Text type="secondary" style={{ fontSize: 12 }}>Exempt from catering levy</Text>
                                </Space>
                                <Text strong delete={levyExempt}>KES {fmt2(fullLevy)}</Text>
                            </div>
                        )}
                        <div style={{
                            display: "flex", justifyContent: "flex-end", gap: 24, flexWrap: "wrap",
                            marginTop: 12, padding: "8px 12px", borderRadius: 8,
                            background: "#f0fdf4", border: "1px solid #bbf7d0",
                        }}>
                            <Text style={{ fontSize: 12 }}>Subtotal {fmt2(subtotal)}</Text>
                            {vatOn && <Text style={{ fontSize: 12 }}>VAT {fmt2(totalVat)}</Text>}
                            {levyRate > 0 && <Text style={{ fontSize: 12 }}>Levy {fmt2(levyAmount)}</Text>}
                            <Text strong style={{ fontSize: 13, color: "#15803d" }}>Grand Total KES {fmt2(grandTotal)}</Text>
                        </div>
                    </div>

                    {/* ── Step 3: Review ─────────────────────────────────── */}
                    <div style={show(2)}>
                        <SectionLabel first>Posting</SectionLabel>
                        <Row gutter={16}>
                            <Col xs={24} sm={14}>
                                <Form.Item
                                    name="revenue_account_id" label="Revenue Account"
                                    rules={[{ required: !isEdit, message: "Required for posting" }]}
                                >
                                    <Select
                                        showSearch optionFilterProp="label"
                                        placeholder="Select sales revenue account" options={revenueAccountOptions}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={10}>
                                <Form.Item name="status" label="Post to books" initialValue="Pending">
                                    <Select
                                        disabled={isEdit}
                                        options={[
                                            { label: "Later — save as Pending", value: "Pending" },
                                            { label: "Now — post immediately", value: "Posted" },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <OptionalGroup label="Project & notes" open={showMoreOptions} onToggle={setShowMoreOptions}>
                            <Row gutter={16}>
                                <Col xs={24} sm={10}>
                                    <Form.Item name="project_id" label="Project" tooltip="Tag this to a project so it shows in that project's Profit & Loss" style={{ marginBottom: 0 }}>
                                        <ProjectSelect placeholder="No project" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={14}>
                                    <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
                                        <TextArea rows={2} placeholder="Internal notes" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </OptionalGroup>
                        <div style={{ height: 12 }} />

                        {step === 2 && (
                            <>
                                <Divider orientation="left" plain style={{ fontSize: 12, margin: "4px 0 12px" }}>Summary</Divider>
                                {isEdit && receipt?.status === "Posted" && (
                                    <Alert
                                        type="warning" showIcon style={{ marginBottom: 12 }}
                                        message="This receipt is already posted"
                                        description={
                                            <>
                                                If you change the amounts, date, customer or accounts, journal entry{" "}
                                                {(receipt as any).journal_entry_id?.entry_no
                                                    ? <Text code>{(receipt as any).journal_entry_id.entry_no}</Text>
                                                    : "for this receipt"}{" "}
                                                will be voided and a corrected entry posted in its place. Changes to notes,
                                                reference, project or the linked invoice don't touch the journal.
                                            </>
                                        }
                                    />
                                )}
                                {reviewValues.status === "Posted" && !isEdit && (
                                    <Alert
                                        type="info" showIcon style={{ marginBottom: 12 }}
                                        message="This receipt will be posted to the books as soon as it's created."
                                    />
                                )}
                                <Descriptions size="small" column={2} bordered>
                                    <Descriptions.Item label="Customer">
                                        {labelOf(customerOptions, reviewValues.customer_id) || "Cash Sale"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Date">
                                        {reviewValues.receipt_date ? dayjs(reviewValues.receipt_date).format("DD MMM YYYY") : "—"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Payment">
                                        {PAYMENT_METHOD_OPTIONS.find((o) => o.value === reviewValues.payment_method)?.label || "—"}
                                        {reviewValues.payment_reference ? ` · ${reviewValues.payment_reference}` : ""}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Deposit To">
                                        {labelOf(paymentAccountOptions, reviewValues.payment_account_id) || "—"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Lines">{lines.length}</Descriptions.Item>
                                    <Descriptions.Item label={vatOn ? `VAT (${formatRate(vatRate)})` : "VAT"}>
                                        {vatOn ? fmt2(totalVat) : "Not charged"}
                                    </Descriptions.Item>
                                    {levyRate > 0 && (
                                        <Descriptions.Item label={`Catering Levy (${levyPct}%)`} span={2}>
                                            {levyExempt ? "Exempt" : fmt2(levyAmount)}
                                        </Descriptions.Item>
                                    )}
                                    <Descriptions.Item label="Grand Total" span={2}>
                                        <Text strong style={{ color: "#15803d" }}>KES {fmt2(grandTotal)}</Text>
                                    </Descriptions.Item>
                                </Descriptions>
                            </>
                        )}
                    </div>
                </Form>
            </Spin>
        </StepperModal>
    );
};

export default SalesReceiptFormModal;
