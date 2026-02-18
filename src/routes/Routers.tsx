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

// Accounting Module Imports
const AccountingDashboard = lazy(() => import("src/AdminDashboard/Accounting/Dashboard/AccountingDashboard"));
const ChartOfAccounts = lazy(() => import("src/AdminDashboard/Accounting/Accounts/ChartOfAccounts"));
const AccountingInvoices = lazy(() => import("src/AdminDashboard/Accounting/Invoices/InvoicesList"));
const AccountingBills = lazy(() => import("src/AdminDashboard/Accounting/Bills/BillsList"));
const Expenses = lazy(() => import("src/AdminDashboard/Accounting/Expenses/ExpensesList"));
const Payments = lazy(() => import("src/AdminDashboard/Accounting/Payments/PaymentsList"));
const Receipts = lazy(() => import("src/AdminDashboard/Accounting/Receipts/ReceiptsList"));
const AccountingCustomers = lazy(() => import("src/AdminDashboard/Accounting/Customers/CustomersList"));
const Vendors = lazy(() => import("src/AdminDashboard/Accounting/Vendors/VendorsList"));
const JournalEntries = lazy(() => import("src/AdminDashboard/Accounting/Journals/JournalsList"));
const BankReconciliation = lazy(() => import("src/AdminDashboard/Accounting/Reconciliation/Reconciliation"));
const ReconciliationDetailView = lazy(() => import("src/AdminDashboard/Accounting/Reconciliation/ReconciliationDetailView"));
const ProfitLoss = lazy(() => import("src/AdminDashboard/Accounting/Reports/ProfitLoss"));
const BalanceSheet = lazy(() => import("src/AdminDashboard/Accounting/Reports/BalanceSheet"));
const CashFlow = lazy(() => import("src/AdminDashboard/Accounting/Reports/CashFlow"));
const TrialBalance = lazy(() => import("src/AdminDashboard/Accounting/Reports/TrialBalance"));
const ARAgingReport = lazy(() => import("src/AdminDashboard/Accounting/Reports/ARAgingReport"));
const APAgingReport = lazy(() => import("src/AdminDashboard/Accounting/Reports/APAgingReport"));
const TaxSummary = lazy(() => import("src/AdminDashboard/Accounting/Reports/TaxSummary"));

// Wages Module Import
const WagesList = lazy(() => import("src/AdminDashboard/Accounting/Wages/WageList"));

const Layout = lazy(() => import("@components/layout/Layout"));
const RestaurantPage = lazy(() => import("@pages/Restaurant/Restuarant"));
const MainStore = lazy(() => import("@pages/store/MainStore"));
const Table = lazy(() => import("@pages/Tables/TablePro"));
const Faqs = lazy(() => import("@pages/Faqs/Faqs"));
const Website = lazy(() => import("@pages/Website/website"));

// App list - settings
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

// ============================================================================
// SMART DASHBOARD ROUTER - Automatically selects correct dashboard
// ============================================================================
const SmartDashboardRouter = () => {
  const storedUser = localStorage.getItem('user');
  const storedTenant = localStorage.getItem('tenant');

  const user = storedUser ? JSON.parse(storedUser) : null;
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const userRole = user?.role?.toLowerCase();

  const hasAccountingModule =
    tenant?.modules?.accounting === true &&
    tenant?.accounting_database?.enabled === true;

  const hasPosModule = tenant?.pos_integration?.enabled === true;

  // If no user, redirect to login
  if (!user || !userRole) {
    return <Navigate to="/login" replace />;
  }

  // ACCOUNTING ROLE - Always shows AccountingDashboard
  if (userRole === 'accounting') {
    return (
      <Suspense fallback={<NubaLoader />}>
        <AdminRoute>
          <AccountingDashboard />
        </AdminRoute>
      </Suspense>
    );
  }

  // ADMIN ROLE
  if (userRole === 'admin') {
    // If only accounting module is enabled
    if (hasAccountingModule && !hasPosModule) {
      return (
        <Suspense fallback={<NubaLoader />}>
          <AdminRoute>
            <AccountingDashboard />
          </AdminRoute>
        </Suspense>
      );
    }

    // If only POS module is enabled
    if (hasPosModule && !hasAccountingModule) {
      return (
        <Suspense fallback={<NubaLoader />}>
          <AdminRoute>
            <DashboardAdminPage />
          </AdminRoute>
        </Suspense>
      );
    }

    // If both modules are enabled - Show POS Dashboard (can be changed)
    if (hasAccountingModule && hasPosModule) {
      return (
        <Suspense fallback={<NubaLoader />}>
          <AdminRoute>
            <DashboardAdminPage />
          </AdminRoute>
        </Suspense>
      );
    }

    // Default: Show admin dashboard
    return (
      <Suspense fallback={<NubaLoader />}>
        <AdminRoute>
          <DashboardAdminPage />
        </AdminRoute>
      </Suspense>
    );
  }

  // OTHER ROLES - Default to admin dashboard
  return (
    <Suspense fallback={<NubaLoader />}>
      <AdminRoute>
        <DashboardAdminPage />
      </AdminRoute>
    </Suspense>
  );
};

