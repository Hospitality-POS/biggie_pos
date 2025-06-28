import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
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
  Alert,
  Empty,
  Tooltip,
} from "antd";
import {
  ShoppingCartOutlined,
  ShopOutlined,
  TeamOutlined,
  WarningOutlined,
  ReloadOutlined,
  MoneyCollectOutlined,
  ClockCircleOutlined,
  PieChartOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  LineChartOutlined,
  FireOutlined,
  TrophyOutlined,
  RiseOutlined,
  DollarOutlined,
  FallOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { Line } from '@ant-design/charts';
import { getAdminDashboardAnalysis, getBestSellers, getBestSellersByCategory, getSalesChartData } from "@services/orders";
import { CheckCard } from "@ant-design/pro-components";
import WelcomeBanner from "./WelcomeBanner";
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const COLORS = {
  primary: "#1890ff",
  success: "#52c41a",
  warning: "#faad14",
  error: "#ff4d4f",
  info: "#1890ff",
  purple: "#722ed1",
  orange: "#fa8c16",
  cyan: "#13c2c2",
  gray: "#8c8c8c",
  lightGray: "#f5f7fa",
};

const PERIOD_LABELS = {
  day: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  custom: 'Custom Period'
};

const calculateBusinessIndicators = (chartData, apiData, periodFilter) => {
  const totalRevenue = chartData?.data?.summary?.total_sales || apiData?.todayRevenue || 0;
  const totalOrders = chartData?.data?.summary?.total_orders || apiData?.totalOrderCount || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const growthRate = chartData?.data?.summary?.growth_rate || 0;

  if (!chartData?.data?.chart_data?.length || totalRevenue === 0) {
    const noSalesPeriod = {
      day: 'No sales today',
      week: 'No sales this week',
      month: 'No sales this month',
      year: 'No sales this year',
      custom: 'No sales in selected period'
    };

    return {
      trend: 'no-sales',
      trendText: noSalesPeriod[periodFilter] || 'No sales data',
      trendColor: COLORS.error,
      insights: [
        { type: 'negative', text: 'Zero revenue - immediate action needed' },
        { type: 'warning', text: 'Consider marketing campaigns or promotions' }
      ],
      performance: 'critical',
      performanceColor: COLORS.error,
      performanceText: 'Critical - No Sales',
      avgOrderValue: 0
    };
  }

  let performance = 'active';
  let performanceColor = COLORS.primary;
  let performanceText = 'Network Active';

  // Network-wide thresholds (higher than individual shop)
  if (totalOrders >= 50) {
    performance = 'excellent';
    performanceColor = COLORS.success;
    performanceText = 'Excellent Network Performance';
  } else if (totalOrders >= 25) {
    performance = 'good';
    performanceColor = COLORS.success;
    performanceText = 'Strong Network Activity';
  } else if (totalOrders >= 10) {
    performance = 'moderate';
    performanceColor = COLORS.primary;
    performanceText = 'Moderate Network Activity';
  } else if (totalOrders >= 3) {
    performance = 'low';
    performanceColor = COLORS.warning;
    performanceText = 'Low Network Activity';
  } else {
    performance = 'critical';
    performanceColor = COLORS.error;
    performanceText = 'Critical - Network Issues';
  }

  let trend = 'neutral';
  let trendColor = COLORS.gray;
  let trendText = 'Stable';

  if (growthRate > 20) {
    trend = 'up-strong';
    trendColor = COLORS.success;
    trendText = `Network Accelerating (+${growthRate.toFixed(1)}%)`;
  } else if (growthRate > 5) {
    trend = 'up';
    trendColor = COLORS.success;
    trendText = `Network Growing (+${growthRate.toFixed(1)}%)`;
  } else if (growthRate > -5) {
    trend = 'neutral';
    trendColor = COLORS.gray;
    trendText = `Network Stable (${growthRate.toFixed(1)}%)`;
  } else if (growthRate > -15) {
    trend = 'down';
    trendColor = COLORS.warning;
    trendText = `Network Slowing (${growthRate.toFixed(1)}%)`;
  } else if (growthRate > -30) {
    trend = 'down-strong';
    trendColor = COLORS.error;
    trendText = `Network Declining (${growthRate.toFixed(1)}%)`;
  } else {
    trend = 'down-critical';
    trendColor = COLORS.error;
    trendText = `Critical Network Decline (${growthRate.toFixed(1)}%)`;
  }

  const insights = [];

  if (totalOrders > 0) {
    if (avgOrderValue > 2500) {
      insights.push({ type: 'positive', text: `Excellent network order value: Ksh ${avgOrderValue.toFixed(0)}` });
    } else if (avgOrderValue > 1500) {
      insights.push({ type: 'positive', text: `Good network order value: Ksh ${avgOrderValue.toFixed(0)}` });
    } else if (avgOrderValue < 500) {
      insights.push({ type: 'warning', text: `Consider network-wide upselling - avg: Ksh ${avgOrderValue.toFixed(0)}` });
    }
  }

  // Network-specific insights with higher thresholds
  const networkThresholds = {
    day: { low: 10, good: 30, excellent: 60 },
    week: { low: 50, good: 150, excellent: 300 },
    month: { low: 200, good: 600, excellent: 1200 },
    year: { low: 2500, good: 7500, excellent: 15000 }
  };

  const threshold = networkThresholds[periodFilter];
  if (threshold) {
    if (totalOrders === 0) {
      insights.push({ type: 'negative', text: `No orders ${PERIOD_LABELS[periodFilter].toLowerCase()} across network - check all operations` });
    } else if (totalOrders < threshold.low) {
      insights.push({ type: 'warning', text: `Network ${PERIOD_LABELS[periodFilter].toLowerCase()} volume below expectations` });
    } else if (totalOrders >= threshold.excellent) {
      insights.push({ type: 'positive', text: `Outstanding network ${PERIOD_LABELS[periodFilter].toLowerCase()} performance!` });
    }
  }

  if (trend === 'down-critical' || trend === 'down-strong') {
    insights.push({ type: 'negative', text: 'Network sales declining - review strategy across all shops urgently' });
  } else if (trend === 'down') {
    insights.push({ type: 'warning', text: 'Network sales slowing - monitor all shops closely' });
  } else if (trend === 'up-strong') {
    insights.push({ type: 'positive', text: 'Strong network growth momentum across all shops!' });
  }

  if (chartData?.data?.summary?.peak_period) {
    const peak = chartData.data.summary.peak_period;
    insights.push({
      type: 'positive',
      text: `Network peak period: ${peak.time} (Ksh ${peak.sales?.toLocaleString()})`
    });
  }

  return {
    trend,
    trendText,
    trendColor,
    insights,
    performance,
    performanceColor,
    performanceText,
    avgOrderValue
  };
};

const ORDER_COLUMNS = [
  {
    title: "Order No",
    dataIndex: "order_no",
    key: "order_no",
    width: 120,
  },
  {
    title: "Table",
    dataIndex: "table",
    key: "table",
    width: 80,
  },
  {
    title: "Shop",
    dataIndex: "shop_name",
    key: "shop_name",
    ellipsis: true,
  },
  {
    title: "Amount",
    dataIndex: "order_amount",
    key: "order_amount",
    width: 120,
    render: (amount) => (
      <Text strong style={{ color: COLORS.success }}>
        Ksh {amount?.toFixed(2)}
      </Text>
    ),
  },
  {
    title: "Served By",
    dataIndex: "servedBy",
    key: "servedBy",
    ellipsis: true,
  },
];

const STOCK_COLUMNS = [
  {
    title: "Item Name",
    dataIndex: "name",
    key: "name",
    ellipsis: true,
  },
  {
    title: "Shop",
    dataIndex: "shop_name",
    key: "shop_name",
    width: 120,
  },
  {
    title: "Current",
    dataIndex: "quantity",
    key: "quantity",
    width: 80,
    render: (quantity) => (
      <Text style={{ color: quantity <= 0 ? COLORS.error : COLORS.warning }}>
        {quantity}
      </Text>
    ),
  },
  {
    title: "Min Required",
    dataIndex: "min_viable_quantity",
    key: "min_viable_quantity",
    width: 100,
  },
  {
    title: "Status",
    key: "status",
    width: 120,
    render: (_, record) => {
      const isOutOfStock = record.quantity <= 0;
      const isLow = record.quantity <= record.min_viable_quantity;

      return (
        <Badge
          status={isOutOfStock ? "error" : "warning"}
          text={
            isOutOfStock ? "Out of stock" :
              isLow ? `${record.quantity} left` :
                "Low stock"
          }
        />
      );
    },
  },
];

const BESTSELLER_COLUMNS = [
  {
    title: "Rank",
    dataIndex: "rank",
    key: "rank",
    width: 60,
    render: (rank) => (
      <div style={{ textAlign: 'center' }}>
        {rank === 1 ? (
          <TrophyOutlined style={{ color: '#ffd700', fontSize: 18 }} />
        ) : rank === 2 ? (
          <TrophyOutlined style={{ color: '#c0c0c0', fontSize: 16 }} />
        ) : rank === 3 ? (
          <TrophyOutlined style={{ color: '#cd7f32', fontSize: 16 }} />
        ) : (
          <span style={{ fontWeight: 600, color: COLORS.primary }}>#{rank}</span>
        )}
      </div>
    ),
  },
  {
    title: "Product",
    dataIndex: "name",
    key: "name",
    render: (name, record) => (
      <div>
        <div style={{ fontWeight: 500, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 12, color: COLORS.gray }}>
          {record.category?.name || 'Uncategorized'} • {record.product_type}
        </div>
      </div>
    ),
  },
  {
    title: "Sales",
    dataIndex: ["sales_metrics", "total_quantity_sold"],
    key: "quantity_sold",
    sorter: (a, b) => a.sales_metrics.total_quantity_sold - b.sales_metrics.total_quantity_sold,
    render: (quantity, record) => (
      <div>
        <div style={{ fontWeight: 600, color: COLORS.success }}>
          {quantity} units
        </div>
        <div style={{ fontSize: 12, color: COLORS.gray }}>
          {record.sales_metrics.order_count} orders
        </div>
      </div>
    ),
  },
  {
    title: "Revenue",
    dataIndex: ["sales_metrics", "total_revenue"],
    key: "revenue",
    sorter: (a, b) => a.sales_metrics.total_revenue - b.sales_metrics.total_revenue,
    render: (revenue, record) => (
      <div>
        <div style={{ fontWeight: 600, color: COLORS.primary }}>
          Ksh {revenue?.toLocaleString()}
        </div>
        {record.sales_metrics?.total_profit && (
          <div style={{ fontSize: 12, color: COLORS.success }}>
            Profit: Ksh {record.sales_metrics.total_profit.toLocaleString()}
          </div>
        )}
      </div>
    ),
  },
  {
    title: "Performance",
    key: "performance",
    render: (_, record) => (
      <div>
        <div style={{ marginBottom: 4 }}>
          <Tag color={record.performance_indicators?.is_top_performer ? 'gold' : 'blue'}>
            {record.performance_indicators?.is_top_performer ? 'Top Performer' : 'Popular'}
          </Tag>
        </div>
        <div style={{ fontSize: 12, color: COLORS.gray }}>
          Avg: {record.performance_indicators?.avg_quantity_per_order?.toFixed(1)} per order
        </div>
      </div>
    ),
  },
];

const StatisticCard = ({ title, value, prefix, loading, trend, onClick }) => (
  <Col xs={24} sm={12} lg={6}>
    <Card
      bordered={false}
      hoverable={!!onClick}
      onClick={onClick}
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        borderRadius: 12,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {loading ? (
        <Skeleton active paragraph={false} />
      ) : (
        <div>
          <Statistic
            title={
              <span style={{ color: COLORS.gray, fontWeight: 500, fontSize: 14 }}>
                {title}
              </span>
            }
            value={value || 0}
            prefix={prefix}
            precision={title.includes("Revenue") ? 2 : 0}
            valueStyle={{
              color: "#1f2937",
              fontSize: "1.6rem",
              fontWeight: 600,
            }}
          />
          {trend && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <Space>
                {trend > 0 ? (
                  <RiseOutlined style={{ color: COLORS.success }} />
                ) : trend < 0 ? (
                  <FallOutlined style={{ color: COLORS.error }} />
                ) : (
                  <CheckCircleOutlined style={{ color: COLORS.gray }} />
                )}
                <Text style={{
                  color: trend > 0 ? COLORS.success : trend < 0 ? COLORS.error : COLORS.gray
                }}>
                  {trend > 0 ? '+' : ''}{trend?.toFixed(1)}%
                </Text>
              </Space>
            </div>
          )}
        </div>
      )}
    </Card>
  </Col>
);

