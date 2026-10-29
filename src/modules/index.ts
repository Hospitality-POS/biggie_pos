/**
 * Canonical Feature-Sliced Modules Registry & Aggregator
 * 
 * Modules:
 * - duka: POS, Retail, Restaurant, Catalog, Cart, Tables, Orders, Inventory
 * - pesa: Accounting, Invoices, Chart of Accounts, Taxes, Banking
 * - bandu: HR, Payroll, Employees, Shifts, Attendance, Payslips
 * - dala: Real Estate, Properties, Units, Leases, Maintenance, Rent
 * - mteja: CRM, WhatsApp, Omnichannel Messaging, Customer Relations
 * - esign: Document Center, Contracts, Digital Signatures, Templates, Verification
 */

export * as duka from './duka';
export * as pesa from './pesa';
export * as bandu from './bandu';
export * as dala from './dala';
export * as mteja from './mteja';
export * as esign from './esign';

export { dukaManifest } from './duka';
export { pesaManifest } from './pesa';
export { BanduManifest } from './bandu';
export { DALA_MANIFEST } from './dala';
export { MtejaManifest } from './mteja';
export { esignManifest } from './esign';

export const MODULE_CATALOG = {
  duka: { id: 'duka', name: 'Duka POS & Retail', path: '/pos/dashboard' },
  pesa: { id: 'pesa', name: 'Pesa Financial Accounting', path: '/accounting/dashboard' },
  bandu: { id: 'bandu', name: 'Bandu HR & Payroll', path: '/hr' },
  dala: { id: 'dala', name: 'Dala Real Estate', path: '/dala' },
  mteja: { id: 'mteja', name: 'Mteja CRM & Omnichannel', path: '/crm/dashboard' },
  esign: { id: 'esign', name: 'E-Sign & Document Center', path: '/esign' },
} as const;

export type EcosystemModuleId = keyof typeof MODULE_CATALOG;
