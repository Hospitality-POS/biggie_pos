import React, { useEffect, useState } from "react";
import {
    Form, Button, Select, InputNumber, Input, Table, Typography, Divider,
    Row, Col, DatePicker, Descriptions, Alert, Spin, Space, Switch, message,
} from "antd";
import {
    PlusOutlined, DeleteOutlined, AccountBookOutlined, UserOutlined,
    UnorderedListOutlined, FileSearchOutlined,
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
import dayjs from "dayjs";
import { useCateringLevy, computeCateringLevy } from "@hooks/useCateringLevy";

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

const emptyLine = (): LineItem => ({
    key: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit_price: 0,
    discount: 0,
    vat_rate: 0.16,
    vat_type: "STANDARD",
});

const fmt2 = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const idOf = (a: any) => (a && typeof a === "object" ? a._id : a);

const VAT_TYPE_OPTIONS: { label: string; value: VatType }[] = [
    { label: "Standard (16%)", value: "STANDARD" },
    { label: "Zero Rated (0%)", value: "ZERO" },
    { label: "Exempt", value: "EXEMPT" },
    { label: "None", value: "NONE" },
    { label: "Out of Scope", value: "OUT_OF_SCOPE" },
];

const PAYMENT_METHOD_OPTIONS: { label: string; value: PaymentMethod }[] = [
    { label: "Cash", value: "Cash" },
    { label: "M-Pesa", value: "M-Pesa" },
    { label: "Card", value: "Card" },
    { label: "Bank Transfer", value: "Bank_Transfer" },
    { label: "Cheque", value: "Cheque" },
    { label: "Other", value: "Other" },
];

const VAT_PRICING_MODE_OPTIONS: { label: string; value: VatPricingMode }[] = [
    { label: "Exclusive", value: "EXCLUSIVE" },
    { label: "Inclusive", value: "INCLUSIVE" },
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
    const [vatPricingMode, setVatPricingMode] = useState<VatPricingMode>("EXCLUSIVE");
    const [levyExempt, setLevyExempt] = useState(false);
    // Rate saved on the receipt when editing, else the branch's current rate
    const [savedLevyRate, setSavedLevyRate] = useState<number | null>(null);
    const branchLevy = useCateringLevy(open);
    const levyRate = savedLevyRate ?? branchLevy.rate;
    const isEdit = !!receiptId;

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
        if (isEdit && receipt) {
            form.setFieldsValue({
                customer_id: receipt.customer_id?._id,
                receipt_date: dayjs(receipt.receipt_date),
                payment_method: receipt.payment_method,
                payment_reference: receipt.payment_reference,
                payment_account_id: idOf(receipt.payment_account_id),
                notes: receipt.notes,
                vat_pricing_mode: receipt.vat_pricing_mode || "EXCLUSIVE",
                vat_standard_rate: receipt.vat_standard_rate ?? 0.16,
                status: receipt.status,
                invoice_id: receipt.invoice_id?._id,
            });
            setVatPricingMode(receipt.vat_pricing_mode || "EXCLUSIVE");
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
                product_id: l.product_id,
                account_id: idOf(l.account_id),
            })));
        } else if (!isEdit) {
            setVatPricingMode("EXCLUSIVE");
            setLines([emptyLine()]);
            form.setFieldsValue({
                receipt_date: dayjs(),
                vat_pricing_mode: "EXCLUSIVE",
                vat_standard_rate: 0.16,
                status: "Pending",
            });
        }
    }, [open, isEdit, receipt, form]);

    // ── Calculations ────────────────────────────────────────────────────────────

    // Mirrors the API: netAmount is always ex-VAT, so net + VAT is what the
    // customer pays in both pricing modes. Only Standard lines carry VAT.
    const calcLine = (line: LineItem) => {
        const amount = line.quantity * line.unit_price - line.discount;
        const vatRate = line.vat_type === "STANDARD" ? line.vat_rate : 0;
        const vatAmount = vatPricingMode === "INCLUSIVE"
            ? amount - (amount / (1 + vatRate))
            : amount * vatRate;
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
    const saving = createMutation.isPending || updateMutation.isPending;

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
            vat_rate: l.vat_rate,
            vat_type: l.vat_type,
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
            vat_pricing_mode: values.vat_pricing_mode,
            vat_standard_rate: values.vat_standard_rate,
            status: values.status || "Pending",
            invoice_id: values.invoice_id,
            catering_levy_exempt: levyExempt,
        };

        if (isEdit) updateMutation.mutate({ id: receiptId!, data });
        else createMutation.mutate(data);
    };

    // ── Line columns ────────────────────────────────────────────────────────────

    const lineColumns = [
        {
            title: "Description", dataIndex: "description", width: 200,
            render: (text: string, r: LineItem) => (
                <Input value={text} placeholder="Item description"
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
            title: "Unit Price", dataIndex: "unit_price", width: 110,
            render: (v: number, r: LineItem) => (
                <InputNumber value={v} min={0} style={{ width: "100%" }}
                    onChange={(n) => updateLine(r.key, "unit_price", n || 0)} />
            ),
        },
        {
            title: "Discount", dataIndex: "discount", width: 90,
            render: (v: number, r: LineItem) => (
                <InputNumber value={v} min={0} style={{ width: "100%" }}
                    onChange={(n) => updateLine(r.key, "discount", n || 0)} />
            ),
        },
        {
            title: "VAT Type", dataIndex: "vat_type", width: 140,
            render: (v: VatType, r: LineItem) => (
                <Select value={v} options={VAT_TYPE_OPTIONS} style={{ width: "100%" }}
                    onChange={(t) => updateLine(r.key, "vat_type", t)} />
            ),
        },
        {
            title: "VAT Rate", dataIndex: "vat_rate", width: 80,
            render: (v: number, r: LineItem) => (
                <InputNumber value={v} min={0} max={1} step={0.01} style={{ width: "100%" }}
                    onChange={(n) => updateLine(r.key, "vat_rate", n || 0)} />
            ),
        },
        {
            title: "Line Total", key: "lineTotal", width: 110, align: "right" as const,
            render: (_: any, r: LineItem) => <Text strong>{fmt2(calcLine(r).lineTotal)}</Text>,
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
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="customer_id" label="Customer (optional)">
                                    <Select
                                        showSearch allowClear optionFilterProp="label"
                                        placeholder="Leave blank for cash sale" options={customerOptions}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name="receipt_date" label="Receipt Date" rules={[{ required: true, message: "Required" }]}>
                                    <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="payment_method" label="Payment Method" rules={[{ required: true, message: "Required" }]}>
                                    <Select options={PAYMENT_METHOD_OPTIONS} placeholder="How was it paid?" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name="payment_reference" label="Payment Reference">
                                    <Input placeholder="Optional — e.g. M-Pesa code" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="payment_account_id" label="Deposit To (Payment Account)">
                                    <Select
                                        showSearch allowClear optionFilterProp="label"
                                        placeholder="Optional — cash/bank account" options={paymentAccountOptions}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name="invoice_id" label="Linked Invoice" tooltip="Optional — settle an open customer invoice with this receipt">
                                    <Select
                                        showSearch allowClear optionFilterProp="label"
                                        placeholder="Optional" options={invoiceOptions}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    {/* ── Step 2: Line items ─────────────────────────────── */}
                    <div style={show(1)}>
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="vat_pricing_mode" label="VAT Pricing Mode">
                                    <Select
                                        options={VAT_PRICING_MODE_OPTIONS}
                                        onChange={(v) => setVatPricingMode(v)}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name="vat_standard_rate" label="Standard VAT Rate">
                                    <InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Table
                            dataSource={lines} columns={lineColumns} rowKey="key"
                            pagination={false} size="small" scroll={{ x: 820 }}
                        />
                        <Button
                            type="dashed" icon={<PlusOutlined />} block
                            onClick={() => setLines((prev) => [...prev, emptyLine()])}
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
                            <Text style={{ fontSize: 12 }}>VAT {fmt2(totalVat)}</Text>
                            {levyRate > 0 && <Text style={{ fontSize: 12 }}>Levy {fmt2(levyAmount)}</Text>}
                            <Text strong style={{ fontSize: 13, color: "#15803d" }}>Grand Total KES {fmt2(grandTotal)}</Text>
                        </div>
                    </div>

                    {/* ── Step 3: Review ─────────────────────────────────── */}
                    <div style={show(2)}>
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
                                <Form.Item name="status" label="Status" initialValue="Pending">
                                    <Select
                                        disabled={isEdit}
                                        options={[
                                            { label: "Pending — post later", value: "Pending" },
                                            { label: "Posted — post to books now", value: "Posted" },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="notes" label="Notes">
                            <TextArea rows={2} placeholder="Optional notes" />
                        </Form.Item>

                        {step === 2 && (
                            <>
                                <Divider orientation="left" plain style={{ fontSize: 12, margin: "4px 0 12px" }}>Summary</Divider>
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
                                    <Descriptions.Item label="VAT">{fmt2(totalVat)}</Descriptions.Item>
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
