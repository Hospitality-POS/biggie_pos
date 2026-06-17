import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  Space,
  message,
  Typography,
  Divider,
  Alert,
  Switch,
  Radio,
  Tag,
} from "antd";
import {
  BellOutlined,
  MailOutlined,
  WhatsAppOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  fetchSystemSetupDetailsById,
  updateSystemSetup,
  createSystemSetup,
} from "@services/systemsetup";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const { Text, Title } = Typography;

interface NotificationSettings {
  channels: string[];
}

const NotificationSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [channels, setChannels] = useState<string[]>(["email"]);
  const [whatsappMode, setWhatsappMode] = useState<'sandbox' | 'production'>('sandbox');

  // Fetch existing system settings
  const { data: systemSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: fetchSystemSetupDetailsById,
    retry: false,
  });

  // Load notification settings from system settings
  useEffect(() => {
    if (systemSettings?.notification_settings?.channels) {
      setChannels(systemSettings.notification_settings.channels);
    }
    if (systemSettings?.whatsapp_mode) {
      setWhatsappMode(systemSettings.whatsapp_mode);
    }
  }, [systemSettings]);

  // Handle channel toggle
  const handleChannelToggle = (channel: string, checked: boolean) => {
    if (checked) {
      setChannels([...channels, channel]);
    } else {
      setChannels(channels.filter((c) => c !== channel));
    }
  };


  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { notification_settings: NotificationSettings; whatsapp_mode?: 'sandbox' | 'production' }) => {
      if (systemSettings?._id) {
        return updateSystemSetup({ _id: systemSettings._id, data });
      } else {
        return createSystemSetup(data);
      }
    },
    onSuccess: () => {
      message.success("Notification settings saved successfully");
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: () => {
      message.error("Failed to save notification settings");
    },
  });

  // Handle save
  const handleSave = async () => {
    // Validate at least one channel is selected
    if (channels.length === 0) {
      message.error("Select at least one notification channel");
      return;
    }

    // Validate WhatsApp requires phone number
    if (channels.includes("whatsapp") && !systemSettings?.phone) {
      message.error("Add a phone number in Business Info to enable WhatsApp sending");
      return;
    }

    // Validate production mode requires WhatsApp sender setup
    if (whatsappMode === 'production' && !systemSettings?.whatsapp_sender && !systemSettings?.whatsapp_sender_id) {
      message.error("Please register a WhatsApp sender in the WhatsApp Registration tab before switching to production mode");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        notification_settings: {
          channels,
        },
        whatsapp_mode: whatsappMode,
      });
    } catch (error) {
      // Error handled in mutation
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: number | string | undefined): string => {
    if (!phone) return "";
    const phoneStr = String(phone);
    if (phoneStr.startsWith("254")) {
      return `+${phoneStr.slice(0, 3)} ${phoneStr.slice(3, 6)} ${phoneStr.slice(6)}`;
    }
    return phoneStr;
  };

  return (
    <div style={{ padding: "0" }}>
      <div
        style={{
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
          <BellOutlined style={{ marginRight: 8, color: "#fa8c16" }} />
          Notification Settings
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          Configure how and when to send notifications to customers
        </Text>
      </div>

      {isLoadingSettings ? (
        <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
      ) : (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Notification Channels */}
          <Card
            title={
              <Space>
                <BellOutlined style={{ color: "#1890ff" }} />
                <Text strong>Notification Channels</Text>
              </Space>
            }
            style={{ borderRadius: 8 }}
          >
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              {/* Email Channel */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <Space>
                    <MailOutlined style={{ color: "#1890ff", fontSize: 18 }} />
                    <div>
                      <Text strong style={{ fontSize: 14 }}>
                        Email
                      </Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Send via email (Brevo)
                        </Text>
                      </div>
                    </div>
                  </Space>
                </div>
                <Switch
                  checked={channels.includes("email")}
                  onChange={(checked) => handleChannelToggle("email", checked)}
                  checkedChildren="ON"
                  unCheckedChildren="OFF"
                />
              </div>

              <Divider style={{ margin: "12px 0" }} />

              {/* WhatsApp Channel */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <Space>
                    <WhatsAppOutlined style={{ color: "#25D366", fontSize: 18 }} />
                    <div>
                      <Text strong style={{ fontSize: 14 }}>
                        WhatsApp
                      </Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Send via WhatsApp (Twilio)
                        </Text>
                      </div>
                    </div>
                  </Space>
                  {channels.includes("whatsapp") && (
                    <div style={{ marginTop: 8, marginLeft: 32 }}>
                      {systemSettings?.whatsapp_sender ? (
                        <Space size={4} wrap>
                          <CheckCircleOutlined style={{ color: "#52c41a" }} />
                          <Text style={{ fontSize: 12 }}>
                            {systemSettings.whatsapp_sender.display_name || systemSettings.whatsapp_sender.phone_number}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            ({systemSettings.whatsapp_sender.phone_number})
                          </Text>
                          <Tag
                            color={systemSettings.whatsapp_sender.mode === "production" ? "green" : "orange"}
                            style={{ fontSize: 11, marginLeft: 4 }}
                          >
                            {systemSettings.whatsapp_sender.mode === "production" ? "Production" : "Sandbox"}
                          </Tag>
                        </Space>
                      ) : systemSettings?.phone ? (
                        <Space>
                          <CheckCircleOutlined style={{ color: "#52c41a" }} />
                          <Text style={{ fontSize: 12 }}>
                            Sender: {formatPhoneNumber(systemSettings.phone)}
                          </Text>
                        </Space>
                      ) : (
                        <Alert
                          type="warning"
                          showIcon
                          icon={<WarningOutlined />}
                          message="Register a WhatsApp sender in the WhatsApp Registration tab"
                          style={{ fontSize: 11, padding: "4px 8px" }}
                        />
                      )}
                    </div>
                  )}
                </div>
                <Switch
                  checked={channels.includes("whatsapp")}
                  onChange={(checked) => handleChannelToggle("whatsapp", checked)}
                  checkedChildren="ON"
                  unCheckedChildren="OFF"
                  style={{ marginLeft: 16 }}
                />
              </div>
            </Space>
          </Card>

          {/* WhatsApp Mode Configuration */}
          <Card
            title={
              <Space>
                <WhatsAppOutlined style={{ color: "#25D366" }} />
                <Text strong>WhatsApp Mode Configuration</Text>
              </Space>
            }
            style={{ borderRadius: 8 }}
          >
            <Alert
              message="Mode Selection"
              description="Choose between sandbox for testing or production for live messaging."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Radio.Group 
              value={whatsappMode} 
              onChange={(e) => setWhatsappMode(e.target.value)}
              style={{ marginBottom: 16, width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="sandbox">
                  <div>
                    <strong>Sandbox Mode</strong>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      Testing with Twilio sandbox number (+1 415 523 8886)
                    </div>
                  </div>
                </Radio>
                <Radio value="production">
                  <div>
                    <strong>Production Mode</strong>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      Live messaging with registered WhatsApp numbers
                    </div>
                  </div>
                </Radio>
              </Space>
            </Radio.Group>

            {whatsappMode === 'sandbox' && (
              <Alert
                message="Sandbox Mode Active"
                description="Recipients must send 'join knowledge-could' to +1 415 523 8886 to receive messages."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {whatsappMode === 'production' && (
              <Alert
                message="Production Mode Active"
                description="Set up your WhatsApp sender in the WhatsApp Registration tab to enable live messaging."
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
          </Card>

          {/* Save Button */}
          <div style={{ textAlign: "right" }}>
            <Button
              type="primary"
              onClick={handleSave}
              loading={saveMutation.isLoading}
              style={{ borderRadius: 6, minWidth: 120 }}
            >
              Save Changes
            </Button>
          </div>
        </Space>
      )}
    </div>
  );
};

export default NotificationSettings;
