import axiosInstance from "./request";
import { BASE_URL } from "@utils/config";
import { message } from "antd";

const CURRENCY_URL = `${BASE_URL}/currencies`;

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */

export interface Currency {
    _id: string;
    code: string;                          // ISO-4217  e.g. "USD"
    name: string;                          // "US Dollar"
    symbol: string;                        // "$"
    decimal_places: number;
    symbol_position: "before" | "after";
    thousands_separator: string;
    decimal_separator: string;
    is_active: boolean;
    is_functional: boolean;               // true for the shop's base currency
    shop_id: string;
    created_by?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ExchangeRate {
    _id: string;
    from_currency: string;
    to_currency: string;
    rate: number;
    rate_date: string;                     // ISO date string
    source: "manual" | "api" | "central_bank" | "fixed";
    notes?: string;
    shop_id: string;
    created_by?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCurrencyParams {
    code: string;
    name: string;
    symbol: string;
    decimal_places?: number;
    symbol_position?: "before" | "after";
    thousands_separator?: string;
    decimal_separator?: string;
    is_active?: boolean;
    is_functional?: boolean;
}

export interface UpdateCurrencyParams extends Partial<Omit<CreateCurrencyParams, "code">> { }

export interface CreateRateParams {
    from_currency: string;
    to_currency: string;
    rate: number;
    rate_date: string;
    source?: "manual" | "api" | "central_bank" | "fixed";
    notes?: string;
}

export interface UpdateRateParams {
    rate?: number;
    rate_date?: string;
    source?: "manual" | "api" | "central_bank" | "fixed";
    notes?: string;
}

export interface ConvertAmountParams {
    amount: number;
    from_currency: string;
    to_currency: string;
    date?: string;
}

export interface ConvertAmountResult {
    from_currency: string;
    to_currency: string;
    amount: number;
    converted_amount: number;
    exchange_rate: number;
    rate_date: string;
}

export interface ListRatesParams {
    from_currency?: string;
    to_currency?: string;
    from_date?: string;
    to_date?: string;
    source?: string;
    page?: number;
    limit?: number;
}

/* ─────────────────────────────────────────────────────────────────────────────
   CURRENCY API
───────────────────────────────────────────────────────────────────────────── */

export const listCurrencies = async (activeOnly = true): Promise<Currency[]> => {
    try {
        // Check if user is authenticated before making API call
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");
        if (!token || !user) {
            console.warn("User not authenticated - skipping currency API call");
            return [];
        }

        const shopId = localStorage.getItem("shopId");
        const tenant = localStorage.getItem("tenant") ? JSON.parse(localStorage.getItem("tenant")!) : null;
        const companyCode = localStorage.getItem("companyCode");
        
        const res = await axiosInstance.get(CURRENCY_URL, {
            params: { 
                active_only: activeOnly ? "true" : "false",
                shop_id: shopId,
                role: "admin",
                companycode: companyCode || (tenant ? tenant.tenant_code : null),
                _: Date.now() // Cache-busting timestamp
            },
        });

        console.log('cyrrency info',res );
        
        // Transform API response to match Currency interface
        const currencies = (res.data.data ?? []).map((apiCurrency: any) => ({
            _id: apiCurrency._id || apiCurrency.id,
            code: apiCurrency.code,
            name: apiCurrency.name,
            symbol: apiCurrency.symbol,
            decimal_places: apiCurrency.decimal_places,
            symbol_position: apiCurrency.symbol_position || apiCurrency.format?.symbol_position || "before",
            thousands_separator: apiCurrency.thousands_separator || apiCurrency.format?.thousands_separator || ",",
            decimal_separator: apiCurrency.decimal_separator || apiCurrency.format?.decimal_separator || ".",
            is_active: apiCurrency.is_active,
            is_functional: apiCurrency.is_functional || apiCurrency.is_base_currency || false,
            shop_id: apiCurrency.shop_id,
            created_by: apiCurrency.created_by,
            createdAt: apiCurrency.createdAt,
            updatedAt: apiCurrency.updatedAt,
        }));
        
        return currencies;
    } catch (err: any) {
        message.error(err?.response?.data?.message || "Failed to fetch currencies");
        return [];
    }
};

export const getFunctionalCurrency = async (): Promise<Currency | null> => {
    try {
        // Check if user is authenticated before making API call
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");
        if (!token || !user) {
            console.warn("User not authenticated - skipping functional currency API call");
            return null;
        }

        const shopId = localStorage.getItem("shopId");
        const tenant = localStorage.getItem("tenant") ? JSON.parse(localStorage.getItem("tenant")!) : null;
        const companyCode = localStorage.getItem("companyCode");
        
        const res = await axiosInstance.get(`${CURRENCY_URL}/functional`, {
            params: {
                shop_id: shopId,
                role: "admin",
                companycode: companyCode || (tenant ? tenant.tenant_code : null),
                _: Date.now() // Cache-busting timestamp
            },
        });
        
        console.log('functional currency response', res.data);
        
        // Transform API response to match Currency interface
        const functionalCurrency = res.data.data ? {
            _id: res.data.data._id || res.data.data.id,
            code: res.data.data.code,
            name: res.data.data.name,
            symbol: res.data.data.symbol,
            decimal_places: res.data.data.decimal_places,
            symbol_position: res.data.data.symbol_position || res.data.data.format?.symbol_position || "before",
            thousands_separator: res.data.data.thousands_separator || res.data.data.format?.thousands_separator || ",",
            decimal_separator: res.data.data.decimal_separator || res.data.data.format?.decimal_separator || ".",
            is_active: res.data.data.is_active,
            is_functional: res.data.data.is_functional || res.data.data.is_base_currency || false,
            shop_id: res.data.data.shop_id,
            created_by: res.data.data.created_by,
            createdAt: res.data.data.createdAt,
            updatedAt: res.data.data.updatedAt,
        } : null;
        
        return functionalCurrency;
    } catch (err: any) {
        // 404 is expected on fresh setup — don't show a noisy error
        if (err?.response?.status !== 404) {
            message.error(err?.response?.data?.message || "Failed to fetch functional currency");
        }
        return null;
    }
};

export const createCurrency = async (params: CreateCurrencyParams): Promise<Currency> => {
    try {
        const res = await axiosInstance.post(CURRENCY_URL, params);
        // message.success(res.data.message || "Currency created");
        return res.data.currency;
    } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to create currency";
        message.error(msg);
        throw new Error(msg);
    }
};

export const updateCurrency = async (
    code: string,
    params: UpdateCurrencyParams
): Promise<Currency> => {
    try {
        const res = await axiosInstance.put(`${CURRENCY_URL}/${code}`, params);
        // message.success("Currency updated");
        return res.data.currency;
    } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to update currency";
        message.error(msg);
        throw new Error(msg);
    }
};

