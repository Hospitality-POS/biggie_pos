import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Row, Col, Typography, Table, Tag, DatePicker, Space, Select, Spin, Alert } from "antd";
import {
  TeamOutlined, CheckCircleOutlined,
  ClockCircleOutlined, FileTextOutlined, FallOutlined,
  ArrowUpOutlined, ArrowDownOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchLeaves, fetchAllAttendance } from "@services/hr/leave";
import { fetchDashboardSummary, fetchEmployeeProfiles } from "@services/hr";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import dayjs, { Dayjs } from "dayjs";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

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

// ── KPI Card Component (similar to Accounting Dashboard) ───────────────────────────
interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  pctChange?: number | null;
  suffix?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title, value, icon, color, bg, pctChange, suffix,
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
    {/* decorative circle */}
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
        {value.toLocaleString()}
        {suffix && <span style={{ fontSize: 13, marginLeft: 4, color: "#64748b" }}>{suffix}</span>}
      </Text>
      {pctChange !== null && pctChange !== undefined && (
        <Space size={4}>
          {pctChange >= 0 ? (
            <ArrowUpOutlined style={{ color: "#10b981", fontSize: 11 }} />
          ) : (
            <ArrowDownOutlined style={{ color: "#ef4444", fontSize: 11 }} />
          )}
          <Text style={{ fontSize: 11, color: pctChange >= 0 ? "#10b981" : "#ef4444" }}>
            {Math.abs(pctChange)}% vs last period
          </Text>
        </Space>
      )}
    </Space>
  </div>
);

