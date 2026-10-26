import React from "react";
import { ProCard } from "@ant-design/pro-components";
import SupplierTable from "./Supplier";
import { useIsCompact } from "@hooks/useIsCompact";
import { ShopOutlined, AppstoreAddOutlined } from "@ant-design/icons";
import { Flex, Space, Typography } from "antd";

const { Title } = Typography;

function SupplierMainSettings() {
  const isCompact = useIsCompact();

  return (
    <ProCard
      bordered
      bodyStyle={isCompact ? { padding: 8 } : undefined}
      headStyle={isCompact ? { padding: "12px 12px 0" } : undefined}
      title={
        <Flex gap={4} align="center">
          <ShopOutlined style={{ color: "var(--primary-color)" }} />
          <Title level={isCompact ? 5 : 4} style={{ margin: 0 }}>
            Supplier Main Settings
          </Title>
        </Flex>
      }
      tabs={{
        type: "card",
        defaultActiveKey: "suppliers",
        size: isCompact ? "middle" : "large",
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
