import React from "react";
import { ProCard } from "@ant-design/pro-components";
import PaymentsMethodSettings from "./PaymentSettings";
import { Space, Typography } from "antd";
import { DollarCircleOutlined, CreditCardOutlined } from "@ant-design/icons";

const { Title } = Typography;

function PaymentMainSettings() {
  return (
    <ProCard
      bordered
      title={
        <Space>
          <DollarCircleOutlined
            style={{ fontSize: "18px", color: "#6c1c2c" }}
          />
          <Title level={4} style={{ margin: 0 }}>
            Payment Method Settings
          </Title>
        </Space>
      }
      tabs={{
        type: "card",
        defaultActiveKey: "paymentMethods",
        size: "large",
      }}
    >
      <ProCard.TabPane
        key="paymentMethods"
        tab={
          <Space>
            <CreditCardOutlined  style={{ color: "#1890ff" }} />
            <Typography.Text>Payment Methods</Typography.Text>
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
          <PaymentsMethodSettings />
        </div>
      </ProCard.TabPane>
    </ProCard>
  );
}

export default PaymentMainSettings;
