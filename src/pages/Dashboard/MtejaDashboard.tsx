import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Button, Typography, Row, Col, Table, Badge, Space, Skeleton,
    Empty, Divider, Tag, Select, DatePicker, Radio, Tooltip,
} from "antd";
import {
    ReloadOutlined, MessageOutlined, TeamOutlined,
    WifiOutlined, FireOutlined, RiseOutlined,
    ArrowUpOutlined, ArrowDownOutlined,
    ShopOutlined, FundOutlined, TrophyOutlined, DollarOutlined,
    PhoneOutlined, CheckCircleOutlined,
    CloseCircleOutlined, ClockCircleOutlined, ThunderboltOutlined,
    BarChartOutlined, AimOutlined,
    StarOutlined, AlertOutlined, SyncOutlined,
} from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";
import { fetchConversations, fetchWhatsappChannels } from "@services/whatsappService";
import { getCallHistory, getAgentStatus } from "@services/twilio";
import { getPermissionChecker } from "@utils/getPermissionChecker";
import { fetchShop } from "@services/shops";
import CallButton from "@components/Twilio/CallButton";
import SMSButton from "@components/Twilio/SMSButton";
import URLShareModal from "@components/URLShareModal";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ── Constants ─────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    success: "#10b981",
    successLight: "#f0fdf4",
    warning: "#f59e0b",
    warningLight: "#fffbeb",
    error: "#ef4444",
    errorLight: "#fef2f2",
    purple: "#6366f1",
    purpleLight: "#f5f3ff",
    orange: "#f97316",
    orangeLight: "#fff7ed",
    teal: "#0d9488",
    tealLight: "#f0fdfa",
    blue: "#3b82f6",
    blueLight: "#eff6ff",
    indigo: "#4f46e5",
    indigoLight: "#eef2ff",
    gray: "#64748b",
    text: "#0f172a",
    subtext: "#64748b",
    border: "#e2e8f0",
    bg: "#f8fafc",
    white: "#ffffff",
};

