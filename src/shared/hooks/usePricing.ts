import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { message } from 'antd';
import { TENANT_BASE_URL } from '@utils/config';
import { BaseModuleKey, SaaSSubscriptionPlan, SaasFeature, DEFAULT_BASE_PLANS } from '../types/pricing';
import { getCurrentTenantId } from '@services/tenants';

/**
 * Fetch active subscription plans for a given module from admin_portal_api
 */
export const fetchModulePlans = async (moduleKey: BaseModuleKey): Promise<SaaSSubscriptionPlan[]> => {
  const fallbackPlans = DEFAULT_BASE_PLANS[moduleKey] || [];
  if (!TENANT_BASE_URL) return fallbackPlans;
  try {
    const res = await axios.get(`${TENANT_BASE_URL}/api/subscriptions`, {
      params: { module: moduleKey, is_active: 'true', status: 'active' },
    });
    const data = res.data?.data || res.data || [];
    if (Array.isArray(data) && data.length > 0) {
      // Validate that returned plans strictly match this module or its legacy solution_type
      const validPlans = data.filter((p: any) => {
        if (!p) return false;
        if (p.module) return p.module.toLowerCase() === moduleKey.toLowerCase();
        const sol = (p.solution_type || '').toLowerCase();
        if (moduleKey === 'duka' && (sol.includes('pos') || sol.includes('retail') || sol.includes('duka'))) return true;
        if (moduleKey === 'pesa' && (sol.includes('account') || sol.includes('pesa'))) return true;
        if (moduleKey === 'bandu' && (sol.includes('payroll') || sol.includes('bandu') || sol.includes('hr'))) return true;
        if (moduleKey === 'dala' && (sol.includes('prop') || sol.includes('dala') || sol.includes('estate'))) return true;
        if (moduleKey === 'mteja' && (sol.includes('crm') || sol.includes('mteja') || sol.includes('chat'))) return true;
        if (moduleKey === 'esign' && (sol.includes('sign') || sol.includes('esign') || sol.includes('doc'))) return true;
        return false;
      });

      if (validPlans.length > 0) {
        return validPlans;
      }
    }
    return fallbackPlans;
  } catch (err) {
    console.warn(`Failed to fetch pricing plans for ${moduleKey}, using defaults:`, err);
    return fallbackPlans;
  }
};


/**
 * Fetch available features for a given module
 */
export const fetchModuleFeatures = async (moduleKey: BaseModuleKey): Promise<SaasFeature[]> => {
  if (!TENANT_BASE_URL) return [];
  try {
    const res = await axios.get(`${TENANT_BASE_URL}/api/features`, {
      params: { module: moduleKey },
    });
    const data = res.data?.data || res.data || [];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`Failed to fetch features for ${moduleKey}:`, err);
    return [];
  }
};

/**
 * React Query hook for retrieving SaaS pricing tiers for a module
 */
export function useModulePricing(moduleKey: BaseModuleKey) {
  const plansQuery = useQuery({
    queryKey: ['saas-plans', moduleKey],
    queryFn: () => fetchModulePlans(moduleKey),
    staleTime: 1000 * 60 * 15, // 15 mins cache
    refetchOnWindowFocus: false,
  });

  const featuresQuery = useQuery({
    queryKey: ['saas-features', moduleKey],
    queryFn: () => fetchModuleFeatures(moduleKey),
    staleTime: 1000 * 60 * 30, // 30 mins cache
    refetchOnWindowFocus: false,
  });

  return {
    plans: plansQuery.data || [],
    features: featuresQuery.data || [],
    isLoading: plansQuery.isLoading || featuresQuery.isLoading,
    isError: plansQuery.isError,
    refetch: () => {
      plansQuery.refetch();
      featuresQuery.refetch();
    },
  };
}

/**
 * Mutation hook to activate/subscribe to a module for the current tenant
 */
export function useSubscribeModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moduleKey }: { moduleKey: BaseModuleKey; planId?: string }) => {
      const tenantId = getCurrentTenantId();
      if (!tenantId) {
        throw new Error('No tenant ID found. Please re-login.');
      }
      // Route through appropriate enable endpoint in admin_portal_api
      const endpoint = `${TENANT_BASE_URL}/api/tenants/${tenantId}/enable-${moduleKey}`;
      try {
        const res = await axios.post(endpoint, {
          accept_terms: true,
          accept_charges: true,
        });
        return res.data;
      } catch (err: any) {
        // Fallback for modular apps if the remote API doesn't have an enable-<moduleKey> endpoint yet
        if (err?.response?.status === 404) {
          const stored = localStorage.getItem("tenant");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              parsed.modules = { ...(parsed.modules || {}), [moduleKey]: true };
              localStorage.setItem("tenant", JSON.stringify(parsed));
            } catch (_) {}
          }
          return { success: true, module: moduleKey, fallback: true };
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      message.success(`Successfully enabled ${variables.moduleKey.toUpperCase()} module!`);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tenant-details'] });
      queryClient.invalidateQueries({ queryKey: ['saas-plans', variables.moduleKey] });
      // Trigger global tenant refresh
      window.dispatchEvent(new CustomEvent('tenantUpdated'));
      // Reload current page to initialize module context cleanly
      setTimeout(() => {
        window.location.reload();
      }, 800);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Failed to activate module.';
      message.error(msg);
    },
  });
}
