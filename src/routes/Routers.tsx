import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Spinner from "../components/spinner/Spinner";
import Private from "../components/layout/private/Private";
import UsersList from "../pages/Settings/UsersList";
import Staff from "../pages/staff/Staff";
import Table from "../pages/Tables/Table";
import Inventory from "../pages/Settings/Inventory";
import Reports from "../pages/Settings/Reports";
import SupplierTable from "../pages/Settings/supplierLevel/Supplier";
import MainCategory from "../pages/main_category/Main_category";
import TableSettings from "../pages/Settings/TableLevel/TableSettings";
import CategorySettings from "../pages/Settings/categoryLevel/CategorySettings";
import PaymentSettings from "../pages/Settings/paymentMethodLevel/PaymentSettings";
import CategoryMainSettings from "../pages/Settings/categoryLevel/Category_main_settings";
import EmptyPage from "./EmptyPage";
import TableMainSettings from "../pages/Settings/TableLevel/Table_main_settings";
import SupplierMainSettings from "../pages/Settings/supplierLevel/supplier_main_settings";


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
          <Route index element={<Table />} />
          <Route path="/tables" element={<Table />} />
          <Route path="/main-category" element={<Private><MainCategory /></Private>} />
          <Route path="/dashboard/:id" element={<Private><RestaurantPage /></Private>} />
          <Route path="/store" element={<Private><Store/></Private>} />
          <Route path="/users" element={<Private><UsersList /></Private>} />
          <Route path="/reports" element={<Private><Reports /></Private>} />
          <Route path="/supplier" element={<Private><SupplierMainSettings /></Private>} />
          <Route path="/table-settings" element={<Private><TableMainSettings /></Private>} />
          <Route path="/category-settings" element={<Private><CategoryMainSettings /></Private>} />
          <Route path="/payment-settings" element={<Private><PaymentSettings /></Private>} />
          <Route path="/Inventory" element={<Private><Inventory /></Private>} />
          <Route path="/Orders" element={<Private><Orders /></Private>} />
          <Route path="*" element={<EmptyPage/>} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default Routers;
