import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";

export interface Package {
    _id: string;
    name: string;
    code: string;
    desc?: string;
    price: number;
    total_visits: number;
    validity_days: number;
    is_active: boolean;
    shop_id: string;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerSubscription {
    _id: string;
    customer_id: string | {
        _id: string;
        customer_name: string;
        code: string;
        phone?: string;
        email?: string;
    };
    package_id: string | Package;
    subscription_code: string;
    shop_id: string;
    total_visits_allowed: number;
    visits_used: number;
    visits_remaining: number;
    start_date: string;
    end_date: string;
    purchase_amount: number;
    payment_method_id?: string;
    payment_status: 'Paid' | 'Pending' | 'Refunded' | 'Failed';
    payment_date: string;
    status: 'Active' | 'Expired' | 'Exhausted' | 'Cancelled';
    cancellation_reason?: string;
    cancellation_date?: string;
    refund_amount?: number;
    created_by?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Visit {
    _id: string;
    customer_id: string;
    shop_id: string;
    visit_type: 'subscription' | 'feedback' | 'both';
    subscription_id?: string;
    order_id?: string;
    visit_number?: number;
    visit_date: string;
    services_provided?: Array<{
        service_name: string;
        notes?: string;
    }>;
    notes?: string;
    feedback_type?: 'authenticated' | 'anonymous';
    rating?: number;
    review?: string;
    is_verified?: boolean;
    deducted_from_package?: boolean;
    created_by?: string;
    createdAt: string;
    updatedAt: string;
}

const baseUrl = `${BASE_URL}/subscriptions`;

// ============== PACKAGE MANAGEMENT ==============

export const fetchAllPackages = async (params?: {
    page?: number;
    limit?: number;
    is_active?: boolean;
    search?: string;
}) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.get(`${BASE_URL}/packages`, {
        params: {
            shop_id: shopId,
            ...params,
        },
    });
    return response.data;
};

export const fetchActivePackages = async () => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.get(`${BASE_URL}/packages/active`, {
        params: { shop_id: shopId },
    });
    return response.data;
};

export const fetchPackageById = async (packageId: string) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.get(`${BASE_URL}/packages/${packageId}`, {
        params: { shop_id: shopId },
    });
    return response.data;
};

export const createPackage = async (packageData: {
    name: string;
    desc?: string;
    price: number;
    total_visits: number;
    validity_days: number;
    is_active?: boolean;
}) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.post(`${BASE_URL}/packages`, {
        ...packageData,
        shop_id: shopId,
    });
    return response.data;
};

export const updatePackage = async (
    packageId: string,
    packageData: Partial<Package>
) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.put(
        `${BASE_URL}/packages/${packageId}`,
        {
            ...packageData,
            shop_id: shopId,
        }
    );
    return response.data;
};

export const deletePackage = async (packageId: string) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.delete(`${BASE_URL}/packages/${packageId}`, {
        params: { shop_id: shopId },
    });
    return response.data;
};

export const togglePackageStatus = async (packageId: string) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.patch(
        `${BASE_URL}/packages/${packageId}/toggle-status`,
        { shop_id: shopId }
    );
    return response.data;
};

// ============== PACKAGE STATISTICS ==============

export const fetchPackageStatistics = async (packageId: string) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.get(`${BASE_URL}/packages/${packageId}/statistics`, {
        params: { shop_id: shopId },
    });
    return response.data;
};

export const fetchAllPackageStatistics = async () => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.get(`${BASE_URL}/packages/statistics`, {
        params: { shop_id: shopId },
    });
    return response.data;
};

// ============== SUBSCRIPTION MANAGEMENT ==============

export const purchaseSubscription = async (subscriptionData: {
    customer_id: string;
    package_id: string;
    payment_method_id: string;
    payment_amount: number;
}) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.post(`${baseUrl}`, {
        ...subscriptionData,
        shop_id: shopId,
    });
    return response.data;
};

export const fetchAllSubscriptions = async (params?: {
    page?: number;
    limit?: number;
    status?: string | string[];
    customer_id?: string;
    package_id?: string;
    payment_status?: string;
    search?: string;
    customer_name?: string;
    package_name?: string;
}) => {
    const shopId = localStorage.getItem("shopId");

    // Handle array status parameter
    const requestParams: any = {
        shop_id: shopId,
        page: params?.page,
        limit: params?.limit,
        ...params,
    };

    // Convert status array to comma-separated string if needed
    if (params?.status && Array.isArray(params.status)) {
        requestParams.status = params.status.join(',');
    }

    const response = await axiosInstance.get(baseUrl, {
        params: requestParams,
    });
    return response.data;
};

export const fetchSubscriptionById = async (subscriptionId: string) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.get(`${baseUrl}/${subscriptionId}`, {
        params: { shop_id: shopId },
    });
    return response.data;
};

// ADDED: Delete subscription function
export const deleteSubscription = async (subscriptionId: string) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.delete(`${baseUrl}/${subscriptionId}`, {
        params: { shop_id: shopId },
    });
    return response.data;
};

// ADDED: Update subscription function
export const updateSubscription = async (
    subscriptionId: string,
    updateData: {
        total_visits_allowed?: number;
        visits_used?: number;
        visits_remaining?: number;
        start_date?: string;
        end_date?: string;
        purchase_amount?: number;
        payment_method_id?: string;
        payment_status?: 'Paid' | 'Pending' | 'Refunded' | 'Failed';
        status?: 'Active' | 'Expired' | 'Exhausted' | 'Cancelled';
        cancellation_reason?: string;
        refund_amount?: number;
    }
) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.put(
        `${baseUrl}/${subscriptionId}`,
        updateData,
        {
            params: { shop_id: shopId },
        }
    );
    return response.data;
};