const SalesChart = ({ data, loading, title, businessIndicators }) => {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    return data.map(item => ({
      ...item,
      sales: Number(item.sales) || 0,
      orders: Number(item.orders) || 0,
      avgOrderValue: Number(item.avgOrderValue) || 0,
      cumulativeSales: Number(item.cumulativeSales) || 0,
    }));
  }, [data]);

  const config = useMemo(() => ({
    data: chartData,
    xField: 'time',
    yField: 'sales',
    height: 350,
    smooth: true,
    lineStyle: {
      stroke: COLORS.primary,
      lineWidth: 3,
    },
    point: {
      size: 5,
      style: {
        fill: COLORS.primary,
        stroke: '#fff',
        lineWidth: 2,
      },
    },
    tooltip: {
      formatter: (datum) => [
        {
          name: 'Network Sales',
          value: `Ksh ${Number(datum.sales)?.toLocaleString()}`,
        },
        {
          name: 'Total Orders',
          value: `${datum.orders} orders`,
        },
        {
          name: 'Avg Order Value',
          value: `Ksh ${Number(datum.avgOrderValue)?.toLocaleString()}`,
        },
        {
          name: 'Cumulative Sales',
          value: `Ksh ${Number(datum.cumulativeSales)?.toLocaleString()}`,
        }
      ],
    },
    xAxis: {
      label: {
        style: {
          fill: '#64748b',
          fontSize: 12,
        },
        autoRotate: true,
      },
      line: {
        style: {
          stroke: '#e2e8f0',
        },
      },
    },
    yAxis: {
      label: {
        style: {
          fill: '#64748b',
          fontSize: 12,
        },
        formatter: (value) => {
          const numValue = Number(value);
          if (numValue >= 1000000) {
            return `${(numValue / 1000000).toFixed(1)}M`;
          } else if (numValue >= 1000) {
            return `${(numValue / 1000).toFixed(0)}K`;
          }
          return `${numValue}`;
        },
      },
      min: 0,
      grid: {
        line: {
          style: {
            stroke: '#f0f0f0',
            lineWidth: 1,
            lineDash: [3, 3],
          },
        },
      },
    },
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
  }), [chartData]);

  return (
    <Card
      title={
        <Space>
          <LineChartOutlined style={{ color: COLORS.primary }} />
          {title}
        </Space>
      }
      extra={
        businessIndicators && (
          <Space size="large">
            <Space>
              <Badge
                status={businessIndicators.performance === 'excellent' ? 'success' :
                  businessIndicators.performance === 'good' ? 'processing' :
                    businessIndicators.performance === 'moderate' ? 'default' :
                      businessIndicators.performance === 'low' ? 'warning' : 'error'}
              />
              <Text style={{ color: businessIndicators.performanceColor, fontWeight: 600 }}>
                {businessIndicators.performanceText}
              </Text>
            </Space>
            <Space>
              <Text style={{ color: businessIndicators.trendColor, fontWeight: 500 }}>
                {businessIndicators.trendText}
              </Text>
            </Space>
          </Space>
        )
      }
      style={{ borderRadius: 12, marginBottom: 24 }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          {businessIndicators?.insights?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Space wrap>
                {businessIndicators.insights.map((insight, index) => (
                  <Badge
                    key={index}
                    status={insight.type === 'positive' ? 'success' :
                      insight.type === 'warning' ? 'warning' : 'error'}
                    text={
                      <Text
                        style={{
                          color: insight.type === 'positive' ? COLORS.success :
                            insight.type === 'warning' ? COLORS.warning : COLORS.error,
                          fontSize: 12
                        }}
                      >
                        {insight.text}
                      </Text>
                    }
                  />
                ))}
              </Space>
              <Divider style={{ margin: '12px 0' }} />
            </div>
          )}

          {chartData.length > 0 ? (
            <Line {...config} />
          ) : (
            <Empty
              description="No chart data available"
              style={{ padding: '60px 20px' }}
            />
          )}
        </>
      )}
    </Card>
  );
};

