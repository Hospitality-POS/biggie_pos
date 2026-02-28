import axios from "axios";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import { queryClient } from "../main";

// Flag to suppress errors during logout
let isLoggingOut = false;

// Helper function to handle errors
const handleError = (errorMessage: string) => {
    message.error(`${errorMessage}`);
};

// Helper function to handle user logout
const logoutUser = () => {
    isLoggingOut = true;
    queryClient.cancelQueries();  // ✅ Cancel all in-flight queries immediately
    queryClient.clear();          // ✅ Clear all cached query data
    localStorage.removeItem("user");
    localStorage.removeItem("shopId");
    localStorage.removeItem("companyCode");
    window.location.href = "/login";
};

// Helper function to validate shop_id
const getValidShopId = (): string | null => {
    const shopId = localStorage.getItem("shopId");

    if (!shopId || shopId === "undefined" || shopId === "null" || shopId.trim() === "") {
        console.warn("Invalid shop_id detected:", shopId);
        return null;
    }

    return shopId;
};

// ✅ Routes that should NOT have shop_id injected
// Add any route here that is global/tenant-level (not shop-specific)
const EXCLUDED_ROUTES = [
    '/users',
    '/shops',
    '/tenants',
    '/wages',        // ✅ wages are per-employee, not per-shop
    '/payroll',      // ✅ payroll is tenant-level
    '/subscriptions',
    '/invoices',
    '/business-types',
];

const isExcludedRoute = (url: string = ''): boolean => {
    return EXCLUDED_ROUTES.some(route => url.includes(route));
};

// Create an axios instance with the base URL and timeout
const axiosInstance = axios.create({
    baseURL: BASE_URL,
});

// Interceptor to add authorization token to each request if available
axiosInstance.interceptors.request.use(
    (config) => {
        // ✅ Block all requests if logout is in progress
        if (isLoggingOut) {
            return Promise.reject(new axios.Cancel("Request cancelled due to logout"));
        }

        const user = localStorage.getItem("user");
        const shopId = getValidShopId();

        if (user) {
            const userObject = JSON.parse(user);
            const token = userObject.Token;
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
                config.headers['currentUser'] = userObject._id || userObject.id;
            }

            console.log("📤 Request:", config.method?.toUpperCase(), config.url);
            console.log("📍 Shop ID:", shopId);

            // ✅ Only inject shop_id for shop-specific routes
            if (shopId && !isExcludedRoute(config.url)) {

                // ✅ Handle GET and DELETE methods (query params)
                if (config.method === 'get' || config.method === 'delete') {
                    config.params = {
                        ...config.params,
                        shop_id: shopId,
                        role: userObject?.role
                    };
                    console.log("✅ Added shop_id to params:", config.params);
                }
                // ✅ Handle POST, PUT, PATCH methods (request body)
                else if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
                    if (config.data instanceof FormData) {
                        config.data.append('shop_id', shopId);
                        console.log("✅ Added shop_id to FormData");
                    } else if (config.data && typeof config.data === 'object') {
                        config.data = {
                            ...config.data,
                            shop_id: shopId
                        };
                        console.log("✅ Added shop_id to body:", config.data);
                    } else {
                        config.data = { shop_id: shopId };
                        console.log("✅ Created body with shop_id");
                    }
                }
            } else if (!shopId && !isExcludedRoute(config.url)) {
                console.warn("⚠️ Shop ID is missing for request:", config.url);
            }
        }

        const storedCode = localStorage.getItem("companyCode");
        if (storedCode || config.data?.companyCode) {
            config.headers['companyCode'] = storedCode || config.data?.companyCode;
        }

        return config;
    },
    (error) => {
        handleError("Request failed");
        return Promise.reject(error);
    }
);

// Interceptor to handle response errors globally
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // ✅ Suppress all error messages if logout is in progress or request was cancelled
        if (isLoggingOut || axios.isCancel(error)) return Promise.reject(error);

        const { response } = error;
        if (response) {
            switch (response.status) {
                case 401:
                    handleError("Session expired. Logging out...");
                    logoutUser();
                    break;
                case 403:
                    handleError(response.data.message);
                    break;
                case 409:
                    handleError("Company does not exist kindly contact support");
                    break;
                case 404:
                    handleError(response.data.message || "Resource not found");
                    break;
                case 400:
                    handleError(response.data.message || "Invalid request");
                    break;
                default:
                    break;
            }
        } else {
            console.error("Network error:", error);
            handleError("Network error. Please check your connection.");
        }
        return Promise.reject(error);
    }
);

// Utility functions for different HTTP methods
export const getRequest = (url: string, config = {}) => axiosInstance.get(url, config);

export const postRequest = (url: string, data: any, config = {}) => axiosInstance.post(url, data, config);

export const putRequest = (url: string, data: any, config = {}) => axiosInstance.put(url, data, config);

export const deleteRequest = (url: string, config = {}) => axiosInstance.delete(url, config);

export default axiosInstance;