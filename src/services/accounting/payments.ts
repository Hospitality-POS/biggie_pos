import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "../request";
import { message } from "antd";
import { ACCOUNTING_BASE_URL, POS_API_KEY } from "@utils/config";

const paymentsUrl = `${ACCOUNTING_BASE_URL}/api/v1/payments`;

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
    const user = getUser();

    return {
        'x-pos-request': 'true',
        'x-pos-api-key': POS_API_KEY,
        'x-user-id': user?._id || user?.id || 'pos-system',
        'x-user-name': user?.name || user?.username || 'POS User',
        'x-user-email': user?.email || 'pos@system.local'
    };
};

export const fetchAllPayments = async (data: ParamsType = {}) => {
    try {
        // Build clean params object - remove undefined values
        const params: any = {};

        if (data.payment_type) params.payment_type = data.payment_type;
        if (data.status) params.status = data.status;
        if (data.payment_method) params.payment_method = data.payment_method;
        if (data.party_id) params.party_id = data.party_id;
        if (data.start_date) params.start_date = data.start_date;
        if (data.end_date) params.end_date = data.end_date;
        if (data.search) params.search = data.search;
        if (data.payment_number) params.payment_number = data.payment_number;

        console.log('Fetching payments with params:', params); // Debug log

        const response = await axiosInstance.get(paymentsUrl, {
            params,
            headers: getPOSHeaders(),
        });

        console.log('Payment response:', response.data); // Debug log
        return response.data;
    } catch (error: any) {
        console.error('Error fetching payments:', error);
        throw new Error(error);
    }
};

export const addNewPayment = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.post(`${paymentsUrl}`, {
            ...params,
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Payment recorded successfully");
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to record payment");
        throw new Error(error);
    }
};

export const editPayment = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.put(`${paymentsUrl}/${params?._id}`, {
            ...params.value,
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Payment updated successfully");
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to update payment");
        throw new Error(error);
    }
};

export const deletePayment = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.delete(`${paymentsUrl}/${params}`, {
            headers: getPOSHeaders(),
        });
        message.success("Payment deleted successfully");
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to delete payment");
        throw new Error(error);
    }
};

export const getPaymentById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${paymentsUrl}/${id}`, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error: any) {
        throw new Error(error);
    }
};

export const voidPayment = async (id: string, reason: string) => {
    try {
        const response = await axiosInstance.post(`${paymentsUrl}/${id}/void`, {
            reason
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Payment voided successfully");
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to void payment");
        throw new Error(error);
    }
};

export const getPaymentStats = async (params?: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${paymentsUrl}/stats`, {
            params: {
                start_date: params?.start_date,
                end_date: params?.end_date,
                payment_type: params?.payment_type
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error: any) {
        throw new Error(error);
    }
};