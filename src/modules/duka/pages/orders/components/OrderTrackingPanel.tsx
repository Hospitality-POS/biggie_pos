import React, { useEffect, useMemo, useState } from "react";
import {
  Button, DatePicker, Empty, Segmented, Space, Spin, Table, Tag, Tooltip, Typography, message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, ReloadOutlined, RollbackOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import {
  fmtDuration, getKitchenTickets, getOrderTrackingStats, markTicketReady,
  type KitchenTicket, type StageKey, type TrackedOrder, type StationStats,
} from "@services/orderTracking";
import { THEME_C } from "@utils/getPrimaryColor";
import { useIsCompact } from "@hooks/useIsCompact";

const { Text } = Typography;
const C = THEME_C;

// Order Tracking page (in the nav next to Orders while System Setup → Privacy → speed of
// service tracking is on).
//   Live board — tickets each Send put in front of a station; kitchen/bar
//                staff tap Ready when done.
//   Stats      — per order: placed → sent → ready → closed, and averages,
//                so it's clear which stage orders wait in.

const STAGES: { key: StageKey; label: string; hint: string; color: string }[] = [
  { key: "to_send", label: "Waiter → Send", hint: "Placed until first sent to kitchen/bar", color: "#6366f1" },
  { key: "prep", label: "Kitchen / bar", hint: "Sent until every station tapped Ready", color: "#f59e0b" },
  { key: "to_close", label: "Serve → Close", hint: "Ready until the order was closed", color: "#10b981" },
];
const stageOf = (k: StageKey | null) => STAGES.find((s) => s.key === k);

const STATION_KEY = "orderTrackingStation";

// Waiting time colour on the live board
const ageColor = (mins: number) => (mins < 10 ? C.green : mins < 20 ? C.orange : "#ef4444");

const OrderTrackingPanel: React.FC = () => {
  const [view, setView] = useState<"board" | "stats">("board");
  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      <Segmented
        value={view}
        onChange={(v) => setView(v as "board" | "stats")}
        options={[
          { label: "Live board", value: "board" },
          { label: "Stage times", value: "stats" },
        ]}
      />
      {view === "board" ? <LiveBoard /> : <StageStats />}
    </Space>
  );
};

// ── Live board ───────────────────────────────────────────────────────────────

