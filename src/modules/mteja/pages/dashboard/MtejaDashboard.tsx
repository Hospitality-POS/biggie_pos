import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Typography,
  Row,
  Col,
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
  Progress,
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
  MailOutlined,
  SendOutlined,
  AimOutlined,
  TrophyOutlined,
  BellOutlined,
  UserOutlined,
  ProjectOutlined,
  GlobalOutlined,
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
import { fetchCampaignAnalytics } from "@services/omnichannel/messagingCampaigns";
import { THEME_C } from "@utils/getPrimaryColor";
import { fmtK, fmtKES } from "@utils/formatters";
import { fetchAllSalesTargets, SalesTarget } from "@services/crm/salesTargets";
import { isDalaEnabled } from "@services/crm/leads";

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

const TARGET_TYPE_LABELS: Record<string, string> = {
  revenue: "Revenue",
  units_sold: "Units Sold",
  leads_generated: "Leads Generated",
  leads_converted: "Leads Converted",
  gross_profit: "Gross Profit",
  new_customers: "New Customers",
};
// Types whose actuals the API now calculates from leads/customers;
// the rest still come from manually entered values
const LIVE_TARGET_TYPES = ["revenue", "leads_generated", "leads_converted", "new_customers"];
const isMoneyTarget = (t?: string) => t === "revenue" || t === "gross_profit";
const fmtTargetValue = (v: number | undefined, type?: string) =>
  isMoneyTarget(type) ? fmtKES(v || 0) : (v || 0).toLocaleString();
const achievementColor = (p: number) => (p >= 100 ? "#10b981" : p >= 70 ? "#f59e0b" : "#ef4444");

const targetScopeLabel = (t: SalesTarget) => {
  if (t.is_company_wide) return "Company-wide";
  if (typeof t.user_id === "object" && t.user_id?.fullname) return t.user_id.fullname;
  if (typeof t.department_id === "object" && (t.department_id as any)?.name) return (t.department_id as any).name;
  if (typeof t.role_id === "object" && (t.role_id as any)?.role_type) return (t.role_id as any).role_type;
  return t.team || "Team";
};

type LeaderMetric = "won_value" | "won" | "target_pct";
interface LeaderEntry {
  id: string;
  name: string;
  leads: number;
  won: number;
  won_value: number;
  win_rate: number;
  targets: number;
  target_pct?: number; // average achievement across the person's targets
}

// "12 days left" / "Last day" / "Ended 3 days ago" / "Starts in 5 days"
const targetTimeLeft = (t: SalesTarget): { text: string; color: string } => {
  const today = dayjs().startOf("day");
  const start = dayjs(t.period_start).startOf("day");
  const end = dayjs(t.period_end).startOf("day");
  if (today.isBefore(start)) {
    const n = start.diff(today, "day");
    return { text: `Starts in ${n} day${n === 1 ? "" : "s"}`, color: "#3b82f6" };
  }
  const left = end.diff(today, "day");
  if (left < 0) return { text: `Ended ${-left} day${left === -1 ? "" : "s"} ago`, color: "#64748b" };
  if (left === 0) return { text: "Last day", color: "#ef4444" };
  return { text: `${left} day${left === 1 ? "" : "s"} left`, color: left <= 7 ? "#f59e0b" : "#0d9488" };
};

const formatSource = (s?: string) =>
  (s || "other").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

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

