import React, { useEffect, useState } from "react";
import {
    Modal, Form, Input, InputNumber, Select, DatePicker,
    Button, Space, Table, Divider, App, Row, Col, Tag,
    Typography, Alert, Segmented, Steps, Card, Statistic, Tooltip,
} from "antd";
import {
    PlusOutlined, DeleteOutlined,
    FileDoneOutlined, FileTextOutlined, DollarOutlined,
    CheckCircleOutlined, ArrowRightOutlined, InfoCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllAccounts } from "@services/accounting/accounts";
import { createInvoice, convertQuoteToInvoice, recordInvoicePayment } from "@services/accounting/invoice";
import { fetchAllCustomers } from "@services/customers";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { fetchTenantDetails, getCurrentTenantId } from "@services/tenants";
import AddCustomerModal from "@pages/Customer/AddCustomerModal";
import AccountFormDrawer from "@pages/ChartOfAccounts/AccountFormDrawer";
import dayjs, { Dayjs } from "dayjs";

const { TextArea } = Input;
const { Text } = Typography;

const PAYMENT_TERMS = [
    { label: "Due on Receipt", value: "Due on Receipt" },
    { label: "Net 7", value: "Net 7" },
    { label: "Net 14", value: "Net 14" },
    { label: "Net 30", value: "Net 30" },
    { label: "Net 60", value: "Net 60" },
    { label: "Net 90", value: "Net 90" },
    { label: "50% Upfront", value: "50% Upfront" },
    { label: "Cash on Delivery", value: "Cash on Delivery" },
];

const TERM_DAYS: Record<string, number | null> = {
    "Due on Receipt": 0,
    "Net 7": 7,
    "Net 14": 14,
    "Net 30": 30,
    "Net 60": 60,
    "Net 90": 90,
    "50% Upfront": null,
    "Cash on Delivery": null,
};

const calcDueDate = (issueDate: Dayjs, terms: string): Dayjs | null => {
    const days = TERM_DAYS[terms];
    if (days == null) return null;
    return issueDate.add(days, "day");
};

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface LineItem {
    key: string;
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
    account_id: string;
}

type DocType = "quote" | "invoice";

const newLine = (defaultVatRate = 0): LineItem => ({
    key: `${Date.now()}-${Math.random()}`,
    description: "",
    quantity: 1,
    unit_price: 0,
    vat_rate: defaultVatRate,
    account_id: "",
});

