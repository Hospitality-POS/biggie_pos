import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Navigate,
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
import Dashboard from "@pages/Dashboard/Dashboard";
import CustomerRegistration from "@pages/Customer/Customer";
import StaffClockTracker from "@pages/staff/ClockInTracker";
import HelpCenter from "src/AdminDashboard/HelpCenter/HelpCenterPage";
import DashboardAdminPage from "src/AdminDashboard/DashboardPage/DashboardPage";
import ShopManagement from "src/AdminDashboard/Shops/MainShopPage";
import AdminReports from "src/AdminDashboard/ReportsPage/Reports";
import Customer from "src/pages/Customer/CustomerList";
import PaymentSubscriptionPage from "src/components/billing/Billing";
import AdminCustomersList from "src/AdminDashboard/Customers/CustomerList";
import TenantSettings from "src/AdminDashboard/Settings/TenantSettings";
import DiscoverPage from "src/AdminDashboard/DiscoverPage";
import PaymentCallback from "@components/payment/PaymentCallback";
import { getPrimaryColor } from "@utils/getPrimaryColor";

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
const Reports = lazy(() => import("@pages/Settings/reportsLevel/Reports"));
const Profile = lazy(() => import("@pages/Profile/Profile"));
const AdminProfile = lazy(() => import("src/AdminDashboard/Profile/AdminProfile"));
const EmployeeShift = lazy(() => import("@pages/EmployeeShift/Employee"));
const Notification = lazy(() => import("@pages/Notification/NotificationPage"));

// ─── Accounting Module ────────────────────────────────────────────────────────
const AccountingDashboardPage = lazy(() => import("src/pages/AccountingDashboard/AccountingDashboardPage"));
const ChartOfAccountsPage = lazy(() => import("src/pages/ChartOfAccounts/ChartOfAccountsPage"));
const JournalEntriesPage = lazy(() => import("src/pages/JournalEntry/JournalEntriesPage"));
const NotesPage = lazy(() => import("src/pages/Notes/NotesPage"));
const BankReconciliationPage = lazy(() => import("src/pages/Reconciliation/BankReconciliationPage"));
const AccountingReportsPage = lazy(() => import("src/pages/Report/AccountingReportsPage"));

// ─── Fallback spinners ────────────────────────────────────────────────────────
const fullscreenSpin = (
  <Spin size="large" fullscreen style={{ color: getPrimaryColor() }} />
);

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

// ─── Smart Shop Router (for "/" path) ────────────────────────────────────────
const SmartShopRouter = () => {
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  // Check which modules are enabled
  const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
  const hasAccounting = !!(
    tenant?.accounting_database?.enabled ||
    tenant?.modules?.accounting
  );

  console.log('[SmartShopRouter] Module check:', { hasPOS, hasAccounting });

  // Redirect based on enabled modules
  if (hasAccounting && !hasPOS) {
    // Accounting ONLY → go to Accounting Dashboard
    console.log('[SmartShopRouter] Redirecting to /accounting (Accounting only)');
    return <Navigate to="/accounting" replace />;
  }

  // POS enabled or both enabled → go to Tables (POS default)
  console.log('[SmartShopRouter] Showing Tables (POS enabled)');
  return privatePage(Table);
};

// ─── Smart Dashboard Router (for "/admin" path) ──────────────────────────────
const SmartDashboardRouter = () => {
  const storedUser = localStorage.getItem("user");
  const storedTenant = localStorage.getItem("tenant");

  const user = storedUser ? JSON.parse(storedUser) : null;
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  // Check if user is logged in
  if (!user?.role) {
    return <Navigate to="/login" replace />;
  }

  // Check which modules are enabled
  const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
  const hasAccounting = !!(
    tenant?.accounting_database?.enabled ||
    tenant?.modules?.accounting
  );

  console.log('[SmartDashboardRouter] Module check:', { hasPOS, hasAccounting });

  // Redirect based on enabled modules
  if (hasAccounting && !hasPOS) {
    // Accounting ONLY → go to Accounting Dashboard
    console.log('[SmartDashboardRouter] Redirecting to /admin/accounting (Accounting only)');
    return <Navigate to="/admin/accounting" replace />;
  }

  if (hasPOS && !hasAccounting) {
    // POS ONLY → go to POS Dashboard
    console.log('[SmartDashboardRouter] Showing POS Dashboard (POS only)');
    return adminPage(DashboardAdminPage);
  }

  // Both enabled → go to POS Dashboard (default)
  console.log('[SmartDashboardRouter] Showing POS Dashboard (Both enabled)');
  return adminPage(DashboardAdminPage);
};

