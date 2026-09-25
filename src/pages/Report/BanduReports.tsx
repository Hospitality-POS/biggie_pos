import React, { useState, useMemo } from "react";
import { Button, DatePicker, Form, Select, Typography, Empty, Table, Space, Modal } from "antd";
import {
  TeamOutlined,
  DollarOutlined,
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  PrinterOutlined,
  HomeOutlined,
  TagOutlined,
  LockOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { getPermissionChecker } from "@utils/getPermissionChecker";
import {
  fetchEmployeeMasterList,
  fetchPayrollRegister,
  fetchLeaveBalanceReport,
  fetchLeaveHistoryReport,
  fetchDepartmentStaffingReport,
  fetchContactDirectory,
} from "@services/bandu/reports";
import { fetchAllDepartments } from "@services/crm/departments";
import { fetchEmployees } from "@services/bandu";
import { exportToExcel, exportToPDF } from "@utils/exportUtils";
import dayjs, { Dayjs } from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import { THEME_C } from "@utils/getPrimaryColor";

dayjs.extend(weekOfYear);
dayjs.extend(quarterOfYear);

const { RangePicker } = DatePicker;
const { Text } = Typography;
const { Option } = Select;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = THEME_C;

// ── Tab config ───────────────────────────────────────────────────────────────────
const TAB_CFG = [
  {
    key: "employee",
    icon: <TeamOutlined />,
    iconColor: C.green,
    label: "Employees",
    permissionKey: "HR_EMPLOYEES_VIEW",
  },
  {
    key: "payroll",
    icon: <DollarOutlined />,
    iconColor: C.blue,
    label: "Payroll",
    permissionKey: "HR_PAYROLL_VIEW",
  },
  {
    key: "leave",
    icon: <CalendarOutlined />,
    iconColor: C.purple,
    label: "Leave",
    permissionKey: "HR_LEAVE_VIEW",
  },
  {
    key: "department",
    icon: <HomeOutlined />,
    iconColor: C.orange,
    label: "Departments",
    permissionKey: "HR_DEPARTMENTS_VIEW",
  },
];

// ── Locked placeholder ────────────────────────────────────────────────────────
const LockedTab: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "60px 24px", gap: 12,
    color: "#94a3b8", textAlign: "center",
  }}>
    <LockOutlined style={{ fontSize: 32, color: "#cbd5e1" }} />
    <Text style={{ fontSize: 14, color: "#94a3b8" }}>
      You don't have permission to generate the <strong>{label}</strong> report.
    </Text>
    <Text style={{ fontSize: 12, color: "#cbd5e1" }}>
      Contact your administrator to request access.
    </Text>
  </div>
);

// ── Custom tab nav ────────────────────────────────────────────────────────────
const TabNav: React.FC<{
  tabs: (typeof TAB_CFG[number] & { allowed: boolean })[];
  active: string;
  onChange: (k: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div style={{
    display: "flex", gap: 6, flexWrap: "wrap",
    paddingBottom: 16, borderBottom: `1px solid ${C.border}`, marginBottom: 20,
  }}>
    {tabs.map((t) => {
      const on = t.key === active;
      return (
        <button
          key={t.key}
          onClick={() => t.allowed && onChange(t.key)}
          title={!t.allowed ? "You don't have permission to access this report" : undefined}
          style={{
            background: on ? C.primary : C.bg,
            color: on ? "#fff" : t.allowed ? C.subText : "#cbd5e1",
            border: `1px solid ${on ? C.primary : C.border}`,
            borderRadius: 8, padding: "7px 13px", fontSize: 12,
            fontWeight: on ? 700 : 500,
            cursor: t.allowed ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.15s", whiteSpace: "nowrap",
            opacity: t.allowed ? 1 : 0.5,
          }}
        >
          <span style={{ color: on ? "#fff" : t.allowed ? t.iconColor : "#cbd5e1", fontSize: 13 }}>
            {t.allowed ? t.icon : <LockOutlined />}
          </span>
          {t.label}
        </button>
      );
    })}
  </div>
);

// ── Shared field components ───────────────────────────────────────────────────
const DateRangeField: React.FC<{
  onChange?: (dates: any) => void;
  presets?: { label: string; value: [Dayjs, Dayjs] }[];
}> = ({ onChange, presets }) => (
  <Form.Item
    name="dateRange"
    label={
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}>
        <CalendarOutlined /> Date & Time Range
      </span>
    }
    rules={[{ required: true, message: "Please select a date & time range" }]}
    style={{ marginBottom: 14 }}
  >
    <RangePicker
      showTime={{ format: "HH:mm" }}
      format="YYYY-MM-DD HH:mm"
      onChange={onChange}
      presets={presets}
      style={{ width: "100%", borderRadius: 8 }}
    />
  </Form.Item>
);

const GenerateButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
  loading?: boolean;
  onClick?: () => void;
}> = ({ label, icon, disabled, loading, onClick }) => (
  <Form.Item style={{ marginBottom: 0 }}>
    <Button
      type="primary" htmlType="submit"
      icon={icon} disabled={disabled} loading={loading}
      onClick={onClick}
      style={{
        background: C.primary, borderColor: C.primary,
        borderRadius: 8, height: 40, fontWeight: 600,
        fontSize: 13, width: "100%",
      }}
    >
      {label}
    </Button>
  </Form.Item>
);

// ── Report Table Component ────────────────────────────────────────────────────
const ReportTable: React.FC<{
  data: any[];
  columns: any[];
  loading: boolean;
  onExportExcel: () => void;
  onExportPDF: () => void;
  title: string;
}> = ({ data, columns, loading, onExportExcel, onExportPDF, title }) => (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <Text strong style={{ fontSize: 15 }}>{title}</Text>
      <Space>
        <Button
          icon={<FileExcelOutlined />}
          onClick={onExportExcel}
          style={{ borderRadius: 8, borderColor: C.border, color: C.subText }}
        >
          Export Excel
        </Button>
        <Button
          icon={<FilePdfOutlined />}
          onClick={onExportPDF}
          style={{ borderRadius: 8, borderColor: C.border, color: C.subText }}
        >
          Export PDF
        </Button>
      </Space>
    </div>
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: "#fff", overflow: "hidden" }}>
      <Table
        columns={columns}
        dataSource={data || []}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
        size="small"
        scroll={{ x: 1000 }}
        style={{ fontSize: 13 }}
      />
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const BanduReports: React.FC = () => {
  const can = useMemo(() => getPermissionChecker(), []);

  // Attach allowed flag to every tab
  const tabsWithAccess = useMemo(
    () => TAB_CFG.map((t) => ({ ...t, allowed: can(t.permissionKey) })),
    [can]
  );

  // Default to first tab the user can actually access
  const defaultTab = useMemo(
    () => tabsWithAccess.find((t) => t.allowed)?.key ?? TAB_CFG[0].key,
    [tabsWithAccess]
  );

  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setShowReport(false);
    setReportData(null);
    form.resetFields();
  };

  const handleExportExcel = (data: any[], reportName: string) => {
    exportToExcel(data, `${reportName}-${dayjs().format("YYYY-MM-DD")}`, setLoading);
  };

  const handleExportPDF = (data: any[], reportName: string, columns: any[]) => {
    exportToPDF(
      data,
      `${reportName}-${dayjs().format("YYYY-MM-DD")}`,
      setLoading,
      {
        title: reportName,
        subtitle: `Generated on ${dayjs().format("DD MMM YYYY, HH:mm")}`,
        columns: columns.map((col) => ({ header: col.title, dataKey: col.dataIndex })),
      }
    );
  };

  // ── Departments for dropdowns ─────────────────────────────────────────────
  const { data: departmentsData } = useQuery({
    queryKey: ["departments-list"],
    queryFn: () => fetchAllDepartments({}),
  });

  const departmentOptions = useMemo(
    () =>
      (departmentsData?.departments || []).map((d: any) => ({
        value: d._id,
        label: d.name,
      })),
    [departmentsData]
  );

  // ── Bandu employees for the employee dropdown ─────────────────────────────
  const { data: employeesData } = useQuery({
    queryKey: ["bandu-employees-report"],
    queryFn: () => fetchEmployees({ limit: 500 }),
  });

  const employees = useMemo(() => {
    const list = Array.isArray(employeesData)
      ? employeesData
      : employeesData?.employees || employeesData?.data || [];
    return list.map((e: any) => ({
      value: e._id,
      label: e.fullname || e.user_id?.fullname || e.employee_number,
    }));
  }, [employeesData]);

  // ── Date range presets ───────────────────────────────────────────────────
  const rangePresets: {
    label: string;
    value: [Dayjs, Dayjs];
  }[] = [
    { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
    { label: "This Week", value: [dayjs().startOf("week"), dayjs().endOf("week")] },
    { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
    { label: "This Quarter", value: [dayjs().startOf("quarter"), dayjs().endOf("quarter")] },
    { label: "This Year", value: [dayjs().startOf("year"), dayjs().endOf("year")] },
    { label: "Last Year", value: [dayjs().subtract(1, "year").startOf("year"), dayjs().subtract(1, "year").endOf("year")] },
  ];

  // ── Active tab config (with allowed flag) ─────────────────────────────────
  const activeTabCfg = tabsWithAccess.find((t) => t.key === activeTab);

  // ── Report output (rendered inside a modal, like Duka reports) ────────────
  const renderReport = () => {
    if (showReport && reportData) {
      const { reportType, data } = reportData;

      switch (reportType) {
        case "employee-master":
          return (
            <ReportTable
              data={data.employees || []}
              columns={[
                { title: "Employee ID", dataIndex: "employee_id", key: "employee_id" },
                { title: "Full Name", dataIndex: "fullname", key: "fullname" },
                { title: "Email", dataIndex: "email", key: "email" },
                { title: "Phone", dataIndex: "phone", key: "phone" },
                { title: "Department", dataIndex: "department", key: "department" },
                { title: "Position", dataIndex: "position", key: "position" },
                { title: "Employment Type", dataIndex: "employment_type", key: "employment_type" },
                { title: "Status", dataIndex: "status", key: "status" },
                { title: "Hired", dataIndex: "hire_date", key: "hire_date", render: (d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—" },
              ]}
              loading={false}
              onExportExcel={() => handleExportExcel(data.employees || [], "employee-master-list")}
              onExportPDF={() =>
                handleExportPDF(
                  data.employees || [],
                  "Employee Master List",
                  [
                    { title: "Employee ID", dataIndex: "employee_id" },
                    { title: "Full Name", dataIndex: "fullname" },
                    { title: "Email", dataIndex: "email" },
                    { title: "Phone", dataIndex: "phone" },
                    { title: "Department", dataIndex: "department" },
                    { title: "Position", dataIndex: "position" },
                    { title: "Employment Type", dataIndex: "employment_type" },
                    { title: "Status", dataIndex: "status" },
                  ]
                )
              }
              title="Employee Master List"
            />
          );

        case "payroll-register":
          return (
            <ReportTable
              data={data.payroll || []}
              columns={[
                { title: "Employee", dataIndex: "employee", key: "employee" },
                { title: "Period", dataIndex: "period", key: "period" },
                { title: "Department", dataIndex: "department", key: "department" },
                { title: "Gross Pay", dataIndex: "gross_pay", key: "gross_pay", render: (v: number) => (v ?? 0).toLocaleString() },
                { title: "PAYE", dataIndex: "paye", key: "paye", render: (v: number) => (v ?? 0).toLocaleString() },
                { title: "NSSF", dataIndex: "nssf", key: "nssf", render: (v: number) => (v ?? 0).toLocaleString() },
                { title: "SHA", dataIndex: "nhif", key: "nhif", render: (v: number) => (v ?? 0).toLocaleString() },
                { title: "Housing Levy", dataIndex: "housing_levy", key: "housing_levy", render: (v: number) => (v ?? 0).toLocaleString() },
                { title: "Net Pay", dataIndex: "net_pay", key: "net_pay", render: (v: number) => (v ?? 0).toLocaleString() },
                { title: "Payment Method", dataIndex: "payment_method", key: "payment_method" },
                { title: "Status", dataIndex: "status", key: "status" },
              ]}
              loading={false}
              onExportExcel={() => handleExportExcel(data.payroll || [], "payroll-register")}
              onExportPDF={() =>
                handleExportPDF(
                  data.payroll || [],
                  "Payroll Register",
                  [
                    { title: "Employee", dataIndex: "employee" },
                    { title: "Period", dataIndex: "period" },
                    { title: "Gross Pay", dataIndex: "gross_pay" },
                    { title: "PAYE", dataIndex: "paye" },
                    { title: "NSSF", dataIndex: "nssf" },
                    { title: "SHA", dataIndex: "nhif" },
                    { title: "Housing Levy", dataIndex: "housing_levy" },
                    { title: "Net Pay", dataIndex: "net_pay" },
                    { title: "Payment Method", dataIndex: "payment_method" },
                  ]
                )
              }
              title="Payroll Register"
            />
          );

        case "leave-balance":
          return (
            <ReportTable
              data={data.balances || []}
              columns={[
                { title: "Employee", dataIndex: "employee", key: "employee" },
                { title: "Department", dataIndex: "department", key: "department" },
                { title: "Annual", dataIndex: "annual_leave", key: "annual_leave", render: (v: string) => v ?? "—" },
                { title: "Sick", dataIndex: "sick_leave", key: "sick_leave", render: (v: string) => v ?? "—" },
                { title: "Maternity", dataIndex: "maternity_leave", key: "maternity_leave", render: (v: string) => v ?? "—" },
                { title: "Paternity", dataIndex: "paternity_leave", key: "paternity_leave", render: (v: string) => v ?? "—" },
                { title: "Emergency", dataIndex: "emergency_leave", key: "emergency_leave", render: (v: string) => v ?? "—" },
                { title: "Unpaid", dataIndex: "unpaid_leave", key: "unpaid_leave", render: (v: string) => v ?? "—" },
              ]}
              loading={false}
              onExportExcel={() => handleExportExcel(data.balances || [], "leave-balance")}
              onExportPDF={() =>
                handleExportPDF(
                  data.balances || [],
                  "Leave Balance Report",
                  [
                    { title: "Employee", dataIndex: "employee" },
                    { title: "Department", dataIndex: "department" },
                    { title: "Annual", dataIndex: "annual_leave" },
                    { title: "Sick", dataIndex: "sick_leave" },
                    { title: "Maternity", dataIndex: "maternity_leave" },
                    { title: "Paternity", dataIndex: "paternity_leave" },
                    { title: "Emergency", dataIndex: "emergency_leave" },
                    { title: "Unpaid", dataIndex: "unpaid_leave" },
                  ]
                )
              }
              title="Leave Balance Report"
            />
          );

        case "leave-history":
          return (
            <ReportTable
              data={data.leaves || []}
              columns={[
                { title: "Employee", dataIndex: "employee", key: "employee" },
                { title: "Department", dataIndex: "department", key: "department" },
                { title: "Leave Type", dataIndex: "leave_type", key: "leave_type" },
                { title: "Start Date", dataIndex: "start_date", key: "start_date", render: (d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—" },
                { title: "End Date", dataIndex: "end_date", key: "end_date", render: (d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—" },
                { title: "Days", dataIndex: "days", key: "days" },
                { title: "Status", dataIndex: "status", key: "status" },
                { title: "Approved By", dataIndex: "approved_by", key: "approved_by" },
              ]}
              loading={false}
              onExportExcel={() => handleExportExcel(data.leaves || [], "leave-history")}
              onExportPDF={() =>
                handleExportPDF(
                  data.leaves || [],
                  "Leave History Report",
                  [
                    { title: "Employee", dataIndex: "employee" },
                    { title: "Leave Type", dataIndex: "leave_type" },
                    { title: "Start Date", dataIndex: "start_date" },
                    { title: "End Date", dataIndex: "end_date" },
                    { title: "Days", dataIndex: "days" },
                    { title: "Status", dataIndex: "status" },
                    { title: "Approved By", dataIndex: "approved_by" },
                  ]
                )
              }
              title="Leave History Report"
            />
          );

        case "department-staffing":
          return (
            <ReportTable
              data={data.departments || []}
              columns={[
                { title: "Department", dataIndex: "name", key: "name" },
                { title: "Total Staff", dataIndex: "total_staff", key: "total_staff" },
                { title: "Active", dataIndex: "active", key: "active" },
                { title: "Inactive", dataIndex: "inactive", key: "inactive" },
                { title: "Total Salary", dataIndex: "total_salary", key: "total_salary" },
              ]}
              loading={false}
              onExportExcel={() => handleExportExcel(data.departments || [], "department-staffing")}
              onExportPDF={() =>
                handleExportPDF(
                  data.departments || [],
                  "Department Staffing Report",
                  [
                    { title: "Department", dataIndex: "name" },
                    { title: "Total Staff", dataIndex: "total_staff" },
                    { title: "Active", dataIndex: "active" },
                    { title: "Inactive", dataIndex: "inactive" },
                    { title: "Total Salary", dataIndex: "total_salary" },
                  ]
                )
              }
              title="Department Staffing Report"
            />
          );

        case "contact-directory":
          return (
            <ReportTable
              data={data.contacts || []}
              columns={[
                { title: "Employee", dataIndex: "fullname", key: "fullname" },
                { title: "Email", dataIndex: "email", key: "email" },
                { title: "Phone", dataIndex: "phone", key: "phone" },
                { title: "Department", dataIndex: "department", key: "department" },
                { title: "Emergency Contact", dataIndex: "emergency_contact", key: "emergency_contact" },
                { title: "Emergency Phone", dataIndex: "emergency_phone", key: "emergency_phone" },
              ]}
              loading={false}
              onExportExcel={() => handleExportExcel(data.contacts || [], "contact-directory")}
              onExportPDF={() =>
                handleExportPDF(
                  data.contacts || [],
                  "Employee Contact Directory",
                  [
                    { title: "Employee", dataIndex: "fullname" },
                    { title: "Email", dataIndex: "email" },
                    { title: "Phone", dataIndex: "phone" },
                    { title: "Department", dataIndex: "department" },
                    { title: "Emergency Contact", dataIndex: "emergency_contact" },
                    { title: "Emergency Phone", dataIndex: "emergency_phone" },
                  ]
                )
              }
              title="Employee Contact Directory"
            />
          );

        default:
          return <Empty description="No report data available" />;
      }
    }
    return null;
  };

  // ── Per-tab filter forms ────────────────────────────────────────────────────
  const renderTabContent = () => {
    // Block rendering if user lacks permission
    if (!activeTabCfg?.allowed) {
      return <LockedTab label={activeTabCfg?.label ?? activeTab} />;
    }

    switch (activeTab) {
      case "employee":
        return (
          <Form form={form} layout="vertical" initialValues={{ reportType: "master" }} onFinish={async (values) => {
            setLoading(true);
            try {
              const data = values.reportType === "directory"
                ? await fetchContactDirectory({ department_id: values.departmentId })
                : await fetchEmployeeMasterList({
                    department_id: values.departmentId,
                    employment_status: values.employmentStatus,
                    employment_type: values.employmentType,
                  });
              setReportData({ reportType: values.reportType === "directory" ? "contact-directory" : "employee-master", data });
              setShowReport(true);
            } catch (error) {
              console.error("Error fetching report:", error);
            } finally {
              setLoading(false);
            }
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="reportType"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><FileTextOutlined /> Report</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select style={{ width: "100%", borderRadius: 8 }} options={[
                    { value: "master", label: "Employee Master List" },
                    { value: "directory", label: "Contact Directory" },
                  ]} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="departmentId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><HomeOutlined /> Department</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder="All departments"
                    style={{ width: "100%", borderRadius: 8 }}
                    options={departmentOptions}
                    optionFilterProp="label"
                  />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="employmentStatus"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><TagOutlined /> Employment Status</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All statuses" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="active">Active</Option>
                    <Option value="inactive">Inactive</Option>
                    <Option value="on-leave">On Leave</Option>
                  </Select>
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="employmentType"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Employment Type</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All types" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="full-time">Full-time</Option>
                    <Option value="part-time">Part-time</Option>
                    <Option value="contract">Contract</Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Employee Master List" icon={<PrinterOutlined />} disabled={loading} loading={loading} />
          </Form>
        );

      case "payroll":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            setLoading(true);
            try {
              const data = await fetchPayrollRegister({
                department_id: values.departmentId,
                startDate: values.dateRange?.[0]?.toISOString(),
                endDate: values.dateRange?.[1]?.toISOString(),
                status: values.status,
              });
              setReportData({ reportType: "payroll-register", data });
              setShowReport(true);
            } catch (error) {
              console.error("Error fetching report:", error);
            } finally {
              setLoading(false);
            }
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField presets={rangePresets} />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="departmentId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><HomeOutlined /> Department</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder="All departments"
                    style={{ width: "100%", borderRadius: 8 }}
                    options={departmentOptions}
                    optionFilterProp="label"
                  />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="status"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><TagOutlined /> Status</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All statuses" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="paid">Paid</Option>
                    <Option value="processed">Processed</Option>
                    <Option value="approved">Approved</Option>
                    <Option value="pending_approval">Pending Approval</Option>
                    <Option value="draft">Draft</Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Payroll Register" icon={<PrinterOutlined />} disabled={loading} loading={loading} />
          </Form>
        );

      case "leave":
        return (
          <Form form={form} layout="vertical" initialValues={{ reportType: "history" }} onFinish={async (values) => {
            setLoading(true);
            try {
              if (values.reportType === "balance") {
                const data = await fetchLeaveBalanceReport({
                  department_id: values.departmentId,
                  year: values.year || dayjs().year(),
                });
                setReportData({ reportType: "leave-balance", data });
              } else {
                const data = await fetchLeaveHistoryReport({
                  department_id: values.departmentId,
                  employee_id: values.employeeId,
                  startDate: values.dateRange?.[0]?.toISOString(),
                  endDate: values.dateRange?.[1]?.toISOString(),
                  status: values.status,
                });
                setReportData({ reportType: "leave-history", data });
              }
              setShowReport(true);
            } catch (error) {
              console.error("Error fetching report:", error);
            } finally {
              setLoading(false);
            }
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="reportType"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><FileTextOutlined /> Report</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select style={{ width: "100%", borderRadius: 8 }} options={[
                    { value: "history", label: "Leave History" },
                    { value: "balance", label: "Leave Balance" },
                  ]} />
                </Form.Item>
              </div>
              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) =>
                  getFieldValue("reportType") === "balance" ? (
                    <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                      <Form.Item
                        name="year"
                        label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><CalendarOutlined /> Year</span>}
                        style={{ marginBottom: 14 }}
                        initialValue={dayjs().year()}
                      >
                        <Select style={{ width: "100%", borderRadius: 8 }} options={[0, 1, 2, 3].map((o) => {
                          const y = dayjs().year() - o;
                          return { value: y, label: `${y}` };
                        })} />
                      </Form.Item>
                    </div>
                  ) : (
                    <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                      <DateRangeField presets={rangePresets} />
                    </div>
                  )
                }
              </Form.Item>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="departmentId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><HomeOutlined /> Department</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder="All departments"
                    style={{ width: "100%", borderRadius: 8 }}
                    options={departmentOptions}
                    optionFilterProp="label"
                  />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="employeeId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Employee</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder="All employees"
                    style={{ width: "100%", borderRadius: 8 }}
                    options={employees}
                    optionFilterProp="label"
                  />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="status"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><TagOutlined /> Status</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All statuses" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="Approved">Approved</Option>
                    <Option value="Pending">Pending</Option>
                    <Option value="Rejected">Rejected</Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Leave History Report" icon={<PrinterOutlined />} disabled={loading} loading={loading} />
          </Form>
        );

      case "department":
        return (
          <Form form={form} layout="vertical" onFinish={async () => {
            setLoading(true);
            try {
              const data = await fetchDepartmentStaffingReport();
              setReportData({ reportType: "department-staffing", data });
              setShowReport(true);
            } catch (error) {
              console.error("Error fetching report:", error);
            } finally {
              setLoading(false);
            }
          }}>
            <div style={{ padding: "20px 0" }}>
              <Text style={{ color: C.subText, fontSize: 13 }}>
                This report shows department-wise employee distribution and salary analysis. Click generate to view the data.
              </Text>
            </div>
            <GenerateButton label="Generate Department Staffing Report" icon={<PrinterOutlined />} disabled={loading} loading={loading} />
          </Form>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
        background: C.bg,
      }}>
        <div style={{
          background: C.primaryLight, borderRadius: 8,
          padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1,
        }}>
          <TeamOutlined />
        </div>
        <div>
          <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>Bandu HR Reports</Text>
          {activeTabCfg && (
            <Text style={{ fontSize: 11, color: C.subText }}>
              {activeTabCfg.label}
            </Text>
          )}
        </div>
      </div>

      {/* ── Tab nav ─────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 18px 0" }}>
        <TabNav tabs={tabsWithAccess} active={activeTab} onChange={handleTabChange} />
      </div>

      {/* ── Tab content (filter forms stay visible; results open in a modal) ── */}
      <div style={{ padding: "0 18px 18px" }}>
        {renderTabContent()}
      </div>

      {/* ── Report output modal (same pattern as Duka reports) ── */}
      <Modal
        open={showReport}
        onCancel={() => setShowReport(false)}
        footer={null}
        width={1100}
        style={{ top: 24 }}
        destroyOnClose
      >
        {renderReport()}
      </Modal>
    </div>
  );
};

export default BanduReports;
