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
  notification,
  Radio,
  DatePicker,
  Flex,
  Divider,
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
} from "@ant-design/icons";
import { Line } from '@ant-design/charts';
import { getAdminDashboardAnalysis } from "@services/orders";
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
};

const processSalesData = (apiData, periodFilter, startDate, endDate) => {
  const totalRevenue = apiData?.todayRevenue || 0;
  const totalOrders = apiData?.totalOrderCount || 0;

  if (totalRevenue === 0 || !apiData?.currentOrders || apiData.currentOrders.length === 0) {
    return [];
  }

  const orders = apiData.currentOrders;

  const sortedOrders = orders
    .filter(order => order.createdAt && order.order_amount)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (sortedOrders.length === 0) return [];

  const salesData = [];
  let cumulativeTotal = 0;
  let cumulativeOrders = 0;

  const timeGroups = {};

  const generateTimeRange = () => {
    const timePoints = [];
    let current = startDate.clone();

    while (current.isBefore(endDate) || current.isSame(endDate)) {
      let timeKey;
      let nextIncrement;

      switch (periodFilter) {
        case "day":
          timeKey = current.format('HH:mm');
          nextIncrement = 'hour';
          if (current.hour() >= 6 && current.hour() <= 23) {
            timePoints.push({
              key: timeKey,
              date: current.clone(),
              display: timeKey
            });
          }
          break;
        case "week":
          timeKey = current.format('ddd');
          nextIncrement = 'day';
          timePoints.push({
            key: timeKey,
            date: current.clone(),
            display: current.format('ddd DD')
          });
          break;
        case "month":
          timeKey = current.format('MMM DD');
          nextIncrement = 'day';
          timePoints.push({
            key: timeKey,
            date: current.clone(),
            display: timeKey
          });
          break;
        case "year":
          timeKey = current.format('MMM');
          nextIncrement = 'month';
          timePoints.push({
            key: timeKey,
            date: current.clone(),
            display: timeKey
          });
          break;
        case "custom":
          const daysDiff = endDate.diff(startDate, 'days');
          if (daysDiff <= 7) {
            timeKey = current.format('ddd DD');
            nextIncrement = 'day';
          } else if (daysDiff <= 60) {
            timeKey = current.format('MMM DD');
            nextIncrement = 'day';
          } else {
            timeKey = current.format('MMM');
            nextIncrement = 'month';
          }
          timePoints.push({
            key: timeKey,
            date: current.clone(),
            display: timeKey
          });
          break;
        default:
          timeKey = current.format('MMM DD');
          nextIncrement = 'day';
          timePoints.push({
            key: timeKey,
            date: current.clone(),
            display: timeKey
          });
      }

      current = current.add(1, nextIncrement);
    }

    return timePoints;
  };

  const timeRange = generateTimeRange();

  timeRange.forEach(timePoint => {
    timeGroups[timePoint.key] = {
      time: timePoint.display,
      orderDate: timePoint.date,
      orders: [],
      hasData: false
    };
  });

  sortedOrders.forEach(order => {
    const orderDate = dayjs(order.createdAt);
    let timeKey;

    switch (periodFilter) {
      case "day":
        timeKey = orderDate.format('HH:mm');
        break;
      case "week":
        timeKey = orderDate.format('ddd');
        break;
      case "month":
        timeKey = orderDate.format('MMM DD');
        break;
      case "year":
        timeKey = orderDate.format('MMM');
        break;
      case "custom":
        const daysDiff = endDate.diff(startDate, 'days');
        if (daysDiff <= 7) {
          timeKey = orderDate.format('ddd DD');
        } else if (daysDiff <= 60) {
          timeKey = orderDate.format('MMM DD');
        } else {
          timeKey = orderDate.format('MMM');
        }
        break;
      default:
        timeKey = orderDate.format('MMM DD');
    }

    if (timeGroups[timeKey]) {
      timeGroups[timeKey].orders.push(order);
      timeGroups[timeKey].hasData = true;
    }
  });

  const sortedGroups = Object.values(timeGroups).sort((a, b) =>
    a.orderDate.isBefore(b.orderDate) ? -1 : 1
  );

  sortedGroups.forEach(group => {
    const periodSales = group.orders.reduce((sum, order) => sum + order.order_amount, 0);
    const periodOrders = group.orders.length;

    cumulativeTotal += periodSales;
    cumulativeOrders += periodOrders;

    salesData.push({
      time: group.time,
      sales: cumulativeTotal,
      orders: cumulativeOrders,
      periodSales: periodSales,
      periodOrders: periodOrders,
      hasData: group.hasData
    });
  });

  if (salesData.length > 0 && cumulativeTotal !== totalRevenue && cumulativeTotal > 0) {
    const scaleFactor = totalRevenue / cumulativeTotal;
    salesData.forEach(item => {
      item.sales = Math.round(item.sales * scaleFactor);
      item.periodSales = Math.round(item.periodSales * scaleFactor);
    });
  }

  if (salesData.every(item => !item.hasData) && totalRevenue > 0) {
    const revenuePerPeriod = totalRevenue / salesData.length;
    let runningTotal = 0;

    salesData.forEach(item => {
      runningTotal += revenuePerPeriod;
      item.sales = Math.round(runningTotal);
      item.periodSales = Math.round(revenuePerPeriod);
      item.orders = Math.round((totalOrders / salesData.length) * (salesData.indexOf(item) + 1));
      item.periodOrders = totalOrders > salesData.length ? 1 : 0;
    });
  }

  return salesData.filter(item => item.sales > 0 || item.periodSales > 0);
};

