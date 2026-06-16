import React, { useState } from "react";
import { Typography, Card, Table, Button, Space, Tag, Input, Select, Modal, Form, message, Steps, Radio, Row, Col, Drawer, Descriptions, DatePicker, Upload, Alert, Checkbox, Spin } from "antd";
import { PlusOutlined, EditOutlined, EyeOutlined, SearchOutlined, UserOutlined, ReloadOutlined, UploadOutlined, ArrowDownOutlined, ArrowRightOutlined, InboxOutlined, InfoCircleOutlined, CloseCircleOutlined, WarningOutlined, CheckCircleOutlined, FileExcelOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEmployeeProfiles, createEmployeeProfile, updateEmployeeProfile, getEmployeeProfileById, terminateEmployee, updateEmployeeStatus, fetchBanks, importEmployeeProfiles, downloadEmployeeProfileTemplate, analyseEmployeeFile } from "@services/hr";
import dayjs from "dayjs";
import { createUser } from "@features/Auth/AuthActions";
import { useAppDispatch, useAppSelector } from "src/store";
import { fetchAllUsers } from "@features/Auth/AuthActions";
import { fetchAllDepartments } from "@services/crm/departments";

const { Title, Text } = Typography;
const { Option } = Select;
const { Step } = Steps;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface AutoCreated { departments?: string[]; banks?: string[]; }
interface ImportResult {
  message: string;
  summary: {
    total: number; created: number; updated: number; skipped: number; errors: number;
    auto_created?: AutoCreated;
    format_detected?: { sheet: string; header_row: number; mapped_columns: number };
  };
  errors: Array<{ row: number | string; name: string; reason: string }>;
}
interface AdviceItem { level: "success" | "warning" | "error" | "info"; message: string; }
interface AnalysisResult {
  canImport: boolean;
  sheetUsed: string;
  headerRowDetectedAt: number;
  totalDataRows: number;
  mappedColumns: string[];
  unmappedColumns: string[];
  missingRequired: string[];
  missingRecommended: string[];
  columnMapping: Record<string, string>;
  advice: AdviceItem[];
  previewRows: Array<{ rowNum: number; [key: string]: any }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVICE CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const ADVICE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  success: { icon: <CheckCircleOutlined />, color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  warning: { icon: <WarningOutlined />, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  error: { icon: <CloseCircleOutlined />, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  info: { icon: <InfoCircleOutlined />, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
};

const FIELD_LABELS: Record<string, string> = {
  name: "Full Name", email: "Email", phone: "Phone Number",
  employee_number: "Employee Number", department: "Department", job_title: "Job Title",
  employment_type: "Employment Type", hire_date: "Hire Date", kra_pin: "KRA PIN",
  nhif_number: "NHIF Number", nssf_number: "NSSF Number", bank_name: "Bank Name",
  bank_account_number: "Account Number", bank_branch: "Bank Branch",
  emergency_contact_name: "Emergency Contact Name", emergency_contact_phone: "Emergency Contact Phone",
  emergency_contact_relationship: "Emergency Contact Relationship",
  next_of_kin_name: "Next of Kin Name", next_of_kin_phone: "Next of Kin Phone",
  next_of_kin_relationship: "Next of Kin Relationship", next_of_kin_address: "Next of Kin Address",
  grade_level: "Grade Level", position: "Position", notes: "Notes",
};

// ─────────────────────────────────────────────────────────────────────────────
// SMART IMPORT MODAL (defined outside component to prevent re-render issues)
// ─────────────────────────────────────────────────────────────────────────────
const ImportEmployeesModal: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "analysing" | "advice" | "importing" | "result">("upload");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [updateMode, setUpdateMode] = useState(false);

  const handleOpen = () => { setOpen(true); reset(); };
  const handleClose = () => { if (step !== "analysing" && step !== "importing") { setOpen(false); reset(); } };
  const reset = () => { setFile(null); setStep("upload"); setAnalysis(null); setImportResult(null); setUpdateMode(false); };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try { await downloadEmployeeProfileTemplate(); } finally { setDownloading(false); }
  };

  const handleAnalyse = async (selectedFile: File) => {
    setStep("analysing");
    try {
      const result = await analyseEmployeeFile(selectedFile);
      setAnalysis(result);
      setStep("advice");
    } catch (err: any) {
      console.error("Analysis failed:", err);
      // If analysis endpoint doesn't exist or fails, skip to direct import
      message.warning("File analysis not available, proceeding with direct import");
      setFile(selectedFile);
      setStep("advice");
      // Set a minimal analysis result to allow import
      setAnalysis({
        canImport: true,
        sheetUsed: "Sheet1",
        headerRowDetectedAt: 1,
        totalDataRows: 0,
        mappedColumns: [],
        unmappedColumns: [],
        missingRequired: [],
        missingRecommended: [],
        columnMapping: {},
        advice: [{ level: "info", message: "File analysis skipped - importing directly" }],
        previewRows: [],
      });
    }
  };

  const handleImport = async () => {
    if (!file) return;
    const currentShopId = localStorage.getItem("shopId") || "";
    if (!currentShopId) {
      message.error("No shop ID found. Please select a shop first.");
      return;
    }
    setStep("importing");
    try {
      const result = await importEmployeeProfiles(file, currentShopId, updateMode);
      setImportResult(result);
      setStep("result");
      if (result.summary.created > 0 || result.summary.updated > 0) onSuccess();
    } catch (err: any) {
      console.error("Import failed:", err);
      message.error(err?.message || "Import failed");
      setStep("advice");
    }
  };

  // ── Step: Upload ────────────────────────────────────────────────────────────
  const renderUpload = () => (
    <div>
      <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "13px 16px", marginBottom: 16, border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <Text strong style={{ fontSize: 13, color: "#065f46", display: "block" }}>Have our template?</Text>
          <Text style={{ fontSize: 12, color: "#6b7280" }}>Download it for best results — but any Excel file works</Text>
        </div>
        <Button icon={<ArrowDownOutlined />} loading={downloading} onClick={handleDownloadTemplate} size="small"
          style={{ borderRadius: 6, background: "#059669", border: "none", color: "#fff", fontWeight: 500, flexShrink: 0 }}>
          Template
        </Button>
      </div>
      <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 6 }}>Upload any Excel file with employee data</Text>
      <Text style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 12 }}>
        We'll detect your column headers automatically and show you a preview before importing anything.
      </Text>
      <div style={{ marginBottom: 12, padding: "10px 12px", background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
        <Checkbox checked={updateMode} onChange={(e) => setUpdateMode(e.target.checked)}>
          <Text style={{ fontSize: 12, color: "#1e40af" }}>Update existing employees (don't create duplicates)</Text>
        </Checkbox>
        {updateMode && (
          <Text style={{ fontSize: 11, color: "#6b7280", display: "block", marginTop: 4, marginLeft: 24 }}>
            Employees with the same email will be updated instead of creating new ones
          </Text>
        )}
      </div>
      <Upload.Dragger
        accept=".xlsx,.xls" maxCount={1} showUploadList={false}
        beforeUpload={(f) => { setFile(f); handleAnalyse(f); return false; }}
        style={{ borderRadius: 10, borderColor: "#d1d5db", background: "#fafafa" }}
      >
        <div style={{ padding: "20px 0" }}>
          <InboxOutlined style={{ fontSize: 36, color: "#9ca3af", marginBottom: 8 }} />
          <div>
            <Text style={{ fontSize: 14, color: "#374151", display: "block" }}>Drop your Excel file here</Text>
            <Text style={{ fontSize: 12, color: "#9ca3af" }}>or click to browse · .xlsx / .xls · any format accepted</Text>
          </div>
        </div>
      </Upload.Dragger>
      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={handleClose} style={{ borderRadius: 8 }}>Cancel</Button>
      </div>
    </div>
  );

  // ── Step: Analysing ─────────────────────────────────────────────────────────
  const renderAnalysing = () => (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <Spin size="large" />
      <Text style={{ display: "block", marginTop: 16, color: "#64748b", fontSize: 14 }}>Reading your file and detecting column format…</Text>
      {file && <Text style={{ display: "block", marginTop: 6, color: "#94a3b8", fontSize: 12 }}>{file.name}</Text>}
    </div>
  );

  // ── Step: Advice ─────────────────────────────────────────────────────────────
  const renderAdvice = () => {
    if (!analysis) return null;
    return (
      <div>
        {/* Summary bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Sheet", value: analysis.sheetUsed, color: "#6366f1", bg: "#eef2ff" },
            { label: "Header at row", value: analysis.headerRowDetectedAt, color: "#0ea5e9", bg: "#f0f9ff" },
            { label: "Data rows", value: analysis.totalDataRows, color: "#10b981", bg: "#f0fdf4" },
            { label: "Cols mapped", value: analysis.mappedColumns.length, color: "#f97316", bg: "#fff7ed" },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 8, padding: "8px 6px", textAlign: "center" as const }}>
              <Text style={{ fontSize: 14, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</Text>
            </div>
          ))}
        </div>

        {/* Advice items */}
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 14 }}>
          {analysis.advice.map((item, i) => {
            const cfg = ADVICE_CONFIG[item.level];
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, padding: "10px 12px" }}>
                <span style={{ color: cfg.color, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
                <Text style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{item.message}</Text>
              </div>
            );
          })}
        </div>

        {/* Column mapping */}
        <div style={{ marginBottom: 14 }}>
          <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 8 }}>
            Column mapping
            <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginLeft: 8 }}>* required · † recommended</Text>
          </Text>
          <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            {Object.entries(analysis.columnMapping).map(([field, header]) => (
              <div key={field} style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: "#64748b" }}>{header}</Text>
                <Text style={{ fontSize: 12, fontWeight: 500, color: "#0f172a" }}>{FIELD_LABELS[field] || field}</Text>
              </div>
            ))}
          </div>
        </div>

        {/* Data preview */}
        {analysis.previewRows.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 8 }}>Data preview (first 5 rows)</Text>
            <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              {analysis.previewRows.slice(0, 5).map((row, i) => (
                <div key={i} style={{ padding: "8px 12px", borderBottom: i < analysis.previewRows.length - 1 ? "1px solid #f1f5f9" : "none", fontSize: 11, color: "#64748b" }}>
                  Row {row.rowNum}: {Object.values(row).slice(0, 3).join(" • ")}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
          <Button onClick={reset} icon={<ReloadOutlined />} style={{ borderRadius: 8, height: 38 }}>Try Different File</Button>
          <Button
            type="primary" icon={<ArrowRightOutlined />} onClick={handleImport}
            disabled={!analysis.canImport}
            style={{ flex: 1, borderRadius: 8, height: 38, background: analysis.canImport ? "#059669" : undefined, border: "none", fontWeight: 600 }}
          >
            {analysis.canImport
              ? `Import ${analysis.totalDataRows} Row${analysis.totalDataRows !== 1 ? "s" : ""}`
              : "Cannot Import — Fix Errors First"}
          </Button>
        </div>
      </div>
    );
  };

  // ── Step: Importing ─────────────────────────────────────────────────────────
  const renderImporting = () => (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <Spin size="large" />
      <Text style={{ display: "block", marginTop: 16, color: "#64748b", fontSize: 14 }}>Importing employees…</Text>
      <Text style={{ display: "block", marginTop: 6, color: "#94a3b8", fontSize: 12 }}>Auto-creating missing departments and banks as needed</Text>
    </div>
  );

  // ── Step: Result ─────────────────────────────────────────────────────────────
  const renderResult = () => {
    if (!importResult) return null;
    const { summary, errors } = importResult;
    const ac = summary.auto_created || {};
    const totalAutoCreated = Object.values(ac).reduce((s, arr) => s + (arr?.length ?? 0), 0);
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Total Rows", value: summary.total, color: "#6366f1", bg: "#eef2ff" },
            { label: "Created", value: summary.created, color: "#059669", bg: "#f0fdf4" },
            { label: "Updated", value: summary.updated, color: "#3b82f6", bg: "#eff6ff" },
            { label: "Skipped", value: summary.skipped, color: summary.skipped ? "#f59e0b" : "#10b981", bg: summary.skipped ? "#fffbeb" : "#f0fdf4" },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "10px 8px", textAlign: "center" as const }}>
              <Text style={{ fontSize: 22, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: "#6b7280" }}>{s.label}</Text>
            </div>
          ))}
        </div>

        {summary.format_detected && (
          <div style={{ background: "#f0f9ff", borderRadius: 8, padding: "8px 12px", marginBottom: 12, border: "1px solid #bae6fd" }}>
            <Text style={{ fontSize: 12, color: "#0369a1" }}>
              <InfoCircleOutlined style={{ marginRight: 6 }} />
              Imported from sheet <strong>{summary.format_detected.sheet}</strong> · Header at row {summary.format_detected.header_row} · {summary.format_detected.mapped_columns} columns mapped
            </Text>
          </div>
        )}

        {totalAutoCreated > 0 && (
          <Alert type="info" showIcon
            message={`${totalAutoCreated} supporting record(s) auto-created`}
            description={
              <div>
                {ac.departments?.length ? <div style={{ fontSize: 11 }}>Departments: {ac.departments.join(", ")}</div> : null}
                {ac.banks?.length ? <div style={{ fontSize: 11 }}>Banks: {ac.banks.join(", ")}</div> : null}
              </div>
            }
            style={{ borderRadius: 8, marginBottom: 12 }}
          />
        )}

        {errors.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, color: "#374151", display: "block", marginBottom: 6 }}>
              <CloseCircleOutlined style={{ color: "#ef4444", marginRight: 4 }} />{errors.length} row(s) had errors
            </Text>
            <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2" }}>
              {errors.map((e, i) => (
                <div key={i} style={{ padding: "8px 12px", borderBottom: i < errors.length - 1 ? "1px solid #fecaca" : "none" }}>
                  <Text style={{ fontSize: 12, color: "#dc2626", display: "block" }}>Row {e.row} — <strong>{e.name}</strong></Text>
                  <Text style={{ fontSize: 11, color: "#6b7280" }}>{e.reason}</Text>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.created === 0 && summary.errors > 0 && (
          <Alert type="warning" message="No employees were imported" description="All rows had validation errors. Fix the issues above and re-upload." style={{ borderRadius: 8, marginBottom: 16 }} />
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={reset} style={{ flex: 1, borderRadius: 8, height: 38 }}>Import Another</Button>
          <Button type="primary" onClick={handleClose} style={{ flex: 1, borderRadius: 8, height: 38, background: "#059669", border: "none" }}>Done</Button>
        </div>
      </div>
    );
  };

  const STEP_TITLES: Record<string, string> = {
    upload: "Import Employees from Excel",
    analysing: "Analysing Your File…",
    advice: "File Analysis & Preview",
    importing: "Importing…",
    result: "Import Complete",
  };

  return (
    <>
      <Button icon={<UploadOutlined />} onClick={handleOpen}
        style={{ borderRadius: 7, fontWeight: 500, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#059669" }}>
        Import Excel
      </Button>
      <Modal
        open={open} onCancel={handleClose} footer={null}
        width={step === "advice" ? 680 : 480}
        centered destroyOnClose
        closable={step !== "analysing" && step !== "importing"}
        title={<Space><FileExcelOutlined style={{ color: "#059669", fontSize: 18 }} /><Text strong style={{ fontSize: 15 }}>{STEP_TITLES[step]}</Text></Space>}
        styles={{ body: { padding: "16px 24px 24px", maxHeight: "80vh", overflowY: "auto" } }}
      >
        {step === "upload" && renderUpload()}
        {step === "analysing" && renderAnalysing()}
        {step === "advice" && renderAdvice()}
        {step === "importing" && renderImporting()}
        {step === "result" && renderResult()}
      </Modal>
    </>
  );
};

const EmployeeProfilesList: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [isEditDrawerVisible, setIsEditDrawerVisible] = useState(false);
  const [isSuspendModalVisible, setIsSuspendModalVisible] = useState(false);
  const [isTerminateModalVisible, setIsTerminateModalVisible] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
  const [createdUserId, setCreatedUserId] = useState<string>("");
  const [userSelectionMode, setUserSelectionMode] = useState<"new" | "existing">("new");
  const [form] = Form.useForm();
  const [userForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [terminateForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["hr-employee-profiles", { status: statusFilter, search: searchText }],
    queryFn: () => fetchEmployeeProfiles({ status: statusFilter, search: searchText }),
  });

  const { data: employeeDetail } = useQuery({
    queryKey: ["hr-employee-profile", selectedEmployeeId],
    queryFn: () => getEmployeeProfileById(selectedEmployeeId),
    enabled: !!selectedEmployeeId && isDetailDrawerVisible,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => dispatch(fetchAllUsers()).unwrap(),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["hr-departments"],
    queryFn: () => fetchAllDepartments(),
  });

  const { data: banksData } = useQuery({
    queryKey: ["hr-banks"],
    queryFn: () => fetchBanks({}),
  });

  const departments = Array.isArray(departmentsData) ? departmentsData : departmentsData?.departments || [];
  const banks = Array.isArray(banksData) ? banksData : banksData?.banks || [];

  const { newmessage, IsError, isLoading: isUserCreating } = useAppSelector((state) => state.auth);

  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.profiles || [];
  const users = Array.isArray(usersData) ? usersData : [];

  const createMutation = useMutation({
    mutationFn: createEmployeeProfile,
    onSuccess: () => {
      message.success("Employee profile created successfully");
      setIsModalVisible(false);
      setCurrentStep(0);
      form.resetFields();
      userForm.resetFields();
      setCreatedUserId("");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-profiles"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to create employee profile");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateEmployeeProfile(id, data),
    onSuccess: () => {
      message.success("Employee profile updated successfully");
      setIsEditDrawerVisible(false);
      editForm.resetFields();
      setSelectedEmployeeId("");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-profiles"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to update employee profile");
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => updateEmployeeProfile(id, { employee_status: "Suspended" }),
    onSuccess: () => {
      message.success("Employee suspended successfully");
      setIsSuspendModalVisible(false);
      setSelectedEmployeeId("");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-profiles"] });
    },
    onError: (error: any) => {
      message.error(error.message || "Failed to suspend employee");
    },
  });

  const terminateMutation = useMutation({
    mutationFn: terminateEmployee,
    onSuccess: () => {
      message.success("Employee terminated successfully");
      setIsTerminateModalVisible(false);
      terminateForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["hr-employee-profiles"] });
    },
    onError: (error: any) => {
      message.error(error.message || "Failed to terminate employee");
    },
  });

  const handleDownloadTemplate = () => {
    downloadEmployeeProfileTemplate();
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "user_id",
      key: "name",
      render: (user: any) => user?.fullname || "-",
    },
    {
      title: "Email",
      dataIndex: "user_id",
      key: "email",
      render: (user: any) => user?.email || "-",
    },
    {
      title: "Department",
      dataIndex: "department_id",
      key: "department",
      render: (dept: any) => dept?.name || "-",
    },
    {
      title: "Position",
      dataIndex: "position",
      key: "position",
      render: (position: string) => position || "-",
    },
    {
      title: "Shop",
      dataIndex: "shop_id",
      key: "shop",
      render: (shop: any) => shop?.name || "-",
    },
    {
      title: "Employment Type",
      dataIndex: "employment_type",
      key: "employment_type",
      render: (type: string) => type || "-",
    },
    {
      title: "Status",
      dataIndex: "employee_status",
      key: "employee_status",
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          Active: "green",
          "On Probation": "orange",
          Suspended: "red",
          Terminated: "default",
          Resigned: "default",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Hire Date",
      dataIndex: "hire_date",
      key: "hire_date",
      render: (date: string) => date ? dayjs(date).format("DD MMM YYYY") : "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewEmployee(record._id)}>
            View
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditEmployee(record)}>
            Edit
          </Button>
          {record.employee_status === "Active" && (
            <Button
              type="link"
              danger
              onClick={() => handleSuspendEmployee(record._id)}
            >
              Suspend
            </Button>
          )}
          {record.employee_status !== "Terminated" && record.employee_status !== "Resigned" && (
            <Button
              type="link"
              danger
              onClick={() => handleTerminateEmployee(record._id)}
            >
              Terminate
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleCreateUser = async (values: any) => {
    try {
      const result = await dispatch(createUser(values)).unwrap();
      if (result?._id) {
        setCreatedUserId(result._id);
        setCurrentStep(1);
        message.success("User created successfully. Now fill in employee details.");
      }
    } catch (error: any) {
      message.error(error?.message || "Failed to create user");
    }
  };

  const handleSelectUser = (userId: string) => {
    const selectedUser = users.find((user: any) => user._id === userId);
    setCreatedUserId(userId);
    
    // Pre-fill employee form with user data
    if (selectedUser) {
      const nameParts = selectedUser.fullname?.split(' ') || ['', ''];
      form.setFieldsValue({
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        employee_id: selectedUser.idNumber || '',
      });
    }
    
    setCurrentStep(1);
  };

  const handleCreateEmployee = (values: any) => {
    createMutation.mutate({
      ...values,
      user_id: createdUserId,
    });
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setCurrentStep(0);
    form.resetFields();
    userForm.resetFields();
    setCreatedUserId("");
    setUserSelectionMode("new");
  };

  const handleViewEmployee = (id: string) => {
    setSelectedEmployeeId(id);
    setIsDetailDrawerVisible(true);
  };

  const handleDetailDrawerClose = () => {
    setIsDetailDrawerVisible(false);
    setSelectedEmployeeId("");
  };

  const handleEditEmployee = (record: any) => {
    setSelectedEmployeeId(record._id);
    editForm.setFieldsValue({
      position: record.position,
      employment_type: record.employment_type,
      employee_status: record.employee_status,
      hire_date: record.hire_date ? dayjs(record.hire_date) : null,
      bank_account_number: record.bank_account_number,
      bank_id: record.bank_id?._id,
      basic_salary: record.wage?.baseAmount,
      kra_pin: record.kra_pin,
      department_id: record.department_id?._id,
    });
    setIsEditDrawerVisible(true);
  };

  const handleEditDrawerClose = () => {
    setIsEditDrawerVisible(false);
    editForm.resetFields();
    setSelectedEmployeeId("");
  };

  const handleEditSubmit = (values: any) => {
    updateMutation.mutate({
      id: selectedEmployeeId,
      data: {
        position: values.position,
        employment_type: values.employment_type,
        employee_status: values.employee_status,
        hire_date: values.hire_date?.format("YYYY-MM-DD"),
        bank_account_number: values.bank_account_number,
        bank_id: values.bank_id,
        basic_salary: values.basic_salary,
        kra_pin: values.kra_pin,
        department_id: values.department_id,
      },
    });
  };

  const handleSuspendEmployee = (id: string) => {
    setSelectedEmployeeId(id);
    setIsSuspendModalVisible(true);
  };

  const handleConfirmSuspend = () => {
    suspendMutation.mutate(selectedEmployeeId);
  };

  const handleTerminateEmployee = (id: string) => {
    setSelectedEmployeeId(id);
    setIsTerminateModalVisible(true);
  };

  const handleConfirmTerminate = (values: any) => {
    terminateMutation.mutate({
      id: selectedEmployeeId,
      data: {
        reason: values.reason,
        termination_date: values.termination_date?.format("YYYY-MM-DD"),
      },
    });
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            Employee Profiles
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ["hr-employee-profiles"] })}>
              Refresh
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleDownloadTemplate}>
              Download Template
            </Button>
            <ImportEmployeesModal onSuccess={() => queryClient.invalidateQueries({ queryKey: ["hr-employee-profiles"] })} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
              Add Employee
            </Button>
          </Space>
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <Input
            placeholder="Search employees..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            allowClear
          >
            <Option value="Active">Active</Option>
            <Option value="On Probation">On Probation</Option>
            <Option value="Suspended">Suspended</Option>
            <Option value="Terminated">Terminated</Option>
            <Option value="Resigned">Resigned</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={employees}
          loading={isLoading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Add New Employee"
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={800}
      >
        <Row gutter={24}>
          <Col span={6}>
            <Steps current={currentStep} direction="vertical" style={{ marginTop: 24 }}>
              <Step title="Select User" description="Choose or create user" />
              <Step title="Employee Details" description="Fill employee information" />
            </Steps>
          </Col>
          <Col span={18}>
            {currentStep === 0 && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Radio.Group value={userSelectionMode} onChange={(e) => setUserSelectionMode(e.target.value)} buttonStyle="solid">
                    <Radio.Button value="new">Create New User</Radio.Button>
                    <Radio.Button value="existing">Select Existing User</Radio.Button>
                  </Radio.Group>
                </div>

                {userSelectionMode === "new" && (
                  <Form form={userForm} layout="vertical" onFinish={handleCreateUser}>
                    {IsError && (
                      <div style={{ marginBottom: 16, padding: 12, background: "#fff2f0", border: "1px solid #ffccc7", borderRadius: 4 }}>
                        {newmessage}
                      </div>
                    )}
                    <Form.Item name="fullname" label="Full Name" rules={[{ required: true }]}>
                      <Input prefix={<UserOutlined />} />
                    </Form.Item>
                    <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                      <Input prefix={<UserOutlined />} />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="pin" label="PIN" rules={[{ required: true, pattern: /^[0-9]{4}$/, message: "PIN must be 4 digits" }]}>
                      <Input.Password maxLength={4} />
                    </Form.Item>
                    <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="idNumber" label="ID Number" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="isAdmin" label="Is Admin" initialValue="false">
                      <Select>
                        <Option value="false">No</Option>
                        <Option value="true">Yes</Option>
                      </Select>
                    </Form.Item>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                      <Button type="primary" htmlType="submit" loading={isUserCreating}>
                        Create User & Continue
                      </Button>
                    </div>
                  </Form>
                )}

                {userSelectionMode === "existing" && (
                  <div style={{ marginTop: 16 }}>
                    <Form.Item label="Select User" required>
                      <Select
                        placeholder="Select a user"
                        style={{ width: "100%" }}
                        onChange={handleSelectUser}
                        showSearch
                        filterOption={(input, option) =>
                          String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                        }
                        options={users.map((user: any) => ({
                          label: `${user.fullname} (${user.email})`,
                          value: user._id,
                        }))}
                      />
                    </Form.Item>
                  </div>
                )}
              </div>
            )}

            {currentStep === 1 && (
              <Form form={form} layout="vertical" onFinish={handleCreateEmployee}>
                <Form.Item name="employee_id" label="Employee ID" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="department" label="Department">
                  <Select placeholder="Select department" allowClear showSearch>
                    {departments.map((dept: any) => (
                      <Option key={dept._id} value={dept._id}>
                        {dept.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="position" label="Position">
                  <Input />
                </Form.Item>
                <Form.Item name="employment_type" label="Employment Type" initialValue="Full-time">
                  <Select>
                    <Option value="Full-time">Full-time</Option>
                    <Option value="Part-time">Part-time</Option>
                    <Option value="Contract">Contract</Option>
                    <Option value="Intern">Intern</Option>
                    <Option value="Probation">Probation</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="employee_status" label="Status" initialValue="Active">
                  <Select>
                    <Option value="Active">Active</Option>
                    <Option value="On Probation">On Probation</Option>
                    <Option value="Suspended">Suspended</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="join_date" label="Join Date">
                  <Input type="date" />
                </Form.Item>
                <Form.Item name="basic_salary" label="Basic Salary">
                  <Input type="number" />
                </Form.Item>
                <Form.Item name="bank_account" label="Bank Account">
                  <Input />
                </Form.Item>
                <Form.Item name="kra_pin" label="KRA PIN">
                  <Input />
                </Form.Item>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                  <Button onClick={prevStep}>Back</Button>
                  <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                    Create Employee Profile
                  </Button>
                </div>
              </Form>
            )}
          </Col>
        </Row>
      </Modal>

      <Drawer
        title="Employee Details"
        placement="right"
        width={720}
        open={isDetailDrawerVisible}
        onClose={handleDetailDrawerClose}
      >
        {employeeDetail && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Name" span={2}>
              {employeeDetail.user_id?.fullname || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {employeeDetail.user_id?.email || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {employeeDetail.user_id?.phone || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Department">
              {employeeDetail.department_id?.name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Position">
              {employeeDetail.position || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Shop">
              {employeeDetail.shop_id?.name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Employment Type">
              {employeeDetail.employment_type || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={employeeDetail.employee_status === "Active" ? "green" : "default"}>
                {employeeDetail.employee_status || "-"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Hire Date" span={2}>
              {employeeDetail.hire_date ? dayjs(employeeDetail.hire_date).format("DD MMM YYYY") : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Bank" span={2}>
              {employeeDetail.bank_name || employeeDetail.bank_id?.bank_name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Bank Branch" span={2}>
              {employeeDetail.bank_branch || employeeDetail.bank_id?.bank_branch || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Bank Account Number" span={2}>
              {employeeDetail.bank_account_number || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Salary" span={2}>
              {employeeDetail.wage?.baseAmount ? `KES ${employeeDetail.wage.baseAmount.toLocaleString()}` : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="KRA PIN" span={2}>
              {employeeDetail.kra_pin || "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Drawer
        title="Edit Employee Details"
        placement="right"
        width={720}
        open={isEditDrawerVisible}
        onClose={handleEditDrawerClose}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item name="department_id" label="Department">
            <Select placeholder="Select department" allowClear showSearch>
              {departments.map((dept: any) => (
                <Option key={dept._id} value={dept._id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="position" label="Position" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="employment_type" label="Employment Type" rules={[{ required: true }]}>
            <Select>
              <Option value="Full-time">Full-time</Option>
              <Option value="Part-time">Part-time</Option>
              <Option value="Contract">Contract</Option>
              <Option value="Intern">Intern</Option>
              <Option value="Probation">Probation</Option>
            </Select>
          </Form.Item>
          <Form.Item name="employee_status" label="Status" rules={[{ required: true }]}>
            <Select>
              <Option value="Active">Active</Option>
              <Option value="On Probation">On Probation</Option>
              <Option value="Suspended">Suspended</Option>
              <Option value="Terminated">Terminated</Option>
              <Option value="Resigned">Resigned</Option>
            </Select>
          </Form.Item>
          <Form.Item name="hire_date" label="Hire Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="basic_salary" label="Basic Salary">
            <Input type="number" placeholder="Enter basic salary" />
          </Form.Item>
          <Form.Item name="bank_id" label="Bank">
            <Select placeholder="Select bank" allowClear showSearch>
              {banks.map((bank: any) => (
                <Option key={bank._id} value={bank._id}>
                  {bank.bank_name} - {bank.bank_branch}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="bank_account_number" label="Bank Account Number">
            <Input />
          </Form.Item>
          <Form.Item name="kra_pin" label="KRA PIN">
            <Input />
          </Form.Item>
          <div style={{ marginTop: 24, textAlign: "right" }}>
            <Button onClick={handleEditDrawerClose} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </Form>
      </Drawer>

      <Modal
        title="Suspend Employee"
        open={isSuspendModalVisible}
        onOk={handleConfirmSuspend}
        onCancel={() => setIsSuspendModalVisible(false)}
        confirmLoading={suspendMutation.isPending}
        okText="Suspend"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to suspend this employee? They will not be able to access the system while suspended.</p>
      </Modal>

      <Modal
        title="Terminate Employee"
        open={isTerminateModalVisible}
        onCancel={() => {
          setIsTerminateModalVisible(false);
          terminateForm.resetFields();
        }}
        footer={null}
      >
        <Form form={terminateForm} layout="vertical" onFinish={handleConfirmTerminate}>
          <Form.Item
            name="termination_date"
            label="Termination Date"
            rules={[{ required: true, message: "Please select termination date" }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Reason for Termination"
            rules={[{ required: true, message: "Please provide a reason" }]}
          >
            <Input.TextArea rows={4} placeholder="Provide reason for termination..." />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Button
              onClick={() => {
                setIsTerminateModalVisible(false);
                terminateForm.resetFields();
              }}
              style={{ marginRight: 8 }}
            >
              Cancel
            </Button>
            <Button type="primary" danger htmlType="submit" loading={terminateMutation.isPending}>
              Terminate
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default EmployeeProfilesList;
