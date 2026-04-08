import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

export type BillStatus =
    | "Draft"
    | "Pending"
    | "Partially_Paid"
    | "Paid"
    | "Overdue"
    | "Voided"
    | "Cancelled";

export type VatPricingMode = "INCLUSIVE" | "EXCLUSIVE";

export interface BillLine {
    account_id: string | { _id: string; account_code: string; account_name: string; account_type: string };
    description?: string;
    quantity: number;
    unit_price: number;
    amount: number;
    vat_rate?: number;
    vat_amount?: number;
    vat_inclusive?: boolean;
    product_id?: string | { _id: string; name: string };
}

export interface BillAttachment {
    url: string;
    filename: string;
    file_type: string;
    uploaded_at: string;
}

export interface BillPaymentRef {
    _id: string;
    amount: number;
    payment_date: string;
    payment_status: string;
    method_id?: { name: string } | string;
    reference?: string;
}

export interface Bill {
    _id: string;
    shop_id: string;
    bill_no: string;
    supplier_ref?: string;

    // Supplier
    supplier_id: string | { _id: string; name: string; phone?: string; email?: string; kra_pin?: string };
    supplier_name?: string;
    supplier_kra_pin?: string;

    // Dates
    bill_date: string;
    due_date?: string;
    paid_date?: string;

    // Lines
    bill_lines: BillLine[];

    // Financials
    subtotal: number;
    discount_amount: number;
    total_vat_amount: number;
    vat_pricing_mode: VatPricingMode;
    vat_standard_rate: number;
    grand_total: number;
    amount_paid: number;
    amount_due: number;
    currency: string;

    // Status
    status: BillStatus;

    // Payments
    payment_id?: string | BillPaymentRef;
    payment_ids?: (string | BillPaymentRef)[];

    // Accounting
    journal_entry_id?: string | { _id: string; entry_no: string; status: string };
    purchase_order_id?: string;

    // Debit note tracking
    applied_note_ids?: string[];
    notes_adjustment?: number;

    // Meta
    notes?: string;
    terms?: string;
    internal_notes?: string;
    attachments?: BillAttachment[];
    created_by?: string | { _id: string; username: string; name: string };
    createdAt?: string;
    updatedAt?: string;

    // Populated via virtual
    payments?: BillPaymentRef[];
}

export interface BillSummaryItem {
    _id: string;         // status
    count: number;
    total_value: number;
    total_paid: number;
    total_due: number;
}

// ── Param interfaces ──────────────────────────────────────────────────────────

export interface GetBillsParams {
    status?: BillStatus;
    supplier_id?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface CreateBillLineParam {
    account_id: string;
    description?: string;
    quantity?: number;
    unit_price: number;
    amount?: number;         // auto-computed backend-side if omitted
    vat_rate?: number;
    vat_amount?: number;
    vat_inclusive?: boolean;
    product_id?: string;
}

export interface CreateBillParams {
    supplier_id: string;
    bill_date?: string;
    due_date?: string;
    bill_lines: CreateBillLineParam[];
    supplier_ref?: string;
    notes?: string;
    terms?: string;
    discount_amount?: number;
    currency?: string;
    status?: BillStatus;
    // Optional: record payment immediately (e.g. cash bill paid on the spot)
    record_payment?: boolean;
    payment_method_id?: string;
    payment_amount?: number;
    payment_reference?: string;
    payment_notes?: string;
}

export interface RecordBillPaymentParams {
    amount: number;
    method_id: string;
    reference?: string;
    notes?: string;
}

export interface UpdateBillParams {
    bill_date?: string;
    due_date?: string;
    supplier_ref?: string;
    notes?: string;
    terms?: string;
    internal_notes?: string;
    currency?: string;
}

// ============================================
// BILL SERVICES
// ============================================

/**
 * Get all supplier bills with filters and pagination.
 */
export const getAllBills = async (params: GetBillsParams = {}) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/bills`,
            { params }
        );
        return response.data as {
            bills: Bill[];
            total: number;
            page: number;
            totalPages: number;
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get bill stats grouped by status + overdue count.
 */
export const getBillSummary = async (params?: {
    from?: string;
    to?: string;
    supplier_id?: string;
}) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/bills/summary`,
            { params }
        );
        return response.data as {
            summary: BillSummaryItem[];
            overdue_count: number;
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get a single bill by ID — includes populated lines and payment history.
 */
export const getBillById = async (id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/bills/${id}`
        );
        return response.data as { bill: Bill };
    } catch (error) {
        throw error;
    }
};

/**
 * Create a supplier bill.
 * Backend auto-generates bill_no, denormalises supplier snapshot,
 * auto-derives due_date from supplier.payment_terms if not provided,
 * and fires the GL journal entry:
 *   DR Expense/Asset lines + DR VAT Input (1300) → CR Accounts Payable (2100)
 * Pass record_payment: true to also record a payment immediately (cash bills).
 */
export const createBill = async (data: CreateBillParams) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bills`,
            data
        );
        message.success("Bill created successfully");
        return response.data as {
            bill: Bill;
            payment: BillPaymentRef | null;
        };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error creating bill");
        }
        throw error;
    }
};

/**
 * Update editable metadata on a Draft or Pending bill.
 * Paid, Voided, and Cancelled bills cannot be edited.
 * Financial fields (lines, totals) cannot be changed after creation.
 */
export const updateBill = async (id: string, data: UpdateBillParams) => {
    try {
        const response = await axiosInstance.put(
            `${BASE_URL}/accounting/bills/${id}`,
            data
        );
        message.success("Bill updated");
        return response.data as { bill: Bill };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error updating bill");
        }
        throw error;
    }
};

/**
 * Record a payment against a supplier bill.
 * Creates order_payment doc + settlement journal entry:
 *   DR Accounts Payable (2100) → CR Bank/Cash
 * Updates bill.amount_paid, amount_due, status automatically.
 *
 * Connection:
 *   order_payments.bill_id → bill._id
 *   bill.payment_ids[]     → order_payments._id
 */
export const recordBillPayment = async (
    billId: string,
    data: RecordBillPaymentParams
) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/bills/${billId}/payment`,
            data
        );
        message.success("Payment recorded successfully");
        return response.data as {
            payment: BillPaymentRef;
            bill: Bill;
        };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error recording payment");
        }
        throw error;
    }
};

/**
 * Void a supplier bill.
 * Also reverses the linked journal entry automatically.
 */
export const voidBill = async (id: string, reason: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/bills/${id}/void`,
            { reason }
        );
        message.success("Bill voided");
        return response.data as { bill: Bill };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error voiding bill");
        }
        throw error;
    }
};