const LEAD_STAGES = [
    { key: "new", label: "New", color: C.gray },
    { key: "contacted", label: "Contacted", color: C.blue },
    { key: "qualified", label: "Qualified", color: C.purple },
    { key: "proposal", label: "Proposal", color: C.orange },
    { key: "negotiation", label: "Negotiation", color: C.warning },
    { key: "won", label: "Won", color: C.success },
    { key: "lost", label: "Lost", color: C.error },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtK = (v: number) => {
    if (!v && v !== 0) return "0";
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toLocaleString("en-KE", { minimumFractionDigits: 0 });
};

const fmtKES = (v: number) =>
    `KES ${v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1_000 ? (v / 1_000).toFixed(1) + "K" : v.toLocaleString("en-KE")}`;

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

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
const fetchMtejaStats = async (params: Record<string, any>) => {
    try {
        const res = await axiosInstance.get(`${BASE_URL}/api/customers/mteja-stats`, { params });
        return res.data;
    } catch { return {}; }
};
const fetchLeadPipeline = async (params: { shop_id?: string }) => {
    try {
        const res = await axiosInstance.get(`${BASE_URL}/api/crm/leads/pipeline-summary`, { params });
        return res.data;
    } catch { return { stages: [], total_leads: 0, total_value: 0, won_value: 0, conversion_rate: 0 }; }
};

// ── Shared small components ───────────────────────────────────────────────────

/** Compact stat card */
const StatCard: React.FC<{
    title: string; value: string | number; icon: React.ReactNode;
    color: string; bg: string; sub?: string; trend?: number | null;
    onClick?: () => void; loading?: boolean;
}> = ({ title, value, icon, color, bg, sub, trend, onClick, loading }) => (
    <div
        onClick={onClick}
        style={{
            background: bg, borderRadius: 12, padding: "16px 18px",
            border: `1px solid ${color}25`,
            cursor: onClick ? "pointer" : "default",
            transition: "box-shadow .18s, transform .18s",
            position: "relative", overflow: "hidden",
        }}
        onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${color}25`; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; } }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
    >
        {/* decorative circle */}
        <div style={{ position: "absolute", right: -14, top: -14, width: 64, height: 64, borderRadius: "50%", background: `${color}18`, pointerEvents: "none" }} />
        {loading ? <Skeleton active paragraph={{ rows: 1 }} /> : (
            <Space direction="vertical" size={3} style={{ width: "100%", position: "relative", zIndex: 1 }}>
                <Space size={6} align="center">
                    <div style={{ background: `${color}20`, borderRadius: 8, padding: "5px 6px", color, fontSize: 15, lineHeight: 1 }}>{icon}</div>
                    <Text style={{ fontSize: 11, color: C.subtext, fontWeight: 500, lineHeight: 1 }}>{title}</Text>
                </Space>
                <Text strong style={{ fontSize: 22, color: C.text, lineHeight: 1.15, display: "block" }}>
                    {typeof value === "number" ? fmtK(value) : value}
                </Text>
                <Space size={6} align="center">
                    {sub && <Text style={{ fontSize: 11, color: C.subtext }}>{sub}</Text>}
                    {trend !== null && trend !== undefined && (
                        <Space size={2}>
                            {trend >= 0
                                ? <ArrowUpOutlined style={{ color: C.success, fontSize: 9 }} />
                                : <ArrowDownOutlined style={{ color: C.error, fontSize: 9 }} />}
                            <Text style={{ fontSize: 10, color: trend >= 0 ? C.success : C.error }}>{Math.abs(trend).toFixed(1)}%</Text>
                        </Space>
                    )}
                </Space>
            </Space>
        )}
    </div>
);

/** Horizontal bar metric */
const BarRow: React.FC<{ label: string; count: number; total: number; color: string; value?: string; last?: boolean }> = ({ label, count, total, color, value, last }) => {
    const width = total ? Math.max(2, (count / total) * 100) : 0;
    return (
        <div style={{ padding: "7px 0", borderBottom: last ? "none" : `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <Text style={{ fontSize: 12, color: C.text }}>{label}</Text>
                <Space size={8}>
                    {value && <Text style={{ fontSize: 11, color: C.subtext }}>{value}</Text>}
                    <Text style={{ fontSize: 12, fontWeight: 600, color }}>{count}</Text>
                    <Text style={{ fontSize: 11, color: C.subtext }}>({pct(count, total)}%)</Text>
                </Space>
            </div>
            <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${width}%`, height: "100%", background: color, borderRadius: 3, transition: "width .4s ease" }} />
            </div>
        </div>
    );
};

/** Mini funnel step */
const FunnelStep: React.FC<{ label: string; count: number; color: string; maxCount: number; isLast?: boolean }> = ({ label, count, color, maxCount, isLast }) => {
    const w = maxCount ? Math.max(10, (count / maxCount) * 100) : 10;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isLast ? 0 : 4 }}>
            <div style={{ width: `${w}%`, minWidth: 40, maxWidth: "100%", background: color, height: 26, borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 8, transition: "width .4s" }}>
                <Text style={{ fontSize: 11, color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>{count}</Text>
            </div>
            <Text style={{ fontSize: 11, color: C.subtext, whiteSpace: "nowrap" }}>{label}</Text>
        </div>
    );
};

/** KPI badge pill */
const Pill: React.FC<{ label: string; color: string; bg: string }> = ({ label, color, bg }) => (
    <span style={{ background: bg, color, border: `1px solid ${color}30`, borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.3px" }}>{label}</span>
);

// ── Conversation Status Bar ───────────────────────────────────────────────────
const ConversationStatusBar: React.FC<{ open: number; pending: number; resolved: number; closed: number; loading: boolean }> = ({
    open, pending, resolved, closed, loading,
}) => {
    const total = open + pending + resolved + closed || 1;
    const items = [
        { label: "Open", value: open, color: C.success },
        { label: "Pending", value: pending, color: C.warning },
        { label: "Resolved", value: resolved, color: C.blue },
        { label: "Closed", value: closed, color: C.gray },
    ];
    return (
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", gap: 2 }}>
                {items.map(item => (
                    <Tooltip key={item.label} title={`${item.label}: ${item.value} (${pct(item.value, total)}%)`}>
                        <div style={{ flex: item.value || 0.05, background: item.color, transition: "flex .4s", cursor: "pointer" }} />
                    </Tooltip>
                ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
                {items.map(item => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                        <Text style={{ fontSize: 11, color: C.subtext }}>{item.label}</Text>
                        <Text strong style={{ fontSize: 12, color: C.text }}>{item.value}</Text>
                    </div>
                ))}
            </div>
        </Space>
    );
};

// ── Channel dot ───────────────────────────────────────────────────────────────
const ChannelDot: React.FC<{ color: string; label: string; count: number; connected: boolean; pctOfTotal: number }> = ({
    color, label, count, connected, pctOfTotal,
}) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 80, padding: "10px 12px", background: connected ? `${color}08` : C.bg, border: `1px solid ${connected ? color + "40" : C.border}`, borderRadius: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? color : "#d1d5db" }} />
            <Text style={{ fontSize: 12, color: C.text, flex: 1 }}>{label}</Text>
            <Text strong style={{ fontSize: 13, color: connected ? color : C.gray }}>{count}</Text>
        </div>
        <div style={{ height: 3, background: C.border, borderRadius: 2 }}>
            <div style={{ width: `${pctOfTotal}%`, height: "100%", background: color, borderRadius: 2, transition: "width .4s" }} />
        </div>
        <Text style={{ fontSize: 10, color: C.subtext }}>{pctOfTotal}% of conversations</Text>
    </div>
);

// ── Conversion funnel ─────────────────────────────────────────────────────────
const ConversionFunnel: React.FC<{ stages: any[]; totalLeads: number; wonValue: number; loading: boolean }> = ({
    stages, totalLeads, wonValue, loading,
}) => {
    const stageMap = Object.fromEntries((stages || []).map((s: any) => [s._id || s.stage, s]));
    const funnelStages = LEAD_STAGES.filter(s => s.key !== "lost" && s.key !== "disqualified");
    const maxCount = totalLeads || 1;

    if (loading) return <Skeleton active paragraph={{ rows: 4 }} />;

    return (
        <div>
            {funnelStages.map((s, i) => (
                <FunnelStep
                    key={s.key}
                    label={s.label}
                    count={stageMap[s.key]?.count || 0}
                    color={s.color}
                    maxCount={maxCount}
                    isLast={i === funnelStages.length - 1}
                />
            ))}
            {wonValue > 0 && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: C.successLight, borderRadius: 7, border: `1px solid ${C.success}30` }}>
                    <Space size={6}>
                        <CheckCircleOutlined style={{ color: C.success, fontSize: 13 }} />
                        <Text style={{ fontSize: 12, color: C.success, fontWeight: 600 }}>Won Revenue: {fmtKES(wonValue)}</Text>
                    </Space>
                </div>
            )}
        </div>
    );
};

// ── Conversation resolution stats ─────────────────────────────────────────────
const ConvResolutionStats: React.FC<{ convCounts: any; total: number }> = ({ convCounts, total }) => {
    const resolutionRate = pct(convCounts.resolved + convCounts.closed, total);
    const responseRate = pct(total - convCounts.open, total);

    return (
        <Row gutter={[10, 10]}>
            {[
                { label: "Resolution Rate", value: `${resolutionRate}%`, color: C.success, bg: C.successLight, icon: <CheckCircleOutlined /> },
                { label: "Response Rate", value: `${responseRate}%`, color: C.blue, bg: C.blueLight, icon: <SyncOutlined /> },
                { label: "Avg Unread/Conv", value: total ? (((convCounts as any)._unreadSum || 0) / total).toFixed(1) : "0", color: C.orange, bg: C.orangeLight, icon: <AlertOutlined /> },
                { label: "Pending Rate", value: `${pct(convCounts.pending, total)}%`, color: C.warning, bg: C.warningLight, icon: <ClockCircleOutlined /> },
            ].map((item, i) => (
                <Col xs={12} sm={6} key={i}>
                    <div style={{ background: item.bg, borderRadius: 9, padding: "10px 12px", border: `1px solid ${item.color}20` }}>
                        <Space size={5} align="center" style={{ marginBottom: 4 }}>
                            <span style={{ color: item.color, fontSize: 13 }}>{item.icon}</span>
                            <Text style={{ fontSize: 11, color: C.subtext }}>{item.label}</Text>
                        </Space>
                        <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
                    </div>
                </Col>
            ))}
        </Row>
    );
};

// ── Table columns ─────────────────────────────────────────────────────────────
const CH_COLORS: Record<string, string> = { whatsapp: "#25D366", sms: "#3b82f6", calls: "#6366f1" };
const ST_COLORS: Record<string, string> = { open: C.success, pending: C.warning, resolved: C.blue, closed: C.gray };

const convColumns = (isMobile: boolean) => isMobile ? [
    {
        title: "Contact", dataIndex: "external_contact_name", key: "name",
        render: (name: string, r: any) => (
            <Space size={6}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: CH_COLORS[r.channel] || C.gray, flexShrink: 0 }} />
                <Text style={{ fontSize: 12 }}>{name || r.external_contact_phone || "Unknown"}</Text>
            </Space>
        ),
    },
    { title: "Status", dataIndex: "status", key: "status", width: 80, render: (s: string) => <Pill label={s?.toUpperCase()} color={ST_COLORS[s] || C.gray} bg={(ST_COLORS[s] || C.gray) + "15"} /> },
    { title: "Unread", dataIndex: "unread_count", key: "unread", width: 60, render: (n: number) => n > 0 ? <Badge count={n} style={{ backgroundColor: C.primary }} /> : <Text style={{ color: C.gray, fontSize: 11 }}>—</Text> },
] : [
    { title: "Ch.", dataIndex: "channel", key: "channel", width: 90, render: (ch: string) => <Tag style={{ background: (CH_COLORS[ch] || C.gray) + "15", color: CH_COLORS[ch] || C.gray, border: "none", fontSize: 11, borderRadius: 4 }}>{ch || "—"}</Tag> },
    {
        title: "Contact", dataIndex: "external_contact_name", key: "name",
        render: (name: string, r: any) => (
            <div>
                <Text strong style={{ fontSize: 12, color: C.text }}>{name || r.external_contact_phone || "Unknown"}</Text>
                {r.last_message_preview && <Text style={{ fontSize: 11, color: C.subtext, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{r.last_message_preview}</Text>}
                {r.external_contact_phone && (
                    <Space size={4} style={{ marginTop: 4 }}>
                        <CallButton phoneNumber={r.external_contact_phone} customerId={r.customer_id} size="small" type="text" />
                        <SMSButton phoneNumber={r.external_contact_phone} customerId={r.customer_id} size="small" type="text" />
                    </Space>
                )}
            </div>
        ),
    },
    { title: "Status", dataIndex: "status", key: "status", width: 100, render: (s: string) => <Pill label={s?.toUpperCase()} color={ST_COLORS[s] || C.gray} bg={(ST_COLORS[s] || C.gray) + "15"} /> },
    { title: "Unread", dataIndex: "unread_count", key: "unread", width: 70, align: "center" as const, render: (n: number) => n > 0 ? <Badge count={n} style={{ backgroundColor: C.primary }} /> : <Text style={{ color: C.gray, fontSize: 11 }}>—</Text> },
    { title: "Last msg", dataIndex: "last_message_at", key: "last", width: 100, render: (t: string) => <Text style={{ fontSize: 11, color: C.subtext }}>{t ? dayjs(t).fromNow() : "—"}</Text> },
];

// ── Main Dashboard ────────────────────────────────────────────────────────────
const MtejaDashboard: React.FC = () => {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const storedShopId = getStoredShopId();
    const queryClient = useQueryClient();

    const isAdminLayout = window.location.pathname.startsWith("/admin");
    const navTo = (bare: string) => navigate(isAdminLayout ? `/admin${bare}` : bare);

    // ── Filters ────────────────────────────────────────────────────────────────
    const [selectedShopId, setSelectedShopId] = useState<string>(isAdminLayout ? "" : storedShopId);
    const [periodFilter, setPeriodFilter] = useState("month");
    const [customDateRange, setCustomDateRange] = useState<any[]>([]);
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [convStatus, setConvStatus] = useState<"all" | "open" | "pending" | "resolved">("all");
    const [urlModalOpen, setUrlModalOpen] = useState(false);
    const [urlModalTitle, setUrlModalTitle] = useState("");
    const [urlModalUrl, setUrlModalUrl] = useState("");

    const shopId = isAdminLayout ? selectedShopId : storedShopId;

    // ── Shop logo (for QR code branding) ──────────────────────────────────────
    const { data: shopData } = useQuery({
        queryKey: ["mteja-shop-qr", shopId],
        queryFn: () => fetchShop(shopId!),
        enabled: !!shopId,
        staleTime: 5 * 60 * 1000,
    });
    const shopLogo: string | undefined = shopData?.logo;

    // ── Shops ──────────────────────────────────────────────────────────────────
    const { data: shopsData } = useQuery({
        queryKey: ["mteja-shops"], queryFn: fetchShops,
        enabled: isAdminLayout, staleTime: 60_000,
    });
    const shops: any[] = Array.isArray(shopsData) ? shopsData : shopsData?.shops || [];
    useEffect(() => {
        if (isAdminLayout && shops.length > 0 && !selectedShopId) setSelectedShopId(shops[0]._id);
    }, [isAdminLayout, shops, selectedShopId]);

    // ── Date range ─────────────────────────────────────────────────────────────
    const { startDate, endDate } = useMemo(() => {
        const today = dayjs();
        switch (periodFilter) {
            case "day": return { startDate: today.startOf("day"), endDate: today.endOf("day") };
            case "week": return { startDate: today.startOf("week"), endDate: today.endOf("week") };
            case "year": return { startDate: today.startOf("year"), endDate: today.endOf("year") };
            case "custom":
                if (customDateRange?.length === 2)
                    return { startDate: customDateRange[0].startOf("day"), endDate: customDateRange[1].endOf("day") };
                return { startDate: today.startOf("month"), endDate: today.endOf("day") };
            default: return { startDate: today.startOf("month"), endDate: today.endOf("month") };
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

    // ── Permission checker ─────────────────────────────────────────────────────
    const can = getPermissionChecker();

    // ── Channels ───────────────────────────────────────────────────────────────
    const { data: channelsData, isLoading: channelsLoading } = useQuery({
        queryKey: ["mteja-channels", shopId],
        queryFn: () => fetchWhatsappChannels({ shop_id: shopId || undefined }),
        staleTime: 60_000, retry: 1,
    });
    const channels = channelsData?.channels || [];
    const connected = {
        whatsapp: channels.some((c: any) => c.channel === "whatsapp" && c.is_active),
        sms: can("TWILIO_MANAGE_ACCOUNTS"),
        calls: can("TWILIO_MAKE_CALLS"),
    };
    const connectedCount = Object.values(connected).filter(Boolean).length;

    // ── Conversations ──────────────────────────────────────────────────────────
    const { data: convData, isLoading: convLoading, refetch: refetchConv, isRefetching: convRefetching } = useQuery({
        queryKey: ["mteja-conversations", shopId, convStatus],
        queryFn: () => fetchConversations({ shop_id: shopId || undefined, status: convStatus === "all" ? undefined : convStatus, page: 1, limit: 100 }),
        staleTime: 10_000, refetchInterval: 30_000,
    });
    const conversations: any[] = convData?.conversations || [];
    const totalConversations = convData?.total || conversations.length;

    const convCounts = useMemo(() => {
        const c = { open: 0, pending: 0, resolved: 0, closed: 0 };
        conversations.forEach(v => { if (v.status in c) c[v.status as keyof typeof c]++; });
        return c;
    }, [conversations]);

    const unreadCount = useMemo(
        () => conversations.reduce((s, c) => s + (c.unread_count || 0), 0),
        [conversations]
    );

    // ── Twilio integration ───────────────────────────────────────────────────────
    const canViewCallHistory = can("TWILIO_VIEW_CALL_HISTORY");
    const userId = localStorage.getItem("userId");

    const { data: callHistory } = useQuery({
        queryKey: ["twilio-call-history", shopId],
        queryFn: () => getCallHistory({ shop_id: shopId || "", limit: 100 }),
        enabled: !!shopId && canViewCallHistory,
        staleTime: 60_000,
    });

    const { data: agentStatus } = useQuery({
        queryKey: ["twilio-agent-status", shopId, userId],
        queryFn: () => getAgentStatus(shopId || "", userId || ""),
        enabled: !!shopId && !!userId && can("TWILIO_MANAGE_AGENT_STATUS"),
        staleTime: 30_000,
        refetchInterval: 30_000,
    });

    const todayCalls = callHistory?.calls?.filter((call: any) => {
        const callTime = call.start_time || call.createdAt;
        if (!callTime) return false;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const callDate = new Date(callTime);
        callDate.setHours(0, 0, 0, 0);
        
        return callDate.getTime() === today.getTime();
    }).length || 0;

    const channelCounts = useMemo(() => {
        const c = { whatsapp: 0, sms: 0, calls: 0 };
        conversations.forEach(v => { if (v.channel in c) c[v.channel as keyof typeof c]++; });
        // Add Twilio counts
        if (canViewCallHistory) {
            c.calls = todayCalls;
            c.sms = todayCalls; // Using same count for now, could be separate
        }
        return c;
    }, [conversations, canViewCallHistory, todayCalls]);

    // ── Mteja stats ───────────────────────────────────────────────────────────
    const { data: mtejaStats, isLoading: statsLoading } = useQuery({
        queryKey: ["mteja-stats", shopId, start_date, end_date],
        queryFn: () => fetchMtejaStats({ shop_id: shopId || undefined, start_date, end_date }),
        staleTime: 30_000,
    });
    const alertsSent = mtejaStats?.alerts_sent || mtejaStats?.sms_sent || 0;
    const referrals = mtejaStats?.referrals || 0;

    // ── Lead pipeline ──────────────────────────────────────────────────────────
    const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
        queryKey: ["mteja-lead-pipeline", shopId],
        queryFn: () => fetchLeadPipeline({ shop_id: shopId || undefined }),
        staleTime: 60_000,
    });
    const pipelineStages = pipelineData?.stages || [];
    const totalLeads = pipelineData?.total_leads || 0;
    const totalLeadValue = pipelineData?.total_value || 0;
    const wonLeadValue = pipelineData?.won_value || 0;
    const conversionRate = pipelineData?.conversion_rate || 0;

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleRefresh = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["mteja-conversations"] });
        queryClient.invalidateQueries({ queryKey: ["mteja-channels"] });
        queryClient.invalidateQueries({ queryKey: ["mteja-stats"] });
        queryClient.invalidateQueries({ queryKey: ["mteja-lead-pipeline"] });
        queryClient.invalidateQueries({ queryKey: ["twilio-call-history"] });
        queryClient.invalidateQueries({ queryKey: ["twilio-agent-status"] });
    }, [queryClient]);

    const handleCopyStaffUrl = useCallback(() => {
        const storedTenant = localStorage.getItem("tenant");
        const tenant = storedTenant ? JSON.parse(storedTenant) : null;
        const staffUrl = `${import.meta.env.VITE_APP_URL}/admin/staff-clock-in?tenant_id=${tenant?._id}&tenant_code=${tenant?.tenant_code}&shop_id=${shopId}`;
        setUrlModalUrl(staffUrl);
        setUrlModalTitle("Staff Clock-In URL");
        setUrlModalOpen(true);
    }, [shopId]);

    const isDataLoading = statsLoading || pipelineLoading;

    // ── Top stat cards ───────────────────────────────────────────────────────
    const topCards = [
        { title: "Total Conversations", value: totalConversations, color: C.primary, bg: C.primaryLight, icon: <MessageOutlined /> },
        { title: "Open Conversations", value: convCounts.open, color: C.success, bg: C.successLight, icon: <CheckCircleOutlined /> },
        { title: "Pending", value: convCounts.pending, color: C.warning, bg: C.warningLight, icon: <ClockCircleOutlined /> },
        { title: "Resolved", value: convCounts.resolved, color: C.blue, bg: C.blueLight, icon: <CheckCircleOutlined /> },
        { title: "Unread Messages", value: unreadCount, color: unreadCount > 0 ? C.orange : C.gray, bg: unreadCount > 0 ? C.orangeLight : C.bg, icon: <FireOutlined /> },
        { title: "Channels Live", value: connectedCount, color: C.teal, bg: C.tealLight, icon: <WifiOutlined /> },
        { title: "Total Leads", value: totalLeads, color: C.purple, bg: C.purpleLight, icon: <FundOutlined /> },
        { title: "Lead Conversion", value: `${conversionRate.toFixed(1)}%`, color: C.success, bg: C.successLight, icon: <ThunderboltOutlined /> },
        { title: "Pipeline Value", value: fmtKES(totalLeadValue), color: C.blue, bg: C.blueLight, icon: <DollarOutlined /> },
        ...(canViewCallHistory ? [
            { title: "Today's Calls", value: todayCalls, color: C.indigo, bg: C.indigoLight, icon: <PhoneOutlined /> },
        ] : []),
        ...(agentStatus?.agent_statuses?.[0] ? [
            { title: "Agent Status", value: agentStatus.agent_statuses[0].status, color: agentStatus.agent_statuses[0].status === "available" ? C.success : C.warning, bg: agentStatus.agent_statuses[0].status === "available" ? C.successLight : C.warningLight, icon: <TeamOutlined /> },
        ] : []),
        { title: "Won Revenue", value: fmtKES(wonLeadValue), color: C.success, bg: C.successLight, icon: <TrophyOutlined /> },
        { title: "Alerts Sent", value: alertsSent, color: C.warning, bg: C.warningLight, icon: <ThunderboltOutlined /> },
        { title: "Referrals", value: referrals, color: C.indigo, bg: C.indigoLight, icon: <StarOutlined /> },
    ];

    return (
        <>
            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <Space align="center" size={12}>
                    <div style={{ background: `${C.primary}15`, borderRadius: 10, padding: "8px 10px", color: C.primary, fontSize: 20 }}>
                        <MessageOutlined />
                    </div>
                    <div>
                        <Title level={4} style={{ margin: 0, color: C.text }}>Dashboard</Title>
                        <Text style={{ fontSize: 12, color: C.subtext }}>Customer Engagement & Lead Management</Text>
                    </div>
                </Space>

                <Space size={8} wrap>
                    {isAdminLayout && (
                        <Select
                            value={selectedShopId}
                            onChange={setSelectedShopId}
                            options={shops.map((s: any) => ({ label: s.name, value: s._id }))}
                            style={{ width: 140 }}
                            size="small"
                            placeholder="Select branch"
                        />
                    )}
                    <Radio.Group value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} buttonStyle="solid" size="small">
                        <Radio.Button value="day">Day</Radio.Button>
                        <Radio.Button value="week">Week</Radio.Button>
                        <Radio.Button value="month">Month</Radio.Button>
                        <Radio.Button value="year">Year</Radio.Button>
                        <Radio.Button value="custom" onClick={() => setShowCustomPicker(!showCustomPicker)}>Custom</Radio.Button>
                    </Radio.Group>
                    {showCustomPicker && (
                        <RangePicker
                            value={customDateRange}
                            onChange={dates => setCustomDateRange(dates)}
                            size="small"
                        />
                    )}
                    <Tooltip title="Share with staff to allow clock-in for this branch">
                        <Button size="small" icon={<TeamOutlined />} onClick={handleCopyStaffUrl}>
                            Staff Clock-In URL
                        </Button>
                    </Tooltip>
                    <Button size="small" icon={<ReloadOutlined />} onClick={handleRefresh}>Refresh</Button>
                </Space>
            </div>

            {/* ── Top stat cards ── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                {topCards.map((card, i) => (
                    <Col xs={12} sm={12} lg={6} key={i}>
                        <StatCard {...card} />
                    </Col>
                ))}
            </Row>

            {/* ── Row 1: Lead Pipeline + Conversion Funnel ─────────────────────── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                {/* Pipeline overview */}
                <Col xs={24} lg={14}>
                    <ProCard bordered headerBordered size="small" style={{ borderRadius: 12, height: "100%" }}
                        title={<Space size={6}><FundOutlined style={{ color: C.purple }} /><Text strong style={{ fontSize: 14 }}>Lead Pipeline</Text><Tag color="purple">{totalLeads} leads</Tag></Space>}
                        extra={<Button type="link" size="small" onClick={() => navTo("/crm/leads")}>View All →</Button>}
                    >
                        {pipelineLoading ? <Skeleton active paragraph={{ rows: 5 }} /> : (
                            <Space direction="vertical" size={14} style={{ width: "100%" }}>
                                {/* Stage distribution bar */}
                                <PipelineBar stages={pipelineStages} total={totalLeads} loading={pipelineLoading} />

                                {/* Stage-by-stage bar rows */}
                                <div>
                                    {LEAD_STAGES.map((s, i, arr) => {
                                        const stageMap = Object.fromEntries((pipelineStages || []).map((x: any) => [x._id || x.stage, x]));
                                        const count = stageMap[s.key]?.count || 0;
                                        const val = stageMap[s.key]?.total_value;
                                        return (
                                            <BarRow
                                                key={s.key}
                                                label={s.label}
                                                count={count}
                                                total={totalLeads || 1}
                                                color={s.color}
                                                value={val ? fmtKES(val) : undefined}
                                                last={i === arr.length - 1}
                                            />
                                        );
                                    })}
                                </div>

                                <Divider style={{ margin: "4px 0" }} />

                                {/* Pipeline KPIs */}
                                <Row gutter={[8, 8]}>
                                    {[
                                        { label: "Total Leads", value: fmtK(totalLeads), color: C.purple, bg: C.purpleLight },
                                        { label: "Pipeline Value", value: fmtKES(totalLeadValue), color: C.blue, bg: C.blueLight },
                                        { label: "Won Value", value: fmtKES(wonLeadValue), color: C.success, bg: C.successLight },
                                        { label: "Conversion", value: `${conversionRate.toFixed(1)}%`, color: C.orange, bg: C.orangeLight },
                                    ].map((item, i) => (
                                        <Col xs={12} sm={6} key={i}>
                                            <div style={{ textAlign: "center", background: item.bg, borderRadius: 8, padding: "10px 6px", border: `1px solid ${item.color}20` }}>
                                                <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, color: item.color, wordBreak: "break-word" }}>{item.value}</div>
                                                <div style={{ fontSize: 11, color: C.subtext, marginTop: 2 }}>{item.label}</div>
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                            </Space>
                        )}
                    </ProCard>
                </Col>

                {/* Conversion funnel */}
                <Col xs={24} lg={10}>
                    <ProCard bordered headerBordered size="small" style={{ borderRadius: 12, height: "100%" }}
                        title={<Space size={6}><AimOutlined style={{ color: C.orange }} /><Text strong style={{ fontSize: 14 }}>Conversion Funnel</Text></Space>}
                    >
                        <ConversionFunnel stages={pipelineStages} totalLeads={totalLeads} wonValue={wonLeadValue} loading={pipelineLoading} />
                    </ProCard>
                </Col>
            </Row>

            {/* ── Row 2: Conversations + Channel breakdown ──────────────────────── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                {/* Conversation health */}
                <Col xs={24} lg={14}>
                    <ProCard bordered headerBordered size="small" style={{ borderRadius: 12 }}
                        title={<Space size={6}><MessageOutlined style={{ color: C.primary }} /><Text strong style={{ fontSize: 14 }}>Conversations</Text><Tag color="default">{totalConversations} total</Tag></Space>}
                        extra={
                            <Space size={8}>
                                <Radio.Group value={convStatus} onChange={e => setConvStatus(e.target.value)} buttonStyle="solid" size="small">
                                    <Radio.Button value="all">All</Radio.Button>
                                    <Radio.Button value="open">Open</Radio.Button>
                                    <Radio.Button value="pending">Pending</Radio.Button>
                                    <Radio.Button value="resolved">Resolved</Radio.Button>
                                </Radio.Group>
                                <Button type="link" size="small" onClick={() => navTo("/omnichannel")}>Inbox →</Button>
                            </Space>
                        }
                    >
                        {convLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : (
                            <Space direction="vertical" size={14} style={{ width: "100%" }}>
                                <ConversationStatusBar open={convCounts.open} pending={convCounts.pending} resolved={convCounts.resolved} closed={convCounts.closed} loading={convLoading} />
                                <ConvResolutionStats convCounts={convCounts} total={totalConversations} />
                                <Divider style={{ margin: "4px 0" }} />
                                <Table
                                    columns={convColumns(isMobile)}
                                    dataSource={conversations.slice(0, 6)}
                                    pagination={false}
                                    size="small" rowKey="_id"
                                    scroll={{ x: isMobile ? 320 : undefined }}
                                    locale={{ emptyText: <Empty description={connectedCount === 0 ? "Connect a channel to start" : "No conversations"} style={{ padding: "16px 0" }} /> }}
                                />
                                {conversations.length > 6 && (
                                    <Button type="link" size="small" onClick={() => navTo("/omnichannel")} style={{ padding: 0 }}>
                                        View all {totalConversations} conversations →
                                    </Button>
                                )}
                            </Space>
                        )}
                    </ProCard>
                </Col>

                {/* Channel breakdown */}
                <Col xs={24} lg={10}>
                    <ProCard bordered headerBordered size="small" style={{ borderRadius: 12, height: "100%" }}
                        title={<Space size={6}><PhoneOutlined style={{ color: C.indigo }} /><Text strong style={{ fontSize: 14 }}>Communication Channels</Text></Space>}
                    >
                        <Space direction="vertical" size={14} style={{ width: "100%" }}>
                            {/* Channel cards */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <ChannelDot color="#25D366" label="WhatsApp" count={channelCounts.whatsapp} connected={connected.whatsapp} pctOfTotal={pct(channelCounts.whatsapp, totalConversations)} />
                                <ChannelDot color="#3b82f6" label="SMS" count={todayCalls} connected={canViewCallHistory} pctOfTotal={canViewCallHistory ? 100 : 0} />
                                <ChannelDot color="#6366f1" label="Calls" count={todayCalls} connected={canViewCallHistory} pctOfTotal={canViewCallHistory ? 100 : 0} />
                            </div>

                            <Divider style={{ margin: "4px 0" }} />

                            {/* Channel status */}
                            <div>
                                <Text style={{ fontSize: 11, fontWeight: 600, color: C.subtext, textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: 10 }}>Connection Status</Text>
                                {[
                                    { ch: "whatsapp", label: "WhatsApp", color: "#25D366", connected: connected.whatsapp },
                                    { ch: "sms", label: "SMS", color: "#3b82f6", connected: can("TWILIO_MANAGE_ACCOUNTS") },
                                    { ch: "calls", label: "Voice Calls", color: "#6366f1", connected: can("TWILIO_MAKE_CALLS") },
                                ].map(item => (
                                    <div key={item.ch} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: item.ch !== "calls" ? `1px solid ${C.border}` : "none" }}>
                                        <Text style={{ fontSize: 12, color: C.text }}>{item.label}</Text>
                                        {item.connected
                                            ? <Space size={4}><CheckCircleOutlined style={{ color: C.success, fontSize: 12 }} /><Text style={{ fontSize: 11, color: C.success }}>Enabled</Text></Space>
                                            : <Space size={4}><CloseCircleOutlined style={{ color: C.error, fontSize: 12 }} /><Text style={{ fontSize: 11, color: C.error }}>Not enabled</Text></Space>
                                        }
                                    </div>
                                ))}
                            </div>

                            <Divider style={{ margin: "4px 0" }} />

                            {/* Unread breakdown */}
                            <div>
                                <Text style={{ fontSize: 11, fontWeight: 600, color: C.subtext, textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: 8 }}>Engagement</Text>
                                <Row gutter={[8, 8]}>
                                    {[
                                        { label: "Unread", value: unreadCount, color: unreadCount > 0 ? C.orange : C.gray, bg: unreadCount > 0 ? C.orangeLight : C.bg },
                                        { label: "Open", value: convCounts.open, color: C.success, bg: C.successLight },
                                        { label: "Pending", value: convCounts.pending, color: C.warning, bg: C.warningLight },
                                        { label: "Resolved", value: convCounts.resolved, color: C.blue, bg: C.blueLight },
                                    ].map((item, i) => (
                                        <Col span={12} key={i}>
                                            <div style={{ background: item.bg, borderRadius: 7, padding: "8px 10px", textAlign: "center" }}>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
                                                <div style={{ fontSize: 11, color: C.subtext }}>{item.label}</div>
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        </Space>
                    </ProCard>
                </Col>
            </Row>

            {/* ── Row 3: Active Agents + Call Analysis ─────────────────────────── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                {/* Active Agents */}
                <Col xs={24} lg={12}>
                    <ProCard bordered headerBordered size="small" style={{ borderRadius: 12, height: "100%" }}
                        title={<Space size={6}><TeamOutlined style={{ color: C.indigo }} /><Text strong style={{ fontSize: 14 }}>Active Agents</Text></Space>}
                        extra={<Button type="link" size="small" onClick={() => navTo("/staff-management")}>View All →</Button>}
                    >
                        {agentStatus?.agent_statuses?.length > 0 ? (
                            <Space direction="vertical" size={12} style={{ width: "100%" }}>
                                {agentStatus.agent_statuses.slice(0, 5).map((agent: any) => (
                                    <div key={agent._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: agent.status === "available" ? C.successLight : agent.status === "busy" ? C.warningLight : C.bg, borderRadius: 8, border: `1px solid ${agent.status === "available" ? C.success + "30" : agent.status === "busy" ? C.warning + "30" : C.border}` }}>
                                        <Space size={8}>
                                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: agent.status === "available" ? C.success : agent.status === "busy" ? C.warning : C.gray }} />
                                            <Text style={{ fontSize: 12, color: C.text }}>{agent.agent_name || "Unknown"}</Text>
                                        </Space>
                                        <Space size={4}>
                                            <Text style={{ fontSize: 11, color: C.subtext }}>{agent.total_calls_today} calls</Text>
                                            <Text style={{ fontSize: 11, color: C.subtext }}>{Math.floor(agent.total_call_duration_today / 60)}m</Text>
                                        </Space>
                                    </div>
                                ))}
                            </Space>
                        ) : (
                            <Empty description="No active agents" style={{ padding: "20px 0" }} />
                        )}
                    </ProCard>
                </Col>

                {/* Call Analysis */}
                <Col xs={24} lg={12}>
                    <ProCard bordered headerBordered size="small" style={{ borderRadius: 12, height: "100%" }}
                        title={<Space size={6}><BarChartOutlined style={{ color: C.purple }} /><Text strong style={{ fontSize: 14 }}>Call Analysis</Text></Space>}
                    >
                        {callHistory?.calls ? (
                            <Space direction="vertical" size={14} style={{ width: "100%" }}>
                                <Row gutter={[8, 8]}>
                                    {[
                                        { label: "Today's Calls", value: todayCalls, color: C.indigo, bg: C.indigoLight },
                                        { label: "Avg Duration", value: callHistory.calls.length > 0 ? `${Math.floor(callHistory.calls.reduce((acc: number, c: any) => acc + (c.duration || 0), 0) / callHistory.calls.length / 60)}m` : "0m", color: C.blue, bg: C.blueLight },
                                        { label: "Connected", value: callHistory.calls.filter((c: any) => c.status === "completed").length, color: C.success, bg: C.successLight },
                                        { label: "Missed", value: callHistory.calls.filter((c: any) => c.status === "no-answer" || c.status === "failed").length, color: C.error, bg: C.errorLight },
                                    ].map((item, i) => (
                                        <Col span={12} key={i}>
                                            <div style={{ background: item.bg, borderRadius: 8, padding: "10px 8px", textAlign: "center", border: `1px solid ${item.color}20` }}>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
                                                <div style={{ fontSize: 10, color: C.subtext }}>{item.label}</div>
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                            </Space>
                        ) : (
                            <Empty description="No call data available" style={{ padding: "20px 0" }} />
                        )}
                    </ProCard>
                </Col>
            </Row>

            {/* ── Row 4: Top Agents ─────────────────────────────────────────────── */}
            <Row style={{ marginBottom: 12 }}>
                <Col span={24}>
                    <ProCard bordered headerBordered size="small" style={{ borderRadius: 12 }}
                        title={<Space size={6}><TrophyOutlined style={{ color: C.orange }} /><Text strong style={{ fontSize: 14 }}>Top Agents Today</Text></Space>}
                    >
                        {agentStatus?.agent_statuses?.length > 0 ? (
                            <Row gutter={[12, 12]}>
                                {agentStatus.agent_statuses
                                    .sort((a: any, b: any) => b.total_calls_today - a.total_calls_today)
                                    .slice(0, 4)
                                    .map((agent: any, index: number) => (
                                    <Col xs={12} sm={6} key={agent._id}>
                                        <div style={{ background: index === 0 ? "#fffbeb" : C.bg, borderRadius: 10, padding: "12px", border: index === 0 ? "1px solid #f59e0b" : `1px solid ${C.border}`, position: "relative" }}>
                                            {index === 0 && (
                                                <div style={{ position: "absolute", top: -8, right: -8, background: "#f59e0b", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <TrophyOutlined style={{ color: "#fff", fontSize: 12 }} />
                                                </div>
                                            )}
                                            <Space direction="vertical" size={4} style={{ width: "100%" }}>
                                                <Text strong style={{ fontSize: 13, color: C.text }}>{agent.agent_name || "Unknown"}</Text>
                                                <Space size={8}>
                                                    <Text style={{ fontSize: 11, color: C.subtext }}>{agent.total_calls_today} calls</Text>
                                                    <Text style={{ fontSize: 11, color: C.subtext }}>{Math.floor(agent.total_call_duration_today / 60)}m</Text>
                                                </Space>
                                                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: agent.status === "available" ? C.success : agent.status === "busy" ? C.warning : C.gray }} />
                                                    <Text style={{ fontSize: 10, color: C.subtext, textTransform: "capitalize" }}>{agent.status}</Text>
                                                </div>
                                            </Space>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        ) : (
                            <Empty description="No agent data available" style={{ padding: "20px 0" }} />
                        )}
                    </ProCard>
                </Col>
            </Row>

            {/* ── Row 5: Engagement summary ─────────────────────────────────────── */}
            <Row style={{ marginBottom: 12 }}>
                <Col span={24}>
                    <ProCard bordered headerBordered size="small" style={{ borderRadius: 12 }}
                        title={<Space size={6}><RiseOutlined style={{ color: C.primary }} /><Text strong style={{ fontSize: 14 }}>Engagement Summary — {dateRangeLabel}</Text></Space>}
                    >
                        {isDataLoading ? <Skeleton active paragraph={{ rows: 2 }} /> : (
                            <Row gutter={[10, 10]}>
                                {[
                                    { label: "Total Conversations", value: totalConversations, color: C.primary, bg: C.primaryLight, icon: <MessageOutlined /> },
                                    { label: "Open Conversations", value: convCounts.open, color: C.success, bg: C.successLight, icon: <CheckCircleOutlined /> },
                                    { label: "Pending", value: convCounts.pending, color: C.warning, bg: C.warningLight, icon: <ClockCircleOutlined /> },
                                    { label: "Resolved", value: convCounts.resolved, color: C.blue, bg: C.blueLight, icon: <CheckCircleOutlined /> },
                                    { label: "Unread Messages", value: unreadCount, color: unreadCount > 0 ? C.orange : C.gray, bg: unreadCount > 0 ? C.orangeLight : C.bg, icon: <FireOutlined /> },
                                    { label: "Channels Live", value: connectedCount, color: C.teal, bg: C.tealLight, icon: <WifiOutlined /> },
                                    { label: "Total Leads", value: totalLeads, color: C.purple, bg: C.purpleLight, icon: <FundOutlined /> },
                                    { label: "Lead Conversion", value: `${conversionRate.toFixed(1)}%`, color: C.success, bg: C.successLight, icon: <ThunderboltOutlined /> },
                                    { label: "Pipeline Value", value: fmtKES(totalLeadValue), color: C.blue, bg: C.blueLight, icon: <DollarOutlined /> },
                                    { label: "Won Revenue", value: fmtKES(wonLeadValue), color: C.success, bg: C.successLight, icon: <TrophyOutlined /> },
                                    { label: "Alerts Sent", value: alertsSent, color: C.warning, bg: C.warningLight, icon: <ThunderboltOutlined /> },
                                    { label: "Referrals", value: referrals, color: C.indigo, bg: C.indigoLight, icon: <StarOutlined /> },
                                ].map((item, i) => (
                                    <Col xs={12} sm={8} lg={4} key={i}>
                                        <div style={{ background: item.bg, borderRadius: 9, padding: "10px 12px", border: `1px solid ${item.color}18`, textAlign: "center" }}>
                                            <div style={{ color: item.color, fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
                                            <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, color: item.color, wordBreak: "break-word" }}>
                                                {typeof item.value === "number" ? fmtK(item.value) : item.value}
                                            </div>
                                            <div style={{ fontSize: 10, color: C.subtext, marginTop: 2 }}>{item.label}</div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        )}

                        {isAdminLayout && (
                            <div style={{ marginTop: 14, padding: "8px 12px", background: C.primaryLight, border: `1px solid ${C.primary}20`, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                                <ShopOutlined style={{ color: C.primary, fontSize: 13 }} />
                                <Text style={{ fontSize: 11, color: C.primary }}>
                                    {selectedShopId
                                        ? `Filtered to: ${shops.find(s => s._id === selectedShopId)?.name || "Selected Branch"}`
                                        : "Showing data across all branches"}
                                </Text>
                            </div>
                        )}
                    </ProCard>
                </Col>
            </Row>

            {/* ── URL Share Modal ── */}
            <URLShareModal
                open={urlModalOpen}
                onClose={() => setUrlModalOpen(false)}
                url={urlModalUrl}
                title={urlModalTitle}
                shopLogo={shopLogo}
                primaryColor={C.primary}
            />
        </>
    );
};

// ── Pipeline bar component ───────────────────────────────────────────────────
const PipelineBar: React.FC<{ stages: any[]; total: number; loading: boolean }> = ({ stages, total, loading }) => {
    if (loading) return <Skeleton active paragraph={{ rows: 1 }} />;
    const stageMap = Object.fromEntries((stages || []).map((s: any) => [s._id || s.stage, s]));
    const items = LEAD_STAGES.map(s => ({ label: s.label, count: stageMap[s.key]?.count || 0, color: s.color }));
    const t = total || 1;
    return (
        <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1 }}>
            {items.map(item => (
                <Tooltip key={item.label} title={`${item.label}: ${item.count} (${pct(item.count, t)}%)`}>
                    <div style={{ flex: item.count || 0.02, background: item.color, transition: "flex .4s", cursor: "pointer" }} />
                </Tooltip>
            ))}
        </div>
    );
};

export default MtejaDashboard;