const routes = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<Layout />}>
        <Route
          index
          errorElement={<NotFound />}
          element={
            <Suspense fallback={<Spin size="large" fullscreen tip="Getting you tables please wait..." style={{ color: `${getPrimaryColor()}` }} />}>
              <Private><Table /></Private>
            </Suspense>
          }
        />
        <Route
          path="/tables"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin
                  size="large"
                  fullscreen
                  tip="Getting you tables please wait..."
                  style={{ color: `${getPrimaryColor()}` }}
                />
              }
            >
              <Private>
                <Table />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/login"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <StaffLoginPage />
            </Suspense>
          }
        />
        <Route
          path="/notifications"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Notification />
            </Suspense>
          }
        />
        <Route
          path="/main-category"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <MainCategory />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/dashboard/:id"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <RestaurantPage />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/store"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <MainStore />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/store/:id"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <MainStore />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/payment/callback"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <PaymentCallback />
            </Suspense>
          }
        />
        <Route
          path="/payment-settings"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <PaymentMainSettings />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/payment-methods"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <PaymentMainSettings />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/system-setup"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <SystemSetup />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/users-settings"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <UsersMainSettings />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/supplier-settings"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <SupplierMainSettings />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/suppliers"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <SupplierMainSettings />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/table-settings"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <TableMainSettings />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/category-settings"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <CategoryMainSettings />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/reports"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <Reports />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/inventory-settings"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <InventoryMainSettings />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/inventory"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <InventoryMainSettings />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/profile/:id"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <Profile />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/orders"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <MainOrders />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/customers"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <Customer />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/fss-faqs"
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <Faqs />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/website-builder"
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />
              }
            >
              <Private>
                <Website />
              </Private>
            </Suspense>
          }
        />

        <Route
          path="/employee-shift"
          errorElement={<NotFound />}
          element={
            <Suspense fallback={<NubaLoader />}>
              <Private>
                <EmployeeShift />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/home-dashboard"
          errorElement={<NotFound />}
          element={
            <Suspense fallback={<NubaLoader />}>
              <Private>
                <Dashboard />
              </Private>
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* ============================================================================ */}
      {/* ADMIN ROUTES - Role-Based Dashboard Selection */}
      {/* ============================================================================ */}
      <Route path="/admin" element={<Layout />}>
        {/* Main Dashboard - Uses SmartDashboardRouter to show correct dashboard */}
        <Route
          index
          element={<SmartDashboardRouter />}
        />
        <Route
          path="dashboard"
          errorElement={<NotFound />}
          element={<SmartDashboardRouter />}
        />

        {/* Notifications */}
        <Route
          path="notifications"
          errorElement={<NotFound />}
          element={
            <Suspense fallback={<Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />}>
              <Notification />
            </Suspense>
          }
        />

        {/* ============================================================================ */}
        {/* ACCOUNTING MODULE ROUTES */}
        {/* ============================================================================ */}

        {/* Accounting Dashboard - Separate route for direct access */}
        <Route
          path="accounting/dashboard"
          errorElement={<NotFound />}
          element={
            <Suspense fallback={<NubaLoader />}>
              <AdminRoute>
                <AccountingDashboard />
              </AdminRoute>
            </Suspense>
          }
        />

        {/* Core Accounting Features */}
        <Route path="accounting/accounts" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><ChartOfAccounts /></AdminRoute></Suspense>} />
        <Route path="accounting/invoices" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><AccountingInvoices /></AdminRoute></Suspense>} />
        <Route path="accounting/bills" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><AccountingBills /></AdminRoute></Suspense>} />
        <Route path="accounting/expenses" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><Expenses /></AdminRoute></Suspense>} />
        <Route path="accounting/payments" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><Payments /></AdminRoute></Suspense>} />
        <Route path="accounting/receipts" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><Receipts /></AdminRoute></Suspense>} />
        <Route path="accounting/customers" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><AccountingCustomers /></AdminRoute></Suspense>} />
        <Route path="accounting/vendors" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><Vendors /></AdminRoute></Suspense>} />
        <Route path="accounting/journals" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><JournalEntries /></AdminRoute></Suspense>} />
        <Route path="accounting/reconciliation" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><BankReconciliation /></AdminRoute></Suspense>} />
        <Route path="accounting/reconciliation/:id" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><ReconciliationDetailView /></AdminRoute></Suspense>} />

        {/* Accounting Reports */}
        <Route path="accounting/reports/profit-loss" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><ProfitLoss /></AdminRoute></Suspense>} />
        <Route path="accounting/reports/balance-sheet" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><BalanceSheet /></AdminRoute></Suspense>} />
        <Route path="accounting/reports/cash-flow" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><CashFlow /></AdminRoute></Suspense>} />
        <Route path="accounting/reports/trial-balance" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><TrialBalance /></AdminRoute></Suspense>} />
        <Route path="accounting/reports/ar-aging" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><ARAgingReport /></AdminRoute></Suspense>} />
        <Route path="accounting/reports/ap-aging" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><APAgingReport /></AdminRoute></Suspense>} />
        <Route path="accounting/reports/tax-summary" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><TaxSummary /></AdminRoute></Suspense>} />

        {/* ============================================================================ */}
        {/* POS/OPERATIONS ROUTES */}
        {/* ============================================================================ */}

        {/* Wages Module */}
        <Route path="wages" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><WagesList /></AdminRoute></Suspense>} />

        {/* Shop & Staff Management */}
        <Route path="shop-management" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><ShopManagement /></AdminRoute></Suspense>} />
        <Route path="staff-management" errorElement={<NotFound />} element={<Suspense fallback={<Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />}><AdminRoute><UsersMainSettings /></AdminRoute></Suspense>} />

        {/* Customer Management */}
        <Route path="customer-list" errorElement={<NotFound />} element={<Suspense fallback={<Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />}><AdminRoute><AdminCustomersList /></AdminRoute></Suspense>} />
        <Route path="customers" element={<Suspense fallback={<Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />}><CustomerRegistration /></Suspense>} />

        {/* Reports */}
        <Route path="reports" element={<Suspense fallback={<Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />}><AdminRoute><AdminReports /></AdminRoute></Suspense>} />

        {/* ============================================================================ */}
        {/* SYSTEM & SETTINGS ROUTES */}
        {/* ============================================================================ */}

        <Route path="billing" errorElement={<NotFound />} element={<Suspense fallback={<NubaLoader />}><AdminRoute><PaymentSubscriptionPage /></AdminRoute></Suspense>} />
        <Route path="profile/:id" errorElement={<NotFound />} element={<Suspense fallback={<Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />}><AdminRoute><AdminProfile /></AdminRoute></Suspense>} />
        <Route path="staff-clock-in" element={<Suspense fallback={<Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />}><StaffClockTracker /></Suspense>} />
        <Route path="help-center" element={<Suspense fallback={<Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />}><AdminRoute><HelpCenter /></AdminRoute></Suspense>} />
        <Route path="discover" element={<Suspense fallback={<Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />}><AdminRoute><DiscoverPage /></AdminRoute></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<Spin size="large" fullscreen style={{ color: `${getPrimaryColor()}` }} />}><AdminRoute><TenantSettings /></AdminRoute></Suspense>} />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </>
  )
);

function Routers() {
  return (
    <Suspense fallback={<Spin size="large" fullscreen tip={`welcome to ${COOP_NAME}`} style={{ color: `${getPrimaryColor()}` }} />}>
      {setTimeout(() => { return true; }, 5000) && <RouterProvider router={routes} />}
    </Suspense>
  );
}

export default Routers;