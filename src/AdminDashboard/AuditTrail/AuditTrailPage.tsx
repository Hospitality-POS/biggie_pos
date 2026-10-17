import React, { useMemo, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DatePicker, Select, Tabs, Tooltip, Typography } from "antd";
import {
  AuditOutlined,
  ReloadOutlined,
  ShopOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { AuditLog } from "@services/audit";
import { fetchAllShops } from "@services/shops";
import AuditDetailDrawer from "./AuditDetailDrawer";
import AuditActivityTab, { Kind, RecordFilter } from "./AuditActivityTab";
import AuditInsightsTab from "./AuditInsightsTab";
import AuditAiDrawer from "./AuditAiDrawer";
import { AuditSetupButton } from "./AuditSetupGuide";
import { shortId } from "./auditFormat";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const C = { text: "#0f172a", sub: "#64748b", border: "#e2e8f0", faint: "#94a3b8", accent: "#4f46e5" };

type Range = [Dayjs, Dayjs];
type TabKey = "insights" | "activity";

const defaultRange = (): Range => [dayjs().subtract(6, "day").startOf("day"), dayjs().endOf("day")];

const RANGE_PRESETS: { label: string; value: Range }[] = [
  { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
  { label: "Yesterday", value: [dayjs().subtract(1, "day").startOf("day"), dayjs().subtract(1, "day").endOf("day")] },
  { label: "Last 7 days", value: defaultRange() },
  { label: "Last 30 days", value: [dayjs().subtract(29, "day").startOf("day"), dayjs().endOf("day")] },
  { label: "Last 3 months", value: [dayjs().subtract(3, "month").startOf("day"), dayjs().endOf("day")] },
];

const AuditTrailPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("insights");
  const [range, setRange] = useState<Range>(defaultRange);
  const [shopId, setShopId] = useState<string>();
  const [retentionDays, setRetentionDays] = useState(90);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [auditEnabled, setAuditEnabled] = useState<boolean>();

  // Activity-log filters live here so the Insights tab can drill into them
  const [kind, setKind] = useState<Kind>("data");
  const [userId, setUserId] = useState<string>();
  const [entity, setEntity] = useState<string>();
  const [record, setRecord] = useState<RecordFilter>(null);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const { data: shops = [] } = useQuery<any[]>({
    queryKey: ["admin-header-shops"],
    queryFn: () => fetchAllShops({}),
    staleTime: 60000,
  });

  const shopNames = useMemo(() => {
    const map = new Map<string, string>();
    (Array.isArray(shops) ? shops : []).forEach((s: any) => map.set(String(s._id), s.name));
    return map;
  }, [shops]);
  const shopName = (id?: string) => (id ? shopNames.get(id) : undefined);

  const from = range[0].startOf("day").toISOString();
  const to = range[1].endOf("day").toISOString();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    setRefreshKey((k) => k + 1);
  };

  const showUserActivity = (id?: string) => {
    setUserId(id);
    setRecord(null);
    setKind("data");
    setTab("activity");
    setSelected(null);
  };

  return (
    <div style={{ padding: "16px clamp(12px, 3vw, 24px)", maxWidth: 1240, margin: "0 auto" }}>
      <style>{`
        .audit-row:hover { background: #f8fafc; }
        .audit-row:focus-visible { outline: 2px solid ${C.accent}; outline-offset: -2px; }
        .audit-tabs > .ant-tabs-nav { margin-bottom: 12px; }
      `}</style>

      {/* Header + shared filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div
          style={{
            background: "#eef2ff",
            color: C.accent,
            borderRadius: 10,
            width: 40,
            height: 40,
            fontSize: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AuditOutlined />
        </div>
        <div style={{ flex: "1 1 220px", minWidth: 200 }}>
          <Title level={4} style={{ margin: 0, color: C.text, fontWeight: 600, lineHeight: 1.3 }}>
            Audit Trail
          </Title>
          <Text style={{ fontSize: 12, color: C.sub }}>
            Who did what, where and when · kept for the last {Math.round(retentionDays / 30)} months
          </Text>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <RangePicker
            value={range}
            onChange={(value) => value?.[0] && value?.[1] && setRange([value[0], value[1]])}
            presets={RANGE_PRESETS}
            allowClear={false}
            disabledDate={(d) =>
              d.isAfter(dayjs().endOf("day")) || d.isBefore(dayjs().subtract(retentionDays, "day").startOf("day"))
            }
            format="D MMM YYYY"
            style={{ minWidth: 240 }}
          />
          <Select
            allowClear
            placeholder="All branches"
            value={shopId}
            onChange={setShopId}
            style={{ minWidth: 170 }}
            suffixIcon={<ShopOutlined />}
            options={[...shopNames.entries()].map(([value, label]) => ({ value, label }))}
          />
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={() => setAiOpen(true)}
            style={{ background: C.accent }}
          >
            AI insights
          </Button>
          <AuditSetupButton enabled={auditEnabled} />
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} onClick={refresh} aria-label="Refresh" />
          </Tooltip>
        </div>
      </div>

      <Tabs
        className="audit-tabs"
        activeKey={tab}
        onChange={(key) => setTab(key as TabKey)}
        items={[
          {
            key: "insights",
            label: (
              <span>
                <ThunderboltOutlined /> Insights
              </span>
            ),
            children: (
              <AuditInsightsTab
                from={from}
                to={to}
                refreshKey={refreshKey}
                shopId={shopId}
                shopName={shopName}
                onSelectUser={showUserActivity}
                onOpenLog={setSelected}
                onAuditStatus={setAuditEnabled}
              />
            ),
          },
          {
            key: "activity",
            label: (
              <span>
                <UnorderedListOutlined /> Activity log
              </span>
            ),
            children: (
              <AuditActivityTab
                from={from}
                to={to}
                shopId={shopId}
                kind={kind}
                setKind={setKind}
                userId={userId}
                setUserId={setUserId}
                entity={entity}
                setEntity={setEntity}
                record={record}
                setRecord={setRecord}
                shopName={shopName}
                onOpenLog={setSelected}
                onRetention={setRetentionDays}
                onAuditStatus={setAuditEnabled}
              />
            ),
          },
        ]}
      />

      <AuditAiDrawer
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        params={{ from, to, ...(shopId ? { shop_id: shopId } : {}) }}
        periodLabel={`${range[0].format("D MMM")} – ${range[1].format("D MMM YYYY")}`}
        branchLabel={shopId ? shopName(shopId) || "Selected branch" : "All branches"}
      />

      <AuditDetailDrawer
        log={selected}
        shopName={shopName}
        onClose={() => setSelected(null)}
        onShowRecordHistory={(log) => {
          if (!log.entity || !log.entity_id) return;
          setRecord({ entity: log.entity, id: log.entity_id, label: log.entity_label || shortId(log.entity_id) });
          setUserId(undefined);
          setKind("data");
          setRange([dayjs().subtract(retentionDays, "day").startOf("day"), dayjs().endOf("day")]);
          setTab("activity");
          setSelected(null);
        }}
        onShowUserActivity={(log) => showUserActivity(log.actor?.id)}
      />
    </div>
  );
};

export default AuditTrailPage;
