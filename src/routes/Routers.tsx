import { Routes, Route } from "react-router-dom";
import Layout from "../components/layout/Layout";
// import Staff from "../pages/staff/Staff";
import Table from "../pages/Tables/Table";
import RestaurantPage from "../pages/Restaurant/Restuarant";
import { Suspense, lazy } from "react";
import Spinner from "../components/spinner/Spinner";

const Staff = lazy(()=>import("../pages/staff/Staff"));

function Routers() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Staff />}/>
          <Route path="/staff" element={<Staff />}/>
          <Route path="/tables" element={<Table />}/>
          <Route path="/restaurant" element={<RestaurantPage />}/>
          <Route path="/bar" element={""}  />
          <Route path="/kitchen" element={""} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default Routers;
