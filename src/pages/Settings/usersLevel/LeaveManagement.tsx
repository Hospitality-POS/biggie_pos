import React, { useEffect, useState } from "react";
import {
    Avatar, Button, Empty, message,
    Popconfirm, Select, Skeleton, Tag, Typography,
} from "antd";
import {
    CalendarOutlined, CheckCircleOutlined,
    CloseCircleOutlined, ReloadOutlined, UserOutlined,
} from "@ant-design/icons";
import {
    approveLeave, rejectLeave, cancelLeave, fetchLeaves,
    fetchLeaveBalance, Leave, LeaveBalance, LeaveStatus, LeaveType,
} from "@services/hr/leave";
import { useAppDispatch } from "src/store";

const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    orange: "#f59e0b",
    red: "#ef4444",
    blue: "#3b82f6",
    indigo: "#6366f1",
    purple: "#8b5cf6",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
    white: "#ffffff",
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

// ── Status / type configs ─────────────────────────────────────────────────────
const STATUS_CFG: Record<LeaveStatus, { color: string; bg: string }> = {
    Pending: { color: C.orange, bg: "#fffbeb" },
    Approved: { color: C.green, bg: "#f0fdf4" },
    Rejected: { color: C.red, bg: "#fef2f2" },
    Cancelled: { color: C.subText, bg: C.bg },
};

const TYPE_COLOR: Record<LeaveType, string> = {
    Annual: C.blue,
    Sick: C.red,
    Emergency: C.orange,
    Maternity: C.purple,
    Paternity: C.indigo,
    Unpaid: C.subText,
};

// ── Shared tags ───────────────────────────────────────────────────────────────
const StatusTag: React.FC<{ status: LeaveStatus }> = ({ status }) => {
    const cfg = STATUS_CFG[status];
    return (
        <Tag style={{
            background: cfg.bg, color: cfg.color, border: "none",
            borderRadius: 6, fontSize: 11, fontWeight: 600,
            padding: "2px 8px", margin: 0,
        }}>
            {status}
        </Tag>
    );
};

const TypeTag: React.FC<{ type: LeaveType }> = ({ type }) => (
    <Tag style={{
        background: `${TYPE_COLOR[type]}18`, color: TYPE_COLOR[type],
        border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600,
        padding: "2px 8px", margin: 0,
    }}>
        {type}
    </Tag>
);

