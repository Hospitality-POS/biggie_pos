// Licensing & Gating
export { ModuleGate, type ModuleGateProps } from './licensing/ModuleGate';
export { useModuleLicense } from './licensing/useModuleLicense';

// Pricing & Subscription Hooks
export {
  useModulePricing,
  useSubscribeModule,
  useTenantInvoices,
  useInitiatePayment,
  fetchModulePlans,
  fetchModuleFeatures,
  type TenantInvoice,
} from './hooks/usePricing';

// Responsive Grid Hook
export { useResponsive, useIsMobile, type ResponsiveState } from './hooks/useResponsive';

// Types
export * from './types/pricing';
