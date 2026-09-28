import React, { useState, useEffect } from "react";
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
  Progress,
  Dropdown,
  Grid,
  Segmented,
  AutoComplete,
} from "antd";
import {
  DollarOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
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
  FileExcelOutlined,
  FilePdfOutlined,
  MoreOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { exportPayrollToExcel, exportPayrollToPDF, exportPayrollsToExcel, exportPayrollsToPDF } from "@utils/payrollExport";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUser } from "@services/tenants";
import { getPermissionChecker } from "@utils/getPermissionChecker";
import {
  fetchPayrolls,
  generatePayroll,
  deletePayroll,
  saveDeductionSettings,
  submitPayrollForApproval,
  approvePayrollRequest,
  rejectPayrollRequest,
  generateBatchPayslips,
  previewPayroll,
  duplicatePayroll,
  patchPayrollLine,
  processPayrollRequest,
  markPayrollPaid,
  initializeDeductionSettings,
  fetchDeductionConfigs,
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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const user = getUser();
  const checkPerms = getPermissionChecker();
  const can = (k: string) => user?.role === "admin" || user?.isAdmin === true || checkPerms(k);
  const canGenerate = can("BANDU_PAYROLL_GENERATE");
  const canUpdatePayroll = can("BANDU_PAYROLL_UPDATE");
  const canApprovePayroll = can("BANDU_PAYROLL_APPROVE");
  const canProcessPayroll = can("BANDU_PAYROLL_PROCESS");
  const canDeletePayroll = can("BANDU_PAYROLL_DELETE");
  const canExportPayroll = can("BANDU_PAYROLL_EXPORT");
  const canGeneratePayslips = can("BANDU_PAYSLIPS_GENERATE");
  const queryClient = useQueryClient();
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [payrollMode, setPayrollMode] = useState<"department" | "employee">("department");
  const [activeTab, setActiveTab] = useState("draft");
  const [filterYear, setFilterYear] = useState<number | undefined>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | undefined>(new Date().getMonth() + 1);
  const [filterDept, setFilterDept] = useState<string | undefined>(undefined);
  // Payroll detail drawer — toggle between employee names and numbers
  const [showEmployeeNames, setShowEmployeeNames] = useState(true);
  const [form] = Form.useForm();
  const [deductionForm] = Form.useForm();
  const [customDeductions, setCustomDeductions] = useState<
    Array<{ id: string; _id?: string; name: string; amount: number; is_percentage: boolean; end_date?: string | null }>
  >([]);
  // Custom configs removed in the UI — sent as deleted_custom_ids on save
  const [deletedCustomIds, setDeletedCustomIds] = useState<string[]>([]);

  // Generate modal 2-step state: 0 = configure, 1 = review computed preview
  const [generateStep, setGenerateStep] = useState<0 | 1>(0);
  const [previewData, setPreviewData] = useState<PayrollPreviewResult | null>(null);

  // Bulk row selection — toolbar actions appear when payrolls are picked.
  // Employees view selects payroll *lines*; actions apply to their parent payrolls.
  const [selectedPayrollIds, setSelectedPayrollIds] = useState<string[]>([]);
  const [selectedLineKeys, setSelectedLineKeys] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  // Payroll list view — flat employee lines (default) or grouped by department
  const [payrollView, setPayrollView] = useState<"employees" | "branches">("employees");
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

  // Preview-line edit — per-employee overrides recomputed server-side
  const [isPreviewLineModalOpen, setIsPreviewLineModalOpen] = useState(false);
  const [editingPreviewLine, setEditingPreviewLine] = useState<any>(null);
  const [previewOverrides, setPreviewOverrides] = useState<Record<string, any>>({});

  // Configured deduction types — custom entries (loans, advances…) persist here
  const { data: deductionConfigs } = useQuery({
    queryKey: ["deduction-configs"],
    queryFn: () => fetchDeductionConfigs(),
  });

  useEffect(() => {
    if (!deductionConfigs) return;
    setCustomDeductions(
      deductionConfigs
        .filter((c: any) => c.deduction_type === "CUSTOM")
        .map((c: any) => ({
          id: c._id,
          _id: c._id,
          name: c.name,
          amount: c.calculation_method === "percentage" ? (c.rate || 0) * 100 : (c.fixed_amount || 0),
          is_percentage: c.calculation_method === "percentage",
          end_date: c.end_date || null,
        }))
    );
  }, [deductionConfigs]);

  // Fetch payrolls
  const { data: payrollsData, isLoading } = useQuery({
    queryKey: ["payrolls", filterYear, filterMonth],
    queryFn: () => fetchPayrolls({ limit: 200, year: filterYear, month: filterMonth }),
  });

  const payrolls = React.useMemo(
    () => Array.isArray(payrollsData) ? payrollsData : payrollsData?.data || [],
    [payrollsData]
  );

  // Pipeline tabs are cumulative: an "approved" payroll keeps showing under
  // Approved when it moves to processed/paid; paid also shows under Processed.
  const TAB_STATUS_MAP: Record<string, string[]> = {
    draft: ["draft"],
    pending_approval: ["pending_approval"],
    approved: ["approved", "processed", "paid"],
    processed: ["processed", "paid"],
    paid: ["paid"],
  };

  // Department filter applies before the status tabs
  const deptFilteredPayrolls = React.useMemo(
    () => (filterDept ? payrolls.filter((p: Payroll) => p.department_id?._id === filterDept) : payrolls),
    [payrolls, filterDept]
  );

  // Filter payrolls based on active tab
  const filteredPayrolls = React.useMemo(() => {
    if (activeTab === "deductions") return [];
    const statuses = TAB_STATUS_MAP[activeTab] || [activeTab];
    return deptFilteredPayrolls.filter((p: Payroll) => statuses.includes(p.status));
  }, [deptFilteredPayrolls, activeTab]);

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

  // ── Per-employee "Results" breakdown (KRA payslip sequence) ──
  const renderLineResults = (line: any, periodLabel?: string) => {
    const d = line.deductions || {};
    const taxable =
      d.taxable_pay ??
      Math.max(0, (line.gross_salary || 0) - (d.nssf || 0) - (d.nhif || 0) - (d.housing_levy || 0));
    const incomeTax = d.income_tax ?? 0;
    const relief = d.personal_relief ?? 0;
    const paye = d.paye ?? Math.max(0, incomeTax - relief);
    const payAfterTax = taxable - paye;
    const wht = d.withholding_tax || 0;
    const customTotal = (d.custom || []).reduce((s: number, c: any) => s + (c.amount || 0), 0);

    const f = (v: any) =>
      Number(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const Row = ({ label, value, strong = false, color = "#334155" }: any) => (
      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #f1f5f9" }}>
        <Text strong={strong} style={{ fontSize: 11.5, color, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</Text>
        <Text strong={strong} style={{ fontSize: 11.5, color }}>{f(value)}</Text>
      </div>
    );

    return (
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 16px", maxWidth: 380, margin: "2px 0 6px" }}>
        <Text strong style={{ fontSize: 10.5, color: "#94a3b8", letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
          Results{periodLabel ? ` · Payslip for ${periodLabel}` : ""}
        </Text>
        <Row label="Basic Pay" value={line.gross_salary} />
        <Row label="NSSF" value={-(d.nssf || 0)} color="#64748b" />
        <Row label="S.H.I.F." value={-(d.nhif || 0)} color="#64748b" />
        <Row label="Housing Levy" value={-(d.housing_levy || 0)} color="#64748b" />
        <Row label="Taxable Pay" value={taxable} strong />
        <Row label="Income Tax" value={incomeTax} />
        <Row label="Personal Relief" value={-relief} />
        <Row label="P.A.Y.E" value={paye} strong color="#ef4444" />
        <Row label="Pay After Tax" value={payAfterTax} strong />
        {wht > 0 && <Row label="Withholding Tax" value={-wht} color="#64748b" />}
        {customTotal > 0 && <Row label="Other Deductions" value={-customTotal} color="#64748b" />}
        <Row label="Net Pay" value={line.net_pay} strong color="#10b981" />
      </div>
    );
  };

  // Full payroll-line columns — every deduction shown inline (master-roll layout)
  const moneyCol = (
    title: string,
    getter: (l: any) => number | undefined,
    color?: string,
    strong = false,
    width = 96
  ) => ({
    title,
    key: title,
    align: "right" as const,
    width,
    render: (_: any, line: any) => (
      <Text strong={strong} style={color ? { color } : undefined}>
        {(getter(line) ?? 0).toLocaleString()}
      </Text>
    ),
  });

  const payrollLineColumns = (showNames: boolean, lines?: any[]) => {
    // Hide Allowances / Benefits / Overtime when every line has zero
    const hideZero = (key: string, getter: (l: any) => number | undefined) =>
      !!lines && lines.length > 0 && lines.every((l) => !(getter(l) || 0));
    const hidden = {
      Allowances: hideZero("Allowances", (l) => l.allowances),
      Benefits: hideZero("Benefits", (l) => l.benefits),
      Overtime: hideZero("Overtime", (l) => l.overtime_pay),
    };
    return [
    {
      title: "Employee",
      key: "employee",
      fixed: "left" as const,
      width: 190,
      render: (_: any, line: any) => {
        const empName =
          line.employee_id?.user_id?.fullname ||
          line.employee_id?.fullname ||
          line.fullname ||
          undefined;
        const empNo = line.employee_id?.employee_number || line.employee_number;
        return (
          <div>
            <Text style={{ fontSize: 12, fontWeight: 500, display: "block" }}>
              {showNames ? empName || empNo || "—" : empNo || empName || "—"}
            </Text>
            <Text style={{ fontSize: 11, color: "#94a3b8" }}>
              {[showNames ? empNo : empName, line.employee_id?.job_title || line.job_title]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            {line.proration_factor != null && line.proration_factor < 1 && (
              <Tag color="orange" style={{ margin: "2px 0 0", fontSize: 10 }}>
                Prorated{line.days_worked ? ` — ${line.days_worked} days` : ""} ({Math.round(line.proration_factor * 100)}%)
              </Tag>
            )}
          </div>
        );
      },
    },
    moneyCol("Basic Pay", (l) => l.basic_salary),
    moneyCol("Allowances", (l) => l.allowances),
    moneyCol("Benefits", (l) => l.benefits),
    moneyCol("Overtime", (l) => l.overtime_pay, undefined, false, 80),
    moneyCol("Gross Pay", (l) => l.gross_salary, undefined, true),
    moneyCol("S.H.I.F.", (l) => l.deductions?.nhif, undefined, false, 80),
    // NSSF & Housing Levy are matched contributions — show employee + employer
    // shares and the combined total (old payrolls lack employer_* fields; the
    // employer share equals the employee's for both levies)
    {
      title: "N.S.S.F. (EE / ER / Σ)",
      key: "nssf",
      align: "right" as const,
      width: 115,
      render: (_: any, l: any) => {
        const ee = l.deductions?.nssf || 0;
        const er = l.deductions?.employer_nssf ?? ee;
        return (
          <div style={{ lineHeight: 1.4 }}>
            <Text style={{ fontSize: 11 }}>{ee.toLocaleString()}</Text>
            <Text style={{ fontSize: 11, color: "#64748b" }}> / {er.toLocaleString()} / </Text>
            <Text strong style={{ fontSize: 11 }}>{(ee + er).toLocaleString()}</Text>
          </div>
        );
      },
    },
    {
      title: "Housing Levy (EE / ER / Σ)",
      key: "housing_levy",
      align: "right" as const,
      width: 115,
      render: (_: any, l: any) => {
        const ee = l.deductions?.housing_levy || 0;
        const er = l.deductions?.employer_housing_levy ?? ee;
        return (
          <div style={{ lineHeight: 1.4 }}>
            <Text style={{ fontSize: 11 }}>{ee.toLocaleString()}</Text>
            <Text style={{ fontSize: 11, color: "#64748b" }}> / {er.toLocaleString()} / </Text>
            <Text strong style={{ fontSize: 11 }}>{(ee + er).toLocaleString()}</Text>
          </div>
        );
      },
    },
    moneyCol("WHT", (l) => l.deductions?.withholding_tax, undefined, false, 70),
    moneyCol("PAYE (Tax)", (l) => l.deductions?.paye, undefined, false, 90),
    // Custom deductions shown as named columns (loans, advances…) instead of a
    // generic "Other" bucket — one column per name present in the data
    ...(lines
      ? Array.from(
          new Set(
            lines.flatMap((l) => (l.deductions?.custom || []).map((c: any) => c.name).filter(Boolean))
          )
        ).map((name) =>
          moneyCol(
            String(name),
            (l) => (l.deductions?.custom || []).find((c: any) => c.name === name)?.amount || 0,
            undefined,
            false,
            90
          )
        )
      : []),
    moneyCol("Total Deductions", (l) => l.deductions?.total, "#ef4444", true, 110),
    moneyCol("Net Pay", (l) => l.net_pay, "#10b981", true),
    // Single employer-side total — per-deduction employer columns stay in the exports
    moneyCol(
      "Employer Contrib.",
      (l) =>
        (l.deductions?.employer_nssf ?? l.deductions?.nssf ?? 0) +
        (l.deductions?.employer_housing_levy ?? l.deductions?.housing_levy ?? 0) +
        (l.deductions?.employer_nita ?? l.deductions?.nita ?? 0),
      "#64748b",
      false,
      115
    ),
    ].filter((c: any) => !hidden[c.title as keyof typeof hidden]);
  };

  // Employees view — flat payroll-line rows across all payrolls in the tab
  const employeeRows = React.useMemo(
    () =>
      filteredPayrolls.flatMap((p: Payroll) =>
        (p.lines || []).map((l: any) => ({ ...l, _payroll: p }))
      ),
    [filteredPayrolls]
  );

  const lineKey = (r: any) =>
    r._id || `${r._payroll?._id}-${r.employee_id?._id || r.employee_id}`;

  const employeeViewColumns = [
    payrollLineColumns(showEmployeeNames, employeeRows)[0],
    {
      title: "Department",
      key: "department",
      width: 130,
      render: (_: any, l: any) => (
        <Text style={{ fontSize: 12 }}>{l._payroll?.department_id?.name || "—"}</Text>
      ),
    },
    {
      title: "Period",
      key: "period",
      width: 110,
      render: (_: any, l: any) => (
        <Text style={{ fontSize: 12 }}>{l._payroll?.period_label || "—"}</Text>
      ),
    },
    ...payrollLineColumns(showEmployeeNames, employeeRows).slice(1),
    {
      title: "Status",
      key: "status",
      width: 105,
      render: (_: any, l: any) => {
        const s = l._payroll?.status;
        const cfg = STATUS_CONFIG[s] || { color: "default", label: s || "—" };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
  ];

  // Generate payroll mutation
  // Payroll generation runs one request per department so the progress bar
  // shows real advancement (each chunk completes a department).
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<{ done: number; total: number } | null>(null);

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
      sha_income_limit: 0,
      // Housing Levy — 1.5% of gross, uncapped
      housing_levy_enabled: true,
      housing_levy_rate: 1.5,
      housing_levy_income_limit: 0,
      housing_levy_employee_share: 50,
      // NITA — flat KES 50 per employee (employer-paid)
      nita_enabled: true,
      nita_amount: 50,
      // Withholding Tax — 5% for consultants
      withholding_tax_enabled: true,
      withholding_tax_rate: 5,
    });
    message.success("Form filled with current Kenyan statutory rates — review then Save Settings");
  };

  const handleSaveDeductions = async () => {
    try {
      const values = await deductionForm.validateFields();
      saveDeductionMutation.mutate(
        {
          ...values,
          // Persisted customs keep their _id; new rows have none (created by name)
          custom_deductions: customDeductions.map((d) => ({
            _id: d._id,
            name: d.name,
            amount: d.amount,
            is_percentage: d.is_percentage,
            end_date: d.end_date || null,
          })),
          deleted_custom_ids: deletedCustomIds,
        },
        {
          onSuccess: () => {
            setDeletedCustomIds([]);
            queryClient.invalidateQueries({ queryKey: ["deduction-configs"] });
          },
        }
      );
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const addCustomDeduction = () => {
    const newDeduction = {
      id: `new-${Date.now()}`,
      name: "",
      amount: 0,
      is_percentage: false,
    };
    setCustomDeductions([...customDeductions, newDeduction]);
  };

  const removeCustomDeduction = (id: string) => {
    const removed = customDeductions.find((d) => d.id === id);
    if (removed?._id) setDeletedCustomIds([...deletedCustomIds, removed._id]);
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

  // Reject payroll mutation — returns pending_approval payrolls to drafts
  const rejectMutation = useMutation({
    mutationFn: ({ payrollId, reason }: { payrollId: string; reason?: string }) =>
      rejectPayrollRequest(payrollId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });

  const handleRejectPayroll = (payroll: Payroll) => {
    let reason = "";
    Modal.confirm({
      title:
        payroll.status === "pending_approval"
          ? "Reject this payroll?"
          : "Return this payroll to drafts?",
      content: (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            It will be moved back to Drafts for amendments.
            {payroll.status === "processed" && " The accounting entry will be reversed."}
          </Text>
          <Input.TextArea
            rows={2}
            placeholder="Reason (optional)"
            style={{ marginTop: 8 }}
            onChange={(e) => { reason = e.target.value; }}
          />
        </div>
      ),
      okText: payroll.status === "pending_approval" ? "Reject" : "Return to Drafts",
      okButtonProps: { danger: true },
      onOk: () =>
        rejectMutation.mutate({ payrollId: payroll._id, reason: reason.trim() || undefined }),
    });
  };

  // ── Bulk actions on selected payrolls ────────────────────────────────────
  const runBulk = async (label: string, fn: (id: string) => Promise<any>) => {
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(selectedPayrolls.map((p) => fn(p._id)));
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - ok;
      if (failed === 0) message.success(`${label} — ${ok} payroll(s)`);
      else if (ok === 0) message.error(`${label} failed for all ${results.length} payroll(s)`);
      else message.warning(`${label} — ${ok} succeeded, ${failed} failed`);
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    } finally {
      setBulkBusy(false);
      setSelectedPayrollIds([]);
      setSelectedLineKeys([]);
    }
  };

  const handleBulkReject = () => {
    let reason = "";
    Modal.confirm({
      title: `Return ${selectedPayrolls.length} payroll(s) to drafts?`,
      content: (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            They will be moved back to Drafts for amendments. Accounting entries already posted will be reversed.
          </Text>
          <Input.TextArea
            rows={2}
            placeholder="Reason for rejection (optional — applies to all)"
            style={{ marginTop: 8 }}
            onChange={(e) => { reason = e.target.value; }}
          />
        </div>
      ),
      okText: "Return to Drafts",
      okButtonProps: { danger: true },
      onOk: () => runBulk("Return to drafts", (id) => rejectPayrollRequest(id, reason.trim() || undefined)),
    });
  };

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

  // Step 2 → confirm and generate draft (chunked per department for progress)
  const handleGeneratePayroll = async () => {
    if (!pendingGenerateParams || isGenerating) return;

    const { department_ids, employee_ids, ...rest } = pendingGenerateParams;
    const chunks: GeneratePayrollParams[] = department_ids?.length
      ? department_ids.map((id) => ({ ...rest, department_ids: [id], overrides: previewOverrides }))
      : [{ ...rest, employee_ids, overrides: previewOverrides }];

    setIsGenerating(true);
    setGenerateProgress({ done: 0, total: chunks.length });
    const allSkipped: any[] = [];
    let created = 0;
    try {
      for (const chunk of chunks) {
        const res = await generatePayroll(chunk);
        allSkipped.push(...(res?.skipped || []));
        created += res?.payrolls?.length ?? (res?.payroll ? 1 : 0);
        setGenerateProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
      if (allSkipped.length) {
        message.warning(
          `Some payrolls were skipped: ${allSkipped.map((s: any) => s.department_name || s.reason || s.department_id).join(", ")}`
        );
      }
      message.success(`${created} payroll draft${created === 1 ? "" : "s"} generated`);
      closeGenerateModal();
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    } catch (error: any) {
      const doneMsg = created > 0 ? ` (${created} already created)` : "";
      message.error(
        (error?.response?.data?.message || error?.message || "Failed to generate payroll") + doneMsg
      );
    } finally {
      setIsGenerating(false);
      setGenerateProgress(null);
    }
  };

  const closeGenerateModal = () => {
    setIsGenerateModalOpen(false);
    setGenerateStep(0);
    setPreviewData(null);
    setPendingGenerateParams(null);
    setPreviewOverrides({});
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

  // Shared line-edit form — used by the draft line modal and the preview edit modal
  const renderLineEditForm = () => {
    const configuredCustoms = (deductionConfigs || []).filter(
      (c: any) => c.deduction_type === "CUSTOM" && c.is_active !== false
    );
    return (
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
          <Col span={12}>
            <Form.Item
              name="overtime_pay"
              label="Overtime Pay"
              tooltip="Only used when overtime hours are left blank"
            >
              <InputNumber min={0} style={{ width: "100%" }} addonBefore="KES" />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: "8px 0 12px" }}>
          <Text style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>
            Custom Deductions — loans, advances, union dues…
          </Text>
        </Divider>

        {lineCustomDeductions.map((ded) => (
          <Row key={ded.key} gutter={8} style={{ marginBottom: 8 }}>
            <Col span={14}>
              <AutoComplete
                style={{ width: "100%" }}
                allowClear
                placeholder="Deduction name — pick configured or type custom"
                value={ded.name}
                options={configuredCustoms.map((c: any) => ({ value: c.name }))}
                getPopupContainer={(node) => node.parentElement as HTMLElement}
                filterOption={(input, option) =>
                  String(option?.value ?? "").toLowerCase().includes(input.toLowerCase())
                }
                onChange={(v) => {
                  const cfg = configuredCustoms.find((c: any) => c.name === v);
                  setLineCustomDeductions(
                    lineCustomDeductions.map((d) =>
                      d.key === ded.key
                        ? {
                            ...d,
                            name: v,
                            // Prefill the configured amount for known deductions (e.g. a loan)
                            amount:
                              cfg && !d.amount
                                ? cfg.calculation_method === "percentage"
                                  ? 0
                                  : cfg.fixed_amount || 0
                                : d.amount,
                          }
                        : d
                    )
                  );
                }}
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
    );
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
            overtime_pay: values.overtime_pay,
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

  // Open preview-line edit modal — overrides are recomputed server-side
  const openPreviewLineModal = (line: any) => {
    const employeeId = String(line.employee_id?._id || line.employee_id);
    const existing = previewOverrides[employeeId];
    setEditingPreviewLine(line);
    lineForm.setFieldsValue({
      basic_salary: existing?.basic_salary ?? line.basic_salary,
      allowances: existing?.allowances ?? line.allowances,
      benefits: existing?.benefits ?? line.benefits,
      overtime_hours: existing?.overtime_hours ?? line.overtime_hours,
      overtime_pay: existing?.overtime_pay ?? line.overtime_pay,
    });
    setLineCustomDeductions(
      (existing?.custom_deductions || line.deductions?.custom || []).map((c: any, i: number) => ({
        key: i,
        name: c.name,
        amount: c.amount,
      }))
    );
    setIsPreviewLineModalOpen(true);
  };

  const handleSavePreviewLine = async () => {
    if (!editingPreviewLine || !pendingGenerateParams) return;
    try {
      const values = await lineForm.validateFields();
      const employeeId = String(editingPreviewLine.employee_id?._id || editingPreviewLine.employee_id);
      const overrides = {
        ...previewOverrides,
        [employeeId]: {
          basic_salary: values.basic_salary,
          allowances: values.allowances,
          benefits: values.benefits,
          overtime_hours: values.overtime_hours,
          overtime_pay: values.overtime_pay,
          custom_deductions: lineCustomDeductions
            .filter((d) => d.name && d.amount > 0)
            .map(({ name, amount }) => ({ name, amount })),
        },
      };
      setPreviewOverrides(overrides);
      setIsPreviewLineModalOpen(false);
      setEditingPreviewLine(null);
      lineForm.resetFields();
      setLineCustomDeductions([]);
      // Re-run the preview so statutory deductions recompute on the new figures
      previewMutation.mutate({ ...pendingGenerateParams, overrides });
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
      render: (id: string, record: Payroll) => (
        <Space size={6}>
          <Text style={{ fontSize: 12 }}>{id}</Text>
          {record.supplementary_of && (
            <Tooltip title="Supplementary run — employees added after the main payroll">
              <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>Supp.</Tag>
            </Tooltip>
          )}
        </Space>
      ),
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
      align: "right" as const,
      render: (amount: number) => (
        <Text style={{ fontSize: 12, fontWeight: 500 }}>
          KES {(amount ?? 0).toLocaleString()}
        </Text>
      ),
    },
    ...[
      { title: "PAYE", field: "total_paye" },
      { title: "NSSF", field: "total_nssf" },
      { title: "S.H.I.F.", field: "total_nhif" },
      { title: "Housing Levy", field: "total_housing_levy" },
      { title: "WHT", field: "total_withholding_tax" },
      { title: "NITA (Employer)", field: "total_nita" },
      { title: "Other", field: "total_custom_deductions" },
    ].map(({ title, field }) => ({
      title,
      dataIndex: field,
      key: field,
      align: "right" as const,
      render: (amount: number) => (
        <Text style={{ fontSize: 12, color: "#ef4444" }}>
          {(amount ?? 0).toLocaleString()}
        </Text>
      ),
    })),
    {
      title: "Net Pay",
      dataIndex: "total_net",
      key: "total_net",
      align: "right" as const,
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
      render: (status: string, record: Payroll) => {
        const config = STATUS_CONFIG[status] || { color: "default", label: status };
        return (
          <Space size={4}>
            <Tag color={config.color}>{config.label}</Tag>
            {status === "draft" && record.rejection_reason && (
              <Tooltip title={`Rejected: ${record.rejection_reason}`}>
                <Tag color="red">Rejected</Tag>
              </Tooltip>
            )}
            {record.payslips_generated && (
              <Tooltip title={`Payslips generated${record.payslips_generated_at ? ` on ${dayjs(record.payslips_generated_at).format("DD MMM YYYY HH:mm")}` : ""}`}>
                <Tag color="cyan" icon={<FileTextOutlined />}>Payslips</Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 48,
      align: "center" as const,
      render: (_: any, record: Payroll) => {
        const confirmThen = (title: string, onOk: () => void, danger = false) => () =>
          Modal.confirm({
            title,
            content: danger ? "This action cannot be undone." : "Do you want to continue?",
            okText: danger ? "Delete" : "Confirm",
            okButtonProps: danger ? { danger: true } : undefined,
            onOk,
          });

        const items: any[] = [
          {
            key: "view",
            label: "View",
            icon: <EyeOutlined />,
            onClick: () => handleViewDetails(record),
          },
        ];
        if (canGenerate) {
          items.push({
            key: "duplicate",
            label: "Duplicate",
            icon: <CopyOutlined />,
            onClick: () => openDuplicateModal(record),
          });
        }

        if (record.status === "draft" && canUpdatePayroll) {
          items.push({
            key: "edit",
            label: "Edit Lines",
            icon: <EditOutlined />,
            onClick: () => handleViewDetails(record),
          });
          items.push({
            key: "submit",
            label: "Submit for Approval",
            icon: <SendOutlined />,
            onClick: confirmThen("Submit this payroll for approval?", () =>
              submitForApprovalMutation.mutate(record._id)
            ),
          });
        }
        if (record.status === "pending_approval" && canApprovePayroll) {
          items.push({
            key: "approve",
            label: "Approve",
            icon: <CheckCircleOutlined />,
            onClick: confirmThen("Approve this payroll?", () =>
              approveMutation.mutate(record._id)
            ),
          });
          items.push({
            key: "reject",
            label: "Reject to Drafts",
            icon: <CloseCircleOutlined />,
            danger: true,
            onClick: () => handleRejectPayroll(record),
          });
        }
        if (["approved", "processed"].includes(record.status) && canApprovePayroll) {
          items.push({
            key: "revert",
            label: "Return to Drafts",
            icon: <CloseCircleOutlined />,
            danger: true,
            onClick: () => handleRejectPayroll(record),
          });
        }
        if (record.status === "approved" && canProcessPayroll) {
          items.push({
            key: "process",
            label: "Process",
            icon: <SendOutlined />,
            onClick: confirmThen("Process this payroll? (posts accrual to accounting)", () =>
              processMutation.mutate(record._id)
            ),
          });
        }
        if ((record.status === "approved" || record.status === "processed") && canProcessPayroll) {
          items.push({
            key: "paid",
            label: "Mark Paid",
            icon: <PayCircleOutlined />,
            onClick: () => handleMarkPaid(record),
          });
        }
        if (["approved", "processed", "paid"].includes(record.status) && canGeneratePayslips) {
          items.push({
            key: "payslips",
            label: "Generate Payslips",
            icon: <FileTextOutlined />,
            onClick: confirmThen("Generate payslips for all employees?", () =>
              generateBatchPayslipsMutation.mutate(record._id)
            ),
          });
        }

        if (canDeletePayroll) {
          items.push({ type: "divider" });
          items.push({
            key: "delete",
            label: "Delete",
            icon: <DeleteOutlined />,
            danger: true,
            onClick: confirmThen(
              "Delete payroll?",
              () => deleteMutation.mutate(record._id),
              true
            ),
          });
        }

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </div>
        );
      },
    },
  ];

  // Which bulk actions apply to the current selection — branches view selects
  // payrolls directly; employees view selects lines, deduped to parent payrolls.
  const selectedPayrolls =
    payrollView === "branches"
      ? filteredPayrolls.filter((p: Payroll) => selectedPayrollIds.includes(p._id))
      : Array.from(
          new Map(
            employeeRows
              .filter((l: any) => selectedLineKeys.includes(lineKey(l)))
              .map((l: any) => [l._payroll._id, l._payroll])
          ).values()
        );
  const allSelectedStatus = (...statuses: string[]) =>
    selectedPayrolls.length > 0 && selectedPayrolls.every((p) => statuses.includes(p.status));
  const allSelectedPending = allSelectedStatus("pending_approval");
  const allSelectedRevertible = allSelectedStatus("pending_approval", "approved", "processed");
  const allSelectedDraft = allSelectedStatus("draft");
  const allSelectedProcessable = allSelectedStatus("approved");
  const allSelectedPayable = allSelectedStatus("approved", "processed");
  const allSelectedPayslipable = allSelectedStatus("approved", "processed", "paid");
  const allSelectedDeletable = allSelectedStatus("draft", "pending_approval", "approved", "void");

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
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
            value={filterDept}
            onChange={setFilterDept}
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="All departments"
            style={{ width: 180 }}
            options={departments.map((d: any) => ({
              value: d._id,
              label: d.code ? `${d.name} (${d.code})` : d.name,
            }))}
          />
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
          {canExportPayroll && (
            <Dropdown
              menu={{
                items: [
                  {
                    key: "excel",
                    label: `Export to Excel (${filteredPayrolls.length} payroll${filteredPayrolls.length === 1 ? "" : "s"})`,
                    icon: <FileExcelOutlined />,
                    onClick: () => exportPayrollsToExcel(filteredPayrolls),
                  },
                  {
                    key: "pdf",
                    label: `Export to PDF (${filteredPayrolls.length} payroll${filteredPayrolls.length === 1 ? "" : "s"})`,
                    icon: <FilePdfOutlined />,
                    onClick: () => exportPayrollsToPDF(filteredPayrolls),
                  },
                ],
              }}
              trigger={["click"]}
              disabled={filteredPayrolls.length === 0 || activeTab === "deductions"}
            >
              <Button icon={<DownloadOutlined />} disabled={filteredPayrolls.length === 0 || activeTab === "deductions"}>
                Export
              </Button>
            </Dropdown>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ["payrolls"] })}
            loading={isLoading}
          >
            Refresh
          </Button>
          {canGenerate && (
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
          )}
        </Space>
      </div>

      {/* ── Tabs ── */}
      <Tabs activeKey={activeTab} onChange={(k) => { setActiveTab(k); setSelectedPayrollIds([]); setSelectedLineKeys([]); }}>
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
                  {deptFilteredPayrolls.filter((p: Payroll) => (TAB_STATUS_MAP[tab.key] || [tab.key]).includes(p.status)).length}
                </span>
              </Space>
            }
          >
            {/* ── Summary Stats ── */}
            <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title={tab.countTitle}
                  value={filteredPayrolls.length}
                  icon={tab.icon}
                  color={tab.color}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title="Total Gross"
                  value={`KES ${filteredPayrolls.reduce((sum: number, p: Payroll) => sum + (p.total_gross || 0), 0).toLocaleString()}`}
                  icon={<DollarOutlined />}
                  color="#3b82f6"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title="Total Net"
                  value={`KES ${filteredPayrolls.reduce((sum: number, p: Payroll) => sum + (p.total_net || 0), 0).toLocaleString()}`}
                  icon={<CheckCircleOutlined />}
                  color="#10b981"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <Text style={{ fontSize: 12, color: "#64748b" }}>
                  {payrollView === "employees"
                    ? `${employeeRows.length} employee line(s)`
                    : `${filteredPayrolls.length} payroll(s)`}
                </Text>
                <Segmented
                  size="small"
                  value={payrollView}
                  onChange={(v) => {
                    setPayrollView(v as "employees" | "branches");
                    setSelectedPayrollIds([]);
                    setSelectedLineKeys([]);
                  }}
                  options={[
                    { label: "Employees", value: "employees" },
                    { label: "Departments", value: "branches" },
                  ]}
                />
              </div>
              {(selectedPayrollIds.length > 0 || selectedLineKeys.length > 0) && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    padding: "8px 12px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <Text style={{ fontSize: 12 }}>
                    <Text strong style={{ fontSize: 12 }}>
                      {payrollView === "branches" ? selectedPayrollIds.length : selectedLineKeys.length}
                    </Text>
                    {payrollView === "branches" ? " payroll(s) selected" : " employee line(s) selected"}
                    {payrollView === "employees" && ` — ${selectedPayrolls.length} payroll(s) affected`}
                  </Text>
                  <Space size={8} wrap>
                    {allSelectedPending && canApprovePayroll && (
                      <Button
                        size="small"
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        loading={bulkBusy}
                        onClick={() =>
                          Modal.confirm({
                            title: `Approve ${selectedPayrolls.length} payroll(s)?`,
                            onOk: () => runBulk("Approve", approvePayrollRequest),
                          })
                        }
                      >
                        Approve
                      </Button>
                    )}
                    {allSelectedRevertible && canApprovePayroll && (
                      <Button
                        size="small"
                        danger
                        icon={<CloseCircleOutlined />}
                        loading={bulkBusy}
                        onClick={handleBulkReject}
                      >
                        Return to Drafts
                      </Button>
                    )}
                    {allSelectedDraft && canUpdatePayroll && (
                      <Button
                        size="small"
                        type="primary"
                        icon={<SendOutlined />}
                        loading={bulkBusy}
                        onClick={() =>
                          Modal.confirm({
                            title: `Submit ${selectedPayrolls.length} payroll(s) for approval?`,
                            onOk: () => runBulk("Submit for approval", submitPayrollForApproval),
                          })
                        }
                      >
                        Submit for Approval
                      </Button>
                    )}
                    {allSelectedProcessable && canProcessPayroll && (
                      <Button
                        size="small"
                        icon={<SendOutlined />}
                        loading={bulkBusy}
                        onClick={() =>
                          Modal.confirm({
                            title: `Process ${selectedPayrolls.length} payroll(s)? (posts accrual to accounting)`,
                            onOk: () => runBulk("Process", processPayrollRequest),
                          })
                        }
                      >
                        Process
                      </Button>
                    )}
                    {allSelectedPayable && canProcessPayroll && (
                      <Button
                        size="small"
                        type="primary"
                        icon={<PayCircleOutlined />}
                        loading={bulkBusy}
                        onClick={() =>
                          Modal.confirm({
                            title: `Mark ${selectedPayrolls.length} payroll(s) as paid?`,
                            onOk: () => runBulk("Mark paid", (id) => markPayrollPaid(id)),
                          })
                        }
                      >
                        Mark Paid
                      </Button>
                    )}
                    {allSelectedPayslipable && canGeneratePayslips && (
                      <Button
                        size="small"
                        icon={<FileTextOutlined />}
                        loading={bulkBusy}
                        onClick={() =>
                          Modal.confirm({
                            title: `Generate payslips for ${selectedPayrolls.length} payroll(s)?`,
                            onOk: () => runBulk("Generate payslips", generateBatchPayslips),
                          })
                        }
                      >
                        Generate Payslips
                      </Button>
                    )}
                    {allSelectedDeletable && canDeletePayroll && (
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        loading={bulkBusy}
                        onClick={() =>
                          Modal.confirm({
                            title: `Delete ${selectedPayrolls.length} payroll(s)?`,
                            content: "This action cannot be undone.",
                            okText: "Delete",
                            okButtonProps: { danger: true },
                            onOk: () => runBulk("Delete", deletePayroll),
                          })
                        }
                      >
                        Delete
                      </Button>
                    )}
                    <Button
                      size="small"
                      type="text"
                      onClick={() => {
                        setSelectedPayrollIds([]);
                        setSelectedLineKeys([]);
                      }}
                    >
                      Clear
                    </Button>
                  </Space>
                </div>
              )}
              <Table
                columns={payrollView === "branches" ? columns : employeeViewColumns}
                dataSource={payrollView === "branches" ? filteredPayrolls : employeeRows}
                rowKey={payrollView === "branches" ? "_id" : lineKey}
                rowSelection={{
                  selectedRowKeys:
                    payrollView === "branches" ? selectedPayrollIds : selectedLineKeys,
                  onChange: (keys) =>
                    payrollView === "branches"
                      ? setSelectedPayrollIds(keys as string[])
                      : setSelectedLineKeys(keys as string[]),
                }}
                onRow={(record: any) => ({
                  onClick: () =>
                    handleViewDetails(payrollView === "branches" ? record : record._payroll),
                  style: { cursor: "pointer" },
                })}
                loading={isLoading}
                pagination={{ pageSize: 10 }}
                size="small"
                scroll={{ x: payrollView === "branches" ? 1350 : 1600 }}
                summary={payrollView === "branches" ? () => {
                  const sum = (field: keyof Payroll) =>
                    filteredPayrolls.reduce((s: number, p: any) => s + (p[field] || 0), 0);
                  const cellStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700 };
                  return (
                    <Table.Summary.Row style={{ background: "#f8fafc" }}>
                      <Table.Summary.Cell index={0} colSpan={3}>
                        <Text strong style={{ fontSize: 12 }}>TOTALS</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right">
                        <Text style={cellStyle}>KES {sum("total_gross").toLocaleString()}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right"><Text style={{ ...cellStyle, color: "#ef4444" }}>{sum("total_paye").toLocaleString()}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right"><Text style={{ ...cellStyle, color: "#ef4444" }}>{sum("total_nssf").toLocaleString()}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={6} align="right"><Text style={{ ...cellStyle, color: "#ef4444" }}>{sum("total_nhif").toLocaleString()}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={7} align="right"><Text style={{ ...cellStyle, color: "#ef4444" }}>{sum("total_housing_levy").toLocaleString()}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={8} align="right"><Text style={{ ...cellStyle, color: "#ef4444" }}>{sum("total_withholding_tax").toLocaleString()}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={9} align="right"><Text style={{ ...cellStyle, color: "#ef4444" }}>{sum("total_nita").toLocaleString()}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={10} align="right"><Text style={{ ...cellStyle, color: "#ef4444" }}>{sum("total_custom_deductions").toLocaleString()}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={11} align="right">
                        <Text style={{ ...cellStyle, color: "#10b981" }}>KES {sum("total_net").toLocaleString()}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={12} colSpan={2} />
                    </Table.Summary.Row>
                  );
                } : undefined}
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

        {canUpdatePayroll && (
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
                    SHA (Social Health Insurance) replaces NHIF. Employees contribute 2.75% of gross pay.
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

              {/* ── NITA Settings ── */}
              <Tabs.TabPane tab="NITA (Employer)" key="nita">
                <Form form={deductionForm} layout="vertical">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="nita_enabled"
                        label="Enable NITA Levy"
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="nita_amount"
                        label="Employer Amount per Employee (KES)"
                        initialValue={50}
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
                    NITA (National Industrial Training Authority) is a statutory EMPLOYER levy — KES 50
                    per employee each month. It is recorded under employer contributions and is never
                    deducted from the employee's pay.
                  </Text>
                </Form>
              </Tabs.TabPane>

              {/* ── Withholding Tax Settings ── */}
              <Tabs.TabPane tab="Withholding Tax" key="withholding">
                <Form form={deductionForm} layout="vertical">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="withholding_tax_enabled"
                        label="Enable Withholding Tax"
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="withholding_tax_rate"
                        label="Withholding Tax Rate (%)"
                        initialValue={5}
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
                    Withholding tax applies to employees with the &quot;Consultant&quot; employment type — it is the only deduction withheld from their pay (5% for resident consultants by default).
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
                      title: "Ends",
                      dataIndex: "end_date",
                      key: "end_date",
                      render: (endDate: string, record: any) => (
                        <DatePicker
                          picker="month"
                          size="small"
                          placeholder="Runs until…"
                          value={endDate ? dayjs(endDate) : null}
                          onChange={(d) =>
                            updateCustomDeduction(record.id, "end_date", d ? d.endOf("month").toISOString() : null)
                          }
                          allowClear
                          style={{ width: 140 }}
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
                    No custom deductions configured. Click "Add Custom Deduction" to create one
                    — loans, advances, union dues… Set an "Ends" month to stop a loan automatically.
                  </div>
                )}
              </Tabs.TabPane>
            </Tabs>
          </Card>
        </Tabs.TabPane>
        )}
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
        width={isMobile ? "100%" : generateStep === 0 ? 600 : 1420}
        style={generateStep === 1 || isMobile ? { top: isMobile ? 0 : 24 } : undefined}
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

          <Form.Item label="Payroll Month" tooltip="Sets the label and period dates for the selected month">
            <DatePicker
              picker="month"
              style={{ width: "100%" }}
              defaultValue={dayjs()}
              onChange={(d) => {
                if (!d) return;
                form.setFieldsValue({
                  period_label: d.format("MMMM YYYY"),
                  period_start: d.startOf("month"),
                  period_end: d.endOf("month"),
                });
              }}
            />
          </Form.Item>
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
                    scroll={{ x: 1520, y: 300 }}
                    expandable={{
                      expandedRowRender: (line: any) =>
                        renderLineResults(line, previewData?.period_label || pendingGenerateParams?.period_label),
                      expandRowByClick: true,
                    }}
                    columns={[
                      ...payrollLineColumns(true, group.lines),
                      {
                        title: "",
                        key: "preview-edit",
                        width: 60,
                        render: (_: any, line: any) => (
                          <Tooltip title="Edit this line">
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                openPreviewLineModal(line);
                              }}
                            />
                          </Tooltip>
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

        {/* Generation progress */}
        {isGenerating && generateProgress && (
          <div style={{ marginTop: 16 }}>
            <Progress
              percent={Math.round((generateProgress.done / generateProgress.total) * 100)}
              status="active"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Generating payroll… {generateProgress.done} of {generateProgress.total}{" "}
              {generateProgress.total === 1 ? "batch" : "department(s)"}
            </Text>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          {generateStep === 1 ? (
            <Button onClick={() => setGenerateStep(0)} disabled={isGenerating}>
              ← Back
            </Button>
          ) : (
            <span />
          )}
          <Space>
            <Button onClick={closeGenerateModal} disabled={previewMutation.isLoading || isGenerating}>
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
                loading={isGenerating}
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
        width={isMobile ? "92%" : 480}
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
        width={isMobile ? "94%" : 560}
      >
        <Alert
          type="info"
          showIcon
          message="Gross pay and statutory deductions (PAYE, NSSF, SHA, Housing Levy) are recalculated automatically when you change salary or overtime."
          style={{ borderRadius: 8, marginBottom: 16 }}
        />
        {renderLineEditForm()}
      </Modal>

      {/* ── Edit Preview Line Modal (before generate) ── */}
      <Modal
        title={`Edit Line — ${editingPreviewLine?.fullname || editingPreviewLine?.employee_number || ""}`}
        open={isPreviewLineModalOpen}
        onCancel={() => {
          setIsPreviewLineModalOpen(false);
          setEditingPreviewLine(null);
          lineForm.resetFields();
          setLineCustomDeductions([]);
        }}
        onOk={handleSavePreviewLine}
        okText="Apply & Re-run Preview"
        confirmLoading={previewMutation.isLoading}
        width={isMobile ? "94%" : 560}
      >
        <Alert
          type="info"
          showIcon
          message="Changes are applied as overrides and the preview is recomputed — statutory deductions and custom loans/advances update automatically."
          style={{ borderRadius: 8, marginBottom: 16 }}
        />
        {renderLineEditForm()}
      </Modal>

      {/* ── Payroll Details Drawer ── */}
      <Drawer
        title="Payroll Details"
        placement="right"
        width={isMobile ? "100%" : Math.min(1280, window.innerWidth * 0.92)}
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
              <Space size={8}>
                  <Tooltip title="Download payroll (Muster Roll) as Excel">
                    <Button
                      size="small"
                      icon={<FileExcelOutlined />}
                      onClick={() => exportPayrollToExcel(selectedPayroll)}
                    >
                      Excel
                    </Button>
                  </Tooltip>
                  <Tooltip title="Download payroll (Muster Roll) as PDF">
                    <Button
                      size="small"
                      icon={<FilePdfOutlined />}
                      onClick={() => exportPayrollToPDF(selectedPayroll)}
                    >
                      PDF
                    </Button>
                  </Tooltip>
                  <Tag color={STATUS_CONFIG[selectedPayroll.status]?.color} style={{ margin: 0 }}>
                    {STATUS_CONFIG[selectedPayroll.status]?.label}
                  </Tag>
                </Space>
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
                {(() => {
                  // Employer-side sums from the lines (fallback = matched 1:1)
                  const erSum = (key: string, eeKey: string) =>
                    (selectedPayroll.lines || []).reduce(
                      (s: number, l: any) => s + (l.deductions?.[key] ?? l.deductions?.[eeKey] ?? 0),
                      0
                    );
                  const nssfEr = erSum("employer_nssf", "nssf");
                  const housingEr = erSum("employer_housing_levy", "housing_levy");
                  const nitaEr = erSum("employer_nita", "nita");
                  return [
                    { label: "PAYE", value: selectedPayroll.total_paye },
                    {
                      label: "NSSF",
                      value: (selectedPayroll.total_nssf || 0) + nssfEr,
                      sub: `EE ${(selectedPayroll.total_nssf || 0).toLocaleString()} · ER ${nssfEr.toLocaleString()}`,
                    },
                    { label: "SHA", value: selectedPayroll.total_nhif },
                    {
                      label: "Housing Levy",
                      value: (selectedPayroll.total_housing_levy || 0) + housingEr,
                      sub: `EE ${(selectedPayroll.total_housing_levy || 0).toLocaleString()} · ER ${housingEr.toLocaleString()}`,
                    },
                    { label: "WHT", value: (selectedPayroll as any).total_withholding_tax },
                    {
                      label: "NITA (Employer)",
                      value: nitaEr || selectedPayroll.total_nita,
                    },
                    { label: "Custom", value: selectedPayroll.total_custom_deductions },
                  ];
                })().map((d: any) => (
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
                    {d.sub && (
                      <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>{d.sub}</Text>
                    )}
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
                <Space size={8}>
                  <Radio.Group
                    size="small"
                    optionType="button"
                    value={showEmployeeNames ? "name" : "number"}
                    onChange={(e) => setShowEmployeeNames(e.target.value === "name")}
                    options={[
                      { label: "Name", value: "name" },
                      { label: "Emp No.", value: "number" },
                    ]}
                  />
                  {selectedPayroll.status === "draft" && (
                    <Text style={{ fontSize: 11, color: "#94a3b8" }}>Draft — lines can be edited</Text>
                  )}
                </Space>
              </div>
              <Table
                dataSource={selectedPayroll.lines || []}
                rowKey={(record: any) => record._id || record.employee_id?._id}
                size="small"
                pagination={false}
                scroll={{ x: 1520, y: 320 }}
                expandable={{
                  expandedRowRender: (line: any) =>
                    renderLineResults(line, selectedPayroll?.period_label),
                  expandRowByClick: true,
                }}
                columns={[
                  ...payrollLineColumns(showEmployeeNames, selectedPayroll?.lines),
                  ...(selectedPayroll.status === "draft" && canUpdatePayroll
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
