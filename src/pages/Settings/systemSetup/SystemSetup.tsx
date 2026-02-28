import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
  UserOutlined,
  SettingOutlined,
  DollarCircleOutlined
} from "@ant-design/icons";
import { Space, Typography } from "antd";
import Profile from "./Profile";
import PaymentDetailsSettings from "../paymentMethodLevel/PaymentDetailsSettings";

const SystemSetup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("profile");

  // Check which modules are enabled
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
  const hasAccounting = !!(
    tenant?.accounting_database?.enabled ||
    tenant?.modules?.accounting
  );

  // Accounting only = show only System Profile
  const showOnlyProfile = hasAccounting && !hasPOS;

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // If accounting only, show simple layout with only System Profile
  if (showOnlyProfile) {
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
            <SettingOutlined style={{ marginRight: 8 }} />
            System Setup
          </Typography.Title>
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
      </ProCard>
    );
  }

  // POS enabled - show all tabs
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
        key="payment-detail"
        tab={
          <Space>
            <DollarCircleOutlined />
            <Typography.Text>Payment Details</Typography.Text>
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
          <PaymentDetailsSettings />
        </div>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="profile"
        tab={
          <Space>
            <UserOutlined style={{ color: "#52c41a" }} />
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
    </ProCard>
  );
};

export default SystemSetup;