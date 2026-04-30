import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

export type RefundStatus = "Pending" | "Approved" | "Processed" | "Voided";

export type RefundType = "Full" | "Partial" | "Exchange";

export type RefundMethod =
    | "Cash"
    | "M-Pesa"
    | "Bank_Transfer"
    | "Card"
    | "Cheque"
    | "Store_Credit"
    | "Original_Method";

export type RefundReason =
    | "Defective"
    | "Wrong Item"
    | "Damaged"
    | "Customer Dissatisfaction"
    | "Return Policy"
    | "Other";

export interface RefundItem {
    item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    reason?: string;
}

export interface Refund {
    _id: string;
    shop_id: string;
    refund_no: string;
    refund_date: string;
    original_invoice_id: string;
    original_invoice_no: string;
    original_transaction_date?: string;
    customer_id: string;
    customer_name: string;
    customer_contact?: string;
    refund_type: RefundType;
    refund_reason: RefundReason;
    refund_reason_details?: string;
    refund_total: number;
    refund_method: RefundMethod;
    status: RefundStatus;
    refund_items: RefundItem[];
    notes?: string;
    created_by?: string | { _id: string; username: string; name: string };
    approved_by?: string | { _id: string; username: string; name: string };
    approved_at?: string;
    processed_by?: string | { _id: string; username: string; name: string };
    processed_at?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface RefundSummaryItem {
    _id: string;         // status or refund_type or refund_reason or refund_method
    count: number;
    total_amount: number;
}

// ============================================
// PARAM INTERFACES
// ============================================

export interface GetRefundsParams {
    status?: RefundStatus;
    refund_type?: RefundType;
    refund_method?: RefundMethod;
    refund_reason?: RefundReason;
    customer_id?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    search?: string;
}

export interface GetRefundSummaryParams {
    from?: string;
    to?: string;
    refund_type?: string;
    refund_reason?: string;
    refund_method?: string;
}

export interface CreateRefundItemParam {
    item_type: "product" | "product_inventory" | "custom";
    item_id?: string; // Required for product and product_inventory, not for custom
    item_name: string;
    custom_description?: string; // Required for custom items
    quantity: number;
    unit_price: number;
    batch_number?: string; // For product_inventory items
    expiry_date?: string; // For product_inventory items
    reason?: string;
}

export interface CreateRefundParams {
    refund_date: string;
    original_invoice_id: string;
    original_invoice_no: string;
    original_transaction_date?: string;
    customer_id: string;
    customer_name: string;
    customer_contact?: string;
    refund_type: RefundType;
    refund_reason: RefundReason;
    refund_reason_details?: string;
    refund_items: CreateRefundItemParam[];
    refund_method: RefundMethod;
    notes?: string;
    status?: RefundStatus;
}

export interface UpdateRefundParams {
    refund_date?: string;
    customer_name?: string;
    customer_contact?: string;
    refund_type?: RefundType;
    refund_reason?: RefundReason;
    refund_reason_details?: string;
    refund_items?: CreateRefundItemParam[];
    refund_method?: RefundMethod;
    notes?: string;
}

// ============================================
// REFUNDS SERVICES
// ============================================

/**
 * Get all refunds with filters and pagination.
 */
export const getAllRefunds = async (params: GetRefundsParams = {}) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/refunds`,
            { params }
        );
        return response.data as {
            refunds: Refund[];
            total: number;
            page: number;
            totalPages: number;
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get refund summary statistics.
 */
export const getRefundSummary = async (params?: GetRefundSummaryParams) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/refunds/summary`,
            { params }
        );
        return response.data as {
            summary: RefundSummaryItem[];
            by_refund_type: RefundSummaryItem[];
            by_refund_reason: RefundSummaryItem[];
            by_refund_method: RefundSummaryItem[];
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get a single refund by ID.
 */
export const getRefundById = async (id: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/refunds/${id}`
        );
        return response.data as { refund: Refund };
    } catch (error) {
        throw error;
    }
};

/**
 * Get refunds by invoice ID.
 */
export const getRefundsByInvoice = async (invoiceId: string) => {
    try {
        const response = await axiosInstance.get(
            `${BASE_URL}/accounting/refunds/invoice/${invoiceId}`
        );
        return response.data as { refunds: Refund[] };
    } catch (error) {
        throw error;
    }
};

/**
 * Create a new refund.
 */
export const createRefund = async (data: CreateRefundParams) => {
    try {
        const response = await axiosInstance.post(
            `${BASE_URL}/accounting/refunds`,
            data
        );
        message.success("Refund created successfully");
        return response.data as { refund: Refund };
    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error creating refund");
        }
        throw error;
    }
};

/**
 * Update an existing refund.
 */
export const updateRefund = async (id: string, data: UpdateRefundParams) => {
    try {
        const response = await axiosInstance.put(
            `${BASE_URL}/accounting/refunds/${id}`,
            data
        );
        message.success("Refund updated");
        return response.data as { refund: Refund };
    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error updating refund");
        }
        throw error;
    }
};

/**
 * Approve a refund.
 */
export const approveRefund = async (id: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/refunds/${id}/approve`
        );
        message.success("Refund approved");
        return response.data as { refund: Refund };
    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error approving refund");
        }
        throw error;
    }
};

/**
 * Process a refund.
 */
export const processRefund = async (id: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/refunds/${id}/process`
        );
        message.success("Refund processed successfully");
        return response.data as { refund: Refund };
    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error processing refund");
        }
        throw error;
    }
};

/**
 * Void a refund.
 */
export const voidRefund = async (id: string, reason: string) => {
    try {
        const response = await axiosInstance.patch(
            `${BASE_URL}/accounting/refunds/${id}/void`,
            { reason }
        );
        message.success("Refund voided");
        return response.data as { refund: Refund };
    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else {
            message.error("Error voiding refund");
        }
        throw error;
    }
};
