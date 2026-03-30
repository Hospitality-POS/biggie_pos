import React from "react";
import {
    Button,
    Popconfirm,
    Space,
    Typography,
} from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
    ArrowLeftOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    DeleteOutlined,
    MailOutlined,
    TagOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNotificationMutations } from "../Hooks/NotificationsCustomHook";

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
};

// ── Priority badge ────────────────────────────────────────────────────────────
const PRIORITY_CFG: Record<string, { color: string; bg: string }> = {
    low: { color: C.green, bg: "#f0fdf4" },
    medium: { color: C.blue, bg: "#eff6ff" },
    high: { color: C.orange, bg: "#fffbeb" },
    urgent: { color: C.red, bg: "#fef2f2" },
};

const PriorityTag: React.FC<{ priority: string }> = ({ priority }) => {
    const cfg = PRIORITY_CFG[priority?.toLowerCase()] || { color: C.subText, bg: C.bg };
    return (
        <span style={{
            background: cfg.bg, color: cfg.color,
            borderRadius: 6, fontSize: 10, fontWeight: 700,
            padding: "2px 9px", textTransform: "uppercase", whiteSpace: "nowrap",
        }}>
            {priority} Priority
        </span>
    );
};

// ── Type badge ────────────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { color: string; bg: string; label: string }> = {
    new_appointment_booking: { color: C.purple, bg: "#f5f3ff", label: "New Booking" },
    inventory_out_of_stock: { color: C.red, bg: "#fef2f2", label: "Out of Stock" },
    new_appointment: { color: C.green, bg: "#f0fdf4", label: "Appointment" },
    low_inventory: { color: C.orange, bg: "#fffbeb", label: "Low Inventory" },
    system: { color: C.blue, bg: "#eff6ff", label: "System" },
};

const TypeTag: React.FC<{ type: string }> = ({ type }) => {
    const cfg = TYPE_CFG[type] || {
        color: C.subText, bg: C.bg,
        label: type?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    };
    return (
        <span style={{
            background: cfg.bg, color: cfg.color,
            borderRadius: 6, fontSize: 10, fontWeight: 600,
            padding: "2px 9px", whiteSpace: "nowrap",
        }}>
            {cfg.label}
        </span>
    );
};

// ── Read status badge ─────────────────────────────────────────────────────────
const ReadBadge: React.FC<{ read: boolean }> = ({ read }) => (
    <span style={{
        background: read ? "#f0fdf4" : C.primaryLight,
        color: read ? C.green : C.primary,
        borderRadius: 6, fontSize: 10, fontWeight: 600,
        padding: "2px 9px", whiteSpace: "nowrap",
    }}>
        {read ? "Read" : "Unread"}
    </span>
);

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Text style={{
        fontSize: 10, fontWeight: 700, color: C.subText,
        textTransform: "uppercase", letterSpacing: "0.5px",
        display: "block", marginBottom: 10,
    }}>
        {children}
    </Text>
);

// ── Detail row ────────────────────────────────────────────────────────────────
const DetailRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}> = ({ icon, label, value }) => (
    <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 12,
        padding: "8px 0",
        borderBottom: `1px solid ${C.border}`,
    }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: C.subText, fontSize: 13 }}>{icon}</span>
            <Text style={{ fontSize: 12, color: C.subText }}>{label}</Text>
        </div>
        <div style={{ textAlign: "right" }}>{value}</div>
    </div>
);

// ── Types ─────────────────────────────────────────────────────────────────────
interface INotificationDetailViewProps {
    record: any;
    setShowDetails: (v: boolean) => void;
}

