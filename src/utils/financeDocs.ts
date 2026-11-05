/**
 * Accounting documents → branded PDFs (sales receipts, supplier bills,
 * expense vouchers). Each maps its record onto the shared layout in
 * financeDocPdf; the look comes from the chosen export template.
 */
import dayjs from "dayjs";
import type { SalesReceipt } from "@services/accounting/salesReceipts";
import type { Bill } from "@services/accounting/bill";
import type { Expense } from "@services/accounting/expense";
import type { ExportTemplateId } from "./exportTemplates";
import { renderFinanceDocPdf, docMoney as money, docPct as pct, type DocBusiness, type DocTone } from "./financeDocPdf";

export type { DocBusiness } from "./financeDocPdf";

const PAYMENT_LABEL: Record<string, string> = {
    Cash: "Cash", "M-Pesa": "M-Pesa", Mpesa: "M-Pesa", Card: "Card", Bank_Transfer: "Bank Transfer",
    Bank: "Bank", Cheque: "Cheque", Other: "Other",
};
const payLabel = (m?: string) => (m ? PAYMENT_LABEL[m] || m.replace(/_/g, " ") : "");
const day = (d?: string) => (d ? dayjs(d).format("DD MMM YYYY") : "");
const nameOf = (v: any, key = "name") => (v && typeof v === "object" ? v[key] : undefined);

/**
 * Address as one line. Supplier/customer addresses are stored as objects
 * ({ street, city, county, country, … }) — or occasionally a plain string.
 * A lone default country ("Kenya") isn't worth printing.
 */
const formatAddress = (a: unknown): string => {
    if (!a) return "";
    if (typeof a === "string") return a.trim();
    if (typeof a !== "object") return "";
    const o = a as Record<string, unknown>;
    const parts = [o.street, o.address, o.building, o.area, o.city, o.town, o.county, o.postal_code]
        .filter((v): v is string => typeof v === "string" && !!v.trim())
        .map((v) => v.trim());
    if (!parts.length) return "";
    if (typeof o.country === "string" && o.country.trim()) parts.push(o.country.trim());
    return [...new Set(parts)].join(", ");
};

// ── Sales receipt ────────────────────────────────────────────────────────────
export const downloadReceiptPdf = (r: SalesReceipt, biz: DocBusiness, template?: ExportTemplateId) => {
    const x: any = r;
    const voided = r.status === "Voided";
    const lines = r.lines || [];
    const hasDiscount = lines.some((l) => (l.discount || 0) > 0);
    return renderFinanceDocPdf({
        title: "RECEIPT",
        number: r.receipt_no,
        date: day(r.receipt_date),
        status: voided ? { label: "VOID", tone: "bad" } : r.status === "Posted" ? { label: "PAID", tone: "good" } : { label: "PENDING", tone: "warn" },
        blocks: [
            { title: "Received from", lines: [r.customer_id?.customer_name || r.customer_name || "Walk-in customer", r.customer_id?.phone, r.customer_id?.email] },
            {
                title: "Payment", lines: [
                    payLabel(r.payment_method),
                    r.payment_reference && `Ref: ${r.payment_reference}`,
                    r.invoice_id?.order_no && `For invoice ${r.invoice_id.order_no}`,
                ],
            },
        ],
        columns: [
            { header: "Item" },
            { header: "Qty", align: "right", width: 12 },
            { header: "Price", align: "right", width: 24 },
            ...(hasDiscount ? [{ header: "Disc.", align: "right" as const, width: 20 }] : []),
            { header: "Amount", align: "right", width: 26 },
        ],
        rows: lines.map((l) => [
            l.description, String(l.quantity), money(l.unit_price),
            ...(hasDiscount ? [l.discount ? `-${money(l.discount)}` : "-"] : []),
            money(l.line_total),
        ]),
        totals: [
            { label: "Subtotal", value: money(r.subtotal) },
            ...((r.total_discount || 0) > 0 ? [{ label: "Discounts", value: `-${money(r.total_discount)}` }] : []),
            ...((r.total_vat || 0) > 0 ? [{ label: `VAT ${pct(r.vat_standard_rate)}${r.vat_pricing_mode === "INCLUSIVE" ? " (incl.)" : ""}`, value: money(r.total_vat) }] : []),
            ...((r.catering_levy_amount || 0) > 0 ? [{ label: `Catering Levy ${pct(r.catering_levy_rate)}`, value: money(r.catering_levy_amount) }] : []),
        ],
        grand: { label: "TOTAL (KES)", value: money(r.grand_total) },
        notes: r.notes,
        alert: voided && x.void_reason ? `Voided${x.voided_at ? ` on ${day(x.voided_at)}` : ""}: ${x.void_reason}` : undefined,
        watermark: voided ? "VOID" : undefined,
        thanks: "Thank you for your business!",
        showPaymentInfo: true,
        filename: `Receipt-${r.receipt_no}.pdf`,
    }, biz, template);
};

