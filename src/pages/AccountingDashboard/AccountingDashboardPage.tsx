import React, { useState, useCallback } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
  Row,
  Col,
  Typography,
  Space,
  Badge,
  Tag,
  Table,
  Spin,
  Alert,
  Progress,
  Tooltip,
  Button,
  App,
  Radio,
  DatePicker,
  Segmented,
} from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  BankOutlined,
  WarningOutlined,
  SyncOutlined,
  DashboardOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  AuditOutlined,
  SwapOutlined,
  LineChartOutlined,
  BarChartOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
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
  getAccountingDashboard,
  PLTrendMonth,
  TopExpenseAccount,
  CashAccount,
} from "@services/accounting/accountingDashboard";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { fmtK } from "@utils/formatters";
import dayjs from "dayjs";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const PERIOD_LABELS: Record<string, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  custom: "Custom Period",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getShopId = (): string => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.shop_id || user?.shopId || user?.shop || user?.branchId || user?.branch_id || "";
  } catch {
    return "";
  }
};

const fmt = (v: number) =>
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SOURCE_COLORS: Record<string, string> = {
  manual: "#6366f1",
  journal: "#ec4899",
  pos_sale: "#3b82f6",
  pos_subscription: "#06b6d4",
  invoice: "#10b981",
  bill: "#f59e0b",
  payment: "#8b5cf6",
  reconciliation: "#6366f1",
  bank_upload: "#fbbf24",
  income: "#10b981",
  expense: "#f97316",
  payroll: "#8b5cf6",
  credit_note: "#06b6d4",
  debit_note: "#3b82f6",
  note_void: "#ef4444",
};

const EXPENSE_PALETTE = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#06b6d4"];

// ── KPI Card Component (Matching Duka & Mteja Style) ──────────────────────────

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  subtext: React.ReactNode;
  onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  color,
  bg,
  border,
  subtext,
  onClick,
}) => (
  <div
    onClick={onClick}
    style={{
      background: bg,
      borderRadius: 12,
      padding: "16px 18px",
      border: `1px solid ${border}`,
      cursor: onClick ? "pointer" : "default",
      transition: "transform .15s ease, box-shadow .15s ease",
      height: "100%",
    }}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)";
      }
    }}
    onMouseLeave={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }
    }}
  >
    <Space direction="vertical" size={3} style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{title}</Text>
        <div
          style={{
            background: "#ffffff",
            borderRadius: 8,
            padding: "4px 6px",
            color,
            fontSize: 14,
            lineHeight: 1,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#0f172a",
          lineHeight: 1.2,
          marginTop: 2,
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 2 }}>{subtext}</div>
    </Space>
  </div>
);

// ── Custom Tooltip for P&L ──────────────────────────────────────────────────

const CustomPLTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const rev = payload.find((p: any) => p.dataKey === "Revenue")?.value || 0;
  const exp = payload.find((p: any) => p.dataKey === "Expenses")?.value || 0;
  const net = payload.find((p: any) => p.dataKey === "Net P/L")?.value || 0;
  const margin = rev > 0 ? ((net / rev) * 100).toFixed(1) : "0.0";
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(6px)",
        borderRadius: 10,
        padding: "10px 14px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        minWidth: 190,
      }}
    >
      <Text strong style={{ fontSize: 12, color: "#0f172a", display: "block", marginBottom: 6 }}>
        {label}
      </Text>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
        <span style={{ color: "#10b981", fontWeight: 600 }}>● Revenue:</span>
        <span style={{ fontWeight: 600 }}>KES {fmt(rev)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
        <span style={{ color: "#ef4444", fontWeight: 600 }}>● Expenses:</span>
        <span style={{ fontWeight: 600 }}>KES {fmt(exp)}</span>
      </div>
      <div style={{ borderTop: "1px dashed #e2e8f0", margin: "6px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
        <span style={{ color: net >= 0 ? "#6366f1" : "#ef4444", fontWeight: 600 }}>● Net P/L:</span>
        <span style={{ fontWeight: 700, color: net >= 0 ? "#6366f1" : "#ef4444" }}>
          KES {fmt(net)}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b" }}>
        <span>Operating Margin:</span>
        <span style={{ fontWeight: 600, color: Number(margin) >= 0 ? "#10b981" : "#ef4444" }}>
          {margin}%
        </span>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const AccountingDashboardPage: React.FC = () => {
  const shopId = getShopId();
  const primaryColor = usePrimaryColor();

  const [periodFilter, setPeriodFilter] = useState("month");
  const [customDateRange, setCustomDateRange] = useState<any[]>([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [plViewMode, setPlViewMode] = useState<"area" | "bar">("area");
  const [donutMetricMode, setDonutMetricMode] = useState<"count" | "amount">("count");

  const getDateRange = useCallback(() => {
    const today = dayjs();
    switch (periodFilter) {
      case "day":
        return { startDate: today.startOf("day"), endDate: today.endOf("day") };
      case "week":
        return { startDate: today.startOf("week"), endDate: today.endOf("week") };
      case "month":
        return { startDate: today.startOf("month"), endDate: today.endOf("month") };
      case "year":
        return { startDate: today.startOf("year"), endDate: today.endOf("year") };
      case "custom":
        if (customDateRange?.length === 2) {
          return {
            startDate: customDateRange[0].startOf("day"),
            endDate: customDateRange[1].endOf("day"),
          };
        }
        return { startDate: today.startOf("month"), endDate: today.endOf("month") };
      default:
        return { startDate: today.startOf("month"), endDate: today.endOf("month") };
    }
  }, [periodFilter, customDateRange]);

  const { startDate, endDate } = getDateRange();
  const fiscalYear = endDate.year();
  const fiscalMonth = endDate.month() + 1;

  const getFormattedDateRange = useCallback(() => {
    const formatStr = "MMM D, YYYY";
    switch (periodFilter) {
      case "day":
        return startDate.format("MMM D, YYYY");
      case "week":
        return `${startDate.format(formatStr)} – ${endDate.format(formatStr)}`;
      case "month":
        return startDate.format("MMMM YYYY");
      case "year":
        return startDate.format("YYYY");
      case "custom":
        if (customDateRange?.length === 2) {
          return `${customDateRange[0].format(formatStr)} – ${customDateRange[1].format(formatStr)}`;
        }
        return "Custom Range";
      default:
        return startDate.format("MMMM YYYY");
    }
  }, [periodFilter, startDate, endDate, customDateRange]);

  const handlePeriodChange = useCallback((value: string) => {
    setPeriodFilter(value);
    setShowCustomDatePicker(value === "custom");
  }, []);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: [
      "accounting-dashboard",
      shopId,
      fiscalYear,
      fiscalMonth,
      startDate.format(),
      endDate.format(),
    ],
    queryFn: () =>
      getAccountingDashboard({
        shop_id: shopId,
        fiscal_year: fiscalYear,
        fiscal_month: fiscalMonth,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      }),
    enabled: true,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          gap: 12,
        }}
      >
        <Spin size="large" />
        <span style={{ color: "#64748b", fontSize: 13 }}>Loading Pesa…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ padding: 40 }}>
        <Alert
          type="error"
          showIcon
          message="Failed to load Pesa"
          description="Could not connect to the accounting service. Check your connection and try again."
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const {
    overview,
    journal_summary,
    pl_trend,
    cash_positions,
    ar_ap_summary,
    notes_summary,
    recent_entries,
    top_expense_accounts,
    vat_summary,
    reconciliation_status,
    sales_receipts_summary,
  } = data;

  // ── Financial summary calculations ──────────────────────────────────────────

  const rev = overview?.revenue?.amount || 0;
  const exp = overview?.expenses?.amount || 0;
  const costRatio = rev > 0 ? ((exp / rev) * 100).toFixed(1) : "0.0";

  const cash = cash_positions?.total_cash || 0;
  const ar = ar_ap_summary?.accounts_receivable?.total_outstanding || 0;
  const ap = ar_ap_summary?.accounts_payable?.total_outstanding || 0;
  const workingCapital = cash + ar - ap;

  const isProfit = overview?.net_profit?.is_profit ?? ((overview?.net_profit?.amount || 0) >= 0);
  const netMargin = overview?.profit_margin ?? (
    rev > 0 ? Number(((overview.net_profit.amount / rev) * 100).toFixed(1)) : 0
  );

  // ── 6-Month P&L Chart calculations ──────────────────────────────────────────

  const total6MRev = (pl_trend || []).reduce((acc: number, m: PLTrendMonth) => acc + (m.revenue || 0), 0);
  const total6MExp = (pl_trend || []).reduce((acc: number, m: PLTrendMonth) => acc + (m.expenses || 0), 0);
  const total6MNet = (pl_trend || []).reduce((acc: number, m: PLTrendMonth) => acc + (m.net_profit || 0), 0);
  const avg6MMargin = total6MRev > 0 ? ((total6MNet / total6MRev) * 100).toFixed(1) : "0.0";

  const plChartData = (pl_trend || []).map((m: PLTrendMonth) => ({
    name: m.label,
    Revenue: m.revenue,
    Expenses: m.expenses,
    "Net P/L": m.net_profit,
  }));

  // ── Donut Chart calculations (Count vs KES Volume) ─────────────────────────

  const totalEntriesCount =
    journal_summary?.total_entries ||
    Object.values(journal_summary?.by_source || {}).reduce(
      (acc: number, b: any) => acc + (b.count || 0),
      0
    );

  const totalEntriesAmount = Object.values(journal_summary?.by_source || {}).reduce(
    (acc: number, b: any) => acc + (b.total || 0),
    0
  );

  const pieData = Object.entries(journal_summary?.by_source || {})
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

  const netVatPayable = vat_summary?.net_vat_payable || 0;

  // ── Recent entries columns ─────────────────────────────────────────────────

  const recentCols = [
    {
      title: "Entry",
      dataIndex: "entry_no",
      width: 110,
      render: (v: string) => (
        <Text code style={{ fontSize: 11 }}>
          {v}
        </Text>
      ),
    },
    {
      title: "Date",
      dataIndex: "entry_date",
      width: 100,
      render: (d: string) => dayjs(d).format("DD MMM YY"),
    },
    {
      title: "Description",
      dataIndex: "description",
      ellipsis: true,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: "Source",
      dataIndex: "source",
      width: 110,
      render: (s: string) => (
        <Tag
          style={{
            background: `${SOURCE_COLORS[s] || "#94a3b8"}18`,
            color: SOURCE_COLORS[s] || "#64748b",
            border: "none",
            fontSize: 10,
            borderRadius: 4,
          }}
        >
          {s?.replace(/_/g, " ").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "total_debit",
      width: 120,
      align: "right" as const,
      render: (v: number) => (
        <Text strong style={{ fontSize: 12, color: "#1d39c4" }}>
          KES {fmtK(v)}
        </Text>
      ),
    },
  ];

  return (
    <App>
      <div style={{ padding: "0 0 24px" }}>
        {/* ── Tier 1: Header & Controls ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Space align="center" size={12}>
            <div
              style={{
                background: `${primaryColor}15`,
                borderRadius: 10,
                padding: "8px 10px",
                color: primaryColor,
                fontSize: 20,
              }}
            >
              <DashboardOutlined />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
                {PERIOD_LABELS[periodFilter]} · Pesa
              </Title>
              <Text style={{ fontSize: 12, color: "#64748b" }}>
                {getFormattedDateRange()} · Financial overview & general ledger
              </Text>
            </div>
          </Space>

          <Space size="small" wrap>
            <div
              style={{
                background: "#f8fafc",
                borderRadius: 8,
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid #e2e8f0",
              }}
            >
              <CalendarOutlined style={{ color: primaryColor, fontSize: 13 }} />
              <Radio.Group
                value={periodFilter}
                onChange={(e) => handlePeriodChange(e.target.value)}
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="day">Day</Radio.Button>
                <Radio.Button value="week">Week</Radio.Button>
                <Radio.Button value="month">Month</Radio.Button>
                <Radio.Button value="year">Year</Radio.Button>
                <Radio.Button value="custom">Custom</Radio.Button>
              </Radio.Group>
            </div>
            {showCustomDatePicker && (
              <RangePicker
                value={customDateRange as any}
                onChange={(d) => setCustomDateRange(d || [])}
                allowClear
                style={{ minWidth: 240 }}
                size="small"
              />
            )}
            <Button
              size="small"
              icon={<SyncOutlined spin={isFetching} />}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </Space>
        </div>

        {/* ── Tier 2: Executive Financial Pulse (Matching Duka & Mteja Style) ── */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={12} lg={6}>
            <KPICard
              title="Revenue"
              value={`KES ${fmtK(overview.revenue.amount)}`}
              icon={<RiseOutlined />}
              color="#10b981"
              bg="#f0fdf4"
              border="#bbf7d0"
              subtext={
                <Space size={4}>
                  {overview.revenue.vs_prev_year !== null && overview.revenue.vs_prev_year !== undefined ? (
                    <>
                      {overview.revenue.vs_prev_year >= 0 ? (
                        <ArrowUpOutlined style={{ color: "#10b981", fontSize: 11 }} />
                      ) : (
                        <ArrowDownOutlined style={{ color: "#ef4444", fontSize: 11 }} />
                      )}
                      <Text
                        style={{
                          fontSize: 11,
                          color: overview.revenue.vs_prev_year >= 0 ? "#10b981" : "#ef4444",
                          fontWeight: 500,
                        }}
                      >
                        {Math.abs(overview.revenue.vs_prev_year)}% vs last year
                      </Text>
                    </>
                  ) : (
                    <Text style={{ fontSize: 11, color: "#64748b" }}>Gross operational inflows</Text>
                  )}
                </Space>
              }
            />
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <KPICard
              title="Expenses"
              value={`KES ${fmtK(overview.expenses.amount)}`}
              icon={<FallOutlined />}
              color="#ef4444"
              bg="#fef2f2"
              border="#fecaca"
              subtext={
                <Space size={6}>
                  <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>
                    {costRatio}% Cost Ratio
                  </span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>• of Revenue</span>
                </Space>
              }
            />
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <KPICard
              title={isProfit ? "Net Operating Profit" : "Net Operating Loss"}
              value={`KES ${fmtK(Math.abs(overview.net_profit.amount))}`}
              icon={<DollarOutlined />}
              color={isProfit ? "#6366f1" : "#ef4444"}
              bg={isProfit ? "#f5f3ff" : "#fef2f2"}
              border={isProfit ? "#ddd6fe" : "#fecaca"}
              subtext={
                <Space size={6}>
                  <span style={{ fontSize: 11, color: isProfit ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                    {netMargin}% margin
                  </span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    • {isProfit ? "Profitable Period" : "Operating Deficit"}
                  </span>
                </Space>
              }
            />
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <KPICard
              title="Total Assets"
              value={`KES ${fmtK(overview.total_assets)}`}
              icon={<BankOutlined />}
              color="#3b82f6"
              bg="#eff6ff"
              border="#bfdbfe"
              subtext={
                <Space size={6}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Working Cap:</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: workingCapital >= 0 ? "#3b82f6" : "#ef4444",
                      fontWeight: 600,
                    }}
                  >
                    KES {fmtK(workingCapital)}
                  </span>
                </Space>
              }
            />
          </Col>
        </Row>

        {/* ── Tier 3: Visual Analytics & Breakdown Hub ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {/* P&L Trend (6 Months) */}
          <Col xs={24} lg={15}>
            <ProCard
              title={
                <Space size={8} wrap>
                  <Text strong style={{ fontSize: 14 }}>
                    P&L Trend — Last 6 Months
                  </Text>
                  <Tag color="cyan" style={{ borderRadius: 10, fontSize: 11, border: "none" }}>
                    6M Rev: KES {fmtK(total6MRev)}
                  </Tag>
                  <Tag color="purple" style={{ borderRadius: 10, fontSize: 11, border: "none" }}>
                    6M Net: KES {fmtK(total6MNet)}
                  </Tag>
                  <Tag
                    color={Number(avg6MMargin) >= 0 ? "success" : "error"}
                    style={{ borderRadius: 10, fontSize: 11, border: "none" }}
                  >
                    Avg Margin: {avg6MMargin}%
                  </Tag>
                </Space>
              }
              extra={
                <Segmented
                  size="small"
                  value={plViewMode}
                  onChange={(v) => setPlViewMode(v as "area" | "bar")}
                  options={[
                    { label: "Trend (Area)", value: "area", icon: <LineChartOutlined /> },
                    { label: "Monthly (Bar)", value: "bar", icon: <BarChartOutlined /> },
                  ]}
                />
              }
              bordered
              bodyStyle={{ paddingTop: 12 }}
              size="small"
            >
              <div style={{ height: 270, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  {plViewMode === "area" ? (
                    <AreaChart data={plChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
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
                      <Line
                        type="monotone"
                        dataKey="Net P/L"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        strokeDasharray="4 4"
                        dot={{ r: 3, fill: "#6366f1" }}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={plChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
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

          {/* Journal Entries by Source */}
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
                      height: 180,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={76}
                          innerRadius={50}
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
                          fontSize: donutMetricMode === "amount" ? 14 : 20,
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
                  <div style={{ marginTop: 10, maxHeight: 110, overflowY: "auto", paddingRight: 4 }}>
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

        {/* ── Tier 3 (Row 2): Top Expenses & Cash Liquidity ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {/* Top Expense Accounts Bar */}
          <Col xs={24} lg={14}>
            <ProCard
              title={<Text strong>Top Expense Accounts</Text>}
              bordered
              size="small"
              bodyStyle={{ paddingTop: 8 }}
            >
              {top_expense_accounts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: 12 }}>
                  No expenses this period
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={top_expense_accounts}
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
                        {top_expense_accounts.map((_: TopExpenseAccount, i: number) => (
                          <Cell key={i} fill={EXPENSE_PALETTE[i % EXPENSE_PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  <Space direction="vertical" size={6} style={{ width: "100%", marginTop: 8 }}>
                    {top_expense_accounts.slice(0, 4).map((acc: TopExpenseAccount, i: number) => (
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
                            width: 40,
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
                </>
              )}
            </ProCard>
          </Col>

          {/* Cash Positions & Working Capital Snapshot */}
          <Col xs={24} lg={10}>
            <ProCard
              title={<Text strong>Cash Positions & Working Capital</Text>}
              extra={
                <Tag color="blue" style={{ fontWeight: 600 }}>
                  Total Liquid: KES {fmtK(cash_positions.total_cash)}
                </Tag>
              }
              bordered
              size="small"
            >
              <Space direction="vertical" size={10} style={{ width: "100%" }}>
                {/* Working Capital Mini-Pills */}
                <Row gutter={8}>
                  <Col span={8}>
                    <div
                      style={{
                        background: "#f0fdf4",
                        borderRadius: 8,
                        padding: "8px 6px",
                        textAlign: "center",
                      }}
                    >
                      <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>AR Due</Text>
                      <Text strong style={{ fontSize: 13, color: "#10b981" }}>
                        KES {fmtK(ar_ap_summary.accounts_receivable.total_outstanding)}
                      </Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div
                      style={{
                        background: "#fef2f2",
                        borderRadius: 8,
                        padding: "8px 6px",
                        textAlign: "center",
                      }}
                    >
                      <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>AP Due</Text>
                      <Text strong style={{ fontSize: 13, color: "#ef4444" }}>
                        KES {fmtK(ar_ap_summary.accounts_payable.total_outstanding)}
                      </Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div
                      style={{
                        background: workingCapital >= 0 ? "#eff6ff" : "#fff7ed",
                        borderRadius: 8,
                        padding: "8px 6px",
                        textAlign: "center",
                      }}
                    >
                      <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>
                        Net Working Cap
                      </Text>
                      <Text
                        strong
                        style={{
                          fontSize: 13,
                          color: workingCapital >= 0 ? "#3b82f6" : "#f59e0b",
                        }}
                      >
                        KES {fmtK(workingCapital)}
                      </Text>
                    </div>
                  </Col>
                </Row>

                {/* Bank accounts list */}
                <div style={{ maxHeight: 155, overflowY: "auto" }}>
                  {cash_positions.accounts.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      No bank accounts configured
                    </Text>
                  ) : (
                    cash_positions.accounts.map((acc: CashAccount, i: number) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 8px",
                          background: "#f8fafc",
                          borderRadius: 6,
                          marginBottom: 4,
                          borderLeft: `3px solid ${primaryColor}`,
                        }}
                      >
                        <Space direction="vertical" size={0}>
                          <Text style={{ fontSize: 11, fontWeight: 600 }}>{acc.account_name}</Text>
                          {acc.bank_name && (
                            <Text style={{ fontSize: 10, color: "#94a3b8" }}>{acc.bank_name}</Text>
                          )}
                        </Space>
                        <Text
                          strong
                          style={{
                            fontSize: 12,
                            color: acc.current_balance >= 0 ? "#0f172a" : "#ef4444",
                          }}
                        >
                          KES {fmtK(acc.current_balance)}
                        </Text>
                      </div>
                    ))
                  )}
                </div>
              </Space>
            </ProCard>
          </Col>
        </Row>

        {/* ── Tier 4: Unified Financial Operations Hub ── */}
        <ProCard
          bordered
          size="small"
          bodyStyle={{ padding: "0 12px 12px" }}
          tabs={{
            type: "line",
            items: [
              {
                key: "journal",
                label: (
                  <Space size={6}>
                    <FileTextOutlined />
                    <span>Recent Journal Entries</span>
                    <Badge count={recent_entries.length} style={{ backgroundColor: "#3b82f6" }} />
                  </Space>
                ),
                children: (
                  <div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                      <Tag color="default">📝 {journal_summary.draft_count} Draft</Tag>
                      <Tag color="success">✓ {journal_summary.posted_count} Posted</Tag>
                      {journal_summary.voided_count > 0 && (
                        <Tag color="error">✗ {journal_summary.voided_count} Voided</Tag>
                      )}
                    </div>
                    <Table
                      rowKey="_id"
                      dataSource={recent_entries.slice(0, 6)}
                      columns={recentCols}
                      pagination={false}
                      size="small"
                      locale={{ emptyText: "No posted entries this period" }}
                    />
                  </div>
                ),
              },
              {
                key: "receipts",
                label: (
                  <Space size={6}>
                    <DollarOutlined />
                    <span>Sales Receipts</span>
                  </Space>
                ),
                children: sales_receipts_summary ? (
                  <div>
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                      <Col xs={12} sm={6}>
                        <div style={{ background: "#f0fdf4", padding: "10px 12px", borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: "#64748b" }}>Posted Receipts</Text>
                          <Text strong style={{ fontSize: 16, color: "#10b981", display: "block" }}>
                            KES {fmtK(sales_receipts_summary.total_posted)}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: "#fff7ed", padding: "10px 12px", borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: "#64748b" }}>Pending</Text>
                          <Text strong style={{ fontSize: 16, color: "#f59e0b", display: "block" }}>
                            KES {fmtK(sales_receipts_summary.total_pending)}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: "#fef2f2", padding: "10px 12px", borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: "#64748b" }}>Voided</Text>
                          <Text strong style={{ fontSize: 16, color: "#ef4444", display: "block" }}>
                            KES {fmtK(sales_receipts_summary.total_voided)}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: "#eef2ff", padding: "10px 12px", borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: "#64748b" }}>VAT Collected</Text>
                          <Text strong style={{ fontSize: 16, color: "#6366f1", display: "block" }}>
                            KES {fmtK(sales_receipts_summary.total_vat_collected)}
                          </Text>
                        </div>
                      </Col>
                    </Row>

                    <Title level={5} style={{ fontSize: 13, marginBottom: 8 }}>
                      Receipts by Payment Method
                    </Title>
                    <Row gutter={[12, 12]}>
                      {Object.entries(sales_receipts_summary.by_payment_method).map(([method, pdata]) => (
                        <Col xs={12} sm={8} md={6} key={method}>
                          <div
                            style={{
                              background: "#f8fafc",
                              borderRadius: 8,
                              padding: "10px",
                              borderLeft: `3px solid ${primaryColor}`,
                            }}
                          >
                            <Text style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize", display: "block" }}>
                              {method.replace(/_/g, " ")}
                            </Text>
                            <Text strong style={{ fontSize: 14, color: "#0f172a", display: "block" }}>
                              KES {fmtK(pdata.total)}
                            </Text>
                            <Text style={{ fontSize: 10, color: "#94a3b8" }}>
                              {pdata.count} receipt{pdata.count !== 1 ? "s" : ""}
                            </Text>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: 12 }}>
                    No sales receipts data
                  </div>
                ),
              },
              {
                key: "vat",
                label: (
                  <Space size={6}>
                    <CheckCircleOutlined />
                    <span>VAT & Tax Compliance</span>
                  </Space>
                ),
                children: (
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                      <div style={{ background: "#f0fdf4", borderRadius: 8, padding: 16, textAlign: "center" }}>
                        <Text style={{ fontSize: 12, color: "#64748b" }}>VAT Collected (Output)</Text>
                        <Text strong style={{ fontSize: 20, color: "#10b981", display: "block", marginTop: 4 }}>
                          KES {fmtK(vat_summary.vat_collected)}
                        </Text>
                      </div>
                    </Col>
                    <Col xs={24} sm={8}>
                      <div style={{ background: "#fff7ed", borderRadius: 8, padding: 16, textAlign: "center" }}>
                        <Text style={{ fontSize: 12, color: "#64748b" }}>VAT Paid (Input)</Text>
                        <Text strong style={{ fontSize: 20, color: "#f59e0b", display: "block", marginTop: 4 }}>
                          KES {fmtK(vat_summary.vat_paid)}
                        </Text>
                      </div>
                    </Col>
                    <Col xs={24} sm={8}>
                      <div
                        style={{
                          background: netVatPayable >= 0 ? "#fef2f2" : "#f0fdf4",
                          borderRadius: 8,
                          padding: 16,
                          textAlign: "center",
                          border: `1px solid ${netVatPayable >= 0 ? "#fecaca" : "#bbf7d0"}`,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: 600 }}>
                          {netVatPayable >= 0 ? "Net VAT Payable" : "VAT Refund Due"}
                        </Text>
                        <Text
                          strong
                          style={{
                            fontSize: 20,
                            color: netVatPayable >= 0 ? "#ef4444" : "#10b981",
                            display: "block",
                            marginTop: 4,
                          }}
                        >
                          KES {fmtK(Math.abs(netVatPayable))}
                        </Text>
                      </div>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "recon",
                label: (
                  <Space size={6}>
                    <AuditOutlined />
                    <span>Bank Reconciliation</span>
                    {reconciliation_status.attention_needed > 0 && (
                      <Badge count={reconciliation_status.attention_needed} style={{ backgroundColor: "#f59e0b" }} />
                    )}
                  </Space>
                ),
                children: (
                  <div>
                    <Row gutter={12} style={{ marginBottom: 12 }}>
                      <Col span={8}>
                        <div style={{ textAlign: "center", background: "#f8fafc", borderRadius: 8, padding: "8px" }}>
                          <Text strong style={{ fontSize: 18, color: "#64748b" }}>
                            {reconciliation_status.open_count}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#94a3b8", display: "block" }}>Open</Text>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: "center", background: "#eff6ff", borderRadius: 8, padding: "8px" }}>
                          <Text strong style={{ fontSize: 18, color: "#3b82f6" }}>
                            {reconciliation_status.in_progress_count}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#94a3b8", display: "block" }}>In Progress</Text>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: "center", background: "#f0fdf4", borderRadius: 8, padding: "8px" }}>
                          <Text strong style={{ fontSize: 18, color: "#10b981" }}>
                            {reconciliation_status.completed_this_year}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#94a3b8", display: "block" }}>Done YTD</Text>
                        </div>
                      </Col>
                    </Row>

                    {reconciliation_status.open_sessions.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "20px 0", color: "#10b981", fontSize: 12 }}>
                        All accounts reconciled ✓
                      </div>
                    ) : (
                      <Space direction="vertical" size={8} style={{ width: "100%" }}>
                        {reconciliation_status.open_sessions.map((s, i) => {
                          const accName =
                            typeof s.account_id === "object" ? s.account_id?.account_name : s.account_name;
                          const isBalanced = Math.abs(s.difference) < 0.001;

                          return (
                            <div
                              key={i}
                              style={{
                                padding: "8px 12px",
                                background: "#f8fafc",
                                borderRadius: 8,
                                borderLeft: `3px solid ${s.status === "In Progress" ? "#3b82f6" : "#94a3b8"}`,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <Space direction="vertical" size={0}>
                                <Text style={{ fontSize: 12, fontWeight: 600 }}>{accName || s.account_name}</Text>
                                <Text style={{ fontSize: 10, color: "#94a3b8" }}>
                                  {dayjs(s.period_start).format("DD MMM")} — {dayjs(s.period_end).format("DD MMM YYYY")}
                                  {s.unmatched_count > 0 && ` · ${s.unmatched_count} unmatched`}
                                </Text>
                              </Space>
                              <div style={{ textAlign: "right" }}>
                                <Badge
                                  status={s.status === "In Progress" ? "processing" : "default"}
                                  text={<Text style={{ fontSize: 11 }}>{s.status}</Text>}
                                />
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: isBalanced ? "#10b981" : "#ef4444",
                                    fontWeight: 600,
                                    display: "block",
                                  }}
                                >
                                  {isBalanced ? "Balanced ✓" : `Diff: KES ${fmtK(Math.abs(s.difference))}`}
                                </Text>
                              </div>
                            </div>
                          );
                        })}
                      </Space>
                    )}
                  </div>
                ),
              },
              {
                key: "notes",
                label: (
                  <Space size={6}>
                    <SwapOutlined />
                    <span>Credit & Debit Notes</span>
                    {notes_summary.pending_approval > 0 && (
                      <Badge count={notes_summary.pending_approval} style={{ backgroundColor: "#ef4444" }} />
                    )}
                  </Space>
                ),
                children: (
                  <div>
                    {notes_summary.pending_approval > 0 && (
                      <Alert
                        type="warning"
                        showIcon
                        icon={<WarningOutlined />}
                        message={`${notes_summary.pending_approval} note${notes_summary.pending_approval > 1 ? "s" : ""} pending approval`}
                        style={{ marginBottom: 12, fontSize: 12 }}
                      />
                    )}
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <div style={{ background: "#f0fdf4", padding: "12px 16px", borderRadius: 8 }}>
                          <Text style={{ fontSize: 12, color: "#64748b" }}>Total Credit Notes</Text>
                          <Text strong style={{ fontSize: 18, color: "#10b981", display: "block" }}>
                            KES {fmtK(notes_summary.total_credit_notes)}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={24} sm={12}>
                        <div style={{ background: "#fff7ed", padding: "12px 16px", borderRadius: 8 }}>
                          <Text style={{ fontSize: 12, color: "#64748b" }}>Net Adjustment</Text>
                          <Text
                            strong
                            style={{
                              fontSize: 18,
                              color: notes_summary.net_adjustment >= 0 ? "#10b981" : "#ef4444",
                              display: "block",
                            }}
                          >
                            KES {fmtK(Math.abs(notes_summary.net_adjustment))}
                          </Text>
                        </div>
                      </Col>
                    </Row>
                  </div>
                ),
              },
            ],
          }}
        />
      </div>
    </App>
  );
};

export default AccountingDashboardPage;