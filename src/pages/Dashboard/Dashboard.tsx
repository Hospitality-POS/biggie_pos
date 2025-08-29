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
  Empty,
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
  CopyOutlined,
  PieChartOutlined,
  SnippetsOutlined,
} from "@ant-design/icons";
import { Line } from '@ant-design/charts';
import { getDashboardAnalysis, getBestSellers, getSalesChartData } from "@services/orders";
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const COLORS = {
  primary: "#1890ff",
  success: "#52c41a",
  warning: "#faad14",
  error: "#ff4d4f",
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
    return {
      trend: 'no-sales',
      trendText: `No sales ${PERIOD_LABELS[periodFilter]?.toLowerCase() || 'in selected period'}`,
      trendColor: COLORS.error,
      insights: [
        { type: 'negative', text: 'Zero revenue - immediate action needed' },
        { type: 'warning', text: 'Consider promotions or check shop operations' }
      ],
      performance: 'critical',
      performanceColor: COLORS.error,
      performanceText: 'Critical - No Sales',
      avgOrderValue: 0
    };
  }

  let performance, performanceColor, performanceText;
  if (totalOrders >= 15) {
    [performance, performanceColor, performanceText] = ['excellent', COLORS.success, 'Excellent Shop Performance'];
  } else if (totalOrders >= 8) {
    [performance, performanceColor, performanceText] = ['good', COLORS.success, 'Strong Shop Activity'];
  } else if (totalOrders >= 5) {
    [performance, performanceColor, performanceText] = ['moderate', COLORS.primary, 'Moderate Shop Activity'];
  } else if (totalOrders >= 1) {
    [performance, performanceColor, performanceText] = ['low', COLORS.warning, 'Low Shop Activity'];
  } else {
    [performance, performanceColor, performanceText] = ['critical', COLORS.error, 'Critical - Shop Issues'];
  }

  let trend, trendColor, trendText;
  if (growthRate > 20) {
    [trend, trendColor, trendText] = ['up-strong', COLORS.success, `Shop Accelerating (+${growthRate.toFixed(1)}%)`];
  } else if (growthRate > 5) {
    [trend, trendColor, trendText] = ['up', COLORS.success, `Shop Growing (+${growthRate.toFixed(1)}%)`];
  } else if (growthRate > -5) {
    [trend, trendColor, trendText] = ['neutral', COLORS.gray, `Shop Stable (${growthRate.toFixed(1)}%)`];
  } else if (growthRate > -15) {
    [trend, trendColor, trendText] = ['down', COLORS.warning, `Shop Slowing (${growthRate.toFixed(1)}%)`];
  } else {
    [trend, trendColor, trendText] = ['down-critical', COLORS.error, `Critical Shop Decline (${growthRate.toFixed(1)}%)`];
  }

  const insights = [];

  if (totalOrders > 0) {
    if (avgOrderValue > 2000) {
      insights.push({ type: 'positive', text: `Excellent order value: Ksh ${avgOrderValue.toFixed(0)}` });
    } else if (avgOrderValue < 400) {
      insights.push({ type: 'warning', text: `Consider upselling - avg: Ksh ${avgOrderValue.toFixed(0)}` });
    }
  }

  if (chartData?.data?.summary?.peak_period) {
    const peak = chartData.data.summary.peak_period;
    insights.push({
      type: 'positive',
      text: `Peak shop period: ${peak.time} (Ksh ${peak.sales?.toLocaleString()})`
    });
  }

  return {
    trend, trendText, trendColor, insights, performance,
    performanceColor, performanceText, avgOrderValue
  };
};

const createOrderColumns = () => [
  { title: "Order No", dataIndex: "order_no", key: "order_no", width: 120 },
  { title: "Table", dataIndex: "table", key: "table", width: 80 },
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
  { title: "Served By", dataIndex: "servedBy", key: "servedBy", ellipsis: true },
];

