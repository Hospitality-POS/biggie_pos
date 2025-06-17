import { message } from "antd";
import axiosInstance from "./request";

const tenantUrl = `https://api.admin.reliatech.co.ke/api/tenants`;

interface Tenant {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    tenant_code?: string;
    subscription_status?: 'pending_approval' | 'active' | 'suspended' | 'terminated';
    subscription_id?: string | {
        _id: string;
        name: string;
        price: number;
    };
    business_type?: string | {
        _id: string;
        name: string;
    };
    business_type_name?: string;
    subscription_cycle?: 'Monthly' | 'Quarterly' | 'Yearly';
    next_billing_date?: string;
    db_host?: string;
    db_password?: string;
    db_user?: string;
    db_name?: string;
    additional_info?: string;
    business_size?: string;
    color_scheme?: {
        primary?: string;
        secondary?: string;
        accent?: string;
        background?: string;
        text?: string;
    };
    tenant_logo?: {
        url?: string;
        public_id?: string;
        filename?: string;
        mimetype?: string;
        size?: number;
    };
    primary_color?: string;
    __v?: number;
    createdAt?: string;
    updatedAt?: string;
}

interface UpdateTenantData {
    name?: string;
    email?: string;
    phone?: string;
    subscription_id?: string;
    color_scheme?: {
        primary?: string;
        secondary?: string;
        accent?: string;
        background?: string;
        text?: string;
    };
    primary_color?: string;
}

export const getCurrentTenantId = (): string | null => {
    try {
        const storedTenant = localStorage.getItem("tenant");
        if (storedTenant) {
            const tenant = JSON.parse(storedTenant);
            return tenant._id || tenant.id || null;
        }
        return null;
    } catch (error) {
        console.warn("Failed to get tenant ID from localStorage:", error);
        return null;
    }
};

export const useTenantUpdates = (callback: (tenant: Tenant) => void) => {
    const handleTenantUpdate = (event: CustomEvent) => {
        callback(event.detail);
    };

    window.addEventListener('tenantUpdated', handleTenantUpdate as EventListener);

    return () => {
        window.removeEventListener('tenantUpdated', handleTenantUpdate as EventListener);
    };
};

export const fetchTenantDetails = async (id?: string) => {
    try {
        let tenantId = id;
        if (!tenantId) {
            tenantId = getCurrentTenantId();
            if (!tenantId) {
                throw new Error("No tenant information found in localStorage");
            }
        }

        const response = await axiosInstance.get(`${tenantUrl}/${tenantId}`);
        return response.data;
    } catch (error) {
        console.log(error);
        throw error;
    }
};

export const updateTenant = async (id: string, tenantData: UpdateTenantData | FormData) => {
    try {
        const response = await axiosInstance.put(`${tenantUrl}/${id}`, tenantData);

        try {
            const freshTenantData = await fetchTenantDetails(id);
            if (freshTenantData?.data) {
                localStorage.setItem("tenant", JSON.stringify(freshTenantData.data));

                window.dispatchEvent(new CustomEvent('tenantUpdated', {
                    detail: freshTenantData.data
                }));
            }
        } catch (fetchError) {
            console.warn("Failed to fetch fresh tenant data after update:", fetchError);

            if (!(tenantData instanceof FormData)) {
                const storedTenant = localStorage.getItem("tenant");
                if (storedTenant) {
                    try {
                        const tenant = JSON.parse(storedTenant);

                        const updatedTenant = {
                            ...tenant,
                            ...tenantData,
                            ...(tenantData.color_scheme && { color_scheme: tenantData.color_scheme }),
                            ...(tenantData.primary_color && { primary_color: tenantData.primary_color }),
                            updatedAt: new Date().toISOString()
                        };

                        if (tenantData.color_scheme?.primary) {
                            updatedTenant.primary_color = tenantData.color_scheme.primary;
                        }

                        localStorage.setItem("tenant", JSON.stringify(updatedTenant));

                        window.dispatchEvent(new CustomEvent('tenantUpdated', {
                            detail: updatedTenant
                        }));
                    } catch (parseError) {
                        console.warn("Failed to parse stored tenant data:", parseError);
                    }
                }
            }
        }

        message.success("Tenant updated successfully");

        setTimeout(() => {
            window.location.replace(window.location.href);
        }, 1000);

        return response.data;
    } catch (error: any) {
        if (error?.response?.status !== 403) {
            message.error("Failed to update tenant");
        }
        throw error;
    }
};