// ─── Router ───────────────────────────────────────────────────────────────────
const routes = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* ── Shop / POS routes (path="/") ──────────────────────────────────── */}
      <Route path="/" element={<Layout />}>
        <Route index errorElement={<NotFound />}
          element={<SmartShopRouter />} />

        <Route path="tables" errorElement={<NotFound />}
          element={privatePage(Table)} />

        <Route path="login" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><StaffLoginPage /></Suspense>} />

        <Route path="notifications" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><Notification /></Suspense>} />

        <Route path="main-category" errorElement={<NotFound />}
          element={privatePage(MainCategory)} />

        <Route path="dashboard/:id" errorElement={<NotFound />}
          element={privatePage(RestaurantPage)} />

        <Route path="store" errorElement={<NotFound />}
          element={privatePage(MainStore)} />

        <Route path="store/:id" errorElement={<NotFound />}
          element={privatePage(MainStore)} />

        <Route path="payment/callback" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><PaymentCallback /></Suspense>} />

        <Route path="payment-settings" errorElement={<NotFound />}
          element={privatePage(PaymentMainSettings)} />

        <Route path="payment-methods" errorElement={<NotFound />}
          element={privatePage(PaymentMainSettings)} />

        <Route path="system-setup" errorElement={<NotFound />}
          element={privatePage(SystemSetup)} />

        <Route path="users-settings" errorElement={<NotFound />}
          element={privatePage(UsersMainSettings)} />

        <Route path="supplier-settings" errorElement={<NotFound />}
          element={privatePage(SupplierMainSettings)} />

        <Route path="suppliers" errorElement={<NotFound />}
          element={privatePage(SupplierMainSettings)} />

        <Route path="table-settings" errorElement={<NotFound />}
          element={privatePage(TableMainSettings)} />

        <Route path="category-settings" errorElement={<NotFound />}
          element={privatePage(CategoryMainSettings)} />

        <Route path="reports" errorElement={<NotFound />}
          element={privatePage(Reports)} />

        <Route path="inventory-settings" errorElement={<NotFound />}
          element={privatePage(InventoryMainSettings)} />

        <Route path="inventory" errorElement={<NotFound />}
          element={privatePage(InventoryMainSettings)} />

        <Route path="profile/:id" errorElement={<NotFound />}
          element={privatePage(Profile)} />

        <Route path="orders" errorElement={<NotFound />}
          element={privatePage(MainOrders)} />

        <Route path="customers" errorElement={<NotFound />}
          element={privatePage(Customer)} />

        <Route path="fss-faqs"
          element={privatePage(Faqs)} />

        <Route path="website-builder"
          element={privatePage(Website)} />

        <Route path="employee-shift" errorElement={<NotFound />}
          element={<Suspense fallback={<NubaLoader />}><Private><EmployeeShift /></Private></Suspense>} />

        <Route path="home-dashboard" errorElement={<NotFound />}
          element={<Suspense fallback={<NubaLoader />}><Private><Dashboard /></Private></Suspense>} />

        {/* ── Accounting routes — shop level (/accounting/...) ────────────── */}
        <Route path="accounting" errorElement={<NotFound />}
          element={privatePage(AccountingDashboardPage)} />

        <Route path="accounting/journals" errorElement={<NotFound />}
          element={privatePage(JournalEntriesPage)} />

        <Route path="accounting/notes" errorElement={<NotFound />}
          element={privatePage(NotesPage)} />

        <Route path="accounting/reconciliation" errorElement={<NotFound />}
          element={privatePage(BankReconciliationPage)} />

        <Route path="accounting/reports" errorElement={<NotFound />}
          element={privatePage(AccountingReportsPage)} />

        <Route path="*" element={<NotFound />} />
      </Route>

      {/* ── Admin routes (path="/admin") ───────────────────────────────────── */}
      <Route path="/admin" element={<Layout />}>
        <Route index element={<SmartDashboardRouter />} />
        <Route path="dashboard" errorElement={<NotFound />}
          element={<SmartDashboardRouter />} />

        <Route path="notifications" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><Notification /></Suspense>} />

        {/* ── POS / Operations ────────────────────────────────────────────── */}
        <Route path="wages" errorElement={<NotFound />}
          element={adminPage(WagesList)} />

        <Route path="shop-management" errorElement={<NotFound />}
          element={adminPage(ShopManagement)} />

        <Route path="staff-management" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><AdminRoute><UsersMainSettings /></AdminRoute></Suspense>} />

        <Route path="customer-list" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><AdminRoute><AdminCustomersList /></AdminRoute></Suspense>} />

        <Route path="customers"
          element={<Suspense fallback={fullscreenSpin}><CustomerRegistration /></Suspense>} />

        <Route path="reports"
          element={<Suspense fallback={fullscreenSpin}><AdminRoute><AdminReports /></AdminRoute></Suspense>} />

        {/* ── System & Settings ───────────────────────────────────────────── */}
        <Route path="billing" errorElement={<NotFound />}
          element={adminPage(PaymentSubscriptionPage)} />

        <Route path="profile/:id" errorElement={<NotFound />}
          element={<Suspense fallback={fullscreenSpin}><AdminRoute><AdminProfile /></AdminRoute></Suspense>} />

        <Route path="staff-clock-in"
          element={<Suspense fallback={fullscreenSpin}><StaffClockTracker /></Suspense>} />

        <Route path="help-center"
          element={<Suspense fallback={fullscreenSpin}><AdminRoute><HelpCenter /></AdminRoute></Suspense>} />

        <Route path="discover"
          element={<Suspense fallback={fullscreenSpin}><AdminRoute><DiscoverPage /></AdminRoute></Suspense>} />

        <Route path="settings"
          element={<Suspense fallback={fullscreenSpin}><AdminRoute><TenantSettings /></AdminRoute></Suspense>} />

        {/* ── Accounting — admin level (/admin/accounting/...) ────────────── */}
        {/* Dashboard + COA + Reports live here (tenant-wide, admin access)   */}
        <Route path="accounting" errorElement={<NotFound />}
          element={adminPage(AccountingDashboardPage)} />

        <Route path="accounting/dashboard" errorElement={<NotFound />}
          element={adminPage(AccountingDashboardPage)} />

        <Route path="accounting/accounts" errorElement={<NotFound />}
          element={adminPage(ChartOfAccountsPage)} />

        <Route path="accounting/reports" errorElement={<NotFound />}
          element={adminPage(AccountingReportsPage)} />

        {/* ── Accounting — operational (also accessible from admin layout) ── */}
        <Route path="accounting/journals" errorElement={<NotFound />}
          element={adminPage(JournalEntriesPage)} />

        <Route path="accounting/notes" errorElement={<NotFound />}
          element={adminPage(NotesPage)} />

        <Route path="accounting/reconciliation" errorElement={<NotFound />}
          element={adminPage(BankReconciliationPage)} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </>
  )
);

function Routers() {
  return (
    <Suspense
      fallback={
        <Spin
          size="large"
          fullscreen
          tip={`Welcome to ${COOP_NAME}`}
          style={{ color: getPrimaryColor() }}
        />
      }
    >
      <RouterProvider router={routes} />
    </Suspense>
  );
}

export default Routers;