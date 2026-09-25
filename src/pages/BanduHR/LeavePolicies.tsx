import React, { useState } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Modal,
  Form,
  InputNumber,
  Select,
  Switch,
  message,
  Row,
  Col,
  Divider,
  Empty,
  Segmented,
  Drawer,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ReloadOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchLeavePolicies,
  createLeavePolicy,
  updateLeavePolicy,
  deleteLeavePolicy,
  initializeLeaveBalances,
  type LeavePolicy,
  type CreateLeavePolicyParams,
} from "@services/bandu";
import { fetchAllDepartments } from "@services/crm/departments";
import { THEME_C } from "@utils/getPrimaryColor";

const { Title, Text } = Typography;
const { Option } = Select;

const C = THEME_C;

const LEAVE_TYPES = [
  "Annual Leave",
  "Sick Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Compassionate Leave",
  "Study Leave",
  "Unpaid Leave",
  "Other",
];

// Common policy templates — auto-fill the form on selection
const tplType = (
  name: string,
  default_days: number,
  opts: { is_paid?: boolean; carry_forward?: boolean; requires_document?: boolean; max_carry_forward?: number } = {}
) => ({
  name,
  default_days,
  max_days: default_days,
  requires_document: opts.requires_document ?? false,
  is_paid: opts.is_paid ?? true,
  accrual_rate: 0,
  carry_forward: opts.carry_forward ?? false,
  max_carry_forward: opts.carry_forward ? (opts.max_carry_forward ?? 5) : 0,
  min_service_months: 0,
});

const POLICY_TEMPLATES: {
  key: string;
  name: string;
  description: string;
  values: Partial<CreateLeavePolicyParams>;
}[] = [
  {
    key: "kenya_standard",
    name: "Standard (Kenya)",
    description: "Statutory Kenyan leave entitlement",
    values: {
      pro_rata_calculation: "calendar_year" as any,
      approval_settings: {
        auto_approve_days: 0,
        max_consecutive_days: 30,
        notice_period_days: 7,
      },
      leave_types: [
        tplType("Annual Leave", 21, { carry_forward: true }),
        tplType("Sick Leave", 14, { requires_document: true }),
        tplType("Maternity Leave", 90, { requires_document: true }),
        tplType("Paternity Leave", 14, { requires_document: true }),
        tplType("Compassionate Leave", 5),
        tplType("Unpaid Leave", 30, { is_paid: false }),
      ],
    },
  },
  {
    key: "basic",
    name: "Basic",
    description: "Minimal annual + sick coverage",
    values: {
      pro_rata_calculation: "calendar_year" as any,
      approval_settings: {
        auto_approve_days: 1,
        max_consecutive_days: 14,
        notice_period_days: 3,
      },
      leave_types: [
        tplType("Annual Leave", 15),
        tplType("Sick Leave", 7, { requires_document: true }),
      ],
    },
  },
  {
    key: "generous",
    name: "Extended",
    description: "Higher allowances with study leave",
    values: {
      pro_rata_calculation: "employment_year" as any,
      approval_settings: {
        auto_approve_days: 2,
        max_consecutive_days: 30,
        notice_period_days: 14,
      },
      leave_types: [
        tplType("Annual Leave", 25, { carry_forward: true }),
        tplType("Sick Leave", 21, { requires_document: true }),
        tplType("Maternity Leave", 90, { requires_document: true }),
        tplType("Paternity Leave", 14, { requires_document: true }),
        tplType("Study Leave", 10, { requires_document: true }),
      ],
    },
  },
];

