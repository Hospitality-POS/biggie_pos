// SystemSetup.tsx (updated - removed print settings tab)
import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
  UserOutlined,
  SettingOutlined,
  DollarCircleOutlined,
  PrinterOutlined,
  LockOutlined,
  FontColorsOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { Space, Typography } from "antd";
import Profile from "./Profile";
import PaymentDetailsSettings from "../paymentMethodLevel/PaymentDetailsSettings";
import PrinterSettings from "./PrinterSettings";
import PrivacySettings from "./PrivacySettings";
import ReceiptAppearanceSettings from "./ReceiptAppearanceSettings";
import BankDetailsSettings from "./BankDetailsSettings";

const SystemSetup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("payment-detail");

  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
  const hasAccounting = !!(
    tenant?.accounting_database?.enabled ||
    tenant?.modules?.accounting
  );

  return (
    <ProCard
      bordered
      title={
        <Typography.Title
          level={4}
          style={{ display: "flex", alignItems: "center", margin: 0 }}
        >
          <SettingOutlined style={{ marginRight: 8 }} />
          System Setup
        </Typography.Title>
      }
      tabs={{
        type: "card",
        activeKey: activeTab,
        size: "large",
        onChange: setActiveTab,
      }}
    >
      <ProCard.TabPane
        key="payment-detail"
        tab={
          <Space>
            <DollarCircleOutlined />
            <Typography.Text>Payment Methods</Typography.Text>
          </Space>
        }
      >
        <div style={{ padding: "0", backgroundColor: "#fafafa", borderRadius: "8px" }}>
          <PaymentDetailsSettings />
        </div>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="bank-details"
        tab={
          <Space>
            <BankOutlined style={{ color: "#1890ff" }} />
            <Typography.Text>Bank Details</Typography.Text>
          </Space>
        }
      >
        <div style={{ padding: "0", backgroundColor: "#fafafa", borderRadius: "8px" }}>
          <BankDetailsSettings />
        </div>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="printer-settings"
        tab={
          <Space>
            <PrinterOutlined style={{ color: "#6c1c2c" }} />
            <Typography.Text>Printer Settings</Typography.Text>
          </Space>
        }
      >
        <div style={{ padding: "0", backgroundColor: "#fafafa", borderRadius: "8px" }}>
          <PrinterSettings />
        </div>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="privacy"
        tab={
          <Space>
            <LockOutlined style={{ color: "#6c1c2c" }} />
            <Typography.Text>Privacy</Typography.Text>
          </Space>
        }
      >
        <div style={{ padding: "0", backgroundColor: "#fafafa", borderRadius: "8px" }}>
          <PrivacySettings />
        </div>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="receipt-appearance"
        tab={
          <Space>
            <FontColorsOutlined style={{ color: "#1677ff" }} />
            <Typography.Text>Receipt Appearance</Typography.Text>
          </Space>
        }
      >
        <div style={{ padding: "0", backgroundColor: "#fafafa", borderRadius: "8px" }}>
          <ReceiptAppearanceSettings />
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
        <div style={{ padding: "0", backgroundColor: "#fafafa", borderRadius: "8px" }}>
          <Profile />
        </div>
      </ProCard.TabPane>
    </ProCard>
  );
};

export default SystemSetup;