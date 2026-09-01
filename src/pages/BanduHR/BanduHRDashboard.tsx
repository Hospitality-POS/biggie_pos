import React, { useState, useCallback, useMemo } from "react";
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
  message,
} from "antd";
import {
  TeamOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  SyncOutlined,
  DashboardOutlined,
  RiseOutlined,
  FallOutlined,
  UserOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchHRDashboard, type HRDashboardData } from "@services/bandu/dashboard";
import { clockIn, clockOut, fetchClockStatus } from "@services/hr/leave";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import dayjs from "dayjs";
import BusinessImpact from "src/pages/Report/BusinessImpact";
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

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return fmt(v);
};

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

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  suffix?: string;
  prefix?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title, value, icon, color, bg, suffix, prefix = "",
}) => (
  <div
    style={{
      background: bg,
      borderRadius: 12,
      padding: "20px 24px",
      height: "100%",
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        right: -20,
        top: -20,
        width: 90,
        height: 90,
        borderRadius: "50%",
        background: `${color}22`,
      }}
    />
    <Space direction="vertical" size={4} style={{ width: "100%" }}>
      <Space align="center">
        <div
          style={{
            background: `${color}20`,
            borderRadius: 8,
            padding: "6px 8px",
            color,
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          {icon}
        </div>
        <Text style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{title}</Text>
      </Space>
      <Text
        strong
        style={{ fontSize: 22, color: "#0f172a", display: "block", lineHeight: 1.2 }}
      >
        {prefix} {value}
        {suffix && <span style={{ fontSize: 13, marginLeft: 4, color: "#64748b" }}>{suffix}</span>}
      </Text>
    </Space>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const BanduHRDashboard: React.FC = () => {
  const shopId = getShopId();
  const primaryColor = usePrimaryColor();
  const isAdmin = !shopId; // Admin if no shop_id

  const [periodFilter, setPeriodFilter] = useState("month");
  const [customDateRange, setCustomDateRange] = useState<any[]>([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const getDateRange = useCallback(() => {
    const today = dayjs();
    switch (periodFilter) {
      case "day": return { startDate: today.startOf("day"), endDate: today.endOf("day") };
      case "week": return { startDate: today.startOf("week"), endDate: today.endOf("week") };
      case "month": return { startDate: today.startOf("month"), endDate: today.endOf("month") };
      case "year": return { startDate: today.startOf("year"), endDate: today.endOf("year") };
      case "custom":
        if (customDateRange?.length === 2) {
          return { startDate: customDateRange[0].startOf("day"), endDate: customDateRange[1].endOf("day") };
        }
        return { startDate: today.startOf("month"), endDate: today.endOf("month") };
      default: return { startDate: today.startOf("month"), endDate: today.endOf("month") };
    }
  }, [periodFilter, customDateRange]);

  const { startDate, endDate } = getDateRange();

  const getFormattedDateRange = useCallback(() => {
    const fmt = "MMM D, YYYY";
    switch (periodFilter) {
      case "day": return startDate.format("MMM D, YYYY");
      case "week": return `${startDate.format(fmt)} – ${endDate.format(fmt)}`;
      case "month": return startDate.format("MMMM YYYY");
      case "year": return startDate.format("YYYY");
      case "custom":
        if (customDateRange?.length === 2) {
          return `${customDateRange[0].format(fmt)} – ${customDateRange[1].format(fmt)}`;
        }
        return "Custom Range";
      default: return startDate.format("MMMM YYYY");
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
    refetchInterval: 60000, // Refetch every minute
  });

  const handleClockIn = async () => {
    try {
      await clockIn();
      message.success("Clocked in successfully");
      queryClient.invalidateQueries({ queryKey: ["clock-status"] });
    } catch (error) {
      // Error handled by service
    }
  };

  const handleClockOut = async () => {
    try {
      await clockOut();
      message.success("Clocked out successfully");
      queryClient.invalidateQueries({ queryKey: ["clock-status"] });
    } catch (error) {
      // Error handled by service
    }
  };

  const dashboardData: HRDashboardData = data || ({} as HRDashboardData);

  // ── Defensive checks for missing data ──────────────────────────────────────────
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

  const banduStats = useMemo(
    () => [
      { label: "Total Employees", value: fmtK(employeeStats.total_employees), icon: <TeamOutlined /> },
      { label: "Active", value: fmtK(employeeStats.active_employees), icon: <CheckCircleOutlined /> },
      { label: "On Leave", value: fmtK(employeeStats.on_leave), icon: <ClockCircleOutlined /> },
      { label: "New Hires", value: fmtK(employeeStats.new_hires_this_month), icon: <RiseOutlined /> },
      { label: "Leave Requests", value: fmtK(leaveStats.total_requests), icon: <FileTextOutlined /> },
      { label: "Attendance Rate", value: (attendanceStats.average_attendance_rate * 100).toFixed(1), suffix: "%", icon: <UserOutlined /> },
    ],
    [employeeStats, leaveStats, attendanceStats]
  );

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
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

  // Use actual API data only
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

  // Gender breakdown data from API
  const genderPieData = dashboardData.gender_breakdown ? [
    { name: "Male", value: dashboardData.gender_breakdown.male, color: GENDER_COLORS.male },
    { name: "Female", value: dashboardData.gender_breakdown.female, color: GENDER_COLORS.female },
    { name: "Other", value: dashboardData.gender_breakdown.other, color: GENDER_COLORS.other },
    { name: "Prefer not to say", value: dashboardData.gender_breakdown.prefer_not_to_say, color: GENDER_COLORS.prefer_not_to_say },
    { name: "Not specified", value: dashboardData.gender_breakdown.not_specified, color: GENDER_COLORS.not_specified },
  ].filter((item) => item.value > 0) : [];

  // ── Recent activities columns ─────────────────────────────────────────────────

  const activityCols = [
    {
      title: "Type",
      dataIndex: "type",
      width: 120,
      render: (type: string) => (
        <Tag color="blue" style={{ fontSize: 11 }}>{type}</Tag>
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
      width: 150,
      render: (name: string) => <Text style={{ fontSize: 12 }}>{name || "—"}</Text>,
    },
    {
      title: "Time",
      dataIndex: "timestamp",
      width: 120,
      render: (d: string) => dayjs(d).format("DD MMM HH:mm"),
    },
  ];

  // ── Upcoming birthdays columns ───────────────────────────────────────────────

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
      width: 150,
      render: (title: string) => <Text style={{ fontSize: 12 }}>{title || "—"}</Text>,
    },
    {
      title: "Birthday",
      dataIndex: "birthday",
      width: 120,
      render: (d: string) => dayjs(d).format("DD MMM"),
    },
    {
      title: "Days Until",
      dataIndex: "days_until",
      width: 100,
      render: (days: number) => (
        <Tag color={days === 0 ? "red" : days <= 7 ? "orange" : "green"} style={{ fontSize: 11 }}>
          {days === 0 ? "Today!" : `${days} days`}
        </Tag>
      ),
    },
  ];

  // ── Expiring documents columns ───────────────────────────────────────────────

  const documentCols = [
    {
      title: "Employee",
      dataIndex: "fullname",
      render: (name: string) => <Text style={{ fontSize: 12 }}>{name}</Text>,
    },
    {
      title: "Document",
      dataIndex: "document_name",
      render: (name: string) => <Text style={{ fontSize: 12 }}>{name}</Text>,
    },
    {
      title: "Expires",
      dataIndex: "expiration_date",
      width: 120,
      render: (d: string) => dayjs(d).format("DD MMM YYYY"),
    },
    {
      title: "Days Until",
      dataIndex: "days_until",
      width: 100,
      render: (days: number) => (
        <Tag color={days <= 30 ? "red" : days <= 60 ? "orange" : "green"} style={{ fontSize: 11 }}>
          {days} days
        </Tag>
      ),
    },
  ];

  return (
    <App>
      <div style={{ padding: "0 0 24px" }}>

        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
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
            {/* Clock In/Out Button */}
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
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
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
                style={{ minWidth: 260 }}
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

        {/* ── AI Business Impact ── */}
        <BusinessImpact
          product="bandu"
          periodFilter={periodFilter}
          startDate={startDate}
          endDate={endDate}
          periodLabel={PERIOD_LABELS[periodFilter]}
          stats={banduStats}
        />

        {/* ── Section 1: Employee Stats ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={6}>
            <KPICard
              title="Total Employees"
              value={employeeStats.total_employees}
              icon={<TeamOutlined />}
              color="#3b82f6"
              bg="#eff6ff"
            />
          </Col>
          <Col xs={12} sm={6}>
            <KPICard
              title="Active"
              value={employeeStats.active_employees}
              icon={<UserOutlined />}
              color="#10b981"
              bg="#f0fdf4"
            />
          </Col>
          <Col xs={12} sm={6}>
            <KPICard
              title="On Leave"
              value={employeeStats.on_leave}
              icon={<CalendarOutlined />}
              color="#f59e0b"
              bg="#fff7ed"
            />
          </Col>
          <Col xs={12} sm={6}>
            <KPICard
              title="New Hires"
              value={employeeStats.new_hires_this_month}
              icon={<RiseOutlined />}
              color="#6366f1"
              bg="#eef2ff"
              suffix="this month"
            />
          </Col>
        </Row>

        {/* ── Section 2: Leave & Attendance Stats ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={6}>
            <KPICard
              title="Leave Requests"
              value={leaveStats.total_requests}
              icon={<FileTextOutlined />}
              color="#8b5cf6"
              bg="#f5f3ff"
            />
          </Col>
          <Col xs={12} sm={6}>
            <KPICard
              title="Pending"
              value={leaveStats.pending}
              icon={<ClockCircleOutlined />}
              color="#f59e0b"
              bg="#fff7ed"
            />
          </Col>
          <Col xs={12} sm={6}>
            <KPICard
              title="On Leave Today"
              value={leaveStats.on_leave_today}
              icon={<CalendarOutlined />}
              color="#10b981"
              bg="#f0fdf4"
            />
          </Col>
          <Col xs={12} sm={6}>
            <KPICard
              title="Attendance Rate"
              value={attendanceStats.average_attendance_rate}
              icon={<TeamOutlined />}
              color="#3b82f6"
              bg="#eff6ff"
              suffix="%"
            />
          </Col>
        </Row>

        {/* ── Section 3: Payroll Stats ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={6}>
            <KPICard
              title="Total Payroll"
              value={fmtK(payrollStats.total_payroll_this_month)}
              icon={<DollarOutlined />}
              color="#10b981"
              bg="#f0fdf4"
              prefix="KES "
            />
          </Col>
          <Col xs={12} sm={6}>
            <KPICard
              title="Deductions"
              value={fmtK(payrollStats.total_deductions)}
              icon={<FallOutlined />}
              color="#ef4444"
              bg="#fef2f2"
              prefix="KES "
            />
          </Col>
          <Col xs={12} sm={6}>
            <KPICard
              title="Net Pay"
              value={fmtK(payrollStats.net_pay)}
              icon={<DollarOutlined />}
              color="#6366f1"
              bg="#eef2ff"
              prefix="KES "
            />
          </Col>
          <Col xs={12} sm={6}>
            <KPICard
              title="Pending Payroll"
              value={fmtK(payrollStats.pending_payroll)}
              icon={<ClockCircleOutlined />}
              color="#f59e0b"
              bg="#fff7ed"
              prefix="KES "
            />
          </Col>
        </Row>

        {/* ── Section 4: Payroll Trend & Leave Distribution ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={16}>
            <ProCard
              title={<Text strong>Payroll Trend — Last 6 Months</Text>}
              bordered
              bodyStyle={{ paddingTop: 8 }}
              size="small"
            >
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={payrollChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                  <ReTooltip
                    formatter={(val: any) => [`KES ${fmt(val || 0)}`, undefined]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Gross Pay" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Deductions" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Net Pay" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </ProCard>
          </Col>

          <Col xs={24} lg={8}>
            <ProCard
              title={<Text strong>Leave by Type</Text>}
              bordered
              bodyStyle={{ paddingTop: 8 }}
              size="small"
            >
              {leavePieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={leavePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={58}
                        innerRadius={30}
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
                  <div style={{ marginTop: 8 }}>
                    {leavePieData.map((e, i) => (
                      <div
                        key={i}
                        style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}
                      >
                        <Space size={6}>
                          <div
                            style={{
                              width: 8, height: 8, borderRadius: "50%",
                              background: e.color, flexShrink: 0,
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
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 12 }}>
                  No leave data this period
                </div>
              )}
            </ProCard>
          </Col>

          <Col xs={24} lg={8}>
            <ProCard
              title={<Text strong>Gender Breakdown</Text>}
              bordered
              bodyStyle={{ paddingTop: 8 }}
              size="small"
            >
              {genderPieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={genderPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={58}
                        innerRadius={30}
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
                  <div style={{ marginTop: 8 }}>
                    {genderPieData.map((e, i) => (
                      <div
                        key={i}
                        style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}
                      >
                        <Space size={6}>
                          <div
                            style={{
                              width: 8, height: 8, borderRadius: "50%",
                              background: e.color, flexShrink: 0,
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
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 12 }}>
                  No gender data available
                </div>
              )}
            </ProCard>
          </Col>
        </Row>

        {/* ── Section 5: Employees by Department ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24}>
            <ProCard
              title={<Text strong>Employees by Department</Text>}
              bordered
              bodyStyle={{ paddingTop: 8 }}
              size="small"
            >
              {departmentBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={departmentBarData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <ReTooltip
                      formatter={(val: any) => [val, undefined]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Active" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="On Leave" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 12 }}>
                  No department data available
                </div>
              )}
            </ProCard>
          </Col>
        </Row>

        {/* ── Section 6: Recent Activities & Upcoming Birthdays ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={12}>
            <ProCard
              title={<Text strong>Recent Activities</Text>}
              bordered
              bodyStyle={{ paddingTop: 8 }}
              size="small"
            >
              <Table
                columns={activityCols}
                dataSource={recentActivities}
                rowKey={(record) => `${record.type}-${record.timestamp}`}
                pagination={false}
                size="small"
                scroll={{ y: 200 }}
              />
            </ProCard>
          </Col>

          <Col xs={24} lg={12}>
            <ProCard
              title={<Text strong>Upcoming Birthdays</Text>}
              bordered
              bodyStyle={{ paddingTop: 8 }}
              size="small"
            >
              {upcomingBirthdays.length > 0 ? (
                <Table
                  columns={birthdayCols}
                  dataSource={upcomingBirthdays}
                  rowKey="employee_id"
                  pagination={false}
                  size="small"
                  scroll={{ y: 200 }}
                />
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 12 }}>
                  No upcoming birthdays this month
                </div>
              )}
            </ProCard>
          </Col>
        </Row>

        {/* ── Section 5: Expiring Documents ── */}
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <ProCard
              title={<Text strong>Expiring Documents</Text>}
              bordered
              bodyStyle={{ paddingTop: 8 }}
              size="small"
            >
              {expiringDocuments.length > 0 ? (
                <Table
                  columns={documentCols}
                  dataSource={expiringDocuments}
                  rowKey={(record) => `${record.employee_id}-${record.document_name}`}
                  pagination={false}
                  size="small"
                  scroll={{ y: 200 }}
                />
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 12 }}>
                  No documents expiring soon
                </div>
              )}
            </ProCard>
          </Col>
        </Row>

      </div>
    </App>
  );
};

export default BanduHRDashboard;
