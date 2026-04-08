import React, { useEffect, useMemo, useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
  CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  DollarOutlined, LockOutlined, RiseOutlined, WarningOutlined,
} from "@ant-design/icons";
import { Empty, Select, Skeleton, Tag, Typography } from "antd";
import { useAppSelector } from "src/store";
import RestaurantShiftSchedule from "./RestaurantShiftSchedule";
import StaffLeavePortal from "@pages/Settings/usersLevel/StaffLeavePortal";
import {
  fetchMyAttendance, fetchLeaveBalance,
  AttendanceSummary, LeaveBalance, LeaveType,
} from "@services/hr/leave";
import dayjs from "dayjs";
import { getPermissionChecker } from "@utils/getPermissionChecker";

const { Text } = Typography;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  darkText: "#0f172a",
  subText: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  white: "#ffffff",
};

// ── Bandu gate ────────────────────────────────────────────────────────────────
const isBanduEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem("tenant");
    if (!stored) return false;
    const tenant = JSON.parse(stored);
    return tenant?.modules?.payroll === true;
  } catch {
    return false;
  }
};

// ── Width hook ────────────────────────────────────────────────────────────────
const useWindowWidth = () => {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
};

// ── Tab label ─────────────────────────────────────────────────────────────────
const TabLabel: React.FC<{
  icon: React.ReactNode; label: string; color: string;
  comingSoon?: boolean; isMobile: boolean; locked?: boolean;
}> = ({ icon, label, color, comingSoon, isMobile, locked }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
    <span style={{ color: locked ? "#cbd5e1" : color, fontSize: 14, lineHeight: 1, display: "flex" }}>
      {locked ? <LockOutlined /> : icon}
    </span>
    {!isMobile && (
      <Text style={{ fontSize: 13, fontWeight: 500, color: locked ? "#94a3b8" : C.darkText }}>
        {label}
      </Text>
    )}
    {comingSoon && !isMobile && !locked && (
      <Tag style={{
        background: "#f0f9ff", color: C.blue, border: "none",
        borderRadius: 4, fontSize: 9, fontWeight: 700,
        padding: "1px 5px", lineHeight: "14px",
      }}>
        Soon
      </Tag>
    )}
  </span>
);

// ── Bandu locked placeholder ──────────────────────────────────────────────────
const BanduLockedTab: React.FC = () => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "60px 24px", textAlign: "center",
  }}>
    <div style={{
      width: 64, height: 64, borderRadius: 16, background: "#fff8ed",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 28, color: C.orange, marginBottom: 20,
    }}>
      <LockOutlined />
    </div>
    <Text strong style={{ fontSize: 16, color: C.darkText, display: "block", marginBottom: 8 }}>
      Bandu by Base is not enabled
    </Text>
    <Text style={{ fontSize: 13, color: C.subText, maxWidth: 360, lineHeight: 1.6 }}>
      Enable Bandu by Base from the <strong>Discover</strong> page to unlock
      Leave, Attendance, and Payroll features.
    </Text>
  </div>
);

// ── Permission locked placeholder ─────────────────────────────────────────────
const PermissionLockedTab: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "60px 24px", textAlign: "center",
  }}>
    <div style={{
      width: 64, height: 64, borderRadius: 16, background: "#f8fafc",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 28, color: "#cbd5e1", marginBottom: 20,
    }}>
      <LockOutlined />
    </div>
    <Text strong style={{ fontSize: 16, color: C.darkText, display: "block", marginBottom: 8 }}>
      Access restricted
    </Text>
    <Text style={{ fontSize: 13, color: C.subText, maxWidth: 360, lineHeight: 1.6 }}>
      You don't have permission to access <strong>{label}</strong>.
      Contact your administrator to request access.
    </Text>
  </div>
);

