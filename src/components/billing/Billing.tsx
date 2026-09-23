import React, { useState } from "react";
import {
  Typography,
  Space,
  Row,
  Col,
  Button,
  notification,
} from "antd";
import {
  CreditCardOutlined,
  BellOutlined,
  PayCircleOutlined,
  ShopOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  CheckOutlined,
} from "@ant-design/icons";

import { usePrimaryColor } from "@context/PrimaryColorContext";
import { THEME_C } from "@utils/getPrimaryColor";

const { Title, Text } = Typography;
const C = THEME_C;

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const BillingDashboard: React.FC = () => {
  const primaryColor = usePrimaryColor();
  const [notificationRequested, setNotificationRequested] = useState(false);

  const handleNotificationRequest = () => {
    setNotificationRequested(true);
    notification.success({
      message: 'Notification Requested',
      description: 'We\'ll notify you as soon as the billing dashboard is ready!',
      duration: 4,
    });
  };

  const features = [
    {
      icon: <PayCircleOutlined />,
      title: 'Payment Management',
      description: 'Track and manage all subscription payments',
      color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0",
    },
    {
      icon: <ShopOutlined />,
      title: 'Multi-Shop Billing',
      description: 'Unified billing across all locations',
      color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe",
    },
    {
      icon: <RocketOutlined />,
      title: 'Plan Flexibility',
      description: 'Easy upgrades and downgrades',
      color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe",
    },
    {
      icon: <SafetyCertificateOutlined />,
      title: 'Secure Processing',
      description: 'Bank-level security for all transactions',
      color: "#f59e0b", bg: "#fffbeb", border: "#fde68a",
    },
  ];

  const upcoming = [
    {
      icon: <PayCircleOutlined />,
      color: "#3b82f6",
      title: "Payment History",
      text: "View all past payments, invoices, and upcoming billing dates in one place.",
    },
    {
      icon: <ShopOutlined />,
      color: "#10b981",
      title: "Multi-Location Support",
      text: "Manage billing for multiple shops with detailed breakdowns per location.",
    },
    {
      icon: <RocketOutlined />,
      color: "#8b5cf6",
      title: "Plan Management",
      text: "Upgrade or downgrade subscription plans based on your business needs.",
    },
  ];

  return (
    <div style={{ padding: "16px 20px 24px", width: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: `${primaryColor}18`, borderRadius: 8, padding: "6px 8px",
            color: primaryColor, fontSize: 18, display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <CreditCardOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: C.darkText, fontWeight: 600, lineHeight: 1.3 }}>
              Billing
            </Title>
            <Text style={{ fontSize: 12, color: C.subText, lineHeight: 1.3 }}>
              Subscriptions, payments &amp; plan management across all locations
            </Text>
          </div>
        </div>

        <span style={{
          background: C.primaryLight, color: primaryColor, borderRadius: 6,
          fontSize: 10, fontWeight: 700, padding: "4px 10px",
          textTransform: "uppercase", letterSpacing: "0.4px",
        }}>
          Coming Soon
        </span>
      </div>

      {/* Feature tiles */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {features.map((f) => (
          <Col xs={24} sm={12} lg={6} key={f.title}>
            <div style={{
              background: f.bg, border: `1px solid ${f.border}`,
              borderRadius: 12,
              padding: "14px 16px", height: "100%",
            }}>
              <div style={{
                background: "#fff", borderRadius: 8, padding: "5px 7px",
                color: f.color, fontSize: 15, display: "inline-flex", lineHeight: 1,
                marginBottom: 10,
              }}>
                {f.icon}
              </div>
              <Text strong style={{ fontSize: 13, color: C.darkText, display: "block", marginBottom: 2 }}>
                {f.title}
              </Text>
              <Text style={{ fontSize: 12, color: C.subText, lineHeight: 1.5 }}>
                {f.description}
              </Text>
            </div>
          </Col>
        ))}
      </Row>

      {/* What to expect */}
      <div style={{ ...cardStyle, padding: "16px 20px", marginBottom: 16 }}>
        <Space align="center" size={8} style={{ marginBottom: 14 }}>
          <div style={{
            background: "#eff6ff", borderRadius: 7, padding: "3px 6px",
            color: "#3b82f6", fontSize: 12, display: "inline-flex",
          }}>
            <CheckOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>What to Expect</Text>
        </Space>
        <Row gutter={[16, 12]}>
          {upcoming.map((u) => (
            <Col xs={24} md={8} key={u.title}>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: `${u.color}14`, color: u.color,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                }}>
                  {u.icon}
                </div>
                <div>
                  <Text strong style={{ fontSize: 13, color: C.darkText, display: "block", marginBottom: 2 }}>
                    {u.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.subText, lineHeight: 1.6 }}>
                    {u.text}
                  </Text>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      {/* Notify */}
      <div style={{
        ...cardStyle,
        padding: "28px 24px",
        textAlign: "center",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, margin: "0 auto 12px",
          background: `${primaryColor}14`, color: primaryColor, fontSize: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <BellOutlined />
        </div>
        <Text strong style={{ fontSize: 15, color: C.darkText, display: "block", marginBottom: 4 }}>
          Be the First to Know
        </Text>
        <Text style={{ fontSize: 13, color: C.subText, display: "block", marginBottom: 16 }}>
          Get notified when the billing dashboard is ready to use
        </Text>
        <Button
          type="primary"
          style={{
            backgroundColor: primaryColor, borderColor: primaryColor,
            borderRadius: 8, height: 38, paddingInline: 20,
          }}
          onClick={handleNotificationRequest}
          disabled={notificationRequested}
        >
          {notificationRequested ? 'Notification Requested' : 'Notify Me'}
        </Button>
      </div>
    </div>
  );
};

export default BillingDashboard;
