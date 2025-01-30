import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  ConfigProvider,
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
} from "antd";
import {
  ShoppingCartOutlined,
  ShopOutlined,
  TeamOutlined,
  WarningOutlined,
  ReloadOutlined,
  MoneyCollectOutlined,
} from "@ant-design/icons";
import { getAdminDashboardAnalysis } from "@services/orders";
import {
  AnalyticsOutlined,
  HelpCenterOutlined,
  PeopleAltOutlined,
} from "@mui/icons-material";

const { Title, Text } = Typography;

const QUICK_ACCESS_BUTTONS = [
  {
    icon: <AnalyticsOutlined />,
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
    icon: <PeopleAltOutlined />,
    text: "Staff",
    route: "/admin/staff-management",
    color: "#722ed1",
  },
  {
    icon: <MoneyCollectOutlined />,
    text: "Billing",
    route: "/admin/billing",
    color: "#52c41a",
  },
  {
    icon: <HelpCenterOutlined />,
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

const StatisticCard = ({ title, value, prefix, loading }) => (
  <Col xs={24} sm={12} lg={6}>
    <Card>
      {loading ? (
        <Skeleton active paragraph={false} />
      ) : (
        <Statistic
          title={title}
          value={value}
          prefix={prefix}
          precision={title === "Revenue" ? 2 : 0}
        />
      )}
    </Card>
  </Col>
);

const QuickAccessButton = ({ icon, text, route, color, onClick }) => (
  <Col xs={12} sm={8} lg={6}>
    <Card hoverable style={{ textAlign: "center" }} onClick={onClick}>
      <Space direction="vertical">
        {React.cloneElement(icon, {
          style: { fontSize: 24, color },
        })}
        <Text>{text}</Text>
      </Space>
    </Card>
  </Col>
);

const DashboardAdminPage = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const { data, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ["admindashBoardAnalysis"],
    queryFn: getAdminDashboardAnalysis,
    networkMode: "always",
    refetchOnWindowFocus: false, // Prevent automatic refetch on window focus
    staleTime: 30000, // Consider data fresh for 30 seconds
    retry: 2, // Number of retry attempts if query fails
    onError: (error) => {
      notification.error({
        message: "Failed to fetch dashboard data. Please try again.",
        duration: 3,
        placement: "bottomRight",
      });
    },
    onSuccess: () => {
      if (isRefetching) {
        notification.success({
          message: "Dashboard refreshed successfully!",
          duration: 2,
          placement: "bottomRight",
        });
      }
    },
  });
  const handleRefresh = async () => {
    try {
      await refetch(); // This will trigger a new query
    } catch (error) {
      messageApi.error({
        content: "Failed to refresh dashboard. Please try again.",
        duration: 3,
      });
    }
  };

  const statisticsData = [
    {
      title: "Today's Orders",
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

  return (
    <ConfigProvider>
      {contextHolder}
      <div style={{ padding: 24 }}>
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 24 }}
        >
          <Title level={2}>Dashboard</Title>
          <Space>
            <Button
              type="primary"
              icon={<ReloadOutlined spin={isRefetching} />}
              onClick={handleRefresh}
              loading={isLoading || isRefetching}
              disabled={isLoading || isRefetching}
            >
              {isRefetching ? "Refreshing..." : "Refresh"}
            </Button>
            <Text>{new Date().toLocaleString()}</Text>
          </Space>
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
              title="Recent Orders"
            // extra={<a href="/orders">View All</a>}
            >
              {isLoading || isRefetching ? (
                <Skeleton active />
              ) : (
                <Table
                  columns={ORDER_COLUMNS}
                  dataSource={
                    Array.isArray(data?.currentOrders) ? data.currentOrders : []
                  }
                  pagination={false}
                  size="small"
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
                  columns={STOCK_COLUMNS}
                  dataSource={
                    Array.isArray(data?.lowStockItems) ? data.lowStockItems : []
                  }
                  pagination={false}
                  size="small"
                />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default DashboardAdminPage;
