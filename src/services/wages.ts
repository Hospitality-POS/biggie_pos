import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "./request";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";

const wageUrl = `${BASE_URL}/wages`;

const { headers } = SetBearerHeaderToken();

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

// Helper function to normalize ID fields
const normalizeId = (id: any): string => {
    if (!id) return id;
    if (typeof id === 'string') return id;
    if (typeof id === 'object' && id._id) return id._id;
    if (typeof id === 'object' && id.value) return id.value;
    return id;
};

export const fetchAllWages = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(wageUrl, {
            params: {
                user_id: data?.user_id,
                wageType: data?.wageType,
                isActive: data?.isActive,
                page: data?.page,
                limit: data?.limit,
                // ✅ search param for backend filtering
                search: data?.search,
            },
        });

        return response.data;
    } catch (error) {
        throw new Error(error?.message);
    }
};

export const fetchWagesByShopId = async () => {
    try {
        const shopId = localStorage.getItem("shopId");
        if (!shopId) {
            throw new Error("Shop ID is required");
        }
        const url = `${wageUrl}/shop/${shopId}`;
        const response = await axiosInstance.get(url);
        return response.data;
    } catch (error) {
        throw new Error(error?.message);
    }
};

export const fetchActiveWageByUser = async (userId: string) => {
    try {
        const url = `${wageUrl}/user/${userId}/active`;
        const response = await axiosInstance.get(url);
        return response.data;
    } catch (error) {
        throw new Error(error?.message);
    }
};

export const fetchWageHistoryByUser = async (userId: string, data?: ParamsType) => {
    try {
        const url = `${wageUrl}/user/${userId}/history`;
        const response = await axiosInstance.get(url, {
            params: { page: data?.page, limit: data?.limit }
        });
        return response.data;
    } catch (error) {
        throw new Error(error?.message);
    }
};

export const calculateShopPayroll = async (shopIdParam?: string, wageType?: string) => {
    try {
        const currentShopId = shopIdParam || localStorage.getItem("shopId");

        if (!currentShopId) {
            throw new Error("Shop ID is required");
        }

        const url = `${wageUrl}/shop/${currentShopId}/payroll`;
        const response = await axiosInstance.get(url, {
            params: wageType ? { wageType } : {}
        });
        return response.data;
    } catch (error) {
        throw new Error(error?.message);
    }
};

export const updateWage = async (data: ParamsType) => {
    try {
        const tenant = getTenant();
        const companyCode = localStorage.getItem("companyCode");

        // ✅ Only normalize user_id — wages are not shop-scoped
        const user_id = normalizeId(data.value.user_id);

        // ✅ Strip shop_id out entirely — backend should not require it for wages
        const { shop_id: _removed, ...restValue } = data.value;

        const requestBody = {
            ...restValue,
            user_id,
            tenant,
            companyCode,
            tenant_code: companyCode || (tenant ? tenant.tenant_code : null)
        };

        const response = await axiosInstance.put(`${wageUrl}/${data._id}`, requestBody, {
            headers: {
                ...headers,
                ...(companyCode ? { 'companyCode': companyCode } : {})
            }
        });

        // message.success("Wage updated successfully");
        return response.data;
    } catch (error: any) {
        console.error("Error updating wage:", error);
        if (error?.response?.status !== 403) {
            message.error("Failed to update wage");
        }
        throw new Error(error?.message || "Failed to update wage");
    }
};

export const addWage = async (wageData: any) => {
    try {
        const tenant = getTenant();
        const companyCode = localStorage.getItem("companyCode");

        // ✅ Only normalize user_id — wages are not shop-scoped
        const user_id = normalizeId(wageData.user_id);

        if (!user_id) {
            throw new Error("User ID is required");
        }

        // ✅ Strip shop_id out entirely
        const { shop_id: _removed, ...restData } = wageData;

        const requestBody = {
            ...restData,
            user_id,
            tenant,
            companyCode,
            tenant_code: companyCode || (tenant ? tenant.tenant_code : null)
        };

        console.log('Sending wage data:', requestBody);

        const response = await axiosInstance.post(`${wageUrl}`, requestBody, {
            headers: {
                ...headers,
                ...(companyCode ? { 'companyCode': companyCode } : {})
            }
        });

        // message.success("Wage added successfully");
        return response.data;
    } catch (error: any) {
        console.error("Error adding wage:", error);
        if (error?.response?.status !== 403) {
            message.error(error?.response?.data?.message || "Failed to add wage");
        }
        throw new Error(error?.message || "Failed to add wage");
    }
};

export const addWagesBulk = async (wagesData: any[]) => {
    try {
        const tenant = getTenant();
        const companyCode = localStorage.getItem("companyCode");

        // ✅ Normalize user_id only, strip shop_id for each wage
        const requestBody = wagesData.map(wage => {
            const user_id = normalizeId(wage.user_id);
            const { shop_id: _removed, ...restWage } = wage;

            return {
                ...restWage,
                user_id,
                tenant,
                companyCode,
                tenant_code: companyCode || (tenant ? tenant.tenant_code : null)
            };
        });

        const response = await axiosInstance.post(`${wageUrl}/bulk`, requestBody, {
            headers: {
                ...headers,
                ...(companyCode ? { 'companyCode': companyCode } : {})
            }
        });

        // message.success("Wages added successfully");
        return response.data;
    } catch (error: any) {
        console.error("Error adding wages:", error);
        if (error?.response?.status !== 403) {
            message.error("Failed to add wages");
        }
        throw new Error(error?.message || "Failed to add wages");
    }
};

export const deactivateWage = async (id: string) => {
    try {
        const response = await axiosInstance.put(`${wageUrl}/${id}/deactivate`);
        // message.success("Wage deactivated successfully");
        return response.data;
    } catch (error: any) {
        console.error("Error deactivating wage:", error);
        if (error?.response?.status !== 403) {
            message.error("Failed to deactivate wage");
        }
        throw new Error(error?.message || "Failed to deactivate wage");
    }
};

export const fetchWageById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${wageUrl}/${id}`);
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Error fetching wage");
    }
};

export const deleteWageById = async (id: string) => {
    try {
        const response = await axiosInstance.delete(`${wageUrl}/${id}`);
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Error deleting wage");
    }
};