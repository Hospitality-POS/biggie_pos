import {
  ApiFilled,
  CalculatorFilled,
  BarChartOutlined,
  FolderFilled,
  HomeFilled,
  AuditOutlined,
  BankOutlined,
  FileTextOutlined,
  FileSearchOutlined,
  FileExcelOutlined,
  DashboardOutlined,
  ReconciliationOutlined,
  SettingOutlined,
  AppstoreOutlined,
  AccountBookOutlined,
  ArrowUpOutlined,
  DollarOutlined,
  UsergroupAddOutlined,
  MedicineBoxOutlined,
  ExperimentOutlined,
  FileDoneOutlined,
} from "@ant-design/icons";
import { PeopleOutlined } from "@mui/icons-material";
import { useAppSelector } from "src/store";
import React from "react";
import { makePermissionChecker } from "@utils/accessControl";

// ─── SVG tile helper ──────────────────────────────────────────────────────────

const makeTile = (color: string, pathD: string): string => {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">',
    `<rect width="40" height="40" rx="10" fill="${color}"/>`,
    '<g transform="translate(8,8) scale(1.0)">',
    `<path d="${pathD}" fill="white" fill-rule="evenodd"/>`,
    '</g>',
    '</svg>',
  ].join('');
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};

const ICONS = {
  checklist: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  table: 'M20 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14H5v-5h6v5zm0-7H5V5h6v5zm9 7h-7v-5h7v5zm0-7h-7V5h7v5z',
  inventory: 'M20 6h-2.18c.07-.44.18-.88.18-1.38C18 2.05 15.96 0 13.5 0S9 2.05 9 4.62c0 .5.11.94.18 1.38H7C5.9 6 5 6.9 5 8v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6.5 12L10 14.5l1.41-1.41L13.5 15.5l4.59-4.59L19.5 12 13.5 18z',
  payment: 'M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z',
  supplier: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  faq: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z',
  web: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 17.52 22 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.9 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z',
  accounting: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z',
  invoice: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
  debit: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z',
  journal: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 4h2v5l-1-.75L9 9V4zm9 16H6V4h1v9l3-2.25L13 13V4h5v16z',
  bank: 'M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zM11.5 1L2 6v2h19V6l-9.5-5z',
  bankStatement: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-2 9H7v-2h4v2zm2-4H7v-2h6v2zm0-4H7V8h6v2z',
  reports: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
  customers: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  coa: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z',
  expense: 'M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM20 7H4L2 12v3h1v6h4v-6h5v6h4v-6h1v-3l-2-5zm-1 4l1 2.5H4L5 11h14z',
  bill: 'M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm-7 6H7V8h6v2zm4 4H7v-2h10v2zm0-4h-2V8h2v2z',
  income: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z',
  // ── Document Center icon path ──────────────────────────────────────────────
  documents: 'M20 6h-2.18c.07-.44.18-.88.18-1.38 0-2.57-2.04-4.62-4.5-4.62S9 2.05 9 4.62c0 .5.11.94.18 1.38H7C5.9 6 5 6.9 5 8v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0H10V4.62C10 3.17 11.12 2 12.5 2S15 3.17 15 4.62V6h-1zm1 5H9v-2h6v2zm4 4H9v-2h10v2z',
};

// ─── Route → permission gate map ─────────────────────────────────────────────

const POS_ROUTE_PERMISSIONS: Record<string, string> = {
  "/tables": "CART_VIEW_ITEMS",
  "/home-dashboard": "ORDERS_VIEW_DASHBOARD",
  "/orders": "ORDERS_VIEW",
  "/store": "PRODUCTS_VIEW",
  "/inventory": "INVENTORY_VIEW",
  "/employee-shift": "SHIFTS_VIEW",
  "/customers": "CUSTOMERS_VIEW",
  "/reports": "REPORTS_ITEM_SALES",
  "/documents": "DOCUMENTS_VIEW",
};

