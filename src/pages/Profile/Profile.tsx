import React, { useEffect, useRef, useState } from "react";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  CalendarOutlined,
  EditOutlined,
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import { ActionType, PageContainer } from "@ant-design/pro-components";
import {
  Card,
  Avatar,
  Tag,
  Descriptions,
  Row,
  Col,
  Space,
  Typography,
  Button,
  message,
  Skeleton,
  Result,
} from "antd";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchUserById } from "@services/users";
import AddEditProUserModal from "@components/MODALS/pro/AddEditProUserModal";

import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Title, Text } = Typography;

function Profile() {
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [pin, setPin] = useState("*********");
  const params = useParams();

  const userRef = useRef<ActionType>();

  const primaryColor = usePrimaryColor();

  const { id } = params;

  const { data: userDetails, isLoading } = useQuery(
    {
      queryKey: ["user", id],
      queryFn: () => fetchUserById(id),
      refetchOnWindowFocus: false,
      networkMode: "always",
    }
  );


  const togglePinVisibility = async () => {
    if (!isPinVisible) {
      try {
        setPin(userDetails.pin);
        setIsPinVisible(true);
      } catch (error) {
        message.error("Failed to fetch PIN. Please try again later.");
      }
    } else {
      setPin("*********");
      setIsPinVisible(false);
    }
  };

  if (!userDetails) {
    return (
      <PageContainer
        title="Profile Details"
        content="Review and manage your personal information"
        style={{ padding: "24px" }}
      >
        <Card>
          <Row gutter={[16, 16]} align="middle">
            <Col span={24}>
              {isLoading ? (
                <Skeleton active />
              ) : (
                <Result
                  status="404"
                  title="User Not Found"
                  subTitle="We couldn't find the user you're looking for. Please check the user ID and try again."
                />
              )}
            </Col>
          </Row>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Profile Details"
      content="Review and manage your personal information"
      style={{ padding: "24px" }}
    >
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col
            xs={24}
            sm={8}
            md={6}
            lg={5}
            xl={4}
            style={{ textAlign: "center" }}
          >
            <Avatar
              size={100}
              icon={<UserOutlined />}
              style={{ border: `2px solid ${primaryColor}` }}
              src={userDetails?.thumbnail || "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg"}
              alt={userDetails?.fullname || "User Avatar"}
              aria-label="User Avatar"
            />
          </Col>
          <Col xs={24} sm={16} md={18} lg={19} xl={20}>
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Space align="center">
                <Title level={3} style={{ marginBottom: 0 }}>
                  {userDetails.fullname}
                </Title>

                {/* edit user modal */}
                <AddEditProUserModal
                  edit={true}
                  actionRef={userRef}
                  data={userDetails}
                  isProfile={true}
                  userId={userDetails?._id}
                />
              </Space>
              <Text
                type="secondary"
                style={{ marginBottom: 8 }}
              >{`@${userDetails.username}`}</Text>
              <Space>
                <Tag color={userDetails.status === "Active" ? "green" : "red"}>
                  {userDetails.status}
                </Tag>
                <Tag color={primaryColor}>
                  {userDetails.role.role_type.toUpperCase()}
                </Tag>
              </Space>
            </Space>
          </Col>
        </Row>

        <Descriptions
          bordered
          column={{ xs: 1, sm: 2 }}
          style={{ marginTop: "24px" }}
          labelStyle={{ fontWeight: "bold" }}
          size="small"
        >
          <Descriptions.Item
            label={
              <Space>
                <MailOutlined /> Email Address
              </Space>
            }
          >
            {userDetails.email}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <Space>
                <PhoneOutlined /> Phone Number
              </Space>
            }
          >
            {userDetails.phone}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <Space>
                <IdcardOutlined /> National ID
              </Space>
            }
          >
            {userDetails.idNumber}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <Space>
                <LockOutlined /> Security PIN
              </Space>
            }
          >
            <Space>
              {pin}
              <Button
                type="text"
                icon={isPinVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={togglePinVisibility}
                aria-label={isPinVisible ? "Hide PIN" : "Show PIN"}
              />
            </Space>
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <Space>
                <CalendarOutlined /> Account Created
              </Space>
            }
          >
            {new Date(userDetails.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <Space>
                <CalendarOutlined /> Last Modified
              </Space>
            }
          >
            {new Date(userDetails.updatedAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </PageContainer>
  );
}

export default Profile;
