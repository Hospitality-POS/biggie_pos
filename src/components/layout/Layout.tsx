import { Outlet, useNavigate } from "react-router-dom";
import ProNavbar from "@components/navbar/ProNavbar";
import { PageContainer } from "@ant-design/pro-components";
import { Breadcrumb, App, Typography, Space } from "antd";
import {
  DashboardOutlined,
  FolderAddOutlined,
  HomeFilled,
  PaperClipOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "src/store";
import AdminDashboard from "src/AdminDashboard/AdminDashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { fetchShop } from "@services/shops";

const { Text } = Typography;

function Layout() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const isLoginRoute = location.pathname === "/login";

  const isCustomersRoute = location.pathname === "/admin/customers";

  const isClockInRoute = location.pathname === "/admin/staff-clock-in";

  const isAdminRoute =
    location.pathname === "/admin" || location.pathname.startsWith("/admin");

  const shopId = localStorage.getItem("shopId") || undefined;
  console.log("shopId", shopId);
  const { data: currentShop } = useQuery(
    ["currentShop", shopId],
    () => {
      if (!shopId || shopId === 'undefined') return Promise.reject("No shopId");
      return fetchShop(shopId);
    },
    {
      enabled: !!shopId,
      networkMode: "always",
      cacheTime: 0,
      staleTime: 0,
    }
  );

  const renderBreadcrumbs = (role: string) => {
    return (
      <div className="flex items-center justify-between w-full">
        <Breadcrumb style={{ cursor: "pointer" }}>
          <Breadcrumb.Item onClick={() => navigate("/tables")} key="home">
            <HomeFilled /> <span>Home</span>
          </Breadcrumb.Item>
          {currentShop && (
            <Breadcrumb.Item key="shop">
              <ShopOutlined /> <Text strong>{currentShop?.name}</Text>
            </Breadcrumb.Item>
          )}
          <Breadcrumb.Item key="dashboard">
            <DashboardOutlined /> <span>Dashboard</span>
          </Breadcrumb.Item>
          {(role === "admin" || role === "cashier") && (
            <>
              <Breadcrumb.Item onClick={() => navigate("/store")} key="store">
                <FolderAddOutlined /> <span>Store</span>
              </Breadcrumb.Item>
              <Breadcrumb.Item onClick={() => navigate("/reports")} key="reports">
                <PaperClipOutlined /> <span>Reports</span>
              </Breadcrumb.Item>
            </>
          )}
        </Breadcrumb>
      </div>
    );
  };

  if (isLoginRoute || isCustomersRoute || isClockInRoute) {
    return (
      <div style={{ maxWidth: "1920px" }}>
        <App>
          <Outlet />
        </App>
      </div>
    );
  }

  const renderLayoutForRole = (role: string) => {
    if (role === "admin" && isAdminRoute) {
      return (
        <div style={{ maxWidth: "1920px" }}>
          <App>
            <AdminDashboard />
          </App>
        </div>
      );
    } else {
      return (
        <div style={{ maxWidth: "1920px" }}>
          <App>
            <ProNavbar>
              <PageContainer
                header={{
                  extra: [renderBreadcrumbs(role)],
                  title: currentShop?.name && (
                    <Space>
                      <ShopOutlined />
                      <Text strong>{currentShop?.name}</Text>
                    </Space>
                  ),
                }}
                ghost
              >
                <Outlet />
              </PageContainer>
            </ProNavbar>
          </App>
        </div>
      );
    }
  };

  return renderLayoutForRole(user?.role || "guest");
}

export default Layout;
