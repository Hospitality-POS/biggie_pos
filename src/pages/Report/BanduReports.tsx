import React, { useState, useMemo } from "react";
import { Button, DatePicker, Form, Select, Typography, Spin, Empty, Table, Space } from "antd";
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
import { fetchAllUsersList } from "@services/users";
import { exportToExcel, exportToPDF } from "@utils/exportUtils";
import dayjs, { Dayjs } from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import quarterOfYear from "dayjs/plugin/quarterOfYear";

dayjs.extend(weekOfYear);
dayjs.extend(quarterOfYear);

const { RangePicker } = DatePicker;
const { Text } = Typography;
const { Option } = Select;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

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

// ── SectionLabel ──────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{
    display: "block", fontSize: 10, fontWeight: 700, color: C.subText,
    textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10,
  }}>
    {children}
  </span>
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

// ── Summary card (matching ItemSalesModal pattern) ──────────────────────────────
const SummaryCard: React.FC<{ label: string; value: string; color: string; bg: string; icon: React.ReactNode }> = ({ label, value, color, bg, icon }) => (
  <div style={{ flex: "1 1 130px", background: bg, border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "10px 14px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span style={{ color, fontSize: 12 }}>{icon}</span>
      <Text style={{ fontSize: 10, color: C.subText, textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 700 }}>{label}</Text>
    </div>
    <Text strong style={{ fontSize: 14, color }}>{value}</Text>
  </div>
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

  // ── Fetch agents/users for dropdown ───────────────────────────────────────
  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchAllUsersList(),
  });

  const agents = useMemo(() => {
    if (!usersData?.data) return [];
    return usersData.data.map((user: any) => ({
      value: user._id,
      label: user.fullname || user.email,
    }));
  }, [usersData]);

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

  // ── Per-tab content ───────────────────────────────────────────────────────
  const renderTabContent = () => {
    // Block rendering if user lacks permission
    if (!activeTabCfg?.allowed) {
      return <LockedTab label={activeTabCfg?.label ?? activeTab} />;
    }

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
                { title: "Gross Pay", dataIndex: "gross_pay", key: "gross_pay" },
                { title: "PAYE", dataIndex: "paye", key: "paye" },
                { title: "NSSF", dataIndex: "nssf", key: "nssf" },
                { title: "NHIF", dataIndex: "nhif", key: "nhif" },
                { title: "Housing Levy", dataIndex: "housing_levy", key: "housing_levy" },
                { title: "Net Pay", dataIndex: "net_pay", key: "net_pay" },
                { title: "Payment Method", dataIndex: "payment_method", key: "payment_method" },
              ]}
              loading={false}
              onExportExcel={() => handleExportExcel(data.payroll || [], "payroll-register")}
              onExportPDF={() =>
                handleExportPDF(
                  data.payroll || [],
                  "Payroll Register",
                  [
                    { title: "Employee", dataIndex: "employee" },
                    { title: "Gross Pay", dataIndex: "gross_pay" },
                    { title: "PAYE", dataIndex: "paye" },
                    { title: "NSSF", dataIndex: "nssf" },
                    { title: "NHIF", dataIndex: "nhif" },
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
                { title: "Annual Leave", dataIndex: "annual_leave", key: "annual_leave" },
                { title: "Sick Leave", dataIndex: "sick_leave", key: "sick_leave" },
                { title: "Maternity Leave", dataIndex: "maternity_leave", key: "maternity_leave" },
                { title: "Paternity Leave", dataIndex: "paternity_leave", key: "paternity_leave" },
                { title: "Compassionate Leave", dataIndex: "compassionate_leave", key: "compassionate_leave" },
              ]}
              loading={false}
              onExportExcel={() => handleExportExcel(data.balances || [], "leave-balance")}
              onExportPDF={() =>
                handleExportPDF(
                  data.balances || [],
                  "Leave Balance Report",
                  [
                    { title: "Employee", dataIndex: "employee" },
                    { title: "Annual Leave", dataIndex: "annual_leave" },
                    { title: "Sick Leave", dataIndex: "sick_leave" },
                    { title: "Maternity Leave", dataIndex: "maternity_leave" },
                    { title: "Paternity Leave", dataIndex: "paternity_leave" },
                    { title: "Compassionate Leave", dataIndex: "compassionate_leave" },
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
                { title: "Leave Type", dataIndex: "leave_type", key: "leave_type" },
                { title: "Start Date", dataIndex: "start_date", key: "start_date" },
                { title: "End Date", dataIndex: "end_date", key: "end_date" },
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

    switch (activeTab) {
      case "employee":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            setLoading(true);
            try {
              const data = await fetchEmployeeMasterList({
                department_id: values.departmentId,
                employment_status: values.employmentStatus,
                employment_type: values.employmentType,
              });
              setReportData({ reportType: "employee-master", data });
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
                  name="departmentId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><HomeOutlined /> Department</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All departments" style={{ width: "100%", borderRadius: 8 }} />
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
                  <Select showSearch allowClear placeholder="All departments" style={{ width: "100%", borderRadius: 8 }} />
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
                    <Option value="pending">Pending</Option>
                    <Option value="partial">Partial</Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Payroll Register" icon={<PrinterOutlined />} disabled={loading} loading={loading} />
          </Form>
        );

      case "leave":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            setLoading(true);
            try {
              const data = await fetchLeaveHistoryReport({
                department_id: values.departmentId,
                employee_id: values.employeeId,
                startDate: values.dateRange?.[0]?.toISOString(),
                endDate: values.dateRange?.[1]?.toISOString(),
                status: values.status,
              });
              setReportData({ reportType: "leave-history", data });
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
                  <Select showSearch allowClear placeholder="All departments" style={{ width: "100%", borderRadius: 8 }} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="employeeId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Employee</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All employees" style={{ width: "100%", borderRadius: 8 }} options={agents} />
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
          <Form form={form} layout="vertical" onFinish={async (values) => {
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

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div style={{ padding: "0 18px 18px" }}>
        {showReport && (
          <Button
            onClick={() => { setShowReport(false); setReportData(null); }}
            style={{ marginBottom: 16 }}
          >
            ← Back to filters
          </Button>
        )}
        {renderTabContent()}
      </div>
    </div>
  );
};

export default BanduReports;
