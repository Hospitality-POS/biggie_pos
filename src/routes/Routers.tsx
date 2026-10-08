import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";
import * as Sentry from "@sentry/react";
import { Suspense } from "react";
import { lazyWithReload } from "@utils/lazyWithReload";
import Private, { AdminRoute } from "@components/layout/private/Private";
import NotFound from "@routes/NotFound";
import { Spin } from "antd";
import NubaLoader from "@components/spinner/NubaLoader";
import StaffLoginPage from "@pages/Login/login";
import PaymentCallback from "@components/payment/PaymentCallback";
import PermissionRoute from "@components/PermissionRoute";

// ─── Lazily Loaded Core & Admin Pages ─────────────────────────────────────────
const MainCategory = lazyWithReload(() => import("@pages/main_category/Main_category"));
const MainOrders = lazyWithReload(() => import("@pages/OrderManagement/MainOrders"));
const StaffClockTracker = lazyWithReload(() => import("@pages/staff/ClockInTracker"));
const HelpCenter = lazyWithReload(() => import("src/AdminDashboard/HelpCenter/HelpCenterPage"));
const DashboardAdminPage = lazyWithReload(() => import("src/AdminDashboard/DashboardPage/DashboardPage"));
const DukaDashboardPage = lazyWithReload(() => import("src/pages/Dashboard/DukaDashboardPage"));
const AdminDukaDashboardPage = lazyWithReload(() => import("src/AdminDashboard/DashboardPage/AdminDukaDashboardPage"));
const UnifiedDashboardPage = lazyWithReload(() => import("src/pages/Report/UnifiedDashboardPage"));
const UnifiedShopDashboardPage = lazyWithReload(() => import("src/pages/Report/UnifiedShopDashboardPage"));
const ShopManagement = lazyWithReload(() => import("src/AdminDashboard/Shops/MainShopPage"));
const Customer = lazyWithReload(() => import("src/pages/Customer/CustomerList"));
const PaymentSubscriptionPage = lazyWithReload(() => import("src/components/billing/Billing"));
const AdminCustomersList = lazyWithReload(() => import("src/AdminDashboard/Customers/CustomerList"));
const TenantSettings = lazyWithReload(() => import("src/AdminDashboard/Settings/TenantSettings"));
const DiscoverPage = lazyWithReload(() => import("src/AdminDashboard/DiscoverPage"));
const BusinessHealthScorePage = lazyWithReload(() => import("@pages/HealthScore/BusinessHealthScorePage"));
const PrivacyPolicy = lazyWithReload(() => import("@pages/Legal/PrivacyPolicy"));
const TermsAndConditions = lazyWithReload(() => import("@pages/Legal/TermsAndConditions"));

// ─── Fallback spinners ────────────────────────────────────────────────────────
const fullscreenSpin = <NubaLoader />;

// ─── Page wrappers ────────────────────────────────────────────────────────────
const adminPage = (Component: React.ComponentType) => (
  <Suspense fallback={<NubaLoader />}>
    <AdminRoute>
      <Component />
    </AdminRoute>
  </Suspense>
);

const privatePage = (Component: React.ComponentType) => (
  <Suspense fallback={fullscreenSpin}>
    <Private>
      <Component />
    </Private>
  </Suspense>
);

const guardedPage = (Component: React.ComponentType, permission: string | string[]) => (
  <PermissionRoute permission={permission}>
    {privatePage(Component)}
  </PermissionRoute>
);

const guardedAdminPage = (Component: React.ComponentType, permission: string | string[]) => (
  <PermissionRoute permission={permission}>
    {adminPage(Component)}
  </PermissionRoute>
);

// ─── Wages Module ─────────────────────────────────────────────────────────────
const WagesList = lazyWithReload(() => import("src/AdminDashboard/Wages/WageList"));

// ─── Core App ─────────────────────────────────────────────────────────────────
const Layout = lazyWithReload(() => import("@components/layout/Layout"));
const RestaurantPage = lazyWithReload(() => import("@pages/Restaurant/Restuarant"));
const MainStore = lazyWithReload(() => import("@pages/store/MainStore"));
const Table = lazyWithReload(() => import("@pages/Tables/TablePro"));
const Faqs = lazyWithReload(() => import("@pages/Faqs/Faqs"));
const Website = lazyWithReload(() => import("@pages/Website/website"));

// ─── Settings ─────────────────────────────────────────────────────────────────
const PaymentMainSettings = lazyWithReload(() => import("@pages/Settings/paymentMethodLevel/payment_main_settings"));
const UsersMainSettings = lazyWithReload(() => import("@pages/Settings/usersLevel/User_main_settings"));
const InventoryMainSettings = lazyWithReload(() => import("@pages/Settings/invetoryLevel/Inventory_main_settings"));
const SupplierMainSettings = lazyWithReload(() => import("@pages/Settings/supplierLevel/supplier_main_settings"));
const TableMainSettings = lazyWithReload(() => import("@pages/Settings/TableLevel/Table_main_settings"));
const SystemSetup = lazyWithReload(() => import("@pages/Settings/systemSetup/SystemSetup"));
const CategoryMainSettings = lazyWithReload(() => import("@pages/Settings/categoryLevel/Category_main_settings"));
const Profile = lazyWithReload(() => import("@pages/Profile/Profile"));
const AdminProfile = lazyWithReload(() => import("src/AdminDashboard/Profile/AdminProfile"));
const EmployeeShift = lazyWithReload(() => import("@pages/EmployeeShift/Employee"));
const Notification = lazyWithReload(() => import("@pages/Notification/NotificationPage"));

// ─── Document Center ──────────────────────────────────────────────────────────
const DocumentCenter = lazyWithReload(() => import("@pages/Documents/DocumentCenter"));

// ─── E-Signature ───────────────────────────────────────────────────────────────
const ESignPage = lazyWithReload(() => import("@pages/ESign/ESignPage"));
const PublicSignPage = lazyWithReload(() => import("@pages/ESign/PublicSignPage"));

// ─── Omnichannel Inbox ────────────────────────────────────────────────────────
const OmnichannelInboxPage = lazyWithReload(() => import("src/pages/OmniChannel/OmnichannelInboxPage"));
const OAuthCallbackPage = lazyWithReload(() => import("src/pages/OmniChannel/OAuthCallbackPage"));

