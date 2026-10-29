import { ModuleManifest } from '@shared/types/pricing';

export const DALA_MANIFEST: ModuleManifest = {
  id: 'dala',
  name: 'Dala by Base',
  tagline: 'Real Estate, Leases & Property Portfolio Management',
  description:
    'Complete real estate lifecycle: multi-unit inventory, digital lease contracts, automated rent invoicing, meter readings, agent commissions, and maintenance dispatch.',
  accentColor: '#2563eb',
  iconName: 'HomeOutlined',
  defaultRoute: '/dala/dashboard',
  chargingModel: 'per_shop',
  routes: [
    '/dala',
    '/dala/dashboard',
    '/dala/properties',
    '/dala/property-types',
    '/dala/units',
    '/dala/sales',
    '/dala/leases',
    '/dala/commissions',
    '/dala/rent-collection',
    '/dala/maintenance',
    '/dala/reports',
  ],
  features: [
    'Multi-property portfolio tracking',
    'Block, floor, and unit structure management',
    'Tenant lease agreements & renewals',
    'Automated rent invoicing & payment collection',
    'Maintenance requests & vendor work orders',
    'Agent sales commission tracking & payouts',
    'Occupancy rate & yield analytics',
  ],
};
