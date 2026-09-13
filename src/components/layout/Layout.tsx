import { Outlet, useLocation } from "react-router-dom";
import ProNavbar from "@components/navbar/ProNavbar";
import { PageContainer } from "@ant-design/pro-components";
import { App } from "antd";
import { useAppSelector } from "src/store";
import AdminDashboard from "src/AdminDashboard/AdminDashboardLayout";
import SubscriptionGuard from "./SubscriptionGuard";

function Layout() {
  const { user } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const isLoginRoute = location.pathname === "/login";
  const isCustomersRoute = location.pathname === "/admin/customers";
  const isClockInRoute = location.pathname === "/admin/staff-clock-in";
  const isAdminRoute =
    location.pathname === "/admin" || location.pathname.startsWith("/admin");

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
                pageHeaderRender={false}
                breadcrumbRender={false}
                title={false}
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

  return (
    <SubscriptionGuard>
      {renderLayoutForRole(user?.role || "guest")}
    </SubscriptionGuard>
  );
}

export default Layout;