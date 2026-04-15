import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Button,
    Typography,
    Row,
    Col,
    Table,
    Badge,
    Space,
    Skeleton,
    Progress,
    Empty,
    Flex,
    Divider,
    Tag,
    Select,
    DatePicker,
    Radio,
    Drawer,
    Avatar,
    Tooltip,
} from "antd";
import {
    ReloadOutlined,
    CalendarOutlined,
    MessageOutlined,
    TeamOutlined,
    WifiOutlined,
    CustomerServiceOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    FireOutlined,
    RiseOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    FilterOutlined,
    UserOutlined,
    PhoneOutlined,
    GlobalOutlined,
    ShopOutlined,
    StarOutlined,
    SyncOutlined,
    WalletOutlined,
} from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Line } from "@ant-design/charts";
import { useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";
import { fetchConversations, fetchWhatsappChannels } from "@services/whatsappService";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ── Constants ─────────────────────────────────────────────────────────────────
const COLORS = {
    primary: "#6c1c2c",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    purple: "#6366f1",
    orange: "#f97316",
    cyan: "#0d9488",
    teal: "#0d9488",
    blue: "#3b82f6",
    gray: "#64748b",
    lightGray: "#f8fafc",
    text: "#0f172a",
    subtext: "#64748b",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

const PERIOD_LABELS: Record<string, string> = {
    day: "Today", week: "This Week", month: "This Month",
    year: "This Year", custom: "Custom Period",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtK = (v: number) => {
    if (!v && v !== 0) return "0";
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toLocaleString("en-KE", { minimumFractionDigits: 0 });
};

const getStoredShopId = (): string => {
    try {
        const v = localStorage.getItem("shopId");
        return v && v !== "{}" && v !== "null" ? v : "";
    } catch { return ""; }
};

// ── Mobile hook ───────────────────────────────────────────────────────────────
const useIsMobile = () => {
    const [v, setV] = React.useState(window.innerWidth < 768);
    React.useEffect(() => {
        const h = () => setV(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return v;
};

// ── API helpers ───────────────────────────────────────────────────────────────
const fetchShops = async () => {
    const res = await axiosInstance.get(`${BASE_URL}/shops`);
    return res.data;
};

const fetchRecentCustomers = async (params: { shop_id?: string; limit?: number }) => {
    const res = await axiosInstance.get(`${BASE_URL}/customers`, {
        params: { ...params, sort: "-createdAt" },
    });
    return Array.isArray(res.data) ? res.data : res.data?.customers || [];
};

const fetchMtejaStats = async (params: Record<string, any>) => {
    try {
        const res = await axiosInstance.get(`${BASE_URL}/customers/mteja-stats`, { params });
        return res.data;
    } catch { return {}; }
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
interface KPICardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    pctChange?: number | null;
    prefix?: string;
    suffix?: string;
    onClick?: () => void;
    loading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
    title, value, icon, color, bg, pctChange, prefix = "", suffix, onClick, loading,
}) => (
    <Col xs={12} sm={12} lg={6}>
        <div
            onClick={onClick}
            style={{
                background: bg, borderRadius: 12, padding: "18px 20px", height: "100%",
                position: "relative", overflow: "hidden",
                cursor: onClick ? "pointer" : "default",
                transition: "box-shadow 0.2s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
            onMouseEnter={(e) => { if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}
        >
            <div style={{
                position: "absolute", right: -16, top: -16,
                width: 80, height: 80, borderRadius: "50%", background: `${color}18`,
            }} />
            {loading ? <Skeleton active paragraph={false} /> : (
                <Space direction="vertical" size={4} style={{ width: "100%", position: "relative", zIndex: 1 }}>
                    <Space align="center" size={6}>
                        <div style={{
                            background: `${color}20`, borderRadius: 8,
                            padding: "5px 7px", color, fontSize: 16, lineHeight: 1,
                        }}>
                            {icon}
                        </div>
                        <Text style={{ fontSize: 11, color: COLORS.subtext, fontWeight: 500 }}>{title}</Text>
                    </Space>
                    <Text strong style={{ fontSize: 20, color: COLORS.text, display: "block", lineHeight: 1.2 }}>
                        {prefix ? `${prefix} ` : ""}
                        {typeof value === "number" ? fmtK(value) : value}
                        {suffix && <span style={{ fontSize: 11, marginLeft: 4, color: COLORS.subtext }}>{suffix}</span>}
                    </Text>
                    {pctChange !== null && pctChange !== undefined && (
                        <Space size={3}>
                            {pctChange >= 0
                                ? <ArrowUpOutlined style={{ color: COLORS.success, fontSize: 10 }} />
                                : <ArrowDownOutlined style={{ color: COLORS.error, fontSize: 10 }} />}
                            <Text style={{ fontSize: 10, color: pctChange >= 0 ? COLORS.success : COLORS.error }}>
                                {Math.abs(pctChange).toFixed(1)}% vs last period
                            </Text>
                        </Space>
                    )}
                </Space>
            )}
        </div>
    </Col>
);

// ── MetricTile ────────────────────────────────────────────────────────────────
const MetricTile: React.FC<{ value: any; label: string; color: string; isMobile: boolean }> = ({
    value, label, color, isMobile,
}) => (
    <Col xs={12} sm={6}>
        <div style={{
            textAlign: "center", padding: isMobile ? "10px 6px" : "16px 12px",
            background: COLORS.bg, borderRadius: 8, borderLeft: `3px solid ${color}`,
        }}>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color, marginBottom: 4, wordBreak: "break-word" }}>
                {value}
            </div>
            <div style={{ color: COLORS.gray, fontSize: isMobile ? 11 : 12 }}>{label}</div>
        </div>
    </Col>
);

// ── Channel dot indicator ─────────────────────────────────────────────────────
const ChannelDot: React.FC<{ color: string; label: string; count: number; connected: boolean }> = ({
    color, label, count, connected,
}) => (
    <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 10px",
        background: connected ? `${color}08` : COLORS.bg,
        border: `1px solid ${connected ? color + "40" : COLORS.border}`,
        borderRadius: 8, flex: 1,
    }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? color : "#d1d5db", flexShrink: 0 }} />
        <Text style={{ fontSize: 12, color: COLORS.text, flex: 1 }}>{label}</Text>
        <Text strong style={{ fontSize: 13, color: connected ? color : COLORS.gray }}>{count}</Text>
    </div>
);

// ── Conversation status bar ───────────────────────────────────────────────────
const ConversationStatusBar: React.FC<{
    open: number; pending: number; resolved: number; closed: number; loading: boolean;
}> = ({ open, pending, resolved, closed, loading }) => {
    const total = open + pending + resolved + closed || 1;
    const items = [
        { label: "Open", value: open, color: COLORS.success },
        { label: "Pending", value: pending, color: COLORS.warning },
        { label: "Resolved", value: resolved, color: COLORS.blue },
        { label: "Closed", value: closed, color: COLORS.gray },
    ];
    return (
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", gap: 2 }}>
                {items.map((item) => (
                    <div key={item.label} style={{
                        flex: item.value, background: item.color,
                        minWidth: item.value > 0 ? 4 : 0, transition: "flex 0.4s",
                    }} />
                ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {items.map((item) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                        <Text style={{ fontSize: 11, color: COLORS.subtext }}>{item.label}</Text>
                        <Text strong style={{ fontSize: 12, color: COLORS.text }}>{loading ? "…" : item.value}</Text>
                        <Text style={{ fontSize: 10, color: COLORS.subtext }}>
                            ({loading ? "…" : Math.round((item.value / total) * 100)}%)
                        </Text>
                    </div>
                ))}
            </div>
        </Space>
    );
};

// ── Conversation table columns ────────────────────────────────────────────────
const createConvColumns = (isMobile: boolean) => {
    const CH_COLORS: Record<string, string> = {
        whatsapp: "#25D366", messenger: "#0084FF", instagram: "#E1306C",
    };
    const ST_COLORS: Record<string, string> = {
        open: COLORS.success, pending: COLORS.warning, resolved: COLORS.blue, closed: COLORS.gray,
    };

    if (isMobile) return [
        {
            title: "Contact", dataIndex: "external_contact_name", key: "name",
            render: (name: string, r: any) => (
                <Space size={6}>
                    <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: CH_COLORS[r.channel] || COLORS.gray, flexShrink: 0,
                    }} />
                    <Text style={{ fontSize: 12 }}>{name || r.external_contact_phone || "Unknown"}</Text>
                </Space>
            ),
        },
        {
            title: "Status", dataIndex: "status", key: "status", width: 80,
            render: (s: string) => (
                <Badge color={ST_COLORS[s] || COLORS.gray} text={<span style={{ fontSize: 11 }}>{s}</span>} />
            ),
        },
        {
            title: "Unread", dataIndex: "unread_count", key: "unread", width: 60,
            render: (n: number) => n > 0
                ? <Badge count={n} style={{ backgroundColor: COLORS.primary }} />
                : <Text style={{ color: COLORS.gray, fontSize: 11 }}>—</Text>,
        },
    ];

    return [
        {
            title: "Channel", dataIndex: "channel", key: "channel", width: 100,
            render: (ch: string) => (
                <Tag style={{
                    background: (CH_COLORS[ch] || COLORS.gray) + "15",
                    color: CH_COLORS[ch] || COLORS.gray,
                    border: "none", fontSize: 11, borderRadius: 4,
                }}>
                    {ch === "whatsapp" ? "💬" : ch === "messenger" ? "💙" : "📸"} {ch}
                </Tag>
            ),
        },
        {
            title: "Contact", dataIndex: "external_contact_name", key: "name",
            render: (name: string, r: any) => (
                <div>
                    <div style={{ fontWeight: 500, fontSize: 13, color: COLORS.text }}>
                        {name || r.external_contact_phone || "Unknown"}
                    </div>
                    {r.last_message_preview && (
                        <div style={{ fontSize: 11, color: COLORS.gray, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                            {r.last_message_preview}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: "Status", dataIndex: "status", key: "status", width: 100,
            render: (s: string) => (
                <Tag style={{
                    background: (ST_COLORS[s] || COLORS.gray) + "15",
                    color: ST_COLORS[s] || COLORS.gray,
                    border: "none", fontSize: 11, borderRadius: 4,
                }}>
                    {s?.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: "Unread", dataIndex: "unread_count", key: "unread", width: 70, align: "center" as const,
            render: (n: number) => n > 0
                ? <Badge count={n} style={{ backgroundColor: COLORS.primary }} />
                : <Text style={{ color: COLORS.gray, fontSize: 11 }}>—</Text>,
        },
        {
            title: "Last Message", dataIndex: "last_message_at", key: "last", width: 110,
            render: (t: string) => <Text style={{ fontSize: 11, color: COLORS.gray }}>{t ? dayjs(t).fromNow() : "—"}</Text>,
        },
    ];
};

// ── Customer table columns ────────────────────────────────────────────────────
const createCustomerColumns = (isMobile: boolean) => {
    if (isMobile) return [
        {
            title: "Customer", dataIndex: "customer_name", key: "name",
            render: (name: string) => (
                <Space size={6}>
                    <Avatar size={28} style={{ background: `${COLORS.primary}20`, color: COLORS.primary, fontSize: 12 }}>
                        {(name || "?")[0].toUpperCase()}
                    </Avatar>
                    <Text style={{ fontSize: 12 }}>{name}</Text>
                </Space>
            ),
        },
        {
            title: "Added", dataIndex: "createdAt", key: "added", width: 80,
            render: (t: string) => <Text style={{ fontSize: 11, color: COLORS.gray }}>{t ? dayjs(t).fromNow(true) : "—"}</Text>,
        },
    ];

    return [
        {
            title: "Customer", dataIndex: "customer_name", key: "name",
            render: (name: string) => (
                <Space size={8}>
                    <Avatar size={32} style={{ background: `${COLORS.primary}20`, color: COLORS.primary, fontSize: 13 }}>
                        {(name || "?")[0].toUpperCase()}
                    </Avatar>
                    <Text strong style={{ fontSize: 13 }}>{name || "—"}</Text>
                </Space>
            ),
        },
        {
            title: "Phone", dataIndex: "phone", key: "phone", width: 130,
            render: (p: string) => <Text style={{ fontSize: 12, color: COLORS.gray }}>{p ? String(p) : "—"}</Text>,
        },
        {
            title: "Email", dataIndex: "email", key: "email",
            render: (e: string) => <Text style={{ fontSize: 12, color: COLORS.gray }} ellipsis>{e || "—"}</Text>,
        },
        {
            title: "Registered", dataIndex: "createdAt", key: "added", width: 110,
            render: (t: string) => <Text style={{ fontSize: 11, color: COLORS.gray }}>{t ? dayjs(t).fromNow() : "—"}</Text>,
        },
    ];
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const MtejaDashboard: React.FC = () => {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const storedShopId = getStoredShopId();
    const queryClient = useQueryClient();

    // Derive admin mode purely from URL — do NOT rely on localStorage role
    const isAdminLayout = window.location.pathname.startsWith("/admin");
    const navTo = (bare: string) => navigate(isAdminLayout ? `/admin${bare}` : bare);

    // ── Filters ────────────────────────────────────────────────────────────────
    const [selectedShopId, setSelectedShopId] = useState<string>(
        isAdminLayout ? "" : storedShopId
    );
    const [periodFilter, setPeriodFilter] = useState("month");
    const [customDateRange, setCustomDateRange] = useState<any[]>([]);
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [convStatus, setConvStatus] = useState<"all" | "open" | "pending" | "resolved">("all");

    // shopId passed to every API call
    const shopId = isAdminLayout ? selectedShopId : storedShopId;

    // ── Queries ────────────────────────────────────────────────────────────────
    const { data: shopsData } = useQuery({
        queryKey: ["mteja-shops"],
        queryFn: fetchShops,
        enabled: isAdminLayout,
        staleTime: 60_000,
    });
    const shops: any[] = Array.isArray(shopsData) ? shopsData : shopsData?.shops || [];

    // Auto-select first shop when on admin layout and no shop is selected
    useEffect(() => {
        if (isAdminLayout && shops.length > 0 && !selectedShopId) {
            setSelectedShopId(shops[0]._id);
        }
    }, [isAdminLayout, shops, selectedShopId]);

    // ── Date range ─────────────────────────────────────────────────────────────
    const { startDate, endDate } = useMemo(() => {
        const today = dayjs();
        switch (periodFilter) {
            case "day": return { startDate: today.startOf("day"), endDate: today.endOf("day") };
            case "week": return { startDate: today.startOf("week"), endDate: today.endOf("week") };
            case "month": return { startDate: today.startOf("month"), endDate: today.endOf("month") };
            case "year": return { startDate: today.startOf("year"), endDate: today.endOf("year") };
            case "custom":
                if (customDateRange?.length === 2)
                    return { startDate: customDateRange[0].startOf("day"), endDate: customDateRange[1].endOf("day") };
                return { startDate: today.startOf("month"), endDate: today.endOf("day") };
            default: return { startDate: today.startOf("month"), endDate: today.endOf("day") };
        }
    }, [periodFilter, customDateRange]);

    const dateRangeLabel = useMemo(() => {
        const fmt = "MMM D, YYYY";
        if (periodFilter === "day") return startDate.format("MMM D, YYYY");
        if (periodFilter === "month") return startDate.format("MMMM YYYY");
        if (periodFilter === "year") return startDate.format("YYYY");
        if (periodFilter === "custom" && customDateRange?.length === 2)
            return `${customDateRange[0].format(fmt)} – ${customDateRange[1].format(fmt)}`;
        return `${startDate.format(fmt)} – ${endDate.format(fmt)}`;
    }, [periodFilter, startDate, endDate, customDateRange]);

    const start_date = startDate.format("YYYY-MM-DD");
    const end_date = endDate.format("YYYY-MM-DD");

    const { data: channelsData, isLoading: channelsLoading } = useQuery({
        queryKey: ["mteja-channels", shopId],
        queryFn: () => fetchWhatsappChannels({ shop_id: shopId || undefined }),
        staleTime: 60_000, retry: 1,
    });
    const channels = channelsData?.channels || [];
    const connected = {
        whatsapp: channels.some((c: any) => c.channel === "whatsapp" && c.is_active),
        messenger: channels.some((c: any) => c.channel === "messenger" && c.is_active),
        instagram: channels.some((c: any) => c.channel === "instagram" && c.is_active),
    };
    const connectedCount = Object.values(connected).filter(Boolean).length;

    const { data: convData, isLoading: convLoading, refetch: refetchConv, isRefetching: convRefetching } = useQuery({
        queryKey: ["mteja-conversations", shopId, convStatus],
        queryFn: () => fetchConversations({
            shop_id: shopId || undefined,
            status: convStatus === "all" ? undefined : convStatus,
            page: 1, limit: 100,
        }),
        staleTime: 10_000, refetchInterval: 30_000,
    });
    const conversations: any[] = convData?.conversations || [];
    const totalConversations = convData?.total || conversations.length;

    const convCounts = useMemo(() => {
        const c = { open: 0, pending: 0, resolved: 0, closed: 0 };
        conversations.forEach((v) => { if (v.status in c) c[v.status as keyof typeof c]++; });
        return c;
    }, [conversations]);

    const channelCounts = useMemo(() => {
        const c = { whatsapp: 0, messenger: 0, instagram: 0 };
        conversations.forEach((v) => { if (v.channel in c) c[v.channel as keyof typeof c]++; });
        return c;
    }, [conversations]);

    const unreadCount = useMemo(
        () => conversations.reduce((s, c) => s + (c.unread_count || 0), 0),
        [conversations]
    );

    const { data: recentCustomers, isLoading: custLoading } = useQuery({
        queryKey: ["mteja-recent-customers", shopId],
        queryFn: () => fetchRecentCustomers({ shop_id: shopId || undefined, limit: 8 }),
        staleTime: 30_000,
    });
    const customerList: any[] = Array.isArray(recentCustomers) ? recentCustomers : [];

    const { data: mtejaStats, isLoading: statsLoading } = useQuery({
        queryKey: ["mteja-stats", shopId, start_date, end_date],
        queryFn: () => fetchMtejaStats({ shop_id: shopId || undefined, start_date, end_date }),
        staleTime: 30_000,
    });
    const alertsSent = mtejaStats?.alerts_sent || mtejaStats?.sms_sent || 0;
    const referrals = mtejaStats?.referrals || 0;

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleRefresh = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["mteja-conversations"] });
        queryClient.invalidateQueries({ queryKey: ["mteja-recent-customers"] });
        queryClient.invalidateQueries({ queryKey: ["mteja-stats"] });
        refetchConv();
    }, [queryClient, refetchConv]);

    const handlePeriodChange = useCallback((val: string) => {
        setPeriodFilter(val);
        setShowCustomPicker(val === "custom");
        if (isMobile) setFilterDrawerOpen(false);
    }, [isMobile]);

    const isDataLoading = convLoading || statsLoading || custLoading;

    // ── KPI cards ──────────────────────────────────────────────────────────────
    const kpiCards: KPICardProps[] = [
        {
            title: "Open Conversations",
            value: convCounts.open,
            icon: <MessageOutlined />,
            color: COLORS.primary, bg: "#f9f0f2",
            pctChange: null, loading: convLoading,
            onClick: () => navTo("/omnichannel"),
        },
        {
            title: "Unread Messages",
            value: unreadCount,
            icon: <FireOutlined />,
            color: unreadCount > 0 ? COLORS.orange : COLORS.gray,
            bg: unreadCount > 0 ? "#fff7ed" : COLORS.bg,
            pctChange: null, loading: convLoading,
        },
        {
            title: "Total Conversations",
            value: totalConversations,
            icon: <MessageOutlined />,
            color: COLORS.blue, bg: "#eff6ff",
            pctChange: null, loading: convLoading,
            onClick: () => navTo("/omnichannel"),
        },
        {
            title: "Connected Channels",
            value: connectedCount,
            suffix: "/ 3",
            icon: <WifiOutlined />,
            color: connectedCount > 0 ? COLORS.teal : COLORS.gray,
            bg: connectedCount > 0 ? "#f0fdfa" : COLORS.bg,
            pctChange: null, loading: channelsLoading,
        },
    ];

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <>
            {/* ── Mobile filter drawer ─────────────────────────────────────────── */}
            <Drawer
                title="Filter Period" placement="bottom" height="auto"
                open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}
                styles={{ body: { paddingBottom: 32 } }}
            >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <Radio.Group value={periodFilter} onChange={(e) => handlePeriodChange(e.target.value)} style={{ width: "100%" }}>
                        <Space direction="vertical" style={{ width: "100%" }}>
                            {Object.entries(PERIOD_LABELS).map(([val, label]) => (
                                <Radio.Button key={val} value={val} style={{ width: "100%", textAlign: "center", borderRadius: 8, marginBottom: 4 }}>
                                    {label}
                                </Radio.Button>
                            ))}
                        </Space>
                    </Radio.Group>
                    {showCustomPicker && (
                        <RangePicker value={customDateRange as any} onChange={(d) => setCustomDateRange(d || [])} allowClear style={{ width: "100%" }} />
                    )}
                </Space>
            </Drawer>

            {/* ── Header ──────────────────────────────────────────────────────────── */}
            <div style={{ marginBottom: 20 }}>
                <Flex justify="space-between" align="flex-start" wrap gap={12}>
                    <Space align="center" size={10}>
                        <div style={{ background: "#f9f0f2", borderRadius: 10, padding: "8px 10px", color: COLORS.primary, fontSize: 18 }}>
                            <CustomerServiceOutlined />
                        </div>
                        <div>
                            <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: COLORS.text }}>
                                {PERIOD_LABELS[periodFilter]} — Mteja Overview
                            </Title>
                            <Text style={{ fontSize: 12, color: COLORS.subtext }}>
                                {dateRangeLabel}
                                {isAdminLayout && !shopId && " · All Branches"}
                                {shopId && shops.find(s => s._id === shopId) && ` · ${shops.find(s => s._id === shopId)?.name}`}
                            </Text>
                        </div>
                    </Space>

                    <Space size="small" wrap>
                        {isMobile ? (
                            <>
                                {/* Branch selector — admin layout only, mobile */}
                                {isAdminLayout && (
                                    <Select
                                        placeholder="Branch"
                                        value={selectedShopId || undefined}
                                        onChange={(v) => setSelectedShopId(v || "")}
                                        allowClear style={{ width: 130 }}
                                        options={[
                                            { label: "All", value: "" },
                                            ...shops.map((s) => ({ label: s.name, value: s._id })),
                                        ]}
                                    />
                                )}
                                <Button icon={<FilterOutlined />} onClick={() => setFilterDrawerOpen(true)} size="middle">
                                    {PERIOD_LABELS[periodFilter]}
                                </Button>
                                <Button type="primary" icon={<ReloadOutlined spin={convRefetching} />}
                                    onClick={handleRefresh} loading={isDataLoading} size="middle"
                                    style={{ background: COLORS.primary, borderColor: COLORS.primary }} />
                            </>
                        ) : (
                            <>
                                {/* Branch selector — admin layout only, desktop */}
                                {isAdminLayout && (
                                    <Select
                                        placeholder={<span><GlobalOutlined style={{ marginRight: 6 }} />All Branches</span>}
                                        value={selectedShopId || undefined}
                                        onChange={(v) => setSelectedShopId(v || "")}
                                        allowClear
                                        style={{ width: 180 }}
                                        options={[
                                            { label: <span><GlobalOutlined style={{ marginRight: 6 }} />All Branches</span>, value: "" },
                                            ...shops.map((s) => ({ label: s.name, value: s._id })),
                                        ]}
                                    />
                                )}
                                <div style={{
                                    background: COLORS.bg, borderRadius: 8, padding: "6px 12px",
                                    display: "flex", alignItems: "center", gap: 10, border: `1px solid ${COLORS.border}`,
                                }}>
                                    <CalendarOutlined style={{ color: COLORS.primary, fontSize: 13 }} />
                                    <Radio.Group value={periodFilter} onChange={(e) => handlePeriodChange(e.target.value)} buttonStyle="solid" size="small">
                                        <Radio.Button value="day">Day</Radio.Button>
                                        <Radio.Button value="week">Week</Radio.Button>
                                        <Radio.Button value="month">Month</Radio.Button>
                                        <Radio.Button value="year">Year</Radio.Button>
                                        <Radio.Button value="custom">Custom</Radio.Button>
                                    </Radio.Group>
                                </div>
                                {showCustomPicker && (
                                    <RangePicker value={customDateRange as any} onChange={(d) => setCustomDateRange(d || [])} allowClear style={{ minWidth: 260 }} />
                                )}
                                <Button type="primary" icon={<ReloadOutlined spin={convRefetching} />}
                                    onClick={handleRefresh} loading={isDataLoading} style={{ fontWeight: 500, background: COLORS.primary, borderColor: COLORS.primary }}>
                                    {convRefetching ? "Refreshing…" : "Refresh"}
                                </Button>
                            </>
                        )}
                    </Space>
                </Flex>
            </div>

            {/* ── KPI Row ───────────────────────────────────────────────────────────── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                {kpiCards.map((card, i) => <KPICard key={i} {...card} />)}
            </Row>

            {/* ── Conversations overview ────────────────────────────────────────────── */}
            <Row style={{ marginBottom: 16 }}>
                <Col span={24}>
                    <ProCard bordered headerBordered size="small"
                        title={
                            <Space size={6}>
                                <MessageOutlined style={{ color: COLORS.primary }} />
                                <Text strong style={{ fontSize: 14 }}>Conversations — {totalConversations.toLocaleString()} total</Text>
                            </Space>
                        }
                        extra={
                            <Space size={8}>
                                <Radio.Group
                                    value={convStatus}
                                    onChange={(e) => setConvStatus(e.target.value)}
                                    buttonStyle="solid" size="small"
                                >
                                    <Radio.Button value="all">All</Radio.Button>
                                    <Radio.Button value="open">Open</Radio.Button>
                                    <Radio.Button value="pending">Pending</Radio.Button>
                                    <Radio.Button value="resolved">Resolved</Radio.Button>
                                </Radio.Group>
                                <Button type="link" size="small" onClick={() => navTo("/omnichannel")}>
                                    Go to Inbox
                                </Button>
                            </Space>
                        }
                        style={{ borderRadius: 12 }}
                    >
                        {convLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : (
                            <Space direction="vertical" size={16} style={{ width: "100%" }}>
                                <ConversationStatusBar
                                    open={convCounts.open} pending={convCounts.pending}
                                    resolved={convCounts.resolved} closed={convCounts.closed}
                                    loading={convLoading}
                                />
                                <Divider style={{ margin: "4px 0" }} />
                                <div>
                                    <Text style={{ fontSize: 11, color: COLORS.subtext, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                                        By Channel
                                    </Text>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <ChannelDot color="#25D366" label="WhatsApp" count={channelCounts.whatsapp} connected={connected.whatsapp} />
                                        <ChannelDot color="#0084FF" label="Messenger" count={channelCounts.messenger} connected={connected.messenger} />
                                        <ChannelDot color="#E1306C" label="Instagram" count={channelCounts.instagram} connected={connected.instagram} />
                                    </div>
                                </div>
                                <Divider style={{ margin: "4px 0" }} />
                                <Table
                                    columns={createConvColumns(isMobile)}
                                    dataSource={conversations.slice(0, 8)}
                                    pagination={{ pageSize: 8, hideOnSinglePage: true, showSizeChanger: false }}
                                    size="small" rowKey="_id"
                                    scroll={{ x: isMobile ? 320 : undefined }}
                                    locale={{
                                        emptyText: (
                                            <Empty
                                                description={connectedCount === 0 ? "Connect a channel to see conversations" : "No conversations yet"}
                                                style={{ padding: "20px 0" }}
                                            />
                                        ),
                                    }}
                                />
                            </Space>
                        )}
                    </ProCard>
                </Col>
            </Row>

            {/* ── Recent Customers ───────────────────────────────────────────── */}
            <Row style={{ marginBottom: 16 }}>
                <Col span={24}>
                    <ProCard bordered headerBordered size="small"
                        title={
                            <Space size={6}>
                                <TeamOutlined style={{ color: COLORS.blue }} />
                                <Text strong style={{ fontSize: 14 }}>Recent Customers</Text>
                            </Space>
                        }
                        extra={
                            <Space size={4}>
                                <Button type="link" size="small" onClick={() => navTo("/customers")}>View All</Button>
                            </Space>
                        }
                        style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}
                    >
                        {custLoading ? (
                            <div style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 4 }} /></div>
                        ) : (
                            <Table
                                columns={createCustomerColumns(isMobile)}
                                dataSource={customerList}
                                pagination={{ pageSize: 8, hideOnSinglePage: true, showSizeChanger: false }}
                                size="small" rowKey="_id"
                                scroll={{ x: isMobile ? 280 : undefined }}
                                locale={{ emptyText: <Empty description="No customers yet" style={{ padding: 20 }} /> }}
                            />
                        )}
                    </ProCard>
                </Col>
            </Row>

            {/* ── Engagement summary ────────────────────────────────────────────────── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col span={24}>
                    <ProCard bordered headerBordered size="small"
                        title={
                            <Space size={6}>
                                <RiseOutlined style={{ color: COLORS.primary }} />
                                <Text strong style={{ fontSize: 14 }}>Engagement Summary — {dateRangeLabel}</Text>
                            </Space>
                        }
                        style={{ borderRadius: 12 }}
                    >
                        {isDataLoading ? <Skeleton active paragraph={{ rows: 2 }} /> : (
                            <>
                                <Row gutter={[8, 8]}>
                                    <MetricTile value={totalConversations} label="Total Conversations" color={COLORS.primary} isMobile={isMobile} />
                                    <MetricTile value={unreadCount} label="Unread Messages" color={unreadCount > 0 ? COLORS.orange : COLORS.gray} isMobile={isMobile} />
                                    <MetricTile value={connectedCount} label="Channels Live" color={connectedCount > 0 ? COLORS.teal : COLORS.gray} isMobile={isMobile} />
                                    <MetricTile value={customerList.length} label="New Customers" color={COLORS.blue} isMobile={isMobile} />
                                </Row>
                                <Divider style={{ margin: "12px 0" }} />
                                <Row gutter={[8, 8]}>
                                    <MetricTile value={alertsSent} label="Alerts Sent" color={COLORS.purple} isMobile={isMobile} />
                                    <MetricTile value={referrals} label="Referrals" color={COLORS.teal} isMobile={isMobile} />
                                    <MetricTile value={convCounts.open} label="Open Conversations" color={COLORS.success} isMobile={isMobile} />
                                    <MetricTile value={convCounts.pending} label="Pending Conversations" color={COLORS.warning} isMobile={isMobile} />
                                </Row>
                                <Divider style={{ margin: "10px 0" }} />
                                <Row gutter={8}>
                                    <Col span={12}>
                                        <div style={{ textAlign: "center", background: COLORS.bg, borderRadius: 8, padding: "10px 8px" }}>
                                            <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: COLORS.success }}>
                                                {Math.round((convCounts.open / (totalConversations || 1)) * 100)}%
                                            </div>
                                            <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>Open rate</div>
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ textAlign: "center", background: COLORS.bg, borderRadius: 8, padding: "10px 8px" }}>
                                            <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: COLORS.warning }}>
                                                {Math.round((convCounts.pending / (totalConversations || 1)) * 100)}%
                                            </div>
                                            <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>Pending rate</div>
                                        </div>
                                    </Col>
                                </Row>
                                {/* Admin scope indicator — only on admin layout */}
                                {isAdminLayout && (
                                    <div style={{
                                        marginTop: 14, padding: "8px 12px",
                                        background: "#f9f0f2", border: `1px solid ${COLORS.primary}20`,
                                        borderRadius: 8, display: "flex", alignItems: "center", gap: 8,
                                    }}>
                                        <ShopOutlined style={{ color: COLORS.primary, fontSize: 13 }} />
                                        <Text style={{ fontSize: 11, color: COLORS.primary }}>
                                            {selectedShopId
                                                ? `Filtered to: ${shops.find(s => s._id === selectedShopId)?.name || "Selected Branch"}`
                                                : "Showing data across all branches"}
                                        </Text>
                                    </div>
                                )}
                            </>
                        )}
                    </ProCard>
                </Col>
            </Row>
        </>
    );
};

export default MtejaDashboard;