import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "../request";
import { message } from "antd";
import { ACCOUNTING_BASE_URL, POS_API_KEY } from "@utils/config";


const reconciliationUrl = `${ACCOUNTING_BASE_URL}/api/v1/reconciliation`;


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

export const fetchAllReconciliations = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(reconciliationUrl, {
            params: {
                account_id: data.account_id,
                status: data.status,
                date: data.date
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const addNewReconciliation = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.post(`${reconciliationUrl}`, {
            ...params,
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Reconciliation started successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const updateReconciliation = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.put(`${reconciliationUrl}/${params?._id}`, {
            ...params.value,
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Reconciliation updated successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const completeReconciliation = async (id: string) => {
    try {
        const response = await axiosInstance.post(`${reconciliationUrl}/${id}/complete`, {}, {
            headers: getPOSHeaders(),
        });
        message.success("Reconciliation completed successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getReconciliationById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${reconciliationUrl}/${id}`, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getUnreconciledTransactions = async (account_id: string) => {
    try {
        const response = await axiosInstance.get(`${reconciliationUrl}/unreconciled/${account_id}`, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};
export const reloadReconciliationItems = async (id: string) => {
    try {
        const response = await axiosInstance.post(`${reconciliationUrl}/${id}/reload-items`, {}, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error: any) {
        throw error;
    }
};
export const clearReconciliationItem = async (reconciliationId: string, itemId: string) => {
    try {
        const response = await axiosInstance.post(
            `${reconciliationUrl}/${reconciliationId}/clear`,
            { itemId },
            { headers: getPOSHeaders() }
        );
        return response.data;
    } catch (error: any) {
        throw error;
    }
};

export const unclearReconciliationItem = async (reconciliationId: string, itemId: string) => {
    try {
        const response = await axiosInstance.post(
            `${reconciliationUrl}/${reconciliationId}/unclear`,
            { itemId },
            { headers: getPOSHeaders() }
        );
        return response.data;
    } catch (error: any) {
        throw error;
    }
};
export const matchTransaction = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.post(`${reconciliationUrl}/match`, params, {
            headers: getPOSHeaders(),
        });
        message.success("Transaction matched successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};