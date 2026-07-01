import React from "react";
import dayjs from "dayjs";
import { usePrimaryColor } from "../../../context/PrimaryColorContext";

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
    primary: "#dc2626",
    green: "#10b981",
    red: "#ef4444",
    orange: "#f59e0b",
    blue: "#1d4ed8",
    subText: "#64748b",
    darkText: "#0f172a",
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

export interface BankDetail {
    _id?: string;
    bank_name: string;
    branch: string;
    account_no: string;
    account_name: string;
    swift_code: string;
    paybill_no: string;
    is_primary: boolean;
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
    bank_details?: BankDetail[];
}

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
            name: c.customer_name || c.name || "—",
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

const ItemsTable = ({ inv }: { inv: InvoiceForPrint }) => {
    const items = inv.items || [];
    return (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0, fontSize: 12 }}>
            <thead>
                <tr style={{ background: "#f1f5f9" }}>
                    {["#", "Description", "Qty", "Unit (KES)", "VAT (KES)", "Total (KES)"].map((h) => (
                        <th
                            key={h}
                            style={{
                                padding: "8px 10px",
                                textAlign: ["#", "Qty"].includes(h) ? "center" : ["Unit (KES)", "VAT (KES)", "Total (KES)"].includes(h) ? "right" : "left",
                                fontWeight: 700,
                                fontSize: 11,
                                borderBottom: "2px solid #e2e8f0",
                                color: "#374151",
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
                        <tr key={item._id || i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                            <td style={{ padding: "7px 10px", textAlign: "center", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{i + 1}</td>
                            <td style={{ padding: "7px 10px", fontWeight: 600, borderBottom: "1px solid #f1f5f9" }}>
                                {item.product_id?.name || item.description || "—"}
                            </td>
                            <td style={{ padding: "7px 10px", textAlign: "center", borderBottom: "1px solid #f1f5f9" }}>{item.quantity}</td>
                            <td style={{ padding: "7px 10px", textAlign: "right", borderBottom: "1px solid #f1f5f9" }}>
                                {fmt(item.unit_price || item.price)}
                            </td>
                            <td style={{ padding: "7px 10px", textAlign: "right", borderBottom: "1px solid #f1f5f9", color: "#3b82f6" }}>
                                {(item.vat_amount || 0) > 0 ? fmt(item.vat_amount!) : "—"}
                            </td>
                            <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>
                                {fmt((item.unit_price || item.price || 0) * item.quantity + (item.vat_amount || 0))}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: 20, color: C.subText }}>No items</td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};

const TotalsBlock = ({ inv, accentColor }: { inv: InvoiceForPrint; accentColor: string }) => (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <div style={{ width: 290, background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: C.subText }}>Subtotal</span>
                <span style={{ fontWeight: 600 }}>KES {fmt(inv.subtotal || 0)}</span>
            </div>
            {(inv.discount_amount || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                    <span style={{ color: C.subText }}>Discount</span>
                    <span style={{ fontWeight: 600, color: C.orange }}>− KES {fmt(inv.discount_amount)}</span>
                </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: C.subText }}>VAT {inv.vat_pricing_mode ? `(${inv.vat_pricing_mode})` : ""}</span>
                <span style={{ fontWeight: 600 }}>KES {fmt(inv.total_vat_amount || 0)}</span>
            </div>
            {(inv.notes_adjustment || 0) !== 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                    <span style={{ color: C.subText }}>Notes Adjustment</span>
                    <span style={{ fontWeight: 600, color: C.orange }}>KES {fmt(inv.notes_adjustment!)}</span>
                </div>
            )}
            <div style={{ borderTop: `2px solid ${C.border}`, margin: "8px 0 6px" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Grand Total</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: accentColor }}>KES {fmt(inv.grand_total || 0)}</span>
            </div>
            {(inv.amount_paid || 0) > 0 && (
                <>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: 12 }}>
                        <span style={{ color: C.green }}>Amount Paid</span>
                        <span style={{ fontWeight: 700, color: C.green }}>KES {fmt(inv.amount_paid || 0)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 12 }}>
                        <span style={{ color: (inv.amount_due || 0) > 0 ? C.red : C.green, fontWeight: 600 }}>Balance Due</span>
                        <span style={{ fontWeight: 700, color: (inv.amount_due || 0) > 0 ? C.red : C.green }}>
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
    // Get primary bank from bank_details array
    const primaryBank = sys.bank_details?.find((b) => b.is_primary);
    
    // Fallback to legacy Paybill fields if no bank_details
    const useLegacy = !primaryBank && (sys.Paybill_bs || sys.Paybill_ac);

    if (!primaryBank && !useLegacy) return null;

    return (
        <div style={{ marginTop: 20, textAlign: "center" }}>
            <div
                style={{
                    display: "inline-block",
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 7,
                    padding: "10px 14px",
                    minWidth: 200,
                }}
            >
                {primaryBank ? (
                    <>
                        <div style={{ fontSize: 10, color: C.subText, marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>
                            Bank Details
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, marginBottom: 2 }}>
                            {primaryBank.bank_name}
                        </div>
                        {primaryBank.branch && (
                            <div style={{ fontSize: 10, color: C.subText, marginBottom: 4 }}>
                                {primaryBank.branch}
                            </div>
                        )}
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.darkText, marginBottom: 2 }}>
                            A/C: {primaryBank.account_no}
                        </div>
                        {primaryBank.account_name && (
                            <div style={{ fontSize: 10, color: C.subText, marginBottom: 4 }}>
                                {primaryBank.account_name}
                            </div>
                        )}
                        {primaryBank.paybill_no && (
                            <div style={{ fontSize: 11, fontWeight: 600, color: accentColor }}>
                                Paybill: {primaryBank.paybill_no}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: 10, color: C.subText, marginBottom: 2 }}>Paybill / Account</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: accentColor }}>
                            {sys.Paybill_bs} / {sys.Paybill_ac || "—"}
                        </div>
                    </>
                )}
            </div>
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
                {sys.TILL_NO && !sys.Paybill_bs && (
                    <div
                        style={{
                            flex: "1 1 120px",
                            background: bgColor,
                            border: `1px solid ${borderColor}`,
                            borderRadius: 7,
                            padding: "9px 12px",
                        }}
                    >
                        <div style={{ fontSize: 10, color: C.subText, marginBottom: 2 }}>M-Pesa Till No.</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: accentColor }}>{sys.TILL_NO}</div>
                    </div>
                )}
                {(() => {
                    const st = inv.digitax?.submission_status;
                    const qrUrl = inv.digitax?.etims_url || inv.digitax?.offline_url;
                    if (!inv.etr_enabled || !qrUrl || !(st === "Verified" || st === "COMPLETED")) return null;
                    return (
                        <div
                            style={{
                                flex: "1 1 120px",
                                background: bgColor,
                                border: `1px solid ${borderColor}`,
                                borderRadius: 7,
                                padding: "9px 12px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                            }}
                        >
                            <div style={{ fontSize: 10, color: C.subText, marginBottom: 4 }}>Scan to Verify</div>
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrUrl)}`}
                                alt="ETR QR Code"
                                style={{ width: 80, height: 80, display: "block" }}
                            />
                            {inv.digitax?.serial_number && (
                                <div style={{ fontSize: 9, color: C.subText, marginTop: 4, fontFamily: "monospace" }}>
                                    CU: {inv.digitax.serial_number}
                                </div>
                            )}
                        </div>
                    );
                })()}
                <div
                    style={{
                        flex: "1 1 120px",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
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
                                                    background: "#eff6ff",
                                                    color: C.blue,
                                                    border: "1px solid #bfdbfe",
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
                                            {p.created_by?.username || "—"}
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

const Footer = ({ sys, borderColor = C.border, accentColor = C.primary }: { sys: SystemDetails; borderColor?: string; accentColor?: string }) => {
    // Determine which logo to use based on background color
    // Light backgrounds (Ocean: #eff6ff, Forest: #f0fdf4) need dark logo
    // Dark backgrounds (Classic: #6c1c2c, Slate: #1e293b, Minimal: #374151) need light logo
    const isLightBackground = accentColor === '#3b82f6' || accentColor === '#16a34a';
    const logoSrc = isLightBackground ? '/relia2.png' : '/relia.png';

    return (
    <div
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
// TEMPLATE 1 — Classic (Dark Red Header)
// ═══════════════════════════════════════════════════════════════
export const Template1Classic = React.forwardRef<HTMLDivElement, SharedProps>(({ inv, sys, accentColor = "#dc2626" }, ref) => {
    const party = resolveParty(inv);
    const docLabel = inv.status === "Draft" ? "QUOTE" : inv.direction === "supplier" ? "BILL" : "TAX INVOICE";

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
                            fontSize: 12,
                            marginBottom: 6,
                            letterSpacing: 1,
                        }}
                    >
                        {docLabel}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{inv.order_no || inv.invoice_no}</div>
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
                                Till No: <strong>{sys.TILL_NO}</strong>
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

            <style>{`@media print{@page{size:A4 portrait;margin:12mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`}</style>
        </div>
    );
});
Template1Classic.displayName = "Template1Classic";

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 2 — Slate Pro (Dark Navy, Left-Border Accents)
// ═══════════════════════════════════════════════════════════════
export const Template2SlatePro = React.forwardRef<HTMLDivElement, SharedProps>(({ inv, sys }, ref) => {
    const party = resolveParty(inv);
    const navy = "#1e293b";
    const docLabel = inv.status === "Draft" ? "QUOTE" : inv.direction === "supplier" ? "BILL" : "INVOICE";

    return (
        <div
            ref={ref}
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
                    <div style={{ fontSize: 28, fontWeight: 700, color: navy, letterSpacing: "-0.5px" }}>{docLabel}</div>
                    <div style={{ fontSize: 12, color: C.subText, marginTop: 2 }}>{inv.order_no || inv.invoice_no}</div>
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
                    {inv.served_by && (
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

            <style>{`@media print{@page{size:A4 portrait;margin:12mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`}</style>
        </div>
    );
});
Template2SlatePro.displayName = "Template2SlatePro";

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 3 — Ocean (Blue Gradient, Info Chips)
// ═══════════════════════════════════════════════════════════════
export const Template3Ocean = React.forwardRef<HTMLDivElement, SharedProps>(({ inv, sys }, ref) => {
    const party = resolveParty(inv);
    const docLabel = inv.status === "Draft" ? "QUOTE" : inv.direction === "supplier" ? "BILL" : "TAX INVOICE";

    return (
        <div
            ref={ref}
            style={{ fontFamily: "'Segoe UI', Roboto, sans-serif", color: C.darkText, background: "#fff", padding: 0, width: "100%", maxWidth: 730, boxSizing: "border-box" as const }}
        >
            {/* Gradient header */}
            <div
                style={{
                    background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
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
                    <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.3, letterSpacing: 2 }}>{docLabel}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: -4 }}>{inv.order_no || inv.invoice_no}</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>{fmtDateShort(inv.issue_date || inv.createdAt)}</div>
                </div>
            </div>

            <div style={{ padding: "22px 32px" }}>
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
                        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", minWidth: 110 }}>
                            <div style={{ fontSize: 10, color: C.subText, marginBottom: 2 }}>Invoice Date</div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: C.blue }}>{fmtDateShort(inv.issue_date || inv.createdAt)}</div>
                        </div>
                        {inv.due_date && (
                            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", minWidth: 110 }}>
                                <div style={{ fontSize: 10, color: C.subText, marginBottom: 2 }}>Due Date</div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: C.red }}>{fmtDateShort(inv.due_date)}</div>
                            </div>
                        )}
                                            </div>
                </div>

                <ItemsTable inv={inv} />
                <TotalsBlock inv={inv} accentColor={C.blue} />
                <PaymentDetailsBlock inv={inv} sys={sys} bgColor="#eff6ff" borderColor="#bfdbfe" accentColor={C.blue} />
                <BankDetailsBlock sys={sys} bgColor="#eff6ff" borderColor="#bfdbfe" accentColor={C.blue} />
                <Footer sys={sys} borderColor="#bfdbfe" accentColor={C.blue} />
            </div>

            <style>{`@media print{@page{size:A4 portrait;margin:12mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`}</style>
        </div>
    );
});
Template3Ocean.displayName = "Template3Ocean";

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 4 — Minimal / Editorial (Serif, Clean Rules)
// ═══════════════════════════════════════════════════════════════
export const Template4Minimal = React.forwardRef<HTMLDivElement, SharedProps>(({ inv, sys }, ref) => {
    const party = resolveParty(inv);
    const charcoal = "#374151";
    const docLabel = inv.status === "Draft" ? "Quote" : inv.direction === "supplier" ? "Bill" : "Invoice";

    return (
        <div
            ref={ref}
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
                    <div style={{ fontSize: 11, color: C.subText, fontStyle: "italic", fontFamily: "'Segoe UI', sans-serif" }}>
                        Tax {docLabel}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: charcoal }}>{inv.order_no || inv.invoice_no}</div>
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
                            color: "#94a3b8",
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
                            color: "#94a3b8",
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

            <style>{`@media print{@page{size:A4 portrait;margin:14mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`}</style>
        </div>
    );
});
Template4Minimal.displayName = "Template4Minimal";

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 5 — Forest (Deep Green, Tinted Cards)
// ═══════════════════════════════════════════════════════════════
export const Template5Forest = React.forwardRef<HTMLDivElement, SharedProps>(({ inv, sys }, ref) => {
    const party = resolveParty(inv);
    const forest = "#065f46";
    const docLabel = inv.status === "Draft" ? "QUOTE" : inv.direction === "supplier" ? "BILL" : "TAX INVOICE";

    return (
        <div
            ref={ref}
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
                    <div style={{ fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase" as const, opacity: 0.7, marginBottom: 4 }}>
                        {docLabel}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{inv.order_no || inv.invoice_no}</div>
                    <div style={{ fontSize: 11, opacity: 0.75, marginTop: 3 }}>
                        {fmtDateShort(inv.issue_date || inv.createdAt)}
                    </div>
                </div>
            </div>

            <div style={{ padding: "22px 28px" }}>
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
                            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px" }}>
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

            <style>{`@media print{@page{size:A4 portrait;margin:12mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`}</style>
        </div>
    );
});
Template5Forest.displayName = "Template5Forest";

// ── Template meta ──────────────────────────────────────────────────────────
export const TEMPLATES = [
    {
        id: 4,
        name: "Minimal",
        description: "Serif editorial, clean double-rule",
        component: Template4Minimal,
        thumbBg: "#f1f5f9",
        thumbAccent: "#374151",
    },
    {
        id: 1,
        name: "Classic",
        description: "Dark red header, bold & professional",
        component: Template1Classic,
        thumbBg: "#dc2626", // Will be dynamically overridden by primary color
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
        description: "Blue gradient header, info chip layout",
        component: Template3Ocean,
        thumbBg: "#1d4ed8",
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
        name: "Custom",
        description: "Your custom color scheme",
        component: Template1Classic, // Uses Classic template with custom accent color
        thumbBg: "#6366f1", // Will be dynamically overridden by invoice color
        thumbAccent: "#fff",
    },
] as const;

export type TemplateId = 1 | 2 | 3 | 4 | 5 | 6;