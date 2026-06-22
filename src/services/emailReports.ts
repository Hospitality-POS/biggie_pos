import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const EMAIL_URL = `${BASE_URL}/email-reports/send`;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CcRecipient {
    email: string;
    name?: string;
}

export interface EmailAttachment {
    filename: string;
    content: string;      // base64-encoded
    contentType: string;  // e.g. "application/pdf"
}

export interface SummaryCard {
    label: string;
    value: string;
    color?: string;
}

export interface DateRange {
    from?: string;
    to?: string;
}

export interface DetailsTableRow {
    label: string;
    value: string;
}

export interface DetailsTable {
    rows: DetailsTableRow[];
    /** Label whose value renders as a coloured status pill */
    statusField?: string;
}

/**
 * The single payload accepted by POST /email-reports/send.
 *
 * Body sections are rendered top-to-bottom:
 *   greeting → intro → summary → dateRange → htmlTable →
 *   detailsTable → alertBox → outro
 */
export interface SendEmailParams {
    // routing
    to: string | string[] | CcRecipient[];
    cc?: string | CcRecipient[];
    attachments?: EmailAttachment[];

    // subject / preview
    subject: string;
    preheader?: string;

    // banner
    bannerLabel?: string;
    bannerColor?: string;
    bannerType?: "Sales" | "Purchase" | "Delivery" | "Inventory" | "Attendance" | "Leave" | "Financial" | "Report";

    // greeting
    recipientName?: string;

    // body sections
    intro?: string;
    summary?: SummaryCard[];
    dateRange?: DateRange;
    htmlTable?: string;
    detailsTable?: DetailsTable;
    alertBox?: string;
    alertColor?: string;
    outro?: string;
}

// ── Utility ────────────────────────────────────────────────────────────────────

/**
 * Capture a React ref's current DOM node as an HTML string for use as htmlTable.
 */
export function refToHtmlString(ref: React.RefObject<HTMLElement>): string {
    return ref.current?.outerHTML ?? "";
}

// ── Core send ──────────────────────────────────────────────────────────────────

/**
 * Post to the single /email-reports/send endpoint.
 * All content is built on the frontend — nothing is inferred on the server.
 */
export const sendEmail = async (
    params: SendEmailParams,
    successMsg = "Email sent successfully",
): Promise<boolean> => {
    try {
        await axiosInstance.post(EMAIL_URL, params);
        // message.success(successMsg);
        return true;
    } catch (error: any) {
        message.error(
            error?.response?.data?.message ||
            error?.message ||
            "Failed to send email"
        );
        return false;
    }
};

// ── Typed convenience helpers ──────────────────────────────────────────────────
// Each one builds the full payload and delegates to sendEmail().
// Call-sites stay clean; the server receives exactly what it needs.

// ── Item Sales Report ──────────────────────────────────────────────────────────

export const sendSalesReportEmail = async (opts: {
    to: string;
    recipientName?: string;
    totals: { overallTotal: number; stockCost: number; grossProfit: number; commission?: number };
    dateRange?: DateRange;
    htmlTable?: string;
    intro?: string;
    cc?: string | CcRecipient[];
    attachments?: EmailAttachment[];
}): Promise<boolean> => {
    const { to, recipientName, totals, dateRange, htmlTable, intro, cc, attachments } = opts;
    const f = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return sendEmail({
        to, recipientName, dateRange, htmlTable, intro, cc, attachments,
        subject: "Item Sales Report",
        bannerLabel: "📊 Item Sales Report",
        bannerType: "Sales",
        summary: [
            { label: "Total Sales", value: `KES ${f(totals.overallTotal)}`, color: "#6c1c2c" },
            { label: "Stock Cost", value: `KES ${f(totals.stockCost)}`, color: "#3b82f6" },
            { label: "Gross Profit", value: `KES ${f(totals.grossProfit)}`, color: "#10b981" },
            ...(totals.commission && totals.commission > 0
                ? [{ label: "Commission", value: `KES ${f(totals.commission)}`, color: "#f59e0b" }]
                : []),
        ],
        outro: "This report was generated automatically. Please do not reply to this email.",
    }, "Sales report email sent successfully");
};

// ── Purchase Report ────────────────────────────────────────────────────────────

