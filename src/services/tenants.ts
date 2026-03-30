import { message } from "antd";
import axiosInstance from "./request";
import { ACCOUNTING_BASE_URL, TENANT_BASE_URL, POS_API_KEY } from "@utils/config";

const tenantUrl = `${TENANT_BASE_URL}/api/tenants`;
const accountingUrl = `${ACCOUNTING_BASE_URL}/api/v1/tenants`;

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
    modules?: {
        pos?: boolean;
        accounting?: boolean;
        inventory?: boolean;
        reports?: boolean;
        payroll?: boolean;
        crm?: boolean;
    };
    accounting_database?: {
        enabled?: boolean;
        db_name?: string;
        db_host?: string;
        db_user?: string;
        db_password?: string;
        connection_params?: string;
        accounting_code?: string;
    };
    terms_acceptance?: {
        accounting_enabled_at?: string;
        accepted_terms?: boolean;
        accepted_charges?: boolean;
    };
    bandu_settings?: {
        enabled_at?: string;
        accepted_terms?: boolean;
        accepted_charges?: boolean;
    };
    mteja_settings?: {
        enabled_at?: string;
        accepted_terms?: boolean;
        accepted_charges?: boolean;
    };
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
    modules?: {
        pos?: boolean;
        accounting?: boolean;
        inventory?: boolean;
        reports?: boolean;
        payroll?: boolean;
        crm?: boolean;
    };
    accounting_database?: {
        enabled?: boolean;
        db_name?: string;
        db_host?: string;
        db_user?: string;
        db_password?: string;
        connection_params?: string;
        accounting_code?: string;
    };
    terms_acceptance?: {
        accounting_enabled_at?: Date;
        accepted_terms?: boolean;
        accepted_charges?: boolean;
    };
}

interface EnableAccountingData {
    terms_acceptance: {
        accept_terms: boolean;
        accept_charges: boolean;
    };
}

interface EnableModuleData {
    accept_terms: boolean;
    accept_charges: boolean;
}

interface ChartOfAccountsResult {
    success: boolean;
    message: string;
    accounts_count: number;
    skipped?: boolean;
    accounts?: Array<{
        code: string;
        name: string;
        type: string;
    }>;
}

