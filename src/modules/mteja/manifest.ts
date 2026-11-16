export interface ModuleManifest {
  id: string;
  name: string;
  code: string;
  description: string;
  version: string;
  icon: string;
  requiredPlanTier?: 'starter' | 'growth' | 'pro' | 'enterprise';
  features: string[];
  routes: {
    path: string;
    label: string;
    exact?: boolean;
    adminOnly?: boolean;
    permission?: string;
  }[];
}

export const MtejaManifest: ModuleManifest = {
  id: 'mteja',
  name: 'Mteja CRM & Omnichannel',
  code: 'MTEJA',
  description: 'Customer Relations, WhatsApp Omnichannel Inbox, Leads, Campaigns & Sales Targets',
  version: '1.0.0',
  icon: 'MessageOutlined',
  requiredPlanTier: 'growth',
  features: [
    'Omnichannel WhatsApp & Messenger Inbox',
    'Lead Pipeline & Opportunity Management',
    'Marketing Campaigns & Broadcasts',
    'Sales Targets & Department Budgets',
    'Customer Activity Calendar & Tasks',
    'Quotes & Invoicing Bridge',
    'WhatsApp Catalog & Marketplace',
    'CRM & Conversational Analytics',
  ],
  routes: [
    { path: '/crm', label: 'CRM Dashboard', permission: 'CUSTOMERS_VIEW' },
    { path: '/crm/leads', label: 'Leads Pipeline', permission: 'CRM_LEADS_VIEW' },
    { path: '/crm/campaigns', label: 'Campaigns', permission: 'CRM_CAMPAIGNS_VIEW' },
    { path: '/crm/sales-targets', label: 'Sales Targets', permission: 'CRM_TARGETS_VIEW' },
    { path: '/crm/sales-budgets', label: 'Sales Budgets', permission: 'CRM_BUDGETS_VIEW' },
    { path: '/crm/quotes', label: 'Quotes', permission: 'CUSTOMERS_VIEW' },
    { path: '/crm/calendar', label: 'Activity Calendar', permission: 'CUSTOMERS_VIEW' },
    { path: '/omnichannel', label: 'Omnichannel Inbox', permission: 'OMNICHANNEL_VIEW' },
    { path: '/admin/crm', label: 'Admin CRM', adminOnly: true, permission: 'CUSTOMERS_VIEW' },
  ],
};

export default MtejaManifest;
