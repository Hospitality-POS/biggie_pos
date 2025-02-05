// MainComponent.js
import { ProLayout } from "@ant-design/pro-components";
import { Button, Dropdown, Typography } from "antd/lib";
import {
  DashboardOutlined,
  PoweroffOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { NavLink, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "src/store";
import { logoutUser } from "@features/Auth/AuthActions";
import { reset } from "@features/Auth/AuthSlice";
import { Avatar, Image, Space, Tag } from "antd";
import useProLayoutNav from "./defaultprops";
import StaffModal from "@components/staffCard/LoginModal";
import { useState } from "react";

const ProNavbar = ({ children }) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigate();
  const navRoutes = useProLayoutNav();
  const { user } = useAppSelector((state) => state.auth);
  const handleLogout = () => {
    dispatch(logoutUser());
    dispatch(reset());
    navigation("/login");
  };

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => navigation(`/profile/${user?.id}`),
    },
    { type: "divider" },
    ...(user?.role === "admin"
      ? [
          {
            key: "dashboard",
            icon: <DashboardOutlined />,
            label: "Dashboard",
            onClick: () => {
              localStorage.removeItem("shopId"), navigation("/admin/dashboard");
            },
          },
        ]
      : []),
    {
      key: "faqs",
      icon: <QuestionCircleOutlined />,
      label: "FAQs",
      onClick: () => navigation("/fss-faqs"),
    },
    {
      key: "Settings",
      icon: <SettingOutlined />,
      label: "Settings",
      onClick: () => navigation("/system-setup"),
    },
    {
      key: "logout",
      icon: <PoweroffOutlined />,
      label: "Logout",
      onClick: handleLogout,
      danger: true,
    },
  ];

  const [open, setOpen] = useState(false);
  const tbl = "staff";

  return (
    <ProLayout
      style={{ maxWidth: "1920px" }}
      logo={
        <Image
          src="/relia.png"
          height={55}
          width={120}
          preview={true}
          alt="fss-logo"
          style={{ padding: 12 }}
        />
      }
      title=""
      menuHeaderRender={(logo, title) => (
        <div
          id="customize_menu_header"
          style={{
            height: "32px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {logo}
          {title}
        </div>
      )}
      colorPrimary="#6c1c2c"
      contentWidth="Fluid"
      navTheme="light"
      contentStyle={{ padding: 0, margin: "0 auto" }}
      layout="top"
      splitMenus={false}
      fixedHeader={true}
      avatarProps={{
        src: "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg",
        shape: "circle",
        alt: "image",
        size: "large",
        title: (
          <Typography.Text strong={true} style={{ color: "white" }} code={true}>
            {user && user.name}
          </Typography.Text>
        ),
        render: (_props, dom) => {
          return (
            <>
              {user ? (
                <>
                  <Dropdown
                    menu={{ items: userMenuItems }}
                    // placement="bottomRight"
                    // trigger={["click"]}
                    arrow
                  >
                    <Space style={{ cursor: "pointer" }}>
                      <Avatar
                        src={
                          user?.avatar ||
                          "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg"
                        }
                        alt={user.name}
                        size="default"
                      />
                      <Tag color="default">{user.name}</Tag>
                    </Space>
                  </Dropdown>
                  {/* <Button icon={<PoweroffOutlined />} onClick={handleLogout}>logout</Button> */}
                </>
              ) : (
                <StaffModal
                  setOpen={setOpen}
                  open={open}
                  tbl={tbl}
                  showButton
                />
              )}
            </>
          );
        },
      }}
      {...navRoutes}
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
        <NavLink to={item?.path || "/"}>{dom}</NavLink>
      )}
    >
      {children}
    </ProLayout>
  );
};

export default ProNavbar;