const fetchRecentCustomers = async (params: { shop_id?: string; limit?: number; start_date?: string; end_date?: string }) => {
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

const fetchLeadPipeline = async (params: { shop_id?: string; start_date?: string; end_date?: string }) => {
  try {
    const res = await axiosInstance.get(`${BASE_URL}/api/crm/leads/pipeline-summary`, { params });
    return res.data;
  } catch { return { stages: [], total_leads: 0, total_value: 0, won_value: 0, conversion_rate: 0 }; }
};

const fetchRecentLeads = async (params: { shop_id?: string; limit?: number; start_date?: string; end_date?: string }) => {
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

// ── Operations Hub row: avatar · title/subtitle · right-hand summary ──────────
const HubRow: React.FC<{
  avatar: React.ReactNode;
  accent: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  rightSub?: React.ReactNode;
  onClick?: () => void;
}> = ({ avatar, accent, title, subtitle, right, rightSub, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
      border: "1px solid #eef2f7", borderLeft: `3px solid ${accent}`, borderRadius: 10,
      background: "#ffffff", cursor: onClick ? "pointer" : "default", minWidth: 0,
      transition: "background .15s ease",
    }}
    onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = "#f8fafc"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
  >
    <Avatar size={34} style={{ background: accent + "18", color: accent, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
      {avatar}
    </Avatar>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {subtitle}
        </div>
      )}
    </div>
    {(right || rightSub) && (
      <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
        {right}
        {rightSub && <span style={{ fontSize: 10, color: "#94a3b8" }}>{rightSub}</span>}
      </div>
    )}
  </div>
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
  // The Operations Hub only shows conversations when a chat channel
  // (WhatsApp / Messenger / Instagram) is connected
  const hasChatChannel = connectedCount > 0;

  // Conversations
  const { data: convData, isLoading: convLoading, isRefetching: convRefetching } = useQuery({
    queryKey: ["mteja-conversations", shopId, convStatus, start_date, end_date],
    queryFn: () => fetchConversations({ shop_id: shopId || undefined, status: convStatus === "all" ? undefined : convStatus, start_date, end_date, page: 1, limit: 100 }),
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
    queryKey: ["mteja-recent-customers", shopId, start_date, end_date],
    queryFn: () => fetchRecentCustomers({ shop_id: shopId || undefined, start_date, end_date, limit: 50 }),
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
    queryKey: ["mteja-lead-pipeline", shopId, start_date, end_date],
    queryFn: () => fetchLeadPipeline({ shop_id: shopId || undefined, start_date, end_date }),
    staleTime: 60_000,
  });
  const pipelineStages = pipelineData?.stages || [];
  const totalLeads = pipelineData?.total_leads || 0;
  const totalLeadValue = pipelineData?.total_value || 0;
  const wonLeadValue = pipelineData?.won_value || 0;
  const conversionRate = pipelineData?.conversion_rate || 0;
  const leadOwners: any[] = pipelineData?.by_owner || [];
  const leadSources: any[] = pipelineData?.by_source || [];
  const leadProjects: any[] = pipelineData?.by_project || [];
  const overdueFollowUps: number = pipelineData?.follow_ups?.overdue || 0;
  const dueFollowUps: number = pipelineData?.follow_ups?.due_this_week || 0;
  const repeatContacts: number = pipelineData?.repeat_contacts || 0;
  const wonLeadsCount = (pipelineStages.find((s: any) => s.stage === "won")?.count) || 0;
  const hasDala = isDalaEnabled();

  // Sales targets — actuals for lead/customer-based types are recalculated by
  // the API on every fetch, so this reflects current progress
  const { data: targetsData, isLoading: targetsLoading } = useQuery({
    queryKey: ["mteja-sales-targets", shopId],
    queryFn: () => fetchAllSalesTargets({ shop_id: shopId || undefined, is_active: true, limit: 100 }),
    staleTime: 30_000,
  });
  // Targets whose period overlaps the dashboard period; company-wide first,
  // then furthest along
  const periodTargets: SalesTarget[] = useMemo(() => {
    const list: SalesTarget[] = targetsData?.targets || [];
    return list
      .filter((t) => dayjs(t.period_start).isBefore(endDate) && dayjs(t.period_end).isAfter(startDate))
      .sort((a, b) =>
        Number(!!b.is_company_wide) - Number(!!a.is_company_wide) ||
        (b.achievement_percentage || 0) - (a.achievement_percentage || 0));
  }, [targetsData, startDate, endDate]);
  const targetsAchieved = periodTargets.filter((t) => t.is_achieved).length;

  // Leaderboard — team members ranked by won value, deals won, or average
  // achievement across their individual sales targets in the period
  const [leaderMetric, setLeaderMetric] = useState<LeaderMetric>("won_value");
  const leaderboard: LeaderEntry[] = useMemo(() => {
    const byUser = new Map<string, LeaderEntry & { pctSum: number }>();
    const entry = (id: string, name: string) => {
      if (!byUser.has(id)) {
        byUser.set(id, { id, name, leads: 0, won: 0, won_value: 0, win_rate: 0, targets: 0, target_pct: undefined, pctSum: 0 });
      }
      return byUser.get(id)!;
    };

    leadOwners.filter((o) => o.user_id).forEach((o) => {
      Object.assign(entry(String(o.user_id), o.name), {
        leads: o.leads, won: o.won, won_value: o.won_value, win_rate: o.win_rate,
      });
    });

    periodTargets.forEach((t) => {
      if (t.is_company_wide || typeof t.user_id !== "object" || !t.user_id?._id) return;
      const e = entry(String(t.user_id._id), t.user_id.fullname || t.user_id.username);
      e.targets += 1;
      e.pctSum += t.achievement_percentage || 0;
      e.target_pct = e.pctSum / e.targets;
    });

    return [...byUser.values()]
      .filter((e) => (leaderMetric === "target_pct" ? e.targets > 0 : e[leaderMetric] > 0))
      .sort((a, b) => (b[leaderMetric] ?? 0) - (a[leaderMetric] ?? 0))
      .slice(0, 10);
  }, [leadOwners, periodTargets, leaderMetric]);

  // Recent leads
  const { data: recentLeadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ["mteja-recent-leads", shopId, start_date, end_date],
    queryFn: () => fetchRecentLeads({ shop_id: shopId || undefined, start_date, end_date, limit: 8 }),
    staleTime: 30_000,
  });
  const recentLeads: any[] = Array.isArray(recentLeadsData) ? recentLeadsData : [];

  // SMS & Email messaging analytics (per channel, follows the period filter)
  const { data: smsAnalytics, isLoading: smsLoading } = useQuery({
    queryKey: ["mteja-msg-analytics", shopId, "sms", start_date, end_date],
    queryFn: () => fetchCampaignAnalytics({ shop_id: shopId, channel: "sms", start_date, end_date }),
    enabled: !!shopId,
    staleTime: 30_000,
  });
  const { data: emailAnalytics, isLoading: emailLoading } = useQuery({
    queryKey: ["mteja-msg-analytics", shopId, "email", start_date, end_date],
    queryFn: () => fetchCampaignAnalytics({ shop_id: shopId, channel: "email", start_date, end_date }),
    enabled: !!shopId,
    staleTime: 30_000,
  });
  const smsTotals = smsAnalytics?.totals;
  const emailTotals = emailAnalytics?.totals;
  const messagingLoading = smsLoading || emailLoading;

  // Handlers
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["mteja-conversations"] });
    queryClient.invalidateQueries({ queryKey: ["mteja-channels"] });
    queryClient.invalidateQueries({ queryKey: ["mteja-recent-customers"] });
    queryClient.invalidateQueries({ queryKey: ["mteja-stats"] });
    queryClient.invalidateQueries({ queryKey: ["mteja-lead-pipeline"] });
    queryClient.invalidateQueries({ queryKey: ["mteja-recent-leads"] });
    queryClient.invalidateQueries({ queryKey: ["mteja-msg-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["mteja-sales-targets"] });
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
      chatOnly: true,
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
          <span style={{ color: "#10b981", fontWeight: 600 }}>{wonLeadsCount} won</span> of {totalLeads} leads
        </Text>
      ),
      onClick: () => navTo("/crm/leads"),
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
  ].filter((card) => hasChatChannel || !card.chatOnly);

  // ── Operations Hub list helpers ──
  const hubGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
    gap: isMobile ? 8 : 10,
  };

  const leadDisplayName = (l: any) =>
    (l.entity_type === "company" ? l.company_name : l.lead_name) || l.lead_name || l.company_name || "Unnamed lead";

  const customerHealth = (c: any) => {
    const v = c.visits || [];
    if (!v.length) return { label: "NEW", color: C.blue };
    const last = v.reduce((p: any, x: any) => (new Date(x.createdAt) > new Date(p.createdAt) ? x : p)).createdAt;
    const days = (Date.now() - new Date(last).getTime()) / 86400000;
    return days <= 14 ? { label: "ACTIVE", color: C.success } : { label: "OVERDUE", color: C.warning };
  };

  const hubTabLabel = (icon: React.ReactNode, label: string, mobileLabel: string, count: number, color: string) => (
    <Space size={6}>
      {icon}
      <span>{isMobile ? mobileLabel : label}</span>
      {count > 0 && <Pill label={count > 99 ? "99+" : String(count)} color={color} bg={color + "18"} />}
    </Space>
  );

  const hubFooter = (label: string, to: string) => (
    <Button block type="dashed" size="small" icon={<ArrowRightOutlined />} onClick={() => navTo(to)}
      style={{ marginTop: 12, borderRadius: 8, color: C.subtext }}>
      {label}
    </Button>
  );

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
          <Col xs={12} sm={12} lg={24 / kpiCards.length} key={i}>
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

      {/* ── Tier 2.5: Action strip — follow-ups, repeat contacts, targets ── */}
      {!pipelineLoading && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: isMobile ? 12 : 16 }}>
          {([
            {
              show: overdueFollowUps > 0,
              icon: <BellOutlined />,
              text: `${overdueFollowUps} overdue follow-up${overdueFollowUps === 1 ? "" : "s"}`,
              color: C.error, bg: C.errorLight,
            },
            {
              show: dueFollowUps > 0,
              icon: <CalendarOutlined />,
              text: `${dueFollowUps} follow-up${dueFollowUps === 1 ? "" : "s"} due in the next 7 days`,
              color: C.warning, bg: C.warningLight,
            },
            {
              show: overdueFollowUps === 0 && dueFollowUps === 0,
              icon: <CheckCircleOutlined />,
              text: "No follow-ups overdue or due this week",
              color: C.success, bg: C.successLight,
            },
            {
              show: repeatContacts > 0,
              icon: <TeamOutlined />,
              text: `${repeatContacts} contact${repeatContacts === 1 ? " has" : "s have"} more than one lead`,
              color: C.purple, bg: C.purpleLight,
            },
            {
              show: periodTargets.length > 0,
              icon: <TrophyOutlined />,
              text: `${targetsAchieved} of ${periodTargets.length} sales target${periodTargets.length === 1 ? "" : "s"} achieved`,
              color: C.teal, bg: C.tealLight, to: "/crm/sales-targets",
            },
          ] as { show: boolean; icon: React.ReactNode; text: string; color: string; bg: string; to?: string }[])
            .filter((x) => x.show).map((x, i) => (
            <div key={i} onClick={() => navTo(x.to || "/crm/leads")}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
                background: x.bg, color: x.color, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 500,
              }}>
              {x.icon}
              <span>{x.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tier 3: Visual Analytics & Charts Hub ── */}
      <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
        {/* Left 60%: Lead Pipeline Funnel (BarChart) */}
        <Col xs={24} lg={hasChatChannel ? 15 : 24}>
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

        {/* Right 40%: Conversations & Channels Mix (Donut Chart) — chat channels only */}
        {hasChatChannel && <Col xs={24} lg={9}>
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
        </Col>}
      </Row>

      {/* ── Tier 3.2: Sales Targets & Team Performance ── */}
      <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
        <Col xs={24} lg={12}>
          <ProCard
            bordered
            headerBordered
            size="small"
            style={{ borderRadius: 12, height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            title={
              <Space size={6} wrap>
                <div style={{ background: C.tealLight, borderRadius: 8, padding: isMobile ? "3px 6px" : "4px 8px", color: C.teal, display: "inline-flex", fontSize: isMobile ? 12 : 14 }}>
                  <AimOutlined />
                </div>
                <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>Sales Targets</Text>
                {periodTargets.length > 0 && (
                  <Tag color="cyan" style={{ borderRadius: 10, fontSize: 10, border: "none" }}>
                    {targetsAchieved}/{periodTargets.length} achieved
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Button type="link" size="small" onClick={() => navTo("/crm/sales-targets")} style={{ fontSize: 12 }}>
                {isMobile ? "All →" : "All Targets →"}
              </Button>
            }
            bodyStyle={{ padding: isMobile ? "10px 10px" : "12px 16px" }}
          >
            {targetsLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : periodTargets.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sales targets running in this period" style={{ padding: "24px 0" }}>
                <Button size="small" onClick={() => navTo("/crm/sales-targets")}>Set a target</Button>
              </Empty>
            ) : (
              <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
                {periodTargets.slice(0, 8).map((t) => {
                  const p = t.achievement_percentage || 0;
                  const color = achievementColor(p);
                  const timeLeft = targetTimeLeft(t);
                  return (
                    <div key={t._id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <Space size={6} wrap>
                            <Text strong style={{ fontSize: 12 }}>{t.name}</Text>
                            {t.is_company_wide && (
                              <Tag icon={<GlobalOutlined />} color="blue" style={{ fontSize: 10, margin: 0, borderRadius: 4 }}>
                                Company-wide
                              </Tag>
                            )}
                            {t.is_achieved && <TrophyOutlined style={{ color: C.success }} />}
                            <Pill label={timeLeft.text.toUpperCase()} color={timeLeft.color} bg={timeLeft.color + "15"} />
                          </Space>
                          <Text style={{ fontSize: 11, color: C.subtext, display: "block" }}>
                            {TARGET_TYPE_LABELS[t.type] || t.type}
                            {!t.is_company_wide && ` · ${targetScopeLabel(t)}`}
                            {` · ${dayjs(t.period_start).format("D MMM")} – ${dayjs(t.period_end).format("D MMM YYYY")}`}
                            {!LIVE_TARGET_TYPES.includes(t.type) && " · manual"}
                          </Text>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <Text strong style={{ fontSize: 13, color }}>{p.toFixed(1)}%</Text>
                          <Text style={{ fontSize: 11, color: C.subtext, display: "block" }}>
                            {fmtTargetValue(t.actual_value, t.type)} / {fmtTargetValue(t.target_value, t.type)}
                          </Text>
                        </div>
                      </div>
                      <Progress percent={Math.min(p, 100)} showInfo={false} size="small" strokeColor={color} trailColor="#e2e8f0" style={{ margin: "4px 0 0" }} />
                    </div>
                  );
                })}
                {periodTargets.length > 8 && (
                  <Button type="link" size="small" onClick={() => navTo("/crm/sales-targets")} style={{ padding: "6px 0 0", fontSize: 12 }}>
                    +{periodTargets.length - 8} more targets
                  </Button>
                )}
              </div>
            )}
          </ProCard>
        </Col>

        <Col xs={24} lg={12}>
          <ProCard
            bordered
            headerBordered
            size="small"
            style={{ borderRadius: 12, height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            title={
              <Space size={6}>
                <div style={{ background: C.warningLight, borderRadius: 8, padding: isMobile ? "3px 6px" : "4px 8px", color: C.warning, display: "inline-flex", fontSize: isMobile ? 12 : 14 }}>
                  <TrophyOutlined />
                </div>
                <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>Leaderboard</Text>
              </Space>
            }
            extra={
              <Segmented
                size="small"
                value={leaderMetric}
                onChange={(v) => setLeaderMetric(v as LeaderMetric)}
                options={[
                  { label: isMobile ? "Value" : "Won Value", value: "won_value" },
                  { label: isMobile ? "Won" : "Deals Won", value: "won" },
                  { label: isMobile ? "Target" : "Target %", value: "target_pct" },
                ]}
              />
            }
            bodyStyle={{ padding: isMobile ? "8px 10px" : "10px 16px" }}
          >
            {pipelineLoading || targetsLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : leaderboard.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={leaderMetric === "target_pct"
                  ? "No individual sales targets in this period"
                  : "No deals won by a team member in this period"}
                style={{ padding: "24px 0" }}
              />
            ) : (
              <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
                {leaderboard.map((e, i) => {
                  const value = e[leaderMetric] ?? 0;
                  const leaderValue = leaderboard[0][leaderMetric] ?? 0;
                  const medal = ["#f59e0b", "#94a3b8", "#c2410c"][i];
                  return (
                    <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: medal ? medal + "20" : "#f1f5f9", color: medal || C.gray,
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {medal ? <TrophyOutlined /> : i + 1}
                      </div>
                      <Avatar size={28} style={{ background: C.blueLight, color: C.blue, fontSize: 12, flexShrink: 0 }}>
                        {(e.name || "?")[0].toUpperCase()}
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <Text strong style={{ fontSize: 12 }} ellipsis>{e.name}</Text>
                          <Text strong style={{ fontSize: 12, color: medal || C.text, flexShrink: 0 }}>
                            {leaderMetric === "won_value" ? fmtKES(value)
                              : leaderMetric === "target_pct" ? `${value.toFixed(1)}%`
                              : `${value} won`}
                          </Text>
                        </div>
                        <Progress
                          percent={leaderMetric === "target_pct" ? Math.min(value, 100) : leaderValue ? (value / leaderValue) * 100 : 0}
                          showInfo={false} size="small" trailColor="#e2e8f0"
                          strokeColor={leaderMetric === "target_pct" ? achievementColor(value) : medal || C.blue}
                          style={{ margin: "2px 0 0" }}
                        />
                        <Text style={{ fontSize: 10, color: C.subtext }}>
                          {e.won} won of {e.leads} lead{e.leads === 1 ? "" : "s"} · {e.win_rate}% win rate
                          {e.targets > 0 && ` · ${e.targets} target${e.targets === 1 ? "" : "s"}`}
                        </Text>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ProCard>
        </Col>
      </Row>

      {/* ── Tier 3.3: Team Performance, Lead Sources (and Projects for dala tenants) ── */}
      <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
        <Col xs={24} lg={12}>
          <ProCard
            bordered
            headerBordered
            size="small"
            style={{ borderRadius: 12, height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            title={
              <Space size={6}>
                <div style={{ background: C.blueLight, borderRadius: 8, padding: isMobile ? "3px 6px" : "4px 8px", color: C.blue, display: "inline-flex", fontSize: isMobile ? 12 : 14 }}>
                  <UserOutlined />
                </div>
                <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>Team Performance</Text>
              </Space>
            }
            bodyStyle={{ padding: isMobile ? "10px 8px" : "12px 14px" }}
          >
            {pipelineLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : leadOwners.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No leads in this period" style={{ padding: "24px 0" }} />
            ) : (
              <div style={{
                display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 10, maxHeight: 320, overflowY: "auto", paddingRight: 2,
              }}>
                {leadOwners.map((o) => {
                  const assigned = !!o.user_id;
                  const accent = assigned ? C.blue : C.gray;
                  return (
                    <div key={o.user_id || "unassigned"} style={{
                      border: `1px solid ${assigned ? "#e2e8f0" : "#f1f5f9"}`, borderRadius: 10,
                      padding: "10px 12px", background: assigned ? "#ffffff" : "#f8fafc",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Avatar size={30} style={{ background: assigned ? C.blueLight : "#e2e8f0", color: accent, fontSize: 13, flexShrink: 0 }}>
                          {assigned ? (o.name || "?")[0].toUpperCase() : <UserOutlined />}
                        </Avatar>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <Text strong style={{ fontSize: 12, color: assigned ? C.text : C.subtext, display: "block" }} ellipsis>
                            {o.name}
                          </Text>
                          <Text style={{ fontSize: 15, fontWeight: 700, color: o.won_value ? C.success : C.subtext }}>
                            {o.won_value ? fmtKES(o.won_value) : "No wins yet"}
                          </Text>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <Text style={{ fontSize: 10, color: C.subtext }}>Win rate</Text>
                        <Text style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{o.win_rate}%</Text>
                      </div>
                      <Progress percent={o.win_rate} showInfo={false} size="small" strokeColor={C.success} trailColor="#e2e8f0" style={{ margin: 0 }} />

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        <Pill label={`${o.leads} LEAD${o.leads === 1 ? "" : "S"}`} color={accent} bg={accent + "15"} />
                        <Pill label={`${o.won} WON`} color={o.won ? C.success : C.gray} bg={(o.won ? C.success : C.gray) + "15"} />
                        {o.pipeline_value > 0 && (
                          <Pill label={`${fmtK(o.pipeline_value)} PIPELINE`} color={C.purple} bg={C.purpleLight} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ProCard>
        </Col>

        {[
          {
            key: "sources",
            show: true,
            title: "Lead Sources",
            icon: <FireOutlined />,
            color: C.orange, bg: C.orangeLight,
            rows: leadSources.map((s) => ({ ...s, label: formatSource(s.source) })),
            empty: "No leads in this period",
          },
          {
            key: "projects",
            show: hasDala,
            title: "Leads by Project",
            icon: <ProjectOutlined />,
            color: C.purple, bg: C.purpleLight,
            rows: leadProjects.map((p) => ({ ...p, label: p.project })),
            empty: "No leads linked to a project in this period",
          },
        ].filter((x) => x.show).map((card) => (
          // Sources sits beside Team Performance; Projects gets its own full row
          <Col xs={24} lg={card.key === "projects" ? 24 : 12} key={card.key}>
            <ProCard
              bordered
              headerBordered
              size="small"
              style={{ borderRadius: 12, height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              title={
                <Space size={6}>
                  <div style={{ background: card.bg, borderRadius: 8, padding: isMobile ? "3px 6px" : "4px 8px", color: card.color, display: "inline-flex", fontSize: isMobile ? 12 : 14 }}>
                    {card.icon}
                  </div>
                  <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>{card.title}</Text>
                </Space>
              }
              bodyStyle={{ padding: isMobile ? "10px 6px 6px" : "14px 12px 8px" }}
            >
              {pipelineLoading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : card.rows.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={card.empty} style={{ padding: "24px 0" }} />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(140, Math.min(card.rows.length, 8) * 34 + 30)}>
                  <BarChart data={card.rows.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" width={isMobile ? 80 : 110} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                    <ReTooltip
                      formatter={(val: any, name: any, entry: any) =>
                        name === "Won"
                          ? [`${val} (${fmtKES(entry.payload.won_value)})`, "Won"]
                          : [`${val} · ${entry.payload.win_rate}% win rate`, "Leads"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="leads" name="Leads" fill={card.color} radius={[0, 4, 4, 0]} barSize={10} />
                    <Bar dataKey="won" name="Won" fill={C.success} radius={[0, 4, 4, 0]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ProCard>
          </Col>
        ))}
      </Row>

      {/* ── Tier 3.5: SMS & Email Messaging Stats ── */}
      <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
        <Col span={24}>
          <ProCard
            bordered
            headerBordered
            size="small"
            style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            title={
              <Space size={6}>
                <div style={{ background: "#fff7ed", borderRadius: 8, padding: isMobile ? "3px 6px" : "4px 8px", color: "#f97316", display: "inline-flex", fontSize: isMobile ? 12 : 14 }}>
                  <SendOutlined />
                </div>
                <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>SMS &amp; Email Messaging</Text>
                {(smsTotals?.sent_count || 0) + (emailTotals?.sent_count || 0) > 0 && (
                  <Tag color="orange" style={{ borderRadius: 10, fontSize: 10, border: "none" }}>
                    {(smsTotals?.sent_count || 0) + (emailTotals?.sent_count || 0)} sent
                  </Tag>
                )}
              </Space>
            }
            extra={
              !isMobile && (
                <Button type="link" size="small" onClick={() => navTo("/omnichannel")} style={{ fontSize: 12 }}>
                  Open Messaging →
                </Button>
              )
            }
            bodyStyle={{ padding: isMobile ? "10px 8px" : "14px 16px" }}
          >
            {messagingLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
              <Row gutter={[16, 16]}>
                {[
                  {
                    label: "SMS",
                    icon: <MessageOutlined />,
                    color: "#25D366",
                    bg: "#f0fdf4",
                    data: smsTotals,
                    trend: smsAnalytics?.daily_trend || [],
                  },
                  {
                    label: "Email",
                    icon: <MailOutlined />,
                    color: "#3b82f6",
                    bg: "#eff6ff",
                    data: emailTotals,
                    trend: emailAnalytics?.daily_trend || [],
                  },
                ].map((ch, i) => (
                  <Col xs={24} md={12} key={i}>
                    <div style={{ background: "#f8fafc", borderRadius: 8, padding: 16, border: "1px solid #e2e8f0", height: "100%" }}>
                      <Space size={8} style={{ marginBottom: 12 }}>
                        <div style={{ background: ch.bg, borderRadius: 7, padding: "3px 7px", color: ch.color, fontSize: 13, lineHeight: 1 }}>
                          {ch.icon}
                        </div>
                        <Text strong style={{ fontSize: 13 }}>{ch.label}</Text>
                        <Text style={{ fontSize: 11, color: "#64748b" }}>
                          {(ch.data?.campaigns || 0) + (ch.data?.quick_sends || 0) === 0
                            ? "No activity in period"
                            : `${(ch.data?.campaigns || 0) + (ch.data?.quick_sends || 0)} sends`}
                        </Text>
                      </Space>
                      <Row gutter={[10, 10]}>
                        {[
                          { label: "Campaigns", value: ch.data?.campaigns || 0, color: "#6366f1" },
                          { label: "Quick Sends", value: ch.data?.quick_sends || 0, color: "#8b5cf6" },
                          { label: "Recipients", value: ch.data?.total_recipients || 0, color: "#0d9488" },
                          { label: "Sent", value: ch.data?.sent_count || 0, color: "#10b981" },
                          { label: "Failed", value: ch.data?.failed_count || 0, color: (ch.data?.failed_count || 0) > 0 ? "#ef4444" : "#64748b" },
                          { label: "Success Rate", value: `${ch.data?.success_rate || 0}%`, color: "#f59e0b" },
                        ].map((s, j) => (
                          <Col span={8} key={j}>
                            <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                              <Text style={{ fontSize: 10, color: "#64748b", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</Text>
                              <Text strong style={{ fontSize: isMobile ? 14 : 16, color: s.color }}>{s.value}</Text>
                            </div>
                          </Col>
                        ))}
                      </Row>
                      {ch.trend.length > 0 && (
                        <ResponsiveContainer width="100%" height={isMobile ? 90 : 110}>
                          <BarChart data={ch.trend.slice(-14)} margin={{ top: 12, right: 4, left: -28, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(d: string) => d.slice(5)} />
                            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <ReTooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 11 }} />
                            <Bar dataKey="sent" stackId="a" fill="#10b981" name="Sent" />
                            <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </ProCard>
        </Col>
      </Row>

      {/* ── Tier 4: CRM Operations Hub — latest activity as compact rows ── */}
      <Row>
        <Col span={24}>
          <ProCard
            bordered
            headerBordered
            size="small"
            style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", width: "100%", maxWidth: "100%", overflow: "hidden" }}
            title={
              <Space size={8} align="center">
                <div style={{ background: C.blueLight, borderRadius: 8, padding: isMobile ? "3px 6px" : "4px 8px", color: C.blue, display: "inline-flex", fontSize: isMobile ? 12 : 14 }}>
                  <TeamOutlined />
                </div>
                <div>
                  <Text strong style={{ fontSize: isMobile ? 13 : 14, display: "block", lineHeight: 1.2 }}>CRM Operations Hub</Text>
                  {!isMobile && <Text style={{ fontSize: 11, color: C.subtext }}>Latest activity · {dateRangeLabel}</Text>}
                </div>
              </Space>
            }
            bodyStyle={{ padding: isMobile ? "4px 10px 14px" : "4px 16px 16px", width: "100%", maxWidth: "100%" }}
          >
            <Tabs
              // Remount when the chats tab appears/disappears so the default tab follows it
              key={hasChatChannel ? "with-chats" : "no-chats"}
              defaultActiveKey={hasChatChannel ? "chats" : "leads"}
              size={isMobile ? "small" : "middle"}
              items={[
                ...(!hasChatChannel ? [] : [{
                  key: "chats",
                  label: hubTabLabel(<MessageOutlined />, "Conversations", "Chats", totalConversations, C.blue),
                  children: (
                    <div>
                      <div style={{ marginBottom: 12 }}>
                        <Segmented
                          size="small"
                          value={convStatus}
                          onChange={(v) => setConvStatus(v as typeof convStatus)}
                          options={[
                            { label: "All", value: "all" },
                            { label: `Open${convCounts.open ? ` · ${convCounts.open}` : ""}`, value: "open" },
                            { label: `Pending${convCounts.pending ? ` · ${convCounts.pending}` : ""}`, value: "pending" },
                            { label: "Resolved", value: "resolved" },
                          ]}
                        />
                      </div>
                      {conversations.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No conversations in this period" style={{ padding: "20px 0" }} />
                      ) : (
                        <div style={hubGrid}>
                          {conversations.slice(0, 6).map((c: any) => {
                            const accent = CH_COLORS[c.channel] || C.gray;
                            const name = c.external_contact_name || c.external_contact_phone || "Unknown contact";
                            return (
                              <HubRow
                                key={c._id}
                                accent={accent}
                                avatar={(name || "?")[0].toUpperCase()}
                                title={name}
                                subtitle={c.last_message_preview || <span style={{ textTransform: "capitalize" }}>{c.channel}</span>}
                                right={
                                  <Space size={4}>
                                    {c.unread_count > 0 && <Badge count={c.unread_count} size="small" style={{ backgroundColor: C.orange }} />}
                                    <Pill label={(c.status || "—").toUpperCase()} color={ST_COLORS[c.status] || C.gray} bg={(ST_COLORS[c.status] || C.gray) + "15"} />
                                  </Space>
                                }
                                rightSub={c.last_message_at ? dayjs(c.last_message_at).fromNow() : undefined}
                                onClick={() => navTo("/omnichannel")}
                              />
                            );
                          })}
                        </div>
                      )}
                      {hubFooter("Open Omnichannel Inbox", "/omnichannel")}
                    </div>
                  ),
                }]),
                {
                  key: "leads",
                  label: hubTabLabel(<FundOutlined />, "Leads", "Leads", totalLeads, C.purple),
                  children: (
                    <div>
                      {recentLeads.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No leads in this period" style={{ padding: "20px 0" }} />
                      ) : (
                        <div style={hubGrid}>
                          {recentLeads.slice(0, 6).map((l: any) => {
                            const accent = stageColorMap[l.stage] || C.gray;
                            const name = leadDisplayName(l);
                            const owner = l.assigned_to?.name || l.assigned_to?.fullname || l.assigned_to?.username || "Other";
                            const details = [
                              l.entity_type === "company" ? l.contact_person : l.company_name,
                              formatSource(l.source),
                              owner,
                              hasDala ? l.project : undefined,
                            ].filter(Boolean).join(" · ");
                            return (
                              <HubRow
                                key={l._id}
                                accent={accent}
                                avatar={name[0].toUpperCase()}
                                title={name}
                                subtitle={details}
                                right={
                                  <Space size={6}>
                                    {l.estimated_value > 0 && (
                                      <Text strong style={{ fontSize: 12, color: C.success }}>{fmtKES(l.estimated_value)}</Text>
                                    )}
                                    <Pill label={(l.stage || "new").toUpperCase()} color={accent} bg={accent + "18"} />
                                  </Space>
                                }
                                rightSub={l.createdAt ? `Added ${dayjs(l.createdAt).fromNow()}` : undefined}
                                onClick={() => navTo("/crm/leads")}
                              />
                            );
                          })}
                        </div>
                      )}
                      {hubFooter(`View all leads (${totalLeads})`, "/crm/leads")}
                    </div>
                  ),
                },
                {
                  key: "customers",
                  label: hubTabLabel(<TeamOutlined />, "Customers", "Clients", customerList.length, C.success),
                  children: (
                    <div>
                      {customerList.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No new customers in this period" style={{ padding: "20px 0" }} />
                      ) : (
                        <div style={hubGrid}>
                          {customerList.slice(0, 6).map((c: any) => {
                            const health = customerHealth(c);
                            const name = c.customer_name || "Unnamed customer";
                            return (
                              <HubRow
                                key={c._id}
                                accent={health.color}
                                avatar={name[0].toUpperCase()}
                                title={name}
                                subtitle={[c.phone ? String(c.phone) : null, c.email].filter(Boolean).join(" · ") || "No contact details"}
                                right={<Pill label={health.label} color={health.color} bg={health.color + "15"} />}
                                rightSub={c.createdAt ? `Joined ${dayjs(c.createdAt).fromNow()}` : undefined}
                                onClick={() => navTo("/customers")}
                              />
                            );
                          })}
                        </div>
                      )}
                      {hubFooter(`View all customers (${customerList.length})`, "/customers")}
                    </div>
                  ),
                },
                ...(!hasChatChannel ? [] : [{
                  key: "channels",
                  label: hubTabLabel(<WifiOutlined />, "Channels", "Channels", 0, C.teal),
                  children: (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
                        {[
                          { label: "WhatsApp Business", on: connected.whatsapp, count: channelCounts.whatsapp, color: "#25D366" },
                          { label: "Facebook Messenger", on: connected.messenger, count: channelCounts.messenger, color: "#0084FF" },
                          { label: "Instagram Direct", on: connected.instagram, count: channelCounts.instagram, color: "#E1306C" },
                        ].map((ch) => (
                          <div key={ch.label} style={{
                            border: "1px solid #eef2f7", borderTop: `3px solid ${ch.on ? ch.color : "#e2e8f0"}`,
                            borderRadius: 10, padding: "12px 14px", background: ch.on ? "#ffffff" : "#f8fafc",
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                              <Text strong style={{ fontSize: 12, color: ch.on ? C.text : C.subtext }}>{ch.label}</Text>
                              <Pill label={ch.on ? "LIVE" : "OFF"} color={ch.on ? C.success : C.gray} bg={(ch.on ? C.success : C.gray) + "15"} />
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: ch.on ? ch.color : C.subtext, marginTop: 6 }}>{ch.count}</div>
                            <Text style={{ fontSize: 11, color: C.subtext }}>conversation{ch.count === 1 ? "" : "s"} this period</Text>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                        {[
                          { label: "Resolution Rate", value: `${pct(convCounts.resolved + convCounts.closed, totalConversations)}%`, color: C.success },
                          { label: "Avg Resolution", value: `${avgResolutionTime} hrs`, color: C.blue },
                          { label: "Active Channels", value: `${connectedCount} of 3`, color: C.purple },
                          { label: "Unread Messages", value: unreadCount, color: unreadCount > 0 ? C.orange : C.gray },
                        ].map((s) => (
                          <div key={s.label} style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 10, border: "1px solid #eef2f7" }}>
                            <Text style={{ fontSize: 11, color: C.subtext, display: "block" }}>{s.label}</Text>
                            <Text strong style={{ fontSize: 16, color: s.color }}>{s.value}</Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                }]),
              ]}
            />
          </ProCard>
        </Col>
      </Row>
    </div>
  );
};

export default MtejaDashboard;
