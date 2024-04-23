import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
  HolderOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { ConfigProvider, Typography } from "antd";
import Profile from "./Profile";

const MainCategory = () => <div>Main billing Content</div>;

const SystemSetup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("profile");

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const tabsItems = [
    {
      key: "profile",
      tab: "profile",
      label: (
        <>
          <HolderOutlined />
          Profile
        </>
      ),
      children: <Profile />,
    },
    {
      key: "billing",
      tab: "billing",
      label: (
        <>
          <HolderOutlined />
          Billing
        </>
      ),
      children: MainCategory(),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        components: {
          Tabs: {
            itemColor: "#fff",
            itemActiveColor: "#000",
            itemHoverColor: "#aa846f",
            itemSelectedColor: "#000",
            cardBg: "#6c1c2c",
          },
        },
      }}
    >
      <ProCard
        tabs={{
          type: "card",
          items: tabsItems,
          activeKey: activeTab,
          tabBarGutter: 5,
          onChange: handleTabChange,
          tabPosition: "left",
        }}
        title={
          <Typography.Title level={4}>
            <SettingOutlined /> System Setup
          </Typography.Title>
        }
        bordered
        boxShadow
      />
    </ConfigProvider>
  );
};

export default SystemSetup;
