import React, { useState } from "react";
import { Row, Col, Card, Statistic, Typography, Table, Tag, DatePicker } from "antd";
import {
  TeamOutlined, UserOutlined, CheckCircleOutlined,
  ClockCircleOutlined, FileTextOutlined, FallOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchLeaves, fetchAllAttendance } from "@services/hr/leave";
import { fetchAllUsersList } from "@services/users";
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
const BanduHRDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  // Fetch all HR data
  const { data: leavesData, isLoading: leavesLoading } = useQuery({
    queryKey: ["hr-leaves", dateRange],
    queryFn: () => fetchLeaves({}),
  });

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ["hr-attendance", dateRange],
    queryFn: () => fetchAllAttendance({}),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["hr-users"],
    queryFn: () => fetchAllUsersList({}),
  });

  const leaves = Array.isArray(leavesData) ? leavesData : leavesData?.leaves || [];
  const attendance = Array.isArray(attendanceData) ? attendanceData : attendanceData?.attendance || [];
  const users = Array.isArray(usersData) ? usersData : usersData?.users || [];

  // Calculate employee stats from users data (direct from API like staff-management)
  const employeeStats = users?.reduce(
    (acc: any, user: any) => {
      acc.total += 1;
      if (user.status === "Active") acc.active += 1;
      if (user.status === "Inactive") acc.inactive += 1;
      if (user.status === "Suspended") acc.suspended += 1;
      if (user.status === "Terminated") acc.terminated += 1;
      return acc;
    },
    { total: 0, active: 0, inactive: 0, suspended: 0, terminated: 0 }
  );

  console.log("[BanduHRDashboard] Users from API:", users.length);
  console.log("[BanduHRDashboard] Employee stats:", employeeStats);

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

  console.log("[BanduHRDashboard] Employee stats:", employeeStats);

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
        <RangePicker
          value={dateRange}
          onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          style={{ borderRadius: 8 }}
        />
      </div>

      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Employees"
              value={employeeStats?.total || 0}
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
              title="Suspended"
              value={employeeStats?.suspended || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: C.orange, fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Terminated"
              value={employeeStats?.terminated || 0}
              prefix={<FallOutlined />}
              valueStyle={{ color: C.red, fontSize: 24 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Attendance Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Attendance Overview" bordered={false}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Present"
                  value={attendanceStats?.present || 0}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: C.green }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Absent"
                  value={attendanceStats?.absent || 0}
                  prefix={<FallOutlined />}
                  valueStyle={{ color: C.red }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Late"
                  value={attendanceStats?.late || 0}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: C.orange }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="On Leave"
                  value={attendanceStats?.onLeave || 0}
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

export default BanduHRDashboard;