const LeavePolicies: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<LeavePolicy | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [viewPolicy, setViewPolicy] = useState<LeavePolicy | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Fetch leave policies
  const { data: policiesData, isLoading } = useQuery({
    queryKey: ["leave-policies"],
    queryFn: () => fetchLeavePolicies({}),
  });

  const policies = Array.isArray(policiesData) ? policiesData : policiesData?.data || [];

  // Fetch departments
  const { data: departmentsData } = useQuery({
    queryKey: ["departments-list"],
    queryFn: () => fetchAllDepartments({ is_active: true }),
  });

  const departments = departmentsData?.departments || [];

  // Create policy mutation
  const createMutation = useMutation({
    mutationFn: createLeavePolicy,
    onSuccess: () => {
      message.success("Leave policy created successfully");
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["leave-policies"] });
    },
  });

  // Update policy mutation
  const updateMutation = useMutation({
    mutationFn: ({ policyId, params }: { policyId: string; params: Partial<CreateLeavePolicyParams> }) =>
      updateLeavePolicy(policyId, params),
    onSuccess: () => {
      message.success("Leave policy updated successfully");
      setIsModalVisible(false);
      setSelectedPolicy(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["leave-policies"] });
    },
  });

  // Delete policy mutation
  const deleteMutation = useMutation({
    mutationFn: deleteLeavePolicy,
    onSuccess: () => {
      message.success("Leave policy deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["leave-policies"] });
    },
  });

  // Initialize balances mutation
  const initializeMutation = useMutation({
    mutationFn: initializeLeaveBalances,
    onSuccess: () => {
      message.success("Leave balances initialized successfully");
    },
  });

  const columns = [
    {
      title: "Department",
      dataIndex: ["department_id", "name"],
      key: "department_name",
      render: (name: string, record: LeavePolicy) => (
        <Space>
          {!record.department_id && <Tag color="blue">Default</Tag>}
          <Text>{name || "All Departments"}</Text>
        </Space>
      ),
    },
    {
      title: "Leave Types",
      dataIndex: "leave_types",
      key: "leave_types",
      render: (types: any[]) => (
        <Space direction="vertical" size="small">
          {types.map((type, index) => (
            <Tag key={index} color="green">
              {type.leave_type} ({type.default_days} days)
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Auto-Approve Days",
      dataIndex: "auto_approve_days",
      key: "auto_approve_days",
      render: (days: number) => <Text>{days} days</Text>,
    },
    {
      title: "Max Consecutive",
      dataIndex: "max_consecutive_days",
      key: "max_consecutive_days",
      render: (days: number) => <Text>{days} days</Text>,
    },
    {
      title: "Notice Period",
      dataIndex: "notice_period_days",
      key: "notice_period_days",
      render: (days: number) => <Text>{days} days</Text>,
    },
    {
      title: "Pro-Rata Calculation",
      dataIndex: "pro_rata_calculation",
      key: "pro_rata_calculation",
      render: (value: string) => <Tag color="orange">{value}</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 300,
      render: (_: unknown, record: LeavePolicy) => (
        <Space size={0}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setViewPolicy(record)}
          >
            View
          </Button>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedPolicy(record);
              form.setFieldsValue(record);
              setIsModalVisible(true);
            }}
          >
            Edit
          </Button>
          <Button
            type="text"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => {
              Modal.confirm({
                title: "Initialize Leave Balances",
                content: "This will create leave balance records for all employees based on this policy. Continue?",
                onOk: async () => {
                  try {
                    await initializeMutation.mutateAsync(record._id);
                  } catch (error) {
                    // Error handled by mutation
                  }
                },
              });
            }}
          >
            Init Balances
          </Button>
          {!record.is_default && (
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: "Delete Policy",
                  content: "Are you sure you want to delete this leave policy?",
                  onOk: async () => {
                    try {
                      await deleteMutation.mutateAsync(record._id);
                    } catch (error) {
                      // Error handled by mutation
                    }
                  },
                });
              }}
            >
              Delete
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleSubmit = async (values: CreateLeavePolicyParams) => {
    try {
      if (selectedPolicy) {
        await updateMutation.mutateAsync({ policyId: selectedPolicy._id, params: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: C.darkText }}>
            <FileTextOutlined style={{ marginRight: 8, color: C.primary }} />
            Leave Policies
          </Title>
          <Text style={{ fontSize: 12, color: "#64748b" }}>
            {policies.length} polic{policies.length !== 1 ? "ies" : "y"} configured
          </Text>
        </div>
        <Space wrap>
          <Segmented
            value={viewMode}
            onChange={(v) => setViewMode(v as "list" | "cards")}
            options={[
              { label: "List", value: "list", icon: <UnorderedListOutlined /> },
              { label: "Cards", value: "cards", icon: <AppstoreOutlined /> },
            ]}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ["leave-policies"] })}
            loading={isLoading}
          >
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
            Create Policy
          </Button>
        </Space>
      </div>

      {viewMode === "list" ? (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          <Table
            columns={columns}
            dataSource={policies}
            loading={isLoading}
            rowKey="_id"
            size="small"
            pagination={{ pageSize: 10 }}
            onRow={(record: LeavePolicy) => ({
              onClick: () => setViewPolicy(record),
              style: { cursor: "pointer" },
            })}
            locale={{
              emptyText: (
                <Empty
                  description="No leave policies yet"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ padding: "32px 0" }}
                />
              ),
            }}
          />
        </div>
      ) : (
        <Row gutter={[12, 12]}>
          {policies.length === 0 && !isLoading && (
            <Col span={24}>
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "32px 0",
                }}
              >
                <Empty description="No leave policies yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            </Col>
          )}
          {policies.map((policy: LeavePolicy) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={policy._id}>
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  padding: 16,
                  cursor: "pointer",
                }}
                onClick={() => setViewPolicy(policy)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <Text strong style={{ fontSize: 13 }}>
                    {policy.department_name || (policy.department_id as any)?.name || "All Departments"}
                  </Text>
                  {policy.is_default && (
                    <Tag color="blue" style={{ margin: 0 }}>Default</Tag>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                  {policy.leave_types?.slice(0, 4).map((t: any, i: number) => (
                    <Tag key={i} style={{ margin: 0, fontSize: 11 }}>
                      {t.name} · {t.default_days}d
                    </Tag>
                  ))}
                  {policy.leave_types?.length > 4 && (
                    <Tag style={{ margin: 0, fontSize: 11 }}>+{policy.leave_types.length - 4}</Tag>
                  )}
                </div>
                <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>
                  Notice {policy.approval_settings?.notice_period_days ?? 0}d · Max{" "}
                  {policy.approval_settings?.max_consecutive_days ?? 0}d consecutive ·{" "}
                  {policy.pro_rata_calculation === "calendar_year"
                    ? "Calendar year"
                    : policy.pro_rata_calculation === "employment_year"
                      ? "Employment year"
                      : "Joining date"}
                </Text>
              </div>
            </Col>
          ))}
        </Row>
      )}

      {/* Policy detail drawer */}
      <Drawer
        title="Leave Policy"
        placement="right"
        width={480}
        open={!!viewPolicy}
        onClose={() => setViewPolicy(null)}
      >
        {viewPolicy && (
          <div>
            {/* Header */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                <Text strong style={{ fontSize: 15, display: "block" }}>
                  {viewPolicy.department_name ||
                    (viewPolicy.department_id as any)?.name ||
                    "All Departments"}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b" }}>
                  {viewPolicy.leave_types?.length || 0} leave type
                  {viewPolicy.leave_types?.length !== 1 ? "s" : ""}
                </Text>
              </div>
              {viewPolicy.is_default && <Tag color="blue">Default</Tag>}
            </div>

            {/* Leave types */}
            <Text style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 8 }}>
              LEAVE TYPES
            </Text>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "6px 16px",
                marginBottom: 16,
              }}
            >
              {(viewPolicy.leave_types || []).map((t: any, i: number) => (
                <div
                  key={i}
                  style={{
                    padding: "8px 0",
                    borderBottom: i < viewPolicy.leave_types.length - 1 ? "1px solid #f1f5f9" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text strong style={{ fontSize: 13 }}>{t.name}</Text>
                    <Text style={{ fontSize: 13 }}>{t.default_days} days</Text>
                  </div>
                  <Space size={4} wrap style={{ marginTop: 4 }}>
                    <Tag color={t.is_paid ? "green" : "default"} style={{ margin: 0, fontSize: 11 }}>
                      {t.is_paid ? "Paid" : "Unpaid"}
                    </Tag>
                    {t.carry_forward && (
                      <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                        Carry forward{t.max_carry_forward ? ` (max ${t.max_carry_forward}d)` : ""}
                      </Tag>
                    )}
                    {t.requires_document && (
                      <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>Document required</Tag>
                    )}
                  </Space>
                </div>
              ))}
            </div>

            {/* Approval settings */}
            <Text style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 8 }}>
              APPROVAL SETTINGS
            </Text>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "6px 16px",
                marginBottom: 16,
              }}
            >
              {[
                { label: "Auto-approve days", value: viewPolicy.approval_settings?.auto_approve_days },
                { label: "Max consecutive days", value: viewPolicy.approval_settings?.max_consecutive_days },
                { label: "Notice period", value: `${viewPolicy.approval_settings?.notice_period_days ?? 0} days` },
                {
                  label: "Pro-rata calculation",
                  value:
                    viewPolicy.pro_rata_calculation === "calendar_year"
                      ? "Calendar year"
                      : viewPolicy.pro_rata_calculation === "employment_year"
                        ? "Employment year"
                        : "Joining date",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #f1f5f9",
                    fontSize: 13,
                  }}
                >
                  <Text style={{ color: "#64748b" }}>{row.label}</Text>
                  <Text strong>{row.value ?? "—"}</Text>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                type="primary"
                icon={<EditOutlined />}
                block
                onClick={() => {
                  setSelectedPolicy(viewPolicy);
                  setViewPolicy(null);
                  form.setFieldsValue(viewPolicy);
                  setIsModalVisible(true);
                }}
              >
                Edit Policy
              </Button>
              {!viewPolicy.is_default && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: "Delete Policy",
                      content: "Are you sure you want to delete this leave policy?",
                      onOk: async () => {
                        try {
                          await deleteMutation.mutateAsync(viewPolicy._id);
                          setViewPolicy(null);
                        } catch (error) {
                          // Error handled by mutation
                        }
                      },
                    });
                  }}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Create/Edit Policy Modal */}
      <Modal
        title={selectedPolicy ? "Edit Leave Policy" : "Create Leave Policy"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setSelectedPolicy(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        {!selectedPolicy && (
          <>
            <Text style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 8 }}>
              Start from a common template (you can still edit everything):
            </Text>
            <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              {POLICY_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.key}
                  onClick={() => {
                    form.resetFields();
                    form.setFieldsValue(tpl.values as any);
                    message.success(`"${tpl.name}" template applied`);
                  }}
                  style={{
                    flex: 1,
                    minWidth: 150,
                    padding: "10px 14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    cursor: "pointer",
                    background: "#f8fafc",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.primary;
                    e.currentTarget.style.background = `${C.primary}08`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.background = "#f8fafc";
                  }}
                >
                  <Text strong style={{ fontSize: 13, display: "block" }}>
                    {tpl.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#64748b" }}>{tpl.description}</Text>
                </div>
              ))}
            </div>
            <Divider style={{ margin: "12px 0" }} />
          </>
        )}
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Department" name="department_id">
            <Select placeholder="Select department (leave empty for default policy)">
              {departments.map((dept: any) => (
                <Option key={dept._id} value={dept._id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Divider orientation="left">Leave Types</Divider>

          <Form.List name="leave_types">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" style={{ marginBottom: 16, position: "relative" }}>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                      style={{ position: "absolute", top: 8, right: 8 }}
                    >
                      Remove
                    </Button>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          {...restField}
                          name={[name, "name"]}
                          label="Leave Type"
                          rules={[{ required: true, message: "Required" }]}
                        >
                          <Select placeholder="Select leave type">
                            {LEAVE_TYPES.map((type) => (
                              <Option key={type} value={type}>
                                {type}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, "default_days"]}
                          label="Default Days"
                          rules={[{ required: true, message: "Required" }]}
                        >
                          <InputNumber min={0} style={{ width: "100%" }} placeholder="0" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, "max_days"]}
                          label="Max Days"
                          rules={[{ required: true, message: "Required" }]}
                        >
                          <InputNumber min={0} style={{ width: "100%" }} placeholder="0" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, "is_paid"]}
                          label="Is Paid"
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, "carry_forward"]}
                          label="Carry Forward"
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, "requires_document"]}
                          label="Requires Document"
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Leave Type
                </Button>
              </>
            )}
          </Form.List>

          <Divider orientation="left">Approval Settings</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={["approval_settings", "auto_approve_days"]}
                label="Auto-Approve Days"
                initialValue={0}
                tooltip="Days that are automatically approved without manager review"
              >
                <InputNumber min={0} style={{ width: "100%" }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={["approval_settings", "max_consecutive_days"]}
                label="Max Consecutive Days"
                initialValue={0}
                tooltip="Maximum consecutive days allowed per leave request"
              >
                <InputNumber min={0} style={{ width: "100%" }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={["approval_settings", "notice_period_days"]}
                label="Notice Period (Days)"
                initialValue={0}
                tooltip="Required notice period before taking leave"
              >
                <InputNumber min={0} style={{ width: "100%" }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="pro_rata_calculation"
            label="Pro-Rata Calculation Method"
            initialValue="calendar_year"
            rules={[{ required: true, message: "Required" }]}
            tooltip="How leave is calculated for new employees"
          >
            <Select placeholder="Select calculation method">
              <Option value="calendar_year">Calendar Year</Option>
              <Option value="employment_year">Employment Year</Option>
              <Option value="joining_date">Joining Date</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isLoading || updateMutation.isLoading}
              >
                {selectedPolicy ? "Update" : "Create"} Policy
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LeavePolicies;
