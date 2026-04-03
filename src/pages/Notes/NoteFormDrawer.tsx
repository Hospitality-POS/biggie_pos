import React, { useEffect, useState } from "react";
import {
    ProForm,
    ProFormSelect,
    ProFormDatePicker,
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
    Row,
    Col,
    Divider,
    Segmented,
    Tag,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
    createNote,
    updateNote,
    Note,
    NoteType,
    NoteDirection,
    VatType,
    CreateNoteParams,
    UpdateNoteParams,
} from "@services/accounting/notes";
import { getAllAccounts, ChartOfAccount } from "@services/accounting/accounts";
import { fetchAllCustomers } from "@services/customers";
import { fetchAllSuppliers } from "@services/supplier";
import { getAllInvoices } from "@services/accounting/invoice";

const { Text } = Typography;

interface LineItem {
    key: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount: number;
    vat_type: VatType;
    account_id: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingNote?: Note | null;
    shopId: string;
    noteType: NoteType;
}

const emptyLine = (): LineItem => ({
    key: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit_price: 0,
    discount: 0,
    vat_type: "NONE",
    account_id: "",
});

const calcLineTotal = (l: LineItem, vatMode: "INCLUSIVE" | "EXCLUSIVE") => {
    const gross = l.quantity * l.unit_price;
    const disc = gross * ((l.discount || 0) / 100);
    const after = gross - disc;
    const vatRate = l.vat_type === "STANDARD" ? 0.16 : 0;
    if (vatMode === "INCLUSIVE" && vatRate > 0) {
        const net = after / (1 + vatRate);
        return { net, vat: after - net, lineTotal: after, disc };
    }
    const vat = after * vatRate;
    return { net: after, vat, lineTotal: after + vat, disc };
};

