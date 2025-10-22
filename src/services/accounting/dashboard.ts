import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "../request";
import { ACCOUNTING_BASE_URL, POS_API_KEY } from "@utils/config";


const dashboardUrl = `${ACCOUNTING_BASE_URL}/api/v1/dashboard`;

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

export const getAccountingDashboardData = async (params?: ParamsType) => {
    try {
        const response = await axiosInstance.get(dashboardUrl, {
            params: {
                start_date: params?.start_date,
                end_date: params?.end_date
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getRecentTransactions = async (limit: number = 10) => {
    try {
        const response = await axiosInstance.get(`${dashboardUrl}/recent-transactions`, {
            params: { limit },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getCashFlowData = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${dashboardUrl}/cash-flow`, {
            params: {
                start_date: params.start_date,
                end_date: params.end_date
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getProfitLossTrend = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${dashboardUrl}/profit-loss-trend`, {
            params: {
                start_date: params.start_date,
                end_date: params.end_date
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};