// Remove createAsyncThunk import or keep it only for other functions
import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";
import { createAsyncThunk } from "@reduxjs/toolkit";

const package_url = `${BASE_URL}/packages`;
const subscription_url = `${BASE_URL}/subscriptions`;

// Helper to validate shop_id
const getValidShopId = (): string | null => {
    const shopId = localStorage.getItem("shopId");

    if (!shopId || shopId === "undefined" || shopId === "null" || shopId.trim() === "") {
        return null;
    }

    return shopId;
};

// ==================== PACKAGE OPERATIONS ====================

export const fetchAllPackages = async (params?: {
    shop_id?: string;
    is_active?: boolean;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
}) => {
    try {
        const shopId = params?.shop_id || getValidShopId();

        if (!shopId) {
            message.warning("Please select a shop first");
            return {
                packages: [],
                totalPackages: 0,
                totalPages: 0,
                currentPage: 1,
            };
        }

        console.log("📦 Fetching packages for shop:", shopId);

        const response = await axiosInstance.get(package_url, {
            params: {
                shop_id: shopId,
                is_active: params?.is_active,
                category: params?.category,
                search: params?.search,
                page: params?.page || 1,
                limit: params?.limit || 10,
            },
        });

        return response.data;
    } catch (error: any) {
        console.error("❌ Error fetching packages:", error);
        const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch packages";
        message.error(errorMessage);

        return {
            packages: [],
            totalPackages: 0,
            totalPages: 0,
            currentPage: 1,
        };
    }
};

export const fetchActivePackages = async (shop_id?: string) => {
    try {
        const shopId = shop_id || getValidShopId();

        if (!shopId) {
            message.warning("Please select a shop first");
            return { packages: [], count: 0 };
        }

        console.log("📦 Fetching active packages for shop:", shopId);

        const response = await axiosInstance.get(`${package_url}/active`, {
            params: { shop_id: shopId },
        });

        return response.data;
    } catch (error: any) {
        console.error("❌ Error fetching active packages:", error);
        const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch active packages";
        message.error(errorMessage);
        return { packages: [], count: 0 };
    }
};

