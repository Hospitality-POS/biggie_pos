import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "../request";
import { message } from "antd";
import { ACCOUNTING_BASE_URL, POS_API_KEY } from "@utils/config";

const invoicesUrl = `${ACCOUNTING_BASE_URL}/api/v1/invoices`;

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

export const fetchAllInvoices = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(invoicesUrl, {
            params: {
                invoice_number: data.invoice_number,
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

export const addNewInvoice = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.post(`${invoicesUrl}`, {
            ...params,
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Invoice created successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const editInvoice = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.put(`${invoicesUrl}/${params?._id}`, {
            ...params.value,
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Invoice updated successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const deleteInvoice = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.delete(`${invoicesUrl}/${params}`, {
            headers: getPOSHeaders(),
        });
        message.success("Invoice deleted successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getInvoiceById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${invoicesUrl}/${id}`, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const sendInvoice = async (id: string, params?: {
    message?: string;
    cc?: string[];
}) => {
    try {
        const response = await axiosInstance.post(`${invoicesUrl}/${id}/send`, params || {}, {
            headers: getPOSHeaders(),
        });
        message.success("Invoice sent successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const postInvoice = async (id: string, accountCodes?: {
    ar_account_code?: string;
    revenue_account_code?: string;
    tax_payable_account_code?: string;
}) => {
    try {
        const response = await axiosInstance.post(`${invoicesUrl}/${id}/post`, accountCodes || {}, {
            headers: getPOSHeaders(),
        });
        message.success("Invoice posted successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const markInvoiceAsPaid = async (id: string, params: ParamsType) => {
    try {
        const response = await axiosInstance.post(`${invoicesUrl}/${id}/mark-paid`, params, {
            headers: getPOSHeaders(),
        });
        message.success("Invoice marked as paid");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getOverdueInvoices = async () => {
    try {
        const response = await axiosInstance.get(`${invoicesUrl}/overdue`, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const sendInvoiceReminder = async (id: string) => {
    try {
        const response = await axiosInstance.post(`${invoicesUrl}/${id}/reminder`, {}, {
            headers: getPOSHeaders(),
        });
        message.success("Reminder sent successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getInvoiceStats = async (params?: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${invoicesUrl}/stats`, {
            params,
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};