export const sendPurchaseReportEmail = async (opts: {
    to: string;
    recipientName?: string;
    totals: { overallTotal: number; totalDiscount: number; totalInclusiveDiscount: number };
    dateRange?: DateRange;
    htmlTable?: string;
    intro?: string;
    cc?: string | CcRecipient[];
    attachments?: EmailAttachment[];
}): Promise<boolean> => {
    const { to, recipientName, totals, dateRange, htmlTable, intro, cc, attachments } = opts;
    const f = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return sendEmail({
        to, recipientName, dateRange, htmlTable, intro, cc, attachments,
        subject: "Purchase Report",
        bannerLabel: "📊 Purchase Report",
        bannerType: "Purchase",
        summary: [
            { label: "Total Sales", value: `KES ${f(totals.overallTotal)}`, color: "#6c1c2c" },
            { label: "Total Discount", value: `KES ${f(totals.totalDiscount)}`, color: "#f59e0b" },
            { label: "Inclusive Discount", value: `KES ${f(totals.totalInclusiveDiscount)}`, color: "#ef4444" },
        ],
    }, "Purchase report email sent successfully");
};

// ── Purchase Order ─────────────────────────────────────────────────────────────

export const sendPurchaseOrderEmail = async (opts: {
    to: string;
    recipientName?: string;
    poMeta: {
        poNumber?: string;
        supplierName?: string;
        totalAmount: number;
        deliveryPercentage?: number;
        isBulk?: boolean;
        count?: number;
    };
    htmlTable?: string;
    intro?: string;
    cc?: string | CcRecipient[];
    attachments?: EmailAttachment[];
}): Promise<boolean> => {
    const { to, recipientName, poMeta, htmlTable, intro, cc, attachments } = opts;
    const f = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const title = poMeta.isBulk ? "Bulk Purchase Order Report" : `Purchase Order ${poMeta.poNumber ?? ""}`.trim();

    return sendEmail({
        to, recipientName, htmlTable, intro, cc, attachments,
        subject: title,
        bannerLabel: `📦 ${title}`,
        bannerType: "Purchase",
        summary: poMeta.isBulk
            ? [
                { label: "Total Orders", value: String(poMeta.count ?? 0), color: "#7C3AED" },
                { label: "Total Amount", value: `KES ${f(poMeta.totalAmount)}`, color: "#6c1c2c" },
            ]
            : [
                { label: "PO Number", value: poMeta.poNumber ?? "—", color: "#7C3AED" },
                { label: "Supplier", value: poMeta.supplierName ?? "—", color: "#374151" },
                { label: "Total", value: `KES ${f(poMeta.totalAmount)}`, color: "#6c1c2c" },
                { label: "Progress", value: `${poMeta.deliveryPercentage ?? 0}%`, color: "#0369A1" },
            ],
    }, "Purchase order email sent successfully");
};

// ── Delivery Note ──────────────────────────────────────────────────────────────

export const sendDeliveryNoteEmail = async (opts: {
    to: string;
    recipientName?: string;
    noteMeta: { noteNumber?: string; supplierName?: string; totalItems?: number; deliveredItems?: number; pendingItems?: number };
    htmlTable?: string;
    intro?: string;
    cc?: string | CcRecipient[];
    attachments?: EmailAttachment[];
}): Promise<boolean> => {
    const { to, recipientName, noteMeta, htmlTable, intro, cc, attachments } = opts;
    const title = `Delivery Note ${noteMeta.noteNumber ?? ""}`.trim();

    return sendEmail({
        to, recipientName, htmlTable, intro, cc, attachments,
        subject: title,
        bannerLabel: `🚚 ${title}`,
        bannerType: "Delivery",
        summary: [
            { label: "Note #", value: noteMeta.noteNumber ?? "—", color: "#0369A1" },
            { label: "Supplier", value: noteMeta.supplierName ?? "—", color: "#374151" },
            { label: "Total Items", value: String(noteMeta.totalItems ?? 0), color: "#6c1c2c" },
            { label: "Delivered", value: String(noteMeta.deliveredItems ?? 0), color: "#10b981" },
            { label: "Pending", value: String(noteMeta.pendingItems ?? 0), color: "#ef4444" },
        ],
    }, "Delivery note email sent successfully");
};

// ── Inventory Report ───────────────────────────────────────────────────────────

