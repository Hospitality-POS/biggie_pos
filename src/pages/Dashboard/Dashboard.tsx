import React, { useState, useMemo, useCallback } from "react";
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
  message,
  notification,
  Radio,
  DatePicker,
  Flex,
  Divider,
  Tag,
  Progress,
  Empty,
  Drawer,
  Tooltip,
} from "antd";
import {
  ShoppingCartOutlined,
  TeamOutlined,
  WarningOutlined,
  ReloadOutlined,
  CalendarOutlined,
  LineChartOutlined,
  FireOutlined,
  TrophyOutlined,
  RiseOutlined,
  DollarOutlined,
  FallOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  SyncOutlined,
  PieChartOutlined,
  SnippetsOutlined,
  FilterOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ShopOutlined,
  CopyOutlined,
  MedicineBoxOutlined,
} from "@ant-design/icons";
import { Line } from "@ant-design/charts";
import {
  getDashboardAnalysis,
  getBestSellers,
  getSalesChartData,
} from "@services/orders";
import dayjs from "dayjs";
import { ProCard } from "@ant-design/pro-components";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ── POS mode helper ───────────────────────────────────────────────────────────
const getPosMode = (): string =>
  localStorage.getItem("posMode") ?? "service";

const isHospitalMode = (): boolean => getPosMode() === "hospital";

// ── Constants ─────────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#1890ff",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  purple: "#6366f1",
  orange: "#f97316",
  cyan: "#06b6d4",
  gray: "#64748b",
  lightGray: "#f8fafc",
  text: "#0f172a",
  subtext: "#64748b",
};

const PERIOD_LABELS: Record<string, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  custom: "Custom Period",
};