// ── Balance pills ─────────────────────────────────────────────────────────────
const BalanceRow: React.FC<{ staffId: string }> = ({ staffId }) => {
    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaveBalance(staffId)
            .then((d) => setBalances(d?.balances || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [staffId]);

    if (loading) return <Skeleton active paragraph={false} style={{ marginTop: 8 }} />;
    if (!balances.length) return null;

    return (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {balances.map((b) => (
                <div key={b.leave_type} style={{
                    background: C.bg, border: `1px solid ${C.border}`,
                    borderRadius: 7, padding: "4px 10px",
                    display: "flex", alignItems: "center", gap: 5,
                }}>
                    <Text style={{ fontSize: 10, color: C.subText }}>{b.leave_type}</Text>
                    <Text strong style={{ fontSize: 11, color: b.remaining > 0 ? C.green : C.red }}>
                        {b.remaining}/{b.entitled}
                    </Text>
                </div>
            ))}
        </div>
    );
};

// ── Leave card ────────────────────────────────────────────────────────────────
const LeaveCard: React.FC<{
    leave: Leave;
    isMobile: boolean;
    onApprove: (id: string) => void;
    onReject: (id: string, reason: string) => void;
    onCancel: (id: string) => void;
    actingId: string | null;
    action: "approving" | "rejecting" | "cancelling" | null;
}> = ({ leave, isMobile, onApprove, onReject, onCancel, actingId, action }) => {
    const [rejectReason, setRejectReason] = useState("");
    const [showBalance, setShowBalance] = useState(false);

    const staff = leave.staff_id;
    const isPending = leave.status === "Pending";
    const isActing = actingId === leave._id;

    const fmt = (d: string) =>
        new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const fmtShort = (d: string) =>
        new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

    return (
        <div style={{
            background: C.white,
            border: `1px solid ${isPending ? C.orange + "55" : C.border}`,
            borderLeft: `3px solid ${isPending ? C.orange : STATUS_CFG[leave.status].color}`,
            borderRadius: 12,
            padding: isMobile ? "12px 14px" : "14px 18px",
            marginBottom: 10,
            opacity: leave.status === "Cancelled" ? 0.65 : 1,
        }}>

            {/* ── Row 1: Avatar + name + tags ── */}
            <div style={{
                display: "flex", alignItems: "flex-start",
                justifyContent: "space-between", gap: 10, marginBottom: 12,
                flexWrap: isMobile ? "wrap" : "nowrap",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <Avatar size={36} src={(staff as any)?.thumbnail}
                        icon={<UserOutlined />}
                        style={{ background: C.primaryLight, color: C.primary, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                        <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>
                            {staff?.fullname || staff?.username || "Unknown"}
                        </Text>
                        <Text style={{ fontSize: 11, color: C.subText }}>
                            Submitted {fmtShort(leave.createdAt)}
                        </Text>
                    </div>
                </div>
                <div style={{
                    display: "flex", gap: 5, flexShrink: 0,
                    flexWrap: "wrap",
                    // on mobile, push tags to second line by making width full
                    width: isMobile ? "100%" : "auto",
                    justifyContent: isMobile ? "flex-start" : "flex-end",
                    paddingLeft: isMobile ? 46 : 0,   // align with text, after avatar
                }}>
                    <TypeTag type={leave.leave_type} />
                    <StatusTag status={leave.status} />
                </div>
            </div>

            {/* ── Date strip ── */}
            <div style={{
                display: "grid",
                // 4 cols if no reason; auto-fit to squeeze reason in
                gridTemplateColumns: leave.reason
                    ? isMobile ? "1fr 1fr" : "auto auto auto 1fr"
                    : "auto auto auto",
                gap: isMobile ? "8px 16px" : "0 16px",
                background: C.bg, borderRadius: 8,
                padding: "10px 12px", marginBottom: 10,
                alignItems: "start",
            }}>
                <div>
                    <Text style={{ fontSize: 9, color: C.subText, display: "block", fontWeight: 600, letterSpacing: "0.4px" }}>FROM</Text>
                    <Text strong style={{ fontSize: 12, color: C.darkText }}>{fmt(leave.start_date)}</Text>
                </div>
                <div>
                    <Text style={{ fontSize: 9, color: C.subText, display: "block", fontWeight: 600, letterSpacing: "0.4px" }}>TO</Text>
                    <Text strong style={{ fontSize: 12, color: C.darkText }}>{fmt(leave.end_date)}</Text>
                </div>
                <div>
                    <Text style={{ fontSize: 9, color: C.subText, display: "block", fontWeight: 600, letterSpacing: "0.4px" }}>DAYS</Text>
                    <Text strong style={{ fontSize: 13, color: C.primary }}>{leave.days_requested}</Text>
                </div>
                {leave.reason && (
                    <div style={{ gridColumn: isMobile ? "1 / -1" : "auto" }}>
                        <Text style={{ fontSize: 9, color: C.subText, display: "block", fontWeight: 600, letterSpacing: "0.4px" }}>REASON</Text>
                        <Text style={{ fontSize: 12, color: C.darkText, lineHeight: 1.5 }}>{leave.reason}</Text>
                    </div>
                )}
            </div>

            {/* ── Rejection reason ── */}
            {leave.status === "Rejected" && leave.rejection_reason && (
                <div style={{
                    background: "#fef2f2", border: `1px solid ${C.red}25`,
                    borderRadius: 8, padding: "8px 12px", marginBottom: 10,
                }}>
                    <Text style={{ fontSize: 11, color: C.red }}>
                        Reason: {leave.rejection_reason}
                    </Text>
                </div>
            )}

            {/* ── Approved by ── */}
            {leave.status === "Approved" && leave.approved_by && (
                <div style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, color: C.subText }}>
                        Approved by {leave.approved_by.fullname}
                        {leave.approved_at && ` · ${fmtShort(leave.approved_at)}`}
                    </Text>
                </div>
            )}

            {/* ── Balance toggle ── */}
            <button
                onClick={() => setShowBalance((v) => !v)}
                style={{
                    all: "unset", cursor: "pointer",
                    fontSize: 11, color: C.blue,
                    marginBottom: showBalance ? 4 : 0,
                    display: "block",
                }}
            >
                {showBalance ? "Hide" : "Show"} leave balance
            </button>
            {showBalance && <BalanceRow staffId={String((staff as any)?._id || staff)} />}

            {/* ── Actions (Pending) ── */}
            {isPending && (
                <div style={{
                    display: "flex", gap: 8, marginTop: 12,
                    flexWrap: "wrap",
                    // full-width buttons on small mobile
                    flexDirection: isMobile ? "column" : "row",
                }}>
                    <Popconfirm
                        title="Approve this leave?"
                        description={`${staff?.fullname} will be notified.`}
                        onConfirm={() => onApprove(leave._id)}
                        okText="Approve" cancelText="Cancel"
                    >
                        <Button
                            type="primary" size="small"
                            icon={<CheckCircleOutlined />}
                            loading={isActing && action === "approving"}
                            block={isMobile}
                            style={{
                                background: C.green, borderColor: C.green,
                                borderRadius: 7, fontSize: 12,
                                height: isMobile ? 38 : undefined,
                            }}
                        >
                            Approve
                        </Button>
                    </Popconfirm>

                    <Popconfirm
                        title="Reject this leave?"
                        description={
                            <div style={{ marginTop: 6 }}>
                                <input
                                    placeholder="Reason (optional)"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    style={{
                                        width: "100%", height: 30, borderRadius: 6,
                                        border: `1px solid ${C.border}`,
                                        padding: "0 8px", fontSize: 12, outline: "none",
                                    }}
                                />
                            </div>
                        }
                        onConfirm={() => onReject(leave._id, rejectReason)}
                        okText="Reject" okButtonProps={{ danger: true }}
                        cancelText="Cancel"
                    >
                        <Button
                            danger size="small"
                            icon={<CloseCircleOutlined />}
                            loading={isActing && action === "rejecting"}
                            block={isMobile}
                            style={{
                                borderRadius: 7, fontSize: 12,
                                height: isMobile ? 38 : undefined,
                            }}
                        >
                            Reject
                        </Button>
                    </Popconfirm>
                </div>
            )}

            {/* ── Cancel (Approved) ── */}
            {leave.status === "Approved" && (
                <div style={{ marginTop: 10 }}>
                    <Popconfirm
                        title="Cancel this approved leave?"
                        description="Days will be returned to the staff balance."
                        onConfirm={() => onCancel(leave._id)}
                        okText="Cancel Leave" okButtonProps={{ danger: true }}
                        cancelText="Keep"
                    >
                        <Button
                            size="small"
                            loading={isActing && action === "cancelling"}
                            block={isMobile}
                            style={{
                                borderRadius: 7, fontSize: 11,
                                color: C.subText, borderColor: C.border,
                                height: isMobile ? 36 : undefined,
                            }}
                        >
                            Cancel leave
                        </Button>
                    </Popconfirm>
                </div>
            )}
        </div>
    );
};

// ── Summary stat card ─────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: number; color: string; bg: string }> = ({
    label, value, color, bg,
}) => (
    <div style={{
        background: bg, borderRadius: 10, padding: "12px 14px",
        border: `1px solid ${color}25`,
        display: "flex", flexDirection: "column", gap: 2,
    }}>
        <Text style={{ fontSize: 11, color: C.subText, fontWeight: 500 }}>{label}</Text>
        <Text strong style={{ fontSize: 22, color, lineHeight: 1 }}>{value}</Text>
    </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const LeaveManagement: React.FC = () => {
    const dispatch = useAppDispatch();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<LeaveStatus | "All">("Pending");
    const [typeFilter, setTypeFilter] = useState<LeaveType | "All">("All");
    const [actingId, setActingId] = useState<string | null>(null);
    const [action, setAction] = useState<"approving" | "rejecting" | "cancelling" | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (statusFilter !== "All") params.status = statusFilter;
            if (typeFilter !== "All") params.leave_type = typeFilter;
            const data = await fetchLeaves(params);
            setLeaves(data?.leaves || []);
        } catch {
            message.error("Failed to load leave requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [statusFilter, typeFilter]);

    const handleApprove = async (id: string) => {
        setActingId(id); setAction("approving");
        try { await dispatch(approveLeave(id)).unwrap(); load(); }
        finally { setActingId(null); setAction(null); }
    };

    const handleReject = async (id: string, reason: string) => {
        setActingId(id); setAction("rejecting");
        try { await dispatch(rejectLeave({ leaveId: id, rejection_reason: reason })).unwrap(); load(); }
        finally { setActingId(null); setAction(null); }
    };

    const handleCancel = async (id: string) => {
        setActingId(id); setAction("cancelling");
        try { await dispatch(cancelLeave(id)).unwrap(); load(); }
        finally { setActingId(null); setAction(null); }
    };

    const count = (s: LeaveStatus) => leaves.filter((l) => l.status === s).length;

    return (
        <div style={{ padding: isMobile ? "12px" : "16px 20px" }}>

            {/* ── Summary strip ── */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8, marginBottom: 16,
            }}>
                <StatCard label="Pending" value={count("Pending")} color={C.orange} bg="#fffbeb" />
                <StatCard label="Approved" value={count("Approved")} color={C.green} bg="#f0fdf4" />
                <StatCard label="Rejected" value={count("Rejected")} color={C.red} bg="#fef2f2" />
            </div>

            {/* ── Filters ── */}
            <div style={{
                display: "flex", gap: 8, marginBottom: 14,
                flexDirection: isMobile ? "column" : "row",
                flexWrap: "wrap",
            }}>
                <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    size="small"
                    style={{ width: isMobile ? "100%" : 150 }}
                    options={[
                        { value: "All", label: "All statuses" },
                        { value: "Pending", label: "Pending" },
                        { value: "Approved", label: "Approved" },
                        { value: "Rejected", label: "Rejected" },
                        { value: "Cancelled", label: "Cancelled" },
                    ]}
                />
                <Select
                    value={typeFilter}
                    onChange={setTypeFilter}
                    size="small"
                    style={{ width: isMobile ? "100%" : 160 }}
                    options={[
                        { value: "All", label: "All leave types" },
                        { value: "Annual", label: "Annual" },
                        { value: "Sick", label: "Sick" },
                        { value: "Emergency", label: "Emergency" },
                        { value: "Maternity", label: "Maternity" },
                        { value: "Paternity", label: "Paternity" },
                        { value: "Unpaid", label: "Unpaid" },
                    ]}
                />
                <Button
                    size="small" icon={<ReloadOutlined />}
                    onClick={load} loading={loading}
                    style={{ borderRadius: 7, borderColor: C.border, width: isMobile ? "100%" : "auto" }}
                >
                    Refresh
                </Button>
            </div>

            {/* ── List ── */}
            {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{
                        background: C.white, border: `1px solid ${C.border}`,
                        borderRadius: 12, padding: "14px 16px", marginBottom: 10,
                    }}>
                        <Skeleton active avatar paragraph={{ rows: 2 }} />
                    </div>
                ))
            ) : leaves.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        <Text style={{ fontSize: 13, color: C.subText }}>
                            No {statusFilter !== "All" ? statusFilter.toLowerCase() + " " : ""}leave requests
                        </Text>
                    }
                    style={{ padding: "48px 0" }}
                />
            ) : (
                leaves.map((leave) => (
                    <LeaveCard
                        key={leave._id}
                        leave={leave}
                        isMobile={isMobile}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onCancel={handleCancel}
                        actingId={actingId}
                        action={action}
                    />
                ))
            )}
        </div>
    );
};

export default LeaveManagement;
export { LeaveManagement };

export const fetchPendingLeaveCount = async (): Promise<number> => {
    try {
        const data = await fetchLeaves({ status: "Pending", limit: "100" });
        return data?.total || 0;
    } catch { return 0; }
};