// ── Range options ─────────────────────────────────────────────────────────────
const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const LEAVE_TYPE_COLOR: Record<string, string> = {
  Annual: C.blue,
  Sick: C.red,
  Emergency: C.orange,
  Maternity: C.purple,
  Paternity: "#6366f1",
  Unpaid: C.subText,
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string; value: string; sub: string;
  icon: React.ReactNode; iconBg: string; iconColor: string;
  accent: string;
}> = ({ label, value, sub, icon, iconBg, iconColor, accent }) => (
  <div style={{
    background: C.white, border: `1px solid ${C.border}`,
    borderRadius: 10, padding: "12px 14px",
    position: "relative", overflow: "hidden",
    transition: "box-shadow 0.15s", minWidth: 0,
  }}
    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
  >
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0,
      height: 3, background: accent, borderRadius: "10px 10px 0 0",
    }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
      <Text style={{
        fontSize: 10, color: C.subText, fontWeight: 500,
        letterSpacing: "0.3px", textTransform: "uppercase", lineHeight: 1.4,
      }}>
        {label}
      </Text>
      <div style={{
        background: iconBg, color: iconColor,
        borderRadius: 6, padding: "3px 5px", fontSize: 12, lineHeight: 1, flexShrink: 0,
      }}>
        {icon}
      </div>
    </div>
    <div style={{ fontSize: 20, fontWeight: 700, color: C.darkText, lineHeight: 1.1, marginBottom: 2 }}>
      {value}
    </div>
    <div style={{ fontSize: 11, color: C.subText }}>{sub}</div>
  </div>
);

// ── Skeleton cards ────────────────────────────────────────────────────────────
const SkeletonCards: React.FC<{ count: number; cols: number }> = ({ count, cols }) => (
  <>
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 10, marginBottom: 16,
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          height: 88, background: "#f1f5f9",
          borderRadius: 10, animation: "pulse 1.5s ease-in-out infinite",
        }} />
      ))}
    </div>
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
  </>
);

