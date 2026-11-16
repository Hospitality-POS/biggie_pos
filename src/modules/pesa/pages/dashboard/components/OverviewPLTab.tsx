import React, { useState } from "react";
import { Row, Col, Typography, Space, Tag, Segmented, Progress, Button } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  LineChartOutlined,
  BarChartOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
  ReferenceLine,
} from "recharts";
import {
  DashboardPLTrend,
  DashboardJournalSummary,
  TopExpenseAccount,
  PLTrendMonth,
} from "@services/accounting/accountingDashboard";
import { fmtK, fmtKES } from "@utils/formatters";
import { SOURCE_COLORS, EXPENSE_PALETTE, fmt } from "./constants";
import { CustomPLTooltip } from "./SharedUI";

const { Text } = Typography;

interface OverviewPLTabProps {
  plTrend: DashboardPLTrend;
  journalSummary: DashboardJournalSummary;
  topExpenseAccounts: TopExpenseAccount[];
  isMobile: boolean;
  isAdminLayout: boolean;
}

export const OverviewPLTab: React.FC<OverviewPLTabProps> = ({
  plTrend = [],
  journalSummary,
  topExpenseAccounts = [],
  isMobile,
  isAdminLayout,
}) => {
  const navigate = useNavigate();
  const [plViewMode, setPlViewMode] = useState<"area" | "bar">("area");
  const [donutMetricMode, setDonutMetricMode] = useState<"count" | "amount">("count");

  // ── 6-Month P&L calculations ──────────────────────────────────────────────
  const total6MRev = plTrend.reduce((acc: number, m: PLTrendMonth) => acc + (m.revenue || 0), 0);
  const total6MExp = plTrend.reduce((acc: number, m: PLTrendMonth) => acc + (m.expenses || 0), 0);
  const total6MNet = plTrend.reduce((acc: number, m: PLTrendMonth) => acc + (m.net_profit || 0), 0);
  const avg6MMargin = total6MRev > 0 ? ((total6MNet / total6MRev) * 100).toFixed(1) : "0.0";

  const plChartData = plTrend.map((m: PLTrendMonth) => ({
    name: m.label,
    Revenue: m.revenue,
    Expenses: m.expenses,
    "Net P/L": m.net_profit,
  }));

  // ── Journal Source Donut calculations ─────────────────────────────────────
  const totalEntriesCount =
    journalSummary?.total_entries ||
    Object.values(journalSummary?.by_source || {}).reduce(
      (acc: number, b: any) => acc + (b.count || 0),
      0
    );

  const totalEntriesAmount = Object.values(journalSummary?.by_source || {}).reduce(
    (acc: number, b: any) => acc + (b.total || 0),
    0
  );

  const pieData = Object.entries(journalSummary?.by_source || {})
    .map(([src, val]: [string, any]) => ({
      name: src.replace(/_/g, " "),
      rawSource: src,
      count: val.count || 0,
      amount: val.total || 0,
      value: donutMetricMode === "amount" ? val.total || 0 : val.count || 0,
      color: SOURCE_COLORS[src] || "#94a3b8",
    }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);

  const activeTotalForDonut = donutMetricMode === "amount" ? totalEntriesAmount : totalEntriesCount;

  return (
    <div style={{ width: "100%" }}>
      {/* ── Top Row: 6-Month P&L Trend + Entries by Source Donut ── */}
      <Row gutter={isMobile ? [12, 12] : [16, 16]} style={{ marginBottom: isMobile ? 12 : 16 }}>
        {/* ── P&L Trend (6 Months) ── */}
        <Col xs={24} lg={15}>
          <ProCard
            title={
              <Space size={6} wrap>
                <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
                  {isMobile ? "P&L Trend (6M)" : "P&L Trend — Last 6 Months"}
                </Text>
                {!isMobile && (
                  <Tag color="cyan" style={{ borderRadius: 10, fontSize: 11, border: "none" }}>
                    6M Rev: KES {fmtK(total6MRev)}
                  </Tag>
                )}
                <Tag color="purple" style={{ borderRadius: 10, fontSize: 10, border: "none" }}>
                  6M Net: KES {fmtK(total6MNet)}
                </Tag>
                {!isMobile && (
                  <Tag
                    color={Number(avg6MMargin) >= 0 ? "success" : "error"}
                    style={{ borderRadius: 10, fontSize: 11, border: "none" }}
                  >
                    Avg Margin: {avg6MMargin}%
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Segmented
                size="small"
                value={plViewMode}
                onChange={(v) => setPlViewMode(v as "area" | "bar")}
                options={[
                  {
                    label: isMobile ? "Area" : "Trend (Area)",
                    value: "area",
                    icon: isMobile ? undefined : <LineChartOutlined />,
                  },
                  {
                    label: isMobile ? "Bar" : "Monthly (Bar)",
                    value: "bar",
                    icon: isMobile ? undefined : <BarChartOutlined />,
                  },
                ]}
              />
            }
            bordered
            bodyStyle={{
              paddingTop: isMobile ? 8 : 12,
              paddingLeft: isMobile ? 6 : 12,
              paddingRight: isMobile ? 6 : 12,
            }}
            size="small"
          >
            <div style={{ height: isMobile ? 220 : 270, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                {plViewMode === "area" ? (
                  <AreaChart
                    data={plChartData}
                    margin={{ top: 8, right: isMobile ? 8 : 20, left: isMobile ? -15 : 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="pesaRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="pesaExpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="pesaNetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={fmtK}
                    />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    <ReTooltip content={<CustomPLTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                    <Area
                      type="monotone"
                      dataKey="Revenue"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#pesaRevGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#pesaExpGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Net P/L"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#pesaNetGrad)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={plChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={fmtK}
                    />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    <ReTooltip content={<CustomPLTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                    <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Net P/L" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </ProCard>
        </Col>

        {/* ── Journal Entries by Source Donut ── */}
        <Col xs={24} lg={9}>
          <ProCard
            title={
              <Space size={8}>
                <Text strong style={{ fontSize: 14 }}>
                  Entries by Source
                </Text>
                <Tag color="purple" style={{ borderRadius: 10, fontSize: 11, border: "none" }}>
                  {totalEntriesCount} Vouchers
                </Tag>
              </Space>
            }
            extra={
              <Segmented
                size="small"
                value={donutMetricMode}
                onChange={(v) => setDonutMetricMode(v as "count" | "amount")}
                options={[
                  { label: "Count", value: "count" },
                  { label: "Volume", value: "amount" },
                ]}
              />
            }
            bordered
            bodyStyle={{ paddingTop: 12 }}
            size="small"
          >
            {pieData.length > 0 ? (
              <>
                <div
                  style={{
                    position: "relative",
                    height: 175,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ResponsiveContainer width="100%" height={175}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={74}
                        innerRadius={48}
                        paddingAngle={2}
                      >
                        {pieData.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <ReTooltip
                        formatter={(v: any, name: any) => [
                          donutMetricMode === "amount" ? `KES ${fmt(v)}` : `${v} vouchers`,
                          name,
                        ]}
                        contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Donut Total */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      textAlign: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        display: "block",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        fontWeight: 500,
                      }}
                    >
                      {donutMetricMode === "amount" ? "Volume" : "Total"}
                    </Text>
                    <Text
                      strong
                      style={{
                        fontSize: donutMetricMode === "amount" ? 14 : 19,
                        color: "#0f172a",
                        lineHeight: 1.2,
                        display: "block",
                      }}
                    >
                      {donutMetricMode === "amount"
                        ? `KES ${fmtK(totalEntriesAmount)}`
                        : totalEntriesCount}
                    </Text>
                  </div>
                </div>

                {/* Breakdown rows */}
                <div style={{ marginTop: 8, maxHeight: 110, overflowY: "auto", paddingRight: 4 }}>
                  {pieData.map((e: any, i: number) => {
                    const pct =
                      activeTotalForDonut > 0
                        ? ((e.value / activeTotalForDonut) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "4px 6px",
                          borderRadius: 6,
                          marginBottom: 3,
                          background: i % 2 === 0 ? "#f8fafc" : "#ffffff",
                        }}
                      >
                        <Space size={6} style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: e.color,
                              flexShrink: 0,
                            }}
                          />
                          <Text
                            style={{ fontSize: 11, color: "#475569", textTransform: "capitalize" }}
                            ellipsis
                          >
                            {e.name}
                          </Text>
                        </Space>
                        <Space size={8}>
                          <Tag
                            style={{
                              fontSize: 10,
                              margin: 0,
                              padding: "0 4px",
                              borderRadius: 4,
                              background: "#f1f5f9",
                              border: "none",
                            }}
                          >
                            {pct}%
                          </Tag>
                          <Text strong style={{ fontSize: 11, color: "#0f172a" }}>
                            {donutMetricMode === "amount" ? `KES ${fmtK(e.amount)}` : `${e.count}`}
                          </Text>
                        </Space>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontSize: 12 }}>
                No entries recorded this period
              </div>
            )}
          </ProCard>
        </Col>
      </Row>

      {/* ── Bottom Row: Top Expense Accounts ── */}
      <ProCard
        title={
          <Space size={8}>
            <Text strong style={{ fontSize: 14 }}>
              Top Expense Accounts
            </Text>
            {topExpenseAccounts.length > 0 && (
              <Tag color="orange" style={{ borderRadius: 10, fontSize: 11, border: "none" }}>
                {topExpenseAccounts.length} categories
              </Tag>
            )}
          </Space>
        }
        extra={
          !isAdminLayout ? (
            <Button
              type="link"
              size="small"
              onClick={() => navigate("/accounting/expenses")}
              style={{ fontSize: 12, padding: 0 }}
            >
              All Expenses <ArrowRightOutlined />
            </Button>
          ) : undefined
        }
        bordered
        size="small"
        bodyStyle={{ paddingTop: 8 }}
      >
        {topExpenseAccounts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: 12 }}>
            No expenses recorded for this period
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={24} md={14}>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart
                  data={topExpenseAccounts}
                  layout="vertical"
                  margin={{ top: 0, right: 25, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmtK}
                  />
                  <YAxis
                    type="category"
                    dataKey="account_name"
                    width={130}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 18) + "…" : v)}
                  />
                  <ReTooltip
                    formatter={(v: any) => [`KES ${fmt(v || 0)}`, "Amount"]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="total_amount" radius={[0, 4, 4, 0]}>
                    {topExpenseAccounts.map((_: TopExpenseAccount, i: number) => (
                      <Cell key={i} fill={EXPENSE_PALETTE[i % EXPENSE_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Col>
            <Col xs={24} md={10}>
              <Space direction="vertical" size={8} style={{ width: "100%", marginTop: 4 }}>
                {topExpenseAccounts.slice(0, 5).map((acc: TopExpenseAccount, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: EXPENSE_PALETTE[i % EXPENSE_PALETTE.length],
                        flexShrink: 0,
                      }}
                    />
                    <Text style={{ fontSize: 11, flex: 1, color: "#475569" }} ellipsis>
                      {acc.account_name}
                    </Text>
                    <Progress
                      percent={acc.percentage}
                      showInfo={false}
                      strokeColor={EXPENSE_PALETTE[i % EXPENSE_PALETTE.length]}
                      style={{ width: 80, margin: 0 }}
                      size="small"
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        width: 44,
                        textAlign: "right",
                        color: "#0f172a",
                        fontWeight: 600,
                      }}
                    >
                      {acc.percentage}%
                    </Text>
                  </div>
                ))}
              </Space>
            </Col>
          </Row>
        )}
      </ProCard>
    </div>
  );
};
