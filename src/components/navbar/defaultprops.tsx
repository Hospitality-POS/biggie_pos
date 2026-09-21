import {
  ApiFilled,
  AppstoreOutlined,
  ApartmentOutlined,
  CalculatorFilled,
  DashboardOutlined,
  ExperimentOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FolderFilled,
  GlobalOutlined,
  HomeFilled,
  HomeOutlined,
  UserOutlined,
  SettingOutlined,
  ShopOutlined,
  SwapOutlined,
  UsergroupAddOutlined,
  WalletOutlined,
  TeamOutlined,
  NotificationOutlined,
  AimOutlined,
  RiseOutlined,
  MedicineBoxOutlined,
  MessageOutlined,
  ArrowUpOutlined,
  AuditOutlined,
  BankOutlined,
  CustomerServiceOutlined,
  AccountBookOutlined,
  ReconciliationOutlined,
  BuildOutlined,
  SignatureOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "src/store";
import React from "react";
import { makePermissionChecker } from "@utils/accessControl";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { useActiveProduct, ProductKey, PRODUCT_CONFIGS } from "@context/ProductContext";

// ─── SVG tile helper ──────────────────────────────────────────────────────────
export const makeTile = (color: string, pathD: string): string => {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">',
    `<rect width="40" height="40" rx="10" fill="${color}"/>`,
    '<g transform="translate(8,8) scale(1.0)">',
    `<path d="${pathD}" fill="white" fill-rule="evenodd"/>`,
    "</g>",
    "</svg>",
  ].join("");
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};

export const makeTileImg = (color: string, pathD: string, alt = "icon"): React.ReactNode => (
  <img
    src={makeTile(color, pathD)}
    alt={alt}
    style={{
      width: 38,
      height: 38,
      borderRadius: 9,
      objectFit: "contain",
      display: "block",
      flexShrink: 0,
    }}
  />
);

export const ICONS = {
  checklist:
    "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z",
  table:
    "M20 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14H5v-5h6v5zm0-7H5V5h6v5zm9 7h-7v-5h7v5zm0-7h-7V5h7v5z",
  inventory:
    "M20 6h-2.18c.07-.44.18-.88.18-1.38C18 2.05 15.96 0 13.5 0S9 2.05 9 4.62c0 .5.11.94.18 1.38H7C5.9 6 5 6.9 5 8v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6.5 12L10 14.5l1.41-1.41L13.5 15.5l4.59-4.59L19.5 12 13.5 18z",
  payment:
    "M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z",
  supplier:
    "M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
  settings:
    "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  faq: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z",
  web: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 17.52 22 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.9 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z",
  accounting:
    "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z",
  invoice:
    "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  debit:
    "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z",
  journal:
    "M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 4h2v5l-1-.75L9 9V4zm9 16H6V4h1v9l3-2.25L13 13V4h5v16z",
  bank: "M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zM11.5 1L2 6v2h19V6l-9.5-5z",
  bankStatement:
    "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-2 9H7v-2h4v2zm2-4H7v-2h6v2zm0-4H7V8h6v2z",
  reports:
    "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
  customers:
    "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  coa: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z",
  expense:
    "M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM20 7H4L2 12v3h1v6h4v-6h5v6h4v-6h1v-3l-2-5zm-1 4l1 2.5H4L5 11h14z",
  bill: "M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm-7 6H7V8h6v2zm4 4H7v-2h10v2zm0-4h-2V8h2v2z",
  income:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z",
  salesReceipt:
    "M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5L6 2 4.5 3.5L3 2v20z",
  documents:
    "M20 6h-2.18c.07-.44.18-.88.18-1.38 0-2.57-2.04-4.62-4.5-4.62S9 2.05 9 4.62c0 .5.11.94.18 1.38H7C5.9 6 5 6.9 5 8v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0H10V4.62C10 3.17 11.12 2 12.5 2S15 3.17 15 4.62V6h-1zm1 5H9v-2h6v2zm4 4H9v-2h10v2z",
  omnichannel:
    "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z",
  currency:
    "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z",
  leads:
    "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  campaigns:
    "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z",
  target:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  budget:
    "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z",
  property: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  unit: "M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-4c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",
  lease:
    "M9 2v2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-2V2H9zm9 18H7V6h2v2h6V6h2v14z",
};

