// MainComponent.js
import { ProLayout } from "@ant-design/pro-components";
import React, { useState } from "react";
import defaultprops from "./defaultprops";
import { Button, ConfigProvider, Dropdown } from "antd/lib";
import { LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const ProNavbar = () => {
  const [pathname, setPathname] = useState("/table");
const navigation =useNavigate()
  return (
    <ProLayout
      logo="/android-chrome-512x512.png"
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
        size: "small",
        title: <div>Steve</div>,
        render: (_props, dom) => {
                return (
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'logout',
                          icon: <LogoutOutlined />,
                          label: 'Sign out',
                        },
                      ],
                    }}
                  >
                    {dom}
                  </Dropdown>
                );
              },
      }}
      {...defaultprops}
       location={{
              pathname,
            }}
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
              <div
                onClick={() => {
                  navigation(item.path || '/welcome');
                }}
              >
                {dom}
              </div>
            )}
           
          
    />
  );
};

export default ProNavbar;
