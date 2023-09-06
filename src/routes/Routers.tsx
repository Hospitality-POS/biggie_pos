import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Spinner from "../components/spinner/Spinner";
import Private from "../components/layout/private/Private";
import UsersList from "../pages/Settings/UsersList";
import Staff from "../pages/staff/Staff";
import Table from "../pages/Tables/Table";
import Inventory from "../pages/Settings/Inventory";
import Reports from "../pages/Settings/Reports";
import SupplierTable from "../pages/Settings/Supplier";

const Layout = lazy(() => import("../components/layout/Layout"));
// const Staff = lazy(() => import("../pages/staff/Staff"));
// const Table = lazy(() => import("../pages/Tables/Table"));
const RestaurantPage = lazy(() => import("../pages/Restaurant/Restuarant"));
const Store = lazy(() => import("../pages/store/Store"));
const Orders = lazy(() => import("../pages/Orders/Orders"));

function Routers() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Staff />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/tables" element={<Private><Table /></Private>} />
          <Route path="/restaurant/:id" element={<Private><RestaurantPage /></Private>} />
          <Route path="/store" element={<Private><Store /></Private>} />
          <Route path="/users" element={<Private><UsersList /></Private>} />
          <Route path="/reports" element={<Private><Reports /></Private>} />
          <Route path="/supplier" element={<Private><SupplierTable /></Private>} />
          <Route path="/Inventory" element={<Private><Inventory /></Private>} />
          <Route path="/Orders" element={<Private><Orders /></Private>} />
          <Route path="*" element={<Spinner />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default Routers;
