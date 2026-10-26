/**
 * Catering levy for the current branch — business-wide setting (system
 * settings) or the branch's own (shop.tax_settings), resolved the same way
 * as the API. Used by sales documents (invoices, sales receipts) to preview
 * the levy before saving; the API recomputes it authoritatively.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchCateringLevy } from "@services/systemsetup";
import { fetchShop } from "@services/shops";
import { resolveTaxConfig } from "@utils/taxConfig";

export interface CateringLevyState {
  enabled: boolean;
  /** decimal, e.g. 0.02 */
  rate: number;
  source: "shop" | "business" | null;
  isLoading: boolean;
}

export const useCateringLevy = (enabled = true): CateringLevyState => {
  const shopId = localStorage.getItem("shopId");

  const { data: businessLevy, isLoading: loadingLevy } = useQuery({
    queryKey: ["catering-levy"],
    queryFn: fetchCateringLevy,
    enabled,
    staleTime: 60_000,
  });

  const { data: shop, isLoading: loadingShop } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: enabled && !!shopId,
    staleTime: 60_000,
  });

  const cfg = resolveTaxConfig(null, shop, businessLevy);
  return {
    enabled: cfg.is_catering_levy_enabled,
    rate: cfg.catering_levy_rate,
    source: cfg.catering_levy_source,
    isLoading: loadingLevy || (!!shopId && loadingShop),
  };
};

/** Levy on a net (ex-VAT, after-discount) value — mirrors computeCateringLevy in the API. */
export const computeCateringLevy = (netBase: number, rate: number, exempt: boolean) =>
  exempt || !(rate > 0) || !(netBase > 0) ? 0 : parseFloat((netBase * rate).toFixed(2));
