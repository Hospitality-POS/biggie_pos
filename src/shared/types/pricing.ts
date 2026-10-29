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
  tier?: 'Free' | 'Starter' | 'Business' | 'Pro' | 'Enterprise' | string;
  description?: string;
  price: number;
  pricing?: {
    monthly: number;
    yearly?: number;
  };
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

/**
 * Official BasePoint Kenya Pricing Defaults (23 October 2026)
 * - 1-month free trial on every product
 * - 10% discount when paying annually
 * - Prices exclude 16% VAT
 */
export const DEFAULT_BASE_PLANS: Record<BaseModuleKey, SaaSSubscriptionPlan[]> = {
  duka: [
    {
      _id: 'default-duka-starter',
      name: 'Duka Starter (Cloud)',
      code: 'DUKA_STARTER',
      module: 'duka',
      tier: 'Starter',
      price: 2500,
      pricing: { monthly: 2500, yearly: 27000 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'per_shop',
      status: 'active',
      is_recommended: false,
      sort_order: 1,
      description: 'Point of sale, catalog, orders, receipts, basic stock, and desktop printing for 1 branch.',
      limits: { max_shops: 1, max_users: 3 },
      features: [
        'Point of sale, orders, receipts, M-Pesa / cash / card',
        'Products, categories, basic stock',
        'Basic sales reports & receipt printing agent',
        'Refunds and petty cash',
        '1 till included (extra till KES 750/mo)',
        '3 users per branch',
        '1-month free trial',
      ],
    },
    {
      _id: 'default-duka-business',
      name: 'Duka Business (Cloud)',
      code: 'DUKA_BUSINESS',
      module: 'duka',
      tier: 'Business',
      price: 3500,
      pricing: { monthly: 3500, yearly: 37800 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'per_shop',
      status: 'active',
      is_recommended: true,
      sort_order: 2,
      description: 'Full inventory, purchase orders, eTIMS included, staff permissions, and reports for up to 5 branches.',
      limits: { max_shops: 5, max_users: 10 },
      features: [
        'Everything in Starter',
        'Suppliers, purchase orders, full inventory',
        'Crew shifts, staff roles & permissions',
        'KRA eTIMS invoicing included',
        'Document Center & full reports exports',
        '2 tills included (extra till KES 1,000/mo)',
        'Up to 10 users per branch, 5 branches',
        'Phone & WhatsApp support (7 days)',
      ],
    },
    {
      _id: 'default-duka-pro',
      name: 'Duka Pro (Cloud)',
      code: 'DUKA_PRO',
      module: 'duka',
      tier: 'Pro',
      price: 7000,
      pricing: { monthly: 7000, yearly: 75600 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'per_shop',
      status: 'active',
      is_recommended: false,
      sort_order: 3,
      description: 'Multi-branch console, comparison dashboard, Biashara AI health score, and audit trail.',
      limits: { max_shops: 9999, max_users: 9999 },
      features: [
        'Everything in Business',
        'Multi-branch console & comparison dashboard',
        'Biashara AI & Business Health Score included',
        'Complete system audit trail',
        '3 tills included (extra till KES 1,000/mo)',
        'Unlimited users & unlimited branches',
        'Priority support',
      ],
    },
  ],
  pesa: [
    {
      _id: 'default-pesa-free',
      name: 'Pesa Free',
      code: 'PESA_FREE',
      module: 'pesa',
      tier: 'Free',
      price: 0,
      pricing: { monthly: 0, yearly: 0 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'flat_rate',
      status: 'active',
      is_recommended: false,
      sort_order: 1,
      description: 'Invoices, sales receipts, expenses, customers for 1 user. Free forever.',
      limits: { max_users: 1 },
      features: [
        'Invoices & sales receipts',
        'Expense tracking & customer management',
        '1 user',
        'Supplier bills not included',
        'Free forever',
      ],
    },
    {
      _id: 'default-pesa-starter',
      name: 'Pesa Starter',
      code: 'PESA_STARTER',
      module: 'pesa',
      tier: 'Starter',
      price: 1500,
      pricing: { monthly: 1500, yearly: 16200 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'flat_rate',
      status: 'active',
      is_recommended: false,
      sort_order: 2,
      description: 'Journals, chart of accounts, suppliers, and basic financial reports for 2 users.',
      limits: { max_users: 2 },
      features: [
        'Everything in Free',
        'General journals & double-entry accounting',
        'Custom Chart of Accounts',
        'Suppliers management & basic financial reports',
        'Connects to POS & eTIMS',
        '2 users',
        '1-month free trial',
      ],
    },
    {
      _id: 'default-pesa-business',
      name: 'Pesa Business',
      code: 'PESA_BUSINESS',
      module: 'pesa',
      tier: 'Business',
      price: 2500,
      pricing: { monthly: 2500, yearly: 27000 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'flat_rate',
      status: 'active',
      is_recommended: true,
      sort_order: 3,
      description: 'Supplier bills, debit/credit notes, banking, automated bank reconciliation, and full reports.',
      limits: { max_users: 5 },
      features: [
        'Everything in Starter',
        'Supplier bills & accounts payable',
        'Credit & debit notes',
        'Bank statements import & reconciliation rules',
        'Full reports (Balance Sheet, P&L, Trial Balance)',
        '5 users',
      ],
    },
    {
      _id: 'default-pesa-pro',
      name: 'Pesa Pro',
      code: 'PESA_PRO',
      module: 'pesa',
      tier: 'Pro',
      price: 4500,
      pricing: { monthly: 4500, yearly: 48600 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'flat_rate',
      status: 'active',
      is_recommended: false,
      sort_order: 4,
      description: 'Fixed asset register, depreciation schedules, maintenance requests, multi-currency, and audit trail.',
      limits: { max_users: 9999 },
      features: [
        'Everything in Business',
        'Fixed asset register & depreciation schedules',
        'Asset requests & maintenance tracking',
        'Multi-currency support',
        'Financial audit trail',
        'Unlimited users',
      ],
    },
  ],
  bandu: [
    {
      _id: 'default-bandu-free',
      name: 'Bandu Free',
      code: 'BANDU_FREE',
      module: 'bandu',
      tier: 'Free',
      price: 0,
      pricing: { monthly: 0, yearly: 0 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'flat_rate',
      status: 'active',
      is_recommended: false,
      sort_order: 1,
      description: 'Up to 4 staff: employee records, payroll with statutory deductions, and payslips.',
      limits: { max_employees: 4 },
      features: [
        'Up to 4 staff members',
        'Employee master records & contracts',
        'Payroll calculation (PAYE, NSSF, SHIF, Housing Levy, NITA)',
        'Automated payslip generation',
        'Free forever',
      ],
    },
    {
      _id: 'default-bandu-starter',
      name: 'Bandu Starter',
      code: 'BANDU_STARTER',
      module: 'bandu',
      tier: 'Starter',
      price: 1500,
      pricing: { monthly: 1500, yearly: 16200 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'flat_rate',
      status: 'active',
      is_recommended: false,
      sort_order: 2,
      description: 'Up to 10 staff: biometric attendance tracking, leave policies, and shift scheduling.',
      limits: { max_employees: 10 },
      features: [
        'Everything in Free',
        'Up to 10 staff members',
        'Biometric attendance tracking & clock-in',
        'Leave application, policies & approvals',
        'Shift scheduling & rosters',
        '1-month free trial',
      ],
    },
    {
      _id: 'default-bandu-business',
      name: 'Bandu Business',
      code: 'BANDU_BUSINESS',
      module: 'bandu',
      tier: 'Business',
      price: 2500,
      pricing: { monthly: 2500, yearly: 27000 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'flat_rate',
      status: 'active',
      is_recommended: true,
      sort_order: 3,
      description: 'Up to 25 staff: leave calendar, automated payroll posting to Pesa, and HR reports.',
      limits: { max_employees: 25 },
      features: [
        'Everything in Starter',
        'Up to 25 staff members',
        'Leave calendar & holiday schedules',
        'Automated payroll posting to Pesa Accounting',
        'HR & Payroll reports and analytics',
      ],
    },
    {
      _id: 'default-bandu-pro',
      name: 'Bandu Pro',
      code: 'BANDU_PRO',
      module: 'bandu',
      tier: 'Pro',
      price: 4500,
      pricing: { monthly: 4500, yearly: 48600 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'flat_rate',
      status: 'active',
      is_recommended: false,
      sort_order: 4,
      description: 'Up to 50 staff: advanced deduction rules, statutory KRA P9 automation, and custom HR analytics.',
      limits: { max_employees: 50 },
      features: [
        'Everything in Business',
        'Up to 50 staff members',
        'Custom statutory deduction rules',
        'KRA P9 form bulk generation',
        'Executive HR & wage analytics',
      ],
    },
  ],
  mteja: [
    {
      _id: 'default-mteja-starter',
      name: 'Mteja Starter',
      code: 'MTEJA_STARTER',
      module: 'mteja',
      tier: 'Starter',
      price: 1500,
      pricing: { monthly: 1500, yearly: 16200 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'flat_rate',
      status: 'active',
      is_recommended: false,
      sort_order: 1,
      description: 'WhatsApp inbox (1 number, 2 agents), lead pipeline, quotes, and activity calendar.',
      limits: { max_leads: 500 },
      features: [
        'WhatsApp inbox (1 number, 2 agents included)',
        'Lead lifecycle & pipeline stages',
        'Sales quotes creation',
        'Activity & callback calendar',
        'Extra agents KES 500/mo each',
        '1-month free trial',
      ],
    },
    {
      _id: 'default-mteja-business',
      name: 'Mteja Business',
      code: 'MTEJA_BUSINESS',
      module: 'mteja',
      tier: 'Business',
      price: 2500,
      pricing: { monthly: 2500, yearly: 27000 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'flat_rate',
      status: 'active',
      is_recommended: true,
      sort_order: 2,
      description: 'Up to 5 agents included, WhatsApp marketing broadcasts, and WhatsApp marketplace.',
      limits: { max_leads: 5000 },
      features: [
        'Everything in Starter',
        'Up to 5 agents included',
        'WhatsApp marketing campaigns & bulk broadcasts',
        'WhatsApp marketplace integration',
        'Customer 360 profile',
      ],
    },
    {
      _id: 'default-mteja-pro',
      name: 'Mteja Pro',
      code: 'MTEJA_PRO',
      module: 'mteja',
      tier: 'Pro',
      price: 5000,
      pricing: { monthly: 5000, yearly: 54000 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'flat_rate',
      status: 'active',
      is_recommended: false,
      sort_order: 3,
      description: 'Up to 10 agents included, sales targets, budgets, and advanced CRM conversion analytics.',
      limits: { max_leads: 50000 },
      features: [
        'Everything in Business',
        'Up to 10 agents included',
        'Sales targets & quotas',
        'Sales budgets & performance metrics',
        'Omnichannel live conversation analytics',
      ],
    },
  ],
  dala: [
    {
      _id: 'default-dala-early-access',
      name: 'Dala Early Access',
      code: 'DALA_EARLY_ACCESS',
      module: 'dala',
      tier: 'Starter',
      price: 0,
      pricing: { monthly: 0, yearly: 0 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'flat_rate',
      status: 'active',
      is_recommended: true,
      sort_order: 1,
      description: 'Real estate property portfolios, units, tenant leases, and rent collection (Early Access).',
      features: [
        'Multi-property portfolio management',
        'Unit inventory & floor plans',
        'Tenant lease agreements & renewals',
        'Rent invoicing & M-Pesa tracking',
        'Maintenance work orders',
        'Early Access / Beta — Free',
      ],
    },
  ],
  esign: [
    {
      _id: 'default-esign-starter',
      name: 'E-Sign Starter',
      code: 'ESIGN_STARTER',
      module: 'esign',
      tier: 'Starter',
      price: 1000,
      pricing: { monthly: 1000, yearly: 10800 },
      currency: 'KES',
      billing_cycle: 'Monthly',
      charging_model: 'flat_rate',
      status: 'active',
      is_recommended: true,
      sort_order: 1,
      description: 'Document center, signature pad, audit trails, and contract templates (50 documents/mo).',
      limits: { max_documents: 50 },
      features: [
        '50 documents per month (KES 20/doc after)',
        'Legal contract templates',
        'Interactive signature pad & drawing tool',
        'Recipient signing ceremony & tracking',
        'Tamper-evident cryptographic verification',
        'Full signing audit trail',
      ],
    },
  ],
};


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
