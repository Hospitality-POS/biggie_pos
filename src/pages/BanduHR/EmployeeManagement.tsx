import React, { useState } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Input,
  Select,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  message,
  Drawer,
  Upload,
  Row,
  Col,
  Steps,
  Tabs,
  Segmented,
  Alert,
  List,
  Popconfirm,
  Checkbox,
  Avatar,
  Empty,
  Divider,
  Progress,
  Grid,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  UploadOutlined,
  EyeOutlined,
  EditOutlined,
  DollarOutlined,
  GiftOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  ExportOutlined,
  InboxOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  permanentlyDeleteEmployee,
  uploadEmployeeDocument,
  fetchEmployeeDocuments,
  deleteEmployeeDocument,
  downloadEmployeeTemplate,
  analyseEmployeeFile,
  importEmployeesFromExcel,
  exportEmployees,
  type Employee,
  type CreateEmployeeParams,
  type EmployeeImportResult,
  type EmployeeAnalysisResult,
} from "@services/bandu";
import { fetchAllUsersList } from "@services/users";
import { getUser } from "@services/tenants";
import { getPermissionChecker } from "@utils/getPermissionChecker";
import { fetchAllDepartments, createDepartment, type Department } from "@services/crm/departments";
import { fetchSystemSetupDetailsById } from "@services/systemsetup";
import { resolveBenefitTypes, computeBenefitAmount } from "@utils/benefitTypes";
import { useAppDispatch } from "../../store";
import dayjs from "dayjs";
import { THEME_C } from "@utils/getPrimaryColor";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const C = THEME_C;

const EMPLOYMENT_STATUS_COLORS: Record<string, string> = {
  active: "green",
  on_leave: "blue",
  suspended: "orange",
  terminated: "red",
  resigned: "default",
};

// ── Dashboard-style detail card ───────────────────────────────────────────────
const detailCardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const InfoCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ ...detailCardStyle, padding: "14px 16px 16px", marginBottom: 14 }}>
    <Text
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: C.subText,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        display: "block",
        marginBottom: 12,
      }}
    >
      {title}
    </Text>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px 20px" }}>
      {children}
    </div>
  </div>
);

const InfoItem: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => (
  <div style={{ minWidth: 0 }}>
    <Text
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.4px",
        display: "block",
        marginBottom: 3,
      }}
    >
      {label}
    </Text>
    <Text style={{ fontSize: 13, color: C.darkText }}>{children || "—"}</Text>
  </div>
);

