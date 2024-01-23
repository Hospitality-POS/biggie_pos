import { Outlet } from "react-router-dom";
import ProNavbar from "@components/navbar/ProNavbar";
import Navbar from "@components/navbar/Navbar";
import { PageContainer } from "@ant-design/pro-components";
import { Button } from "antd/lib";

function Layout() {
  return (
    <div>
      {/* <Navbar /> */}
      <ProNavbar />
      <PageContainer ghost={true} >
        <Outlet />
      </PageContainer>
    </div>
  );
}

export default Layout;
