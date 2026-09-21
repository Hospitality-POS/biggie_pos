import React, { useState, useCallback } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
  Row,
  Col,
  Typography,
  Space,
  Tag,
  Table,
  Spin,
  Alert,
  Button,
  App,
  Radio,
  DatePicker,
  Segmented,
  Badge,
  message,
} from "antd";
import {
  TeamOutlined,
  CalendarOutlined,
  DollarOutlined,
  SyncOutlined,
  DashboardOutlined,
  RiseOutlined,
  FallOutlined,
  UserOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  GiftOutlined,
  FileProtectOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchHRDashboard, type HRDashboardData } from "@services/bandu/dashboard";
import { clockIn, clockOut, fetchClockStatus } from "@services/hr/leave";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { fmtK } from "@utils/formatters";
import dayjs from "dayjs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const PERIOD_LABELS: Record<string, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  custom: "Custom Period",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getShopId = (): string => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.shop_id || user?.shopId || user?.shop || user?.branchId || user?.branch_id || "";
  } catch {
    return "";
  }
};

const fmt = (v: number) =>
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LEAVE_COLORS: Record<string, string> = {
  annual: "#10b981",
  sick: "#f59e0b",
  maternity: "#8b5cf6",
  paternity: "#3b82f6",
  compassionate: "#ef4444",
  unpaid: "#64748b",
};

const DEPARTMENT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

const GENDER_COLORS: Record<string, string> = {
  male: "#3b82f6",
  female: "#ec4899",
  other: "#8b5cf6",
  prefer_not_to_say: "#64748b",
  not_specified: "#94a3b8",
};

// ── KPI Card Component (Unified Duka & Mteja Style) ──────────────────────────

