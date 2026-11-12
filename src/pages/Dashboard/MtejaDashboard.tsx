import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, Space, Badge } from "antd";
import {
  FundOutlined,
  TrophyOutlined,
  MessageOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";
import { fetchConversations, fetchWhatsappChannels } from "@services/whatsappService";
import { fetchCampaignAnalytics } from "@services/omnichannel/messagingCampaigns";
import { fetchAllSalesTargets, SalesTarget } from "@services/crm/salesTargets";
import { isDalaEnabled } from "@services/crm/leads";

import {
  C,
  LEAD_STAGES,
  getStoredShopId,
  playChime,
  useIsMobile,
  MtejaHeader,
  MtejaExecutiveKPIs,
  PipelineTab,
  TeamLeaderboardTab,
  OmnichannelTab,
  CustomersHubTab,
} from "./mteja";

dayjs.extend(relativeTime);

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
  } catch {
    return {};
  }
};

const fetchLeadPipeline = async (params: { shop_id?: string; start_date?: string; end_date?: string }) => {
  try {
    const res = await axiosInstance.get(`${BASE_URL}/api/crm/leads/pipeline-summary`, { params });
    return res.data;
  } catch {
    return { stages: [], total_leads: 0, total_value: 0, won_value: 0, conversion_rate: 0 };
  }
};

const fetchRecentLeads = async (params: { shop_id?: string; limit?: number; start_date?: string; end_date?: string }) => {
  try {
    const res = await axiosInstance.get(`${BASE_URL}/api/crm/leads`, {
      params: { ...params, limit: params.limit || 8, sort: "-createdAt" },
    });
    return Array.isArray(res.data) ? res.data : res.data?.leads || [];
  } catch {
    return [];
  }
};

const MtejaDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Layout & Shop detection
  const storedShopId = getStoredShopId();
  const isAdminLayout = location.pathname.startsWith("/admin") || !storedShopId;
  const [selectedShopId, setSelectedShopId] = useState<string>("");

  // Period filter state
  const [periodFilter, setPeriodFilter] = useState<string>("month");
  const [customDateRange, setCustomDateRange] = useState<any[]>([]);
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<string>("pipeline");
  const [statusMixMode, setStatusMixMode] = useState<"status" | "channel">("status");

  // Dala real estate enablement
  const hasDala = useMemo(() => isDalaEnabled(), []);

  // Fetch shops
  const { data: shopsData } = useQuery({
    queryKey: ["mteja-shops"],
    queryFn: fetchShops,
    enabled: isAdminLayout,
    staleTime: 60_000,
  });
  const shops: any[] = Array.isArray(shopsData) ? shopsData : shopsData?.shops || [];

  const shopId = isAdminLayout ? selectedShopId : storedShopId;

  // Date Range calculation
  const { start_date, end_date, dateRangeLabel } = useMemo(() => {
    const now = dayjs();
    let s = now.startOf("month");
    let e = now.endOf("month");
    let label = now.format("MMMM YYYY");

    if (periodFilter === "day") {
      s = now.startOf("day");
      e = now.endOf("day");
      label = now.format("D MMM YYYY");
    } else if (periodFilter === "week") {
      s = now.startOf("week");
      e = now.endOf("week");
      label = `${s.format("D MMM")} – ${e.format("D MMM YYYY")}`;
    } else if (periodFilter === "month") {
      s = now.startOf("month");
      e = now.endOf("month");
      label = now.format("MMMM YYYY");
    } else if (periodFilter === "year") {
      s = now.startOf("year");
      e = now.endOf("year");
      label = now.format("YYYY");
    } else if (periodFilter === "custom" && customDateRange?.length === 2) {
      s = dayjs(customDateRange[0]).startOf("day");
      e = dayjs(customDateRange[1]).endOf("day");
      label = `${s.format("D MMM YYYY")} – ${e.format("D MMM YYYY")}`;
    }

    return {
      start_date: s.toISOString(),
      end_date: e.toISOString(),
      dateRangeLabel: label,
    };
  }, [periodFilter, customDateRange]);

  // Main Queries
  const { data: conversationsData, isLoading: convLoading, isRefetching: convRefetching } = useQuery({
    queryKey: ["mteja-conversations", shopId, start_date, end_date],
    queryFn: () => fetchConversations({ shop_id: shopId || undefined, start_date, end_date, limit: 30 }),
    refetchInterval: 30_000,
  });

  const { data: channelsData } = useQuery({
    queryKey: ["mteja-channels", shopId],
    queryFn: () => fetchWhatsappChannels(shopId || undefined),
    staleTime: 60_000,
  });

  const { data: recentCustomersData, isLoading: custLoading } = useQuery({
    queryKey: ["mteja-recent-customers", shopId, start_date, end_date],
    queryFn: () => fetchRecentCustomers({ shop_id: shopId || undefined, limit: 12, start_date, end_date }),
    staleTime: 30_000,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["mteja-stats", shopId, start_date, end_date],
    queryFn: () => fetchMtejaStats({ shop_id: shopId || undefined, start_date, end_date }),
    staleTime: 30_000,
  });

  const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
    queryKey: ["mteja-lead-pipeline", shopId, start_date, end_date],
    queryFn: () => fetchLeadPipeline({ shop_id: shopId || undefined, start_date, end_date }),
    staleTime: 30_000,
  });

  const { data: recentLeadsData } = useQuery({
    queryKey: ["mteja-recent-leads", shopId, start_date, end_date],
    queryFn: () => fetchRecentLeads({ shop_id: shopId || undefined, start_date, end_date, limit: 12 }),
    staleTime: 30_000,
  });

  const { data: allTargetsData, isLoading: targetsLoading } = useQuery({
    queryKey: ["mteja-sales-targets", shopId, start_date, end_date],
    queryFn: () => fetchAllSalesTargets({ shop_id: shopId || undefined, limit: 50, start_date, end_date, recalculate: false }),
    staleTime: 30_000,
  });

  const campaignShopId = shopId || (shops.length > 0 ? shops[0]._id : "");

  const { data: smsAnalytics, isLoading: smsLoading } = useQuery({
    queryKey: ["mteja-msg-analytics", campaignShopId, "sms", start_date, end_date],
    queryFn: () => fetchCampaignAnalytics({ shop_id: campaignShopId, channel: "sms", start_date, end_date }),
    enabled: !!campaignShopId,
    staleTime: 30_000,
  });

  const { data: emailAnalytics, isLoading: emailLoading } = useQuery({
    queryKey: ["mteja-msg-analytics", campaignShopId, "email", start_date, end_date],
    queryFn: () => fetchCampaignAnalytics({ shop_id: campaignShopId, channel: "email", start_date, end_date }),
    enabled: !!campaignShopId,
    staleTime: 30_000,
  });

  const conversations: any[] = useMemo(() => {
    return Array.isArray(conversationsData) ? conversationsData : conversationsData?.conversations || [];
  }, [conversationsData]);

  const recentLeads: any[] = Array.isArray(recentLeadsData) ? recentLeadsData : [];
  const customerList: any[] = Array.isArray(recentCustomersData) ? recentCustomersData : [];
  const targetsList: SalesTarget[] = Array.isArray(allTargetsData) ? allTargetsData : (allTargetsData as any)?.targets || [];

  // Audio alerts on new unread messages
  const prevUnreadRef = useRef<number | null>(null);
  const unreadCount = useMemo(() => conversations.filter((c: any) => (c.unread_count || 0) > 0).length, [conversations]);
  useEffect(() => {
    if (prevUnreadRef.current !== null && unreadCount > prevUnreadRef.current) {
      playChime();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // Channel and Conversation calculations
  const connected = useMemo(() => {
    const list = Array.isArray(channelsData) ? channelsData : channelsData?.channels || [];
    const wa = list.some((c: any) => c.status === "connected" || c.status === "active");
    const fb = list.some((c: any) => c.channel === "messenger" && c.status === "connected");
    const ig = list.some((c: any) => c.channel === "instagram" && c.status === "connected");
    return { whatsapp: wa, messenger: fb, instagram: ig };
  }, [channelsData]);

  const hasChatChannel = connected.whatsapp || connected.messenger || connected.instagram;
  const connectedCount = [connected.whatsapp, connected.messenger, connected.instagram].filter(Boolean).length;

  const channelCounts = useMemo(() => {
    const counts = { whatsapp: 0, messenger: 0, instagram: 0 };
    conversations.forEach((c: any) => {
      const ch = (c.channel || "").toLowerCase();
      if (ch === "whatsapp") counts.whatsapp++;
      else if (ch === "messenger" || ch === "facebook") counts.messenger++;
      else if (ch === "instagram") counts.instagram++;
    });
    return counts;
  }, [conversations]);

  const totalConversations = conversations.length;
  const convCounts = useMemo(() => {
    const r = { open: 0, pending: 0, resolved: 0, closed: 0 };
    conversations.forEach((c: any) => {
      const s = (c.status || "open").toLowerCase();
      if (s === "open") r.open++;
      else if (s === "pending") r.pending++;
      else if (s === "resolved") r.resolved++;
      else if (s === "closed") r.closed++;
    });
    return r;
  }, [conversations]);

  const avgResolutionTime = statsData?.average_resolution_time ?? "1.4";

  // Pipeline calculations
  const pipelineStages: any[] = pipelineData?.stages || [];
  const totalLeads = pipelineData?.total_leads || 0;
  const totalLeadValue = pipelineData?.total_value || 0;
  const wonLeadValue = pipelineData?.won_value || 0;
  const conversionRate = pipelineData?.conversion_rate || 0;
  const overdueFollowUps = pipelineData?.overdue_follow_ups || 0;
  const dueFollowUps = pipelineData?.due_follow_ups || 0;
  const repeatContacts = pipelineData?.repeat_contacts_count || 0;
  const leadOwners: any[] = pipelineData?.lead_owners || [];
  const leadSources: any[] = pipelineData?.lead_sources || [];
  const leadProjects: any[] = pipelineData?.lead_projects || [];

  const stageColorMap = useMemo(() => {
    return Object.fromEntries(LEAD_STAGES.map((s) => [s.key, s.color]));
  }, []);

  const wonLeadsCount = useMemo(() => {
    const won = pipelineStages.find((x: any) => (x._id || x.stage) === "won");
    return won ? won.count : 0;
  }, [pipelineStages]);

  const newLeadsCount = useMemo(() => {
    const nw = pipelineStages.find((x: any) => (x._id || x.stage) === "new");
    return nw ? nw.count : 0;
  }, [pipelineStages]);

  const activeLeadsCount = useMemo(() => {
    return totalLeads - (wonLeadsCount + (pipelineStages.find((x: any) => (x._id || x.stage) === "lost")?.count || 0));
  }, [totalLeads, wonLeadsCount, pipelineStages]);

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

  // Targets & Leaderboard
  const periodTargets = useMemo(() => {
    const filterStart = dayjs(start_date).startOf("day");
    const filterEnd = dayjs(end_date).endOf("day");
    return targetsList.filter((t) => {
      const tStart = dayjs(t.period_start).startOf("day");
      const tEnd = dayjs(t.period_end).endOf("day");
      return (
        (tStart.isAfter(filterStart.subtract(1, "ms")) && tStart.isBefore(filterEnd.add(1, "ms"))) ||
        (tEnd.isAfter(filterStart.subtract(1, "ms")) && tEnd.isBefore(filterEnd.add(1, "ms"))) ||
        (tStart.isBefore(filterStart) && tEnd.isAfter(filterEnd))
      );
    });
  }, [targetsList, start_date, end_date]);

  const targetsAchieved = useMemo(() => periodTargets.filter((t) => t.is_achieved).length, [periodTargets]);

  const leaderboard = useMemo(() => {
    const byUser = new Map<string, any>();
    const entry = (id: string, name: string) => {
      if (!byUser.has(id)) {
        byUser.set(id, { id, name, leads: 0, won: 0, won_value: 0, win_rate: 0, targets: 0, pctSum: 0, target_pct: 0 });
      }
      return byUser.get(id)!;
    };

    leadOwners.filter((o) => o.user_id).forEach((o) => {
      Object.assign(entry(String(o.user_id), o.name), {
        leads: o.leads,
        won: o.won,
        won_value: o.won_value,
        win_rate: o.win_rate,
      });
    });

    periodTargets.forEach((t) => {
      if (t.is_company_wide || typeof t.user_id !== "object" || !t.user_id?._id) return;
      const e = entry(String(t.user_id._id), t.user_id.fullname || t.user_id.username);
      e.targets += 1;
      e.pctSum += t.achievement_percentage || 0;
      e.target_pct = e.pctSum / e.targets;
    });

    return [...byUser.values()].slice(0, 10);
  }, [leadOwners, periodTargets]);

  // Engagement status mix data
  const statusPieData = useMemo(() => {
    if (statusMixMode === "channel") {
      return [
        { name: "WhatsApp", value: channelCounts.whatsapp, color: "#25D366" },
        { name: "Messenger", value: channelCounts.messenger, color: "#0084FF" },
        { name: "Instagram", value: channelCounts.instagram, color: "#E1306C" },
      ].filter((x) => x.value > 0);
    }
    return [
      { name: "Open", value: convCounts.open, color: C.blue },
      { name: "Pending", value: convCounts.pending, color: C.warning },
      { name: "Resolved", value: convCounts.resolved, color: C.success },
      { name: "Closed", value: convCounts.closed, color: C.gray },
    ].filter((x) => x.value > 0);
  }, [statusMixMode, channelCounts, convCounts]);

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

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* ── Control Header ── */}
      <MtejaHeader
        periodFilter={periodFilter}
        onPeriodChange={setPeriodFilter}
        customDateRange={customDateRange}
        onCustomDateRangeChange={(d) => setCustomDateRange(d || [])}
        showCustomPicker={showCustomPicker}
        onToggleCustomPicker={() => setShowCustomPicker(!showCustomPicker)}
        dateRangeLabel={dateRangeLabel}
        selectedShopId={selectedShopId}
        onShopChange={setSelectedShopId}
        shops={shops}
        isAdminLayout={isAdminLayout}
        isMobile={isMobile}
        onRefresh={handleRefresh}
        isRefetching={convRefetching}
      />

      {/* ── Tier 1: 4 Executive KPI Cards ── */}
      <MtejaExecutiveKPIs
        totalLeads={totalLeads}
        newLeadsCount={newLeadsCount}
        activeLeadsCount={activeLeadsCount}
        totalLeadValue={totalLeadValue}
        wonLeadValue={wonLeadValue}
        conversionRate={conversionRate}
        wonLeadsCount={wonLeadsCount}
        avgResolutionTime={avgResolutionTime}
        connectedCount={connectedCount}
        totalConversations={totalConversations}
        resolvedCount={convCounts.resolved + convCounts.closed}
        hasChatChannel={hasChatChannel}
        isDataLoading={isDataLoading}
        isMobile={isMobile}
        onSelectTab={setActiveTab}
      />

      {/* ── Tier 2: Thematic Workspaces (Tabs) ── */}
      <div style={{ marginTop: 16 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size={isMobile ? "small" : "middle"}
          items={[
            {
              key: "pipeline",
              label: (
                <Space size={6}>
                  <FundOutlined />
                  <span>Pipeline &amp; Leads</span>
                  {overdueFollowUps > 0 && (
                    <Badge count={overdueFollowUps} style={{ backgroundColor: "#ef4444" }} />
                  )}
                </Space>
              ),
              children: (
                <PipelineTab
                  pipelineLoading={pipelineLoading}
                  totalLeads={totalLeads}
                  pipelineChartData={pipelineChartData}
                  overdueFollowUps={overdueFollowUps}
                  dueFollowUps={dueFollowUps}
                  repeatContacts={repeatContacts}
                  periodTargets={periodTargets}
                  targetsAchieved={targetsAchieved}
                  leadSources={leadSources}
                  leadProjects={leadProjects}
                  hasDala={hasDala}
                  recentLeads={recentLeads}
                  stageColorMap={stageColorMap}
                  isMobile={isMobile}
                  isAdminLayout={isAdminLayout}
                  navTo={navigate}
                />
              ),
            },
            {
              key: "team",
              label: (
                <Space size={6}>
                  <TrophyOutlined />
                  <span>Team &amp; Quotas</span>
                </Space>
              ),
              children: (
                <TeamLeaderboardTab
                  targetsLoading={targetsLoading}
                  pipelineLoading={pipelineLoading}
                  periodTargets={periodTargets}
                  targetsAchieved={targetsAchieved}
                  leaderboard={leaderboard}
                  leadOwners={leadOwners}
                  isMobile={isMobile}
                  isAdminLayout={isAdminLayout}
                  navTo={navigate}
                />
              ),
            },
            {
              key: "omnichannel",
              label: (
                <Space size={6}>
                  <MessageOutlined />
                  <span>Omnichannel &amp; Messaging</span>
                </Space>
              ),
              children: (
                <OmnichannelTab
                  connected={connected}
                  channelCounts={channelCounts}
                  connectedCount={connectedCount}
                  unreadCount={unreadCount}
                  totalConversations={totalConversations}
                  convCounts={convCounts}
                  avgResolutionTime={avgResolutionTime}
                  smsTotals={smsAnalytics?.totals}
                  emailTotals={emailAnalytics?.totals}
                  smsAnalytics={smsAnalytics}
                  emailAnalytics={emailAnalytics}
                  messagingLoading={smsLoading || emailLoading}
                  statusPieData={statusPieData}
                  statusMixMode={statusMixMode}
                  onStatusMixModeChange={setStatusMixMode}
                  convLoading={convLoading}
                  isMobile={isMobile}
                  isAdminLayout={isAdminLayout}
                  navTo={navigate}
                />
              ),
            },
            {
              key: "customers",
              label: (
                <Space size={6}>
                  <TeamOutlined />
                  <span>Customer &amp; Contact Records</span>
                  {customerList.length > 0 && (
                    <Badge count={customerList.length} style={{ backgroundColor: "#10b981" }} />
                  )}
                </Space>
              ),
              children: (
                <CustomersHubTab
                  customerList={customerList}
                  conversations={conversations}
                  totalConversations={totalConversations}
                  convCounts={convCounts}
                  hasChatChannel={hasChatChannel}
                  dateRangeLabel={dateRangeLabel}
                  isMobile={isMobile}
                  isAdminLayout={isAdminLayout}
                  navTo={navigate}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default MtejaDashboard;
