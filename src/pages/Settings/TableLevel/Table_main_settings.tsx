import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import TableLocationSettings from "./Table_Locations";
import {
  AppstoreOutlined,
  EnvironmentOutlined,
  TableOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Space, Typography } from "antd";
import TableSetting from "./Table_settings";
import { usePOSMode } from "@context/POSModeContext";

const { Text } = Typography;

const TableMainSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("locations");
  const { isHotelMode } = usePOSMode();

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  
  // Determine labels based on mode
  const tableName = isHotelMode 
    ? "Rooms" 
    : tenant?.business_type?.name === "Electronics" || tenant?.business_type?.name === "massage_parlour" 
      ? "Slots" 
      : "Tables";
  const locationName = isHotelMode 
    ? "Floors" 
    : tenant?.business_type?.name === "Electronics" || tenant?.business_type?.name === "massage_parlour" 
      ? "Staff" 
      : "Locations";
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
          {isHotelMode ? <HomeOutlined style={{ marginRight: 8 }} /> : <AppstoreOutlined style={{ marginRight: 8 }} />}
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
            {isHotelMode ? <HomeOutlined style={{ color: "#7c3aed" }} /> : <EnvironmentOutlined style={{ color: "#52c41a" }} />}
            <Text>{locationName} Settings</Text>
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
            {isHotelMode ? <HomeOutlined style={{ color: "#7c3aed" }} /> : <TableOutlined style={{ color: "#1890ff" }} />}
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
