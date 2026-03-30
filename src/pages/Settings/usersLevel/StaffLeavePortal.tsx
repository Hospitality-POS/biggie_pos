import React, { useEffect, useState } from "react";
import {
    Button,
    DatePicker,
    Empty,
    Form,
    Input,
    message,
    Modal,
    Select,
    Skeleton,
    Tag,
    Typography,
} from "antd";
import {
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    PlusOutlined,
    SendOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
    applyForLeave,
    cancelLeave,
    fetchLeaveBalance,
    fetchLeaves,
    Leave,
    LeaveBalance,
    LeaveStatus,
    LeaveType,
} from "@services/hr/leave";
import { useAppDispatch, useAppSelector } from "src/store";

const { Text } = Typography;
const { RangePicker } = DatePicker;

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
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<LeaveStatus, { color: string; bg: string; icon: React.ReactNode }> = {
    Pending: { color: C.orange, bg: "#fffbeb", icon: <ClockCircleOutlined /> },
    Approved: { color: C.green, bg: "#f0fdf4", icon: <CheckCircleOutlined /> },
    Rejected: { color: C.red, bg: "#fef2f2", icon: <CloseCircleOutlined /> },
    Cancelled: { color: C.subText, bg: C.bg, icon: <CloseCircleOutlined /> },
};

const LEAVE_TYPE_COLOR: Record<LeaveType, string> = {
    Annual: C.blue,
    Sick: C.red,
    Emergency: C.orange,
    Maternity: C.purple,
    Paternity: C.indigo,
    Unpaid: C.subText,
};

const LEAVE_TYPES: LeaveType[] = ["Annual", "Sick", "Emergency", "Maternity", "Paternity", "Unpaid"];

