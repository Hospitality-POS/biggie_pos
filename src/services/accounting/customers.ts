import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "../request";
import { message } from "antd";
import { ACCOUNTING_BASE_URL, POS_API_KEY } from "@utils/config";


const customersUrl = `${ACCOUNTING_BASE_URL}/api/v1/customers`;


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

export const fetchAllCustomers = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(customersUrl, {
            params: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                status: data.status
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const addNewCustomer = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.post(`${customersUrl}`, {
            ...params,
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Customer added successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const editCustomer = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.put(`${customersUrl}/${params?._id}`, {
            ...params.value,
        }, {
            headers: getPOSHeaders(),
        });
        message.success("Customer updated successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const deleteCustomer = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.delete(`${customersUrl}/${params}`, {
            headers: getPOSHeaders(),
        });
        message.success("Customer deleted successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getCustomerById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${customersUrl}/${id}`, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getCustomerStatement = async (id: string, params?: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${customersUrl}/${id}/statement`, {
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