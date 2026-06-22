import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";
import { Invoice, InvoicePaymentRef } from "./invoice";

// ============================================
// TYPES
// ============================================

export type PaymentDirection = "inbound" | "outbound";

export interface IncomePayment {
    _id: string;
    shop_id: string;
    method_id: string | { _id: string; name: string };
    amount: number;
    payment_type: string;
    payment_status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
    payment_date: string;
    direction: PaymentDirection;
    account_id?: string | { _id: string; account_code: string; account_name: string };
    journal_entry_id?: string | { _id: string; entry_no: string; status: string };
    invoice_id?: string | { _id: string; order_no: string; status: string };
    reference?: string;
    notes?: string;
    createdAt?: string;
}

// ── Param interfaces ──────────────────────────────────────────────────────────

export interface PostDirectIncomeParams {
    method_id: string;          // payment method (resolves bank/cash account)
    revenue_account_id: string; // COA REVENUE account to credit
    amount: number;
    description: string;        // e.g. "Consulting fee — Acme Ltd"
    reference?: string;         // receipt / transaction ref
    income_date?: string;       // ISO — defaults to now
    notes?: string;
    customer_id?: string;
}

export interface PostExpenseParams {
    method_id: string;           // payment method (bank/cash paid from)
    expense_account_id: string;  // COA EXPENSE account to debit
    amount: number;              // net amount (excl. VAT)
    description: string;
    reference?: string;
    expense_date?: string;       // ISO — defaults to now
    notes?: string;
    supplier_id?: string;
    vat_amount?: number;         // input VAT — auto-finds VAT input COA account
}

export interface SettleInvoiceParams {
    method_id: string;
    amount: number;
    reference?: string;
    notes?: string;
}

export interface GetIncomeHistoryParams {
    direction?: PaymentDirection;
    payment_type?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

// ============================================
// INCOME SERVICES
// ============================================

/**
 * Post direct income — cash/bank receipt with NO prior invoice.
 *
 * Journal entry created by backend:
 *   DR  Bank/Cash account   (resolved from payment method → account_id)
 *   CR  Revenue account     (revenue_account_id)
 *
 * Returns the order_payment doc + the journal entry.
 */
export const postDirectIncome = async (data: PostDirectIncomeParams) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/income/direct`,
            data
        );
        // message.success("Income posted successfully");
        return response.data as {
            payment: IncomePayment;
            journal_entry: { _id: string; entry_no: string; status: string };
        };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error posting income");
        }
        throw error;
    }
};

/**
 * Post a direct expense — pay an expense from bank/cash.
 *
 * Journal entry created by backend:
 *   DR  Expense account     (expense_account_id)
 *   DR  VAT Input account   (if vat_amount > 0 — auto-resolved from COA)
 *   CR  Bank/Cash account   (resolved from payment method → account_id)
 *
 * Returns the order_payment doc + the journal entry.
 */
export const postExpense = async (data: PostExpenseParams) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/income/expense`,
            data
        );
        // message.success("Expense posted successfully");
        return response.data as {
            payment: IncomePayment;
            journal_entry: { _id: string; entry_no: string; status: string };
        };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error posting expense");
        }
        throw error;
    }
};

/**
 * Settle an existing invoice (partial or full payment).
 *
 * Connection created by backend:
 *   order_payments.invoice_id  = invoice._id      ← payment → invoice
 *   invoice.payment_ids[]      = payment._id      ← invoice → payment history
 *   invoice.payment_id         = payment._id      ← invoice → last payment
 *
 * Journal entry:
 *   Customer invoice → DR Bank/Cash,  CR Accounts Receivable
 *   Supplier bill    → DR Accounts Payable, CR Bank/Cash
 */
export const settleInvoice = async (
    invoiceId: string,
    data: SettleInvoiceParams
) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/income/settle/${invoiceId}`,
            data
        );
        // message.success("Payment settled successfully");
        return response.data as {
            payment: IncomePayment;
            invoice: Invoice;
            journal_entry: { _id: string; entry_no: string; status: string } | null;
        };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error settling invoice");
        }
        throw error;
    }
};

/**
 * Get history of non-POS income and expense payments.
 * Excludes POS order payments (those have order_id set).
 */
export const getIncomeHistory = async (params: GetIncomeHistoryParams = {}) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/income/history`,
            { params }
        );
        return response.data as {
            payments: IncomePayment[];
            total: number;
            page: number;
            totalPages: number;
        };
    } catch (error) {
        throw error;
    }
};