// ─── Route → permission gate maps ────────────────────────────────────────────
const POS_ROUTE_PERMISSIONS: Record<string, string> = {
  "/tables": "CART_VIEW_ITEMS",
  "/home-dashboard": "UNIFIED_DASHBOARD_VIEW",
  "/orders": "ORDERS_VIEW",
  "/store": "PRODUCTS_VIEW",
  "/inventory": "INVENTORY_VIEW",
  "/employee-shift": "SHIFTS_VIEW",
  "/customers": "CUSTOMERS_VIEW",
  "/reports": "REPORTS_ITEM_SALES|ACCOUNTING_REPORT_PROFIT_LOSS",
  "/documents": "DOCUMENTS_VIEW",
  "/petty-cash": "ORDERS_VIEW_DASHBOARD",
  "/refunds": "ORDERS_VIEW_DASHBOARD",
  "/Category-settings": "CATEGORIES_VIEW",
  "/table-settings": "TABLES_VIEW",
  "/suppliers": "SUPPLIERS_VIEW",
  "/help-center": "FAQ_VIEW",
  "/currencies": "ACCOUNTING_COA_VIEW",
  // CRM routes — only reachable when hasMteja, permission-gated here too
  "/crm/leads": "CRM_LEADS_VIEW",
  "/crm/campaigns": "CRM_CAMPAIGNS_VIEW",
  "/crm/sales-targets": "CRM_TARGETS_VIEW",
  "/crm/sales-budgets": "CRM_BUDGETS_VIEW",
  "/crm/quotes": "CUSTOMERS_VIEW",
  "/crm/calendar": "CUSTOMERS_VIEW",
};

const ACCOUNTING_ROUTE_PERMISSIONS: Record<string, string> = {
  "/accounting": "ACCOUNTING_DASHBOARD_VIEW",
  "/home-dashboard": "UNIFIED_DASHBOARD_VIEW",
  "/orders": "ACCOUNTING_INVOICE_VIEW",
  "/accounting/sales-receipts": "ACCOUNTING_INCOME_VIEW_HISTORY",
  "/accounting/expenses": "ACCOUNTING_INCOME_POST_EXPENSE",
  "/accounting/bills": "ACCOUNTING_INVOICE_VIEW",
  "/accounting/notes": "ACCOUNTING_NOTES_VIEW",
  "/accounting/journals": "ACCOUNTING_JOURNAL_VIEW",
  "/accounting/bank-statements": "ACCOUNTING_BANK_STMT_VIEW",
  "/accounting/reconciliation": "ACCOUNTING_RECON_VIEW",
  "/accounting/accounts": "ACCOUNTING_COA_VIEW",
  "/accounting/assets": "ACCOUNTING_ASSETS_VIEW",
  "/accounting/asset-requests": "ACCOUNTING_ASSET_REQUESTS_VIEW",
  "/accounting/asset-maintenance": "ACCOUNTING_ASSET_MAINTENANCE_VIEW",
  "/reports": "ACCOUNTING_REPORT_PROFIT_LOSS|REPORTS_ITEM_SALES",
  "/accounting/currencies": "ACCOUNTING_COA_VIEW",
  "/inventory": "INVENTORY_VIEW",
  "/customers": "CUSTOMERS_VIEW",
  "/suppliers": "SUPPLIERS_VIEW",
  "/payment-methods": "PAYMENT_METHODS_VIEW",
  "/system-setup": "SYSTEM_SETUP_VIEW",
  "/documents": "DOCUMENTS_VIEW",
};

const CRM_ROUTE_PERMISSIONS: Record<string, string> = {
  "/home-dashboard": "UNIFIED_DASHBOARD_VIEW",
  "/omnichannel": "OMNICHANNEL_VIEW",
  "/crm/leads": "CRM_LEADS_VIEW",
  "/crm/campaigns": "CRM_CAMPAIGNS_VIEW",
  "/crm/sales-targets": "CRM_TARGETS_VIEW",
  "/crm/sales-budgets": "CRM_BUDGETS_VIEW",
  "/crm/quotes": "CUSTOMERS_VIEW",
  "/crm/calendar": "CUSTOMERS_VIEW",
  "/customers": "CUSTOMERS_VIEW",
  "/reports": "REPORTS_ITEM_SALES",
  "/documents": "DOCUMENTS_VIEW",
};

const DALA_ROUTE_PERMISSIONS: Record<string, string> = {
  "/home-dashboard": "UNIFIED_DASHBOARD_VIEW",
  "/dala": "DALA_DASHBOARD_VIEW",
  "/dala/properties": "DALA_PROPERTIES_VIEW",
  "/dala/property-types": "DALA_PROPERTY_TYPES_VIEW",
  "/dala/sales": "DALA_SALES_VIEW",
  "/dala/leases": "DALA_LEASES_VIEW",
  "/dala/commissions": "DALA_COMMISSIONS_VIEW",
  "/dala/rent-collection": "DALA_RENT_COLLECTION_VIEW",
  "/dala/maintenance": "DALA_MAINTENANCE_VIEW",
  "/dala/reports": "DALA_REPORTS_VIEW",
  "/reports": "REPORTS_VIEW",
  "/documents": "DOCUMENTS_VIEW",
  "/staff-management": "USERS_VIEW",
};

