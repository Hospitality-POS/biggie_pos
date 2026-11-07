import React from "react";
import dayjs from "dayjs";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import type { ShopInvoiceSettings } from "@services/shops";

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
    primary: "#000000",
    green: "#000000",
    red: "#000000",
    orange: "#000000",
    blue: "#000000",
    subText: "#000000",
    darkText: "#000000",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

// ── Helpers ────────────────────────────────────────────────────────────────
export const fmt = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | Date | undefined) =>
    d ? dayjs(d).format("DD MMM YYYY HH:mm") : "—";

const fmtDateShort = (d: string | Date | undefined) =>
    d ? dayjs(d).format("DD MMM YYYY") : "—";

// ── Types ──────────────────────────────────────────────────────────────────
export interface InvoiceItem {
    _id: string;
    product_id?: { _id: string; name: string; price?: number };
    description?: string;
    quantity: number;
    price?: number;
    unit_price?: number;
    vat_amount?: number;
}

export interface PaymentRecord {
    _id?: string;
    amount: number;
    method?: string;
    method_id?: { _id: string; name: string };
    reference?: string;
    notes?: string;
    payment_date?: string;
    createdAt?: string;
    created_by?: { username: string; fullname?: string };
    payment_status?: string;
    // Older payments: whoever posted the journal entry recorded them
    journal_entry_id?: { created_by?: { username: string; fullname?: string } } | string;
}

export interface InvoiceForPrint {
    _id: string;
    order_no?: string;
    invoice_no?: string;
    source?: string;
    direction?: string;
    createdAt: string;
    issue_date?: string;
    due_date?: string;
    paid_date?: string;
    status?: string;

    // Parties
    served_by?: { username: string };
    created_by?: { username: string };
    customer_id?: {
        _id?: string;
        company_name?: string;
        customer_name?: string;
        name?: string;
        phone?: string;
        customer_phone?: string;
        email?: string;
        customer_email?: string;
        location?: string;
        address?: {
            street?: string;
            building?: string;
            city?: string;
            county?: string;
            country?: string;
            postal_code?: string;
            address_type?: string;
            is_primary?: boolean;
        };
        kra_pin?: string;
        code?: string;
    } | string;
    supplier_id?: {
        _id?: string;
        name?: string;
        phone?: string;
        email?: string;
        kra_pin?: string;
    } | string;
    counterparty_name?: string;
    counterparty_phone?: string;
    counterparty_email?: string;
    counterparty_kra_pin?: string;
    supplier_ref?: string;

    // Financials
    items?: InvoiceItem[];
    subtotal: number;
    discount_amount: number;
    total_vat_amount: number;
    vat_pricing_mode?: string;
    grand_total: number;
    amount_paid?: number;
    amount_due?: number;
    currency?: string;

    // Payments
    payments?: PaymentRecord[];
    payment_ids?: PaymentRecord[];

    // Credit/Debit Notes
    credit_notes?: any[];
    notes_adjustment?: number;

    // System
    shop_id?: string;
    table_id?: { name: string };

    // ETR / DigiTax
    etr_enabled?: boolean;
    shop_kra_pin?: string | null;
    digitax?: {
        sale_id?: string;
        serial_number?: string;
        receipt_number?: number;
        invoice_number?: number;
        trader_invoice_number?: string;
        etims_url?: string;
        offline_url?: string;
        receipt_signature?: string;
        internal_data?: string;
        receipt_type_code?: string;
        sale_date?: string;
        sale_time?: string;
        submission_status?: "Submitted" | "Verified" | "COMPLETED" | "Failed" | "FAILED";
        submission_date?: string;
        error_message?: string | null;
    } | null;

    [key: string]: any;
}


export interface SystemDetails {
    BRAND_NAME1?: string;
    PHONE_NO?: string;
    EMAIL_URL?: string;
    PIN?: string;
    TILL_NO?: string;
    Paybill_bs?: string;
    Paybill_ac?: string;
    QR_Code?: string;
    tenant_logo?: { url?: string };
    bank_details?: string[];
    // Name of the payment detail selected in System Profile (e.g. "Pochi")
    payment_detail_name?: string;
    // Watermark + services banner (System Setup → Invoice Appearance)
    invoice_settings?: ShopInvoiceSettings;
}

// Label for the till/number line — uses the payment mode selected in
// System Profile (e.g. "Pochi"), falling back to the provided default.
const tillLabelFor = (sys: SystemDetails, fallback: string): string => {
    const n = (sys.payment_detail_name || "").trim();
    if (!n || /paybill/i.test(n) || /till/i.test(n)) return fallback;
    return n;
};

// ── Resolve counterparty ───────────────────────────────────────────────────
export const resolveParty = (inv: InvoiceForPrint) => {
    if (inv.direction === "supplier") {
        const s = inv.supplier_id;
        if (s && typeof s === "object") {
            return {
                label: "Supplier",
                name: s.name || "—",
                phone: s.phone || "",
                email: s.email || "",
                location: "",
                kra_pin: s.kra_pin || "",
                ref: inv.supplier_ref || "",
            };
        }
        return {
            label: "Supplier",
            name: inv.counterparty_name || "—",
            phone: inv.counterparty_phone || "",
            email: inv.counterparty_email || "",
            location: "",
            kra_pin: inv.counterparty_kra_pin || "",
            ref: inv.supplier_ref || "",
        };
    }
    const c = inv.customer_id;
    if (c && typeof c === "object") {
        return {
            label: "",
            name: c.company_name || c.customer_name || c.name || "—",
            phone: c.phone || c.customer_phone || "",
            email: c.email || c.customer_email || "",
            location: c.location || "",
            address: c.address || null,
            kra_pin: c.kra_pin || "",
            ref: "",
        };
    }
    return {
        label: "",
        name: inv.counterparty_name || "—",
        phone: inv.counterparty_phone || "",
        email: inv.counterparty_email || "",
        location: "",
        kra_pin: inv.counterparty_kra_pin || "",
        ref: "",
    };
};

// ── Shared sub-components ──────────────────────────────────────────────────

interface SharedProps {
    inv: InvoiceForPrint;
    sys: SystemDetails;
    accentColor?: string;
}

