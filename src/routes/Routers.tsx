import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Suspense, lazy } from "react";
import Private, { AdminRoute } from "@components/layout/private/Private";
import MainCategory from "@pages/main_category/Main_category";
import NotFound from "@routes/NotFound";
import { Spin } from "antd/lib";
import { COOP_NAME } from "@utils/config";
import MainOrders from "@pages/OrderManagement/MainOrders";
import NubaLoader from "@components/spinner/NubaLoader";
import StaffLoginPage from "@pages/Login/login";
import UnifiedShopDashboardPage from "src/pages/Report/UnifiedShopDashboardPage";
import StaffClockTracker from "@pages/staff/ClockInTracker";
import HelpCenter from "src/AdminDashboard/HelpCenter/HelpCenterPage";
import DashboardAdminPage from "src/AdminDashboard/DashboardPage/DashboardPage";
import UnifiedDashboardPage from "src/pages/Report/UnifiedDashboardPage";
import ShopManagement from "src/AdminDashboard/Shops/MainShopPage";
import Customer from "src/pages/Customer/CustomerList";
import PaymentSubscriptionPage from "src/components/billing/Billing";
import AdminCustomersList from "src/AdminDashboard/Customers/CustomerList";
import TenantSettings from "src/AdminDashboard/Settings/TenantSettings";
import DiscoverPage from "src/AdminDashboard/DiscoverPage";
import PaymentCallback from "@components/payment/PaymentCallback";
import { getPrimaryColor } from "@utils/getPrimaryColor";
import PermissionRoute from "@components/PermissionRoute";

// ─── Fallback spinners ────────────────────────────────────────────────────────
const fullscreenSpin = (
  <Spin size="large" fullscreen style={{ color: getPrimaryColor() }} />
);

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

const guardedPage = (Component: React.ComponentType, permission: string) => (
  <PermissionRoute permission={permission}>
    {privatePage(Component)}
  </PermissionRoute>
);

const guardedAdminPage = (Component: React.ComponentType, permission: string) => (
  <PermissionRoute permission={permission}>
    {adminPage(Component)}
  </PermissionRoute>
);

// ─── Wages Module ─────────────────────────────────────────────────────────────
const WagesList = lazy(() => import("src/AdminDashboard/Wages/WageList"));

// ─── Core App ─────────────────────────────────────────────────────────────────
const Layout = lazy(() => import("@components/layout/Layout"));
const RestaurantPage = lazy(() => import("@pages/Restaurant/Restuarant"));
const MainStore = lazy(() => import("@pages/store/MainStore"));
const Table = lazy(() => import("@pages/Tables/TablePro"));
const Faqs = lazy(() => import("@pages/Faqs/Faqs"));
const Website = lazy(() => import("@pages/Website/website"));

// ─── Settings ─────────────────────────────────────────────────────────────────
const PaymentMainSettings = lazy(() => import("@pages/Settings/paymentMethodLevel/payment_main_settings"));
const UsersMainSettings = lazy(() => import("@pages/Settings/usersLevel/User_main_settings"));
const InventoryMainSettings = lazy(() => import("@pages/Settings/invetoryLevel/Inventory_main_settings"));
const SupplierMainSettings = lazy(() => import("@pages/Settings/supplierLevel/supplier_main_settings"));
const TableMainSettings = lazy(() => import("@pages/Settings/TableLevel/Table_main_settings"));
const SystemSetup = lazy(() => import("@pages/Settings/systemSetup/SystemSetup"));
const CategoryMainSettings = lazy(() => import("@pages/Settings/categoryLevel/Category_main_settings"));
const Profile = lazy(() => import("@pages/Profile/Profile"));
const AdminProfile = lazy(() => import("src/AdminDashboard/Profile/AdminProfile"));
const EmployeeShift = lazy(() => import("@pages/EmployeeShift/Employee"));
const Notification = lazy(() => import("@pages/Notification/NotificationPage"));

// ─── Document Center ──────────────────────────────────────────────────────────
const DocumentCenter = lazy(() => import("@pages/Documents/DocumentCenter"));

// ─── Omnichannel Inbox ────────────────────────────────────────────────────────
const OmnichannelInboxPage = lazy(() => import("src/pages/OmniChannel/OmnichannelInboxPage"));
const OAuthCallbackPage = lazy(() => import("src/pages/OmniChannel/OAuthCallbackPage"));