const LiveBoard: React.FC = () => {
  const queryClient = useQueryClient();
  const isCompact = useIsCompact();
  const shopId = localStorage.getItem("shopId") || "";
  // One station at a time (Bar or Kitchen — each table location is served by
  // one of them). Remembered per device so a bar tablet stays on the bar.
  const [station, setStationState] = useState<string>(
    () => localStorage.getItem(STATION_KEY) || ""
  );
  const setStation = (s: string) => {
    localStorage.setItem(STATION_KEY, s);
    setStationState(s);
  };
  const [status, setStatus] = useState<"Pending" | "Ready">("Pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  // Re-render every 15s so waiting times stay current between fetches
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  // The station list comes back with the tickets, so the first load also
  // tells us which stations exist; a remembered station no longer in the
  // list falls back to the first one.
  const [stations, setStations] = useState<string[]>([]);
  const activeStation = stations.includes(station) ? station : stations[0] || "";

  const query = useQuery({
    queryKey: ["kitchenTickets", shopId, status, activeStation],
    queryFn: () => getKitchenTickets(shopId, status, activeStation),
    enabled: !!shopId,
    refetchInterval: 15_000,
    keepPreviousData: true,
    onSuccess: (d) => setStations(d.stations || []),
  });

  // Never mix stations, even while a station switch is loading
  const tickets = (query.data?.tickets || []).filter(
    (t) => !activeStation || t.station === activeStation
  );

  const toggleReady = async (t: KitchenTicket, ready: boolean) => {
    setBusyId(t._id);
    try {
      await markTicketReady(t._id, ready);
      message.success(ready ? `${t.table_name || t.order_no} marked ready` : "Moved back to the queue");
      queryClient.invalidateQueries({ queryKey: ["kitchenTickets"] });
      queryClient.invalidateQueries({ queryKey: ["orderTrackingStats"] });
    } catch {
      message.error("Couldn't update the ticket. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <Space wrap size={8}>
          {stations.length > 0 && (
            <Segmented
              value={activeStation}
              onChange={(v) => setStation(String(v))}
              options={stations.map((s) => ({ label: s, value: s }))}
            />
          )}
          <Segmented
            value={status}
            onChange={(v) => setStatus(v as "Pending" | "Ready")}
            options={[
              { label: "Waiting", value: "Pending" },
              { label: "Ready (last 12h)", value: "Ready" },
            ]}
          />
        </Space>
        <Button icon={<ReloadOutlined />} onClick={() => query.refetch()} loading={query.isFetching}>
          Refresh
        </Button>
      </div>

      {query.isLoading ? (
        <div style={{ padding: 40, textAlign: "center" }}><Spin /></div>
      ) : tickets.length === 0 ? (
        <Empty
          description={
            status === "Pending"
              ? `Nothing waiting${activeStation ? ` at ${activeStation}` : ""}. New orders appear here when a waiter taps Send.`
              : `Nothing marked ready${activeStation ? ` at ${activeStation}` : ""} in the last 12 hours.`
          }
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 10,
          }}
        >
          {tickets.map((t) => {
            const mins = dayjs().diff(dayjs(t.sent_at), "minute");
            const waited = t.ready_at
              ? fmtDuration(dayjs(t.ready_at).diff(dayjs(t.sent_at), "second"))
              : null;
            return (
              <div
                key={t._id}
                style={{
                  border: `1px solid ${C.border}`,
                  borderTop: `3px solid ${t.status === "Ready" ? C.green : ageColor(mins)}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ fontSize: 15, display: "block" }}>
                      {t.table_name || "No table"}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {t.order_no} · {t.station}
                    </Text>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {t.status === "Ready" ? (
                      <Tooltip title={`Ready at ${dayjs(t.ready_at).format("HH:mm")}`}>
                        <Tag color="green" style={{ marginInlineEnd: 0 }}>Took {waited}</Tag>
                      </Tooltip>
                    ) : (
                      <Tooltip title={`Sent at ${dayjs(t.sent_at).format("HH:mm")}`}>
                        <Text strong style={{ color: ageColor(mins), fontSize: 15 }}>
                          {mins < 1 ? "now" : `${mins} min`}
                        </Text>
                      </Tooltip>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 8 }}>
                  {t.items.map((i, idx) => (
                    <div key={idx} style={{ fontSize: 13, lineHeight: 1.6 }}>
                      <Text strong>{i.quantity}×</Text> {i.name}
                      {i.notes && (
                        <Text type="secondary" style={{ fontSize: 11, display: "block", paddingLeft: 18 }}>
                          {i.notes}
                        </Text>
                      )}
                    </div>
                  ))}
                </div>

                {t.status === "Pending" ? (
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<CheckOutlined />}
                    loading={busyId === t._id}
                    onClick={() => toggleReady(t, true)}
                    style={{ background: C.green, borderColor: C.green }}
                  >
                    Ready
                  </Button>
                ) : (
                  <Button
                    block
                    icon={<RollbackOutlined />}
                    loading={busyId === t._id}
                    onClick={() => toggleReady(t, false)}
                  >
                    Not ready — undo
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Space>
  );
};

// ── Stage stats ──────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string; hint?: string; highlight?: boolean; color?: string }> = ({
  label, value, hint, highlight, color,
}) => (
  <div
    style={{
      border: `1px solid ${highlight ? `${color}66` : C.border}`,
      background: highlight ? `${color}10` : "#fff",
      borderRadius: 10,
      padding: "12px 14px",
    }}
  >
    <Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>
    <div style={{ fontSize: 20, fontWeight: 700, color: highlight ? color : C.darkText }}>{value}</div>
    {hint && <Text style={{ fontSize: 11, color: highlight ? color : C.subText }}>{hint}</Text>}
  </div>
);

// One bar per order, split by how long each stage took
const StageBar: React.FC<{ o: TrackedOrder }> = ({ o }) => {
  const parts = STAGES.map((s) => ({ ...s, secs: o.durations[s.key] || 0 }));
  const total = parts.reduce((n, p) => n + p.secs, 0);
  if (!total) return <Text type="secondary">—</Text>;
  return (
    <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", minWidth: 120, background: "#f1f5f9" }}>
      {parts.filter((p) => p.secs > 0).map((p) => (
        <Tooltip key={p.key} title={`${p.label}: ${fmtDuration(p.secs)}`}>
          <div style={{ width: `${(p.secs / total) * 100}%`, background: p.color }} />
        </Tooltip>
      ))}
    </div>
  );
};

const timeCell = (at: string | null, secs: number | null, pendingText = "—") =>
  at ? (
    <div style={{ lineHeight: 1.3 }}>
      <Text style={{ fontSize: 12 }}>{dayjs(at).format("HH:mm")}</Text>
      {secs !== null && (
        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>+{fmtDuration(secs)}</Text>
      )}
    </div>
  ) : (
    <Text type="secondary" style={{ fontSize: 12 }}>{pendingText}</Text>
  );

const StageStats: React.FC = () => {
  const isCompact = useIsCompact();
  const shopId = localStorage.getItem("shopId") || "";
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs(), dayjs()]);

  const query = useQuery({
    queryKey: ["orderTrackingStats", shopId, range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD")],
    queryFn: () =>
      getOrderTrackingStats(shopId, range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD")),
    enabled: !!shopId,
    refetchInterval: 60_000,
  });

  const data = query.data;
  const s = data?.summary;
  const bottleneck = stageOf(s?.bottleneck ?? null);

  const orderColumns: ColumnsType<TrackedOrder> = useMemo(
    () => [
      {
        title: "Order", key: "order", fixed: "left",
        render: (_, o) => (
          <div style={{ lineHeight: 1.3 }}>
            <Text strong style={{ fontSize: 12 }}>{o.table || "—"}</Text>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{o.order_no}</Text>
          </div>
        ),
      },
      { title: "Waiter", dataIndex: "waiter", key: "waiter", render: (w) => w || "—" },
      { title: "Placed", key: "placed", render: (_, o) => timeCell(o.placed_at, null) },
      { title: "Sent", key: "sent", render: (_, o) => timeCell(o.sent_at, o.durations.to_send) },
      {
        title: "Ready", key: "ready",
        render: (_, o) =>
          timeCell(o.ready_at, o.durations.prep, o.pending_tickets ? `${o.pending_tickets} waiting` : "—"),
      },
      {
        title: "Closed", key: "closed",
        render: (_, o) => timeCell(o.closed_at, o.durations.to_close, o.status === "Open" ? "Open" : "—"),
      },
      {
        title: "Total", key: "total", align: "right",
        sorter: (a, b) => (a.total_seconds || 0) - (b.total_seconds || 0),
        render: (_, o) => <Text strong>{fmtDuration(o.total_seconds)}</Text>,
      },
      { title: "Where the time went", key: "bar", width: 180, render: (_, o) => <StageBar o={o} /> },
      {
        title: "Longest stage", key: "slowest",
        filters: STAGES.map((st) => ({ text: st.label, value: st.key })),
        onFilter: (v, o) => o.slowest_stage === v,
        render: (_, o) => {
          const st = stageOf(o.slowest_stage);
          return st ? <Tag color={st.color}>{st.label}</Tag> : "—";
        },
      },
    ],
    []
  );

  const stationColumns: ColumnsType<StationStats> = [
    { title: "Station", dataIndex: "station", key: "station", render: (v) => <Text strong>{v}</Text> },
    { title: "Tickets", dataIndex: "tickets", key: "tickets", align: "right" },
    {
      title: "Waiting now", dataIndex: "pending", key: "pending", align: "right",
      render: (v) => (v ? <Tag color="orange">{v}</Tag> : 0),
    },
    { title: "Avg time to Ready", dataIndex: "avg_prep_seconds", key: "avg", align: "right", render: fmtDuration },
    { title: "Median", dataIndex: "median_prep_seconds", key: "median", align: "right", render: fmtDuration },
    { title: "Slowest", dataIndex: "max_prep_seconds", key: "max", align: "right", render: fmtDuration },
  ];

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <DatePicker.RangePicker
          value={range}
          allowClear={false}
          onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
          presets={[
            { label: "Today", value: [dayjs(), dayjs()] },
            { label: "Yesterday", value: [dayjs().subtract(1, "day"), dayjs().subtract(1, "day")] },
            { label: "Last 7 days", value: [dayjs().subtract(6, "day"), dayjs()] },
            { label: "This month", value: [dayjs().startOf("month"), dayjs()] },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={() => query.refetch()} loading={query.isFetching}>
          Refresh
        </Button>
      </div>

      {query.isLoading ? (
        <div style={{ padding: 40, textAlign: "center" }}><Spin /></div>
      ) : !data || data.orders.length === 0 ? (
        <Empty description="No orders were sent to the kitchen or bar in this period while tracking was on." />
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(5, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <StatCard
              label="Orders tracked"
              value={String(s?.orders ?? 0)}
              hint={`${s?.closed ?? 0} closed · ${s?.waiting_on_station ?? 0} waiting on a station`}
            />
            {STAGES.map((st) => {
              const v =
                st.key === "to_send" ? s?.avg_to_send_seconds
                  : st.key === "prep" ? s?.avg_prep_seconds
                    : s?.avg_to_close_seconds;
              const isSlowest = bottleneck?.key === st.key;
              return (
                <StatCard
                  key={st.key}
                  label={`Avg ${st.label}`}
                  value={fmtDuration(v)}
                  hint={isSlowest ? "Longest wait — start here" : st.hint}
                  highlight={isSlowest}
                  color={st.color}
                />
              );
            })}
            <StatCard label="Avg placed → closed" value={fmtDuration(s?.avg_total_seconds)} hint="Whole order, start to finish" />
          </div>

          <div>
            <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>By station</Text>
            <Table
              rowKey="station"
              size="small"
              pagination={false}
              columns={stationColumns}
              dataSource={data.stations}
              scroll={{ x: "max-content" }}
            />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13 }}>Orders</Text>
              {STAGES.map((st) => (
                <Space key={st.key} size={4}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: st.color, display: "inline-block" }} />
                  <Text type="secondary" style={{ fontSize: 11 }}>{st.label}</Text>
                </Space>
              ))}
            </div>
            <Table
              rowKey="cart_id"
              size="small"
              columns={orderColumns}
              dataSource={data.orders}
              pagination={{ pageSize: 20, showSizeChanger: false }}
              scroll={{ x: "max-content" }}
            />
          </div>
        </>
      )}
    </Space>
  );
};

export default OrderTrackingPanel;