export const sendInventoryReportEmail = async (opts: {
    to: string;
    recipientName?: string;
    totals: { totalSkus: number; totalValue: number; lowStock: number; outOfStock: number };
    dateRange?: DateRange;
    htmlTable?: string;
    intro?: string;
    cc?: string | CcRecipient[];
    attachments?: EmailAttachment[];
}): Promise<boolean> => {
    const { to, recipientName, totals, dateRange, htmlTable, intro, cc, attachments } = opts;
    const f = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return sendEmail({
        to, recipientName, dateRange, htmlTable, intro, cc, attachments,
        subject: "Inventory Report",
        bannerLabel: "📦 Inventory Report",
        bannerType: "Inventory",
        summary: [
            { label: "Total SKUs", value: String(totals.totalSkus), color: "#065F46" },
            { label: "Total Value", value: `KES ${f(totals.totalValue)}`, color: "#6c1c2c" },
            { label: "Low Stock", value: String(totals.lowStock), color: "#ef4444" },
            { label: "Out of Stock", value: String(totals.outOfStock), color: "#DC2626" },
        ],
    }, "Inventory report email sent successfully");
};

// ── Financial Report ───────────────────────────────────────────────────────────

export const sendFinancialReportEmail = async (opts: {
    to: string;
    recipientName?: string;
    totals: { revenue: number; expenses: number; netProfit: number };
    dateRange?: DateRange;
    htmlTable?: string;
    intro?: string;
    cc?: string | CcRecipient[];
    attachments?: EmailAttachment[];
}): Promise<boolean> => {
    const { to, recipientName, totals, dateRange, htmlTable, intro, cc, attachments } = opts;
    const f = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return sendEmail({
        to, recipientName, dateRange, htmlTable, intro, cc, attachments,
        subject: "Financial Report",
        bannerLabel: "💰 Financial Report",
        bannerType: "Financial",
        summary: [
            { label: "Revenue", value: `KES ${f(totals.revenue)}`, color: "#065F46" },
            { label: "Expenses", value: `KES ${f(totals.expenses)}`, color: "#ef4444" },
            { label: "Net Profit", value: `KES ${f(totals.netProfit)}`, color: "#6c1c2c" },
        ],
    }, "Financial report email sent successfully");
};

// ── Attendance Report ──────────────────────────────────────────────────────────

export const sendAttendanceReportEmail = async (opts: {
    to: string;
    recipientName?: string;
    report: {
        fullname: string;
        present_days: number;
        late_days: number;
        absent_days: number;
        leave_days: number;
        total_hours: number;
        attendance_rate: number;
    }[];
    dateRange?: DateRange;
    intro?: string;
    cc?: string | CcRecipient[];
    attachments?: EmailAttachment[];
}): Promise<boolean> => {
    const { to, recipientName, report, dateRange, intro, cc, attachments } = opts;
    const f = (n: number, d = 1) => Number(n ?? 0).toFixed(d);

    const rows = report.map((r, i) => `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#F9FAFB"}">
            <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;font-weight:500">${r.fullname || "—"}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;text-align:center">${r.present_days}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;text-align:center;color:#D97706">${r.late_days}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;text-align:center;color:#DC2626">${r.absent_days}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;text-align:center;color:#7C3AED">${r.leave_days}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;text-align:center">${f(r.total_hours)}h</td>
            <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;text-align:center">${f(r.attendance_rate)}%</td>
        </tr>`).join("");

    const htmlTable = `
        <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
                <tr style="background:#1D4ED8;color:#ffffff">
                    <th style="padding:10px 12px;text-align:left;font-weight:600">Staff</th>
                    <th style="padding:10px 12px;text-align:center;font-weight:600">Present</th>
                    <th style="padding:10px 12px;text-align:center;font-weight:600">Late</th>
                    <th style="padding:10px 12px;text-align:center;font-weight:600">Absent</th>
                    <th style="padding:10px 12px;text-align:center;font-weight:600">On Leave</th>
                    <th style="padding:10px 12px;text-align:center;font-weight:600">Hours</th>
                    <th style="padding:10px 12px;text-align:center;font-weight:600">Rate</th>
                </tr>
            </thead>
            <tbody>
                ${rows || `<tr><td colspan="7" style="text-align:center;padding:20px;color:#9CA3AF">No data for this period</td></tr>`}
            </tbody>
        </table>`;

    return sendEmail({
        to, recipientName, dateRange, htmlTable, intro, cc, attachments,
        subject: "Attendance Report",
        bannerLabel: "📋 Attendance Report",
        bannerType: "Attendance",
    }, "Attendance report email sent successfully");
};

// ── Leave emails ───────────────────────────────────────────────────────────────

interface LeavePayload {
    leave_type: string;
    start_date: string;
    end_date: string;
    days_requested: number;
    reason?: string;
    status: string;
    approved_by?: { fullname: string };
    approved_at?: string;
    rejection_reason?: string;
}