const EmployeeManagement: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const user = getUser();
  const checkPerms = getPermissionChecker();
  const can = (k: string) => user?.role === "admin" || user?.isAdmin === true || checkPerms(k);
  const canCreateEmployee = can("BANDU_EMPLOYEES_CREATE");
  const canUpdateEmployee = can("BANDU_EMPLOYEES_UPDATE");
  const canDeleteEmployee = can("BANDU_EMPLOYEES_DELETE");
  const canImportEmployees = can("BANDU_EMPLOYEES_IMPORT");
  const canExportEmployees = can("BANDU_EMPLOYEES_EXPORT");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDocumentModalVisible, setIsDocumentModalVisible] = useState(false);
  const [isAllowanceModalVisible, setIsAllowanceModalVisible] = useState(false);
  const [isBenefitModalVisible, setIsBenefitModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  // Highest step index reachable so far. Editing an existing employee starts
  // with every step unlocked (all data is already prefilled); adding a new
  // one unlocks steps progressively as the user completes them, but once a
  // step has been visited it stays clickable even after navigating back.
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [activeTab, setActiveTab] = useState("details");
  const [linkToUser, setLinkToUser] = useState<boolean>(false);

  // ── In-progress form draft (session-scoped) ──────────────────────────────
  // Add-mode progress survives closing the modal; cleared on successful create,
  // on Cancel, or when the browser session ends.
  const DRAFT_KEY = "add-employee-draft";
  const DRAFT_DATE_FIELDS = ["hire_date", "date_of_birth", "termination_date"];

  const persistDraft = (step = currentStep) => {
    if (selectedEmployee) return; // drafts only apply to new employees
    const values = { ...allFormValues, ...form.getFieldsValue() };
    const serialized: Record<string, any> = {};
    for (const [k, v] of Object.entries(values)) {
      serialized[k] = v && typeof (v as any)?.toISOString === "function" ? (v as any).toISOString() : v;
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ values: serialized, step, linkToUser }));
  };

  const clearDraft = () => sessionStorage.removeItem(DRAFT_KEY);

  const restoreDraft = (): { values: Record<string, any>; step: number; linkToUser: boolean } => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      if (draft?.values) {
        const values = { ...draft.values };
        for (const f of DRAFT_DATE_FIELDS) {
          if (typeof values[f] === "string") values[f] = dayjs(values[f]);
        }
        return {
          values,
          step: Math.min(Math.max(Number(draft.step) || 0, 0), 4),
          linkToUser: !!draft.linkToUser,
        };
      }
    } catch {
      // Malformed draft — start fresh
    }
    return { values: {}, step: 0, linkToUser: false };
  };
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<EmployeeImportResult | null>(null);
  const [analysis, setAnalysis] = useState<EmployeeAnalysisResult | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [analyseProgress, setAnalyseProgress] = useState<number | null>(null);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [form] = Form.useForm();
  const [documentForm] = Form.useForm();
  const [allowanceForm] = Form.useForm();
  const [benefitForm] = Form.useForm();
  const [allFormValues, setAllFormValues] = useState<Record<string, any>>({});
  const [newDeptName, setNewDeptName] = useState("");
  const [addingDept, setAddingDept] = useState(false);
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  // Fetch crew/users for selection
  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => fetchAllUsersList({ page: 1, limit: 1000 }),
  });

  const users = Array.isArray(usersData) ? usersData : usersData?.users || [];

  // Fetch departments for selection
  const { data: departmentsData } = useQuery({
    queryKey: ["departments-list"],
    queryFn: () => fetchAllDepartments({ is_active: true }),
  });

  const departments = departmentsData?.departments || [];

  // Suggest the next employee number based on the highest existing EMP-XXXX
  const generateEmployeeNumber = () => {
    const max = employees.reduce((acc: number, emp: Employee) => {
      const match = /EMP-?(\d+)/i.exec(emp.employee_number || "");
      return match ? Math.max(acc, parseInt(match[1], 10)) : acc;
    }, 0);
    return `EMP-${String(max + 1).padStart(4, "0")}`;
  };

  const handleAddDepartment = async () => {
    const name = newDeptName.trim();
    if (!name) return;
    setAddingDept(true);
    try {
      const tenant_id = JSON.parse(localStorage.getItem("tenant") || "{}")?._id;
      const result = await dispatch(createDepartment({ name, tenant_id })).unwrap();
      const dept = (result as any)?.department;
      await queryClient.invalidateQueries({ queryKey: ["departments-list"] });
      if (dept?._id) {
        form.setFieldsValue({ department_id: dept._id });
        setAllFormValues((prev) => ({ ...prev, department_id: dept._id }));
      }
      setNewDeptName("");
    } catch {
      // error handled by thunk
    } finally {
      setAddingDept(false);
    }
  };

  // Fetch employees
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["bandu-employees", searchText, statusFilter, departmentFilter, typeFilter],
    queryFn: () =>
      fetchEmployees({
        search: searchText,
        employment_status: statusFilter,
        department_id: departmentFilter,
        employment_type: typeFilter,
        limit: 200,
      }),
  });

  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.data || [];

  // Create employee mutation
  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      setIsModalVisible(false);
      setSelectedEmployee(null);
      setCurrentStep(0);
      setMaxStepReached(0);
      setLinkToUser(false);
      clearDraft();
      form.resetFields();
      setAllFormValues({});
      queryClient.invalidateQueries({ queryKey: ["bandu-employees"] });
    },
  });

  // Update employee mutation
  const updateMutation = useMutation({
    mutationFn: ({ employeeId, params }: { employeeId: string; params: Partial<CreateEmployeeParams> }) =>
      updateEmployee(employeeId, params),
    onSuccess: () => {
      setIsModalVisible(false);
      setIsDrawerVisible(false);
      setSelectedEmployee(null);
      setCurrentStep(0);
      setMaxStepReached(0);
      form.resetFields();
      setAllFormValues({});
      queryClient.invalidateQueries({ queryKey: ["bandu-employees"] });
    },
  });

  // Delete employee mutation
  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bandu-employees"] });
    },
  });

  // Permanently delete employee mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: permanentlyDeleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bandu-employees"] });
    },
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: ({
      employeeId,
      file,
      documentType,
      documentName,
      description,
      expirationDate,
      accessLevel,
    }: {
      employeeId: string;
      file: File;
      documentType: string;
      documentName: string;
      description?: string;
      expirationDate?: string;
      accessLevel?: string;
    }) =>
      uploadEmployeeDocument(employeeId, file, documentType, documentName, description, expirationDate, accessLevel),
    onSuccess: () => {
      setIsDocumentModalVisible(false);
      documentForm.resetFields();
      if (selectedEmployee) {
        queryClient.invalidateQueries({ queryKey: ["employee-documents", selectedEmployee._id] });
      }
    },
  });

  // Import employees mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => {
      setImportProgress(0);
      return importEmployeesFromExcel(
        file,
        localStorage.getItem("shopId"),
        updateExisting,
        setImportProgress
      );
    },
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["bandu-employees"] });
      // Departments may have been auto-created during import
      queryClient.invalidateQueries({ queryKey: ["departments-list"] });
    },
    onError: () => {
      setImportResult(null);
    },
    onSettled: () => {
      setImportProgress(null);
    },
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportEmployees({
        search: searchText,
        employment_status: statusFilter,
        department_id: departmentFilter,
        employment_type: typeFilter,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleAnalyseFile = async (file: File) => {
    setAnalysing(true);
    setAnalyseProgress(0);
    setAnalysis(null);
    setImportResult(null);
    setUpdateExisting(false);
    try {
      const result = await analyseEmployeeFile(file, setAnalyseProgress);
      setAnalysis(result);
    } catch {
      setAnalysis(null);
    } finally {
      setAnalysing(false);
      setAnalyseProgress(null);
    }
  };

  const closeImportModal = () => {
    setIsImportModalVisible(false);
    setImportFile(null);
    setImportResult(null);
    setAnalysis(null);
    setUpdateExisting(false);
    setAnalyseProgress(null);
    setImportProgress(null);
  };

  const ADVICE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
    success: { icon: <CheckCircleOutlined />, color: "#059669" },
    warning: { icon: <WarningOutlined />, color: "#d97706" },
    error: { icon: <CloseCircleOutlined />, color: "#dc2626" },
    info: { icon: <InfoCircleOutlined />, color: "#3b82f6" },
  };

  const previewColumns = [
    { title: "Row", dataIndex: "rowNum", width: 56 },
    { title: "Emp No.", dataIndex: "employee_number" },
    { title: "Full Name", dataIndex: "fullname" },
    { title: "ID Number", dataIndex: "id_number" },
    { title: "Email", dataIndex: "email" },
    { title: "Phone", dataIndex: "phone" },
    { title: "Department", dataIndex: "department" },
    { title: "Job Title", dataIndex: "job_title" },
    { title: "Employment Type", dataIndex: "employment_type" },
    { title: "Employment Status", dataIndex: "employment_status" },
    { title: "Hire Date", dataIndex: "hire_date" },
    { title: "Salary", dataIndex: "basic_salary" },
    { title: "Salary Type", dataIndex: "salary_type" },
    { title: "Currency", dataIndex: "currency" },
    { title: "Payment Frequency", dataIndex: "payment_frequency" },
    { title: "Bank Name", dataIndex: "bank_name" },
    { title: "Bank Account Number", dataIndex: "bank_account_number" },
    { title: "Bank Branch", dataIndex: "bank_branch" },
    { title: "Date of Birth", dataIndex: "date_of_birth" },
    { title: "Gender", dataIndex: "gender" },
    { title: "Blood Group", dataIndex: "blood_group" },
    { title: "Marital Status", dataIndex: "marital_status" },
    { title: "Nationality", dataIndex: "nationality" },
    { title: "KRA PIN", dataIndex: "kra_pin" },
    { title: "NSSF Number", dataIndex: "nssf_number" },
    { title: "SHA/NHIF Number", dataIndex: "nhif_number" },
    { title: "Emergency Contact Name", dataIndex: "emergency_contact_name" },
    { title: "Emergency Contact Phone", dataIndex: "emergency_contact_phone" },
    { title: "Emergency Contact Relationship", dataIndex: "emergency_contact_relationship" },
    { title: "User Email", dataIndex: "user_email" },
  ];

  // Fetch employee documents
  const { data: documentsData } = useQuery({
    queryKey: ["employee-documents", selectedEmployee?._id],
    queryFn: () => (selectedEmployee ? fetchEmployeeDocuments(selectedEmployee._id) : Promise.resolve({ documents: [] })),
    enabled: !!selectedEmployee && isDrawerVisible,
  });

  const documents = documentsData?.documents || [];

  const columns = [
    {
      title: "Employee",
      dataIndex: ["user_id", "fullname"],
      key: "fullname",
      render: (fullname: string, record: Employee) => (
        <Space>
          {record.user_id?.thumbnail ? (
            <img
              src={record.user_id.thumbnail}
              alt=""
              style={{ width: 32, height: 32, borderRadius: "50%" }}
            />
          ) : (
            <UserOutlined style={{ fontSize: 20, color: "#94a3b8" }} />
          )}
          <Space direction="vertical" size={0}>
            <Text strong>{fullname || record.fullname || "—"}</Text>
            {!record.user_id && (
              <Text type="secondary" style={{ fontSize: 11 }}>No user account</Text>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: "Employee No.",
      dataIndex: "employee_number",
      key: "employee_number",
      render: (num: string) => <Text>{num || "—"}</Text>,
    },
    {
      title: "ID Number",
      dataIndex: "id_number",
      key: "id_number",
      render: (num: string) => <Text>{num || "—"}</Text>,
    },
    {
      title: "Department",
      dataIndex: ["department_id", "name"],
      key: "department",
      render: (name: string) => <Text>{name || "—"}</Text>,
    },
    {
      title: "Job Title",
      dataIndex: "job_title",
      key: "job_title",
      render: (title: string) => <Text>{title || "—"}</Text>,
    },
    {
      title: "Status",
      dataIndex: "employment_status",
      key: "employment_status",
      render: (status: string) => (
        <Tag color={EMPLOYMENT_STATUS_COLORS[status] || "default"} style={{ textTransform: "capitalize" }}>
          {status?.replace(/_/g, " ") || "—"}
        </Tag>
      ),
    },
    {
      title: "Basic Salary",
      dataIndex: "basic_salary",
      key: "basic_salary",
      render: (salary: number, record: Employee) => (
        <Text>
          {salary ? `${salary.toLocaleString()} KES` : "—"}
          {record.salary_type === "net" && (
            <Tag color="purple" style={{ marginLeft: 6, fontSize: 10 }}>net</Tag>
          )}
        </Text>
      ),
    },
    {
      title: "Gender",
      dataIndex: "gender",
      key: "gender",
      render: (gender: string) => <Text style={{ textTransform: "capitalize" }}>{gender || "—"}</Text>,
    },
    {
      title: "Employee Type",
      dataIndex: "employment_type",
      key: "employment_type",
      render: (type: string) => (
        <Text style={{ textTransform: "capitalize" }}>{type ? type.replace(/[_-]/g, " ") : "—"}</Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Employee) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => openViewDrawer(record)}>
            View
          </Button>
          {canUpdateEmployee && (
            <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              Edit
            </Button>
          )}
          {canUpdateEmployee && (
            <Popconfirm
              title="Terminate employee"
              description="This will mark the employee as terminated. Continue?"
              okText="Terminate"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteMutation.mutate(record._id)}
            >
              <Button type="link" danger icon={<StopOutlined />} title="Terminate" />
            </Popconfirm>
          )}
          {canDeleteEmployee && (
            <Popconfirm
              title="Delete employee permanently"
              description="This will permanently delete the employee record and all their documents. This cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => permanentDeleteMutation.mutate(record._id)}
            >
              <Button type="link" danger icon={<DeleteOutlined />} title="Delete permanently" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const openViewDrawer = (record: Employee) => {
    setSelectedEmployee(record);
    setIsDrawerVisible(true);
  };

  const openEditModal = (record: Employee) => {
    setSelectedEmployee(record);
    setLinkToUser(!!record.user_id);
    // Map API response to form field structure
    const initialValues = {
      user_id: record.user_id?._id,
      department_id: record.department_id?._id,
      employee_number: record.employee_number,
      job_title: record.job_title,
      fullname: record.fullname,
      firstname: record.firstname,
      middle_name: record.middle_name,
      lastname: record.lastname,
      email: record.email,
      phone: record.phone,
      id_number: record.id_number,
      employment_type: record.employment_type,
      employment_status: record.employment_status,
      hire_date: record.hire_date ? dayjs(record.hire_date) : null,
      termination_date: record.termination_date ? dayjs(record.termination_date) : null,
      basic_salary: record.basic_salary,
      salary_type: record.salary_type || "gross",
      currency: record.currency,
      payment_frequency: record.payment_frequency,
      hourly_rate: record.hourly_rate,
      bank_name: record.bank_name,
      bank_account_number: record.bank_account_number,
      kra_pin: record.kra_pin,
      nssf_number: record.nssf_number,
      nhif_number: record.nhif_number,
      exempt_deductions: record.exempt_deductions,
      date_of_birth: record.date_of_birth ? dayjs(record.date_of_birth) : null,
      gender: record.gender,
      blood_group: record.blood_group,
      marital_status: record.marital_status,
      nationality: record.nationality,
      emergency_contact_name: record.emergency_contact_name,
      emergency_contact_phone: record.emergency_contact_phone,
      emergency_contact_relationship: record.emergency_contact_relationship,
    };
    form.setFieldsValue(initialValues);
    setAllFormValues(initialValues);
    setCurrentStep(0);
    setMaxStepReached(4); // all data is already filled in, so unlock every step
    setIsModalVisible(true);
  };

  // Fields required on the employee record itself
  const REQUIRED_EMPLOYEE_FIELDS = [
    "id_number",
    "employment_type",
    "hire_date",
    "basic_salary",
    "currency",
    "payment_frequency",
  ];

  const buildEmployeePayload = (values: any): Record<string, any> => {
    const merged = { ...allFormValues, ...values };
    const payload: Record<string, any> = { ...merged };
    // Non-KES salary — auto-convert at the given rate and store in KES
    if (payload.currency && payload.currency !== "KES" && payload.exchange_rate) {
      payload.original_currency = payload.currency;
      payload.original_basic_salary = payload.basic_salary;
      payload.basic_salary = Math.round(Number(payload.basic_salary || 0) * Number(payload.exchange_rate));
      payload.currency = "KES";
    } else {
      delete payload.exchange_rate;
      delete payload.original_currency;
      delete payload.original_basic_salary;
    }
    if (!payload.department_id) payload.department_id = null;
    if (!payload.job_title) payload.job_title = "";
    if (!payload.employee_number) delete payload.employee_number;
    if (linkToUser) {
      // Identity comes from the linked user account
      delete payload.fullname;
      delete payload.firstname;
      delete payload.middle_name;
      delete payload.lastname;
      delete payload.email;
      delete payload.phone;
    } else {
      payload.user_id = null;
      // Fullname is derived from the name parts (backend also recomputes it
      // as a safety net), so the rest of the app that still reads
      // `fullname` directly keeps working unchanged.
      payload.fullname = [payload.firstname, payload.middle_name, payload.lastname]
        .map((p) => String(p || "").trim())
        .filter(Boolean)
        .join(" ");
    }
    return payload;
  };

  const validateRequiredFields = (payload: Record<string, any>): boolean => {
    const missing = REQUIRED_EMPLOYEE_FIELDS.filter((f) => {
      const v = payload[f];
      return v === undefined || v === null || v === "";
    });
    if (linkToUser && !payload.user_id) missing.unshift("user_id");
    if (!linkToUser) {
      if (!String(payload.firstname || "").trim()) missing.unshift("firstname");
      if (!String(payload.lastname || "").trim()) missing.unshift("lastname");
    }
    if (missing.length > 0) {
      message.error(`Missing required fields: ${missing.join(", ")}. Please go back and complete them.`);
      setCurrentStep(0);
      return false;
    }
    return true;
  };

  const handleCreateEmployee = async (values: CreateEmployeeParams) => {
    const payload = buildEmployeePayload(values);
    if (!validateRequiredFields(payload)) return;
    try {
      await createMutation.mutateAsync(payload as CreateEmployeeParams);
      setLinkToUser(false);
      setAllFormValues({});
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;
    try {
      // Get all form values from accumulated state and current form
      const currentValues = form.getFieldsValue();
      const payload = buildEmployeePayload(currentValues);
      if (!validateRequiredFields(payload)) return;
      await updateMutation.mutateAsync({ employeeId: selectedEmployee._id, params: payload });
      setLinkToUser(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Foreign-currency salary — ask for an exchange rate and save in KES
  const watchedCurrency = Form.useWatch("currency", form);
  const watchedBasicSalary = Form.useWatch("basic_salary", form);
  const watchedExchangeRate = Form.useWatch("exchange_rate", form);
  const isForeignCurrency = !!watchedCurrency && watchedCurrency !== "KES";

  const STEP_FIELDS: Record<number, string[]> = {
    0: linkToUser
      ? ["user_id", "id_number"]
      : ["firstname", "lastname", "id_number"],
    1: [
      "employment_type", "hire_date", "basic_salary", "currency", "payment_frequency",
      ...(isForeignCurrency ? ["exchange_rate"] : []),
    ],
    2: [],
    3: [],
    4: [],
  };

  const handleNextStep = async () => {
    try {
      const fields = STEP_FIELDS[currentStep] || [];
      if (fields.length) await form.validateFields(fields);
      const currentValues = form.getFieldsValue();
      setAllFormValues({ ...allFormValues, ...currentValues });
      setCurrentStep(currentStep + 1);
      setMaxStepReached((prev) => Math.max(prev, currentStep + 1));
      persistDraft(currentStep + 1);
    } catch {
      // Stay on current step until required fields are valid
    }
  };


  const handleUploadDocument = async (values: any) => {
    if (!selectedEmployee || !values.file) return;
    try {
      await uploadDocumentMutation.mutateAsync({
        employeeId: selectedEmployee._id,
        file: values.file.file,
        documentType: values.document_type,
        documentName: values.document_name,
        description: values.description,
        expirationDate: values.expiration_date ? dayjs(values.expiration_date).format("YYYY-MM-DD") : undefined,
        accessLevel: values.access_level,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteEmployeeDocument(documentId);
      if (selectedEmployee) {
        queryClient.invalidateQueries({ queryKey: ["employee-documents", selectedEmployee._id] });
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleAddAllowance = async (values: any) => {
    if (!selectedEmployee) return;
    try {
      const allowance = {
        allowance_type: values.allowance_type !== "custom" ? values.allowance_type : undefined,
        name: values.name,
        amount: values.amount,
        frequency: values.frequency,
        is_taxable: values.is_taxable,
      };
      const updatedAllowances = [...(selectedEmployee.allowances || []), allowance];
      await updateMutation.mutateAsync({
        employeeId: selectedEmployee._id,
        params: { allowances: updatedAllowances },
      });
      setIsAllowanceModalVisible(false);
      allowanceForm.resetFields();
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Benefit type defaults — configured in System Setup → Payroll
  const { data: systemSettingsData } = useQuery({
    queryKey: ["systemSetup"],
    queryFn: () => fetchSystemSetupDetailsById(),
  });
  const benefitTypes = React.useMemo(
    () => resolveBenefitTypes(systemSettingsData?.payroll_settings),
    [systemSettingsData]
  );
  const watchedBenefitKey = Form.useWatch("benefit_type", benefitForm);
  const watchedBenefit = benefitTypes.find((b) => b.key === watchedBenefitKey);
  const isComputedBenefit = !!watchedBenefit && watchedBenefit.mode !== "fixed";

  const handleAddBenefit = async (values: any) => {
    if (!selectedEmployee) return;
    try {
      // Model expects `value`; asset_value/rent_amount are only computation inputs
      const { asset_value, rent_amount, ...rest } = values;
      const benefit = {
        benefit_type: values.benefit_type !== "custom" ? values.benefit_type : undefined,
        name: rest.name,
        description: rest.description,
        value: rest.amount,
        frequency: rest.frequency,
      };
      const updatedBenefits = [...(selectedEmployee.benefits || []), benefit];
      await updateMutation.mutateAsync({
        employeeId: selectedEmployee._id,
        params: { benefits: updatedBenefits },
      });
      setIsBenefitModalVisible(false);
      benefitForm.resetFields();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 10 : 0,
        }}
      >
        <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: C.darkText }}>
          <UserOutlined style={{ marginRight: 8, color: C.primary }} />
          Employee Management
        </Title>
        <Space wrap>
          {!isMobile && canImportEmployees && (
            <Button icon={<DownloadOutlined />} onClick={() => downloadEmployeeTemplate()}>
              Template
            </Button>
          )}
          {canImportEmployees && (
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => {
                setImportFile(null);
                setImportResult(null);
                setAnalysis(null);
                setUpdateExisting(false);
                setIsImportModalVisible(true);
              }}
            >
              Import
            </Button>
          )}
          {canExportEmployees && (
            <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
              Export
            </Button>
          )}
          {canCreateEmployee && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedEmployee(null);
                form.resetFields();
                const draft = restoreDraft();
                setLinkToUser(draft.linkToUser);
                if (!draft.values.employee_number) draft.values.employee_number = generateEmployeeNumber();
                setAllFormValues(draft.values);
                form.setFieldsValue(draft.values);
                setCurrentStep(draft.step);
                setMaxStepReached(draft.step);
                setIsModalVisible(true);
              }}
            >
              Add Employee
            </Button>
          )}
        </Space>
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <Space wrap>
            <Input
              placeholder="Search name, email, ID, job title, branch…"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: isMobile ? "100%" : 270 }}
              allowClear
            />
            <Select
              placeholder="Status"
              value={statusFilter || undefined}
              onChange={(v) => setStatusFilter(v || "")}
              style={{ width: 130 }}
              allowClear
            >
              <Option value="active">Active</Option>
              <Option value="on_leave">On Leave</Option>
              <Option value="suspended">Suspended</Option>
              <Option value="terminated">Terminated</Option>
              <Option value="resigned">Resigned</Option>
            </Select>
            <Select
              placeholder="Department"
              value={departmentFilter || undefined}
              onChange={(v) => setDepartmentFilter(v || "")}
              style={{ width: 160 }}
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {departments.map((dept: Department) => (
                <Option key={dept._id} value={dept._id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Employment type"
              value={typeFilter || undefined}
              onChange={(v) => setTypeFilter(v || "")}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="full-time">Full-time</Option>
              <Option value="part-time">Part-time</Option>
              <Option value="contract">Contract</Option>
              <Option value="intern">Intern</Option>
              <Option value="casual">Casual</Option>
              <Option value="consultant">Consultant</Option>
            </Select>
          </Space>
          <Segmented
            value={viewMode}
            onChange={(v) => setViewMode(v as "list" | "card")}
            options={[
              { value: "list", icon: <UnorderedListOutlined />, label: "List" },
              { value: "card", icon: <AppstoreOutlined />, label: "Cards" },
            ]}
          />
        </div>

        {viewMode === "list" ? (
          <Table
            columns={columns}
            dataSource={employees}
            loading={isLoading}
            rowKey="_id"
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "200px" : "240px"}, 1fr))`,
              gap: 12,
            }}
          >
            {!isLoading && (!employees || employees.length === 0) && (
              <div style={{ gridColumn: "1 / -1" }}>
                <Empty description="No employees found" style={{ padding: "40px 0" }} />
              </div>
            )}
            {(employees || []).map((emp: Employee) => (
              <div
                key={emp._id}
                style={{
                  ...detailCardStyle,
                  padding: "14px 16px",
                  cursor: "pointer",
                  transition: "box-shadow 0.15s",
                }}
                onClick={() => openViewDrawer(emp)}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)")}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <Avatar
                    size={40}
                    icon={<UserOutlined />}
                    style={{ background: C.primaryLight, color: C.primary, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      strong
                      style={{
                        fontSize: 13,
                        color: C.darkText,
                        display: "block",
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {emp.user_id?.fullname || emp.fullname || "—"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: C.subText,
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {emp.job_title || "—"}
                    </Text>
                  </div>
                </div>

                {/* Tags */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                  <Tag
                    color={EMPLOYMENT_STATUS_COLORS[emp.employment_status] || "default"}
                    style={{ margin: 0, fontSize: 11, textTransform: "capitalize" }}
                  >
                    {emp.employment_status?.replace(/_/g, " ") || "—"}
                  </Tag>
                  {emp.department_id?.name && (
                    <Tag style={{ margin: 0, fontSize: 11 }}>{emp.department_id.name}</Tag>
                  )}
                  {!emp.user_id && (
                    <Tag style={{ margin: 0, fontSize: 11 }}>No user account</Tag>
                  )}
                </div>

                {/* Meta */}
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: 8,
                    padding: "7px 10px",
                    marginBottom: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, color: C.subText }}>{emp.employee_number}</Text>
                  <Text style={{ fontSize: 11, color: C.darkText, fontWeight: 600 }}>
                    {emp.basic_salary != null ? `${emp.basic_salary.toLocaleString()} ${emp.currency || "KES"}` : "—"}
                    {emp.salary_type === "net" && <span style={{ color: "#8b5cf6", fontWeight: 400 }}> · net</span>}
                  </Text>
                </div>

                {/* Actions */}
                <div
                  style={{ display: "flex", justifyContent: "flex-end", gap: 2 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openViewDrawer(emp)} />
                  {canUpdateEmployee && (
                    <Button type="text" size="small" icon={<EditOutlined style={{ color: C.primary }} />} onClick={() => openEditModal(emp)} />
                  )}
                  {canUpdateEmployee && (
                    <Popconfirm
                      title="Terminate employee"
                      description="This will mark the employee as terminated. Continue?"
                      okText="Terminate"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => deleteMutation.mutate(emp._id)}
                    >
                      <Button type="text" size="small" danger icon={<StopOutlined />} title="Terminate" />
                    </Popconfirm>
                  )}
                  {canDeleteEmployee && (
                    <Popconfirm
                      title="Delete employee permanently"
                      description="This will permanently delete the employee record and all their documents. This cannot be undone."
                      okText="Delete"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => permanentDeleteMutation.mutate(emp._id)}
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} title="Delete permanently" />
                    </Popconfirm>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Edit Employee Modal */}
      <Modal
        title={selectedEmployee ? "Edit Employee" : "Add Employee"}
        open={isModalVisible}
        onCancel={() => {
          persistDraft(); // keep in-progress values for this session
          setIsModalVisible(false);
          setSelectedEmployee(null);
          setCurrentStep(0);
          setMaxStepReached(0);
          setLinkToUser(false);
          form.resetFields();
          setAllFormValues({});
        }}
        footer={null}
        width={isMobile ? "100%" : 900}
        style={{ top: isMobile ? 0 : 20 }}
      >
        <Row gutter={24}>
          <Col span={6}>
            <Steps
              current={currentStep}
              direction="vertical"
              size="small"
              onChange={(step) => {
                // Jump directly to any step already visited, in either direction
                if (step <= maxStepReached && step !== currentStep) {
                  setAllFormValues({ ...allFormValues, ...form.getFieldsValue() });
                  setCurrentStep(step);
                }
              }}
            >
              <Steps.Step title="Basic Info" />
              <Steps.Step title="Employment" disabled={maxStepReached < 1} />
              <Steps.Step title="Banking & Tax" disabled={maxStepReached < 2} />
              <Steps.Step title="Personal Info" disabled={maxStepReached < 3} />
              <Steps.Step title="Emergency" disabled={maxStepReached < 4} />
            </Steps>
          </Col>
          <Col span={18}>
            <Form
              form={form}
              layout="vertical"
              onFinish={selectedEmployee ? handleUpdateEmployee : handleCreateEmployee}
            >
          {/* Step 1: Basic Info */}
          {currentStep === 0 && (
            <>
              <Form.Item label="Employee Type">
                <Segmented
                  value={linkToUser ? "linked" : "standalone"}
                  onChange={(v) => setLinkToUser(v === "linked")}
                  options={[
                    { label: "No User Account", value: "standalone" },
                    { label: "Linked to User Account", value: "linked" },
                  ]}
                />
              </Form.Item>
              <Row gutter={16}>
                {linkToUser ? (
                  <Col span={12}>
                    <Form.Item label="Select Crew Member" name="user_id" rules={[{ required: true, message: "Required" }]}>
                      <Select
                        placeholder="Select a crew member"
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.label ?? "").toString().toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {users
                          .filter(
                            (user: any) =>
                              !employees.some(
                                (emp: Employee) => emp.user_id?._id === user._id && emp._id !== selectedEmployee?._id
                              )
                          )
                          .map((user: any) => (
                            <Option key={user._id} value={user._id} label={user.fullname}>
                              <Space>
                                {user.thumbnail && (
                                  <img
                                    src={user.thumbnail}
                                    alt=""
                                    style={{ width: 24, height: 24, borderRadius: "50%" }}
                                  />
                                )}
                                <span>{user.fullname}</span>
                                <span style={{ color: "#94a3b8", fontSize: 12 }}> ({user.email})</span>
                              </Space>
                            </Option>
                          ))}
                      </Select>
                    </Form.Item>
                  </Col>
                ) : (
                  <>
                    <Col span={8}>
                      <Form.Item label="First Name" name="firstname" rules={[{ required: true, message: "Required" }]}>
                        <Input placeholder="e.g., Jane" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Middle Name" name="middle_name">
                        <Input placeholder="Optional" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Last Name" name="lastname" rules={[{ required: true, message: "Required" }]}>
                        <Input placeholder="e.g., Doe" />
                      </Form.Item>
                    </Col>
                  </>
                )}
                <Col span={12}>
                  <Form.Item label="Department" name="department_id">
                    <Select
                      placeholder="Select a department (optional)"
                      showSearch
                      allowClear
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.label ?? "").toString().toLowerCase().includes(input.toLowerCase())
                      }
                      dropdownRender={(menu) => (
                        <>
                          {menu}
                          <Divider style={{ margin: "8px 0" }} />
                          <Space style={{ padding: "0 8px 4px" }}>
                            <Input
                              placeholder="New department name"
                              value={newDeptName}
                              onChange={(e) => setNewDeptName(e.target.value)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Enter") handleAddDepartment();
                              }}
                            />
                            <Button
                              type="text"
                              icon={<PlusOutlined />}
                              loading={addingDept}
                              onClick={handleAddDepartment}
                            >
                              Add
                            </Button>
                          </Space>
                        </>
                      )}
                    >
                      {departments.map((dept: Department) => (
                        <Option key={dept._id} value={dept._id} label={dept.name}>
                          <Space>
                            {dept.color && (
                              <span
                                style={{
                                  display: "inline-block",
                                  width: 12,
                                  height: 12,
                                  borderRadius: "50%",
                                  backgroundColor: dept.color,
                                }}
                              />
                            )}
                            <span>{dept.name}</span>
                            {dept.code && <span style={{ color: "#94a3b8", fontSize: 12 }}> ({dept.code})</span>}
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              {!linkToUser && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Email"
                      name="email"
                      rules={[{ type: "email", message: "Enter a valid email" }]}
                    >
                      <Input placeholder="e.g., jane@example.com" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Phone" name="phone">
                      <Input placeholder="e.g., +254712345678" />
                    </Form.Item>
                  </Col>
                </Row>
              )}
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="Employee Number"
                    name="employee_number"
                    extra="Auto-generated if left blank"
                  >
                    <Input placeholder="Auto-generated" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="ID Number" name="id_number" rules={[{ required: true, message: "Required" }]}>
                    <Input placeholder="e.g., 12345678" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Job Title" name="job_title">
                    <Input placeholder="e.g., Software Engineer" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* Step 2: Employment Details */}
          {currentStep === 1 && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Employment Type" name="employment_type" rules={[{ required: true, message: "Required" }]}>
                    <Select placeholder="Select employment type">
                      <Option value="full-time">Full-time</Option>
                      <Option value="part-time">Part-time</Option>
                      <Option value="contract">Contract</Option>
                      <Option value="intern">Intern</Option>
                      <Option value="casual">Casual</Option>
                      <Option value="consultant">Consultant</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Hire Date" name="hire_date" rules={[{ required: true, message: "Required" }]}>
                    <DatePicker style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Basic Salary" name="basic_salary" rules={[{ required: true, message: "Required" }]}>
                    <InputNumber style={{ width: "100%" }} placeholder="0" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Salary Basis"
                    name="salary_type"
                    initialValue="gross"
                    tooltip="Gross: salary before deductions. Net: take-home amount — payroll calculates the gross needed to reach it."
                  >
                    <Select placeholder="Gross or Net">
                      <Option value="gross">Gross Pay</Option>
                      <Option value="net">Net Pay</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Currency" name="currency" rules={[{ required: true, message: "Required" }]}>
                    <Select placeholder="Select currency">
                      <Option value="KES">KES</Option>
                      <Option value="USD">USD</Option>
                      <Option value="EUR">EUR</Option>
                      <Option value="GBP">GBP</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Payment Frequency" name="payment_frequency" rules={[{ required: true, message: "Required" }]}>
                    <Select placeholder="Select frequency">
                      <Option value="daily">Daily</Option>
                      <Option value="weekly">Weekly</Option>
                      <Option value="bi-weekly">Bi-weekly</Option>
                      <Option value="monthly">Monthly</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {isForeignCurrency && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label={`Exchange Rate — 1 ${watchedCurrency} in KES`}
                      name="exchange_rate"
                      rules={[{ required: true, message: "Required for non-KES salary" }]}
                      tooltip="The salary is converted and saved in KES"
                    >
                      <InputNumber min={0.0001} style={{ width: "100%" }} placeholder="e.g. 130" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Salary in KES (auto-converted)">
                      <Input
                        disabled
                        value={
                          watchedBasicSalary && watchedExchangeRate
                            ? `KES ${Math.round(watchedBasicSalary * watchedExchangeRate).toLocaleString()}`
                            : "—"
                        }
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}
            </>
          )}

          {/* Step 3: Banking & Tax */}
          {currentStep === 2 && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Bank Name" name="bank_name">
                    <Input placeholder="Enter bank name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Bank Account Number" name="bank_account_number">
                    <Input placeholder="Enter account number" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="KRA PIN" name="kra_pin">
                    <Input placeholder="Enter KRA PIN" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="NSSF Number" name="nssf_number">
                    <Input placeholder="Enter NSSF number" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="SHA Number" name="nhif_number">
                    <Input placeholder="Enter SHA number" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                label="Deduction Exemptions"
                name="exempt_deductions"
                extra="Selected statutory deductions will be skipped when payroll runs for this employee"
              >
                <Select
                  mode="multiple"
                  placeholder="None — all statutory deductions apply"
                  allowClear
                  options={[
                    { value: "PAYE", label: "PAYE (Income Tax)" },
                    { value: "NSSF", label: "NSSF" },
                    { value: "SHA", label: "SHA (Health Insurance)" },
                    { value: "NHIF", label: "NHIF (legacy)" },
                    { value: "HOUSING_LEVY", label: "Housing Levy" },
                    { value: "NITA", label: "NITA (Training Levy)" },
                    { value: "WITHHOLDING_TAX", label: "Withholding Tax" },
                    { value: "CUSTOM", label: "Custom Deductions" },
                  ]}
                />
              </Form.Item>
            </>
          )}

          {/* Step 4: Personal Information */}
          {currentStep === 3 && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Date of Birth" name="date_of_birth">
                    <DatePicker style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Gender" name="gender">
                    <Select placeholder="Select gender">
                      <Option value="male">Male</Option>
                      <Option value="female">Female</Option>
                      <Option value="other">Other</Option>
                      <Option value="prefer_not_to_say">Prefer not to say</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Blood Group" name="blood_group">
                    <Select placeholder="Select blood group">
                      <Option value="A+">A+</Option>
                      <Option value="A-">A-</Option>
                      <Option value="B+">B+</Option>
                      <Option value="B-">B-</Option>
                      <Option value="AB+">AB+</Option>
                      <Option value="AB-">AB-</Option>
                      <Option value="O+">O+</Option>
                      <Option value="O-">O-</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Marital Status" name="marital_status">
                    <Select placeholder="Select marital status">
                      <Option value="single">Single</Option>
                      <Option value="married">Married</Option>
                      <Option value="divorced">Divorced</Option>
                      <Option value="widowed">Widowed</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Nationality" name="nationality">
                    <Input placeholder="Enter nationality" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* Step 5: Emergency Contact */}
          {currentStep === 4 && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Emergency Contact Name" name="emergency_contact_name">
                    <Input placeholder="Enter contact name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Emergency Contact Phone" name="emergency_contact_phone">
                    <Input placeholder="Enter phone number" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Emergency Contact Relationship" name="emergency_contact_relationship">
                <Input placeholder="e.g., Spouse, Parent" />
              </Form.Item>
            </>
          )}

          <Form.Item>
            <Space>
              {currentStep > 0 && (
                <Button onClick={() => setCurrentStep(currentStep - 1)}>
                  Previous
                </Button>
              )}
              {currentStep < 4 ? (
                <Button type="primary" onClick={handleNextStep}>
                  Next
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={() => form.submit()}
                  loading={createMutation.isLoading || updateMutation.isLoading}
                >
                  {selectedEmployee ? "Update" : "Create"} Employee
                </Button>
              )}
              {/* Editing an existing employee: every field is already saved somewhere,
                  so let the user save from whichever step they're on instead of
                  forcing them to click through the remaining steps. */}
              {selectedEmployee && currentStep < 4 && (
                <Button
                  onClick={handleUpdateEmployee}
                  loading={updateMutation.isLoading}
                >
                  Save & Finish
                </Button>
              )}
              <Button onClick={() => {
                clearDraft(); // explicit discard
                setIsModalVisible(false);
                setSelectedEmployee(null);
                setCurrentStep(0);
                setMaxStepReached(0);
                setLinkToUser(false);
                form.resetFields();
                setAllFormValues({});
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
          </Col>
        </Row>
      </Modal>

      {/* Employee Details Drawer */}
      <Drawer
        title="Employee Details"
        placement="right"
        width={isMobile ? "100%" : 720}
        open={isDrawerVisible}
        onClose={() => {
          setIsDrawerVisible(false);
          setSelectedEmployee(null);
          setActiveTab("details");
        }}
        styles={{ body: { background: "#f8fafc", padding: 16 } }}
      >
        {selectedEmployee && (
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <Tabs.TabPane tab="Details" key="details">
              {/* Profile header */}
              <div
                style={{
                  ...detailCardStyle,
                  padding: "16px",
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <Avatar
                  size={52}
                  icon={<UserOutlined />}
                  style={{ background: C.primaryLight, color: C.primary, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 15, color: C.darkText, display: "block", lineHeight: 1.3 }}>
                    {selectedEmployee.user_id?.fullname || selectedEmployee.fullname || "—"}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.subText, display: "block" }}>
                    {[selectedEmployee.job_title, selectedEmployee.department_id?.name].filter(Boolean).join(" · ")}
                  </Text>
                  <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                    <Tag
                      color={selectedEmployee.employment_status === "active" ? "green" : "red"}
                      style={{ margin: 0, fontSize: 11, textTransform: "capitalize" }}
                    >
                      {selectedEmployee.employment_status}
                    </Tag>
                    {selectedEmployee.employment_type && (
                      <Tag style={{ margin: 0, fontSize: 11, textTransform: "capitalize" }}>
                        {selectedEmployee.employment_type.replace(/_/g, " ")}
                      </Tag>
                    )}
                    <Tag
                      color={selectedEmployee.user_id ? "blue" : "default"}
                      style={{ margin: 0, fontSize: 11 }}
                    >
                      {selectedEmployee.user_id ? `Linked: ${selectedEmployee.user_id.username || selectedEmployee.user_id.email}` : "No user account"}
                    </Tag>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      display: "block",
                    }}
                  >
                    Emp No.
                  </Text>
                  <Text strong style={{ fontSize: 14, color: C.primary }}>
                    {selectedEmployee.employee_number}
                  </Text>
                </div>
              </div>

              <InfoCard title="Contact & Identity">
                <InfoItem label="Full Name">{selectedEmployee.user_id?.fullname || selectedEmployee.fullname}</InfoItem>
                <InfoItem label="Email">{selectedEmployee.user_id?.email || selectedEmployee.email}</InfoItem>
                <InfoItem label="Phone">{selectedEmployee.user_id?.phone || selectedEmployee.phone}</InfoItem>
                <InfoItem label="ID Number">{selectedEmployee.id_number}</InfoItem>
              </InfoCard>

              <InfoCard title="Employment">
                <InfoItem label="Department">{selectedEmployee.department_id?.name}</InfoItem>
                <InfoItem label="Job Title">{selectedEmployee.job_title}</InfoItem>
                <InfoItem label="Employment Type">
                  <span style={{ textTransform: "capitalize" }}>
                    {selectedEmployee.employment_type?.replace(/_/g, " ")}
                  </span>
                </InfoItem>
                <InfoItem label="Hire Date">{dayjs(selectedEmployee.hire_date).format("DD MMM YYYY")}</InfoItem>
                {selectedEmployee.termination_date && (
                  <InfoItem label="Termination Date">
                    {dayjs(selectedEmployee.termination_date).format("DD MMM YYYY")}
                  </InfoItem>
                )}
                {selectedEmployee.termination_reason && (
                  <InfoItem label="Termination Reason">{selectedEmployee.termination_reason}</InfoItem>
                )}
              </InfoCard>

              <InfoCard title="Compensation">
                <InfoItem label="Basic Salary">
                  {selectedEmployee.basic_salary != null
                    ? `${selectedEmployee.basic_salary.toLocaleString()} ${selectedEmployee.currency || ""}`
                    : "—"}
                </InfoItem>
                <InfoItem label="Salary Basis">
                  {selectedEmployee.salary_type === "net" ? (
                    <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>Net Pay (grossed up at payroll)</Tag>
                  ) : (
                    "Gross Pay"
                  )}
                </InfoItem>
                {selectedEmployee.salary_type === "net" && selectedEmployee.gross_salary != null && (
                  <InfoItem label="Package Total">
                    {`${selectedEmployee.gross_salary.toLocaleString()} ${selectedEmployee.currency || ""}`}
                  </InfoItem>
                )}
                <InfoItem label="Payment Frequency">
                  <span style={{ textTransform: "capitalize" }}>
                    {selectedEmployee.payment_frequency?.replace(/_/g, " ")}
                  </span>
                </InfoItem>
                {selectedEmployee.hourly_rate != null && (
                  <InfoItem label="Hourly Rate">
                    {`${selectedEmployee.hourly_rate.toLocaleString()} ${selectedEmployee.currency || ""}`}
                  </InfoItem>
                )}
              </InfoCard>

              <InfoCard title="Personal">
                <InfoItem label="Gender">
                  <span style={{ textTransform: "capitalize" }}>{selectedEmployee.gender}</span>
                </InfoItem>
                <InfoItem label="Date of Birth">
                  {selectedEmployee.date_of_birth ? dayjs(selectedEmployee.date_of_birth).format("DD MMM YYYY") : "—"}
                </InfoItem>
                <InfoItem label="Blood Group">{selectedEmployee.blood_group}</InfoItem>
                <InfoItem label="Marital Status">
                  <span style={{ textTransform: "capitalize" }}>{selectedEmployee.marital_status}</span>
                </InfoItem>
                <InfoItem label="Nationality">
                  <span style={{ textTransform: "capitalize" }}>{selectedEmployee.nationality}</span>
                </InfoItem>
              </InfoCard>

              <InfoCard title="Banking & Statutory">
                <InfoItem label="Bank Name">{selectedEmployee.bank_name}</InfoItem>
                <InfoItem label="Bank Account">{selectedEmployee.bank_account_number}</InfoItem>
                <InfoItem label="Bank Branch">{selectedEmployee.bank_branch}</InfoItem>
                <InfoItem label="KRA PIN">{selectedEmployee.kra_pin}</InfoItem>
                <InfoItem label="NSSF Number">{selectedEmployee.nssf_number}</InfoItem>
                <InfoItem label="SHA Number">{selectedEmployee.nhif_number}</InfoItem>
                <InfoItem label="Deduction Exemptions">
                  {selectedEmployee.exempt_deductions?.length ? (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {selectedEmployee.exempt_deductions.map((d: string) => (
                        <Tag key={d} color="orange" style={{ margin: 0, fontSize: 11 }}>
                          {d.replace(/_/g, " ")}
                        </Tag>
                      ))}
                    </div>
                  ) : (
                    "None"
                  )}
                </InfoItem>
              </InfoCard>

              <InfoCard title="Emergency Contact">
                <InfoItem label="Name">{selectedEmployee.emergency_contact_name}</InfoItem>
                <InfoItem label="Phone">{selectedEmployee.emergency_contact_phone}</InfoItem>
                <InfoItem label="Relationship">
                  <span style={{ textTransform: "capitalize" }}>{selectedEmployee.emergency_contact_relationship}</span>
                </InfoItem>
              </InfoCard>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Allowances" key="allowances">
              <div
                style={{
                  ...detailCardStyle,
                  padding: "12px 16px",
                  marginBottom: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Space size={8}>
                  <Text strong style={{ fontSize: 13, color: C.darkText }}>Allowances</Text>
                  <span
                    style={{
                      background: C.primaryLight,
                      color: C.primary,
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "1px 8px",
                    }}
                  >
                    {selectedEmployee.allowances?.length || 0}
                  </span>
                </Space>
                {canUpdateEmployee && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<DollarOutlined />}
                    style={{ borderRadius: 7 }}
                    onClick={() => setIsAllowanceModalVisible(true)}
                  >
                    Add Allowance
                  </Button>
                )}
              </div>

              <div style={{ ...detailCardStyle, overflow: "hidden" }}>
                <Table
                  dataSource={selectedEmployee.allowances || []}
                  rowKey={(_, index?: number) => `allowance-${index || 0}`}
                  pagination={false}
                  size="small"
                  locale={{
                    emptyText: (
                      <Empty
                        description="No allowances yet"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ padding: "28px 0" }}
                      />
                    ),
                  }}
                  columns={[
                    { title: "Name", dataIndex: "name", render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                    {
                      title: "Amount",
                      dataIndex: "amount",
                      align: "right",
                      render: (amount: number) => (
                        <Text style={{ fontSize: 12, fontWeight: 600 }}>
                          {amount?.toLocaleString()} {selectedEmployee.currency || "KES"}
                        </Text>
                      ),
                    },
                    {
                      title: "Frequency",
                      dataIndex: "frequency",
                      render: (f: string) => (
                        <span style={{ textTransform: "capitalize", fontSize: 12 }}>{f?.replace(/_/g, " ") || "—"}</span>
                      ),
                    },
                    {
                      title: "Taxable",
                      dataIndex: "is_taxable",
                      width: 90,
                      render: (taxable: boolean) => (
                        <Tag color={taxable ? "green" : "default"} style={{ margin: 0, fontSize: 11 }}>
                          {taxable ? "Yes" : "No"}
                        </Tag>
                      ),
                    },
                  ]}
                />
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Benefits" key="benefits">
              <div
                style={{
                  ...detailCardStyle,
                  padding: "12px 16px",
                  marginBottom: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Space size={8}>
                  <Text strong style={{ fontSize: 13, color: C.darkText }}>Benefits</Text>
                  <span
                    style={{
                      background: C.primaryLight,
                      color: C.primary,
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "1px 8px",
                    }}
                  >
                    {selectedEmployee.benefits?.length || 0}
                  </span>
                </Space>
                {canUpdateEmployee && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<GiftOutlined />}
                    style={{ borderRadius: 7 }}
                    onClick={() => setIsBenefitModalVisible(true)}
                  >
                    Add Benefit
                  </Button>
                )}
              </div>

              <div style={{ ...detailCardStyle, overflow: "hidden" }}>
                <Table
                  dataSource={selectedEmployee.benefits || []}
                  rowKey={(_, index?: number) => `benefit-${index || 0}`}
                  pagination={false}
                  size="small"
                  locale={{
                    emptyText: (
                      <Empty
                        description="No benefits yet"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ padding: "28px 0" }}
                      />
                    ),
                  }}
                  columns={[
                    { title: "Name", dataIndex: "name", render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                    {
                      title: "Amount",
                      dataIndex: "value",
                      align: "right",
                      render: (value: number) => (
                        <Text style={{ fontSize: 12, fontWeight: 600 }}>
                          {value?.toLocaleString()} {selectedEmployee.currency || "KES"}
                        </Text>
                      ),
                    },
                    {
                      title: "Frequency",
                      dataIndex: "frequency",
                      render: (f: string) => (
                        <span style={{ textTransform: "capitalize", fontSize: 12 }}>{f?.replace(/_/g, " ") || "—"}</span>
                      ),
                    },
                  ]}
                />
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Documents" key="documents">
              <div
                style={{
                  ...detailCardStyle,
                  padding: "12px 16px",
                  marginBottom: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Space size={8}>
                  <Text strong style={{ fontSize: 13, color: C.darkText }}>Documents</Text>
                  <span
                    style={{
                      background: C.primaryLight,
                      color: C.primary,
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "1px 8px",
                    }}
                  >
                    {documents?.length || 0}
                  </span>
                </Space>
                {canUpdateEmployee && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<UploadOutlined />}
                    style={{ borderRadius: 7 }}
                    onClick={() => setIsDocumentModalVisible(true)}
                  >
                    Upload Document
                  </Button>
                )}
              </div>

              <div style={{ ...detailCardStyle, padding: "6px 0" }}>
                {!documents?.length ? (
                  <Empty
                    description="No documents uploaded"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ padding: "28px 0" }}
                  />
                ) : (
                  documents.map((doc: any, i: number) => (
                    <div
                      key={doc._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 16px",
                        borderBottom: i < documents.length - 1 ? `1px solid ${C.border}` : "none",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: C.primaryLight,
                          color: C.primary,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 15,
                          flexShrink: 0,
                        }}
                      >
                        <FileTextOutlined />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          strong
                          style={{
                            fontSize: 12,
                            color: C.darkText,
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {doc.document_name}
                        </Text>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <Text style={{ fontSize: 11, color: C.subText, textTransform: "capitalize" }}>
                            {doc.document_type?.replace(/_/g, " ")}
                          </Text>
                          {doc.expiration_date && (
                            <Text style={{ fontSize: 11, color: C.subText }}>
                              · expires {dayjs(doc.expiration_date).format("DD MMM YYYY")}
                            </Text>
                          )}
                        </div>
                      </div>
                      <Tag
                        color={doc.status === "active" ? "green" : "red"}
                        style={{ margin: 0, fontSize: 11, textTransform: "capitalize" }}
                      >
                        {doc.status}
                      </Tag>
                      {doc.file_url && (
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => window.open(doc.file_url, "_blank")}
                        />
                      )}
                      <Popconfirm
                        title="Delete this document?"
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDeleteDocument(doc._id)}
                      >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </div>
                  ))
                )}
              </div>
            </Tabs.TabPane>
          </Tabs>
        )}
      </Drawer>

      {/* Upload Document Modal */}
      <Modal
        title="Upload Document"
        open={isDocumentModalVisible}
        onCancel={() => {
          setIsDocumentModalVisible(false);
          documentForm.resetFields();
        }}
        width={isMobile ? "94%" : 520}
        footer={null}
      >
        <Form form={documentForm} layout="vertical" onFinish={handleUploadDocument}>
          <Form.Item label="Document Type" name="document_type" rules={[{ required: true }]}>
            <Select placeholder="Select document type">
              <Option value="employee_contract">Employee Contract</Option>
              <Option value="id_copy">ID Copy</Option>
              <Option value="passport_photo">Passport Photo</Option>
              <Option value="kra_pin">KRA PIN</Option>
              <Option value="bank_details">Bank Details</Option>
              <Option value="academic_certificates">Academic Certificates</Option>
              <Option value="professional_certificates">Professional Certificates</Option>
              <Option value="disciplinary_record">Disciplinary Record</Option>
              <Option value="performance_review">Performance Review</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Document Name" name="document_name" rules={[{ required: true }]}>
            <Input placeholder="Enter document name" />
          </Form.Item>
          <Form.Item label="File" name="file" rules={[{ required: true }]}>
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Form.Item>
          <Form.Item label="Description" name="description">
            <TextArea rows={3} placeholder="Enter description" />
          </Form.Item>
          <Form.Item label="Expiration Date" name="expiration_date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Access Level" name="access_level" initialValue="private">
            <Select>
              <Option value="private">Private</Option>
              <Option value="hr_only">HR Only</Option>
              <Option value="manager">Manager</Option>
              <Option value="public">Public</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={uploadDocumentMutation.isLoading}>
                Upload
              </Button>
              <Button onClick={() => setIsDocumentModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Allowance Modal */}
      <Modal
        title="Add Allowance"
        open={isAllowanceModalVisible}
        onCancel={() => {
          setIsAllowanceModalVisible(false);
          allowanceForm.resetFields();
        }}
        width={isMobile ? "94%" : 520}
        footer={null}
      >
        <Form form={allowanceForm} layout="vertical" onFinish={handleAddAllowance}>
          <Form.Item label="Allowance Type" name="allowance_type" rules={[{ required: true }]}>
            <Select
              placeholder="Select allowance type"
              onChange={(key: string) => {
                const t = benefitTypes.find((b) => b.key === key);
                allowanceForm.setFieldsValue({
                  name: t ? t.label : "",
                  amount: t?.amount ?? 0,
                  is_taxable: t ? t.taxable : true,
                });
              }}
            >
              {benefitTypes
                .filter((b) => b.enabled && b.kind === "allowance")
                .map((t) => (
                  <Option key={t.key} value={t.key}>{t.label}</Option>
                ))}
              <Option value="custom">Custom</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Allowance Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Housing Allowance" />
          </Form.Item>
          <Form.Item label="Amount" name="amount" rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} placeholder="0" />
          </Form.Item>
          <Form.Item label="Frequency" name="frequency" rules={[{ required: true }]}>
            <Select placeholder="Select frequency">
              <Option value="monthly">Monthly</Option>
              <Option value="weekly">Weekly</Option>
              <Option value="bi-weekly">Bi-weekly</Option>
              <Option value="daily">Daily</Option>
              <Option value="annual">Annual</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Taxable" name="is_taxable" valuePropName="checked">
            <Select placeholder="Select">
              <Option value={true}>Yes</Option>
              <Option value={false}>No</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={updateMutation.isLoading}>
                Add Allowance
              </Button>
              <Button onClick={() => {
                setIsAllowanceModalVisible(false);
                allowanceForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Benefit Modal */}
      <Modal
        title="Add Benefit"
        open={isBenefitModalVisible}
        onCancel={() => {
          setIsBenefitModalVisible(false);
          benefitForm.resetFields();
        }}
        width={isMobile ? "94%" : 520}
        footer={null}
      >
        <Form form={benefitForm} layout="vertical" onFinish={handleAddBenefit}>
          <Form.Item label="Benefit Type" name="benefit_type" rules={[{ required: true }]}>
            <Select
              placeholder="Select benefit type"
              onChange={(key: string) => {
                const t = benefitTypes.find((b) => b.key === key);
                benefitForm.setFieldsValue({
                  name: t ? t.label : "",
                  amount: t?.mode === "fixed" ? t.amount ?? 0 : undefined,
                  asset_value: undefined,
                  rent_amount: undefined,
                });
              }}
            >
              {benefitTypes
                .filter((b) => b.enabled && b.kind === "benefit")
                .map((t) => (
                  <Option key={t.key} value={t.key}>{t.label}</Option>
                ))}
              <Option value="custom">Custom</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Benefit Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Health Insurance" />
          </Form.Item>

          {watchedBenefit?.mode === "percent_of_value" && (
            <Form.Item
              label="Vehicle / Asset Value (KES)"
              name="asset_value"
              rules={[{ required: true }]}
              extra={`Benefit = ${watchedBenefit.percent}% of this value per month`}
            >
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                onChange={(v) =>
                  benefitForm.setFieldValue(
                    "amount",
                    computeBenefitAmount(watchedBenefit, { value: Number(v) || 0 })
                  )
                }
              />
            </Form.Item>
          )}
          {watchedBenefit?.mode === "higher_of_rent_or_percent" && (
            <Form.Item
              label="Actual Monthly Rent (KES)"
              name="rent_amount"
              rules={[{ required: true }]}
              extra={`Benefit = higher of ${watchedBenefit.percent}% of gross salary (KES ${Math.round(
                ((selectedEmployee?.basic_salary || 0) * (watchedBenefit.percent || 0)) / 100
              ).toLocaleString()}) or the rent paid`}
            >
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                onChange={(v) =>
                  benefitForm.setFieldValue(
                    "amount",
                    computeBenefitAmount(watchedBenefit, {
                      rent: Number(v) || 0,
                      gross: selectedEmployee?.basic_salary || 0,
                    })
                  )
                }
              />
            </Form.Item>
          )}

          <Form.Item
            label={isComputedBenefit ? "Benefit Amount (auto-computed)" : "Amount"}
            name="amount"
            rules={[{ required: true }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="0"
              min={0}
              disabled={isComputedBenefit}
            />
          </Form.Item>
          <Form.Item label="Frequency" name="frequency" rules={[{ required: true }]} initialValue="monthly">
            <Select placeholder="Select frequency">
              <Option value="monthly">Monthly</Option>
              <Option value="annual">Annual</Option>
              <Option value="one-time">One-time</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={updateMutation.isLoading}>
                Add Benefit
              </Button>
              <Button onClick={() => {
                setIsBenefitModalVisible(false);
                benefitForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Employees Modal */}
      <Modal
        title="Import Employees from Excel"
        open={isImportModalVisible}
        onCancel={closeImportModal}
        footer={null}
        width={isMobile ? "100%" : 860}
        style={{ top: isMobile ? 0 : 20 }}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <span>
              Upload an Excel file (.xlsx or .xls) with employee details.{" "}
              <Button type="link" size="small" onClick={() => downloadEmployeeTemplate()} style={{ padding: 0 }}>
                Download the template
              </Button>{" "}
              to see the expected format.
            </span>
          }
        />

        <Upload.Dragger
          accept=".xlsx,.xls,.csv"
          maxCount={1}
          beforeUpload={(file) => {
            setImportFile(file);
            handleAnalyseFile(file);
            return false;
          }}
          onRemove={() => {
            setImportFile(null);
            setImportResult(null);
            setAnalysis(null);
            setUpdateExisting(false);
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag an Excel file to this area to upload</p>
          <p className="ant-upload-hint">
            Required columns: id_number, hire_date, basic_salary. employee_number is
            auto-generated when blank; department and job_title are optional.
            Use the salary_type column (gross/net) for take-home salaries.
            Employees can be standalone or linked to a user via the user_email column.
          </p>
        </Upload.Dragger>

        {analysing && (
          <div style={{ marginTop: 16 }}>
            <Progress
              percent={analyseProgress === 100 ? 99 : (analyseProgress ?? 0)}
              status="active"
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {analyseProgress === 100
                ? "Processing file on server — analysing rows…"
                : `Uploading file… ${analyseProgress ?? 0}%`}
            </Typography.Text>
          </div>
        )}

        {importMutation.isLoading && (
          <div style={{ marginTop: 16 }}>
            <Progress
              percent={importProgress === 100 ? 99 : (importProgress ?? 0)}
              status="active"
              strokeColor={{ from: "#108ee9", to: "#87d068" }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {importProgress === 100
                ? "Importing employees — this may take a while for large files…"
                : `Uploading file… ${importProgress ?? 0}%`}
            </Typography.Text>
          </div>
        )}

        {analysis && !analysing && (
          <div style={{ marginTop: 16 }}>
            {analysis.advice?.map((item, idx) => (
              <Alert
                key={idx}
                style={{ marginBottom: 8 }}
                type={item.level === "info" ? "info" : item.level}
                showIcon
                icon={ADVICE_CONFIG[item.level]?.icon}
                message={<span style={{ color: ADVICE_CONFIG[item.level]?.color }}>{item.message}</span>}
              />
            ))}

            {analysis.canImport && analysis.previewRows.length > 0 && (
              <>
                <Text strong>
                  Preview ({analysis.previewRows.length} of {analysis.totalDataRows} rows)
                  {analysis.sheetUsed ? ` — sheet "${analysis.sheetUsed}"` : ""}
                </Text>
                <Table
                  size="small"
                  style={{ marginTop: 8 }}
                  columns={previewColumns}
                  dataSource={analysis.previewRows}
                  rowKey="rowNum"
                  pagination={false}
                  scroll={{ x: true }}
                />
              </>
            )}

            {analysis.existingRows?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Checkbox
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                >
                  Update {analysis.existingRows.length} existing employee(s) and attach
                  them to this branch
                </Checkbox>
                <List
                  size="small"
                  style={{ marginTop: 8, maxHeight: 140, overflowY: "auto" }}
                  header={<Text strong>Already exist</Text>}
                  bordered
                  dataSource={analysis.existingRows}
                  renderItem={(row) => (
                    <List.Item>
                      <Text>
                        Row {row.row} — {row.name} ({row.employee_number})
                      </Text>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {analysis.rowIssues?.length > 0 && (
              <List
                size="small"
                style={{ marginTop: 12, maxHeight: 200, overflowY: "auto" }}
                header={<Text strong>Row issues ({analysis.rowIssues.length})</Text>}
                bordered
                dataSource={analysis.rowIssues}
                renderItem={(err) => (
                  <List.Item>
                    <Text>
                      Row {err.row} — {err.name}: <Text type="danger">{err.reason}</Text>
                    </Text>
                  </List.Item>
                )}
              />
            )}
          </div>
        )}

        {importResult && (
          <div style={{ marginTop: 16 }}>
            <Alert
              type={importResult.summary.created > 0 ? "success" : "warning"}
              showIcon
              message={importResult.message}
              description={
                <span>
                  {importResult.summary.created} created · {importResult.summary.skipped} skipped
                  {importResult.summary.auto_created?.departments?.length
                    ? ` · Departments auto-created: ${importResult.summary.auto_created.departments.join(", ")}`
                    : ""}
                  {importResult.summary.unresolved_user_emails?.length
                    ? ` · No user account found for: ${importResult.summary.unresolved_user_emails.join(", ")} (imported unlinked)`
                    : ""}
                </span>
              }
            />
            {importResult.errors?.length > 0 && (
              <List
                size="small"
                style={{ marginTop: 12, maxHeight: 200, overflowY: "auto" }}
                header={<Text strong>Row errors</Text>}
                bordered
                dataSource={importResult.errors}
                renderItem={(err) => (
                  <List.Item>
                    <Text>
                      Row {err.row} — {err.name}: <Text type="danger">{err.reason}</Text>
                    </Text>
                  </List.Item>
                )}
              />
            )}
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={closeImportModal}>Close</Button>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            disabled={!importFile || !analysis?.canImport || analysing}
            loading={importMutation.isLoading}
            onClick={() => importFile && importMutation.mutate(importFile)}
          >
            Import{analysis
              ? ` (${Math.max(
                  analysis.totalDataRows -
                    (analysis.rowIssues?.length || 0) -
                    (updateExisting ? 0 : analysis.existingRows?.length || 0),
                  0
                )} rows)`
              : ""}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeManagement;