export const fetchCustomerSubscriptions = async (
    customerId: string,
    params?: {
        status?: string;
    }
) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.get(
        `${baseUrl}/customer/${customerId}`,
        {
            params: {
                shop_id: shopId,
                ...params,
            },
        }
    );
    return response.data;
};

export const fetchCustomerActiveSubscriptions = async (customerId: string) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.get(
        `${baseUrl}/customer/${customerId}/active`,
        {
            params: { shop_id: shopId },
        }
    );
    return response.data;
};

export const fetchCustomerSubscriptionHistory = async (
    customerId: string,
    params?: {
        include_visits?: string;
        status?: string;
    }
) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.get(
        `${baseUrl}/customer/${customerId}/history`,
        {
            params: {
                shop_id: shopId,
                include_visits: 'true',
                ...params,
            },
        }
    );
    return response.data;
};

export const fetchSubscriptionDetails = async (subscriptionId: string) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.get(
        `${baseUrl}/${subscriptionId}/details`,
        {
            params: { shop_id: shopId },
        }
    );
    return response.data;
};

export const adjustSubscriptionVisits = async (
    subscriptionId: string,
    adjustmentData: {
        adjustment: number;
        reason?: string;
    }
) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.put(
        `${baseUrl}/${subscriptionId}/adjust-visits`,
        {
            ...adjustmentData,
            shop_id: shopId,
        }
    );
    return response.data;
};

export const extendSubscription = async (
    subscriptionId: string,
    extensionData: {
        additional_days: number;
        reason?: string;
    }
) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.put(
        `${baseUrl}/${subscriptionId}/extend`,
        {
            ...extensionData,
            shop_id: shopId,
        }
    );
    return response.data;
};

export const cancelSubscription = async (
    subscriptionId: string,
    cancellationData: {
        reason: string;
        refund_amount?: number;
    }
) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.put(
        `${baseUrl}/${subscriptionId}/cancel`,
        {
            ...cancellationData,
            shop_id: shopId,
        }
    );
    return response.data;
};

// ============== VISIT MANAGEMENT ==============

export const useSubscriptionVisit = async (visitData: {
    subscription_id: string;
    services_provided?: Array<{
        service_name: string;
        notes?: string;
    }>;
    notes?: string;
    order_id?: string;
    include_feedback?: boolean;
    rating?: number;
    review?: string;
}) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.post(`${baseUrl}/use-visit`, {
        ...visitData,
        shop_id: shopId,
    });
    return response.data;
};

// ============== STATISTICS & ANALYTICS ==============

export const fetchShopSubscriptionStatistics = async () => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.get(`${baseUrl}/statistics`, {
        params: { shop_id: shopId },
    });
    return response.data;
};

export const fetchExpiringSubscriptions = async (days: number = 7) => {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.get(`${baseUrl}/expiring`, {
        params: {
            shop_id: shopId,
            days,
        },
    });
    return response.data;
};

// ============== HELPER FUNCTIONS ==============

export const isSubscriptionValid = (subscription: CustomerSubscription): boolean => {
    const now = new Date();
    const endDate = new Date(subscription.end_date);

    return (
        subscription.status === 'Active' &&
        subscription.visits_remaining > 0 &&
        endDate >= now
    );
};

export const calculateSubscriptionProgress = (
    subscription: CustomerSubscription
): {
    visitPercentage: number;
    timePercentage: number;
    daysRemaining: number;
} => {
    const visitPercentage =
        (subscription.visits_used / subscription.total_visits_allowed) * 100;

    const now = new Date();
    const startDate = new Date(subscription.start_date);
    const endDate = new Date(subscription.end_date);

    const totalDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysElapsed = Math.ceil(
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysRemaining = Math.max(
        0,
        Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    const timePercentage = (daysElapsed / totalDays) * 100;

    return {
        visitPercentage: Math.min(100, Math.max(0, visitPercentage)),
        timePercentage: Math.min(100, Math.max(0, timePercentage)),
        daysRemaining,
    };
};

export const formatSubscriptionStatus = (
    status: CustomerSubscription['status']
): {
    text: string;
    color: string;
} => {
    const statusMap = {
        Active: { text: 'Active', color: 'green' },
        Expired: { text: 'Expired', color: 'orange' },
        Exhausted: { text: 'Exhausted', color: 'red' },
        Cancelled: { text: 'Cancelled', color: 'default' },
    };

    return statusMap[status] || { text: status, color: 'default' };
};

// ============== DEFAULT EXPORT ==============

export default {
    // Packages
    fetchAllPackages,
    fetchActivePackages,
    fetchPackageById,
    createPackage,
    updatePackage,
    deletePackage,
    togglePackageStatus,
    fetchPackageStatistics,
    fetchAllPackageStatistics,

    // Subscriptions
    purchaseSubscription,
    fetchAllSubscriptions,
    fetchSubscriptionById,
    deleteSubscription,
    updateSubscription, // ADDED: Export the update function
    fetchCustomerSubscriptions,
    fetchCustomerActiveSubscriptions,
    fetchCustomerSubscriptionHistory,
    fetchSubscriptionDetails,
    adjustSubscriptionVisits,
    extendSubscription,
    cancelSubscription,

    // Visits
    useSubscriptionVisit,

    // Statistics
    fetchShopSubscriptionStatistics,
    fetchExpiringSubscriptions,

    // Helpers
    isSubscriptionValid,
    calculateSubscriptionProgress,
    formatSubscriptionStatus,
};