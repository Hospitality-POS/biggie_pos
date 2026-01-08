import axios from "axios";
import { BASE_URL } from "@utils/config";
import { message } from "antd";

// Helper function to handle errors
const handleError = (errorMessage: string) => {
    message.error(`${errorMessage}`)
};

// Helper function to handle user logout
const logoutUser = () => {
    // Clear all relevant storage items
    localStorage.removeItem("user");
    localStorage.removeItem("shopId");
    localStorage.removeItem("companyCode");

    // Redirect to login page
    window.location.href = "/login"; // Adjust this path to your login route
};

// Create an axios instance with the base URL and timeout
const axiosInstance = axios.create({
    baseURL: BASE_URL,
});

// Interceptor to add authorization token to each request if available
axiosInstance.interceptors.request.use(
    (config) => {
        const user = localStorage.getItem("user");
        const shopId = localStorage.getItem("shopId");

        if (user) {
            const userObject = JSON.parse(user);
            const token = userObject.Token;
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
                config.headers['currentUser'] = userObject._id || userObject.id;
            }

            if ((shopId && shopId !== 'undefined') && !(config.url?.includes('/users') || config.url?.includes('/shops'))) {
                if (config.method === 'get') {
                    config.params = {
                        ...config.params,
                        shop_id: shopId,
                        role: userObject?.role
                    };
                } else {
                    // Robust handling of different data types
                    if (config.data instanceof FormData) {
                        // If it's FormData, append the shop_id
                        config.data.append('shop_id', shopId);
                    } else if (config.data instanceof Object) {
                        // If it's a plain object, add shop_id directly
                        config.data = {
                            ...config.data,
                            shop_id: shopId
                        };
                    } else {
                        // If it's some other type, create a new FormData
                        const formData = new FormData();
                        formData.append('shop_id', shopId);

                        // If the original data is not null/undefined, append it
                        if (config.data != null) {
                            formData.append('data', config.data);
                        }

                        config.data = formData;
                    }
                }
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
                    // Handle token expiration with auto logout
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
                    handleError(response.data.message);
                    break;
                default:
                // Optional: generic error handling
                // handleError("An error occurred while processing your request.");
            }
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