// ── Hooks ─────────────────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtK = (v: number) => {
  if (!v && v !== 0) return "0";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("en-KE", { minimumFractionDigits: 0 });
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
  title, value, icon, color, bg, pctChange, prefix = "Ksh", suffix, onClick, loading,
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
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
      }}
    >
      <div style={{
        position: "absolute", right: -16, top: -16,
        width: 80, height: 80, borderRadius: "50%", background: `${color}18`,
      }} />
      {loading ? (
        <Skeleton active paragraph={false} />
      ) : (
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
            {prefix ? `${prefix} ` : ""}{typeof value === "number" ? fmtK(value) : value}
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

// ── Business performance ──────────────────────────────────────────────────────
const calculateBusinessIndicators = (chartData: any, apiData: any, periodFilter: string) => {
  const totalRevenue = chartData?.data?.summary?.total_sales || apiData?.todayRevenue || 0;
  const totalOrders = chartData?.data?.summary?.total_orders || apiData?.totalOrderCount || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const growthRate = chartData?.data?.summary?.growth_rate || 0;

  if (!chartData?.data?.chart_data?.length || totalRevenue === 0) {
    return {
      trend: "no-sales", trendText: `No sales ${PERIOD_LABELS[periodFilter]?.toLowerCase() || "in selected period"}`,
      trendColor: COLORS.error,
      insights: [
        { type: "negative", text: "Zero revenue — immediate action needed" },
        { type: "warning", text: "Consider promotions or check shop operations" },
      ],
      performance: "critical", performanceColor: COLORS.error, performanceText: "Critical — No Sales", avgOrderValue: 0,
    };
  }

  let performance: string, performanceColor: string, performanceText: string;
  if (totalOrders >= 15) [performance, performanceColor, performanceText] = ["excellent", COLORS.success, "Excellent"];
  else if (totalOrders >= 8) [performance, performanceColor, performanceText] = ["good", COLORS.success, "Strong"];
  else if (totalOrders >= 5) [performance, performanceColor, performanceText] = ["moderate", COLORS.primary, "Moderate"];
  else if (totalOrders >= 1) [performance, performanceColor, performanceText] = ["low", COLORS.warning, "Low Activity"];
  else[performance, performanceColor, performanceText] = ["critical", COLORS.error, "Critical"];

  let trend: string, trendColor: string, trendText: string;
  if (growthRate > 20) [trend, trendColor, trendText] = ["up-strong", COLORS.success, `Accelerating (+${growthRate.toFixed(1)}%)`];
  else if (growthRate > 5) [trend, trendColor, trendText] = ["up", COLORS.success, `Growing (+${growthRate.toFixed(1)}%)`];
  else if (growthRate > -5) [trend, trendColor, trendText] = ["neutral", COLORS.gray, `Stable (${growthRate.toFixed(1)}%)`];
  else if (growthRate > -15) [trend, trendColor, trendText] = ["down", COLORS.warning, `Slowing (${growthRate.toFixed(1)}%)`];
  else[trend, trendColor, trendText] = ["down-critical", COLORS.error, `Declining (${growthRate.toFixed(1)}%)`];

  const insights: { type: string; text: string }[] = [];
  if (totalOrders > 0) {
    if (avgOrderValue > 2000) insights.push({ type: "positive", text: `Excellent avg: Ksh ${avgOrderValue.toFixed(0)}` });
    else if (avgOrderValue < 400) insights.push({ type: "warning", text: `Low avg: Ksh ${avgOrderValue.toFixed(0)} — consider upselling` });
  }
  if (chartData?.data?.summary?.peak_period) {
    const peak = chartData.data.summary.peak_period;
    insights.push({ type: "positive", text: `Peak: ${peak.time} (Ksh ${peak.sales?.toLocaleString()})` });
  }

  return { trend, trendText, trendColor, insights, performance, performanceColor, performanceText, avgOrderValue };
};

// ── Table columns ─────────────────────────────────────────────────────────────
const createOrderColumns = (isMobile: boolean, hospital: boolean) =>
  isMobile
    ? [
      { title: hospital ? "Bill No" : "Order No", dataIndex: "order_no", key: "order_no", width: 100 },
      {
        title: "Amount",
        dataIndex: "order_amount",
        key: "order_amount",
        render: (amount: number) => (
          <Text strong style={{ color: COLORS.success, fontSize: 12 }}>Ksh {amount?.toFixed(2)}</Text>
        ),
      },
      { title: hospital ? "Ward/Bed" : "Table", dataIndex: "table", key: "table", width: 70 },
    ]
    : [
      { title: hospital ? "Bill No" : "Order No", dataIndex: "order_no", key: "order_no", width: 120 },
      { title: hospital ? "Ward/Bed" : "Table", dataIndex: "table", key: "table", width: 80 },
      {
        title: "Amount",
        dataIndex: "order_amount",
        key: "order_amount",
        width: 120,
        render: (amount: number) => (
          <Text strong style={{ color: COLORS.success }}>Ksh {amount?.toFixed(2)}</Text>
        ),
      },
      { title: hospital ? "Attended By" : "Served By", dataIndex: "servedBy", key: "servedBy", ellipsis: true },
    ];

const createStockColumns = (isMobile: boolean, hospital: boolean) =>
  isMobile
    ? [
      { title: hospital ? "Medicine/Item" : "Item", dataIndex: "name", key: "name", ellipsis: true },
      {
        title: "Qty",
        dataIndex: "quantity",
        key: "quantity",
        width: 60,
        render: (quantity: number) => (
          <Text style={{ color: quantity <= 0 ? COLORS.error : COLORS.warning, fontWeight: 600 }}>{quantity}</Text>
        ),
      },
      {
        title: "Status",
        key: "status",
        width: 80,
        render: (_: any, record: any) => (
          <Badge status={record.quantity <= 0 ? "error" : "warning"} text={record.quantity <= 0 ? "Out" : "Low"} />
        ),
      },
    ]
    : [
      { title: hospital ? "Medicine / Item" : "Item Name", dataIndex: "name", key: "name", ellipsis: true },
      {
        title: "Current",
        dataIndex: "quantity",
        key: "quantity",
        width: 80,
        render: (quantity: number) => (
          <Text style={{ color: quantity <= 0 ? COLORS.error : COLORS.warning, fontWeight: 600 }}>{quantity}</Text>
        ),
      },
      { title: "Min Required", dataIndex: "min_viable_quantity", key: "min_viable_quantity", width: 100 },
      {
        title: "Status",
        key: "status",
        width: 120,
        render: (_: any, record: any) => {
          const isOutOfStock = record.quantity <= 0;
          return (
            <Badge
              status={isOutOfStock ? "error" : "warning"}
              text={isOutOfStock ? (hospital ? "Out of stock" : "Out of stock") : `${record.quantity} left`}
            />
          );
        },
      },
    ];

const createBestSellerColumns = (isMobile: boolean, hospital: boolean) =>
  isMobile
    ? [
      {
        title: "#", dataIndex: "rank", key: "rank", width: 40,
        render: (rank: number) =>
          rank <= 3 ? (
            <TrophyOutlined style={{ color: rank === 1 ? "#ffd700" : rank === 2 ? "#c0c0c0" : "#cd7f32", fontSize: 16 }} />
          ) : (
            <span style={{ fontWeight: 600, color: COLORS.primary, fontSize: 12 }}>#{rank}</span>
          ),
      },
      {
        title: hospital ? "Service / Medicine" : "Product",
        dataIndex: "name",
        key: "name",
        render: (name: string, record: any) => (
          <div>
            <div style={{ fontWeight: 500, fontSize: 13, color: COLORS.text }}>{name}</div>
            <div style={{ fontSize: 11, color: COLORS.gray }}>{record.sales_metrics.order_count} {hospital ? "visits" : "orders"}</div>
          </div>
        ),
      },
      {
        title: "Revenue",
        dataIndex: ["sales_metrics", "total_revenue"],
        key: "revenue",
        render: (revenue: number) => (
          <Text style={{ fontWeight: 600, color: COLORS.primary, fontSize: 12 }}>Ksh {revenue?.toLocaleString()}</Text>
        ),
      },
    ]
    : [
      {
        title: "Rank", dataIndex: "rank", key: "rank", width: 60,
        render: (rank: number) => (
          <div style={{ textAlign: "center" }}>
            {rank <= 3 ? (
              <TrophyOutlined style={{ color: rank === 1 ? "#ffd700" : rank === 2 ? "#c0c0c0" : "#cd7f32", fontSize: rank === 1 ? 18 : 16 }} />
            ) : (
              <span style={{ fontWeight: 600, color: COLORS.primary }}>#{rank}</span>
            )}
          </div>
        ),
      },
      {
        title: hospital ? "Service / Medicine" : "Product",
        dataIndex: "name",
        key: "name",
        render: (name: string, record: any) => (
          <div>
            <div style={{ fontWeight: 500, marginBottom: 2, color: COLORS.text }}>{name}</div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>
              {record.category?.name || "Uncategorized"} • {record.product_type}
            </div>
          </div>
        ),
      },
      {
        title: hospital ? "Dispensed" : "Sales",
        dataIndex: ["sales_metrics", "total_quantity_sold"],
        key: "quantity_sold",
        sorter: (a: any, b: any) => a.sales_metrics.total_quantity_sold - b.sales_metrics.total_quantity_sold,
        render: (quantity: number, record: any) => (
          <div>
            <div style={{ fontWeight: 600, color: COLORS.success }}>{quantity} {hospital ? "units" : "units"}</div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>{record.sales_metrics.order_count} {hospital ? "visits" : "orders"}</div>
          </div>
        ),
      },
      {
        title: "Revenue",
        dataIndex: ["sales_metrics", "total_revenue"],
        key: "revenue",
        sorter: (a: any, b: any) => a.sales_metrics.total_revenue - b.sales_metrics.total_revenue,
        render: (revenue: number, record: any) => (
          <div>
            <div style={{ fontWeight: 600, color: COLORS.primary }}>Ksh {revenue?.toLocaleString()}</div>
            {record.sales_metrics?.total_profit && (
              <div style={{ fontSize: 12, color: COLORS.success }}>Profit: Ksh {record.sales_metrics.total_profit.toLocaleString()}</div>
            )}
          </div>
        ),
      },
      {
        title: "Performance", key: "performance",
        render: (_: any, record: any) => (
          <div>
            <Tag style={{
              background: record.performance_indicators?.is_top_performer ? "#fef9c3" : "#eff6ff",
              color: record.performance_indicators?.is_top_performer ? "#a16207" : "#1d4ed8",
              border: "none", fontSize: 11, borderRadius: 4,
            }}>
              {record.performance_indicators?.is_top_performer ? "⭐ Top" : hospital ? "Frequently Used" : "Popular"}
            </Tag>
            <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 4 }}>
              {record.performance_indicators?.avg_quantity_per_order?.toFixed(1)}/{hospital ? "visit" : "order"}
            </div>
          </div>
        ),
      },
    ];

