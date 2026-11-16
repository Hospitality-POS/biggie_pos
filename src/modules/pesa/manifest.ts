import type { ModuleManifest } from '../../types/modules';

export const pesaManifest: ModuleManifest = {
  id: 'pesa',
  name: 'Pesa Financial Accounting',
  description: 'Enterprise accounting, chart of accounts, banking, invoices, taxes, and financial reports',
  version: '1.0.0',
  icon: 'BankOutlined',
  category: 'finance',
  subdomains: [
    {
      id: 'dashboard',
      name: 'Financial Dashboard',
      path: '/accounting/dashboard',
      description: 'Executive overview of cashflow, revenue, expenses, and key ratios',
    },
    {
      id: 'accounts',
      name: 'Chart of Accounts',
      path: '/accounting/accounts',
      description: 'Account hierarchy, ledgers, transaction locks, and currencies',
    },
    {
      id: 'invoices',
      name: 'Invoices & Bills',
      path: '/accounting/bills',
      description: 'Sales invoices, vendor bills, receipts, credit/debit notes, and refunds',
    },
    {
      id: 'banking',
      name: 'Banking & Reconciliation',
      path: '/accounting/bank-statements',
      description: 'Bank statements import, automated rules, review, and reconciliation',
    },
    {
      id: 'journals',
      name: 'Journal Entries',
      path: '/accounting/journals',
      description: 'Double-entry general journals, manual adjustments, and audit trail',
    },
    {
      id: 'taxes',
      name: 'Taxes & DigiTax',
      path: '/accounting/taxes',
      description: 'VAT calculations, e-TIMS compliance, tax rates, and filing summaries',
    },
    {
      id: 'reports',
      name: 'Financial Reports',
      path: '/accounting/reports',
      description: 'Balance sheet, profit & loss, trial balance, and general ledger reports',
    },
    {
      id: 'assets',
      name: 'Asset Management',
      path: '/accounting/assets',
      description: 'Fixed asset registers, depreciation schedules, requests, and maintenance',
    },
  ],
  routes: [
    {
      path: '/accounting',
      exact: false,
      permission: ['ACCOUNTING_DASHBOARD_VIEW', 'ACCOUNTING_COA_VIEW'],
    },
    {
      path: '/admin/accounting',
      exact: false,
      permission: ['ACCOUNTING_DASHBOARD_VIEW', 'ACCOUNTING_COA_VIEW'],
    },
  ],
};

export default pesaManifest;
