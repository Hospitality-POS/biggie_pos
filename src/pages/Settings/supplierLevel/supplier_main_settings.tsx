import React from "react";
import { ProCard } from "@ant-design/pro-components";
import SupplierTable from "./Supplier";
import { ShopOutlined, AppstoreAddOutlined } from "@ant-design/icons";
import { Flex, Space, Typography } from "antd";

const { Title } = Typography;

function SupplierMainSettings() {
  return (
    <ProCard
      bordered
      title={
        <Flex gap={4}>
          <ShopOutlined style={{ color: "#6c1c2c" }} />
          <Title level={4} style={{ margin: 0 }}>
            Supplier Main Settings
          </Title>
        </Flex>
      }
      tabs={{
        type: "card",
        defaultActiveKey: "suppliers",
        size: "large",
        items: [
          {
            key: "suppliers",
            label: (
              <Space>
                <AppstoreAddOutlined style={{ color: "#52c41a" }} />
                <Typography.Text>Suppliers</Typography.Text>
              </Space>
            ),
            children: (
              <div
                style={{
                  padding: "0",
                  backgroundColor: "#fafafa",
                  borderRadius: "8px",
                }}
              >
                <SupplierTable />
              </div>
            ),
          },
        ],
      }}
    />
  );
}

export default SupplierMainSettings;