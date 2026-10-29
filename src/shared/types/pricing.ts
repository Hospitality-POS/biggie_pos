/**
 * pricing.ts
 *
 * Core SaaS types for Base Ecosystem modules, pricing tiers, billing cycles,
 * and subscription models fetched dynamically from OLD ADMIN PORTAL (admin_portal_api).
 */

export type BaseModuleKey = 'duka' | 'pesa' | 'bandu' | 'dala' | 'mteja' | 'esign';

export type BillingCycle = 'Monthly' | 'Quarterly' | 'Yearly';

export type ChargingModel =
  | 'flat_rate'
  | 'per_shop'
  | 'per_user'
  | 'per_transaction'
  | 'tiered';

export interface ModulePricingTierLimits {
  max_shops?: number;
  max_users?: number;
  max_products?: number;
  max_storage_gb?: number;
  max_properties?: number;
  max_units?: number;
  max_employees?: number;
  max_leads?: number;
  max_documents?: number;
  transaction_rate?: number;
  features?: string[];
  [key: string]: any;
}

export interface SaaSSubscriptionPlan {
  _id: string;
  name: string;
  code: string;
  module: BaseModuleKey;
  module_variant?: string;
  solution_type?: string;
  description?: string;
  price: number;
  setup_fee?: number;
  currency: string;
  billing_cycle: BillingCycle;
  charging_model: ChargingModel;
  is_custom?: boolean;
  status: 'active' | 'archived';
  features: string[] | Array<{ _id: string; name: string; code: string; description?: string }>;
  limits?: ModulePricingTierLimits;
  is_recommended?: boolean;
  sort_order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaasFeature {
  _id: string;
  name: string;
  code: string;
  description?: string;
  module?: BaseModuleKey;
  modules?: Array<BaseModuleKey | 'all'>;
  solution_type?: string;
  is_active: boolean;
}

export interface ModuleManifest {
  id: BaseModuleKey;
  name: string;
  tagline: string;
  description: string;
  accentColor: string;
  iconName: string;
  defaultRoute: string;
  routes: string[];
  chargingModel: ChargingModel;
  features: string[];
}