export const fetchPackageById = async (packageId: string) => {
    try {
        const response = await axiosInstance.get(`${package_url}/${packageId}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error?.message || "Failed to fetch package details");
    }
};

export const fetchPackageStatistics = async (packageId: string) => {
    try {
        const response = await axiosInstance.get(
            `${package_url}/${packageId}/statistics`
        );
        return response.data;
    } catch (error: any) {
        throw new Error(error?.message || "Failed to fetch package statistics");
    }
};

// ✅ FIXED: Changed from createAsyncThunk to regular async function
export const createPackage = async (packageData: {
    name: string;
    code?: string;
    category?: string;
    thumbnail?: string;
    price: number;
    total_visits: number;
    validity_days?: number;
    desc?: string;
    is_active?: boolean;
}) => {
    try {
        const shopId = getValidShopId();

        if (!shopId) {
            message.error("Shop ID is required");
            throw new Error("Shop ID is required");
        }

        console.log("📦 Creating package with data:", packageData);

        const response = await axiosInstance.post(package_url, {
            ...packageData,
            shop_id: shopId,
        });

        message.success("Package created successfully");
        return response.data;
    } catch (error: any) {
        const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to create package";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

export const updatePackage = async (packageId: string, data: any) => {
    try {
        const response = await axiosInstance.put(
            `${package_url}/${packageId}`,
            data
        );
        message.success("Package updated successfully");
        return response.data;
    } catch (error: any) {
        const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to update package";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

export const deletePackage = async (packageId: string) => {
    try {
        const response = await axiosInstance.delete(`${package_url}/${packageId}`);
        message.success("Package deactivated successfully");
        return response.data;
    } catch (error: any) {
        const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to delete package";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

export const hardDeletePackage = async (packageId: string) => {
    try {
        const response = await axiosInstance.delete(
            `${package_url}/${packageId}/hard`
        );
        message.success("Package permanently deleted");
        return response.data;
    } catch (error: any) {
        const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to permanently delete package";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

// ==================== SUBSCRIPTION OPERATIONS ====================

export const fetchAllSubscriptions = async (params?: {
    shop_id?: string;
    status?: "Active" | "Expired" | "Exhausted" | "Cancelled";
    customer_id?: string;
    package_id?: string;
    payment_status?: string;
    search?: string;
    page?: number;
    limit?: number;
}) => {
    try {
        const shopId = params?.shop_id || getValidShopId();

        if (!shopId) {
            message.warning("Please select a shop first");
            return {
                subscriptions: [],
                totalSubscriptions: 0,
                totalPages: 0,
                currentPage: 1,
            };
        }

        const response = await axiosInstance.get(subscription_url, {
            params: {
                shop_id: shopId,
                status: params?.status,
                customer_id: params?.customer_id,
                package_id: params?.package_id,
                payment_status: params?.payment_status,
                search: params?.search,
                page: params?.page || 1,
                limit: params?.limit || 20,
            },
        });

        return response.data;
    } catch (error: any) {
        console.error("Error fetching subscriptions:", error);
        return {
            subscriptions: [],
            totalSubscriptions: 0,
            totalPages: 0,
            currentPage: 1,
        };
    }
};

export const fetchCustomerSubscriptions = async (customerId: string, status?: string) => {
    try {
        const response = await axiosInstance.get(
            `${subscription_url}/customer/${customerId}`,
            {
                params: { status },
            }
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error?.message || "Failed to fetch customer subscriptions"
        );
    }
};

export const fetchCustomerActiveSubscriptions = async (customerId: string) => {
    try {
        const shopId = getValidShopId();
        const response = await axiosInstance.get(
            `${subscription_url}/customer/${customerId}/active`,
            {
                params: { shop_id: shopId },
            }
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error?.message || "Failed to fetch active subscriptions"
        );
    }
};

export const fetchSubscriptionById = async (subscriptionId: string) => {
    try {
        const response = await axiosInstance.get(
            `${subscription_url}/${subscriptionId}`
        );
        return response.data;
    } catch (error: any) {
        throw new Error(error?.message || "Failed to fetch subscription details");
    }
};

export const fetchExpiringSubscriptions = async (days: number = 7) => {
    try {
        const shopId = getValidShopId();
        const response = await axiosInstance.get(
            `${subscription_url}/expiring`,
            {
                params: { shop_id: shopId, days },
            }
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error?.message || "Failed to fetch expiring subscriptions"
        );
    }
};

export const fetchShopSubscriptionStatistics = async (shop_id?: string) => {
    try {
        const shopId = shop_id || getValidShopId();
        const response = await axiosInstance.get(
            `${subscription_url}/statistics`,
            {
                params: { shop_id: shopId },
            }
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error?.message || "Failed to fetch subscription statistics"
        );
    }
};

// ✅ FIXED: Changed from createAsyncThunk to regular async function
export const createSubscription = async (subscriptionData: {
    customer_id: string;
    package_id: string;
    payment_method_id?: string;
    payment_amount: number;
}) => {
    try {
        const response = await axiosInstance.post(
            subscription_url,
            subscriptionData
        );
        message.success("Subscription created successfully");
        return response.data;
    } catch (error: any) {
        const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to create subscription";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

export const adjustSubscriptionVisits = async (
    subscriptionId: string,
    adjustment: number,
    reason?: string
) => {
    try {
        const response = await axiosInstance.patch(
            `${subscription_url}/${subscriptionId}/adjust`,
            { adjustment, reason }
        );
        message.success("Subscription visits adjusted");
        return response.data;
    } catch (error: any) {
        const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to adjust visits";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

export const extendSubscription = async (
    subscriptionId: string,
    additional_days: number,
    reason?: string
) => {
    try {
        const response = await axiosInstance.patch(
            `${subscription_url}/${subscriptionId}/extend`,
            { additional_days, reason }
        );
        message.success("Subscription extended successfully");
        return response.data;
    } catch (error: any) {
        const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to extend subscription";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

export const cancelSubscription = async (
    subscriptionId: string,
    reason?: string,
    refund_amount?: number
) => {
    try {
        const response = await axiosInstance.patch(
            `${subscription_url}/${subscriptionId}/cancel`,
            { reason, refund_amount }
        );
        message.success("Subscription cancelled successfully");
        return response.data;
    } catch (error: any) {
        const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to cancel subscription";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

// ==================== CART/POS INTEGRATION ====================

export const checkCustomerHasActiveSubscription = async (customerId: string) => {
    try {
        const shopId = getValidShopId();
        const response = await axiosInstance.get(
            `${subscription_url}/customer/${customerId}/active`,
            {
                params: { shop_id: shopId },
            }
        );
        return {
            hasActiveSubscription: response.data.count > 0,
            subscriptions: response.data.subscriptions,
            count: response.data.count,
        };
    } catch (error: any) {
        console.error("Error checking customer subscription:", error);
        return {
            hasActiveSubscription: false,
            subscriptions: [],
            count: 0,
        };
    }
};

export const fetchPackageAllowedServices = async (packageId: string) => {
    try {
        const response = await axiosInstance.get(
            `${package_url}/${packageId}/allowed-services`
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error?.message || "Failed to fetch allowed services"
        );
    }
};

// ✅ FIXED: Changed from createAsyncThunk to regular async function
export const purchaseSubscription = async (purchaseData: {
    customer_id: string;
    package_id: string;
    payment_method_id: string;
    payment_amount: number;
}) => {
    try {
        const response = await axiosInstance.post(
            subscription_url,
            purchaseData
        );
        message.success(`Subscription purchased! ${response.data.subscription.total_visits_allowed} visits available`);
        return response.data;
    } catch (error: any) {
        const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to purchase subscription";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

// ==================== TYPES ====================

export interface Package {
    _id: string;
    name: string;
    code: string;
    category?: string;
    shop_id: string;
    thumbnail?: string;
    price: number;
    total_visits: number;
    validity_days?: number;
    desc?: string;
    is_active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerSubscription {
    _id: string;
    subscription_code: string;
    customer_id: any;
    package_id: any;
    shop_id: string;
    total_visits_allowed: number;
    visits_used: number;
    visits_remaining: number;
    start_date: string;
    end_date: string;
    purchase_amount: number;
    payment_status: "Paid" | "Pending";
    payment_method_id?: string;
    payment_date?: string;
    status: "Active" | "Expired" | "Exhausted" | "Cancelled";
    cancellation_reason?: string;
    cancellation_date?: string;
    refund_amount?: number;
    created_by: string;
    createdAt: string;
    updatedAt: string;
}

export interface SubscriptionStatistics {
    total_subscriptions: number;
    active_subscriptions: number;
    expired_subscriptions: number;
    exhausted_subscriptions: number;
    cancelled_subscriptions: number;
    total_revenue: number;
    total_visits_allocated: number;
    total_visits_used: number;
    total_visits_remaining: number;
    utilization_rate: number;
}