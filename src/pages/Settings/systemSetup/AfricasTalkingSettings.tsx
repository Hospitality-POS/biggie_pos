import React, { useState } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  Space,
  Typography,
  Tag,
  message,
  Popconfirm,
  Alert,
  Steps,
} from "antd";
import {
  PhoneOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  UserOutlined,
  KeyOutlined,
  SettingOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAfricasTalkingAccount,
  getAfricasTalkingAccounts,
  updateAfricasTalkingAccount,
  deleteAfricasTalkingAccount,
} from "@services/twilio";
import { getPermissionChecker } from "@utils/getPermissionChecker";

const { Title, Text } = Typography;
const { Option } = Select;

interface AfricasTalkingAccount {
  _id: string;
  username: string;
  voice_phone_number: string;
  whatsapp_phone_number: string;
  sms_sender_id: string;
  account_type: string;
  capabilities: {
    voice: boolean;
    whatsapp: boolean;
    sms: boolean;
    ussd: boolean;
  };
  is_active: boolean;
  is_default: boolean;
  friendly_name: string;
  created_at: string;
  updated_at: string;
}

const AfricasTalkingSettings: React.FC = () => {
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AfricasTalkingAccount | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const [accountForm] = Form.useForm();

  const queryClient = useQueryClient();
  const shopId = localStorage.getItem("shopId");

  // Permission checks
  const can = getPermissionChecker();
  const canViewAfricasTalking = can("AFRICASTALKING_VIEW");
  const canManageAccounts = can("AFRICASTALKING_MANAGE_ACCOUNTS");

  // ─────────────────────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────────────────────

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ["africasTalkingAccounts", shopId],
    queryFn: () => getAfricasTalkingAccounts(shopId || ""),
    enabled: !!shopId,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MUTATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const createAccountMutation = useMutation({
    mutationFn: (data: any) => createAfricasTalkingAccount(data),
    onSuccess: () => {
      message.success("Africa's Talking account created successfully");
      setAccountModalVisible(false);
      accountForm.resetFields();
      queryClient.invalidateQueries(["africasTalkingAccounts"]);
    },
    onError: (error: any) => {
      message.error(error.message || "Failed to create account");
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateAfricasTalkingAccount(id, data),
    onSuccess: () => {
      message.success("Account updated successfully");
      setAccountModalVisible(false);
      setEditingAccount(null);
      accountForm.resetFields();
      queryClient.invalidateQueries(["africasTalkingAccounts"]);
    },
    onError: (error: any) => {
      message.error(error.message || "Failed to update account");
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => deleteAfricasTalkingAccount(id),
    onSuccess: () => {
      message.success("Account deleted successfully");
      queryClient.invalidateQueries(["africasTalkingAccounts"]);
    },
    onError: (error: any) => {
      message.error(error.message || "Failed to delete account");
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleCreateAccount = () => {
    setEditingAccount(null);
    accountForm.resetFields();
    setAccountModalVisible(true);
  };

  const handleEditAccount = (account: AfricasTalkingAccount) => {
    setEditingAccount(account);
    accountForm.setFieldsValue({
      username: account.username,
      voice_phone_number: account.voice_phone_number,
      whatsapp_phone_number: account.whatsapp_phone_number,
      sms_sender_id: account.sms_sender_id,
      account_type: account.account_type,
      capabilities: account.capabilities,
      friendly_name: account.friendly_name,
      is_active: account.is_active,
    });
    setAccountModalVisible(true);
  };

  const handleDeleteAccount = (id: string) => {
    deleteAccountMutation.mutate(id);
  };

  const handleAccountSubmit = async () => {
    try {
      // Validate all fields regardless of current step
      const values = await accountForm.validateFields([
        'friendly_name',
        'username',
        'api_key',
        'voice_phone_number',
        'whatsapp_phone_number',
        'account_type',
      ]);
      
      // Ensure capabilities have default values
      const capabilities = values.capabilities || {
        voice: true,
        whatsapp: true,
        sms: true,
        ussd: false,
      };
      
      const formData = {
        ...values,
        capabilities,
        shop_id: shopId,
        is_active: values.is_active !== undefined ? values.is_active : true,
      };
      
      if (editingAccount) {
        updateAccountMutation.mutate({
          id: editingAccount._id,
          data: formData,
        });
      } else {
        createAccountMutation.mutate(formData);
      }
    } catch (error) {
      console.error("Form validation error:", error);
      message.error("Please fill in all required fields");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (!canViewAfricasTalking) {
    return (
      <Card>
        <Alert
          message="You don't have permission to view Africa's Talking settings"
          type="error"
          showIcon
        />
      </Card>
    );
  }

  const accountColumns = [
    {
      title: "Friendly Name",
      dataIndex: "friendly_name",
      key: "friendly_name",
    },
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "Voice Number",
      dataIndex: "voice_phone_number",
      key: "voice_phone_number",
    },
    {
      title: "WhatsApp Number",
      dataIndex: "whatsapp_phone_number",
      key: "whatsapp_phone_number",
    },
    {
      title: "SMS Sender ID",
      dataIndex: "sms_sender_id",
      key: "sms_sender_id",
    },
    {
      title: "Type",
      dataIndex: "account_type",
      key: "account_type",
      render: (type: string) => (
        <Tag color={type === "production" ? "green" : "orange"}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Default",
      dataIndex: "is_default",
      key: "is_default",
      render: (isDefault: boolean) => (isDefault ? "Yes" : "-"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: AfricasTalkingAccount) => (
        <Space size="small">
          {canManageAccounts && (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEditAccount(record)}
              >
                Edit
              </Button>
              <Popconfirm
                title="Are you sure you want to delete this account?"
                onConfirm={() => handleDeleteAccount(record._id)}
                okText="Yes"
                cancelText="No"
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
            <PhoneOutlined /> Africa's Talking Settings
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Manage your Africa's Talking account for voice, WhatsApp, and SMS services
          </Text>
        </div>
        {canManageAccounts && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateAccount}
            size="large"
          >
            Add Account
          </Button>
        )}
      </div>

      <Card>
        <Table
          columns={accountColumns}
          dataSource={accounts?.accounts || []}
          loading={accountsLoading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
          size="middle"
        />
      </Card>

      {/* Account Modal */}
      <Modal
        title={editingAccount ? "Edit Account" : "Add Account"}
        open={accountModalVisible}
        onCancel={() => {
          setAccountModalVisible(false);
          setEditingAccount(null);
          accountForm.resetFields();
          setCurrentStep(0);
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>
              Previous
            </Button>
            <Space>
              <Button onClick={() => {
                setAccountModalVisible(false);
                setEditingAccount(null);
                accountForm.resetFields();
                setCurrentStep(0);
              }}>
                Cancel
              </Button>
              {currentStep === 2 ? (
                <Button 
                  type="primary" 
                  onClick={handleAccountSubmit}
                  loading={createAccountMutation.isPending || updateAccountMutation.isPending}
                >
                  {editingAccount ? 'Update' : 'Create'}
                </Button>
              ) : (
                <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
                  Next
                </Button>
              )}
            </Space>
          </div>
        }
        width={700}
      >
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          <Steps.Step title="Credentials" icon={<KeyOutlined />} />
          <Steps.Step title="Phone Numbers" icon={<PhoneOutlined />} />
          <Steps.Step title="Settings" icon={<SettingOutlined />} />
        </Steps>

        <Form form={accountForm} layout="vertical">
          {currentStep === 0 && (
            <div>
              <Alert
                message="Step 1: Account Credentials"
                description="Enter your Africa's Talking account credentials"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form.Item
                label="Friendly Name"
                name="friendly_name"
                rules={[{ required: true, message: "Please enter a friendly name" }]}
              >
                <Input placeholder="e.g., Main Kenya Account" prefix={<UserOutlined />} />
              </Form.Item>

              <Form.Item
                label="Username"
                name="username"
                rules={[{ required: true, message: "Please enter your Africa's Talking username" }]}
              >
                <Input placeholder="Your Africa's Talking username" prefix={<UserOutlined />} />
              </Form.Item>

              <Form.Item
                label="API Key"
                name="api_key"
                rules={[{ required: true, message: "Please enter your API key" }]}
              >
                <Input.Password placeholder="Your Africa's Talking API key" prefix={<KeyOutlined />} />
              </Form.Item>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <Alert
                message="Step 2: Phone Numbers"
                description="Configure your phone numbers for voice, WhatsApp, and SMS"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form.Item
                label="Voice Phone Number"
                name="voice_phone_number"
                rules={[{ required: true, message: "Please enter voice phone number" }]}
              >
                <Input placeholder="+254711XXXYYY" prefix={<PhoneOutlined />} />
              </Form.Item>

              <Form.Item
                label="WhatsApp Phone Number"
                name="whatsapp_phone_number"
                rules={[{ required: true, message: "Please enter WhatsApp phone number" }]}
              >
                <Input placeholder="+254711XXXYYY" prefix={<PhoneOutlined />} />
              </Form.Item>

              <Form.Item label="SMS Sender ID" name="sms_sender_id">
                <Input placeholder="MTEJA" />
              </Form.Item>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <Alert
                message="Step 3: Account Settings"
                description="Configure account type and capabilities"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form.Item
                label="Account Type"
                name="account_type"
                rules={[{ required: true, message: "Please select account type" }]}
              >
                <Select placeholder="Select account type">
                  <Option value="sandbox">Sandbox (Testing)</Option>
                  <Option value="production">Production (Live)</Option>
                </Select>
              </Form.Item>

              <Form.Item label="Capabilities" name="capabilities">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Voice Calling</span>
                    <Form.Item name={["capabilities", "voice"]} valuePropName="checked" noStyle>
                      <Switch checkedChildren={<CheckCircleOutlined />} />
                    </Form.Item>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>WhatsApp Messaging</span>
                    <Form.Item name={["capabilities", "whatsapp"]} valuePropName="checked" noStyle>
                      <Switch checkedChildren={<CheckCircleOutlined />} />
                    </Form.Item>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>SMS Messaging</span>
                    <Form.Item name={["capabilities", "sms"]} valuePropName="checked" noStyle>
                      <Switch checkedChildren={<CheckCircleOutlined />} />
                    </Form.Item>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>USSD Services</span>
                    <Form.Item name={["capabilities", "ussd"]} valuePropName="checked" noStyle>
                      <Switch checkedChildren={<CheckCircleOutlined />} />
                    </Form.Item>
                  </div>
                </Space>
              </Form.Item>

              <Form.Item label="Account Status" name="is_active" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default AfricasTalkingSettings;