// ─────────────────────────────────────────────────────────────────────────────
const ManualInvoiceModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
    const [form] = Form.useForm();
    const [payForm] = Form.useForm();
    const { message } = App.useApp();
    const queryClient = useQueryClient();

    const [lines, setLines] = useState<LineItem[]>([newLine()]);
    const [docType, setDocType] = useState<DocType>("invoice");
    const [step, setStep] = useState(0);
    const [savedInvoice, setSavedInvoice] = useState<any>(null);
    const [customerSearch, setCustomerSearch] = useState("");

    // ── Inline add modals ─────────────────────────────────────────────────────
    const [addCustomerOpen, setAddCustomerOpen] = useState(false);
    const [addAccountOpen, setAddAccountOpen] = useState(false);
    const [addDepositAccountOpen, setAddDepositAccountOpen] = useState(false);

    const shopId = localStorage.getItem("shopId") || "";
    const tenantId = getCurrentTenantId();

    // ── Tenant VAT config ─────────────────────────────────────────────────────
    const { data: tenantData } = useQuery({
        queryKey: ["tenant", tenantId],
        queryFn: () => fetchTenantDetails(tenantId),
        enabled: !!tenantId && open,
        staleTime: 5 * 60 * 1000,
    });

    const tenant = tenantData?.data;
    const vatEnabled = tenant?.is_vat_enabled ?? true;
    const standardVatRate = tenant?.vat_standard_rate ?? 0.16;
    const vatPricingMode = tenant?.vat_pricing_mode ?? "EXCLUSIVE";

    const vatRateOptions = [
        { label: "Exempt (0%)", value: 0 },
        { label: `Standard (${(standardVatRate * 100).toFixed(0)}%)`, value: standardVatRate },
    ];

    useEffect(() => {
        if (!vatEnabled) {
            setLines((prev) => prev.map((l) => ({ ...l, vat_rate: 0 })));
        }
    }, [vatEnabled]);

    // ── Accounts ──────────────────────────────────────────────────────────────
    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts"],
        queryFn: () => getAllAccounts({}),
        enabled: open,
    });
    const allAccounts = accountsData?.accounts || [];

    const revenueAccounts = allAccounts.filter(
        (a: any) => a.account_type === "REVENUE" && a.is_active
    );
    const assetAccounts = allAccounts.filter(
        (a: any) => a.account_type === "ASSET" && a.is_active
    );
    const assetAccountOptions = assetAccounts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));

    // ── Customers ─────────────────────────────────────────────────────────────
    const { data: customersData, isFetching: customersFetching } = useQuery({
        queryKey: ["customers-dropdown", customerSearch],
        queryFn: () => fetchAllCustomers({ customer_name: customerSearch }),
        enabled: open,
        select: (res: any) =>
            Array.isArray(res) ? res : (res?.customers || res?.data || []),
        staleTime: 30_000,
    });
    const customerOptions = (customersData || []).map((c: any) => ({
        label: `${c.customer_name}${c.phone ? ` — ${c.phone}` : ""}`,
        value: c._id,
    }));

    // ── Payment methods ───────────────────────────────────────────────────────
    const { data: methodsData } = useQuery({
        queryKey: ["payment-methods"],
        queryFn: () => fetchAllPaymentMethods({}),
        enabled: open && step === 2,
    });
    const methodOptions = (methodsData || []).map((m: any) => ({
        label: m.name,
        value: m._id,
    }));

    // ── Shared: refetch helpers called after inline creates ───────────────────
    const handleCustomerAdded = () => {
        queryClient.invalidateQueries({ queryKey: ["customers-dropdown"] });
    };
    const handleAccountAdded = () => {
        queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    };

    // ── Shared: dropdown footer factory ──────────────────────────────────────
    const dropdownFooter = (label: string, onAdd: () => void) => (
        <>
            <Divider style={{ margin: "4px 0" }} />
            <Button
                type="link"
                icon={<PlusOutlined />}
                style={{ width: "100%", textAlign: "left", padding: "4px 8px" }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    onAdd();
                }}
            >
                {label}
            </Button>
        </>
    );

    // ── Line helpers ──────────────────────────────────────────────────────────
    const updateLine = (key: string, field: keyof LineItem, val: any) =>
        setLines((prev) =>
            prev.map((l) => (l.key === key ? { ...l, [field]: val } : l))
        );

    const addLine = () =>
        setLines((prev) => [
            ...prev,
            newLine(vatEnabled ? standardVatRate : 0),
        ]);

    const removeLine = (key: string) =>
        setLines((prev) => prev.filter((l) => l.key !== key));

    // ── Totals ────────────────────────────────────────────────────────────────
    const lineNet = (l: LineItem) => {
        if (vatPricingMode === "INCLUSIVE" && l.vat_rate > 0) {
            return (l.quantity * l.unit_price) / (1 + l.vat_rate);
        }
        return l.quantity * l.unit_price;
    };
    const lineVAT = (l: LineItem) => {
        if (!vatEnabled || l.vat_rate === 0) return 0;
        if (vatPricingMode === "INCLUSIVE") {
            const gross = l.quantity * l.unit_price;
            return gross - gross / (1 + l.vat_rate);
        }
        return lineNet(l) * l.vat_rate;
    };
    const lineGross = (l: LineItem) =>
        vatPricingMode === "INCLUSIVE"
            ? l.quantity * l.unit_price
            : lineNet(l) + lineVAT(l);

    const subtotal = lines.reduce((s, l) => s + lineNet(l), 0);
    const totalVAT = lines.reduce((s, l) => s + lineVAT(l), 0);
    const grandTotal = subtotal + totalVAT;

    const fmt = (n: number) =>
        n.toLocaleString("en-KE", { minimumFractionDigits: 2 });

    // ── Mutations ─────────────────────────────────────────────────────────────
    const saveMutation = useMutation({
        mutationFn: createInvoice,
        onSuccess: (data) => {
            setSavedInvoice(data?.invoice);
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
            setStep(docType === "quote" ? 1 : 2);
        },
        onError: (err: any) =>
            message.error(err?.response?.data?.message || "Failed to save"),
    });

    const convertMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data?: any }) =>
            convertQuoteToInvoice(id, data),
        onSuccess: (data) => {
            setSavedInvoice(data?.invoice);
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
            setStep(2);
        },
        onError: (err: any) =>
            message.error(err?.response?.data?.message || "Failed to convert"),
    });

    const payMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            recordInvoicePayment(id, data),
        onSuccess: () => {
            message.success("Payment recorded — invoice settled");
            queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
            queryClient.invalidateQueries({ queryKey: ["income-history"] });
            onSuccess?.();
            handleClose();
        },
        onError: (err: any) =>
            message.error(err?.response?.data?.message || "Failed to record payment"),
    });

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleClose = () => {
        form.resetFields();
        payForm.resetFields();
        setLines([newLine(vatEnabled ? standardVatRate : 0)]);
        setStep(0);
        setDocType("invoice");
        setSavedInvoice(null);
        onClose();
    };

    const buildPayload = (values: any, status: "Draft" | "Pending") => ({
        direction: "customer" as const,
        shop_id: shopId,
        customer_id: values.customer_id,
        issue_date: values.issue_date?.toISOString(),
        due_date: values.due_date?.toISOString(),
        notes: values.notes,
        terms: values.terms,
        status,
        lines: lines.map((l) => ({
            description: l.description,
            account_id: l.account_id,
            quantity: l.quantity,
            price: l.unit_price,
            vat_rate: vatEnabled ? l.vat_rate : 0,
            vat_amount: parseFloat(lineVAT(l).toFixed(2)),
        })),
    } as any);

    const handleSave = async () => {
        if (!shopId) {
            message.error("No shop selected — please select a branch first");
            return;
        }
        const values = await form.validateFields();
        if (lines.some((l) => !l.description || l.unit_price <= 0)) {
            message.warning("Fill in all line items — description and price are required");
            return;
        }
        saveMutation.mutate(
            buildPayload(values, docType === "quote" ? "Draft" : "Pending")
        );
    };

    const handleConvert = () => {
        const values = form.getFieldsValue();
        convertMutation.mutate({
            id: savedInvoice._id,
            data: {
                due_date: values.due_date?.toISOString(),
                notes: values.notes,
                terms: values.terms,
            },
        });
    };

    const handlePayNow = async () => {
        const v = await payForm.validateFields();
        payMutation.mutate({
            id: savedInvoice._id,
            data: {
                amount: v.amount,
                method_id: v.method_id,
                account_id: v.account_id,
                reference: v.reference,
                notes: v.notes,
            },
        });
    };

    // ── Line items columns ────────────────────────────────────────────────────
    const lineColumns = [
        {
            title: "Description",
            dataIndex: "description",
            render: (_: any, r: LineItem) => (
                <Input
                    size="small" placeholder="Item / service"
                    value={r.description}
                    onChange={(e) => updateLine(r.key, "description", e.target.value)}
                />
            ),
        },
        {
            title: "Revenue Account",
            dataIndex: "account_id",
            width: 200,
            render: (_: any, r: LineItem) => (
                <Select
                    size="small" style={{ width: "100%" }}
                    placeholder="Account (display only)"
                    value={r.account_id || undefined}
                    showSearch optionFilterProp="label" allowClear
                    onChange={(v) => updateLine(r.key, "account_id", v ?? "")}
                    options={revenueAccounts.map((a: any) => ({
                        label: `${a.account_code} ${a.account_name}`,
                        value: a._id,
                    }))}
                    dropdownRender={(menu) => (
                        <>
                            {menu}
                            {dropdownFooter("Add Revenue Account", () => setAddAccountOpen(true))}
                        </>
                    )}
                />
            ),
        },
        {
            title: "Qty",
            dataIndex: "quantity",
            width: 65,
            render: (_: any, r: LineItem) => (
                <InputNumber
                    size="small" min={1} value={r.quantity} style={{ width: "100%" }}
                    onChange={(v) => updateLine(r.key, "quantity", v || 1)}
                />
            ),
        },
        {
            title: vatPricingMode === "INCLUSIVE" ? "Unit Price (incl. VAT)" : "Unit Price",
            dataIndex: "unit_price",
            width: 125,
            render: (_: any, r: LineItem) => (
                <InputNumber
                    size="small" min={0} precision={2} value={r.unit_price}
                    style={{ width: "100%" }}
                    onChange={(v) => updateLine(r.key, "unit_price", v || 0)}
                />
            ),
        },
        ...(vatEnabled
            ? [{
                title: (
                    <Space size={4}>
                        VAT
                        <Tooltip title={`Pricing mode: ${vatPricingMode}`}>
                            <InfoCircleOutlined style={{ fontSize: 11, color: "#8c8c8c" }} />
                        </Tooltip>
                    </Space>
                ),
                dataIndex: "vat_rate",
                width: 120,
                render: (_: any, r: LineItem) => (
                    <Select
                        size="small" style={{ width: "100%" }}
                        value={r.vat_rate}
                        onChange={(v) => updateLine(r.key, "vat_rate", v)}
                        options={vatRateOptions}
                    />
                ),
            }]
            : []
        ),
        {
            title: "Total",
            key: "gross",
            width: 110,
            align: "right" as const,
            render: (_: any, r: LineItem) => (
                <Text strong>{fmt(lineGross(r))}</Text>
            ),
        },
        {
            title: "",
            key: "del",
            width: 36,
            render: (_: any, r: LineItem) => (
                <Button
                    type="text" danger size="small" icon={<DeleteOutlined />}
                    disabled={lines.length === 1}
                    onClick={() => removeLine(r.key)}
                />
            ),
        },
    ];

    // ── Totals block ──────────────────────────────────────────────────────────
    const TotalsCard = () => (
        <Row justify="end">
            <Col span={10}>
                <div style={{
                    background: "#fafafa", padding: "12px 16px",
                    borderRadius: 8, border: "1px solid #f0f0f0",
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <Text type="secondary">Subtotal (excl. VAT)</Text>
                        <Text>KES {fmt(subtotal)}</Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <Text type="secondary">VAT</Text>
                        {vatEnabled
                            ? <Tag color="blue">KES {fmt(totalVAT)}</Tag>
                            : <Tag color="default">Exempt</Tag>
                        }
                    </div>
                    <Divider style={{ margin: "8px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text strong>Grand Total</Text>
                        <Text strong style={{ fontSize: 16, color: "#1d39c4" }}>
                            KES {fmt(grandTotal)}
                        </Text>
                    </div>
                </div>
            </Col>
        </Row>
    );

    // ── Step 0 — create quote / invoice ───────────────────────────────────────
    const renderStep0 = () => (
        <>
            <Row justify="center" style={{ marginBottom: 16 }}>
                <Segmented
                    value={docType}
                    onChange={(v) => setDocType(v as DocType)}
                    size="large"
                    options={[
                        { label: <Space><FileTextOutlined />Quote</Space>, value: "quote" },
                        { label: <Space><FileDoneOutlined />Invoice</Space>, value: "invoice" },
                    ]}
                />
            </Row>

            {!vatEnabled ? (
                <Alert
                    type="warning" showIcon
                    style={{ marginBottom: 12 }}
                    message="VAT is disabled for this business"
                    description={
                        <>
                            All line items will be VAT-exempt (0%). To enable VAT go to{" "}
                            <strong>Tenant Settings → VAT Config</strong>.
                        </>
                    }
                />
            ) : (
                <Alert
                    type="info" showIcon icon={<InfoCircleOutlined />}
                    style={{ marginBottom: 12 }}
                    message={
                        <Space>
                            VAT active — standard rate{" "}
                            <strong>{(standardVatRate * 100).toFixed(0)}%</strong>
                            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
                                {vatPricingMode === "INCLUSIVE" ? "Tax Inclusive" : "Tax Exclusive"}
                            </Tag>
                        </Space>
                    }
                    description="Standard rate is pre-applied to new lines. You can set individual lines to Exempt."
                />
            )}

            <Alert
                type={docType === "quote" ? "warning" : "info"}
                showIcon style={{ marginBottom: 16 }}
                message={docType === "quote" ? "Saving as Quote (Draft)" : "Creating Invoice (A/R)"}
                description={
                    docType === "quote"
                        ? "No journal entry or AR impact until you convert it to an invoice."
                        : "Posts to books immediately — DR Accounts Receivable (1200), CR Sales Revenue (4100)."
                }
            />

            <Form form={form} layout="vertical" initialValues={{ issue_date: dayjs() }}>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item
                            name="customer_id" label="Customer / Billed To"
                            rules={[{ required: true, message: "Select a customer" }]}
                        >
                            <Select
                                showSearch allowClear placeholder="Search customer..."
                                filterOption={false}
                                onSearch={setCustomerSearch}
                                loading={customersFetching}
                                options={customerOptions}
                                notFoundContent={customersFetching ? "Searching..." : "No customers found"}
                                dropdownRender={(menu) => (
                                    <>
                                        {menu}
                                        {dropdownFooter("Add New Customer", () => setAddCustomerOpen(true))}
                                    </>
                                )}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            name="issue_date"
                            label={docType === "quote" ? "Quote Date" : "Invoice Date"}
                            rules={[{ required: true }]}
                        >
                            <DatePicker
                                style={{ width: "100%" }}
                                format="DD MMM YYYY"
                                onChange={(date) => {
                                    const terms = form.getFieldValue("terms");
                                    if (date && terms) {
                                        const due = calcDueDate(date, terms);
                                        form.setFieldValue("due_date", due ?? null);
                                    }
                                }}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="terms" label="Payment Terms">
                            <Select
                                placeholder="Select payment terms"
                                allowClear
                                options={PAYMENT_TERMS}
                                onChange={(terms) => {
                                    const issueDate = form.getFieldValue("issue_date");
                                    if (issueDate && terms) {
                                        const due = calcDueDate(issueDate, terms);
                                        form.setFieldValue("due_date", due ?? null);
                                    } else if (!terms) {
                                        form.setFieldValue("due_date", null);
                                    }
                                }}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item
                            name="due_date"
                            label="Due Date"
                            rules={docType === "invoice"
                                ? [{ required: true, message: "Required for invoices" }]
                                : []}
                            tooltip={
                                docType === "quote"
                                    ? "Optional for quotes — auto-set when payment terms are selected"
                                    : "Auto-set by payment terms — you can override manually"
                            }
                        >
                            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left" plain style={{ fontSize: 13, fontWeight: 600 }}>
                    Line Items
                </Divider>

                <Table
                    dataSource={lines} columns={lineColumns}
                    rowKey="key" pagination={false} size="small"
                    style={{ marginBottom: 12 }}
                />

                <Button
                    type="dashed" icon={<PlusOutlined />} onClick={addLine}
                    style={{ width: "100%", marginBottom: 16 }}
                >
                    Add Line Item
                </Button>

                <TotalsCard />

                <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={24}>
                        <Form.Item name="notes" label="Notes">
                            <TextArea rows={2} placeholder="Notes printed on document..." />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </>
    );

    // ── Step 1 — review quote before converting ───────────────────────────────
    const renderStep1 = () => (
        <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Alert
                type="success" showIcon
                message={`Quote saved — ${savedInvoice?.order_no || ""}`}
                description="Review the quote below. When the customer accepts it, click Convert to Invoice."
            />
            <Card size="small" title="Quote Summary">
                <Row gutter={24}>
                    <Col span={8}>
                        <Statistic title="Customer"
                            value={savedInvoice?.counterparty_name || "—"}
                            valueStyle={{ fontSize: 14 }} />
                    </Col>
                    <Col span={8}>
                        <Statistic title="Issue Date"
                            value={savedInvoice?.issue_date
                                ? dayjs(savedInvoice.issue_date).format("DD MMM YYYY") : "—"}
                            valueStyle={{ fontSize: 14 }} />
                    </Col>
                    <Col span={8}>
                        <Statistic title="Grand Total (KES)"
                            value={savedInvoice?.grand_total != null ? fmt(savedInvoice.grand_total) : "—"}
                            valueStyle={{ fontSize: 14, color: "#1d39c4" }} />
                    </Col>
                </Row>
            </Card>
            <TotalsCard />
            <Alert
                type="info" showIcon
                message="Converting to Invoice"
                description="Posts DR Accounts Receivable (1200) / CR Sales Revenue (4100) and changes status from Draft to Pending."
            />
        </Space>
    );

    // ── Step 2 — record payment ───────────────────────────────────────────────
    const renderStep2 = () => (
        <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Alert
                type="success" showIcon icon={<CheckCircleOutlined />}
                message={`Invoice posted — ${savedInvoice?.order_no || ""}`}
                description="Journal entry created. You can record payment now or do it later from the Invoices tab."
            />
            <Card size="small" title="Invoice Summary">
                <Row gutter={24}>
                    <Col span={6}>
                        <Statistic title="Invoice No."
                            value={savedInvoice?.order_no || "—"} valueStyle={{ fontSize: 13 }} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="Customer"
                            value={savedInvoice?.counterparty_name || "—"} valueStyle={{ fontSize: 13 }} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="Due Date"
                            value={savedInvoice?.due_date
                                ? dayjs(savedInvoice.due_date).format("DD MMM YYYY") : "—"}
                            valueStyle={{ fontSize: 13 }} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="Amount Due (KES)"
                            value={savedInvoice?.grand_total != null ? fmt(savedInvoice.grand_total) : "—"}
                            valueStyle={{ fontSize: 13, color: "#fa8c16" }} />
                    </Col>
                </Row>
            </Card>

            <Divider orientation="left" plain style={{ fontWeight: 600 }}>
                <Space><DollarOutlined /> Record Payment (optional)</Space>
            </Divider>

            <Form form={payForm} layout="vertical">
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="method_id" label="Payment Method"
                            rules={[{ required: true, message: "Select payment method" }]}>
                            <Select showSearch placeholder="M-Pesa / Bank / Cash"
                                options={methodOptions} optionFilterProp="label" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="account_id"
                            label="Deposit Account"
                            rules={[{ required: true, message: "Select the account receiving payment" }]}
                            tooltip="Choose the cash or bank account where this payment is deposited. This determines the debit side of the journal entry."
                        >
                            <Select
                                showSearch
                                placeholder="e.g. Cash on Hand, Bank, M-Pesa Float"
                                optionFilterProp="label"
                                options={assetAccountOptions}
                                notFoundContent="No asset accounts found — add them in Chart of Accounts"
                                dropdownRender={(menu) => (
                                    <>
                                        {menu}
                                        {dropdownFooter("Add Asset Account", () => setAddDepositAccountOpen(true))}
                                    </>
                                )}
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="amount" label="Amount Received (KES)"
                            initialValue={savedInvoice?.grand_total}
                            rules={[{ required: true }, { type: "number", min: 0.01 }]}>
                            <InputNumber
                                style={{ width: "100%" }} min={0.01} precision={2}
                                max={savedInvoice?.grand_total}
                                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                parser={(v) => v!.replace(/,/g, "") as any}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="reference" label="Reference / Transaction Code">
                            <Input placeholder="M-Pesa code, cheque no..." />
                        </Form.Item>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Form.Item name="notes" label="Notes">
                            <Input placeholder="Optional" />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Space>
    );

    // ── Footer buttons ────────────────────────────────────────────────────────
    const renderFooter = () => {
        if (step === 0) return [
            <Button key="cancel" onClick={handleClose}>Cancel</Button>,
            <Button key="save" type="primary"
                loading={saveMutation.isPending}
                icon={docType === "quote" ? <FileTextOutlined /> : <FileDoneOutlined />}
                style={docType === "quote" ? { background: "#faad14", borderColor: "#faad14" } : {}}
                onClick={handleSave}>
                {docType === "quote" ? "Save Quote" : "Post Invoice"}
            </Button>,
        ];
        if (step === 1) return [
            <Button key="close" onClick={handleClose}>Close (save as quote)</Button>,
            <Button key="convert" type="primary"
                loading={convertMutation.isPending}
                icon={<ArrowRightOutlined />}
                onClick={handleConvert}>
                Convert to Invoice
            </Button>,
        ];
        if (step === 2) return [
            <Button key="skip" onClick={handleClose}>Skip — pay later</Button>,
            <Button key="pay" type="primary"
                loading={payMutation.isPending}
                icon={<DollarOutlined />}
                style={{ background: "#52c41a", borderColor: "#52c41a" }}
                onClick={handlePayNow}>
                Record Payment
            </Button>,
        ];
        return [];
    };

    // ── Steps config ──────────────────────────────────────────────────────────
    const stepsConfig = docType === "quote"
        ? [
            { title: "Details", icon: <FileTextOutlined /> },
            { title: "Convert", icon: <ArrowRightOutlined /> },
            { title: "Payment", icon: <DollarOutlined /> },
        ]
        : [
            { title: "Details", icon: <FileDoneOutlined /> },
            { title: "Payment", icon: <DollarOutlined /> },
        ];

    const stepsIndex = docType === "quote" ? step : step === 0 ? 0 : 1;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <Modal
                open={open}
                onCancel={handleClose}
                title={
                    <Space>
                        {step === 0 && (docType === "quote"
                            ? <FileTextOutlined style={{ color: "#faad14" }} />
                            : <FileDoneOutlined style={{ color: "#1890ff" }} />)}
                        {step === 1 && <FileTextOutlined style={{ color: "#faad14" }} />}
                        {step === 2 && <DollarOutlined style={{ color: "#52c41a" }} />}
                        {step === 0 && (docType === "quote" ? "Create Quote" : "Create Invoice")}
                        {step === 1 && "Review & Convert Quote"}
                        {step === 2 && "Record Payment"}
                    </Space>
                }
                width={940}
                footer={renderFooter()}
                destroyOnClose
            >
                <Steps
                    current={stepsIndex}
                    size="small"
                    items={stepsConfig}
                    style={{ marginBottom: 24 }}
                />
                {step === 0 && renderStep0()}
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
            </Modal>

            {/* ── Add Customer — triggered from customer dropdown ── */}
            <AddCustomerModal
                visible={addCustomerOpen}
                onClose={() => setAddCustomerOpen(false)}
                onSuccess={handleCustomerAdded}
                mode="add"
            />

            {/* ── Add Revenue Account — triggered from line item account dropdown ── */}
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

            {/* ── Add Asset Account — triggered from deposit account dropdown (step 2) ── */}
            <AccountFormDrawer
                open={addDepositAccountOpen}
                onClose={() => setAddDepositAccountOpen(false)}
                onSuccess={() => {
                    setAddDepositAccountOpen(false);
                    handleAccountAdded();
                }}
                accounts={allAccounts}
                shopId={shopId}
            />
        </>
    );
};

export default ManualInvoiceModal;