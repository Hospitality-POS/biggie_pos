import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
  UserOutlined,
  PrinterOutlined,
  SettingOutlined,
  CrownOutlined,
  UnlockOutlined

} from "@ant-design/icons"; // Selected icons to ensure consistency in theme
import { ConfigProvider, Space, Typography, Divider } from "antd";
import Profile from "./Profile";
import PrinterConfig from "./PrinterConfig";
import ComingSoon from "@components/coming-soon/ComingSoon";

const SystemSetup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("profile");

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  return (
    // <ConfigProvider
    //   theme={{
    //     components: {
    //       Tabs: {
    //         itemColor: "#fff",
    //         itemActiveColor: "#000",
    //         itemHoverColor: "#aa846f",
    //         itemSelectedColor: "#000",
    //         cardBg: "#6c1c2c",
    //       },
    //     },
    //   }}
    // >
    <ProCard
      bordered
      title={
        <Typography.Title
          level={4}
          style={{
            display: "flex",
            alignItems: "center",
            margin: 0,
          }}
        >
          <SettingOutlined style={{ marginRight: 8 }} />
          System Setup
        </Typography.Title>
      }
      tabs={{
        type: "card",
        activeKey: activeTab,
        size: "large",
        onChange: handleTabChange,
      }}
    >
      <ProCard.TabPane
        key="profile"
        tab={
          <Space>
            <UserOutlined style={{ color: "#52c41a" }} />{" "}
            {/* Green color for profile */}
            <Typography.Text>System Profile</Typography.Text>
          </Space>
        }
      >
        <div
          style={{
            padding: "0",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
          }}
        >
          <Profile />
        </div>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="printer"
        tab={
          <Space>
            <PrinterOutlined style={{ color: "#1890ff" }} />{" "}
            {/* Blue color for printer config */}
            <Typography.Text>Printer Config</Typography.Text>
          </Space>
        }
      >
        <div
          style={{
            padding: "0",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
          }}
        >
          <PrinterConfig />
        </div>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="billing"
        tab={
          <Space>
            <CrownOutlined style={{ color: "#faad14" }} />
            {/* Yellow color for billing */}
            <Typography.Text>Billing</Typography.Text>
          </Space>
        }
      >
        <div
          style={{
            padding: "0",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
          }}
        >
          <ComingSoon />
        </div>
      </ProCard.TabPane>


      <ProCard.TabPane
        key="offers"
        tab={
          <Space>
            <UnlockOutlined style={{ color: "#2E9AFE" }} />
            {/* Yellow color for billing */}
            <Typography.Text>Offers</Typography.Text>
          </Space>
        }
      >
        <div
          style={{
            padding: "0",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
          }}
        >
          <ComingSoon />
        </div>
      </ProCard.TabPane>

      <Divider style={{ margin: 0 }} />
    </ProCard>
    // </ConfigProvider>
  );
};

export default SystemSetup;
