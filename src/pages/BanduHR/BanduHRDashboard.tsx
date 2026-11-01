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
  Drawer,
  Modal,
  Input,
  Tabs,
  Progress,
  Tooltip,
  Empty,
} from "antd";
import {
  TeamOutlined,
  CalendarOutlined,
  DollarOutlined,
  SyncOutlined,
  DashboardOutlined,
  UserOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  GiftOutlined,
  FileProtectOutlined,
  HistoryOutlined,
  FilterOutlined,
  QrcodeOutlined,
  CopyOutlined,
  DownloadOutlined,
  RiseOutlined,
  FallOutlined,
  SwapOutlined,
  FieldTimeOutlined,
  WalletOutlined,
  ScheduleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { QRCodeCanvas } from "qrcode.react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BranchSelect, useBranchFilter } from "@components/BranchFilter/BranchFilter";
import { fetchHRDashboard, type HRDashboardData } from "@services/bandu/dashboard";
import { clockIn, clockOut, fetchClockStatus } from "@services/hr/leave";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { fmtK } from "@utils/formatters";
import dayjs from "dayjs";
import { CUSTOM_RANGE_PRESETS } from "src/utils/dateRangePresets";
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
  ComposedChart,
} from "recharts";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

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
  emergency: "#f97316",
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

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  on_leave: "#3b82f6",
  suspended: "#f59e0b",
  terminated: "#ef4444",
  resigned: "#64748b",
};

const EMPLOYMENT_TYPE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#64748b", "#94a3b8"];

const STATUTORY_ITEMS: { key: keyof HRDashboardData["statutory"]; label: string; color: string }[] = [
  { key: "paye", label: "PAYE", color: "#6366f1" },
  { key: "nssf", label: "NSSF", color: "#10b981" },
  { key: "shif", label: "SHIF", color: "#06b6d4" },
  { key: "housing_levy", label: "Housing Levy", color: "#f59e0b" },
  { key: "nita", label: "NITA", color: "#8b5cf6" },
  { key: "withholding_tax", label: "Withholding Tax", color: "#ec4899" },
  { key: "other", label: "Other", color: "#94a3b8" },
];

const PIPELINE_STAGES: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "#94a3b8" },
  pending_approval: { label: "Pending approval", color: "#f59e0b" },
  approved: { label: "Approved", color: "#3b82f6" },
  processed: { label: "Processed", color: "#8b5cf6" },
  paid: { label: "Paid", color: "#10b981" },
};

const titleCase = (s: string) =>
  (s || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const EmptyState: React.FC<{ text: string; height?: number }> = ({ text, height = 200 }) => (
  <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Text type="secondary" style={{ fontSize: 12 }}>{text}</Text>} />
  </div>
);

// ── Compact stat tile for the secondary KPI row ──────────────────────────────