const createPOColumns = (isMobile: boolean, hospital: boolean) =>
  isMobile
    ? [
      { title: "PO#", dataIndex: "po_number", key: "po_number", width: 90 },
      {
        title: "Status", dataIndex: "status", key: "status",
        render: (status: string) => {
          const colors: Record<string, string> = {
            pending: COLORS.warning, approved: COLORS.primary,
            fully_delivered: COLORS.success, cancelled: COLORS.error,
          };
          return (
            <Badge color={colors[status] || COLORS.gray} text={<span style={{ fontSize: 11 }}>{status?.replace(/_/g, " ")}</span>} />
          );
        },
      },
      {
        title: "Amount", dataIndex: "total_amount", key: "total_amount",
        render: (amount: number) => (
          <Text style={{ fontWeight: 600, color: COLORS.primary, fontSize: 12 }}>Ksh {amount?.toLocaleString()}</Text>
        ),
      },
    ]
    : [
      { title: "PO Number", dataIndex: "po_number", key: "po_number", width: 120 },
      { title: hospital ? "Supplier / Vendor" : "Supplier", dataIndex: ["supplier_id", "name"], key: "supplier_name", ellipsis: true },
      {
        title: "Status", dataIndex: "status", key: "status", width: 140,
        render: (status: string) => {
          const colors: Record<string, string> = {
            pending: COLORS.warning, approved: COLORS.primary,
            partially_delivered: COLORS.cyan, fully_delivered: COLORS.success, cancelled: COLORS.error,
          };
          return (
            <Tag style={{
              background: `${colors[status] || COLORS.gray}15`, color: colors[status] || COLORS.gray,
              border: "none", fontSize: 11, borderRadius: 4,
            }}>
              {status?.replace(/_/g, " ").toUpperCase()}
            </Tag>
          );
        },
      },
      {
        title: "Amount", dataIndex: "total_amount", key: "total_amount", width: 120,
        render: (amount: number) => (
          <Text strong style={{ color: COLORS.primary }}>Ksh {amount?.toLocaleString()}</Text>
        ),
      },
    ];

// ── SalesChart ─────────────────────────────────────────────────────────────────
const SalesChart: React.FC<{
  data: any[]; loading: boolean; title: string; businessIndicators: any;
}> = ({ data, loading, title, businessIndicators }) => {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.map((item) => ({
      ...item,
      sales: Number(item.sales) || 0,
      orders: Number(item.orders) || 0,
      avgOrderValue: Number(item.avgOrderValue) || 0,
      cumulativeSales: Number(item.cumulativeSales) || 0,
    }));
  }, [data]);

  const hospital = isHospitalMode();

  const config = useMemo(() => ({
    data: chartData,
    xField: "time",
    yField: "sales",
    height: 260,
    smooth: true,
    lineStyle: { stroke: COLORS.primary, lineWidth: 2.5 },
    point: { size: 4, style: { fill: COLORS.primary, stroke: "#fff", lineWidth: 2 } },
    tooltip: {
      formatter: (datum: any) => [
        { name: "Revenue", value: `Ksh ${Number(datum.sales)?.toLocaleString()}` },
        { name: hospital ? "Visits" : "Orders", value: `${datum.orders}` },
        { name: "Avg", value: `Ksh ${Number(datum.avgOrderValue)?.toLocaleString()}` },
        { name: "Cumulative", value: `Ksh ${Number(datum.cumulativeSales)?.toLocaleString()}` },
      ],
    },
    xAxis: {
      label: { style: { fill: COLORS.gray, fontSize: 11 }, autoRotate: true },
      line: { style: { stroke: "#e2e8f0" } },
    },
    yAxis: {
      label: {
        style: { fill: COLORS.gray, fontSize: 11 },
        formatter: (value: string) => {
          const n = Number(value);
          if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
          if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
          return `${n}`;
        },
      },
      min: 0,
      grid: { line: { style: { stroke: "#f1f5f9", lineWidth: 1, lineDash: [3, 3] } } },
    },
    animation: { appear: { animation: "path-in", duration: 1000 } },
  }), [chartData, hospital]);

  return (
    <ProCard
      bordered headerBordered size="small"
      title={
        <Space size={6}>
          <LineChartOutlined style={{ color: COLORS.primary }} />
          <Text strong style={{ fontSize: 14 }}>{title}</Text>
        </Space>
      }
      extra={
        businessIndicators && (
          <Space size={4}>
            <Badge status={
              businessIndicators.performance === "excellent" ? "success"
                : businessIndicators.performance === "good" ? "processing"
                  : businessIndicators.performance === "moderate" ? "default"
                    : businessIndicators.performance === "low" ? "warning" : "error"
            } />
            <Text style={{ color: businessIndicators.performanceColor, fontWeight: 600, fontSize: 12 }}>
              {businessIndicators.performanceText}
            </Text>
          </Space>
        )
      }
      style={{ borderRadius: 12, marginBottom: 16 }}
      bodyStyle={{ paddingTop: 8 }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          {businessIndicators?.insights?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Space wrap size={[6, 4]}>
                {businessIndicators.insights.map((insight: any, index: number) => (
                  <div key={index} style={{
                    background: insight.type === "positive" ? "#f0fdf4" : insight.type === "warning" ? "#fffbeb" : "#fef2f2",
                    borderRadius: 6, padding: "3px 10px", fontSize: 11,
                    color: insight.type === "positive" ? COLORS.success : insight.type === "warning" ? COLORS.warning : COLORS.error,
                  }}>
                    {insight.text}
                  </div>
                ))}
              </Space>
              <Divider style={{ margin: "10px 0" }} />
            </div>
          )}
          {chartData.length > 0 ? <Line {...config} /> : <Empty description="No chart data available" />}
        </>
      )}
    </ProCard>
  );
};

