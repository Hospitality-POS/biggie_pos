import axios from "axios";
import { BASE_URL } from "@utils/config";
import { message } from "antd";

// Helper function to handle errors
const handleError = (errorMessage: string) => {
    message.error(`${errorMessage}`);
};

// Helper function to handle user logout
const logoutUser = () => {
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

// Create an axios instance with the base URL and timeout
const axiosInstance = axios.create({
    baseURL: BASE_URL,
});

// Interceptor to add authorization token to each request if available
axiosInstance.interceptors.request.use(
    (config) => {
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

            // ✅ Only add shop_id if it's valid and not for user/shop/tenant routes
            if (shopId && !(config.url?.includes('/users') || config.url?.includes('/shops') || config.url?.includes('/tenants'))) {

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
                    // Robust handling of different data types
                    if (config.data instanceof FormData) {
                        // If it's FormData, append the shop_id
                        config.data.append('shop_id', shopId);
                        console.log("✅ Added shop_id to FormData");
                    } else if (config.data && typeof config.data === 'object') {
                        // If it's a plain object, add shop_id directly
                        config.data = {
                            ...config.data,
                            shop_id: shopId
                        };
                        console.log("✅ Added shop_id to body:", config.data);
                    } else {
                        // If no data exists, create an object with shop_id
                        config.data = { shop_id: shopId };
                        console.log("✅ Created body with shop_id");
                    }
                }
            } else if (!shopId && !config.url?.includes('/users') && !config.url?.includes('/shops') && !config.url?.includes('/tenants')) {
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
                    // Optional: generic error handling
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