const createStockColumns = () => [
  { title: "Item Name", dataIndex: "name", key: "name", ellipsis: true },
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
  { title: "Min Required", dataIndex: "min_viable_quantity", key: "min_viable_quantity", width: 100 },
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
          text={isOutOfStock ? "Out of stock" : isLow ? `${record.quantity} left` : "Low stock"}
        />
      );
    },
  },
];

const createBestSellerColumns = () => [
  {
    title: "Rank",
    dataIndex: "rank",
    key: "rank",
    width: 60,
    render: (rank) => (
      <div style={{ textAlign: 'center' }}>
        {rank <= 3 ? (
          <TrophyOutlined
            style={{
              color: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : '#cd7f32',
              fontSize: rank === 1 ? 18 : 16
            }}
          />
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
        <div style={{ fontWeight: 600, color: COLORS.success }}>{quantity} units</div>
        <div style={{ fontSize: 12, color: COLORS.gray }}>{record.sales_metrics.order_count} orders</div>
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
        <div style={{ fontWeight: 600, color: COLORS.primary }}>Ksh {revenue?.toLocaleString()}</div>
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

const createPOColumns = () => [
  { title: "PO Number", dataIndex: "po_number", key: "po_number", width: 120 },
  { title: "Supplier", dataIndex: ["supplier_id", "name"], key: "supplier_name", ellipsis: true },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    width: 120,
    render: (status) => {
      const statusColors = {
        pending: COLORS.warning,
        approved: COLORS.primary,
        partially_delivered: COLORS.cyan,
        fully_delivered: COLORS.success,
        cancelled: COLORS.error,
      };
      return (
        <Badge
          color={statusColors[status] || COLORS.gray}
          text={status?.replace('_', ' ')?.toUpperCase()}
        />
      );
    },
  },
  {
    title: "Amount",
    dataIndex: "total_amount",
    key: "total_amount",
    width: 120,
    render: (amount) => (
      <Text strong style={{ color: COLORS.primary }}>
        Ksh {amount?.toLocaleString()}
      </Text>
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
            title={<span style={{ color: COLORS.gray, fontWeight: 500, fontSize: 14 }}>{title}</span>}
            value={value || 0}
            prefix={prefix}
            precision={title.includes("Revenue") || title.includes("Amount") ? 2 : 0}
            valueStyle={{ color: "#1f2937", fontSize: "1.6rem", fontWeight: 600 }}
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
                <Text style={{ color: trend > 0 ? COLORS.success : trend < 0 ? COLORS.error : COLORS.gray }}>
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
    lineStyle: { stroke: COLORS.primary, lineWidth: 3 },
    point: { size: 5, style: { fill: COLORS.primary, stroke: '#fff', lineWidth: 2 } },
    tooltip: {
      formatter: (datum) => [
        { name: 'Total Sales', value: `Ksh ${Number(datum.sales)?.toLocaleString()}` },
        { name: 'Total Orders', value: `${datum.orders} orders` },
        { name: 'Avg Order Value', value: `Ksh ${Number(datum.avgOrderValue)?.toLocaleString()}` },
        { name: 'Cumulative Sales', value: `Ksh ${Number(datum.cumulativeSales)?.toLocaleString()}` }
      ],
    },
    xAxis: {
      label: { style: { fill: '#64748b', fontSize: 12 }, autoRotate: true },
      line: { style: { stroke: '#e2e8f0' } }
    },
    yAxis: {
      label: {
        style: { fill: '#64748b', fontSize: 12 },
        formatter: (value) => {
          const numValue = Number(value);
          if (numValue >= 1000000) return `${(numValue / 1000000).toFixed(1)}M`;
          if (numValue >= 1000) return `${(numValue / 1000).toFixed(0)}K`;
          return `${numValue}`;
        },
      },
      min: 0,
      grid: { line: { style: { stroke: '#f0f0f0', lineWidth: 1, lineDash: [3, 3] } } }
    },
    animation: { appear: { animation: 'path-in', duration: 1000 } },
  }), [chartData]);

  return (
    <Card
      title={<Space><LineChartOutlined style={{ color: COLORS.primary }} />{title}</Space>}
      extra={businessIndicators && (
        <Space size="large">
          <Space>
            <Badge status={
              businessIndicators.performance === 'excellent' ? 'success' :
                businessIndicators.performance === 'good' ? 'processing' :
                  businessIndicators.performance === 'moderate' ? 'default' :
                    businessIndicators.performance === 'low' ? 'warning' : 'error'
            } />
            <Text style={{ color: businessIndicators.performanceColor, fontWeight: 600 }}>
              {businessIndicators.performanceText}
            </Text>
          </Space>
        </Space>
      )}
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
                    status={insight.type === 'positive' ? 'success' : insight.type === 'warning' ? 'warning' : 'error'}
                    text={
                      <Text style={{
                        color: insight.type === 'positive' ? COLORS.success :
                          insight.type === 'warning' ? COLORS.warning : COLORS.error,
                        fontSize: 12
                      }}>
                        {insight.text}
                      </Text>
                    }
                  />
                ))}
              </Space>
              <Divider style={{ margin: '12px 0' }} />
            </div>
          )}
          {chartData.length > 0 ? <Line {...config} /> : <Empty description="No chart data available" />}
        </>
      )}
    </Card>
  );
};