// ── Leave balance pills ───────────────────────────────────────────────────────
const BalancePills: React.FC<{ balances: LeaveBalance[]; cols: number }> = ({ balances, cols }) => {
  if (!balances.length) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <Text style={{
        fontSize: 11, color: C.subText, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.4px",
        display: "block", marginBottom: 10,
      }}>
        Leave Balance
      </Text>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
        {balances.map((b) => {
          const pct = b.entitled > 0 ? Math.round((b.remaining / b.entitled) * 100) : 0;
          const barColor = pct > 50 ? C.green : pct > 20 ? C.orange : C.red;
          const typeColor = LEAVE_TYPE_COLOR[b.leave_type as LeaveType] || C.blue;
          return (
            <div key={b.leave_type} style={{
              background: C.white, border: `1px solid ${C.border}`,
              borderTop: `3px solid ${typeColor}`,
              borderRadius: 10, padding: "12px 12px 10px",
            }}>
              <Text style={{
                fontSize: 10, color: C.subText, display: "block",
                marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.3px",
              }}>
                {b.leave_type}
              </Text>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 2 }}>
                <Text strong style={{ fontSize: 22, color: barColor, lineHeight: 1 }}>{b.remaining}</Text>
                <Text style={{ fontSize: 12, color: C.subText }}>/{b.entitled}</Text>
              </div>
              <Text style={{ fontSize: 10, color: C.subText }}>days remaining</Text>
              <div style={{ marginTop: 8, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${pct}%`, background: barColor,
                  borderRadius: 2, transition: "width 0.3s",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Attendance list ───────────────────────────────────────────────────────────
const AttendanceList: React.FC<{ records: AttendanceSummary[]; isMobile: boolean }> = ({ records, isMobile }) => {
  const STATUS: Record<string, { color: string; bg: string }> = {
    Present: { color: C.green, bg: "#f0fdf4" },
    Late: { color: C.orange, bg: "#fffbeb" },
    Absent: { color: C.red, bg: "#fef2f2" },
    "On Leave": { color: C.blue, bg: "#eff6ff" },
    "Public Holiday": { color: C.purple, bg: "#faf5ff" },
  };

  if (!records.length) return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={<Text style={{ fontSize: 13, color: C.subText }}>No records for this period</Text>}
      style={{ padding: "32px 0" }}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {records.map((r) => {
        const cfg = STATUS[r.status] || STATUS.Absent;
        return (
          <div key={r._id} style={{
            background: C.white, border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${cfg.color}`,
            borderRadius: 8, padding: "10px 14px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 8, flexWrap: "wrap",
          }}>
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>
                {dayjs(r.date).format(isMobile ? "DD MMM YY" : "ddd, DD MMM YYYY")}
              </Text>
              {r.shift_id && (
                <Text style={{ fontSize: 11, color: C.subText }}>
                  {r.shift_id.startTime} – {r.shift_id.endTime}
                </Text>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              {r.actual_hours > 0 && (
                <Text style={{ fontSize: 11, color: C.subText }}>{r.actual_hours.toFixed(1)}h</Text>
              )}
              <Tag style={{
                background: cfg.bg, color: cfg.color,
                border: "none", borderRadius: 6,
                fontSize: 11, fontWeight: 600, padding: "2px 10px", margin: 0,
              }}>
                {r.status}
              </Tag>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── My analytics panel ────────────────────────────────────────────────────────
const MyAnalyticsPanel: React.FC<{ width: number }> = ({ width }) => {
  const isMobile = width < 768;
  const statCols = width < 480 ? 2 : width < 768 ? 2 : width < 1024 ? 3 : 6;
  const balanceCols = width < 480 ? 2 : width < 768 ? 3 : 4;

  const { user } = useAppSelector((s) => s.auth);

  const [days, setDays] = useState("30");
  const [records, setRecords] = useState<AttendanceSummary[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loadingAtt, setLoadingAtt] = useState(true);
  const [loadingBal, setLoadingBal] = useState(true);

  useEffect(() => {
    setLoadingAtt(true);
    const from = dayjs().subtract(Number(days), "day").format("YYYY-MM-DD");
    const to = dayjs().format("YYYY-MM-DD");
    fetchMyAttendance({ from, to, limit: "100" })
      .then((d) => setRecords(d?.summaries || []))
      .catch(() => { })
      .finally(() => setLoadingAtt(false));
  }, [days]);

  useEffect(() => {
    if (!user?.id) return;
    setLoadingBal(true);
    fetchLeaveBalance(user.id)
      .then((d) => setBalances(d?.balances || []))
      .catch(() => { })
      .finally(() => setLoadingBal(false));
  }, [user?.id]);

  const stats = useMemo(() => {
    const present = records.filter((r) => r.status === "Present").length;
    const late = records.filter((r) => r.status === "Late").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const onLeave = records.filter((r) => r.status === "On Leave").length;
    const totalHrs = records.reduce((s, r) => s + (r.actual_hours || 0), 0);
    const overtime = records.reduce((s, r) => s + (r.overtime_hours || 0), 0);
    const worked = present + late + absent;
    const rate = worked > 0 ? Math.round(((present + late) / worked) * 100) : 0;
    return { present, late, absent, onLeave, totalHrs, overtime, rate, total: records.length };
  }, [records]);

  const cards = [
    {
      label: "Present", value: String(stats.present),
      sub: `of ${stats.total} days`,
      icon: <CheckCircleOutlined />, iconBg: "#f0fdf4", iconColor: C.green, accent: C.green,
    },
    {
      label: "Late", value: String(stats.late),
      sub: stats.late > 0 ? "days late" : "all on time",
      icon: <ClockCircleOutlined />,
      iconBg: stats.late > 0 ? "#fffbeb" : "#f0fdf4",
      iconColor: stats.late > 0 ? C.orange : C.green,
      accent: stats.late > 0 ? C.orange : C.green,
    },
    {
      label: "Absent", value: String(stats.absent),
      sub: stats.absent > 0 ? "days missed" : "none",
      icon: <WarningOutlined />,
      iconBg: stats.absent > 0 ? "#fef2f2" : "#f0fdf4",
      iconColor: stats.absent > 0 ? C.red : C.green,
      accent: stats.absent > 0 ? C.red : C.green,
    },
    {
      label: "On Leave", value: String(stats.onLeave),
      sub: "approved days",
      icon: <CalendarOutlined />, iconBg: "#eff6ff", iconColor: C.blue, accent: C.blue,
    },
    {
      label: "Hours", value: `${stats.totalHrs.toFixed(1)}h`,
      sub: `${stats.overtime.toFixed(1)}h overtime`,
      icon: <RiseOutlined />, iconBg: C.primaryLight, iconColor: C.primary, accent: C.primary,
    },
    {
      label: "Att. Rate", value: `${stats.rate}%`,
      sub: "present + late",
      icon: <CheckCircleOutlined />,
      iconBg: stats.rate >= 80 ? "#f0fdf4" : stats.rate >= 60 ? "#fffbeb" : "#fef2f2",
      iconColor: stats.rate >= 80 ? C.green : stats.rate >= 60 ? C.orange : C.red,
      accent: stats.rate >= 80 ? C.green : stats.rate >= 60 ? C.orange : C.red,
    },
  ];

  return (
    <div style={{ padding: isMobile ? "14px 14px" : "20px 20px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <Select
          value={days} onChange={setDays} size="small"
          style={{ width: isMobile ? "100%" : 150 }}
          options={RANGE_OPTIONS}
        />
      </div>
      {loadingAtt && !records.length ? (
        <SkeletonCards count={6} cols={statCols} />
      ) : (
        <div style={{
          display: "grid", gridTemplateColumns: `repeat(${statCols}, 1fr)`,
          gap: 10, marginBottom: 18,
        }}>
          {cards.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      )}
      {loadingBal
        ? <Skeleton active paragraph={{ rows: 2 }} style={{ marginBottom: 18 }} />
        : <BalancePills balances={balances} cols={balanceCols} />
      }
      <Text style={{
        fontSize: 11, color: C.subText, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.4px",
        display: "block", marginBottom: 10,
      }}>
        Attendance History
      </Text>
      {loadingAtt ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{
            background: C.white, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "12px 14px", marginBottom: 6,
          }}>
            <Skeleton active paragraph={false} />
          </div>
        ))
      ) : (
        <AttendanceList records={records} isMobile={isMobile} />
      )}
    </div>
  );
};

// ── Payroll coming soon ───────────────────────────────────────────────────────
const PayrollComingSoon: React.FC = () => (
  <div style={{
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "56px 24px", textAlign: "center",
  }}>
    <div style={{
      width: 64, height: 64, borderRadius: 16, background: "#f0fdf4",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 28, color: C.green, marginBottom: 18,
    }}>
      <DollarOutlined />
    </div>
    <Text strong style={{ fontSize: 16, color: C.darkText, display: "block", marginBottom: 8 }}>
      Payroll is coming soon
    </Text>
    <Text style={{ fontSize: 13, color: C.subText, maxWidth: 340, lineHeight: 1.7 }}>
      Salary calculations, payslips, deductions, and tax summaries —
      all linked to your shifts and attendance.
    </Text>
    <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap", justifyContent: "center" }}>
      {["Salary", "Payslips", "Deductions", "Tax summaries"].map((f) => (
        <Tag key={f} style={{
          background: C.bg, color: C.subText,
          border: `1px solid ${C.border}`,
          borderRadius: 6, fontSize: 11, padding: "3px 12px",
        }}>
          {f}
        </Tag>
      ))}
    </div>
  </div>
);

// ─── Tab permission map ───────────────────────────────────────────────────────
//  Shifts   → SHIFTS_VIEW              (core, always mounted)
//  Leave    → HR_LEAVE_VIEW_BALANCE    (staff see own balance) +  HR_LEAVE_VIEW (managers see all)
//  Attendance → HR_ATTENDANCE_VIEW_MY  (self) — HR_ATTENDANCE_VIEW_ALL for managers
//  Payroll  → no specific perm yet (coming soon placeholder, gated by Bandu only)
//
// Strategy: use the least-restrictive HR perm so regular staff can still see their own tab.

const TAB_PERMISSIONS: Record<string, string> = {
  shifts: "SHIFTS_VIEW",
  leave: "HR_LEAVE_VIEW_BALANCE",      // staff self-service minimum
  attendance: "HR_ATTENDANCE_VIEW_MY", // staff self-service minimum
};

// ── Main ──────────────────────────────────────────────────────────────────────
const EmployeePage: React.FC = () => {
  const width = useWindowWidth();
  const isMobile = width < 768;
  const banduEnabled = isBanduEnabled();

  // Admin users bypass all checks via makePermissionChecker(isAdmin=true)
  const can = useMemo(() => getPermissionChecker(), []);

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <ProCard
        bordered
        style={{ borderRadius: 12, width: "100%" }}
        bodyStyle={{ padding: 0 }}
        tabs={{
          type: "card",
          defaultActiveKey: "shifts",
          size: "middle",
          style: { marginBottom: 0 },
          tabBarStyle: {
            margin: 0,
            padding: isMobile ? "0 8px" : "0 16px",
          },
          tabBarGutter: isMobile ? 2 : 8,
        }}
      >
        {/* ── Shifts — always visible, permission: SHIFTS_VIEW ──────────── */}
        <ProCard.TabPane
          key="shifts"
          tab={
            <TabLabel
              icon={<ClockCircleOutlined />}
              label="Shifts"
              color={C.blue}
              isMobile={isMobile}
              locked={!can(TAB_PERMISSIONS.shifts)}
            />
          }
        >
          {can(TAB_PERMISSIONS.shifts)
            ? <RestaurantShiftSchedule />
            : <PermissionLockedTab label="Shifts" />}
        </ProCard.TabPane>

        {/* ── My Leave — Bandu + HR_LEAVE_VIEW_BALANCE ─────────────────── */}
        {banduEnabled && (
          <ProCard.TabPane
            key="leave"
            tab={
              <TabLabel
                icon={<CalendarOutlined />}
                label="My Leave"
                color={C.orange}
                isMobile={isMobile}
                locked={!can(TAB_PERMISSIONS.leave)}
              />
            }
          >
            {can(TAB_PERMISSIONS.leave)
              ? <StaffLeavePortal />
              : <PermissionLockedTab label="My Leave" />}
          </ProCard.TabPane>
        )}

        {/* ── Attendance — Bandu + HR_ATTENDANCE_VIEW_MY ───────────────── */}
        {banduEnabled && (
          <ProCard.TabPane
            key="attendance"
            tab={
              <TabLabel
                icon={<RiseOutlined />}
                label="Attendance"
                color={C.purple}
                isMobile={isMobile}
                locked={!can(TAB_PERMISSIONS.attendance)}
              />
            }
          >
            {can(TAB_PERMISSIONS.attendance)
              ? <MyAnalyticsPanel width={width} />
              : <PermissionLockedTab label="Attendance" />}
          </ProCard.TabPane>
        )}

        {/* ── Payroll — Bandu only, coming soon (no perm gate yet) ─────── */}
        {banduEnabled && (
          <ProCard.TabPane
            key="payroll"
            tab={
              <TabLabel
                icon={<DollarOutlined />}
                label="Payroll"
                color={C.green}
                comingSoon
                isMobile={isMobile}
              />
            }
          >
            <PayrollComingSoon />
          </ProCard.TabPane>
        )}
      </ProCard>
    </div>
  );
};

export default EmployeePage;