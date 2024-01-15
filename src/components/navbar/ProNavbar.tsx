// MainComponent.js
import { ProLayout } from "@ant-design/pro-components";
import React, { useState } from "react";
import defaultprops from "./defaultprops";
import { ConfigProvider } from "antd/lib";

const ProNavbar = () => {
  const [pathname, setPathname] = useState("/list/sub-page/sub-sub-page1");

  return (
    <ProLayout
      logo="/android-chrome-512x512.png"
      title=""
      colorPrimary="#6c1c2c"
      contentWidth="Fluid"
      navTheme="light"
      //   appListRender={}
      contentStyle={{ padding: 0, margin: 0 }}
      layout="top"
      splitMenus={false}
      fixedHeader={true}
      avatarProps={{
        src: "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg",
        size: "small",
        title: <div>Steve</div>,
      }}
      {...defaultprops}
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
    ></ProLayout>
  );
};

export default ProNavbar;