// ─── Accounting Module ────────────────────────────────────────────────────────
const ChartOfAccountsPage = lazyWithReload(() => import("src/pages/ChartOfAccounts/ChartOfAccountsPage"));
const JournalEntriesPage = lazyWithReload(() => import("src/pages/JournalEntry/JournalEntriesPage"));
const SalesReceiptsPage = lazyWithReload(() => import("src/pages/SalesReceipts/SalesReceiptsPage"));
const NotesPage = lazyWithReload(() => import("src/pages/Notes/NotesPage"));
const BankStatementPage = lazyWithReload(() => import("src/pages/Banking/BankStatementPage"));
const BankReconciliationPage = lazyWithReload(() => import("src/pages/Reconciliation/BankReconciliationPage"));
const UnifiedReportsPage = lazyWithReload(() => import("src/pages/Report/UnifiedReportsPage"));

// Petty Cash & Refunds (Duka Only)
const PettyCashListPage = lazyWithReload(() => import("src/pages/PettyCash/PettyCashListPage"));
const RefundsListPage = lazyWithReload(() => import("src/pages/Refunds/RefundsListPage"));

// ─── Expenses / Bills / Income ────────────────────────────────────────────────
const ExpensesPage = lazyWithReload(() => import("@pages/OrderManagement/ExpensesPage"));
const BillsPage = lazyWithReload(() => import("@pages/OrderManagement/BillsPage"));
const IncomePage = lazyWithReload(() => import("@pages/OrderManagement/IncomePage"));

// ─── Currency ─────────────────────────────────────────────────────────────────
const CurrencyPage = lazyWithReload(() => import("src/pages/Currency/CurrencyPage"));

// ─── Asset Management ─────────────────────────────────────────────────────────
const AssetRegisterPage = lazyWithReload(() => import("src/pages/AssetManagement/AssetRegisterPage"));
const AssetRequestsPage = lazyWithReload(() => import("src/pages/AssetManagement/AssetRequestsPage"));
const AssetMaintenancePage = lazyWithReload(() => import("src/pages/AssetManagement/AssetMaintenancePage"));
const AssetReportsPage = lazyWithReload(() => import("src/pages/AssetManagement/AssetReportsPage"));

// ─── CRM / Mteja Module ───────────────────────────────────────────────────────
// All CRM pages are lazy-loaded and only reachable when hasMteja === true.
// The MtejaRoute guard below enforces this at runtime.
const LeadsPage = lazyWithReload(() => import("src/pages/Lead/Leads"));
const CampaignsPage = lazyWithReload(() => import("src/pages/Campaign/Campaigns"));
const SalesTargetsPage = lazyWithReload(() => import("src/pages/SalesTargets/SalesTargets"));
const SalesBudgetsPage = lazyWithReload(() => import("src/pages/Salesbudgets/Salesbudgets"));
const QuotesPage = lazyWithReload(() => import("src/pages/Quotes/QuotesPage"));
const ActivityCalendarPage = lazyWithReload(() => import("src/pages/ActivityCalendar/ActivityCalendarPage"));
const MtejaDashboard = lazyWithReload(() => import("src/pages/Dashboard/MtejaDashboard"));
const AccountingDashboardPage = lazyWithReload(() => import("src/pages/AccountingDashboard/AccountingDashboardPage"));

// ─── Dala Real Estate Module ───────────────────────────────────────────────────
// All Dala pages are lazy-loaded and only reachable when hasDala === true.
const DalaDashboard = lazyWithReload(() => import("src/pages/dala/Dashboard"));
const UnifiedDalaDashboard = lazyWithReload(() => import("src/pages/dala/UnifiedDalaDashboard"));
const PropertiesList = lazyWithReload(() => import("src/pages/dala/properties/PropertiesList"));
const PropertyDetail = lazyWithReload(() => import("src/pages/dala/properties/PropertyDetail"));
const PropertyTypesList = lazyWithReload(() => import("src/pages/dala/property-types/PropertyTypesList"));
const UnitsList = lazyWithReload(() => import("src/pages/dala/units/UnitsList"));
const UnitDetail = lazyWithReload(() => import("src/pages/dala/units/UnitDetail"));
const SalesManagement = lazyWithReload(() => import("src/pages/dala/sales/SalesManagement"));
const SaleDetail = lazyWithReload(() => import("src/pages/dala/sales/SaleDetail"));
const CommissionManagement = lazyWithReload(() => import("src/pages/dala/commissions/CommissionManagement"));
const LeaseManagement = lazyWithReload(() => import("src/pages/dala/leases/LeaseManagement"));
const LeaseDetail = lazyWithReload(() => import("src/pages/dala/leases/LeaseDetail"));
const RentCollection = lazyWithReload(() => import("src/pages/dala/rent/RentCollection"));
const MaintenanceManagement = lazyWithReload(() => import("src/pages/dala/maintenance/MaintenanceManagement"));

// ─── Bandu HR Module ───────────────────────────────────────────────────────────
const BanduHRDashboard = lazyWithReload(() => import("src/pages/BanduHR/BanduHRDashboard"));
const EmployeeManagement = lazyWithReload(() => import("src/pages/BanduHR/EmployeeManagement"));
const LeaveApplication = lazyWithReload(() => import("src/pages/BanduHR/LeaveApplication"));
const LeavePolicies = lazyWithReload(() => import("src/pages/BanduHR/LeavePolicies"));
const LeaveCalendar = lazyWithReload(() => import("src/pages/BanduHR/LeaveCalendar"));
const PayrollManagement = lazyWithReload(() => import("src/pages/BanduHR/PayrollManagement"));
const AttendanceTracking = lazyWithReload(() => import("src/pages/BanduHR/AttendanceTracking"));
const PayslipView = lazyWithReload(() => import("src/pages/BanduHR/PayslipView"));
const LeaveApprovals = lazyWithReload(() => import("src/pages/BanduHR/LeaveApprovals"));