const NoteFormDrawer: React.FC<Props> = ({
    open, onClose, onSuccess, editingNote, shopId, noteType,
}) => {
    const [form] = ProForm.useForm();
    const isEdit = !!editingNote;
    const isCredit = noteType === "CREDIT_NOTE";

    const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
    const [direction, setDirection] = useState<NoteDirection>("customer");
    const [vatMode, setVatMode] = useState<"INCLUSIVE" | "EXCLUSIVE">("EXCLUSIVE");
    const [submitting, setSubmitting] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [supplierSearch, setSupplierSearch] = useState("");

    // ── Queries ────────────────────────────────────────────────────────────────
    const { data: accountsData } = useQuery({
        queryKey: ["accounts-posting", shopId],
        queryFn: () => getAllAccounts({ is_active: true }),
    });
    const accounts: ChartOfAccount[] = accountsData?.accounts || [];

    const { data: customersRaw, isFetching: customersFetching } = useQuery({
        queryKey: ["customers-select", customerSearch],
        queryFn: () => fetchAllCustomers({ shop_id: shopId, customer_name: customerSearch }),
        enabled: open && direction === "customer",
        select: (res: any) => Array.isArray(res) ? res : (res?.customers || res?.data || []),
        staleTime: 30_000,
    });
    const customers = customersRaw || [];

    const { data: suppliersRaw, isFetching: suppliersFetching } = useQuery({
        queryKey: ["suppliers-select", supplierSearch],
        queryFn: () => fetchAllSuppliers({ name: supplierSearch }),
        enabled: open && direction === "supplier",
        select: (res: any) => Array.isArray(res) ? res : (res?.suppliers || res?.data || []),
        staleTime: 30_000,
    });
    const suppliers = suppliersRaw || [];

    const { data: customerInvoicesRaw } = useQuery({
        queryKey: ["invoices-for-customer", selectedCustomerId],
        queryFn: () => getAllInvoices({ direction: "customer", customer_id: selectedCustomerId }),
        enabled: !!selectedCustomerId,
        select: (res: any) => res?.invoices || [],
    });
    const customerInvoices = customerInvoicesRaw || [];

    const { data: supplierInvoicesRaw } = useQuery({
        queryKey: ["invoices-for-supplier", selectedSupplierId],
        queryFn: () => getAllInvoices({ direction: "supplier", supplier_id: selectedSupplierId }),
        enabled: !!selectedSupplierId,
        select: (res: any) => res?.invoices || [],
    });
    const supplierInvoices = supplierInvoicesRaw || [];

    const invoiceOptions = direction === "customer"
        ? customerInvoices.map((inv: any) => ({
            label: `${inv.order_no} — KES ${inv.grand_total?.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`,
            value: inv.order_no,
        }))
        : supplierInvoices.map((inv: any) => ({
            label: `${inv.order_no} — ${inv.counterparty_name || "Supplier"} — KES ${inv.grand_total?.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`,
            value: inv.order_no,
        }));

    // ── Populate on open ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        if (isEdit && editingNote) {
            const dir = editingNote.direction;
            setDirection(dir);
            setVatMode(editingNote.vat_pricing_mode || "EXCLUSIVE");

            const custId = typeof editingNote.customer_id === "object"
                ? (editingNote.customer_id as any)?._id
                : editingNote.customer_id;
            const suppId = typeof editingNote.supplier_id === "object"
                ? (editingNote.supplier_id as any)?._id
                : editingNote.supplier_id;

            setSelectedCustomerId(custId || null);
            setSelectedSupplierId(suppId || null);

            form.setFieldsValue({
                direction: dir,
                reason: editingNote.reason,
                notes: editingNote.notes,
                internal_notes: editingNote.internal_notes,
                issue_date: editingNote.issue_date,
                expiry_date: editingNote.expiry_date,
                original_invoice_no: editingNote.original_invoice_no,
                customer_id: custId,
                supplier_id: suppId,
            });
            setLines(
                editingNote.lines.map((l) => ({
                    key: crypto.randomUUID(),
                    description: l.description,
                    quantity: l.quantity,
                    unit_price: l.unit_price,
                    discount: l.discount || 0,
                    vat_type: l.vat_type || "NONE",
                    account_id: typeof l.account_id === "object"
                        ? (l.account_id as any)?._id
                        : (l.account_id as string),
                }))
            );
        } else {
            form.resetFields();
            setLines([emptyLine()]);
            setDirection("customer");
            setVatMode("EXCLUSIVE");
            setSelectedCustomerId(null);
            setSelectedSupplierId(null);
        }
    }, [open, editingNote, isEdit, form]);

    // ── Line helpers ───────────────────────────────────────────────────────────
    const addLine = () => setLines((p) => [...p, emptyLine()]);
    const removeLine = (key: string) =>
        setLines((p) => p.length > 1 ? p.filter((l) => l.key !== key) : p);
    const updateLine = (key: string, field: keyof LineItem, value: any) =>
        setLines((p) => p.map((l) => l.key === key ? { ...l, [field]: value } : l));

    // ── Totals ─────────────────────────────────────────────────────────────────
    const totals = lines.reduce(
        (acc, l) => {
            const c = calcLineTotal(l, vatMode);
            return {
                subtotal: acc.subtotal + c.net,
                totalVat: acc.totalVat + c.vat,
                grandTotal: acc.grandTotal + c.lineTotal,
                totalDisc: acc.totalDisc + c.disc,
            };
        },
        { subtotal: 0, totalVat: 0, grandTotal: 0, totalDisc: 0 }
    );

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async (values: any) => {
        const validLines = lines.filter(
            (l) => l.description && l.account_id && l.unit_price > 0
        );
        if (!validLines.length) return;
        setSubmitting(true);
        try {
            const linePayload = validLines.map((l) => ({
                description: l.description,
                quantity: l.quantity,
                unit_price: l.unit_price,
                discount: l.discount || undefined,
                vat_type: l.vat_type,
                account_id: l.account_id,
            }));

            if (isEdit && editingNote) {
                await updateNote(editingNote._id, {
                    reason: values.reason,
                    notes: values.notes,
                    internal_notes: values.internal_notes,
                    issue_date: values.issue_date,
                    expiry_date: values.expiry_date,
                    vat_pricing_mode: vatMode,
                    original_invoice_no: values.original_invoice_no,
                    lines: linePayload,
                } as UpdateNoteParams);
            } else {
                await createNote({
                    shop_id: shopId,
                    note_type: noteType,
                    direction: values.direction,
                    reason: values.reason,
                    notes: values.notes,
                    internal_notes: values.internal_notes,
                    issue_date: values.issue_date,
                    expiry_date: values.expiry_date,
                    vat_pricing_mode: vatMode,
                    original_invoice_no: values.original_invoice_no,
                    customer_id: direction === "customer" ? values.customer_id : undefined,
                    supplier_id: direction === "supplier" ? values.supplier_id : undefined,
                    lines: linePayload,
                } as CreateNoteParams);
            }
            onSuccess();
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    // ── Account options ────────────────────────────────────────────────────────
    const accountOptions = accounts
        .filter((a) => a.allows_direct_posting !== false && a.is_active)
        .map((a) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));

    // ── Line table columns ─────────────────────────────────────────────────────
    const lineColumns = [
        {
            title: "Description", key: "description",
            render: (_: any, r: LineItem) => (
                <Input placeholder="Item description" value={r.description} size="small"
                    onChange={(e) => updateLine(r.key, "description", e.target.value)} />
            ),
        },
        {
            title: "Qty", key: "quantity", width: 70,
            render: (_: any, r: LineItem) => (
                <InputNumber min={0.01} precision={2} value={r.quantity} size="small"
                    onChange={(v) => updateLine(r.key, "quantity", v || 1)}
                    style={{ width: "100%" }} />
            ),
        },
        {
            title: "Unit Price", key: "unit_price", width: 110,
            render: (_: any, r: LineItem) => (
                <InputNumber min={0} precision={2} value={r.unit_price} size="small"
                    onChange={(v) => updateLine(r.key, "unit_price", v || 0)}
                    style={{ width: "100%" }} />
            ),
        },
        {
            title: "Disc %", key: "discount", width: 72,
            render: (_: any, r: LineItem) => (
                <InputNumber min={0} max={100} precision={1} value={r.discount} size="small"
                    onChange={(v) => updateLine(r.key, "discount", v || 0)}
                    style={{ width: "100%" }} />
            ),
        },
        {
            title: "VAT", key: "vat_type", width: 95,
            render: (_: any, r: LineItem) => (
                <Select size="small" value={r.vat_type} style={{ width: "100%" }}
                    onChange={(v) => updateLine(r.key, "vat_type", v)}
                    options={[
                        { label: "None", value: "NONE" },
                        { label: "16%", value: "STANDARD" },
                        { label: "Zero", value: "ZERO" },
                        { label: "Exempt", value: "EXEMPT" },
                    ]}
                />
            ),
        },
        {
            title: "Account", key: "account_id", width: 200,
            render: (_: any, r: LineItem) => (
                <Select showSearch size="small" placeholder="Account…"
                    value={r.account_id || undefined} style={{ width: "100%" }}
                    onChange={(v) => updateLine(r.key, "account_id", v)}
                    optionFilterProp="label" options={accountOptions}
                />
            ),
        },
        {
            title: "Line Total", key: "total", width: 105, align: "right" as const,
            render: (_: any, r: LineItem) => {
                const { lineTotal } = calcLineTotal(r, vatMode);
                return (
                    <Text style={{ fontSize: 12 }}>
                        {lineTotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                );
            },
        },
        {
            title: "", key: "remove", width: 36,
            render: (_: any, r: LineItem) => (
                <Button icon={<DeleteOutlined />} size="small" danger type="text"
                    onClick={() => removeLine(r.key)} disabled={lines.length <= 1} />
            ),
        },
    ];

    return (
        <Drawer
            title={
                <Space>
                    <Text strong>
                        {isEdit
                            ? `Edit ${isCredit ? "Credit" : "Debit"} Note — ${editingNote?.note_no}`
                            : `Create ${isCredit ? "Credit" : "Debit"} Note`}
                    </Text>
                    <Tag color={isCredit ? "green" : "orange"}>
                        {isCredit ? "Credit Note" : "Debit Note"}
                    </Tag>
                </Space>
            }
            open={open}
            onClose={onClose}
            width={920}
            destroyOnClose
            footer={null}
        >
            <ProForm
                form={form}
                onFinish={handleSubmit}
                submitter={{
                    searchConfig: {
                        submitText: isEdit
                            ? "Save Changes"
                            : `Create ${isCredit ? "Credit" : "Debit"} Note`,
                        resetText: "Cancel",
                    },
                    onReset: onClose,
                    submitButtonProps: { loading: submitting },
                }}
                layout="vertical"
            >
                {/* ── Header ── */}
                <Row gutter={12}>
                    <Col span={8}>
                        <ProFormSelect
                            name="direction"
                            label="Direction"
                            disabled={isEdit}
                            initialValue="customer"
                            rules={[{ required: true, message: "Required" }]}
                            options={[
                                { label: "Customer", value: "customer" },
                                { label: "Supplier", value: "supplier" },
                            ]}
                            fieldProps={{
                                onChange: (v: NoteDirection) => {
                                    setDirection(v);
                                    setSelectedCustomerId(null);
                                    setSelectedSupplierId(null);
                                    form.setFieldsValue({
                                        customer_id: undefined,
                                        supplier_id: undefined,
                                        original_invoice_no: undefined,
                                    });
                                },
                            }}
                        />
                    </Col>
                    <Col span={8}>
                        <ProFormDatePicker
                            name="issue_date"
                            label="Issue Date"
                            fieldProps={{ style: { width: "100%" } }}
                        />
                    </Col>
                    <Col span={8}>
                        <ProFormDatePicker
                            name="expiry_date"
                            label="Expiry Date"
                            fieldProps={{ style: { width: "100%" } }}
                        />
                    </Col>
                </Row>

                {/* ── Contact + Invoice ── */}
                <Row gutter={12}>
                    {direction === "customer" && (
                        <Col span={12}>
                            <ProFormSelect
                                name="customer_id"
                                label="Customer"
                                showSearch
                                placeholder="Search customer…"
                                fieldProps={{
                                    filterOption: false,
                                    onSearch: setCustomerSearch,
                                    loading: customersFetching,
                                    allowClear: true,
                                    onChange: (val: string) => {
                                        setSelectedCustomerId(val || null);
                                        form.setFieldValue("original_invoice_no", undefined);
                                    },
                                    notFoundContent: customersFetching ? "Searching..." : "No customers found",
                                }}
                                options={customers.map((c: any) => ({
                                    label: `${c.customer_name}${c.customer_phone ? ` — ${c.customer_phone}` : ""}`,
                                    value: c._id,
                                }))}
                            />
                        </Col>
                    )}

                    {direction === "supplier" && (
                        <Col span={12}>
                            <ProFormSelect
                                name="supplier_id"
                                label="Supplier"
                                showSearch
                                placeholder="Search supplier…"
                                fieldProps={{
                                    filterOption: false,
                                    onSearch: setSupplierSearch,
                                    loading: suppliersFetching,
                                    allowClear: true,
                                    onChange: (val: string) => {
                                        setSelectedSupplierId(val || null);
                                        form.setFieldValue("original_invoice_no", undefined);
                                    },
                                    notFoundContent: suppliersFetching ? "Searching..." : "No suppliers found",
                                }}
                                options={suppliers.map((s: any) => ({
                                    label: `${s.name}${s.phone ? ` — ${s.phone}` : ""}`,
                                    value: s._id,
                                }))}
                            />
                        </Col>
                    )}

                    <Col span={12}>
                        <ProFormSelect
                            name="original_invoice_no"
                            label="Original Invoice / Reference No."
                            showSearch
                            placeholder={
                                direction === "customer" && !selectedCustomerId
                                    ? "Select a customer first"
                                    : direction === "supplier" && !selectedSupplierId
                                        ? "Select a supplier first"
                                        : "Select invoice…"
                            }
                            fieldProps={{
                                disabled:
                                    (direction === "customer" && !selectedCustomerId) ||
                                    (direction === "supplier" && !selectedSupplierId),
                                optionFilterProp: "label",
                                allowClear: true,
                            }}
                            options={invoiceOptions}
                        />
                    </Col>
                </Row>

                <ProFormTextArea
                    name="reason"
                    label="Reason"
                    placeholder="Reason for this note (required)"
                    rules={[{ required: true, message: "Required" }]}
                    fieldProps={{ rows: 2 }}
                />

                <Row gutter={12}>
                    <Col span={12}>
                        <ProFormTextArea
                            name="notes"
                            label="Notes (visible to customer/supplier)"
                            fieldProps={{ rows: 2 }}
                        />
                    </Col>
                    <Col span={12}>
                        <ProFormTextArea
                            name="internal_notes"
                            label="Internal Notes"
                            fieldProps={{ rows: 2 }}
                        />
                    </Col>
                </Row>

                {/* ── VAT Mode + Lines ── */}
                <Divider orientation="left" plain>
                    <Text type="secondary" style={{ fontSize: 12 }}>Lines</Text>
                </Divider>

                <Space style={{ marginBottom: 12 }} align="center">
                    <Text type="secondary" style={{ fontSize: 12 }}>VAT pricing:</Text>
                    <Segmented
                        size="small"
                        value={vatMode}
                        onChange={(v) => setVatMode(v as "INCLUSIVE" | "EXCLUSIVE")}
                        options={[
                            { label: "Tax Exclusive", value: "EXCLUSIVE" },
                            { label: "Tax Inclusive", value: "INCLUSIVE" },
                        ]}
                    />
                </Space>

                <Table
                    rowKey="key"
                    dataSource={lines}
                    columns={lineColumns}
                    pagination={false}
                    size="small"
                    scroll={{ x: 800 }}
                    summary={() => (
                        <Table.Summary fixed>
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={5}>
                                    <Button type="dashed" icon={<PlusOutlined />} size="small" onClick={addLine}>
                                        Add Line
                                    </Button>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={5} />
                                <Table.Summary.Cell index={6} align="right">
                                    <Space direction="vertical" size={2} style={{ textAlign: "right" }}>
                                        {totals.totalDisc > 0 && (
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                Disc: -{totals.totalDisc.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                            </Text>
                                        )}
                                        {totals.totalVat > 0 && (
                                            <Text style={{ fontSize: 11, color: "#1890ff" }}>
                                                VAT: {totals.totalVat.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                            </Text>
                                        )}
                                        <Text strong style={{ fontSize: 13 }}>
                                            KES {totals.grandTotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                        </Text>
                                    </Space>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={7} />
                            </Table.Summary.Row>
                        </Table.Summary>
                    )}
                />
            </ProForm>
        </Drawer>
    );
};

export default NoteFormDrawer;