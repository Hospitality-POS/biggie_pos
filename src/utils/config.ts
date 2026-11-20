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

// Web address customers open links on. The desktop app runs on
// tauri.localhost, which only works inside the app itself.
export const PUBLIC_APP_URL: string = (import.meta.env.VITE_PUBLIC_APP_URL || "https://app.basepoint.co.ke").replace(/\/+$/, "");

/** Origin for links shared with customers: this site in a browser, the web app from the desktop app. */
export const shareableOrigin = (): string =>
    typeof window !== "undefined" && !("__TAURI_INTERNALS__" in window) && /^https?:$/.test(window.location.protocol) && !/(^|\.)tauri\.localhost$/i.test(window.location.hostname)
        ? window.location.origin
        : PUBLIC_APP_URL;
// ── Tenant web address ───────────────────────────────────────────────────────
// Every business has its own address on the Basepoint domain, named after
// the business: "Nuba" → https://nuba.basepoint.co.ke. Links and QR codes
// shared with customers and staff (customer order link, staff clock-in) use it.
export const TENANT_BASE_DOMAIN: string = (import.meta.env.VITE_TENANT_BASE_DOMAIN || "basepoint.co.ke")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

// Subdomains that belong to Basepoint itself, not to a business
const NON_TENANT_SUBDOMAINS = new Set(["www", "app", "duka", "api", "admin", "hospitality", "dashboard", "documents"]);

/** The business name as it appears in its address — same rule as the tenant's db_name. */
export const tenantSlug = (name?: string | null): string =>
    (name || "").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");

const storedTenant = (): any => {
    try {
        return JSON.parse(localStorage.getItem("tenant") || "null");
    } catch {
        return null;
    }
};

/**
 * The business's own web address, e.g. https://nuba.basepoint.co.ke.
 * Already on the business's address → that address; otherwise built from the
 * tenant name; no name → the shareable app address.
 */
export const tenantAppUrl = (tenant: any = storedTenant()): string => {
    if (typeof window !== "undefined") {
        const host = window.location.hostname.toLowerCase();
        const sub = host.endsWith(`.${TENANT_BASE_DOMAIN}`) ? host.slice(0, -(TENANT_BASE_DOMAIN.length + 1)) : "";
        if (sub && !sub.includes(".") && !NON_TENANT_SUBDOMAINS.has(sub)) return `https://${host}`;
    }
    const slug = tenantSlug(tenant?.name);
    return slug ? `https://${slug}.${TENANT_BASE_DOMAIN}` : shareableOrigin();
};
