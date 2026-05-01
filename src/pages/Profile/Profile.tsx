import { useState } from "react";
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  EditOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { PageContainer, ProCard } from "@ant-design/pro-components";
import {
  Avatar,
  Tag,
  Row,
  Col,
  Space,
  Typography,
  Button,
  message,
  Skeleton,
  Result,
  Divider,
  Input,
} from "antd";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchUserById, updateUsers } from "@services/users";
import AuthenticationSettings from "@components/Settings/AuthenticationSettings";

import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Title, Text } = Typography;

function Profile() {
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [pin, setPin] = useState("*********");
  const [isEditing, setIsEditing] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isEditPinVisible, setIsEditPinVisible] = useState(false);
  const params = useParams();

  const primaryColor = usePrimaryColor();

  const { id } = params;

  const { data: userDetails, isLoading, refetch } = useQuery(
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

  const handleEdit = () => {
    setIsEditing(true);
    setEditedFields({
      fullname: userDetails?.fullname || "",
      email: userDetails?.email || "",
      phone: userDetails?.phone || "",
      idNumber: userDetails?.idNumber || "",
      pin: userDetails?.pin || "",
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedFields({});
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUsers({
        _id: userDetails?._id,
        value: editedFields,
      });
      message.success("Profile updated successfully");
      setIsEditing(false);
      setEditedFields({});
      refetch();
    } catch (error) {
      message.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditedFields((prev) => ({ ...prev, [field]: value }));
  };

  if (!userDetails) {
    return (
      <PageContainer
        title={<><UserOutlined /> Profile Details</>}
        content="Review and manage your personal information"
        style={{ padding: "24px" }}
      >
        <ProCard>
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
        </ProCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={<><UserOutlined /> Profile Details</>}
      content="Review and manage your personal information"
      style={{ padding: "24px" }}
    >
      <Row gutter={[24, 24]}>
        {/* Profile Card - Left Column */}
        <Col xs={24} lg={8} xl={6}>
          <ProCard
            style={{ 
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              height: "fit-content"
            }}
            bodyStyle={{ padding: "32px 24px" }}
          >
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <Avatar
                size={120}
                icon={<UserOutlined />}
                style={{ 
                  border: `4px solid ${primaryColor}`,
                  marginBottom: "16px"
                }}
                src={userDetails?.thumbnail || "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg"}
                alt={userDetails?.fullname || "User Avatar"}
              />
              {isEditing ? (
                <Input
                  value={editedFields.fullname}
                  onChange={(e) => handleFieldChange("fullname", e.target.value)}
                  style={{ marginBottom: "8px", textAlign: "center" }}
                />
              ) : (
                <Title level={3} style={{ marginBottom: "8px" }}>
                  {userDetails.fullname}
                </Title>
              )}
              <Text type="secondary" style={{ fontSize: "14px" }}>
                @{userDetails.username}
              </Text>
            </div>

            <Divider style={{ margin: "20px 0" }} />

            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div style={{ textAlign: "center" }}>
                <Space size="small">
                  <Tag 
                    color={userDetails.status === "Active" ? "green" : "red"}
                    style={{ fontSize: "13px", padding: "4px 12px", borderRadius: "6px" }}
                  >
                    {userDetails.status}
                  </Tag>
                  <Tag 
                    color={primaryColor}
                    style={{ fontSize: "13px", padding: "4px 12px", borderRadius: "6px" }}
                  >
                    {userDetails.role.role_type.toUpperCase()}
                  </Tag>
                </Space>
              </div>

              {isEditing ? (
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={isSaving}
                    style={{ width: "100%" }}
                  >
                    Save Changes
                  </Button>
                  <Button
                    onClick={handleCancel}
                    style={{ width: "100%" }}
                  >
                    Cancel
                  </Button>
                </Space>
              ) : (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                  style={{ width: "100%" }}
                >
                  Edit Profile
                </Button>
              )}
            </Space>
          </ProCard>
        </Col>

        {/* Details Cards - Right Column */}
        <Col xs={24} lg={16} xl={18}>
          <Row gutter={[16, 16]}>
            {/* Contact Information Card */}
            <Col xs={24} md={12}>
              <ProCard
                title={
                  <Space>
                    <MailOutlined style={{ color: primaryColor }} />
                    <span>Contact Information</span>
                  </Space>
                }
                style={{ 
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  height: "100%"
                }}
              >
                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                      Email Address
                    </Text>
                    {isEditing ? (
                      <Input
                        value={editedFields.email}
                        onChange={(e) => handleFieldChange("email", e.target.value)}
                      />
                    ) : (
                      <Text strong style={{ fontSize: "14px" }}>
                        {userDetails.email}
                      </Text>
                    )}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                      Phone Number
                    </Text>
                    {isEditing ? (
                      <Input
                        value={editedFields.phone}
                        onChange={(e) => handleFieldChange("phone", e.target.value)}
                      />
                    ) : (
                      <Text strong style={{ fontSize: "14px" }}>
                        {userDetails.phone}
                      </Text>
                    )}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                      National ID
                    </Text>
                    {isEditing ? (
                      <Input
                        value={editedFields.idNumber}
                        onChange={(e) => handleFieldChange("idNumber", e.target.value)}
                      />
                    ) : (
                      <Text strong style={{ fontSize: "14px" }}>
                        {userDetails.idNumber || "N/A"}
                      </Text>
                    )}
                  </div>
                </Space>
              </ProCard>
            </Col>

            {/* Account Activity Card */}
            <Col xs={24} md={12}>
              <ProCard
                title={
                  <Space>
                    <ClockCircleOutlined style={{ color: primaryColor }} />
                    <span>Account Activity</span>
                  </Space>
                }
                style={{ 
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  height: "100%"
                }}
              >
                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                      Account Created
                    </Text>
                    <Text strong style={{ fontSize: "14px" }}>
                      {new Date(userDetails.createdAt).toLocaleString()}
                    </Text>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                      Last Modified
                    </Text>
                    <Text strong style={{ fontSize: "14px" }}>
                      {new Date(userDetails.updatedAt).toLocaleString()}
                    </Text>
                  </div>
                </Space>
              </ProCard>
            </Col>

            {/* Security Card */}
            <Col xs={24}>
              <ProCard
                title={
                  <Space>
                    <SafetyOutlined style={{ color: primaryColor }} />
                    <span>Security</span>
                  </Space>
                }
                style={{ 
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)"
                }}
              >
                <div>
                  <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "8px" }}>
                    Security PIN
                  </Text>
                  {isEditing ? (
                    <Input
                      value={editedFields.pin}
                      onChange={(e) => handleFieldChange("pin", e.target.value)}
                      type={isEditPinVisible ? "text" : "password"}
                      style={{ letterSpacing: "2px" }}
                      suffix={
                        <Button
                          type="text"
                          icon={isEditPinVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                          onClick={() => setIsEditPinVisible(!isEditPinVisible)}
                          style={{ color: primaryColor }}
                        />
                      }
                    />
                  ) : (
                    <Space>
                      <Text strong style={{ fontSize: "16px", letterSpacing: "2px" }}>
                        {pin}
                      </Text>
                      <Button
                        type="text"
                        icon={isPinVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        onClick={togglePinVisibility}
                        style={{ color: primaryColor }}
                      />
                    </Space>
                  )}
                </div>
              </ProCard>
            </Col>

            {/* Authentication Settings */}
            <Col xs={24}>
              <ProCard
                title={
                  <Space>
                    <LockOutlined style={{ color: primaryColor }} />
                    <span>Authentication Settings</span>
                  </Space>
                }
                style={{ 
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)"
                }}
              >
                <AuthenticationSettings 
                  userId={id || ''} 
                  userEmail={userDetails?.email}
                  userData={userDetails}
                  onAuthMethodChange={refetch}
                />
              </ProCard>
            </Col>
          </Row>
        </Col>
      </Row>
    </PageContainer>
  );
}

export default Profile;
