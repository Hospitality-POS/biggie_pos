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
      params: { module: moduleKey, status: 'active' },
    });
    const data = res.data?.data || res.data || [];
    if (Array.isArray(data) && data.length > 0) {
      return data;
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
      const res = await axios.post(endpoint, {
        accept_terms: true,
        accept_charges: true,
      });
      return res.data;
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