// ─── Mteja guard ─────────────────────────────────────────────────────────────
const getMtejaEnabled = (): boolean => {
  try {
    const tenant = JSON.parse(localStorage.getItem("tenant") || "{}");
    return tenant?.modules?.crm === true;
  } catch {
    return false;
  }
};

const MtejaRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!getMtejaEnabled()) return <Navigate to="/customers" replace />;
  return <>{children}</>;
};

const AdminMtejaRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!getMtejaEnabled()) return <Navigate to="/admin/customers" replace />;
  return <>{children}</>;
};

// ─── Dala guard ─────────────────────────────────────────────────────────────
const getDalaEnabled = (): boolean => {
  try {
    const tenant = JSON.parse(localStorage.getItem("tenant") || "{}");
    return tenant?.modules?.dala === true;
  } catch {
    return false;
  }
};

const DalaRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!getDalaEnabled()) return <Navigate to="/customers" replace />;
  return <>{children}</>;
};

const AdminDalaRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!getDalaEnabled()) return <Navigate to="/admin/customers" replace />;
  return <>{children}</>;
};

// ─── Bandu HR guard ─────────────────────────────────────────────────────────────
const getBanduHREnabled = (): boolean => {
  try {
    const tenant = JSON.parse(localStorage.getItem("tenant") || "{}");
    return tenant?.modules?.bandu_hr === true || tenant?.modules?.payroll === true; // Support both flags for backward compatibility
  } catch {
    return false;
  }
};

const BanduHRRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!getBanduHREnabled()) return <Navigate to="/home-dashboard" replace />;
  return <>{children}</>;
};

const AdminBanduHRRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!getBanduHREnabled()) return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
};

// ─── CRM page wrapper — private + Mteja guard ────────────────────────────────
const mtejaPage = (Component: React.ComponentType, permission: string) => (
  <MtejaRoute>
    <PermissionRoute permission={permission}>
      {privatePage(Component)}
    </PermissionRoute>
  </MtejaRoute>
);

const mtejaAdminPage = (Component: React.ComponentType, permission: string) => (
  <AdminMtejaRoute>
    <PermissionRoute permission={permission}>
      {adminPage(Component)}
    </PermissionRoute>
  </AdminMtejaRoute>
);

// ─── Dala page wrapper — private + Dala guard ───────────────────────────────────
const dalaPage = (Component: React.ComponentType, permission: string) => (
  <DalaRoute>
    <PermissionRoute permission={permission}>
      {privatePage(Component)}
    </PermissionRoute>
  </DalaRoute>
);

const dalaAdminPage = (Component: React.ComponentType, permission: string) => (
  <AdminDalaRoute>
    <PermissionRoute permission={permission}>
      {adminPage(Component)}
    </PermissionRoute>
  </AdminDalaRoute>
);

// ─── Bandu HR page wrapper — private + Bandu HR guard ───────────────────────────
const banduHRPage = (Component: React.ComponentType, permission: string) => (
  <BanduHRRoute>
    <PermissionRoute permission={permission}>
      {privatePage(Component)}
    </PermissionRoute>
  </BanduHRRoute>
);

const banduHRAdminPage = (Component: React.ComponentType, permission: string) => (
  <AdminBanduHRRoute>
    <PermissionRoute permission={permission}>
      {adminPage(Component)}
    </PermissionRoute>
  </AdminBanduHRRoute>
);

// ─── Accounting layout wrapper ────────────────────────────────────────────────
const AccountingLayout = () => <Outlet />;

// ─── CRM layout wrapper ───────────────────────────────────────────────────────
const CrmLayout = () => <Outlet />;

// ─── Smart routers ────────────────────────────────────────────────────────────
const SmartShopRouter = () => {
  const tenant = (() => { try { return JSON.parse(localStorage.getItem("tenant") || "{}"); } catch { return {}; } })();
  const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
  const hasAccounting = !!(tenant?.accounting_database?.enabled || tenant?.modules?.accounting);
  const hasMteja = tenant?.modules?.crm === true;
  const hasDala = tenant?.modules?.dala === true;

  if (hasDala && !hasPOS && !hasAccounting && !hasMteja) return <Navigate to="/dala" replace />;
  if (hasMteja && !hasPOS && !hasAccounting) return <Navigate to="/home-dashboard?tab=mteja" replace />;
  if (hasAccounting && !hasPOS) return <Navigate to="/home-dashboard?tab=accounting" replace />;
  return privatePage(Table);
};

const SmartDashboardRouter = () => {
  const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  const tenant = (() => { try { return JSON.parse(localStorage.getItem("tenant") || "{}"); } catch { return {}; } })();

  if (!user?.role) return <Navigate to="/login" replace />;

  const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
  const hasAccounting = !!(tenant?.accounting_database?.enabled || tenant?.modules?.accounting);
  const hasMteja = tenant?.modules?.crm === true;
  const hasDala = tenant?.modules?.dala === true;

  if (hasMteja && !hasPOS && !hasAccounting && !hasDala) return <Navigate to="/admin/dashboard?tab=mteja" replace />;
  if (hasAccounting && !hasPOS) return <Navigate to="/admin/dashboard?tab=accounting" replace />;
  return <Navigate to="/admin/dashboard" replace />;
};

