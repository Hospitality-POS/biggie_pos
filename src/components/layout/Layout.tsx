import { NavLink, Outlet, useNavigate } from "react-router-dom";
import ProNavbar from "@components/navbar/ProNavbar";
import { PageContainer } from "@ant-design/pro-components";
import { Breadcrumb, Modal, notification } from "antd";
import {
  DashboardOutlined,
  FolderAddFilled,
  FolderAddOutlined,
  HomeFilled,
  PaperClipOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "src/store";

function Layout() {
  const { user } = useAppSelector((state) => state.auth);

  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: "1920px" }}>
      {/* <Navbar /> */}
      <ProNavbar />
      <PageContainer
        header={{
          extra: [
            <Breadcrumb key="1" style={{ cursor: "pointer" }}>
              <Breadcrumb.Item onClick={() => navigate("/tables")} key="2">
                <HomeFilled /> <span>Home</span>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <DashboardOutlined /> <span>Dashboard</span>
              </Breadcrumb.Item>

              <Breadcrumb.Item
                onClick={() => {
                  user?.isAdmin
                    ? navigate("/store")
                    : Modal.warning({
                        title: "Oops!",
                        content: "You don't have permission to see this page.",
                        centered: true,
                      });
                }}
              >
                <FolderAddOutlined /> <span>Store</span>
              </Breadcrumb.Item>
              <Breadcrumb.Item
                onClick={() => {
                  user?.isAdmin
                    ? navigate("/reports")
                    : Modal.warning({
                        title: "Oops!",
                        content: "You don't have permission to see this page.",
                        centered: true,
                      });
                }}
              >
                <PaperClipOutlined /> <span>Reports</span>
              </Breadcrumb.Item>
            </Breadcrumb>,
          ],
        }}
        ghost={true}
      >
        <Outlet />
      </PageContainer>
    </div>
  );
}

export default Layout;
