import { BASE_URL } from "@utils/config";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

export interface ReportPeriod {
    from: string;
    to: string;
}

// ── Trial Balance ────────────────────────────────────────────────────────────

export interface TrialBalanceRow {
    account_code: string;
    account_name: string;
    account_type: string;
    account_subtype?: string;
    opening_balance: number;
    period_debit: number;
    period_credit: number;
    closing_debit: number;
    closing_credit: number;
}

export interface TrialBalanceResponse {
    report: "Trial Balance";
    period: ReportPeriod;
    rows: TrialBalanceRow[];
    totals: {
        total_debit: number;
        total_credit: number;
        difference: number;
    };
    is_balanced: boolean;
}

// ── Profit & Loss ────────────────────────────────────────────────────────────

export interface PLAccountRow {
    account_code: string;
    account_name: string;
    account_subtype?: string;
    amount: number;
}

export interface ProfitAndLossResponse {
    report: "Profit & Loss";
    period: ReportPeriod;
    revenue: {
        accounts: PLAccountRow[];
        total_revenue: number;
    };
    expenses: {
        accounts: PLAccountRow[];
        total_expenses: number;
    };
    net_profit: number;
    is_profit: boolean;
}

// ── Balance Sheet ────────────────────────────────────────────────────────────

export interface BalanceSheetRow {
    account_code: string;
    account_name: string;
    account_subtype?: string;
    balance: number;
}

export interface BalanceSheetResponse {
    report: "Balance Sheet";
    as_of: string;
    assets: {
        accounts: BalanceSheetRow[];
        total_assets: number;
    };
    liabilities: {
        accounts: BalanceSheetRow[];
        total_liabilities: number;
    };
    equity: {
        accounts: BalanceSheetRow[];
        total_equity: number;
    };
    totals: {
        total_assets: number;
        total_liabilities_and_equity: number;
        difference: number;
    };
    is_balanced: boolean;
}

// ── General Ledger ───────────────────────────────────────────────────────────

export interface LedgerEntryLine {
    entry_no: string;
    entry_date: string;
    description: string;
    reference?: string;
    source: string;
    debit: number;
    credit: number;
    balance: number;
}

export interface GeneralLedgerAccount {
    account_code: string;
    account_name: string;
    account_type: string;
    account_subtype?: string;
    opening_balance: number;
    closing_balance: number;
    total_debit: number;
    total_credit: number;
    lines: LedgerEntryLine[];
}

export interface GeneralLedgerResponse {
    report: "General Ledger";
    period: ReportPeriod;
    accounts: GeneralLedgerAccount[];
    pagination: {
        total: number;
        page: number;
        totalPages: number;
    };
}

// ── VAT Report ───────────────────────────────────────────────────────────────

export interface VATTransaction {
    entry_no: string;
    entry_date: string;
    description: string;
    reference?: string;
    source: string;
    vat_collected: number;
    vat_paid: number;
}

export interface VATReportResponse {
    report: "VAT Report";
    period: ReportPeriod;
    summary: {
        vat_collected: number;
        vat_paid: number;
        net_vat_payable: number;
        vat_account_code: string;
    };
    by_source: Record<string, { collected: number; paid: number }>;
    transactions: VATTransaction[];
}

// ── Cash Flow ────────────────────────────────────────────────────────────────

export interface CashFlowAccount {
    account_code: string;
    account_name: string;
    account_subtype?: string;
    opening_balance: number;
    inflows: number;
    outflows: number;
    net_cash_flow: number;
    closing_balance: number;
}

export interface CashFlowResponse {
    report: "Cash Flow Summary";
    period: ReportPeriod;
    accounts: CashFlowAccount[];
    totals: {
        total_inflows: number;
        total_outflows: number;
        net_cash_flow: number;
    };
}

// ── Account Balances ─────────────────────────────────────────────────────────

export interface AccountBalanceRow {
    account_code: string;
    account_name: string;
    account_type: string;
    account_subtype?: string;
    normal_balance: string;
    opening_balance: number;
    total_debit: number;
    total_credit: number;
    balance: number;
}

