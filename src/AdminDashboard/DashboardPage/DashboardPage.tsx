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
  ClockCircleOutlined,
  PieChartOutlined,
  QuestionCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { getAdminDashboardAnalysis } from "@services/orders";
import { CheckCard } from "@ant-design/pro-components";
import WelcomeBanner from "./WelcomeBanner";

const { Title, Text } = Typography;

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
        // notification.success({
        //   message: "Dashboard refreshed successfully!",
        //   duration: 2,
        //   placement: "bottomRight",
        // });
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
    <>
      {contextHolder}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <div>
          <Title
            level={3}
            style={{ margin: 0, fontWeight: 600, color: "#1e293b" }}
          >
            Today's Overview
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {new Date().toLocaleDateString("en-US", { dateStyle: "full" })}
          </Text>
        </div>
        <Space>
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
            title="Recent Orders"
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