const BANDU_ROUTE_PERMISSIONS: Record<string, string> = {
  "/home-dashboard": "UNIFIED_DASHBOARD_VIEW",
  "/hr": "BANDU_DASHBOARD_VIEW",
  "/hr/dashboard": "BANDU_DASHBOARD_VIEW",
  "/hr/employees": "BANDU_EMPLOYEES_VIEW",
  "/hr/leave": "BANDU_LEAVE_VIEW",
  "/hr/leave-policies": "BANDU_LEAVE_POLICIES_VIEW",
  "/hr/leave-calendar": "BANDU_LEAVE_VIEW",
  "/hr/attendance": "BANDU_ATTENDANCE_VIEW",
  "/hr/payroll": "BANDU_PAYROLL_VIEW",
  "/hr/payslips": "BANDU_PAYSLIPS_VIEW",
  "/hr/leave-approvals": "BANDU_LEAVE_APPROVALS_VIEW",
  "/reports": "REPORTS_VIEW",
  "/documents": "DOCUMENTS_VIEW",
  "/staff-management": "USERS_VIEW",
};

// ─── App Tiles Permissions ───────────────────────────────────────────────────
const POS_APP_PERMISSIONS: Record<string, string> = {
  "/Category-settings": "CATEGORIES_VIEW",
  "/table-settings": "TABLES_VIEW",
  "/inventory": "INVENTORY_VIEW",
  "/payment-methods": "PAYMENT_METHODS_VIEW",
  "/suppliers": "SUPPLIERS_VIEW",
  "/system-setup": "SYSTEM_SETUP_VIEW",
  "/staff-management": "USERS_VIEW",
  "/fss-faqs": "FAQ_VIEW",
  "/website-builder": "GALLERY_VIEW",
  "/documents": "DOCUMENTS_VIEW",
  // CRM tiles
  "/crm/leads": "CRM_LEADS_VIEW",
  "/crm/campaigns": "CRM_CAMPAIGNS_VIEW",
  "/crm/sales-targets": "CRM_TARGETS_VIEW",
  "/crm/sales-budgets": "CRM_BUDGETS_VIEW",
  "/crm/quotes": "CUSTOMERS_VIEW",
  "/crm/calendar": "CUSTOMERS_VIEW",
};

