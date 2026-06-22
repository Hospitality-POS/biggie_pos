import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

export type JournalEntryStatus = "Draft" | "Posted" | "Voided";
export type JournalEntrySource =
    | "manual"
    | "pos_sale"
    | "pos_subscription"
    | "invoice"
    | "bill"
    | "payment"
    | "reconciliation";

export interface JournalLine {
    _id?: string;
    account_id: string | { _id: string; account_code: string; account_name: string; account_type: string };
    account_code?: string;
    account_name?: string;
    debit: number;
    credit: number;
    description?: string;
    customer_id?: string;
    supplier_id?: string;
}

export interface JournalEntry {
    _id: string;
    entry_no: string;
    entry_date: string;
    description: string;
    reference?: string;
    lines: JournalLine[];
    total_debit: number;
    total_credit: number;
    status: JournalEntryStatus;
    posted_at?: string;
    posted_by?: string | { _id: string; username: string; name: string };
    voided_at?: string;
    voided_by?: string | { _id: string; username: string; name: string };
    voided_reason?: string;
    source: JournalEntrySource;
    source_id?: string;
    source_type?: string;
    fiscal_year?: number;
    fiscal_month?: number;
    shop_id: string;
    created_by?: string | { _id: string; username: string; name: string };
    createdAt?: string;
    updatedAt?: string;
}

export interface JournalEntrySummary {
    total_entries: number;
    total_debits: number;
    total_credits: number;
    by_status: Record<string, number>;
    by_source: Record<string, { debit: number; credit: number; count: number }>;
}

// ── Query param interfaces ───────────────────────────────────────────────────

export interface GetJournalEntriesParams {
    shop_id: string;
    status?: JournalEntryStatus;
    source?: JournalEntrySource;
    from?: string;
    to?: string;
    fiscal_year?: number;
    fiscal_month?: number;
    search?: string;
    page?: number;
    limit?: number;
}

export interface CreateManualEntryParams {
    shop_id: string;
    entry_date?: string;
    description: string;
    reference?: string;
    lines: Array<{
        account_id: string;
        debit?: number;
        credit?: number;
        description?: string;
        customer_id?: string;
        supplier_id?: string;
    }>;
    auto_post?: boolean;
}

export interface CreateExpenseEntryParams {
    shop_id: string;
    description: string;
    amount: number;
    expense_account_id: string;
    payment_account_id: string;
    reference?: string;
    entry_date?: string;
    vat_amount?: number;
}

// ============================================
// JOURNAL ENTRY SERVICES
// ============================================

/**
 * Get all journal entries with filters and pagination.
 */
export const getAllJournalEntries = async (params: GetJournalEntriesParams) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/journal-entries`,
            { params }
        );
        return response.data as {
            entries: JournalEntry[];
            totalPages: number;
            currentPage: number;
            totalEntries: number;
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get a single journal entry by ID with fully populated account info on each line.
 */
export const getJournalEntryById = async (id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/journal-entries/${id}`
        );
        return response.data as { entry: JournalEntry };
    } catch (error) {
        throw error;
    }
};

/**
 * Get journal entry dashboard summary — counts by status and totals by source.
 */
export const getJournalEntrySummary = async (
    shop_id: string,
    fiscal_year?: number,
    fiscal_month?: number
) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/journal-entries/summary`,
            { params: { shop_id, fiscal_year, fiscal_month } }
        );
        return response.data as { summary: JournalEntrySummary };
    } catch (error) {
        throw error;
    }
};

/**
 * Get all journal entries linked to a specific source document.
 * e.g. source_type = "order", source_id = "65abc123"
 */
export const getEntriesBySource = async (
    source_type: string,
    source_id: string,
    shop_id: string
) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/journal-entries/by-source/${source_type}/${source_id}`,
            { params: { shop_id } }
        );
        return response.data as { count: number; entries: JournalEntry[] };
    } catch (error) {
        throw error;
    }
};

/**
 * Create a manual journal entry.
 * Defaults to Draft status — pass auto_post: true to post immediately.
 * Lines must balance (total debits === total credits).
 */
export const createManualEntry = async (data: CreateManualEntryParams) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/journal-entries`,
            data
        );
        // message.success(
        //     data.auto_post
        //         ? "Journal entry created and posted"
        //         : "Journal entry created as Draft"
        // );
        return response.data as { entry: JournalEntry };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error creating journal entry");
        }
        throw error;
    }
};

/**
 * Create and immediately post a direct expense entry.
 * Shortcut — no need to build lines manually.
 */
export const createExpenseEntry = async (data: CreateExpenseEntryParams) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/journal-entries/expense`,
            data
        );
        // message.success("Expense entry created and posted");
        return response.data as { entry: JournalEntry };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error creating expense entry");
        }
        throw error;
    }
};

/**
 * Post a Draft journal entry (Draft → Posted).
 */
export const postJournalEntry = async (id: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/journal-entries/${id}/post`
        );
        // message.success("Journal entry posted successfully");
        return response.data as { entry: JournalEntry };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error posting journal entry");
        }
        throw error;
    }
};

/**
 * Void a Posted journal entry.
 * Automatically creates a reversal entry (debits and credits swapped).
 */
export const voidJournalEntry = async (id: string, reason: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/journal-entries/${id}/void`,
            { reason }
        );
        // message.success("Journal entry voided and reversal created");
        return response.data as {
            voided_entry: JournalEntry;
            reversal_entry: JournalEntry;
        };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error voiding journal entry");
        }
        throw error;
    }
};