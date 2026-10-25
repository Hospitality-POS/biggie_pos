import { useQuery } from "@tanstack/react-query";
import { fetchSystemSetupDetailsById } from "@services/systemsetup";

/**
 * The shop's Spa & Wellness add-on switches (System Setup → Spa & Wellness).
 * Feature flags only count while the add-on itself is on, so callers can
 * use `clientForms` / `treatmentPlans` directly.
 */
export interface SpaSettings {
  enabled: boolean;
  clientForms: boolean;
  treatmentPlans: boolean;
  requireFormBeforeCheckout: boolean;
}

export const SPA_SETTINGS_QUERY_KEY = "spa-settings";

const OFF: SpaSettings = {
  enabled: false,
  clientForms: false,
  treatmentPlans: false,
  requireFormBeforeCheckout: false,
};

export function useSpaSettings(): SpaSettings & { isLoading: boolean } {
  const shopId = localStorage.getItem("shopId");
  const validShop = !!shopId && shopId !== "null" && shopId !== "undefined" && shopId !== "{}";

  const { data, isLoading } = useQuery({
    queryKey: [SPA_SETTINGS_QUERY_KEY, shopId],
    queryFn: async () => {
      const settings = await fetchSystemSetupDetailsById();
      const spa = settings?.spa_settings ?? {};
      if (!spa.enabled) return OFF;
      // Sub-flags default on (matches the API defaults)
      return {
        enabled: true,
        clientForms: spa.client_forms_enabled !== false,
        treatmentPlans: spa.treatment_plans_enabled !== false,
        requireFormBeforeCheckout:
          spa.client_forms_enabled !== false && spa.require_form_before_checkout === true,
      };
    },
    enabled: validShop,
    staleTime: 5 * 60_000,
  });

  return { ...(data ?? OFF), isLoading };
}
