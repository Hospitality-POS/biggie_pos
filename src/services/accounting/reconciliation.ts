import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

export type ReconciliationStatus = "Open" | "In Progress" | "Completed" | "Voided";
export type StatementLineStatus = "Unmatched" | "Matched" | "Excluded";

export interface StatementLine {
    _id: string;
    transaction_date: string;
    value_date?: string;
    description: string;
    reference?: string;
    debit: number;
    credit: number;
    statement_balance?: number;
    status: StatementLineStatus;
    journal_entry_id?: string;
    journal_entry_no?: string;
    journal_line_id?: string;
    notes?: string;
    matched_at?: string;
    matched_by?: string;
}

export interface UnreconciledJELine {
    journal_entry_id: string;
    journal_line_id: string;
    entry_no: string;
    entry_date: string;
    description: string;
    debit: number;
    credit: number;
}

export interface BankReconciliation {
    _id: string;
    reconciliation_no: string;
    account_id: string | { _id: string; account_code: string; account_name: string };
    account_code?: string;
    account_name?: string;
    period_start: string;
    period_end: string;
    opening_balance: number;
    closing_book_balance: number;
    statement_balance: number;
    difference: number;
    statement_lines: StatementLine[];
    total_statement_debits: number;
    total_statement_credits: number;
    matched_count: number;
    unmatched_count: number;
    excluded_count: number;
    unreconciled_je_line_ids: UnreconciledJELine[];
    status: ReconciliationStatus;
    completed_at?: string;
    completed_by?: string | { _id: string; username: string; name: string };
    voided_at?: string;
    voided_by?: string;
    void_reason?: string;
    notes?: string;
    shop_id: string;
    created_by?: string | { _id: string; username: string; name: string };
    createdAt?: string;
    updatedAt?: string;
}

// ── Query param interfaces ───────────────────────────────────────────────────

export interface GetReconciliationsParams {
    shop_id: string;
    account_id?: string;
    status?: ReconciliationStatus;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

export interface OpenReconciliationParams {
    shop_id: string;
    account_id: string;
    period_start: string;
    period_end: string;
    statement_balance: number;
    opening_balance?: number;
    notes?: string;
}

export interface StatementLineInput {
    transaction_date: string;
    value_date?: string;
    description: string;
    reference?: string;
    debit?: number;
    credit?: number;
    statement_balance?: number;
    notes?: string;
}

// ============================================
// BANK RECONCILIATION SERVICES
// ============================================

/**
 * Get all reconciliations with filters.
 * Statement lines are excluded from list view for performance — use getReconciliationById for full detail.
 */
export const getAllReconciliations = async (params: GetReconciliationsParams) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/bank-reconciliations`,
            { params }
        );
        return response.data as {
            reconciliations: BankReconciliation[];
            totalPages: number;
            currentPage: number;
            total: number;
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get a single reconciliation with full detail — all statement lines and unreconciled JE lines.
 */
export const getReconciliationById = async (id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/bank-reconciliations/${id}`
        );
        return response.data as { reconciliation: BankReconciliation };
    } catch (error) {
        throw error;
    }
};

/**
 * Get all posted JE lines for an account that haven't been matched yet.
 * Used to populate the match-picker dropdown during reconciliation.
 */
export const getUnreconciledJELines = async (
    shop_id: string,
    account_id: string,
    from?: string,
    to?: string
) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/bank-reconciliations/unreconciled`,
            { params: { shop_id, account_id, from, to } }
        );
        return response.data as { count: number; lines: UnreconciledJELine[] };
    } catch (error) {
        throw error;
    }
};

/**
 * Open a new reconciliation session.
 * Automatically computes closing_book_balance from posted JEs and
 * snapshots all unreconciled JE lines for the period.
 */
export const openReconciliation = async (data: OpenReconciliationParams) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bank-reconciliations`,
            data
        );
        // message.success("Reconciliation session opened successfully");
        return response.data as {
            reconciliation: BankReconciliation;
            unreconciled_je_count: number;
        };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error opening reconciliation");
        }
        throw error;
    }
};

/**
 * Bulk import bank statement lines (e.g. from CSV parse result).
 */
