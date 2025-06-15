import { message } from "antd";
import axiosInstance from "./request";

const tenantUrl = `https://api.admin.reliatech.co.ke/api/tenants`;
//const tenantUrl = `http://localhost:3010/api/tenants`;

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

// Helper function to get current tenant ID from localStorage
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

// Helper function to listen for tenant updates
export const useTenantUpdates = (callback: (tenant: Tenant) => void) => {
    const handleTenantUpdate = (event: CustomEvent) => {
        callback(event.detail);
    };

    // Add event listener
    window.addEventListener('tenantUpdated', handleTenantUpdate as EventListener);

    // Return cleanup function
    return () => {
        window.removeEventListener('tenantUpdated', handleTenantUpdate as EventListener);
    };
};

export const fetchTenantDetails = async (id?: string) => {
    try {
        // If no ID provided, get current tenant ID from localStorage
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
        // The axiosInstance will automatically add auth headers and company code
        const response = await axiosInstance.put(`${tenantUrl}/${id}`, tenantData);

        // Always fetch fresh tenant data after successful update
        try {
            const freshTenantData = await fetchTenantDetails(id);
            if (freshTenantData?.data) {
                // Update localStorage with fresh data
                localStorage.setItem("tenant", JSON.stringify(freshTenantData.data));

                // Trigger a custom event to notify other components of the update
                window.dispatchEvent(new CustomEvent('tenantUpdated', {
                    detail: freshTenantData.data
                }));
            }
        } catch (fetchError) {
            console.warn("Failed to fetch fresh tenant data after update:", fetchError);

            // Fallback: If fetching fresh data fails and it's not FormData, update manually
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

                        // Also update primary_color if color_scheme.primary is updated
                        if (tenantData.color_scheme?.primary) {
                            updatedTenant.primary_color = tenantData.color_scheme.primary;
                        }

                        localStorage.setItem("tenant", JSON.stringify(updatedTenant));

                        // Trigger event for fallback update too
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
        return response.data;
    } catch (error: any) {
        if (error?.response?.status !== 403) {
            message.error("Failed to update tenant");
        }
        throw error;
    }
};