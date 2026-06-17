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
  Checkbox,
  Spin,
  Collapse,
  Radio,
  Tag,
} from "antd";
import {
  BellOutlined,
  MailOutlined,
  WhatsAppOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  fetchSystemSetupDetailsById,
  updateSystemSetup,
  createSystemSetup,
} from "@services/systemsetup";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@services/request";

const { Text, Title } = Typography;

interface NotificationSettings {
  channels: string[];
  events: {
    invoice_issued: boolean;
    payment_received: boolean;
    receipt_issued: boolean;
    payment_reminder: boolean;
    account_statement: boolean;
  };
  role_events?: Record<string, string[]>;
}

interface Role {
  _id: string;
  role_type: string;
  description?: string;
  permissions?: string[];
}

const NotificationSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [channels, setChannels] = useState<string[]>(["email"]);
  const [events, setEvents] = useState<NotificationSettings["events"]>({
    invoice_issued: true,
    payment_received: true,
    receipt_issued: true,
    payment_reminder: false,
    account_statement: false,
  });
  const [roleEvents, setRoleEvents] = useState<Record<string, string[]>>({});
  const [whatsappMode, setWhatsappMode] = useState<'sandbox' | 'production'>('sandbox');

  const eventLabels: Record<keyof NotificationSettings["events"], string> = {
    invoice_issued: "Invoice Issued",
    payment_received: "Payment Received",
    receipt_issued: "Receipt Issued",
    payment_reminder: "Payment Reminder",
    account_statement: "Account Statement",
  };

  // Fetch existing system settings
  const { data: systemSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: fetchSystemSetupDetailsById,
    retry: false,
  });

  // Load notification settings from system settings
  useEffect(() => {
    if (systemSettings?.notification_settings) {
      const notifSettings = systemSettings.notification_settings;
      if (notifSettings.channels) {
        setChannels(notifSettings.channels);
      }
      if (notifSettings.events) {
        setEvents(notifSettings.events);
      }
      if (notifSettings.role_events) {
        setRoleEvents(notifSettings.role_events);
      }
    }
    if (systemSettings?.whatsapp_mode) {
      setWhatsappMode(systemSettings.whatsapp_mode);
    }
  }, [systemSettings]);

  // Fetch available roles
  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roleTypes"],
    queryFn: async () => {
      const response = await axiosInstance.get("/users/fetch-role-type/all");
      return response.data as Role[];
    },
    retry: false,
  });

  // Handle channel toggle
  const handleChannelToggle = (channel: string, checked: boolean) => {
    if (checked) {
      setChannels([...channels, channel]);
    } else {
      setChannels(channels.filter((c) => c !== channel));
    }
  };

  // Handle event toggle
  const handleEventToggle = (event: keyof NotificationSettings["events"], checked: boolean) => {
    setEvents({ ...events, [event]: checked });
  };

  // Handle role event toggle
  const handleRoleEventToggle = (role: string, event: string, checked: boolean) => {
    setRoleEvents((prev) => {
      const events = prev[role] || [];
      const updated = checked ? [...events, event] : events.filter((e) => e !== event);
      return { ...prev, [role]: updated };
    });
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
          events,
          role_events: roleEvents,
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

          {/* Notification Events */}
          <Card
            title={
              <Space>
                <BellOutlined style={{ color: "#1890ff" }} />
                <Text strong>Notify Customers When...</Text>
              </Space>
            }
            style={{ borderRadius: 8 }}
          >
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <EventToggle
                label="Invoice Issued"
                description="When an invoice is generated"
                checked={events.invoice_issued}
                onChange={(checked) => handleEventToggle("invoice_issued", checked)}
              />
              <EventToggle
                label="Payment Received"
                description="When a payment is successfully processed"
                checked={events.payment_received}
                onChange={(checked) => handleEventToggle("payment_received", checked)}
              />
              <EventToggle
                label="Receipt Issued"
                description="When a receipt is generated"
                checked={events.receipt_issued}
                onChange={(checked) => handleEventToggle("receipt_issued", checked)}
              />
              <EventToggle
                label="Payment Reminder"
                description="Reminder for upcoming or overdue payments"
                checked={events.payment_reminder}
                onChange={(checked) => handleEventToggle("payment_reminder", checked)}
              />
              <EventToggle
                label="Account Statement"
                description="When an account statement is generated"
                checked={events.account_statement}
                onChange={(checked) => handleEventToggle("account_statement", checked)}
              />
            </Space>
          </Card>

          {/* Role-Based Notifications */}
          <Card
            title={
              <Space>
                <TeamOutlined style={{ color: "#1890ff" }} />
                <Text strong>Role-Based Notifications</Text>
              </Space>
            }
            style={{ borderRadius: 8 }}
          >
            {isLoadingRoles ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <Spin />
              </div>
            ) : !rolesData || rolesData.length === 0 ? (
              <Alert
                message="No Roles Found"
                description="Create roles in your system to configure role-based notifications."
                type="warning"
                showIcon
                icon={<WarningOutlined />}
              />
            ) : (
              <Collapse
                accordion={false}
                defaultActiveKey={rolesData.length <= 3 ? rolesData.map((r) => r._id) : []}
                style={{ backgroundColor: "transparent" }}
              >
                {rolesData.map((role) => (
                  <Collapse.Panel
                    key={role._id}
                    header={
                      <Space>
                        <Text strong>{role.role_type}</Text>
                        {role.description && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            - {role.description}
                          </Text>
                        )}
                      </Space>
                    }
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                        gap: 12,
                        paddingTop: 8,
                      }}
                    >
                      {Object.entries(eventLabels).map(([eventKey, eventLabel]) => (
                        <Checkbox
                          key={eventKey}
                          checked={roleEvents[role.role_type]?.includes(eventKey)}
                          onChange={(e) => handleRoleEventToggle(role.role_type, eventKey, e.target.checked)}
                        >
                          {eventLabel}
                        </Checkbox>
                      ))}
                    </div>
                  </Collapse.Panel>
                ))}
              </Collapse>
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

// Helper component for event toggles
interface EventToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const EventToggle: React.FC<EventToggleProps> = ({ label, description, checked, onChange }) => {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <Text strong style={{ fontSize: 14, display: "block" }}>
          {label}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {description}
        </Text>
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        checkedChildren="ON"
        unCheckedChildren="OFF"
        style={{ minWidth: 48 }}
      />
    </div>
  );
};

export default NotificationSettings;
