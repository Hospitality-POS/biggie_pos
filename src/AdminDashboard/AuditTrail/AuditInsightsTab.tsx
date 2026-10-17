import React, { useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useQuery } from "@tanstack/react-query";
import { Alert, Avatar, Button, Card, Empty, Segmented, Skeleton, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
  ExclamationCircleFilled,
  FieldTimeOutlined,
  MoonOutlined,
  ShopOutlined,
  TeamOutlined,
  WarningFilled,
} from "@ant-design/icons";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import {
  fetchAuditAnalytics,
  AuditAnalytics,
  AuditLog,
  AuditUserStats,
} from "@services/audit";
import { avatarColor, entityLabel, humanize, initials } from "./auditFormat";

dayjs.extend(relativeTime);

const { Text } = Typography;

// Chart tokens: one categorical slot + the blue sequential ramp (dataviz reference palette)
const V = {
  text: "#0f172a",
  sub: "#64748b",
  faint: "#94a3b8",
  border: "#e2e8f0",
  grid: "#eef2f6",
  surface: "#ffffff",
  series: "#2a78d6",
  seriesSoft: "#cde2fb",
  critical: "#d03b3b",
  warning: "#b45309",
  warningBg: "#fffbeb",
  criticalBg: "#fef2f2",
  ai: "#4f46e5",
};
const RAMP = ["#f1f5f9", "#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];

export const formatDuration = (minutes?: number | null) => {
  if (!minutes) return "0m";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const clock = (minute?: number | null) =>
  minute === null || minute === undefined
    ? "—"
    : `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

const DAYS = [
  { dow: 2, label: "Mon" },
  { dow: 3, label: "Tue" },
  { dow: 4, label: "Wed" },
  { dow: 5, label: "Thu" },
  { dow: 6, label: "Fri" },
  { dow: 7, label: "Sat" },
  { dow: 1, label: "Sun" },
];

// ── Small building blocks ───────────────────────────────────────────────────

const StatTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "warning" | "critical";
}> = ({ icon, label, value, hint, tone = "neutral" }) => {
  const toneStyle =
    tone === "critical"
      ? { bg: V.criticalBg, fg: V.critical }
      : tone === "warning"
        ? { bg: V.warningBg, fg: V.warning }
        : { bg: "#f1f5f9", fg: V.sub };
  return (
    <div
      style={{
        background: V.surface,
        border: `1px solid ${V.border}`,
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            background: toneStyle.bg,
            color: toneStyle.fg,
            width: 26,
            height: 26,
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          {icon}
        </span>
        <Text style={{ fontSize: 12, color: V.sub }}>{label}</Text>
      </div>
      <div style={{ fontSize: 26, fontWeight: 650, color: V.text, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {hint && <Text style={{ fontSize: 12, color: V.faint }}>{hint}</Text>}
    </div>
  );
};

const InlineBar: React.FC<{ value: number; max: number; label: string }> = ({ value, max, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
    <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
      <div
        style={{
          width: `${max ? Math.max(2, (value / max) * 100) : 0}%`,
          height: "100%",
          background: V.series,
          borderRadius: 4,
        }}
      />
    </div>
    <Text style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", minWidth: 54, textAlign: "right" }}>{label}</Text>
  </div>
);

const SectionCard: React.FC<{ title: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode; bodyPadding?: number }> = ({
  title,
  extra,
  children,
  bodyPadding = 16,
}) => (
  <Card
    title={<span style={{ fontSize: 14, fontWeight: 600, color: V.text }}>{title}</span>}
    extra={extra}
    size="small"
    style={{ borderRadius: 12, height: "100%" }}
    styles={{ body: { padding: bodyPadding } }}
  >
    {children}
  </Card>
);

// ── Charts ──────────────────────────────────────────────────────────────────

const DailyChart: React.FC<{ data: AuditAnalytics["daily"]; metric: "events" | "changes" }> = ({ data, metric }) => {
  const rows = data.map((d) => ({ ...d, label: dayjs(d.day).format("D MMM") }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke={V.grid} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: V.sub }} tickLine={false} axisLine={{ stroke: V.border }} minTickGap={16} />
        <YAxis tick={{ fontSize: 11, fill: V.sub }} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
        <ChartTooltip
          cursor={{ fill: "rgba(42,120,214,0.08)" }}
          contentStyle={{ borderRadius: 8, border: `1px solid ${V.border}`, fontSize: 12 }}
          labelStyle={{ color: V.text, fontWeight: 600 }}
          formatter={(value) => [Number(value).toLocaleString(), metric === "events" ? "All activity" : "Data changes"]}
        />
        <Bar dataKey={metric} fill={V.series} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const Heatmap: React.FC<{ cells: AuditAnalytics["heatmap"] }> = ({ cells }) => {
  const lookup = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c.count]));
  const max = Math.max(1, ...cells.map((c) => c.count));
  const colorFor = (count: number) => (count ? RAMP[Math.min(RAMP.length - 1, 1 + Math.floor((count / max) * (RAMP.length - 2)))] : RAMP[0]);

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "36px repeat(24, minmax(14px, 1fr))", gap: 2, minWidth: 420 }}>
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} style={{ fontSize: 10, color: V.faint, textAlign: "center" }}>
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </span>
        ))}
        {DAYS.map(({ dow, label }) => (
          <React.Fragment key={dow}>
            <span style={{ fontSize: 11, color: V.sub, alignSelf: "center" }}>{label}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const count = lookup.get(`${dow}-${h}`) || 0;
              return (
                <Tooltip key={h} title={`${label} ${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00 · ${count.toLocaleString()} event${count === 1 ? "" : "s"}`}>
                  <div style={{ height: 20, borderRadius: 3, background: colorFor(count) }} />
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
        <Text style={{ fontSize: 11, color: V.faint }}>Less</Text>
        {RAMP.map((c) => (
          <span key={c} style={{ width: 14, height: 10, borderRadius: 2, background: c }} />
        ))}
        <Text style={{ fontSize: 11, color: V.faint }}>More</Text>
      </div>
    </div>
  );
};

// ── Tab ─────────────────────────────────────────────────────────────────────

interface Props {
  from: string;
  /** Bumped by the page Refresh button: refetch, skipping the server cache */
  refreshKey: number;
  to: string;
  shopId?: string;
  shopName: (id?: string) => string | undefined;
  onSelectUser: (userId: string) => void;
  onOpenLog: (log: AuditLog) => void;
}

const AuditInsightsTab: React.FC<Props> = ({ from, to, refreshKey, shopId, shopName, onSelectUser, onOpenLog }) => {
  const [metric, setMetric] = useState<"events" | "changes">("changes");
  const params = useMemo(() => ({ from, to, ...(shopId ? { shop_id: shopId } : {}) }), [from, to, shopId]);

  // Only the first fetch after a Refresh click skips the server cache; later
  // date or branch changes use the cache again.
  const usedRefreshKey = useRef(0);
  const query = useQuery({
    queryKey: ["audit-analytics", params, refreshKey],
    queryFn: () => {
      const fresh = refreshKey !== usedRefreshKey.current;
      usedRefreshKey.current = refreshKey;
      return fetchAuditAnalytics({ ...params, fresh });
    },
    staleTime: 30000,
    keepPreviousData: true,
    retry: false,
  });

  if (query.isLoading) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <Card key={i} style={{ borderRadius: 12 }}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          ))}
        </div>
        <Card style={{ borderRadius: 12 }}>
          <Skeleton active />
        </Card>
      </div>
    );
  }

  if (query.isError) {
    const error = query.error as any;
    const forbidden = error?.response?.status === 403;
    return (
      <Alert
        type={forbidden ? "warning" : "error"}
        showIcon
        message={forbidden ? "Only admins can view the audit trail" : "Could not load insights"}
        description={forbidden ? undefined : error?.response?.data?.message || error?.message}
        action={forbidden ? undefined : <Button size="small" onClick={() => query.refetch()}>Retry</Button>}
      />
    );
  }

  const data = query.data!;
  const { totals } = data;
  const staffWithTime = data.users.filter((u) => u.sessionMinutes > 0).length;
  const maxUserMinutes = Math.max(0, ...data.users.map((u) => u.sessionMinutes));
  const maxShopMinutes = Math.max(0, ...data.shops.map((s) => s.sessionMinutes));
  const maxEntity = Math.max(0, ...data.entities.map((e) => e.count));
  const hasActivity = totals.events > 0 || data.users.length > 0;

  const userColumns: ColumnsType<AuditUserStats> = [
    {
      title: "Employee",
      key: "name",
      fixed: "left",
      width: 200,
      render: (_, u) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Avatar size={30} style={{ background: avatarColor(u.userId || u.name || undefined), flexShrink: 0, fontSize: 12 }}>
            {initials(u.name || "?")}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text strong ellipsis style={{ display: "block", maxWidth: 150 }}>
              {u.name || "Unknown user"}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {u.role ? humanize(u.role) : "—"}
              {u.shops.length > 1 ? ` · ${u.shops.length} branches` : u.shops[0] && shopName(u.shops[0]) ? ` · ${shopName(u.shops[0])}` : ""}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: (
        <Tooltip title="Estimated from app activity: time between a user's first and last request, with breaks over 15 minutes left out.">
          <span>Time on Base</span>
        </Tooltip>
      ),
      key: "time",
      width: 210,
      sorter: (a, b) => a.sessionMinutes - b.sessionMinutes,
      defaultSortOrder: "descend",
      render: (_, u) => <InlineBar value={u.sessionMinutes} max={maxUserMinutes} label={formatDuration(u.sessionMinutes)} />,
    },
    {
      title: "Avg / day",
      key: "avg",
      width: 100,
      sorter: (a, b) => a.avgMinutesPerDay - b.avgMinutesPerDay,
      render: (_, u) => <Text style={{ fontVariantNumeric: "tabular-nums" }}>{formatDuration(u.avgMinutesPerDay)}</Text>,
    },
    {
      title: "Usual hours",
      key: "hours",
      width: 130,
      render: (_, u) =>
        u.typicalStartMinute === null ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text style={{ fontVariantNumeric: "tabular-nums" }}>
            {clock(u.typicalStartMinute)} – {clock(u.typicalEndMinute)}
          </Text>
        ),
    },
    {
      title: "Days",
      dataIndex: "daysActive",
      width: 70,
      align: "right",
      sorter: (a, b) => a.daysActive - b.daysActive,
    },
    {
      title: "Changes",
      key: "changes",
      width: 100,
      align: "right",
      sorter: (a, b) => a.changes - b.changes,
      render: (_, u) => (
        <Tooltip title={`${u.creates} created · ${u.updates} updated · ${u.deletes} deleted`}>
          <Text style={{ fontVariantNumeric: "tabular-nums" }}>{u.changes.toLocaleString()}</Text>
        </Tooltip>
      ),
    },
    {
      title: (
        <Tooltip title="Deletes, voids, refunds and discounts">
          <span>Sensitive</span>
        </Tooltip>
      ),
      key: "sensitive",
      width: 100,
      align: "right",
      sorter: (a, b) => a.sensitive - b.sensitive,
      render: (_, u) =>
        u.sensitive ? (
          <Tag icon={<ExclamationCircleFilled />} color="error" bordered={false} style={{ margin: 0 }}>
            {u.sensitive}
          </Tag>
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
    {
      title: (
        <Tooltip title={`Activity between ${data.afterHours.start}:00 and ${String(data.afterHours.end).padStart(2, "0")}:00`}>
          <span>After hours</span>
        </Tooltip>
      ),
      key: "after",
      width: 110,
      align: "right",
      sorter: (a, b) => a.afterHours - b.afterHours,
      render: (_, u) =>
        u.afterHours ? (
          <Tag icon={<MoonOutlined />} color="warning" bordered={false} style={{ margin: 0 }}>
            {u.afterHours}
          </Tag>
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
    {
      title: "Last activity",
      key: "last",
      width: 130,
      sorter: (a, b) => dayjs(a.lastTs || 0).valueOf() - dayjs(b.lastTs || 0).valueOf(),
      render: (_, u) =>
        u.lastTs ? (
          <Tooltip title={dayjs(u.lastTs).format("ddd D MMM YYYY, HH:mm")}>
            <Text type="secondary">{dayjs(u.lastTs).fromNow()}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Headline numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        <StatTile
          icon={<FieldTimeOutlined />}
          label="Time on Base"
          value={formatDuration(totals.sessionMinutes)}
          hint={staffWithTime ? `≈ ${formatDuration(Math.round(totals.sessionMinutes / staffWithTime))} per active staff` : data.presenceAvailable ? "No tracked sessions yet" : "Tracking unavailable"}
        />
        <StatTile icon={<TeamOutlined />} label="Active staff" value={totals.activeUsers} hint={`across ${data.shops.length || 0} branch${data.shops.length === 1 ? "" : "es"}`} />
        <StatTile
          icon={<EditOutlined />}
          label="Changes made"
          value={totals.changes.toLocaleString()}
          hint={`${totals.creates.toLocaleString()} created · ${totals.updates.toLocaleString()} updated`}
        />
        <StatTile
          icon={<WarningFilled />}
          label="Deletes, voids & refunds"
          value={totals.sensitive.toLocaleString()}
          tone={totals.sensitive ? "critical" : "neutral"}
          hint={totals.priceChanges ? `${totals.priceChanges} price change${totals.priceChanges === 1 ? "" : "s"}` : "No price changes"}
        />
        <StatTile
          icon={<MoonOutlined />}
          label="After-hours activity"
          value={totals.afterHours.toLocaleString()}
          tone={totals.afterHours ? "warning" : "neutral"}
          hint={`${data.afterHours.start}:00 – ${String(data.afterHours.end).padStart(2, "0")}:00`}
        />
      </div>

      {!hasActivity ? (
        <Card style={{ borderRadius: 12 }}>
          <Empty description="No activity recorded in this period yet." />
        </Card>
      ) : (
        <>
          {/* Employees */}
          <SectionCard
            title={
              <span>
                <TeamOutlined style={{ color: V.sub, marginRight: 8 }} />
                Employees
              </span>
            }
            extra={<Text type="secondary" style={{ fontSize: 12 }}>Click a row to see their activity</Text>}
            bodyPadding={0}
          >
            <Table
              rowKey="userId"
              size="middle"
              columns={userColumns}
              dataSource={data.users}
              pagination={data.users.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
              scroll={{ x: 1150 }}
              onRow={(u) => ({ onClick: () => onSelectUser(u.userId), style: { cursor: "pointer" } })}
            />
          </SectionCard>

          {/* Branches */}
          {data.shops.length > 0 && (
            <SectionCard
              title={
                <span>
                  <ShopOutlined style={{ color: V.sub, marginRight: 8 }} />
                  Branches
                </span>
              }
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
                {data.shops.map((shop) => (
                  <div key={shop.shopId} style={{ border: `1px solid ${V.border}`, borderRadius: 10, padding: 14 }}>
                    <Text strong ellipsis style={{ display: "block", color: V.text, marginBottom: 8 }}>
                      {shop.name || shopName(shop.shopId) || "Unnamed branch"}
                    </Text>
                    <Text style={{ fontSize: 12, color: V.sub }}>Staff time on Base</Text>
                    <InlineBar value={shop.sessionMinutes} max={maxShopMinutes} label={formatDuration(shop.sessionMinutes)} />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
                      {[
                        { label: "Staff", value: shop.activeUsers ?? 0 },
                        { label: "Changes", value: shop.changes ?? 0 },
                        { label: "Sensitive", value: shop.sensitive ?? 0, alert: (shop.sensitive ?? 0) > 0 },
                      ].map((stat) => (
                        <div key={stat.label}>
                          <div
                            style={{
                              fontSize: 17,
                              fontWeight: 600,
                              color: V.text,
                              fontVariantNumeric: "tabular-nums",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {stat.alert && <ExclamationCircleFilled style={{ color: V.critical, fontSize: 13 }} />}
                            {stat.value.toLocaleString()}
                          </div>
                          <Text style={{ fontSize: 11, color: V.faint }}>{stat.label}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Trend + heatmap */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 12 }}>
            <SectionCard
              title="Activity per day"
              extra={
                <Segmented
                  size="small"
                  value={metric}
                  onChange={(v) => setMetric(v as "events" | "changes")}
                  options={[
                    { label: "Changes", value: "changes" },
                    { label: "All", value: "events" },
                  ]}
                />
              }
            >
              <DailyChart data={data.daily} metric={metric} />
            </SectionCard>
            <SectionCard title="Busiest times">
              <Heatmap cells={data.heatmap} />
            </SectionCard>
          </div>

          {/* Records + sensitive */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 12 }}>
            <SectionCard title="Most changed records">
              {data.entities.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {data.entities.map((e) => (
                    <div key={e.entity} style={{ display: "grid", gridTemplateColumns: "130px 1fr", alignItems: "center", gap: 10 }}>
                      <Text ellipsis style={{ fontSize: 13 }}>{entityLabel(e.entity)}</Text>
                      <Tooltip title={`${e.creates} created · ${e.updates} updated · ${e.deletes} deleted`}>
                        <div>
                          <InlineBar value={e.count} max={maxEntity} label={e.count.toLocaleString()} />
                        </div>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data changes" />
              )}
            </SectionCard>

            <SectionCard
              title={
                <span>
                  <WarningFilled style={{ color: V.critical, marginRight: 8 }} />
                  Recent deletes, voids & refunds
                </span>
              }
              bodyPadding={0}
            >
              {data.recentSensitive.length ? (
                data.recentSensitive.map((log, i) => (
                  <div
                    key={log._id}
                    role="button"
                    tabIndex={0}
                    className="audit-row"
                    onClick={() => onOpenLog(log)}
                    onKeyDown={(e) => e.key === "Enter" && onOpenLog(log)}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      padding: "10px 16px",
                      borderTop: i ? `1px solid ${V.border}` : undefined,
                      cursor: "pointer",
                    }}
                  >
                    <Avatar size={26} style={{ background: avatarColor(log.actor?.id || log.actor?.name), fontSize: 11, flexShrink: 0 }}>
                      {initials(log.actor?.name || "?")}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                      <Text strong>{log.actor?.name || "System"}</Text>{" "}
                      <span style={{ color: V.critical, fontWeight: 600 }}>{log.action.replace("_many", "")}d</span>{" "}
                      {entityLabel(log.entity).toLowerCase()} <Text strong>{log.entity_label || ""}</Text>
                      <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                        {dayjs(log.ts).format("ddd D MMM, HH:mm")}
                        {log.shop_id && shopName(log.shop_id) ? ` · ${shopName(log.shop_id)}` : ""}
                      </Text>
                    </div>
                  </div>
                ))
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing sensitive in this period" style={{ padding: 24 }} />
              )}
            </SectionCard>
          </div>

          <Text type="secondary" style={{ fontSize: 11, textAlign: "right" }}>
            Stats updated {dayjs(data.generatedAt).fromNow()}
            {data.presenceAvailable ? "" : " · time-on-Base tracking is unavailable (Redis not reachable)"}
          </Text>
        </>
      )}
    </div>
  );
};

export default AuditInsightsTab;