const BestSellersCard = ({ bestSellersData, loading, dateRange }) => {
  const bestSellers = useMemo(() => {
    if (!bestSellersData?.data?.best_sellers?.length) return [];

    return bestSellersData.data.best_sellers.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }, [bestSellersData]);

  const summary = bestSellersData?.data?.summary || {};

  if (!bestSellers.length && !loading) {
    return (
      <Card
        title={
          <Space>
            <FireOutlined style={{ color: COLORS.orange }} />
            Best Sellers Across All Shops ({dateRange})
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        <Empty
          image={<FireOutlined style={{ fontSize: 48, color: COLORS.orange }} />}
          description={
            <div>
              <Title level={4} style={{ color: COLORS.gray }}>No Sales Data</Title>
              <Text type="secondary">No products have been sold during this period across all shops.</Text>
            </div>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <FireOutlined style={{ color: COLORS.orange }} />
          Best Sellers Across All Shops ({dateRange})
        </Space>
      }
      extra={
        summary.total_products_analyzed > 0 && (
          <Space>
            <Badge count={summary.total_products_analyzed} style={{ backgroundColor: COLORS.primary }} />
            <Text type="secondary">Products analyzed</Text>
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
            <div style={{ marginBottom: 16, padding: 16, background: COLORS.lightGray, borderRadius: 8 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Total Revenue"
                    value={summary.total_revenue}
                    prefix="Ksh"
                    precision={2}
                    valueStyle={{ fontSize: 16, fontWeight: 600 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Units Sold"
                    value={summary.total_quantity_sold}
                    valueStyle={{ fontSize: 16, fontWeight: 600 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Avg Order Value"
                    value={summary.average_order_value}
                    prefix="Ksh"
                    precision={2}
                    valueStyle={{ fontSize: 16, fontWeight: 600 }}
                  />
                </Col>
              </Row>
            </div>
          )}

          <Table
            columns={BESTSELLER_COLUMNS}
            dataSource={bestSellers}
            pagination={{
              pageSize: 15,
              showSizeChanger: false,
              showQuickJumper: true,
            }}
            size="middle"
            rowKey="product_id"
            scroll={{ x: 800 }}
          />
        </>
      )}
    </Card>
  );
};

const DashboardAdminPage = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [periodFilter, setPeriodFilter] = useState("day");
  const [customDateRange, setCustomDateRange] = useState([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const getDateRange = useCallback(() => {
    const today = dayjs();
    let startDate, endDate;

    switch (periodFilter) {
      case "day":
        startDate = today.startOf("day");
        endDate = today.endOf("day");
        break;
      case "week":
        startDate = today.startOf("week");
        endDate = today.endOf("week");
        break;
      case "month":
        startDate = today.startOf("month");
        endDate = today.endOf("month");
        break;
      case "year":
        startDate = today.startOf("year");
        endDate = today.endOf("year");
        break;
      case "custom":
        if (customDateRange?.length === 2) {
          startDate = customDateRange[0].startOf("day");
          endDate = customDateRange[1].endOf("day");
        } else {
          startDate = today.startOf("day");
          endDate = today.endOf("day");
        }
        break;
      default:
        startDate = today.startOf("day");
        endDate = today.endOf("day");
    }

    return { startDate, endDate };
  }, [periodFilter, customDateRange]);

  const { startDate, endDate } = getDateRange();

  // Main admin dashboard data query
  const { data, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ["admindashBoardAnalysis", startDate.format(), endDate.format()],
    queryFn: () => getAdminDashboardAnalysis(
      startDate.toISOString(),
      endDate.toISOString()
    ),
    networkMode: "always",
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 2,
    onError: (error) => {
      notification.error({
        message: "Failed to fetch dashboard data. Please try again.",
        duration: 3,
        placement: "bottomRight",
      });
    },
  });

  // Sales chart data query - Admin level (all shops combined)
  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["adminSalesChartData", periodFilter, startDate.format(), endDate.format()],
    queryFn: () => getSalesChartData({
      period: periodFilter,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      // No shop_id - admin sees all shops combined
    }),
    networkMode: "always",
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 2,
  });

  // Best Sellers Query - Admin sees all shops' data
  const { data: bestSellersData, isLoading: bestSellersLoading } = useQuery({
    queryKey: ["adminBestSellers", startDate.format(), endDate.format()],
    queryFn: () => getBestSellers({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 15 // Show more for admin view
      // No shop_id filter - admin sees all shops
    }),
    networkMode: "always",
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 2,
  });

  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      messageApi.success({
        content: "Admin dashboard data refreshed successfully!",
        duration: 2,
      });
    } catch (error) {
      messageApi.error({
        content: "Failed to refresh dashboard. Please try again.",
        duration: 3,
      });
    }
  }, [refetch, messageApi]);

  const handlePeriodChange = useCallback((e) => {
    const value = e.target.value;
    setPeriodFilter(value);
    setShowCustomDatePicker(value === "custom");
  }, []);

  const handleCustomDateChange = useCallback((dates) => {
    setCustomDateRange(dates || []);
  }, []);

  const statisticsData = useMemo(() => [
    {
      title: periodFilter === "day" ? "Today's Orders" : "Total Orders",
      value: chartData?.data?.summary?.total_orders || data?.totalOrderCount,
      prefix: <ShoppingCartOutlined style={{ color: COLORS.primary }} />,
      trend: chartData?.data?.summary?.growth_rate,
      onClick: () => navigate('/orders'),
    },
    {
      title: "Network Revenue",
      value: chartData?.data?.summary?.total_sales || data?.todayRevenue,
      prefix: <DollarOutlined style={{ color: COLORS.success }} />,
    },
    {
      title: "Active Shops",
      value: data?.activeOrders,
      prefix: <ShopOutlined style={{ color: COLORS.orange }} />,
      onClick: () => navigate('/shops'),
    },
    {
      title: "Active Shifts",
      value: data?.activeShift,
      prefix: <TeamOutlined style={{ color: COLORS.info }} />,
      onClick: () => navigate('/shifts'),
    },
  ], [chartData, data, navigate, periodFilter]);

  const businessIndicators = useMemo(() =>
    calculateBusinessIndicators(chartData, data, periodFilter), [chartData, data, periodFilter]);

  const getFormattedDateRange = useCallback(() => {
    const dateFormat = 'MMM D, YYYY';
    switch (periodFilter) {
      case "day":
        return startDate.format('MMMM D, YYYY');
      case "week":
        return `${startDate.format(dateFormat)} - ${endDate.format(dateFormat)}`;
      case "month":
        return startDate.format('MMMM YYYY');
      case "year":
        return startDate.format('YYYY');
      case "custom":
        if (customDateRange?.length === 2) {
          return `${customDateRange[0].format(dateFormat)} - ${customDateRange[1].format(dateFormat)}`;
        }
        return "Custom Range";
      default:
        return startDate.format('MMMM D, YYYY');
    }
  }, [periodFilter, startDate, endDate, customDateRange]);

  const isDataLoading = isLoading || isRefetching || chartLoading;

  return (
    <>
      {contextHolder}

      {/* Header Section */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 600, color: "#1e293b" }}>
            {PERIOD_LABELS[periodFilter]} Admin Overview
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            {getFormattedDateRange()} • All Shops Network Performance
          </Text>
        </div>

        <Space wrap size="middle">
          {/* Period Filter */}
          <Card size="small" style={{ borderRadius: 8 }}>
            <Flex align="center" gap={12}>
              <CalendarOutlined style={{ color: COLORS.primary }} />
              <Radio.Group
                value={periodFilter}
                onChange={handlePeriodChange}
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="day">Day</Radio.Button>
                <Radio.Button value="week">Week</Radio.Button>
                <Radio.Button value="month">Month</Radio.Button>
                <Radio.Button value="year">Year</Radio.Button>
                <Radio.Button value="custom">Custom</Radio.Button>
              </Radio.Group>
            </Flex>
          </Card>

          {/* Custom Date Picker */}
          {showCustomDatePicker && (
            <RangePicker
              value={customDateRange}
              onChange={handleCustomDateChange}
              allowClear
              style={{ minWidth: 280 }}
              placeholder={['Start date', 'End date']}
            />
          )}

          {/* Action Buttons */}
          <Space>
            <Button
              type="primary"
              icon={<ReloadOutlined spin={isRefetching} />}
              onClick={handleRefresh}
              loading={isDataLoading}
              style={{ fontWeight: 500 }}
            >
              {isRefetching ? "Refreshing..." : "Refresh"}
            </Button>
          </Space>
        </Space>
      </Row>

      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Performance Alert */}
      {/* {businessIndicators?.performance === 'critical' && (
        <Alert
          message="Critical Network Alert"
          description={businessIndicators.trendText}
          type="error"
          showIcon
          style={{ marginBottom: 24, marginTop: 16, borderRadius: 8 }}
          action={
            <Button size="small" type="primary" danger>
              Review All Shops
            </Button>
          }
        />
      )} */}

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginTop: 16, marginBottom: 24 }}>
        {statisticsData.map((stat, index) => (
          <StatisticCard
            key={index}
            loading={isDataLoading}
            {...stat}
          />
        ))}
      </Row>

      {/* Sales Chart Section */}
      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          {chartData?.data?.chart_data?.length > 0 ? (
            <SalesChart
              data={chartData.data.chart_data}
              loading={chartLoading}
              title={`Network Sales Trends - ${getFormattedDateRange()}`}
              businessIndicators={businessIndicators}
            />
          ) : (
            <Card
              title={
                <Space>
                  <LineChartOutlined style={{ color: COLORS.primary }} />
                  {`Network Sales Trends - ${getFormattedDateRange()}`}
                </Space>
              }
              extra={
                businessIndicators && (
                  <Space size="large">
                    <Space>
                      <Badge status="error" />
                      <Text style={{ color: businessIndicators.performanceColor, fontWeight: 600 }}>
                        {businessIndicators.performanceText}
                      </Text>
                    </Space>
                    <Space>
                      <Text style={{ color: businessIndicators.trendColor, fontWeight: 500 }}>
                        {businessIndicators.trendText}
                      </Text>
                    </Space>
                  </Space>
                )
              }
              style={{ borderRadius: 12 }}
            >
              {chartLoading ? (
                <Skeleton active paragraph={{ rows: 8 }} />
              ) : (
                <>
                  {businessIndicators?.insights?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <Space wrap>
                        {businessIndicators.insights.map((insight, index) => (
                          <Badge
                            key={index}
                            status={insight.type === 'positive' ? 'success' :
                              insight.type === 'warning' ? 'warning' : 'error'}
                            text={
                              <Text
                                style={{
                                  color: insight.type === 'positive' ? COLORS.success :
                                    insight.type === 'warning' ? COLORS.warning : COLORS.error,
                                  fontSize: 12
                                }}
                              >
                                {insight.text}
                              </Text>
                            }
                          />
                        ))}
                      </Space>
                      <Divider style={{ margin: '12px 0' }} />
                    </div>
                  )}

                  <Empty
                    image={<LineChartOutlined style={{ fontSize: 64, color: COLORS.error }} />}
                    description={
                      <div style={{ padding: '20px' }}>
                        <Title level={4} style={{ color: COLORS.error }}>
                          {periodFilter === 'day' ? 'No Sales Today Across Network' :
                            periodFilter === 'week' ? 'No Sales This Week Across Network' :
                              periodFilter === 'month' ? 'No Sales This Month Across Network' :
                                periodFilter === 'year' ? 'No Sales This Year Across Network' :
                                  'No Sales in Selected Period Across Network'}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 16 }}>
                          {periodFilter === 'day' ?
                            'No sales recorded across all shops today. Check individual shop operations and network connectivity.' :
                            periodFilter === 'week' ?
                              'Weekly performance is concerning across the network. Review shop strategies and operational issues.' :
                              periodFilter === 'month' ?
                                'Monthly network performance needs immediate attention. Consider emergency business strategy review.' :
                                periodFilter === 'year' ?
                                  'Annual network performance requires urgent strategic overhaul across all shops.' :
                                  'Consider network-wide strategy adjustments for the selected period.'}
                        </Text>
                      </div>
                    }
                  />
                </>
              )}
            </Card>
          )}
        </Col>
      </Row>

      {/* Best Sellers Section */}
      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          <BestSellersCard
            bestSellersData={bestSellersData}
            loading={bestSellersLoading}
            dateRange={getFormattedDateRange()}
          />
        </Col>
      </Row>

      {/* Recent Orders and Low Stock */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ShoppingCartOutlined style={{ color: COLORS.primary }} />
                {`Recent Orders Across Network (${getFormattedDateRange()})`}
              </Space>
            }
            extra={
              <Space>
                <Badge
                  count={data?.totalOrderCount || 0}
                  style={{ backgroundColor: COLORS.primary }}
                />
                <Button type="link" onClick={() => navigate('/orders')}>
                  View All
                </Button>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            {isDataLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <Table
                columns={ORDER_COLUMNS}
                dataSource={
                  Array.isArray(data?.currentOrders) ? data.currentOrders : []
                }
                pagination={{
                  pageSize: 5,
                  hideOnSinglePage: true,
                  showSizeChanger: false,
                }}
                size="middle"
                rowClassName={() => "hover:bg-gray-50 transition-colors"}
                locale={{
                  emptyText: (
                    <Empty
                      image={<ShoppingCartOutlined style={{ fontSize: 32, color: COLORS.gray }} />}
                      description="No recent orders across all shops"
                      style={{ padding: '20px' }}
                    />
                  )
                }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: COLORS.error }} />
                Low Stock Alerts (All Shops)
              </Space>
            }
            extra={
              <Space>
                {data?.lowStockItems?.length > 0 && (
                  <Badge
                    count={data.lowStockItems.length}
                    style={{ backgroundColor: COLORS.error }}
                  />
                )}
                <Button type="link" onClick={() => navigate('/inventory')}>
                  View All
                </Button>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            {isDataLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <Table
                columns={STOCK_COLUMNS}
                dataSource={
                  Array.isArray(data?.lowStockItems) ? data.lowStockItems : []
                }
                pagination={{
                  pageSize: 5,
                  hideOnSinglePage: true,
                  showSizeChanger: false,
                }}
                size="middle"
                rowClassName={() => "hover:bg-gray-50 transition-colors"}
                locale={{
                  emptyText: (
                    <Empty
                      image={<CheckCircleOutlined style={{ fontSize: 32, color: COLORS.success }} />}
                      description={
                        <div>
                          <Text style={{ color: COLORS.success }}>All items are well stocked across all shops</Text>
                        </div>
                      }
                      style={{ padding: '20px' }}
                    />
                  )
                }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Network Performance Summary */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <PieChartOutlined style={{ color: COLORS.purple }} />
                Network Performance Summary ({getFormattedDateRange()})
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            {isDataLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
              <Row gutter={[24, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: COLORS.primary,
                      marginBottom: 4
                    }}>
                      {data?.totalOrderCount || 0}
                    </div>
                    <div style={{ color: COLORS.gray, fontSize: 14 }}>Total Orders</div>
                    <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
                      Across all shops
                    </div>
                  </div>
                </Col>

                <Col xs={24} sm={12} md={6}>
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: COLORS.success,
                      marginBottom: 4
                    }}>
                      Ksh {(data?.todayRevenue || 0).toLocaleString()}
                    </div>
                    <div style={{ color: COLORS.gray, fontSize: 14 }}>Total Revenue</div>
                    <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
                      Network wide
                    </div>
                  </div>
                </Col>

                <Col xs={24} sm={12} md={6}>
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: COLORS.orange,
                      marginBottom: 4
                    }}>
                      {data?.activeOrders || 0}
                    </div>
                    <div style={{ color: COLORS.gray, fontSize: 14 }}>Active Shops</div>
                    <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
                      Currently operating
                    </div>
                  </div>
                </Col>

                <Col xs={24} sm={12} md={6}>
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: COLORS.cyan,
                      marginBottom: 4
                    }}>
                      {data?.activeShift || 0}
                    </div>
                    <div style={{ color: COLORS.gray, fontSize: 14 }}>Active Shifts</div>
                    <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
                      Staff on duty
                    </div>
                  </div>
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        {/* Additional Performance Metrics - Only show if chart data is available */}
        {chartData?.data?.summary && (
          <Col span={24} style={{ marginTop: 16 }}>
            <Card
              title={
                <Space>
                  <RiseOutlined style={{ color: COLORS.success }} />
                  Advanced Network Metrics ({getFormattedDateRange()})
                </Space>
              }
              style={{ borderRadius: 12 }}
            >
              <Row gutter={[24, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: COLORS.primary,
                      marginBottom: 4
                    }}>
                      {chartData.data.summary.data_points}
                    </div>
                    <div style={{ color: COLORS.gray, fontSize: 14 }}>Data Points</div>
                    <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
                      Reporting periods
                    </div>
                  </div>
                </Col>

                <Col xs={24} sm={12} md={6}>
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: chartData.data.summary.growth_rate >= 0 ? COLORS.success : COLORS.error,
                      marginBottom: 4
                    }}>
                      {chartData.data.summary.growth_rate > 0 ? '+' : ''}
                      {chartData.data.summary.growth_rate.toFixed(1)}%
                    </div>
                    <div style={{ color: COLORS.gray, fontSize: 14 }}>Growth Rate</div>
                    <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
                      Network trend
                    </div>
                  </div>
                </Col>

                <Col xs={24} sm={12} md={6}>
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: COLORS.orange,
                      marginBottom: 4
                    }}>
                      Ksh {chartData.data.summary.average_order_value?.toLocaleString()}
                    </div>
                    <div style={{ color: COLORS.gray, fontSize: 14 }}>Avg Order Value</div>
                    <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
                      Network average
                    </div>
                  </div>
                </Col>

                <Col xs={24} sm={12} md={6}>
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: COLORS.cyan,
                      marginBottom: 4
                    }}>
                      {chartData.data.summary.peak_period?.time || 'N/A'}
                    </div>
                    <div style={{ color: COLORS.gray, fontSize: 14 }}>Peak Period</div>
                    <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
                      Highest sales time
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        )}
      </Row>
    </>
  );
};

export default DashboardAdminPage;