function buildLeaveRows(leave: LeavePayload): DetailsTableRow[] {
    return [
        { label: "Leave Type", value: leave.leave_type },
        { label: "From", value: leave.start_date },
        { label: "To", value: leave.end_date },
        { label: "Days", value: `${leave.days_requested} working day(s)` },
        ...(leave.reason ? [{ label: "Reason", value: leave.reason }] : []),
        { label: "Status", value: leave.status },
    ];
}

/** Leave application confirmation → staff */
export const sendLeaveApplicationEmail = async (opts: {
    to: string; staffName: string; leave: LeavePayload; cc?: string | CcRecipient[];
}): Promise<boolean> =>
    sendEmail({
        to: opts.to, recipientName: opts.staffName, cc: opts.cc,
        subject: "Leave Request Submitted",
        bannerLabel: "📝 Leave Request Submitted",
        bannerColor: "#2563EB",
        intro: `Your <strong>${opts.leave.leave_type} Leave</strong> request has been received and is currently <strong>pending approval</strong>.`,
        detailsTable: { rows: buildLeaveRows(opts.leave), statusField: "Status" },
        outro: "You will receive another email once your request has been reviewed. If you have questions, please contact HR directly.",
    }, "Leave confirmation email sent");

/** Leave notification → HR / admin */
export const sendLeaveHrNotificationEmail = async (opts: {
    to: string; adminName: string; staffName: string; leave: LeavePayload; cc?: string | CcRecipient[];
}): Promise<boolean> =>
    sendEmail({
        to: opts.to, recipientName: opts.adminName, cc: opts.cc,
        subject: `New Leave Request from ${opts.staffName}`,
        bannerLabel: "🔔 New Leave Request",
        bannerColor: "#7C3AED",
        intro: `<strong>${opts.staffName}</strong> has submitted a <strong>${opts.leave.leave_type} Leave</strong> request that requires your review.`,
        detailsTable: { rows: buildLeaveRows(opts.leave), statusField: "Status" },
        outro: "Please log in to the HR portal to approve or reject this request.",
    }, "HR notification email sent");

/** Leave approval → staff */
export const sendLeaveApprovalEmail = async (opts: {
    to: string; staffName: string; leave: LeavePayload; cc?: string | CcRecipient[];
}): Promise<boolean> => {
    const approvedBy = opts.leave.approved_by?.fullname ?? "HR Manager";
    const approvedDate = opts.leave.approved_at
        ? new Date(opts.leave.approved_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "";
    return sendEmail({
        to: opts.to, recipientName: opts.staffName, cc: opts.cc,
        subject: `Leave Approved – ${opts.leave.start_date} to ${opts.leave.end_date}`,
        bannerLabel: "✓  Leave Approved",
        bannerColor: "#059669",
        intro: `Great news — your <strong>${opts.leave.leave_type} Leave</strong> request has been <span style="color:#065F46;font-weight:600">approved</span>.`,
        detailsTable: { rows: buildLeaveRows(opts.leave), statusField: "Status" },
        alertBox: `<strong>Approved by:</strong> ${approvedBy}${approvedDate ? `<br><strong>Approved on:</strong> ${approvedDate}` : ""}`,
        alertColor: "#059669",
        outro: "Please ensure you have arranged handover of your duties before your leave begins. Enjoy your time off!",
    }, "Leave approval email sent");
};

/** Leave rejection → staff */
export const sendLeaveRejectionEmail = async (opts: {
    to: string; staffName: string; leave: LeavePayload; cc?: string | CcRecipient[];
}): Promise<boolean> =>
    sendEmail({
        to: opts.to, recipientName: opts.staffName, cc: opts.cc,
        subject: "Leave Request Not Approved",
        bannerLabel: "✕  Leave Not Approved",
        bannerColor: "#DC2626",
        intro: `Unfortunately your <strong>${opts.leave.leave_type} Leave</strong> request has been <span style="color:#991B1B;font-weight:600">rejected</span>.`,
        detailsTable: { rows: buildLeaveRows(opts.leave), statusField: "Status" },
        ...(opts.leave.rejection_reason
            ? { alertBox: `<strong>Reason:</strong> ${opts.leave.rejection_reason}`, alertColor: "#DC2626" }
            : {}),
        outro: "If you believe this decision is incorrect, please speak with your HR manager directly.",
    }, "Leave rejection email sent");