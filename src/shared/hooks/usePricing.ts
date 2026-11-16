import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import axiosInstance from '@services/request';
import { BaseModuleKey, SaaSSubscriptionPlan, SaasFeature, DEFAULT_BASE_PLANS } from '../types/pricing';

export interface TenantInvoice {
  _id: string;
  invoice_code?: string;
  amount: number;
  currency?: string;
  payment_status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  issue_date?: string;
  due_date?: string;
  subscription_id?: {
    _id: string;
    name: string;
    billing_cycle?: string;
    pricing?: number;
  };
  module?: string;
  createdAt?: string;
}

/**
 * Fetch active subscription plans for a given module via BFF Gateway (/api/billing/plans)
 */
export const fetchModulePlans = async (moduleKey: BaseModuleKey): Promise<SaaSSubscriptionPlan[]> => {
  const fallbackPlans = DEFAULT_BASE_PLANS[moduleKey] || [];
  try {
    const res = await axiosInstance.get('/api/billing/plans', {
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
 * Fetch available features for a given module via BFF Gateway (/api/billing/features)
 */
export const fetchModuleFeatures = async (moduleKey: BaseModuleKey): Promise<SaasFeature[]> => {
  try {
    const res = await axiosInstance.get('/api/billing/features', {
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
 * Mutation hook to activate/subscribe to a module for the current tenant via BFF Gateway
 */
export function useSubscribeModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      moduleKey,
      planId,
      billingCycle,
    }: {
      moduleKey: BaseModuleKey;
      planId?: string;
      billingCycle?: 'Monthly' | 'Yearly';
    }) => {
      try {
        const res = await axiosInstance.post('/api/billing/subscribe', {
          moduleKey,
          planId,
          billingCycle: billingCycle || 'Monthly',
        });
        return res.data;
      } catch (err: any) {
        // Fallback for modular local dev if remote API doesn't support the module yet
        if (err?.response?.status === 404 || err?.response?.status === 501) {
          const stored = localStorage.getItem('tenant');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              parsed.modules = { ...(parsed.modules || {}), [moduleKey]: true };
              localStorage.setItem('tenant', JSON.stringify(parsed));
            } catch (_) {}
          }
          return { success: true, module: moduleKey, fallback: true };
        }
        throw err;
      }
    },
    onSuccess: (data, variables) => {
      message.success(`Successfully enabled ${variables.moduleKey.toUpperCase()} module!`);

      // Update tenant in localStorage and cache reactively with fresh server data
      const freshTenant = data?.data?.tenant || data?.tenant;
      if (freshTenant) {
        localStorage.setItem('tenant', JSON.stringify(freshTenant));
        queryClient.setQueryData(['tenant-details'], freshTenant);
      } else {
        const stored = localStorage.getItem('tenant');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            parsed.modules = { ...(parsed.modules || {}), [variables.moduleKey]: true };
            localStorage.setItem('tenant', JSON.stringify(parsed));
            queryClient.setQueryData(['tenant-details'], parsed);
          } catch (_) {}
        }
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tenant-details'] });
      queryClient.invalidateQueries({ queryKey: ['saas-plans', variables.moduleKey] });
      queryClient.invalidateQueries({ queryKey: ['tenant-invoices'] });

      // Trigger global tenant refresh across components
      window.dispatchEvent(new CustomEvent('tenantUpdated'));
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to activate module.';
      message.error(msg);
    },
  });
}

/**
 * React Query hook to fetch current tenant invoices via BFF Gateway
 */
export function useTenantInvoices() {
  return useQuery({
    queryKey: ['tenant-invoices'],
    queryFn: async (): Promise<TenantInvoice[]> => {
      try {
        const res = await axiosInstance.get('/api/billing/invoices');
        const list = res.data?.data || res.data || [];
        return Array.isArray(list) ? list : [];
      } catch (err) {
        console.warn('Failed to fetch invoices:', err);
        return [];
      }
    },
    staleTime: 1000 * 60 * 3, // 3 mins cache
    refetchOnWindowFocus: true,
  });
}

/**
 * Mutation hook to initiate an instant M-Pesa STK push for an invoice
 */
export function useInitiatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      mpesaPhoneNumber,
      amount,
    }: {
      invoiceId: string;
      mpesaPhoneNumber: string;
      amount?: number;
    }) => {
      const res = await axiosInstance.post(`/api/billing/invoices/${invoiceId}/pay`, {
        payment_method: 'mpesa',
        mpesa_phone_number: mpesaPhoneNumber,
        amount,
      });
      return res.data;
    },
    onSuccess: () => {
      message.success('M-Pesa payment prompt sent to your phone! Please enter your PIN to complete.');
      queryClient.invalidateQueries({ queryKey: ['tenant-invoices'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to initiate M-Pesa payment.';
      message.error(msg);
    },
  });
}
