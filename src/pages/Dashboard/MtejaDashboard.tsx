import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Typography,
  Row,
  Col,
  Table,
  Badge,
  Space,
  Skeleton,
  Empty,
  Flex,
  Tag,
  Select,
  DatePicker,
  Radio,
  Drawer,
  Avatar,
  Segmented,
  Tabs,
} from "antd";
import {
  ReloadOutlined,
  CalendarOutlined,
  MessageOutlined,
  TeamOutlined,
  WifiOutlined,
  FundOutlined,
  DollarOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  PieChartOutlined,
  FireOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";
import { fetchConversations, fetchWhatsappChannels } from "@services/whatsappService";
import { THEME_C } from "@utils/getPrimaryColor";
import { fmtK, fmtKES } from "@utils/formatters";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ── Color Constants ───────────────────────────────────────────────────────────
const C = {
  ...THEME_C,
  get primary() { return THEME_C.primary; },
  get primaryLight() { return THEME_C.primaryLight; },
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
  gray: "#64748b",
  text: "#0f172a",
  subtext: "#64748b",
};

const PERIOD_LABELS: Record<string, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  custom: "Custom",
};

const LEAD_STAGES = [
  { key: "new", label: "New", color: "#64748b" },
  { key: "contacted", label: "Contacted", color: "#3b82f6" },
  { key: "qualified", label: "Qualified", color: "#6366f1" },
  { key: "proposal", label: "Proposal", color: "#f97316" },
  { key: "negotiation", label: "Negotiation", color: "#f59e0b" },
  { key: "won", label: "Won", color: "#10b981" },
  { key: "lost", label: "Lost", color: "#ef4444" },
];

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

const playChime = () => {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch { /* ignore */ }
};

const getStoredShopId = (): string => {
  try {
    const v = localStorage.getItem("shopId");
    return v && v !== "{}" && v !== "null" ? v : "";
  } catch { return ""; }
};

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
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
  const res = await axiosInstance.get(`${BASE_URL}/api/customers`, {
    params: { ...params, sort: "-createdAt" },
  });
  return Array.isArray(res.data) ? res.data : res.data?.customers || [];
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

const fetchRecentLeads = async (params: { shop_id?: string; limit?: number }) => {
  try {
    const res = await axiosInstance.get(`${BASE_URL}/api/crm/leads`, {
      params: { ...params, limit: params.limit || 8, sort: "-createdAt" },
    });
    return Array.isArray(res.data) ? res.data : res.data?.leads || [];
  } catch { return []; }
};

// ── Pill Component ────────────────────────────────────────────────────────────
const Pill: React.FC<{ label: string; color: string; bg: string }> = ({ label, color, bg }) => (
  <span
    style={{
      background: bg,
      color,
      borderRadius: 4,
      padding: "2px 7px",
      fontSize: 10,
      fontWeight: 600,
      display: "inline-block",
      letterSpacing: "0.3px",
    }}
  >
    {label}
  </span>
);

const CH_COLORS: Record<string, string> = { whatsapp: "#25D366", messenger: "#0084FF", instagram: "#E1306C" };
const ST_COLORS: Record<string, string> = { open: C.success, pending: C.warning, resolved: C.blue, closed: C.gray };
const stageColorMap = Object.fromEntries(LEAD_STAGES.map(({ key, color }) => [key, color]));

