import { BASE_URL } from "@utils/config";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

// ── Section 1: Overview ──────────────────────────────────────────────────────

export interface OverviewMetric {
    amount: number;
    vs_prev_year: number | null; // % change vs same month last year, null if no prior data
}

export interface OverviewNetProfit extends OverviewMetric {
    is_profit: boolean;
}

export interface DashboardOverview {
    revenue: OverviewMetric;
    expenses: OverviewMetric;
    net_profit: OverviewNetProfit;
    total_assets: number;
    profit_margin: number; // percentage
}

// ── Section 2: Journal Summary ───────────────────────────────────────────────

export interface JournalStatusBucket {
    count: number;
    total: number;
}

export interface DashboardJournalSummary {
    by_status: Record<string, JournalStatusBucket>; // Draft | Posted | Voided
    by_source: Record<string, JournalStatusBucket>; // manual | pos_sale | invoice | etc.
    total_entries: number;
    draft_count: number;
    posted_count: number;
    voided_count: number;
}

// ── Section 3: P&L Trend ─────────────────────────────────────────────────────

export interface PLTrendMonth {
    label: string;  // e.g. "Jan 25"
    year: number;
    month: number;
    revenue: number;
    expenses: number;
    net_profit: number;
}

export type DashboardPLTrend = PLTrendMonth[]; // 6 months, oldest first

// ── Section 4: Cash Positions ─────────────────────────────────────────────────

export interface CashAccount {
    account_code: string;
    account_name: string;
    account_subtype?: string;
    current_balance: number;
    bank_name?: string;
}

export interface DashboardCashPositions {
    accounts: CashAccount[];
    total_cash: number;
}

// ── Section 5: AR / AP Summary ───────────────────────────────────────────────

export interface ARAPAccount {
    _id: string;
    account_code: string;
    account_name: string;
    current_balance: number;
}

export interface ARSummary {
    total_outstanding: number;
    period_invoiced: number;
    period_collected: number;
    accounts: ARAPAccount[];
}

export interface APSummary {
    total_outstanding: number;
    period_billed: number;
    period_paid: number;
    accounts: ARAPAccount[];
}

export interface DashboardARAPSummary {
    accounts_receivable: ARSummary;
    accounts_payable: APSummary;
}

// ── Section 6: Notes Summary ──────────────────────────────────────────────────

export interface NoteStatusBucket {
    count: number;
    total: number;
}

export interface DashboardNotesSummary {
    by_type: {
        CREDIT_NOTE: Record<string, NoteStatusBucket>; // status → { count, total }
        DEBIT_NOTE: Record<string, NoteStatusBucket>;
    };
    total_credit_notes: number;
    total_debit_notes: number;
    net_adjustment: number;
    pending_approval: number;
}

// ── Section 7: Recent Entries ─────────────────────────────────────────────────

export interface RecentJournalEntry {
    _id: string;
    entry_no: string;
    entry_date: string;
    description: string;
    source: string;
    total_debit: number;
    total_credit: number;
    status: string;
    fiscal_year: number;
    fiscal_month: number;
}

// ── Section 8: Top Expense Accounts ──────────────────────────────────────────

export interface TopExpenseAccount {
    account_code: string;
    account_name: string;
    account_subtype?: string;
    total_amount: number;
    percentage: number; // % of total expenses
}

// ── Section 9: VAT Summary ───────────────────────────────────────────────────

export interface VATAccount {
    account_code: string;
    account_name: string;
    current_balance: number;
}

export interface DashboardVATSummary {
    vat_collected: number;
    vat_paid: number;
    net_vat_payable: number;
    vat_accounts: VATAccount[];
}

// ── Section 10: Reconciliation Status ────────────────────────────────────────

export interface OpenReconciliationSession {
    _id: string;
    reconciliation_no: string;
    account_name?: string;
    account_code?: string;
    account_id?: { account_code: string; account_name: string } | string;
    period_start: string;
    period_end: string;
    status: "Open" | "In Progress";
    difference: number;
    matched_count: number;
    unmatched_count: number;
}

export interface DashboardReconciliationStatus {
    open_sessions: OpenReconciliationSession[];
    open_count: number;
    in_progress_count: number;
    completed_this_year: number;
    attention_needed: number;
}

// ── Section 11: Sales Receipts Summary ───────────────────────────────────────

export interface SalesReceiptStatusBucket {
    count: number;
    total: number;
    vat: number;
    subtotal: number;
}

export interface SalesReceiptPaymentMethodBucket {
    count: number;
    total: number;
}

export interface DashboardSalesReceiptsSummary {
    by_status: Record<string, SalesReceiptStatusBucket>; // Posted | Pending | Voided
    total_posted: number;
    total_pending: number;
    total_voided: number;
    total_vat_collected: number;
    by_payment_method: Record<string, SalesReceiptPaymentMethodBucket>; // Cash | M-Pesa | Card | etc.
}

// ── Full Dashboard Response ───────────────────────────────────────────────────

export interface AccountingDashboardResponse {
    period: {
        fiscal_year: number;
        fiscal_month: number;
        from: string;
        to: string;
    };
    overview: DashboardOverview;
    journal_summary: DashboardJournalSummary;
    pl_trend: DashboardPLTrend;
    cash_positions: DashboardCashPositions;
    ar_ap_summary: DashboardARAPSummary;
    notes_summary: DashboardNotesSummary;
    recent_entries: RecentJournalEntry[];
    top_expense_accounts: TopExpenseAccount[];
    vat_summary: DashboardVATSummary;
    reconciliation_status: DashboardReconciliationStatus;
    sales_receipts_summary?: DashboardSalesReceiptsSummary;
}

// ── Query params ──────────────────────────────────────────────────────────────

export interface GetDashboardParams {
    shop_id: string;
    fiscal_year?: number;
    fiscal_month?: number;
    start_date?: string;
    end_date?: string;
}

// ============================================
// SERVICE
// ============================================

/**
 * Fetch all accounting dashboard KPIs in a single round-trip.
 * Defaults to current fiscal month/year if not provided.
 *
 * Sections returned:
 *  1. overview          — revenue, expenses, net profit, total assets, profit margin
 *  2. journal_summary   — entry counts by status + by source
 *  3. pl_trend          — monthly P&L for the last 6 months (chart data)
 *  4. cash_positions    — balances of all bank/cash accounts
 *  5. ar_ap_summary     — outstanding receivables & payables
 *  6. notes_summary     — credit/debit note counts by status
 *  7. recent_entries    — last 10 posted journal entries
 *  8. top_expense_accounts — top 5 expense accounts by spend
 *  9. vat_summary       — VAT collected vs paid
 * 10. reconciliation_status — open/in-progress reconciliation sessions
 */
export const getAccountingDashboard = async (
    params: GetDashboardParams
): Promise<AccountingDashboardResponse> => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/dashboard`,
            { params }
        );
        return response.data as AccountingDashboardResponse;
    } catch (error) {
        throw error;
    }
};