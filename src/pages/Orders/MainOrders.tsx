import React from "react";
import { ProCard } from "@ant-design/pro-components";
import { OrderedListOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { Space, Typography } from "antd";
import OrdersTable from "./OrdersTable";

const { Title } = Typography;

function MainOrders() {
  return (
    <ProCard
      bordered
      title={
        <Space>
          <OrderedListOutlined style={{ fontSize: "18px", color: "#6c1c2c" }} />
          <Title level={4} style={{ margin: 0 }}>
            List of All Orders
          </Title>
        </Space>
      }
      tabs={{
        type: "card",
        defaultActiveKey: "orders",
        size: "large",
      }}
    >
      <ProCard.TabPane
        key="orders"
        tab={
          <Space>
            <ShoppingCartOutlined
              style={{ color: "#1890ff", fontSize: "18px" }}
            />
            <Typography.Text>Orders</Typography.Text>
          </Space>
        }
      >
        <OrdersTable />
      </ProCard.TabPane>
    </ProCard>
  );
}

export default MainOrders;
