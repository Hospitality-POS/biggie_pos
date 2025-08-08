import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const url = `${BASE_URL}/purchase-orders`;

export const fetchAllPurchaseOrders = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(url, {
            params: {
                status: data.status,
                po_number: data.po_number,
                shop_id: data.shop_id,
                supplier_id: data.supplier_id
            },
        });
        console.log("Fetched purchase orders:", response.data);
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const addNewPurchaseOrder = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.post(url, {
            ...params,
            supplier_id: params.supplier_id?.value || params.supplier_id,
            created_by: params.created_by?.value || params.created_by,
            po_items: params.po_items?.map((item: any) => ({
                inventory_id: item?.inventory_id?.value || item?.inventory_id,
                unit_id: item?.unit_id?.value || item?.unit_id,
                quantity_ordered: item.quantity_ordered,
                unit_price: item.unit_price,
                notes: item.notes,
            })),
        });
        message.success("Purchase order created successfully");
        return response.data;
    } catch (error) {
        if (error?.response?.status != 403) {
            message.error("Error creating purchase order");
        }
        throw new Error(error);
    }
};

export const editPurchaseOrder = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.put(`${url}/${params?._id}`, {
            ...params.values,
            supplier_id: params.values.supplier_id?.value || params.values.supplier_id,
            created_by: params.values.created_by?.value || params.values.created_by,
            po_items: params?.values?.po_items?.map((item: any) => ({
                inventory_id: item?.inventory_id?.value || item?.inventory_id,
                unit_id: item?.unit_id?.value || item?.unit_id,
                quantity_ordered: item.quantity_ordered,
                unit_price: item.unit_price,
                notes: item.notes,
            })),
        });
        message.success("Purchase order updated successfully");
        return response.data;
    } catch (error) {
        if (error?.response?.status != 403) {
            message.error("Error updating purchase order");
        }
        throw new Error(error);
    }
};

export const updatePurchaseOrderStatus = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.put(`${url}/${params.id}/status`, {
            status: params.status,
        });

        return response.data;
    } catch (error) {
        if (error?.response?.status != 403) {
            message.error("Error updating purchase order status");
        }
        throw new Error(error);
    }
};

export const getPurchaseOrderById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${url}/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const createDeliveryFromPO = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.post(`${url}/${params.purchase_order_id}/delivery`, {
            delivered_by: params.delivered_by,
            received_by: params.received_by?.value || params.received_by,
            delivery_notes: params.delivery_notes,
            delivery_items: params.delivery_items?.map((item: any) => ({
                inventory_id: item?.inventory_id?.value || item?.inventory_id,
                quantity_delivered: item.quantity_delivered,
            })),
        });

        return response.data;
    } catch (error) {
        if (error?.response?.status != 403) {
            message.error("Error creating delivery from purchase order");
        }
        throw new Error(error);
    }
};

export const getPendingItemsForPO = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${url}/${id}/pending-items`);
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const deletePurchaseOrder = async (id: string) => {
    try {
        const response = await axiosInstance.delete(`${url}/${id}`);
        message.success("Purchase order deleted successfully");
        return response.data;
    } catch (error) {
        if (error?.response?.status != 403) {
            message.error("Error deleting purchase order");
        }
        throw new Error(error);
    }
};

export const getDeliveriesByPurchaseOrder = async (purchase_order_id: string) => {
    try {
        const response = await axiosInstance.get(`${BASE_URL}/deliveries/purchase-order/${purchase_order_id}`);
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};