// ── Main component ────────────────────────────────────────────────────────────
const NotificationDetailView: React.FC<INotificationDetailViewProps> = ({
    record,
    setShowDetails,
}) => {
    const n = record;
    const { deleteNotificationMutation, markAsReadMutation } = useNotificationMutations();

    const handleDelete = () => {
        deleteNotificationMutation.mutate(n._id);
        setShowDetails(false);
    };

    const handleMarkRead = () => {
        markAsReadMutation.mutate(n._id);
    };

    return (
        <ProCard bodyStyle={{ padding: 0 }}>
            {/* ── Top bar ─────────────────────────────────────────────────────── */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
                background: "#fff", flexWrap: "wrap", gap: 10,
            }}>
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => setShowDetails(false)}
                    style={{ borderRadius: 8, color: C.subText, fontWeight: 500 }}
                >
                    Back
                </Button>

                <Space size={8} wrap>
                    {!n.read && (
                        <Button
                            icon={<CheckCircleOutlined style={{ color: C.green }} />}
                            onClick={handleMarkRead}
                            loading={markAsReadMutation.isLoading}
                            style={{ borderRadius: 8 }}
                        >
                            Mark as Read
                        </Button>
                    )}
                    <Popconfirm
                        title="Delete this notification?"
                        description="This action cannot be undone."
                        onConfirm={handleDelete}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            loading={deleteNotificationMutation.isLoading}
                            style={{ borderRadius: 8 }}
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            </div>

            {/* ── Content ─────────────────────────────────────────────────────── */}
            <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Header card */}
                <div style={{
                    background: "#fff",
                    border: `1px solid ${C.border}`,
                    borderTop: `3px solid ${n.read ? C.border : C.primary}`,
                    borderRadius: 10,
                    padding: "16px 18px",
                }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                        {/* Icon bubble */}
                        <div style={{
                            width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                            background: n.read ? C.bg : C.primaryLight,
                            border: `2px solid ${n.read ? C.border : C.primary}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: n.read ? C.subText : C.primary,
                            fontSize: 18,
                        }}>
                            <MailOutlined />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Title */}
                            <Text strong={!n.read} style={{
                                fontSize: 16,
                                color: n.read ? C.subText : C.darkText,
                                display: "block", lineHeight: 1.3, marginBottom: 8,
                            }}>
                                {n.title}
                            </Text>

                            {/* Meta line */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                                <Text style={{ fontSize: 12, color: C.subText, fontWeight: 500 }}>
                                    System Notification
                                </Text>
                                {n.recipient?.email && (
                                    <Text style={{ fontSize: 12, color: "#94a3b8" }}>
                                        &lt;{n.recipient.email}&gt;
                                    </Text>
                                )}
                                <Text style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>
                                    {dayjs(n.createdAt).format("MMM D, YYYY h:mm A")}
                                </Text>
                            </div>

                            {/* Tags */}
                            <Space size={6} wrap>
                                <PriorityTag priority={n.priority} />
                                <TypeTag type={n.type} />
                                <ReadBadge read={n.read} />
                            </Space>
                        </div>
                    </div>
                </div>

                {/* Message body */}
                <div style={{
                    background: "#fff", border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: "16px 18px",
                }}>
                    <SectionLabel>Message</SectionLabel>
                    <Text style={{
                        fontSize: 14, lineHeight: 1.7,
                        color: C.darkText, display: "block",
                    }}>
                        {n.message}
                    </Text>
                </div>

                {/* Notification details */}
                <div style={{
                    background: C.bg, border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: "14px 18px",
                }}>
                    <SectionLabel>Notification Details</SectionLabel>

                    {n.code && (
                        <DetailRow
                            icon={<TagOutlined />}
                            label="Code"
                            value={
                                <Text code style={{ fontSize: 12 }}>
                                    {n.code.toUpperCase()}
                                </Text>
                            }
                        />
                    )}

                    <DetailRow
                        icon={<ClockCircleOutlined />}
                        label="Received"
                        value={
                            <Text style={{ fontSize: 12, color: C.darkText, fontWeight: 500 }}>
                                {dayjs(n.createdAt).format("MMM D, YYYY [at] h:mm A")}
                            </Text>
                        }
                    />

                    {n.readAt && (
                        <DetailRow
                            icon={<CheckCircleOutlined />}
                            label="Read at"
                            value={
                                <Text style={{ fontSize: 12, color: C.green, fontWeight: 500 }}>
                                    {dayjs(n.readAt).format("MMM D, YYYY [at] h:mm A")}
                                </Text>
                            }
                        />
                    )}

                    {n.expiresAt && (
                        <DetailRow
                            icon={<ClockCircleOutlined />}
                            label="Expires"
                            value={
                                <Text style={{ fontSize: 12, color: C.orange, fontWeight: 500 }}>
                                    {dayjs(n.expiresAt).format("MMM D, YYYY [at] h:mm A")}
                                </Text>
                            }
                        />
                    )}
                </div>

                {/* Additional info */}
                {n.additionalInfo && (
                    <div style={{
                        background: C.bg, border: `1px solid ${C.border}`,
                        borderRadius: 10, padding: "14px 18px",
                    }}>
                        <SectionLabel>Additional Info</SectionLabel>
                        <pre style={{
                            margin: 0, padding: 12,
                            background: "#fff", borderRadius: 8,
                            border: `1px solid ${C.border}`,
                            fontSize: 11, color: C.subText,
                            whiteSpace: "pre-wrap", wordBreak: "break-word",
                            fontFamily: "monospace",
                        }}>
                            {JSON.stringify(n.additionalInfo, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </ProCard>
    );
};

export default NotificationDetailView;