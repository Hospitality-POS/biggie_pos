/**
 * VAT React Hook
 * 
 * This hook provides easy access to VAT configuration and calculation functions
 * for React components. It automatically fetches VAT settings from admin settings.
 */

import { useState, useEffect, useCallback } from 'react';
import { VATConfig, VATCalculationResult, getVATConfigSync, calculateVAT, calculateTotalVAT } from '@utils/vat';

export interface UseVATResult {
  vatConfig: VATConfig;
  isLoading: boolean;
  error: string | null;
  calculateVAT: (amount: number) => VATCalculationResult;
  calculateTotalVAT: (items: Array<{ amount: number; quantity?: number }>) => VATCalculationResult;
  refreshConfig: () => Promise<void>;
}

/**
 * Hook for VAT configuration and calculations
 */
export const useVAT = (): UseVATResult => {
  const [vatConfig, setVatConfig] = useState<VATConfig>({
    is_vat_enabled: false,
    vat_standard_rate: 0,
    vat_pricing_mode: 'EXCLUSIVE',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVATConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const config = getVATConfigSync();
      setVatConfig(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load VAT configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVATConfig();
  }, [loadVATConfig]);

  // Listen for tenant updates
  useEffect(() => {
    const handleTenantUpdate = (event: CustomEvent) => {
      const updatedTenant = event.detail;
      if (updatedTenant) {
        setVatConfig({
          is_vat_enabled: updatedTenant.is_vat_enabled || false,
          vat_standard_rate: updatedTenant.vat_standard_rate || 0,
          vat_pricing_mode: updatedTenant.vat_pricing_mode || 'EXCLUSIVE',
        });
      }
    };

    window.addEventListener('tenantUpdated', handleTenantUpdate as EventListener);
    return () => {
      window.removeEventListener('tenantUpdated', handleTenantUpdate as EventListener);
    };
  }, []);

  const calculateVATAmount = useCallback((amount: number): VATCalculationResult => {
    return calculateVAT(amount, vatConfig);
  }, [vatConfig]);

  const calculateTotalVATAmount = useCallback((items: Array<{ amount: number; quantity?: number }>): VATCalculationResult => {
    return calculateTotalVAT(items, vatConfig);
  }, [vatConfig]);

  const refreshConfig = useCallback(async () => {
    await loadVATConfig();
  }, [loadVATConfig]);

  return {
    vatConfig,
    isLoading,
    error,
    calculateVAT: calculateVATAmount,
    calculateTotalVAT: calculateTotalVATAmount,
    refreshConfig,
  };
};

export default useVAT;
