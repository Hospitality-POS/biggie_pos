import React, { useState } from "react";
import { Calendar, Badge, Card, Select, Space, Typography, Tag, Spin, Empty, Tooltip } from "antd";
import { CalendarOutlined, UserOutlined, TeamOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchLeaves, Leave, LeaveStatus } from "@services/bandu";
import dayjs, { Dayjs } from "dayjs";
import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Text, Title } = Typography;

// ── Status Colors ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<LeaveStatus, string> = {
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
    <div style={{ padding: 24 }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <Space align="center">
          <div
            style={{
              background: `${primaryColor}15`,
              borderRadius: 10,
              padding: "8px 10px",
              color: primaryColor,
              fontSize: 20,
            }}
          >
            <CalendarOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Leave Calendar
            </Title>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              Track your leave and team schedules
            </Text>
          </div>
        </Space>

        <Space>
          <Select
            value={viewMode}
            onChange={setViewMode}
            style={{ width: 120 }}
            options={[
              { label: "All Leaves", value: "all" },
              { label: "My Leaves", value: "my" },
            ]}
          />
        </Space>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <Card size="small" style={{ flex: 1, minWidth: 140 }}>
          <Space>
            <TeamOutlined style={{ color: primaryColor, fontSize: 18 }} />
            <div>
              <Text style={{ fontSize: 12, color: "#64748b", display: "block" }}>Total Leaves</Text>
              <Text strong style={{ fontSize: 18 }}>{summaryStats.total}</Text>
            </div>
          </Space>
        </Card>
        <Card size="small" style={{ flex: 1, minWidth: 140 }}>
          <Space>
            <UserOutlined style={{ color: STATUS_COLORS.Pending, fontSize: 18 }} />
            <div>
              <Text style={{ fontSize: 12, color: "#64748b", display: "block" }}>Pending</Text>
              <Text strong style={{ fontSize: 18 }}>{summaryStats.pending}</Text>
            </div>
          </Space>
        </Card>
        <Card size="small" style={{ flex: 1, minWidth: 140 }}>
          <Space>
            <UserOutlined style={{ color: STATUS_COLORS.Approved, fontSize: 18 }} />
            <div>
              <Text style={{ fontSize: 12, color: "#64748b", display: "block" }}>Approved</Text>
              <Text strong style={{ fontSize: 18 }}>{summaryStats.approved}</Text>
            </div>
          </Space>
        </Card>
        <Card size="small" style={{ flex: 1, minWidth: 140 }}>
          <Space>
            <CalendarOutlined style={{ color: STATUS_COLORS.Approved, fontSize: 18 }} />
            <div>
              <Text style={{ fontSize: 12, color: "#64748b", display: "block" }}>On Leave Today</Text>
              <Text strong style={{ fontSize: 18 }}>{summaryStats.onLeave}</Text>
            </div>
          </Space>
        </Card>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <Text style={{ fontSize: 12, color: "#64748b" }}>Status:</Text>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <Tag key={status} color={color} style={{ fontSize: 11, margin: 0 }}>
            {status}
          </Tag>
        ))}
      </div>

      {/* ── Calendar ── */}
      <Card>
        <Calendar
          value={selectedMonth}
          onChange={setSelectedMonth}
          dateCellRender={dateCellRender}
          monthCellRender={monthCellRender}
          fullscreen
        />
      </Card>

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