// ── Invoice payment receipt ──────────────────────────────────────────────────
export interface InvoicePaymentReceiptInput {
    receiptNo: string;
    invoiceNo: string;
    invoiceDate?: string;
    invoiceTotal: number;
    /** Paid towards the invoice so far (all payments), and what is still owed */
    paidToDate: number;
    balanceDue: number;
    party: { name: string; phone?: string; email?: string; kra_pin?: string };
    /** The payment(s) this receipt is for — one, or all of the invoice's payments */
    payments: { date?: string; method?: string; reference?: string; amount: number }[];
    currency?: string;
}

export const downloadInvoicePaymentReceiptPdf = (p: InvoicePaymentReceiptInput, biz: DocBusiness, template?: ExportTemplateId) => {
    const cur = p.currency || "KES";
    const received = p.payments.reduce((s, x) => s + (x.amount || 0), 0);
    const settled = p.balanceDue <= 0.009;
    const latest = p.payments.map((x) => x.date).filter(Boolean).sort().pop();
    return renderFinanceDocPdf({
        title: "PAYMENT RECEIPT",
        number: p.receiptNo,
        date: day(latest) || dayjs().format("DD MMM YYYY"),
        meta: [`For invoice ${p.invoiceNo}`],
        status: settled ? { label: "PAID IN FULL", tone: "good" } : { label: "PART PAYMENT", tone: "warn" },
        blocks: [
            { title: "Received from", lines: [p.party.name || "Customer", p.party.phone, p.party.email, p.party.kra_pin && `KRA PIN: ${p.party.kra_pin}`] },
            { title: "Invoice", lines: [p.invoiceNo, `Invoice total ${cur} ${money(p.invoiceTotal)}`, p.invoiceDate && `Dated ${day(p.invoiceDate)}`] },
        ],
        columns: [
            { header: "Date", width: 30 },
            { header: "Method", width: 30 },
            { header: "Reference" },
            { header: "Amount", align: "right", width: 28 },
        ],
        rows: p.payments.map((x) => [
            x.date ? dayjs(x.date).format("DD MMM YYYY") : "-",
            x.method || "-",
            x.reference || "-",
            money(x.amount),
        ]),
        totals: [],
        grand: { label: `RECEIVED (${cur})`, value: money(received) },
        after: [
            { label: "Invoice total", value: money(p.invoiceTotal) },
            { label: "Paid to date", value: money(p.paidToDate) },
            { label: "Balance due", value: money(Math.max(0, p.balanceDue)), tone: settled ? "good" : "bad" },
        ],
        thanks: "Thank you for your payment!",
        showPaymentInfo: true,
        filename: `${p.receiptNo}.pdf`,
    }, biz, template);
};

