import axios from "axios";
import { BASE_URL } from "@utils/config";
import { message } from "antd";

const handleError = (errorMessage: string) => {
    message.error(`${errorMessage}`);
};

const logoutUser = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("shopId");
    localStorage.removeItem("companyCode");
    window.location.href = "/login";
};

const getValidShopId = (): string | null => {
    const shopId = localStorage.getItem("shopId");
    if (!shopId || shopId === "undefined" || shopId === "null" || shopId.trim() === "") {
        console.warn("Invalid shop_id detected:", shopId);
        return null;
    }
    return shopId;
};

const axiosInstance = axios.create({
    baseURL: BASE_URL,
});

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

            const isAdminDashboardRoute =
                config.url?.includes('/admin-dashboard') ||
                config.url?.includes('/admin/analytics') ||
                config.url?.includes('/admin/analysis') ||
                config.url?.includes('/dashboard/admin') ||
                config.url?.includes('/analytics/admin') ||
                config.url?.includes('/analysis/admin');

            const isUserRoute = config.url?.includes('/users');
            const isShopRoute = config.url?.includes('/shops');
            const isTenantRoute = config.url?.includes('/tenants');

            if (shopId && !isAdminDashboardRoute && !isUserRoute && !isShopRoute && !isTenantRoute) {
                if (config.method === 'get' || config.method === 'delete') {
                    config.params = {
                        ...config.params,
                        shop_id: shopId,
                        role: userObject?.role
                    };
                } else if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
                    if (config.data instanceof FormData) {
                        config.data.append('shop_id', shopId);
                    } else if (config.data && typeof config.data === 'object') {
                        config.data = {
                            ...config.data,
                            shop_id: shopId
                        };
                    } else {
                        config.data = { shop_id: shopId };
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

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const { response } = error;
        if (response) {
            switch (response.status) {
                case 401:
                    handleError("Session expired. Logging out...");
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

export const getRequest = (url: string, config = {}) => axiosInstance.get(url, config);
export const postRequest = (url: string, data: any, config = {}) => axiosInstance.post(url, data, config);
export const putRequest = (url: string, data: any, config = {}) => axiosInstance.put(url, data, config);
export const deleteRequest = (url: string, config = {}) => axiosInstance.delete(url, config);

export default axiosInstance;