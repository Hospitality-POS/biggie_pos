import React, { useState } from "react";
import { Tabs, Typography, Card, Row, Col, Statistic, Table, Tag, DatePicker } from "antd";
import {
  FileTextOutlined,
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchLeaves, fetchAllAttendance } from "@services/hr/leave";
import { fetchAllUsersList } from "@services/users";
import dayjs from "dayjs";

const { Text } = Typography;
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

// ── Leave Reports ────────────────────────────────────────────────────────────────
const LeaveReports: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  const { data: leavesData, isLoading } = useQuery({
    queryKey: ["leave-report", dateRange],
    queryFn: () => fetchLeaves({}),
  });

  const leaves = Array.isArray(leavesData) ? leavesData : leavesData?.leaves || [];

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

  const columns = [
    {
      title: "Employee",
      dataIndex: "staff_id",
      render: (staff: any) => (
        <Text style={{ fontSize: 13 }}>{staff?.fullname || staff || "—"}</Text>
      ),
    },
    {
      title: "Leave Type",
      dataIndex: "leave_type",
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          Approved: "green",
          Pending: "orange",
          Rejected: "red",
          Cancelled: "default",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      render: (date: string) => (
        <Text style={{ fontSize: 12, color: C.subText }}>
          {date ? dayjs(date).format("DD MMM YYYY") : "—"}
        </Text>
      ),
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      render: (date: string) => (
        <Text style={{ fontSize: 12, color: C.subText }}>
          {date ? dayjs(date).format("DD MMM YYYY") : "—"}
        </Text>
      ),
    },
    {
      title: "Days",
      dataIndex: "days",
      render: (days: number) => <Text style={{ fontSize: 13 }}>{days || 0}</Text>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text strong style={{ fontSize: 14 }}>Leave Reports</Text>
        <RangePicker
          value={dateRange}
          onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          style={{ borderRadius: 8 }}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Requests"
              value={leaveStats?.total || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: C.blue, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Approved"
              value={leaveStats?.approved || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: C.green, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Pending"
              value={leaveStats?.pending || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: C.orange, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Rejected"
              value={leaveStats?.rejected || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: C.red, fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={leaves || []}
          loading={isLoading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </div>
  );
};

// ── Attendance Reports ────────────────────────────────────────────────────────────
const AttendanceReports: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["attendance-report", dateRange],
    queryFn: () => fetchAllAttendance({}),
  });

  const attendance = Array.isArray(attendanceData) ? attendanceData : attendanceData?.attendance || [];

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

  const columns = [
    {
      title: "Employee",
      dataIndex: "staff_id",
      render: (staff: any) => (
        <Text style={{ fontSize: 13 }}>{staff?.fullname || staff || "—"}</Text>
      ),
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date: string) => (
        <Text style={{ fontSize: 12, color: C.subText }}>
          {date ? dayjs(date).format("DD MMM YYYY") : "—"}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          Present: "green",
          Absent: "red",
          Late: "orange",
          "On Leave": "blue",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Check In",
      dataIndex: "check_in",
      render: (time: string) => (
        <Text style={{ fontSize: 12 }}>{time || "—"}</Text>
      ),
    },
    {
      title: "Check Out",
      dataIndex: "check_out",
      render: (time: string) => (
        <Text style={{ fontSize: 12 }}>{time || "—"}</Text>
      ),
    },
    {
      title: "Hours Worked",
      dataIndex: "hours_worked",
      render: (hours: number) => <Text style={{ fontSize: 13 }}>{hours?.toFixed(1) || 0}h</Text>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text strong style={{ fontSize: 14 }}>Attendance Reports</Text>
        <RangePicker
          value={dateRange}
          onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          style={{ borderRadius: 8 }}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Records"
              value={attendanceStats?.total || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: C.blue, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Present"
              value={attendanceStats?.present || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: C.green, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Absent"
              value={attendanceStats?.absent || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: C.red, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Late"
              value={attendanceStats?.late || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: C.orange, fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={attendance || []}
          loading={isLoading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </div>
  );
};

// ── Employee Reports ──────────────────────────────────────────────────────────────
const EmployeeReports: React.FC = () => {
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["employees-report"],
    queryFn: () => fetchAllUsersList({}),
  });

  const users = Array.isArray(usersData) ? usersData : usersData?.users || [];

  const employeeStats = users?.reduce(
    (acc: any, user: any) => {
      acc.total += 1;
      if (user.status === "active") acc.active += 1;
      if (user.status === "inactive") acc.inactive += 1;
      if (user.role) acc.roles[user.role] = (acc.roles[user.role] || 0) + 1;
      return acc;
    },
    { total: 0, active: 0, inactive: 0, roles: {} as Record<string, number> }
  );

  const roleData = Object.entries(employeeStats?.roles || {}).map(([role, count]) => ({
    role,
    count: count as number,
  }));

  const columns = [
    {
      title: "Employee Name",
      dataIndex: "fullname",
      render: (name: string) => <Text strong style={{ fontSize: 13 }}>{name}</Text>,
    },
    {
      title: "Email",
      dataIndex: "email",
      render: (email: string) => <Text style={{ fontSize: 12, color: C.subText }}>{email || "—"}</Text>,
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (role: string) => <Tag color="purple">{role}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => {
        const color = status === "active" ? "green" : "red";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Department",
      dataIndex: "department",
      render: (dept: string) => <Text style={{ fontSize: 12 }}>{dept || "—"}</Text>,
    },
  ];

  const roleColumns = [
    {
      title: "Role",
      dataIndex: "role",
      render: (role: string) => <Text strong style={{ fontSize: 13 }}>{role}</Text>,
    },
    {
      title: "Count",
      dataIndex: "count",
      render: (count: number) => <Text style={{ fontSize: 13 }}>{count}</Text>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 14 }}>Employee Reports</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Total Employees"
              value={employeeStats?.total || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: C.blue, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Active"
              value={employeeStats?.active || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: C.green, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Inactive"
              value={employeeStats?.inactive || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: C.red, fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Employee Directory">
            <Table
              columns={columns}
              dataSource={users || []}
              loading={isLoading}
              rowKey="_id"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Role Distribution">
            <Table
              columns={roleColumns}
              dataSource={roleData}
              rowKey="role"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// ── Role Reports ─────────────────────────────────────────────────────────────────
const RoleReports: React.FC = () => {
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["roles-report"],
    queryFn: () => fetchAllUsersList({}),
  });

  const users = Array.isArray(usersData) ? usersData : usersData?.users || [];

  const roleStats = users?.reduce(
    (acc: any, user: any) => {
      acc.total += 1;
      if (user.role) {
        acc.roles[user.role] = (acc.roles[user.role] || 0) + 1;
      }
      return acc;
    },
    { total: 0, roles: {} as Record<string, number> }
  );

  const roleData = Object.entries(roleStats?.roles || {}).map(([role, count]) => ({
    role,
    count: count as number,
    percentage: ((count as number / roleStats.total) * 100).toFixed(1),
  }));

  const columns = [
    {
      title: "Role",
      dataIndex: "role",
      render: (role: string) => <Text strong style={{ fontSize: 13 }}>{role}</Text>,
    },
    {
      title: "Employees",
      dataIndex: "count",
      render: (count: number) => <Text style={{ fontSize: 13 }}>{count}</Text>,
    },
    {
      title: "Percentage",
      dataIndex: "percentage",
      render: (pct: string) => <Text style={{ fontSize: 13 }}>{pct}%</Text>,
    },
    {
      title: "Distribution",
      dataIndex: "percentage",
      render: (pct: string) => (
        <div style={{ minWidth: 120 }}>
          <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: C.primary,
                borderRadius: 3,
              }}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 14 }}>Role Reports</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Roles"
              value={Object.keys(roleStats?.roles || {}).length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: C.purple, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Employees"
              value={roleStats?.total || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: C.blue, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="Avg Employees per Role"
              value={
                Object.keys(roleStats?.roles || {}).length > 0
                  ? (roleStats.total / Object.keys(roleStats.roles).length).toFixed(1)
                  : 0
              }
              prefix={<UserOutlined />}
              valueStyle={{ color: C.green, fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Role Distribution">
        <Table
          columns={columns}
          dataSource={roleData}
          loading={isLoading}
          rowKey="role"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

// ── Main Bandu Reports Component ───────────────────────────────────────────────────
const BanduReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("leave");

  const tabItems = [
    {
      key: "leave",
      label: (
        <span>
          <FileTextOutlined /> Leave Reports
        </span>
      ),
      children: <LeaveReports />,
    },
    {
      key: "attendance",
      label: (
        <span>
          <CalendarOutlined /> Attendance Reports
        </span>
      ),
      children: <AttendanceReports />,
    },
    {
      key: "employees",
      label: (
        <span>
          <UserOutlined /> Employee Reports
        </span>
      ),
      children: <EmployeeReports />,
    },
    {
      key: "roles",
      label: (
        <span>
          <TeamOutlined /> Role Reports
        </span>
      ),
      children: <RoleReports />,
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        tabBarStyle={{ marginBottom: 20 }}
      />
    </div>
  );
};

export default BanduReports;
