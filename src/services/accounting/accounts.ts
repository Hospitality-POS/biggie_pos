import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "../request";
import { message } from "antd";
import { ACCOUNTING_BASE_URL, POS_API_KEY } from "@utils/config";


const accountsUrl = `${ACCOUNTING_BASE_URL}/api/v1/accounts`;


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
export const fetchAllAccounts = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(accountsUrl, {
            params: {
                account_name: data.account_name,
                account_type: data.account_type,
                status: data.status
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const addNewAccount = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.post(`${accountsUrl}`, {
            ...params,
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Account created successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const editAccount = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.put(`${accountsUrl}/${params?._id}`, {
            ...params.value,
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Account updated successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const deleteAccount = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.delete(`${accountsUrl}/${params}`, {
            headers: getPOSHeaders(),
        });
        message.success("Account deleted successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getAccountById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${accountsUrl}/${id}`, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getAccountBalance = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${accountsUrl}/${id}/balance`, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};