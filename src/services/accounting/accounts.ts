import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

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
    account_code: string;
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
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
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
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/chart-of-accounts`,
            { params }
        );
        console.log('my data', response);
        return response.data as { count: number; accounts: ChartOfAccount[] };
    } catch (error) {
        throw error;
    }
};

/**
 * Get accounts in hierarchical tree structure grouped by type.
 */
export const getAccountTree = async (shop_id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/chart-of-accounts/tree`,
            { params: { shop_id } }
        );
        return response.data as { tree: AccountTree };
    } catch (error) {
        throw error;
    }
};

/**
 * Get accounts filtered by type (ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE).
 */
export const getAccountsByType = async (type: AccountType, shop_id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/chart-of-accounts/by-type/${type}`,
            { params: { shop_id } }
        );
        return response.data as { account_type: AccountType; count: number; accounts: ChartOfAccount[] };
    } catch (error) {
        throw error;
    }
};

/**
 * Get all bank accounts (is_bank_account = true) — used in reconciliation.
 */
export const getBankAccounts = async (shop_id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/chart-of-accounts/bank`,
            { params: { shop_id } }
        );
        return response.data as { count: number; accounts: ChartOfAccount[] };
    } catch (error) {
        throw error;
    }
};

/**
 * Get a single account by ID.
 */
export const getAccountById = async (id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/chart-of-accounts/${id}`
        );
        return response.data as { account: ChartOfAccount };
    } catch (error) {
        throw error;
    }
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
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
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
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
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
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
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
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
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
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
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
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/chart-of-accounts/${id}/ledger`,
            { params }
        );
        return response.data as AccountLedgerResponse;
    } catch (error) {
        throw error;
    }
};