// ── Supplier bill ────────────────────────────────────────────────────────────
const BILL_STATUS: Record<string, { label: string; tone: DocTone }> = {
    Draft: { label: "DRAFT", tone: "neutral" },
    Pending: { label: "UNPAID", tone: "warn" },
    Partially_Paid: { label: "PART PAID", tone: "warn" },
    Paid: { label: "PAID", tone: "good" },
    Overdue: { label: "OVERDUE", tone: "bad" },
    Voided: { label: "VOID", tone: "bad" },
    Cancelled: { label: "CANCELLED", tone: "bad" },
};

export const downloadBillPdf = (
    b: Bill, biz: DocBusiness, template?: ExportTemplateId,
    supplier?: { name?: string; phone?: string; email?: string; kra_pin?: string; address?: unknown } | null,
) => {
    const sup: any = supplier || (typeof b.supplier_id === "object" ? b.supplier_id : {}) || {};
    const cur = b.currency || "KES";
    const dead = b.status === "Voided" || b.status === "Cancelled";
    const lines = b.bill_lines || [];
    const hasVat = (b.total_vat_amount || 0) > 0;
    const daysToDue = b.due_date ? dayjs(b.due_date).startOf("day").diff(dayjs().startOf("day"), "day") : null;
    return renderFinanceDocPdf({
        title: "BILL",
        number: b.bill_no,
        date: `Bill date ${day(b.bill_date)}`,
        meta: [b.due_date ? `Due ${day(b.due_date)}` : "", b.supplier_ref ? `Supplier ref ${b.supplier_ref}` : ""].filter(Boolean),
        status: BILL_STATUS[b.status] || { label: String(b.status).toUpperCase(), tone: "neutral" },
        blocks: [
            {
                title: "Supplier", lines: [
                    sup.name || b.supplier_name || "Supplier", sup.phone, sup.email, formatAddress(sup.address),
                    (sup.kra_pin || b.supplier_kra_pin) && `KRA PIN: ${sup.kra_pin || b.supplier_kra_pin}`,
                ],
            },
            {
                title: "Payment", lines: [
                    b.amount_due > 0 ? `${cur} ${money(b.amount_due)} due` : "Settled in full",
                    b.due_date && b.amount_due > 0 && !dead
                        ? daysToDue! < 0 ? `${Math.abs(daysToDue!)} day${daysToDue === -1 ? "" : "s"} overdue` : daysToDue === 0 ? "Due today" : `Due in ${daysToDue} day${daysToDue === 1 ? "" : "s"}`
                        : "",
                    b.paid_date ? `Paid ${day(b.paid_date)}` : "",
                ],
            },
        ],
        columns: [
            { header: "Description" },
            { header: "Qty", align: "right", width: 12 },
            { header: "Unit price", align: "right", width: 24 },
            ...(hasVat ? [{ header: "VAT", align: "right" as const, width: 20 }] : []),
            // line amounts are before VAT — they add up to the subtotal
            { header: hasVat ? "Net" : "Amount", align: "right", width: 26 },
        ],
        rows: lines.map((l) => [
            l.description || nameOf(l.product_id) || nameOf(l.account_id, "account_name") || "-",
            String(l.quantity ?? 1), money(l.unit_price),
            ...(hasVat ? [l.vat_amount ? money(l.vat_amount) : "-"] : []),
            money(l.amount),
        ]),
        totals: [
            { label: "Subtotal", value: money(b.subtotal) },
            ...((b.discount_amount || 0) > 0 ? [{ label: "Discount", value: `-${money(b.discount_amount)}` }] : []),
            ...(hasVat ? [{ label: `VAT ${pct(b.vat_standard_rate)}${b.vat_pricing_mode === "INCLUSIVE" ? " (incl.)" : ""}`, value: money(b.total_vat_amount) }] : []),
            ...(b.notes_adjustment ? [{ label: "Debit/credit notes", value: money(b.notes_adjustment) }] : []),
        ],
        grand: { label: `TOTAL (${cur})`, value: money(b.grand_total) },
        after: dead ? [] : [
            { label: "Amount paid", value: money(b.amount_paid) },
            { label: "Balance due", value: money(b.amount_due), tone: b.amount_due > 0 ? "bad" : "good" },
        ],
        notes: [b.notes, b.terms && `Terms: ${b.terms}`].filter(Boolean).join("\n") || undefined,
        watermark: dead ? "VOID" : undefined,
        filename: `Bill-${b.bill_no}.pdf`,
    }, biz, template);
};