export const deactivateCurrency = async (code: string): Promise<Currency> => {
    try {
        const res = await axiosInstance.delete(`${CURRENCY_URL}/${code}`);
        // message.success("Currency deactivated");
        return res.data.currency;
    } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to deactivate currency";
        message.error(msg);
        throw new Error(msg);
    }
};

export const setFunctionalCurrency = async (code: string): Promise<Currency> => {
    try {
        const res = await axiosInstance.patch(`${CURRENCY_URL}/${code}/set-functional`);
        // message.success(`${code} is now the functional currency`);
        return res.data.currency;
    } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to set functional currency";
        message.error(msg);
        throw new Error(msg);
    }
};

export const seedCurrencies = async (): Promise<{ inserted: number }> => {
    try {
        const res = await axiosInstance.post(`${CURRENCY_URL}/seed`);
        // message.success(res.data.message || "Currencies seeded");
        return { inserted: res.data.inserted };
    } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to seed currencies";
        message.error(msg);
        throw new Error(msg);
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   EXCHANGE RATE API
───────────────────────────────────────────────────────────────────────────── */

export const listRates = async (
    params: ListRatesParams = {}
): Promise<{ rates: ExchangeRate[]; total: number; page: number; totalPages: number }> => {
    try {
        const shopId = localStorage.getItem("shopId");
        const tenant = localStorage.getItem("tenant") ? JSON.parse(localStorage.getItem("tenant")!) : null;
        const companyCode = localStorage.getItem("companyCode");
        
        const res = await axiosInstance.get(`${CURRENCY_URL}/rates`, { 
            params: {
                ...params,
                shop_id: shopId,
                role: "admin",
                companycode: companyCode || (tenant ? tenant.tenant_code : null)
            }
        });
        return res.data;
    } catch (err: any) {
        message.error(err?.response?.data?.message || "Failed to fetch rates");
        return { rates: [], total: 0, page: 1, totalPages: 1 };
    }
};

export const getLatestRates = async (): Promise<ExchangeRate[]> => {
    try {
        // Check if user is authenticated before making API call
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");
        if (!token || !user) {
            console.warn("User not authenticated - skipping latest rates API call");
            return [];
        }

        const shopId = localStorage.getItem("shopId");
        const tenant = localStorage.getItem("tenant") ? JSON.parse(localStorage.getItem("tenant")!) : null;
        const companyCode = localStorage.getItem("companyCode");
        
        const res = await axiosInstance.get(`${CURRENCY_URL}/rates/latest`, {
            params: {
                shop_id: shopId,
                role: "admin",
                companycode: companyCode || (tenant ? tenant.tenant_code : null),
                _: Date.now() // Cache-busting timestamp
            },
        });
        return res.data.rates ?? [];
    } catch (err: any) {
        message.error(err?.response?.data?.message || "Failed to fetch latest rates");
        return [];
    }
};

export const getRateForDate = async (
    fromCurrency: string,
    toCurrency: string,
    date?: string
): Promise<number> => {
    try {
        const shopId = localStorage.getItem("shopId");
        const tenant = localStorage.getItem("tenant") ? JSON.parse(localStorage.getItem("tenant")!) : null;
        const companyCode = localStorage.getItem("companyCode");
        
        const res = await axiosInstance.get(`${CURRENCY_URL}/rates/for-date`, {
            params: { 
                from_currency: fromCurrency, 
                to_currency: toCurrency, 
                date,
                shop_id: shopId,
                role: "admin",
                companycode: companyCode || (tenant ? tenant.tenant_code : null)
            },
        });
        return res.data.rate ?? 1;
    } catch (err: any) {
        // Silently return 1 — callers handle "no rate" gracefully
        return 1;
    }
};

export const createRate = async (params: CreateRateParams): Promise<ExchangeRate> => {
    try {
        const res = await axiosInstance.post(`${CURRENCY_URL}/rates`, params);
        // message.success("Exchange rate created");
        return res.data.rate;
    } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to create rate";
        message.error(msg);
        throw new Error(msg);
    }
};