// ── HR Analytics Dashboard Component ───────────────────────────────────────────────
const BanduDashboardPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [dateFilter, setDateFilter] = useState<string>("month");

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    const now = dayjs();
    switch (value) {
      case "day":
        setDateRange([now.startOf("day"), now.endOf("day")]);
        break;
      case "week":
        setDateRange([now.startOf("week"), now.endOf("week")]);
        break;
      case "month":
        setDateRange([now.startOf("month"), now.endOf("month")]);
        break;
      case "year":
        setDateRange([now.startOf("year"), now.endOf("year")]);
        break;
      case "custom":
        // Keep current range for custom
        break;
    }
  };

  // Fetch dashboard summary from new HR API
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["hr-dashboard-summary"],
    queryFn: () => fetchDashboardSummary(),
  });

  // Fetch employee profiles from new HR API
  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ["hr-employee-profiles"],
    queryFn: () => fetchEmployeeProfiles({}),
  });

  // Fetch leaves (legacy API)
  const { data: leavesData, isLoading: leavesLoading } = useQuery({
    queryKey: ["hr-leaves", dateRange],
    queryFn: () => fetchLeaves({}),
  });

  // Fetch attendance (legacy API)
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ["hr-attendance", dateRange],
    queryFn: () => fetchAllAttendance({}),
  });

  const dashboard = dashboardData?.dashboard || {};
  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.profiles || [];
  const leaves = Array.isArray(leavesData) ? leavesData : leavesData?.leaves || [];
  const attendance = Array.isArray(attendanceData) ? attendanceData : attendanceData?.attendance || [];

  // Calculate employee stats from new API
  const employeeStats = employees?.reduce(
    (acc: any, emp: any) => {
      acc.total += 1;
      if (emp.employee_status === "Active") acc.active += 1;
      if (emp.employee_status === "On Probation") acc.probation += 1;
      if (emp.employee_status === "Suspended") acc.suspended += 1;
      if (emp.employee_status === "Terminated") acc.terminated += 1;
      if (emp.employee_status === "Resigned") acc.resigned += 1;
      return acc;
    },
    { total: 0, active: 0, probation: 0, suspended: 0, terminated: 0, resigned: 0 }
  );

  // Calculate statistics
  const leaveStats = leaves?.reduce(
    (acc: any, leave: any) => {
      acc.total += 1;
      if (leave.status === "Approved") acc.approved += 1;
      if (leave.status === "Pending") acc.pending += 1;
      if (leave.status === "Rejected") acc.rejected += 1;
      return acc;
    },
    { total: 0, approved: 0, pending: 0, rejected: 0 }
  );

  const attendanceStats = attendance?.reduce(
    (acc: any, record: any) => {
      acc.total += 1;
      if (record.status === "Present") acc.present += 1;
      if (record.status === "Absent") acc.absent += 1;
      if (record.status === "Late") acc.late += 1;
      if (record.status === "On Leave") acc.onLeave += 1;
      return acc;
    },
    { total: 0, present: 0, absent: 0, late: 0, onLeave: 0 }
  );

  // Recent activities
  const recentLeaves = leaves?.slice(0, 5);
  const recentAttendance = attendance?.slice(0, 5);

  const leaveColumns = [
    { title: "Employee", dataIndex: "staff_id", render: (staff: any) => staff?.fullname || staff },
    { title: "Type", dataIndex: "leave_type", render: (type: string) => <Tag color="blue">{type}</Tag> },
    { title: "Status", dataIndex: "status", render: (status: string) => {
      const colorMap: Record<string, string> = { Approved: "green", Pending: "orange", Rejected: "red" };
      return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
    }},
    { title: "Days", dataIndex: "days" },
  ];

  const attendanceColumns = [
    { title: "Employee", dataIndex: "staff_id", render: (staff: any) => staff?.fullname || staff },
    { title: "Date", dataIndex: "date", render: (date: string) => dayjs(date).format("DD MMM") },
    { title: "Status", dataIndex: "status", render: (status: string) => {
      const colorMap: Record<string, string> = { Present: "green", Absent: "red", Late: "orange", "On Leave": "blue" };
      return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
    }},
    { title: "Hours", dataIndex: "hours_worked", render: (h: number) => h?.toFixed(1) || 0 },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={3} style={{ margin: 0, color: C.darkText }}>
          <TeamOutlined style={{ marginRight: 8, color: C.primary }} />
          HR & Payroll Dashboard
        </Title>
        <Space>
          <Select
            value={dateFilter}
            onChange={handleDateFilterChange}
            style={{ width: 120, borderRadius: 8 }}
          >
            <Select.Option value="day">Today</Select.Option>
            <Select.Option value="week">This Week</Select.Option>
            <Select.Option value="month">This Month</Select.Option>
            <Select.Option value="year">This Year</Select.Option>
            <Select.Option value="custom">Custom</Select.Option>
          </Select>
          {dateFilter === "custom" && (
            <RangePicker
              value={dateRange}
              onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
              style={{ borderRadius: 8 }}
            />
          )}
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Total Employees"
            value={dashboard.total_employees || employeeStats?.total || 0}
            icon={<TeamOutlined />}
            color={C.blue}
            bg="#eff6ff"
            pctChange={5}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Active Employees"
            value={employeeStats?.active || 0}
            icon={<CheckCircleOutlined />}
            color={C.green}
            bg="#ecfdf5"
            pctChange={2}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="On Leave Today"
            value={dashboard.today_attendance?.on_leave || attendanceStats?.onLeave || 0}
            icon={<FileTextOutlined />}
            color={C.blue}
            bg="#eff6ff"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Pending Leave Requests"
            value={dashboard.pending_leave_requests || 0}
            icon={<ClockCircleOutlined />}
            color={C.orange}
            bg="#fff7ed"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="On Probation"
            value={employeeStats?.probation || 0}
            icon={<ClockCircleOutlined />}
            color={C.orange}
            bg="#fff7ed"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Present Today"
            value={dashboard.today_attendance?.present || attendanceStats?.present || 0}
            icon={<CheckCircleOutlined />}
            color={C.green}
            bg="#ecfdf5"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Absent Today"
            value={dashboard.today_attendance?.absent || attendanceStats?.absent || 0}
            icon={<FallOutlined />}
            color={C.red}
            bg="#fef2f2"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Late Today"
            value={dashboard.today_attendance?.late || attendanceStats?.late || 0}
            icon={<ClockCircleOutlined />}
            color={C.orange}
            bg="#fff7ed"
          />
        </Col>
      </Row>


      {/* Charts Section */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <ProCard title="Employee Status Distribution" bordered={false} headerBordered>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: "Active", value: employeeStats?.active || 0, fill: C.green },
                { name: "On Probation", value: employeeStats?.probation || 0, fill: C.orange },
                { name: "Suspended", value: employeeStats?.suspended || 0, fill: C.red },
                { name: "Terminated", value: employeeStats?.terminated || 0, fill: "#6b7280" },
                { name: "Resigned", value: employeeStats?.resigned || 0, fill: "#8b5cf6" },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ReTooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </ProCard>
        </Col>
        <Col xs={24} lg={12}>
          <ProCard title="Leave Applications by Status" bordered={false} headerBordered>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Approved", value: leaveStats?.approved || 0, fill: C.green },
                    { name: "Pending", value: leaveStats?.pending || 0, fill: C.orange },
                    { name: "Rejected", value: leaveStats?.rejected || 0, fill: C.red },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill={C.green} />
                  <Cell fill={C.orange} />
                  <Cell fill={C.red} />
                </Pie>
                <ReTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ProCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <ProCard title="Attendance Trend" bordered={false} headerBordered>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[
                { name: "Mon", present: 45, absent: 3, late: 2 },
                { name: "Tue", present: 47, absent: 2, late: 1 },
                { name: "Wed", present: 46, absent: 3, late: 1 },
                { name: "Thu", present: 48, absent: 1, late: 1 },
                { name: "Fri", present: 44, absent: 4, late: 2 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke={C.green} strokeWidth={2} name="Present" />
                <Line type="monotone" dataKey="absent" stroke={C.red} strokeWidth={2} name="Absent" />
                <Line type="monotone" dataKey="late" stroke={C.orange} strokeWidth={2} name="Late" />
              </LineChart>
            </ResponsiveContainer>
          </ProCard>
        </Col>
      </Row>

      {/* Recent Activities */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <ProCard title="Recent Leave Requests" bordered={false} headerBordered>
            <Table
              columns={leaveColumns}
              dataSource={recentLeaves}
              loading={leavesLoading}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </ProCard>
        </Col>
        <Col xs={24} lg={12}>
          <ProCard title="Recent Attendance" bordered={false} headerBordered>
            <Table
              columns={attendanceColumns}
              dataSource={recentAttendance}
              loading={attendanceLoading}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </ProCard>
        </Col>
      </Row>
    </div>
  );
};

export default BanduDashboardPage;
