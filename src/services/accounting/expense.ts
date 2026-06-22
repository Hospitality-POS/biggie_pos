import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

export type ExpenseStatus = "Draft" | "Pending" | "Approved" | "Voided";

export type ExpensePaymentMethod =
    | "Cash"
    | "M-Pesa"
    | "Bank_Transfer"
    | "Card"
    | "Cheque"
    | "Other";

export interface ExpenseLine {
    account_id: string | { _id: string; account_code: string; account_name: string; account_type: string };
    description?: string;
    amount: number;
    vat_amount?: number;
    vat_rate?: number;
    vat_inclusive?: boolean;
}

export interface ExpenseAttachment {
    url: string;
    filename: string;
    file_type: string;
    uploaded_at: string;
}

export interface Expense {
    _id: string;
    shop_id: string;
    expense_no: string;
    reference?: string;
    expense_date: string;

    // Counterparty
    supplier_id?: string | { _id: string; name: string; phone?: string; email?: string };
    payee_name?: string;

    // Financials
    subtotal: number;
    total_vat_amount: number;
    grand_total: number;
    currency: string;

    // Lines
    expense_lines: ExpenseLine[];

    // Payment
    payment_method: ExpensePaymentMethod;
    payment_account_id?: string | { _id: string; account_code: string; account_name: string };
    paid_date?: string;

    // Receipt / eTIMS
    receipt_no?: string;
    receipt_date?: string;

    // Status
    status: ExpenseStatus;

    // Accounting
    journal_entry_id?: string | { _id: string; entry_no: string; status: string };

    // Meta
    notes?: string;
    internal_notes?: string;
    attachments?: ExpenseAttachment[];
    created_by?: string | { _id: string; username: string; name: string };
    approved_by?: string | { _id: string; username: string; name: string };
    approved_at?: string;
    is_recurring?: boolean;
    recurrence_rule?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ExpenseSummaryItem {
    _id: string;         // status
    count: number;
    total_amount: number;
    total_vat: number;
}

export interface ExpenseByMethodItem {
    _id: ExpensePaymentMethod;
    count: number;
    total_amount: number;
}

// ── Param interfaces ──────────────────────────────────────────────────────────

export interface GetExpensesParams {
    status?: ExpenseStatus;
    payment_method?: ExpensePaymentMethod;
    supplier_id?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface CreateExpenseLineParam {
    account_id: string;
    description?: string;
    amount: number;
    vat_rate?: number;
    vat_amount?: number;
    vat_inclusive?: boolean;
}

export interface CreateExpenseParams {
    expense_date?: string;
    supplier_id?: string;
    payee_name?: string;
    expense_lines: CreateExpenseLineParam[];
    payment_method?: ExpensePaymentMethod;
    payment_account_id?: string;
    receipt_no?: string;
    receipt_date?: string;
    notes?: string;
    reference?: string;
    currency?: string;
    status?: ExpenseStatus;
    is_recurring?: boolean;
    recurrence_rule?: string;
}

export interface UpdateExpenseParams {
    expense_date?: string;
    payee_name?: string;
    supplier_id?: string;
    expense_lines?: CreateExpenseLineParam[];
    payment_method?: ExpensePaymentMethod;
    payment_account_id?: string;
    receipt_no?: string;
    receipt_date?: string;
    notes?: string;
    reference?: string;
    currency?: string;
}

// ============================================
// EXPENSE SERVICES
// ============================================

/**
 * Get all expenses with filters and pagination.
 */
export const getAllExpenses = async (params: GetExpensesParams = {}) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/expenses`,
            { params }
        );
        return response.data as {
            expenses: Expense[];
            total: number;
            page: number;
            totalPages: number;
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get expense stats grouped by status + breakdown by payment method.
 */
export const getExpenseSummary = async (params?: {
    from?: string;
    to?: string;
    payment_method?: ExpensePaymentMethod;
}) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/expenses/summary`,
            { params }
        );
        return response.data as {
            summary: ExpenseSummaryItem[];
            by_payment_method: ExpenseByMethodItem[];
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get a single expense by ID — includes populated lines and journal entry.
 */
export const getExpenseById = async (id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/expenses/${id}`
        );
        return response.data as { expense: Expense };
    } catch (error) {
        throw error;
    }
};

/**
 * Create a new expense.
 * Backend auto-generates expense_no and computes totals from lines.
 * Pass status: "Approved" to immediately post the GL journal entry.
 */
export const createExpense = async (data: CreateExpenseParams) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/expenses`,
            data
        );
        // message.success("Expense created successfully");
        return response.data as { expense: Expense };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error creating expense");
        }
        throw error;
    }
};

/**
 * Update editable fields on a Draft or Pending expense.
 * Approved or Voided expenses cannot be edited.
 */
export const updateExpense = async (id: string, data: UpdateExpenseParams) => {
    try {
        const response = await axiosInstance.put(
            `${BASE_URL}/accounting/expenses/${id}`,
            data
        );
        // message.success("Expense updated");
        return response.data as { expense: Expense };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error updating expense");
        }
        throw error;
    }
};

/**
 * Approve a Pending expense.
 * Fires the GL journal entry:
 *   DR Expense Account(s) + DR VAT Input (1300) → CR Bank/Cash
 */
export const approveExpense = async (id: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/expenses/${id}/approve`
        );
        // message.success("Expense approved and posted to books");
        return response.data as { expense: Expense };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error approving expense");
        }
        throw error;
    }
};

/**
 * Void an expense.
 * Also reverses the linked journal entry if one was posted.
 */
export const voidExpense = async (id: string, reason: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/expenses/${id}/void`,
            { reason }
        );
        // message.success("Expense voided");
        return response.data as { expense: Expense };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error voiding expense");
        }
        throw error;
    }
};