// ── BestSellersCard ───────────────────────────────────────────────────────────
const BestSellersCard: React.FC<{
  bestSellersData: any; loading: boolean; dateRange: string; isMobile: boolean;
}> = ({ bestSellersData, loading, dateRange, isMobile }) => {
  const hospital = isHospitalMode();

  const bestSellers = useMemo(() => {
    if (!bestSellersData?.data?.best_sellers?.length) return [];
    return bestSellersData.data.best_sellers.map((item: any, index: number) => ({ ...item, rank: index + 1 }));
  }, [bestSellersData]);

  const summary = bestSellersData?.data?.summary || {};
  const cardTitle = hospital ? `Top Services & Medicines (${dateRange})` : `Top Selling Products (${dateRange})`;

  if (!bestSellers.length && !loading) {
    return (
      <ProCard bordered headerBordered size="small"
        title={<Space size={6}><FireOutlined style={{ color: COLORS.orange }} /><Text strong style={{ fontSize: 14 }}>{cardTitle}</Text></Space>}
        style={{ borderRadius: 12 }}
      >
        <Empty description={hospital ? "No services or medicines dispensed in this period." : "No products sold in this period."} style={{ padding: "24px 0" }} />
      </ProCard>
    );
  }

  return (
    <ProCard bordered headerBordered size="small"
      title={<Space size={6}>{hospital ? <MedicineBoxOutlined style={{ color: COLORS.orange }} /> : <FireOutlined style={{ color: COLORS.orange }} />}<Text strong style={{ fontSize: 14 }}>{cardTitle}</Text></Space>}
      extra={
        summary.total_products_analyzed > 0 && (
          <Space size={4}>
            <Badge count={summary.total_products_analyzed} style={{ backgroundColor: COLORS.primary }} />
            <Text type="secondary" style={{ fontSize: 11 }}>analyzed</Text>
          </Space>
        )
      }
      style={{ borderRadius: 12 }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          {summary.total_revenue > 0 && (
            <div style={{
              marginBottom: 16, padding: "12px 16px", background: "#f8fafc",
              borderRadius: 8, display: "flex", gap: 24, flexWrap: "wrap", border: "1px solid #e2e8f0",
            }}>
              {[
                { label: "Total Revenue", value: `Ksh ${fmtK(summary.total_revenue)}`, color: COLORS.success },
                { label: hospital ? "Units Dispensed" : "Units Sold", value: summary.total_quantity_sold, color: COLORS.primary },
                { label: hospital ? "Avg Bill" : "Avg Order", value: `Ksh ${fmtK(summary.average_order_value)}`, color: COLORS.orange },
              ].map((s, i) => (
                <div key={i}>
                  <Text style={{ fontSize: 10, color: COLORS.gray, display: "block" }}>{s.label}</Text>
                  <Text strong style={{ fontSize: 14, color: s.color }}>{s.value}</Text>
                </div>
              ))}
            </div>
          )}
          <Table
            columns={createBestSellerColumns(isMobile, hospital)}
            dataSource={bestSellers}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            size="small"
            rowKey="product_id"
            scroll={{ x: isMobile ? 380 : 800 }}
          />
        </>
      )}
    </ProCard>
  );
};

