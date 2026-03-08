import React from "react";
import { Typography, Space } from "antd";
import { ShopOutlined } from "@ant-design/icons";
import ShopManagementTable from "./ShopManagementTable";

const { Title, Text } = Typography;

const ShopManagement: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Space align="center" size={10}>
          <div
            style={{
              background: "#fff7ed",
              borderRadius: 10,
              padding: "8px 10px",
              color: "#f97316",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            <ShopOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
              Branch Management
            </Title>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              Manage your shops, locations, and branch configurations
            </Text>
          </div>
        </Space>
      </div>

      <ShopManagementTable />
    </div>
  );
};

export default ShopManagement;