interface KPICardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  subtext?: React.ReactNode;
  onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  color,
  bg,
  border,
  subtext,
  onClick,
}) => (
  <div
    onClick={onClick}
    style={{
      background: bg,
      borderRadius: 12,
      padding: "16px 18px",
      border: `1px solid ${border}`,
      cursor: onClick ? "pointer" : "default",
      transition: "transform .15s ease, box-shadow .15s ease",
      height: "100%",
    }}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)";
      }
    }}
    onMouseLeave={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }
    }}
  >
    <Space direction="vertical" size={3} style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{title}</Text>
        <div
          style={{
            background: "#ffffff",
            borderRadius: 8,
            padding: "4px 6px",
            color,
            fontSize: 14,
            lineHeight: 1,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#0f172a",
          letterSpacing: -0.3,
          lineHeight: 1.2,
          marginTop: 2,
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 2 }}>{subtext}</div>
    </Space>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const BanduHRDashboard: React.FC = () => {
  const shopId = getShopId();
  const primaryColor = usePrimaryColor();
  const isAdmin = !shopId;

  const [periodFilter, setPeriodFilter] = useState("month");
  const [customDateRange, setCustomDateRange] = useState<any[]>([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [demographicsTab, setDemographicsTab] = useState<string>("dept");

  const getDateRange = useCallback(() => {
    const today = dayjs();
    switch (periodFilter) {
      case "day":
        return { startDate: today.startOf("day"), endDate: today.endOf("day") };
      case "week":
        return { startDate: today.startOf("week"), endDate: today.endOf("week") };
      case "month":
        return { startDate: today.startOf("month"), endDate: today.endOf("month") };
      case "year":
        return { startDate: today.startOf("year"), endDate: today.endOf("year") };
      case "custom":
        if (customDateRange?.length === 2) {
          return {
            startDate: customDateRange[0].startOf("day"),
            endDate: customDateRange[1].endOf("day"),
          };
        }
        return { startDate: today.startOf("month"), endDate: today.endOf("month") };
      default:
        return { startDate: today.startOf("month"), endDate: today.endOf("month") };
    }
  }, [periodFilter, customDateRange]);

  const { startDate, endDate } = getDateRange();

  const getFormattedDateRange = useCallback(() => {
    const formatStr = "MMM D, YYYY";
    switch (periodFilter) {
      case "day":
        return startDate.format("MMM D, YYYY");
      case "week":
        return `${startDate.format(formatStr)} – ${endDate.format(formatStr)}`;
      case "month":
        return startDate.format("MMMM YYYY");
      case "year":
        return startDate.format("YYYY");
      case "custom":
        if (customDateRange?.length === 2) {
          return `${customDateRange[0].format(formatStr)} – ${customDateRange[1].format(formatStr)}`;
        }
        return "Custom Range";
      default:
        return startDate.format("MMMM YYYY");
    }
  }, [periodFilter, startDate, endDate, customDateRange]);

  const handlePeriodChange = useCallback((value: string) => {
    setPeriodFilter(value);
    setShowCustomDatePicker(value === "custom");
  }, []);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["bandu-hr-dashboard", shopId, startDate.format(), endDate.format()],
    queryFn: async () => {
      const result = await fetchHRDashboard({
        shop_id: shopId || undefined,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      return result;
    },
    enabled: true,
    retry: 2,
  });

  const queryClient = useQueryClient();

  // Fetch clock status
  const { data: clockStatus } = useQuery({
    queryKey: ["clock-status"],
    queryFn: fetchClockStatus,
    refetchInterval: 60000,
  });

  const handleClockIn = async () => {
    try {
      await clockIn();
      message.success("Clocked in successfully");
      queryClient.invalidateQueries({ queryKey: ["clock-status"] });
    } catch {
      // Error handled by service
    }
  };

  const handleClockOut = async () => {
    try {
      await clockOut();
      message.success("Clocked out successfully");
      queryClient.invalidateQueries({ queryKey: ["clock-status"] });
    } catch {
      // Error handled by service
    }
  };

  const dashboardData: HRDashboardData = data || ({} as HRDashboardData);

  const employeeStats = dashboardData.employee_stats || {
    total_employees: 0,
    active_employees: 0,
    on_leave: 0,
    new_hires_this_month: 0,
  };
  const leaveStats = dashboardData.leave_stats || {
    total_requests: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    on_leave_today: 0,
  };
  const attendanceStats = dashboardData.attendance_stats || {
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    average_attendance_rate: 0,
    on_leave_today: 0,
  };
  const payrollStats = dashboardData.payroll_stats || {
    total_payroll_this_month: 0,
    total_deductions: 0,
    net_pay: 0,
    pending_payroll: 0,
  };

  const upcomingBirthdays = dashboardData.upcoming_birthdays || [];
  const expiringDocuments = dashboardData.expiring_documents || [];
  const recentActivities = dashboardData.recent_activities || [];

  // ── Chart data ─────────────────────────────────────────────────────────────

  const payrollChartData = (dashboardData.payroll_trend || []).map((m) => ({
    name: m.label,
    "Gross Pay": m.gross_pay,
    Deductions: m.deductions,
    "Net Pay": m.net_pay,
  }));

  const leavePieData = (dashboardData.leave_by_type || []).map((item) => ({
    name: item.leave_type,
    value: item.count,
    color: LEAVE_COLORS[item.leave_type.toLowerCase()] || "#94a3b8",
  }));

  const departmentBarData = (dashboardData.employees_by_department || []).map((item, index) => ({
    name: item.department,
    Total: item.count,
    Active: item.active,
    "On Leave": item.on_leave,
    color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
  }));

  const genderPieData = dashboardData.gender_breakdown
    ? [
        { name: "Male", value: dashboardData.gender_breakdown.male, color: GENDER_COLORS.male },
        { name: "Female", value: dashboardData.gender_breakdown.female, color: GENDER_COLORS.female },
        { name: "Other", value: dashboardData.gender_breakdown.other, color: GENDER_COLORS.other },
        {
          name: "Prefer not to say",
          value: dashboardData.gender_breakdown.prefer_not_to_say,
          color: GENDER_COLORS.prefer_not_to_say,
        },
        {
          name: "Not specified",
          value: dashboardData.gender_breakdown.not_specified,
          color: GENDER_COLORS.not_specified,
        },
      ].filter((item) => item.value > 0)
    : [];

  // ── Table Column Definitions ───────────────────────────────────────────────

  const activityCols = [
    {
      title: "Type",
      dataIndex: "type",
      width: 120,
      render: (type: string) => (
        <Tag color="blue" style={{ fontSize: 11 }}>
          {type}
        </Tag>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      ellipsis: true,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: "Employee",
      dataIndex: "employee_name",
      width: 160,
      render: (name: string) => (
        <Space size={6}>
          <UserOutlined style={{ color: "#64748b" }} />
          <Text style={{ fontSize: 12 }}>{name || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Time",
      dataIndex: "timestamp",
      width: 130,
      render: (d: string) => dayjs(d).format("DD MMM HH:mm"),
    },
  ];

  const birthdayCols = [
    {
      title: "Employee",
      dataIndex: "employee_name",
      render: (name: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Space>
            <UserOutlined style={{ color: primaryColor }} />
            <Text style={{ fontSize: 12, fontWeight: 500 }}>{name}</Text>
          </Space>
          <Text style={{ fontSize: 11, color: "#64748b" }}>{record.employee_number}</Text>
        </Space>
      ),
    },
    {
      title: "Job Title",
      dataIndex: "job_title",
      width: 180,
      render: (title: string) => <Text style={{ fontSize: 12 }}>{title || "—"}</Text>,
    },
    {
      title: "Birthday",
      dataIndex: "birthday",
      width: 130,
      render: (d: string) => dayjs(d).format("DD MMMM"),
    },
    {
      title: "Days Until",
      dataIndex: "days_until",
      width: 110,
      render: (days: number) => (
        <Tag
          color={days === 0 ? "red" : days <= 7 ? "orange" : "green"}
          style={{ fontSize: 11 }}
        >
          {days === 0 ? "🎉 Today!" : `${days} days`}
        </Tag>
      ),
    },
  ];

  const documentCols = [
    {
      title: "Employee",
      dataIndex: "fullname",
      render: (name: string) => (
        <Space size={6}>
          <UserOutlined style={{ color: "#64748b" }} />
          <Text style={{ fontSize: 12, fontWeight: 500 }}>{name}</Text>
        </Space>
      ),
    },
    {
      title: "Document",
      dataIndex: "document_name",
      render: (name: string) => <Text style={{ fontSize: 12 }}>{name}</Text>,
    },
    {
      title: "Expires",
      dataIndex: "expiration_date",
      width: 140,
      render: (d: string) => dayjs(d).format("DD MMM YYYY"),
    },
    {
      title: "Days Until",
      dataIndex: "days_until",
      width: 110,
      render: (days: number) => (
        <Tag color={days <= 30 ? "red" : days <= 60 ? "orange" : "green"} style={{ fontSize: 11 }}>
          {days} days
        </Tag>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          gap: 12,
        }}
      >
        <Spin size="large" />
        <span style={{ color: "#64748b", fontSize: 13 }}>Loading Bandu HR…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ padding: 40 }}>
        <Alert
          type="error"
          showIcon
          message="Failed to load Bandu HR"
          description="Could not connect to the HR service. Check your connection and try again."
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <App>
      <div style={{ padding: "0 0 24px" }}>
        {/* ── Tier 1: Header & Control Bar ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Space align="center" size={12}>
            <div
              style={{
                background: `${primaryColor}15`,
                borderRadius: 10,
                padding: "8px 10px",
                color: primaryColor,
                fontSize: 20,
              }}
            >
              <DashboardOutlined />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
                {PERIOD_LABELS[periodFilter]} · Bandu HR{isAdmin && " (Admin)"}
              </Title>
              <Text style={{ fontSize: 12, color: "#64748b" }}>
                {getFormattedDateRange()} · {isAdmin ? "Company-wide HR overview" : "HR overview"}
              </Text>
            </div>
          </Space>

          <Space size="small" wrap>
            {clockStatus?.clocked_in ? (
              <Button
                type="primary"
                danger
                icon={<LogoutOutlined />}
                onClick={handleClockOut}
                size="small"
              >
                Clock Out
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleClockIn}
                size="small"
              >
                Clock In
              </Button>
            )}

            <div
              style={{
                background: "#f8fafc",
                borderRadius: 8,
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid #e2e8f0",
              }}
            >
              <CalendarOutlined style={{ color: primaryColor, fontSize: 13 }} />
              <Radio.Group
                value={periodFilter}
                onChange={(e) => handlePeriodChange(e.target.value)}
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="day">Day</Radio.Button>
                <Radio.Button value="week">Week</Radio.Button>
                <Radio.Button value="month">Month</Radio.Button>
                <Radio.Button value="year">Year</Radio.Button>
                <Radio.Button value="custom">Custom</Radio.Button>
              </Radio.Group>
            </div>

            {showCustomDatePicker && (
              <RangePicker
                value={customDateRange as any}
                onChange={(d) => setCustomDateRange(d || [])}
                allowClear
                style={{ minWidth: 240 }}
                size="small"
              />
            )}

            <Button
              size="small"
              icon={<SyncOutlined spin={isFetching} />}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </Space>
        </div>

        {/* ── Tier 2: 4 Executive KPI Cards (Matching Duka, Mteja & Pesa Style) ── */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={12} lg={6}>
            <KPICard
              title="Active Workforce"
              value={employeeStats.total_employees.toLocaleString()}
              icon={<TeamOutlined />}
              color="#3b82f6"
              bg="#eff6ff"
              border="#bfdbfe"
              subtext={
                <Text style={{ fontSize: 11, color: "#64748b" }}>
                  {employeeStats.active_employees} active · {employeeStats.new_hires_this_month} new hires
                </Text>
              }
            />
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <KPICard
              title="Attendance Rate"
              value={`${(attendanceStats.average_attendance_rate * 100).toFixed(1)}%`}
              icon={<CheckCircleOutlined />}
              color="#10b981"
              bg="#f0fdf4"
              border="#bbf7d0"
              subtext={
                <Text style={{ fontSize: 11, color: "#64748b" }}>
                  {attendanceStats.present_today || (employeeStats.active_employees - employeeStats.on_leave)} present · {attendanceStats.late_today || 0} late
                </Text>
              }
            />
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <KPICard
              title="Leave Requests"
              value={`${leaveStats.pending} Pending`}
              icon={<CalendarOutlined />}
              color="#f59e0b"
              bg="#fffbeb"
              border="#fde68a"
              subtext={
                <Text style={{ fontSize: 11, color: "#64748b" }}>
                  {leaveStats.on_leave_today} on leave · {leaveStats.total_requests} total
                </Text>
              }
            />
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <KPICard
              title="Net Payroll"
              value={`KES ${fmtK(payrollStats.net_pay)}`}
              icon={<DollarOutlined />}
              color="#6366f1"
              bg="#eef2ff"
              border="#c7d2fe"
              subtext={
                <Text style={{ fontSize: 11, color: "#64748b" }}>
                  Gross: KES {fmtK(payrollStats.total_payroll_this_month)} · Ded: KES {fmtK(payrollStats.total_deductions)}
                </Text>
              }
            />
          </Col>
        </Row>

        {/* ── Tier 3: Visual Analytics Hub ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {/* Payroll Trend (6 Months) */}
          <Col xs={24} lg={14}>
            <ProCard
              title={<Text strong>Payroll Trend — Last 6 Months</Text>}
              bordered
              bodyStyle={{ paddingTop: 8 }}
              size="small"
              extra={
                <Tag color="purple" style={{ fontSize: 11 }}>
                  Pending: KES {fmtK(payrollStats.pending_payroll)}
                </Tag>
              }
            >
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={payrollChartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                  <ReTooltip
                    formatter={(val: any) => [`KES ${fmt(val || 0)}`, undefined]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Gross Pay" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Deductions" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Net Pay" stroke="#6366f1" strokeWidth={2.5} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </ProCard>
          </Col>

          {/* Workforce Demographics & Breakdown Hub */}
          <Col xs={24} lg={10}>
            <ProCard
              title={<Text strong>Workforce Breakdown</Text>}
              bordered
              bodyStyle={{ paddingTop: 8 }}
              size="small"
              extra={
                <Segmented
                  size="small"
                  value={demographicsTab}
                  onChange={(v) => setDemographicsTab(v as string)}
                  options={[
                    { label: "Department", value: "dept" },
                    { label: "Leave", value: "leave" },
                    { label: "Gender", value: "gender" },
                  ]}
                />
              }
            >
              {demographicsTab === "dept" && (
                <>
                  {departmentBarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={departmentBarData}
                        layout="vertical"
                        margin={{ top: 10, right: 15, left: 10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={90}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <ReTooltip
                          formatter={(val: any) => [val, undefined]}
                          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                        />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Active" fill="#10b981" radius={[0, 3, 3, 0]} stackId="a" />
                        <Bar dataKey="On Leave" fill="#f59e0b" radius={[0, 3, 3, 0]} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontSize: 12 }}>
                      No department data available
                    </div>
                  )}
                </>
              )}

              {demographicsTab === "leave" && (
                <>
                  {leavePieData.length > 0 ? (
                    <div>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie
                            data={leavePieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={58}
                            innerRadius={32}
                          >
                            {leavePieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <ReTooltip
                            formatter={(v: any, name: any) => [v, name]}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ marginTop: 8, maxHeight: 95, overflowY: "auto" }}>
                        {leavePieData.map((e, i) => (
                          <div
                            key={i}
                            style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}
                          >
                            <Space size={6}>
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: e.color,
                                  flexShrink: 0,
                                }}
                              />
                              <Text style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>
                                {e.name}
                              </Text>
                            </Space>
                            <Text style={{ fontSize: 11, fontWeight: 600 }}>{e.value}</Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontSize: 12 }}>
                      No leave data this period
                    </div>
                  )}
                </>
              )}

              {demographicsTab === "gender" && (
                <>
                  {genderPieData.length > 0 ? (
                    <div>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie
                            data={genderPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={58}
                            innerRadius={32}
                          >
                            {genderPieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <ReTooltip
                            formatter={(v: any, name: any) => [v, name]}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ marginTop: 8, maxHeight: 95, overflowY: "auto" }}>
                        {genderPieData.map((e, i) => (
                          <div
                            key={i}
                            style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}
                          >
                            <Space size={6}>
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: e.color,
                                  flexShrink: 0,
                                }}
                              />
                              <Text style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>
                                {e.name}
                              </Text>
                            </Space>
                            <Text style={{ fontSize: 11, fontWeight: 600 }}>{e.value}</Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontSize: 12 }}>
                      No gender data available
                    </div>
                  )}
                </>
              )}
            </ProCard>
          </Col>
        </Row>

        {/* ── Tier 4: Unified Workforce Operations & Alerts Hub ── */}
        <ProCard
          bordered
          size="small"
          bodyStyle={{ padding: "0 12px 12px" }}
          tabs={{
            type: "line",
            items: [
              {
                key: "activities",
                label: (
                  <Space size={6}>
                    <HistoryOutlined />
                    <span>Recent Activities</span>
                    {recentActivities.length > 0 && (
                      <Badge count={recentActivities.length} style={{ backgroundColor: "#3b82f6" }} />
                    )}
                  </Space>
                ),
                children: (
                  <Table
                    columns={activityCols}
                    dataSource={recentActivities}
                    rowKey={(record) => `${record.type}-${record.timestamp}`}
                    pagination={{ pageSize: 5, size: "small" }}
                    size="small"
                    locale={{ emptyText: "No recent HR activities" }}
                  />
                ),
              },
              {
                key: "birthdays",
                label: (
                  <Space size={6}>
                    <GiftOutlined />
                    <span>Upcoming Birthdays</span>
                    {upcomingBirthdays.length > 0 && (
                      <Badge count={upcomingBirthdays.length} style={{ backgroundColor: "#10b981" }} />
                    )}
                  </Space>
                ),
                children: upcomingBirthdays.length > 0 ? (
                  <Table
                    columns={birthdayCols}
                    dataSource={upcomingBirthdays}
                    rowKey="employee_id"
                    pagination={{ pageSize: 5, size: "small" }}
                    size="small"
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 12 }}>
                    No upcoming birthdays this month
                  </div>
                ),
              },
              {
                key: "documents",
                label: (
                  <Space size={6}>
                    <FileProtectOutlined />
                    <span>Expiring Documents</span>
                    {expiringDocuments.length > 0 && (
                      <Badge count={expiringDocuments.length} style={{ backgroundColor: "#f59e0b" }} />
                    )}
                  </Space>
                ),
                children: expiringDocuments.length > 0 ? (
                  <Table
                    columns={documentCols}
                    dataSource={expiringDocuments}
                    rowKey={(record) => `${record.employee_id}-${record.document_name}`}
                    pagination={{ pageSize: 5, size: "small" }}
                    size="small"
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 12 }}>
                    No documents expiring soon
                  </div>
                ),
              },
            ],
          }}
        />
      </div>
    </App>
  );
};

export default BanduHRDashboard;
