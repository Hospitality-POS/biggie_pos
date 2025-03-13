import React, { useRef, useState, useEffect } from "react";
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

const { Title, Text } = Typography;

function AdminProfile() {
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [pin, setPin] = useState("*********");
  const params = useParams();
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");

  const userRef = useRef<ActionType>();

  const { id } = params;

  // Get tenant primary color from localStorage
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.primary_color) {
      setPrimaryColor(tenant.primary_color);
    }
  }, []);

  const { data: userDetails, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchUserById(id),
    refetchOnWindowFocus: false,
    networkMode: "always",
  });

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
        title="User Profile"
        content="View and manage user information"
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
                  title="User not found"
                  subTitle="Sorry, the user you visited does not exist."
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
      title="User Profile"
      content="View and manage user information"
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
              style={{ backgroundColor: primaryColor }}
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
                <MailOutlined /> Email
              </Space>
            }
          >
            {userDetails.email}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <Space>
                <PhoneOutlined /> Phone
              </Space>
            }
          >
            {userDetails.phone}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <Space>
                <IdcardOutlined /> ID Number
              </Space>
            }
          >
            {userDetails.idNumber}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <Space>
                <LockOutlined /> PIN
              </Space>
            }
          >
            <Space>
              {pin}
              <Button
                type="text"
                icon={isPinVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={togglePinVisibility}
                aria-label={isPinVisible ? "Hide PIN" : "Show PIN"}
              />
            </Space>
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <Space>
                <CalendarOutlined /> Created At
              </Space>
            }
          >
            {new Date(userDetails.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <Space>
                <CalendarOutlined /> Last Updated
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

export default AdminProfile;