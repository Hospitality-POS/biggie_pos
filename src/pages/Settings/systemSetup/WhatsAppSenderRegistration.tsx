import React, { useState } from "react";
import { Form, Input, Button, Alert, Space, Typography, Card, Select, message } from "antd";
import { WhatsAppOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import axiosInstance from "@services/request";
import { updateSystemSetup, fetchSystemSetupDetailsById } from "@services/systemsetup";

const { TextArea } = Input;
const { Text, Title } = Typography;

interface RegisterWhatsAppSenderRequest {
  shop_id?: string;
  phone_number: string;
  display_name: string;
  address?: string;
  email?: string;
  vertical?: string;
  description?: string;
  about?: string;
  website?: string;
}

interface RegisterWhatsAppSenderResponse {
  message: string;
  sender_id: string;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "FAILED";
  otp_required: boolean;
}

const WhatsAppSenderRegistration: React.FC = () => {
  const [form] = Form.useForm();
  const [step, setStep] = useState<"form" | "otp" | "success" | "error">("form");
  const [registrationData, setRegistrationData] = useState<RegisterWhatsAppSenderResponse | null>(null);
  const queryClient = useQueryClient();

  const shopId = localStorage.getItem("shopId");

  // Fetch current system settings
  const { data: systemSettings } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: fetchSystemSetupDetailsById,
    retry: false,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterWhatsAppSenderRequest) => {
      const response = await axiosInstance.post<RegisterWhatsAppSenderResponse>(
        "/users/register-whatsapp-sender",
        data
      );
      return response.data;
    },
    onSuccess: async (data) => {
      setRegistrationData(data);
      if (data.status === "PENDING_VERIFICATION" && data.otp_required) {
        setStep("otp");
      } else if (data.status === "VERIFIED") {
        // Save sender_id to system settings
        if (systemSettings?._id) {
          try {
            await updateSystemSetup({
              _id: systemSettings._id,
              data: { whatsapp_sender_id: data.sender_id }
            });
            queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
          } catch (error) {
            console.error("Failed to save sender_id to system settings:", error);
          }
        }
        setStep("success");
        message.success("WhatsApp sender registered successfully!");
      } else {
        setStep("error");
        message.error("Registration failed. Please try again.");
      }
    },
    onError: (error: unknown) => {
      setStep("error");
      const errorMessage = (error as any).response?.data?.error || (error as any).response?.data?.message || "Registration failed";
      message.error(errorMessage);
    },
  });

  const handleSubmit = async (values: Record<string, unknown>) => {
    const companyCode = localStorage.getItem("companyCode");
    const payload: RegisterWhatsAppSenderRequest = {
      shop_id: shopId || undefined,
      phone_number: values.phone_number as string,
      display_name: values.display_name as string,
      address: values.address as string | undefined,
      email: values.email as string | undefined,
      vertical: values.vertical as string | undefined,
      description: values.description as string | undefined,
      about: values.about as string | undefined,
      website: values.website as string | undefined,
      ...(companyCode && { companyCode, tenant_code: companyCode }),
    };
    registerMutation.mutate(payload);
  };

  const handleBackToForm = () => {
    setStep("form");
    setRegistrationData(null);
  };

  const renderForm = () => (
    <Card bordered={false} style={{ backgroundColor: "transparent" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
            <WhatsAppOutlined style={{ color: "#25D366", marginRight: 8 }} />
            Register WhatsApp Sender
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Register your phone number for WhatsApp messaging. This will allow you to send notifications to customers via WhatsApp.
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            vertical: "Retail",
          }}
        >
          <Form.Item
            label="Phone Number"
            name="phone_number"
            rules={[
              { required: true, message: "Phone number is required" },
              {
                pattern: /^\+[1-9]\d{1,14}$/,
                message: "Phone number must be in E.164 format (e.g., +254712345678)",
              },
            ]}
          >
            <Input
              placeholder="+254712345678"
              prefix={<WhatsAppOutlined />}
              size="large"
            />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: -16, marginBottom: 16 }}>
            Enter in E.164 format (e.g., +254712345678)
          </Text>

          <Form.Item
            label="Business Name"
            name="display_name"
            rules={[{ required: true, message: "Business name is required" }]}
          >
            <Input
              placeholder="My Business Name"
              size="large"
            />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: -16, marginBottom: 16 }}>
            This name will appear on WhatsApp messages
          </Text>

          <Form.Item label="Business Address" name="address">
            <Input placeholder="123 Business Street, Nairobi, Kenya" />
          </Form.Item>

          <Form.Item
            label="Contact Email"
            name="email"
            rules={[{ type: "email", message: "Invalid email format" }]}
          >
            <Input placeholder="contact@mybusiness.com" />
          </Form.Item>

          <Form.Item label="Business Category" name="vertical">
            <Select
              options={[
                { label: "Retail", value: "Retail" },
                { label: "Healthcare", value: "Healthcare" },
                { label: "Education", value: "Education" },
                { label: "Finance", value: "Finance" },
                { label: "Hospitality", value: "Hospitality" },
                { label: "Other", value: "Other" },
              ]}
            />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea
              placeholder="Brief description of your business"
              rows={2}
            />
          </Form.Item>

          <Form.Item label="About" name="about">
            <TextArea
              placeholder="Tell customers about your business"
              rows={2}
            />
          </Form.Item>

          <Form.Item
            label="Website"
            name="website"
            rules={[{ type: "url", message: "Invalid URL format" }]}
          >
            <Input placeholder="https://mybusiness.com" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={registerMutation.isLoading}
              block
              size="large"
              icon={<WhatsAppOutlined />}
            >
              {registerMutation.isLoading ? "Registering..." : "Register WhatsApp Sender"}
            </Button>
          </Form.Item>
        </Form>
      </Space>
    </Card>
  );

  const renderOTP = () => (
    <Card bordered={false} style={{ backgroundColor: "transparent" }}>
      <Space direction="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
        <ExclamationCircleOutlined style={{ fontSize: 64, color: "#faad14" }} />
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: 8 }}>OTP Verification Required</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Twilio has sent a verification code to your phone number. Please check your SMS or voice call and enter the code in Twilio Console to complete verification.
          </Text>
        </div>
        <Alert
          message="Sender ID"
          description={registrationData?.sender_id}
          type="info"
          showIcon
        />
        <Button
          type="primary"
          href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp"
          target="_blank"
          rel="noopener noreferrer"
          size="large"
          icon={<WhatsAppOutlined />}
        >
          Open Twilio Console
        </Button>
        <Button onClick={handleBackToForm} type="link">
          Back to form
        </Button>
      </Space>
    </Card>
  );

  const renderSuccess = () => (
    <Card bordered={false} style={{ backgroundColor: "transparent" }}>
      <Space direction="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
        <CheckCircleOutlined style={{ fontSize: 64, color: "#52c41a" }} />
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: 8 }}>Registration Successful!</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Your WhatsApp sender has been registered and verified. You can now send WhatsApp notifications.
          </Text>
        </div>
        <Button
          type="primary"
          onClick={handleBackToForm}
          size="large"
        >
          Register Another Number
        </Button>
      </Space>
    </Card>
  );

  const renderError = () => (
    <Card bordered={false} style={{ backgroundColor: "transparent" }}>
      <Space direction="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
        <ExclamationCircleOutlined style={{ fontSize: 64, color: "#ff4d4f" }} />
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: 8 }}>Registration Failed</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            There was an error registering your WhatsApp sender. Please try again or contact support.
          </Text>
        </div>
        <Button
          type="primary"
          onClick={handleBackToForm}
          size="large"
        >
          Try Again
        </Button>
      </Space>
    </Card>
  );

  return (
    <div style={{ padding: "0", backgroundColor: "#fafafa", borderRadius: "8px" }}>
      {step === "form" && renderForm()}
      {step === "otp" && renderOTP()}
      {step === "success" && renderSuccess()}
      {step === "error" && renderError()}
    </div>
  );
};

export default WhatsAppSenderRegistration;
