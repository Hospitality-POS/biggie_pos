import { Routes, Route } from "react-router-dom";
import Layout from "../components/layout/Layout";

function Routers() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}></Route>
      </Routes>
    </>
  );
}

export default Routers;
