// SystemSetup.tsx (updated - removed print settings tab)
import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
  UserOutlined,
  DollarCircleOutlined,
  PrinterOutlined,
  LockOutlined,
  FontColorsOutlined,
  BankOutlined,
  BellOutlined,
  WhatsAppOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Space, Typography, Card } from "antd";
import { useQuery } from "@tanstack/react-query";
import Profile from "./Profile";
import PaymentDetailsSettings from "../paymentMethodLevel/PaymentDetailsSettings";
import PrinterSettings from "./PrinterSettings";
import PrivacySettings from "./PrivacySettings";
import ReceiptAppearanceSettings from "./ReceiptAppearanceSettings";
import BankDetailsSettings from "./BankDetailsSettings";
import NotificationSettings from "./NotificationSettings";
import WhatsAppSenderRegistration from "./WhatsAppSenderRegistration";
import HotelSettings from "./HotelSettings";
import { fetchShop } from "@services/shops";

const { Text } = Typography;

const SystemSetup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("payment-detail");

  const shopId = localStorage.getItem("shopId");

  const { data: shopData } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
  });

  const isHotelMode = shopData?.pos_mode === "hotel";

  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
  const hasAccounting = !!(
    tenant?.accounting_database?.enabled ||
    tenant?.modules?.accounting
  );

  return (
    <div style={{ padding: "24px", minHeight: "100vh" }}>
      <Card
        bordered={false}
        style={{
          borderRadius: "12px",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)",
        }}
      >
        <ProCard
          bordered={false}
          tabs={{
            type: "card",
            activeKey: activeTab,
            size: "large",
            onChange: setActiveTab,
            tabPosition: "left",
          }}
          style={{ backgroundColor: "transparent" }}
        >
          <ProCard.TabPane
            key="payment-detail"
            tab={
              <Space>
                <DollarCircleOutlined style={{ fontSize: 18 }} />
                <Text strong>Payment Methods</Text>
              </Space>
            }
          >
            <div style={{ padding: "16px", borderRadius: "8px" }}>
              <PaymentDetailsSettings />
            </div>
          </ProCard.TabPane>

          <ProCard.TabPane
            key="bank-details"
            tab={
              <Space>
                <BankOutlined style={{ fontSize: 18, color: "#1890ff" }} />
                <Text strong>Bank Details</Text>
              </Space>
            }
          >
            <div style={{ padding: "16px", borderRadius: "8px" }}>
              <BankDetailsSettings />
            </div>
          </ProCard.TabPane>

          <ProCard.TabPane
            key="printer-settings"
            tab={
              <Space>
                <PrinterOutlined style={{ fontSize: 18, color: "#722ed1" }} />
                <Text strong>Printer Settings</Text>
              </Space>
            }
          >
            <div style={{ padding: "16px", borderRadius: "8px" }}>
              <PrinterSettings />
            </div>
          </ProCard.TabPane>

          <ProCard.TabPane
            key="privacy"
            tab={
              <Space>
                <LockOutlined style={{ fontSize: 18, color: "#fa541c" }} />
                <Text strong>Privacy</Text>
              </Space>
            }
          >
            <div style={{ padding: "16px", borderRadius: "8px" }}>
              <PrivacySettings />
            </div>
          </ProCard.TabPane>

          <ProCard.TabPane
            key="receipt-appearance"
            tab={
              <Space>
                <FontColorsOutlined style={{ fontSize: 18, color: "#13c2c2" }} />
                <Text strong>Receipt Appearance</Text>
              </Space>
            }
          >
            <div style={{ padding: "16px", borderRadius: "8px" }}>
              <ReceiptAppearanceSettings />
            </div>
          </ProCard.TabPane>

          <ProCard.TabPane
            key="profile"
            tab={
              <Space>
                <UserOutlined style={{ fontSize: 18, color: "#52c41a" }} />
                <Text strong>System Profile</Text>
              </Space>
            }
          >
            <div style={{ padding: "16px", borderRadius: "8px" }}>
              <Profile />
            </div>
          </ProCard.TabPane>

          <ProCard.TabPane
            key="notification-settings"
            tab={
              <Space>
                <BellOutlined style={{ fontSize: 18, color: "#fa8c16" }} />
                <Text strong>Notification Settings</Text>
              </Space>
            }
          >
            <div style={{ padding: "16px", borderRadius: "8px" }}>
              <NotificationSettings />
            </div>
          </ProCard.TabPane>

          <ProCard.TabPane
            key="whatsapp-registration"
            tab={
              <Space>
                <WhatsAppOutlined style={{ fontSize: 18, color: "#25D366" }} />
                <Text strong>WhatsApp Registration</Text>
              </Space>
            }
          >
            <div style={{ padding: "16px", borderRadius: "8px" }}>
              <WhatsAppSenderRegistration />
            </div>
          </ProCard.TabPane>

          {isHotelMode && (
            <ProCard.TabPane
              key="hotel-settings"
              tab={
                <Space>
                  <HomeOutlined style={{ fontSize: 18, color: "#722ed1" }} />
                  <Text strong>Hotel Settings</Text>
                </Space>
              }
            >
              <div style={{ padding: "16px", borderRadius: "8px" }}>
                <HotelSettings />
              </div>
            </ProCard.TabPane>
          )}
        </ProCard>
      </Card>
    </div>
  );
};

export default SystemSetup;