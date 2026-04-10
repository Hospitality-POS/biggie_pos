import { useEffect, useState, useCallback } from "react";
import { message } from "antd";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";
import { useAppSelector } from "src/store";

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

// ── Hook ───────────────────────────────────────────────────────────────────
// Usage in PrintBillModal / PrintSpaBillModal:
//
//   const {
//     canPrint, isReprint, printsRemaining, printStatus,
//     recordPrint, statusLoading,
//   } = usePrintDocument({
//     orderNo: cartDetails?.order_no,
//     documentType,
//     cartDetails,
//     data,
//   });
//
//   // In onFinish:
//   handlePrint();
//   await recordPrint({ print_format: isPdfView ? "pdf" : "thermal" });

interface UsePrintDocumentOptions {
    orderNo?: string;
    documentType: DocumentType;
    cartDetails: any;
    data: any[];
    autoCheck?: boolean;
}

interface UsePrintDocumentResult {
    canPrint: boolean;
    isReprint: boolean;
    printsRemaining: number | null;
    printStatus: PrintStatusResult | null;
    statusLoading: boolean;
    recordPrint: (opts?: {
        print_format?: PrintFormat;
        reason?: string;
        invoice_id?: string;
        order_id?: string;
    }) => Promise<SavePrintResult | null>;
    refreshStatus: () => Promise<void>;
}

export function usePrintDocument({
    orderNo,
    documentType,
    cartDetails,
    data,
    autoCheck = true,
}: UsePrintDocumentOptions): UsePrintDocumentResult {
    const { subtotal, totalVatAmount, grandTotal } = useAppSelector(
        (s) => s.cart
    );
    const { user } = useAppSelector((s) => s.auth);

    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const vatMode: "INCLUSIVE" | "EXCLUSIVE" =
        tenant?.vat_pricing_mode || "EXCLUSIVE";

    const shopId: string | undefined =
        cartDetails?.shop_id?._id ||
        cartDetails?.shop_id ||
        user?.shop_id;

    const [printStatus, setPrintStatus] = useState<PrintStatusResult | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);

    const refreshStatus = useCallback(async () => {
        if (!shopId || !orderNo) return;
        setStatusLoading(true);
        try {
            const status = await checkPrintStatus(shopId, orderNo, documentType);
            setPrintStatus(status);
        } finally {
            setStatusLoading(false);
        }
    }, [shopId, orderNo, documentType]);

    useEffect(() => {
        if (autoCheck) refreshStatus();
    }, [autoCheck, refreshStatus]);

    // Build line_items snapshot from current cart data
    const buildLineItems = (): PrintedLineItem[] => {
        if (!data?.length) return [];
        return data.map((item: any) => ({
            product_id: item.product_id?._id || item.product_id,
            product_name: item.product_id?.name || item.name || "Unknown",
            quantity: item.quantity,
            unit_price: item.price,
            line_total: item.price * item.quantity,
            vat_amount: item.vat_amount || 0,
            vat_type: item.vat_type || "STANDARD",
            category_name: item.category_id?.name || item.category?.name || null,
        }));
    };

    // Resolve discount amount
    const resolveDiscountAmount = (): number => {
        if (!cartDetails?.discount || cartDetails.discount <= 0) return 0;
        if (cartDetails.discount_type === "percentage") {
            return parseFloat(((cartDetails.discount / 100) * subtotal).toFixed(2));
        }
        return Number(cartDetails.discount);
    };

    const recordPrint = useCallback(
        async (opts: {
            print_format?: PrintFormat;
            reason?: string;
            invoice_id?: string;
            order_id?: string;
        } = {}): Promise<SavePrintResult | null> => {
            if (!shopId || !orderNo) {
                console.warn("[usePrintDocument] Missing shopId or orderNo — skipping save");
                return null;
            }

            const discountAmount = resolveDiscountAmount();

            const payload: SavePrintPayload = {
                shop_id: shopId,
                cart_id: cartDetails?._id || cartDetails?.id || undefined,
                order_id: opts.order_id || undefined,
                invoice_id: opts.invoice_id || undefined,
                order_no: orderNo,
                document_type: documentType,
                print_format: opts.print_format || "thermal",
                printed_by: user?._id || undefined,
                served_by:
                    cartDetails?.served_by?._id ||
                    cartDetails?.created_by?._id ||
                    undefined,
                customer_id: cartDetails?.customer_id || undefined,
                customer_name:
                    cartDetails?.client_name || cartDetails?.clientName || undefined,
                customer_phone:
                    cartDetails?.client_pin || cartDetails?.clientPin || undefined,
                customer_email: cartDetails?.client_email || undefined,
                line_items: buildLineItems(),
                subtotal,
                discount: cartDetails?.discount || 0,
                discount_type: cartDetails?.discount_type || undefined,
                discount_amount: discountAmount,
                total_vat_amount: totalVatAmount,
                grand_total: grandTotal,
                vat_mode: vatMode,
                reason: opts.reason,
            };

            const result = await savePrintedDocument(payload);

            if (result) {
                // Refresh local status
                await refreshStatus();

                if (result.is_reprint) {
                    message.success(
                        result.prints_remaining !== null
                            ? `Reprint recorded. ${result.prints_remaining} print${result.prints_remaining !== 1 ? "s" : ""} remaining.`
                            : "Reprint recorded."
                    );
                }
            }

            return result;
        },
        [shopId, orderNo, documentType, cartDetails, data, subtotal, totalVatAmount, grandTotal, vatMode, user, refreshStatus]
    );

    const canPrint = printStatus === null ? true : printStatus.can_print;
    const isReprint = printStatus?.is_reprint || false;
    const printsRemaining = printStatus?.prints_remaining ?? null;

    return {
        canPrint,
        isReprint,
        printsRemaining,
        printStatus,
        statusLoading,
        recordPrint,
        refreshStatus,
    };
}