// ─────────────────────────────────────────────────────────────────────────────
const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouterV6(createBrowserRouter);
const routes = sentryCreateBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Public — OAuth popup */}
      <Route
        path="/omnichannel/oauth/callback"
        errorElement={<NotFound />}
        element={<Suspense fallback={fullscreenSpin}><OAuthCallbackPage /></Suspense>}
      />

      {/* Public — Legal pages (unauthenticated) */}
      <Route
        path="/privacy-policy"
        errorElement={<NotFound />}
        element={<Suspense fallback={fullscreenSpin}><PrivacyPolicy /></Suspense>}
      />
      <Route
        path="/terms-and-conditions"
        errorElement={<NotFound />}
        element={<Suspense fallback={fullscreenSpin}><TermsAndConditions /></Suspense>}
      />

      {/* Public — document signing via shareable link (unauthenticated) */}
      <Route
        path="/esign/sign/:token"
        errorElement={<NotFound />}
        element={<Suspense fallback={fullscreenSpin}><PublicSignPage /></Suspense>}
      />

      {/* ══════════════════════════════════════════════════════════════════
          SHOP / POS ROUTES  (prefix: "/")
      ══════════════════════════════════════════════════════════════════ */}
      <Route path="/" element={<Layout />}>
        <Route index errorElement={<NotFound />} element={<SmartShopRouter />} />

        <Route path="login" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><StaffLoginPage /></Suspense>} />

        <Route path="notifications" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><Notification /></Suspense>} />

        <Route path="tables" errorElement={<NotFound />}
          element={guardedPage(Table, "CART_VIEW_ITEMS")} />

        <Route path="main-category" errorElement={<NotFound />}
          element={guardedPage(MainCategory, "CATEGORIES_VIEW")} />

        <Route path="dashboard/:id" errorElement={<NotFound />}
          element={guardedPage(RestaurantPage, "ORDERS_VIEW_DASHBOARD")} />

        <Route path="dashboard" errorElement={<NotFound />}
          element={<Navigate to="/pos/dashboard" replace />} />

        <Route path="cart/cart/:cartId" errorElement={<NotFound />}
          element={guardedPage(RestaurantPage, "ORDERS_VIEW_DASHBOARD")} />

        <Route path="home-dashboard" errorElement={<NotFound />}
          element={guardedPage(UnifiedShopDashboardPage, "UNIFIED_DASHBOARD_VIEW")} />

        <Route path="esign" errorElement={<NotFound />}
          element={guardedPage(ESignPage, "SIGNATURE_VIEW")} />

        <Route path="store" errorElement={<NotFound />}
          element={guardedPage(MainStore, "PRODUCTS_VIEW")} />

        <Route path="store/:id" errorElement={<NotFound />}
          element={guardedPage(MainStore, "PRODUCTS_VIEW")} />

        <Route path="payment/callback" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><PaymentCallback /></Suspense>} />

        <Route path="payment-settings" errorElement={<NotFound />}
          element={guardedPage(PaymentMainSettings, "PAYMENT_METHODS_VIEW")} />

        <Route path="payment-methods" errorElement={<NotFound />}
          element={guardedPage(PaymentMainSettings, "PAYMENT_METHODS_VIEW")} />

        <Route path="system-setup" errorElement={<NotFound />}
          element={guardedPage(SystemSetup, "SYSTEM_SETUP_VIEW")} />

        <Route path="users-settings" errorElement={<NotFound />}
          element={guardedPage(UsersMainSettings, "USERS_VIEW")} />

        <Route path="staff-management" errorElement={<NotFound />}
          element={
            <Suspense fallback={fullscreenSpin}>
              <AdminRoute><UsersMainSettings /></AdminRoute>
            </Suspense>
          }
        />

        <Route path="supplier-settings" errorElement={<NotFound />}
          element={guardedPage(SupplierMainSettings, "SUPPLIERS_VIEW")} />

        <Route path="suppliers" errorElement={<NotFound />}
          element={guardedPage(SupplierMainSettings, "SUPPLIERS_VIEW")} />

        <Route path="table-settings" errorElement={<NotFound />}
          element={guardedPage(TableMainSettings, "TABLES_VIEW")} />

        <Route path="Category-settings" errorElement={<NotFound />}
          element={guardedPage(CategoryMainSettings, "CATEGORIES_VIEW")} />

        <Route path="category-settings" errorElement={<NotFound />}
          element={guardedPage(CategoryMainSettings, "CATEGORIES_VIEW")} />

        <Route path="reports" errorElement={<NotFound />}
          element={guardedPage(UnifiedReportsPage, ["REPORTS_ITEM_SALES", "REPORTS_VIEW"])} />

        <Route path="inventory-settings" errorElement={<NotFound />}
          element={guardedPage(InventoryMainSettings, "INVENTORY_VIEW")} />

        <Route path="inventory" errorElement={<NotFound />}
          element={guardedPage(InventoryMainSettings, "INVENTORY_VIEW")} />

        <Route path="profile/:id" errorElement={<NotFound />}
          element={privatePage(Profile)} />

        <Route path="orders" errorElement={<NotFound />}
          element={guardedPage(MainOrders, "ORDERS_VIEW")} />

        <Route path="customers" errorElement={<NotFound />}
          element={guardedPage(Customer, "CUSTOMERS_VIEW")} />

        <Route path="fss-faqs" errorElement={<NotFound />}
          element={guardedPage(Faqs, "FAQ_VIEW")} />

        <Route path="website-builder" errorElement={<NotFound />}
          element={guardedPage(Website, "GALLERY_VIEW")} />

        <Route path="employee-shift" errorElement={<NotFound />}
          element={guardedPage(EmployeeShift, "SHIFTS_VIEW")} />

        <Route path="documents" errorElement={<NotFound />}
          element={guardedPage(DocumentCenter, "DOCUMENTS_VIEW")} />

        <Route path="help-center" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><HelpCenter /></Suspense>} />

        {/* Petty Cash & Refunds (Duka Only) */}
        <Route path="petty-cash" errorElement={<NotFound />}
          element={guardedPage(PettyCashListPage, "ORDERS_VIEW_DASHBOARD")} />
        <Route path="refunds" errorElement={<NotFound />}
          element={guardedPage(RefundsListPage, "ORDERS_VIEW_DASHBOARD")} />

        <Route path="omnichannel" errorElement={<NotFound />}
          element={guardedPage(OmnichannelInboxPage, "OMNICHANNEL_VIEW")} />

        <Route path="mteja" errorElement={<NotFound />}
          element={<Navigate to="/home-dashboard" replace />} />

        <Route path="currencies" errorElement={<NotFound />}
          element={guardedPage(CurrencyPage, "ACCOUNTING_COA_VIEW")} />

        {/* ── Accounting — shop level (/accounting/...) ──────────────────── */}
        <Route path="accounting" element={<AccountingLayout />}>
          <Route index errorElement={<NotFound />}
            element={guardedPage(AccountingDashboardPage, "ACCOUNTING_COA_VIEW")} />
          <Route path="dashboard" errorElement={<NotFound />}
            element={guardedPage(AccountingDashboardPage, "ACCOUNTING_COA_VIEW")} />
          <Route path="accounts" errorElement={<NotFound />}
            element={guardedPage(ChartOfAccountsPage, "ACCOUNTING_COA_VIEW")} />
          <Route path="journals" errorElement={<NotFound />}
            element={guardedPage(JournalEntriesPage, "ACCOUNTING_JOURNAL_VIEW")} />
          <Route path="sales-receipts" errorElement={<NotFound />}
            element={guardedPage(SalesReceiptsPage, "ACCOUNTING_INCOME_VIEW_HISTORY")} />
          <Route path="notes" errorElement={<NotFound />}
            element={guardedPage(NotesPage, "ACCOUNTING_NOTES_VIEW")} />
          <Route path="bank-statements" errorElement={<NotFound />}
            element={guardedPage(BankStatementPage, "ACCOUNTING_BANK_STMT_VIEW")} />
          <Route path="reconciliation" errorElement={<NotFound />}
            element={guardedPage(BankReconciliationPage, "ACCOUNTING_RECON_VIEW")} />
          <Route path="expenses" errorElement={<NotFound />}
            element={guardedPage(ExpensesPage, "ACCOUNTING_INCOME_POST_EXPENSE")} />
          <Route path="bills" errorElement={<NotFound />}
            element={guardedPage(BillsPage, "ACCOUNTING_INVOICE_VIEW")} />
          <Route path="income" errorElement={<NotFound />}
            element={guardedPage(IncomePage, "ACCOUNTING_INCOME_VIEW_HISTORY")} />
          <Route path="currencies" errorElement={<NotFound />}
            element={guardedPage(CurrencyPage, "ACCOUNTING_COA_VIEW")} />
          <Route path="assets" errorElement={<NotFound />}
            element={guardedPage(AssetRegisterPage, "ACCOUNTING_ASSETS_VIEW")} />
          <Route path="asset-requests" errorElement={<NotFound />}
            element={guardedPage(AssetRequestsPage, "ACCOUNTING_ASSET_REQUESTS_VIEW")} />
          <Route path="asset-maintenance" errorElement={<NotFound />}
            element={guardedPage(AssetMaintenancePage, "ACCOUNTING_ASSET_MAINTENANCE_VIEW")} />
          <Route path="asset-reports" errorElement={<NotFound />}
            element={guardedPage(AssetReportsPage, "ACCOUNTING_ASSET_REPORTS_DEPRECIATION")} />

          </Route>

        {/* ── Module direct aliases ────────────────────────────────────── */}
        <Route path="pesa/dashboard" element={<Navigate to="/accounting/dashboard" replace />} />
        <Route path="pesa" element={<Navigate to="/accounting/dashboard" replace />} />
        <Route path="mteja/dashboard" element={<Navigate to="/crm/dashboard" replace />} />
        <Route path="mteja" element={<Navigate to="/crm/dashboard" replace />} />
        <Route path="bandu/dashboard" element={<Navigate to="/hr/dashboard" replace />} />
        <Route path="bandu" element={<Navigate to="/hr/dashboard" replace />} />
        <Route path="pos/dashboard" errorElement={<NotFound />}
          element={guardedPage(DukaDashboardPage, "UNIFIED_DASHBOARD_VIEW")} />
        <Route path="pos" element={<Navigate to="/pos/dashboard" replace />} />
        <Route path="duka/dashboard" element={<Navigate to="/pos/dashboard" replace />} />
        <Route path="duka" element={<Navigate to="/pos/dashboard" replace />} />

        {/* ── CRM / Mteja — shop level (/crm/...) ───────────────────────────
            ALL routes here require hasMteja === true (MtejaRoute guard).
            Permission: CUSTOMERS_VIEW gates all CRM pages for now —
            add dedicated CRM permissions when roles are extended.
        ─────────────────────────────────────────────────────────────────── */}
        <Route path="crm" element={<CrmLayout />}>
          <Route index errorElement={<NotFound />}
            element={mtejaPage(MtejaDashboard, "CUSTOMERS_VIEW")} />
          <Route path="dashboard" errorElement={<NotFound />}
            element={mtejaPage(MtejaDashboard, "CUSTOMERS_VIEW")} />
          <Route path="leads" errorElement={<NotFound />}
            element={mtejaPage(LeadsPage, "CUSTOMERS_VIEW")} />
          <Route path="campaigns" errorElement={<NotFound />}
            element={mtejaPage(CampaignsPage, "CUSTOMERS_VIEW")} />
          <Route path="sales-targets" errorElement={<NotFound />}
            element={mtejaPage(SalesTargetsPage, "CUSTOMERS_VIEW")} />
          <Route path="sales-budgets" errorElement={<NotFound />}
            element={mtejaPage(SalesBudgetsPage, "CUSTOMERS_VIEW")} />
          <Route path="quotes" errorElement={<NotFound />}
            element={mtejaPage(QuotesPage, "CUSTOMERS_VIEW")} />
          <Route path="calendar" errorElement={<NotFound />}
            element={mtejaPage(ActivityCalendarPage, "CUSTOMERS_VIEW")} />
        </Route>

        {/* ── Dala Real Estate — shop level (/dala/...) ───────────────────────
            ALL routes here require hasDala === true (DalaRoute guard).
            Permission: DALA_PROPERTIES_VIEW gates all Dala pages for now —
            add dedicated Dala permissions when roles are extended.
        ─────────────────────────────────────────────────────────────────── */}
        <Route path="dala" element={<Outlet />}>
          <Route index errorElement={<NotFound />}
            element={dalaPage(DalaDashboard, "DALA_PROPERTIES_VIEW")} />
          <Route path="dashboard" errorElement={<NotFound />}
            element={dalaPage(DalaDashboard, "DALA_PROPERTIES_VIEW")} />
          <Route path="properties" errorElement={<NotFound />}
            element={dalaPage(PropertiesList, "DALA_PROPERTIES_VIEW")} />
          <Route path="properties/:id" errorElement={<NotFound />}
            element={dalaPage(PropertyDetail, "DALA_PROPERTIES_VIEW")} />
          <Route path="property-types" errorElement={<NotFound />}
            element={dalaPage(PropertyTypesList, "DALA_PROPERTY_TYPES_VIEW")} />
          <Route path="units" errorElement={<NotFound />}
            element={dalaPage(UnitsList, "DALA_UNITS_VIEW")} />
          <Route path="units/:id" errorElement={<NotFound />}
            element={dalaPage(UnitDetail, "DALA_UNITS_VIEW")} />
          <Route path="sales" errorElement={<NotFound />}
            element={dalaPage(SalesManagement, "DALA_SALES_VIEW")} />
          <Route path="sales/:id" errorElement={<NotFound />}
            element={dalaPage(SaleDetail, "DALA_SALES_VIEW")} />
          <Route path="commissions" errorElement={<NotFound />}
            element={dalaPage(CommissionManagement, "DALA_COMMISSIONS_VIEW")} />
          <Route path="leases" errorElement={<NotFound />}
            element={dalaPage(LeaseManagement, "DALA_LEASES_VIEW")} />
          <Route path="leases/:id" errorElement={<NotFound />}
            element={dalaPage(LeaseDetail, "DALA_LEASES_VIEW")} />
          <Route path="rent-collection" errorElement={<NotFound />}
            element={dalaPage(RentCollection, "DALA_RENT_COLLECTION_VIEW")} />
          <Route path="maintenance" errorElement={<NotFound />}
            element={dalaPage(MaintenanceManagement, "DALA_MAINTENANCE_VIEW")} />
        </Route>

        {/* ── Bandu HR — shop level (/hr/...) ─────────────────────────────────
            ALL routes here require hasBanduHR === true (BanduHRRoute guard).
            Leave Departments and Leave Approvals are ADMIN-ONLY and not included here.
        ─────────────────────────────────────────────────────────────────── */}
        <Route path="hr" element={<Outlet />}>
          <Route index errorElement={<NotFound />}
            element={banduHRPage(BanduHRDashboard, "BANDU_DASHBOARD_VIEW")} />
          <Route path="dashboard" errorElement={<NotFound />}
            element={banduHRPage(BanduHRDashboard, "BANDU_DASHBOARD_VIEW")} />
          <Route path="employees" errorElement={<NotFound />}
            element={banduHRPage(EmployeeManagement, "BANDU_EMPLOYEES_VIEW")} />
          <Route path="leave" errorElement={<NotFound />}
            element={banduHRPage(LeaveApplication, "BANDU_LEAVE_VIEW")} />
          <Route path="leave-policies" errorElement={<NotFound />}
            element={banduHRPage(LeavePolicies, "BANDU_LEAVE_POLICIES_VIEW")} />
          <Route path="leave-calendar" errorElement={<NotFound />}
            element={banduHRPage(LeaveCalendar, "BANDU_LEAVE_VIEW")} />
          <Route path="leave-approvals" errorElement={<NotFound />}
            element={banduHRPage(LeaveApprovals, "BANDU_LEAVE_APPROVALS_VIEW")} />
          <Route path="payroll" errorElement={<NotFound />}
            element={banduHRPage(PayrollManagement, "BANDU_PAYROLL_VIEW")} />
          <Route path="attendance" errorElement={<NotFound />}
            element={banduHRPage(AttendanceTracking, "BANDU_ATTENDANCE_VIEW")} />
          <Route path="payslips" errorElement={<NotFound />}
            element={banduHRPage(PayslipView, "BANDU_PAYSLIPS_VIEW")} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

      {/* ══════════════════════════════════════════════════════════════════
          ADMIN ROUTES  (prefix: "/admin")
      ══════════════════════════════════════════════════════════════════ */}
      <Route path="/admin" element={<Layout />}>
        <Route index element={<SmartDashboardRouter />} />

        <Route path="notifications" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><Notification /></Suspense>} />

        <Route path="tables" errorElement={<NotFound />}
          element={guardedAdminPage(Table, "CART_VIEW_ITEMS")} />

        <Route path="home-dashboard" errorElement={<NotFound />}
          element={guardedAdminPage(DashboardAdminPage, "UNIFIED_DASHBOARD_VIEW")} />

        <Route path="orders" errorElement={<NotFound />}
          element={guardedAdminPage(MainOrders, "ORDERS_VIEW")} />

        <Route path="store" errorElement={<NotFound />}
          element={guardedAdminPage(MainStore, "PRODUCTS_VIEW")} />

        <Route path="store/:id" errorElement={<NotFound />}
          element={guardedAdminPage(MainStore, "PRODUCTS_VIEW")} />

        <Route path="inventory" errorElement={<NotFound />}
          element={guardedAdminPage(InventoryMainSettings, "INVENTORY_VIEW")} />

        <Route path="inventory-settings" errorElement={<NotFound />}
          element={guardedAdminPage(InventoryMainSettings, "INVENTORY_VIEW")} />

        <Route path="customers" errorElement={<NotFound />}
          element={guardedAdminPage(Customer, "CUSTOMERS_VIEW")} />

        <Route path="suppliers" errorElement={<NotFound />}
          element={guardedAdminPage(SupplierMainSettings, "SUPPLIERS_VIEW")} />

        <Route path="payment-methods" errorElement={<NotFound />}
          element={guardedAdminPage(PaymentMainSettings, "PAYMENT_METHODS_VIEW")} />

        <Route path="payment-settings" errorElement={<NotFound />}
          element={guardedAdminPage(PaymentMainSettings, "PAYMENT_METHODS_VIEW")} />

        <Route path="system-setup" errorElement={<NotFound />}
          element={guardedAdminPage(SystemSetup, "SYSTEM_SETUP_VIEW")} />

        <Route path="reports" errorElement={<NotFound />}
          element={
            <PermissionRoute permission={["REPORTS_ITEM_SALES", "REPORTS_VIEW"]}>
              <Suspense fallback={fullscreenSpin}>
                <AdminRoute><UnifiedReportsPage /></AdminRoute>
              </Suspense>
            </PermissionRoute>
          }
        />

        <Route path="health-score" errorElement={<NotFound />}
          element={adminPage(BusinessHealthScorePage)} />

        <Route path="business-health" errorElement={<NotFound />}
          element={adminPage(BusinessHealthScorePage)} />

        <Route path="wages" errorElement={<NotFound />}
          element={adminPage(WagesList)} />

        <Route path="shop-management" errorElement={<NotFound />}
          element={guardedAdminPage(ShopManagement, "SHOPS_VIEW")} />

        <Route path="staff-management" errorElement={<NotFound />}
          element={
            <PermissionRoute permission="USERS_VIEW">
              <Suspense fallback={fullscreenSpin}>
                <AdminRoute><UsersMainSettings /></AdminRoute>
              </Suspense>
            </PermissionRoute>
          }
        />

        <Route path="users-settings" errorElement={<NotFound />}
          element={guardedAdminPage(UsersMainSettings, "USERS_VIEW")} />

        <Route path="customer-list" errorElement={<NotFound />}
          element={
            <PermissionRoute permission="CUSTOMERS_VIEW">
              <Suspense fallback={fullscreenSpin}>
                <AdminRoute><AdminCustomersList /></AdminRoute>
              </Suspense>
            </PermissionRoute>
          }
        />

        <Route path="employee-shift" errorElement={<NotFound />}
          element={guardedAdminPage(EmployeeShift, "SHIFTS_VIEW")} />

        <Route path="staff-clock-in" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><StaffClockTracker /></Suspense>} />

        <Route path="billing" errorElement={<NotFound />}
          element={adminPage(PaymentSubscriptionPage)} />

        <Route path="profile/:id" errorElement={<NotFound />}
          element={
            <Suspense fallback={fullscreenSpin}>
              <AdminRoute><AdminProfile /></AdminRoute>
            </Suspense>
          }
        />

        <Route path="help-center" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><AdminRoute><HelpCenter /></AdminRoute></Suspense>} />

        <Route path="esign" errorElement={<NotFound />}
          element={
            <PermissionRoute permission="SIGNATURE_VIEW">
              <Suspense fallback={fullscreenSpin}>
                <AdminRoute><ESignPage /></AdminRoute>
              </Suspense>
            </PermissionRoute>
          }
        />

        <Route path="discover" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><AdminRoute><DiscoverPage /></AdminRoute></Suspense>} />

        <Route path="settings" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><AdminRoute><TenantSettings /></AdminRoute></Suspense>} />

        <Route path="Category-settings" errorElement={<NotFound />}
          element={guardedAdminPage(CategoryMainSettings, "CATEGORIES_VIEW")} />

        <Route path="category-settings" errorElement={<NotFound />}
          element={guardedAdminPage(CategoryMainSettings, "CATEGORIES_VIEW")} />

        <Route path="table-settings" errorElement={<NotFound />}
          element={guardedAdminPage(TableMainSettings, "TABLES_VIEW")} />

        <Route path="fss-faqs" errorElement={<NotFound />}
          element={guardedAdminPage(Faqs, "FAQ_VIEW")} />

        <Route path="website-builder" errorElement={<NotFound />}
          element={guardedAdminPage(Website, "GALLERY_VIEW")} />

        <Route path="documents" errorElement={<NotFound />}
          element={guardedAdminPage(DocumentCenter, "DOCUMENTS_VIEW")} />

        <Route path="omnichannel" errorElement={<NotFound />}
          element={guardedAdminPage(OmnichannelInboxPage, "OMNICHANNEL_VIEW")} />

        <Route path="dashboard" errorElement={<NotFound />}
          element={
            <Suspense fallback={fullscreenSpin}>
              <AdminRoute>
                <UnifiedDashboardPage />
              </AdminRoute>
            </Suspense>
          } />

        {/* ── Module direct aliases ────────────────────────────────────── */}
        <Route path="pesa/dashboard" element={<Navigate to="/admin/accounting/dashboard" replace />} />
        <Route path="pesa" element={<Navigate to="/admin/accounting/dashboard" replace />} />
        <Route path="mteja/dashboard" element={<Navigate to="/admin/crm/dashboard" replace />} />
        <Route path="mteja" element={<Navigate to="/admin/crm/dashboard" replace />} />
        <Route path="bandu/dashboard" element={<Navigate to="/admin/hr/dashboard" replace />} />
        <Route path="bandu" element={<Navigate to="/admin/hr/dashboard" replace />} />
        <Route path="pos/dashboard" errorElement={<NotFound />}
          element={guardedAdminPage(AdminDukaDashboardPage, "UNIFIED_DASHBOARD_VIEW")} />
        <Route path="pos" element={<Navigate to="/admin/pos/dashboard" replace />} />
        <Route path="duka/dashboard" element={<Navigate to="/admin/pos/dashboard" replace />} />
        <Route path="duka" element={<Navigate to="/admin/pos/dashboard" replace />} />

        {/* ── Accounting — admin level (/admin/accounting/...) ───────────── */}
        <Route path="accounting" element={<AccountingLayout />}>
          <Route index errorElement={<NotFound />}
            element={guardedAdminPage(AccountingDashboardPage, "ACCOUNTING_COA_VIEW")} />
          <Route path="dashboard" errorElement={<NotFound />}
            element={guardedAdminPage(AccountingDashboardPage, "ACCOUNTING_COA_VIEW")} />
          <Route path="accounts" errorElement={<NotFound />}
            element={guardedAdminPage(ChartOfAccountsPage, "ACCOUNTING_COA_VIEW")} />
          <Route path="journals" errorElement={<NotFound />}
            element={guardedAdminPage(JournalEntriesPage, "ACCOUNTING_JOURNAL_VIEW")} />
          <Route path="sales-receipts" errorElement={<NotFound />}
            element={guardedAdminPage(SalesReceiptsPage, "ACCOUNTING_INCOME_VIEW_HISTORY")} />
          <Route path="notes" errorElement={<NotFound />}
            element={guardedAdminPage(NotesPage, "ACCOUNTING_NOTES_VIEW")} />
          <Route path="bank-statements" errorElement={<NotFound />}
            element={guardedAdminPage(BankStatementPage, "ACCOUNTING_BANK_STMT_VIEW")} />
          <Route path="reconciliation" errorElement={<NotFound />}
            element={guardedAdminPage(BankReconciliationPage, "ACCOUNTING_RECON_VIEW")} />
          <Route path="expenses" errorElement={<NotFound />}
            element={guardedAdminPage(ExpensesPage, "ACCOUNTING_INCOME_POST_EXPENSE")} />
          <Route path="bills" errorElement={<NotFound />}
            element={guardedAdminPage(BillsPage, "ACCOUNTING_INVOICE_VIEW")} />
          <Route path="income" errorElement={<NotFound />}
            element={guardedAdminPage(IncomePage, "ACCOUNTING_INCOME_VIEW_HISTORY")} />
          <Route path="currencies" errorElement={<NotFound />}
            element={guardedAdminPage(CurrencyPage, "ACCOUNTING_COA_VIEW")} />
        </Route>

        {/* ── CRM / Mteja — admin level (/admin/crm/...) ────────────────────
            Mirrors the shop-level CRM routes above.
            All gated behind AdminMtejaRoute so non-CRM tenants can't access.
        ─────────────────────────────────────────────────────────────────── */}
        <Route path="crm" element={<CrmLayout />}>
          <Route index errorElement={<NotFound />}
            element={mtejaAdminPage(MtejaDashboard, "CUSTOMERS_VIEW")} />
          <Route path="dashboard" errorElement={<NotFound />}
            element={mtejaAdminPage(MtejaDashboard, "CUSTOMERS_VIEW")} />
          <Route path="leads" errorElement={<NotFound />}
            element={mtejaAdminPage(LeadsPage, "CUSTOMERS_VIEW")} />
          <Route path="campaigns" errorElement={<NotFound />}
            element={mtejaAdminPage(CampaignsPage, "CUSTOMERS_VIEW")} />
          <Route path="sales-targets" errorElement={<NotFound />}
            element={mtejaAdminPage(SalesTargetsPage, "CUSTOMERS_VIEW")} />
          <Route path="sales-budgets" errorElement={<NotFound />}
            element={mtejaAdminPage(SalesBudgetsPage, "CUSTOMERS_VIEW")} />
          <Route path="quotes" errorElement={<NotFound />}
            element={mtejaAdminPage(QuotesPage, "CUSTOMERS_VIEW")} />
          <Route path="calendar" errorElement={<NotFound />}
            element={mtejaAdminPage(ActivityCalendarPage, "CUSTOMERS_VIEW")} />
        </Route>

        {/* ── Dala Real Estate — admin level (/admin/dala/...) ───────────────
            Mirrors the shop-level Dala routes above.
            All gated behind AdminDalaRoute so non-Dala tenants can't access.
        ─────────────────────────────────────────────────────────────────── */}
        <Route path="dala" element={<Outlet />}>
          <Route index errorElement={<NotFound />}
            element={dalaAdminPage(UnifiedDalaDashboard, "DALA_PROPERTIES_VIEW")} />
          <Route path="dashboard" errorElement={<NotFound />}
            element={dalaAdminPage(UnifiedDalaDashboard, "DALA_PROPERTIES_VIEW")} />
          <Route path="properties" errorElement={<NotFound />}
            element={dalaAdminPage(PropertiesList, "DALA_PROPERTIES_VIEW")} />
          <Route path="properties/:id" errorElement={<NotFound />}
            element={dalaAdminPage(PropertyDetail, "DALA_PROPERTIES_VIEW")} />
          <Route path="property-types" errorElement={<NotFound />}
            element={dalaAdminPage(PropertyTypesList, "DALA_PROPERTY_TYPES_VIEW")} />
          <Route path="units" errorElement={<NotFound />}
            element={dalaAdminPage(UnitsList, "DALA_UNITS_VIEW")} />
          <Route path="units/:id" errorElement={<NotFound />}
            element={dalaAdminPage(UnitDetail, "DALA_UNITS_VIEW")} />
          <Route path="sales" errorElement={<NotFound />}
            element={dalaAdminPage(SalesManagement, "DALA_SALES_VIEW")} />
          <Route path="sales/:id" errorElement={<NotFound />}
            element={dalaAdminPage(SaleDetail, "DALA_SALES_VIEW")} />
          <Route path="commissions" errorElement={<NotFound />}
            element={dalaAdminPage(CommissionManagement, "DALA_COMMISSIONS_VIEW")} />
          <Route path="leases" errorElement={<NotFound />}
            element={dalaAdminPage(LeaseManagement, "DALA_LEASES_VIEW")} />
          <Route path="leases/:id" errorElement={<NotFound />}
            element={dalaAdminPage(LeaseDetail, "DALA_LEASES_VIEW")} />
          <Route path="rent-collection" errorElement={<NotFound />}
            element={dalaAdminPage(RentCollection, "DALA_RENT_COLLECTION_VIEW")} />
          <Route path="maintenance" errorElement={<NotFound />}
            element={dalaAdminPage(MaintenanceManagement, "DALA_MAINTENANCE_VIEW")} />
        </Route>

        {/* ── Bandu HR — admin level (/admin/hr/...) ─────────────────────────
            ADMIN-ONLY routes: Dashboard and Leave Approvals.
            All gated behind AdminBanduHRRoute so non-Bandu HR tenants can't access.
        ─────────────────────────────────────────────────────────────────── */}
        <Route path="hr" element={<Outlet />}>
          <Route index errorElement={<NotFound />}
            element={banduHRAdminPage(BanduHRDashboard, "BANDU_DASHBOARD_VIEW")} />
          <Route path="dashboard" errorElement={<NotFound />}
            element={banduHRAdminPage(BanduHRDashboard, "BANDU_DASHBOARD_VIEW")} />
          <Route path="leave-approvals" errorElement={<NotFound />}
            element={banduHRAdminPage(LeaveApprovals, "BANDU_LEAVE_APPROVALS_VIEW")} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </>
  )
);

const RootCenteredLoader = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100vw",
      height: "100vh",
      position: "fixed",
      top: 0,
      left: 0,
      background: "#ffffff",
      zIndex: 99999,
    }}
  >
    <Spin size="large" />
  </div>
);

function Routers() {
  return (
    <Suspense fallback={<RootCenteredLoader />}>
      <RouterProvider router={routes} />
    </Suspense>
  );
}

export default Routers;