import React from "react";
import { Input, Avatar, Typography, Select, Spin, Empty, Tooltip, Grid, Pagination, Tag } from "antd";
import { SearchOutlined, UserOutlined, CalendarOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import {
    Conversation,
    ConversationStatus,
    CHANNEL_CONFIG,
    STATUS_CONFIG,
} from "./OmnichannelInboxPage";
import { chatTime, ContactAvatar, HScroll } from "./shared/ui";

const { Text } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentOption {
    _id: string;
    fullname: string;
    thumbnail?: string;
}

type StatusKey = ConversationStatus | "all" | "queue" | "needs_reply";

interface Props {
    conversations: Conversation[];
    loading: boolean;
    selectedId: string | null;
    activeStatus: StatusKey;
    total: number;
    page: number;
    pageSize: number;
    search: string;
    statusCounts: Record<string, number>;
    queueCount?: number;
    primaryColor: string;
    isAdmin?: boolean;
    agents?: AgentOption[];
    selectedAgent?: string;
    // WhatsApp Web has no 24-hour reply window — hide that badge for it.
    showWindowBadge?: boolean;
    onSelect: (conv: Conversation) => void;
    onSearchChange: (v: string) => void;
    onStatusChange: (s: StatusKey) => void;
    onPageChange: (p: number) => void;
    onAgentChange?: (v: string) => void;
}

// ── Status filter pills ───────────────────────────────────────────────────────

const STATUS_FILTERS: { key: StatusKey; label: string; tone: string }[] = [
    { key: "all", label: "All", tone: "#54656f" },
    { key: "needs_reply", label: "Needs reply", tone: "#ef4444" },
    { key: "open", label: "Open", tone: "#16a34a" },
    { key: "pending", label: "Pending", tone: "#d97706" },
    { key: "pending_dispatch", label: "Dispatch", tone: "#7c3aed" },
    { key: "resolved", label: "Resolved", tone: "#64748b" },
    { key: "closed", label: "Closed", tone: "#64748b" },
    { key: "queue", label: "Queue", tone: "#d97706" },
];

const WA_GREEN = "#25D366";

// ── Single conversation row ───────────────────────────────────────────────────

const ConversationRow: React.FC<{
    conv: Conversation;
    selected: boolean;
    onClick: () => void;
    showWindowBadge: boolean;
}> = ({ conv, selected, onClick, showWindowBadge }) => {
    const cfg = CHANNEL_CONFIG[conv.channel];
    const statusCfg = STATUS_CONFIG[conv.status];
    const hasUnread = conv.unread_count > 0;
    const name = conv.external_contact_name || conv.external_contact_phone || conv.external_contact_id;
    const inCheckout = !!conv.pending_marketplace_order;
    const inBooking = !!conv.pending_booking;
    const quiet = conv.status === "resolved" || conv.status === "closed";

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => (e.key === "Enter" ? onClick() : undefined)}
            className="omni-conv-row"
            style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                padding: "10px 14px",
                cursor: "pointer",
                background: selected ? "#f0f2f5" : "#fff",
                borderLeft: `3px solid ${selected ? cfg?.color || WA_GREEN : "transparent"}`,
                opacity: quiet && !selected ? 0.75 : 1,
            }}
        >
            <ContactAvatar
                size={44}
                name={name}
                seed={conv.external_contact_id}
                badgeColor={cfg?.color}
                badgeIcon={cfg?.icon}
            />

            <div style={{ flex: 1, minWidth: 0, borderBottom: "1px solid #f0f2f5", paddingBottom: 10, marginBottom: -10 }}>
                {/* Name + time */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <Text
                        style={{
                            fontSize: 14,
                            fontWeight: hasUnread ? 600 : 500,
                            color: "#111b21",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {name}
                    </Text>
                    <Text
                        style={{
                            fontSize: 11,
                            flexShrink: 0,
                            color: hasUnread ? WA_GREEN : "#667781",
                            fontWeight: hasUnread ? 600 : 400,
                        }}
                    >
                        {chatTime(conv.last_message_at)}
                    </Text>
                </div>

                {/* Preview + unread */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <Text
                        style={{
                            fontSize: 13,
                            color: hasUnread ? "#111b21" : "#667781",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {conv.last_message_preview || "No messages yet"}
                    </Text>
                    {hasUnread && (
                        <span
                            style={{
                                background: WA_GREEN,
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: 600,
                                minWidth: 20,
                                height: 20,
                                borderRadius: 10,
                                padding: "0 6px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            {conv.unread_count > 99 ? "99+" : conv.unread_count}
                        </span>
                    )}
                </div>

                {/* Status · flow · window · assignee */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, minHeight: 16 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusCfg.color }} />
                        <Text style={{ fontSize: 10.5, color: "#667781" }}>{statusCfg.label}</Text>
                    </span>
                    {inCheckout && (
                        <Tooltip title="Customer is in a guided checkout">
                            <Tag icon={<ShoppingCartOutlined />} color="green" style={{ fontSize: 10, lineHeight: "15px", padding: "0 5px", margin: 0 }}>
                                Checkout
                            </Tag>
                        </Tooltip>
                    )}
                    {inBooking && (
                        <Tooltip title="Customer is booking an appointment">
                            <Tag icon={<CalendarOutlined />} color="purple" style={{ fontSize: 10, lineHeight: "15px", padding: "0 5px", margin: 0 }}>
                                Booking
                            </Tag>
                        </Tooltip>
                    )}
                    {showWindowBadge && conv.channel === "whatsapp" && conv.is_window_open === false && (
                        <Tooltip title="24-hour window closed — only templates can be sent">
                            <Tag color="red" style={{ fontSize: 10, lineHeight: "15px", padding: "0 5px", margin: 0 }}>
                                24h closed
                            </Tag>
                        </Tooltip>
                    )}
                    {conv.assigned_to && (
                        <Tooltip title={`Assigned to ${conv.assigned_to.fullname}`}>
                            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <Avatar size={16} src={conv.assigned_to.thumbnail} icon={<UserOutlined />} style={{ fontSize: 9 }} />
                                <Text style={{ fontSize: 10.5, color: "#667781", maxWidth: 80 }} ellipsis>
                                    {conv.assigned_to.fullname.split(" ")[0]}
                                </Text>
                            </span>
                        </Tooltip>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

const ConversationList: React.FC<Props> = ({
    conversations,
    loading,
    selectedId,
    activeStatus,
    total,
    page,
    pageSize,
    search,
    statusCounts,
    queueCount,
    isAdmin,
    agents = [],
    selectedAgent,
    showWindowBadge = false,
    onSelect,
    onSearchChange,
    onStatusChange,
    onPageChange,
    onAgentChange,
}) => {
    const isMobile = !Grid.useBreakpoint().md;

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
            <style>{`.omni-conv-row:hover { background: #f5f6f6 !important; }`}</style>

            {/* ── Search & agent filter ── */}
            <div style={{ padding: isMobile ? "8px 10px 6px" : "10px 12px 6px", display: "flex", gap: 8 }}>
                <Input
                    placeholder="Search or start a new chat"
                    prefix={<SearchOutlined style={{ color: "#8696a0" }} />}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    allowClear
                    variant="filled"
                    style={{ flex: 1, borderRadius: 8, background: "#f0f2f5" }}
                />
                {onAgentChange && (
                    <Select
                        value={selectedAgent}
                        onChange={onAgentChange}
                        variant="filled"
                        popupMatchSelectWidth={200}
                        style={{ width: isMobile ? 120 : 140 }}
                        options={[
                            { value: "", label: "All agents" },
                            { value: "mine", label: "Assigned to me" },
                            ...agents.map((a) => ({ value: a._id, label: a.fullname })),
                        ]}
                    />
                )}
            </div>

            {/* ── Status pills ── */}
            <HScroll padding="4px 12px 10px" style={{ flexShrink: 0 }}>
                {STATUS_FILTERS.filter((f) => isAdmin || f.key !== "queue").map((f) => {
                    const active = activeStatus === f.key;
                    const count = f.key === "queue" ? queueCount || 0 : statusCounts[f.key] || 0;
                    return (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => onStatusChange(f.key)}
                            style={{
                                flexShrink: 0,
                                border: "none",
                                cursor: "pointer",
                                borderRadius: 999,
                                padding: "4px 12px",
                                fontSize: 12.5,
                                fontWeight: active ? 600 : 500,
                                background: active ? "#d9fdd3" : "#f0f2f5",
                                color: active ? "#008069" : "#54656f",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            {f.label}
                            {f.key !== "all" && count > 0 && (
                                <span
                                    style={{
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        color: active ? "#008069" : f.tone,
                                    }}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </HScroll>

            {/* ── List ── */}
            <div style={{ flex: 1, overflowY: "auto", borderTop: "1px solid #f0f2f5" }}>
                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                        <Spin />
                    </div>
                ) : conversations.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                {search
                                    ? "No chats match your search"
                                    : activeStatus === "needs_reply"
                                        ? "You're all caught up 🎉"
                                        : "No conversations here yet"}
                            </Text>
                        }
                        style={{ marginTop: 48 }}
                    />
                ) : (
                    conversations.map((conv) => (
                        <ConversationRow
                            key={conv._id}
                            conv={conv}
                            selected={selectedId === conv._id}
                            onClick={() => onSelect(conv)}
                            showWindowBadge={showWindowBadge}
                        />
                    ))
                )}
            </div>

            {/* ── Pagination ── */}
            {total > pageSize && (
                <div
                    style={{
                        padding: "6px 12px",
                        borderTop: "1px solid #f0f2f5",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Text style={{ fontSize: 11, color: "#667781" }}>
                        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                    </Text>
                    <Pagination simple size="small" current={page} pageSize={pageSize} total={total} onChange={onPageChange} />
                </div>
            )}
        </div>
    );
};

export default ConversationList;
