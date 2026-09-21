import React, { useState, useMemo } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Typography, Space, Tag, Segmented, Skeleton, Empty } from "antd";
import {
  LineChartOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";

const { Text } = Typography;

const fmt = (v: number) =>
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtK = (v: number) => {
  if (!v && v !== 0) return "0";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return fmt(v);
};

interface SalesTrendChartProps {
  data: any[];
  loading: boolean;
  title: string;
  businessIndicators?: any;
  primaryColor?: string;
  peakPeriod?: { time: string; sales: number };
}

type MetricMode = "sales" | "orders" | "avgOrderValue";

const DashboardSalesTrendChart: React.FC<SalesTrendChartProps> = ({
  data,
  loading,
  title,
  businessIndicators,
  primaryColor = "#10b981",
  peakPeriod,
}) => {
  const [metricMode, setMetricMode] = useState<MetricMode>("sales");

  const formattedChartData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.map((item) => ({
      time: item.time || item.name || "",
      sales: Number(item.sales) || 0,
      orders: Number(item.orders) || 0,
      avgOrderValue: Number(item.avgOrderValue) || (item.orders > 0 ? Math.round(item.sales / item.orders) : 0),
      cumulativeSales: Number(item.cumulativeSales) || 0,
    }));
  }, [data]);

  const hasData = formattedChartData.some((d) => d.sales > 0 || d.orders > 0);

  const metricConfig = useMemo(() => {
    switch (metricMode) {
      case "orders":
        return {
          label: "Orders",
          dataKey: "orders",
          strokeColor: "#3b82f6",
          gradientId: "ordersGrad",
          gradientColor: "#3b82f6",
          formatter: (v: number) => [`${v} orders`, "Orders"],
          yAxisFormatter: (v: number) => `${v}`,
        };
      case "avgOrderValue":
        return {
          label: "Avg Ticket",
          dataKey: "avgOrderValue",
          strokeColor: "#f59e0b",
          gradientId: "aovGrad",
          gradientColor: "#f59e0b",
          formatter: (v: number) => [`Ksh ${fmt(v)}`, "Avg Ticket"],
          yAxisFormatter: (v: number) => fmtK(v),
        };
      case "sales":
      default:
        return {
          label: "Revenue",
          dataKey: "sales",
          strokeColor: primaryColor,
          gradientId: "salesGrad",
          gradientColor: primaryColor,
          formatter: (v: number) => [`Ksh ${fmt(v)}`, "Revenue"],
          yAxisFormatter: (v: number) => fmtK(v),
        };
    }
  }, [metricMode, primaryColor]);

  return (
    <ProCard
      bordered
      headerBordered
      size="small"
      style={{
        borderRadius: 12,
        height: "100%",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      title={
        <Space size={8} wrap>
          <div
            style={{
              background: `${primaryColor}15`,
              borderRadius: 8,
              padding: "4px 8px",
              color: primaryColor,
              display: "inline-flex",
            }}
          >
            <LineChartOutlined />
          </div>
          <Text strong style={{ fontSize: 14 }}>
            {title}
          </Text>
          {peakPeriod?.time && (
            <Tag color="cyan" style={{ borderRadius: 10, fontSize: 11, border: "none" }}>
              <ThunderboltOutlined style={{ marginRight: 3 }} />
              Peak: {peakPeriod.time}
            </Tag>
          )}
          {businessIndicators?.performanceText && (
            <Tag
              style={{
                borderRadius: 10,
                fontSize: 11,
                border: "none",
                background: `${businessIndicators.performanceColor || "#10b981"}15`,
                color: businessIndicators.performanceColor || "#10b981",
              }}
            >
              {businessIndicators.performanceText}
            </Tag>
          )}
        </Space>
      }
      extra={
        <Segmented
          size="small"
          value={metricMode}
          onChange={(val) => setMetricMode(val as MetricMode)}
          options={[
            { label: "Revenue", value: "sales", icon: <DollarOutlined /> },
            { label: "Orders", value: "orders", icon: <ShoppingCartOutlined /> },
            { label: "Avg Ticket", value: "avgOrderValue", icon: <RiseOutlined /> },
          ]}
        />
      }
      bodyStyle={{ padding: "16px 12px 10px" }}
    >
      {loading ? (
        <div style={{ padding: "20px 10px" }}>
          <Skeleton active paragraph={{ rows: 5 }} />
        </div>
      ) : !hasData ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No sales recorded for this period"
          style={{ padding: "40px 0" }}
        />
      ) : (
        <div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={formattedChartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={metricConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metricConfig.gradientColor} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={metricConfig.gradientColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={metricConfig.yAxisFormatter}
              />
              <ReTooltip
                formatter={(val: any) => metricConfig.formatter(Number(val) || 0)}
                labelFormatter={(label) => `Time: ${label}`}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: 12,
                  padding: "8px 12px",
                }}
              />
              <Area
                type="monotone"
                dataKey={metricConfig.dataKey}
                stroke={metricConfig.strokeColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#${metricConfig.gradientId})`}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ProCard>
  );
};

export default DashboardSalesTrendChart;
