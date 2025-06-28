import React, { useState } from "react";
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
  Tooltip,
  Radio,
  DatePicker,
  Divider,
  Flex,
  Tag,
  Progress,
} from "antd";
import {
  ShoppingCartOutlined,
  ShopOutlined,
  TruckOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  TableOutlined,
  CopyOutlined,
  UsergroupAddOutlined,
  ReloadOutlined,
  WarningOutlined,
  MoneyCollectOutlined,
  SnippetsOutlined,
  ContactsOutlined,
  CalendarOutlined,
  LineChartOutlined,
  FireOutlined,
  TrophyOutlined,
  RiseOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { Line } from '@ant-design/charts';
import { getDashboardAnalysis, getBestSellers, getBestSellersByCategory, getSalesChartData } from "@services/orders";
import { CheckCard } from "@ant-design/pro-components";
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const COLORS = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
  purple: "#8b5cf6",
  orange: "#f97316",
  cyan: "#06b6d4",
};

const calculateBusinessIndicators = (chartData, apiData, periodFilter) => {
  const totalRevenue = chartData?.summary?.total_sales || apiData?.todayRevenue || 0;
  const totalOrders = chartData?.summary?.total_orders || apiData?.totalOrderCount || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const growthRate = chartData?.summary?.growth_rate || 0;

  if (!chartData?.chart_data?.length || totalRevenue === 0) {
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
  let performanceText = 'Business Active';

  if (totalOrders >= 10) {
    performance = 'good';
    performanceColor = COLORS.success;
    performanceText = 'Strong Activity';
  } else if (totalOrders >= 5) {
    performance = 'moderate';
    performanceColor = COLORS.primary;
    performanceText = 'Moderate Activity';
  } else if (totalOrders >= 1) {
    performance = 'low';
    performanceColor = COLORS.warning;
    performanceText = 'Low Activity';
  }

  let trend = 'neutral';
  let trendColor = '#8c8c8c';
  let trendText = 'Stable';

  if (growthRate > 15) {
    trend = 'up-strong';
    trendColor = COLORS.success;
    trendText = `Accelerating (+${growthRate.toFixed(1)}%)`;
  } else if (growthRate > 0) {
    trend = 'up';
    trendColor = COLORS.success;
    trendText = `Growing (+${growthRate.toFixed(1)}%)`;
  } else if (growthRate < -30) {
    trend = 'down-critical';
    trendColor = COLORS.error;
    trendText = `Sharp Decline (-${Math.abs(growthRate).toFixed(1)}%)`;
  } else if (growthRate < -10) {
    trend = 'down-strong';
    trendColor = COLORS.error;
    trendText = `Declining (-${Math.abs(growthRate).toFixed(1)}%)`;
  } else if (growthRate < 0) {
    trend = 'down';
    trendColor = COLORS.warning;
    trendText = `Slowing (-${Math.abs(growthRate).toFixed(1)}%)`;
  }

  const insights = [];

  if (totalOrders > 0) {
    if (avgOrderValue > 1500) {
      insights.push({ type: 'positive', text: `Excellent order value: Ksh ${avgOrderValue.toFixed(0)}` });
    } else if (avgOrderValue < 300) {
      insights.push({ type: 'warning', text: `Consider upselling - avg: Ksh ${avgOrderValue.toFixed(0)}` });
    }
  }

  if (periodFilter === 'day') {
    if (totalOrders === 0) {
      insights.push({ type: 'negative', text: 'No orders today - check operations' });
    } else if (totalOrders < 3) {
      insights.push({ type: 'warning', text: 'Low daily volume - need more customers' });
    }
  } else if (periodFilter === 'week') {
    if (totalOrders < 10) {
      insights.push({ type: 'warning', text: 'Weekly sales below expectations' });
    }
  } else if (periodFilter === 'month') {
    if (totalOrders < 30) {
      insights.push({ type: 'warning', text: 'Monthly performance needs improvement' });
    }
  }

  if (trend === 'down-critical' || trend === 'down-strong') {
    insights.push({ type: 'negative', text: 'Sales declining - review strategy urgently' });
  } else if (trend === 'down') {
    insights.push({ type: 'warning', text: 'Sales slowing - monitor closely' });
  } else if (trend === 'up-strong') {
    insights.push({ type: 'positive', text: 'Strong growth momentum!' });
  }

  if (chartData?.summary?.peak_period) {
    insights.push({
      type: 'positive',
      text: `Peak period: ${chartData.summary.peak_period.time} (Ksh ${chartData.summary.peak_period.sales.toLocaleString()})`
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
  },
  {
    title: "Table",
    dataIndex: "table",
    key: "table",
  },
  {
    title: "Amount",
    dataIndex: "order_amount",
    key: "order_amount",
    render: (amount) => `Ksh ${amount.toFixed(2)}`,
  },
  {
    title: "Served By",
    dataIndex: "servedBy",
    key: "servedBy",
  },
];

const STOCK_COLUMNS = [
  {
    title: "Item Name",
    dataIndex: "name",
    key: "name",
  },
  {
    title: "Current Stock",
    dataIndex: "quantity",
    key: "quantity",
  },
  {
    title: "Minimum Required",
    dataIndex: "min_viable_quantity",
    key: "min_viable_quantity",
  },
  {
    title: "Status",
    key: "status",
    render: (_, record) => (
      <Badge status="error" text={`${record.quantity} remaining`} />
    ),
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
          <TrophyOutlined style={{ color: '#ffd700', fontSize: 16 }} />
        ) : rank === 2 ? (
          <TrophyOutlined style={{ color: '#c0c0c0', fontSize: 16 }} />
        ) : rank === 3 ? (
          <TrophyOutlined style={{ color: '#cd7f32', fontSize: 16 }} />
        ) : (
          <span style={{ fontWeight: 600, color: COLORS.primary }}>{rank}</span>
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
        <div style={{ fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 12, color: '#888' }}>
          {record.category?.name || 'Uncategorized'} • {record.product_type}
        </div>
      </div>
    ),
  },
  {
    title: "Sold",
    dataIndex: ["sales_metrics", "total_quantity_sold"],
    key: "quantity_sold",
    sorter: (a, b) => a.sales_metrics.total_quantity_sold - b.sales_metrics.total_quantity_sold,
    render: (quantity, record) => (
      <div>
        <div style={{ fontWeight: 600, color: COLORS.success }}>
          {quantity} units
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>
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
          Ksh {revenue.toLocaleString()}
        </div>
        {record.sales_metrics.total_profit && (
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
          <Tag color={record.performance_indicators.is_top_performer ? 'gold' : 'blue'}>
            {record.performance_indicators.is_top_performer ? 'Top Performer' : 'Popular'}
          </Tag>
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>
          Avg: {record.performance_indicators.avg_quantity_per_order.toFixed(1)} per order
        </div>
      </div>
    ),
  },
];

const StatisticCard = ({ title, value, prefix, loading }) => (
  <Col xs={24} sm={12} lg={6}>
    <Card
      bordered={false}
      style={{
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        boxShadow: "0 8px 16px rgba(0,0,0,0.05)",
        borderRadius: 12,
      }}
    >
      {loading ? (
        <Skeleton active paragraph={false} />
      ) : (
        <Statistic
          title={
            <span style={{ color: "#6b7280", fontWeight: 500 }}>{title}</span>
          }
          value={value}
          prefix={prefix}
          precision={title === "Revenue" ? 2 : 0}
          valueStyle={{
            color: "#1f2937",
            fontSize: "1.8rem",
            fontWeight: 600,
          }}
        />
      )}
    </Card>
  </Col>
);

const SalesChart = ({ data, loading, title, businessIndicators }) => {
  const config = {
    data: data || [],
    xField: 'time',
    yField: 'sales',
    height: 300,
    smooth: true,
    lineStyle: {
      stroke: COLORS.primary,
      lineWidth: 3,
    },
    point: {
      size: 4,
      style: {
        fill: COLORS.primary,
        stroke: COLORS.primary,
        lineWidth: 2,
      },
    },
    tooltip: {
      formatter: (datum) => [
        {
          name: 'Sales',
          value: `Ksh ${datum.sales?.toLocaleString()}`,
        },
        {
          name: 'Orders',
          value: `${datum.orders} orders`,
        },
        {
          name: 'Cumulative Sales',
          value: `Ksh ${datum.cumulativeSales?.toLocaleString()}`,
        },
        {
          name: 'Avg Order Value',
          value: `Ksh ${datum.avgOrderValue?.toLocaleString()}`,
        }
      ],
    },
    xAxis: {
      label: {
        style: {
          fill: '#64748b',
          fontSize: 12,
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
          if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
          } else if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}K`;
          }
          return `Ksh ${value}`;
        },
      },
      min: 0,
    },
    grid: {
      line: {
        style: {
          stroke: '#f0f0f0',
          lineWidth: 1,
          lineDash: [3, 3],
        },
      },
    },
  };

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
                status={businessIndicators.performance === 'good' ? 'success' :
                  businessIndicators.performance === 'moderate' ? 'processing' :
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
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          {businessIndicators && businessIndicators.insights.length > 0 && (
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

          <Line {...config} />
        </>
      )}
    </Card>
  );
};

const BestSellersCard = ({ bestSellersData, loading, dateRange }) => {
  if (!bestSellersData?.data?.best_sellers?.length && !loading) {
    return (
      <Card
        title={
          <Space>
            <FireOutlined style={{ color: COLORS.orange }} />
            Best Sellers ({dateRange})
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8c8c8c' }}>
          <FireOutlined style={{ fontSize: 48, marginBottom: 16, color: '#ff7875' }} />
          <Title level={4} style={{ color: '#8c8c8c' }}>No Sales Data</Title>
          <Text type="secondary">No products have been sold during this period.</Text>
        </div>
      </Card>
    );
  }

  const bestSellers = bestSellersData?.data?.best_sellers || [];
  const summary = bestSellersData?.data?.summary || {};

  const rankedBestSellers = bestSellers.map((item, index) => ({
    ...item,
    rank: index + 1
  }));

  return (
    <Card
      title={
        <Space>
          <FireOutlined style={{ color: COLORS.orange }} />
          Best Sellers ({dateRange})
        </Space>
      }
      extra={
        summary.total_products_analyzed && (
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
          {summary.total_revenue && (
            <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Total Revenue"
                    value={summary.total_revenue}
                    prefix="Ksh"
                    precision={2}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Units Sold"
                    value={summary.total_quantity_sold}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Avg Order Value"
                    value={summary.average_order_value}
                    prefix="Ksh"
                    precision={2}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
              </Row>
            </div>
          )}

          <Table
            columns={BESTSELLER_COLUMNS}
            dataSource={rankedBestSellers}
            pagination={false}
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

  const getDateRange = () => {
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
        if (customDateRange && customDateRange.length === 2) {
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
  };

  const { startDate, endDate } = getDateRange();

  const shopId = localStorage.getItem("shopId");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["dashBoardAnalysis", startDate.format(), endDate.format()],
    queryFn: () => getDashboardAnalysis(
      startDate.toISOString(),
      endDate.toISOString()
    ),
    networkMode: "always",
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 2,
    onError: (error) => {
      messageApi.error({
        content: "Failed to fetch dashboard data. Please try again.",
        duration: 3,
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

  const handleRefresh = async () => {
    try {
      await refetch();
    } catch (error) {
      messageApi.error({
        content: "Failed to refresh dashboard. Please try again.",
        duration: 3,
      });
    }
  };

  const handlePeriodChange = (e) => {
    const value = e.target.value;
    setPeriodFilter(value);
    if (value === "custom") {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
    }
  };

  const handleCustomDateChange = (dates) => {
    setCustomDateRange(dates);
  };

  const handleCopyStaffUrl = () => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const tenantId = tenant?._id || null;
    const shopId = localStorage.getItem("shopId");

    const customerUrl = `${import.meta.env.VITE_APP_URL
      }/admin/staff-clock-in?tenant_id=${tenantId}&shop_id=${shopId}`;

    navigator.clipboard
      .writeText(customerUrl)
      .then(() => {
        messageApi.success({
          content: "Staff URL copied to clipboard!",
          duration: 2,
        });
      })
      .catch((err) => {
        messageApi.error({
          content: "Failed to copy URL",
          duration: 2,
        });
      });
  };

  const handleCopyCustomerUrl = () => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const tenantId = tenant?._id || null;
    const shopId = localStorage.getItem("shopId");

    const customerUrl = `${import.meta.env.VITE_APP_URL
      }/admin/customers?tenant_id=${tenantId}&shop_id=${shopId}`;

    navigator.clipboard
      .writeText(customerUrl)
      .then(() => {
        messageApi.success({
          content: "Customer URL copied to clipboard!",
          duration: 2,
        });
      })
      .catch((err) => {
        messageApi.error({
          content: "Failed to copy URL",
          duration: 2,
        });
      });
  };

  const statisticsData = [
    {
      title: "Orders",
      value: chartData?.data?.summary?.total_orders || data?.totalOrderCount,
      prefix: <ShoppingCartOutlined />,
    },
    {
      title: "Revenue",
      value: chartData?.data?.summary?.total_sales || data?.todayRevenue,
      prefix: "Ksh.",
    },
    {
      title: "Active Orders",
      value: data?.activeOrders,
      prefix: <SnippetsOutlined />,
    },
    {
      title: "Customers",
      value: data?.customerCount,
      prefix: <ContactsOutlined />,
    },
    {
      title: "Invoices",
      value: data?.invoiceCount,
      prefix: <MoneyCollectOutlined />,
    },
    {
      title: "Active Shifts",
      value: data?.activeShift,
      prefix: <TeamOutlined />,
    },
  ];

  const businessIndicators = calculateBusinessIndicators(chartData?.data, data, periodFilter);

  const getFormattedDateRange = () => {
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
        if (customDateRange && customDateRange.length === 2) {
          return `${customDateRange[0].format(dateFormat)} - ${customDateRange[1].format(dateFormat)}`;
        }
        return "Custom Range";
      default:
        return startDate.format('MMMM D, YYYY');
    }
  };

  return (
    <>
      {contextHolder}

      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {periodFilter === "day" ? "Today's Overview" : "Overview"}
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {getFormattedDateRange()}
          </Text>
        </div>
        <Space wrap>
          <Flex align="center" wrap="wrap" gap={16}>
            <Flex align="center">
              <CalendarOutlined style={{ marginRight: 8, color: COLORS.primary }} />
              <Title level={5} style={{ margin: 0 }}>
                Filter by Period
              </Title>
            </Flex>
            <Radio.Group
              value={periodFilter}
              onChange={handlePeriodChange}
              buttonStyle="solid"
              size="middle"
            >
              <Radio.Button value="day">Day</Radio.Button>
              <Radio.Button value="week">Week</Radio.Button>
              <Radio.Button value="month">Month</Radio.Button>
              <Radio.Button value="year">Year</Radio.Button>
              <Radio.Button value="custom">Custom</Radio.Button>
            </Radio.Group>

            {showCustomDatePicker && (
              <RangePicker
                value={customDateRange}
                onChange={handleCustomDateChange}
                allowClear={false}
                style={{ flexGrow: 1 }}
              />
            )}
          </Flex>
          <Button
            type="primary"
            icon={<ReloadOutlined spin={isRefetching} />}
            onClick={handleRefresh}
            loading={isLoading || isRefetching}
            style={{ fontWeight: 500 }}
          >
            {isRefetching ? "Refreshing..." : "Refresh Data"}
          </Button>
          <Tooltip title="Copy Customer URL">
            <Button icon={<CopyOutlined />} onClick={handleCopyCustomerUrl}>
              Customer URL
            </Button>
          </Tooltip>
          <Tooltip title="Copy Staff URL">
            <Button icon={<CopyOutlined />} onClick={handleCopyStaffUrl}>
              Staff URL
            </Button>
          </Tooltip>
        </Space>
      </Row>

      <Row gutter={[16, 16]}>
        {statisticsData.map((stat, index) => (
          <StatisticCard
            key={index}
            loading={isLoading || isRefetching || chartLoading}
            {...stat}
          />
        ))}
      </Row>

      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          {chartData?.data?.chart_data?.length > 0 ? (
            <SalesChart
              data={chartData.data.chart_data}
              loading={chartLoading}
              title={`Sales Trends - ${getFormattedDateRange()}`}
              businessIndicators={businessIndicators}
            />
          ) : (
            <Card
              title={
                <Space>
                  <LineChartOutlined style={{ color: COLORS.primary }} />
                  {`Sales Trends - ${getFormattedDateRange()}`}
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
              style={{ borderRadius: 12, marginBottom: 24 }}
            >
              {chartLoading ? (
                <Skeleton active paragraph={{ rows: 6 }} />
              ) : (
                <>
                  {businessIndicators && businessIndicators.insights.length > 0 && (
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

                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: '#8c8c8c'
                  }}>
                    <LineChartOutlined style={{ fontSize: 48, marginBottom: 16, color: '#ff4d4f' }} />
                    <Title level={4} style={{ color: COLORS.error }}>
                      {periodFilter === 'day' ? 'No Sales Today' :
                        periodFilter === 'week' ? 'No Sales This Week' :
                          periodFilter === 'month' ? 'No Sales This Month' :
                            periodFilter === 'year' ? 'No Sales This Year' :
                              'No Sales in Selected Period'}
                    </Title>
                    <Text type="secondary">
                      {periodFilter === 'day' ? 'Focus on attracting customers today. Consider promotions or check if operations are running smoothly.' :
                        periodFilter === 'week' ? 'Weekly performance is concerning. Review marketing strategies and customer outreach.' :
                          periodFilter === 'month' ? 'Monthly sales are critical. Immediate action needed to recover business.' :
                            periodFilter === 'year' ? 'Annual performance requires urgent business strategy review.' :
                              'Consider adjusting business strategy for the selected time period.'}
                    </Text>
                  </div>
                </>
              )}
            </Card>
          )}
        </Col>
      </Row>

      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <BestSellersCard
            bestSellersData={bestSellersData}
            loading={bestSellersLoading}
            dateRange={getFormattedDateRange()}
          />
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={`Recent Orders (${getFormattedDateRange()})`}
            extra={<a href="/orders">View All</a>}
            style={{ borderRadius: 12 }}
          >
            {isLoading || isRefetching ? (
              <Skeleton active />
            ) : (
              <Table
                columns={ORDER_COLUMNS}
                dataSource={data?.currentOrders}
                pagination={false}
                size="middle"
                rowClassName="hover-row"
                locale={{
                  emptyText: (
                    <div style={{ padding: '20px', color: '#8c8c8c' }}>
                      <ShoppingCartOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                      <div>No recent orders</div>
                    </div>
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
                Low Stock Alerts
              </Space>
            }
            extra={<a href="/inventory">View All</a>}
            style={{ borderRadius: 12 }}
          >
            {isLoading || isRefetching ? (
              <Skeleton active />
            ) : (
              <Table
                columns={STOCK_COLUMNS}
                dataSource={data?.lowStockItems}
                pagination={false}
                size="middle"
                rowClassName="hover-row"
                locale={{
                  emptyText: (
                    <div style={{ padding: '20px', color: '#8c8c8c' }}>
                      <Badge status="success" />
                      <span style={{ marginLeft: 8 }}>All items are well stocked</span>
                    </div>
                  )
                }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Performance Summary */}
      {chartData?.data?.summary && (
        <Row style={{ marginTop: 24 }}>
          <Col span={24}>
            <Card
              title={
                <Space>
                  <RiseOutlined style={{ color: COLORS.success }} />
                  Period Performance Summary
                </Space>
              }
              style={{ borderRadius: 12 }}
            >
              <Row gutter={[24, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{ fontSize: 24, fontWeight: 600, color: COLORS.primary }}>
                      {chartData.data.summary.data_points}
                    </div>
                    <div style={{ color: '#8c8c8c', fontSize: 14 }}>Data Points</div>
                  </div>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{ fontSize: 24, fontWeight: 600, color: COLORS.success }}>
                      {chartData.data.summary.growth_rate > 0 ? '+' : ''}{chartData.data.summary.growth_rate.toFixed(1)}%
                    </div>
                    <div style={{ color: '#8c8c8c', fontSize: 14 }}>Growth Rate</div>
                  </div>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{ fontSize: 24, fontWeight: 600, color: COLORS.orange }}>
                      Ksh {chartData.data.summary.average_order_value.toLocaleString()}
                    </div>
                    <div style={{ color: '#8c8c8c', fontSize: 14 }}>Avg Order Value</div>
                  </div>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{ fontSize: 24, fontWeight: 600, color: COLORS.cyan }}>
                      {chartData.data.summary.peak_period?.time || 'N/A'}
                    </div>
                    <div style={{ color: '#8c8c8c', fontSize: 14 }}>Peak Period</div>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}
    </>
  );
};

export default Dashboard;