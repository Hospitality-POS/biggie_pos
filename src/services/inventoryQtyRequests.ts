import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

// Quantity changes held for admin approval. With the shop setting
// inventory_qty_edit_requires_approval on, a non-admin's quantity edit
// saves as one of these instead of changing stock.

const url = `${BASE_URL}/product-inventory/qty-requests`;

export type QtyRequestStatus = "Pending" | "Approved" | "Rejected";

export interface QtyRequestVariantChange {
    variant_id?: string | null;
    name: string;
    old_quantity: number;
    new_quantity: number;
}

export interface QtyRequest {
    _id: string;
    inventory_id:
        | string
        | {
            _id: string;
            name: string;
            quantity: number;
            has_variants?: boolean;
            variants?: { name: string; quantity: number }[];
        }
        | null;
    inventory_name?: string;
    source: "edit" | "import" | "variant";
    old_quantity: number | null;
    new_quantity: number | null;
    variant_changes: QtyRequestVariantChange[];
    reason?: string;
    status: QtyRequestStatus;
    requested_by_name?: string;
    reviewed_by_name?: string;
    reviewed_at?: string;
    review_note?: string;
    createdAt: string;
}

type ApiError = { response?: { data?: { error?: string; message?: string } } };
const errorText = (e: unknown, fallback: string) => {
    const data = (e as ApiError)?.response?.data;
    return data?.error || data?.message || fallback;
};

export const fetchQtyRequests = async (params: { shop_id?: string; inventory_id?: string; status?: QtyRequestStatus | "all" }) => {
    const response = await axiosInstance.get(url, { params });
    return response.data as { requests: QtyRequest[]; total: number };
};

export const countPendingQtyRequests = async (shop_id?: string) => {
    const response = await axiosInstance.get(`${url}/count`, { params: { shop_id } });
    return (response.data?.count || 0) as number;
};

export const approveQtyRequest = async (id: string, note?: string) => {
    try {
        const response = await axiosInstance.patch(`${url}/${id}/approve`, { note });
        message.success("Quantity change approved");
        return response.data;
    } catch (e) {
        message.error(errorText(e, "Couldn't approve the quantity change"));
        throw e;
    }
};

export const rejectQtyRequest = async (id: string, note?: string) => {
    try {
        const response = await axiosInstance.patch(`${url}/${id}/reject`, { note });
        message.success("Quantity change rejected");
        return response.data;
    } catch (e) {
        message.error(errorText(e, "Couldn't reject the quantity change"));
        throw e;
    }
};
