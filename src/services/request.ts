import axios from "axios";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import { queryClient } from "../main";
import { getCache, setCache } from "@utils/cache";

let isLoggingOut = false;

const handleError = (errorMessage: string) => {
    message.error(`${errorMessage}`);
};

const logoutUser = () => {
    isLoggingOut = true;
    queryClient.cancelQueries();
    queryClient.clear();
    localStorage.removeItem("user");
    localStorage.removeItem("shopId");
    localStorage.removeItem("companyCode");
    window.location.href = "/login";
};

const getValidShopId = (): string | null => {
    const shopId = localStorage.getItem("shopId");
    if (!shopId || shopId === "undefined" || shopId === "null" || shopId.trim() === "") {
        return null;
    }
    return shopId;
};

const EXCLUDED_ROUTES = [
    '/users',
    '/shops',
    '/tenants',
    '/wages',
    '/payroll',
    '/subscriptions',
    '/invoices',
    '/business-types',
];

// Routes that should NOT be cached locally (mutations, auth, payments, etc.)
const NON_CACHEABLE_ROUTES = [
    '/auth',
    '/login',
    '/logout',
    '/payments',
    '/subscriptions',
    '/invoices',
];

const isExcludedRoute = (url: string = ''): boolean =>
    EXCLUDED_ROUTES.some(route => url.includes(route));

const isNonCacheableRoute = (url: string = ''): boolean =>
    NON_CACHEABLE_ROUTES.some(route => url.includes(route));

const formDataHasKey = (formData: FormData, key: string): boolean => {
    try {
        return formData.has(key);
    } catch {
        return false;
    }
};

// Build a deterministic cache key from url + params + shopId
const buildCacheKey = (url: string, params: Record<string, unknown> = {}, shopId: string | null): string => {
    const paramStr = JSON.stringify(params, Object.keys(params).sort());
    return `GET::${shopId ?? "global"}::${url}::${paramStr}`;
};

const axiosInstance = axios.create({
    baseURL: BASE_URL,
});

axiosInstance.interceptors.request.use(
    (config) => {
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

            if (shopId && !isExcludedRoute(config.url)) {
                if (config.method === 'get' || config.method === 'delete') {
                    config.params = {
                        ...config.params,
                        shop_id: shopId,
                        role: userObject?.role,
                    };
                } else if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
                    if (config.data instanceof FormData) {
                        if (!formDataHasKey(config.data, 'shop_id')) {
                            config.data.append('shop_id', shopId);
                        }
                    } else if (config.data && typeof config.data === 'object') {
                        config.data = { ...config.data, shop_id: shopId };
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
                default:
                    break;
            }
        } else {
            handleError("Network error. Please check your connection.");
        }
        return Promise.reject(error);
    }
);

export const getRequest = async (url: string, config: Record<string, unknown> = {}, ttlMs?: number) => {
    if (!isNonCacheableRoute(url)) {
        const shopId = getValidShopId();
        const cacheKey = buildCacheKey(url, (config.params as Record<string, unknown>) ?? {}, shopId);
        const cached = await getCache<unknown>(cacheKey);
        if (cached !== null) {
            return { data: cached, fromCache: true };
        }
        const response = await axiosInstance.get(url, config);
        await setCache(cacheKey, response.data, ttlMs);
        return response;
    }
    return axiosInstance.get(url, config);
};

export const postRequest = (url: string, data: unknown, config = {}) =>
    axiosInstance.post(url, data, config);

export const putRequest = (url: string, data: unknown, config = {}) =>
    axiosInstance.put(url, data, config);

export const deleteRequest = (url: string, config = {}) =>
    axiosInstance.delete(url, config);

export default axiosInstance;