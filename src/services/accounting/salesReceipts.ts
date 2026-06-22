import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

export type SalesReceiptStatus = "Pending" | "Posted" | "Voided";
export type PaymentMethod = "Cash" | "M-Pesa" | "Card" | "Bank_Transfer" | "Cheque" | "Other";
export type VatType = "STANDARD" | "ZERO" | "EXEMPT" | "NONE" | "OUT_OF_SCOPE";
export type VatPricingMode = "EXCLUSIVE" | "INCLUSIVE";

export interface SalesReceiptLineItem {
    _id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount?: number;
    vat_rate?: number;
    vat_type?: VatType;
    product_id?: string;
    account_id?: string;
    line_total?: number;
    vat_amount?: number;
    net_amount?: number;
}

export interface SalesReceipt {
    _id: string;
    receipt_no: string;
    customer_id?: {
        _id: string;
        customer_name: string;
        phone: string;
        email: string;
        address?: any;
    } | null;
    customer_name?: string;
    receipt_date: string;
    lines: SalesReceiptLineItem[];
    subtotal: number;
    total_vat: number;
    total_discount: number;
    grand_total: number;
    payment_method: PaymentMethod;
    payment_reference?: string;
    payment_account_id?: string;
    status: SalesReceiptStatus;
    posted_at?: string;
    posted_by?: {
        username: string;
        name: string;
    };
    notes?: string;
    internal_notes?: string;
    vat_pricing_mode?: VatPricingMode;
    vat_standard_rate?: number;
    journal_entry_id?: {
        _id: string;
        entry_no: string;
        status: string;
    };
    invoice_id?: {
        _id: string;
        order_no: string;
        status: string;
        grand_total: number;
        amount_paid: number;
        amount_due: number;
    } | null;
    created_by: {
        username: string;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface SalesReceiptSummary {
    _id: string;
    count: number;
    total_amount: number;
}

export interface SalesReceiptsResponse {
    receipts: SalesReceipt[];
    total: number;
    page: number;
    totalPages: number;
}

export interface SalesReceiptSummaryResponse {
    summary: SalesReceiptSummary[];
    by_payment_method: SalesReceiptSummary[];
}

// ============================================
// API FUNCTIONS
// ============================================

const API_BASE = `${BASE_URL}/accounting/sales-receipts`;

export const getSalesReceipts = async (params: {
    status?: SalesReceiptStatus;
    payment_method?: PaymentMethod;
    customer_id?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    search?: string;
} = {}): Promise<SalesReceiptsResponse> => {
    try {
        const response = await axiosInstance.get(API_BASE, { params });
        return response.data;
    } catch (error: any) {
        message.error(error.response?.data?.message || "Failed to fetch sales receipts");
        throw error;
    }
};

export const getSalesReceiptById = async (id: string): Promise<SalesReceipt> => {
    try {
        const response = await axiosInstance.get(`${API_BASE}/${id}`);
        return response.data.receipt;
    } catch (error: any) {
        message.error(error.response?.data?.message || "Failed to fetch sales receipt");
        throw error;
    }
};

export const createSalesReceipt = async (data: {
    customer_id?: string | null;
    receipt_date?: string;
    lines: SalesReceiptLineItem[];
    payment_method: PaymentMethod;
    payment_reference?: string;
    payment_account_id?: string;
    revenue_account_id?: string;
    notes?: string;
    vat_pricing_mode?: VatPricingMode;
    vat_standard_rate?: number;
    status?: SalesReceiptStatus;
    invoice_id?: string;
}): Promise<{ message: string; receipt: SalesReceipt; journal_entry?: any }> => {
    try {
        const shop_id = localStorage.getItem("shopId") || "";
        const response = await axiosInstance.post(API_BASE, { ...data, shop_id });
      //  message.success("Sales receipt created successfully");
        return response.data;
    } catch (error: any) {
        message.error(error.response?.data?.message || "Failed to create sales receipt");
        throw error;
    }
};

export const updateSalesReceipt = async (
    id: string,
    data: {
        customer_id?: string | null;
        receipt_date?: string;
        lines?: SalesReceiptLineItem[];
        payment_method?: PaymentMethod;
        payment_reference?: string;
        payment_account_id?: string;
        notes?: string;
        vat_pricing_mode?: VatPricingMode;
        vat_standard_rate?: number;
        invoice_id?: string;
    }
): Promise<{ message: string; receipt: SalesReceipt }> => {
    try {
        const response = await axiosInstance.put(`${API_BASE}/${id}`, data);
        message.success("Sales receipt updated successfully");
        return response.data;
    } catch (error: any) {
        message.error(error.response?.data?.message || "Failed to update sales receipt");
        throw error;
    }
};

export const postSalesReceipt = async (id: string): Promise<{ message: string; receipt: SalesReceipt; journal_entry: any }> => {
    try {
        const response = await axiosInstance.patch(`${API_BASE}/${id}/post`);
        message.success("Sales receipt posted successfully");
        return response.data;
    } catch (error: any) {
        message.error(error.response?.data?.message || "Failed to post sales receipt");
        throw error;
    }
};

export const voidSalesReceipt = async (id: string, reason: string): Promise<{ message: string; receipt: SalesReceipt }> => {
    try {
        const response = await axiosInstance.patch(`${API_BASE}/${id}/void`, { reason });
        message.success("Sales receipt voided successfully");
        return response.data;
    } catch (error: any) {
        message.error(error.response?.data?.message || "Failed to void sales receipt");
        throw error;
    }
};

export const getSalesReceiptSummary = async (params: {
    from?: string;
    to?: string;
    payment_method?: PaymentMethod;
} = {}): Promise<SalesReceiptSummaryResponse> => {
    try {
        const response = await axiosInstance.get(`${API_BASE}/summary`, { params });
        return response.data;
    } catch (error: any) {
        message.error(error.response?.data?.message || "Failed to fetch sales receipt summary");
        throw error;
    }
};

export const fixVoidedJournalEntries = async (): Promise<{ message: string; fixed_count: number }> => {
    try {
        const response = await axiosInstance.post(`${API_BASE}/fix-voided-journals`);
        message.success(`Fixed ${response.data.fixed_count} voided journal entries`);
        return response.data;
    } catch (error: any) {
        message.error(error.response?.data?.message || "Failed to fix voided journal entries");
        throw error;
    }
};
