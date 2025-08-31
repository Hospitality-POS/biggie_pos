import React, { useState, useEffect } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Typography, Space, Avatar, Row, Col, Button } from "antd";
import {
  ClockCircleOutlined,
  UserOutlined,
  BuildOutlined,
  ToolOutlined,
  RocketOutlined,
  NotificationOutlined,
} from "@ant-design/icons";
import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Title, Paragraph } = Typography;

const ComingSoon: React.FC = () => {
  // State to hold the primary color
  const primaryColor = usePrimaryColor();

  const avatarStyle: React.CSSProperties = {
    backgroundColor: "#f5f5f5",
    color: "#1890ff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    padding: "12px",
    fontSize: "24px",
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: "8px",
    marginBottom: "16px",
    backgroundColor: "#ffffff",
    transition: "all 0.3s",
  };

  return (
    <>
      <div style={{ padding: "40px 24px" }}>
        <Space size="middle" style={{ marginBottom: "12px" }}>
          <ClockCircleOutlined style={{ color: primaryColor, fontSize: "24px" }} />
          <Title level={3} style={{ margin: 0 }}>
            Coming Soon
          </Title>
        </Space>
        <Paragraph
          style={{ fontSize: "24px", fontWeight: 500, marginBottom: "48px" }}
        >
          We're cooking up something special for you
        </Paragraph>

        <Row
          gutter={[24, 24]}
          justify="center"
          style={{ marginBottom: "48px" }}
        >
          {[
            {
              icon: (
                <BuildOutlined style={{ fontSize: "32px", color: primaryColor }} />
              ),
              title: "In Development",
              description: "Crafting the perfect experience",
            },
            {
              icon: (
                <ToolOutlined style={{ fontSize: "32px", color: primaryColor }} />
              ),
              title: "Fine Tuning",
              description: "Perfecting every detail",
            },
            {
              icon: (
                <RocketOutlined
                  style={{ fontSize: "32px", color: primaryColor }}
                />
              ),
              title: "Launch Ready",
              description: "Preparing for takeoff",
            },
          ].map((item, index) => (
            <Col xs={24} sm={12} md={8} key={index}>
              <ProCard style={cardStyle} hoverable>
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ width: "100%" }}
                >
                  <Avatar size={64} style={avatarStyle}>
                    {item.icon}
                  </Avatar>
                  <Title level={4} style={{ margin: 0 }}>
                    {item.title}
                  </Title>
                  <Paragraph style={{ margin: 0, color: "#666" }}>
                    {item.description}
                  </Paragraph>
                </Space>
              </ProCard>
            </Col>
          ))}
        </Row>

        <Space
          direction="vertical"
          size="large"
          style={{ width: "100%", maxWidth: "600px", margin: "0 auto" }}
        >
          <div
            style={{
              padding: "24px",
              backgroundColor: "#f0f5ff",
              borderRadius: "8px",
              marginBottom: "24px",
            }}
          >
            <Space size="middle">
              <Avatar.Group>
                {[...Array(4)].map((_, index) => (
                  <Avatar
                    key={index}
                    style={{
                      backgroundColor: index % 2 === 0 ? primaryColor : "#7f767f",
                    }}
                    icon={<UserOutlined />}
                  />
                ))}
              </Avatar.Group>
              <Paragraph style={{ margin: 0 }}>
                Our team is working hard to bring this to you
              </Paragraph>
            </Space>
          </div>

          <Button type="primary" size="large" icon={<NotificationOutlined />}>
            Notify Me When Ready
          </Button>
        </Space>
      </div>
    </>
  );
};

export default ComingSoon;