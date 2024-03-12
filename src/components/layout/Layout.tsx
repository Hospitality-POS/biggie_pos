import { Outlet } from "react-router-dom";
import ProNavbar from "@components/navbar/ProNavbar";
import { PageContainer } from "@ant-design/pro-components";

function Layout() {
  return (
    <div style={{maxWidth:"1920px"}}>
      {/* <Navbar /> */}
      <ProNavbar />
      <PageContainer ghost={true} >
        <Outlet />
      </PageContainer>
    </div>
  );
}

export default Layout;