const BestSellersCard = ({ bestSellersData, loading, dateRange }) => {
  const bestSellers = useMemo(() => {
    if (!bestSellersData?.data?.best_sellers?.length) return [];
    return bestSellersData.data.best_sellers.map((item, index) => ({ ...item, rank: index + 1 }));
  }, [bestSellersData]);

  const summary = bestSellersData?.data?.summary || {};

  if (!bestSellers.length && !loading) {
    return (
      <Card
        title={<Space><FireOutlined style={{ color: COLORS.orange }} />Top Selling Products in This Shop ({dateRange})</Space>}
        style={{ borderRadius: 12 }}
      >
        <Empty
          image={<FireOutlined style={{ fontSize: 48, color: COLORS.orange }} />}
          description={
            <div>
              <Title level={4} style={{ color: COLORS.gray }}>No Sales Data</Title>
              <Text type="secondary">No products have been sold during this period in this shop.</Text>
            </div>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      title={<Space><FireOutlined style={{ color: COLORS.orange }} />Top Selling Products in This Shop ({dateRange})</Space>}
      extra={summary.total_products_analyzed > 0 && (
        <Space>
          <Badge count={summary.total_products_analyzed} style={{ backgroundColor: COLORS.primary }} />
          <Text type="secondary">Products analyzed</Text>
        </Space>
      )}
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
                  <Statistic title="Total Revenue" value={summary.total_revenue} prefix="Ksh" precision={2}
                    valueStyle={{ fontSize: 16, fontWeight: 600 }} />
                </Col>
                <Col span={8}>
                  <Statistic title="Units Sold" value={summary.total_quantity_sold}
                    valueStyle={{ fontSize: 16, fontWeight: 600 }} />
                </Col>
                <Col span={8}>
                  <Statistic title="Avg Order Value" value={summary.average_order_value} prefix="Ksh" precision={2}
                    valueStyle={{ fontSize: 16, fontWeight: 600 }} />
                </Col>
              </Row>
            </div>
          )}
          <Table
            columns={createBestSellerColumns()}
            dataSource={bestSellers}
            pagination={{ pageSize: 10, showSizeChanger: false, showQuickJumper: true }}
            size="middle"
            rowKey="product_id"
            scroll={{ x: 800 }}
          />
        </>
      )}
    </Card>
  );
};

