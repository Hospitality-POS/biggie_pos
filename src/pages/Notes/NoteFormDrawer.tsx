import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
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
    Alert,
    message,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createNote,
    updateNote,
    applyNote,
    Note,
    NoteType,
    NoteDirection,
    VatType,
    CreateNoteParams,
    UpdateNoteParams,
} from "@services/accounting/notes";
import { getAllBills, Bill } from "@services/accounting/bill";
import { getAllAccounts, ChartOfAccount } from "@services/accounting/accounts";
import { fetchAllCustomers } from "@services/customers";
import { fetchAllSuppliers } from "@services/supplier";
import { getAllInvoices } from "@services/accounting/invoice";
import AddCustomerModal from "@pages/Customer/AddCustomerModal";
import AddProSupplierModal from "@components/MODALS/pro/AddProSupplierModal";
import AccountFormDrawer from "@pages/ChartOfAccounts/AccountFormDrawer";

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
    const vatRate = l.vat_type === "STANDARD" ? 0.16 : 0; // OUT_OF_SCOPE, ZERO, EXEMPT, NONE all = 0
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
    const queryClient = useQueryClient();
    const isEdit = !!editingNote;
    const isCredit = noteType === "CREDIT_NOTE";

    const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
    const [direction, setDirection] = useState<NoteDirection>("customer");
    const [vatMode, setVatMode] = useState<"INCLUSIVE" | "EXCLUSIVE">("EXCLUSIVE");
    const [submitting, setSubmitting] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<string | null>(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [supplierSearch, setSupplierSearch] = useState("");

    // ── Inline add modal state ────────────────────────────────────────────────
    const [addCustomerOpen, setAddCustomerOpen] = useState(false);
    const [addSupplierOpen, setAddSupplierOpen] = useState(false);
    const [addAccountOpen, setAddAccountOpen] = useState(false);

    // ── Queries ────────────────────────────────────────────────────────────────
    const { data: accountsData } = useQuery({
        queryKey: ["accounts-posting", shopId],
        queryFn: () => getAllAccounts({ shop_id: shopId, is_active: true }),
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

    const { data: supplierBillsRaw } = useQuery({
        queryKey: ["bills-for-supplier", selectedSupplierId],
        queryFn: () => getAllBills({ supplier_id: selectedSupplierId }),
        enabled: !!selectedSupplierId,
        select: (res: any) => res?.bills || [],
    });
    const supplierBills = supplierBillsRaw || [];

    // Find selected invoice/bill from the lists to get its details
    const allDocuments = direction === "customer" ? customerInvoices : supplierBills;
    const selectedDocument = allDocuments.find((doc: any) => {
        const docNo = direction === "customer" ? doc.order_no : doc.bill_no;
        return docNo === selectedInvoiceNo;
    });
    
    // Use selectedDocument for account filtering (works for both invoices and bills)
    const selectedInvoice = selectedDocument;

    const documentOptions = direction === "customer"
        ? customerInvoices.map((inv: any) => ({
            label: `${String(inv.order_no || "")} - KES ${inv.grand_total?.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`,
            value: String(inv.order_no || ""),
        }))
        : supplierBills.map((bill: any) => ({
            label: `${String(bill.bill_no || bill.order_no || "")} - ${bill.supplier_name || "Supplier"} - KES ${bill.grand_total?.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`,
            value: String(bill.bill_no || bill.order_no || ""),
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
            setSelectedInvoiceNo(editingNote.original_invoice_no || null);

            form.setFieldsValue({
                note_type: noteType,
                direction: dir,
                reason: editingNote.reason,
                notes: editingNote.notes,
                internal_notes: editingNote.internal_notes,
                issue_date: editingNote.issue_date ? dayjs(editingNote.issue_date) : undefined,
                expiry_date: editingNote.expiry_date ? dayjs(editingNote.expiry_date) : undefined,
                original_invoice_no: editingNote.original_invoice_no,
                customer_id: custId || undefined,
                supplier_id: suppId || undefined,
            });
            setLines(
                editingNote.lines.map((l) => {
                    return {
                        key: crypto.randomUUID(),
                        description: l.description || 
                        (typeof l.account_id === "object" 
                            ? (l.account_id as any)?.account_name 
                            : accounts.find(a => a._id === l.account_id)?.account_name) || 
                        "Line item",
                        quantity: l.quantity,
                        unit_price: l.unit_price,
                        discount: l.discount || 0,
                        vat_type: l.vat_type || "NONE",
                        account_id: typeof l.account_id === "object" && l.account_id && "_id" in l.account_id
                            ? (l.account_id as any)?._id
                            : (typeof l.account_id === "string" ? l.account_id : String(l.account_id || "")),
                    };
                })
            );
        } else {
            form.resetFields();
            setLines([emptyLine()]);
            setDirection("customer");
            setVatMode("EXCLUSIVE");
            setSelectedCustomerId(null);
            setSelectedSupplierId(null);
            setSelectedInvoiceNo(null);
        }
    }, [open, editingNote, isEdit, form]);

    // ── Refetch helpers after inline creates ──────────────────────────────────
    const handleCustomerAdded = () => {
        queryClient.invalidateQueries({ queryKey: ["customers-select"] });
    };
    const handleSupplierAdded = () => {
        queryClient.invalidateQueries({ queryKey: ["suppliers-select"] });
    };
    const handleAccountAdded = () => {
        queryClient.invalidateQueries({ queryKey: ["accounts-posting", shopId] });
    };

    // ── Shared dropdown footer ────────────────────────────────────────────────
    const dropdownFooter = (label: string, onAdd: () => void) => (
        <>
            <Divider style={{ margin: "4px 0" }} />
            <Button
                type="link"
                icon={<PlusOutlined />}
                style={{ width: "100%", textAlign: "left", padding: "4px 8px" }}
                onMouseDown={(e) => {
                    e.preventDefault(); // prevent Select blur before state update fires
                    onAdd();
                }}
            >
                {label}
            </Button>
        </>
    );

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
    // Helper function to get bill ObjectId from bill number
    const getBillObjectId = async (billNumber: string): Promise<string | null> => {
        try {
            const response = await getAllBills({
                search: billNumber,
                limit: 1
            });
            
            if (response.bills.length > 0) {
                return response.bills[0]._id;
            }
            return null;
        } catch (error) {
            console.error('Error finding bill:', error);
            return null;
        }
    };

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
                    issue_date: values.issue_date ? 
                        (typeof values.issue_date === 'object' && values.issue_date.toISOString ? 
                            values.issue_date.toISOString() : 
                            dayjs(values.issue_date).toISOString()) : 
                        undefined,
                    expiry_date: values.expiry_date ? 
                        (typeof values.expiry_date === 'object' && values.expiry_date.toISOString ? 
                            values.expiry_date.toISOString() : 
                            dayjs(values.expiry_date).toISOString()) : 
                        undefined,
                    vat_pricing_mode: vatMode,
                    original_invoice_no: values.original_invoice_no,
                    lines: linePayload,
                } as UpdateNoteParams);
            } else {
                const notePayload: any = {
                    shop_id: shopId,
                    note_type: noteType,
                    direction: values.direction,
                    reason: values.reason,
                    notes: values.notes,
                    internal_notes: values.internal_notes,
                    issue_date: values.issue_date ? 
                        (typeof values.issue_date === 'object' && values.issue_date.toISOString ? 
                            values.issue_date.toISOString() : 
                            dayjs(values.issue_date).toISOString()) : 
                        undefined,
                    expiry_date: values.expiry_date ? 
                        (typeof values.expiry_date === 'object' && values.expiry_date.toISOString ? 
                            values.expiry_date.toISOString() : 
                            dayjs(values.expiry_date).toISOString()) : 
                        undefined,
                    vat_pricing_mode: vatMode,
                    customer_id: direction === "customer" ? values.customer_id : undefined,
                    supplier_id: direction === "supplier" ? values.supplier_id : undefined,
                    lines: linePayload,
                };

                // For supplier credit notes, get the bill ObjectId from bill number
                if (direction === "supplier") {
                    if (values.original_invoice_no) {
                        const billObjectId = await getBillObjectId(values.original_invoice_no);
                        if (billObjectId) {
                            notePayload.original_bill_id = billObjectId;
                        } else {
                            throw new Error(`Bill "${values.original_invoice_no}" not found. Please check the bill number.`);
                        }
                    }
                } else {
                    notePayload.original_invoice_no = values.original_invoice_no;
                }

                const createdNote = await createNote(notePayload as CreateNoteParams);
                
                // Auto-apply the note after creation for supplier credit notes
                if (direction === "supplier") {
                    try {
                        await applyNote(createdNote.note._id);
                    } catch (applyError) {
                        console.warn("Supplier credit note created but auto-apply failed:", applyError);
                        // Don't throw error, note was still created successfully
                    }
                }
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error submitting note:', error);
            // Show user-friendly error message
            const errorMessage = error?.response?.data?.message || 
                                error?.message || 
                                'An error occurred while saving the note. Please try again.';
            message.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Account options ────────────────────────────────────────────────────────
    const accountOptions = (() => {
        // If an invoice is selected, filter accounts to only those used in the journal entry
        if (selectedInvoice && selectedInvoice.journal_entry_id && selectedInvoice.journal_entry_id.lines) {
            const journalEntryAccountIds = selectedInvoice.journal_entry_id.lines
                .map((line: any) => {
                    // Handle both string and object formats for account_id
                    if (typeof line.account_id === 'string') return line.account_id;
                    if (typeof line.account_id === 'object' && line.account_id?._id) return line.account_id._id;
                    return null;
                })
                .filter((id: string | null) => id !== null);
            
            return accounts
                .filter((a) => journalEntryAccountIds.includes(a._id) && a.allows_direct_posting !== false && a.is_active)
                .map((a) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));
        }
        
        // Fallback to all accounts if no invoice is selected
        return accounts
            .filter((a) => a.allows_direct_posting !== false && a.is_active)
            .map((a) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));
    })();

    // ── Line table columns ─────────────────────────────────────────────────────
    const lineColumns = [
        {
            title: "Description", key: "description",
            render: (_: any, r: LineItem) => (
                <Input placeholder="Item description" value={r.description} size="small"
                    onChange={(e) => updateLine(r.key, "description", e.target.value)}
                    disabled={isEdit && (!editingNote || editingNote.status !== "Draft")} />
            ),
        },
        {
            title: "Qty", key: "quantity", width: 70,
            render: (_: any, r: LineItem) => (
                <InputNumber min={0.01} precision={2} value={r.quantity} size="small"
                    onChange={(v) => updateLine(r.key, "quantity", v || 1)}
                    style={{ width: "100%" }}
                    disabled={isEdit && (!editingNote || editingNote.status !== "Draft")} />
            ),
        },
        {
            title: "Unit Price", key: "unit_price", width: 110,
            render: (_: any, r: LineItem) => (
                <InputNumber min={0} precision={2} value={r.unit_price} size="small"
                    onChange={(v) => updateLine(r.key, "unit_price", v || 0)}
                    style={{ width: "100%" }}
                    disabled={isEdit && (!editingNote || editingNote.status !== "Draft")} />
            ),
        },
        {
            title: "Disc %", key: "discount", width: 72,
            render: (_: any, r: LineItem) => (
                <InputNumber min={0} max={100} precision={1} value={r.discount} size="small"
                    onChange={(v) => updateLine(r.key, "discount", v || 0)}
                    style={{ width: "100%" }}
                    disabled={isEdit && (!editingNote || editingNote.status !== "Draft")} />
            ),
        },
        {
            title: "VAT", key: "vat_type", width: 95,
            render: (_: any, r: LineItem) => (
                <Select size="small" value={r.vat_type} style={{ width: "100%" }}
                    onChange={(v) => updateLine(r.key, "vat_type", v)}
                    disabled={isEdit && (!editingNote || editingNote.status !== "Draft")}
                    options={[
                        { label: "None", value: "NONE" },
                        { label: "16%", value: "STANDARD" },
                        { label: "Zero Rated", value: "ZERO" },
                        { label: "Exempted", value: "EXEMPT" },
                        { label: "Out of Scope", value: "OUT_OF_SCOPE" },
                    ]}
                />
            ),
        },
        {
            title: "Account", key: "account_id", width: 210,
            render: (_: any, r: LineItem) => (
                <Select
                    showSearch size="small" placeholder="Account..."
                    value={typeof r.account_id === 'string' ? r.account_id : String(r.account_id || '')}
                    style={{ width: "100%" }}
                    onChange={(v) => updateLine(r.key, "account_id", v)}
                    disabled={isEdit && (!editingNote || editingNote.status !== "Draft")}
                    optionFilterProp="label" options={accountOptions}
                    dropdownRender={(menu) => (
                        <>
                            {menu}
                            {!isEdit || editingNote?.status === "Draft" ? dropdownFooter("Add Account", () => setAddAccountOpen(true)) : null}
                        </>
                    )}
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
                    onClick={() => removeLine(r.key)} 
                    disabled={lines.length <= 1 || (isEdit && (!editingNote || editingNote.status !== "Draft"))} />
            ),
        },
    ];

    // ── Customer options with dropdown footer ─────────────────────────────────
    const customerSelectOptions = customers.map((c: any) => ({
        label: `${c.customer_name}${c.customer_phone ? ` — ${c.customer_phone}` : ""}`,
        value: c._id,
    }));

    // ── Supplier options with dropdown footer ─────────────────────────────────
    const supplierSelectOptions = suppliers.map((s: any) => ({
        label: `${s.name}${s.phone ? ` — ${s.phone}` : ""}`,
        value: s._id,
    }));

    return (
        <>
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
                        submitButtonProps: { 
                            loading: submitting,
                            disabled: isEdit && editingNote && editingNote.status !== "Draft"
                        },
                    }}
                    layout="vertical"
                >
                    {/* Warning for non-Draft notes */}
                    {isEdit && editingNote && editingNote.status !== "Draft" && (
                        <Alert
                            message="This note cannot be edited"
                            description={`Notes with status "${editingNote.status}" cannot be modified as they have already affected financial records. This form is in read-only mode for viewing purposes.`}
                            type="warning"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    )}
                    
                    {/* ── Header ── */}
                    <Row gutter={12}>
                        <Col span={8}>
                            <ProFormSelect
                                name="direction"
                                label="Direction"
                                disabled={isEdit && (!editingNote || editingNote.status !== "Draft")}
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
                                        setSelectedInvoiceNo(null);
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
                                {/*
                                 * ProFormSelect doesn't support dropdownRender directly,
                                 * so we use fieldProps.dropdownRender to inject the footer.
                                 */}
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
                                            setSelectedInvoiceNo(null);
                                            form.setFieldValue("original_invoice_no", undefined);
                                        },
                                        notFoundContent: customersFetching ? "Searching..." : "No customers found",
                                        dropdownRender: (menu: React.ReactNode) => (
                                            <>
                                                {menu}
                                                {dropdownFooter("Add New Customer", () => setAddCustomerOpen(true))}
                                            </>
                                        ),
                                    }}
                                    options={customerSelectOptions}
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
                                            setSelectedInvoiceNo(null);
                                            form.setFieldValue("original_invoice_no", undefined);
                                        },
                                        notFoundContent: suppliersFetching ? "Searching..." : "No suppliers found",
                                        dropdownRender: (menu: React.ReactNode) => (
                                            <>
                                                {menu}
                                                {dropdownFooter("Add New Supplier", () => setAddSupplierOpen(true))}
                                            </>
                                        ),
                                    }}
                                    options={supplierSelectOptions}
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
                                            : direction === "customer" 
                                                ? "Select invoice…" 
                                                : "Select bill…"
                                }
                                fieldProps={{
                                    disabled:
                                        (direction === "customer" && !selectedCustomerId) ||
                                        (direction === "supplier" && !selectedSupplierId),
                                    optionFilterProp: "label",
                                    allowClear: true,
                                    onChange: (value: string) => {
                                        setSelectedInvoiceNo(value || null);
                                    },
                                }}
                                options={documentOptions}
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
                                        <Button type="dashed" icon={<PlusOutlined />} size="small" onClick={addLine}
                                            disabled={isEdit && (!editingNote || editingNote.status !== "Draft")}>
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

            {/* ── Add Customer — triggered from customer dropdown ── */}
            <AddCustomerModal
                visible={addCustomerOpen}
                onClose={() => setAddCustomerOpen(false)}
                onSuccess={handleCustomerAdded}
                mode="add"
            />

            {/* ── Add Supplier — triggered from supplier dropdown ── */}
            <AddProSupplierModal
                externalOpen={addSupplierOpen}
                onExternalClose={() => {
                    setAddSupplierOpen(false);
                    handleSupplierAdded();
                }}
            />

            {/* ── Add Account — triggered from line item account dropdown ── */}
            <AccountFormDrawer
                open={addAccountOpen}
                onClose={() => setAddAccountOpen(false)}
                onSuccess={() => {
                    setAddAccountOpen(false);
                    handleAccountAdded();
                }}
                accounts={accounts}
                shopId={shopId}
            />
        </>
    );
};

export default NoteFormDrawer;