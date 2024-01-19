import {
  Routes,
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from "react-router-dom";
import { Suspense, lazy } from "react";
import Spinner from "@components/spinner/Spinner";
import Private from "@components/layout/private/Private";
import Table from "@pages/Tables/Table";
import Inventory from "@pages/Settings/invetoryLevel/Inventory";
import Reports from "@pages/Settings/reportsLevel/Reports";
import MainCategory from "@pages/main_category/Main_category";
import CategoryMainSettings from "@pages/Settings/categoryLevel/Category_main_settings";
import TableMainSettings from "@pages/Settings/TableLevel/Table_main_settings";
import SupplierMainSettings from "@pages/Settings/supplierLevel/supplier_main_settings";
import PaymentMainSettings from "@pages/Settings/paymentMethodLevel/payment_main_settings";
import UsersMainSettings from "@pages/Settings/usersLevel/User_main_settings";
import NotFound from "@routes/NotFound";
import InventoryMainSettings from "@pages/Settings/invetoryLevel/Inventory_main_settings";
// import Store from "@pages/store/Store";
// import Orders from "@pages/Orders/Orders";
// import RestaurantPage from "@pages/Restaurant/Restuarant";

const Layout = lazy(() => import("@components/layout/Layout"));
const RestaurantPage = lazy(() => import("@pages/Restaurant/Restuarant"));
const Store = lazy(() => import("@pages/store/Store"));
const Orders = lazy(() => import("@pages/Orders/Orders"));

const routes = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route index element={<Table />} />
      <Route path="/tables" element={<Table />} />
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
        path="/supplier"
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
        path="/payment-settings"
        element={
          <Suspense fallback={<Spinner />}>
            <Private>
              <PaymentMainSettings />
            </Private>
          </Suspense>
        }
      />
      <Route
        path="/Inventory"
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
    <Suspense fallback={<Spinner />}>
      <RouterProvider router={routes} />
    </Suspense>
  );
}

export default Routers;
