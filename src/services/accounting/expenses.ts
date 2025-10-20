import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "../request";
import { message } from "antd";
import { ACCOUNTING_BASE_URL, POS_API_KEY } from "@utils/config";


const expensesUrl = `${ACCOUNTING_BASE_URL}/api/v1/expenses`;


const getUser = (): any => {
    try {
        const userStr = localStorage.getItem("user");
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error("Error parsing user from localStorage:", error);
        return null;
    }
};

// Get tenant from localStorage
const getTenant = () => {
    try {
        const tenantStr = localStorage.getItem('tenant');
        if (tenantStr) {
            return JSON.parse(tenantStr);
        }
        return null;
    } catch (error) {
        console.error("Error getting tenant:", error);
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

export const fetchAllExpenses = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(expensesUrl, {
            params: {
                expense_number: data.expense_number,
                category: data.category,
                status: data.status
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

// Updated to match multer configuration - similar to inventory
export const addNewExpense = async (params) => {
    try {
        const tenant = getTenant();
        const companyCode = localStorage.getItem("companyCode");

        // Check if there's a receipt file to upload
        const receiptFile = params.receiptFile;
        const hasFile = receiptFile instanceof File;

        if (hasFile) {
            // Create FormData for file upload
            const formData = new FormData();

            // Add the file using the field name that multer is configured for
            formData.append("receipt", receiptFile);

            // Add tenant information
            if (tenant) {
                formData.append('tenant', JSON.stringify(tenant));
                if (tenant.tenant_code) {
                    formData.append('tenant_code', tenant.tenant_code);
                }
            }

            // Add company code if available
            if (companyCode) {
                formData.append('companyCode', companyCode);
                formData.append('tenant_code', companyCode);
            }

            // Add all other fields (excluding already processed ones)
            const { receiptFile: _, ...otherParams } = params;

            Object.keys(otherParams).forEach(key => {
                if (otherParams[key] !== null && otherParams[key] !== undefined) {
                    if (typeof otherParams[key] === 'object' && !(otherParams[key] instanceof File)) {
                        formData.append(key, JSON.stringify(otherParams[key]));
                    } else {
                        formData.append(key, otherParams[key].toString());
                    }
                }
            });

            // Get authentication token
            const token = localStorage.getItem("user")
                ? JSON.parse(localStorage.getItem("user")).Token
                : '';

            // Set request headers
            const headers = {
                'Authorization': `Bearer ${token}`,
                ...getPOSHeaders()
            };

            if (companyCode) {
                headers['companyCode'] = companyCode;
            }

            // Make API request
            const response = await fetch(expensesUrl, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            // Process response
            const data = await response.json();

            if (!response.ok) {
                console.error("Server error response:", data);
                throw new Error(data.message || "Failed to add expense");
            }

            message.success("Expense added successfully");
            return data;
        } else {
            // No file to upload, use regular JSON request
            const { receiptFile: _, ...cleanParams } = params;

            const requestBody = {
                ...cleanParams,
                tenant,
                companyCode,
                tenant_code: companyCode || (tenant ? tenant.tenant_code : null),
            };

            const response = await axiosInstance.post(expensesUrl, requestBody, {
                headers: {
                    ...getPOSHeaders(),
                    ...(companyCode ? { 'companyCode': companyCode } : {})
                }
            });

            message.success("Expense added successfully");
            return response.data;
        }
    } catch (error) {
        console.error("Error adding expense:", error);
        if (error?.response?.status !== 403) {
            message.error("Error adding expense, Please try again");
        }
        throw new Error("Failed to add expense");
    }
};

export const editExpense = async (params) => {
    try {
        const tenant = getTenant();
        const companyCode = localStorage.getItem("companyCode");

        // Check if there's a receipt file to upload
        const receiptFile = params.value?.receiptFile;
        const hasFile = receiptFile instanceof File;

        if (hasFile) {
            // Create FormData for file upload
            const formData = new FormData();

            // Add the file using the field name that multer is configured for
            formData.append("receipt", receiptFile);

            // Add tenant information
            if (tenant) {
                formData.append('tenant', JSON.stringify(tenant));
                if (tenant.tenant_code) {
                    formData.append('tenant_code', tenant.tenant_code);
                }
            }

            // Add company code if available
            if (companyCode) {
                formData.append('companyCode', companyCode);
            }

            // Add all other fields (excluding already processed ones)
            const { receiptFile: _, ...otherValues } = params.value;

            Object.keys(otherValues).forEach(key => {
                if (otherValues[key] !== null && otherValues[key] !== undefined) {
                    if (typeof otherValues[key] === 'object' && !(otherValues[key] instanceof File)) {
                        formData.append(key, JSON.stringify(otherValues[key]));
                    } else {
                        formData.append(key, otherValues[key].toString());
                    }
                }
            });

            // Get authentication token
            const token = localStorage.getItem("user")
                ? JSON.parse(localStorage.getItem("user")).Token
                : '';

            // Set request headers
            const headers = {
                'Authorization': `Bearer ${token}`,
                ...getPOSHeaders()
            };

            if (companyCode) {
                headers['companyCode'] = companyCode;
            }

            // Make API request
            const response = await fetch(`${expensesUrl}/${params._id}`, {
                method: 'PUT',
                headers: headers,
                body: formData
            });

            // Process response
            const data = await response.json();

            if (!response.ok) {
                console.error("Server error response:", data);
                throw new Error(data.message || "Failed to update expense");
            }

            message.success("Expense updated successfully");
            return data;
        } else {
            // No file to upload, use regular JSON request
            const { receiptFile: _, ...cleanValues } = params.value || {};

            const requestBody = {
                ...cleanValues,
                tenant,
                companyCode,
                tenant_code: companyCode || (tenant ? tenant.tenant_code : null),
            };

            const response = await axiosInstance.put(`${expensesUrl}/${params._id}`, requestBody, {
                headers: {
                    ...getPOSHeaders(),
                    ...(companyCode ? { 'companyCode': companyCode } : {})
                }
            });

            message.success("Expense updated successfully");
            return response.data;
        }
    } catch (error) {
        console.error("Error updating expense:", error);
        if (error?.response?.status !== 403) {
            message.error("Error updating expense");
        }
        throw new Error("Failed to update expense");
    }
};

export const deleteExpense = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.delete(`${expensesUrl}/${params}`, {
            headers: getPOSHeaders(),
        });
        message.success("Expense deleted successfully");
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};

export const getExpenseById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${expensesUrl}/${id}`, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};