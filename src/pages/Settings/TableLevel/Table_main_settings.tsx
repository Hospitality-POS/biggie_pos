import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import TableLocationSettings from "./Table_Locations";
import {
  AppstoreOutlined,
  EnvironmentOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { Space, Typography, Divider } from "antd";
import TableSetting from "./Table_settings";

const { Text } = Typography;

const TableMainSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("locations");

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const tableName = tenant?.business_type?.name === "Electronics" ? "Slots" : "Tables";
  const staffName = tenant?.business_type?.name === "Electronics" ? "Staff" : "Locations";
  return (
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
          <AppstoreOutlined style={{ marginRight: 8 }} />
          {tableName} Main Settings
        </Typography.Title>
      }
      tabs={{
        type: "card",
        activeKey: activeTab,
        onChange: handleTabChange,
        size: "large",
      }}
    >
      <ProCard.TabPane
        key="locations"
        tab={
          <Space>
            <EnvironmentOutlined style={{ color: "#52c41a" }} />
            <Text>{staffName} Settings</Text>
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
          <TableLocationSettings />
        </div>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="tables"
        tab={
          <Space>
            <TableOutlined style={{ color: "#1890ff" }} />
            <Text>{tableName} Settings</Text>
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
          <TableSetting />
        </div>
      </ProCard.TabPane>

    </ProCard>
  );
};

export default TableMainSettings;