// ─── Mteja Dashboard ──────────────────────────────────────────────────────────
const MtejaDashboard = lazy(() => import("src/pages/Dashboard/MtejaDashboard"));

// ─── Accounting Module ────────────────────────────────────────────────────────
const AccountingDashboardPage = lazy(() => import("src/pages/AccountingDashboard/AccountingDashboardPage"));
const ChartOfAccountsPage = lazy(() => import("src/pages/ChartOfAccounts/ChartOfAccountsPage"));
const JournalEntriesPage = lazy(() => import("src/pages/JournalEntry/JournalEntriesPage"));
const SalesReceiptsPage = lazy(() => import("src/pages/SalesReceipts/SalesReceiptsPage"));
const NotesPage = lazy(() => import("src/pages/Notes/NotesPage"));
const BankStatementPage = lazy(() => import("src/pages/Banking/BankStatementPage"));
const BankReconciliationPage = lazy(() => import("src/pages/Reconciliation/BankReconciliationPage"));
const UnifiedReportsPage = lazy(() => import("src/pages/Report/UnifiedReportsPage"));

// Petty Cash & Refunds (Duka Only)
const PettyCashListPage = lazy(() => import("src/pages/PettyCash/PettyCashListPage"));
const RefundsListPage = lazy(() => import("src/pages/Refunds/RefundsListPage"));

// ─── Expenses / Bills / Income ────────────────────────────────────────────────
const ExpensesPage = lazy(() => import("@pages/OrderManagement/ExpensesPage"));
const BillsPage = lazy(() => import("@pages/OrderManagement/BillsPage"));
const IncomePage = lazy(() => import("@pages/OrderManagement/IncomePage"));

// ─── Currency ─────────────────────────────────────────────────────────────────
const CurrencyPage = lazy(() => import("src/pages/Currency/CurrencyPage"));

// ─── CRM / Mteja Module ───────────────────────────────────────────────────────
// All CRM pages are lazy-loaded and only reachable when hasMteja === true.
// The MtejaRoute guard below enforces this at runtime.
const LeadsPage = lazy(() => import("src/pages/Lead/Leads"));
const CampaignsPage = lazy(() => import("src/pages/Campaign/Campaigns"));
const SalesTargetsPage = lazy(() => import("src/pages/SalesTargets/SalesTargets"));
const SalesBudgetsPage = lazy(() => import("src/pages/Salesbudgets/Salesbudgets"));

