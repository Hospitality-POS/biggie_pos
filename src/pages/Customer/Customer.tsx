import React, { useState } from "react";
import {
  Row,
  Col,
  Typography,
  Button,
  Form,
  Input,
  Space,
  Result,
  message,
  Rate,
} from "antd";
import {
  SaveOutlined,
  QrcodeOutlined,
  UserAddOutlined,
  MailOutlined,
  CopyOutlined,
  UserOutlined,
  LeftOutlined,
  StarOutlined,
  CommentOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { logCustomerVisit, addNewCustomer } from "@services/customers";
import { ProCard } from "@ant-design/pro-components";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { getPhoneNumber } from "@components/PhoneNumber/utils/formatPhoneNumberUtil";
import { fetchTenantById } from "@services/users";
import { useQuery } from "@tanstack/react-query";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const CustomerVisitTracker = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [registrationMode, setRegistrationMode] = useState(false);
  const [visitCompleted, setVisitCompleted] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [visitType, setVisitType] = useState(null);

  //const defaultColor = "#6c1c2c";
  const storedTenant = localStorage.getItem("tenant");
  let tenant = storedTenant ? JSON.parse(storedTenant) : null;


  // const primaryColor = tenant && tenant.primary_color ? tenant.primary_color : defaultColor;

  const params = new URLSearchParams(window.location.search);
  const tenantId = params.get("tenant_id");

  const { data: tenantData } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: () => fetchTenantById(tenantId), // Ensure it's a function reference
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });
  if (!tenant) {
    tenant = tenantData;
  }
  const clientName = tenant ? tenant.name : "Relia";

  const shopId = params.get("shop_id");

  const welcomeMessages = [
    "🎉 Great to see you again! 🙌",
    "We missed you, welcome back! ❤️",
    "Hello again, ready for something new? 🚀",
    "It's awesome to have you back! 😄",
    "You're back! Let's get started! 💪",
    "Back at it again! We've got more in store for you! 🎁",
    "Welcome back, your favorite spot is waiting! 🏆",
    "Always a pleasure to see you return! 🌟",
    "We're thrilled to have you back! 💙",
    // "We're dedicated to delivering a seamless and personalized experience that puts your needs first."
  ];

  const getRandomWelcomeMessage = () => {
    const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
    return welcomeMessages[randomIndex];
  };

  const randomMessage = getRandomWelcomeMessage();

  const handleCustomerRegistration = async (values) => {
    setLoading(true);
    try {
      const { email, name, phoneNumber } = values;
      const phone = getPhoneNumber(phoneNumber);
      const payload = {
        email,
        phone,
        customer_name: name,
        tenant_id: tenantId,
        shop_id: shopId,
      };
      const response = await addNewCustomer(payload);
      if (response?.status === 201) {
        const customerCode = response.data.customer.code;
        setGeneratedCode(customerCode);
        setVisitType("registration");
        setVisitCompleted(true);
        message.success("Registration successful!");
      }
    } catch (error) {
      message.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVisitLog = async (values) => {
    setLoading(true);
    try {
      const { phoneNumber, rating, review } = values;
      const customerCode = getPhoneNumber(phoneNumber);
      const payload = {
        customerCode,
        tenant_id: tenantId,
        shop_id: shopId,
        rating,
        review,
      };
      const resp = await logCustomerVisit(payload);
      if (resp?.status === 200) {
        setVisitType("visit");
        setVisitCompleted(true);
        message.success("Visit logged successfully!");
      }
    } catch (error) {
      message.error("Failed to log visit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyCodeToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard
        .writeText(generatedCode)
        .then(() => message.success("Customer code copied to clipboard"))
        .catch(() => message.error("Failed to copy customer code"));
    }
  };

  const resetState = () => {
    setRegistrationMode(false);
    setVisitCompleted(false);
    setGeneratedCode(null);
    setVisitType(null);
    form.resetFields();
  };

  const RetailBackground = () => (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        opacity: 0.1,
        zIndex: 0,
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern
          id="retail-grid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="white"
            strokeWidth="0.5"
          />
          <path d="M 10 5 L 15 5 L 15 8 L 12.5 10 L 10 8 Z" fill="white" />
          <path
            d="M 5 15 C 5 15 6 12 8 12 C 10 12 10 15 10 15"
            fill="none"
            stroke="white"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#retail-grid)" />
    </svg>
  );

  const MobileHeader = () => (
    <div
      style={{
        padding: "24px",
        textAlign: "center",
        background: "linear-gradient(135deg, #2c3e50 0%, #6c1c2c 100%)",
        borderRadius: "16px 16px 0 0",
      }}
    >
      {tenant?.tenant_code === "RPOS-000004" ? (
        <img
          src="/logo.png"
          alt="store-logo"
          style={{
            width: "170px",
            height: "auto",
            marginBottom: "16px",
            margin: "0 auto",
          }}
        />


      ) : (
        <img
          src="/relia.png"
          alt="store-logo"
          style={{
            width: "128px",
            height: "auto",
            marginBottom: "16px",
            margin: "0 auto",
          }}
        />
      )}

      <Title
        level={4}
        style={{
          color: "white",
          margin: 0,
          fontSize: "18px",
        }}
      >
        Welcome to {clientName}
      </Title>

      <Text
        style={{
          textAlign: "center",
          color: "#e0e0e0",
          fontSize: "14px",
        }}
      >
        {randomMessage}
      </Text>
    </div>
  );

  const DesktopSidebar = () => (
    <div
      style={{
        position: "relative",
        height: "100%",
        background: "linear-gradient(135deg, #2c3e50 0%, #6c1c2c 100%)",
        padding: "24px",
        borderRadius: "16px 0 0 16px",
        overflow: "hidden",
      }}
    >
      <RetailBackground />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            padding: "40px",
            borderRadius: "24px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          }}
        >


          {tenant?.tenant_code === "RPOS-000004" ? (
            <img
              src="/logo.png"
              alt="store-logo"
              style={{
                width: "200px",
                height: "auto",
                marginBottom: "24px",
                margin: "0 auto",
              }}
            />


          ) : (
            <img
              src="/relia.png"
              alt="store-logo"
              style={{
                width: "192px",
                height: "auto",
                marginBottom: "24px",
                margin: "0 auto",
              }}
            />
          )}


          <Title
            level={2}
            style={{
              color: "white",
              fontSize: "24px",
              fontWeight: 600,
              marginBottom: "24px",
              textShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            Customer Experience
          </Title>
          <Paragraph
            style={{
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: "16px",
              lineHeight: 1.8,
              maxWidth: "400px",
              margin: "0 auto",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
          >
            {randomMessage}
          </Paragraph>
        </div>
      </div>
    </div>
  );

  const MainContent = () => (
    <div style={{ maxWidth: "400px", width: "100%", margin: "0 auto" }}>
      {visitCompleted ? (
        <Result
          status="success"
          title={
            <Title level={3}>
              {visitType === "registration"
                ? "Registration Successful!"
                : "Visit Logged Successfully"}
            </Title>
          }
          subTitle={
            <Text style={{ fontSize: "16px", color: "#666" }}>
              {visitType === "registration"
                ? "Welcome to our community!"
                : "Thank you for your feedback and for visiting us today!"}
            </Text>
          }
          extra={
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              {generatedCode && (
                <ProCard
                  bordered
                  style={{
                    textAlign: "center",
                    borderRadius: "12px",
                    background: "#f5f5f5",
                  }}
                >
                  <Space>
                    <Text strong style={{ fontSize: "18px" }}>
                      {generatedCode}
                    </Text>
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={copyCodeToClipboard}
                    />
                  </Space>
                </ProCard>
              )}
              <Button type="primary" size="large" block onClick={resetState}>
                Back to Home
              </Button>
            </Space>
          }
        />
      ) : registrationMode ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCustomerRegistration}
          size="large"
          style={{ width: "100%" }}
        >
          <Form.Item
            name="name"
            label="Enter your full name"
            rules={[{ required: true, message: "Please enter your name" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Enter your full name"
            />
          </Form.Item>

          <PhoneInput label="Enter your phone number" owner="phoneNumber" />

          <Form.Item
            name="email"
            label="Enter your email address"
            rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Enter your email address"
            />
          </Form.Item>

          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              icon={<SaveOutlined />}
              loading={loading}
            >
              Register & Log Visit
            </Button>
            <Button
              block
              size="large"
              onClick={() => setRegistrationMode(false)}
              icon={<LeftOutlined />}
            >
              Go Back
            </Button>
          </Space>
        </Form>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleVisitLog}
          size="large"
          style={{ width: "100%" }}
        >
          <PhoneInput
            label={
              <Space>
                <PhoneOutlined style={{ color: "#6c1c2c", fontSize: "18px" }} />
                <Text strong>Enter your phone number</Text>
              </Space>
            }
            owner="phoneNumber"
          />

          <Form.Item
            name="rating"
            label={
              <Space>
                <StarOutlined style={{ color: "#6c1c2c", fontSize: "18px" }} />
                <Text strong>Rate your experience</Text>
              </Space>
            }
            rules={[{ required: true, message: "Please rate your experience" }]}
            style={{ width: "100%" }}
          >
            <Rate
              style={{ fontSize: "24px", width: "100%" }}
              allowClear
              id="rate"
              tooltips={["Okay", "Good", "Pretty good", "Great", "Amazing"]}
            />
          </Form.Item>

          <Form.Item
            name="review"
            label={
              <Space>
                <CommentOutlined
                  style={{ color: "#6c1c2c", fontSize: "18px" }}
                />
                <Text strong>Share your feedback (optional)</Text>
              </Space>
            }
          >
            <TextArea
              placeholder="Tell us about your experience..."
              rows={4}
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              icon={<QrcodeOutlined />}
              loading={loading}

            >
              Log Visit & Submit Feedback
            </Button>
            <Button
              type="default"
              block
              size="large"
              icon={<UserAddOutlined />}
              onClick={() => setRegistrationMode(true)}
            >
              First Time? Register Here
            </Button>
          </Space>
        </Form>
      )}
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundSize: "cover",
        backgroundImage: `url("/try.png")`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <ProCard
        ghost
        style={{
          width: "100%",
          maxWidth: "1200px",
          background: "rgba(255, 255, 255, 0.95)",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Row>
          <Col xs={0} md={12}>
            <DesktopSidebar />
          </Col>
          <Col xs={24} md={0}>
            <MobileHeader />
          </Col>
          <Col xs={24} md={12}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <MainContent />
            </div>
          </Col>
        </Row>
      </ProCard>
    </div>
  );
};

export default CustomerVisitTracker;
