import React from "react";
import { ProCard } from "@ant-design/pro-components";
import { Space, Typography, Divider } from "antd";
import {
  CalendarOutlined,
  DatabaseOutlined,
  ShopOutlined,
  TruckOutlined,
} from "@ant-design/icons"; // Ensure you import the correct icons
import InventorySettings from "./InventorySettings";
import DeliverySettings from "./DeliverySettings";
import UomSettings from "./UomSettings";

const { Text } = Typography;

function InventoryMainSettings() {
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
          <CalendarOutlined style={{ marginRight: 8 }} />
          Inventory Main Settings
        </Typography.Title>
      }
      tabs={{
        type: "card",
        defaultActiveKey: "uom",
        size: "large",
      }}
    >
      <ProCard.TabPane
        key="uom"
        tab={
          <Space>
            <DatabaseOutlined />
            <Text>Unit of Measure</Text>
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
          <UomSettings />
        </div>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="inventory"
        tab={
          <Space>
            <ShopOutlined style={{ color: "#52c41a" }} />
            <Text>Inventory</Text>
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
          <InventorySettings />
        </div>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="delivery"
        tab={
          <Space>
            <TruckOutlined style={{ color: "#1890ff" }} />{" "}
            <Text>Deliveries</Text>
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
          <DeliverySettings />
        </div>
      </ProCard.TabPane>    
    </ProCard>
  );
}

export default InventoryMainSettings;
