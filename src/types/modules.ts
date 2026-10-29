export interface ModuleSubdomain {
  id: string;
  name: string;
  path: string;
  description: string;
  icon?: string;
}

export interface ModuleRouteDefinition {
  path: string;
  label?: string;
  exact?: boolean;
  adminOnly?: boolean;
  permission?: string | string[];
}

export interface ModuleManifest {
  id: string;
  name: string;
  code?: string;
  description: string;
  version: string;
  icon: string;
  category?: 'commerce' | 'finance' | 'hr' | 'real_estate' | 'crm' | 'documents' | string;
  requiredPlanTier?: 'starter' | 'growth' | 'pro' | 'enterprise';
  features?: string[];
  subdomains?: ModuleSubdomain[];
  routes?: ModuleRouteDefinition[] | string[];
  tagline?: string;
  accentColor?: string;
  iconName?: string;
  defaultRoute?: string;
  chargingModel?: string;
}