const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  tooltip?: string;
}> = ({ label, value, hint, icon, color, tooltip }) => (
  <Tooltip title={tooltip}>
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: "100%",
      }}
    >
      <div
        style={{
          background: `${color}14`,
          color,
          borderRadius: 8,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <Text style={{ fontSize: 11, color: "#64748b", display: "block", whiteSpace: "nowrap" }}>{label}</Text>
        <Text strong style={{ fontSize: 16, color: "#0f172a", whiteSpace: "nowrap" }}>{value}</Text>
        {hint && (
          <Text style={{ fontSize: 10.5, color: "#94a3b8", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {hint}
          </Text>
        )}
      </div>
    </div>
  </Tooltip>
);

// ── KPI Card Component (Unified Duka & Mteja Style) ──────────────────────────

interface KPICardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  subtext?: React.ReactNode;
  isMobile?: boolean;
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
  isMobile = false,
  onClick,
}) => (
  <div
    onClick={onClick}
    style={{
      background: bg,
      borderRadius: isMobile ? 10 : 12,
      padding: isMobile ? "10px 10px" : "16px 18px",
      border: `1px solid ${border}`,
      cursor: onClick ? "pointer" : "default",
      transition: "transform .15s ease, box-shadow .15s ease",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
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
    <Space direction="vertical" size={isMobile ? 2 : 3} style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
        <Text
          style={{
            fontSize: isMobile ? 11 : 12,
            color: "#475569",
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </Text>
        <div
          style={{
            background: "#ffffff",
            borderRadius: isMobile ? 6 : 8,
            padding: isMobile ? "3px 5px" : "4px 6px",
            color,
            fontSize: isMobile ? 12 : 14,
            lineHeight: 1,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontSize: isMobile ? 17 : 22,
          fontWeight: 700,
          color: "#0f172a",
          letterSpacing: -0.3,
          lineHeight: 1.2,
          marginTop: 2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 11,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {subtext}
      </div>
    </Space>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const BanduHRDashboard: React.FC = () => {
  const ownShopId = getShopId();
  const primaryColor = usePrimaryColor();
  const isAdmin = !ownShopId;
  const isMobile = useIsMobile();
  // Admins can narrow the dashboard to one branch; shop users stay on their own
  const { shopId, shops, branchId, setBranchId, showFilter } = useBranchFilter(ownShopId);
  const branchName = shops.find((s) => s._id === branchId)?.name;

  const [periodFilter, setPeriodFilter] = useState("month");
  const [customDateRange, setCustomDateRange] = useState<any[]>([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [demographicsTab, setDemographicsTab] = useState<string>("dept");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [clockLinkModalOpen, setClockLinkModalOpen] = useState(false);

  // Staff clock-in link + QR — same page used by the main dashboard share menu
  const clockLinkUrl = (() => {
    try {
      const tenant = JSON.parse(localStorage.getItem("tenant") || "null");
      return `${import.meta.env.VITE_APP_URL}/admin/staff-clock-in?tenant_id=${tenant?._id}&tenant_code=${tenant?.tenant_code}&shop_id=${ownShopId}`;
    } catch {
      return "";
    }
  })();

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
      queryClient.invalidateQueries({ queryKey: ["clock-status"] });
    } catch {
      // Error handled by service
    }
  };

  const handleClockOut = async () => {
    try {
      await clockOut();
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
    suspended: 0,
    terminated: 0,
    resigned: 0,
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

  const statusPieData = [
    { key: "active", name: "Active", value: employeeStats.active_employees || 0 },
    { key: "on_leave", name: "On Leave", value: employeeStats.on_leave || 0 },
    { key: "suspended", name: "Suspended", value: employeeStats.suspended || 0 },
    { key: "terminated", name: "Terminated", value: employeeStats.terminated || 0 },
    { key: "resigned", name: "Resigned", value: employeeStats.resigned || 0 },
  ]
    .map((s) => ({ ...s, color: STATUS_COLORS[s.key] }))
    .filter((s) => s.value > 0);

  const workforce = dashboardData.workforce;
  const statutory = dashboardData.statutory;
  const leaveBalance = dashboardData.leave_balance;
  const onLeaveToday = dashboardData.on_leave_today || [];
  const pendingLeaves = dashboardData.pending_leave_requests || [];
  const anniversaries = workforce?.upcoming_anniversaries || [];
  const pipeline = dashboardData.payroll_pipeline || [];

  const statutoryData = STATUTORY_ITEMS.map((s) => ({ ...s, value: statutory?.[s.key] || 0 })).filter(
    (s) => s.value > 0
  );
  const statutoryTotal = statutoryData.reduce((s, i) => s + i.value, 0);

  const employmentTypeData = (workforce?.employment_types || [])
    .filter((t) => t.count > 0)
    .map((t, i) => ({
      name: titleCase(t.type),
      value: t.count,
      color: EMPLOYMENT_TYPE_COLORS[i % EMPLOYMENT_TYPE_COLORS.length],
    }));

  const tenureData = (workforce?.tenure_bands || []).map((b) => ({ name: b.band, Employees: b.count }));

  const headcountData = (workforce?.headcount_trend || []).map((m) => ({
    name: m.label,
    Hires: m.hires,
    Exits: m.exits,
    Headcount: m.headcount,
  }));

  const attendanceData = (dashboardData.attendance_trend || []).map((d) => ({
    name: d.label,
    Present: d.present,
  }));

  const leaveUsedPct = leaveBalance?.entitled
    ? Math.min(100, Math.round((leaveBalance.used / leaveBalance.entitled) * 100))
    : 0;
  const trackedStaff = attendanceStats.tracked_staff || 0;
  const todayBreakdown = [
    { label: "Present", value: attendanceStats.present_today || 0, color: "#10b981" },
    { label: "Clocked in now", value: attendanceStats.clocked_in_now || 0, color: "#3b82f6" },
    { label: "On leave", value: onLeaveToday.length, color: "#f59e0b" },
    { label: "Not clocked in", value: attendanceStats.absent_today || 0, color: "#ef4444" },
  ];

  // Shared renderer for the donut + legend breakdowns
  const renderDonut = (rows: { name: string; value: number; color: string }[], emptyText: string) =>
    rows.length > 0 ? (
      <div>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={58} innerRadius={32}>
              {rows.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <ReTooltip formatter={(v: any, name: any) => [v, name]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 8, maxHeight: 95, overflowY: "auto" }}>
          {rows.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <Space size={6}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                <Text style={{ fontSize: 11, color: "#64748b" }}>{e.name}</Text>
              </Space>
              <Text style={{ fontSize: 11, fontWeight: 600 }}>{e.value}</Text>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <EmptyState text={emptyText} height={240} />
    );

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
          {days < 0 ? `Expired ${-days}d ago` : days === 0 ? "Today" : `${days} days`}
        </Tag>
      ),
    },
  ];

  const pendingLeaveCols = [
    {
      title: "Employee",
      dataIndex: "employee_name",
      render: (name: string) => (
        <Space size={6}>
          <UserOutlined style={{ color: "#64748b" }} />
          <Text style={{ fontSize: 12, fontWeight: 500 }}>{name}</Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "leave_type",
      width: 110,
      render: (t: string) => (
        <Tag color={LEAVE_COLORS[t?.toLowerCase()]} style={{ fontSize: 11 }}>
          {t}
        </Tag>
      ),
    },
    {
      title: "Dates",
      key: "dates",
      width: 170,
      render: (_: any, r: any) => (
        <Text style={{ fontSize: 12 }}>
          {dayjs(r.start_date).format("D MMM")} – {dayjs(r.end_date).format("D MMM YYYY")}
        </Text>
      ),
    },
    {
      title: "Days",
      dataIndex: "days_requested",
      width: 70,
      align: "right" as const,
    },
    {
      title: "Starts",
      dataIndex: "start_date",
      width: 110,
      render: (d: string) => {
        const days = dayjs(d).startOf("day").diff(dayjs().startOf("day"), "day");
        return (
          <Tag color={days < 0 ? "red" : days <= 3 ? "orange" : "default"} icon={<ClockCircleOutlined />} style={{ fontSize: 11 }}>
            {days < 0 ? "Started" : days === 0 ? "Today" : `in ${days}d`}
          </Tag>
        );
      },
    },
  ];

  const anniversaryCols = [
    {
      title: "Employee",
      dataIndex: "employee_name",
      render: (name: string) => (
        <Space size={6}>
          <UserOutlined style={{ color: primaryColor }} />
          <Text style={{ fontSize: 12, fontWeight: 500 }}>{name}</Text>
        </Space>
      ),
    },
    {
      title: "Job Title",
      dataIndex: "job_title",
      width: 180,
      render: (t: string) => <Text style={{ fontSize: 12 }}>{t || "—"}</Text>,
    },
    {
      title: "Milestone",
      dataIndex: "years",
      width: 110,
      render: (y: number) => (
        <Tag color="purple" style={{ fontSize: 11 }}>
          {y} year{y === 1 ? "" : "s"}
        </Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "days_until",
      width: 120,
      render: (days: number) => (
        <Tag color={days === 0 ? "red" : days <= 7 ? "orange" : "green"} style={{ fontSize: 11 }}>
          {days === 0 ? "Today" : `in ${days} days`}
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
        {/* ── Mobile Filter Drawer ── */}
        <Drawer
          title={showFilter ? "Filter Period & Branch" : "Filter Period"}
          placement="bottom"
          height="auto"
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          styles={{ body: { paddingBottom: 32 } }}
        >
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {showFilter && (
              <BranchSelect shops={shops} value={branchId} size="middle" block
                onChange={(v) => { setBranchId(v); setFilterDrawerOpen(false); }} />
            )}
            <Radio.Group
              value={periodFilter}
              onChange={(e) => handlePeriodChange(e.target.value)}
              style={{ width: "100%" }}
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                {Object.entries(PERIOD_LABELS).map(([val, label]) => (
                  <Radio.Button
                    key={val}
                    value={val}
                    style={{ width: "100%", textAlign: "center", borderRadius: 8, marginBottom: 4 }}
                  >
                    {label}
                  </Radio.Button>
                ))}
              </Space>
            </Radio.Group>
            {showCustomDatePicker && (
              <RangePicker
                value={customDateRange as any}
                presets={CUSTOM_RANGE_PRESETS}
                onChange={(d) => setCustomDateRange(d || [])}
                allowClear
                style={{ width: "100%" }}
              />
            )}
          </Space>
        </Drawer>

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
                padding: isMobile ? "6px 8px" : "8px 10px",
                color: primaryColor,
                fontSize: isMobile ? 18 : 20,
              }}
            >
              <DashboardOutlined />
            </div>
            <div>
              <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: "#0f172a" }}>
                {PERIOD_LABELS[periodFilter]} · Bandu HR{isAdmin && " (Admin)"}
              </Title>
              <Text style={{ fontSize: 12, color: "#64748b" }}>
                {getFormattedDateRange()} · {branchName ? `${branchName} HR overview` : isAdmin ? "Company-wide HR overview" : "HR overview"}
              </Text>
            </div>
          </Space>

          <Space size="small" wrap>
            {isMobile ? (
              <>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setFilterDrawerOpen(true)}
                  size="middle"
                >
                  {PERIOD_LABELS[periodFilter] || "Filter"}
                </Button>
                <Button
                  icon={<QrcodeOutlined />}
                  onClick={() => setClockLinkModalOpen(true)}
                  size="middle"
                />
                {clockStatus?.clocked_in ? (
                  <Button
                    type="primary"
                    danger
                    icon={<LogoutOutlined />}
                    onClick={handleClockOut}
                    size="middle"
                  >
                    Clock Out
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleClockIn}
                    size="middle"
                  >
                    Clock In
                  </Button>
                )}
                <Button
                  type="primary"
                  icon={<SyncOutlined spin={isFetching} />}
                  onClick={() => refetch()}
                  size="middle"
                />
              </>
            ) : (
              <>
                <Button
                  icon={<QrcodeOutlined />}
                  onClick={() => setClockLinkModalOpen(true)}
                  size="small"
                >
                  QR / Link
                </Button>
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

                {showFilter && <BranchSelect shops={shops} value={branchId} onChange={setBranchId} />}

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
                    presets={CUSTOM_RANGE_PRESETS}
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
              </>
            )}
          </Space>
        </div>

        {/* ── Tier 2: 4 Executive KPI Cards (Matching Duka, Mteja & Pesa Style) ── */}
        <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
          <Col xs={12} sm={12} lg={6}>
            <KPICard
              title="Active Workforce"
              value={employeeStats.total_employees.toLocaleString()}
              icon={<TeamOutlined />}
              color="#3b82f6"
              bg="#eff6ff"
              border="#bfdbfe"
              isMobile={isMobile}
              subtext={
                <Text style={{ fontSize: 11, color: "#64748b" }}>
                  {employeeStats.active_employees} active · {employeeStats.suspended || 0} suspended · {employeeStats.terminated || 0} terminated
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
              isMobile={isMobile}
              subtext={
                <Text style={{ fontSize: 11, color: "#64748b" }}>
                  {attendanceStats.present_today} of {trackedStaff} in today · {attendanceStats.average_hours}h avg shift
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
              isMobile={isMobile}
              subtext={
                <Text style={{ fontSize: 11, color: "#64748b" }}>
                  {leaveStats.on_leave_today} out today · {leaveStats.approved} approved · {leaveStats.rejected} rejected
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
              isMobile={isMobile}
              subtext={
                <Text style={{ fontSize: 11, color: "#64748b" }}>
                  Gross: KES {fmtK(payrollStats.total_payroll_this_month)} · Ded: KES {fmtK(payrollStats.total_deductions)}
                </Text>
              }
            />
          </Col>
        </Row>

        {/* ── Tier 2b: Workforce health tiles ── */}
        <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
          <Col xs={12} sm={8} lg={4}>
            <StatTile
              label="New Hires"
              value={workforce?.hires_in_period || 0}
              hint={`${employeeStats.new_hires_this_month} this month`}
              icon={<RiseOutlined />}
              color="#10b981"
              tooltip="Employees hired in the selected period"
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <StatTile
              label="Exits"
              value={workforce?.exits_in_period || 0}
              hint={`${employeeStats.resigned} resigned · ${employeeStats.terminated} terminated (all time)`}
              icon={<FallOutlined />}
              color="#ef4444"
              tooltip="Employees who resigned or were terminated in the selected period"
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <StatTile
              label="Turnover"
              value={`${((workforce?.turnover_rate || 0) * 100).toFixed(1)}%`}
              hint="Exits ÷ staff in period"
              icon={<SwapOutlined />}
              color="#f97316"
              tooltip="Exits in the period divided by current staff plus those exits"
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <StatTile
              label="Avg Tenure"
              value={`${(workforce?.average_tenure_years || 0).toFixed(1)} yrs`}
              hint={`${dashboardData.departments_total} departments`}
              icon={<FieldTimeOutlined />}
              color="#8b5cf6"
              tooltip="Average time since hire across current staff"
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <StatTile
              label="Monthly Salary Bill"
              value={`KES ${fmtK(payrollStats.salary_bill)}`}
              hint={`Avg basic KES ${fmtK(payrollStats.average_basic_salary)}`}
              icon={<WalletOutlined />}
              color="#6366f1"
              tooltip="Sum of basic salaries of active employees (before allowances and deductions)"
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <StatTile
              label="Leave Days Used"
              value={`${leaveUsedPct}%`}
              hint={`${leaveBalance?.used || 0} of ${leaveBalance?.entitled || 0} days · ${leaveBalance?.remaining || 0} left`}
              icon={<ScheduleOutlined />}
              color="#0ea5e9"
              tooltip={`Leave balances for ${dayjs().year()}`}
            />
          </Col>
        </Row>

        {/* ── Tier 2c: Today at a glance ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={10}>
            <ProCard
              title={<Text strong>Today at a Glance</Text>}
              bordered
              size="small"
              style={{ height: "100%" }}
              extra={<Text type="secondary" style={{ fontSize: 12 }}>{dayjs().format("ddd, D MMM")}</Text>}
            >
              <Row gutter={[8, 8]}>
                {todayBreakdown.map((t) => (
                  <Col span={12} key={t.label}>
                    <div style={{ background: `${t.color}0f`, borderRadius: 8, padding: "8px 10px", border: `1px solid ${t.color}33` }}>
                      <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>{t.label}</Text>
                      <Text strong style={{ fontSize: 20, color: t.color }}>{t.value}</Text>
                    </div>
                  </Col>
                ))}
              </Row>
              <div style={{ marginTop: 12 }}>
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 12, color: "#64748b" }}>Turn-out</Text>
                  <Text style={{ fontSize: 12, fontWeight: 600 }}>
                    {attendanceStats.present_today} / {trackedStaff}
                  </Text>
                </Space>
                <Progress
                  percent={trackedStaff ? Math.round((attendanceStats.present_today / trackedStaff) * 100) : 0}
                  strokeColor="#10b981"
                  size="small"
                  style={{ margin: 0 }}
                />
                {trackedStaff === 0 && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Link employees to user accounts to track their clock-ins here.
                  </Text>
                )}
              </div>
            </ProCard>
          </Col>
          <Col xs={24} lg={14}>
            <ProCard
              title={
                <Space size={6}>
                  <Text strong>Who's Out Today</Text>
                  {onLeaveToday.length > 0 && <Badge count={onLeaveToday.length} style={{ backgroundColor: "#f59e0b" }} />}
                </Space>
              }
              bordered
              size="small"
              style={{ height: "100%" }}
              bodyStyle={{ paddingTop: 4 }}
            >
              {onLeaveToday.length > 0 ? (
                <div style={{ maxHeight: 210, overflowY: "auto" }}>
                  {onLeaveToday.map((l) => {
                    const back = dayjs(l.end_date).add(1, "day");
                    return (
                      <div
                        key={l.leave_id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 0",
                          borderBottom: "1px solid #f1f5f9",
                          gap: 8,
                        }}
                      >
                        <Space size={10}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: `${LEAVE_COLORS[l.leave_type.toLowerCase()] || "#94a3b8"}22`,
                              color: LEAVE_COLORS[l.leave_type.toLowerCase()] || "#64748b",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            {(l.employee_name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <div>
                            <Text style={{ fontSize: 13, fontWeight: 500, display: "block" }}>{l.employee_name}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>{l.job_title || "—"}</Text>
                          </div>
                        </Space>
                        <div style={{ textAlign: "right" }}>
                          <Tag color={LEAVE_COLORS[l.leave_type.toLowerCase()]} style={{ fontSize: 11, margin: 0 }}>
                            {l.leave_type}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                            Back {back.format("ddd D MMM")}
                          </Text>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="Everyone is in — no approved leave today" height={180} />
              )}
            </ProCard>
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
                isMobile ? undefined : (
                  <Tag color="purple" style={{ fontSize: 11 }}>
                    Unpaid runs: KES {fmtK(payrollStats.pending_payroll)}
                  </Tag>
                )
              }
            >
              {payrollChartData.every((m) => !m["Gross Pay"]) ? (
                <EmptyState text="No approved payroll in the last 6 months" height={isMobile ? 210 : 260} />
              ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 210 : 260}>
                <LineChart
                  data={payrollChartData}
                  margin={isMobile ? { top: 10, right: 10, left: -20, bottom: 0 } : { top: 10, right: 15, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtK(v)} />
                  <ReTooltip
                    formatter={(val: any) => `KES ${fmt(val || 0)}`}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Gross Pay" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Deductions" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Net Pay" stroke="#6366f1" strokeWidth={2.5} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
              )}
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
                    { label: "Dept", value: "dept" },
                    { label: "Status", value: "status" },
                    { label: "Type", value: "type" },
                    { label: "Tenure", value: "tenure" },
                    { label: "Leave", value: "leave" },
                    { label: "Gender", value: "gender" },
                  ]}
                />
              }
            >
              {demographicsTab === "dept" && (
                <>
                  {departmentBarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={isMobile ? 210 : 240}>
                      <BarChart
                        data={departmentBarData}
                        layout="vertical"
                        margin={isMobile ? { top: 10, right: 10, left: -10, bottom: 0 } : { top: 10, right: 15, left: 10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={isMobile ? 65 : 90}
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

              {demographicsTab === "status" && renderDonut(statusPieData, "No employee data available")}

              {demographicsTab === "type" && renderDonut(employmentTypeData, "No employment type data")}

              {demographicsTab === "tenure" &&
                (tenureData.some((t) => t.Employees > 0) ? (
                  <ResponsiveContainer width="100%" height={isMobile ? 210 : 240}>
                    <BarChart data={tenureData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <ReTooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                      <Bar dataKey="Employees" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="No hire dates recorded" height={240} />
                ))}

              {demographicsTab === "leave" && renderDonut(leavePieData, "No leave data this period")}

              {demographicsTab === "gender" && renderDonut(genderPieData, "No gender data available")}
            </ProCard>
          </Col>
        </Row>

        {/* ── Tier 3b: Payroll compliance & pipeline ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={14}>
            <ProCard
              title={<Text strong>Statutory Deductions</Text>}
              bordered
              size="small"
              style={{ height: "100%" }}
              extra={
                <Tag color="geekblue" style={{ fontSize: 11, margin: 0 }}>
                  KES {fmtK(statutoryTotal)} · {getFormattedDateRange()}
                </Tag>
              }
            >
              {statutoryData.length > 0 ? (
                <Row gutter={[16, 8]} align="middle">
                  <Col xs={24} md={10}>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={statutoryData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={75} innerRadius={45}>
                          {statutoryData.map((s) => (
                            <Cell key={s.key} fill={s.color} />
                          ))}
                        </Pie>
                        <ReTooltip formatter={(v: any) => `KES ${fmt(v || 0)}`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Col>
                  <Col xs={24} md={14}>
                    {statutoryData.map((s) => (
                      <div key={s.key} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <Space size={6}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                            <Text style={{ fontSize: 12, color: "#475569" }}>{s.label}</Text>
                          </Space>
                          <Text style={{ fontSize: 12, fontWeight: 600 }}>KES {fmt(s.value)}</Text>
                        </div>
                        <Progress
                          percent={statutoryTotal ? Math.round((s.value / statutoryTotal) * 100) : 0}
                          strokeColor={s.color}
                          size="small"
                          showInfo={false}
                          style={{ margin: 0 }}
                        />
                      </div>
                    ))}
                  </Col>
                </Row>
              ) : (
                <EmptyState text="No approved payroll in this period" height={180} />
              )}
            </ProCard>
          </Col>
          <Col xs={24} lg={10}>
            <ProCard
              title={<Text strong>Payroll Pipeline — Last 6 Months</Text>}
              bordered
              size="small"
              style={{ height: "100%" }}
              extra={
                payrollStats.pending_runs > 0 ? (
                  <Tag color="orange" style={{ fontSize: 11, margin: 0 }}>
                    {payrollStats.pending_runs} unpaid run{payrollStats.pending_runs === 1 ? "" : "s"}
                  </Tag>
                ) : undefined
              }
            >
              {pipeline.some((p) => p.count > 0) ? (
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  {pipeline.map((p) => {
                    const cfg = PIPELINE_STAGES[p.status];
                    const maxCount = Math.max(...pipeline.map((x) => x.count), 1);
                    return (
                      <div key={p.status}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <Space size={6}>
                            <Badge color={cfg.color} />
                            <Text style={{ fontSize: 12 }}>{cfg.label}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {p.count} run{p.count === 1 ? "" : "s"}
                            </Text>
                          </Space>
                          <Text style={{ fontSize: 12, fontWeight: 600 }}>KES {fmtK(p.amount)}</Text>
                        </div>
                        <Progress
                          percent={Math.round((p.count / maxCount) * 100)}
                          strokeColor={cfg.color}
                          size="small"
                          showInfo={false}
                          style={{ margin: 0 }}
                        />
                      </div>
                    );
                  })}
                </Space>
              ) : (
                <EmptyState text="No payroll runs in the last 6 months" height={180} />
              )}
            </ProCard>
          </Col>
        </Row>

        {/* ── Tier 3c: Headcount & attendance trends ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={12}>
            <ProCard
              title={<Text strong>Hires vs Exits — Last 6 Months</Text>}
              bordered
              size="small"
              bodyStyle={{ paddingTop: 8 }}
            >
              {headcountData.length > 0 ? (
                <ResponsiveContainer width="100%" height={isMobile ? 210 : 240}>
                  <ComposedChart data={headcountData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <ReTooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="Hires" fill="#10b981" radius={[3, 3, 0, 0]} barSize={14} />
                    <Bar yAxisId="left" dataKey="Exits" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={14} />
                    <Line yAxisId="right" type="monotone" dataKey="Headcount" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="No hire data yet" height={240} />
              )}
            </ProCard>
          </Col>
          <Col xs={24} lg={12}>
            <ProCard
              title={<Text strong>Daily Attendance</Text>}
              bordered
              size="small"
              bodyStyle={{ paddingTop: 8 }}
              extra={
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Staff clocked in per day (up to 14 days)
                </Text>
              }
            >
              {attendanceData.some((d) => d.Present > 0) ? (
                <ResponsiveContainer width="100%" height={isMobile ? 210 : 240}>
                  <BarChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} domain={[0, Math.max(trackedStaff, 1)]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <ReTooltip
                      formatter={(v: any) => [`${v} of ${trackedStaff}`, "Present"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Bar dataKey="Present" fill={primaryColor} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="No clock-ins recorded in this period" height={240} />
              )}
            </ProCard>
          </Col>
        </Row>

        {/* ── Tier 4: Unified Workforce Operations & Alerts Hub ── */}
        <ProCard
          bordered
          size="small"
          style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}
          bodyStyle={{ padding: "0 12px 12px", width: "100%", maxWidth: "100%" }}
          tabs={{
            type: "line",
            size: isMobile ? "small" : "middle",
            items: [
              {
                key: "pending-leave",
                label: (
                  <Space size={6}>
                    <AuditOutlined />
                    <span>{isMobile ? "Approvals" : "Leave Awaiting Approval"}</span>
                    {pendingLeaves.length > 0 && (
                      <Badge count={pendingLeaves.length} style={{ backgroundColor: "#f59e0b" }} />
                    )}
                  </Space>
                ),
                children: (
                  <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                    <Table
                      columns={pendingLeaveCols}
                      dataSource={pendingLeaves}
                      rowKey="leave_id"
                      pagination={{ pageSize: 5, size: "small" }}
                      size="small"
                      scroll={{ x: 560 }}
                      locale={{ emptyText: "No leave requests waiting for approval" }}
                    />
                  </div>
                ),
              },
              {
                key: "activities",
                label: (
                  <Space size={6}>
                    <HistoryOutlined />
                    <span>{isMobile ? "Activities" : "Recent Activities"}</span>
                    {recentActivities.length > 0 && (
                      <Badge count={recentActivities.length} style={{ backgroundColor: "#3b82f6" }} />
                    )}
                  </Space>
                ),
                children: (
                  <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                    <Table
                      columns={activityCols}
                      dataSource={recentActivities}
                      rowKey={(record) => `${record.type}-${record.timestamp}-${record.description}`}
                      pagination={{ pageSize: 5, size: "small" }}
                      size="small"
                      scroll={{ x: 480 }}
                      locale={{ emptyText: "No recent HR activities" }}
                    />
                  </div>
                ),
              },
              {
                key: "birthdays",
                label: (
                  <Space size={6}>
                    <GiftOutlined />
                    <span>{isMobile ? "Birthdays" : "Upcoming Birthdays"}</span>
                    {upcomingBirthdays.length > 0 && (
                      <Badge count={upcomingBirthdays.length} style={{ backgroundColor: "#10b981" }} />
                    )}
                  </Space>
                ),
                children: upcomingBirthdays.length > 0 ? (
                  <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                    <Table
                      columns={birthdayCols}
                      dataSource={upcomingBirthdays}
                      rowKey="employee_id"
                      pagination={{ pageSize: 5, size: "small" }}
                      size="small"
                      scroll={{ x: 480 }}
                    />
                  </div>
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
                    <span>{isMobile ? "Documents" : "Expiring Documents"}</span>
                    {expiringDocuments.length > 0 && (
                      <Badge count={expiringDocuments.length} style={{ backgroundColor: "#f59e0b" }} />
                    )}
                  </Space>
                ),
                children: expiringDocuments.length > 0 ? (
                  <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                    <Table
                      columns={documentCols}
                      dataSource={expiringDocuments}
                      rowKey={(record) => `${record.employee_id}-${record.document_name}`}
                      pagination={{ pageSize: 5, size: "small" }}
                      size="small"
                      scroll={{ x: 480 }}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 12 }}>
                    No documents expiring soon
                  </div>
                ),
              },
              {
                key: "anniversaries",
                label: (
                  <Space size={6}>
                    <TrophyOutlined />
                    <span>{isMobile ? "Anniversaries" : "Work Anniversaries"}</span>
                    {anniversaries.length > 0 && (
                      <Badge count={anniversaries.length} style={{ backgroundColor: "#8b5cf6" }} />
                    )}
                  </Space>
                ),
                children: (
                  <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                    <Table
                      columns={anniversaryCols}
                      dataSource={anniversaries}
                      rowKey="employee_id"
                      pagination={{ pageSize: 5, size: "small" }}
                      size="small"
                      scroll={{ x: 480 }}
                      locale={{ emptyText: "No work anniversaries in the next 30 days" }}
                    />
                  </div>
                ),
              },
            ],
          }}
        />

        {/* ── Staff Clock-In Link & QR modal ── */}
        <Modal
          open={clockLinkModalOpen}
          onCancel={() => setClockLinkModalOpen(false)}
          footer={null}
          width={420}
          title={
            <Space size={8}>
              <div
                style={{
                  background: `${primaryColor}15`,
                  borderRadius: 8,
                  padding: "4px 8px",
                  color: primaryColor,
                  fontSize: 16,
                  lineHeight: 1,
                  display: "inline-flex",
                }}
              >
                <QrcodeOutlined />
              </div>
              <span>Staff Clock-In Link & QR</span>
            </Space>
          }
        >
          <Text style={{ fontSize: 13, color: "#64748b", display: "block", marginBottom: 12 }}>
            Staff can clock in or out by opening this link (or scanning the QR) and entering their 4-digit PIN.
          </Text>
          <Tabs
            defaultActiveKey="qr"
            items={[
              {
                key: "qr",
                label: (
                  <Space size={5}>
                    <QrcodeOutlined />
                    QR Code
                  </Space>
                ),
                children: (
                  <Space direction="vertical" align="center" style={{ width: "100%" }} size={16}>
                    <div
                      style={{
                        padding: 20,
                        background: "#fff",
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                      }}
                    >
                      <QRCodeCanvas id="bandu-clock-qr" value={clockLinkUrl || " "} size={200} level="H" />
                    </div>
                    <Button
                      icon={<DownloadOutlined />}
                      type="primary"
                      onClick={() => {
                        const canvas = document.getElementById("bandu-clock-qr") as HTMLCanvasElement;
                        if (canvas) {
                          const a = document.createElement("a");
                          a.href = canvas.toDataURL("image/png");
                          a.download = "staff-clock-in-qr.png";
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          message.success("QR code downloaded");
                        }
                      }}
                      disabled={!clockLinkUrl}
                    >
                      Download QR Code
                    </Button>
                  </Space>
                ),
              },
              {
                key: "copy",
                label: (
                  <Space size={5}>
                    <CopyOutlined />
                    Copy URL
                  </Space>
                ),
                children: (
                  <Space direction="vertical" style={{ width: "100%" }} size="middle">
                    <div style={{ display: "flex", gap: 8 }}>
                      <Input
                        value={clockLinkUrl}
                        readOnly
                        style={{ flex: 1, fontFamily: "monospace", fontSize: 12, background: "#f8fafc" }}
                      />
                      <Button
                        icon={<CopyOutlined />}
                        type="primary"
                        onClick={() =>
                          navigator.clipboard
                            .writeText(clockLinkUrl)
                            .then(() => message.success("Link copied to clipboard"))
                            .catch(() => message.error("Failed to copy link"))
                        }
                      >
                        Copy
                      </Button>
                    </div>
                  </Space>
                ),
              },
            ]}
          />
        </Modal>
      </div>
    </App>
  );
};

export default BanduHRDashboard;
