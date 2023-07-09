import { Routes, Route } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Staff from "../pages/staff/Staff";
import Table from "../pages/Tables/Table";
import RestaurantPage from "../pages/Restaurant/Restuarant";

function Routers() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Staff />}/>
          <Route path="/staff" element={<Staff />}/>
          <Route path="/tables" element={<Table />}/>
          <Route path="/restaurant" element={<RestaurantPage />}/>
        </Route>
      </Routes>
    </>
  );
}

export default Routers;
