import { Outlet, useNavigate, useLocation } from "react-router-dom";
import ProNavbar from "@components/navbar/ProNavbar";
import { PageContainer } from "@ant-design/pro-components";
import { Breadcrumb, App, Typography, Space } from "antd";
import {
  HomeFilled,
  ShopOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "src/store";
import AdminDashboard from "src/AdminDashboard/AdminDashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { fetchShop } from "@services/shops";
import SubscriptionGuard from "./SubscriptionGuard";

const { Text } = Typography;

function Layout() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const isLoginRoute = location.pathname === "/login";
  const isCustomersRoute = location.pathname === "/admin/customers";
  const isClockInRoute = location.pathname === "/admin/staff-clock-in";
  const isAdminRoute =
    location.pathname === "/admin" || location.pathname.startsWith("/admin");

  const shopId = localStorage.getItem("shopId") || undefined;

  // ✅ Only fetch if we have both a valid shopId AND a logged-in user
  const isAuthenticated = !!user && !!localStorage.getItem("user");
  const hasValidShopId = !!shopId && shopId !== "undefined" && shopId !== "null";

  const { data: currentShop } = useQuery(
    ["currentShop", shopId],
    () => fetchShop(shopId!),
    {
      enabled: isAuthenticated && hasValidShopId, // ✅ both must be true
      retry: false,                               // ✅ no retries on failure
      networkMode: "always",
      cacheTime: 0,
      staleTime: 0,
    }
  );

  const renderBreadcrumbs = () => {
    // Generate dynamic breadcrumbs based on current route
    const pathSegments = location.pathname.split("/").filter((p) => p);
    
    const breadcrumbItems = [
      <Breadcrumb.Item onClick={() => navigate("/tables")} key="home">
        <HomeFilled /> <span>Home</span>
      </Breadcrumb.Item>,
    ];

    // Add shop name if available
    if (currentShop) {
      breadcrumbItems.push(
        <Breadcrumb.Item key="shop">
          <ShopOutlined /> <Text strong>{currentShop?.name}</Text>
        </Breadcrumb.Item>
      );
    }

    // Add dynamic path segments
    pathSegments.forEach((segment, index, arr) => {
      const isLast = index === arr.length - 1;
      const url = `/${arr.slice(0, index + 1).join("/")}`;
      const isDynamicSegment = /^[a-f0-9]{24}$/i.test(segment) || /^[0-9]+$/.test(segment);
      const label = isDynamicSegment
        ? "Details"
        : segment
            .replace(/-/g, " ")
            .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());

      if (isLast) {
        breadcrumbItems.push(
          <Breadcrumb.Item key={segment}>
            <span>{label}</span>
          </Breadcrumb.Item>
        );
      } else {
        breadcrumbItems.push(
          <Breadcrumb.Item onClick={() => navigate(url)} key={segment}>
            <span>{label}</span>
          </Breadcrumb.Item>
        );
      }
    });

    return (
      <div className="flex items-center justify-between w-full">
        <Breadcrumb style={{ cursor: "pointer" }}>
          {breadcrumbItems}
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
                  extra: [renderBreadcrumbs()],
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

  return (
    <SubscriptionGuard>
      {renderLayoutForRole(user?.role || "guest")}
    </SubscriptionGuard>
  );
}

export default Layout;