export const updateRate = async (
    id: string,
    params: UpdateRateParams
): Promise<ExchangeRate> => {
    try {
        const res = await axiosInstance.put(`${CURRENCY_URL}/rates/${id}`, params);
        // message.success("Exchange rate updated");
        return res.data.rate;
    } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to update rate";
        message.error(msg);
        throw new Error(msg);
    }
};

export const deleteRate = async (id: string): Promise<void> => {
    try {
        await axiosInstance.delete(`${CURRENCY_URL}/rates/${id}`);
        // message.success("Exchange rate deleted");
    } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to delete rate";
        message.error(msg);
        throw new Error(msg);
    }
};

export const bulkUpsertRates = async (
    rates: CreateRateParams[]
): Promise<{ upserted: number; modified: number }> => {
    try {
        const res = await axiosInstance.post(`${CURRENCY_URL}/rates/bulk`, { rates });
        // message.success(res.data.message || "Rates imported");
        return res.data;
    } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to import rates";
        message.error(msg);
        throw new Error(msg);
    }
};

export const convertAmount = async (
    params: ConvertAmountParams
): Promise<ConvertAmountResult | null> => {
    try {
        const res = await axiosInstance.post(`${CURRENCY_URL}/rates/convert`, params);
        return res.data;
    } catch (err: any) {
        message.error(err?.response?.data?.message || "Conversion failed");
        return null;
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   UTILITY HELPERS  (pure, no API calls)
───────────────────────────────────────────────────────────────────────────── */

/**
 * Format a numeric amount using a currency's display settings.
 * Falls back to basic toLocaleString when no currency object is available.
 */
export const formatCurrencyAmount = (
    amount: number,
    currency?: Currency | null
): string => {
    if (!currency) {
        return amount.toLocaleString("en-KE", { minimumFractionDigits: 2 });
    }
    const formatted = amount.toLocaleString("en-US", {
        minimumFractionDigits: currency.decimal_places,
        maximumFractionDigits: currency.decimal_places,
        useGrouping: true,
    });
    return currency.symbol_position === "before"
        ? `${currency.symbol}${formatted}`
        : `${formatted}${currency.symbol}`;
};

/**
 * Build a human-readable label for a currency option in a Select dropdown.
 *  e.g.  "USD — US Dollar ($)"
 */
export const currencyLabel = (c: Currency): string =>
    `${c.code} — ${c.name} (${c.symbol})`;