import { Outlet, useNavigate } from "react-router-dom";
import ProNavbar from "@components/navbar/ProNavbar";
import { PageContainer } from "@ant-design/pro-components";
import { Breadcrumb, Modal } from "antd";
import {
  DashboardOutlined,
  FolderAddOutlined,
  HomeFilled,
  PaperClipOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "src/store";

function Layout() {
  const { user } = useAppSelector((state) => state.auth);

  const isLoginRoute = location.pathname === "/login"; // check if on login page

  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: "1920px" }}>
      {/* Render ProNavbar only if not on login page */}
      {!isLoginRoute && <ProNavbar />}

      <PageContainer
        header={{
          extra: !isLoginRoute && (
            <Breadcrumb key="1" style={{ cursor: "pointer" }}>
              <Breadcrumb.Item onClick={() => navigate("/tables")} key="2">
                <HomeFilled /> <span>Home</span>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <DashboardOutlined /> <span>Home</span>
              </Breadcrumb.Item>
              {user?.role === "admin" && (
                <>
                  <Breadcrumb.Item
                    onClick={() => {
                      user?.role === "admin"
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
                      user?.role === "admin"
                        ? navigate("/reports")
                        : Modal.warning({
                          title: "Oops!",
                          content:
                            "You don't have permission to see this page.",
                          centered: true,
                        });
                    }}
                  >
                    <PaperClipOutlined /> <span>Reports</span>
                  </Breadcrumb.Item>
                  <Breadcrumb.Item
                    onClick={() => {
                      user?.role === "admin"
                        ? navigate("/home-dashboard")
                        : Modal.warning({
                          title: "Oops!",
                          content:
                            "You don't have permission to see this page.",
                          centered: true,
                        });
                    }}
                  >
                    <PaperClipOutlined /> <span>Dashboard</span>
                  </Breadcrumb.Item>
                </>
              )}
            </Breadcrumb>
          ),
        }}
        ghost={true}
      >
        <Outlet />
      </PageContainer>
    </div>
  );
}

export default Layout;
