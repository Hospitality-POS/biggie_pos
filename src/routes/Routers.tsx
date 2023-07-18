import { Routes, Route } from "react-router-dom";
// import Layout from "../components/layout/Layout";
import Staff from "../pages/staff/Staff";
import Table from "../pages/Tables/Table";
import RestaurantPage from "../pages/Restaurant/Restuarant";
import { Suspense, lazy } from "react";
import Spinner from "../components/spinner/Spinner";
import Private from "../components/layout/private/Private";
import Store from "../pages/store/Store";

const Layout = lazy(() => import("../components/layout/Layout"));
// const Staff = lazy(() => import("../pages/staff/Staff"));
// const RestaurantPage = lazy(() => import("../pages/Restaurant/Restuarant"));

function Routers() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Staff />} />
          <Route path="/staff" element={<Staff />} />
          <Route
            path="/tables"
            element={
              <Private>
                <Table />
              </Private>
            }
          />
          {/* <Route
            path="/restaurant"
            element={
              <Private>
                <RestaurantPage />
              </Private>
            }
          /> */}
          <Route
            path="/restaurant/:id"
            element={
              <Private>
                <RestaurantPage />
              </Private>
            }
          />
          <Route
            path="/store"
            element={
              <Private>
                <Store />
              </Private>
            }
          />
          <Route path="/bar" element={""} />
          <Route path="/kitchen" element={""} />
          <Route path="*" element={<Spinner />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default Routers;
