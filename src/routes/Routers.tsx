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
import MainOrders from "@pages/Orders/MainOrders";
import NubaLoader from "@components/spinner/NubaLoader";
import StaffLoginPage from "@pages/Login/login";
import Dashboard from "@pages/Dashboard/Dashboard";
import CustomerRegistration from "@pages/Customer/Customer";
import StaffClockTracker from "@pages/staff/ClockInTracker";
import HelpCenter from "src/AdminDashboard/HelpCenter/HelpCenterPage";
import DashboardAdminPage from "src/AdminDashboard/DashboardPage/DashboardPage";
import ShopManagement from "src/AdminDashboard/Shops/MainShopPage";
import Invoices from "@pages/Invoices/Invoices";
import AdminReports from "src/AdminDashboard/ReportsPage/Reports";
import Customer from "src/pages/Customer/CustomerList";

const Layout = lazy(() => import("@components/layout/Layout"));

const RestaurantPage = lazy(() => import("@pages/Restaurant/Restuarant"));
const MainStore = lazy(() => import("@pages/store/MainStore"));
const Table = lazy(() => import("@pages/Tables/TablePro"));
const Faqs = lazy(() => import("@pages/Faqs/Faqs"));

// App list - settings
const PaymentMainSettings = lazy(
  () => import("@pages/Settings/paymentMethodLevel/payment_main_settings")
);
const UsersMainSettings = lazy(
  () => import("@pages/Settings/usersLevel/User_main_settings")
);
const InventoryMainSettings = lazy(
  () => import("@pages/Settings/invetoryLevel/Inventory_main_settings")
);
const SupplierMainSettings = lazy(
  () => import("@pages/Settings/supplierLevel/supplier_main_settings")
);
const TableMainSettings = lazy(
  () => import("@pages/Settings/TableLevel/Table_main_settings")
);
const SystemSetup = lazy(
  () => import("@pages/Settings/systemSetup/SystemSetup")
);
const CategoryMainSettings = lazy(
  () => import("@pages/Settings/categoryLevel/Category_main_settings")
);
const Reports = lazy(() => import("@pages/Settings/reportsLevel/Reports"));

const Profile = lazy(() => import("@pages/Profile/Profile"));
const AdminProfile = lazy(() => import("src/AdminDashboard/Profile/AdminProfile"));
const EmployeeShift = lazy(() => import("@pages/EmployeeShift/Employee"));
// const ShopManagement = lazy(() => import("src/AdminDashboard/Shops/MainShopPage"));

// const Invoices = lazy(() => import("@pages/Invoices/Invoices"));

const routes = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<Layout />}>
        <Route
          index
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin
                  size="large"
                  fullscreen
                  tip="Getting you tables please wait..."
                  indicator={<NubaLoader />}
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
          path="/tables"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin
                  size="large"
                  fullscreen
                  tip="Getting you tables please wait..."
                  indicator={<NubaLoader />}
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
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >
              <StaffLoginPage />
            </Suspense>
          }
        />
        <Route
          path="/main-category"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
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
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >
              <Private>
                <RestaurantPage />
              </Private>
            </Suspense>
          }
        />
        <Route
          path="/invoices"
          errorElement={<NotFound />}
          element={
            <Suspense fallback={<NubaLoader />}>
              <Private>
                <Invoices />
              </Private>
            </Suspense>
          }
        // errorElement={<NotFound/>}
        />
        <Route
          path="/customers"
          errorElement={<NotFound />}
          element={
            <Suspense fallback={<NubaLoader />}>
              <Private>
                <Customer />
              </Private>
            </Suspense>
          }
        // errorElement={<NotFound/>}
        />
        <Route
          path="/store"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >
              <Private>
                <MainStore />
              </Private>
            </Suspense>
          }
        />
        {/* <Route
          path="/users"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >
              <Private>
                <UsersMainSettings />
              </Private>
            </Suspense>
          }
        /> */}
        <Route
          path="/reports"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >
              <Private>
                <Reports />
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
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
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
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
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
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >
              <Private>
                <CategoryMainSettings />
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
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
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
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >
              <Private>
                <SystemSetup />
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
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
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
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
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
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >
              <Private>
                <MainOrders />
              </Private>
            </Suspense>
          }
        // errorElement={<NotFound/>}
        />
        <Route
          path="/fss-faqs"
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >
              <Private>
                <Faqs />
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
      <Route path="/admin" element={<Layout />}>
        <Route
          index
          path="/admin/dashboard"
          errorElement={<NotFound />}
          element={
            <Suspense fallback={<NubaLoader />}>
              <AdminRoute>
                <DashboardAdminPage />
              </AdminRoute>
            </Suspense>
          }
        />
        <Route
          path="shop-management"
          errorElement={<NotFound />}
          element={
            <Suspense fallback={<NubaLoader />}>
              <AdminRoute>
                <ShopManagement />
              </AdminRoute>
            </Suspense>
          }
        />
        <Route
          path="profile/:id"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >
              <AdminRoute>
                <AdminProfile />
              </AdminRoute>
            </Suspense>
          }
        />
        <Route
          path="staff-management"
          errorElement={<NotFound />}
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >
              <AdminRoute>
                <UsersMainSettings />
              </AdminRoute>
            </Suspense>
          }
        />
        <Route
          path="reports"
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >
              <AdminRoute>
                <AdminReports />
              </AdminRoute>
            </Suspense>
          }
        />
        <Route
          path="customers"
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >

              <CustomerRegistration />

            </Suspense>
          }
        />
        <Route
          path="staff-clock-in"
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >

              <StaffClockTracker />

            </Suspense>
          }
        />
        <Route
          path="help-center"
          element={
            <Suspense
              fallback={
                <Spin size="large" fullscreen indicator={<NubaLoader />} />
              }
            >
              <AdminRoute>
                <HelpCenter />
              </AdminRoute>
            </Suspense>
          }
        />
        {/* add redirection for all /admin */}
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
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
          tip={`welcome to ${COOP_NAME}`}
          indicator={<NubaLoader />}
        />
      }
    >
      {setTimeout(() => {
        return true;
      }, 5000) && <RouterProvider router={routes} />}
    </Suspense>
  );
}

export default Routers;