const calculateBusinessIndicators = (salesData, apiData, periodFilter) => {
  const totalRevenue = apiData?.todayRevenue || 0;
  const totalOrders = apiData?.totalOrderCount || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  if (!salesData || salesData.length === 0 || totalRevenue === 0) {
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

  if (salesData.length > 1) {
    const recentPeriods = salesData.slice(-Math.ceil(salesData.length / 3));
    const earlierPeriods = salesData.slice(0, Math.floor(salesData.length / 3));

    const recentAvg = recentPeriods.reduce((sum, item) => sum + (item.periodSales || 0), 0) / recentPeriods.length;
    const earlierAvg = earlierPeriods.reduce((sum, item) => sum + (item.periodSales || 0), 0) / earlierPeriods.length;

    if (earlierAvg > 0) {
      const changePercentage = ((recentAvg - earlierAvg) / earlierAvg) * 100;

      if (changePercentage > 15) {
        trend = 'up-strong';
        trendColor = COLORS.success;
        trendText = `Accelerating (+${changePercentage.toFixed(1)}%)`;
      } else if (changePercentage > 0) {
        trend = 'up';
        trendColor = COLORS.success;
        trendText = `Growing (+${changePercentage.toFixed(1)}%)`;
      } else if (changePercentage < -30) {
        trend = 'down-critical';
        trendColor = COLORS.error;
        trendText = `Sharp Decline (-${Math.abs(changePercentage).toFixed(1)}%)`;
      } else if (changePercentage < -10) {
        trend = 'down-strong';
        trendColor = COLORS.error;
        trendText = `Declining (-${Math.abs(changePercentage).toFixed(1)}%)`;
      } else if (changePercentage < 0) {
        trend = 'down';
        trendColor = COLORS.warning;
        trendText = `Slowing (-${Math.abs(changePercentage).toFixed(1)}%)`;
      }
    }
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
    title: "Shop",
    dataIndex: "shop_name",
    key: "shop_name",
  },
  {
    title: "Amount",
    dataIndex: "order_amount",
    key: "order_amount",
    render: (amount) => `ksh. ${amount.toFixed(2)}`,
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
    ellipsis: true,
  },
  {
    title: "Shop",
    dataIndex: "shop_name",
    key: "shop_name",
  },
  {
    title: "Current Stock",
    dataIndex: "quantity",
    key: "quantity",
  },
  {
    title: "Min Required",
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
    data,
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
          name: 'Total Sales',
          value: `Ksh ${datum.sales?.toLocaleString()}`,
        },
        {
          name: 'Total Orders',
          value: `${datum.orders} orders`,
        },
        {
          name: 'Period Sales',
          value: `Ksh ${datum.periodSales?.toLocaleString()}`,
        },
        {
          name: 'Period Orders',
          value: `${datum.periodOrders} orders`,
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
      max: undefined,
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
                status={businessIndicators.performance === 'excellent' ? 'success' :
                  businessIndicators.performance === 'good' ? 'processing' :
                    businessIndicators.performance === 'fair' ? 'warning' : 'error'}
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

const DashboardAdminPage = () => {
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

  const statisticsData = [
    {
      title: periodFilter === "day" ? "Today's Orders" : "Orders",
      value: data?.totalOrderCount,
      prefix: <ShoppingCartOutlined />,
    },
    {
      title: "Revenue",
      value: data?.todayRevenue,
      prefix: "Ksh.",
    },
    {
      title: "Shops",
      value: data?.activeOrders,
      prefix: <ShopOutlined />,
    },
    {
      title: "Active Shifts",
      value: data?.activeShift,
      prefix: <TeamOutlined />,
    },
  ];

  const salesData = processSalesData(data, periodFilter, startDate, endDate);

  const businessIndicators = calculateBusinessIndicators(salesData, data, periodFilter);

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
          <Title
            level={3}
            style={{ margin: 0, fontWeight: 600, color: "#1e293b" }}
          >
            {periodFilter === "day" ? "Today's Overview" : "Overview"}
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {getFormattedDateRange()}
          </Text>
        </div>
        <Space>
          <>
            <Flex align="center" wrap="wrap" gap={16}>
              <Flex align="center">
                <CalendarOutlined style={{ marginRight: 8, color: "#1890ff" }} />
                <Title level={5} style={{ margin: 0, color: "#1e293b" }}>
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
          </>
          <Button
            type="text"
            icon={<ReloadOutlined spin={isRefetching} />}
            onClick={handleRefresh}
            loading={isLoading || isRefetching}
            style={{
              background: "#e2e8f0",
              borderRadius: 8,
              fontWeight: 500,
            }}
          >
            Refresh
          </Button>
        </Space>
        <WelcomeBanner />
      </Row>

      <Row gutter={[16, 16]}>
        {statisticsData.map((stat, index) => (
          <StatisticCard
            key={index}
            loading={isLoading || isRefetching}
            {...stat}
          />
        ))}
      </Row>

      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          {salesData && salesData.length > 0 ? (
            <SalesChart
              data={salesData}
              loading={isLoading || isRefetching}
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
              {isLoading || isRefetching ? (
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

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={`Recent Orders (${getFormattedDateRange()})`}
          >
            {isLoading || isRefetching ? (
              <Skeleton active />
            ) : (
              <Table
                key={data?.currentOrders}
                columns={ORDER_COLUMNS}
                dataSource={
                  Array.isArray(data?.currentOrders) ? data.currentOrders : []
                }
                rowClassName={() => "modern-table-row"}
                pagination={{
                  hideOnSinglePage: true,
                  defaultPageSize: 5,
                  showSizeChanger: false,
                  style: { paddingRight: 16 },
                }}
                size="middle"
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: "#ff4d4f" }} />
                Low Stock Alerts
              </Space>
            }
          >
            {isLoading || isRefetching ? (
              <Skeleton active />
            ) : (
              <Table
                key={data?.lowStockItems}
                columns={STOCK_COLUMNS}
                dataSource={
                  Array.isArray(data?.lowStockItems) ? data.lowStockItems : []
                }
                rowClassName={() => "modern-table-row"}
                pagination={{
                  hideOnSinglePage: true,
                  defaultPageSize: 5,
                  showSizeChanger: false,
                  style: { paddingRight: 16 },
                }}
                size="middle"
              />
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default DashboardAdminPage;