const Dashboard = () => {
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
  const shopId = localStorage.getItem("shopId");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["dashBoardAnalysis", startDate.format(), endDate.format()],
    queryFn: () => getDashboardAnalysis(startDate.toISOString(), endDate.toISOString()),
    networkMode: "always",
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 2,
    onError: () => {
      notification.error({
        message: "Failed to fetch dashboard data. Please try again.",
        duration: 3,
        placement: "bottomRight",
      });
    },
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["salesChartData", periodFilter, startDate.format(), endDate.format(), shopId],
    queryFn: () => getSalesChartData({
      period: periodFilter,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      shop_id: shopId
    }),
    networkMode: "always",
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 2,
  });

  const { data: bestSellersData, isLoading: bestSellersLoading } = useQuery({
    queryKey: ["bestSellers", startDate.format(), endDate.format(), shopId],
    queryFn: () => getBestSellers({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      shop_id: shopId,
      limit: 10
    }),
    networkMode: "always",
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 2,
  });

  const purchaseOrderStats = useMemo(() => {
    if (!data?.purchaseOrderStats) {
      return {
        totalPurchaseOrders: 0,
        totalPOValue: 0,
        pendingPOs: 0,
        approvedPOs: 0,
        deliveredPOs: 0,
        avgPOValue: 0,
        recentPurchaseOrders: []
      };
    }
    return data.purchaseOrderStats;
  }, [data]);

  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      messageApi.success({ content: "Shop dashboard refreshed successfully!", duration: 2 });
    } catch (error) {
      messageApi.error({ content: "Failed to refresh dashboard. Please try again.", duration: 3 });
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

  const handleCopyStaffUrl = useCallback(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const tenantId = tenant?._id || null;

    const staffUrl = `${import.meta.env.VITE_APP_URL}/admin/staff-clock-in?tenant_id=${tenantId}&shop_id=${shopId}`;

    navigator.clipboard.writeText(staffUrl)
      .then(() => messageApi.success({ content: "Staff URL copied to clipboard!", duration: 2 }))
      .catch(() => messageApi.error({ content: "Failed to copy URL", duration: 2 }));
  }, [messageApi, shopId]);

  const handleCopyCustomerUrl = useCallback(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const tenantId = tenant?._id || null;

    const customerUrl = `${import.meta.env.VITE_APP_URL}/admin/customers?tenant_id=${tenantId}&shop_id=${shopId}`;

    navigator.clipboard.writeText(customerUrl)
      .then(() => messageApi.success({ content: "Customer URL copied to clipboard!", duration: 2 }))
      .catch(() => messageApi.error({ content: "Failed to copy URL", duration: 2 }));
  }, [messageApi, shopId]);

  const statisticsData = useMemo(() => [
    {
      title: periodFilter === "day" ? "Today's Orders" : "Total Orders",
      value: chartData?.data?.summary?.total_orders || data?.totalOrderCount,
      prefix: <ShoppingCartOutlined style={{ color: COLORS.primary }} />,
      trend: chartData?.data?.summary?.growth_rate,
      onClick: () => navigate('/orders'),
    },
    {
      title: "Total Revenue",
      value: chartData?.data?.summary?.total_sales || data?.todayRevenue,
      prefix: <DollarOutlined style={{ color: COLORS.success }} />,
    },
    {
      title: "Active Orders",
      value: data?.activeOrders,
      prefix: <SnippetsOutlined style={{ color: COLORS.orange }} />,
    },
    {
      title: "Active Shifts",
      value: data?.activeShift,
      prefix: <TeamOutlined style={{ color: COLORS.primary }} />,
    },
  ], [chartData, data, navigate, periodFilter]);

  const businessIndicators = useMemo(() =>
    calculateBusinessIndicators(chartData, data, periodFilter), [chartData, data, periodFilter]);

  const getFormattedDateRange = useCallback(() => {
    const dateFormat = 'MMM D, YYYY';
    switch (periodFilter) {
      case "day": return startDate.format('MMMM D, YYYY');
      case "week": return `${startDate.format(dateFormat)} - ${endDate.format(dateFormat)}`;
      case "month": return startDate.format('MMMM YYYY');
      case "year": return startDate.format('YYYY');
      case "custom":
        if (customDateRange?.length === 2) {
          return `${customDateRange[0].format(dateFormat)} - ${customDateRange[1].format(dateFormat)}`;
        }
        return "Custom Range";
      default: return startDate.format('MMMM D, YYYY');
    }
  }, [periodFilter, startDate, endDate, customDateRange]);

  const isDataLoading = isLoading || isRefetching || chartLoading;

  return (
    <>
      {contextHolder}

      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 600, color: "#1e293b" }}>
            {PERIOD_LABELS[periodFilter]} Shop Overview
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            {getFormattedDateRange()} • Individual Shop Performance
          </Text>
        </div>

        <Space wrap size="middle">
          <Card size="small" style={{ borderRadius: 8 }}>
            <Flex align="center" gap={12}>
              <CalendarOutlined style={{ color: COLORS.primary }} />
              <Radio.Group value={periodFilter} onChange={handlePeriodChange} buttonStyle="solid" size="small">
                <Radio.Button value="day">Day</Radio.Button>
                <Radio.Button value="week">Week</Radio.Button>
                <Radio.Button value="month">Month</Radio.Button>
                <Radio.Button value="year">Year</Radio.Button>
                <Radio.Button value="custom">Custom</Radio.Button>
              </Radio.Group>
            </Flex>
          </Card>

          {showCustomDatePicker && (
            <RangePicker
              value={customDateRange}
              onChange={handleCustomDateChange}
              allowClear
              style={{ minWidth: 280 }}
              placeholder={['Start date', 'End date']}
            />
          )}

          <Tooltip title="Share this URL with staff to allow them to clock in for this shop">
            <Button
              type="default"
              icon={<TeamOutlined />}
              onClick={handleCopyStaffUrl}
              style={{ fontWeight: 500 }}
            >
              Staff Clock-In URL
            </Button>
          </Tooltip>

          <Tooltip title="Share this URL with customers to allow them to place orders for this shop">
            <Button
              type="default"
              icon={<ShoppingCartOutlined />}
              onClick={handleCopyCustomerUrl}
              style={{ fontWeight: 500 }}
            >
              Customer Order URL
            </Button>
          </Tooltip>

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
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16, marginBottom: 24 }}>
        {statisticsData.map((stat, index) => (
          <StatisticCard key={index} loading={isDataLoading} {...stat} />
        ))}
      </Row>

      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card
            title={<Space><FileTextOutlined style={{ color: COLORS.purple }} />Purchase Orders Overview</Space>}
            extra={<Button type="link" onClick={() => navigate('/purchase-orders')}>View All</Button>}
            style={{ borderRadius: 12 }}
          >
            {isDataLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
              <Row gutter={[24, 16]}>
                {[
                  { value: purchaseOrderStats.totalPurchaseOrders, label: "Total Purchase Orders", color: COLORS.purple, desc: "All time" },
                  { value: `Ksh ${purchaseOrderStats.totalPOValue.toLocaleString()}`, label: "Total PO Value", color: COLORS.success, desc: "Procurement spending" },
                  { value: purchaseOrderStats.pendingPOs, label: "Pending Approval", color: COLORS.warning, desc: "Need attention" },
                  { value: purchaseOrderStats.deliveredPOs, label: "Delivered", color: COLORS.cyan, desc: "Completed orders" }
                ].map((item, index) => (
                  <Col xs={24} sm={12} md={6} key={index}>
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: item.color, marginBottom: 4 }}>
                        {item.value}
                      </div>
                      <div style={{ color: COLORS.gray, fontSize: 14 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>{item.desc}</div>
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </Col>
      </Row>

      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          {chartData?.data?.chart_data?.length > 0 ? (
            <SalesChart
              data={chartData.data.chart_data}
              loading={chartLoading}
              title={`Shop Sales Trends - ${getFormattedDateRange()}`}
              businessIndicators={businessIndicators}
            />
          ) : (
            <Card
              title={<Space><LineChartOutlined style={{ color: COLORS.primary }} />Shop Sales Trends - {getFormattedDateRange()}</Space>}
              extra={businessIndicators && (
                <Space size="large">
                  <Badge status="error" />
                  <Text style={{ color: businessIndicators.performanceColor, fontWeight: 600 }}>
                    {businessIndicators.performanceText}
                  </Text>
                </Space>
              )}
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
                            status={insight.type === 'positive' ? 'success' : insight.type === 'warning' ? 'warning' : 'error'}
                            text={
                              <Text style={{
                                color: insight.type === 'positive' ? COLORS.success :
                                  insight.type === 'warning' ? COLORS.warning : COLORS.error,
                                fontSize: 12
                              }}>
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
                          No Sales {PERIOD_LABELS[periodFilter]} In This Shop
                        </Title>
                        <Text type="secondary" style={{ fontSize: 16 }}>
                          {periodFilter === 'day' ? 'Check shop operations and connectivity.' :
                            periodFilter === 'week' ? 'Review shop strategies and operational issues.' :
                              'Consider shop-specific strategy adjustments.'}
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

      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          <BestSellersCard
            bestSellersData={bestSellersData}
            loading={bestSellersLoading}
            dateRange={getFormattedDateRange()}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<Space><ShoppingCartOutlined style={{ color: COLORS.primary }} />Recent Orders ({getFormattedDateRange()})</Space>}
            extra={
              <Space>
                <Badge count={data?.totalOrderCount || 0} style={{ backgroundColor: COLORS.primary }} />
                <Button type="link" onClick={() => navigate('/orders')}>View All</Button>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            {isDataLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <Table
                columns={createOrderColumns()}
                dataSource={Array.isArray(data?.currentOrders) ? data.currentOrders : []}
                pagination={{ pageSize: 5, hideOnSinglePage: true, showSizeChanger: false }}
                size="middle"
                rowClassName={() => "hover:bg-gray-50 transition-colors"}
                locale={{
                  emptyText: (
                    <Empty
                      image={<ShoppingCartOutlined style={{ fontSize: 32, color: COLORS.gray }} />}
                      description="No recent orders"
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
            title={<Space><WarningOutlined style={{ color: COLORS.error }} />Low Stock Alerts</Space>}
            extra={
              <Space>
                {data?.lowStockItems?.length > 0 && (
                  <Badge count={data.lowStockItems.length} style={{ backgroundColor: COLORS.error }} />
                )}
                <Button type="link" onClick={() => navigate('/inventory')}>View All</Button>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            {isDataLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <Table
                columns={createStockColumns()}
                dataSource={Array.isArray(data?.lowStockItems) ? data.lowStockItems : []}
                pagination={{ pageSize: 5, hideOnSinglePage: true, showSizeChanger: false }}
                size="middle"
                rowClassName={() => "hover:bg-gray-50 transition-colors"}
                locale={{
                  emptyText: (
                    <Empty
                      image={<CheckCircleOutlined style={{ fontSize: 32, color: COLORS.success }} />}
                      description="All items are well stocked"
                      style={{ padding: '20px' }}
                    />
                  )
                }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card
            title={<Space><FileTextOutlined style={{ color: COLORS.purple }} />Recent Purchase Orders</Space>}
            extra={
              <Space>
                {purchaseOrderStats.totalPurchaseOrders > 0 && (
                  <Badge count={purchaseOrderStats.totalPurchaseOrders} style={{ backgroundColor: COLORS.purple }} />
                )}
                <Button type="link" onClick={() => navigate('/purchase-orders')}>View All</Button>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            {isDataLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <Table
                columns={createPOColumns()}
                dataSource={purchaseOrderStats.recentPurchaseOrders || []}
                pagination={{ pageSize: 5, hideOnSinglePage: true, showSizeChanger: false }}
                size="middle"
                rowKey="_id"
                rowClassName={() => "hover:bg-gray-50 transition-colors"}
                locale={{
                  emptyText: (
                    <Empty
                      image={<FileTextOutlined style={{ fontSize: 32, color: COLORS.gray }} />}
                      description="No recent purchase orders"
                      style={{ padding: '20px' }}
                    />
                  )
                }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card
            title={<Space><SyncOutlined style={{ color: COLORS.cyan }} />Purchase Order Insights</Space>}
            style={{ borderRadius: 12 }}
          >
            {isDataLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <div style={{ padding: '16px' }}>
                {purchaseOrderStats.totalPurchaseOrders > 0 ? (
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Delivery Rate</Text>
                        <Text strong>
                          {((purchaseOrderStats.deliveredPOs / purchaseOrderStats.totalPurchaseOrders) * 100).toFixed(1)}%
                        </Text>
                      </div>
                      <Progress
                        percent={(purchaseOrderStats.deliveredPOs / purchaseOrderStats.totalPurchaseOrders) * 100}
                        strokeColor={COLORS.success}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Pending Orders</Text>
                        <Text strong style={{ color: COLORS.warning }}>
                          {purchaseOrderStats.pendingPOs} orders
                        </Text>
                      </div>
                      <Progress
                        percent={(purchaseOrderStats.pendingPOs / purchaseOrderStats.totalPurchaseOrders) * 100}
                        strokeColor={COLORS.warning}
                      />
                    </div>

                    <Divider style={{ margin: '16px 0' }} />

                    <Row gutter={16}>
                      <Col span={12}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.purple }}>
                            Ksh {purchaseOrderStats.avgPOValue.toLocaleString()}
                          </div>
                          <div style={{ fontSize: 12, color: COLORS.gray }}>Average PO Value</div>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.primary }}>
                            {purchaseOrderStats.approvedPOs}
                          </div>
                          <div style={{ fontSize: 12, color: COLORS.gray }}>Approved Orders</div>
                        </div>
                      </Col>
                    </Row>
                  </Space>
                ) : (
                  <Empty
                    image={<FileTextOutlined style={{ fontSize: 48, color: COLORS.gray }} />}
                    description="No purchase orders found"
                  />
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title={<Space><PieChartOutlined style={{ color: COLORS.purple }} />Shop Performance Summary ({getFormattedDateRange()})</Space>}
            style={{ borderRadius: 12 }}
          >
            {isDataLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
              <Row gutter={[24, 16]}>
                {[
                  { value: data?.totalOrderCount || 0, label: "Total Orders", color: COLORS.primary, desc: "This shop" },
                  { value: `Ksh ${(data?.todayRevenue || 0).toLocaleString()}`, label: "Total Revenue", color: COLORS.success, desc: "Shop revenue" },
                  { value: data?.activeOrders || 0, label: "Active Orders", color: COLORS.orange, desc: "Currently processing" },
                  { value: data?.activeShift || 0, label: "Active Shifts", color: COLORS.cyan, desc: "Staff on duty" }
                ].map((item, index) => (
                  <Col xs={24} sm={12} md={6} key={index}>
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: item.color, marginBottom: 4 }}>
                        {item.value}
                      </div>
                      <div style={{ color: COLORS.gray, fontSize: 14 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>{item.desc}</div>
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </Col>

        {chartData?.data?.summary && (
          <Col span={24} style={{ marginTop: 16 }}>
            <Card
              title={<Space><RiseOutlined style={{ color: COLORS.success }} />Advanced Shop Metrics ({getFormattedDateRange()})</Space>}
              style={{ borderRadius: 12 }}
            >
              <Row gutter={[24, 16]}>
                {[
                  { value: chartData.data.summary.data_points, label: "Data Points", color: COLORS.primary, desc: "Reporting periods" },
                  {
                    value: `${chartData.data.summary.growth_rate > 0 ? '+' : ''}${chartData.data.summary.growth_rate.toFixed(1)}%`,
                    label: "Growth Rate",
                    color: chartData.data.summary.growth_rate >= 0 ? COLORS.success : COLORS.error,
                    desc: "Shop trend"
                  },
                  { value: `Ksh ${chartData.data.summary.average_order_value?.toLocaleString()}`, label: "Avg Order Value", color: COLORS.orange, desc: "Shop average" },
                  { value: chartData.data.summary.peak_period?.time || 'N/A', label: "Peak Period", color: COLORS.cyan, desc: "Highest sales time" }
                ].map((item, index) => (
                  <Col xs={24} sm={12} md={6} key={index}>
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: item.color, marginBottom: 4 }}>
                        {item.value}
                      </div>
                      <div style={{ color: COLORS.gray, fontSize: 14 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>{item.desc}</div>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        )}
      </Row>
    </>
  );
};

export default Dashboard;