export const importStatementLines = async (
    id: string,
    lines: StatementLineInput[]
) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bank-reconciliations/${id}/import-lines`,
            { lines }
        );
        // message.success(`${lines.length} statement lines imported`);
        return response.data as { reconciliation: BankReconciliation };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error importing statement lines");
        }
        throw error;
    }
};

/**
 * Add a single statement line manually.
 */
export const addStatementLine = async (id: string, data: StatementLineInput) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bank-reconciliations/${id}/lines`,
            data
        );
        // message.success("Statement line added");
        return response.data as {
            line: StatementLine;
            reconciliation_summary: {
                matched_count: number;
                unmatched_count: number;
                difference: number;
            };
        };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error adding statement line");
        }
        throw error;
    }
};

/**
 * Update an Unmatched or Excluded statement line.
 * Matched lines must be unmatched first.
 */
export const updateStatementLine = async (
    id: string,
    line_id: string,
    data: Partial<StatementLineInput>
) => {
    try {
        const response = await axiosInstance.put(
            `${BASE_URL}/accounting/bank-reconciliations/${id}/lines/${line_id}`,
            data
        );
        // message.success("Statement line updated");
        return response.data as { line: StatementLine };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error updating statement line");
        }
        throw error;
    }
};

/**
 * Delete a statement line.
 * Matched lines must be unmatched before deleting.
 */
export const deleteStatementLine = async (id: string, line_id: string) => {
    try {
        await axiosInstance.delete(
            `${BASE_URL}/accounting/bank-reconciliations/${id}/lines/${line_id}`
        );
        // message.success("Statement line deleted");
        return true;
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error deleting statement line");
        }
        return false;
    }
};

/**
 * Match a statement line to a specific journal entry line.
 */
export const matchLine = async (
    id: string,
    line_id: string,
    journal_entry_id: string,
    journal_line_id: string
) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/${id}/lines/${line_id}/match`,
            { journal_entry_id, journal_line_id }
        );
        // message.success("Line matched successfully");
        return response.data as {
            line: StatementLine;
            reconciliation_summary: {
                matched_count: number;
                unmatched_count: number;
                difference: number;
                is_balanced: boolean;
            };
        };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error matching line");
        }
        throw error;
    }
};

/**
 * Undo a match — returns the JE line back to the unreconciled pool.
 */
export const unmatchLine = async (id: string, line_id: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/${id}/lines/${line_id}/unmatch`
        );
        // message.success("Line unmatched");
        return response.data as {
            reconciliation_summary: {
                matched_count: number;
                unmatched_count: number;
                difference: number;
            };
        };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error unmatching line");
        }
        throw error;
    }
};

/**
 * Toggle a statement line between Excluded and Unmatched.
 * Use for bank charges or items with no journal entry counterpart.
 */
export const excludeLine = async (id: string, line_id: string, notes?: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/${id}/lines/${line_id}/exclude`,
            { notes }
        );
        // message.success(response.data.message);
        return response.data as {
            line: StatementLine;
            reconciliation_summary: {
                matched_count: number;
                unmatched_count: number;
                excluded_count: number;
                difference: number;
            };
        };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error excluding line");
        }
        throw error;
    }
};

/**
 * Run auto-match — matches statement lines to JE lines by exact amount
 * within a ±3 day date window. Safe to run multiple times.
 */
export const autoMatch = async (id: string) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bank-reconciliations/${id}/auto-match`
        );
        // message.success(`Auto-matched ${response.data.matched_count} lines`);
        return response.data as {
            matched_count: number;
            reconciliation_summary: {
                matched_count: number;
                unmatched_count: number;
                difference: number;
                is_balanced: boolean;
            };
        };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error running auto-match");
        }
        throw error;
    }
};

/**
 * Complete the reconciliation.
 * Will fail if difference ≠ 0 or any unmatched lines remain.
 */
export const completeReconciliation = async (id: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/${id}/complete`
        );
        // message.success("Reconciliation completed successfully");
        return response.data as { reconciliation: BankReconciliation };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error completing reconciliation");
        }
        throw error;
    }
};

/**
 * Void an Open or In Progress reconciliation.
 * Completed reconciliations cannot be voided.
 */
export const voidReconciliation = async (id: string, reason: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bank-reconciliations/${id}/void`,
            { reason }
        );
        // message.success("Reconciliation voided");
        return response.data as { reconciliation: BankReconciliation };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error voiding reconciliation");
        }
        throw error;
    }
};