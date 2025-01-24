import React from "react";
import { Badge, Breadcrumb, Button, Dropdown, Image, Space, Typography } from "antd";
import { PageContainer, ProLayout } from "@ant-design/pro-components";
import {
  BellOutlined,
  DashboardOutlined,
  HomeFilled,
  PoweroffOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "src/store";
import useProLayoutNav from "./defaultprops";
import { getAdminDashboardAnalysis } from "@services/orders";
import { useQuery } from "@tanstack/react-query";

const AdminDashboard: React.FC = () => {
  const navRoutes = useProLayoutNav();
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = () => {
    navigate("/login");
  };

  const handleLogout = () => {
    navigate("/login");
  };


   const { data } = useQuery({
     queryKey: ["admindashBoardAlerts"],
     queryFn: getAdminDashboardAnalysis,
     networkMode: "always",
     refetchOnWindowFocus: false, 
     staleTime: 30000, 
     retry: 2, 
   });

  const breadcrumbItems = location.pathname
    .split("/")
    .filter((path) => path)
    .map((path, index, arr) => {
      const isLast = index === arr.length - 1;
      const url = `/${arr.slice(0, index + 1).join("/")}`;

      // Check if the path is a dynamic segment (e.g., an ID)
      const isDynamicSegment =
        /^[a-f0-9]{24}$/i.test(path) || /^[0-9]+$/.test(path); // Regex for MongoDB ObjectId or numeric IDs
      const label = isDynamicSegment
        ? "Details" // Generic label for dynamic segments
        :  path
          .replace(/-/g, " ") // Replace hyphens with spaces
          .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());  // Map or format unknown paths

      return {
        title: isLast ? (
          <span>{label}</span>
        ) : (
          <NavLink to={url}>{label}</NavLink>
        ),
      };
    });

  return (
    <ProLayout
      logo={
        <Image
          src="/relia.png"
          height={55}
          width={120}
          preview={true}
          alt="relia-logo"
          style={{ padding: 12 }}
        />
      }
      title=""
      contentWidth="Fluid"
      navTheme="light"
      layout="top"
      splitMenus={false}
      fixedHeader={true}
      {...navRoutes}
      avatarProps={{
        src: "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg",
        shape: "circle",
        alt: "image",
        size: "default",
        title: (
          <Typography.Text strong={true} style={{ color: "white" }} code={true}>
            {user && user.name}
          </Typography.Text>
        ),
        render: (_props, dom) => {
          return (
            <Space size="middle">
              <Badge
                count={
                  Array.isArray(data?.lowStockItems)
                    ? data.lowStockItems.length
                    : 0
                }
                offset={[-5, 5]}
              >
                <Button
                  icon={<BellOutlined />}
                  shape="circle"
                  onClick={() => navigate("/admin/dashboard")}
                />
              </Badge>
              {user ? (
                <>
                  <Dropdown
                    menu={{
                      disabled: user ? false : true,
                      items: [
                        {
                          key: "logout",
                          icon: <UserOutlined />,
                          label: "Profile",
                          onClick: () => navigate(`/admin/profile/${user?.id}`),
                        },
                        { type: "divider" },
                        {
                          key: "logout",
                          icon: <PoweroffOutlined />,
                          label: "Logout",
                          onClick: handleLogout,
                          danger: true,
                        },
                      ],
                    }}
                  >
                    {dom}
                  </Dropdown>
                </>
              ) : (
                <Button icon={<PoweroffOutlined />} onClick={handleLogin}>
                  Login
                </Button>
              )}
            </Space>
          );
        },
      }}
      token={{
        bgLayout: "#f6ffed",
        colorPrimary: "#6c1c2c",
        colorTextAppListIconHover: "black",
        colorTextAppListIcon: "white",
        colorBgAppListIconHover: "white",
        hashId: "fss001",
        header: {
          colorBgMenuItemSelected: "#f6ffed",
          colorBgHeader: "#6c1c2c",
          colorTextMenu: "#ffff",
          colorTextMenuSecondary: "#f6ffed",
          colorBgMenuItemHover: "#f6ffed",
        },
      }}
      menuItemRender={(item, dom) => (
        <NavLink to={item.path || "/admin"}>{dom}</NavLink>
      )}
    >
      <PageContainer
        breadcrumb={{
          items: [
            {
              title: (
                <NavLink to="/admin">
                  <HomeFilled /> Home
                </NavLink>
              ),
            },
            ...breadcrumbItems,
          ],
        }}
        header={{
          extra: [
            <Breadcrumb style={{ cursor: "pointer" }}>
              <Breadcrumb.Item onClick={() => navigate("/admin")}>
                <HomeFilled /> <span>Home</span>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <DashboardOutlined /> <span>Dashboard</span>
              </Breadcrumb.Item>
            </Breadcrumb>,
          ],
        }}
      >
        <Outlet />
      </PageContainer>
    </ProLayout>
  );
};

export default AdminDashboard;
