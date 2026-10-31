import { useQuery } from "@tanstack/react-query";
import { fetchSystemSetupDetailsById } from "@services/systemsetup";

/**
 * The shop's Forms & Plans add-on switches (System Setup → Forms & Plans).
 * Feature flags only count while the add-on itself is on, so callers can
 * use them directly:
 *  - clientForms / clientPlans     → customers (Duka, Pesa)
 *  - employeeForms / employeePlans → Bandu HR
 *  - contactForms                  → Mteja leads and people who aren't customers
 *  - contactPlans                  → always off: contacts have forms only
 */
export interface FormsSettings {
  enabled: boolean;
  clientForms: boolean;
  clientPlans: boolean;
  employeeForms: boolean;
  employeePlans: boolean;
  contactForms: boolean;
  contactPlans: boolean;
  requireFormBeforeCheckout: boolean;
}

export const FORMS_SETTINGS_QUERY_KEY = "forms-settings";

const OFF: FormsSettings = {
  enabled: false,
  clientForms: false,
  clientPlans: false,
  employeeForms: false,
  employeePlans: false,
  contactForms: false,
  contactPlans: false,
  requireFormBeforeCheckout: false,
};

export function useFormsSettings(): FormsSettings & { isLoading: boolean } {
  const shopId = localStorage.getItem("shopId");
  const validShop = !!shopId && shopId !== "null" && shopId !== "undefined" && shopId !== "{}";

  const { data, isLoading } = useQuery({
    queryKey: [FORMS_SETTINGS_QUERY_KEY, shopId],
    queryFn: async () => {
      const settings = await fetchSystemSetupDetailsById();
      const fs = settings?.forms_settings ?? {};
      if (!fs.enabled) return OFF;
      // Client and contact flags default on, employee flags off (matches the API defaults)
      return {
        enabled: true,
        clientForms: fs.client_forms_enabled !== false,
        clientPlans: fs.client_plans_enabled !== false,
        employeeForms: fs.employee_forms_enabled === true,
        employeePlans: fs.employee_plans_enabled === true,
        contactForms: fs.contact_forms_enabled !== false,
        contactPlans: false,
        requireFormBeforeCheckout: fs.client_forms_enabled !== false && fs.require_form_before_checkout === true,
      };
    },
    enabled: validShop,
    staleTime: 5 * 60_000,
  });

  return { ...(data ?? OFF), isLoading };
}