// ── MetricTile ────────────────────────────────────────────────────────────────
const MetricTile: React.FC<{ value: any; label: string; color: string; isMobile: boolean }> = ({
  value, label, color, isMobile,
}) => (
  <Col xs={12} sm={6}>
    <div style={{
      textAlign: "center", padding: isMobile ? "10px 6px" : "16px 12px",
      background: "#f8fafc", borderRadius: 8, borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color, marginBottom: 4, wordBreak: "break-word" }}>
        {value}
      </div>
      <div style={{ color: COLORS.gray, fontSize: isMobile ? 11 : 12 }}>{label}</div>
    </div>
  </Col>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const hospital = isHospitalMode();
  const [messageApi, contextHolder] = message.useMessage();
  const [periodFilter, setPeriodFilter] = useState("day");
  const [customDateRange, setCustomDateRange] = useState<any[]>([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const shopId = localStorage.getItem("shopId");

  const getDateRange = useCallback(() => {
    const today = dayjs();
    let startDate: dayjs.Dayjs, endDate: dayjs.Dayjs;
    switch (periodFilter) {
      case "day": startDate = today.startOf("day"); endDate = today.endOf("day"); break;
      case "week": startDate = today.startOf("week"); endDate = today.endOf("week"); break;
      case "month": startDate = today.startOf("month"); endDate = today.endOf("month"); break;
      case "year": startDate = today.startOf("year"); endDate = today.endOf("year"); break;
      case "custom":
        if (customDateRange?.length === 2) {
          startDate = customDateRange[0].startOf("day"); endDate = customDateRange[1].endOf("day");
        } else {
          startDate = today.startOf("day"); endDate = today.endOf("day");
        }
        break;
      default: startDate = today.startOf("day"); endDate = today.endOf("day");
    }
    return { startDate, endDate };
  }, [periodFilter, customDateRange]);

  const { startDate, endDate } = getDateRange();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["dashBoardAnalysis", startDate.format(), endDate.format()],
    queryFn: () => getDashboardAnalysis(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')),
    networkMode: "always",
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 2,
    onError: () => {
      notification.error({ message: "Failed to fetch dashboard data.", duration: 3, placement: "bottomRight" });
    },
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["salesChartData", periodFilter, startDate.format(), endDate.format(), shopId],
    queryFn: () => getSalesChartData({ period: periodFilter, startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD'), shop_id: shopId }),
    networkMode: "always", refetchOnWindowFocus: false, staleTime: 30000, retry: 2,
  });

  const { data: bestSellersData, isLoading: bestSellersLoading } = useQuery({
    queryKey: ["bestSellers", startDate.format(), endDate.format(), shopId],
    queryFn: () => getBestSellers({ startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD'), shop_id: shopId, limit: 10 }),
    networkMode: "always", refetchOnWindowFocus: false, staleTime: 30000, retry: 2,
  });

  const purchaseOrderStats = useMemo(() => {
    if (!data?.purchaseOrderStats) return { totalPurchaseOrders: 0, totalPOValue: 0, pendingPOs: 0, approvedPOs: 0, deliveredPOs: 0, avgPOValue: 0, recentPurchaseOrders: [] };
    return data.purchaseOrderStats;
  }, [data]);

  const handleRefresh = useCallback(async () => {
    try { await refetch(); messageApi.success({ content: "Dashboard refreshed!", duration: 2 }); }
    catch { messageApi.error({ content: "Refresh failed.", duration: 3 }); }
  }, [refetch, messageApi]);

  const handlePeriodChange = useCallback((value: string) => {
    setPeriodFilter(value);
    setShowCustomDatePicker(value === "custom");
    if (isMobile) setFilterDrawerOpen(false);
  }, [isMobile]);

  const handleCopyStaffUrl = useCallback(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const staffUrl = `${import.meta.env.VITE_APP_URL}/admin/staff-clock-in?tenant_id=${tenant?._id}&shop_id=${shopId}`;
    navigator.clipboard.writeText(staffUrl)
      .then(() => messageApi.success({ content: "Staff URL copied!", duration: 2 }))
      .catch(() => messageApi.error({ content: "Failed to copy URL", duration: 2 }));
  }, [messageApi, shopId]);

  const handleCopyCustomerUrl = useCallback(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const url = `${import.meta.env.VITE_APP_URL}/admin/customers?tenant_id=${tenant?._id}&shop_id=${shopId}`;
    navigator.clipboard.writeText(url)
      .then(() => messageApi.success({ content: hospital ? "Patient URL copied!" : "Customer URL copied!", duration: 2 }))
      .catch(() => messageApi.error({ content: "Failed to copy URL", duration: 2 }));
  }, [messageApi, shopId, hospital]);

  const getFormattedDateRange = useCallback(() => {
    const fmt = "MMM D, YYYY";
    switch (periodFilter) {
      case "day": return startDate.format("MMM D, YYYY");
      case "week": return `${startDate.format(fmt)} – ${endDate.format(fmt)}`;
      case "month": return startDate.format("MMMM YYYY");
      case "year": return startDate.format("YYYY");
      case "custom":
        if (customDateRange?.length === 2) return `${customDateRange[0].format(fmt)} – ${customDateRange[1].format(fmt)}`;
        return "Custom Range";
      default: return startDate.format("MMM D, YYYY");
    }
  }, [periodFilter, startDate, endDate, customDateRange]);

  const growthRate = chartData?.data?.summary?.growth_rate || 0;
  const businessIndicators = useMemo(() => calculateBusinessIndicators(chartData, data, periodFilter), [chartData, data, periodFilter]);
  const isDataLoading = isLoading || isRefetching || chartLoading;

  const kpiCards = useMemo(() => [
    {
      title: hospital
        ? (periodFilter === "day" ? "Today's Visits" : "Total Visits")
        : (periodFilter === "day" ? "Today's Orders" : "Total Orders"),
      value: chartData?.data?.summary?.total_orders || data?.totalOrderCount || 0,
      icon: hospital ? <MedicineBoxOutlined /> : <ShoppingCartOutlined />,
      color: "#3b82f6", bg: "#eff6ff",
      pctChange: growthRate || null,
      prefix: "",
      onClick: () => navigate("/orders"),
    },
    {
      title: "Total Revenue",
      value: chartData?.data?.summary?.total_sales || data?.todayRevenue || 0,
      icon: <DollarOutlined />, color: COLORS.success, bg: "#f0fdf4",
      pctChange: null, prefix: "Ksh",
    },
    {
      title: hospital ? "Active Patients" : "Active Orders",
      value: data?.activeOrders || 0,
      icon: hospital ? <MedicineBoxOutlined /> : <SnippetsOutlined />,
      color: COLORS.orange, bg: "#fff7ed",
      pctChange: null, prefix: "",
    },
    {
      title: "Active Shifts",
      value: data?.activeShift || 0,
      icon: <TeamOutlined />, color: COLORS.cyan, bg: "#ecfeff",
      pctChange: null, prefix: "",
    },
  ], [chartData, data, growthRate, navigate, periodFilter, hospital]);

  return (
    <>
      {contextHolder}

      {/* ── Mobile filter drawer ── */}
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
          {showCustomDatePicker && (
            <RangePicker value={customDateRange as any} onChange={(d) => setCustomDateRange(d || [])} allowClear style={{ width: "100%" }} />
          )}
        </Space>
      </Drawer>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <Flex justify="space-between" align="flex-start" wrap gap={12}>
          <Space align="center" size={10}>
            <div style={{ background: hospital ? "#f0fdf4" : "#fff7ed", borderRadius: 10, padding: "8px 10px", color: hospital ? COLORS.success : COLORS.orange, fontSize: 18 }}>
              {hospital ? <MedicineBoxOutlined /> : <ShopOutlined />}
            </div>
            <div>
              <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: COLORS.text }}>
                {PERIOD_LABELS[periodFilter]} {hospital ? "Hospital Overview" : "Shop Overview"}
              </Title>
              <Text style={{ fontSize: 12, color: COLORS.subtext }}>
                {getFormattedDateRange()} · {hospital ? "Individual Branch Performance" : "Individual Shop Performance"}
              </Text>
            </div>
          </Space>

          <Space size="small" wrap>
            {isMobile ? (
              <>
                <Button icon={<FilterOutlined />} onClick={() => setFilterDrawerOpen(true)} size="middle">
                  {PERIOD_LABELS[periodFilter]}
                </Button>
                <Tooltip title="Copy Staff Clock-In URL">
                  <Button icon={<TeamOutlined />} onClick={handleCopyStaffUrl} size="middle" />
                </Tooltip>
                <Tooltip title={hospital ? "Copy Patient Portal URL" : "Copy Customer Order URL"}>
                  <Button icon={<ShoppingCartOutlined />} onClick={handleCopyCustomerUrl} size="middle" />
                </Tooltip>
                <Button type="primary" icon={<ReloadOutlined spin={isRefetching} />} onClick={handleRefresh} loading={isDataLoading} size="middle" />
              </>
            ) : (
              <>
                <div style={{
                  background: "#f8fafc", borderRadius: 8, padding: "6px 12px",
                  display: "flex", alignItems: "center", gap: 10, border: "1px solid #e2e8f0",
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
                {showCustomDatePicker && (
                  <RangePicker value={customDateRange as any} onChange={(d) => setCustomDateRange(d || [])} allowClear style={{ minWidth: 260 }} />
                )}
                <Tooltip title="Share with staff to allow clock-in for this branch">
                  <Button icon={<TeamOutlined />} onClick={handleCopyStaffUrl} style={{ fontWeight: 500 }}>
                    Staff Clock-In URL
                  </Button>
                </Tooltip>
                <Tooltip title={hospital ? "Share patient portal link" : "Share with customers to allow ordering"}>
                  <Button icon={<ShoppingCartOutlined />} onClick={handleCopyCustomerUrl} style={{ fontWeight: 500 }}>
                    {hospital ? "Patient Portal URL" : "Customer Order URL"}
                  </Button>
                </Tooltip>
                <Button type="primary" icon={<ReloadOutlined spin={isRefetching} />} onClick={handleRefresh} loading={isDataLoading} style={{ fontWeight: 500 }}>
                  {isRefetching ? "Refreshing..." : "Refresh"}
                </Button>
              </>
            )}
          </Space>
        </Flex>
      </div>

      {/* ── KPI Cards ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {kpiCards.map((card, i) => <KPICard key={i} loading={isDataLoading} {...card} />)}
      </Row>

      {/* ── Purchase Orders Overview ── */}
      <Row style={{ marginBottom: 16 }}>
        <Col span={24}>
          <ProCard bordered headerBordered size="small"
            title={
              <Space size={6}>
                <FileTextOutlined style={{ color: COLORS.purple }} />
                <Text strong style={{ fontSize: 14 }}>{hospital ? "Pharmacy Purchase Orders" : "Purchase Orders"}</Text>
              </Space>
            }
            extra={<Button type="link" size="small" onClick={() => navigate("/purchase-orders")}>View All</Button>}
            style={{ borderRadius: 12 }}
          >
            {isDataLoading ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : (
              <Row gutter={[8, 8]}>
                {[
                  { value: purchaseOrderStats.totalPurchaseOrders, label: "Total POs", color: COLORS.purple, bg: "#eef2ff" },
                  { value: `Ksh ${fmtK(purchaseOrderStats.totalPOValue || 0)}`, label: "Total Value", color: COLORS.success, bg: "#f0fdf4" },
                  { value: purchaseOrderStats.pendingPOs, label: "Pending", color: COLORS.warning, bg: "#fffbeb" },
                  { value: purchaseOrderStats.deliveredPOs, label: "Delivered", color: COLORS.cyan, bg: "#ecfeff" },
                ].map((item, index) => (
                  <Col xs={12} sm={12} md={6} key={index}>
                    <div style={{ textAlign: "center", padding: isMobile ? "10px 6px" : "14px 12px", background: item.bg, borderRadius: 8 }}>
                      <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: item.color, marginBottom: 2 }}>{item.value}</div>
                      <div style={{ color: COLORS.gray, fontSize: 12 }}>{item.label}</div>
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </ProCard>
        </Col>
      </Row>

      {/* ── Sales Chart ── */}
      <Row style={{ marginBottom: 16 }}>
        <Col span={24}>
          {chartData?.data?.chart_data?.length > 0 ? (
            <SalesChart
              data={chartData.data.chart_data}
              loading={chartLoading}
              title={`${hospital ? "Revenue Trend" : "Sales Trend"} — ${getFormattedDateRange()}`}
              businessIndicators={businessIndicators}
            />
          ) : (
            <ProCard bordered headerBordered size="small"
              title={<Space size={6}><LineChartOutlined style={{ color: COLORS.primary }} /><Text strong style={{ fontSize: 14 }}>{hospital ? "Revenue" : "Sales"} Trend — {getFormattedDateRange()}</Text></Space>}
              style={{ borderRadius: 12 }} bodyStyle={{ paddingTop: 8 }}
            >
              {chartLoading ? <Skeleton active paragraph={{ rows: 5 }} /> : (
                <Empty description={<Text type="secondary">No {hospital ? "billing" : "sales"} data for {PERIOD_LABELS[periodFilter]?.toLowerCase()}.</Text>} style={{ padding: "32px 0" }} />
              )}
            </ProCard>
          )}
        </Col>
      </Row>

      {/* ── Best Sellers ── */}
      <Row style={{ marginBottom: 16 }}>
        <Col span={24}>
          <BestSellersCard bestSellersData={bestSellersData} loading={bestSellersLoading} dateRange={getFormattedDateRange()} isMobile={isMobile} />
        </Col>
      </Row>

      {/* ── Recent Orders + Low Stock ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <ProCard bordered headerBordered size="small"
            title={
              <Space size={6}>
                {hospital ? <MedicineBoxOutlined style={{ color: "#3b82f6" }} /> : <ShoppingCartOutlined style={{ color: "#3b82f6" }} />}
                <Text strong style={{ fontSize: 14 }}>{hospital ? "Recent Patient Bills" : "Recent Orders"}</Text>
              </Space>
            }
            extra={
              <Space size={4}>
                <Badge count={data?.totalOrderCount || 0} style={{ backgroundColor: "#3b82f6" }} />
                <Button type="link" size="small" onClick={() => navigate("/orders")}>All</Button>
              </Space>
            }
            style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}
          >
            {isDataLoading ? (
              <div style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 4 }} /></div>
            ) : (
              <Table
                columns={createOrderColumns(isMobile, hospital)}
                dataSource={Array.isArray(data?.currentOrders) ? data.currentOrders : []}
                pagination={{ pageSize: 5, hideOnSinglePage: true, showSizeChanger: false }}
                size="small"
                scroll={{ x: isMobile ? 300 : undefined }}
                locale={{ emptyText: <Empty description={hospital ? "No patient bills yet" : "No recent orders"} style={{ padding: 20 }} /> }}
              />
            )}
          </ProCard>
        </Col>

        <Col xs={24} lg={12}>
          <ProCard bordered headerBordered size="small"
            title={
              <Space size={6}>
                <WarningOutlined style={{ color: COLORS.error }} />
                <Text strong style={{ fontSize: 14 }}>{hospital ? "Low Pharmacy Stock" : "Low Stock Alerts"}</Text>
              </Space>
            }
            extra={
              <Space size={4}>
                {(data?.lowStockItems?.length || 0) > 0 && (
                  <Badge count={data.lowStockItems.length} style={{ backgroundColor: COLORS.error }} />
                )}
                <Button type="link" size="small" onClick={() => navigate("/inventory")}>All</Button>
              </Space>
            }
            style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}
          >
            {isDataLoading ? (
              <div style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 4 }} /></div>
            ) : (
              <Table
                columns={createStockColumns(isMobile, hospital)}
                dataSource={Array.isArray(data?.lowStockItems) ? data.lowStockItems : []}
                pagination={{ pageSize: 5, hideOnSinglePage: true, showSizeChanger: false }}
                size="small"
                scroll={{ x: isMobile ? 280 : undefined }}
                locale={{
                  emptyText: (
                    <Empty
                      image={<CheckCircleOutlined style={{ fontSize: 28, color: COLORS.success }} />}
                      description={hospital ? "Pharmacy fully stocked" : "All items are well stocked"}
                      style={{ padding: 20 }}
                    />
                  ),
                }}
              />
            )}
          </ProCard>
        </Col>
      </Row>

      {/* ── Recent POs ── */}
      <Row style={{ marginBottom: 16 }}>
        <Col span={24}>
          <ProCard bordered headerBordered size="small"
            title={
              <Space size={6}>
                <FileTextOutlined style={{ color: COLORS.purple }} />
                <Text strong style={{ fontSize: 14 }}>{hospital ? "Recent Pharmacy POs" : "Recent Purchase Orders"}</Text>
              </Space>
            }
            extra={
              <Space size={4}>
                {purchaseOrderStats.totalPurchaseOrders > 0 && (
                  <Badge count={purchaseOrderStats.totalPurchaseOrders} style={{ backgroundColor: COLORS.purple }} />
                )}
                <Button type="link" size="small" onClick={() => navigate("/purchase-orders")}>All</Button>
              </Space>
            }
            style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}
          >
            {isDataLoading ? (
              <div style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 4 }} /></div>
            ) : (
              <Table
                columns={createPOColumns(isMobile, hospital)}
                dataSource={purchaseOrderStats.recentPurchaseOrders || []}
                pagination={{ pageSize: 5, hideOnSinglePage: true, showSizeChanger: false }}
                size="small" rowKey="_id"
                scroll={{ x: isMobile ? 300 : undefined }}
                locale={{ emptyText: <Empty description={hospital ? "No pharmacy purchase orders" : "No recent purchase orders"} style={{ padding: 20 }} /> }}
              />
            )}
          </ProCard>
        </Col>
      </Row>

      {/* ── PO Insights ── */}
      <Row style={{ marginBottom: 16 }}>
        <Col span={24}>
          <ProCard bordered headerBordered size="small"
            title={
              <Space size={6}>
                <SyncOutlined style={{ color: COLORS.cyan }} />
                <Text strong style={{ fontSize: 14 }}>{hospital ? "Pharmacy PO Insights" : "Purchase Order Insights"}</Text>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            {isDataLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : purchaseOrderStats.totalPurchaseOrders > 0 ? (
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {[
                  {
                    label: "Delivery Rate",
                    value: `${((purchaseOrderStats.deliveredPOs / purchaseOrderStats.totalPurchaseOrders) * 100).toFixed(1)}%`,
                    percent: Number(((purchaseOrderStats.deliveredPOs / purchaseOrderStats.totalPurchaseOrders) * 100).toFixed(1)),
                    color: COLORS.success,
                  },
                  {
                    label: "Pending Rate",
                    value: `${purchaseOrderStats.pendingPOs} orders`,
                    percent: Math.round((purchaseOrderStats.pendingPOs / purchaseOrderStats.totalPurchaseOrders) * 100),
                    color: COLORS.warning,
                  },
                ].map((item, i) => (
                  <div key={i}>
                    <Flex justify="space-between" style={{ marginBottom: 5 }}>
                      <Text style={{ fontSize: 12, color: COLORS.subtext }}>{item.label}</Text>
                      <Text strong style={{ fontSize: 12, color: item.color }}>{item.value}</Text>
                    </Flex>
                    <Progress percent={item.percent} strokeColor={item.color} size="small" showInfo={false} />
                  </div>
                ))}
                <Divider style={{ margin: "6px 0" }} />
                <Row gutter={8}>
                  {[
                    { value: `Ksh ${fmtK(purchaseOrderStats.avgPOValue || 0)}`, label: "Avg PO Value", color: COLORS.purple },
                    { value: purchaseOrderStats.approvedPOs, label: "Approved", color: "#3b82f6" },
                  ].map((item, i) => (
                    <Col span={12} key={i}>
                      <div style={{ textAlign: "center", background: "#f8fafc", borderRadius: 8, padding: "10px 8px" }}>
                        <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: item.color }}>{item.value}</div>
                        <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{item.label}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Space>
            ) : (
              <Empty description={hospital ? "No pharmacy purchase orders found" : "No purchase orders found"} style={{ padding: "24px 0" }} />
            )}
          </ProCard>
        </Col>
      </Row>

      {/* ── Performance Summary ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <ProCard bordered headerBordered size="small"
            title={
              <Space size={6}>
                <PieChartOutlined style={{ color: COLORS.purple }} />
                <Text strong style={{ fontSize: 14 }}>{hospital ? "Branch" : "Shop"} Performance Summary — {getFormattedDateRange()}</Text>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            {isDataLoading ? <Skeleton active paragraph={{ rows: 2 }} /> : (
              <Row gutter={[8, 8]}>
                <MetricTile value={data?.totalOrderCount || 0} label={hospital ? "Total Visits" : "Total Orders"} color="#3b82f6" isMobile={isMobile} />
                <MetricTile value={`Ksh ${fmtK(data?.todayRevenue || 0)}`} label="Revenue" color={COLORS.success} isMobile={isMobile} />
                <MetricTile value={data?.activeOrders || 0} label={hospital ? "Active Patients" : "Active Orders"} color={COLORS.orange} isMobile={isMobile} />
                <MetricTile value={data?.activeShift || 0} label="Active Shifts" color={COLORS.cyan} isMobile={isMobile} />
              </Row>
            )}
          </ProCard>
        </Col>

        {chartData?.data?.summary && (
          <Col span={24}>
            <ProCard bordered headerBordered size="small"
              title={<Space size={6}><RiseOutlined style={{ color: COLORS.success }} /><Text strong style={{ fontSize: 14 }}>Advanced {hospital ? "Branch" : "Shop"} Metrics</Text></Space>}
              style={{ borderRadius: 12 }}
            >
              <Row gutter={[8, 8]}>
                <MetricTile value={chartData.data.summary.data_points} label="Data Points" color="#3b82f6" isMobile={isMobile} />
                <MetricTile
                  value={`${chartData.data.summary.growth_rate > 0 ? "+" : ""}${chartData.data.summary.growth_rate.toFixed(1)}%`}
                  label="Growth"
                  color={chartData.data.summary.growth_rate >= 0 ? COLORS.success : COLORS.error}
                  isMobile={isMobile}
                />
                <MetricTile value={`Ksh ${fmtK(chartData.data.summary.average_order_value || 0)}`} label={hospital ? "Avg Bill" : "Avg Order"} color={COLORS.orange} isMobile={isMobile} />
                <MetricTile value={chartData.data.summary.peak_period?.time || "N/A"} label="Peak Period" color={COLORS.cyan} isMobile={isMobile} />
              </Row>
            </ProCard>
          </Col>
        )}
      </Row>
    </>
  );
};

export default Dashboard;