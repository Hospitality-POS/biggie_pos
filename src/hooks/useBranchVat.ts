/**
 * VAT for the current branch — the branch's own VAT (shop.tax_settings) when
 * switched on, otherwise the business-wide VAT (tenant). Resolved with the
 * same rules as the API (utils/taxConfig → resolveTaxConfig). Sales documents
 * use it so the user never has to pick a VAT rate or pricing mode by hand.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchShop } from "@services/shops";
import { fetchTenantDetails, getCurrentTenantId } from "@services/tenants";
import { resolveTaxConfig, VatPricingMode } from "@utils/taxConfig";

export interface BranchVatState {
  enabled: boolean;
  /** decimal, e.g. 0.16 */
  rate: number;
  mode: VatPricingMode;
  source: "shop" | "business" | null;
  branchName?: string;
  isLoading: boolean;
}

export const useBranchVat = (enabled = true): BranchVatState => {
  const shopId = localStorage.getItem("shopId");
  const tenantId = getCurrentTenantId();

  const { data: tenantRes, isLoading: loadingTenant } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: () => fetchTenantDetails(tenantId!),
    enabled: enabled && !!tenantId,
    staleTime: 60_000,
  });

  const { data: shop, isLoading: loadingShop } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: enabled && !!shopId,
    staleTime: 60_000,
  });

  const cfg = resolveTaxConfig(tenantRes?.data, shop, null);
  return {
    enabled: cfg.is_vat_enabled,
    rate: cfg.vat_standard_rate,
    mode: cfg.vat_pricing_mode,
    source: cfg.vat_source,
    branchName: shop?.name,
    isLoading: (!!tenantId && loadingTenant) || (!!shopId && loadingShop),
  };
};