export interface AccountBalancesResponse {
    report: "Account Balances";
    as_of: string;
    accounts: AccountBalanceRow[];
    grouped: Record<string, AccountBalanceRow[]>;
    summary: {
        total_assets: string;
        total_liabilities: string;
        total_equity: string;
        total_revenue: string;
        total_expenses: string;
    };
}

// ── Customer Statement ───────────────────────────────────────────────────────

export interface StatementTransaction {
    date: string;
    type: "Invoice" | "Payment" | "Credit Note" | "Bill" | "Debit Note";
    reference: string;
    description: string;
    debit: number;
    credit: number;
    status: string;
    document_id: string;
    balance: number;
}

export interface CustomerStatementResponse {
    report: "Customer Statement";
    period: ReportPeriod;
    customer: {
        _id: string;
        customer_name: string;
        email?: string;
        phone?: string;
        code?: string;
    };
    transactions: StatementTransaction[];
    summary: {
        total_invoiced: number;
        total_paid: number;
        total_credit_notes: number;
        closing_balance: number;
        balance_label: "Amount Due" | "Credit Balance" | "Settled";
    };
}

// ── Supplier Statement ───────────────────────────────────────────────────────

export interface SupplierStatementResponse {
    report: "Supplier Statement";
    period: ReportPeriod;
    supplier: {
        _id: string;
        name: string;
        email?: string;
        phone?: string;
    };
    transactions: StatementTransaction[];
    summary: {
        total_billed: number;
        total_paid: number;
        total_debit_notes: number;
        closing_balance: number;
        balance_label: "Amount Owed to Supplier" | "Overpaid / Credit" | "Settled";
    };
}

// ── AR / AP Aging ────────────────────────────────────────────────────────────

export interface AgingInvoiceRow {
    invoice_no: string;
    invoice_id: string;
    issue_date: string;
    due_date?: string;
    grand_total: number;
    amount_paid: number;
    amount_due: number;
    days_overdue: number;
    bucket: string;
    status: string;
}

export interface ARAgingCustomer {
    customer_id: string;
    customer_name: string;
    email?: string;
    phone?: string;
    code?: string;
    invoices: AgingInvoiceRow[];
    buckets: Record<string, number>;
    total: number;
}

export interface APAgingSupplier {
    supplier_id: string;
    supplier_name: string;
    email?: string;
    phone?: string;
    bills: (AgingInvoiceRow & { bill_id: string; supplier_ref?: string })[];
    buckets: Record<string, number>;
    total: number;
}

export interface ARAgingResponse {
    report: "AR Aging";
    as_of: string;
    buckets: string[];
    customers: ARAgingCustomer[];
    summary: Record<string, number> & { grand_total: number };
    total_customers_with_outstanding: number;
}

export interface APAgingResponse {
    report: "AP Aging";
    as_of: string;
    buckets: string[];
    suppliers: APAgingSupplier[];
    summary: Record<string, number> & { grand_total: number };
    total_suppliers_with_outstanding: number;
}

// ── Shared params ────────────────────────────────────────────────────────────

export interface PeriodReportParams {
    shop_id: string;
    from?: string;
    to?: string;
}

export interface AgingReportParams {
    shop_id: string;
    as_of_date?: string;
    buckets?: string; // comma-separated e.g. "30,60,90,120"
}

export interface GeneralLedgerParams extends PeriodReportParams {
    account_type?: string;
    account_id?: string;
    page?: number;
    limit?: number;
}

// ============================================
// ACCOUNTING REPORTS SERVICES
// ============================================

// ── Standard Financial Statements ────────────────────────────────────────────

/**
 * Trial Balance — all posting accounts with period debits/credits and closing balance.
 * Includes is_balanced flag to confirm the books are balanced.
 */
