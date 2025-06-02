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
} from "@ant-design/icons";
import { getAdminDashboardAnalysis } from "@services/orders";
import { CheckCard } from "@ant-design/pro-components";
import WelcomeBanner from "./WelcomeBanner";
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const QUICK_ACCESS_BUTTONS = [
  {
    icon: <PieChartOutlined />,
    text: "Reports",
    route: "/admin/reports",
    color: "#1890ff",
  },
  {
    icon: <ShopOutlined />,
    text: "Shops",
    route: "/admin/shop-management",
    color: "#52c41a",
  },
  {
    icon: <UserOutlined />,
    text: "Staff",
    route: "/admin/staff-management",
    color: "#722ed1",
  },
  {
    icon: <QuestionCircleOutlined />,
    text: "Help",
    route: "/admin/help-center",
    color: "#faad14",
  },
];

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

const QuickAccessButton = ({ icon, text, route, color, onClick }) => (
  <Col xs={12} sm={8} lg={6}>
    <CheckCard
      hoverable
      style={{
        textAlign: "center",
        width: "100%",
        borderRadius: 8,
        transition: "all 0.3s",
        border: `1px solid ${color}20`,
        background: `${color}10`,
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <Space direction="vertical">
        {React.cloneElement(icon, {
          style: {
            fontSize: 28, // Ensure consistent size for all icons
            color,
            background: `${color}20`,
            padding: 12,
            borderRadius: "50%",
            transition: "all 0.3s",
          },
        })}
        <Text strong style={{ color: "#1f2937", fontSize: 16 }}>
          {text}
        </Text>
      </Space>
    </CheckCard>
  </Col>
);

const DashboardAdminPage = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [periodFilter, setPeriodFilter] = useState("day");
  const [customDateRange, setCustomDateRange] = useState([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Calculate date ranges based on the selected period
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

  // Format the date range for display
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
          {/* Period Filter Section */}
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

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Title level={5} style={{ color: "#64748b", marginBottom: 16 }} title="Click to navigate">
            Quick Links
          </Title>
        </Col>
        {QUICK_ACCESS_BUTTONS.map((button, index) => (
          <QuickAccessButton
            key={index}
            {...button}
            onClick={() => navigate(button.route)}
          />
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={`Recent Orders (${getFormattedDateRange()})`}
          // extra={<a href="/orders">View All</a>}
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
          // extra={<a href="/inventory">View All</a>}
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