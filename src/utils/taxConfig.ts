/**
 * Effective VAT and Catering Levy for a branch.
 *
 * Both can be switched on at two levels:
 *  - business-wide → applies to every branch
 *      VAT:           tenant.is_vat_enabled / vat_standard_rate / vat_pricing_mode
 *      Catering levy: system settings { enabled, percentage } (/users/catering-levy)
 *  - shop.tax_settings → applies to that branch only
 *
 * A tax is on for a branch when either level has it on. When the branch has
 * it on, the branch's own rate (and VAT pricing mode) is used; otherwise the
 * business-wide one. Rates are decimals (0.02 = 2%). Mirrors
 * utils/tax-config.js in the API.
 */

export type VatPricingMode = "INCLUSIVE" | "EXCLUSIVE";

export interface ShopTaxSettings {
  vat_enabled?: boolean;
  vat_pricing_mode?: VatPricingMode;
  vat_standard_rate?: number;
  catering_levy_enabled?: boolean;
  catering_levy_rate?: number;
}

export interface EffectiveTaxConfig {
  is_vat_enabled: boolean;
  vat_pricing_mode: VatPricingMode;
  vat_standard_rate: number;
  vat_source: "shop" | "business" | null;
  is_catering_levy_enabled: boolean;
  catering_levy_rate: number;
  catering_levy_source: "shop" | "business" | null;
}

export const DEFAULT_CATERING_LEVY_RATE = 0.02;

export const resolveTaxConfig = (
  tenant: any,
  shop: any,
  businessLevy?: { enabled?: boolean; percentage?: number } | null
): EffectiveTaxConfig => {
  const t = tenant || {};
  const s: ShopTaxSettings = shop?.tax_settings || {};

  const shopVat = !!s.vat_enabled;
  const tenantVat = !!t.is_vat_enabled;
  const vatEnabled = shopVat || tenantVat;

  const shopLevy = !!s.catering_levy_enabled;
  const businessOn = !!businessLevy?.enabled;
  const levyEnabled = shopLevy || businessOn;
  const levyRate = shopLevy ? s.catering_levy_rate : (businessLevy?.percentage ?? 2) / 100;

  return {
    is_vat_enabled: vatEnabled,
    vat_pricing_mode: (shopVat ? s.vat_pricing_mode : t.vat_pricing_mode) || "EXCLUSIVE",
    vat_standard_rate: vatEnabled ? Number(shopVat ? s.vat_standard_rate : t.vat_standard_rate) || 0 : 0,
    vat_source: shopVat ? "shop" : tenantVat ? "business" : null,

    is_catering_levy_enabled: levyEnabled,
    catering_levy_rate: levyEnabled ? Number(levyRate) || 0 : 0,
    catering_levy_source: shopLevy ? "shop" : businessOn ? "business" : null,
  };
};

// ── Current branch VAT (synchronous) ───────────────────────────────────────
// The cart store and print views compute totals synchronously, so the
// current branch's tax_settings are cached in localStorage whenever the shop
// is fetched or its tax settings are saved.
const SHOP_TAX_CACHE_KEY = "shop_tax_settings";

export const cacheShopTaxSettings = (shopId: string | null | undefined, taxSettings: ShopTaxSettings | null | undefined) => {
  if (!shopId) return;
  try {
    localStorage.setItem(SHOP_TAX_CACHE_KEY, JSON.stringify({ shop_id: shopId, tax_settings: taxSettings || {} }));
  } catch {
    /* storage unavailable — fall back to tenant VAT */
  }
};

const readCurrentShopTaxSettings = (): ShopTaxSettings | null => {
  try {
    const shopId = localStorage.getItem("shopId");
    const cached = JSON.parse(localStorage.getItem(SHOP_TAX_CACHE_KEY) || "null");
    if (cached && cached.shop_id === shopId) return cached.tax_settings || {};
    const shop = JSON.parse(localStorage.getItem("shop") || "null");
    if (shop && shop._id === shopId) return shop.tax_settings || {};
  } catch {
    /* ignore malformed storage */
  }
  return null;
};

/**
 * VAT for the current branch. When the branch has its own VAT switched on,
 * its rate and pricing mode take priority over the business-wide (tenant)
 * VAT; otherwise the tenant's VAT applies, with the cart's long-standing
 * defaults (on, 16%) when the tenant hasn't set them.
 */
export const getCurrentVatConfig = (): {
  enabled: boolean;
  mode: VatPricingMode;
  rate: number;
  source: "shop" | "business";
} => {
  const s = readCurrentShopTaxSettings();
  if (s?.vat_enabled) {
    return {
      enabled: true,
      mode: (String(s.vat_pricing_mode || "EXCLUSIVE").toUpperCase() === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE"),
      rate: Number(s.vat_standard_rate) || 0.16,
      source: "shop",
    };
  }

  let tenant: any = null;
  try {
    tenant = JSON.parse(localStorage.getItem("tenant") || "null");
  } catch {
    tenant = null;
  }
  const enabled = tenant?.is_vat_enabled ?? true;
  return {
    enabled,
    mode: String(tenant?.vat_pricing_mode || "EXCLUSIVE").toUpperCase() === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE",
    rate: enabled ? (tenant?.vat_standard_rate || 0.16) : 0,
    source: "business",
  };
};

/** 0.02 → "2%", 0.165 → "16.5%" */
export const formatRate = (rate?: number) =>
  `${parseFloat(((Number(rate) || 0) * 100).toFixed(2))}%`;
