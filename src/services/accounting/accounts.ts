import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
export type NormalBalance = "DEBIT" | "CREDIT";

export interface ChartOfAccount {
    _id: string;
    account_code: string;
    account_name: string;
    description?: string;
    account_type: AccountType;
    account_subtype?: string;
    normal_balance: NormalBalance;
    parent_account_id?: string | ChartOfAccount;
    level: number;
    is_parent: boolean;
    current_balance: number;
    opening_balance: number;
    opening_balance_date?: string;
    is_active: boolean;
    is_system_account: boolean;
    is_bank_account: boolean;
    allows_direct_posting: boolean;
    bank_details?: {
        bank_name?: string;
        account_number?: string;
        branch?: string;
        currency?: string;
    };
    pos_mapping?: {
        order_types?: string[];
        payment_method_name?: string;
    };
    shop_id: string;
    created_by?: string;
    updated_by?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AccountTreeNode extends ChartOfAccount {
    children: AccountTreeNode[];
}

export interface AccountTree {
    ASSET: AccountTreeNode[];
    LIABILITY: AccountTreeNode[];
    EQUITY: AccountTreeNode[];
    REVENUE: AccountTreeNode[];
    EXPENSE: AccountTreeNode[];
}

export interface LedgerLine {
    entry_id: string;
    entry_no: string;
    entry_date: string;
    description: string;
    reference?: string;
    source: string;
    debit: number;
    credit: number;
    balance: number;
}

export interface AccountLedgerResponse {
    account: {
        account_code: string;
        account_name: string;
        account_type: AccountType;
        opening_balance: number;
        opening_running_balance: number;
        normal_balance: NormalBalance;
    };
    ledger: LedgerLine[];
    pagination: {
        total: number;
        page: number;
        totalPages: number;
    };
}

// ── Query param interfaces ───────────────────────────────────────────────────

export interface GetAccountsParams {
    shop_id: string;
    account_type?: AccountType;
    account_subtype?: string;
    is_active?: boolean;
    is_bank_account?: boolean;
    allows_direct_posting?: boolean;
    search?: string;
}

export interface CreateAccountParams {
    shop_id: string;
    /** Optional — the server generates a guaranteed-free code when omitted
     *  or when `auto_generate_code` is set and the suggestion collides. */
    account_code?: string;
    /** When true, the server falls back to a generated code instead of a
     *  409 if the suggested code is already taken. */
    auto_generate_code?: boolean;
    account_name: string;
    account_type: AccountType;
    account_subtype?: string;
    description?: string;
    parent_account_id?: string;
    level?: number;
    is_parent?: boolean;
    is_bank_account?: boolean;
    bank_details?: ChartOfAccount["bank_details"];
    opening_balance?: number;
    opening_balance_date?: string;
    pos_mapping?: ChartOfAccount["pos_mapping"];
}

export interface UpdateAccountParams {
    account_name?: string;
    description?: string;
    account_subtype?: string;
    parent_account_id?: string;
    level?: number;
    is_parent?: boolean;
    is_active?: boolean;
    is_bank_account?: boolean;
    allows_direct_posting?: boolean;
    bank_details?: ChartOfAccount["bank_details"];
    opening_balance?: number;
    opening_balance_date?: string;
    pos_mapping?: ChartOfAccount["pos_mapping"];
}

export interface GetLedgerParams {
    shop_id: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

// ============================================
// CHART OF ACCOUNTS SERVICES
// ============================================

/**
 * Seed the 40+ default accounts for a shop.
 * Call once when the accounting module is first enabled.
 */
export const seedDefaultAccounts = async (shop_id: string) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/chart-of-accounts/seed`,
            { shop_id }
        );
        message.success("Default chart of accounts seeded successfully");
        return response.data;
    } catch (error) {
        const err = error as ApiError;
        if (err.response?.data?.message) {
            message.error(err.response.data.message);
        } else {
            message.error("Error seeding chart of accounts");
        }
        throw error;
    }
};

/**
 * Get all accounts with optional filters.
 */
export const getAllAccounts = async (params: GetAccountsParams) => {
    const response = await axiosInstance.get(
        `${BASE_URL}/accounting/chart-of-accounts`,
        { params }
    );
    console.log('my data', response);
    return response.data as { count: number; accounts: ChartOfAccount[] };
};

/**
 * Get accounts in hierarchical tree structure grouped by type.
 */
export const getAccountTree = async (shop_id: string) => {
    const response = await axiosInstance.get(
        `${BASE_URL}/accounting/chart-of-accounts/tree`,
        { params: { shop_id } }
    );
    return response.data as { tree: AccountTree };
};

/**
 * Get accounts filtered by type (ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE).
 */
export const getAccountsByType = async (type: AccountType, shop_id: string) => {
    const response = await axiosInstance.get(
        `${BASE_URL}/accounting/chart-of-accounts/by-type/${type}`,
        { params: { shop_id } }
    );
    return response.data as { account_type: AccountType; count: number; accounts: ChartOfAccount[] };
};

/**
 * Get all bank accounts (is_bank_account = true) — used in reconciliation.
 */
export const getBankAccounts = async (shop_id: string) => {
    const response = await axiosInstance.get(
        `${BASE_URL}/accounting/chart-of-accounts/bank`,
        { params: { shop_id } }
    );
    return response.data as { count: number; accounts: ChartOfAccount[] };
};

/**
 * Get a single account by ID.
 */
export const getAccountById = async (id: string) => {
    const response = await axiosInstance.get(
        `${BASE_URL}/accounting/chart-of-accounts/${id}`
    );
    return response.data as { account: ChartOfAccount };
};

/**
 * Create a new account.
 */
export const createAccount = async (data: CreateAccountParams) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/chart-of-accounts`,
            data
        );
        message.success("Account created successfully");
        return response.data as { account: ChartOfAccount };
    } catch (error) {
        const err = error as ApiError;
        if (err.response?.data?.message) {
            message.error(err.response.data.message);
        } else {
            message.error("Error creating account");
        }
        throw error;
    }
};

