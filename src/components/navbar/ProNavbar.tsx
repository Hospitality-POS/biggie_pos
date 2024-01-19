// MainComponent.js
import { ProLayout } from "@ant-design/pro-components";
import React, { useState } from "react";
import { Avatar, Button, ConfigProvider, Dropdown } from "antd/lib";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { NavLink, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "src/store";
import { logoutUser } from "@features/Auth/AuthActions";
import { reset } from "@features/Auth/AuthSlice";
import { Image, Space } from "antd";
import useProLayoutNav from "./defaultprops";

const ProNavbar = () => {
  const dispatch = useAppDispatch()
  const navigation =useNavigate()
  const  navRoutes  = useProLayoutNav();
  const {user} = useAppSelector(state=>state.auth)
 const handleLogout = () => {
    dispatch(logoutUser());
    dispatch(reset());
    navigation("/tables");

  };
  return (
    <ProLayout
      logo={
        <Image
          src="/android-chrome-512x512.png"
          height={50}
          preview={true}
          alt="fss-logo"
        />
      }
      title=""
      colorPrimary="#6c1c2c"
      contentWidth="Fluid"
      navTheme="realDark"
      contentStyle={{ padding: 0, margin: 0 }}
      layout="top"
      splitMenus={false}
      fixedHeader={true}
      avatarProps={{
        src: "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg",
        shape: "circle",
        alt: "image",
        size: "large",
        title: <div>{user ? user.name : ""}</div>,
        render: (_props, dom) => {
          return (
            <Dropdown
              menu={{
                disabled: user ? false : true,
                items: [
                  {
                    key: "logout",
                    icon: <LogoutOutlined />,
                    label: "Sign out",
                    onClick: () => handleLogout(),
                  },
                ],
              }}
            >
              {dom}
            </Dropdown>
          );
        },
      }}
      {...navRoutes}
      token={{
        bgLayout: "#f6ffed",
        colorPrimary: "#6c1c2c",
        header: {
          colorBgMenuItemSelected: "#f6ffed",
          colorBgHeader: "#6c1c2c",
          colorTextMenu: "#fff",
          colorTextMenuSecondary: "#f6ffed",
        },
        pageContainer: {
          paddingInlinePageContainerContent: 0,
        },
      }}
      menuItemRender={(item, dom) => (
        <NavLink to={item?.path || "/"}>{dom}</NavLink>
      )}
    />
  );
};

export default ProNavbar;
