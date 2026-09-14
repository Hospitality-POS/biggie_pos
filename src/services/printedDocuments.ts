import { message } from "antd";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";

// ── Types ──────────────────────────────────────────────────────────────────
export type DocumentType = "bill" | "receipt" | "invoice" | "quotation";
export type PrintFormat = "thermal" | "pdf";

export interface PrintedLineItem {
    product_id?: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    vat_amount?: number;
    vat_type?: string;
    category_name?: string;
}

export interface SavePrintPayload {
    shop_id: string;
    cart_id?: string;
    order_id?: string;
    invoice_id?: string;
    order_no: string;
    document_type: DocumentType;
    print_format?: PrintFormat;
    printed_by?: string;
    served_by?: string;
    customer_id?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    line_items?: PrintedLineItem[];
    subtotal: number;
    discount?: number;
    discount_type?: string;
    discount_amount?: number;
    total_vat_amount?: number;
    grand_total: number;
    vat_mode?: "INCLUSIVE" | "EXCLUSIVE";
    reason?: string;
}

export interface PrintStatusResult {
    can_print: boolean;
    is_first_print: boolean;
    is_reprint: boolean;
    print_count: number;
    print_limit: number | null;
    prints_remaining: number | null;
    is_locked: boolean;
    requires_reason: boolean;
    requires_admin: boolean;
}

export interface SavePrintResult {
    message: string;
    is_reprint: boolean;
    print_count: number;
    print_limit: number | null;
    prints_remaining: number | null;
    is_locked: boolean;
    document: any;
}

// ── Service functions ──────────────────────────────────────────────────────

export async function checkPrintStatus(
    shopId: string,
    orderNo: string,
    documentType: DocumentType
): Promise<PrintStatusResult | null> {
    try {
        const { data } = await axiosInstance.get(
            `${BASE_URL}/printed-documents/status`,
            { params: { shop_id: shopId, order_no: orderNo, document_type: documentType } }
        );
        return data;
    } catch (error: any) {
        console.error("[checkPrintStatus]", error?.response?.data || error.message);
        return null;
    }
}

// In usePrintDocument.ts, update the savePrintedDocument function:

export async function savePrintedDocument(
    payload: SavePrintPayload
): Promise<SavePrintResult | null> {
    try {
        console.log("[savePrintedDocument] Making API call to:", `${BASE_URL}/printed-documents`);
        console.log("[savePrintedDocument] Payload:", JSON.stringify(payload, null, 2));

        const { data } = await axiosInstance.post(
            `${BASE_URL}/printed-documents`,
            payload
        );

        console.log("[savePrintedDocument] Response received:", data);
        return data;
    } catch (error: any) {
        console.error("[savePrintedDocument] Error details:", {
            message: error?.message,
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            data: error?.response?.data,
            config: error?.config
        });

        // Show user-friendly error
        if (error?.response?.status === 404) {
            message.error("Print service endpoint not found. Please check backend configuration.");
        } else if (error?.response?.status === 500) {
            message.error("Server error while saving print record.");
        } else {
            message.error(error?.response?.data?.message || "Failed to save print record");
        }

        return null;
    }
}
export async function getDocumentsByOrderNo(
    shopId: string,
    orderNo: string
): Promise<any[]> {
    try {
        const { data } = await axiosInstance.get(
            `${BASE_URL}/printed-documents/order/${orderNo}`,
            { params: { shop_id: shopId } }
        );
        return data.data || [];
    } catch {
        return [];
    }
}

export async function updateShopPrintSettings(
    shopId: string,
    settings: {
        enabled?: boolean;
        global_print_limit?: number | null;
        per_document_type_limits?: {
            bill?: number | null;
            receipt?: number | null;
            invoice?: number | null;
            quotation?: number | null;
        };
        allow_reprint?: boolean;
        reprint_requires_admin?: boolean;
        reprint_requires_reason?: boolean;
        save_on_print?: boolean;
    }
): Promise<boolean> {
    try {
        await axiosInstance.put(
            `${BASE_URL}/printed-documents/shop-settings/${shopId}`,
            settings
        );
        return true;
    } catch (error: any) {
        message.error(
            error?.response?.data?.message || "Failed to update print settings"
        );
        return false;
    }
}

// ── Hook Re-export ──────────────────────────────────────────────────────────
export { usePrintDocument } from "../components/MODALS/Hooks/usePrintDocument";