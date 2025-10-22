import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "../request";
import { message } from "antd";
import { ACCOUNTING_BASE_URL, POS_API_KEY } from "@utils/config";


const receiptsUrl = `${ACCOUNTING_BASE_URL}/api/v1/receipts`;


const getUser = (): any => {
    try {
        const userStr = localStorage.getItem("user");
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error("Error parsing user from localStorage:", error);
        return null;
    }
};

// Helper to add POS headers with user info
const getPOSHeaders = () => {
    const user = getUser(); // Parse the JSON string first

    return {
        'x-pos-request': 'true',
        'x-pos-api-key': POS_API_KEY,
        'x-user-id': user?._id || user?.id || 'pos-system',
        'x-user-name': user?.name || user?.username || 'POS User',
        'x-user-email': user?.email || 'pos@system.local'
    };
};
export const fetchAllReceipts = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(receiptsUrl, {
            params: {
                receipt_number: data.receipt_number,
                customer: data.customer,
                status: data.status
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};
export const voidReceipt = async (id: string, reason: string) => {
    try {
        const response = await axiosInstance.post(`${receiptsUrl}/${id}/void`, { reason }, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error: any) {
        throw error;
    }
};


export const addNewReceipt = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.post(`${receiptsUrl}`, {
            ...params,
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Receipt created successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const editReceipt = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.put(`${receiptsUrl}/${params?._id}`, {
            ...params.value,
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Receipt updated successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const deleteReceipt = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.delete(`${receiptsUrl}/${params}`, {
            headers: getPOSHeaders(),
        });
        message.success("Receipt deleted successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getReceiptById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${receiptsUrl}/${id}`, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const printReceipt = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${receiptsUrl}/${id}/print`, {
            responseType: 'blob',
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};