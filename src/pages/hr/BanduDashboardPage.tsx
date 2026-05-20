import React, { useState } from "react";
import { Row, Col, Card, Statistic, Typography, Table, Tag, DatePicker, Button, Space } from "antd";
import {
  TeamOutlined, UserOutlined, CheckCircleOutlined,
  ClockCircleOutlined, FileTextOutlined, FallOutlined,
  DollarOutlined, PlusOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchLeaves, fetchAllAttendance } from "@services/hr/leave";
import { fetchAllUsersList } from "@services/users";
import { fetchDashboardSummary, fetchEmployeeProfiles } from "@services/hr";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

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

// ── HR Analytics Dashboard Component ───────────────────────────────────────────────
const BanduDashboardPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const navigate = useNavigate();

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
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            style={{ borderRadius: 8 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/hr/payroll")}>
            Process Payroll
          </Button>
        </Space>
      </div>

      {/* Dashboard Summary Cards */}
      {dashboard && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="On Leave Today"
                value={dashboard.today_attendance?.on_leave || 0}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: C.blue, fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Pending Leave Requests"
                value={dashboard.pending_leave_requests || 0}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: C.orange, fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={12}>
            <Card>
              <Statistic
                title="Monthly Payroll Status"
                value={dashboard.monthly_payroll?.status || "Not Processed"}
                prefix={<DollarOutlined />}
                valueStyle={{ color: dashboard.monthly_payroll?.status === "Processed" ? C.green : C.orange, fontSize: 16 }}
              />
              <div style={{ fontSize: 12, color: C.subText, marginTop: 4 }}>
                {dashboard.monthly_payroll?.pay_date && `Pay Date: ${dayjs(dashboard.monthly_payroll.pay_date).format("DD MMM YYYY")}`}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Employees"
              value={dashboard.total_employees || employeeStats?.total || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: C.blue, fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Employees"
              value={employeeStats?.active || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: C.green, fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="On Probation"
              value={employeeStats?.probation || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: C.orange, fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Suspended/Terminated"
              value={(employeeStats?.suspended || 0) + (employeeStats?.terminated || 0)}
              prefix={<FallOutlined />}
              valueStyle={{ color: C.red, fontSize: 24 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Attendance Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Today's Attendance" bordered={false}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Present"
                  value={dashboard.today_attendance?.present || attendanceStats?.present || 0}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: C.green }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Absent"
                  value={dashboard.today_attendance?.absent || attendanceStats?.absent || 0}
                  prefix={<FallOutlined />}
                  valueStyle={{ color: C.red }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Late"
                  value={dashboard.today_attendance?.late || attendanceStats?.late || 0}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: C.orange }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="On Leave"
                  value={dashboard.today_attendance?.on_leave || attendanceStats?.onLeave || 0}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: C.blue }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Leave Status" bordered={false}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Approved"
                  value={leaveStats?.approved || 0}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: C.green }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Pending"
                  value={leaveStats?.pending || 0}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: C.orange }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Rejected"
                  value={leaveStats?.rejected || 0}
                  prefix={<FallOutlined />}
                  valueStyle={{ color: C.red }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Total Requests"
                  value={leaveStats?.total || 0}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: C.blue }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Recent Activities */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Recent Leave Requests" bordered={false}>
            <Table
              columns={leaveColumns}
              dataSource={recentLeaves}
              loading={leavesLoading}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Recent Attendance" bordered={false}>
            <Table
              columns={attendanceColumns}
              dataSource={recentAttendance}
              loading={attendanceLoading}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BanduDashboardPage;
