import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from "react-router-dom";
import { Suspense, lazy } from "react";
import Spinner from "@components/spinner/Spinner";
import Private from "@components/layout/private/Private";
// import Reports from "@pages/Settings/reportsLevel/Reports";
import MainCategory from "@pages/main_category/Main_category";

import NotFound from "@routes/NotFound";

import { Spin } from "antd/lib";

const Layout = lazy(() => import("@components/layout/Layout"));

const RestaurantPage = lazy(() => import("@pages/Restaurant/Restuarant"));
const Store = lazy(() => import("@pages/store/Store"));
const Orders = lazy(() => import("@pages/Orders/Orders"));
const Table = lazy(() => import("@pages/Tables/TablePro"));

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
const CategoryMainSettings = lazy(
  () => import("@pages/Settings/categoryLevel/Category_main_settings")
);
const Reports = lazy(() => import("@pages/Settings/reportsLevel/Reports"));

const routes = createBrowserRouter(
  createRoutesFromElements(
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
              />
            }
          >
            <Table />
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
              />
            }
          >
            <Table />
          </Suspense>
        }
      />
      <Route
        path="/main-category"
        element={
          <Suspense fallback={<Spinner />}>
            <Private>
              <MainCategory />
            </Private>
          </Suspense>
        }
      />
      <Route
        path="/dashboard/:id"
        element={
          <Suspense fallback={<Spinner />}>
            <Private>
              <RestaurantPage />
            </Private>
          </Suspense>
        }
      />
      <Route
        path="/store"
        element={
          <Suspense fallback={<Spinner />}>
            <Private>
              <Store />
            </Private>
          </Suspense>
        }
      />
      <Route
        path="/users"
        element={
          <Suspense fallback={<Spinner />}>
            <Private>
              <UsersMainSettings />
            </Private>
          </Suspense>
        }
      />
      <Route
        path="/reports"
        element={
          <Suspense fallback={<Spinner />}>
            <Private>
              <Reports />
            </Private>
          </Suspense>
        }
      />
      <Route
        path="/suppliers"
        element={
          <Suspense fallback={<Spinner />}>
            <Private>
              <SupplierMainSettings />
            </Private>
          </Suspense>
        }
      />
      <Route
        path="/table-settings"
        element={
          <Suspense fallback={<Spinner />}>
            <Private>
              <TableMainSettings />
            </Private>
          </Suspense>
        }
      />
      <Route
        path="/category-settings"
        element={
          <Suspense fallback={<Spinner />}>
            <Private>
              <CategoryMainSettings />
            </Private>
          </Suspense>
        }
      />
      <Route
        path="/payment-methods"
        element={
          <Suspense fallback={<Spinner />}>
            <Private>
              <PaymentMainSettings />
            </Private>
          </Suspense>
        }
      />
      <Route
        path="/inventory"
        element={
          <Suspense fallback={<Spinner />}>
            <Private>
              <InventoryMainSettings />
            </Private>
          </Suspense>
        }
      />
      <Route
        path="/orders"
        element={
          <Suspense fallback={<Spinner />}>
            <Private>
              <Orders />
            </Private>
          </Suspense>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Route>
  )
);

function Routers() {
  return (
    <Suspense
      fallback={<Spin size="large" fullscreen tip="welcome to FSS ltd." />}
    >
      <RouterProvider router={routes} />
    </Suspense>
  );
}

export default Routers;
