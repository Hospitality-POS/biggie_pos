import { Routes, Route } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Staff from "../pages/staff/Staff";

function Routers() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Staff />}/>
        </Route>
      </Routes>
    </>
  );
}

export default Routers;