// ─── Dala Real Estate Module ───────────────────────────────────────────────────
// All Dala pages are lazy-loaded and only reachable when hasDala === true.
const PropertiesList = lazy(() => import("src/pages/dala/properties/PropertiesList"));
const PropertyDetail = lazy(() => import("src/pages/dala/properties/PropertyDetail"));
const PropertyTypesList = lazy(() => import("src/pages/dala/property-types/PropertyTypesList"));
const UnitsList = lazy(() => import("src/pages/dala/units/UnitsList"));
const UnitDetail = lazy(() => import("src/pages/dala/units/UnitDetail"));
const SalesManagement = lazy(() => import("src/pages/dala/sales/SalesManagement"));
const SaleDetail = lazy(() => import("src/pages/dala/sales/SaleDetail"));
const CommissionManagement = lazy(() => import("src/pages/dala/commissions/CommissionManagement"));
const LeaseManagement = lazy(() => import("src/pages/dala/leases/LeaseManagement"));
const LeaseDetail = lazy(() => import("src/pages/dala/leases/LeaseDetail"));
const RentCollection = lazy(() => import("src/pages/dala/rent/RentCollection"));
const MaintenanceManagement = lazy(() => import("src/pages/dala/maintenance/MaintenanceManagement"));

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
  if (hasMteja && !hasPOS && !hasAccounting) return <Navigate to="/mteja" replace />;
  if (hasAccounting && !hasPOS) return <Navigate to="/accounting" replace />;
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

  if (hasMteja && !hasPOS && !hasAccounting && !hasDala) return <Navigate to="/admin/mteja" replace />;
  if (hasAccounting && !hasPOS) return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/admin/dashboard" replace />;
};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────────────────────
const routes = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Public — OAuth popup */}
      <Route
        path="/omnichannel/oauth/callback"
        errorElement={<NotFound />}
        element={<Suspense fallback={fullscreenSpin}><OAuthCallbackPage /></Suspense>}
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
          element={<Navigate to="/home-dashboard" replace />} />

        <Route path="cart/cart/:cartId" errorElement={<NotFound />}
          element={guardedPage(RestaurantPage, "ORDERS_VIEW_DASHBOARD")} />

        <Route path="home-dashboard" errorElement={<NotFound />}
          element={guardedPage(UnifiedShopDashboardPage, "ORDERS_VIEW_DASHBOARD")} />

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
          element={guardedPage(UnifiedReportsPage, "REPORTS_ITEM_SALES")} />

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
            element={<Navigate to="/home-dashboard" replace />} />
          <Route path="dashboard" errorElement={<NotFound />}
            element={<Navigate to="/home-dashboard" replace />} />
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
          
          </Route>

        {/* ── CRM / Mteja — shop level (/crm/...) ───────────────────────────
            ALL routes here require hasMteja === true (MtejaRoute guard).
            Permission: CUSTOMERS_VIEW gates all CRM pages for now —
            add dedicated CRM permissions when roles are extended.
        ─────────────────────────────────────────────────────────────────── */}
        <Route path="crm" element={<CrmLayout />}>
          <Route index errorElement={<NotFound />}
            element={mtejaPage(LeadsPage, "CUSTOMERS_VIEW")} />
          <Route path="leads" errorElement={<NotFound />}
            element={mtejaPage(LeadsPage, "CUSTOMERS_VIEW")} />
          <Route path="campaigns" errorElement={<NotFound />}
            element={mtejaPage(CampaignsPage, "CUSTOMERS_VIEW")} />
          <Route path="sales-targets" errorElement={<NotFound />}
            element={mtejaPage(SalesTargetsPage, "CUSTOMERS_VIEW")} />
          <Route path="sales-budgets" errorElement={<NotFound />}
            element={mtejaPage(SalesBudgetsPage, "CUSTOMERS_VIEW")} />
        </Route>

        {/* ── Dala Real Estate — shop level (/dala/...) ───────────────────────
            ALL routes here require hasDala === true (DalaRoute guard).
            Permission: DALA_PROPERTIES_VIEW gates all Dala pages for now —
            add dedicated Dala permissions when roles are extended.
        ─────────────────────────────────────────────────────────────────── */}
        <Route path="dala" element={<Outlet />}>
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
          element={guardedAdminPage(DashboardAdminPage, "ORDERS_VIEW_DASHBOARD")} />

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
            <PermissionRoute permission="REPORTS_ITEM_SALES">
              <Suspense fallback={fullscreenSpin}>
                <AdminRoute><UnifiedReportsPage /></AdminRoute>
              </Suspense>
            </PermissionRoute>
          }
        />

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

        <Route path="mteja" errorElement={<NotFound />}
          element={<Navigate to="/admin/dashboard" replace />} />

        {/* ── Accounting — admin level (/admin/accounting/...) ───────────── */}
        <Route path="accounting" element={<AccountingLayout />}>
          <Route index errorElement={<NotFound />}
            element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" errorElement={<NotFound />}
            element={<Navigate to="/admin/dashboard" replace />} />
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
            element={mtejaAdminPage(LeadsPage, "CUSTOMERS_VIEW")} />
          <Route path="leads" errorElement={<NotFound />}
            element={mtejaAdminPage(LeadsPage, "CUSTOMERS_VIEW")} />
          <Route path="campaigns" errorElement={<NotFound />}
            element={mtejaAdminPage(CampaignsPage, "CUSTOMERS_VIEW")} />
          <Route path="sales-targets" errorElement={<NotFound />}
            element={mtejaAdminPage(SalesTargetsPage, "CUSTOMERS_VIEW")} />
          <Route path="sales-budgets" errorElement={<NotFound />}
            element={mtejaAdminPage(SalesBudgetsPage, "CUSTOMERS_VIEW")} />
        </Route>

        {/* ── Dala Real Estate — admin level (/admin/dala/...) ───────────────
            Mirrors the shop-level Dala routes above.
            All gated behind AdminDalaRoute so non-Dala tenants can't access.
        ─────────────────────────────────────────────────────────────────── */}
        <Route path="dala" element={<Outlet />}>
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

        <Route path="*" element={<NotFound />} />
      </Route>
    </>
  )
);

function Routers() {
  return (
    <Suspense fallback={<Spin size="large" />}>
      <RouterProvider router={routes} />
    </Suspense>
  );
}

export default Routers;