const ACCOUNTING_ROUTE_PERMISSIONS: Record<string, string> = {
  "/accounting": "ACCOUNTING_DASHBOARD_VIEW",
  "/orders": "ACCOUNTING_INVOICE_VIEW",
  "/accounting/notes": "ACCOUNTING_NOTES_VIEW",
  "/accounting/journals": "ACCOUNTING_JOURNAL_VIEW",
  "/accounting/bank-statements": "ACCOUNTING_BANK_STMT_VIEW",
  "/accounting/reconciliation": "ACCOUNTING_RECON_VIEW",
  "/accounting/accounts": "ACCOUNTING_COA_VIEW",
  "/accounting/expenses": "ACCOUNTING_INCOME_POST_EXPENSE",
  "/accounting/bills": "ACCOUNTING_INVOICE_VIEW",
  "/accounting/income": "ACCOUNTING_INCOME_VIEW_HISTORY",
  "/accounting/reports": "ACCOUNTING_REPORT_PROFIT_LOSS",
  "/inventory": "INVENTORY_VIEW",
  "/customers": "CUSTOMERS_VIEW",
  "/suppliers": "SUPPLIERS_VIEW",
  "/payment-methods": "PAYMENT_METHODS_VIEW",
  "/system-setup": "SYSTEM_SETUP_VIEW",
  "/documents": "DOCUMENTS_VIEW",
};

const POS_APP_PERMISSIONS: Record<string, string> = {
  "/Category-settings": "CATEGORIES_VIEW",
  "/table-settings": "TABLES_VIEW",
  "/inventory": "INVENTORY_VIEW",
  "/payment-methods": "PAYMENT_METHODS_VIEW",
  "/suppliers": "SUPPLIERS_VIEW",
  "/system-setup": "SYSTEM_SETUP_VIEW",
  "/fss-faqs": "FAQ_VIEW",
  "/website-builder": "GALLERY_VIEW",
  "/documents": "DOCUMENTS_VIEW",
};

