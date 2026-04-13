import React from "react";
import {
    Input,
    List,
    Avatar,
    Badge,
    Typography,
    Space,
    Tag,
    Spin,
    Empty,
    Tabs,
    Tooltip,
} from "antd";
import {
    SearchOutlined,
    UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
    Conversation,
    ConversationStatus,
    CHANNEL_CONFIG,
    STATUS_CONFIG,
} from "./OmnichannelInboxPage";

dayjs.extend(relativeTime);

const { Text } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
    conversations: Conversation[];
    loading: boolean;
    selectedId: string | null;
    activeStatus: ConversationStatus | "all";
    total: number;
    page: number;
    pageSize: number;
    search: string;
    statusCounts: Record<string, number>;
    primaryColor: string;
    onSelect: (conv: Conversation) => void;
    onSearchChange: (v: string) => void;
    onStatusChange: (s: ConversationStatus | "all") => void;
    onPageChange: (p: number) => void;
}

// ── Status tab items ──────────────────────────────────────────────────────────

const STATUS_TABS: { key: ConversationStatus | "all"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "pending", label: "Pending" },
    { key: "resolved", label: "Resolved" },
    { key: "closed", label: "Closed" },
];

// ── Channel dot indicator ─────────────────────────────────────────────────────

const ChannelDot: React.FC<{ channel: string }> = ({ channel }) => {
    const cfg = CHANNEL_CONFIG[channel];
    if (!cfg) return null;
    return (
        <Tooltip title={cfg.label}>
            <span
                style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: cfg.color,
                    flexShrink: 0,
                }}
            />
        </Tooltip>
    );
};

// ── Single conversation row ───────────────────────────────────────────────────

