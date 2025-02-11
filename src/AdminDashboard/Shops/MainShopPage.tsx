import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
  ShopOutlined,
  SettingOutlined,
  DollarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Space, Typography, Divider } from "antd";
import ShopManagementTable from "./ShopManagementTable";

const { Text } = Typography;

const ShopManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("general");

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  return (
    <ProCard
      bordered
      // title={
      //   <Typography.Title
      //     level={4}
      //     style={{
      //       display: "flex",
      //       alignItems: "center",
      //       margin: 0,
      //     }}
      //   >
      //     <ShopOutlined style={{ marginRight: 8 }} />
      //     Shop Management
      //   </Typography.Title>
      // }
      tabs={{
        type: "card",
        activeKey: activeTab,
        onChange: handleTabChange,
        size: "large",
      }}
    >
      <ProCard.TabPane
        key="general"
        tab={
          <Space>
            <SettingOutlined style={{ color: "#52c41a" }} />
            <Text>Shops Settings</Text>
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
          <ShopManagementTable />
        </div>
      </ProCard.TabPane>

      {/* <ProCard.TabPane
        key="financial"
        tab={
          <Space>
            <DollarOutlined style={{ color: "#1890ff" }} />
            <Text>Financial Settings</Text>
          </Space>
        }
      >
        <div
          style={{
            padding: "0",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
          }}
        > */}
          {/* <ShopFinancialSettings /> */}
        {/* </div>
      </ProCard.TabPane> */}

      {/* <ProCard.TabPane
        key="staff"
        tab={
          <Space>
            <TeamOutlined style={{ color: "#ff4d4f" }} />
            <Text>Staff Settings</Text>
          </Space>
        }
      >
        <div
          style={{
            padding: "0",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
          }}
        > */}
          {/* <ShopStaffSettings /> */}
        {/* </div>
      </ProCard.TabPane> */}
    </ProCard>
  );
};

export default ShopManagement;
