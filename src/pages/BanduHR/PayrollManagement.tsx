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
  Row,
  Col,
  Radio,
  Tabs,
  Switch,
  Divider,
  InputNumber,
  Tooltip,
  Alert,
  Empty,
  Steps,
} from "antd";
import {
  DollarOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  SendOutlined,
  DeleteOutlined,
  SaveOutlined,
  ReloadOutlined,
  CopyOutlined,
  EditOutlined,
  ThunderboltOutlined,
  PayCircleOutlined,
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
  previewPayroll,
  duplicatePayroll,
  patchPayrollLine,
  processPayrollRequest,
  markPayrollPaid,
  initializeDeductionSettings,
  getPayrollById,
  Payroll,
  GeneratePayrollParams,
  PayrollPreviewResult,
  fetchEmployees,
} from "@services/bandu";
import dayjs from "dayjs";
import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Text, Title } = Typography;

// ── Dashboard-style card ──────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div style={{ ...cardStyle, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: `${color}15`,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>{title}</Text>
      <Text strong style={{ fontSize: 18, color, lineHeight: 1.2 }}>
        {value}
      </Text>
    </div>
  </div>
);

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
  const [payrollMode, setPayrollMode] = useState<"department" | "employee">("department");
  const [activeTab, setActiveTab] = useState("draft");
  const [filterYear, setFilterYear] = useState<number | undefined>(undefined);
  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined);
  const [form] = Form.useForm();
  const [deductionForm] = Form.useForm();
  const [customDeductions, setCustomDeductions] = useState<
    Array<{ id: string; name: string; amount: number; is_percentage: boolean }>
  >([]);

  // Generate modal 2-step state: 0 = configure, 1 = review computed preview
  const [generateStep, setGenerateStep] = useState<0 | 1>(0);
  const [previewData, setPreviewData] = useState<PayrollPreviewResult | null>(null);
  const [pendingGenerateParams, setPendingGenerateParams] = useState<GeneratePayrollParams | null>(null);

  // Duplicate payroll modal state
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<Payroll | null>(null);
  const [duplicateForm] = Form.useForm();

  // Line edit modal state (draft payrolls only)
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<any>(null);
  const [lineForm] = Form.useForm();
  const [lineCustomDeductions, setLineCustomDeductions] = useState<
    Array<{ key: number; name: string; amount: number }>
  >([]);

  // Fetch payrolls
  const { data: payrollsData, isLoading } = useQuery({
    queryKey: ["payrolls", filterYear, filterMonth],
    queryFn: () => fetchPayrolls({ limit: 200, year: filterYear, month: filterMonth }),
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
    onSuccess: (data) => {
      const skipped = data?.skipped || [];
      if (skipped.length) {
        message.warning(
          `Some payrolls were skipped: ${skipped.map((s: any) => s.department_name || s.department_id).join(", ")}`
        );
      }
      setIsGenerateModalOpen(false);
      setGenerateStep(0);
      setPreviewData(null);
      setPendingGenerateParams(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });

  // Preview payroll mutation — computes lines/totals without saving
  const previewMutation = useMutation({
    mutationFn: (params: GeneratePayrollParams) => previewPayroll(params),
    onSuccess: (data) => {
      setPreviewData(data);
      setGenerateStep(1);
    },
  });

  // Duplicate payroll mutation
  const duplicateMutation = useMutation({
    mutationFn: ({ id, params }: { id: string; params: { period_start: string; period_end: string; period_label: string } }) =>
      duplicatePayroll(id, params),
    onSuccess: (data) => {
      setIsDuplicateModalOpen(false);
      setDuplicateTarget(null);
      duplicateForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
      if (data?.dropped_employees?.length) {
        message.warning(
          `${data.dropped_employees.length} employee(s) were not copied (inactive or removed)`
        );
      }
      setActiveTab("draft");
    },
  });

  // Update payroll line mutation
  const updateLineMutation = useMutation({
    mutationFn: ({ payrollId, payload }: { payrollId: string; payload: any }) =>
      patchPayrollLine(payrollId, payload),
    onSuccess: async () => {
      setIsLineModalOpen(false);
      setEditingLine(null);
      if (selectedPayroll) {
        const fresh = await getPayrollById(selectedPayroll._id);
        setSelectedPayroll(fresh?.data || selectedPayroll);
      }
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

  // Seed default statutory deduction configs on the backend
  const initializeDefaultsMutation = useMutation({
    mutationFn: () => initializeDeductionSettings(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });

  // Fill the form with current Kenyan statutory rates (KRA 2024/25)
  const autoFillStatutoryRates = () => {
    deductionForm.setFieldsValue({
      // NSSF — 6% of pensionable pay, Feb-2025 tier limits (KES 8,000 / 72,000)
      nssf_enabled: true,
      nssf_rate: 6,
      nssf_tier1_limit: 8000,
      nssf_tier2_limit: 72000,
      // PAYE — current KRA bands
      paye_enabled: true,
      paye_personal_relief: 2400,
      paye_bracket1_limit: 24000,
      paye_bracket1_rate: 10,
      paye_bracket2_limit: 32333,
      paye_bracket2_rate: 25,
      paye_bracket3_limit: 500000,
      paye_bracket3_rate: 30,
      paye_bracket4_rate: 35,
      // SHA — 2.75% of gross, no cap (replaced NHIF)
      sha_enabled: true,
      sha_employee_rate: 2.75,
      sha_employer_rate: 2.75,
      sha_income_limit: 0,
      // Housing Levy — 1.5% of gross, uncapped
      housing_levy_enabled: true,
      housing_levy_rate: 1.5,
      housing_levy_income_limit: 0,
      housing_levy_employee_share: 50,
    });
    message.success("Form filled with current Kenyan statutory rates — review then Save Settings");
  };

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

  // Process payroll mutation (approved → processed, posts accrual JE)
  const processMutation = useMutation({
    mutationFn: (payrollId: string) => processPayrollRequest(payrollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });

  // Mark payroll as paid — posts payment JE (and accrual if missing).
  // Backend returns 409 MISSING_ACCOUNTS when the chart of accounts lacks
  // required accounts — we then offer to auto-create them.
  const handleMarkPaid = async (payroll: Payroll) => {
    try {
      await markPayrollPaid(payroll._id);
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    } catch (error: any) {
      const data = error?.response?.data;
      if (data?.code === "MISSING_ACCOUNTS") {
        Modal.confirm({
          title: "Accounting accounts missing",
          content: (
            <div>
              <Text>
                Pesa accounting is enabled but the following chart-of-account
                entries don't exist yet:
              </Text>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {data.missing_accounts.map((a: any) => (
                  <li key={a.account_code} style={{ fontSize: 13 }}>
                    <Text strong>{a.account_code}</Text> — {a.account_name} ({a.account_type})
                  </li>
                ))}
              </ul>
              <Text>Create them now and post the salary payment to accounting?</Text>
            </div>
          ),
          okText: "Create Accounts & Post Payment",
          cancelText: "Cancel",
          onOk: async () => {
            await markPayrollPaid(payroll._id, { auto_create_accounts: true });
            message.success("Accounts created — payroll marked as paid");
            queryClient.invalidateQueries({ queryKey: ["payrolls"] });
          },
        });
      } else {
        message.error(data?.message || "Failed to mark payroll as paid");
      }
    }
  };

  // Generate batch payslips mutation
  const generateBatchPayslipsMutation = useMutation({
    mutationFn: (payrollId: string) => generateBatchPayslips(payrollId),
    onSuccess: () => {
      message.success("Payslips generated successfully");
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });

  // Build generate params from the form
  const buildGenerateParams = async (): Promise<GeneratePayrollParams> => {
    const values = await form.validateFields();
    const shopId = localStorage.getItem("shopId");
    const params: GeneratePayrollParams = {
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

    return params;
  };

  // Step 1 → compute a preview (review before running)
  const handlePreviewPayroll = async () => {
    try {
      const params = await buildGenerateParams();
      setPendingGenerateParams(params);
      previewMutation.mutate(params);
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  // Step 2 → confirm and generate draft
  const handleGeneratePayroll = () => {
    if (pendingGenerateParams) {
      generateMutation.mutate(pendingGenerateParams);
    }
  };

  const closeGenerateModal = () => {
    setIsGenerateModalOpen(false);
    setGenerateStep(0);
    setPreviewData(null);
    setPendingGenerateParams(null);
    form.resetFields();
    setPayrollMode("department");
  };

  // Open duplicate modal for a payroll
  const openDuplicateModal = (payroll: Payroll) => {
    setDuplicateTarget(payroll);
    const nextMonth = dayjs(payroll.period_end).add(1, "month");
    duplicateForm.setFieldsValue({
      period_label: nextMonth.format("MMMM YYYY"),
      period_start: nextMonth.startOf("month"),
      period_end: nextMonth.endOf("month"),
    });
    setIsDuplicateModalOpen(true);
  };

  const handleDuplicatePayroll = async () => {
    if (!duplicateTarget) return;
    try {
      const values = await duplicateForm.validateFields();
      duplicateMutation.mutate({
        id: duplicateTarget._id,
        params: {
          period_start: values.period_start.format("YYYY-MM-DD"),
          period_end: values.period_end.format("YYYY-MM-DD"),
          period_label: values.period_label,
        },
      });
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  // Open line edit modal (draft payrolls)
  const openLineModal = (line: any) => {
    setEditingLine(line);
    lineForm.setFieldsValue({
      basic_salary: line.basic_salary,
      allowances: line.allowances,
      benefits: line.benefits,
      overtime_hours: line.overtime_hours,
    });
    setLineCustomDeductions(
      (line.deductions?.custom || []).map((c: any, i: number) => ({
        key: i,
        name: c.name,
        amount: c.amount,
      }))
    );
    setIsLineModalOpen(true);
  };

  const handleSaveLine = async () => {
    if (!selectedPayroll || !editingLine) return;
    try {
      const values = await lineForm.validateFields();
      updateLineMutation.mutate({
        payrollId: selectedPayroll._id,
        payload: {
          line_id: editingLine._id,
          adjustments: {
            basic_salary: values.basic_salary,
            allowances: values.allowances,
            benefits: values.benefits,
            overtime_hours: values.overtime_hours,
            custom_deductions: lineCustomDeductions
              .filter((d) => d.name && d.amount > 0)
              .map(({ name, amount }) => ({ name, amount })),
          },
        },
      });
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
          KES {(amount ?? 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: "Net Pay",
      dataIndex: "total_net",
      key: "total_net",
      render: (amount: number) => (
        <Text style={{ fontSize: 12, fontWeight: 500, color: "#10b981" }}>
          KES {(amount ?? 0).toLocaleString()}
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
          <Tooltip title="Duplicate to a new period">
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => openDuplicateModal(record)}
            >
              Duplicate
            </Button>
          </Tooltip>
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
          {record.status === "approved" && (
            <Popconfirm
              title="Process this payroll?"
              description="This will post the payroll accrual to accounting."
              onConfirm={() => processMutation.mutate(record._id)}
            >
              <Button type="link" size="small" icon={<SendOutlined />}>
                Process
              </Button>
            </Popconfirm>
          )}
          {(record.status === "approved" || record.status === "processed") && (
            <Button
              type="link"
              size="small"
              icon={<PayCircleOutlined />}
              onClick={() => handleMarkPaid(record)}
            >
              Mark Paid
            </Button>
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

        <Space wrap>
          <Select
            value={filterMonth}
            onChange={setFilterMonth}
            allowClear
            placeholder="All months"
            style={{ width: 130 }}
            options={[
              "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December",
            ].map((label, i) => ({ value: i + 1, label }))}
          />
          <Select
            value={filterYear}
            onChange={setFilterYear}
            allowClear
            placeholder="All years"
            style={{ width: 110 }}
            options={[0, 1, 2, 3].map((offset) => {
              const y = new Date().getFullYear() - offset;
              return { value: y, label: `${y}` };
            })}
          />
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
            onClick={() => {
              setGenerateStep(0);
              setPreviewData(null);
              setPendingGenerateParams(null);
              setPayrollMode("department");
              setIsGenerateModalOpen(true);
            }}
          >
            Generate Payroll
          </Button>
        </Space>
      </div>

      {/* ── Tabs ── */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {[
          { key: "draft", label: "Draft", icon: <FileTextOutlined />, color: "#64748b", countTitle: "Draft Payrolls" },
          { key: "pending_approval", label: "Pending Approval", icon: <ClockCircleOutlined />, color: "#f59e0b", countTitle: "Pending Approval" },
          { key: "approved", label: "Approved", icon: <CheckCircleOutlined />, color: "#10b981", countTitle: "Approved Payrolls" },
          { key: "processed", label: "Processed", icon: <SendOutlined />, color: "#3b82f6", countTitle: "Processed Payrolls" },
          { key: "paid", label: "Paid", icon: <DollarOutlined />, color: "#22c55e", countTitle: "Paid Payrolls" },
        ].map((tab) => (
          <Tabs.TabPane
            key={tab.key}
            tab={
              <Space size={6}>
                {tab.icon}
                {tab.label}
                <span
                  style={{
                    background: `${tab.color}18`,
                    color: tab.color,
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "1px 8px",
                  }}
                >
                  {payrolls.filter((p: Payroll) => p.status === tab.key).length}
                </span>
              </Space>
            }
          >
            {/* ── Summary Stats ── */}
            <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col xs={12} md={6}>
                <StatCard
                  title={tab.countTitle}
                  value={filteredPayrolls.length}
                  icon={tab.icon}
                  color={tab.color}
                />
              </Col>
              <Col xs={12} md={6}>
                <StatCard
                  title="Total Gross"
                  value={`KES ${filteredPayrolls.reduce((sum: number, p: Payroll) => sum + (p.total_gross || 0), 0).toLocaleString()}`}
                  icon={<DollarOutlined />}
                  color="#3b82f6"
                />
              </Col>
              <Col xs={12} md={6}>
                <StatCard
                  title="Total Net"
                  value={`KES ${filteredPayrolls.reduce((sum: number, p: Payroll) => sum + (p.total_net || 0), 0).toLocaleString()}`}
                  icon={<CheckCircleOutlined />}
                  color="#10b981"
                />
              </Col>
              <Col xs={12} md={6}>
                <StatCard
                  title="Total Deductions"
                  value={`KES ${filteredPayrolls.reduce((sum: number, p: Payroll) => sum + (p.total_deductions || 0), 0).toLocaleString()}`}
                  icon={<DeleteOutlined />}
                  color="#ef4444"
                />
              </Col>
            </Row>

            {/* ── Payroll Table ── */}
            <div style={{ ...cardStyle, overflow: "hidden" }}>
              <Table
                columns={columns}
                dataSource={filteredPayrolls}
                rowKey="_id"
                loading={isLoading}
                pagination={{ pageSize: 10 }}
                size="small"
                locale={{
                  emptyText: (
                    <Empty
                      description={`No ${tab.label.toLowerCase()} payrolls`}
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ padding: "32px 0" }}
                    />
                  ),
                }}
              />
            </div>
          </Tabs.TabPane>
        ))}

        <Tabs.TabPane tab="Deduction Settings" key="deductions">
          <Card>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
              <Button icon={<ThunderboltOutlined />} onClick={autoFillStatutoryRates}>
                Auto-fill Kenyan Rates
              </Button>
              <Popconfirm
                title="Initialize default statutory deductions?"
                description="Creates PAYE, NSSF, SHA and Housing Levy configs with current Kenyan rates (existing configs are kept)."
                onConfirm={() => initializeDefaultsMutation.mutate()}
                okText="Initialize"
              >
                <Button icon={<ReloadOutlined />} loading={initializeDefaultsMutation.isLoading}>
                  Initialize Defaults
                </Button>
              </Popconfirm>
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

      {/* ── Generate Payroll Modal (2 steps: configure → review) ── */}
      <Modal
        title={generateStep === 0 ? "Generate Payroll" : "Review Payroll — Before Running"}
        open={isGenerateModalOpen}
        onCancel={closeGenerateModal}
        afterOpenChange={(open) => {
          if (open && generateStep === 0) {
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
        footer={null}
        width={generateStep === 0 ? 600 : 920}
      >
        <Steps
          current={generateStep}
          size="small"
          style={{ marginBottom: 20 }}
          items={[{ title: "Configure" }, { title: "Review & Generate" }]}
        />
        <Form form={form} layout="vertical" style={{ display: generateStep === 0 ? "block" : "none" }}>
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
                  label: `${e.user_id?.fullname || e.fullname || e.employee_number} (${e.employee_number})`,
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

        {/* ── Step 2: Review computed payroll before running ── */}
        {generateStep === 1 && previewData && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {previewData.conflicts.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message={`${previewData.conflicts.length} selection(s) will be skipped`}
                description={
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {previewData.conflicts.map((c, i) => (
                      <li key={i} style={{ fontSize: 12 }}>
                        {c.department_name || c.department_id}: {c.reason}
                        {c.payroll_id ? ` (${c.payroll_id})` : ""}
                      </li>
                    ))}
                  </ul>
                }
                style={{ borderRadius: 8 }}
              />
            )}

            {previewData.previews.length === 0 ? (
              <Empty
                description="Nothing to generate — review your selections"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: "24px 0" }}
              />
            ) : (
              previewData.previews.map((group) => (
                <div key={group.department_id || "custom"} style={{ ...cardStyle, overflow: "hidden" }}>
                  {/* Group header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderBottom: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <Space size={8}>
                      <Text strong style={{ fontSize: 13 }}>
                        {group.department_name}
                      </Text>
                      <Tag style={{ margin: 0, fontSize: 11 }}>{group.employee_count} employees</Tag>
                    </Space>
                    <Space size={12}>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>
                        Gross <Text strong>KES {(group.total_gross ?? 0).toLocaleString()}</Text>
                      </Text>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>
                        Deductions <Text strong style={{ color: "#ef4444" }}>KES {(group.total_deductions ?? 0).toLocaleString()}</Text>
                      </Text>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>
                        Net <Text strong style={{ color: "#10b981" }}>KES {(group.total_net ?? 0).toLocaleString()}</Text>
                      </Text>
                    </Space>
                  </div>

                  <Table
                    dataSource={group.lines}
                    rowKey="employee_id"
                    size="small"
                    pagination={false}
                    scroll={{ y: 300 }}
                    expandable={{
                      expandedRowRender: (line: any) => {
                        const items = [
                          { label: "PAYE", value: line.deductions?.paye },
                          { label: "NSSF", value: line.deductions?.nssf },
                          { label: "SHA", value: line.deductions?.nhif },
                          { label: "Housing Levy", value: line.deductions?.housing_levy },
                          ...(line.deductions?.custom || []).map((c: any) => ({
                            label: `${c.name} (custom)`,
                            value: c.amount,
                          })),
                        ];
                        return (
                          <div
                            style={{
                              display: "flex",
                              gap: 16,
                              flexWrap: "wrap",
                              padding: "8px 4px",
                              background: "#fafafa",
                              borderRadius: 8,
                            }}
                          >
                            {/* Earnings */}
                            <div style={{ minWidth: 180 }}>
                              <Text style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                                Earnings
                              </Text>
                              {[
                                { label: "Basic", value: line.basic_salary },
                                { label: "Allowances", value: line.allowances },
                                { label: "Benefits", value: line.benefits },
                              ].map((e) => (
                                <div key={e.label} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12 }}>
                                  <Text style={{ color: "#64748b" }}>{e.label}</Text>
                                  <Text>KES {(e.value ?? 0).toLocaleString()}</Text>
                                </div>
                              ))}
                            </div>
                            {/* Deductions */}
                            <div style={{ minWidth: 200 }}>
                              <Text style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                                Deductions
                              </Text>
                              {items.map((d) => (
                                <div key={d.label} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12 }}>
                                  <Text style={{ color: "#64748b" }}>{d.label}</Text>
                                  <Text style={{ color: "#ef4444" }}>KES {(d.value ?? 0).toLocaleString()}</Text>
                                </div>
                              ))}
                            </div>
                            {/* Net */}
                            <div style={{ marginLeft: "auto", alignSelf: "center" }}>
                              <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Net Pay</Text>
                              <Text strong style={{ fontSize: 15, color: "#10b981" }}>
                                KES {(line.net_pay ?? 0).toLocaleString()}
                              </Text>
                            </div>
                          </div>
                        );
                      },
                    }}
                    columns={[
                      {
                        title: "Employee",
                        key: "employee",
                        render: (_: any, line: any) => (
                          <div>
                            <Text style={{ fontSize: 12, fontWeight: 500, display: "block" }}>
                              {line.fullname || line.employee_number || "—"}
                            </Text>
                            <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                              {[line.employee_number, line.job_title].filter(Boolean).join(" · ")}
                            </Text>
                          </div>
                        ),
                      },
                      {
                        title: "Gross",
                        dataIndex: "gross_salary",
                        align: "right",
                        render: (v: number) => `KES ${(v ?? 0).toLocaleString()}`,
                      },
                      {
                        title: "Deductions",
                        dataIndex: ["deductions", "total"],
                        align: "right",
                        render: (v: number) => (
                          <Text style={{ color: "#ef4444" }}>KES {(v ?? 0).toLocaleString()}</Text>
                        ),
                      },
                      {
                        title: "Net Pay",
                        dataIndex: "net_pay",
                        align: "right",
                        render: (v: number) => (
                          <Text strong style={{ color: "#10b981" }}>KES {(v ?? 0).toLocaleString()}</Text>
                        ),
                      },
                    ]}
                  />
                </div>
              ))
            )}

            {/* Grand totals */}
            {previewData.previews.length > 1 && (
              <div
                style={{
                  ...cardStyle,
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 16,
                  background: "#f8fafc",
                }}
              >
                <Text style={{ fontSize: 12 }}>
                  Total Gross: <Text strong>KES {previewData.previews.reduce((s, g) => s + (g.total_gross || 0), 0).toLocaleString()}</Text>
                </Text>
                <Text style={{ fontSize: 12 }}>
                  Total Deductions: <Text strong style={{ color: "#ef4444" }}>KES {previewData.previews.reduce((s, g) => s + (g.total_deductions || 0), 0).toLocaleString()}</Text>
                </Text>
                <Text style={{ fontSize: 12 }}>
                  Total Net: <Text strong style={{ color: "#10b981" }}>KES {previewData.previews.reduce((s, g) => s + (g.total_net || 0), 0).toLocaleString()}</Text>
                </Text>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          {generateStep === 1 ? (
            <Button onClick={() => setGenerateStep(0)} disabled={generateMutation.isLoading}>
              ← Back
            </Button>
          ) : (
            <span />
          )}
          <Space>
            <Button onClick={closeGenerateModal} disabled={previewMutation.isLoading || generateMutation.isLoading}>
              Cancel
            </Button>
            {generateStep === 0 ? (
              <Button type="primary" onClick={handlePreviewPayroll} loading={previewMutation.isLoading}>
                Review →
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleGeneratePayroll}
                loading={generateMutation.isLoading}
                disabled={!previewData || previewData.previews.length === 0}
              >
                Generate Draft
              </Button>
            )}
          </Space>
        </div>
      </Modal>

      {/* ── Duplicate Payroll Modal ── */}
      <Modal
        title={`Duplicate Payroll — ${duplicateTarget?.payroll_id || ""}`}
        open={isDuplicateModalOpen}
        onCancel={() => {
          setIsDuplicateModalOpen(false);
          setDuplicateTarget(null);
          duplicateForm.resetFields();
        }}
        onOk={handleDuplicatePayroll}
        okText="Duplicate as Draft"
        confirmLoading={duplicateMutation.isLoading}
        width={480}
      >
        <Alert
          type="info"
          showIcon
          message="A new draft payroll will be created for the new period with the same employees and amounts. You can review and edit lines before submitting."
          style={{ borderRadius: 8, marginBottom: 16 }}
        />
        <Form form={duplicateForm} layout="vertical">
          <Form.Item
            name="period_label"
            label="New Period Label"
            rules={[{ required: true, message: "Please enter a period label" }]}
          >
            <Input placeholder="e.g., August 2026" />
          </Form.Item>
          <Form.Item
            name="period_start"
            label="Period Start"
            rules={[{ required: true, message: "Please select start date" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="period_end"
            label="Period End"
            rules={[{ required: true, message: "Please select end date" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Edit Payroll Line Modal ── */}
      <Modal
        title={`Edit Line — ${editingLine?.employee_id?.employee_number || ""}`}
        open={isLineModalOpen}
        onCancel={() => {
          setIsLineModalOpen(false);
          setEditingLine(null);
          lineForm.resetFields();
          setLineCustomDeductions([]);
        }}
        onOk={handleSaveLine}
        okText="Save Line"
        confirmLoading={updateLineMutation.isLoading}
        width={560}
      >
        <Alert
          type="info"
          showIcon
          message="Gross pay and statutory deductions (PAYE, NSSF, SHA, Housing Levy) are recalculated automatically when you change salary or overtime."
          style={{ borderRadius: 8, marginBottom: 16 }}
        />
        <Form form={lineForm} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="basic_salary" label="Basic Salary" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: "100%" }} addonBefore="KES" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="allowances" label="Allowances">
                <InputNumber min={0} style={{ width: "100%" }} addonBefore="KES" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="benefits" label="Benefits">
                <InputNumber min={0} style={{ width: "100%" }} addonBefore="KES" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="overtime_hours" label="Overtime Hours">
                <InputNumber min={0} style={{ width: "100%" }} addonAfter="hrs" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "8px 0 12px" }}>
            <Text style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Custom Deductions</Text>
          </Divider>

          {lineCustomDeductions.map((ded) => (
            <Row key={ded.key} gutter={8} style={{ marginBottom: 8 }}>
              <Col span={14}>
                <Input
                  placeholder="Deduction name"
                  value={ded.name}
                  onChange={(e) =>
                    setLineCustomDeductions(
                      lineCustomDeductions.map((d) => (d.key === ded.key ? { ...d, name: e.target.value } : d))
                    )
                  }
                />
              </Col>
              <Col span={8}>
                <InputNumber
                  min={0}
                  placeholder="Amount"
                  value={ded.amount}
                  style={{ width: "100%" }}
                  addonBefore="KES"
                  onChange={(v) =>
                    setLineCustomDeductions(
                      lineCustomDeductions.map((d) => (d.key === ded.key ? { ...d, amount: v || 0 } : d))
                    )
                  }
                />
              </Col>
              <Col span={2}>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setLineCustomDeductions(lineCustomDeductions.filter((d) => d.key !== ded.key))}
                />
              </Col>
            </Row>
          ))}
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={() =>
              setLineCustomDeductions([...lineCustomDeductions, { key: Date.now(), name: "", amount: 0 }])
            }
            block
          >
            Add Custom Deduction
          </Button>
        </Form>
      </Modal>

      {/* ── Payroll Details Drawer ── */}
      <Drawer
        title="Payroll Details"
        placement="right"
        width={640}
        open={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        styles={{ body: { background: "#f8fafc", padding: 16 } }}
      >
        {selectedPayroll && (
          <div>
            {/* Header card */}
            <div
              style={{
                ...cardStyle,
                padding: "14px 16px",
                marginBottom: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <Text strong style={{ fontSize: 14, display: "block" }}>
                  {selectedPayroll.payroll_id}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b" }}>
                  {selectedPayroll.department_id?.name} · {dayjs(selectedPayroll.period_start).format("MMM D")} –{" "}
                  {dayjs(selectedPayroll.period_end).format("MMM D, YYYY")}
                </Text>
              </div>
              <Tag color={STATUS_CONFIG[selectedPayroll.status]?.color} style={{ margin: 0 }}>
                {STATUS_CONFIG[selectedPayroll.status]?.label}
              </Tag>
            </div>

            {/* Totals */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <StatCard
                title="Gross"
                value={`KES ${(selectedPayroll.total_gross ?? 0).toLocaleString()}`}
                icon={<DollarOutlined />}
                color="#3b82f6"
              />
              <StatCard
                title="Deductions"
                value={`KES ${(selectedPayroll.total_deductions ?? 0).toLocaleString()}`}
                icon={<DeleteOutlined />}
                color="#ef4444"
              />
              <StatCard
                title="Net Pay"
                value={`KES ${(selectedPayroll.total_net ?? 0).toLocaleString()}`}
                icon={<CheckCircleOutlined />}
                color="#10b981"
              />
            </div>

            {/* Deduction breakdown */}
            <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  display: "block",
                  marginBottom: 10,
                }}
              >
                Deduction Breakdown
              </Text>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "PAYE", value: selectedPayroll.total_paye },
                  { label: "NSSF", value: selectedPayroll.total_nssf },
                  { label: "SHA", value: selectedPayroll.total_nhif },
                  { label: "Housing Levy", value: selectedPayroll.total_housing_levy },
                  { label: "Custom", value: selectedPayroll.total_custom_deductions },
                ].map((d) => (
                  <div
                    key={d.label}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "6px 12px",
                      minWidth: 100,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>{d.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: 600 }}>
                      KES {(d.value || 0).toLocaleString()}
                    </Text>
                  </div>
                ))}
              </div>
            </div>

            {/* Lines */}
            <div style={{ ...cardStyle, padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Payroll Lines ({selectedPayroll.lines?.length || 0})
                </Text>
                {selectedPayroll.status === "draft" && (
                  <Text style={{ fontSize: 11, color: "#94a3b8" }}>Draft — lines can be edited</Text>
                )}
              </div>
              <Table
                dataSource={selectedPayroll.lines || []}
                rowKey={(record: any) => record._id || record.employee_id?._id}
                size="small"
                pagination={false}
                scroll={{ y: 320 }}
                expandable={{
                  expandedRowRender: (line: any) => {
                    const items = [
                      { label: "PAYE", value: line.deductions?.paye },
                      { label: "NSSF", value: line.deductions?.nssf },
                      { label: "SHA", value: line.deductions?.nhif },
                      { label: "Housing Levy", value: line.deductions?.housing_levy },
                      ...(line.deductions?.custom || []).map((c: any) => ({
                        label: `${c.name} (custom)`,
                        value: c.amount,
                      })),
                    ];
                    return (
                      <div
                        style={{
                          display: "flex",
                          gap: 16,
                          flexWrap: "wrap",
                          padding: "8px 4px",
                          background: "#fafafa",
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ minWidth: 180 }}>
                          <Text style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                            Earnings
                          </Text>
                          {[
                            { label: "Basic", value: line.basic_salary },
                            { label: "Allowances", value: line.allowances },
                            { label: "Benefits", value: line.benefits },
                            { label: "Overtime", value: line.overtime_pay },
                          ].map((e) => (
                            <div key={e.label} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12 }}>
                              <Text style={{ color: "#64748b" }}>{e.label}</Text>
                              <Text>KES {(e.value ?? 0).toLocaleString()}</Text>
                            </div>
                          ))}
                        </div>
                        <div style={{ minWidth: 200 }}>
                          <Text style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                            Deductions
                          </Text>
                          {items.map((d) => (
                            <div key={d.label} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12 }}>
                              <Text style={{ color: "#64748b" }}>{d.label}</Text>
                              <Text style={{ color: "#ef4444" }}>KES {(d.value ?? 0).toLocaleString()}</Text>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginLeft: "auto", alignSelf: "center" }}>
                          <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Net Pay</Text>
                          <Text strong style={{ fontSize: 15, color: "#10b981" }}>
                            KES {(line.net_pay ?? 0).toLocaleString()}
                          </Text>
                        </div>
                      </div>
                    );
                  },
                }}
                columns={[
                  {
                    title: "Employee",
                    key: "employee",
                    render: (_: any, line: any) => (
                      <div>
                        <Text style={{ fontSize: 12, fontWeight: 500, display: "block" }}>
                          {line.employee_id?.user_id?.fullname ||
                            line.employee_id?.fullname ||
                            line.employee_id?.employee_number ||
                            "—"}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                          {[line.employee_id?.employee_number, line.employee_id?.job_title]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </div>
                    ),
                  },
                  {
                    title: "Gross",
                    dataIndex: "gross_salary",
                    align: "right",
                    render: (val: number) => `KES ${(val ?? 0).toLocaleString()}`,
                  },
                  {
                    title: "Deductions",
                    dataIndex: ["deductions", "total"],
                    align: "right",
                    render: (val: number) => (
                      <Text style={{ color: "#ef4444" }}>KES {(val || 0).toLocaleString()}</Text>
                    ),
                  },
                  {
                    title: "Net Pay",
                    dataIndex: "net_pay",
                    align: "right",
                    render: (val: number) => (
                      <Text style={{ color: "#10b981", fontWeight: 600 }}>
                        KES {(val ?? 0).toLocaleString()}
                      </Text>
                    ),
                  },
                  ...(selectedPayroll.status === "draft"
                    ? [
                        {
                          title: "",
                          key: "edit",
                          width: 40,
                          render: (_: any, line: any) => (
                            <Tooltip title="Edit line">
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined style={{ color: primaryColor }} />}
                                onClick={() => openLineModal(line)}
                              />
                            </Tooltip>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PayrollManagement;