const ConversationRow: React.FC<{
    conv: Conversation;
    selected: boolean;
    onClick: () => void;
}> = ({ conv, selected, onClick }) => {
    const cfg = CHANNEL_CONFIG[conv.channel];
    const statusCfg = STATUS_CONFIG[conv.status];
    const timeAgo = conv.last_message_at
        ? dayjs(conv.last_message_at).fromNow()
        : "";
    const hasUnread = conv.unread_count > 0;
    const windowOpen = conv.is_window_open;

    return (
        <div
            onClick={onClick}
            style={{
                padding: "12px 16px",
                cursor: "pointer",
                borderBottom: "1px solid #f5f5f5",
                background: selected ? "#f0f7ff" : "transparent",
                borderLeft: selected ? `3px solid ${cfg?.color || "#1677ff"}` : "3px solid transparent",
                transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
                if (!selected)
                    (e.currentTarget as HTMLDivElement).style.background = "#fafafa";
            }}
            onMouseLeave={(e) => {
                if (!selected)
                    (e.currentTarget as HTMLDivElement).style.background = "transparent";
            }}
        >
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                {/* Avatar with channel dot */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar
                        icon={<UserOutlined />}
                        size={38}
                        style={{
                            backgroundColor: cfg?.bg || "#f0f0f0",
                            color: cfg?.color || "#8c8c8c",
                            fontSize: 16,
                        }}
                    />
                    <span
                        style={{
                            position: "absolute",
                            bottom: -1,
                            right: -1,
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            backgroundColor: cfg?.color || "#8c8c8c",
                            border: "2px solid #fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 7,
                        }}
                    >
                        {cfg?.icon}
                    </span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name row */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 2,
                        }}
                    >
                        <Text
                            strong={hasUnread}
                            style={{
                                fontSize: 13,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 160,
                            }}
                        >
                            {conv.external_contact_name || conv.external_contact_id}
                        </Text>
                        <Text
                            type="secondary"
                            style={{ fontSize: 11, flexShrink: 0, marginLeft: 6 }}
                        >
                            {timeAgo}
                        </Text>
                    </div>

                    {/* Preview row */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Text
                            type="secondary"
                            style={{
                                fontSize: 12,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 170,
                                fontWeight: hasUnread ? 500 : 400,
                                color: hasUnread ? "#262626" : undefined,
                            }}
                        >
                            {conv.last_message_preview || "No messages yet"}
                        </Text>

                        {/* Right side badges */}
                        <Space size={4} style={{ flexShrink: 0, marginLeft: 6 }}>
                            {hasUnread && (
                                <Badge
                                    count={conv.unread_count}
                                    size="small"
                                    style={{
                                        backgroundColor: cfg?.color || "#1677ff",
                                        fontSize: 10,
                                        minWidth: 16,
                                        height: 16,
                                        lineHeight: "16px",
                                    }}
                                />
                            )}
                        </Space>
                    </div>

                    {/* Status + window row */}
                    <div style={{ marginTop: 4, display: "flex", gap: 4, alignItems: "center" }}>
                        <Badge
                            status={statusCfg.badge}
                            text={
                                <Text style={{ fontSize: 10, color: "#8c8c8c" }}>
                                    {statusCfg.label}
                                </Text>
                            }
                        />
                        {conv.channel === "whatsapp" && (
                            <Tooltip
                                title={
                                    windowOpen
                                        ? "24hr window open — free-form replies allowed"
                                        : "24hr window closed — templates only"
                                }
                            >
                                <Tag
                                    style={{
                                        fontSize: 9,
                                        padding: "0 4px",
                                        lineHeight: "14px",
                                        height: 14,
                                        border: "none",
                                        background: windowOpen ? "#f6ffed" : "#fff1f0",
                                        color: windowOpen ? "#52c41a" : "#ff4d4f",
                                        marginLeft: 2,
                                    }}
                                >
                                    {windowOpen ? "24h ✓" : "24h ✗"}
                                </Tag>
                            </Tooltip>
                        )}
                        {conv.assigned_to && (
                            <Tooltip title={`Assigned to ${conv.assigned_to.fullname}`}>
                                <Avatar
                                    size={14}
                                    src={conv.assigned_to.thumbnail}
                                    icon={<UserOutlined />}
                                    style={{ fontSize: 8 }}
                                />
                            </Tooltip>
                        )}
                    </div>
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
    primaryColor,
    onSelect,
    onSearchChange,
    onStatusChange,
    onPageChange,
}) => {
    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

            {/* ── Search ── */}
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #f0f0f0" }}>
                <Input
                    placeholder="Search conversations…"
                    prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    allowClear
                    size="middle"
                />
            </div>

            {/* ── Status tabs ── */}
            <Tabs
                activeKey={activeStatus}
                onChange={(k) => onStatusChange(k as ConversationStatus | "all")}
                size="small"
                style={{ paddingLeft: 8, paddingRight: 8 }}
                tabBarStyle={{ marginBottom: 0 }}
                items={STATUS_TABS.map((tab) => ({
                    key: tab.key,
                    label: (
                        <Space size={4}>
                            <span style={{ fontSize: 12 }}>{tab.label}</span>
                            {tab.key !== "all" && (statusCounts[tab.key] || 0) > 0 && (
                                <Badge
                                    count={statusCounts[tab.key]}
                                    size="small"
                                    style={{
                                        fontSize: 9,
                                        backgroundColor:
                                            tab.key === "open"
                                                ? "#52c41a"
                                                : tab.key === "pending"
                                                    ? "#faad14"
                                                    : "#8c8c8c",
                                    }}
                                />
                            )}
                        </Space>
                    ),
                }))}
            />

            {/* ── List ── */}
            <div style={{ flex: 1, overflowY: "auto" }}>
                {loading ? (
                    <div
                        style={{ display: "flex", justifyContent: "center", padding: 40 }}
                    >
                        <Spin />
                    </div>
                ) : conversations.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                {search ? "No conversations match your search" : "No conversations yet"}
                            </Text>
                        }
                        style={{ marginTop: 40 }}
                    />
                ) : (
                    conversations.map((conv) => (
                        <ConversationRow
                            key={conv._id}
                            conv={conv}
                            selected={selectedId === conv._id}
                            onClick={() => onSelect(conv)}
                        />
                    ))
                )}
            </div>

            {/* ── Pagination ── */}
            {total > pageSize && (
                <div
                    style={{
                        padding: "8px 12px",
                        borderTop: "1px solid #f0f0f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {(page - 1) * pageSize + 1}–
                        {Math.min(page * pageSize, total)} of {total}
                    </Text>
                    <Space size={4}>
                        <button
                            onClick={() => onPageChange(page - 1)}
                            disabled={page === 1}
                            style={{
                                border: "1px solid #d9d9d9",
                                background: page === 1 ? "#f5f5f5" : "#fff",
                                cursor: page === 1 ? "not-allowed" : "pointer",
                                borderRadius: 4,
                                padding: "2px 8px",
                                fontSize: 12,
                                color: page === 1 ? "#bfbfbf" : "#262626",
                            }}
                        >
                            ‹
                        </button>
                        <button
                            onClick={() => onPageChange(page + 1)}
                            disabled={page * pageSize >= total}
                            style={{
                                border: "1px solid #d9d9d9",
                                background: page * pageSize >= total ? "#f5f5f5" : "#fff",
                                cursor: page * pageSize >= total ? "not-allowed" : "pointer",
                                borderRadius: 4,
                                padding: "2px 8px",
                                fontSize: 12,
                                color: page * pageSize >= total ? "#bfbfbf" : "#262626",
                            }}
                        >
                            ›
                        </button>
                    </Space>
                </div>
            )}
        </div>
    );
};

export default ConversationList;