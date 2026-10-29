import { useMemo } from 'react';
import { useTenantModules } from '@hooks/useTenantModules';
import { isModuleEnabled, readStoredTenant } from '@utils/parseTenantModules';
import { BaseModuleKey } from '../types/pricing';
import { useSubscribeModule } from '../hooks/usePricing';

export function useModuleLicense(moduleKey: BaseModuleKey) {
  const tenantModules = useTenantModules();
  const subscribeMutation = useSubscribeModule();

  const isLicensed = useMemo(() => {
    return isModuleEnabled(tenantModules, moduleKey);
  }, [tenantModules, moduleKey]);

  const tenant = useMemo(() => {
    return readStoredTenant();
  }, []);

  const enableModule = async (planId?: string) => {
    return subscribeMutation.mutateAsync({ moduleKey, planId });
  };

  return {
    isLicensed,
    tenant,
    enableModule,
    isActivating: subscribeMutation.isLoading,
  };
}
