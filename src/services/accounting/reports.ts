import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "../request";
import { message } from "antd";
import { ACCOUNTING_BASE_URL, POS_API_KEY } from "@utils/config";


const reportsUrl = `${ACCOUNTING_BASE_URL}/api/v1/reports`;

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

export const getProfitLossReport = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${reportsUrl}/profit-loss`, {
            params: {
                start_date: params.start_date,
                end_date: params.end_date,
                comparison: params.comparison
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getBalanceSheetReport = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${reportsUrl}/balance-sheet`, {
            params: {
                as_of_date: params.as_of_date,
                comparison: params.comparison
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getCashFlowReport = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${reportsUrl}/cash-flow`, {
            params: {
                start_date: params.start_date,
                end_date: params.end_date,
                method: params.method // direct or indirect
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getTrialBalanceReport = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${reportsUrl}/trial-balance`, {
            params: {
                as_of_date: params.as_of_date
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getARAgingReport = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${reportsUrl}/ar-aging`, {
            params: {
                as_of_date: params.as_of_date,
                aging_method: params.aging_method // current, 30, 60, 90, 90+
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getAPAgingReport = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${reportsUrl}/ap-aging`, {
            params: {
                as_of_date: params.as_of_date,
                aging_method: params.aging_method
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getTaxSummaryReport = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${reportsUrl}/tax-summary`, {
            params: {
                start_date: params.start_date,
                end_date: params.end_date,
                tax_type: params.tax_type
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const exportReport = async (reportType: string, params: ParamsType, format: 'pdf' | 'excel' | 'csv') => {
    try {
        const response = await axiosInstance.get(`${reportsUrl}/${reportType}/export`, {
            params: { ...params, format },
            responseType: 'blob',
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        message.error("Failed to export report");
        throw new Error(error);
    }
};