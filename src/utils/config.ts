const withProtocol = (url: string): string =>
    url && !/^https?:\/\//i.test(url) ? `http://${url}` : url;

export const API_BASE_URL_STORAGE_KEY = "api_base_url";
export const TENANT_BASE_URL_STORAGE_KEY = "tenant_base_url";

const getStoredUrl = (key: string, fallback: string | undefined): string =>
    withProtocol(localStorage.getItem(key) || fallback || "");

const storeUrl = (key: string, url: string): void => {
    const trimmed = url.trim().replace(/\/+$/, "");
    if (trimmed) {
        localStorage.setItem(key, trimmed);
    } else {
        localStorage.removeItem(key);
    }
};

export const getApiBaseUrl = (): string =>
    getStoredUrl(API_BASE_URL_STORAGE_KEY, import.meta.env.VITE_BASE_URL);

export const setApiBaseUrl = (url: string): void =>
    storeUrl(API_BASE_URL_STORAGE_KEY, url);

export const getTenantBaseUrl = (): string =>
    getStoredUrl(TENANT_BASE_URL_STORAGE_KEY, import.meta.env.VITE_TENANT_BASE_URL);

export const setTenantBaseUrl = (url: string): void =>
    storeUrl(TENANT_BASE_URL_STORAGE_KEY, url);

export const BASE_URL: string = getApiBaseUrl()
export const TENANT_BASE_URL: string = getTenantBaseUrl()
export const POS_API_KEY: string = import.meta.env.VITE_POS_API_KEY
export const ENTITY_NAME: string = import.meta.env.VITE_ENTITY_NAME;
export const COOP_NAME: string = import.meta.env.VITE_COOP_NAME;
export const AI_DUKA_URL: string = import.meta.env.VITE_AI_DUKA_URL || "https://ai-duka.basepointcloud.dev";