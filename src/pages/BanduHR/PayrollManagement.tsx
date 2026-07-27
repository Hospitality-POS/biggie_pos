import React, { useState } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Select,
  DatePicker,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Drawer,
  Descriptions,
  Statistic,
  Row,
  Col,
  Spin,
  Radio,
  Tabs,
  Switch,
  Divider,
  InputNumber,
} from "antd";
import {
  DollarOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  SendOutlined,
  SettingOutlined,
  DeleteOutlined,
  SaveOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPayrolls,
  generatePayroll,
  deletePayroll,
  saveDeductionSettings,
  submitPayrollForApproval,
  approvePayrollRequest,
  generateBatchPayslips,
  Payroll,
  GeneratePayrollParams,
  fetchEmployees,
} from "@services/bandu";
import dayjs from "dayjs";
import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Text, Title } = Typography;

// ── Status Colors ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  draft: { color: "default", label: "Draft" },
  pending_approval: { color: "orange", label: "Pending Approval" },
  approved: { color: "green", label: "Approved" },
  processed: { color: "blue", label: "Processed" },
  paid: { color: "success", label: "Paid" },
  void: { color: "red", label: "Void" },
};

// ── Payroll Management Component ───────────────────────────────────────────────

const PayrollManagement: React.FC = () => {
  const primaryColor = usePrimaryColor();
  const queryClient = useQueryClient();
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [payrollMode, setPayrollMode] = useState<"department" | "employee">("department");
  const [activeTab, setActiveTab] = useState("draft");
  const [form] = Form.useForm();
  const [deductionForm] = Form.useForm();
  const [customDeductions, setCustomDeductions] = useState<
    Array<{ id: string; name: string; amount: number; is_percentage: boolean }>
  >([]);

  // Fetch payrolls
  const { data: payrollsData, isLoading } = useQuery({
    queryKey: ["payrolls", statusFilter],
    queryFn: () =>
      fetchPayrolls({
        status: statusFilter,
      }),
  });

  const payrolls = React.useMemo(
    () => Array.isArray(payrollsData) ? payrollsData : payrollsData?.data || [],
    [payrollsData]
  );

  // Filter payrolls based on active tab
  const filteredPayrolls = React.useMemo(() => {
    if (activeTab === "deductions") return [];
    return payrolls.filter((p: Payroll) => p.status === activeTab);
  }, [payrolls, activeTab]);

  // Fetch employees for payroll generation
  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: () => fetchEmployees(),
  });

  const employees = React.useMemo(
    () => Array.isArray(employeesData) ? employeesData : employeesData?.data || [],
    [employeesData]
  );

  // Extract unique departments from employees
  const departments = React.useMemo(() => {
    const deptMap = new Map();
    employees.forEach((emp: any) => {
      if (emp.department_id && !deptMap.has(emp.department_id._id)) {
        deptMap.set(emp.department_id._id, emp.department_id);
      }
    });
    return Array.from(deptMap.values());
  }, [employees]);

  // Generate payroll mutation
  const generateMutation = useMutation({
    mutationFn: (params: GeneratePayrollParams) => generatePayroll(params),
    onSuccess: () => {
     // message.success("Payroll draft generated successfully");
      setIsGenerateModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });

  // Delete payroll mutation
  const deleteMutation = useMutation({
    mutationFn: (payrollId: string) => deletePayroll(payrollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });

  // Save deduction settings mutation
  const saveDeductionMutation = useMutation({
    mutationFn: (values: any) => saveDeductionSettings(values),
  });

  const handleSaveDeductions = async () => {
    try {
      const values = await deductionForm.validateFields();
      saveDeductionMutation.mutate({
        ...values,
        custom_deductions: customDeductions,
      });
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const addCustomDeduction = () => {
    const newDeduction = {
      id: Date.now().toString(),
      name: "",
      amount: 0,
      is_percentage: false,
    };
    setCustomDeductions([...customDeductions, newDeduction]);
  };

  const removeCustomDeduction = (id: string) => {
    setCustomDeductions(customDeductions.filter((d) => d.id !== id));
  };

  const updateCustomDeduction = (id: string, field: string, value: any) => {
    setCustomDeductions(
      customDeductions.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  // Submit for approval mutation
  const submitForApprovalMutation = useMutation({
    mutationFn: (payrollId: string) => submitPayrollForApproval(payrollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });

  // Approve payroll mutation
  const approveMutation = useMutation({
    mutationFn: (payrollId: string) => approvePayrollRequest(payrollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });

  // Generate batch payslips mutation
  const generateBatchPayslipsMutation = useMutation({
    mutationFn: (payrollId: string) => generateBatchPayslips(payrollId),
    onSuccess: () => {
      message.success("Payslips generated successfully");
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });

  // Handle generate payroll
  const handleGeneratePayroll = async () => {
    try {
      const values = await form.validateFields();
      const shopId = localStorage.getItem("shopId");
      const params: any = {
        period_start: values.period_start.format("YYYY-MM-DD"),
        period_end: values.period_end.format("YYYY-MM-DD"),
        period_label: values.period_label,
      };

      if (shopId) {
        params.shop_id = shopId;
      }

      if (payrollMode === "department") {
        params.department_ids = values.department_ids;
      } else if (payrollMode === "employee") {
        params.employee_ids = values.employee_ids;
      }

      generateMutation.mutate(params);
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  // View payroll details
  const handleViewDetails = (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setIsDetailDrawerOpen(true);
  };

  // Table columns
  const columns = [
    {
      title: "Payroll ID",
      dataIndex: "payroll_id",
      key: "payroll_id",
      render: (id: string) => <Text style={{ fontSize: 12 }}>{id}</Text>,
    },
    {
      title: "Period",
      key: "period",
      render: (_: any, record: Payroll) => (
        <Text style={{ fontSize: 12 }}>
          {dayjs(record.period_start).format("MMM D")} - {dayjs(record.period_end).format("MMM D, YYYY")}
        </Text>
      ),
    },
    {
      title: "Department",
      dataIndex: ["department_id", "name"],
      key: "department",
      render: (name: string) => <Text style={{ fontSize: 12 }}>{name}</Text>,
    },
    {
      title: "Gross",
      dataIndex: "total_gross",
      key: "total_gross",
      render: (amount: number) => (
        <Text style={{ fontSize: 12, fontWeight: 500 }}>
          KES {amount.toLocaleString()}
        </Text>
      ),
    },
    {
      title: "Net Pay",
      dataIndex: "total_net",
      key: "total_net",
      render: (amount: number) => (
        <Text style={{ fontSize: 12, fontWeight: 500, color: "#10b981" }}>
          KES {amount.toLocaleString()}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const config = STATUS_CONFIG[status] || { color: "default", label: status };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Payroll) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            View
          </Button>
          {record.status === "draft" && (
            <Popconfirm
              title="Submit for approval?"
              description="This will submit the payroll for approval."
              onConfirm={() => submitForApprovalMutation.mutate(record._id)}
            >
              <Button type="link" size="small" icon={<SendOutlined />}>
                Submit
              </Button>
            </Popconfirm>
          )}
          {record.status === "pending_approval" && (
            <Popconfirm
              title="Approve this payroll?"
              description="This will approve the payroll for processing."
              onConfirm={() => approveMutation.mutate(record._id)}
            >
              <Button type="link" size="small" icon={<CheckCircleOutlined />}>
                Approve
              </Button>
            </Popconfirm>
          )}
          {(record.status === "approved" || record.status === "processed" || record.status === "paid") && (
            <Popconfirm
              title="Generate payslips for all employees?"
              description="This will create payslips for all employees in this payroll."
              onConfirm={() => generateBatchPayslipsMutation.mutate(record._id)}
            >
              <Button type="link" size="small" icon={<FileTextOutlined />}>
                Generate Payslips
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="Delete payroll?"
            description="This action cannot be undone."
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText="Delete"
            okType="danger"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteMutation.isLoading}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <Space align="center">
          <div
            style={{
              background: `${primaryColor}15`,
              borderRadius: 10,
              padding: "8px 10px",
              color: primaryColor,
              fontSize: 20,
            }}
          >
            <DollarOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Payroll Management
            </Title>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              Generate, approve, and process payroll
            </Text>
          </div>
        </Space>

        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ["payrolls"] })}
            loading={isLoading}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsGenerateModalOpen(true)}
          >
            Generate Payroll
          </Button>
        </Space>
      </div>

      {/* ── Tabs ── */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="Draft" key="draft">
          {/* ── Summary Stats ── */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Draft Payrolls"
                  value={filteredPayrolls.length}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ fontSize: 20 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Total Gross"
                  value={filteredPayrolls.reduce((sum: number, p: Payroll) => sum + p.total_gross, 0)}
                  prefix="KES"
                  valueStyle={{ fontSize: 20 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Total Net"
                  value={filteredPayrolls.reduce((sum: number, p: Payroll) => sum + p.total_net, 0)}
                  prefix="KES"
                  valueStyle={{ fontSize: 20, color: "#10b981" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Total Deductions"
                  value={filteredPayrolls.reduce((sum: number, p: Payroll) => sum + p.total_deductions, 0)}
                  prefix="KES"
                  valueStyle={{ fontSize: 20, color: "#ef4444" }}
                />
              </Card>
            </Col>
          </Row>

          {/* ── Payroll Table ── */}
          <Card>
            <Table
              columns={columns}
              dataSource={filteredPayrolls}
              rowKey="_id"
              loading={isLoading}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane tab="Pending Approval" key="pending_approval">
          {/* ── Summary Stats ── */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Pending Approval"
                  value={filteredPayrolls.length}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ fontSize: 20, color: "#f59e0b" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Total Gross"
                  value={filteredPayrolls.reduce((sum: number, p: Payroll) => sum + p.total_gross, 0)}
                  prefix="KES"
                  valueStyle={{ fontSize: 20 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Total Net"
                  value={filteredPayrolls.reduce((sum: number, p: Payroll) => sum + p.total_net, 0)}
                  prefix="KES"
                  valueStyle={{ fontSize: 20, color: "#10b981" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Total Deductions"
                  value={filteredPayrolls.reduce((sum: number, p: Payroll) => sum + p.total_deductions, 0)}
                  prefix="KES"
                  valueStyle={{ fontSize: 20, color: "#ef4444" }}
                />
              </Card>
            </Col>
          </Row>

          {/* ── Payroll Table ── */}
          <Card>
            <Table
              columns={columns}
              dataSource={filteredPayrolls}
              rowKey="_id"
              loading={isLoading}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane tab="Approved" key="approved">
          {/* ── Summary Stats ── */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Approved Payrolls"
                  value={filteredPayrolls.length}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ fontSize: 20, color: "#10b981" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Total Gross"
                  value={filteredPayrolls.reduce((sum: number, p: Payroll) => sum + p.total_gross, 0)}
                  prefix="KES"
                  valueStyle={{ fontSize: 20 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Total Net"
                  value={filteredPayrolls.reduce((sum: number, p: Payroll) => sum + p.total_net, 0)}
                  prefix="KES"
                  valueStyle={{ fontSize: 20, color: "#10b981" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Total Deductions"
                  value={filteredPayrolls.reduce((sum: number, p: Payroll) => sum + p.total_deductions, 0)}
                  prefix="KES"
                  valueStyle={{ fontSize: 20, color: "#ef4444" }}
                />
              </Card>
            </Col>
          </Row>

          {/* ── Payroll Table ── */}
          <Card>
            <Table
              columns={columns}
              dataSource={filteredPayrolls}
              rowKey="_id"
              loading={isLoading}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane tab="Deduction Settings" key="deductions">
          <Card>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveDeductions}
                loading={saveDeductionMutation.isLoading}
              >
                Save Settings
              </Button>
            </div>
            <Tabs defaultActiveKey="nssf">
              {/* ── NSSF Settings ── */}
              <Tabs.TabPane tab="NSSF" key="nssf">
                <Form form={deductionForm} layout="vertical">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="nssf_enabled"
                        label="Enable NSSF Deduction"
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="nssf_rate"
                        label="NSSF Rate (%)"
                        initialValue={6}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          max={100}
                          style={{ width: "100%" }}
                          addonAfter="%"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="nssf_tier1_limit"
                        label="Tier 1 Upper Limit (KES)"
                        initialValue={6000}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          style={{ width: "100%" }}
                          addonBefore="KES"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="nssf_tier2_limit"
                        label="Tier 2 Upper Limit (KES)"
                        initialValue={18000}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          style={{ width: "100%" }}
                          addonBefore="KES"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    NSSF is calculated as 6% of pensionable pay, with tiered limits as per current regulations.
                  </Text>
                </Form>
              </Tabs.TabPane>

              {/* ── PAYE Settings ── */}
              <Tabs.TabPane tab="PAYE" key="paye">
                <Form form={deductionForm} layout="vertical">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="paye_enabled"
                        label="Enable PAYE Deduction"
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="paye_personal_relief"
                        label="Personal Relief (KES)"
                        initialValue={2400}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          style={{ width: "100%" }}
                          addonBefore="KES"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Divider orientation="left">Tax Brackets</Divider>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item
                        name="paye_bracket1_limit"
                        label="Bracket 1 Limit (KES)"
                        initialValue={24000}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          style={{ width: "100%" }}
                          addonBefore="KES"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="paye_bracket1_rate"
                        label="Bracket 1 Rate (%)"
                        initialValue={10}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          max={100}
                          style={{ width: "100%" }}
                          addonAfter="%"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="paye_bracket2_limit"
                        label="Bracket 2 Limit (KES)"
                        initialValue={32333}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          style={{ width: "100%" }}
                          addonBefore="KES"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item
                        name="paye_bracket2_rate"
                        label="Bracket 2 Rate (%)"
                        initialValue={25}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          max={100}
                          style={{ width: "100%" }}
                          addonAfter="%"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="paye_bracket3_limit"
                        label="Bracket 3 Limit (KES)"
                        initialValue={500000}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          style={{ width: "100%" }}
                          addonBefore="KES"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="paye_bracket3_rate"
                        label="Bracket 3 Rate (%)"
                        initialValue={30}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          max={100}
                          style={{ width: "100%" }}
                          addonAfter="%"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="paye_bracket4_rate"
                        label="Bracket 4+ Rate (%)"
                        initialValue={35}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          max={100}
                          style={{ width: "100%" }}
                          addonAfter="%"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    PAYE tax brackets based on current KRA regulations. Personal relief is deducted from taxable income.
                  </Text>
                </Form>
              </Tabs.TabPane>

              {/* ── SHA Settings ── */}
              <Tabs.TabPane tab="SHA" key="sha">
                <Form form={deductionForm} layout="vertical">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="sha_enabled"
                        label="Enable SHA Deduction"
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="sha_employee_rate"
                        label="Employee Rate (%)"
                        initialValue={2.75}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          max={100}
                          step={0.25}
                          style={{ width: "100%" }}
                          addonAfter="%"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="sha_employer_rate"
                        label="Employer Rate (%)"
                        initialValue={2.75}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          max={100}
                          step={0.25}
                          style={{ width: "100%" }}
                          addonAfter="%"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="sha_income_limit"
                        label="Income Limit (KES)"
                        initialValue={100000}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          style={{ width: "100%" }}
                          addonBefore="KES"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    SHA (Social Health Insurance) replaces NHIF. Both employee and employer contribute 2.75% of gross pay.
                  </Text>
                </Form>
              </Tabs.TabPane>

              {/* ── Housing Levy Settings ── */}
              <Tabs.TabPane tab="Housing Levy" key="housing">
                <Form form={deductionForm} layout="vertical">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="housing_levy_enabled"
                        label="Enable Housing Levy"
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="housing_levy_rate"
                        label="Housing Levy Rate (%)"
                        initialValue={1.5}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          max={100}
                          step={0.5}
                          style={{ width: "100%" }}
                          addonAfter="%"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="housing_levy_income_limit"
                        label="Income Limit (KES)"
                        initialValue={100000}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          style={{ width: "100%" }}
                          addonBefore="KES"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="housing_levy_employee_share"
                        label="Employee Share (%)"
                        initialValue={50}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          max={100}
                          style={{ width: "100%" }}
                          addonAfter="%"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Housing Levy is 1.5% of gross pay, shared equally between employee and employer.
                  </Text>
                </Form>
              </Tabs.TabPane>

              {/* ── Custom Deductions ── */}
              <Tabs.TabPane tab="Custom Deductions" key="custom">
                <div style={{ marginBottom: 16 }}>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={addCustomDeduction}
                    block
                  >
                    Add Custom Deduction
                  </Button>
                </div>
                <Table
                  columns={[
                    {
                      title: "Name",
                      dataIndex: "name",
                      key: "name",
                      render: (name: string, record: any) => (
                        <Input
                          value={name}
                          onChange={(e) => updateCustomDeduction(record.id, "name", e.target.value)}
                          placeholder="Deduction name"
                        />
                      ),
                    },
                    {
                      title: "Amount",
                      dataIndex: "amount",
                      key: "amount",
                      render: (amount: number, record: any) => (
                        <InputNumber
                          value={amount}
                          onChange={(value) => updateCustomDeduction(record.id, "amount", value)}
                          placeholder="Amount"
                          style={{ width: "100%" }}
                          addonAfter={record.is_percentage ? "%" : "KES"}
                        />
                      ),
                    },
                    {
                      title: "Type",
                      dataIndex: "is_percentage",
                      key: "is_percentage",
                      render: (isPercentage: boolean, record: any) => (
                        <Switch
                          checked={isPercentage}
                          onChange={(checked) => updateCustomDeduction(record.id, "is_percentage", checked)}
                          checkedChildren="%"
                          unCheckedChildren="KES"
                        />
                      ),
                    },
                    {
                      title: "Actions",
                      key: "actions",
                      render: (_: any, record: any) => (
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeCustomDeduction(record.id)}
                        >
                          Remove
                        </Button>
                      ),
                    },
                  ]}
                  dataSource={customDeductions}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
                {customDeductions.length === 0 && (
                  <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                    No custom deductions configured. Click "Add Custom Deduction" to create one.
                  </div>
                )}
              </Tabs.TabPane>
            </Tabs>
          </Card>
        </Tabs.TabPane>
      </Tabs>

      {/* ── Generate Payroll Modal ── */}
      <Modal
        title="Generate Payroll"
        open={isGenerateModalOpen}
        onCancel={() => {
          setIsGenerateModalOpen(false);
          form.resetFields();
          setPayrollMode("department");
        }}
        afterOpenChange={(open) => {
          if (open) {
            // Set default values when opening modal
            if (payrollMode === "department") {
              form.setFieldsValue({
                department_ids: departments.map((d: any) => d._id),
              });
            } else if (payrollMode === "employee") {
              form.setFieldsValue({
                employee_ids: employees.map((e: any) => e._id),
              });
            }
          }
        }}
        onOk={handleGeneratePayroll}
        confirmLoading={generateMutation.isLoading}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Payroll Generation Mode">
            <Radio.Group
              value={payrollMode}
              onChange={(e) => {
                setPayrollMode(e.target.value);
                form.resetFields(["department_ids", "employee_ids"]);
                // Set default values for the new mode
                if (e.target.value === "department") {
                  form.setFieldsValue({
                    department_ids: departments.map((d: any) => d._id),
                  });
                } else if (e.target.value === "employee") {
                  form.setFieldsValue({
                    employee_ids: employees.map((e: any) => e._id),
                  });
                }
              }}
            >
              <Radio.Button value="department">By Department</Radio.Button>
              <Radio.Button value="employee">By Employee</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {payrollMode === "department" && (
            <Form.Item
              name="department_ids"
              label="Departments"
              rules={[{ required: true, message: "Please select at least one department" }]}
              initialValue={departments.map((d: any) => d._id)}
            >
              <Select
                mode="multiple"
                placeholder="Select departments"
                style={{ width: "100%" }}
                options={departments.map((d: any) => ({
                  label: d.name,
                  value: d._id,
                }))}
              />
            </Form.Item>
          )}

          {payrollMode === "employee" && (
            <Form.Item
              name="employee_ids"
              label="Employees"
              rules={[{ required: true, message: "Please select at least one employee" }]}
              initialValue={employees.map((e: any) => e._id)}
            >
              <Select
                mode="multiple"
                placeholder="Select employees"
                style={{ width: "100%" }}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                options={employees.map((e: any) => ({
                  label: `${e.user_id?.fullname || e.employee_number} (${e.employee_number})`,
                  value: e._id,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item
            name="period_label"
            label="Period Label"
            rules={[{ required: true, message: "Please enter a period label" }]}
            initialValue={dayjs().format("MMMM YYYY")}
          >
            <Input placeholder="e.g., July 2026" />
          </Form.Item>
          <Form.Item
            name="period_start"
            label="Period Start"
            rules={[{ required: true, message: "Please select start date" }]}
            initialValue={dayjs().startOf("month")}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="period_end"
            label="Period End"
            rules={[{ required: true, message: "Please select end date" }]}
            initialValue={dayjs().endOf("month")}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Payroll Details Drawer ── */}
      <Drawer
        title="Payroll Details"
        placement="right"
        width={600}
        open={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
      >
        {selectedPayroll && (
          <div>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Payroll ID">
                {selectedPayroll.payroll_id}
              </Descriptions.Item>
              <Descriptions.Item label="Period">
                {dayjs(selectedPayroll.period_start).format("MMM D")} -{" "}
                {dayjs(selectedPayroll.period_end).format("MMM D, YYYY")}
              </Descriptions.Item>
              <Descriptions.Item label="Department">
                {selectedPayroll.department_id.name}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_CONFIG[selectedPayroll.status]?.color}>
                  {STATUS_CONFIG[selectedPayroll.status]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Total Gross">
                KES {selectedPayroll.total_gross.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Total Deductions">
                KES {selectedPayroll.total_deductions.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Total Net">
                KES {selectedPayroll.total_net.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="PAYE">
                KES {selectedPayroll.total_paye.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="NSSF">
                KES {selectedPayroll.total_nssf.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="NHIF">
                KES {selectedPayroll.total_nhif.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Housing Levy">
                KES {selectedPayroll.total_housing_levy.toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>
              Payroll Lines ({selectedPayroll.lines?.length || 0})
            </Title>
            <Table
              dataSource={selectedPayroll.lines || []}
              rowKey={(record: any) => record.employee_id._id}
              size="small"
              pagination={false}
              scroll={{ y: 300 }}
              columns={[
                {
                  title: "Employee",
                  dataIndex: ["employee_id", "employee_number"],
                  key: "employee",
                },
                {
                  title: "Gross",
                  dataIndex: "gross_salary",
                  key: "gross",
                  render: (val: number) => `KES ${val.toLocaleString()}`,
                },
                {
                  title: "Deductions",
                  dataIndex: ["deductions", "total"],
                  key: "deductions",
                  render: (val: number) => `KES ${val.toLocaleString()}`,
                },
                {
                  title: "Net Pay",
                  dataIndex: "net_pay",
                  key: "net_pay",
                  render: (val: number) => (
                    <Text style={{ color: "#10b981", fontWeight: 500 }}>
                      KES {val.toLocaleString()}
                    </Text>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PayrollManagement;