// ── Balance card ──────────────────────────────────────────────────────────────
const BalanceCards: React.FC<{ balances: LeaveBalance[] }> = ({ balances }) => {
    if (!balances.length) return (
        <div style={{
            background: C.bg, borderRadius: 10, padding: "14px 16px",
            border: `1px solid ${C.border}`, marginBottom: 16,
            textAlign: "center",
        }}>
            <Text style={{ fontSize: 12, color: C.subText }}>
                No leave balances set up yet. Contact HR to initialize your leave entitlements.
            </Text>
        </div>
    );

    return (
        <div style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, color: C.subText, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.3px", display: "block", marginBottom: 8 }}>
                Your Leave Balance
            </Text>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                {balances.map((b) => {
                    const pct = b.entitled > 0 ? Math.round((b.remaining / b.entitled) * 100) : 0;
                    const color = pct > 50 ? C.green : pct > 20 ? C.orange : C.red;
                    return (
                        <div key={b.leave_type} style={{
                            background: "#fff",
                            border: `1px solid ${C.border}`,
                            borderTop: `3px solid ${LEAVE_TYPE_COLOR[b.leave_type as LeaveType] || C.blue}`,
                            borderRadius: 8, padding: "10px 12px",
                        }}>
                            <Text style={{ fontSize: 10, color: C.subText, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                {b.leave_type}
                            </Text>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                                <Text strong style={{ fontSize: 18, color, lineHeight: 1 }}>{b.remaining}</Text>
                                <Text style={{ fontSize: 11, color: C.subText }}>/{b.entitled}</Text>
                            </div>
                            <Text style={{ fontSize: 10, color: C.subText }}>days left</Text>
                            {/* Mini progress bar */}
                            <div style={{ marginTop: 6, height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.3s" }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ── My leave history card ─────────────────────────────────────────────────────
const MyLeaveCard: React.FC<{ leave: Leave; onCancel: (id: string) => void; cancelling: boolean }> = ({
    leave, onCancel, cancelling,
}) => {
    const cfg = STATUS_CFG[leave.status];
    const isPending = leave.status === "Pending";

    const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

    return (
        <div style={{
            background: "#fff",
            border: `1px solid ${isPending ? C.orange + "50" : C.border}`,
            borderLeft: `3px solid ${cfg.color}`,
            borderRadius: 10, padding: "12px 14px", marginBottom: 8,
            opacity: leave.status === "Cancelled" ? 0.6 : 1,
        }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <Tag style={{
                        background: `${LEAVE_TYPE_COLOR[leave.leave_type]}18`,
                        color: LEAVE_TYPE_COLOR[leave.leave_type],
                        border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "2px 8px",
                    }}>
                        {leave.leave_type}
                    </Tag>
                    <Tag style={{
                        background: cfg.bg, color: cfg.color,
                        border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "2px 8px",
                    }}>
                        {cfg.icon} {leave.status}
                    </Tag>
                </div>
                <Text style={{ fontSize: 11, color: C.subText, flexShrink: 0 }}>
                    {new Date(leave.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                </Text>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: leave.reason || isPending ? 8 : 0 }}>
                <div>
                    <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>FROM</Text>
                    <Text strong style={{ fontSize: 12 }}>{fmtDate(leave.start_date)}</Text>
                </div>
                <div style={{ borderLeft: `1px solid ${C.border}`, margin: "0 2px" }} />
                <div>
                    <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>TO</Text>
                    <Text strong style={{ fontSize: 12 }}>{fmtDate(leave.end_date)}</Text>
                </div>
                <div style={{ borderLeft: `1px solid ${C.border}`, margin: "0 2px" }} />
                <div>
                    <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>DAYS</Text>
                    <Text strong style={{ fontSize: 12, color: C.primary }}>{leave.days_requested}</Text>
                </div>
            </div>

            {leave.reason && (
                <Text style={{ fontSize: 11, color: C.subText, display: "block", marginBottom: isPending ? 8 : 0 }}>
                    {leave.reason}
                </Text>
            )}

            {leave.status === "Rejected" && leave.rejection_reason && (
                <div style={{ background: "#fef2f2", border: `1px solid ${C.red}25`, borderRadius: 6, padding: "6px 10px", marginBottom: isPending ? 8 : 0 }}>
                    <Text style={{ fontSize: 11, color: C.red }}>Reason: {leave.rejection_reason}</Text>
                </div>
            )}

            {leave.status === "Approved" && leave.approved_by && (
                <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>
                    Approved by {leave.approved_by.fullname}
                </Text>
            )}

            {isPending && (
                <Button
                    size="small"
                    danger
                    loading={cancelling}
                    onClick={() => onCancel(leave._id)}
                    style={{ borderRadius: 6, fontSize: 11, marginTop: 4 }}
                >
                    Withdraw request
                </Button>
            )}
        </div>
    );
};

// ── Apply leave modal ─────────────────────────────────────────────────────────
const ApplyLeaveModal: React.FC<{
    open: boolean;
    onClose: () => void;
    onDone: () => void;
    balances: LeaveBalance[];
}> = ({ open, onClose, onDone, balances }) => {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const selectedType = Form.useWatch("leave_type", form) as LeaveType | undefined;
    const dateRange = Form.useWatch("dateRange", form);

    const balance = balances.find((b) => b.leave_type === selectedType);

    const weekdays = (range: any[]): number => {
        if (!range?.[0] || !range?.[1]) return 0;
        let count = 0;
        const cur = dayjs(range[0]).startOf("day");
        const end = dayjs(range[1]).startOf("day");
        let d = cur;
        while (d.isBefore(end) || d.isSame(end, "day")) {
            if (d.day() !== 0 && d.day() !== 6) count++;
            d = d.add(1, "day");
        }
        return count;
    };

    const requestedDays = weekdays(dateRange);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            await applyForLeave({
                leave_type: values.leave_type,
                start_date: values.dateRange[0].format("YYYY-MM-DD"),
                end_date: values.dateRange[1].format("YYYY-MM-DD"),
                reason: values.reason,
            });
            form.resetFields();
            onDone();
            onClose();
        } catch (err: any) {
            if (err?.errorFields) return; // form validation
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            onOk={handleSubmit}
            confirmLoading={submitting}
            okText="Submit Request"
            okButtonProps={{ style: { background: C.primary, borderColor: C.primary } }}
            cancelText="Cancel"
            width="min(480px, 96vw)"
            style={{ top: 24 }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
                        <CalendarOutlined />
                    </div>
                    <Text strong style={{ fontSize: 14, color: C.darkText }}>Request Leave</Text>
                </div>
            }
            destroyOnClose
        >
            <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                <Form.Item
                    name="leave_type"
                    label="Leave type"
                    rules={[{ required: true, message: "Please select a leave type" }]}
                >
                    <Select placeholder="Select leave type" style={{ borderRadius: 8 }}>
                        {LEAVE_TYPES.map((t) => {
                            const b = balances.find((bb) => bb.leave_type === t);
                            return (
                                <Select.Option key={t} value={t}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ color: LEAVE_TYPE_COLOR[t], fontWeight: 600 }}>{t}</span>
                                        {b && (
                                            <span style={{ fontSize: 11, color: b.remaining > 0 ? C.green : C.red }}>
                                                {b.remaining} day{b.remaining !== 1 ? "s" : ""} left
                                            </span>
                                        )}
                                    </div>
                                </Select.Option>
                            );
                        })}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="dateRange"
                    label="Date range"
                    rules={[{ required: true, message: "Please select dates" }]}
                >
                    <RangePicker
                        style={{ width: "100%", borderRadius: 8 }}
                        disabledDate={(d) => d.isBefore(dayjs().startOf("day"))}
                        format="DD MMM YYYY"
                    />
                </Form.Item>

                {/* Live day count + balance warning */}
                {requestedDays > 0 && (
                    <div style={{
                        background: C.bg, border: `1px solid ${C.border}`,
                        borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                        <div>
                            <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>Working days requested</Text>
                            <Text strong style={{ fontSize: 16, color: C.primary }}>{requestedDays} day{requestedDays !== 1 ? "s" : ""}</Text>
                        </div>
                        {balance && (
                            <div style={{ textAlign: "right" }}>
                                <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>Balance remaining</Text>
                                <Text strong style={{ fontSize: 16, color: requestedDays > balance.remaining ? C.red : C.green }}>
                                    {balance.remaining} day{balance.remaining !== 1 ? "s" : ""}
                                </Text>
                            </div>
                        )}
                    </div>
                )}

                {balance && requestedDays > balance.remaining && !["Unpaid", "Emergency"].includes(selectedType!) && (
                    <div style={{
                        background: "#fef2f2", border: `1px solid ${C.red}30`,
                        borderRadius: 8, padding: "8px 12px", marginBottom: 12,
                    }}>
                        <Text style={{ fontSize: 12, color: C.red }}>
                            Insufficient balance. You have {balance.remaining} day{balance.remaining !== 1 ? "s" : ""} available but are requesting {requestedDays}.
                        </Text>
                    </div>
                )}

                <Form.Item name="reason" label="Reason (optional)">
                    <Input.TextArea
                        rows={3}
                        placeholder="Brief reason for your leave request…"
                        style={{ borderRadius: 8, fontSize: 13 }}
                        maxLength={300}
                        showCount
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

// ── Main exported component ───────────────────────────────────────────────────
const StaffLeavePortal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((s) => s.auth);

    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [loadingLeaves, setLoadingLeaves] = useState(true);
    const [loadingBalances, setLoadingBalances] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<LeaveStatus | "All">("All");

    const loadLeaves = async () => {
        setLoadingLeaves(true);
        try {
            const params: Record<string, string> = {};
            if (statusFilter !== "All") params.status = statusFilter;
            const data = await fetchLeaves(params);
            setLeaves(data?.leaves || []);
        } catch {
            message.error("Failed to load leave history");
        } finally {
            setLoadingLeaves(false);
        }
    };

    const loadBalances = async () => {
        if (!user?.id) return;
        setLoadingBalances(true);
        try {
            const data = await fetchLeaveBalance(user.id);
            setBalances(data?.balances || []);
        } catch {
        } finally {
            setLoadingBalances(false);
        }
    };

    useEffect(() => { loadLeaves(); }, [statusFilter]);
    useEffect(() => { loadBalances(); }, [user?.id]);

    const handleCancel = async (id: string) => {
        setCancellingId(id);
        try {
            await dispatch(cancelLeave(id)).unwrap();
            message.success("Leave request withdrawn");
            loadLeaves();
            loadBalances();
        } catch {
            // error shown by service
        } finally {
            setCancellingId(null);
        }
    };

    const pending = leaves.filter((l) => l.status === "Pending").length;
    const approved = leaves.filter((l) => l.status === "Approved").length;

    return (
        <div style={{ padding: 16 }}>

            {/* Balance cards */}
            {loadingBalances ? (
                <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 16 }} />
            ) : (
                <BalanceCards balances={balances} />
            )}

            {/* Summary + action row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                        { label: "Pending", value: pending, color: C.orange },
                        { label: "Approved", value: approved, color: C.green },
                    ].map(({ label, value, color }) => (
                        <div key={label} style={{
                            background: "#fff", border: `1px solid ${C.border}`,
                            borderRadius: 8, padding: "6px 12px",
                            display: "flex", alignItems: "center", gap: 8,
                        }}>
                            <Text style={{ fontSize: 11, color: C.subText }}>{label}</Text>
                            <Text strong style={{ fontSize: 14, color }}>{value}</Text>
                        </div>
                    ))}
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setModalOpen(true)}
                    style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}
                >
                    Request Leave
                </Button>
            </div>

            {/* Filter */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    size="small"
                    style={{ width: 140 }}
                    options={[
                        { value: "All", label: "All statuses" },
                        { value: "Pending", label: "Pending" },
                        { value: "Approved", label: "Approved" },
                        { value: "Rejected", label: "Rejected" },
                        { value: "Cancelled", label: "Cancelled" },
                    ]}
                />
            </div>

            {/* Leave history */}
            {loadingLeaves ? (
                Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                        <Skeleton active paragraph={{ rows: 2 }} />
                    </div>
                ))
            ) : leaves.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<Text style={{ fontSize: 13, color: C.subText }}>No leave requests yet</Text>}
                    style={{ padding: "40px 0" }}
                >
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={() => setModalOpen(true)}
                        style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}
                    >
                        Submit your first request
                    </Button>
                </Empty>
            ) : (
                leaves.map((leave) => (
                    <MyLeaveCard
                        key={leave._id}
                        leave={leave}
                        onCancel={handleCancel}
                        cancelling={cancellingId === leave._id}
                    />
                ))
            )}

            <ApplyLeaveModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onDone={() => { loadLeaves(); loadBalances(); }}
                balances={balances}
            />
        </div>
    );
};

export default StaffLeavePortal;