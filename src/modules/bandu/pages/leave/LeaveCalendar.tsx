import React, { useState } from "react";
import { Calendar, Badge, Select, Space, Typography, Tag, Spin, Empty, Tooltip } from "antd";
import { CalendarOutlined, UserOutlined, TeamOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchLeaves, Leave, LeaveStatus } from "@services/bandu";
import dayjs, { Dayjs } from "dayjs";
import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Text, Title } = Typography;

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
  <div
    style={{
      ...cardStyle,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      flex: 1,
      minWidth: 150,
    }}
  >
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

// ── Status Colors ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<LeaveStatus | "Scheduled" | (string & {}), string> = {
  Pending: "#f59e0b",
  Approved: "#10b981",
  Rejected: "#ef4444",
  Cancelled: "#64748b",
  Scheduled: "#8b5cf6",
};

// ── Leave Calendar Component ───────────────────────────────────────────────────

const LeaveCalendar: React.FC = () => {
  const primaryColor = usePrimaryColor();
  const [viewMode, setViewMode] = useState<"all" | "my">("all");
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());

  // Get current user ID for "my" view
  const getCurrentUserId = (): string => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user?._id || user?.id || "";
    } catch {
      return "";
    }
  };

  const currentUserId = getCurrentUserId();

  // Fetch leaves for the selected month
  const { data: leavesData, isLoading } = useQuery({
    queryKey: ["leaves-calendar", selectedMonth.format("YYYY-MM")],
    queryFn: async () => {
      const startDate = selectedMonth.startOf("month").toISOString();
      const endDate = selectedMonth.endOf("month").toISOString();
      return await fetchLeaves({ start_date: startDate, end_date: endDate });
    },
  });

  const leaves = Array.isArray(leavesData) ? leavesData : leavesData?.leaves || [];

  // Filter leaves based on view mode
  const filteredLeaves = leaves.filter((leave: Leave) => {
    if (viewMode === "my") {
      return leave.requested_by?._id === currentUserId;
    }
    return true;
  });

  // Group leaves by date for calendar display
  const getLeavesByDate = (date: Dayjs) => {
    const dateStr = date.format("YYYY-MM-DD");
    return filteredLeaves.filter((leave: Leave) => {
      const leaveStart = dayjs(leave.start_date).format("YYYY-MM-DD");
      const leaveEnd = dayjs(leave.end_date).format("YYYY-MM-DD");
      return dateStr >= leaveStart && dateStr <= leaveEnd;
    });
  };

  // Calendar cell renderer
  const dateCellRender = (value: Dayjs) => {
    const dayLeaves = getLeavesByDate(value);
    if (dayLeaves.length === 0) return null;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
        {dayLeaves.slice(0, 3).map((leave: Leave) => (
          <Tooltip
            key={leave._id}
            title={
              <div>
                <div><strong>{leave.requested_by?.fullname || "Unknown"}</strong></div>
                <div>{leave.leave_type} - {leave.days_requested} day(s)</div>
                <div>Status: {leave.status}</div>
                {leave.reason && <div>Reason: {leave.reason}</div>}
              </div>
            }
          >
            <Badge
              color={STATUS_COLORS[leave.status] || "#64748b"}
              text={
                <Text
                  ellipsis
                  style={{
                    fontSize: 11,
                    color: STATUS_COLORS[leave.status] || "#64748b",
                    maxWidth: 80,
                  }}
                >
                  {leave.requested_by?.fullname?.split(" ")[0] || "Unknown"}
                </Text>
              }
            />
          </Tooltip>
        ))}
        {dayLeaves.length > 3 && (
          <Text style={{ fontSize: 10, color: "#64748b" }}>
            +{dayLeaves.length - 3} more
          </Text>
        )}
      </div>
    );
  };

  // Month cell renderer for summary view
  const monthCellRender = (value: Dayjs) => {
    const monthLeaves = filteredLeaves.filter((leave: Leave) => {
      const leaveMonth = dayjs(leave.start_date).format("YYYY-MM");
      return leaveMonth === value.format("YYYY-MM");
    });

    if (monthLeaves.length === 0) return null;

    return (
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {monthLeaves.slice(0, 3).map((leave: Leave) => (
          <Badge
            key={leave._id}
            color={STATUS_COLORS[leave.status] || "#64748b"}
            text={leave.leave_type}
          />
        ))}
        {monthLeaves.length > 3 && (
          <Text style={{ fontSize: 11, color: "#64748b" }}>
            +{monthLeaves.length - 3}
          </Text>
        )}
      </div>
    );
  };

  // Calculate summary stats
  const summaryStats = {
    total: filteredLeaves.length,
    pending: filteredLeaves.filter((l: Leave) => l.status === "Pending").length,
    approved: filteredLeaves.filter((l: Leave) => l.status === "Approved").length,
    onLeave: filteredLeaves.filter((l: Leave) => {
      const today = dayjs();
      const start = dayjs(l.start_date);
      const end = dayjs(l.end_date);
      return l.status === "Approved" && (today.isSame(start, "day") || today.isAfter(start, "day")) && (today.isSame(end, "day") || today.isBefore(end, "day"));
    }).length,
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%" }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <CalendarOutlined style={{ marginRight: 8, color: primaryColor }} />
            Leave Calendar
          </Title>
          <Text style={{ fontSize: 12, color: "#64748b" }}>
            {selectedMonth.format("MMMM YYYY")} · track your leave and team schedules
          </Text>
        </div>

        <Space wrap>
          <Select
            value={viewMode}
            onChange={setViewMode}
            style={{ width: 130 }}
            options={[
              { label: "All Leaves", value: "all" },
              { label: "My Leaves", value: "my" },
            ]}
          />
        </Space>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <StatCard title="Total Leaves" value={summaryStats.total} icon={<TeamOutlined />} color={primaryColor} />
        <StatCard title="Pending" value={summaryStats.pending} icon={<ClockCircleOutlined />} color={STATUS_COLORS.Pending} />
        <StatCard title="Approved" value={summaryStats.approved} icon={<UserOutlined />} color={STATUS_COLORS.Approved} />
        <StatCard title="On Leave Today" value={summaryStats.onLeave} icon={<CalendarOutlined />} color="#8b5cf6" />
      </div>

      {/* ── Legend ── */}
      <div
        style={{
          ...cardStyle,
          display: "flex",
          gap: 14,
          marginBottom: 16,
          padding: "8px 14px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>STATUS</Text>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <Tag key={status} color={color} style={{ fontSize: 11, margin: 0 }}>
            {status}
          </Tag>
        ))}
      </div>

      {/* ── Calendar ── */}
      <div style={{ ...cardStyle, padding: 8 }}>
        <Calendar
          value={selectedMonth}
          onChange={setSelectedMonth}
          dateCellRender={dateCellRender}
          monthCellRender={monthCellRender}
          fullscreen
        />
      </div>

      {/* ── Empty State ── */}
      {filteredLeaves.length === 0 && !isLoading && (
        <Empty
          description="No leave requests found for this period"
          style={{ marginTop: 24 }}
        />
      )}
    </div>
  );
};

export default LeaveCalendar;
