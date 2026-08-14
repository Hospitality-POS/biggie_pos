import React, { useState } from "react";
import {
  Card,
  Tabs,
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Space,
  Typography,
  Tag,
  message,
  Divider,
  Popconfirm,
  Badge,
  Alert,
} from "antd";
import {
  PhoneOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTwilioAccounts,
  createTwilioAccount,
  updateTwilioAccount,
  deleteTwilioAccount,
  testTwilioCredentials,
  getPhoneNumbers,
  provisionPhoneNumber,
  updatePhoneNumber,
  releasePhoneNumber,
  searchAvailableNumbers,
} from "@services/twilio";
import {
  TwilioAccount,
  TwilioPhoneNumber,
  AvailableNumber,
  TwilioAccountFormData,
  PhoneNumberFormData,
} from "@types/twilio";
import { getPermissionChecker } from "@utils/getPermissionChecker";
import { fetchAllUsersList } from "@services/users";

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const TwilioSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState("accounts");
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [searchNumbersModalVisible, setSearchNumbersModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TwilioAccount | null>(null);
  const [editingPhone, setEditingPhone] = useState<TwilioPhoneNumber | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<AvailableNumber[]>([]);

  const [accountForm] = Form.useForm();
  const [phoneForm] = Form.useForm();
  const [searchForm] = Form.useForm();

  const queryClient = useQueryClient();
  const shopId = localStorage.getItem("shopId");
  const userId = localStorage.getItem("userId");

  // Permission checks
  const can = getPermissionChecker();
  const canViewTwilio = can("TWILIO_VIEW");
  const canManageAccounts = can("TWILIO_MANAGE_ACCOUNTS");
  const canManagePhoneNumbers = can("TWILIO_MANAGE_PHONE_NUMBERS");
  const canManageWorkflows = can("TWILIO_MANAGE_WORKFLOWS");

  // ─────────────────────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────────────────────

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ["twilioAccounts", shopId],
    queryFn: () => getTwilioAccounts(shopId || ""),
    enabled: !!shopId,
  });

  const { data: phoneNumbers, isLoading: phonesLoading } = useQuery({
    queryKey: ["twilioPhoneNumbers", shopId],
    queryFn: () => getPhoneNumbers(shopId || ""),
    enabled: !!shopId,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-list", shopId],
    queryFn: () => fetchAllUsersList({ shop_id: shopId }),
    enabled: !!shopId,
    staleTime: 60_000,
  });

  const users = Array.isArray(usersData) ? usersData : [];

  // ─────────────────────────────────────────────────────────────────────────────
  // MUTATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const createAccountMutation = useMutation({
    mutationFn: (data: TwilioAccountFormData & { shop_id: string }) =>
      createTwilioAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["twilioAccounts"] });
      setAccountModalVisible(false);
      accountForm.resetFields();
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ accountId, data }: { accountId: string; data: Partial<TwilioAccount> }) =>
      updateTwilioAccount(accountId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["twilioAccounts"] });
      setAccountModalVisible(false);
      setEditingAccount(null);
      accountForm.resetFields();
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteTwilioAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["twilioAccounts"] });
      message.success("Account deleted successfully");
    },
  });

  const testCredentialsMutation = useMutation({
    mutationFn: testTwilioCredentials,
  });

  const provisionPhoneMutation = useMutation({
    mutationFn: (data: PhoneNumberFormData & { shop_id: string }) =>
      provisionPhoneNumber(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["twilioPhoneNumbers"] });
      setPhoneModalVisible(false);
      phoneForm.resetFields();
      setSelectedNumbers([]);
    },
  });

  const updatePhoneMutation = useMutation({
    mutationFn: ({ phoneId, data }: { phoneId: string; data: Partial<TwilioPhoneNumber> }) =>
      updatePhoneNumber(phoneId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["twilioPhoneNumbers"] });
      setPhoneModalVisible(false);
      setEditingPhone(null);
      phoneForm.resetFields();
    },
  });

  const releasePhoneMutation = useMutation({
    mutationFn: releasePhoneNumber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["twilioPhoneNumbers"] });
      message.success("Phone number released successfully");
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

  const handleEditAccount = (account: TwilioAccount) => {
    setEditingAccount(account);
    accountForm.setFieldsValue({
      account_type: account.account_type,
      account_sid: account.account_sid || "",
      auth_token: account.auth_token || "",
      monthly_spend_limit: account.monthly_spend_limit,
      capabilities: account.capabilities,
    });
    setAccountModalVisible(true);
  };

  const handleAccountSubmit = async (values: TwilioAccountFormData) => {
    if (editingAccount) {
      updateAccountMutation.mutate({
        accountId: editingAccount._id || editingAccount.id,
        data: values,
      });
    } else {
      createAccountMutation.mutate({
        ...values,
        shop_id: shopId || "",
      });
    }
  };

  const handleTestCredentials = async () => {
    const values = accountForm.getFieldsValue();
    if (!values.account_sid || !values.auth_token) {
      message.error("Please enter Account SID and Auth Token to test");
      return;
    }
    try {
      await testCredentialsMutation.mutateAsync({
        account_sid: values.account_sid,
        auth_token: values.auth_token,
      });
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleProvisionPhone = () => {
    setEditingPhone(null);
    phoneForm.resetFields();
    setPhoneModalVisible(true);
  };

  const handleEditPhone = (phone: TwilioPhoneNumber) => {
    setEditingPhone(phone);
    phoneForm.setFieldsValue({
      twilio_account_id: phone.twilio_account_id || phone.twilioAccountId,
      phone_number: phone.phone_number,
      number_source: phone.number_source || "existing",
      friendly_name: phone.friendly_name,
      whatsapp_enabled: phone.whatsapp_enabled,
      assigned_to: phone.assigned_to,
      notes: phone.notes,
    });
    setPhoneModalVisible(true);
  };

  const handlePhoneSubmit = async (values: Partial<TwilioPhoneNumber>) => {
    if (editingPhone) {
      updatePhoneMutation.mutate({
        phoneId: editingPhone._id || editingPhone.id,
        data: values,
      });
    } else {
      const numberSource = phoneForm.getFieldValue("number_source");
      if (numberSource === "provision") {
        if (selectedNumbers.length === 0) {
          message.error("Please search and select a phone number first");
          return;
        }
        provisionPhoneMutation.mutate({
          ...values,
          shop_id: shopId || "",
          phone_number: selectedNumbers[0].phone_number,
        });
      } else {
        // Add existing number
        provisionPhoneMutation.mutate({
          ...values,
          shop_id: shopId || "",
          phone_number: values.phone_number,
        });
      }
    }
  };

  const handleSearchNumbers = async () => {
    const values = searchForm.getFieldsValue();
    try {
      const result = await searchAvailableNumbers({
        country_code: values.country_code,
        area_code: values.area_code,
        contains: values.contains,
        limit: 10,
      });
      setSelectedNumbers(result.available_numbers || []);
      message.success(`Found ${result.total} available numbers`);
    } catch (error) {
      // Error already handled
    }
  };

  const handleSelectNumber = (number: AvailableNumber) => {
    setSelectedNumbers([number]);
    phoneForm.setFieldsValue({
      phone_number: number.phone_number,
      friendly_name: number.friendly_name,
    });
    setSearchNumbersModalVisible(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TABLE COLUMNS
  // ─────────────────────────────────────────────────────────────────────────────

  const accountColumns = [
    {
      title: "Account Type",
      dataIndex: "account_type",
      key: "account_type",
      render: (type: string) => (
        <Tag color={type === "platform" ? "blue" : "green"}>{type}</Tag>
      ),
    },
    {
      title: "Account SID",
      dataIndex: "account_sid",
      key: "account_sid",
      render: (sid: string) => sid ? sid.substring(0, 12) + "..." : "Platform",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Badge
          status={status === "active" ? "success" : "error"}
          text={status}
        />
      ),
    },
    {
      title: "Capabilities",
      dataIndex: "capabilities",
      key: "capabilities",
      render: (caps: { voice: boolean; sms: boolean; whatsapp: boolean }) => (
        <Space>
          {caps.voice && <Tag color="blue">Voice</Tag>}
          {caps.sms && <Tag color="green">SMS</Tag>}
          {caps.whatsapp && <Tag color="orange">WhatsApp</Tag>}
        </Space>
      ),
    },
    {
      title: "Monthly Limit",
      dataIndex: "monthly_spend_limit",
      key: "monthly_spend_limit",
      render: (limit: number) => `$${limit || 0}`,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: TwilioAccount) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditAccount(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this account?"
            onConfirm={() => deleteAccountMutation.mutate(record._id || record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const phoneColumns = [
    {
      title: "Phone Number",
      dataIndex: "phone_number",
      key: "phone_number",
      render: (phone: string) => <Text strong>{phone}</Text>,
    },
    {
      title: "Friendly Name",
      dataIndex: "friendly_name",
      key: "friendly_name",
    },
    {
      title: "Type",
      dataIndex: "phone_type",
      key: "phone_type",
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: "Capabilities",
      dataIndex: "capabilities",
      key: "capabilities",
      render: (caps: { voice: boolean; sms: boolean; whatsapp: boolean }) => (
        <Space size="small">
          {caps.voice && <Tag color="blue">Voice</Tag>}
          {caps.sms && <Tag color="green">SMS</Tag>}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Badge
          status={status === "active" ? "success" : "default"}
          text={status}
        />
      ),
    },
    {
      title: "WhatsApp",
      dataIndex: "whatsapp_enabled",
      key: "whatsapp_enabled",
      render: (enabled: boolean) => (
        <Tag color={enabled ? "green" : "default"}>{enabled ? "Enabled" : "Disabled"}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: TwilioPhoneNumber) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditPhone(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to release this number?"
            onConfirm={() => releasePhoneMutation.mutate(record._id || record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Release
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (!canViewTwilio) {
    return (
      <div style={{ padding: "24px" }}>
        <Alert
          message="Access Denied"
          description="You don't have permission to view Twilio settings."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      <Title level={3}>Call Center Configure</Title>
      <Text type="secondary">Manage your Twilio account, phone numbers, and voice calling features</Text>

      <Divider />

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* ACCOUNTS TAB */}
        {canManageAccounts && (
          <TabPane tab="Accounts" key="accounts">
            <Card
              title="Twilio Accounts"
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateAccount}
                >
                  Add Account
                </Button>
              }
            >
              <Table
                columns={accountColumns}
                dataSource={accounts?.accounts || []}
                loading={accountsLoading}
                rowKey="id"
                pagination={false}
              />
            </Card>
          </TabPane>
        )}

        {/* PHONE NUMBERS TAB */}
        {canManagePhoneNumbers && (
          <TabPane tab="Phone Numbers" key="phones">
            <Card
              title="Phone Numbers"
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleProvisionPhone}
                >
                  Add Phone Number
                </Button>
              }
            >
              <Table
                columns={phoneColumns}
                dataSource={phoneNumbers?.phone_numbers || []}
                loading={phonesLoading}
                rowKey="id"
                pagination={false}
              />
            </Card>
          </TabPane>
        )}

        {/* WORKFLOWS TAB */}
        {canManageWorkflows && (
          <TabPane tab="Workflows" key="workflows">
            <Card title="Workflow Automation">
              <Alert
                message="Workflow Automation"
                description="Create automated workflows with Twilio actions for lead management. Configure triggers, delays, and actions like calls, SMS, and WhatsApp messages."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={() => window.location.href = "/crm/workflows"}
              >
                Go to Workflows
              </Button>
            </Card>
          </TabPane>
        )}
      </Tabs>

      {/* ACCOUNT MODAL */}
      <Modal
        title={editingAccount ? "Edit Twilio Account" : "Create Twilio Account"}
        open={accountModalVisible}
        onCancel={() => {
          setAccountModalVisible(false);
          setEditingAccount(null);
          accountForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => setAccountModalVisible(false)}>
            Cancel
          </Button>,
          !editingAccount && (
            <Button
              key="test"
              onClick={handleTestCredentials}
              loading={testCredentialsMutation.isLoading}
            >
              Test Credentials
            </Button>
          ),
          <Button
            key="submit"
            type="primary"
            onClick={() => accountForm.submit()}
            loading={createAccountMutation.isLoading || updateAccountMutation.isLoading}
          >
            {editingAccount ? "Update" : "Create"}
          </Button>,
        ]}
      >
        <Form form={accountForm} layout="vertical" onFinish={handleAccountSubmit}>
          <Form.Item
            label="Account Type"
            name="account_type"
            initialValue="platform"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="platform">Platform (Shared)</Option>
              <Option value="tenant">Tenant (Dedicated)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.account_type !== currentValues.account_type
            }
          >
            {({ getFieldValue }) => {
              const isPlatform = getFieldValue("account_type") === "platform";
              return (
                <>
                  <Form.Item
                    label="Account SID"
                    name="account_sid"
                    rules={[{ required: true }]}
                    extra={isPlatform ? "Please enter Account SID to test connection" : undefined}
                  >
                    <Input placeholder="ACxxxxxxxxxx" />
                  </Form.Item>
                  <Form.Item
                    label="Auth Token"
                    name="auth_token"
                    rules={[{ required: isPlatform }]}
                    extra={isPlatform ? "Please enter Auth Token to test connection" : undefined}
                  >
                    <Input.Password placeholder="Your auth token" />
                  </Form.Item>
                </>
              );
            }}
          </Form.Item>

          <Form.Item
            label="Monthly Spend Limit ($)"
            name="monthly_spend_limit"
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Capabilities" name="capabilities">
            <Space direction="vertical">
              <Form.Item name={["capabilities", "voice"]} valuePropName="checked" noStyle>
                <Switch /> Voice
              </Form.Item>
              <Form.Item name={["capabilities", "sms"]} valuePropName="checked" noStyle>
                <Switch /> SMS
              </Form.Item>
              <Form.Item name={["capabilities", "whatsapp"]} valuePropName="checked" noStyle>
                <Switch /> WhatsApp
              </Form.Item>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* PHONE NUMBER MODAL */}
      <Modal
        title={editingPhone ? "Edit Phone Number" : "Provision Phone Number"}
        open={phoneModalVisible}
        onCancel={() => {
          setPhoneModalVisible(false);
          setEditingPhone(null);
          phoneForm.resetFields();
          setSelectedNumbers([]);
        }}
        footer={[
          <Button key="cancel" onClick={() => setPhoneModalVisible(false)}>
            Cancel
          </Button>,
          !editingPhone && (
            <Button
              key="search"
              icon={<SearchOutlined />}
              onClick={() => setSearchNumbersModalVisible(true)}
            >
              Search Numbers
            </Button>
          ),
          <Button
            key="submit"
            type="primary"
            onClick={() => phoneForm.submit()}
            loading={provisionPhoneMutation.isLoading || updatePhoneMutation.isLoading}
          >
            {editingPhone ? "Update" : "Provision"}
          </Button>,
        ]}
        width={600}
      >
        <Form form={phoneForm} layout="vertical" onFinish={handlePhoneSubmit}>
          <Form.Item
            label="Twilio Account"
            name="twilio_account_id"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select account">
              {accounts?.accounts?.map((account: TwilioAccount) => (
                <Option key={account._id || account.id} value={account._id || account.id}>
                  {account.account_type} - {account.account_sid?.substring(0, 12)}...
                </Option>
              ))}
            </Select>
          </Form.Item>

          {!editingPhone && (
            <>
              <Form.Item
                label="Number Source"
                name="number_source"
                initialValue="provision"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="provision">Provision New Number</Option>
                  <Option value="existing">Add Existing Number</Option>
                </Select>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.number_source !== currentValues.number_source
                }
              >
                {({ getFieldValue }) => {
                  const numberSource = getFieldValue("number_source");
                  return numberSource === "provision" ? (
                    <>
                      <Form.Item
                        label="Phone Type"
                        name="phone_type"
                        initialValue="local"
                        rules={[{ required: true }]}
                      >
                        <Select>
                          <Option value="local">Local</Option>
                          <Option value="mobile">Mobile</Option>
                          <Option value="toll-free">Toll-Free</Option>
                          <Option value="voip">VoIP</Option>
                        </Select>
                      </Form.Item>

                      <Form.Item
                        label="Country Code"
                        name="country_code"
                        initialValue="KE"
                        rules={[{ required: true }]}
                      >
                        <Select>
                          <Option value="KE">Kenya (+254)</Option>
                          <Option value="US">US (+1)</Option>
                          <Option value="GB">GB (+44)</Option>
                          <Option value="CA">CA (+1)</Option>
                          <Option value="AU">AU (+61)</Option>
                        </Select>
                      </Form.Item>

                      {selectedNumbers.length > 0 && (
                        <Alert
                          message="Selected Number"
                          description={selectedNumbers[0].phone_number}
                          type="success"
                          showIcon
                          style={{ marginBottom: 16 }}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <Form.Item
                        label="Phone Number"
                        name="phone_number"
                        rules={[{ required: true, message: "Please enter the phone number" }]}
                      >
                        <Input placeholder="+254712345678" />
                      </Form.Item>
                      <Alert
                        message="Add Existing Number"
                        description="Enter an existing Twilio phone number to add it to your account. The number must already be owned by your Twilio account."
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    </>
                  );
                }}
              </Form.Item>
            </>
          )}

          <Form.Item 
            label="Phone Number" 
            name="phone_number"
            rules={[{ required: true, message: "Please enter the phone number" }]}
          >
            {editingPhone ? (
              <Input 
                placeholder="+254712345678" 
                disabled={editingPhone.number_source === "provision"}
                addonAfter={editingPhone.number_source === "provision" ? "Provisioned" : "Existing"}
              />
            ) : (
              <Input placeholder="+254712345678" />
            )}
          </Form.Item>

          <Form.Item label="Friendly Name" name="friendly_name">
            <Input placeholder="Support Line" />
          </Form.Item>

          <Form.Item label="WhatsApp Enabled" name="whatsapp_enabled" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Assigned To" name="assigned_to">
            <Select 
              placeholder="Select agent (optional)"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {users.map((user: any) => (
                <Option key={user._id} value={user._id}>
                  {user.fullname || user.email || user.username}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={3} placeholder="Additional notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* SEARCH NUMBERS MODAL */}
      <Modal
        title="Search Available Numbers"
        open={searchNumbersModalVisible}
        onCancel={() => setSearchNumbersModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setSearchNumbersModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="search"
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearchNumbers}
          >
            Search
          </Button>,
        ]}
      >
        <Form form={searchForm} layout="vertical">
          <Form.Item
            label="Country Code"
            name="country_code"
            initialValue="KE"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="KE">Kenya (+254)</Option>
              <Option value="US">US (+1)</Option>
              <Option value="GB">GB (+44)</Option>
              <Option value="CA">CA (+1)</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Area Code (Optional)" name="area_code">
            <Input placeholder="415" />
          </Form.Item>

          <Form.Item label="Contains (Optional)" name="contains">
            <Input placeholder="555" />
          </Form.Item>
        </Form>

        {selectedNumbers.length > 0 && (
          <>
            <Divider />
            <Text strong>Available Numbers:</Text>
            <div style={{ marginTop: 8, maxHeight: 200, overflowY: "auto" }}>
              {selectedNumbers.map((number, index) => (
                <Card
                  key={index}
                  size="small"
                  hoverable
                  onClick={() => handleSelectNumber(number)}
                  style={{ marginBottom: 8, cursor: "pointer" }}
                >
                  <Space>
                    <PhoneOutlined />
                    <Text strong>{number.phone_number}</Text>
                    <Text type="secondary">{number.locality}, {number.region}</Text>
                  </Space>
                </Card>
              ))}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default TwilioSettings;
