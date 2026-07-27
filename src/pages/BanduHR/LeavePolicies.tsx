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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
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

const { Title, Text } = Typography;
const { Option } = Select;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
};

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

const LeavePolicies: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<LeavePolicy | null>(null);
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
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: LeavePolicy) => (
        <Space>
          <Button
            type="link"
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
            type="link"
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
            Initialize Balances
          </Button>
          {!record.is_default && (
            <Button
              type="link"
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
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={3} style={{ margin: 0, color: C.darkText }}>
          <FileTextOutlined style={{ marginRight: 8, color: C.primary }} />
          Leave Policies
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          Create Policy
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={policies}
          loading={isLoading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

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