const ACCOUNTING_APP_PERMISSIONS: Record<string, string> = {
  "/accounting": "ACCOUNTING_DASHBOARD_VIEW",
  "/orders": "ACCOUNTING_INVOICE_VIEW",
  "/accounting/notes": "ACCOUNTING_NOTES_VIEW",
  "/accounting/journals": "ACCOUNTING_JOURNAL_VIEW",
  "/accounting/bank-statements": "ACCOUNTING_BANK_STMT_VIEW",
  "/accounting/reconciliation": "ACCOUNTING_RECON_VIEW",
  "/accounting/accounts": "ACCOUNTING_COA_VIEW",
  "/accounting/expenses": "ACCOUNTING_INCOME_POST_EXPENSE",
  "/accounting/bills": "ACCOUNTING_INVOICE_VIEW",
  "/accounting/income": "ACCOUNTING_INCOME_VIEW_HISTORY",
  "/accounting/reports": "ACCOUNTING_REPORT_PROFIT_LOSS",
  "/inventory": "INVENTORY_VIEW",
  "/customers": "CUSTOMERS_VIEW",
  "/suppliers": "SUPPLIERS_VIEW",
  "/payment-methods": "PAYMENT_METHODS_VIEW",
  "/system-setup": "SYSTEM_SETUP_VIEW",
  "/documents": "DOCUMENTS_VIEW",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useProLayoutNav = () => {
  const { user } = useAppSelector((state) => state.auth);

  const isAdminOrCashier = !!(user?.role === "admin" || user?.role === "cashier");
  const isAdmin = user?.role === "admin";

  const rolePermissions: string[] =
    (user as any)?.rolePermissions ?? (user as any)?.permissions ?? [];
  const can = makePermissionChecker(rolePermissions, isAdmin);

  const canSee = (path: string, permMap: Record<string, string>): boolean => {
    const gate = permMap[path];
    if (!gate) return true;
    return can(gate);
  };

  // ── Tenant / mode context ─────────────────────────────────────────────────

  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const posMode = (localStorage.getItem("posMode") ?? "restaurant") as string;
  const isHospitalMode = posMode === "hospital";

  const homeRouteName = isHospitalMode
    ? "POS"
    : tenant?.business_type?.name === "Electronics" ||
      tenant?.business_type?.name === "massage_parlour"
      ? "POS"
      : "POS";

  const homeRouteIcon = isHospitalMode ? <MedicineBoxOutlined /> : <HomeFilled />;

  const hasPOS = tenant?.pos_integration?.enabled === true;
  const hasAccounting = tenant?.modules?.accounting === true;

  const inventoryRoute = isHospitalMode
    ? { path: "/inventory", name: "Pharmacy", icon: <MedicineBoxOutlined /> }
    : { path: "/inventory", name: "Inventory", icon: <AppstoreOutlined /> };

  // ── Document Center route (shared across POS & Accounting) ────────────────
  const documentRoute = { path: "/documents", name: "Documents", icon: <FileDoneOutlined /> };

  // ── POS routes ────────────────────────────────────────────────────────────

  const posRoutesFullAccess = [
    { path: "/tables", name: homeRouteName, icon: homeRouteIcon },
    { path: "/home-dashboard", name: "Dashboard", icon: <BarChartOutlined /> },
    { path: "/orders", name: "Orders", icon: <CalculatorFilled /> },
    ...(posMode !== "retail"
      ? [{ path: "/store", name: isHospitalMode ? "Services" : "Services", icon: isHospitalMode ? <ExperimentOutlined /> : <FolderFilled /> }]
      : []),
    inventoryRoute,
    { path: "/employee-shift", name: "Crew", icon: <UsergroupAddOutlined /> },
    { path: "/customers", name: isHospitalMode ? "Patients" : "Customers", icon: <PeopleOutlined /> },
    { path: "/reports", name: "Business Reports", icon: <ApiFilled /> },
    documentRoute,
  ].filter((r) => canSee(r.path, POS_ROUTE_PERMISSIONS));

  const posRoutesStaff = [
    { path: "/tables", name: homeRouteName, icon: homeRouteIcon },
    { path: "/home-dashboard", name: "Dashboard", icon: <BarChartOutlined /> },
    { path: "/orders", name: "Orders", icon: <CalculatorFilled /> },
    ...(posMode !== "retail"
      ? [{ path: "/store", name: isHospitalMode ? "Services" : "Services", icon: isHospitalMode ? <ExperimentOutlined /> : <FolderFilled /> }]
      : []),
    inventoryRoute,
    { path: "/employee-shift", name: "Crew", icon: <UsergroupAddOutlined /> },
    { path: "/customers", name: isHospitalMode ? "Patients" : "Customers", icon: <PeopleOutlined /> },
    documentRoute,
  ].filter((r) => canSee(r.path, POS_ROUTE_PERMISSIONS));

  // ── Accounting routes ─────────────────────────────────────────────────────

  const accountingRoutes = [
    { path: "/accounting", name: "Overview", icon: <DashboardOutlined /> },
    { path: "/orders", name: "Invoices & Bills", icon: <FileTextOutlined /> },
    { path: "/accounting/notes", name: "Debit/Credit Notes", icon: <FileSearchOutlined /> },
    { path: "/accounting/journals", name: "Journal Entries", icon: <AuditOutlined /> },
    { path: "/accounting/bank-statements", name: "Banking", icon: <FileExcelOutlined /> },
    { path: "/accounting/reconciliation", name: "Bank Reconciliation", icon: <BankOutlined /> },
    { path: "/accounting/accounts", name: "Chart of Accounts", icon: <AuditOutlined /> },
    { path: "/accounting/expenses", name: "Expenses", icon: <ArrowUpOutlined /> },
    { path: "/accounting/bills", name: "Supplier Bills", icon: <FileTextOutlined style={{ color: "#8b5cf6" }} /> },
    { path: "/accounting/income", name: "Income", icon: <DollarOutlined /> },
    { path: "/accounting/reports", name: "Reports", icon: <ReconciliationOutlined /> },
    inventoryRoute,
    { path: "/customers", name: "Customers", icon: <PeopleOutlined /> },
    { path: "/suppliers", name: "Suppliers", icon: <FolderFilled /> },
    { path: "/payment-methods", name: "Payment Methods", icon: <CalculatorFilled /> },
    { path: "/system-setup", name: "System Setup", icon: <SettingOutlined /> },
    documentRoute,
  ].filter((r) => canSee(r.path, ACCOUNTING_ROUTE_PERMISSIONS));

  const accountingRoutesStaff = [
    { path: "/accounting", name: "Overview", icon: <DashboardOutlined /> },
    { path: "/orders", name: "Invoices & Bills", icon: <FileTextOutlined /> },
    { path: "/accounting/notes", name: "Debit/Credit Notes", icon: <FileSearchOutlined /> },
    { path: "/accounting/journals", name: "Journal Entries", icon: <AuditOutlined /> },
    { path: "/accounting/bank-statements", name: "Banking", icon: <FileExcelOutlined /> },
    { path: "/accounting/reconciliation", name: "Bank Reconciliation", icon: <BankOutlined /> },
    { path: "/accounting/accounts", name: "Chart of Accounts", icon: <AuditOutlined /> },
    { path: "/accounting/expenses", name: "Expenses", icon: <ArrowUpOutlined /> },
    { path: "/accounting/bills", name: "Supplier Bills", icon: <FileTextOutlined style={{ color: "#8b5cf6" }} /> },
    { path: "/accounting/income", name: "Income", icon: <DollarOutlined /> },
    // NOTE: /accounting/reports intentionally excluded for staff
    inventoryRoute,
    { path: "/customers", name: "Customers", icon: <PeopleOutlined /> },
    { path: "/suppliers", name: "Suppliers", icon: <FolderFilled /> },
    { path: "/payment-methods", name: "Payment Methods", icon: <CalculatorFilled /> },
    { path: "/system-setup", name: "System Setup", icon: <SettingOutlined /> },
    documentRoute,
  ].filter((r) => canSee(r.path, ACCOUNTING_ROUTE_PERMISSIONS));

  // ── App tiles ─────────────────────────────────────────────────────────────

  const posAppList = [
    { icon: makeTile("#6366f1", ICONS.checklist), title: "Category", desc: "Organize your products with clear categories.", url: "/Category-settings" },
    { icon: makeTile("#0ea5e9", ICONS.table), title: homeRouteName, desc: isHospitalMode ? "Manage wards, beds and patient locations." : "Manage Tables location and naming.", url: "/table-settings" },
    { icon: makeTile("#10b981", ICONS.inventory), title: isHospitalMode ? "Pharmacy" : "Inventory", desc: isHospitalMode ? "Manage medicines and medical supplies." : "Track and manage your stock levels.", url: "/inventory" },
    { icon: makeTile("#f59e0b", ICONS.payment), title: "Payment Methods", desc: "Set up and manage how customers pay.", url: "/payment-methods" },
    { icon: makeTile("#8b5cf6", ICONS.supplier), title: "Suppliers", desc: "Manage your supplier relationships.", url: "/suppliers" },
    { icon: makeTile("#6c1c2c", ICONS.settings), title: "System Setup", desc: "Configure your RELIA system for optimal use.", url: "/system-setup" },
    { icon: makeTile("#64748b", ICONS.faq), title: "FAQs", desc: "Get answers to your most common questions.", url: "/fss-faqs" },
    { icon: makeTile("#06b6d4", ICONS.web), title: "Gallery", desc: "Store your store images.", url: "/website-builder" },
    { icon: makeTile("#2f54eb", ICONS.documents), title: "Document Center", desc: "Manage folders, cheques, invoices and files.", url: "/documents" },
  ].filter((t) => canSee(t.url, POS_APP_PERMISSIONS));

  const accountingAppList = [
    { icon: makeTile("#6c1c2c", ICONS.accounting), title: "Accounting", desc: "View your financial overview and KPIs.", url: "/accounting" },
    { icon: makeTile("#3b82f6", ICONS.invoice), title: "Invoices & Bills", desc: "Manage customer invoices and supplier bills.", url: "/orders" },
    { icon: makeTile("#f59e0b", ICONS.debit), title: "Debit/Credit Notes", desc: "Create and manage debit and credit notes.", url: "/accounting/notes" },
    { icon: makeTile("#8b5cf6", ICONS.journal), title: "Journal Entries", desc: "Record and post journal entries.", url: "/accounting/journals" },
    { icon: makeTile("#16a34a", ICONS.bankStatement), title: "Bank Statements", desc: "Import and categorize bank statement transactions.", url: "/accounting/bank-statements" },
    { icon: makeTile("#0ea5e9", ICONS.bank), title: "Reconciliation", desc: "Reconcile bank statements with your books.", url: "/accounting/reconciliation" },
    { icon: makeTile("#534AB7", ICONS.coa), title: "Chart of Accounts", desc: "Manage your account structure and codes.", url: "/accounting/accounts" },
    { icon: makeTile("#ef4444", ICONS.expense), title: "Expenses", desc: "Track and post direct business expenses.", url: "/accounting/expenses" },
    { icon: makeTile("#8b5cf6", ICONS.bill), title: "Supplier Bills", desc: "Manage outstanding bills owed to suppliers.", url: "/accounting/bills" },
    { icon: makeTile("#10b981", ICONS.income), title: "Income", desc: "View all inbound and outbound payments.", url: "/accounting/income" },
    { icon: makeTile("#10b981", ICONS.reports), title: "Financial Reports", desc: "P&L, Balance Sheet, VAT, Aging and more.", url: "/accounting/reports" },
    { icon: makeTile("#10b981", ICONS.inventory), title: "Inventory", desc: "Track and manage your stock levels.", url: "/inventory" },
    { icon: makeTile("#06b6d4", ICONS.customers), title: "Customers", desc: "Manage your customer relationships.", url: "/customers" },
    { icon: makeTile("#8b5cf6", ICONS.supplier), title: "Suppliers", desc: "Manage your supplier relationships.", url: "/suppliers" },
    { icon: makeTile("#f59e0b", ICONS.payment), title: "Payment Methods", desc: "Set up and manage how customers pay.", url: "/payment-methods" },
    { icon: makeTile("#6c1c2c", ICONS.settings), title: "System Setup", desc: "Configure your RELIA system for optimal use.", url: "/system-setup" },
    { icon: makeTile("#2f54eb", ICONS.documents), title: "Document Center", desc: "Manage folders, cheques, invoices and files.", url: "/documents" },
  ].filter((t) => canSee(t.url, ACCOUNTING_APP_PERMISSIONS));

  // ── Compose final nav ─────────────────────────────────────────────────────

  const posRoutes = isAdminOrCashier ? posRoutesFullAccess : posRoutesStaff;

  if (hasAccounting && !hasPOS) {
    const routes = isAdminOrCashier ? accountingRoutes : accountingRoutesStaff;
    return {
      route: { path: "/", routes },
      appList: accountingAppList,
    };
  }

  if (hasPOS && !hasAccounting) {
    return {
      route: { path: "/", routes: posRoutes },
      appList: posAppList,
    };
  }

  if (hasPOS && hasAccounting) {
    const accRoutes = isAdminOrCashier ? accountingRoutes : accountingRoutesStaff;
    return {
      route: {
        path: "/",
        routes: [
          ...posRoutes,
          {
            path: "/accounting",
            name: "Accounting",
            icon: <AccountBookOutlined />,
            routes: accRoutes,
          },
        ],
      },
      appList: [...posAppList, ...accountingAppList],
    };
  }

  return {
    route: { path: "/", routes: posRoutes },
    appList: posAppList,
  };
};

export default useProLayoutNav;