import React, { useState, useEffect, useRef, useCallback } from "react";
import { Form, Input, Button, Alert, Space, Typography, Card, Select, Radio, Tag, Descriptions, Badge, Spin, message } from "antd";
import { WhatsAppOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ExperimentOutlined, RocketOutlined, EditOutlined, SyncOutlined } from "@ant-design/icons";
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
  mode?: "sandbox" | "production";
}

interface RegisterWhatsAppSenderResponse {
  message: string;
  sender_id: string;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "FAILED" | "SANDBOX" | "CREATING" | "ACTIVE";
  otp_required?: boolean;
  sender_registry_id?: string;
  note?: string;
  shared?: boolean;
  mode?: string;
}

interface WhatsappSender {
  _id: string;
  phone_number: string;
  display_name?: string;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "FAILED" | "SANDBOX" | "CREATING" | "ACTIVE";
  mode?: "sandbox" | "production";
  sender_id?: string;
  createdAt?: string;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  SANDBOX:              { color: "orange",  label: "Sandbox"     },
  CREATING:             { color: "blue",    label: "Creating"    },
  PENDING_VERIFICATION: { color: "gold",    label: "Pending OTP" },
  VERIFIED:             { color: "green",   label: "Verified"    },
  ACTIVE:               { color: "green",   label: "Active"      },
  FAILED:               { color: "red",     label: "Failed"      },
};

