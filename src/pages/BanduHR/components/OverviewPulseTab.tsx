import React from "react";
import { Row, Col, Typography, Space, Progress, Badge, Tag, Button } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  AuditOutlined,
  FileProtectOutlined,
  ArrowRightOutlined,
  ScheduleOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import { LEAVE_COLORS } from "./constants";
import { EmptyState, StatTile } from "./SharedUI";

const { Text } = Typography;

export interface OverviewPulseTabProps {
  attendanceStats: {
    present_today: number;
    clocked_in_now?: number;
    absent_today: number;
    tracked_staff?: number;
  };
  onLeaveToday: Array<{
    leave_id: string;
    employee_name: string;
    job_title?: string;
    leave_type: string;
    end_date: string;
  }>;
  attendanceTrend: Array<{
    label: string;
    present: number;
  }>;
  pendingLeaves: Array<{
    leave_id: string;
    employee_name: string;
    leave_type: string;
    start_date: string;
    end_date: string;
  }>;
  expiringDocuments: Array<{
    employee_id: string;
    fullname: string;
    document_name: string;
    days_until: number;
  }>;
  leaveBalance?: {
    used: number;
    entitled: number;
    remaining: number;
  };
  primaryColor: string;
  isMobile: boolean;
  onNavigateToOperations: (subTab?: string) => void;
}

