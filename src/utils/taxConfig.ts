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

/** 0.02 → "2%", 0.165 → "16.5%" */
export const formatRate = (rate?: number) =>
  `${parseFloat(((Number(rate) || 0) * 100).toFixed(2))}%`;
