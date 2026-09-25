import React, { useState } from "react";
import {
  Table,
  Button,
  Tag,
  Space,
  Typography,
  DatePicker,
  Row,
  Col,
  Empty,
  Avatar,
  Popconfirm,
  Tooltip,
} from "antd";
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  CalendarOutlined,
  ReloadOutlined,
  FieldTimeOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllAttendance, fetchClockStatus, deleteClockRecord } from "@services/hr/leave";
import { getUser } from "@services/tenants";
import dayjs from "dayjs";
import { THEME_C } from "@utils/getPrimaryColor";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const C = THEME_C;

// ── Dashboard-style card ──────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div style={{ ...cardStyle, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: `${color}15`,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>{title}</Text>
      <Text strong style={{ fontSize: 18, color, lineHeight: 1.2 }}>
        {value}
      </Text>
    </div>
  </div>
);

const AttendanceTracking: React.FC = () => {
  const queryClient = useQueryClient();
  const user = getUser();
  const isAdmin = user?.role === "admin" || user?.isAdmin === true;
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  // Fetch raw clock records — attendance is keyed to staff (User), not Employee
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["attendance", dateRange],
    queryFn: () =>
      fetchAllAttendance({
        from: dateRange[0].format("YYYY-MM-DD"),
        to: dateRange[1].format("YYYY-MM-DD"),
        view: "raw",
        limit: 200,
      }),
  });

  const clocks = attendanceData?.clocks || attendanceData?.records || [];

  // Fetch clock status (display only — clock in/out happens on the HR dashboard)
  const { data: clockStatus } = useQuery({
    queryKey: ["clock-status"],
    queryFn: fetchClockStatus,
    refetchInterval: 60000,
  });

  const hoursFor = (record: any) =>
    record.clock_out
      ? Math.max(0, (new Date(record.clock_out).getTime() - new Date(record.clock_in).getTime()) / 3600000)
      : null;

  const stats = clocks.reduce(
    (acc: { sessions: number; active: number; hours: number; staff: Set<string> }, r: any) => {
      acc.sessions += 1;
      if (!r.clock_out) acc.active += 1;
      const h = hoursFor(r);
      if (h != null) acc.hours += h;
      if (r.staff_id?._id) acc.staff.add(r.staff_id._id);
      return acc;
    },
    { sessions: 0, active: 0, hours: 0, staff: new Set<string>() }
  );

  const columns = [
    {
      title: "Staff",
      dataIndex: ["staff_id", "fullname"],
      key: "fullname",
      render: (_: unknown, record: any) => (
        <Space size={8}>
          <Avatar
            size={28}
            src={record.staff_id?.thumbnail}
            style={{ background: `${C.primary}15`, color: C.primary }}
          >
            {(record.staff_id?.fullname || record.staff_id?.username || "?").charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text style={{ fontSize: 13, fontWeight: 500, display: "block" }}>
              {record.staff_id?.fullname || record.staff_id?.username || "—"}
            </Text>
            {record.staff_id?.username && record.staff_id?.fullname && (
              <Text style={{ fontSize: 11, color: "#94a3b8" }}>@{record.staff_id.username}</Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: "Date",
      dataIndex: "clock_in",
      key: "date",
      render: (time: string) => (
        <Text style={{ fontSize: 12 }}>{dayjs(time).format("DD MMM YYYY")}</Text>
      ),
    },
    {
      title: "Clock In",
      dataIndex: "clock_in",
      key: "clock_in",
      render: (time: string) => (
        <Text style={{ fontSize: 12, color: "#10b981" }}>{time ? dayjs(time).format("HH:mm") : "—"}</Text>
      ),
    },
    {
      title: "Clock Out",
      dataIndex: "clock_out",
      key: "clock_out",
      render: (time: string) => (
        <Text style={{ fontSize: 12, color: time ? "#3b82f6" : "#94a3b8" }}>
          {time ? dayjs(time).format("HH:mm") : "—"}
        </Text>
      ),
    },
    {
      title: "Hours",
      key: "hours",
      align: "right" as const,
      render: (_: unknown, record: any) => {
        const h = hoursFor(record);
        return (
          <Text style={{ fontSize: 12 }}>
            {h != null ? `${h.toFixed(1)}h` : "Running"}
          </Text>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      render: (_: unknown, record: any) =>
        record.clock_out ? (
          <Tag color="green" style={{ margin: 0 }}>Completed</Tag>
        ) : (
          <Tag color="orange" icon={<ClockCircleOutlined />} style={{ margin: 0 }}>
            Clocked In
          </Tag>
        ),
    },
    // Admin-only: delete a session
    ...(isAdmin
      ? [
          {
            title: "",
            key: "actions",
            width: 50,
            render: (_: unknown, record: any) => (
              <Popconfirm
                title="Delete this session?"
                description="Removes the clock record and its attendance summary."
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => deleteClockRecord(record._id).then(() =>
                  queryClient.invalidateQueries({ queryKey: ["attendance"] })
                )}
              >
                <Tooltip title="Delete session">
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: C.darkText }}>
            <ClockCircleOutlined style={{ marginRight: 8, color: C.primary }} />
            Attendance Tracking
          </Title>
          <Text style={{ fontSize: 12, color: "#64748b" }}>
            {stats.sessions} session{stats.sessions !== 1 ? "s" : ""} ·{" "}
            {dateRange[0].format("DD MMM")} – {dateRange[1].format("DD MMM YYYY")}
          </Text>
        </div>
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            style={{ borderRadius: 8 }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ["attendance"] })}
            loading={isLoading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Today's status (read-only — clock in/out on HR dashboard) */}
      <div
        style={{
          ...cardStyle,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Space size={8}>
          <FieldTimeOutlined style={{ color: C.primary, fontSize: 16 }} />
          <Text strong style={{ fontSize: 13 }}>Your Status Today</Text>
          <Tag
            color={clockStatus?.clocked_in ? "green" : clockStatus?.clocked_out ? "blue" : "default"}
            style={{ margin: 0 }}
          >
            {clockStatus?.clocked_in ? "Clocked In" : clockStatus?.clocked_out ? "Clocked Out" : "Not Clocked In"}
          </Tag>
        </Space>
        <Space size={16}>
          {clockStatus?.clock_in && (
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              Clocked in at <Text strong>{dayjs(clockStatus.clock_in).format("HH:mm")}</Text>
            </Text>
          )}
          {clockStatus?.hours_so_far != null && (
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              Hours: <Text strong>{Number(clockStatus.hours_so_far).toFixed(1)}h</Text>
            </Text>
          )}
        </Space>
      </div>

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <StatCard title="Sessions" value={stats.sessions} icon={<CalendarOutlined />} color="#3b82f6" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="Staff" value={stats.staff.size} icon={<TeamOutlined />} color="#8b5cf6" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="Active Now" value={stats.active} icon={<ClockCircleOutlined />} color="#f59e0b" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="Total Hours" value={`${stats.hours.toFixed(1)}h`} icon={<CheckCircleOutlined />} color="#10b981" />
        </Col>
      </Row>

      {/* Table */}
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <Table
          columns={columns}
          dataSource={clocks}
          loading={isLoading}
          rowKey="_id"
          size="small"
          pagination={{ pageSize: 15 }}
          locale={{
            emptyText: (
              <Empty
                description="No clock-in records for this period"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: "32px 0" }}
              />
            ),
          }}
        />
      </div>
    </div>
  );
};

export default AttendanceTracking;