// ── Expense voucher ──────────────────────────────────────────────────────────
const EXPENSE_STATUS: Record<string, { label: string; tone: DocTone }> = {
    Draft: { label: "DRAFT", tone: "neutral" },
    Pending: { label: "PENDING APPROVAL", tone: "warn" },
    Approved: { label: "APPROVED", tone: "good" },
    Voided: { label: "VOID", tone: "bad" },
};

export const downloadExpensePdf = (e: Expense, biz: DocBusiness, template?: ExportTemplateId) => {
    const x: any = e;
    const cur = e.currency || "KES";
    const voided = e.status === "Voided";
    const sup: any = typeof e.supplier_id === "object" ? e.supplier_id : null;
    const cust: any = typeof e.customer_id === "object" ? e.customer_id : null;
    const lines = e.expense_lines || [];
    const hasVat = (e.total_vat_amount || 0) > 0;
    const acct = (a: any) => (a && typeof a === "object" ? `${a.account_code ? `${a.account_code} ` : ""}${a.account_name || ""}`.trim() : "");
    const person = (u: any) => (u && typeof u === "object" ? u.name || u.username : "");
    return renderFinanceDocPdf({
        title: "EXPENSE",
        number: e.expense_no,
        date: day(e.expense_date),
        meta: [e.reference ? `Ref ${e.reference}` : "", e.receipt_no ? `Supplier receipt ${e.receipt_no}` : ""].filter(Boolean),
        status: EXPENSE_STATUS[e.status] || { label: String(e.status).toUpperCase(), tone: "neutral" },
        blocks: [
            { title: "Paid to", lines: [sup?.name || e.payee_name || cust?.customer_name || "—", sup?.phone || cust?.phone, sup?.email || cust?.email] },
            { title: "Payment", lines: [payLabel(e.payment_method), acct(e.payment_account_id) && `From ${acct(e.payment_account_id)}`, e.paid_date && `Paid ${day(e.paid_date)}`] },
        ],
        columns: [
            { header: "Description" },
            { header: "Account", width: 36 },
            ...(hasVat ? [{ header: "VAT", align: "right" as const, width: 20 }] : []),
            // line amounts are before VAT — they add up to the Net total
            { header: hasVat ? "Net" : "Amount", align: "right", width: 26 },
        ],
        rows: lines.map((l) => [
            l.description || nameOf(l.account_id, "account_name") || "-",
            acct(l.account_id) || "-",
            ...(hasVat ? [l.vat_amount ? money(l.vat_amount) : "-"] : []),
            money(l.amount),
        ]),
        totals: [
            { label: "Net", value: money(e.subtotal) },
            ...(hasVat ? [{ label: "VAT", value: money(e.total_vat_amount) }] : []),
        ],
        grand: { label: `TOTAL PAID (${cur})`, value: money(e.grand_total) },
        after: [
            ...(person(e.created_by) ? [{ label: "Prepared by", value: person(e.created_by) }] : []),
            ...(person(e.approved_by) ? [{ label: "Approved by", value: `${person(e.approved_by)}${e.approved_at ? `, ${day(e.approved_at)}` : ""}` }] : []),
        ],
        notes: e.notes,
        alert: voided && x.void_reason ? `Voided: ${x.void_reason}` : undefined,
        watermark: voided ? "VOID" : undefined,
        filename: `Expense-${e.expense_no}.pdf`,
    }, biz, template);
};
