import axios from "axios";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import { queryClient } from "../main";
import { getCache, setCache } from "@utils/cache";
import { makePermissionChecker, PERMISSIONS } from "@utils/accessControl";

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

const NON_CACHEABLE_ROUTES = [
    '/auth',
    '/login',
    '/logout',
    '/payments',
    '/subscriptions',
    '/invoices',
];

// Routes that should NOT trigger logout on 401 (Meta/Webhook APIs)
const NON_AUTH_401_ROUTES = [
    '/omnichannel',
    '/webhook',
    '/messages',
    '/conversations',
    '/channels',
];

const isExcludedRoute = (url: string = ''): boolean =>
    EXCLUDED_ROUTES.some(route => url.includes(route));

const isNonCacheableRoute = (url: string = ''): boolean =>
    NON_CACHEABLE_ROUTES.some(route => url.includes(route));

const isNonAuth401Route = (url: string = ''): boolean =>
    NON_AUTH_401_ROUTES.some(route => url.includes(route));

const formDataHasKey = (formData: FormData, key: string): boolean => {
    try {
        return formData.has(key);
    } catch {
        return false;
    }
};

const buildCacheKey = (url: string, params: Record<string, unknown> = {}, shopId: string | null): string => {
    const paramStr = JSON.stringify(params, Object.keys(params).sort());
    return `GET::${shopId ?? "global"}::${url}::${paramStr}`;
};

// ─── Permission resolution ────────────────────────────────────────────────────

const METHOD_TO_ACTION: Record<string, string> = {
    get: "read",
    post: "create",
    put: "update",
    patch: "update",
    delete: "delete",
};

const resolvePermissionKey = (
    url: string = '',
    method: string = 'get',
    explicitKey?: string,
): string | null => {
    if (explicitKey) return explicitKey;

    const action = METHOD_TO_ACTION[method.toLowerCase()];
    if (!action) return null;

    const cleanUrl = url
        .replace(BASE_URL, '')
        .split('?')[0]
        .replace(/^\/|\/$/g, '')
        .toLowerCase();

    const urlTokens = cleanUrl.split(/[\s\-_/]+/).filter(Boolean);

    let bestKey: string | null = null;
    let bestScore = 0;

    for (const perm of Object.values(PERMISSIONS)) {
        if (perm.action !== action) continue;

        const keyTokens = perm.key.toLowerCase().split('_');

        const score = keyTokens.filter(kt => urlTokens.some(ut => ut.includes(kt) || kt.includes(ut))).length;

        if (score > bestScore) {
            bestScore = score;
            bestKey = perm.key;
        }
    }

    return bestScore >= 2 ? bestKey : null;
};

// ─── Axios instance ───────────────────────────────────────────────────────────

const axiosInstance = axios.create({
    baseURL: BASE_URL,
});

axiosInstance.interceptors.request.use(
    (config) => {
        if (isLoggingOut) {
            return Promise.reject(new axios.Cancel("Request cancelled due to logout"));
        }

        const raw = localStorage.getItem("user");
        const shopId = getValidShopId();

        if (raw) {
            const userObject = JSON.parse(raw);
            const token = userObject.Token;

            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
                config.headers['currentUser'] = userObject._id || userObject.id;
            }

            const isAdmin = userObject?.role === "admin";
            const rolePermissions: string[] =
                userObject?.rolePermissions ?? userObject?.permissions ?? [];

            const can = makePermissionChecker(rolePermissions, isAdmin);

            const explicitKey = config.headers?.['x-permission'] as string | undefined;

            if (explicitKey) delete config.headers['x-permission'];

            const permKey = resolvePermissionKey(config.url, config.method, explicitKey);

            if (permKey && !can(permKey)) {
                const label = PERMISSIONS[permKey]?.label ?? permKey;
                handleError(`Access denied: you don't have permission to "${label}".`);
                return Promise.reject(
                    Object.assign(new Error(`Permission denied: ${permKey}`), {
                        isPermissionError: true,
                        permissionKey: permKey,
                    })
                );
            }

            if (shopId && !isExcludedRoute(config.url)) {
                if (config.method === 'get' || config.method === 'delete') {
                    config.params = {
                        ...config.params,
                        shop_id: shopId,
                        role: userObject?.role,
                    };
                } else if (
                    config.method === 'post' ||
                    config.method === 'put' ||
                    config.method === 'patch'
                ) {
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
        // Permission errors are already handled above — don't double-toast
        if (error?.isPermissionError) return Promise.reject(error);
        if (isLoggingOut || axios.isCancel(error)) return Promise.reject(error);

        const { response } = error;
        if (response) {
            switch (response.status) {
                case 401:
                    // Check if this is a Meta API endpoint (should NOT logout)
                    const url = response.config?.url || '';
                    if (isNonAuth401Route(url)) {
                        // For Meta API 401s, just show a channel-specific error
                        console.warn('Meta API 401 error - channel token may be expired:', url);
                        message.error('Channel connection expired. Please reconnect the channel in settings.');
                        // Don't logout - just reject the error
                        return Promise.reject(error);
                    }
                    // For auth endpoints, logout
                    handleError("Session expired. Logging out...");
                    logoutUser();
                    break;
                case 403:
                    handleError(response.data.message);
                    break;
                case 409:
                    handleError(response.data.message || "Company does not exist kindly contact support");
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

// ─── Exported helpers ─────────────────────────────────────────────────────────

export const getRequest = async (
    url: string,
    config: Record<string, unknown> = {},
    ttlMs?: number,
) => {
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