// ETR QR Code component for print templates
const EtrQrCode = ({ inv }: { inv: InvoiceForPrint }) => {
    const st = inv.digitax?.submission_status;
    const qrUrl = inv.digitax?.etims_url || inv.digitax?.offline_url;
    if (!inv.etr_enabled || !qrUrl || !(st === "Verified" || st === "COMPLETED")) return null;

    return (
        <div style={{ marginTop: 20, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.subText, marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>
                Scan to Verify ETR
            </div>
            <div style={{
                display: "inline-block",
                padding: 8,
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
            }}>
                <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrUrl)}`}
                    alt="ETR QR Code"
                    style={{ width: 120, height: 120, display: "block" }}
                />
            </div>
            {inv.digitax.serial_number && (
                <div style={{ fontSize: 9, color: C.subText, marginTop: 4, fontFamily: "monospace" }}>
                    CU: {inv.digitax.serial_number}
                </div>
            )}
        </div>
    );
};

// Whether the line unit prices already include VAT. Trusts vat_pricing_mode
// when it says INCLUSIVE; otherwise checks the figures — prices that add up
// to subtotal + VAT (not to the subtotal) are VAT-inclusive, and adding the
// line VAT again would double-count it.
const unitPricesIncludeVat = (inv: InvoiceForPrint) => {
    if (String(inv.vat_pricing_mode || "").toUpperCase() === "INCLUSIVE") return true;
    const vat = inv.total_vat_amount || 0;
    if (vat <= 0) return false;
    const gross = (inv.items || []).reduce((s, it) => s + (it.unit_price || it.price || 0) * (it.quantity || 0), 0);
    const near = (a: number, b: number) => Math.abs(a - b) <= 1;
    return near(gross, (inv.subtotal || 0) + vat) && !near(gross, inv.subtotal || 0);
};

// Line total shown on templates — VAT added on top only for VAT-exclusive prices
const lineTotalOf = (inv: InvoiceForPrint, item: InvoiceItem, discount = 0) =>
    (item.unit_price || item.price || 0) * item.quantity - discount +
    (unitPricesIncludeVat(inv) ? 0 : item.vat_amount || 0);

const ItemsTable = ({ inv }: { inv: InvoiceForPrint }) => {
    const items = inv.items || [];
    return (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0, fontSize: 12 }}>
            <thead>
                <tr style={{ background: "#fff" }}>
                    {["#", "Description", "Qty", "Unit (KES)", "VAT (KES)", "Total (KES)"].map((h) => (
                        <th
                            key={h}
                            style={{
                                padding: "8px 10px",
                                textAlign: ["#", "Qty"].includes(h) ? "center" : ["Unit (KES)", "VAT (KES)", "Total (KES)"].includes(h) ? "right" : "left",
                                fontWeight: 700,
                                fontSize: 11,
                                borderBottom: "2px solid #e2e8f0",
                                color: "#000",
                            }}
                        >
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {items.length ? (
                    items.map((item, i) => (
                        <tr key={item._id || i} style={{ background: "#fff" }}>
                            <td style={{ padding: "7px 10px", textAlign: "center", borderBottom: "1px solid #f1f5f9", color: "#000" }}>{i + 1}</td>
                            <td style={{ padding: "7px 10px", fontWeight: 600, borderBottom: "1px solid #f1f5f9", color: "#000" }}>
                                {item.product_id?.name || item.description || "—"}
                            </td>
                            <td style={{ padding: "7px 10px", textAlign: "center", borderBottom: "1px solid #f1f5f9", color: "#000" }}>{item.quantity}</td>
                            <td style={{ padding: "7px 10px", textAlign: "right", borderBottom: "1px solid #f1f5f9", color: "#000" }}>
                                {fmt(item.unit_price || item.price)}
                            </td>
                            <td style={{ padding: "7px 10px", textAlign: "right", borderBottom: "1px solid #f1f5f9", color: "#000" }}>
                                {(item.vat_amount || 0) > 0 ? fmt(item.vat_amount!) : "—"}
                            </td>
                            <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, borderBottom: "1px solid #f1f5f9", color: "#000" }}>
                                {fmt(lineTotalOf(inv, item))}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: 20, color: "#000" }}>No items</td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};

const TotalsBlock = ({ inv, accentColor: _accentColor }: { inv: InvoiceForPrint; accentColor?: string }) => (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <div style={{ width: 290, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: "#000" }}>Subtotal</span>
                <span style={{ fontWeight: 600, color: "#000" }}>KES {fmt(inv.subtotal || 0)}</span>
            </div>
            {(inv.discount_amount || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                    <span style={{ color: "#000" }}>Discount</span>
                    <span style={{ fontWeight: 600, color: "#000" }}>− KES {fmt(inv.discount_amount)}</span>
                </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: "#000" }}>VAT</span>
                <span style={{ fontWeight: 600, color: "#000" }}>KES {fmt(inv.total_vat_amount || 0)}</span>
            </div>
            {(inv.notes_adjustment || 0) !== 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                    <span style={{ color: "#000" }}>Notes Adjustment</span>
                    <span style={{ fontWeight: 600, color: "#000" }}>KES {fmt(inv.notes_adjustment!)}</span>
                </div>
            )}
            <div style={{ borderTop: "2px solid #e2e8f0", margin: "8px 0 6px" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#000" }}>Grand Total</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#000" }}>KES {fmt(inv.grand_total || 0)}</span>
            </div>
            {(inv.amount_paid || 0) > 0 && (
                <>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: 12 }}>
                        <span style={{ color: "#000" }}>Amount Paid</span>
                        <span style={{ fontWeight: 700, color: "#000" }}>KES {fmt(inv.amount_paid || 0)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 12 }}>
                        <span style={{ color: "#000", fontWeight: 600 }}>Balance Due</span>
                        <span style={{ fontWeight: 700, color: "#000" }}>
                            KES {fmt(inv.amount_due || 0)}
                        </span>
                    </div>
                </>
            )}
        </div>
    </div>
);

const BankDetailsBlock = ({
    sys,
    bgColor = "#f8fafc",
    borderColor = "#e2e8f0",
    accentColor = C.primary,
}: {
    sys: SystemDetails;
    bgColor?: string;
    borderColor?: string;
    accentColor?: string;
}) => {
    const banks = (sys.bank_details || []).filter(Boolean);
    const useLegacy = banks.length === 0 && (sys.Paybill_bs || sys.Paybill_ac);

    if (banks.length === 0 && !useLegacy) return null;

    return (
        <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {banks.map((bankText, i) => (
                <div
                    key={i}
                    style={{
                        background: bgColor,
                        border: `1px solid ${borderColor}`,
                        borderRadius: 7,
                        padding: "10px 14px",
                        flex: "1 1 180px",
                        minWidth: 160,
                    }}
                >
                    <div style={{ fontSize: 10, color: C.subText, marginBottom: 5, fontWeight: 600, textTransform: "uppercase" as const }}>
                        Bank / Payment Details
                    </div>
                    <pre style={{ margin: 0, fontFamily: "inherit", fontSize: 12, whiteSpace: "pre-wrap", color: C.darkText, lineHeight: 1.7 }}>
                        {bankText}
                    </pre>
                </div>
            ))}
            {useLegacy && (
                <div
                    style={{
                        background: bgColor,
                        border: `1px solid ${borderColor}`,
                        borderRadius: 7,
                        padding: "10px 14px",
                        minWidth: 160,
                    }}
                >
                    <div style={{ fontSize: 10, color: C.subText, marginBottom: 2 }}>Paybill / Account</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: accentColor }}>
                        {sys.Paybill_bs} / {sys.Paybill_ac || "—"}
                    </div>
                </div>
            )}
        </div>
    );
};

const PaymentDetailsBlock = ({
    inv,
    sys,
    bgColor = "#f8fafc",
    borderColor = "#e2e8f0",
    accentColor = C.primary,
}: {
    inv: InvoiceForPrint;
    sys: SystemDetails;
    bgColor?: string;
    borderColor?: string;
    accentColor?: string;
}) => {
    const payments: PaymentRecord[] = inv.payments || inv.payment_ids || [];
    const creditNotes = inv.credit_notes || [];
    const hasCreditNotes = creditNotes.length > 0;
    const hasPayments = payments.length > 0;

    // Show credit notes if they exist, otherwise show payments
    const showCreditNotes = hasCreditNotes;

    return (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
            {/* Payment methods */}
            <div
                style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase" as const,
                    color: C.subText,
                    marginBottom: 10,
                }}
            >
                Payment Details
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 14 }}>
                {sys.TILL_NO && !sys.Paybill_bs && (sys.bank_details || []).filter(Boolean).length === 0 && (
                    <div
                        style={{
                            flex: "1 1 120px",
                            background: bgColor,
                            border: `1px solid ${borderColor}`,
                            borderRadius: 7,
                            padding: "9px 12px",
                        }}
                    >
                        <div style={{ fontSize: 10, color: C.subText, marginBottom: 2 }}>{tillLabelFor(sys, "M-Pesa Till No.")}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: accentColor }}>{sys.TILL_NO}</div>
                    </div>
                )}
                {(() => {
                    const st = inv.digitax?.submission_status;
                    const qrUrl = inv.digitax?.etims_url || inv.digitax?.offline_url;
                    if (!inv.etr_enabled || !qrUrl || !(st === "Verified" || st === "COMPLETED")) return null;
                    const dateTime = [inv.digitax?.sale_date, inv.digitax?.sale_time].filter(Boolean).join(" ");
                    const cuInvoiceNo = inv.digitax?.serial_number && inv.digitax?.invoice_number
                        ? `${inv.digitax.serial_number} / ${inv.digitax.invoice_number}`
                        : inv.digitax?.serial_number || "—";
                    const rows = [
                        { label: "Date By SCU", value: dateTime || "—" },
                        { label: "Control Unit Number", value: inv.digitax?.serial_number || "—" },
                        { label: "Control Unit Invoice No.", value: cuInvoiceNo },
                        { label: "Internal Data", value: inv.digitax?.internal_data || "—" },
                        { label: "Receipt Signature", value: inv.digitax?.receipt_signature || "—" },
                    ];
                    return (
                        <div style={{ width: "100%", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                            {/* Row 1: KRA Logo */}
                            <div style={{ marginBottom: 8 }}>
                                <img
                                    src="/kra.png"
                                    alt="Kenya Revenue Authority"
                                    style={{ height: 120, objectFit: "contain" }}
                                />
                            </div>

                            {/* Row 2: SCU INFORMATION header */}
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.darkText, marginBottom: 12, letterSpacing: "0.3px" }}>
                                SCU INFORMATION
                            </div>

                            {/* Row 3: QR code on left, data on right */}
                            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                                <div style={{ flexShrink: 0 }}>
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(qrUrl)}`}
                                        alt="ETR QR Code"
                                        style={{ width: 130, height: 130, display: "block" }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
                                        <tbody>
                                            {rows.map((row) => (
                                                <tr key={row.label}>
                                                    <td style={{ padding: "3px 12px 3px 0", color: C.darkText, whiteSpace: "nowrap", verticalAlign: "top", width: 1 }}>
                                                        {row.label}
                                                    </td>
                                                    <td style={{ padding: "3px 8px", color: C.darkText, verticalAlign: "top", whiteSpace: "nowrap" }}>:</td>
                                                    <td style={{ padding: "3px 0", color: C.darkText, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>
                                                        {row.value}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div style={{ marginTop: 10, fontSize: 11, color: C.subText, fontStyle: "italic" }}>
                                        Scan the QR code to connect with KRA and verify the document.
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
                <div
                    style={{
                        flex: "1 1 120px",
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 7,
                        padding: "9px 12px",
                    }}
                >
                    <div style={{ fontSize: 10, color: "#991b1b", marginBottom: 2 }}>Balance Due</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.red }}>
                        KES {fmt(inv.amount_due || inv.grand_total || 0)}
                    </div>
                </div>
                {(inv.amount_paid || 0) > 0 && (
                    <div
                        style={{
                            flex: "1 1 120px",
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: 7,
                            padding: "9px 12px",
                        }}
                    >
                        <div style={{ fontSize: 10, color: "#065f46", marginBottom: 2 }}>Amount Paid</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>KES {fmt(inv.amount_paid || 0)}</div>
                    </div>
                )}
            </div>

            {/* Payment history table */}
            {showCreditNotes && creditNotes.length > 0 ? (
                <>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.5px",
                            textTransform: "uppercase" as const,
                            color: C.subText,
                            marginBottom: 7,
                        }}
                    >
                        Credit Notes Applied
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                            <tr style={{ background: "#f1f5f9" }}>
                                {["Date", "Note No.", "Type", "Reason", "Status", "Amount"].map((h) => (
                                    <th
                                        key={h}
                                        style={{
                                            padding: "5px 8px",
                                            textAlign: h === "Amount" ? "right" : "left",
                                            fontWeight: 700,
                                            fontSize: 10,
                                            borderBottom: "1px solid #e2e8f0",
                                            color: "#374151",
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {creditNotes.map((note, i) => {
                                const isCredit = note.note_type === "CREDIT_NOTE";
                                const statusColor =
                                    note.status === "Applied"
                                        ? C.green
                                        : note.status === "Approved"
                                            ? C.orange
                                            : note.status === "Voided"
                                                ? C.red
                                                : C.subText;
                                return (
                                    <tr key={note._id || i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                        <td style={{ padding: "5px 8px", borderBottom: "1px solid #f1f5f9", color: C.subText }}>
                                            {fmtDateShort(note.issue_date)}
                                        </td>
                                        <td style={{ padding: "5px 8px", borderBottom: "1px solid #f1f5f9", fontFamily: "monospace", fontSize: 10 }}>
                                            {note.note_no}
                                        </td>
                                        <td style={{ padding: "5px 8px", borderBottom: "1px solid #f1f5f9" }}>
                                            <span
                                                style={{
                                                    background: isCredit ? "#f0fdf4" : "#fff7ed",
                                                    color: isCredit ? C.green : C.orange,
                                                    border: `1px solid ${isCredit ? "#bbf7d0" : "#fed7aa"}`,
                                                    borderRadius: 4,
                                                    padding: "1px 6px",
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {isCredit ? "Credit" : "Debit"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "5px 8px", borderBottom: "1px solid #f1f5f9" }}>
                                            {note.reason}
                                        </td>
                                        <td style={{ padding: "5px 8px", borderBottom: "1px solid #f1f5f9" }}>
                                            <span
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: statusColor,
                                                    background: `${statusColor}15`,
                                                    border: `1px solid ${statusColor}40`,
                                                    borderRadius: 4,
                                                    padding: "1px 6px",
                                                }}
                                            >
                                                {note.status}
                                            </span>
                                        </td>
                                        <td
                                            style={{
                                                padding: "5px 8px",
                                                borderBottom: "1px solid #f1f5f9",
                                                textAlign: "right",
                                                fontWeight: 700,
                                                color: isCredit ? C.green : C.orange,
                                            }}
                                        >
                                            {isCredit ? "−" : "+"}KES {fmt(note.grand_total)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </>
            ) : payments.length > 0 ? (
                <>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.5px",
                            textTransform: "uppercase" as const,
                            color: C.subText,
                            marginBottom: 7,
                        }}
                    >
                        Payment History
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                            <tr style={{ background: "#f1f5f9" }}>
                                {["Date", "Method", "Reference", "Notes", "By", "Status", "Amount"].map((h) => (
                                    <th
                                        key={h}
                                        style={{
                                            padding: "5px 8px",
                                            textAlign: h === "Amount" ? "right" : "left",
                                            fontWeight: 700,
                                            fontSize: 10,
                                            borderBottom: "1px solid #e2e8f0",
                                            color: "#374151",
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p, i) => {
                                const methodName = p.method_id?.name || p.method || "—";
                                const statusColor =
                                    p.payment_status === "COMPLETED"
                                        ? C.green
                                        : p.payment_status === "REFUNDED"
                                            ? C.red
                                            : p.payment_status === "FAILED"
                                                ? C.red
                                                : C.orange;
                                return (
                                    <tr key={p._id || i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                        <td style={{ padding: "5px 8px", borderBottom: "1px solid #f1f5f9", color: C.subText }}>
                                            {fmtDateShort(p.payment_date || p.createdAt)}
                                        </td>
                                        <td style={{ padding: "5px 8px", borderBottom: "1px solid #f1f5f9" }}>
                                            <span
                                                style={{
                                                    background: "#ffffff",
                                                    color: C.blue,
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: 4,
                                                    padding: "1px 6px",
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {methodName}
                                            </span>
                                        </td>
                                        <td
                                            style={{
                                                padding: "5px 8px",
                                                borderBottom: "1px solid #f1f5f9",
                                                fontFamily: "monospace",
                                                fontSize: 10,
                                            }}
                                        >
                                            {p.reference || "—"}
                                        </td>
                                        <td style={{ padding: "5px 8px", borderBottom: "1px solid #f1f5f9", color: C.subText }}>
                                            {p.notes || "—"}
                                        </td>
                                        <td style={{ padding: "5px 8px", borderBottom: "1px solid #f1f5f9" }}>
                                            {(() => {
                                                const u = p.created_by || (typeof p.journal_entry_id === "object" ? p.journal_entry_id?.created_by : undefined);
                                                return u?.fullname || u?.username || "—";
                                            })()}
                                        </td>
                                        <td style={{ padding: "5px 8px", borderBottom: "1px solid #f1f5f9" }}>
                                            {p.payment_status ? (
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        color: statusColor,
                                                        background: `${statusColor}15`,
                                                        border: `1px solid ${statusColor}40`,
                                                        borderRadius: 4,
                                                        padding: "1px 6px",
                                                    }}
                                                >
                                                    {p.payment_status}
                                                </span>
                                            ) : "—"}
                                        </td>
                                        <td
                                            style={{
                                                padding: "5px 8px",
                                                borderBottom: "1px solid #f1f5f9",
                                                textAlign: "right",
                                                fontWeight: 700,
                                                color: C.green,
                                            }}
                                        >
                                            KES {fmt(p.amount)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </>
            ) : null}

            {/* Notes */}
            {inv.notes && (
                <div style={{ marginTop: 14 }}>
                    <div
                        style={{
                            background: "#fffbeb",
                            border: "1px solid #fde68a",
                            borderRadius: 7,
                            padding: "9px 12px",
                        }}
                    >
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", marginBottom: 3 }}>Notes</div>
                        <div style={{ fontSize: 12, color: "#78350f" }}>{inv.notes}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Invoice appearance: watermark + services banner ────────────────────────
const DEFAULT_PRIMARY = "#1F5C99";
const DEFAULT_SECONDARY = "#F7941D";

const brandColors = (sys: SystemDetails) => ({
    primary: sys.invoice_settings?.primary_color || DEFAULT_PRIMARY,
    secondary: sys.invoice_settings?.secondary_color || DEFAULT_SECONDARY,
});

// Image used for the watermark: the uploaded custom image, else the tenant logo
const watermarkUrlFor = (sys: SystemDetails): string | null => {
    const s = sys.invoice_settings;
    if (!s?.watermark_enabled) return null;
    if (s.watermark_source === "custom" && s.watermark_image_url) return s.watermark_image_url;
    return sys.tenant_logo?.url || null;
};

// Faded image across the middle of the invoice. On paper it is fixed to the
// page so it repeats on every page of a multi-page invoice.
export const InvoiceWatermark = ({ sys }: { sys: SystemDetails }) => {
    const src = watermarkUrlFor(sys);
    if (!src) return null;
    const s = sys.invoice_settings || {};
    const opacity = Math.min(0.5, Math.max(0.02, s.watermark_opacity ?? 0.08));
    const size = Math.min(100, Math.max(20, s.watermark_size ?? 70));
    return (
        <>
            <style>{`@media print{.inv-watermark{position:fixed!important}}`}</style>
            <img
                className="inv-watermark"
                src={src}
                alt=""
                aria-hidden
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: `${size}%`,
                    maxHeight: "80%",
                    objectFit: "contain",
                    opacity,
                    pointerEvents: "none",
                    zIndex: 1,
                }}
            />
        </>
    );
};

const PinIcon = ({ color = "#fff" }: { color?: string }) => (
    <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden style={{ flexShrink: 0 }}>
        <path d="M6 0a5 5 0 0 0-5 5c0 3.6 5 9 5 9s5-5.4 5-9a5 5 0 0 0-5-5Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" fill={color} />
    </svg>
);

// "We supply and service…" banner printed at the very bottom of the invoice
export const ServicesBanner = ({ sys }: { sys: SystemDetails }) => {
    const s = sys.invoice_settings;
    if (!s?.services_enabled) return null;
    const services = (s.services || []).map((x) => x.trim()).filter(Boolean);
    const title = (s.services_title || "").trim();
    const heading = (s.services_heading || "").trim();
    const address = (s.services_address || "").trim();
    if (!services.length && !title && !heading && !address) return null;
    const { primary, secondary } = brandColors(sys);
    // Two columns, filled top-to-bottom like the letterhead
    const half = Math.ceil(services.length / 2);
    const columns = services.length > 4 ? [services.slice(0, half), services.slice(half)] : [services];

    return (
        <div className="inv-services" style={{ marginTop: 14, breakInside: "avoid", pageBreakInside: "avoid" }}>
            {(services.length > 0 || title || heading) && (
                <div style={{ background: primary, color: "#fff", display: "flex", alignItems: "stretch", padding: "10px 16px", gap: 16 }}>
                    {(title || heading) && (
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: 16, borderRight: services.length ? `3px solid ${secondary}` : "none", minWidth: 150 }}>
                            {title && <div style={{ color: secondary, fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{title}</div>}
                            {heading && <div style={{ fontWeight: 800, fontSize: 17, lineHeight: 1.3 }}>{heading}</div>}
                        </div>
                    )}
                    {services.length > 0 && (
                        <div style={{ display: "flex", flex: 1, gap: 20 }}>
                            {columns.map((col, ci) => (
                                <ol
                                    key={ci}
                                    start={ci === 0 ? 1 : half + 1}
                                    style={{ margin: 0, paddingLeft: 18, flex: 1, fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}
                                >
                                    {col.map((svc, i) => <li key={i}>{svc}</li>)}
                                </ol>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {address && (
                <div style={{ background: secondary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "7px 16px", fontWeight: 700, fontSize: 13 }}>
                    <PinIcon />
                    <span>{address}</span>
                </div>
            )}
        </div>
    );
};

// Adds the watermark to a template. The ref lands on this wrapper so printing
// and PDF capture include the watermark layer.
const withInvoiceExtras = (
    Inner: React.ForwardRefExoticComponent<SharedProps & React.RefAttributes<HTMLDivElement>>,
    name: string,
) => {
    const Wrapped = React.forwardRef<HTMLDivElement, SharedProps>((props, ref) => (
        <div ref={ref} style={{ position: "relative", width: "100%", maxWidth: 730, background: "#fff" }}>
            <Inner {...props} />
            <InvoiceWatermark sys={props.sys} />
        </div>
    ));
    Wrapped.displayName = name;
    return Wrapped;
};

const Footer = ({ sys, borderColor = C.border, accentColor = C.primary }: { sys: SystemDetails; borderColor?: string; accentColor?: string }) => {
    // Determine which logo to use based on background color
    // Light backgrounds (Ocean: #ffffff, Forest: #f0fdf4) need dark logo
    // Dark backgrounds (Classic: #0E388A, Slate: #1e293b, Minimal: #374151) need light logo
    const isLightBackground = accentColor === '#3b82f6' || accentColor === '#16a34a';
    const logoSrc = isLightBackground ? '/relia2.png' : '/relia.png';

    return (
    <div
        className="inv-footer"
        style={{
            marginTop: 24,
            borderTop: `2px solid ${borderColor}`,
            paddingTop: 14,
        }}
    >
        {/* Row 1: Logo and POWERED BY */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            <img 
                src={logoSrc} 
                alt="Relia" 
                style={{ height: 20 }} 
            />
            <span style={{ fontSize: 11, fontWeight: 600, color: C.darkText }}>POWERED BY Basepoint</span>
        </div>
        
        {/* Row 2: Contact info, thank you, printed date */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 8 }}>
            <div style={{ fontSize: 11, color: C.subText }}>
                {sys.EMAIL_URL && <span>{sys.EMAIL_URL} · </span>}
                {sys.PHONE_NO && <span>{sys.PHONE_NO}</span>}
                {sys.PIN && <span> · KRA PIN: {sys.PIN}</span>}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.darkText }}>Thank you for your business!</div>
            <div style={{ fontSize: 11, color: C.subText }}>
                Printed {new Date().toLocaleDateString("en-KE")}
            </div>
        </div>

        {/* Services offered — the last thing on the page when enabled */}
        <ServicesBanner sys={sys} />
    </div>
    );
};

const LogoOrText = ({
    sys,
    height = 44,
    fallbackStyle = {},
}: {
    sys: SystemDetails;
    height?: number;
    fallbackStyle?: React.CSSProperties;
}) =>
    sys.tenant_logo?.url ? (
        <img
            src={sys.tenant_logo.url}
            alt="logo"
            style={{
                height,
                width: "auto",
                objectFit: "contain",
                background: "rgba(255,255,255,0.15)",
                borderRadius: 6,
                padding: 4,
            }}
        />
    ) : (
        <img
            src="/relia.png"
            alt="logo"
            style={{
                height,
                width: "auto",
                objectFit: "contain",
                background: "rgba(255,255,255,0.15)",
                borderRadius: 6,
                padding: 4,
                ...fallbackStyle,
            }}
        />
    );

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 1 — Classic (Black Header)
// ═══════════════════════════════════════════════════════════════
const Template1ClassicBase = React.forwardRef<HTMLDivElement, SharedProps>(({ inv, sys, accentColor = C.primary }, ref) => {
    const party = resolveParty(inv);
    const docLabel = inv.status === "Draft" ? "QUOTE" : inv.direction === "supplier" ? "BILL" : (inv.etr_enabled ? "TAX INVOICE" : "INVOICE");

    return (
        <div
            ref={ref}
            style={{
                fontFamily: "'Segoe UI', Roboto, sans-serif",
                color: C.darkText,
                background: "#fff",
                padding: 32,
                width: "100%",
                maxWidth: 730,
                boxSizing: "border-box" as const,
            }}
        >
            {/* Header */}
            <div
                style={{
                    background: accentColor,
                    color: "#fff",
                    margin: "-32px -32px 24px",
                    padding: "20px 32px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <LogoOrText sys={sys} height={48} />
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{sys.BRAND_NAME1 || "Business"}</div>
                        {sys.PHONE_NO && <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{sys.PHONE_NO}</div>}
                        {sys.EMAIL_URL && <div style={{ fontSize: 11, opacity: 0.85 }}>{sys.EMAIL_URL}</div>}
                        {sys.PIN && <div style={{ fontSize: 11, opacity: 0.85 }}>KRA PIN: {sys.PIN}</div>}
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div
                        style={{
                            background: "rgba(255,255,255,0.2)",
                            border: "1px solid rgba(255,255,255,.4)",
                            borderRadius: 5,
                            padding: "4px 12px",
                            fontWeight: 700,
                            fontSize: 20,
                            marginBottom: 6,
                            letterSpacing: 1,
                        }}
                    >
                        {docLabel}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{inv.order_no || inv.invoice_no}</div>
                    <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{fmtDate(inv.issue_date || inv.createdAt)}</div>
                    {inv.due_date && (
                        <div style={{ fontSize: 11, opacity: 0.75 }}>Due: {fmtDateShort(inv.due_date)}</div>
                    )}
                </div>
            </div>

            {/* Party info */}
            <div
                style={{
                    display: "flex",
                    gap: 32,
                    marginBottom: 20,
                    paddingBottom: 14,
                    borderBottom: `2px solid ${C.border}`,
                    flexWrap: "wrap",
                }}
            >
                <div style={{ flex: 1, minWidth: 160 }}>
                    <div
                        style={{
                            fontSize: 10,
                            color: C.subText,
                            textTransform: "uppercase",
                            fontWeight: 700,
                            marginBottom: 6,
                            letterSpacing: "0.4px",
                        }}
                    >
                        {party.label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{party.name}</div>
                    {party.phone && <div style={{ fontSize: 12, color: C.subText, marginTop: 2 }}>{party.phone}</div>}
                    {party.email && <div style={{ fontSize: 12, color: C.subText }}>{party.email}</div>}
                    {party.address && (
                        <div style={{ fontSize: 12, color: C.subText, marginTop: 2 }}>
                            {party.address.street && <div>{party.address.street}</div>}
                            {(party.address.city || party.address.county) && (
                                <div>
                                    {party.address.city && party.address.city}
                                    {party.address.city && party.address.county && ", "}
                                    {party.address.county && party.address.county}
                                </div>
                            )}
                            {party.address.country && <div>{party.address.country}</div>}
                            {party.address.postal_code && <div>Postal: {party.address.postal_code}</div>}
                        </div>
                    )}
                    {party.location && <div style={{ fontSize: 12, color: C.subText }}>{party.location}</div>}
                    {party.kra_pin && <div style={{ fontSize: 11, color: C.subText }}>KRA: {party.kra_pin}</div>}
                    {party.ref && <div style={{ fontSize: 11, color: C.subText }}>Ref: {party.ref}</div>}
                </div>
                {(sys.TILL_NO || sys.Paybill_bs) && (
                    <div style={{ minWidth: 140 }}>
                        <div
                            style={{
                                fontSize: 10,
                                color: C.subText,
                                textTransform: "uppercase",
                                fontWeight: 700,
                                marginBottom: 6,
                                letterSpacing: "0.4px",
                            }}
                        >
                            Pay To
                        </div>
                        {sys.TILL_NO && (
                            <div style={{ fontSize: 12 }}>
                                {tillLabelFor(sys, "Till No")}: <strong>{sys.TILL_NO}</strong>
                            </div>
                        )}
                        {sys.Paybill_bs && (
                            <div style={{ fontSize: 12 }}>
                                Paybill: <strong>{sys.Paybill_bs}</strong> · Acc: <strong>{sys.Paybill_ac}</strong>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ItemsTable inv={inv} />
            <TotalsBlock inv={inv} accentColor={C.primary} />
            <PaymentDetailsBlock inv={inv} sys={sys} accentColor={C.primary} />
            <BankDetailsBlock sys={sys} accentColor={C.primary} />
            <Footer sys={sys} accentColor={C.primary} />

            <style>{`@media print{@page{size:A4 portrait;margin:12mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.inv-root{display:flex;flex-direction:column;min-height:273mm}.inv-body{display:flex;flex-direction:column;flex:1}.inv-footer{margin-top:auto!important}}`}</style>
        </div>
    );
});
Template1ClassicBase.displayName = "Template1Classic";

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 2 — Slate Pro (Dark Navy, Left-Border Accents)
// ═══════════════════════════════════════════════════════════════
const Template2SlateProBase = React.forwardRef<HTMLDivElement, SharedProps>(({ inv, sys }, ref) => {
    const party = resolveParty(inv);
    const navy = "#1e293b";
    const docLabel = inv.status === "Draft" ? "QUOTE" : inv.direction === "supplier" ? "BILL" : (inv.etr_enabled ? "TAX INVOICE" : "INVOICE");

    return (
        <div
            ref={ref}
            className="inv-root"
            style={{ fontFamily: "'Segoe UI', Roboto, sans-serif", color: C.darkText, background: "#fff", padding: 32, width: "100%", maxWidth: 730, boxSizing: "border-box" as const }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 20,
                    paddingBottom: 16,
                    borderBottom: `3px solid ${navy}`,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                        style={{
                            background: navy,
                            borderRadius: 10,
                            padding: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <LogoOrText sys={sys} height={38} />
                    </div>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: navy }}>{sys.BRAND_NAME1 || "Business"}</div>
                        <div style={{ fontSize: 11, color: C.subText }}>
                            {[sys.PHONE_NO, sys.EMAIL_URL, sys.PIN ? `PIN: ${sys.PIN}` : ""].filter(Boolean).join(" · ")}
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 36, fontWeight: 700, color: navy, letterSpacing: "-0.5px" }}>{docLabel}</div>
                    <div style={{ fontSize: 11, color: C.subText, marginTop: 2 }}>{inv.order_no || inv.invoice_no}</div>
                    <div style={{ fontSize: 11, color: C.subText }}>{fmtDate(inv.issue_date || inv.createdAt)}</div>
                </div>
            </div>

            {/* Two-col info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                <div
                    style={{
                        background: C.bg,
                        borderLeft: `4px solid ${navy}`,
                        padding: "12px 14px",
                        borderRadius: "0 6px 6px 0",
                    }}
                >
                    <div style={{ fontSize: 10, textTransform: "uppercase" as const, fontWeight: 700, color: C.subText, marginBottom: 5 }}>
                        {party.label}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{party.name}</div>
                    {party.phone && <div style={{ fontSize: 12, color: C.subText }}>{party.phone}</div>}
                    {party.email && <div style={{ fontSize: 12, color: C.subText }}>{party.email}</div>}
                    {party.address && (
                        <div style={{ fontSize: 12, color: C.subText }}>
                            {party.address.street && <div>{party.address.street}</div>}
                            {(party.address.city || party.address.county) && (
                                <div>
                                    {party.address.city && party.address.city}
                                    {party.address.city && party.address.county && ", "}
                                    {party.address.county && party.address.county}
                                </div>
                            )}
                            {party.address.country && <div>{party.address.country}</div>}
                            {party.address.postal_code && <div>Postal: {party.address.postal_code}</div>}
                        </div>
                    )}
                    {party.location && <div style={{ fontSize: 12, color: C.subText }}>{party.location}</div>}
                    {party.kra_pin && <div style={{ fontSize: 11, color: C.subText }}>KRA: {party.kra_pin}</div>}
                </div>
                <div
                    style={{
                        background: C.bg,
                        borderLeft: "4px solid #64748b",
                        padding: "12px 14px",
                        borderRadius: "0 6px 6px 0",
                    }}
                >
                    <div style={{ fontSize: 10, textTransform: "uppercase" as const, fontWeight: 700, color: C.subText, marginBottom: 5 }}>
                        Invoice Details
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 3 }}>
                        Issued: <strong>{fmtDateShort(inv.issue_date || inv.createdAt)}</strong>
                    </div>
                    {inv.due_date && (
                        <div style={{ fontSize: 12, marginBottom: 3 }}>
                            Due: <strong style={{ color: C.red }}>{fmtDateShort(inv.due_date)}</strong>
                        </div>
                    )}
                    {inv.terms && (
                        <div style={{ fontSize: 12 }}>
                            : <strong>{inv.terms}</strong>
                        </div>
                    )}
                    {inv.served_by && !Array.isArray(inv.served_by) && inv.served_by.username && (
                        <div style={{ fontSize: 12, color: C.subText, marginTop: 3 }}>
                            Served by: {inv.served_by.username}
                        </div>
                    )}
                </div>
            </div>

            <ItemsTable inv={inv} />
            <TotalsBlock inv={inv} accentColor={navy} />
            <PaymentDetailsBlock inv={inv} sys={sys} accentColor={navy} />
            <BankDetailsBlock sys={sys} accentColor={navy} />
            <Footer sys={sys} accentColor={navy} />

            <style>{`@media print{@page{size:A4 portrait;margin:12mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.inv-root{display:flex;flex-direction:column;min-height:273mm}.inv-body{display:flex;flex-direction:column;flex:1}.inv-footer{margin-top:auto!important}}`}</style>
        </div>
    );
});
Template2SlateProBase.displayName = "Template2SlatePro";

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 3 — Ocean (Minimal Black Header, Info Chips)
// ═══════════════════════════════════════════════════════════════
const Template3OceanBase = React.forwardRef<HTMLDivElement, SharedProps>(({ inv, sys }, ref) => {
    const party = resolveParty(inv);
    const docLabel = inv.status === "Draft" ? "QUOTE" : inv.direction === "supplier" ? "BILL" : (inv.etr_enabled ? "TAX INVOICE" : "INVOICE");

    return (
        <div
            ref={ref}
            className="inv-root"
            style={{ fontFamily: "'Segoe UI', Roboto, sans-serif", color: C.darkText, background: "#fff", padding: 0, width: "100%", maxWidth: 730, boxSizing: "border-box" as const }}
        >
            {/* Gradient header */}
            <div
                style={{
                    background: "#000000",
                    color: "#fff",
                    padding: "24px 32px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <LogoOrText sys={sys} height={48} />
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{sys.BRAND_NAME1 || "Business"}</div>
                        {sys.PHONE_NO && <div style={{ fontSize: 11, opacity: 0.85 }}>{sys.PHONE_NO}</div>}
                        {sys.EMAIL_URL && <div style={{ fontSize: 11, opacity: 0.85 }}>{sys.EMAIL_URL}</div>}
                        {sys.PIN && <div style={{ fontSize: 11, opacity: 0.85 }}>PIN: {sys.PIN}</div>}
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 36, fontWeight: 700, opacity: 0.3, letterSpacing: 2 }}>{docLabel}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, marginTop: -4 }}>{inv.order_no || inv.invoice_no}</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>{fmtDateShort(inv.issue_date || inv.createdAt)}</div>
                </div>
            </div>

            <div className="inv-body" style={{ padding: "22px 32px" }}>
                {/* Party + chips */}
                <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" as const }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 10, textTransform: "uppercase" as const, fontWeight: 700, color: C.subText, marginBottom: 5 }}>
                            {party.label}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{party.name}</div>
                        {party.phone && <div style={{ fontSize: 12, color: C.subText }}>{party.phone}</div>}
                        {party.email && <div style={{ fontSize: 12, color: C.subText }}>{party.email}</div>}
                        {party.address && (
                            <div style={{ fontSize: 12, color: C.subText }}>
                                {party.address.street && <div>{party.address.street}</div>}
                                {(party.address.city || party.address.county) && (
                                    <div>
                                        {party.address.city && party.address.city}
                                        {party.address.city && party.address.county && ", "}
                                        {party.address.county && party.address.county}
                                    </div>
                                )}
                                {party.address.country && <div>{party.address.country}</div>}
                                {party.address.postal_code && <div>Postal: {party.address.postal_code}</div>}
                            </div>
                        )}
                        {party.location && <div style={{ fontSize: 12, color: C.subText }}>{party.location}</div>}
                        {party.kra_pin && <div style={{ fontSize: 11, color: C.subText }}>KRA: {party.kra_pin}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" as const }}>
                        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", minWidth: 110 }}>
                            <div style={{ fontSize: 10, color: C.subText, marginBottom: 2 }}>Invoice Date</div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: C.blue }}>{fmtDateShort(inv.issue_date || inv.createdAt)}</div>
                        </div>
                        {inv.due_date && (
                            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", minWidth: 110 }}>
                                <div style={{ fontSize: 10, color: C.subText, marginBottom: 2 }}>Due Date</div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: C.red }}>{fmtDateShort(inv.due_date)}</div>
                            </div>
                        )}
                                            </div>
                </div>

                <ItemsTable inv={inv} />
                <TotalsBlock inv={inv} accentColor={C.blue} />
                <PaymentDetailsBlock inv={inv} sys={sys} bgColor="#ffffff" borderColor="#e2e8f0" accentColor={C.blue} />
                <BankDetailsBlock sys={sys} bgColor="#ffffff" borderColor="#e2e8f0" accentColor={C.blue} />
                <Footer sys={sys} borderColor="#e2e8f0" accentColor={C.blue} />
            </div>

            <style>{`@media print{@page{size:A4 portrait;margin:12mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.inv-root{display:flex;flex-direction:column;min-height:273mm}.inv-body{display:flex;flex-direction:column;flex:1}.inv-footer{margin-top:auto!important}}`}</style>
        </div>
    );
});
Template3OceanBase.displayName = "Template3Ocean";

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 4 — Minimal / Editorial (Serif, Clean Rules)
// ═══════════════════════════════════════════════════════════════
const Template4MinimalBase = React.forwardRef<HTMLDivElement, SharedProps>(({ inv, sys }, ref) => {
    const party = resolveParty(inv);
    const charcoal = C.darkText;
    const docLabel = inv.status === "Draft" ? "Quote" : inv.direction === "supplier" ? "Bill" : (inv.etr_enabled ? "Tax Invoice" : "Invoice");

    return (
        <div
            ref={ref}
            className="inv-root"
            style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                color: C.darkText,
                background: "#fff",
                padding: 36,
                width: "100%",
                maxWidth: 730,
                boxSizing: "border-box" as const,
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginBottom: 20,
                    paddingBottom: 16,
                    borderBottom: `3px solid ${charcoal}`,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ background: charcoal, borderRadius: 8, padding: 4 }}>
                        <LogoOrText sys={sys} height={36} />
                    </div>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: charcoal, letterSpacing: "-0.5px" }}>
                            {sys.BRAND_NAME1 || "Business"}
                        </div>
                        <div style={{ fontSize: 11, color: C.subText, fontFamily: "'Segoe UI', sans-serif" }}>
                            {[sys.PHONE_NO, sys.EMAIL_URL].filter(Boolean).join(" · ")}
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, color: C.subText, fontStyle: "italic", fontFamily: "'Segoe UI', sans-serif", fontWeight: 600 }}>
                        {docLabel}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: charcoal }}>{inv.order_no || inv.invoice_no}</div>
                    <div style={{ fontSize: 11, color: C.subText, fontFamily: "'Segoe UI', sans-serif" }}>
                        {fmtDateShort(inv.issue_date || inv.createdAt)}
                    </div>
                </div>
            </div>

            {/* Two-col party + financials */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 24,
                    marginBottom: 22,
                    fontFamily: "'Segoe UI', sans-serif",
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 10,
                            textTransform: "uppercase" as const,
                            letterSpacing: "1px",
                            color: "C.subText",
                            marginBottom: 6,
                        }}
                    >
                        {party.label}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{party.name}</div>
                    {party.phone && <div style={{ fontSize: 12, color: C.subText }}>{party.phone}</div>}
                    {party.email && <div style={{ fontSize: 12, color: C.subText }}>{party.email}</div>}
                    {party.address && (
                        <div style={{ fontSize: 12, color: C.subText }}>
                            {party.address.street && <div>{party.address.street}</div>}
                            {(party.address.city || party.address.county) && (
                                <div>
                                    {party.address.city && party.address.city}
                                    {party.address.city && party.address.county && ", "}
                                    {party.address.county && party.address.county}
                                </div>
                            )}
                            {party.address.country && <div>{party.address.country}</div>}
                            {party.address.postal_code && <div>Postal: {party.address.postal_code}</div>}
                        </div>
                    )}
                    {party.location && <div style={{ fontSize: 12, color: C.subText }}>{party.location}</div>}
                    {party.kra_pin && <div style={{ fontSize: 11, color: C.subText }}>KRA: {party.kra_pin}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                    <div
                        style={{
                            fontSize: 10,
                            textTransform: "uppercase" as const,
                            letterSpacing: "1px",
                            color: "C.subText",
                            marginBottom: 6,
                        }}
                    >
                        Amount Due
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: C.red }}>
                        KES {fmt(inv.amount_due ?? inv.grand_total ?? 0)}
                    </div>
                    {inv.due_date && (
                        <div style={{ fontSize: 12, color: C.subText, marginTop: 2 }}>by {fmtDateShort(inv.due_date)}</div>
                    )}
                </div>
            </div>

            <div style={{ fontFamily: "'Segoe UI', sans-serif" }}>
                <ItemsTable inv={inv} />
                <TotalsBlock inv={inv} accentColor={charcoal} />
                <PaymentDetailsBlock inv={inv} sys={sys} accentColor={charcoal} />
            </div>

            <BankDetailsBlock sys={sys} accentColor={charcoal} />
            <Footer sys={sys} accentColor={charcoal} />

            <style>{`@media print{@page{size:A4 portrait;margin:14mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.inv-root{display:flex;flex-direction:column;min-height:269mm}.inv-body{display:flex;flex-direction:column;flex:1}.inv-footer{margin-top:auto!important}}`}</style>
        </div>
    );
});
Template4MinimalBase.displayName = "Template4Minimal";

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 5 — Forest (Deep Green, Tinted Cards)
// ═══════════════════════════════════════════════════════════════
const Template5ForestBase = React.forwardRef<HTMLDivElement, SharedProps>(({ inv, sys }, ref) => {
    const party = resolveParty(inv);
    const forest = "#065f46";
    const docLabel = inv.status === "Draft" ? "QUOTE" : inv.direction === "supplier" ? "BILL" : (inv.etr_enabled ? "TAX INVOICE" : "INVOICE");

    return (
        <div
            ref={ref}
            className="inv-root"
            style={{ fontFamily: "'Segoe UI', Roboto, sans-serif", color: C.darkText, background: "#fff", padding: 0, width: "100%", maxWidth: 730, boxSizing: "border-box" as const }}
        >
            {/* Header bar */}
            <div style={{ background: forest, color: "#fff", display: "flex", alignItems: "stretch", overflow: "hidden" }}>
                <div style={{ padding: "22px 28px", flex: 1, display: "flex", alignItems: "center", gap: 14 }}>
                    <LogoOrText sys={sys} height={48} />
                    <div>
                        <div style={{ fontSize: 19, fontWeight: 700 }}>{sys.BRAND_NAME1 || "Business"}</div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>
                            {[sys.PHONE_NO, sys.EMAIL_URL, sys.PIN ? `PIN: ${sys.PIN}` : ""].filter(Boolean).join(" | ")}
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        background: "rgba(255,255,255,0.12)",
                        padding: "22px 24px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        minWidth: 140,
                    }}
                >
                    <div style={{ fontSize: 16, letterSpacing: "1.5px", textTransform: "uppercase" as const, opacity: 0.7, marginBottom: 4, fontWeight: 600 }}>
                        {docLabel}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{inv.order_no || inv.invoice_no}</div>
                    <div style={{ fontSize: 11, opacity: 0.75, marginTop: 3 }}>
                        {fmtDateShort(inv.issue_date || inv.createdAt)}
                    </div>
                </div>
            </div>

            <div className="inv-body" style={{ padding: "22px 28px" }}>
                {/* Party cards */}
                <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" as const }}>
                    <div
                        style={{
                            flex: 1,
                            minWidth: 160,
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: 8,
                            padding: "12px 14px",
                        }}
                    >
                        <div style={{ fontSize: 10, textTransform: "uppercase" as const, fontWeight: 700, color: forest, marginBottom: 5 }}>
                            {party.label}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{party.name}</div>
                        {party.phone && <div style={{ fontSize: 12, color: "#064e3b" }}>{party.phone}</div>}
                        {party.email && <div style={{ fontSize: 12, color: "#064e3b" }}>{party.email}</div>}
                        {party.address && (
                            <div style={{ fontSize: 12, color: "#064e3b" }}>
                                {party.address.street && <div>{party.address.street}</div>}
                                {(party.address.city || party.address.county) && (
                                    <div>
                                        {party.address.city && party.address.city}
                                        {party.address.city && party.address.county && ", "}
                                        {party.address.county && party.address.county}
                                    </div>
                                )}
                                {party.address.country && <div>{party.address.country}</div>}
                                {party.address.postal_code && <div>Postal: {party.address.postal_code}</div>}
                            </div>
                        )}
                        {party.location && <div style={{ fontSize: 12, color: "#064e3b" }}>{party.location}</div>}
                        {party.kra_pin && <div style={{ fontSize: 11, color: "#064e3b" }}>KRA: {party.kra_pin}</div>}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 130 }}>
                        {inv.due_date && (
                            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px" }}>
                                <div style={{ fontSize: 10, textTransform: "uppercase" as const, fontWeight: 700, color: "#991b1b", marginBottom: 2 }}>
                                    Due Date
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>{fmtDateShort(inv.due_date)}</div>
                            </div>
                        )}
                    </div>
                </div>

                <ItemsTable inv={inv} />
                <TotalsBlock inv={inv} accentColor={forest} />
                <PaymentDetailsBlock inv={inv} sys={sys} bgColor="#f0fdf4" borderColor="#bbf7d0" accentColor={forest} />
                <BankDetailsBlock sys={sys} bgColor="#f0fdf4" borderColor="#bbf7d0" accentColor={forest} />
                <Footer sys={sys} borderColor="#d1fae5" accentColor={forest} />
            </div>

            <style>{`@media print{@page{size:A4 portrait;margin:12mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.inv-root{display:flex;flex-direction:column;min-height:273mm}.inv-body{display:flex;flex-direction:column;flex:1}.inv-footer{margin-top:auto!important}}`}</style>
        </div>
    );
});
Template5ForestBase.displayName = "Template5Forest";

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 6 — Clean (Professional multi-column, black & white)
// ═══════════════════════════════════════════════════════════════
const ItemsTableClean = ({ inv }: { inv: InvoiceForPrint }) => {
    const items = inv.items || [];
    return (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 12 }}>
            <thead>
                <tr style={{ background: "#6b7280", color: "#fff" }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Item</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Description</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>Unit Cost</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>Qty</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>Discount</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>Line Total</th>
                </tr>
            </thead>
            <tbody>
                {items.length ? items.map((item, i) => {
                    const unit = item.unit_price || item.price || 0;
                    const discount = (item as any).discount || 0;
                    const lineTotal = lineTotalOf(inv, item, discount);
                    return (
                        <tr key={item._id || i}>
                            <td style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", color: "#000" }}>{item.product_id?.name || `Item ${i + 1}`}</td>
                            <td style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", color: "#000" }}>{item.description || "—"}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #e5e7eb", color: "#000" }}>{fmt(unit)}</td>
                            <td style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #e5e7eb", color: "#000" }}>{item.quantity}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #e5e7eb", color: "#000" }}>{discount ? `− ${fmt(discount)}` : "—"}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #e5e7eb", fontWeight: 600, color: "#000" }}>{fmt(lineTotal)}</td>
                        </tr>
                    );
                }) : (
                    <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#000" }}>No items</td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};

const Template6CleanBase = React.forwardRef<HTMLDivElement, SharedProps>(({ inv, sys }, ref) => {
    const party = resolveParty(inv);
    const companyAddress = [sys.ADDRESS_1, sys.ADDRESS_2, sys.CITY, sys.COUNTRY].filter(Boolean).join(", ");

    return (
        <div
            ref={ref}
            className="inv-root"
            style={{
                fontFamily: "'Segoe UI', Roboto, sans-serif",
                color: "#000",
                background: "#fff",
                padding: 32,
                width: "100%",
                maxWidth: 730,
                boxSizing: "border-box" as const,
            }}
        >
            <style>{`@media print{@page{size:A4 portrait;margin:12mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.inv-root{display:flex;flex-direction:column;min-height:273mm}.inv-footer{margin-top:auto!important}}`}</style>

            {/* Top header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                    <LogoOrText sys={sys} height={52} />
                </div>
                <div style={{ flex: 1, textAlign: "center", padding: "0 16px" }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{sys.BRAND_NAME1 || "Business"}</div>
                    {sys.PHONE_NO && <div style={{ fontSize: 11 }}>{sys.PHONE_NO}</div>}
                    {sys.EMAIL_URL && <div style={{ fontSize: 11 }}>{sys.EMAIL_URL}</div>}
                    {sys.PIN && <div style={{ fontSize: 11 }}>PIN: {sys.PIN}</div>}
                </div>
                <div style={{ flex: 1, textAlign: "right", fontSize: 11, minWidth: 160 }}>
                    {companyAddress && <div>{companyAddress}</div>}
                </div>
            </div>

            {/* Issued to + black info box */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div style={{ flex: 1, paddingRight: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Invoice issued to:</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{party.name}</div>
                    {party.phone && <div style={{ fontSize: 11 }}>{party.phone}</div>}
                    {party.email && <div style={{ fontSize: 11 }}>{party.email}</div>}
                    {party.address && (
                        <div style={{ fontSize: 11 }}>
                            {party.address.street && <div>{party.address.street}</div>}
                            {(party.address.city || party.address.county) && (
                                <div>
                                    {party.address.city && party.address.city}
                                    {party.address.city && party.address.county && ", "}
                                    {party.address.county && party.address.county}
                                </div>
                            )}
                            {party.address.country && <div>{party.address.country}</div>}
                        </div>
                    )}
                    {party.location && <div style={{ fontSize: 11 }}>{party.location}</div>}
                    {party.kra_pin && <div style={{ fontSize: 11 }}>KRA: {party.kra_pin}</div>}
                </div>

                <div style={{ width: 260, background: "#000", color: "#fff", borderRadius: 8, padding: "16px 18px" }}>
                    <table style={{ width: "100%", color: "#fff", fontSize: 12, lineHeight: 1.6 }}>
                        <tbody>
                            <tr><td style={{ padding: "3px 0" }}>Invoice Number</td><td style={{ textAlign: "right", fontWeight: 600 }}>{inv.order_no || inv.invoice_no}</td></tr>
                            <tr><td style={{ padding: "3px 0" }}>Invoice Date</td><td style={{ textAlign: "right", fontWeight: 600 }}>{fmtDateShort(inv.issue_date || inv.createdAt)}</td></tr>
                            <tr><td style={{ padding: "3px 0" }}>Invoice Total</td><td style={{ textAlign: "right", fontWeight: 600 }}>KES {fmt(inv.grand_total || 0)}</td></tr>
                            <tr><td style={{ padding: "3px 0" }}>Balance Due</td><td style={{ textAlign: "right", fontWeight: 600 }}>KES {fmt(inv.amount_due ?? inv.grand_total ?? 0)}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Items table */}
            <ItemsTableClean inv={inv} />

            {/* Totals */}
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: 280 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                        <span style={{ color: "#000" }}>Subtotal</span>
                        <span style={{ fontWeight: 600, color: "#000" }}>KES {fmt(inv.subtotal || 0)}</span>
                    </div>
                    {(inv.discount_amount || 0) > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                            <span style={{ color: "#000" }}>Discount</span>
                            <span style={{ fontWeight: 600, color: "#000" }}>− KES {fmt(inv.discount_amount)}</span>
                        </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                        <span style={{ color: "#000" }}>VAT</span>
                        <span style={{ fontWeight: 600, color: "#000" }}>KES {fmt(inv.total_vat_amount || 0)}</span>
                    </div>
                    <div style={{ borderTop: "2px solid #e2e8f0", margin: "8px 0 6px" }} />
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#000" }}>Grand Total</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#000" }}>KES {fmt(inv.grand_total || 0)}</span>
                    </div>
                    {(inv.amount_paid || 0) > 0 && (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: 12 }}>
                                <span style={{ color: "#000" }}>Amount Paid</span>
                                <span style={{ fontWeight: 700, color: "#000" }}>KES {fmt(inv.amount_paid || 0)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 12 }}>
                                <span style={{ color: "#000", fontWeight: 600 }}>Balance Due</span>
                                <span style={{ fontWeight: 700, color: "#000" }}>KES {fmt(inv.amount_due || 0)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div style={{ marginTop: "auto", paddingTop: 24 }}>
                <Footer sys={sys} borderColor="#e2e8f0" accentColor="#000000" />
            </div>
        </div>
    );
});
Template6CleanBase.displayName = "Template6Clean";

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 7 — Letterhead (logo + contacts header, brand colours,
// account details and a services banner at the bottom)
// ═══════════════════════════════════════════════════════════════
const ContactIcon = ({ kind, color }: { kind: "phone" | "email" | "web"; color: string }) => {
    const paths: Record<typeof kind, string> = {
        phone: "M3.6 1.2 5.4 3c.3.3.3.8 0 1.1L4.3 5.2a8 8 0 0 0 4.5 4.5l1.1-1.1c.3-.3.8-.3 1.1 0l1.8 1.8c.3.3.3.8 0 1.1l-1 1A2 2 0 0 1 10 13 10 10 0 0 1 1 4a2 2 0 0 1 .5-1.8l1-1c.3-.3.8-.3 1.1 0Z",
        email: "M1 3h12v8H1V3Zm1 1v.3l5 3.2 5-3.2V4H2Zm10 1.5L7 8.7 2 5.5V10h10V5.5Z",
        web: "M7 1a6 6 0 1 0 0 12A6 6 0 0 0 7 1Zm4.9 5.5H9.6a9 9 0 0 0-.8-3.9 5 5 0 0 1 3.1 3.9ZM7 2.1c.6.8 1.4 2.2 1.6 4.4H5.4C5.6 4.3 6.4 2.9 7 2.1Zm-1.8.5a9 9 0 0 0-.8 3.9H2.1a5 5 0 0 1 3.1-3.9ZM2.1 7.5h2.3c.1 1.5.4 2.8.8 3.9a5 5 0 0 1-3.1-3.9ZM7 11.9c-.6-.8-1.4-2.2-1.6-4.4h3.2c-.2 2.2-1 3.6-1.6 4.4Zm1.8-.5c.4-1.1.7-2.4.8-3.9h2.3a5 5 0 0 1-3.1 3.9Z",
    };
    return (
        <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden style={{ flexShrink: 0 }}>
            <path d={paths[kind]} fill={color} />
        </svg>
    );
};

const Template7LetterheadBase = React.forwardRef<HTMLDivElement, SharedProps>(({ inv, sys }, ref) => {
    const party = resolveParty(inv);
    const { primary, secondary } = brandColors(sys);
    const website = (sys.invoice_settings?.website || "").trim();
    const docLabel = inv.status === "Draft" ? "QUOTE" : inv.direction === "supplier" ? "BILL" : (inv.etr_enabled ? "TAX INVOICE" : "INVOICE");
    const banks = (sys.bank_details || []).filter(Boolean);
    const hasPaybill = !!(sys.Paybill_bs || sys.Paybill_ac);
    const items = inv.items || [];
    const contacts = [
        sys.PHONE_NO && { kind: "phone" as const, text: sys.PHONE_NO },
        sys.EMAIL_URL && { kind: "email" as const, text: sys.EMAIL_URL },
        website && { kind: "web" as const, text: website },
    ].filter(Boolean) as { kind: "phone" | "email" | "web"; text: string }[];
    const cell: React.CSSProperties = { padding: "7px 10px", borderBottom: "1px solid #e2e8f0", color: "#000" };

    return (
        <div
            ref={ref}
            className="inv-root"
            style={{
                fontFamily: "'Segoe UI', Roboto, sans-serif",
                color: "#000",
                background: "#fff",
                padding: 32,
                width: "100%",
                maxWidth: 730,
                boxSizing: "border-box" as const,
            }}
        >
            <style>{`@media print{@page{size:A4 portrait;margin:12mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.inv-root{display:flex;flex-direction:column;min-height:273mm}.inv-footer{margin-top:auto!important}}`}</style>

            {/* Letterhead: logo left, contacts right, two-tone rule */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <div>
                    {sys.tenant_logo?.url ? (
                        <img src={sys.tenant_logo.url} alt="logo" style={{ height: 64, maxWidth: 260, objectFit: "contain", display: "block" }} />
                    ) : (
                        <div style={{ fontSize: 24, fontWeight: 800, color: primary }}>{sys.BRAND_NAME1 || "Business"}</div>
                    )}
                    {sys.PIN && <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>KRA PIN: {sys.PIN}</div>}
                </div>
                {contacts.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {contacts.map((c) => (
                            <div key={c.kind} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: primary, letterSpacing: 0.3 }}>
                                <ContactIcon kind={c.kind} color={secondary} />
                                <span>{c.text}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div style={{ display: "flex", height: 3, margin: "12px 0 20px" }}>
                <div style={{ flex: 3, background: primary }} />
                <div style={{ flex: 2, background: secondary }} />
            </div>

            {/* Title + document meta */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: primary, letterSpacing: 1, marginBottom: 10 }}>{docLabel}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: secondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                        {party.label || "Bill To"}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{party.name}</div>
                    {party.phone && <div style={{ fontSize: 11 }}>{party.phone}</div>}
                    {party.email && <div style={{ fontSize: 11 }}>{party.email}</div>}
                    {party.address && (
                        <div style={{ fontSize: 11 }}>
                            {[party.address.street, party.address.city, party.address.county, party.address.country].filter(Boolean).join(", ")}
                        </div>
                    )}
                    {party.location && <div style={{ fontSize: 11 }}>{party.location}</div>}
                    {party.kra_pin && <div style={{ fontSize: 11 }}>KRA PIN: {party.kra_pin}</div>}
                    {party.ref && <div style={{ fontSize: 11 }}>Ref: {party.ref}</div>}
                </div>
                <table style={{ fontSize: 12, borderCollapse: "collapse", minWidth: 230 }}>
                    <tbody>
                        {[
                            ["Invoice No.", inv.order_no || inv.invoice_no || "—"],
                            ["Date", fmtDateShort(inv.issue_date || inv.createdAt)],
                            ...(inv.due_date ? [["Due Date", fmtDateShort(inv.due_date)]] : []),
                            ["Status", inv.status || "—"],
                        ].map(([k, v]) => (
                            <tr key={k}>
                                <td style={{ padding: "4px 10px", background: primary, color: "#fff", fontWeight: 600, border: "1px solid #fff" }}>{k}</td>
                                <td style={{ padding: "4px 10px", textAlign: "right", fontWeight: 600, border: "1px solid #e2e8f0" }}>{v}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Items */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                    <tr style={{ background: primary }}>
                        {["#", "Description", "Qty", "Unit (KES)", "VAT (KES)", "Total (KES)"].map((h, i) => (
                            <th key={h} style={{ padding: "8px 10px", color: "#fff", fontWeight: 700, fontSize: 11, textAlign: i === 0 || i === 2 ? "center" : i >= 3 ? "right" : "left" }}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.length ? items.map((item, i) => (
                        <tr key={item._id || i}>
                            <td style={{ ...cell, textAlign: "center" }}>{i + 1}</td>
                            <td style={{ ...cell, fontWeight: 600 }}>{item.product_id?.name || item.description || "—"}</td>
                            <td style={{ ...cell, textAlign: "center" }}>{item.quantity}</td>
                            <td style={{ ...cell, textAlign: "right" }}>{fmt(item.unit_price || item.price || 0)}</td>
                            <td style={{ ...cell, textAlign: "right" }}>{(item.vat_amount || 0) > 0 ? fmt(item.vat_amount!) : "—"}</td>
                            <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>{fmt(lineTotalOf(inv, item))}</td>
                        </tr>
                    )) : (
                        <tr><td colSpan={6} style={{ ...cell, textAlign: "center", padding: 20 }}>No items</td></tr>
                    )}
                </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <div style={{ width: 280, fontSize: 12 }}>
                    {[
                        ["Subtotal", `KES ${fmt(inv.subtotal || 0)}`],
                        ...((inv.discount_amount || 0) > 0 ? [["Discount", `− KES ${fmt(inv.discount_amount)}`]] : []),
                        ["VAT", `KES ${fmt(inv.total_vat_amount || 0)}`],
                        ...((inv.notes_adjustment || 0) !== 0 ? [["Notes Adjustment", `KES ${fmt(inv.notes_adjustment!)}`]] : []),
                    ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 10px" }}>
                            <span>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
                        </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", background: primary, color: "#fff", padding: "7px 10px", marginTop: 6, fontWeight: 700, fontSize: 14 }}>
                        <span>Grand Total</span><span>KES {fmt(inv.grand_total || 0)}</span>
                    </div>
                    {(inv.amount_paid || 0) > 0 && (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px 0" }}>
                                <span>Amount Paid</span><span style={{ fontWeight: 700 }}>KES {fmt(inv.amount_paid || 0)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", background: secondary, color: "#fff", padding: "5px 10px", marginTop: 4, fontWeight: 700 }}>
                                <span>Balance Due</span><span>KES {fmt(inv.amount_due || 0)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <PaymentDetailsBlock inv={inv} sys={sys} accentColor={primary} />

            {/* Account details */}
            {(banks.length > 0 || hasPaybill || sys.TILL_NO) && (
                <div style={{ marginTop: 18, fontSize: 12, fontWeight: 700, lineHeight: 1.7, textTransform: "uppercase" }}>
                    <div style={{ color: primary, textDecoration: "underline", marginBottom: 2 }}>Acc Details:</div>
                    {banks.map((b, i) => (
                        <pre key={i} style={{ margin: "0 0 6px", fontFamily: "inherit", whiteSpace: "pre-wrap" }}>{b}</pre>
                    ))}
                    {banks.length === 0 && hasPaybill && (
                        <div>Paybill: {sys.Paybill_bs || "—"} · Acc: {sys.Paybill_ac || "—"}</div>
                    )}
                    {banks.length === 0 && !hasPaybill && sys.TILL_NO && (
                        <div>{tillLabelFor(sys, "M-Pesa Till No.")}: {sys.TILL_NO}</div>
                    )}
                </div>
            )}

            <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, fontWeight: 800, color: primary, letterSpacing: 0.5 }}>
                THANK YOU FOR DOING BUSINESS WITH US.
            </div>

            <div style={{ marginTop: "auto", paddingTop: 16 }}>
                <Footer sys={sys} borderColor="#e2e8f0" accentColor="#000000" />
            </div>
        </div>
    );
});
Template7LetterheadBase.displayName = "Template7Letterhead";

// Every template carries the watermark (when enabled in System Setup)
export const Template1Classic = withInvoiceExtras(Template1ClassicBase, "Template1Classic");
export const Template2SlatePro = withInvoiceExtras(Template2SlateProBase, "Template2SlatePro");
export const Template3Ocean = withInvoiceExtras(Template3OceanBase, "Template3Ocean");
export const Template4Minimal = withInvoiceExtras(Template4MinimalBase, "Template4Minimal");
export const Template5Forest = withInvoiceExtras(Template5ForestBase, "Template5Forest");
export const Template6Clean = withInvoiceExtras(Template6CleanBase, "Template6Clean");
export const Template7Letterhead = withInvoiceExtras(Template7LetterheadBase, "Template7Letterhead");

// ── Template meta ──────────────────────────────────────────────────────────
export const TEMPLATES = [
    {
        id: 4,
        name: "Minimal",
        description: "Serif editorial, clean double-rule",
        component: Template4Minimal,
        thumbBg: "#ffffff",
        thumbAccent: "#000000",
    },
    {
        id: 1,
        name: "Classic",
        description: "Black header, bold & professional",
        component: Template1Classic,
        thumbBg: "#000000", // Will be dynamically overridden by primary color
        thumbAccent: "#fff",
    },
    {
        id: 2,
        name: "Slate Pro",
        description: "Navy tones, corporate left-border style",
        component: Template2SlatePro,
        thumbBg: "#1e293b",
        thumbAccent: "#fff",
    },
    {
        id: 3,
        name: "Ocean",
        description: "Minimal black header, clean chip layout",
        component: Template3Ocean,
        thumbBg: "#000000",
        thumbAccent: "#fff",
    },
    {
        id: 5,
        name: "Forest",
        description: "Deep green, tinted cards",
        component: Template5Forest,
        thumbBg: "#065f46",
        thumbAccent: "#fff",
    },
    {
        id: 6,
        name: "Clean",
        description: "Professional multi-column, black & white",
        component: Template6Clean,
        thumbBg: "#000000",
        thumbAccent: "#ffffff",
    },
    {
        id: 7,
        name: "Letterhead",
        description: "Logo & contacts letterhead, brand colours, services banner",
        component: Template7Letterhead,
        thumbBg: DEFAULT_PRIMARY,
        thumbAccent: "#ffffff",
    },
] as const;

export type TemplateId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const TEMPLATE_IDS: TemplateId[] = [1, 2, 3, 4, 5, 6, 7];

// Look up by id — TEMPLATES is in display order, not id order
export const templateById = (id: TemplateId) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];