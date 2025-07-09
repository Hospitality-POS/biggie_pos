import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";

const pesapalUrl = `${BASE_URL}/pesapal`;

// Pesapal configuration interface
interface PesapalConfig {
    tenant_id?: string;
    tenant?: any;  // For backend compatibility
    consumer_key: string;
    consumer_secret: string;
    is_sandbox?: boolean;
    callback_url?: string;
    is_active?: boolean;
}

// Payment order interface
interface PaymentOrder {
    order_id: string;
    amount: number;
    currency?: string;
    description?: string;
    customer_email: string;
    customer_phone?: string;
    customer_name?: string;
}

// Transaction query parameters
interface TransactionQuery {
    page?: number;
    limit?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
}

export const pesapalApi = {
    // Helper function to get tenant/shop ID from localStorage
    getCurrentTenantId: () => {
        try {
            const tenant = JSON.parse(localStorage.getItem("tenant") || '{}');
            return tenant?.tenant_id || tenant?.shop_id || tenant?.id;
        } catch (error) {
            console.error('Error getting tenant ID:', error);
            return null;
        }
    },

    // Helper function to get full tenant object
    getCurrentTenant: () => {
        try {
            const tenant = JSON.parse(localStorage.getItem("tenant") || '{}');
            return tenant;
        } catch (error) {
            console.error('Error getting tenant object:', error);
            return null;
        }
    },

    // Configuration endpoints
    configure: async (configData: Omit<PesapalConfig, 'tenant_id' | 'tenant'>) => {
        try {
            const tenant = pesapalApi.getCurrentTenant();
            if (!tenant) {
                throw new Error('Tenant information not found');
            }

            // Format data to match backend expectations
            const requestData = {
                tenant,  // Send full tenant object as backend expects
                ...configData
            };

            const response = await axiosInstance.post(`${pesapalUrl}/configure`, requestData);
            return response.data;
        } catch (error) {
            console.error('Pesapal configure error:', error);
            throw error;
        }
    },

    // Update configuration
    updateConfig: async (configData: Omit<PesapalConfig, 'tenant_id' | 'tenant'>) => {
        try {
            const tenantId = pesapalApi.getCurrentTenantId();
            if (!tenantId) {
                throw new Error('Tenant ID not found');
            }

            const response = await axiosInstance.put(`${pesapalUrl}/config/${tenantId}`, configData);
            return response.data;
        } catch (error) {
            console.error('Pesapal update config error:', error);
            throw error;
        }
    },

    // Toggle integration status (enable/disable)
    toggleStatus: async (tenantId: string, isActive: boolean) => {
        try {
            const response = await axiosInstance.patch(`${pesapalUrl}/config/${tenantId}/status`, {
                is_active: isActive
            });
            return response.data;
        } catch (error) {
            console.error('Pesapal toggle status error:', error);
            throw error;
        }
    },

    getConfig: async (tenantId: string) => {
        try {
            const response = await axiosInstance.get(`${pesapalUrl}/config/${tenantId}`);
            return response.data;
        } catch (error) {
            console.error('Get Pesapal config error:', error);
            throw error;
        }
    },

    deleteConfig: async (tenantId: string) => {
        try {
            const response = await axiosInstance.delete(`${pesapalUrl}/config/${tenantId}`);
            return response.data;
        } catch (error) {
            console.error('Delete Pesapal config error:', error);
            throw error;
        }
    },

    // Connection testing
    testConnection: async (tenantId: string) => {
        try {
            const response = await axiosInstance.post(`${pesapalUrl}/test/${tenantId}`);
            return response.data;
        } catch (error) {
            console.error('Test Pesapal connection error:', error);
            throw error;
        }
    },

    // Payment processing
    createPaymentOrder: async (shopId: string, orderData: PaymentOrder) => {
        try {
            const response = await axiosInstance.post(`${pesapalUrl}/payment/${shopId}`, orderData);
            return response.data;
        } catch (error) {
            console.error('Create payment order error:', error);
            throw error;
        }
    },

    getPaymentStatus: async (tenantId: string, trackingId: string) => {
        try {
            const response = await axiosInstance.get(`${pesapalUrl}/status/${tenantId}`, {
                params: { tracking_id: trackingId }
            });
            return response.data;
        } catch (error) {
            console.error('Get payment status error:', error);
            throw error;
        }
    },

    // Transaction management
    getTransactions: async (tenantId: string, queryParams?: TransactionQuery) => {
        try {
            const response = await axiosInstance.get(`${pesapalUrl}/transactions/${tenantId}`, {
                params: queryParams
            });
            return response.data;
        } catch (error) {
            console.error('Get transactions error:', error);
            throw error;
        }
    },

    // Utility functions
    verifyPayment: async (tenantId: string, trackingId: string) => {
        try {
            const statusResponse = await pesapalApi.getPaymentStatus(tenantId, trackingId);
            return {
                isCompleted: statusResponse.data?.payment_status_description === 'Completed',
                status: statusResponse.data?.payment_status_description,
                ...statusResponse.data
            };
        } catch (error) {
            console.error('Verify payment error:', error);
            throw error;
        }
    },

    // Check if Pesapal is configured for a tenant
    isConfigured: async (tenantId: string) => {
        try {
            const config = await pesapalApi.getConfig(tenantId);
            return config.success && config.data?.config?.is_active;
        } catch (error) {
            // If config doesn't exist, return false
            return false;
        }
    },

    // Check if Pesapal is configured for current tenant
    isConfiguredForCurrentTenant: async () => {
        try {
            const tenantId = pesapalApi.getCurrentTenantId();
            if (!tenantId) {
                return false;
            }
            return await pesapalApi.isConfigured(tenantId);
        } catch (error) {
            console.error('Error checking Pesapal configuration for current tenant:', error);
            return false;
        }
    },

    // Configure Pesapal for current tenant
    configureForCurrentTenant: async (configData: Omit<PesapalConfig, 'tenant_id' | 'tenant'>) => {
        try {
            return await pesapalApi.configure(configData);
        } catch (error) {
            console.error('Error configuring Pesapal for current tenant:', error);
            throw error;
        }
    },

    // Update config for current tenant
    updateConfigForCurrentTenant: async (configData: Omit<PesapalConfig, 'tenant_id' | 'tenant'>) => {
        try {
            const tenantId = pesapalApi.getCurrentTenantId();
            if (!tenantId) {
                throw new Error('Tenant ID not found');
            }

            return await pesapalApi.updateConfig(configData);
        } catch (error) {
            console.error('Error updating Pesapal config for current tenant:', error);
            throw error;
        }
    },

    // Toggle status for current tenant
    toggleStatusForCurrentTenant: async (isActive: boolean) => {
        try {
            const tenantId = pesapalApi.getCurrentTenantId();
            if (!tenantId) {
                throw new Error('Tenant ID not found');
            }

            return await pesapalApi.toggleStatus(tenantId, isActive);
        } catch (error) {
            console.error('Error toggling Pesapal status for current tenant:', error);
            throw error;
        }
    },

    // Test connection for current tenant
    testConnectionForCurrentTenant: async () => {
        try {
            const tenantId = pesapalApi.getCurrentTenantId();
            if (!tenantId) {
                throw new Error('Tenant ID not found');
            }

            return await pesapalApi.testConnection(tenantId);
        } catch (error) {
            console.error('Error testing Pesapal connection for current tenant:', error);
            throw error;
        }
    },

    // Get config for current tenant
    getConfigForCurrentTenant: async () => {
        try {
            const tenantId = pesapalApi.getCurrentTenantId();
            if (!tenantId) {
                throw new Error('Tenant ID not found');
            }

            return await pesapalApi.getConfig(tenantId);
        } catch (error) {
            console.error('Error getting Pesapal config for current tenant:', error);
            throw error;
        }
    },

    // Delete config for current tenant
    deleteConfigForCurrentTenant: async () => {
        try {
            const tenantId = pesapalApi.getCurrentTenantId();
            if (!tenantId) {
                throw new Error('Tenant ID not found');
            }

            return await pesapalApi.deleteConfig(tenantId);
        } catch (error) {
            console.error('Error deleting Pesapal config for current tenant:', error);
            throw error;
        }
    }
};

export default pesapalApi;