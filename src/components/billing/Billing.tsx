import React, { useState, useEffect } from "react";
import {
  Typography,
  Space,
  Row,
  Col,
  Card,
  Button,
  Tag,
  notification
} from "antd";
import {
  CreditCardOutlined,
  BellOutlined,
  PayCircleOutlined,
  ShopOutlined,
  RocketOutlined,
  SafetyCertificateOutlined
} from "@ant-design/icons";

import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Title, Text, Paragraph } = Typography;

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
      icon: <PayCircleOutlined style={{ fontSize: '20px', color: '#52c41a' }} />,
      title: 'Payment Management',
      description: 'Track and manage all subscription payments'
    },
    {
      icon: <ShopOutlined style={{ fontSize: '20px', color: '#1890ff' }} />,
      title: 'Multi-Shop Billing',
      description: 'Unified billing across all locations'
    },
    {
      icon: <RocketOutlined style={{ fontSize: '20px', color: '#722ed1' }} />,
      title: 'Plan Flexibility',
      description: 'Easy upgrades and downgrades'
    },
    {
      icon: <SafetyCertificateOutlined style={{ fontSize: '20px', color: '#fa8c16' }} />,
      title: 'Secure Processing',
      description: 'Bank-level security for all transactions'
    }
  ];

  return (
    <>
      {/* Header */}
      <Card style={{ marginBottom: "24px", borderRadius: "8px", textAlign: 'center' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <div style={{
              fontSize: '64px',
              color: primaryColor,
              marginBottom: '16px'
            }}>
              <CreditCardOutlined />
            </div>
            <Title level={1} style={{ margin: 0, color: primaryColor }}>
              Billing Dashboard
            </Title>
            <Title level={3} style={{ margin: 0, fontWeight: 'normal', color: '#666' }}>
              Coming Soon
            </Title>
          </div>

          <Paragraph style={{ fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
            We're building a comprehensive billing solution to help you manage subscriptions,
            payments, and plan changes across all your shop locations with ease.
          </Paragraph>
        </Space>
      </Card>

      {/* Features Grid */}
      <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
        {features.map((feature, index) => (
          <Col xs={12} md={6} key={index}>
            <Card
              size="small"
              hoverable
              style={{
                borderRadius: "8px",
                height: '120px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {feature.icon}
                <Text strong style={{ fontSize: '14px' }}>{feature.title}</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {feature.description}
                </Text>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Expected Features */}
      <Card style={{ marginBottom: "24px", borderRadius: "8px" }}>
        <Title level={4} style={{ marginBottom: '16px' }}>What to Expect</Title>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={8}>
            <Tag color="blue" style={{ marginBottom: '8px' }}>
              <PayCircleOutlined /> Payment History
            </Tag>
            <Paragraph style={{ margin: 0, fontSize: '14px' }}>
              View all past payments, invoices, and upcoming billing dates in one place.
            </Paragraph>
          </Col>
          <Col xs={24} md={8}>
            <Tag color="green" style={{ marginBottom: '8px' }}>
              <ShopOutlined /> Multi-Location Support
            </Tag>
            <Paragraph style={{ margin: 0, fontSize: '14px' }}>
              Manage billing for multiple shops with detailed breakdowns per location.
            </Paragraph>
          </Col>
          <Col xs={24} md={8}>
            <Tag color="purple" style={{ marginBottom: '8px' }}>
              <RocketOutlined /> Plan Management
            </Tag>
            <Paragraph style={{ margin: 0, fontSize: '14px' }}>
              Upgrade or downgrade subscription plans based on your business needs.
            </Paragraph>
          </Col>
        </Row>
      </Card>

      {/* Notification Request */}
      <Card style={{ borderRadius: "8px", textAlign: 'center' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <BellOutlined style={{ fontSize: '32px', color: primaryColor }} />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Be the First to Know
            </Title>
            <Text type="secondary">
              Get notified when the billing dashboard is ready to use
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            style={{
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              height: '48px',
              minWidth: '200px'
            }}
            onClick={handleNotificationRequest}
            disabled={notificationRequested}
          >
            {notificationRequested ? 'Notification Requested ✓' : 'Notify Me'}
          </Button>
        </Space>
      </Card>
    </>
  );
};

export default BillingDashboard;