export const OverviewPulseTab: React.FC<OverviewPulseTabProps> = ({
  attendanceStats,
  onLeaveToday,
  attendanceTrend,
  pendingLeaves,
  expiringDocuments,
  leaveBalance,
  primaryColor,
  isMobile,
  onNavigateToOperations,
}) => {
  const trackedStaff = attendanceStats.tracked_staff || 0;
  const todayBreakdown = [
    { label: "Present", value: attendanceStats.present_today || 0, color: "#10b981" },
    { label: "Clocked in now", value: attendanceStats.clocked_in_now || 0, color: "#3b82f6" },
    { label: "On leave", value: onLeaveToday.length, color: "#f59e0b" },
    { label: "Not clocked in", value: attendanceStats.absent_today || 0, color: "#ef4444" },
  ];

  const attendanceData = (attendanceTrend || []).map((d) => ({
    name: d.label,
    Present: d.present,
  }));

  const leaveUsedPct = leaveBalance?.entitled
    ? Math.min(100, Math.round((leaveBalance.used / leaveBalance.entitled) * 100))
    : 0;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {/* ── Today's Pulse Row ── */}
      <Row gutter={[16, 16]}>
        {/* Today at a Glance */}
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
                  <div
                    style={{
                      background: `${t.color}0f`,
                      borderRadius: 8,
                      padding: "8px 10px",
                      border: `1px solid ${t.color}33`,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>{t.label}</Text>
                    <Text strong style={{ fontSize: 20, color: t.color }}>{t.value}</Text>
                  </div>
                </Col>
              ))}
            </Row>
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: "#64748b" }}>Turn-out Rate</Text>
                <Text style={{ fontSize: 12, fontWeight: 600 }}>
                  {attendanceStats.present_today} / {trackedStaff} staff
                </Text>
              </div>
              <Progress
                percent={trackedStaff ? Math.round((attendanceStats.present_today / trackedStaff) * 100) : 0}
                strokeColor="#10b981"
                size="small"
                style={{ margin: 0 }}
              />
              {trackedStaff === 0 && (
                <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: "block" }}>
                  Link employees to user accounts to track their clock-ins here.
                </Text>
              )}
            </div>
          </ProCard>
        </Col>

        {/* Who's Out Today */}
        <Col xs={24} lg={14}>
          <ProCard
            title={
              <Space size={6}>
                <Text strong>Who's Out Today</Text>
                {onLeaveToday.length > 0 && (
                  <Badge count={onLeaveToday.length} style={{ backgroundColor: "#f59e0b" }} />
                )}
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
                  const color = LEAVE_COLORS[l.leave_type.toLowerCase()] || "#94a3b8";
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
                            background: `${color}22`,
                            color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 600,
                            fontSize: 12,
                          }}
                        >
                          {(l.employee_name || "?")
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <Text style={{ fontSize: 13, fontWeight: 500, display: "block" }}>{l.employee_name}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>{l.job_title || "—"}</Text>
                        </div>
                      </Space>
                      <div style={{ textAlign: "right" }}>
                        <Tag color={color} style={{ fontSize: 11, margin: 0 }}>
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
              <EmptyState text="Everyone is in — no approved leave today" height={190} />
            )}
          </ProCard>
        </Col>
      </Row>

      {/* ── Attendance Trend & Action Items Mini-Deck ── */}
      <Row gutter={[16, 16]}>
        {/* Daily Attendance Trend */}
        <Col xs={24} lg={15}>
          <ProCard
            title={<Text strong>Daily Attendance Trend</Text>}
            bordered
            size="small"
            bodyStyle={{ paddingTop: 8 }}
            extra={
              <Text type="secondary" style={{ fontSize: 11 }}>
                Staff clocked in per day (last 14 days)
              </Text>
            }
          >
            {attendanceData.some((d) => d.Present > 0) ? (
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 230}>
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
              <EmptyState text="No clock-ins recorded in this period" height={220} />
            )}
          </ProCard>
        </Col>

        {/* Quick Action Alerts & Leave Usage */}
        <Col xs={24} lg={9}>
          <ProCard
            title={<Text strong>Urgent Action Center</Text>}
            bordered
            size="small"
            style={{ height: "100%" }}
            extra={
              <Button
                type="link"
                size="small"
                onClick={() => onNavigateToOperations("pending-leave")}
                style={{ padding: 0, fontSize: 12 }}
              >
                View all <ArrowRightOutlined />
              </Button>
            }
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {/* Pending Approvals quick alert */}
              <div
                onClick={() => onNavigateToOperations("pending-leave")}
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Space size={10}>
                  <AuditOutlined style={{ color: "#f59e0b", fontSize: 18 }} />
                  <div>
                    <Text strong style={{ fontSize: 12, color: "#92400e", display: "block" }}>
                      {pendingLeaves.length} Leave Request{pendingLeaves.length === 1 ? "" : "s"} Pending
                    </Text>
                    <Text style={{ fontSize: 11, color: "#b45309" }}>
                      Requires manager approval
                    </Text>
                  </div>
                </Space>
                <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>Review</Tag>
              </div>

              {/* Expiring Docs quick alert */}
              <div
                onClick={() => onNavigateToOperations("documents")}
                style={{
                  background: expiringDocuments.length > 0 ? "#fef2f2" : "#f8fafc",
                  border: `1px solid ${expiringDocuments.length > 0 ? "#fecaca" : "#e2e8f0"}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Space size={10}>
                  <FileProtectOutlined style={{ color: expiringDocuments.length > 0 ? "#ef4444" : "#64748b", fontSize: 18 }} />
                  <div>
                    <Text strong style={{ fontSize: 12, color: expiringDocuments.length > 0 ? "#991b1b" : "#334155", display: "block" }}>
                      {expiringDocuments.length} Expiring Document{expiringDocuments.length === 1 ? "" : "s"}
                    </Text>
                    <Text style={{ fontSize: 11, color: expiringDocuments.length > 0 ? "#b91c1c" : "#64748b" }}>
                      Expiring within 60 days
                    </Text>
                  </div>
                </Space>
                <Tag color={expiringDocuments.length > 0 ? "error" : "default"} style={{ margin: 0, fontSize: 11 }}>
                  {expiringDocuments.length > 0 ? "Check" : "None"}
                </Tag>
              </div>

              {/* Leave Days Used Tile */}
              <StatTile
                label="Annual Leave Days Used"
                value={`${leaveUsedPct}%`}
                hint={`${leaveBalance?.used || 0} of ${leaveBalance?.entitled || 0} days · ${leaveBalance?.remaining || 0} left`}
                icon={<ScheduleOutlined />}
                color="#0ea5e9"
                tooltip={`Leave balances for ${dayjs().year()}`}
              />
            </Space>
          </ProCard>
        </Col>
      </Row>
    </Space>
  );
};