// ── Main Dashboard ────────────────────────────────────────────────────────────
const MtejaDashboard: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const storedShopId = getStoredShopId();
  const queryClient = useQueryClient();

  const isAdminLayout = window.location.pathname.startsWith("/admin");
  const navTo = (bare: string) => navigate(isAdminLayout ? `/admin${bare}` : bare);

  // Filters
  const [selectedShopId, setSelectedShopId] = useState<string>(isAdminLayout ? "" : storedShopId);
  const [periodFilter, setPeriodFilter] = useState("month");
  const [customDateRange, setCustomDateRange] = useState<any[]>([]);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [convStatus, setConvStatus] = useState<"all" | "open" | "pending" | "resolved">("all");
  const [pipelineMetric, setPipelineMetric] = useState<"count" | "value">("count");
  const [statusMixMode, setStatusMixMode] = useState<"status" | "channel">("status");

  const shopId = isAdminLayout ? selectedShopId : storedShopId;

  // Shops
  const { data: shopsData } = useQuery({
    queryKey: ["mteja-shops"],
    queryFn: fetchShops,
    enabled: isAdminLayout,
    staleTime: 60_000,
  });
  const shops: any[] = Array.isArray(shopsData) ? shopsData : shopsData?.shops || [];
  useEffect(() => {
    if (isAdminLayout && shops.length > 0 && !selectedShopId) setSelectedShopId(shops[0]._id);
  }, [isAdminLayout, shops, selectedShopId]);

  // Date range
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

  // Channels
  const { data: channelsData } = useQuery({
    queryKey: ["mteja-channels", shopId],
    queryFn: () => fetchWhatsappChannels({ shop_id: shopId || undefined }),
    staleTime: 60_000,
    retry: 1,
  });
  const channels = channelsData?.channels || [];
  const connected = {
    whatsapp: channels.some((c: any) => c.channel === "whatsapp" && c.is_active),
    messenger: channels.some((c: any) => c.channel === "messenger" && c.is_active),
    instagram: channels.some((c: any) => c.channel === "instagram" && c.is_active),
  };
  const connectedCount = Object.values(connected).filter(Boolean).length;

  // Conversations
  const { data: convData, isLoading: convLoading, isRefetching: convRefetching } = useQuery({
    queryKey: ["mteja-conversations", shopId, convStatus],
    queryFn: () => fetchConversations({ shop_id: shopId || undefined, status: convStatus === "all" ? undefined : convStatus, page: 1, limit: 100 }),
    staleTime: 10_000,
    refetchInterval: 30_000,
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

  const avgResolutionTime = useMemo(() => {
    const resolved = conversations.filter((v) => v.status === "resolved" || v.status === "closed");
    if (!resolved.length) return 0;
    const ms = resolved.reduce((s, v) => s + (new Date(v.updatedAt).getTime() - new Date(v.createdAt).getTime()), 0) / resolved.length;
    return Math.round((ms / 3600000) * 10) / 10;
  }, [conversations]);

  const unreadCount = useMemo(
    () => conversations.reduce((s, c) => s + (c.unread_count || 0), 0),
    [conversations]
  );

  // Play chime on new unread messages
  const previousUnreadRef = useRef<number | null>(null);
  useEffect(() => {
    if (previousUnreadRef.current !== null && unreadCount > previousUnreadRef.current) {
      playChime();
    }
    previousUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // Customers
  const { data: recentCustomers, isLoading: custLoading } = useQuery({
    queryKey: ["mteja-recent-customers", shopId],
    queryFn: () => fetchRecentCustomers({ shop_id: shopId || undefined, limit: 50 }),
    staleTime: 30_000,
  });
  const customerList: any[] = Array.isArray(recentCustomers) ? recentCustomers : [];

  // Mteja stats
  const { data: mtejaStats, isLoading: statsLoading } = useQuery({
    queryKey: ["mteja-stats", shopId, start_date, end_date],
    queryFn: () => fetchMtejaStats({ shop_id: shopId || undefined, start_date, end_date }),
    staleTime: 30_000,
  });

  // Lead pipeline
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

  // Recent leads
  const { data: recentLeadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ["mteja-recent-leads", shopId],
    queryFn: () => fetchRecentLeads({ shop_id: shopId || undefined, limit: 8 }),
    staleTime: 30_000,
  });
  const recentLeads: any[] = Array.isArray(recentLeadsData) ? recentLeadsData : [];

  // Handlers
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["mteja-conversations"] });
    queryClient.invalidateQueries({ queryKey: ["mteja-channels"] });
    queryClient.invalidateQueries({ queryKey: ["mteja-recent-customers"] });
    queryClient.invalidateQueries({ queryKey: ["mteja-stats"] });
    queryClient.invalidateQueries({ queryKey: ["mteja-lead-pipeline"] });
    queryClient.invalidateQueries({ queryKey: ["mteja-recent-leads"] });
  }, [queryClient]);

  const isDataLoading = statsLoading || pipelineLoading || custLoading || convLoading;

  // Pipeline Chart Data
  const pipelineChartData = useMemo(() => {
    const stageMap = Object.fromEntries((pipelineStages || []).map((x: any) => [x._id || x.stage, x]));
    return LEAD_STAGES.map((s) => {
      const stageInfo = stageMap[s.key] || {};
      return {
        stage: s.label,
        key: s.key,
        count: stageInfo.count || 0,
        value: Number(stageInfo.total_value) || 0,
        color: s.color,
      };
    });
  }, [pipelineStages]);

  // Status Mix Chart Data
  const statusPieData = useMemo(() => {
    if (statusMixMode === "channel") {
      return [
        { name: "WhatsApp", value: channelCounts.whatsapp || 0, color: "#25D366" },
        { name: "Messenger", value: channelCounts.messenger || 0, color: "#0084FF" },
        { name: "Instagram", value: channelCounts.instagram || 0, color: "#E1306C" },
      ].filter((d) => d.value > 0);
    }
    return [
      { name: "Open", value: convCounts.open, color: C.success },
      { name: "Pending", value: convCounts.pending, color: C.warning },
      { name: "Resolved", value: convCounts.resolved, color: C.blue },
      { name: "Closed", value: convCounts.closed, color: C.gray },
    ].filter((d) => d.value > 0);
  }, [statusMixMode, convCounts, channelCounts]);

  // Executive KPI Cards
  const kpiCards = [
    {
      title: "Conversations",
      value: totalConversations.toLocaleString(),
      icon: unreadCount > 0 ? (
        <Badge count={unreadCount} size="small" offset={[2, -2]}>
          <MessageOutlined />
        </Badge>
      ) : (
        <MessageOutlined />
      ),
      color: "#3b82f6",
      bg: "#eff6ff",
      border: "#bfdbfe",
      subtext: (
        <Space size={isMobile ? 4 : 8} wrap>
          <Tag color="success" style={{ fontSize: 10, margin: 0, padding: isMobile ? "0 4px" : "0 7px" }}>{convCounts.open} Open</Tag>
          <Tag color="warning" style={{ fontSize: 10, margin: 0, padding: isMobile ? "0 4px" : "0 7px" }}>{convCounts.pending} Pending</Tag>
          {!isMobile && unreadCount > 0 && <Badge count={unreadCount} style={{ backgroundColor: "#f97316" }} />}
        </Space>
      ),
      onClick: () => navTo("/omnichannel"),
    },
    {
      title: "Pipeline Value",
      value: fmtKES(totalLeadValue),
      icon: <DollarOutlined />,
      color: "#10b981",
      bg: "#f0fdf4",
      border: "#bbf7d0",
      subtext: (
        <Text style={{ fontSize: 11, color: "#64748b" }}>
          Won: <span style={{ color: "#10b981", fontWeight: 600 }}>{fmtKES(wonLeadValue)}</span>
        </Text>
      ),
      onClick: () => navTo("/crm/leads"),
    },
    {
      title: "Lead Conversion",
      value: `${conversionRate.toFixed(1)}%`,
      icon: <ThunderboltOutlined />,
      color: "#f59e0b",
      bg: "#fffbeb",
      border: "#fde68a",
      subtext: (
        <Text style={{ fontSize: 11, color: "#64748b" }}>
          {totalLeads} Total Leads Tracked
        </Text>
      ),
    },
    {
      title: "Engagement Health",
      value: `${avgResolutionTime}h`,
      icon: <ClockCircleOutlined />,
      color: "#8b5cf6",
      bg: "#f5f3ff",
      border: "#ddd6fe",
      subtext: isMobile ? (
        <Text style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {connectedCount} Live · <span style={{ color: "#10b981", fontWeight: 600 }}>{pct(convCounts.resolved + convCounts.closed, totalConversations)}% Res.</span>
        </Text>
      ) : (
        <Space size={6}>
          <span style={{ fontSize: 11, color: "#64748b" }}>{connectedCount} Channels Live</span>
          <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>• {pct(convCounts.resolved + convCounts.closed, totalConversations)}% Res. Rate</span>
        </Space>
      ),
    },
  ];

  // Table Columns
  const convColumns = [
    {
      title: "Channel",
      dataIndex: "channel",
      key: "channel",
      width: 90,
      render: (ch: string) => (
        <Tag style={{ background: (CH_COLORS[ch] || C.gray) + "15", color: CH_COLORS[ch] || C.gray, border: "none", fontSize: 11, borderRadius: 4 }}>
          {ch || "—"}
        </Tag>
      ),
    },
    {
      title: "Contact",
      dataIndex: "external_contact_name",
      key: "name",
      render: (name: string, r: any) => (
        <div>
          <Text strong style={{ fontSize: 12, color: C.text }}>{name || r.external_contact_phone || "Unknown"}</Text>
          {r.last_message_preview && (
            <Text style={{ fontSize: 11, color: C.subtext, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
              {r.last_message_preview}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (s: string) => <Pill label={s?.toUpperCase()} color={ST_COLORS[s] || C.gray} bg={(ST_COLORS[s] || C.gray) + "15"} />,
    },
    {
      title: "Unread",
      dataIndex: "unread_count",
      key: "unread",
      width: 70,
      align: "center" as const,
      render: (n: number) => n > 0 ? <Badge count={n} style={{ backgroundColor: "#f97316" }} /> : <Text style={{ color: C.gray, fontSize: 11 }}>—</Text>,
    },
    {
      title: "Last Active",
      dataIndex: "last_message_at",
      key: "last",
      width: 110,
      render: (t: string) => <Text style={{ fontSize: 11, color: C.subtext }}>{t ? dayjs(t).fromNow() : "—"}</Text>,
    },
  ];

  const leadColumns = [
    {
      title: "Lead",
      dataIndex: "lead_name",
      key: "name",
      render: (name: string, r: any) => (
        <div>
          <Text strong style={{ fontSize: 12 }}>{name || "—"}</Text>
          {r.company_name && <Text style={{ fontSize: 11, color: C.subtext, display: "block" }}>{r.company_name}</Text>}
        </div>
      ),
    },
    {
      title: "Stage",
      dataIndex: "stage",
      key: "stage",
      width: 110,
      render: (s: string) => <Pill label={s?.toUpperCase()} color={stageColorMap[s] || C.gray} bg={(stageColorMap[s] || C.gray) + "18"} />,
    },
    {
      title: "Value",
      dataIndex: "estimated_value",
      key: "value",
      width: 120,
      render: (v: number) => <Text strong style={{ fontSize: 12, color: C.success }}>{v ? fmtKES(v) : "—"}</Text>,
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      width: 110,
      render: (s: string) => <Text style={{ fontSize: 11, color: C.subtext }}>{s?.replace(/_/g, " ") || "—"}</Text>,
    },
    {
      title: "Last Contact",
      dataIndex: "last_contacted_at",
      key: "last",
      width: 110,
      render: (t: string) => <Text style={{ fontSize: 11, color: C.subtext }}>{t ? dayjs(t).fromNow() : "—"}</Text>,
    },
  ];

  const custColumns = [
    {
      title: "Customer",
      dataIndex: "customer_name",
      key: "name",
      render: (name: string) => (
        <Space size={8}>
          <Avatar size={28} style={{ background: "#eff6ff", color: "#3b82f6", fontSize: 12 }}>{(name || "?")[0].toUpperCase()}</Avatar>
          <Text strong style={{ fontSize: 12 }}>{name || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 130,
      render: (p: string) => <Text style={{ fontSize: 12, color: C.subtext }}>{p ? String(p) : "—"}</Text>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (e: string) => <Text style={{ fontSize: 12, color: C.subtext }} ellipsis>{e || "—"}</Text>,
    },
    {
      title: "Health",
      key: "visits",
      width: 100,
      render: (_: any, r: any) => {
        const v = r.visits || [];
        if (!v.length) return <Pill label="NEW" color={C.blue} bg={C.blueLight} />;
        const last = v.reduce((p: any, c: any) => new Date(c.createdAt) > new Date(p.createdAt) ? c : p).createdAt;
        const days = (Date.now() - new Date(last).getTime()) / 86400000;
        return days <= 14
          ? <Pill label="ACTIVE" color={C.success} bg={C.successLight} />
          : <Pill label="OVERDUE" color={C.warning} bg={C.warningLight} />;
      },
    },
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* ── Mobile Filter Drawer ── */}
      <Drawer
        title="Filter Period & Branch"
        placement="bottom"
        height="auto"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        styles={{ body: { paddingBottom: 32 } }}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {isAdminLayout && shops.length > 0 && (
            <div>
              <Text style={{ fontSize: 12, color: C.subtext, display: "block", marginBottom: 6 }}>Branch</Text>
              <Select
                value={selectedShopId}
                onChange={(val) => {
                  setSelectedShopId(val);
                  setFilterDrawerOpen(false);
                }}
                options={shops.map((s: any) => ({ label: s.name, value: s._id }))}
                style={{ width: "100%" }}
              />
            </div>
          )}
          <div>
            <Text style={{ fontSize: 12, color: C.subtext, display: "block", marginBottom: 6 }}>Time Period</Text>
            <Radio.Group
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value);
                setShowCustomPicker(e.target.value === "custom");
                if (e.target.value !== "custom") setFilterDrawerOpen(false);
              }}
              style={{ width: "100%" }}
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                {Object.entries(PERIOD_LABELS).map(([val, label]) => (
                  <Radio.Button
                    key={val}
                    value={val}
                    style={{ width: "100%", textAlign: "center", borderRadius: 8, marginBottom: 4 }}
                  >
                    {label}
                  </Radio.Button>
                ))}
              </Space>
            </Radio.Group>
          </div>
          {showCustomPicker && (
            <RangePicker
              value={customDateRange as any}
              onChange={(dates) => setCustomDateRange(dates || [])}
              style={{ width: "100%" }}
            />
          )}
        </Space>
      </Drawer>

      {/* ── Tier 1: Control Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 14 : 16, flexWrap: "wrap", gap: 12 }}>
        <Space align="center" size={12}>
          <div style={{ background: "#eff6ff", borderRadius: 10, padding: isMobile ? "6px 8px" : "8px 10px", color: "#3b82f6", fontSize: isMobile ? 18 : 20 }}>
            <MessageOutlined />
          </div>
          <div>
            <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: C.text, fontWeight: 600 }}>Mteja CRM Dashboard</Title>
            <Text style={{ fontSize: 12, color: C.subtext }}>
              {dateRangeLabel} · Customer Engagement & Omnichannel Leads
            </Text>
          </div>
        </Space>

        <Space size={8} wrap>
          {isMobile ? (
            <>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setFilterDrawerOpen(true)}
                size="middle"
              >
                {PERIOD_LABELS[periodFilter] || "Filter"}
              </Button>
              <Button
                type="primary"
                icon={<ReloadOutlined spin={convRefetching} />}
                onClick={handleRefresh}
                size="middle"
              />
            </>
          ) : (
            <>
              {isAdminLayout && shops.length > 0 && (
                <Select
                  value={selectedShopId}
                  onChange={setSelectedShopId}
                  options={shops.map((s: any) => ({ label: s.name, value: s._id }))}
                  style={{ width: 150 }}
                  size="small"
                  placeholder="Select branch"
                />
              )}
              <Radio.Group value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} buttonStyle="solid" size="small">
                <Radio.Button value="day">Day</Radio.Button>
                <Radio.Button value="week">Week</Radio.Button>
                <Radio.Button value="month">Month</Radio.Button>
                <Radio.Button value="year">Year</Radio.Button>
                <Radio.Button value="custom" onClick={() => setShowCustomPicker(!showCustomPicker)}>Custom</Radio.Button>
              </Radio.Group>
              {showCustomPicker && (
                <RangePicker
                  value={customDateRange as any}
                  onChange={(dates) => setCustomDateRange(dates || [])}
                  size="small"
                  style={{ minWidth: 230 }}
                />
              )}
              <Button size="small" icon={<ReloadOutlined spin={convRefetching} />} onClick={handleRefresh}>
                Refresh
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* ── Tier 2: Executive CRM Pulse (4 Refined Cards) ── */}
      <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
        {kpiCards.map((card, i) => (
          <Col xs={12} sm={12} lg={6} key={i}>
            <div
              onClick={card.onClick}
              style={{
                background: card.bg,
                borderRadius: isMobile ? 10 : 12,
                padding: isMobile ? "10px 10px" : "16px 18px",
                border: `1px solid ${card.border}`,
                cursor: card.onClick ? "pointer" : "default",
                transition: "transform .15s ease, box-shadow .15s ease",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
              onMouseEnter={(e) => {
                if (card.onClick) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)";
                }
              }}
              onMouseLeave={(e) => {
                if (card.onClick) {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              {isDataLoading ? (
                <Skeleton active paragraph={false} />
              ) : (
                <Space direction="vertical" size={isMobile ? 2 : 3} style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                    <Text style={{ fontSize: isMobile ? 11 : 12, color: "#475569", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {card.title}
                    </Text>
                    <div style={{ background: "#ffffff", borderRadius: isMobile ? 6 : 8, padding: isMobile ? "3px 5px" : "4px 6px", color: card.color, fontSize: isMobile ? 12 : 14, lineHeight: 1, flexShrink: 0 }}>
                      {card.icon}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: isMobile ? 17 : 22,
                      fontWeight: 700,
                      color: "#0f172a",
                      lineHeight: 1.2,
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={typeof card.value === "string" ? card.value : undefined}
                  >
                    {card.value}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.subtext}</div>
                </Space>
              )}
            </div>
          </Col>
        ))}
      </Row>

      {/* ── Tier 3: Visual Analytics & Charts Hub ── */}
      <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
        {/* Left 60%: Lead Pipeline Funnel (BarChart) */}
        <Col xs={24} lg={15}>
          <ProCard
            bordered
            headerBordered
            size="small"
            style={{ borderRadius: 12, height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            title={
              <Space size={6} wrap>
                <div style={{ background: "#f5f3ff", borderRadius: 8, padding: isMobile ? "3px 6px" : "4px 8px", color: "#6366f1", display: "inline-flex", fontSize: isMobile ? 12 : 14 }}>
                  <FundOutlined />
                </div>
                <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>Lead Pipeline Progression</Text>
                <Tag color="purple" style={{ borderRadius: 10, fontSize: 10, border: "none" }}>
                  {totalLeads} Total
                </Tag>
              </Space>
            }
            extra={
              <Space size={4}>
                <Segmented
                  size="small"
                  value={pipelineMetric}
                  onChange={(val) => setPipelineMetric(val as "count" | "value")}
                  options={[
                    { label: isMobile ? "Count" : "Leads Count", value: "count", icon: isMobile ? undefined : <TeamOutlined /> },
                    { label: isMobile ? "Value" : "Deal Value (KES)", value: "value", icon: isMobile ? undefined : <DollarOutlined /> },
                  ]}
                />
                {!isMobile && (
                  <Button type="link" size="small" onClick={() => navTo("/crm/leads")} style={{ fontSize: 12 }}>
                    All Leads →
                  </Button>
                )}
              </Space>
            }
            bodyStyle={{ padding: isMobile ? "10px 6px 6px" : "16px 12px 10px" }}
          >
            {pipelineLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : totalLeads === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No active pipeline leads in this period" style={{ padding: "32px 0" }} />
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 210 : 260}>
                <BarChart data={pipelineChartData} margin={{ top: 8, right: isMobile ? 8 : 16, left: isMobile ? -22 : -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="stage"
                    interval={0}
                    tick={{ fontSize: isMobile ? 9 : 10, fill: "#64748b" }}
                    tickFormatter={(val: string) => {
                      if (!isMobile) return val;
                      const compact: Record<string, string> = {
                        New: "New",
                        Contacted: "Cont.",
                        Qualified: "Qual.",
                        Proposal: "Prop.",
                        Negotiation: "Neg.",
                        Won: "Won",
                        Lost: "Lost",
                      };
                      return compact[val] || val.slice(0, 4);
                    }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (pipelineMetric === "value" ? fmtK(v) : `${v}`)}
                  />
                  <ReTooltip
                    formatter={(val: any, _: any, entry: any) => [
                      pipelineMetric === "value" ? fmtKES(Number(val)) : `${val} leads (Value: ${fmtKES(entry.payload.value)})`,
                      pipelineMetric === "value" ? "Estimated Value" : "Leads",
                    ]}
                    labelFormatter={(_label, payload) => {
                      if (payload && payload.length > 0) {
                        return payload[0].payload.stage;
                      }
                      return _label;
                    }}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Bar
                    dataKey={pipelineMetric === "value" ? "value" : "count"}
                    radius={[6, 6, 0, 0]}
                    barSize={isMobile ? 18 : 28}
                  >
                    {pipelineChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ProCard>
        </Col>

        {/* Right 40%: Conversations & Channels Mix (Donut Chart) */}
        <Col xs={24} lg={9}>
          <ProCard
            bordered
            headerBordered
            size="small"
            style={{ borderRadius: 12, height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            title={
              <Space size={6}>
                <div style={{ background: "#f0fdf4", borderRadius: 8, padding: isMobile ? "3px 6px" : "4px 8px", color: "#10b981", display: "inline-flex", fontSize: isMobile ? 12 : 14 }}>
                  <PieChartOutlined />
                </div>
                <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>Engagement Mix</Text>
              </Space>
            }
            extra={
              <Segmented
                size="small"
                value={statusMixMode}
                onChange={(val) => setStatusMixMode(val as "status" | "channel")}
                options={[
                  { label: "Status", value: "status" },
                  { label: "Channels", value: "channel" },
                ]}
              />
            }
            bodyStyle={{ padding: isMobile ? "10px 6px 6px" : "16px 12px 10px" }}
          >
            {convLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : statusPieData.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No conversation data recorded" style={{ padding: "32px 0" }} />
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 210 : 260}>
                <PieChart margin={{ top: 4, right: 10, left: 10, bottom: 10 }}>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={isMobile ? 38 : 45}
                    outerRadius={isMobile ? 65 : 75}
                    paddingAngle={3}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`pie-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip
                    formatter={(val: any) => [`${val} conversations`, "Volume"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ProCard>
        </Col>
      </Row>

      {/* ── Tier 4: Unified CRM Operations Hub (Tabbed Card) ── */}
      <Row>
        <Col span={24}>
          <ProCard
            bordered
            headerBordered
            size="small"
            style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", width: "100%", maxWidth: "100%", overflow: "hidden" }}
            title={
              <Space size={8}>
                <div style={{ background: "#eff6ff", borderRadius: 8, padding: isMobile ? "3px 6px" : "4px 8px", color: "#3b82f6", display: "inline-flex", fontSize: isMobile ? 12 : 14 }}>
                  <TeamOutlined />
                </div>
                <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>CRM Operations Hub</Text>
              </Space>
            }
            bodyStyle={{ padding: isMobile ? "6px 8px 12px" : "8px 16px 16px", width: "100%", maxWidth: "100%" }}
          >
            <Tabs
              defaultActiveKey="chats"
              size={isMobile ? "small" : "middle"}
              items={[
                {
                  key: "chats",
                  label: (
                    <Space size={isMobile ? 4 : 6}>
                      <MessageOutlined />
                      <span>{isMobile ? "Chats" : "Recent Conversations"}</span>
                      {totalConversations > 0 && <Badge count={totalConversations} style={{ backgroundColor: "#3b82f6", fontSize: 10 }} />}
                    </Space>
                  ),
                  children: (
                    <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                        <Radio.Group value={convStatus} onChange={(e) => setConvStatus(e.target.value)} buttonStyle="solid" size="small">
                          <Radio.Button value="all">All</Radio.Button>
                          <Radio.Button value="open">Open</Radio.Button>
                          <Radio.Button value="pending">Pending</Radio.Button>
                          <Radio.Button value="resolved">Resolved</Radio.Button>
                        </Radio.Group>
                        <Button type="link" size="small" icon={<ArrowRightOutlined />} onClick={() => navTo("/omnichannel")}>
                          Open Omnichannel Inbox
                        </Button>
                      </div>
                      <Table
                        columns={convColumns}
                        dataSource={conversations.slice(0, 6)}
                        pagination={{ pageSize: 6, hideOnSinglePage: true }}
                        size="small"
                        scroll={{ x: 450 }}
                        rowKey={(r) => r._id || Math.random().toString()}
                        locale={{ emptyText: <Empty description="No conversations" style={{ padding: 20 }} /> }}
                      />
                    </div>
                  ),
                },
                {
                  key: "leads",
                  label: (
                    <Space size={isMobile ? 4 : 6}>
                      <FundOutlined />
                      <span>{isMobile ? "Leads" : "Recent Leads"}</span>
                      {totalLeads > 0 && <Badge count={totalLeads} style={{ backgroundColor: "#6366f1", fontSize: 10 }} />}
                    </Space>
                  ),
                  children: (
                    <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                        <Button type="link" size="small" icon={<ArrowRightOutlined />} onClick={() => navTo("/crm/leads")}>
                          View All Leads ({totalLeads})
                        </Button>
                      </div>
                      <Table
                        columns={leadColumns}
                        dataSource={recentLeads}
                        pagination={{ pageSize: 6, hideOnSinglePage: true }}
                        size="small"
                        scroll={{ x: 450 }}
                        rowKey={(r) => r._id || Math.random().toString()}
                        locale={{ emptyText: <Empty description="No leads found" style={{ padding: 20 }} /> }}
                      />
                    </div>
                  ),
                },
                {
                  key: "customers",
                  label: (
                    <Space size={isMobile ? 4 : 6}>
                      <TeamOutlined />
                      <span>{isMobile ? "Clients" : "Recent Customers"}</span>
                      {customerList.length > 0 && <Badge count={customerList.length} style={{ backgroundColor: "#10b981", fontSize: 10 }} />}
                    </Space>
                  ),
                  children: (
                    <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                        <Button type="link" size="small" icon={<ArrowRightOutlined />} onClick={() => navTo("/customers")}>
                          View All Customers ({customerList.length})
                        </Button>
                      </div>
                      <Table
                        columns={custColumns}
                        dataSource={customerList.slice(0, 8)}
                        pagination={{ pageSize: 6, hideOnSinglePage: true }}
                        size="small"
                        scroll={{ x: 450 }}
                        rowKey={(r) => r._id || Math.random().toString()}
                        locale={{ emptyText: <Empty description="No customers yet" style={{ padding: 20 }} /> }}
                      />
                    </div>
                  ),
                },
                {
                  key: "channels",
                  label: (
                    <Space size={isMobile ? 4 : 6}>
                      <WifiOutlined />
                      <span>{isMobile ? "Channels" : "Channels & Performance"}</span>
                    </Space>
                  ),
                  children: (
                    <Row gutter={[16, 16]} style={{ padding: "12px 0" }}>
                      <Col xs={24} md={12}>
                        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "16px", border: "1px solid #e2e8f0" }}>
                          <Text strong style={{ fontSize: 13, display: "block", marginBottom: 12 }}>Connected Channels</Text>
                          <Space direction="vertical" style={{ width: "100%" }} size={10}>
                            {[
                              { label: "WhatsApp Business", connected: connected.whatsapp, count: channelCounts.whatsapp, color: "#25D366" },
                              { label: "Facebook Messenger", connected: connected.messenger, count: channelCounts.messenger, color: "#0084FF" },
                              { label: "Instagram Direct", connected: connected.instagram, count: channelCounts.instagram, color: "#E1306C" },
                            ].map((item, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Space size={8}>
                                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color }} />
                                  <Text style={{ fontSize: 12 }}>{item.label}</Text>
                                </Space>
                                <Space size={8}>
                                  <Tag color={item.connected ? "success" : "default"} style={{ fontSize: 10, borderRadius: 4 }}>
                                    {item.connected ? "Active" : "Not connected"}
                                  </Tag>
                                  <Text strong style={{ fontSize: 12 }}>{item.count} chats</Text>
                                </Space>
                              </div>
                            ))}
                          </Space>
                        </div>
                      </Col>
                      <Col xs={24} md={12}>
                        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "16px", border: "1px solid #e2e8f0" }}>
                          <Text strong style={{ fontSize: 13, display: "block", marginBottom: 12 }}>Response & Speed Metrics</Text>
                          <Row gutter={[10, 10]}>
                            {[
                              { label: "Resolution Rate", value: `${pct(convCounts.resolved + convCounts.closed, totalConversations)}%`, color: "#10b981" },
                              { label: "Avg Resolution", value: `${avgResolutionTime} hrs`, color: "#3b82f6" },
                              { label: "Active Channels", value: `${connectedCount} of 3`, color: "#6366f1" },
                              { label: "Unread Messages", value: unreadCount, color: unreadCount > 0 ? "#f97316" : "#64748b" },
                            ].map((s, i) => (
                              <Col span={12} key={i}>
                                <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                                  <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>{s.label}</Text>
                                  <Text strong style={{ fontSize: 16, color: s.color }}>{s.value}</Text>
                                </div>
                              </Col>
                            ))}
                          </Row>
                        </div>
                      </Col>
                    </Row>
                  ),
                },
              ]}
            />
          </ProCard>
        </Col>
      </Row>
    </div>
  );
};

export default MtejaDashboard;