interface ReseedResponse {
    success: boolean;
    message: string;
    data: {
        tenant: {
            id: string;
            name: string;
            tenant_code: string;
        };
        accounting_database: {
            db_name: string;
        };
        chart_of_accounts: ChartOfAccountsResult;
    };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

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

const refreshTenantInStorage = async (id: string) => {
    try {
        const freshTenantData = await fetchTenantDetails(id);
        if (freshTenantData?.data) {
            localStorage.setItem("tenant", JSON.stringify(freshTenantData.data));
            window.dispatchEvent(new CustomEvent('tenantUpdated', { detail: freshTenantData.data }));
        }
    } catch (fetchError) {
        console.warn("Failed to fetch fresh tenant data:", fetchError);
    }
};

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

// ============================================
// TENANT CRUD OPERATIONS
// ============================================

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
                window.dispatchEvent(new CustomEvent('tenantUpdated', { detail: freshTenantData.data }));
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
                        window.dispatchEvent(new CustomEvent('tenantUpdated', { detail: updatedTenant }));
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

// ============================================
// ACCOUNTING MODULE FUNCTIONS
// ============================================

export const enableAccounting = async (id: string, data: EnableAccountingData) => {
    try {
        const response = await axiosInstance.post(
            `${tenantUrl}/${id}/enable-accounting`,
            data,
            { headers: getPOSHeaders() }
        );
        await refreshTenantInStorage(id);
        return response.data;
    } catch (error: any) {
        const errorMessage = error?.response?.data?.error || "Failed to enable accounting module";
        message.error(errorMessage);
        throw error;
    }
};

export const disableAccounting = async (id: string) => {
    try {
        const response = await axiosInstance.post(
            `${tenantUrl}/${id}/disable-accounting`,
            {},
            { headers: getPOSHeaders() }
        );
        await refreshTenantInStorage(id);
        return response.data;
    } catch (error: any) {
        const errorMessage = error?.response?.data?.error || "Failed to disable accounting module";
        message.error(errorMessage);
        throw error;
    }
};

export const reseedChartOfAccounts = async (id: string) => {
    try {
        const response = await axiosInstance.post(
            `${accountingUrl}/${id}/reseed-chart-of-accounts`,
            {},
            { headers: getPOSHeaders() }
        );
        message.success(
            response.data.data?.chart_of_accounts?.skipped
                ? "Chart of accounts already exists (26 accounts)"
                : `Chart of accounts created successfully! (${response.data.data?.chart_of_accounts?.accounts_count || 26} accounts)`
        );
        return response.data;
    } catch (error: any) {
        const errorMessage = error?.response?.data?.error || "Failed to reseed chart of accounts";
        message.error(errorMessage);
        throw error;
    }
};

export const getAccountingStatus = async (id: string) => {
    try {
        const response = await axiosInstance.get(
            `${tenantUrl}/${id}/accounting-status`,
            { headers: getPOSHeaders() }
        );
        return response.data;
    } catch (error: any) {
        console.error("Failed to get accounting status:", error);
        throw error;
    }
};

export const checkModuleAccess = async (id: string, module: 'pos' | 'accounting' | 'inventory' | 'hrm' | 'payroll' | 'crm') => {
    try {
        const response = await axiosInstance.get(
            `${tenantUrl}/${id}/module-access/${module}`,
            { headers: getPOSHeaders() }
        );
        return response.data;
    } catch (error: any) {
        console.error("Failed to check module access:", error);
        throw error;
    }
};

export const getTenantsWithAccounting = async () => {
    try {
        const response = await axiosInstance.get(
            `${tenantUrl}/accounting/enabled`,
            { headers: getPOSHeaders() }
        );
        return response.data;
    } catch (error: any) {
        console.error("Failed to get tenants with accounting:", error);
        throw error;
    }
};

// ============================================
// POS INTEGRATION MODULE FUNCTIONS
// ============================================

export const enablePosIntegration = async (id: string, config?: any) => {
    try {
        const response = await axiosInstance.post(
            `${tenantUrl}/${id}/enable-pos-integration`,
            config || {},
            { headers: getPOSHeaders() }
        );
        await refreshTenantInStorage(id);
        return response.data;
    } catch (error: any) {
        const errorMessage = error?.response?.data?.error || "Failed to enable POS integration";
        message.error(errorMessage);
        throw error;
    }
};

export const disablePosIntegration = async (id: string) => {
    try {
        const response = await axiosInstance.post(
            `${tenantUrl}/${id}/disable-pos-integration`,
            {},
            { headers: getPOSHeaders() }
        );
        await refreshTenantInStorage(id);
        return response.data;
    } catch (error: any) {
        const errorMessage = error?.response?.data?.error || "Failed to disable POS integration";
        message.error(errorMessage);
        throw error;
    }
};

export const updatePosIntegrationConfig = async (id: string, config: any) => {
    try {
        const response = await axiosInstance.patch(
            `${tenantUrl}/${id}/pos-integration-config`,
            config,
            { headers: getPOSHeaders() }
        );
        message.success("POS integration configuration updated successfully!");
        return response.data;
    } catch (error: any) {
        const errorMessage = error?.response?.data?.error || "Failed to update POS integration configuration";
        message.error(errorMessage);
        throw error;
    }
};

export const getPosIntegrationStatus = async (id: string) => {
    try {
        const response = await axiosInstance.get(
            `${tenantUrl}/${id}/pos-integration-status`,
            { headers: getPOSHeaders() }
        );
        return response.data;
    } catch (error: any) {
        console.error("Failed to get POS integration status:", error);
        throw error;
    }
};

export const getTenantsWithPosIntegration = async () => {
    try {
        const response = await axiosInstance.get(
            `${tenantUrl}/pos-integration/enabled`,
            { headers: getPOSHeaders() }
        );
        return response.data;
    } catch (error: any) {
        console.error("Failed to get tenants with POS integration:", error);
        throw error;
    }
};

// ============================================
// BANDU BY BASE — PAYROLL & HR MODULE
// ============================================

export const enableBandu = async (id: string, data: EnableModuleData) => {
    try {
        const response = await axiosInstance.post(
            `${tenantUrl}/${id}/enable-bandu`,
            data,
            { headers: getPOSHeaders() }
        );
        await refreshTenantInStorage(id);
        return response.data;
    } catch (error: any) {
        const errorMessage = error?.response?.data?.error || "Failed to enable Bandu by Base";
        message.error(errorMessage);
        throw error;
    }
};

export const disableBandu = async (id: string) => {
    try {
        const response = await axiosInstance.post(
            `${tenantUrl}/${id}/disable-bandu`,
            {},
            { headers: getPOSHeaders() }
        );
        await refreshTenantInStorage(id);
        return response.data;
    } catch (error: any) {
        const errorMessage = error?.response?.data?.error || "Failed to disable Bandu by Base";
        message.error(errorMessage);
        throw error;
    }
};

export const getBanduStatus = async (id: string) => {
    try {
        const response = await axiosInstance.get(
            `${tenantUrl}/${id}/bandu-status`,
            { headers: getPOSHeaders() }
        );
        return response.data;
    } catch (error: any) {
        console.error("Failed to get Bandu status:", error);
        throw error;
    }
};

// ============================================
// MTEJA BY BASE — CRM & CUSTOMER ENGAGEMENT
// ============================================

export const enableMteja = async (id: string, data: EnableModuleData) => {
    try {
        const response = await axiosInstance.post(
            `${tenantUrl}/${id}/enable-mteja`,
            data,
            { headers: getPOSHeaders() }
        );
        await refreshTenantInStorage(id);
        return response.data;
    } catch (error: any) {
        const errorMessage = error?.response?.data?.error || "Failed to enable Mteja by Base";
        message.error(errorMessage);
        throw error;
    }
};

export const disableMteja = async (id: string) => {
    try {
        const response = await axiosInstance.post(
            `${tenantUrl}/${id}/disable-mteja`,
            {},
            { headers: getPOSHeaders() }
        );
        await refreshTenantInStorage(id);
        return response.data;
    } catch (error: any) {
        const errorMessage = error?.response?.data?.error || "Failed to disable Mteja by Base";
        message.error(errorMessage);
        throw error;
    }
};

export const getMtejaStatus = async (id: string) => {
    try {
        const response = await axiosInstance.get(
            `${tenantUrl}/${id}/mteja-status`,
            { headers: getPOSHeaders() }
        );
        return response.data;
    } catch (error: any) {
        console.error("Failed to get Mteja status:", error);
        throw error;
    }
};