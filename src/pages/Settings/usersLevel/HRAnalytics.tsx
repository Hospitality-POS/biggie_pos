import React, { useEffect, useMemo, useState } from "react";
import { Typography } from "antd";
import {
    CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined,
    CloseCircleOutlined, RiseOutlined, WarningOutlined,
} from "@ant-design/icons";
import { fetchLeaves, fetchAllAttendance, Leave } from "@services/hr/leave";

const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
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

// ── Stats type ────────────────────────────────────────────────────────────────
interface HRStats {
    totalStaff: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
    onLeaveToday: number;
    pendingLeave: number;
    approvedLeave: number;
    avgAttendanceRate: number;
}

const computeStats = (attendance: any[], leaves: Leave[]): HRStats => {
    const present = attendance.filter((r) => r.status === "Present").length;
    const absent = attendance.filter((r) => r.status === "Absent").length;
    const late = attendance.filter((r) => r.status === "Late").length;
    const onLeave = attendance.filter((r) => r.status === "On Leave").length;
    const pending = leaves.filter((l) => l.status === "Pending").length;
    const approved = leaves.filter((l) => l.status === "Approved").length;
    const worked = present + late + absent;
    const avgRate = worked > 0 ? Math.round(((present + late) / worked) * 100) : 0;
    return {
        totalStaff: attendance.length, presentToday: present,
        absentToday: absent, lateToday: late, onLeaveToday: onLeave,
        pendingLeave: pending, approvedLeave: approved, avgAttendanceRate: avgRate,
    };
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const SkeletonStrip: React.FC<{ cols: number; count: number }> = ({ cols, count }) => (
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

// ── Single stat card ──────────────────────────────────────────────────────────
interface CardDef {
    label: string; value: string; sub: string;
    icon: React.ReactNode; iconBg: string; iconColor: string; accent: string;
}

const StatCard: React.FC<{ card: CardDef }> = ({ card }) => (
    <div
        style={{
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
            height: 3, background: card.accent, borderRadius: "10px 10px 0 0",
        }} />
        <div style={{
            display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", marginBottom: 6,
        }}>
            <Text style={{
                fontSize: 10, color: C.subText, fontWeight: 500,
                letterSpacing: "0.3px", textTransform: "uppercase", lineHeight: 1.4,
                maxWidth: "72%",
            }}>
                {card.label}
            </Text>
            <div style={{
                background: card.iconBg, color: card.iconColor,
                borderRadius: 6, padding: "3px 5px", fontSize: 12, lineHeight: 1, flexShrink: 0,
            }}>
                {card.icon}
            </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.darkText, lineHeight: 1.1, marginBottom: 2 }}>
            {card.value}
        </div>
        <div style={{ fontSize: 10, color: C.subText }}>{card.sub}</div>
    </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const HRAnalytics: React.FC = () => {
    const width = useWindowWidth();
    const cols = width < 480 ? 2 : width < 768 ? 2 : width < 1024 ? 3 : 6;
    const banduEnabled = isBanduEnabled();

    const [attendance, setAttendance] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!banduEnabled) { setLoading(false); return; }
        const today = new Date().toISOString().split("T")[0];
        Promise.all([
            fetchAllAttendance({ from: today, to: today, limit: "200", view: "summary" }),
            fetchLeaves({ limit: "200" }),
        ])
            .then(([attData, leaveData]) => {
                setAttendance(attData?.records || []);
                setLeaves(leaveData?.leaves || []);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [banduEnabled]);

    const stats = useMemo(() => computeStats(attendance, leaves), [attendance, leaves]);

    // Don't render anything if Bandu is not enabled
    if (!banduEnabled) return null;

    const cards: CardDef[] = [
        {
            label: "Present Today",
            value: String(stats.presentToday),
            sub: `${stats.totalStaff} staff scheduled`,
            icon: <CheckCircleOutlined />, iconBg: "#f0fdf4", iconColor: C.green, accent: C.green,
        },
        {
            label: "Absent Today",
            value: String(stats.absentToday),
            sub: stats.absentToday > 0 ? "needs attention" : "all clear",
            icon: <WarningOutlined />,
            iconBg: stats.absentToday > 0 ? "#fef2f2" : "#f0fdf4",
            iconColor: stats.absentToday > 0 ? C.red : C.green,
            accent: stats.absentToday > 0 ? C.red : C.green,
        },
        {
            label: "Late Arrivals",
            value: String(stats.lateToday),
            sub: "today",
            icon: <ClockCircleOutlined />,
            iconBg: stats.lateToday > 0 ? "#fffbeb" : "#f0fdf4",
            iconColor: stats.lateToday > 0 ? C.orange : C.green,
            accent: stats.lateToday > 0 ? C.orange : C.green,
        },
        {
            label: "On Leave",
            value: String(stats.onLeaveToday),
            sub: `${stats.approvedLeave} approved total`,
            icon: <CalendarOutlined />, iconBg: "#eff6ff", iconColor: C.blue, accent: C.blue,
        },
        {
            label: "Pending Leave",
            value: String(stats.pendingLeave),
            sub: stats.pendingLeave > 0 ? "awaiting approval" : "none pending",
            icon: <CloseCircleOutlined />,
            iconBg: stats.pendingLeave > 0 ? "#fdf2f4" : "#f0fdf4",
            iconColor: stats.pendingLeave > 0 ? C.primary : C.green,
            accent: stats.pendingLeave > 0 ? C.primary : C.green,
        },
        {
            label: "Attendance Rate",
            value: `${stats.avgAttendanceRate}%`,
            sub: "present + late / scheduled",
            icon: <RiseOutlined />, iconBg: C.primaryLight, iconColor: C.primary, accent: C.primary,
        },
    ];

    if (loading) {
        return <SkeletonStrip cols={cols} count={cards.length} />;
    }

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 10, marginBottom: 16,
            width: "100%",
        }}>
            {cards.map((card) => (
                <StatCard key={card.label} card={card} />
            ))}
        </div>
    );
};

export default HRAnalytics;