import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

export type InvoiceStatus =
    | "Draft"
    | "Pending"
    | "Partially_Paid"
    | "Paid"
    | "Overdue"
    | "Voided"
    | "Cancelled";

export type InvoiceSource = "pos" | "accounting" | "standalone";
export type InvoiceDirection = "customer" | "supplier";

export interface InvoiceAttachment {
    url: string;
    filename: string;
    file_type: string;
    uploaded_at: string;
}

export interface InvoiceLineItem {
    _id?: string;
    description?: string;
    product_id?: string | { _id: string; name: string };
    account_id?: string | { _id: string; account_code: string; account_name: string };
    quantity: number;
    price: number;
    vat_type?: "STANDARD" | "ZERO" | "EXEMPT";
    vat_rate?: number;
    vat_amount?: number;
}

export interface InvoicePaymentRef {
    _id: string;
    amount: number;
    payment_date: string;
    payment_status: string;
    method_id?: { name: string } | string;
    reference?: string;
}

export interface Invoice {
    _id: string;
    order_no: string;
    source: InvoiceSource;
    direction: InvoiceDirection;
    status: InvoiceStatus;

    // Counterparty
    customer_id?: string | { _id: string; customer_name: string; customer_phone?: string; email?: string };
    supplier_id?: string | { _id: string; name: string; phone?: string; email?: string };
    counterparty_name?: string;
    counterparty_email?: string;
    counterparty_phone?: string;
    counterparty_kra_pin?: string;

    // Financials
    subtotal: number;
    discount_amount: number;
    total_vat_amount: number;
    grand_total: number;
    amount_paid: number;
    amount_due: number;
    currency: string;

    // Dates
    issue_date: string;
    due_date?: string;
    paid_date?: string;

    // Links
    journal_entry_id?: string | { _id: string; entry_no: string; status: string };
    payment_id?: string | InvoicePaymentRef;
    payment_ids?: (string | InvoicePaymentRef)[];
    order_id?: string;
    supplier_ref?: string;

    // Meta
    notes?: string;
    terms?: string;
    internal_notes?: string;
    attachments?: InvoiceAttachment[];
    created_by?: string | { _id: string; username: string; name: string };
    createdAt?: string;
    updatedAt?: string;

    // Populated via virtual
    items?: InvoiceLineItem[];
}

export interface InvoiceSummaryItem {
    _id: string;           // status
    count: number;
    total_value: number;
    total_paid: number;
    total_due: number;
}

// ── Param interfaces ──────────────────────────────────────────────────────────

export interface GetInvoicesParams {
    direction?: InvoiceDirection;
    status?: InvoiceStatus;
    source?: InvoiceSource;
    customer_id?: string;
    supplier_id?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface CreateInvoiceLineParam {
    description: string;
    account_id: string;       // COA revenue/expense account
    quantity: number;
    price: number;
    vat_rate?: number;
    vat_amount?: number;
    product_id?: string;
}

export interface CreateInvoiceParams {
    direction?: InvoiceDirection;
    customer_id?: string;
    supplier_id?: string;
    counterparty_name?: string;
    counterparty_email?: string;
    counterparty_phone?: string;
    counterparty_kra_pin?: string;
    issue_date?: string;
    due_date?: string;
    lines: CreateInvoiceLineParam[];
    notes?: string;
    terms?: string;
    supplier_ref?: string;
    discount_amount?: number;
    currency?: string;
    // Optional: record payment immediately on creation
    record_payment?: boolean;
    payment_method_id?: string;
    payment_amount?: number;
    payment_reference?: string;
    payment_notes?: string;
}

export interface RecordInvoicePaymentParams {
    amount: number;
    method_id: string;
    reference?: string;
    notes?: string;
}

// ============================================
// INVOICE SERVICES
// ============================================

/**
 * Get all invoices with filters and pagination.
 */
export const getAllInvoices = async (params: GetInvoicesParams = {}) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/invoices`,
            { params }
        );
        return response.data as {
            invoices: Invoice[];
            total: number;
            page: number;
            totalPages: number;
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get invoice stats grouped by status + overdue count.
 */
export const getInvoiceSummary = async (params?: {
    direction?: InvoiceDirection;
    from?: string;
    to?: string;
}) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/invoices/summary`,
            { params }
        );
        return response.data as {
            summary: InvoiceSummaryItem[];
            overdue_count: number;
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get a single invoice by ID — includes line items and payment history.
 */
export const getInvoiceById = async (id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/invoices/${id}`
        );
        return response.data as { invoice: Invoice };
    } catch (error) {
        throw error;
    }
};

/**
 * Create an accounting invoice (customer A/R) or supplier bill (A/P).
 * Backend auto-generates journal entry + invoice number.
 * Pass record_payment: true to also record a payment immediately.
 */
export const createInvoice = async (data: CreateInvoiceParams) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/invoices`,
            data
        );
        message.success("Invoice created successfully");
        return response.data as {
            invoice: Invoice;
            items: InvoiceLineItem[];
            payment: InvoicePaymentRef | null;
        };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error creating invoice");
        }
        throw error;
    }
};

/**
 * Update editable fields on an invoice (counterparty info, dates, notes).
 * Financial fields (totals, lines) cannot be updated after creation.
 */
export const updateInvoice = async (id: string, data: Partial<{
    counterparty_name: string;
    counterparty_email: string;
    counterparty_phone: string;
    due_date: string;
    notes: string;
    terms: string;
    internal_notes: string;
    supplier_ref: string;
    status: InvoiceStatus;
}>) => {
    try {
        const response = await axiosInstance.put(
            `${BASE_URL}/accounting/invoices/${id}`,
            data
        );
        message.success("Invoice updated");
        return response.data as { invoice: Invoice };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error updating invoice");
        }
        throw error;
    }
};

/**
 * Void an invoice.
 * Also reverses the linked journal entry automatically.
 */
export const voidInvoice = async (id: string, reason: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/invoices/${id}/void`,
            { reason }
        );
        message.success("Invoice voided");
        return response.data as { invoice: Invoice };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error voiding invoice");
        }
        throw error;
    }
};

/**
 * Record a payment against an existing invoice.
 * Creates order_payment doc (invoice_id = invoice._id) + payment journal entry.
 * Updates invoice.amount_paid, amount_due, status automatically.
 *
 * Connection:
 *   order_payments.invoice_id → invoice._id
 *   invoice.payment_ids[]     → order_payments._id
 */
export const recordInvoicePayment = async (
    invoiceId: string,
    data: RecordInvoicePaymentParams
) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/invoices/${invoiceId}/payment`,
            data
        );
        message.success("Payment recorded successfully");
        return response.data as {
            payment: InvoicePaymentRef;
            invoice: Invoice;
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
 * Convert a Draft quote to a Posted invoice.
 * Creates the journal entry (DR AR, CR Revenue) at this point.
 * Optionally pass due_date if not already set on the quote.
 */
export const convertQuoteToInvoice = async (
    id: string,
    data?: { due_date?: string; notes?: string; terms?: string }
) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/invoices/${id}/convert`,
            data || {}
        );
        message.success("Quote converted to invoice — posted to books");
        return response.data as { invoice: Invoice };
    } catch (error) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error converting quote to invoice");
        }
        throw error;
    }
};