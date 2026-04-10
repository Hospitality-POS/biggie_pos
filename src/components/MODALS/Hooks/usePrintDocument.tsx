import { useEffect, useState, useCallback, useRef } from "react";
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

export async function savePrintedDocument(
    payload: SavePrintPayload
): Promise<SavePrintResult | null> {
    try {
        console.log("[savePrintedDocument] POST →", `${BASE_URL}/printed-documents`);
        console.log("[savePrintedDocument] Payload:", JSON.stringify(payload, null, 2));

        const { data } = await axiosInstance.post(
            `${BASE_URL}/printed-documents`,
            payload
        );

        console.log("[savePrintedDocument] Response:", data);
        return data;
    } catch (error: any) {
        console.error("[savePrintedDocument] Error:", {
            message: error?.message,
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            responseData: error?.response?.data,
        });

        if (error?.response?.status === 404) {
            message.error("Print endpoint not found — check backend route configuration.");
        } else if (error?.response?.status === 403) {
            message.error(error?.response?.data?.message || "Print not allowed for this document.");
        } else if (error?.response?.status === 500) {
            message.error("Server error while saving print record.");
        } else if (error?.response?.status === 400) {
            message.error(error?.response?.data?.message || "Invalid print data sent to server.");
        } else {
            message.error(error?.response?.data?.message || "Failed to save print record.");
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
    const { subtotal, totalVatAmount, grandTotal } = useAppSelector((s) => s.cart);
    const { user } = useAppSelector((s) => s.auth);

    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const vatMode: "INCLUSIVE" | "EXCLUSIVE" = tenant?.vat_pricing_mode || "EXCLUSIVE";

    const shopId: string | undefined =
        cartDetails?.shop_id?._id ||
        cartDetails?.shop_id ||
        user?.shop_id;

    const [printStatus, setPrintStatus] = useState<PrintStatusResult | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);

    // ── Refs: keep latest values without causing refreshStatus to be recreated.
    // This is the key fix — without these, refreshStatus changes identity every
    // render, which re-triggers the useEffect, causing an infinite fetch loop
    // that floods the backend and causes requests to cancel each other.
    const shopIdRef = useRef(shopId);
    const orderNoRef = useRef(orderNo);
    const documentTypeRef = useRef(documentType);
    const subtotalRef = useRef(subtotal);
    const totalVatRef = useRef(totalVatAmount);
    const grandTotalRef = useRef(grandTotal);
    const vatModeRef = useRef(vatMode);
    const userRef = useRef(user);
    const cartDetailsRef = useRef(cartDetails);
    const dataRef = useRef(data);

    // Sync refs every render — O(1), no side-effects
    useEffect(() => { shopIdRef.current = shopId; }, [shopId]);
    useEffect(() => { orderNoRef.current = orderNo; }, [orderNo]);
    useEffect(() => { documentTypeRef.current = documentType; }, [documentType]);
    useEffect(() => { subtotalRef.current = subtotal; }, [subtotal]);
    useEffect(() => { totalVatRef.current = totalVatAmount; }, [totalVatAmount]);
    useEffect(() => { grandTotalRef.current = grandTotal; }, [grandTotal]);
    useEffect(() => { vatModeRef.current = vatMode; }, [vatMode]);
    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { cartDetailsRef.current = cartDetails; }, [cartDetails]);
    useEffect(() => { dataRef.current = data; }, [data]);

    // refreshStatus is stable (empty dep array). It reads current values from
    // refs so it is always up-to-date without needing to be recreated.
    const refreshStatus = useCallback(async () => {
        const sid = shopIdRef.current;
        const ono = orderNoRef.current;
        const dtype = documentTypeRef.current;
        if (!sid || !ono) return;
        setStatusLoading(true);
        try {
            const status = await checkPrintStatus(sid, ono, dtype);
            setPrintStatus(status);
        } finally {
            setStatusLoading(false);
        }
    }, []); // ← intentionally empty — stability is the point

    // Re-fetch status when the key identifiers actually change
    useEffect(() => {
        if (autoCheck && shopId && orderNo) {
            refreshStatus();
        }
        // documentType is listed so switching Bill→Receipt re-checks limits
    }, [autoCheck, shopId, orderNo, documentType]); // eslint-disable-line react-hooks/exhaustive-deps

    const buildLineItems = useCallback((): PrintedLineItem[] => {
        const items = dataRef.current;
        if (!items?.length) return [];
        return items.map((item: any) => {
            const lineTotal = item.price ?? 0;
            const qty = item.quantity ?? 1;
            return {
                product_id: item.product_id?._id || item.product_id,
                product_name: item.product_id?.name || item.name || "Unknown",
                quantity: qty,
                unit_price: qty > 0 ? parseFloat((lineTotal / qty).toFixed(2)) : lineTotal,
                line_total: lineTotal,
                vat_amount: item.vat_amount ?? 0,
                vat_type: item.vat_type || "STANDARD",
                category_name: item.category_id?.name || item.category?.name || undefined,
            };
        });
    }, []); // reads from dataRef — stable

    const resolveDiscountAmount = useCallback((): number => {
        const cd = cartDetailsRef.current;
        const sub = subtotalRef.current;
        if (!cd?.discount || cd.discount <= 0) return 0;
        if (cd.discount_type === "percentage") {
            return parseFloat(((cd.discount / 100) * sub).toFixed(2));
        }
        return Number(cd.discount);
    }, []); // reads from refs — stable

    const recordPrint = useCallback(async (opts: {
        print_format?: PrintFormat;
        reason?: string;
        invoice_id?: string;
        order_id?: string;
    } = {}): Promise<SavePrintResult | null> => {
        // Read all current values from refs at call-time
        const sid = shopIdRef.current || localStorage.getItem("shopId");
        const ono = orderNoRef.current;
        const dtype = documentTypeRef.current;
        const cd = cartDetailsRef.current;
        const u = userRef.current;
        const sub = subtotalRef.current;
        const vat = totalVatRef.current;
        const grand = grandTotalRef.current;
        const vm = vatModeRef.current;

        console.log('mint leaves', sid, ono)

        if (!sid || !ono) {
            console.warn("[recordPrint] Missing shopId or orderNo — aborting save");
            message.error("Cannot save print: missing shop or order information.");
            return null;
        }

        const discountAmount = resolveDiscountAmount();

        const payload: SavePrintPayload = {
            shop_id: sid,
            cart_id: cd?._id || cd?.id || undefined,
            order_id: opts.order_id || undefined,
            invoice_id: opts.invoice_id || undefined,
            order_no: ono,
            document_type: dtype,
            print_format: opts.print_format || "thermal",
            printed_by: u?._id || undefined,
            served_by: cd?.served_by?._id || cd?.created_by?._id || undefined,
            customer_id: cd?.customer_id || undefined,
            customer_name: cd?.client_name || cd?.clientName || undefined,
            customer_phone: cd?.client_pin || cd?.clientPin || undefined,
            customer_email: cd?.client_email || undefined,
            line_items: buildLineItems(),
            subtotal: sub,
            discount: cd?.discount || 0,
            discount_type: cd?.discount_type || undefined,
            discount_amount: discountAmount,
            total_vat_amount: vat,
            grand_total: grand,
            vat_mode: vm,
            reason: opts.reason,
        };

        console.log("[recordPrint] Payload →", JSON.stringify(payload, null, 2));

        const result = await savePrintedDocument(payload);

        if (result) {
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
    }, [buildLineItems, resolveDiscountAmount, refreshStatus]); // all other values come from refs

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