/**
 * Update an existing account.
 * System account protected fields (account_code, account_type) cannot be changed.
 */
export const updateAccount = async (id: string, data: UpdateAccountParams) => {
    try {
        const response = await axiosInstance.put(
            `${BASE_URL}/accounting/chart-of-accounts/${id}`,
            data
        );
        message.success("Account updated successfully");
        return response.data as { account: ChartOfAccount };
    } catch (error) {
        const err = error as ApiError;
        if (err.response?.data?.message) {
            message.error(err.response.data.message);
        } else {
            message.error("Error updating account");
        }
        throw error;
    }
};

/**
 * Update the opening balance for an account.
 */
export const updateOpeningBalance = async (
    id: string,
    opening_balance: number,
    opening_balance_date?: string
) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/chart-of-accounts/${id}/opening-balance`,
            { opening_balance, opening_balance_date }
        );
        message.success("Opening balance updated successfully");
        return response.data as { account: ChartOfAccount };
    } catch (error) {
        const err = error as ApiError;
        if (err.response?.data?.message) {
            message.error(err.response.data.message);
        } else {
            message.error("Error updating opening balance");
        }
        throw error;
    }
};

/**
 * Toggle an account between active and inactive.
 */
export const toggleAccountActive = async (id: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/chart-of-accounts/${id}/toggle-active`
        );
        message.success(response.data.message);
        return response.data as { account: ChartOfAccount };
    } catch (error) {
        const err = error as ApiError;
        if (err.response?.data?.message) {
            message.error(err.response.data.message);
        } else {
            message.error("Error toggling account status");
        }
        throw error;
    }
};

/**
 * Delete an account.
 * Blocked for system accounts or accounts with existing journal entries.
 */
export const deleteAccount = async (id: string) => {
    try {
        await axiosInstance.delete(
            `${BASE_URL}/accounting/chart-of-accounts/${id}`
        );
        message.success("Account deleted successfully");
        return true;
    } catch (error) {
        const err = error as ApiError;
        if (err.response?.data?.message) {
            message.error(err.response.data.message);
        } else {
            message.error("Error deleting account");
        }
        return false;
    }
};

/**
 * Get the full transaction ledger for an account with running balance.
 */
export const getAccountLedger = async (id: string, params: GetLedgerParams) => {
    const response = await axiosInstance.get(
        `${BASE_URL}/accounting/chart-of-accounts/${id}/ledger`,
        { 
            params: {
                ...params,
                t: Date.now() // Cache-busting timestamp
            }
        }
    );
    return response.data as AccountLedgerResponse;
};

// ── Ledger vs bank statement verification ────────────────────────────────────

/** Why a statement row isn't in the books. */
export type StatementGapReason =
    | "not_imported"
    | "imported_not_completed"
    | "excluded"
    | "completed_entry_elsewhere";

/** Why a ledger entry isn't on the statement. */
export type LedgerGapReason = "possible_duplicate" | "not_on_this_statement" | "booked_directly";

export interface StatementVerifyInput {
    shop_id?: string;
    statement_opening_balance?: number | null;
    statement_closing_balance?: number | null;
    transactions: {
        transaction_date: string;
        description: string;
        reference?: string;
        /** Money out */
        debit: number;
        /** Money in */
        credit: number;
    }[];
}

export interface StatementVerifyResult {
    account: { _id: string; account_code: string; account_name: string; account_type: AccountType };
    period: { from: string; to: string };
    date_tolerance_days: number;
    counts: {
        statement: number;
        ledger_in_period: number;
        matched: number;
        matched_date_shifted: number;
        missing_in_ledger: number;
        missing_in_statement: number;
    };
    balances: {
        ledger_opening: number;
        ledger_closing: number;
        statement_opening: number | null;
        statement_closing: number | null;
        opening_difference: number | null;
        closing_difference: number | null;
    };
    explanation: {
        opening_difference: number | null;
        missing_in_ledger_net: number;
        missing_in_statement_net: number;
        period_boundary_net: number;
        unexplained: number | null;
    };
    missing_in_ledger: {
        row_index: number;
        transaction_date: string;
        description: string;
        reference?: string;
        debit: number;
        credit: number;
        reason: StatementGapReason;
        import_id: string | null;
        import_no: string | null;
        txn_id: string | null;
    }[];
    missing_in_statement: {
        entry_id: string;
        entry_no: string;
        entry_date: string;
        description: string;
        reference?: string;
        source: string;
        money_in: number;
        money_out: number;
        reason: LedgerGapReason;
        twin_entry_no: string | null;
    }[];
    date_shifted: {
        transaction_date: string;
        description: string;
        debit: number;
        credit: number;
        entry_id: string;
        entry_no: string;
        entry_date: string;
        date_shift_days: number;
        outside_period: boolean;
    }[];
}

/**
 * Compare an account's posted ledger with a parsed bank statement and explain
 * the balance difference.
 */
export const verifyAccountAgainstStatement = async (id: string, data: StatementVerifyInput) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/chart-of-accounts/${id}/verify-statement`,
            data
        );
        return response.data as StatementVerifyResult;
    } catch (error) {
        const err = error as ApiError;
        message.error(err.response?.data?.message || "Error verifying against the statement");
        throw error;
    }
};