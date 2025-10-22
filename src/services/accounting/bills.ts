import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "../request";
import { message } from "antd";
import { ACCOUNTING_BASE_URL, POS_API_KEY } from "@utils/config";

const billsUrl = `${ACCOUNTING_BASE_URL}/api/v1/bills`;

const getUser = (): any => {
    try {
        const userStr = localStorage.getItem("user");
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error("Error parsing user from localStorage:", error);
        return null;
    }
};

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

export const fetchAllBills = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(billsUrl, {
            params: {
                bill_number: data.bill_number,
                vendor: data.vendor,
                status: data.status
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const addNewBill = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.post(`${billsUrl}`, {
            ...params,
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Bill created successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const editBill = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.put(`${billsUrl}/${params?._id}`, {
            ...params.value,
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Bill updated successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const deleteBill = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.delete(`${billsUrl}/${params}`, {
            headers: getPOSHeaders(),
        });
        message.success("Bill deleted successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getBillById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${billsUrl}/${id}`, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const postBill = async (id: string, accountCodes?: {
    ap_account_code?: string;
    expense_account_code?: string;
    tax_receivable_account_code?: string;
}) => {
    try {
        const response = await axiosInstance.post(`${billsUrl}/${id}/post`, accountCodes || {}, {
            headers: getPOSHeaders(),
        });
        message.success("Bill posted successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const markBillAsPaid = async (id: string, params: ParamsType) => {
    try {
        const response = await axiosInstance.post(`${billsUrl}/${id}/mark-paid`, params, {
            headers: getPOSHeaders(),
        });
        message.success("Bill marked as paid");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const approveBill = async (id: string) => {
    try {
        const response = await axiosInstance.post(`${billsUrl}/${id}/approve`, {}, {
            headers: getPOSHeaders(),
        });
        message.success("Bill approved successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getBillStats = async (params?: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${billsUrl}/stats`, {
            params,
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getOverdueBills = async () => {
    try {
        const response = await axiosInstance.get(`${billsUrl}/overdue`, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};