export const getTrialBalance = async (params: PeriodReportParams) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/reports/trial-balance`,
            { params }
        );
        return response.data as TrialBalanceResponse;
    } catch (error) {
        throw error;
    }
};

/**
 * Profit & Loss — Revenue minus Expenses for the period.
 * Returns gross revenue, total expenses, and net profit/loss.
 */
export const getProfitAndLoss = async (params: PeriodReportParams) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/reports/profit-loss`,
            { params }
        );
        return response.data as ProfitAndLossResponse;
    } catch (error) {
        throw error;
    }
};

/**
 * Balance Sheet — Assets = Liabilities + Equity snapshot.
 * as_of_date defaults to today if not provided.
 */
export const getBalanceSheet = async (shop_id: string, as_of_date?: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/reports/balance-sheet`,
            { params: { shop_id, as_of_date } }
        );
        return response.data as BalanceSheetResponse;
    } catch (error) {
        throw error;
    }
};

// ── Detailed Ledger ───────────────────────────────────────────────────────────

/**
 * General Ledger — all posted JE lines grouped by account with running balance.
 * Paginated by account. Use account_id to drill into a single account.
 */
export const getGeneralLedger = async (params: GeneralLedgerParams) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/reports/general-ledger`,
            { params }
        );
        return response.data as GeneralLedgerResponse;
    } catch (error) {
        throw error;
    }
};

/**
 * Account Balances — current balance snapshot for every active account.
 * Returns flat list + grouped by type + totals per type.
 */
export const getAccountBalances = async (shop_id: string, account_type?: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/reports/account-balances`,
            { params: { shop_id, account_type } }
        );
        return response.data as AccountBalancesResponse;
    } catch (error) {
        throw error;
    }
};

// ── Tax & Cash ────────────────────────────────────────────────────────────────

/**
 * VAT Report — VAT collected vs VAT paid for the period.
 * Breakdown by transaction source (pos_sale, subscription, manual, etc.)
 */
export const getVATReport = async (params: PeriodReportParams) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/reports/vat`,
            { params }
        );
        return response.data as VATReportResponse;
    } catch (error) {
        throw error;
    }
};

/**
 * Cash Flow Summary — inflows/outflows for all bank/cash accounts.
 */
export const getCashFlowSummary = async (params: PeriodReportParams) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/reports/cash-flow`,
            { params }
        );
        return response.data as CashFlowResponse;
    } catch (error) {
        throw error;
    }
};

// ── Customer & Supplier Statements ───────────────────────────────────────────

/**
 * Customer Statement — full chronological transaction history for one customer.
 * Invoices raised → payments received → credit notes → running balance.
 */
export const getCustomerStatement = async (
    customer_id: string,
    params: PeriodReportParams
) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/reports/customer-statement/${customer_id}`,
            { params }
        );
        return response.data as CustomerStatementResponse;
    } catch (error) {
        throw error;
    }
};

/**
 * Supplier Statement — full chronological transaction history for one supplier.
 * Bills received → payments made → debit notes → running balance.
 */
export const getSupplierStatement = async (
    supplier_id: string,
    params: PeriodReportParams
) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/reports/supplier-statement/${supplier_id}`,
            { params }
        );
        return response.data as SupplierStatementResponse;
    } catch (error) {
        throw error;
    }
};

// ── Aging Reports ─────────────────────────────────────────────────────────────

/**
 * AR Aging — outstanding customer invoices grouped by overdue bucket.
 * Sorted by total outstanding (highest debtors first).
 * buckets defaults to "30,60,90,120" — override with e.g. "15,30,45,60"
 */
export const getARAgingReport = async (params: AgingReportParams) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/reports/ar-aging`,
            { params }
        );
        return response.data as ARAgingResponse;
    } catch (error) {
        throw error;
    }
};

/**
 * AP Aging — outstanding supplier bills grouped by overdue bucket.
 * Sorted by total outstanding (largest creditors first).
 */
export const getAPAgingReport = async (params: AgingReportParams) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/reports/ap-aging`,
            { params }
        );
        return response.data as APAgingResponse;
    } catch (error) {
        throw error;
    }
};