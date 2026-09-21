import React, { useState, useMemo } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Typography, Space, Segmented, Skeleton, Empty, Button, Drawer, Table, Badge } from "antd";
import {
  FireOutlined,
  PieChartOutlined,
  BarChartOutlined,
  TrophyOutlined,
  MedicineBoxOutlined,
  HomeOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { fmtK } from "@utils/formatters";

const { Text } = Typography;

const PALETTE = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#14b8a6",
  "#f97316",
];

interface TopSellersChartProps {
  bestSellersData: any;
  loading: boolean;
  dateRange: string;
  isMobile?: boolean;
  hospital?: boolean;
  hotel?: boolean;
}

type ChartViewMode = "bar" | "pie";

const DashboardTopSellersChart: React.FC<TopSellersChartProps> = ({
  bestSellersData,
  loading,
  dateRange,
  isMobile = false,
  hospital = false,
  hotel = false,
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>("bar");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const rawList = useMemo(() => {
    return Array.isArray(bestSellersData?.data?.best_sellers)
      ? bestSellersData.data.best_sellers
      : [];
  }, [bestSellersData]);

  // Top 5-6 products for bar chart
  const barData = useMemo(() => {
    return rawList.slice(0, 6).map((item: any, index: number) => {
      const revenue = Number(item.sales_metrics?.total_revenue) || 0;
      const quantity = Number(item.sales_metrics?.total_quantity_sold) || 0;
      const name = item.name || `Item ${index + 1}`;
      // Truncate name for y-axis display
      const shortName = name.length > 18 ? `${name.substring(0, 16)}…` : name;
      return {
        rank: index + 1,
        fullName: name,
        shortName,
        revenue,
        quantity,
        category: item.category?.name || "General",
        color: PALETTE[index % PALETTE.length],
      };
    });
  }, [rawList]);

  // Category distribution for pie chart
  const pieData = useMemo(() => {
    const catMap: Record<string, { name: string; revenue: number; quantity: number }> = {};
    rawList.forEach((item: any) => {
      const cat = item.category?.name || "General";
      const rev = Number(item.sales_metrics?.total_revenue) || 0;
      const qty = Number(item.sales_metrics?.total_quantity_sold) || 0;
      if (!catMap[cat]) {
        catMap[cat] = { name: cat, revenue: 0, quantity: 0 };
      }
      catMap[cat].revenue += rev;
      catMap[cat].quantity += qty;
    });

    const entries = Object.values(catMap);
    entries.sort((a, b) => b.revenue - a.revenue);
    return entries.slice(0, 5).map((c, i) => ({
      ...c,
      color: PALETTE[i % PALETTE.length],
    }));
  }, [rawList]);

  const cardTitle = hospital
    ? "Top Medicines & Services"
    : hotel
    ? "Top Bookings & Amenities"
    : "Top Selling Items";

  const totalRevenue = useMemo(
    () => rawList.reduce((acc: number, item: any) => acc + (Number(item.sales_metrics?.total_revenue) || 0), 0),
    [rawList]
  );

  const totalQuantity = useMemo(
    () => rawList.reduce((acc: number, item: any) => acc + (Number(item.sales_metrics?.total_quantity_sold) || 0), 0),
    [rawList]
  );

  const tableColumns = [
    {
      title: "#",
      dataIndex: "rank",
      key: "rank",
      width: 45,
      render: (_: any, __: any, index: number) => (
        <span style={{ fontWeight: 600, color: index < 3 ? "#f59e0b" : "#64748b" }}>
          #{index + 1}
        </span>
      ),
    },
    {
      title: "Product",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: any) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{name}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{record.category?.name || "Uncategorized"}</div>
        </div>
      ),
    },
    {
      title: hospital ? "Dispensed" : hotel ? "Bookings" : "Quantity",
      key: "quantity",
      render: (_: any, record: any) => (
        <Text strong style={{ color: "#3b82f6", fontSize: 12 }}>
          {record.sales_metrics?.total_quantity_sold || 0} units
        </Text>
      ),
    },
    {
      title: "Revenue",
      key: "revenue",
      align: "right" as const,
      render: (_: any, record: any) => (
        <Text strong style={{ color: "#10b981", fontSize: 12 }}>
          Ksh {Number(record.sales_metrics?.total_revenue || 0).toLocaleString()}
        </Text>
      ),
    },
  ];

  return (
    <>
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
          <Space size={8}>
            <div
              style={{
                background: "#fff7ed",
                borderRadius: 8,
                padding: "4px 8px",
                color: "#f97316",
                display: "inline-flex",
              }}
            >
              {hospital ? <MedicineBoxOutlined /> : hotel ? <HomeOutlined /> : <FireOutlined />}
            </div>
            <Text strong style={{ fontSize: 14 }}>
              {cardTitle}
            </Text>
          </Space>
        }
        extra={
          <Space size={6}>
            <Segmented
              size="small"
              value={viewMode}
              onChange={(val) => setViewMode(val as ChartViewMode)}
              options={[
                { label: "Rank", value: "bar", icon: <BarChartOutlined /> },
                { label: "Mix", value: "pie", icon: <PieChartOutlined /> },
              ]}
            />
            {rawList.length > 0 && (
              <Button
                type="text"
                size="small"
                icon={<UnorderedListOutlined />}
                onClick={() => setDrawerOpen(true)}
                style={{ fontSize: 12, color: "#3b82f6" }}
              >
                Table
              </Button>
            )}
          </Space>
        }
        bodyStyle={{ padding: "16px 12px 10px" }}
      >
        {loading ? (
          <div style={{ padding: "20px 10px" }}>
            <Skeleton active paragraph={{ rows: 5 }} />
          </div>
        ) : rawList.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              hospital
                ? "No medicines or services recorded in this period"
                : hotel
                ? "No bookings or amenities recorded in this period"
                : "No products sold in this period"
            }
            style={{ padding: "40px 0" }}
          />
        ) : viewMode === "bar" ? (
          <div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 10, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                  tickFormatter={(v) => `Ksh ${fmtK(v)}`}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  tick={{ fontSize: 11, fill: "#334155" }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <ReTooltip
                  formatter={(value: any, _: any, entry: any) => [
                    `Ksh ${Number(value).toLocaleString()} (${entry.payload.quantity} units)`,
                    "Revenue",
                  ]}
                  labelFormatter={(_: any, payload: any[]) =>
                    payload?.[0]?.payload?.fullName || "Product"
                  }
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: 12,
                    padding: "8px 12px",
                  }}
                />
                <Bar
                  dataKey="revenue"
                  radius={[0, 6, 6, 0]}
                  fill="#f97316"
                  barSize={18}
                >
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart margin={{ top: 4, right: 10, left: 10, bottom: 10 }}>
                <Pie
                  data={pieData}
                  dataKey="revenue"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ReTooltip
                  formatter={(val: any) => [`Ksh ${Number(val).toLocaleString()}`, "Revenue"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                  formatter={(value) => <span style={{ color: "#475569" }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </ProCard>

      {/* Full Table Drawer */}
      <Drawer
        title={
          <Space size={8}>
            <TrophyOutlined style={{ color: "#f59e0b" }} />
            <span>All Selling Items ({dateRange})</span>
          </Space>
        }
        width={isMobile ? "100%" : 560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            background: "#f8fafc",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>Total Revenue</Text>
            <Text strong style={{ fontSize: 16, color: "#10b981" }}>
              Ksh {fmtK(totalRevenue)}
            </Text>
          </div>
          <div>
            <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>
              {hospital ? "Dispensed Units" : hotel ? "Bookings" : "Units Sold"}
            </Text>
            <Text strong style={{ fontSize: 16, color: "#3b82f6" }}>
              {totalQuantity.toLocaleString()}
            </Text>
          </div>
          <div>
            <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>Items Analyzed</Text>
            <Text strong style={{ fontSize: 16, color: "#8b5cf6" }}>
              {rawList.length}
            </Text>
          </div>
        </div>

        <Table
          columns={tableColumns}
          dataSource={rawList}
          rowKey={(record) => record.product_id || record._id || Math.random().toString()}
          size="small"
          pagination={{ pageSize: 8, showSizeChanger: false }}
        />
      </Drawer>
    </>
  );
};

export default DashboardTopSellersChart;
