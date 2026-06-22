import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

export type PettyCashStatus = "Pending" | "Approved" | "Voided";

export type PettyCashTransactionType = "Deposit" | "Withdrawal" | "Expense";

export type PettyCashPaymentMethod =
    | "Cash"
    | "M-Pesa"
    | "Bank_Transfer"
    | "Card"
    | "Cheque"
    | "Other";

export type PettyCashCategory =
    | "Office Supplies"
    | "Transport"
    | "Meals"
    | "Utilities"
    | "Repairs"
    | "Other";

export interface PettyCashTransaction {
    _id: string;
    shop_id: string;
    transaction_no: string;
    transaction_date: string;
    transaction_type: PettyCashTransactionType;
    amount: number;
    currency: string;
    description: string;
    category: PettyCashCategory;
    payee_name?: string;
    recipient_name?: string;
    payment_method: PettyCashPaymentMethod;
    status: PettyCashStatus;
    receipt_no?: string;
    receipt_date?: string;
    notes?: string;
    created_by?: string | { _id: string; username: string; name: string };
    approved_by?: string | { _id: string; username: string; name: string };
    approved_at?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface PettyCashSummaryItem {
    _id: string;         // status or transaction_type or category
    count: number;
    total_amount: number;
}

export interface PettyCashBalance {
    total_deposits: number;
    total_withdrawals: number;
    balance: number;
    as_of_date: string;
}

// ============================================
// PARAM INTERFACES
// ============================================

export interface GetPettyCashParams {
    status?: PettyCashStatus;
    transaction_type?: PettyCashTransactionType;
    payment_method?: PettyCashPaymentMethod;
    category?: PettyCashCategory;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    search?: string;
}

export interface GetPettyCashSummaryParams {
    from?: string;
    to?: string;
    transaction_type?: PettyCashTransactionType;
    category?: string;
}

export interface GetPettyCashBalanceParams {
    as_of_date?: string;
}

export interface CreatePettyCashParams {
    transaction_date: string;
    transaction_type: PettyCashTransactionType;
    amount: number;
    currency?: string;
    description: string;
    category: PettyCashCategory;
    payee_name?: string;
    payment_method: PettyCashPaymentMethod;
    receipt_no?: string;
    receipt_date?: string;
    notes?: string;
    status?: PettyCashStatus;
}

export interface UpdatePettyCashParams {
    transaction_date?: string;
    transaction_type?: PettyCashTransactionType;
    amount?: number;
    currency?: string;
    description?: string;
    category?: PettyCashCategory;
    payee_name?: string;
    payment_method?: PettyCashPaymentMethod;
    receipt_no?: string;
    receipt_date?: string;
    notes?: string;
}

// ============================================
// PETTY CASH SERVICES
// ============================================

/**
 * Get all petty cash transactions with filters and pagination.
 */
export const getAllPettyCashTransactions = async (params: GetPettyCashParams = {}) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/petty-cash`,
            { params }
        );
        return response.data as {
            transactions: PettyCashTransaction[];
            total: number;
            page: number;
            totalPages: number;
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get petty cash summary statistics.
 */
export const getPettyCashSummary = async (params?: GetPettyCashSummaryParams) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/petty-cash/summary`,
            { params }
        );
        return response.data as {
            summary: PettyCashSummaryItem[];
            by_transaction_type: PettyCashSummaryItem[];
            by_category: PettyCashSummaryItem[];
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get petty cash balance information.
 */
export const getPettyCashBalance = async (params?: GetPettyCashBalanceParams) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/petty-cash/balance`,
            { params }
        );
        return response.data as PettyCashBalance;
    } catch (error) {
        throw error;
    }
};

/**
 * Get a single petty cash transaction by ID.
 */
export const getPettyCashById = async (id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/petty-cash/${id}`
        );
        return response.data as { transaction: PettyCashTransaction };
    } catch (error) {
        throw error;
    }
};

/**
 * Create a new petty cash transaction.
 */
export const createPettyCashTransaction = async (data: CreatePettyCashParams) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/petty-cash`,
            data
        );
        // message.success("Petty cash transaction created successfully");
        return response.data as { transaction: PettyCashTransaction };
    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error creating petty cash transaction");
        }
        throw error;
    }
};

/**
 * Update an existing petty cash transaction.
 */
export const updatePettyCashTransaction = async (id: string, data: UpdatePettyCashParams) => {
    try {
        const response = await axiosInstance.put(
            `${BASE_URL}/accounting/petty-cash/${id}`,
            data
        );
        // message.success("Petty cash transaction updated");
        return response.data as { transaction: PettyCashTransaction };
    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error updating petty cash transaction");
        }
        throw error;
    }
};

/**
 * Approve a petty cash transaction.
 */
export const approvePettyCashTransaction = async (id: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/petty-cash/${id}/approve`
        );
        // message.success("Petty cash transaction approved");
        return response.data as { transaction: PettyCashTransaction };
    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error approving petty cash transaction");
        }
        throw error;
    }
};

/**
 * Void a petty cash transaction.
 */
export const voidPettyCashTransaction = async (id: string, reason: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/petty-cash/${id}/void`,
            { reason }
        );
        // message.success("Petty cash transaction voided");
        return response.data as { transaction: PettyCashTransaction };
    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error voiding petty cash transaction");
        }
        throw error;
    }
};