const WhatsAppSenderRegistration: React.FC = () => {
  const [form] = Form.useForm();
  const [otpForm] = Form.useForm();
  const [step, setStep] = useState<"form" | "creating" | "otp" | "success" | "sandbox" | "error">("form");
  const [registrationData, setRegistrationData] = useState<RegisterWhatsAppSenderResponse | null>(null);
  const [whatsappMode, setWhatsappMode] = useState<"sandbox" | "production">("sandbox");
  const [senderRegistryId, setSenderRegistryId] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  const shopId = localStorage.getItem("shopId");

  // Fetch current system settings
  const { data: systemSettings } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: fetchSystemSetupDetailsById,
    retry: false,
  });

  const existingSender: WhatsappSender | undefined = systemSettings?.whatsapp_sender;

  // Pre-fill mode from existing sender
  useEffect(() => {
    if (existingSender?.mode) {
      setWhatsappMode(existingSender.mode);
    }
  }, [existingSender]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const pollSenderStatus = useCallback(async (registryId: string) => {
    try {
      const response = await axiosInstance.get(`/users/whatsapp-sender/${registryId}/status`);
      const { status } = response.data;
      if (status === "PENDING_VERIFICATION") {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setStep("otp");
        message.info("OTP sent to your WhatsApp number. Enter it below.");
      } else if (status === "VERIFIED" || status === "ACTIVE") {
        if (pollingRef.current) clearInterval(pollingRef.current);
        queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
        setStep("success");
        message.success("WhatsApp sender verified and active!");
      } else if (status === "FAILED") {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setStep("error");
        message.error("WhatsApp sender registration failed.");
      }
    } catch {
      // silently ignore polling errors
    }
  }, [queryClient]);

  // Start / stop polling based on step
  useEffect(() => {
    if (step === "creating" && senderRegistryId) {
      pollSenderStatus(senderRegistryId);
      pollingRef.current = setInterval(() => pollSenderStatus(senderRegistryId), 5000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [step, senderRegistryId, pollSenderStatus]);

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
      if (data.status === "SANDBOX") {
        if (systemSettings?._id && data.sender_registry_id) {
          try {
            await updateSystemSetup({
              _id: systemSettings._id,
              data: { whatsapp_sender_id: data.sender_registry_id, whatsapp_mode: "sandbox" }
            });
            queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
          } catch (error) {
            // silently ignore
          }
        }
        setStep("sandbox");
        message.success("Phone number saved for sandbox testing!");
      } else if (data.status === "PENDING_VERIFICATION" && data.otp_required) {
        setStep("otp");
      } else if (data.status === "CREATING") {
        if (systemSettings?._id && data.sender_registry_id) {
          try {
            await updateSystemSetup({
              _id: systemSettings._id,
              data: { whatsapp_sender_id: data.sender_registry_id, whatsapp_mode: "production" }
            });
            queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
          } catch {
            // silently ignore
          }
        }
        setSenderRegistryId(data.sender_registry_id || null);
        setStep("creating");
        message.info(data.message || "Number registered. Waiting for OTP...");
      } else if (data.status === "VERIFIED" || data.status === "ACTIVE") {
        if (systemSettings?._id && data.sender_registry_id) {
          try {
            await updateSystemSetup({
              _id: systemSettings._id,
              data: { whatsapp_sender_id: data.sender_registry_id, whatsapp_mode: "production" }
            });
            queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
          } catch {
            // silently ignore
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
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      const errorMessage = err.response?.data?.error || err.response?.data?.message || "Registration failed";
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
      mode: whatsappMode,
      ...(companyCode && { companyCode, tenant_code: companyCode }),
    };
    registerMutation.mutate(payload);
  };

  const verifyMutation = useMutation({
    mutationFn: async ({ id, otp }: { id: string; otp: string }) => {
      const response = await axiosInstance.post(`/users/whatsapp-sender/${id}/verify`, { otp });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
      setStep("success");
      message.success("WhatsApp sender verified successfully!");
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      const errorMessage = err.response?.data?.error || err.response?.data?.message || "OTP verification failed";
      message.error(errorMessage);
    },
  });

  const handleBackToForm = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setStep("form");
    setRegistrationData(null);
    setSenderRegistryId(null);
    otpForm.resetFields();
  };

  const renderCreating = () => (
    <Card bordered={false} style={{ backgroundColor: "transparent" }}>
      <Space direction="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
        <Spin size="large" indicator={<SyncOutlined spin style={{ fontSize: 48, color: "#1890ff" }} />} />
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: 8 }}>Setting Up WhatsApp Sender</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Twilio is processing your registration. An OTP will be sent to your WhatsApp number shortly.
          </Text>
        </div>
        {registrationData?.sender_id && (
          <Alert
            message="Registered Number"
            description={registrationData.sender_id}
            type="info"
            showIcon
          />
        )}
        <Alert
          type="warning"
          showIcon
          message="Checking status automatically every 5 seconds. Please keep this page open."
        />
        <Button onClick={handleBackToForm} type="link">
          Cancel
        </Button>
      </Space>
    </Card>
  );

  const renderSandbox = () => (
    <Card bordered={false} style={{ backgroundColor: "transparent" }}>
      <Space direction="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
        <ExperimentOutlined style={{ fontSize: 64, color: "#faad14" }} />
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: 8 }}>Sandbox Mode Active</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {registrationData?.message || "Phone number saved for sandbox testing."}
          </Text>
        </div>
        <Alert
          message="Sender ID"
          description={registrationData?.sender_id}
          type="info"
          showIcon
        />
        {registrationData?.note && (
          <Alert
            message="Join Instructions"
            description={registrationData.note}
            type="warning"
            showIcon
          />
        )}
        <Alert
          message="How to test"
          description={
            <span>
              Ensure recipients send <strong>join knowledge-could</strong> to{" "}
              <strong>+1 415 523 8886</strong> on WhatsApp before testing.
            </span>
          }
          type="warning"
          showIcon
        />
        <Space>
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
          <Button onClick={handleBackToForm} size="large">
            Register Another Number
          </Button>
        </Space>
      </Space>
    </Card>
  );

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

        {/* Currently registered sender */}
        {existingSender && (
          <Card
            size="small"
            style={{ borderRadius: 8, border: "1px solid #d9f7be", background: "#f6ffed" }}
            extra={
              <Button size="small" icon={<EditOutlined />} type="link">
                Re-register
              </Button>
            }
            title={
              <Space>
                <WhatsAppOutlined style={{ color: "#25D366" }} />
                <Text strong>Current Sender</Text>
                <Badge
                  color={statusConfig[existingSender.status]?.color ?? "default"}
                  text={
                    <Text style={{ fontSize: 12 }}>
                      {statusConfig[existingSender.status]?.label ?? existingSender.status}
                    </Text>
                  }
                />
              </Space>
            }
          >
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="Phone">{existingSender.phone_number}</Descriptions.Item>
              {existingSender.display_name && (
                <Descriptions.Item label="Name">{existingSender.display_name}</Descriptions.Item>
              )}
              <Descriptions.Item label="Mode">
                <Tag color={existingSender.mode === "production" ? "green" : "orange"}>
                  {existingSender.mode === "production" ? "Production" : "Sandbox"}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* Mode selector */}
        <Card
          size="small"
          style={{ borderRadius: 8, border: "1px solid #f0f0f0", background: "#fafafa" }}
        >
          <Text strong style={{ display: "block", marginBottom: 12 }}>WhatsApp Mode</Text>
          <Radio.Group
            value={whatsappMode}
            onChange={(e) => setWhatsappMode(e.target.value)}
            style={{ width: "100%" }}
          >
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Radio value="sandbox">
                <Space>
                  <ExperimentOutlined style={{ color: "#faad14" }} />
                  <div>
                    <Text strong>Sandbox Mode</Text>
                    <Tag color="orange" style={{ marginLeft: 8 }}>Testing</Tag>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      Testing with Twilio sandbox number (+1 415 523 8886)
                    </div>
                  </div>
                </Space>
              </Radio>
              <Radio value="production">
                <Space>
                  <RocketOutlined style={{ color: "#52c41a" }} />
                  <div>
                    <Text strong>Production Mode</Text>
                    <Tag color="green" style={{ marginLeft: 8 }}>Live</Tag>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      Live messaging with your registered WhatsApp number
                    </div>
                  </div>
                </Space>
              </Radio>
            </Space>
          </Radio.Group>
          {whatsappMode === "sandbox" && (
            <Alert
              style={{ marginTop: 12, fontSize: 12 }}
              type="warning"
              showIcon
              message="Recipients must send 'join knowledge-could' to +1 415 523 8886 before they can receive test messages."
            />
          )}
        </Card>

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
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <ExclamationCircleOutlined style={{ fontSize: 56, color: "#faad14" }} />
          <Title level={4} style={{ margin: "16px 0 8px" }}>Enter Verification Code</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Twilio sent a 6-digit OTP to{" "}
            <strong>{registrationData?.sender_id?.replace("whatsapp:", "")}</strong>{" "}
            via WhatsApp.
          </Text>
        </div>

        <Form
          form={otpForm}
          layout="vertical"
          onFinish={(values) => {
            if (senderRegistryId) {
              verifyMutation.mutate({ id: senderRegistryId, otp: values.otp });
            }
          }}
        >
          <Form.Item
            name="otp"
            rules={[
              { required: true, message: "OTP is required" },
              { pattern: /^\d{6}$/, message: "OTP must be exactly 6 digits" },
            ]}
          >
            <Input
              placeholder="000000"
              size="large"
              maxLength={6}
              style={{ textAlign: "center", letterSpacing: 12, fontSize: 28, fontWeight: 600 }}
              onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={verifyMutation.isLoading}
              block
              size="large"
              icon={<CheckCircleOutlined />}
            >
              {verifyMutation.isLoading ? "Verifying..." : "Verify OTP"}
            </Button>
          </Form.Item>
        </Form>

        <Button onClick={handleBackToForm} type="link" block>
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
      {step === "creating" && renderCreating()}
      {step === "otp" && renderOTP()}
      {step === "success" && renderSuccess()}
      {step === "sandbox" && renderSandbox()}
      {step === "error" && renderError()}
    </div>
  );
};

export default WhatsAppSenderRegistration;
