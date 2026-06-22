import React, { useEffect, useState } from "react";
import {
    ProForm,
    ProFormText,
    ProFormDatePicker,
    ProFormSelect,
    ProFormTextArea,
} from "@ant-design/pro-components";
import {
    Drawer,
    Button,
    Space,
    Select,
    InputNumber,
    Input,
    Table,
    Typography,
    Tag,
    Divider,
    Alert,
    Row,
    Col,
    message,
} from "antd";
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    createSalesReceipt,
    updateSalesReceipt,
    SalesReceipt,
    SalesReceiptLineItem,
    PaymentMethod,
    VatType,
    VatPricingMode,
} from "@services/accounting/salesReceipts";
import { fetchAllCustomers } from "@services/customers";
import { getAllAccounts, ChartOfAccount } from "@services/accounting/accounts";
import { getAllInvoices } from "@services/accounting/invoice";
import dayjs from "dayjs";

const { Text } = Typography;

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
    setOpen: (open: boolean) => void;
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

// ── Component ──────────────────────────────────────────────────────────────────

const SalesReceiptFormDrawer: React.FC<Props> = ({ open, setOpen, receiptId, onSuccess }) => {
    const [form] = ProForm.useForm();
    const queryClient = useQueryClient();
    const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
    const [submitting, setSubmitting] = useState(false);
    const [vatPricingMode, setVatPricingMode] = useState<VatPricingMode>("EXCLUSIVE");
    const [vatStandardRate, setVatStandardRate] = useState(0.16);

    // ── Customers ───────────────────────────────────────────────────────────────

    const { data: customersData } = useQuery({
        queryKey: ["customers"],
        queryFn: () => fetchAllCustomers({ limit: 1000 }),
        enabled: open,
        staleTime: 60_000,
    });

    const customerOptions = (Array.isArray(customersData) ? customersData : customersData?.customers)?.map((c: any) => ({
        label: c.customer_name,
        value: c._id,
    })) || [];

    // ── Accounts ───────────────────────────────────────────────────────────────

    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts"],
        queryFn: () => getAllAccounts({ is_active: true }),
        enabled: open,
        staleTime: 60_000,
    });

    const allAccounts: ChartOfAccount[] = accountsData?.accounts || [];
    const cashAccounts = allAccounts.filter((a) => a.account_type === "ASSET" && a.account_name.toLowerCase().includes("cash"));
    const bankAccounts = allAccounts.filter((a) => a.account_type === "ASSET" && a.account_name.toLowerCase().includes("bank"));
    const revenueAccounts = allAccounts.filter((a) => a.account_type === "REVENUE");

    const paymentAccountOptions = [...cashAccounts, ...bankAccounts].map((a) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));

    const revenueAccountOptions = revenueAccounts.map((a) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));

    // ── Invoices ───────────────────────────────────────────────────────────────

    const { data: invoicesData } = useQuery({
        queryKey: ["invoices"],
        queryFn: () => getAllInvoices({ direction: "customer", status: ["Pending", "Partially_Paid"] }),
        enabled: open,
        staleTime: 60_000,
    });

    const invoiceOptions = (invoicesData?.invoices || []).map((inv: any) => ({
        label: `${inv.order_no} - KES ${inv.grand_total?.toLocaleString()} (${inv.status})`,
        value: inv._id,
    }));

    // ── Fetch receipt for editing ───────────────────────────────────────────────

    const { data: receiptData, isLoading: loadingReceipt } = useQuery({
        queryKey: ["sales-receipt", receiptId],
        queryFn: () => {
            // This would call getSalesReceiptById - implement this
            return null;
        },
        enabled: open && !!receiptId,
    });

    // ── Reset on open ──────────────────────────────────────────────────────────

    useEffect(() => {
        if (open) {
            form.resetFields();
            setVatPricingMode("EXCLUSIVE");
            setVatStandardRate(0.16);
            if (receiptId && receiptData) {
                // Populate form for editing
                const receipt = receiptData as SalesReceipt;
                form.setFieldsValue({
                    customer_id: receipt.customer_id?._id,
                    receipt_date: dayjs(receipt.receipt_date),
                    payment_method: receipt.payment_method,
                    payment_reference: receipt.payment_reference,
                    payment_account_id: receipt.payment_account_id,
                    notes: receipt.notes,
                    vat_pricing_mode: receipt.vat_pricing_mode,
                    vat_standard_rate: receipt.vat_standard_rate,
                    status: receipt.status,
                    invoice_id: receipt.invoice_id?._id,
                });
                setVatPricingMode(receipt.vat_pricing_mode || "EXCLUSIVE");
                setVatStandardRate(receipt.vat_standard_rate || 0.16);
                setLines(
                    receipt.lines.map((l) => ({
                        key: l._id || crypto.randomUUID(),
                        description: l.description,
                        quantity: l.quantity,
                        unit_price: l.unit_price,
                        discount: l.discount || 0,
                        vat_rate: l.vat_rate || 0.16,
                        vat_type: l.vat_type || "STANDARD",
                        product_id: l.product_id,
                        account_id: l.account_id,
                    }))
                );
            } else {
                setLines([emptyLine()]);
                form.setFieldsValue({
                    receipt_date: dayjs(),
                    vat_pricing_mode: "EXCLUSIVE",
                    vat_standard_rate: 0.16,
                    status: "Pending",
                });
            }
        }
    }, [open, receiptId, receiptData, form]);

    // ── Calculations ───────────────────────────────────────────────────────────

    const calculateLineTotal = (line: LineItem) => {
        const netAmount = line.quantity * line.unit_price - line.discount;
        const vatAmount = vatPricingMode === "INCLUSIVE"
            ? netAmount - (netAmount / (1 + line.vat_rate))
            : netAmount * line.vat_rate;
        return {
            netAmount,
            vatAmount,
            lineTotal: netAmount + vatAmount,
        };
    };

    const subtotal = lines.reduce((sum, line) => sum + calculateLineTotal(line).netAmount, 0);
    const totalVat = lines.reduce((sum, line) => sum + calculateLineTotal(line).vatAmount, 0);
    const grandTotal = subtotal + totalVat;

    // ── Line mutations ─────────────────────────────────────────────────────────

    const addLine = () => setLines((prev) => [...prev, emptyLine()]);

    const removeLine = (key: string) =>
        setLines((prev) => prev.length > 1 ? prev.filter((l) => l.key !== key) : prev);

    const updateLine = (key: string, field: keyof LineItem, value: any) => {
        setLines((prev) =>
            prev.map((l) => (l.key === key ? { ...l, [field]: value } : l))
        );
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const createMutation = useMutation({
        mutationFn: createSalesReceipt,
        onSuccess: () => {
            message.success("Sales receipt created successfully");
            setOpen(false);
            onSuccess();
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || "Failed to create sales receipt");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateSalesReceipt(id, data),
        onSuccess: () => {
            message.success("Sales receipt updated successfully");
            setOpen(false);
            onSuccess();
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || "Failed to update sales receipt");
        },
    });

    const handleSubmit = async (values: any) => {
        setSubmitting(true);
        try {
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
                receipt_date: values.receipt_date ? (typeof values.receipt_date === 'string' ? values.receipt_date : values.receipt_date.format("YYYY-MM-DD")) : new Date().toISOString().split('T')[0],
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
            };

            if (receiptId) {
                await updateMutation.mutateAsync({ id: receiptId, data });
            } else {
                await createMutation.mutateAsync(data);
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ── Line columns ─────────────────────────────────────────────────────────

    const lineColumns = [
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            width: 200,
            render: (text: string, record: LineItem) => (
                <Input
                    value={text}
                    onChange={(e) => updateLine(record.key, "description", e.target.value)}
                    placeholder="Item description"
                />
            ),
        },
        {
            title: "Qty",
            dataIndex: "quantity",
            key: "quantity",
            width: 80,
            render: (value: number, record: LineItem) => (
                <InputNumber
                    value={value}
                    min={1}
                    onChange={(v) => updateLine(record.key, "quantity", v || 1)}
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: "Unit Price",
            dataIndex: "unit_price",
            key: "unit_price",
            width: 100,
            render: (value: number, record: LineItem) => (
                <InputNumber
                    value={value}
                    min={0}
                    onChange={(v) => updateLine(record.key, "unit_price", v || 0)}
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: "Discount",
            dataIndex: "discount",
            key: "discount",
            width: 80,
            render: (value: number, record: LineItem) => (
                <InputNumber
                    value={value}
                    min={0}
                    onChange={(v) => updateLine(record.key, "discount", v || 0)}
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: "VAT Type",
            dataIndex: "vat_type",
            key: "vat_type",
            width: 120,
            render: (value: VatType, record: LineItem) => (
                <Select
                    value={value}
                    onChange={(v) => updateLine(record.key, "vat_type", v)}
                    options={VAT_TYPE_OPTIONS}
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: "VAT Rate",
            dataIndex: "vat_rate",
            key: "vat_rate",
            width: 80,
            render: (value: number, record: LineItem) => (
                <InputNumber
                    value={value}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateLine(record.key, "vat_rate", v || 0)}
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: "Line Total",
            key: "lineTotal",
            width: 100,
            render: (_: any, record: LineItem) => {
                const { lineTotal } = calculateLineTotal(record);
                return <Text strong>KES {lineTotal.toFixed(2)}</Text>;
            },
        },
        {
            title: "",
            key: "actions",
            width: 50,
            render: (_: any, record: LineItem) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeLine(record.key)}
                    disabled={lines.length === 1}
                />
            ),
        },
    ];

    return (
        <Drawer
            title={receiptId ? "Edit Sales Receipt" : "New Sales Receipt"}
            width={900}
            open={open}
            onClose={() => setOpen(false)}
            footer={
                <Space style={{ textAlign: "right", width: "100%" }}>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        type="primary"
                        onClick={() => form.submit()}
                        loading={submitting}
                    >
                        {receiptId ? "Update" : "Create"}
                    </Button>
                </Space>
            }
        >
            <ProForm
                form={form}
                onFinish={handleSubmit}
                submitter={false}
                layout="vertical"
            >
                <Row gutter={16}>
                    <Col span={12}>
                        <ProFormSelect
                            name="customer_id"
                            label="Customer (Optional)"
                            options={customerOptions}
                            placeholder="Leave blank for cash sale"
                            allowClear
                        />
                    </Col>
                    <Col span={12}>
                        <ProFormSelect
                            name="invoice_id"
                            label="Link to Invoice (Optional)"
                            options={invoiceOptions}
                            placeholder="Select invoice to apply payment"
                            allowClear
                            fieldProps={{
                                onChange: (value) => {
                                    if (value) {
                                        const selectedInvoice = invoicesData?.invoices?.find((inv: any) => inv._id === value);
                                        if (selectedInvoice?.customer_id) {
                                            form.setFieldValue("customer_id", typeof selectedInvoice.customer_id === "string" ? selectedInvoice.customer_id : selectedInvoice.customer_id._id);
                                        }
                                    }
                                },
                            }}
                        />
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <ProFormDatePicker
                            name="receipt_date"
                            label="Receipt Date"
                            rules={[{ required: true, message: "Required" }]}
                        />
                    </Col>
                    <Col span={12}>
                        <ProFormSelect
                            name="payment_method"
                            label="Payment Method"
                            options={PAYMENT_METHOD_OPTIONS}
                            rules={[{ required: true, message: "Required" }]}
                        />
                    </Col>
                </Row>

                <Divider orientation="left">Line Items</Divider>

                <Table
                    dataSource={lines}
                    columns={lineColumns}
                    rowKey="key"
                    pagination={false}
                    size="small"
                    scroll={{ x: 800 }}
                />

                <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={addLine}
                    style={{ width: "100%", marginTop: 16 }}
                >
                    Add Line Item
                </Button>

                <Divider orientation="left">Totals</Divider>

                <Row gutter={16}>
                    <Col span={8}>
                        <Text>Subtotal:</Text>
                    </Col>
                    <Col span={8} offset={8} style={{ textAlign: "right" }}>
                        <Text strong>KES {subtotal.toFixed(2)}</Text>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}>
                        <Text>VAT:</Text>
                    </Col>
                    <Col span={8} offset={8} style={{ textAlign: "right" }}>
                        <Text strong>KES {totalVat.toFixed(2)}</Text>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}>
                        <Text strong>Grand Total:</Text>
                    </Col>
                    <Col span={8} offset={8} style={{ textAlign: "right" }}>
                        <Text strong style={{ fontSize: 16, color: "#1890ff" }}>
                            KES {grandTotal.toFixed(2)}
                        </Text>
                    </Col>
                </Row>

                <Divider orientation="left">Payment Details</Divider>

                <Row gutter={16}>
                    <Col span={12}>
                        <ProFormText
                            name="payment_reference"
                            label="Payment Reference"
                            placeholder="Optional"
                        />
                    </Col>
                    <Col span={12}>
                        <ProFormSelect
                            name="payment_account_id"
                            label="Payment Account"
                            options={paymentAccountOptions}
                            placeholder="Optional - select cash/bank account"
                            allowClear
                        />
                    </Col>
                </Row>

                <ProFormSelect
                    name="revenue_account_id"
                    label="Revenue Account"
                    options={revenueAccountOptions}
                    placeholder="Select sales revenue account"
                    rules={[{ required: true, message: "Required for posting" }]}
                />

                <Divider orientation="left">VAT Settings</Divider>

                <Row gutter={16}>
                    <Col span={12}>
                        <ProFormSelect
                            name="vat_pricing_mode"
                            label="VAT Pricing Mode"
                            options={VAT_PRICING_MODE_OPTIONS}
                            fieldProps={{
                                onChange: (v) => setVatPricingMode(v),
                            }}
                        />
                    </Col>
                    <Col span={12}>
                        <ProFormText
                            name="vat_standard_rate"
                            label="Standard VAT Rate"
                            fieldProps={{
                                type: "number",
                                step: 0.01,
                                min: 0,
                                max: 1,
                                onChange: (e) => setVatStandardRate(parseFloat(e.target.value) || 0.16),
                            }}
                        />
                    </Col>
                </Row>

                <ProFormTextArea
                    name="notes"
                    label="Notes"
                    placeholder="Optional notes"
                />

                <ProFormSelect
                    name="status"
                    label="Status"
                    options={[
                        { label: "Pending", value: "Pending" },
                        { label: "Posted", value: "Posted" },
                    ]}
                    initialValue="Pending"
                />
            </ProForm>
        </Drawer>
    );
};

export default SalesReceiptFormDrawer;