const ACCOUNTING_APP_PERMISSIONS: Record<string, string> = {
  "/accounting": "ACCOUNTING_DASHBOARD_VIEW",
  "/orders": "ACCOUNTING_INVOICE_VIEW",
  "/accounting/notes": "ACCOUNTING_NOTES_VIEW",
  "/accounting/journals": "ACCOUNTING_JOURNAL_VIEW",
  "/accounting/sales-receipts": "ACCOUNTING_INCOME_VIEW_HISTORY",
  "/accounting/bank-statements": "ACCOUNTING_BANK_STMT_VIEW",
  "/accounting/reconciliation": "ACCOUNTING_RECON_VIEW",
  "/accounting/accounts": "ACCOUNTING_COA_VIEW",
  "/accounting/expenses": "ACCOUNTING_INCOME_POST_EXPENSE",
  "/accounting/bills": "ACCOUNTING_INVOICE_VIEW",
  "/accounting/income": "ACCOUNTING_INCOME_VIEW_HISTORY",
  "/reports": "ACCOUNTING_REPORT_PROFIT_LOSS",
  "/accounting/currencies": "ACCOUNTING_COA_VIEW",
  "/inventory": "INVENTORY_VIEW",
  "/customers": "CUSTOMERS_VIEW",
  "/suppliers": "SUPPLIERS_VIEW",
  "/payment-methods": "PAYMENT_METHODS_VIEW",
  "/system-setup": "SYSTEM_SETUP_VIEW",
  "/documents": "DOCUMENTS_VIEW",
  "/omnichannel": "OMNICHANNEL_VIEW",
  "/currencies": "ACCOUNTING_COA_VIEW",
  // CRM tiles
  "/crm/leads": "CRM_LEADS_VIEW",
  "/crm/campaigns": "CRM_CAMPAIGNS_VIEW",
  "/crm/sales-targets": "CRM_TARGETS_VIEW",
  "/crm/sales-budgets": "CRM_BUDGETS_VIEW",
  "/crm/quotes": "CUSTOMERS_VIEW",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useProLayoutNav = () => {
  const { user } = useAppSelector((state) => state.auth);
  const primaryColor = usePrimaryColor();
  const { activeProduct, availableProducts, isMultiProduct } = useActiveProduct();

  const isAdminOrCashier = !!(user?.role === "admin" || user?.role === "cashier");
  const isAdmin = user?.role === "admin";

  const rolePermissions: string[] =
    (user as any)?.rolePermissions ?? (user as any)?.permissions ?? [];
  const can = makePermissionChecker(rolePermissions, isAdmin);

  const isAdminLayout = window.location.pathname.startsWith("/admin");
  const prefix = isAdminLayout ? "/admin" : "";
  const p = (bare: string) => `${prefix}${bare}`;

  const canSee = (bare: string, permMap: Record<string, string>): boolean => {
    const gate = permMap[bare];
    if (!gate) return true;

    // Special case for Dala navigation
    if (bare.startsWith("/dala")) return true;

    if (gate.includes("|")) {
      const permissions = gate.split("|");
      return permissions.some((perm) => can(perm.trim()));
    }

    return can(gate);
  };

  const posMode = (localStorage.getItem("posMode") ?? "restaurant") as string;
  const isHospitalMode = posMode === "hospital";
  const isHotelMode = posMode === "hotel";

  const homeRouteName = isHotelMode ? "Rooms" : "POS";
  const homeRouteIcon = isHospitalMode ? <MedicineBoxOutlined /> : <HomeFilled />;

  const getCustomerLabel = () => {
    if (isHospitalMode) return "Patients";
    if (activeProduct === "dala") return "Clients";
    return "Customers";
  };

  const inventoryBarePath = "/inventory";
  const inventoryRoute = {
    path: p(inventoryBarePath),
    name: isHospitalMode ? "Pharmacy" : isHotelMode ? "Store" : "Inventory",
    icon: isHospitalMode ? <MedicineBoxOutlined /> : <AppstoreOutlined />,
    _bare: inventoryBarePath,
  };

  const documentRoute = {
    path: p("/documents"),
    name: "Documents",
    icon: <FileDoneOutlined />,
    _bare: "/documents",
  };

  const esignRoute = {
    path: p("/esign"),
    name: "E-Signature",
    icon: <SignatureOutlined />,
    _bare: "/esign",
  };

  const currencyBarePath =
    activeProduct === "pesa" ? "/accounting/currencies" : "/currencies";
  const currencyRoute = {
    path: p(currencyBarePath),
    name: "Currencies",
    icon: <GlobalOutlined />,
    _bare: currencyBarePath,
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 1. DUKA (POS) ROUTES
  // ════════════════════════════════════════════════════════════════════════════
  const dukaRoutesBase = [
    { path: p("/tables"), name: homeRouteName, icon: homeRouteIcon, _bare: "/tables" },
    { path: p("/orders"), name: "Orders", icon: <CalculatorFilled />, _bare: "/orders" },
    ...(posMode !== "retail"
      ? [
          {
            path: p("/store"),
            name: isHospitalMode ? "Services" : "Services",
            icon: isHospitalMode ? <ExperimentOutlined /> : <FolderFilled />,
            _bare: "/store",
          },
        ]
      : []),
    { ...inventoryRoute },
    { path: p("/employee-shift"), name: "Crew", icon: <UsergroupAddOutlined />, _bare: "/employee-shift" },
    { path: p("/customers"), name: getCustomerLabel(), icon: <UserOutlined />, _bare: "/customers" },
    { path: p("/reports"), name: "Reports", icon: <ApiFilled />, _bare: "/reports" },
    { ...documentRoute },
    { ...esignRoute },
    { path: p("/petty-cash"), name: "Petty Cash", icon: <WalletOutlined />, _bare: "/petty-cash" },
    { path: p("/refunds"), name: "Refunds", icon: <SwapOutlined />, _bare: "/refunds" },
    { path: p("/staff-management"), name: "Staff Management", icon: <TeamOutlined />, _bare: "/staff-management" },
    { path: p("/Category-settings"), name: "Categories", icon: <ApartmentOutlined />, _bare: "/Category-settings" },
    { path: p("/table-settings"), name: "Tables", icon: <AppstoreOutlined />, _bare: "/table-settings" },
    { path: p("/suppliers"), name: "Suppliers", icon: <FolderFilled />, _bare: "/suppliers" },
    { path: p("/help-center"), name: "Help Center", icon: <CustomerServiceOutlined />, _bare: "/help-center" },
    { ...currencyRoute },
  ];

  const dukaRoutes = dukaRoutesBase
    .filter((r) => canSee(r._bare, POS_ROUTE_PERMISSIONS))
    .map(({ _bare: _b, ...rest }) => rest);

  // ════════════════════════════════════════════════════════════════════════════
  // 2. PESA (ACCOUNTING) ROUTES
  // ════════════════════════════════════════════════════════════════════════════
  const pesaRoutesBase = [
    { path: p("/accounting"), name: "Accounting", icon: <DashboardOutlined />, _bare: "/accounting" },
    { path: p("/orders"), name: "Invoices", icon: <FileTextOutlined />, _bare: "/orders" },
    { path: p("/accounting/sales-receipts"), name: "Sales Receipts", icon: <AccountBookOutlined />, _bare: "/accounting/sales-receipts" },
    { path: p("/accounting/expenses"), name: "Expenses", icon: <ArrowUpOutlined />, _bare: "/accounting/expenses" },
    { path: p("/accounting/bills"), name: "Bills", icon: <FileTextOutlined />, _bare: "/accounting/bills" },
    { path: p("/accounting/notes"), name: "Debit/Credit Notes", icon: <FileSearchOutlined />, _bare: "/accounting/notes" },
    { path: p("/accounting/journals"), name: "Journal Entries", icon: <AuditOutlined />, _bare: "/accounting/journals" },
    { path: p("/accounting/bank-statements"), name: "Banking", icon: <BankOutlined />, _bare: "/accounting/bank-statements" },
    { path: p("/accounting/reconciliation"), name: "Bank Reconciliation", icon: <BankOutlined />, _bare: "/accounting/reconciliation" },
    { path: p("/accounting/accounts"), name: "Chart of Accounts", icon: <AuditOutlined />, _bare: "/accounting/accounts" },
    { path: p("/reports"), name: "Reports", icon: <FileTextOutlined />, _bare: "/reports" },
    { path: p("/accounting/assets"), name: "Asset Register", icon: <AuditOutlined />, _bare: "/accounting/assets" },
    { path: p("/accounting/asset-requests"), name: "Asset Requests", icon: <AuditOutlined />, _bare: "/accounting/asset-requests" },
    { path: p("/accounting/asset-maintenance"), name: "Asset Maintenance", icon: <AuditOutlined />, _bare: "/accounting/asset-maintenance" },
    { path: p("/customers"), name: getCustomerLabel(), icon: <UserOutlined />, _bare: "/customers" },
    { path: p("/suppliers"), name: "Suppliers", icon: <FolderFilled />, _bare: "/suppliers" },
    { path: p("/payment-methods"), name: "Payment Methods", icon: <CalculatorFilled />, _bare: "/payment-methods" },
    { path: p("/system-setup"), name: "System Setup", icon: <SettingOutlined />, _bare: "/system-setup" },
    { ...documentRoute },
    { ...esignRoute },
    { ...currencyRoute },
  ];

  const pesaRoutes = pesaRoutesBase
    .filter((r) => canSee(r._bare, ACCOUNTING_ROUTE_PERMISSIONS))
    .map(({ _bare: _b, ...rest }) => rest);

  // ════════════════════════════════════════════════════════════════════════════
  // 3. MTEJA (CRM) ROUTES
  // ════════════════════════════════════════════════════════════════════════════
  const mtejaRoutesBase = [
    { path: p("/home-dashboard"), name: "Dashboard", icon: <DashboardOutlined />, _bare: "/home-dashboard" },
    { path: p("/omnichannel"), name: "Conversations", icon: <MessageOutlined />, _bare: "/omnichannel" },
    { path: p("/crm/leads"), name: "Leads", icon: <TeamOutlined />, _bare: "/crm/leads" },
    { path: p("/crm/calendar"), name: "Activity Calendar", icon: <CalendarOutlined />, _bare: "/crm/calendar" },
    { path: p("/crm/quotes"), name: "Quotes", icon: <FileTextOutlined />, _bare: "/crm/quotes" },
    { path: p("/crm/campaigns"), name: "Campaigns", icon: <NotificationOutlined />, _bare: "/crm/campaigns" },
    { path: p("/crm/sales-targets"), name: "Sales Targets", icon: <AimOutlined />, _bare: "/crm/sales-targets" },
    { path: p("/crm/sales-budgets"), name: "Sales Budgets", icon: <RiseOutlined />, _bare: "/crm/sales-budgets" },
    { path: p("/customers"), name: getCustomerLabel(), icon: <UserOutlined />, _bare: "/customers" },
    { path: p("/reports"), name: "Reports", icon: <FileTextOutlined />, _bare: "/reports" },
    { ...documentRoute },
    { ...esignRoute },
  ];

  const mtejaRoutes = mtejaRoutesBase
    .filter((r) => canSee(r._bare, CRM_ROUTE_PERMISSIONS))
    .map(({ _bare: _b, ...rest }) => rest);

  // ════════════════════════════════════════════════════════════════════════════
  // 4. BANDU (HR & PAYROLL) ROUTES
  // ════════════════════════════════════════════════════════════════════════════
  const banduRoutesBase = [
    { path: p("/hr/dashboard"), name: "HR Dashboard", icon: <DashboardOutlined />, _bare: "/hr/dashboard" },
    { path: p("/hr/employees"), name: "Employees", icon: <UserOutlined />, _bare: "/hr/employees" },
    { path: p("/hr/attendance"), name: "Attendance", icon: <ClockCircleOutlined />, _bare: "/hr/attendance" },
    { path: p("/hr/leave"), name: "Leave", icon: <CalendarOutlined />, _bare: "/hr/leave" },
    { path: p("/hr/leave-policies"), name: "Leave Policies", icon: <FileTextOutlined />, _bare: "/hr/leave-policies" },
    { path: p("/hr/leave-calendar"), name: "Leave Calendar", icon: <CalendarOutlined />, _bare: "/hr/leave-calendar" },
    { path: p("/hr/leave-approvals"), name: "Leave Approvals", icon: <FileDoneOutlined />, _bare: "/hr/leave-approvals" },
    { path: p("/hr/payroll"), name: "Payroll", icon: <DollarOutlined />, _bare: "/hr/payroll" },
    { path: p("/hr/payslips"), name: "Payslips", icon: <FileTextOutlined />, _bare: "/hr/payslips" },
    { path: p("/reports"), name: "Reports", icon: <FileTextOutlined />, _bare: "/reports" },
    { path: p("/staff-management"), name: "Crew Management", icon: <TeamOutlined />, _bare: "/staff-management" },
    { ...documentRoute },
    { ...esignRoute },
  ];

  const banduRoutes = banduRoutesBase
    .filter((r) => canSee(r._bare, BANDU_ROUTE_PERMISSIONS))
    .map(({ _bare: _b, ...rest }) => rest);

  // ════════════════════════════════════════════════════════════════════════════
  // 5. DALA (REAL ESTATE) ROUTES
  // ════════════════════════════════════════════════════════════════════════════
  const dalaRoutesBase = [
    { path: p("/dala/properties"), name: "Portfolio", icon: <HomeOutlined />, _bare: "/dala/properties" },
    { path: p("/dala/property-types"), name: "Property Types", icon: <ApartmentOutlined />, _bare: "/dala/property-types" },
    { path: p("/dala/sales"), name: "Sales", icon: <ReconciliationOutlined />, _bare: "/dala/sales" },
    { path: p("/dala/leases"), name: "Leases & Rentals", icon: <FileTextOutlined />, _bare: "/dala/leases" },
    { path: p("/dala/commissions"), name: "Commissions", icon: <ReconciliationOutlined />, _bare: "/dala/commissions" },
    { path: p("/dala/rent-collection"), name: "Rent Collection", icon: <AccountBookOutlined />, _bare: "/dala/rent-collection" },
    { path: p("/dala/maintenance"), name: "Maintenance", icon: <BuildOutlined />, _bare: "/dala/maintenance" },
    { path: p("/dala/reports"), name: "Reports", icon: <FileTextOutlined />, _bare: "/dala/reports" },
    { path: p("/staff-management"), name: "Staff Management", icon: <TeamOutlined />, _bare: "/staff-management" },
    { ...documentRoute },
    { ...esignRoute },
  ];

  const dalaRoutes = dalaRoutesBase
    .filter((r) => canSee(r._bare, DALA_ROUTE_PERMISSIONS))
    .map(({ _bare: _b, ...rest }) => rest);

  // ════════════════════════════════════════════════════════════════════════════
  // APP TILES (MEGA-MENU GRID)
  // ════════════════════════════════════════════════════════════════════════════
  const currencyTile = {
    icon: makeTile("#0d9488", ICONS.currency),
    title: "Currencies",
    desc: "Currencies & rates.",
    url: p(currencyBarePath),
    _bare: currencyBarePath,
  };

  const posAppList = [
    { icon: makeTile("#0ea5e9", ICONS.table), title: homeRouteName, desc: isHospitalMode ? "Manage wards & beds." : "Manage tables.", url: p("/table-settings"), _bare: "/table-settings" },
    { icon: makeTile("#10b981", ICONS.inventory), title: isHospitalMode ? "Pharmacy" : "Inventory", desc: isHospitalMode ? "Pharmacy stock." : "Track stock levels.", url: p("/inventory"), _bare: "/inventory" },
    { icon: makeTile("#6366f1", ICONS.checklist), title: "Category", desc: "Organize categories.", url: p("/Category-settings"), _bare: "/Category-settings" },
    { icon: makeTile("#f59e0b", ICONS.payment), title: "Payment Methods", desc: "Payment options.", url: p("/payment-methods"), _bare: "/payment-methods" },
    { icon: makeTile("#3b82f6", ICONS.customers), title: "Staff Management", desc: "Staff & permissions.", url: p("/staff-management"), _bare: "/staff-management" },
    { icon: makeTile("#8b5cf6", ICONS.supplier), title: "Suppliers", desc: "Suppliers & vendors.", url: p("/suppliers"), _bare: "/suppliers" },
    { ...currencyTile },
    { icon: makeTile("#2f54eb", ICONS.documents), title: "Document Center", desc: "Documents & files.", url: p("/documents"), _bare: "/documents" },
    { icon: makeTile("#06b6d4", ICONS.web), title: "Gallery", desc: "Store images & media.", url: p("/website-builder"), _bare: "/website-builder" },
    { icon: makeTile(primaryColor, ICONS.settings), title: "System Setup", desc: "System settings.", url: p("/system-setup"), _bare: "/system-setup" },
    { icon: makeTile("#64748b", ICONS.faq), title: "FAQs", desc: "Common questions.", url: p("/fss-faqs"), _bare: "/fss-faqs" },
  ]
    .filter((t) => canSee(t._bare, POS_APP_PERMISSIONS))
    .map(({ _bare: _b, ...rest }) => rest);

  const accountingAppList = [
    { icon: makeTile(primaryColor, ICONS.accounting), title: "Accounting", desc: "Financial overview.", url: p("/accounting"), _bare: "/accounting" },
    { icon: makeTile("#3b82f6", ICONS.invoice), title: "Invoices & Bills", desc: "Invoices and bills.", url: p("/orders"), _bare: "/orders" },
    { icon: makeTile("#f59e0b", ICONS.debit), title: "Debit/Credit Notes", desc: "Debit & credit notes.", url: p("/accounting/notes"), _bare: "/accounting/notes" },
    { icon: makeTile("#8b5cf6", ICONS.journal), title: "Journal Entries", desc: "Record journal entries.", url: p("/accounting/journals"), _bare: "/accounting/journals" },
    { icon: makeTile("#22c55e", ICONS.salesReceipt), title: "Sales Receipts", desc: "Record direct sales.", url: p("/accounting/sales-receipts"), _bare: "/accounting/sales-receipts" },
    { icon: makeTile("#16a34a", ICONS.bankStatement), title: "Bank Statements", desc: "Bank transactions.", url: p("/accounting/bank-statements"), _bare: "/accounting/bank-statements" },
    { icon: makeTile("#0ea5e9", ICONS.bank), title: "Reconciliation", desc: "Bank reconciliation.", url: p("/accounting/reconciliation"), _bare: "/accounting/reconciliation" },
    { icon: makeTile("#534AB7", ICONS.coa), title: "Chart of Accounts", desc: "Accounts structure.", url: p("/accounting/accounts"), _bare: "/accounting/accounts" },
    { icon: makeTile("#ef4444", ICONS.expense), title: "Expenses", desc: "Track expenses.", url: p("/accounting/expenses"), _bare: "/accounting/expenses" },
    { icon: makeTile("#8b5cf6", ICONS.bill), title: "Supplier Bills", desc: "Manage supplier bills.", url: p("/accounting/bills"), _bare: "/accounting/bills" },
    { icon: makeTile("#22c55e", ICONS.reports), title: "Reports", desc: "Reports & analytics.", url: p("/reports"), _bare: "/reports" },
    { icon: makeTile("#06b6d4", ICONS.customers), title: getCustomerLabel(), desc: "Customer accounts.", url: p("/customers"), _bare: "/customers" },
    { icon: makeTile("#8b5cf6", ICONS.supplier), title: "Suppliers", desc: "Suppliers & vendors.", url: p("/suppliers"), _bare: "/suppliers" },
    { icon: makeTile("#f59e0b", ICONS.payment), title: "Payment Methods", desc: "Payment options.", url: p("/payment-methods"), _bare: "/payment-methods" },
    { icon: makeTile(primaryColor, ICONS.settings), title: "System Setup", desc: "System settings.", url: p("/system-setup"), _bare: "/system-setup" },
    { icon: makeTile("#2f54eb", ICONS.documents), title: "Document Center", desc: "Documents & files.", url: p("/documents"), _bare: "/documents" },
  ]
    .filter((t) => canSee(t._bare, ACCOUNTING_APP_PERMISSIONS))
    .map(({ _bare: _b, ...rest }) => rest);

  const crmAppTiles = [
    { icon: makeTile(primaryColor, ICONS.leads), title: "Leads", desc: "Track sales pipeline.", url: p("/crm/leads") },
    { icon: makeTile("#0891b2", ICONS.reports), title: "Activity Calendar", desc: "Activities & meetings.", url: p("/crm/calendar") },
    { icon: makeTile("#f59e0b", ICONS.invoice), title: "Quotes", desc: "Quotes & proposals.", url: p("/crm/quotes") },
    { icon: makeTile("#7c3aed", ICONS.campaigns), title: "Campaigns", desc: "Marketing campaigns.", url: p("/crm/campaigns") },
    { icon: makeTile("#0891b2", ICONS.target), title: "Sales Targets", desc: "Revenue & unit targets.", url: p("/crm/sales-targets") },
    { icon: makeTile("#16a34a", ICONS.budget), title: "Sales Budgets", desc: "Plan & approve budgets.", url: p("/crm/sales-budgets") },
    { icon: makeTile("#7c3aed", ICONS.omnichannel), title: "Conversations", desc: "Chat & social messages.", url: p("/omnichannel") },
  ];

  const banduAppTiles = [
    { icon: makeTile("#f59e0b", ICONS.customers), title: "Employees", desc: "Staff directory.", url: p("/hr/employees") },
    { icon: makeTile("#10b981", ICONS.checklist), title: "Attendance", desc: "Staff attendance.", url: p("/hr/attendance") },
    { icon: makeTile("#6366f1", ICONS.checklist), title: "Leave", desc: "Leave requests.", url: p("/hr/leave") },
    { icon: makeTile("#0ea5e9", ICONS.payment), title: "Payroll", desc: "Payroll processing.", url: p("/hr/payroll") },
    { icon: makeTile("#8b5cf6", ICONS.invoice), title: "Payslips", desc: "Employee payslips.", url: p("/hr/payslips") },
  ];

  const dalaAppTiles = [
    { icon: makeTile("#06b6d4", ICONS.property), title: "Portfolio", desc: "Properties & lands.", url: p("/dala/properties") },
    { icon: makeTile("#3b82f6", ICONS.unit), title: "Units", desc: "Property units.", url: p("/dala/units") },
    { icon: makeTile("#7c3aed", ICONS.lease), title: "Leases", desc: "Rental agreements.", url: p("/dala/leases") },
    { icon: makeTile("#10b981", ICONS.payment), title: "Rent Collection", desc: "Rent & invoicing.", url: p("/dala/rent-collection") },
    { icon: makeTile("#f59e0b", ICONS.settings), title: "Maintenance", desc: "Maintenance tickets.", url: p("/dala/maintenance") },
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // ECOSYSTEM APP LIST (WAFFLE 3x3 LAUNCHER)
  // ════════════════════════════════════════════════════════════════════════════
  const PRODUCT_TILES: Record<ProductKey, { icon: React.ReactNode; title: string; desc: string; defaultPath: string }> = {
    duka: {
      icon: makeTileImg("#0ea5e9", "M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z", "duka"),
      title: "Duka (POS)",
      desc: "Point of Sale, Orders, Inventory & Crew",
      defaultPath: "/tables",
    },
    pesa: {
      icon: makeTileImg("#10b981", ICONS.accounting, "pesa"),
      title: "Pesa (Accounting)",
      desc: "Double-Entry Accounting & Banking",
      defaultPath: "/accounting",
    },
    mteja: {
      icon: makeTileImg("#8b5cf6", ICONS.omnichannel, "mteja"),
      title: "Mteja (CRM)",
      desc: "WhatsApp, Conversations & Leads",
      defaultPath: "/crm/leads",
    },
    bandu: {
      icon: makeTileImg("#f59e0b", ICONS.customers, "bandu"),
      title: "Bandu (HR)",
      desc: "Staff Directory, Attendance & Payroll",
      defaultPath: "/hr/dashboard",
    },
    dala: {
      icon: makeTileImg("#06b6d4", ICONS.property, "dala"),
      title: "Dala (Real Estate)",
      desc: "Property Portfolio, Leases & Rent",
      defaultPath: "/dala/properties",
    },
  };

  const workspaceTiles = availableProducts.map((prod) => {
    const tile = PRODUCT_TILES[prod.key];
    const isActive = prod.key === activeProduct;
    return {
      icon: tile?.icon || makeTileImg(prod.color, ICONS.table, prod.key),
      title: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: isActive ? 700 : 500, color: isActive ? prod.color : "inherit" }}>
            {tile?.title || prod.label}
          </span>
          {isActive && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                lineHeight: "14px",
                padding: "1px 6px",
                borderRadius: 10,
                background: `${prod.color}1c`,
                color: prod.color,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Active
            </span>
          )}
        </span>
      ),
      desc: tile?.desc || prod.tagline,
      url: p(tile?.defaultPath || prod.defaultPath),
      productKey: prod.key,
    };
  });

  const platformTiles = [
    {
      icon: makeTileImg("#3b82f6", ICONS.reports, "dashboard"),
      title: "Unified Dashboard",
      desc: "Cross-system overview & metrics",
      url: p("/home-dashboard"),
    },
    {
      icon: makeTileImg("#6366f1", ICONS.documents, "documents"),
      title: "Document Center",
      desc: "Contracts, PDFs & templates",
      url: p("/documents"),
    },
    {
      icon: makeTileImg("#64748b", ICONS.settings, "setup"),
      title: "System Setup",
      desc: "Organization configuration",
      url: p("/system-setup"),
    },
    ...(isAdmin
      ? [
          {
            icon: makeTileImg("#ea580c", ICONS.settings, "admin"),
            title: "Admin Console",
            desc: "Administration & shops",
            url: "/admin/dashboard",
          },
        ]
      : []),
  ];

  const ecosystemAppList = [
    {
      title: "Workspaces",
      desc: "Business applications",
      children: workspaceTiles,
    },
    {
      title: "Platform Tools",
      desc: "Cross-system utilities",
      children: platformTiles,
    },
  ];

  const productRoutes: Record<ProductKey, any[]> = {
    duka: dukaRoutes,
    pesa: pesaRoutes,
    mteja: mtejaRoutes,
    bandu: banduRoutes,
    dala: dalaRoutes,
  };

  const selectedRoutes = productRoutes[activeProduct] || productRoutes.duka;

  // Complete dictionary of all available product routes for the mobile drawer
  const allProductRoutes: Record<ProductKey, { name: string; icon: React.ReactNode; color: string; routes: any[] }> = {
    duka: { name: "Duka (POS)", icon: <ShopOutlined />, color: "#0ea5e9", routes: dukaRoutes },
    pesa: { name: "Pesa (Accounting)", icon: <DollarOutlined />, color: "#10b981", routes: pesaRoutes },
    mteja: { name: "Mteja (CRM)", icon: <CustomerServiceOutlined />, color: "#8b5cf6", routes: mtejaRoutes },
    bandu: { name: "Bandu (HR)", icon: <TeamOutlined />, color: "#f59e0b", routes: banduRoutes },
    dala: { name: "Dala (Properties)", icon: <HomeOutlined />, color: "#06b6d4", routes: dalaRoutes },
  };

  return {
    route: {
      path: "/",
      routes: selectedRoutes,
    },
    appList: ecosystemAppList,
    allProductRoutes,
    activeProduct,
    isMultiProduct,
  };
};

export default useProLayoutNav;