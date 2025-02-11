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
  Tooltip,
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
} from "@ant-design/icons";
import { getDashboardAnalysis } from "@services/orders";
import { CheckCard } from "@ant-design/pro-components";

const { Title, Text } = Typography;

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

const QUICK_ACCESS_BUTTONS = [
  {
    icon: <ShoppingCartOutlined />,
    text: "Orders",
    route: "/orders",
    color: COLORS.primary,
  },
  {
    icon: <ShopOutlined />,
    text: "Inventory",
    route: "/inventory",
    color: COLORS.success,
  },
  {
    icon: <TruckOutlined />,
    text: "Deliveries",
    route: "/inventory",
    color: COLORS.purple,
  },
  {
    icon: <TeamOutlined />,
    text: "Suppliers",
    route: "/suppliers",
    color: COLORS.warning,
  },
  {
    icon: <ClockCircleOutlined />,
    text: "Shifts",
    route: "/employee-shift",
    color: COLORS.error,
  },
  {
    icon: <TableOutlined />,
    text: "Tables",
    route: "/table-settings",
    color: COLORS.orange,
  },
  {
    icon: <UsergroupAddOutlined />,
    text: "Customers",
    route: "/customers",
    color: COLORS.cyan,
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
    title: "Amount",
    dataIndex: "order_amount",
    key: "order_amount",
    render: (amount) => `ke${amount.toFixed(2)}`,
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

const Dashboard = () => {
  // const { token } = useToken();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const { data, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ["dashBoardAnalysis"],
    queryFn: getDashboardAnalysis,
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
    onSuccess: () => {
      if (isRefetching) {
        messageApi.success({
          content: "Dashboard refreshed successfully!",
          duration: 2,
        });
      }
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

  const handleCopyStaffUrl = () => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const tenantId = tenant?._id || null;
    const shopId = localStorage.getItem("shopId");

    const customerUrl = `${
      import.meta.env.VITE_APP_URL
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

    const customerUrl = `${
      import.meta.env.VITE_APP_URL
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

  const dateOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  };

  return (
    <>
      {contextHolder}

      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Today's Overview
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {new Date().toLocaleString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </div>
        <Space wrap>
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
            loading={isLoading || isRefetching}
            {...stat}
          />
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Title level={5} style={{ color: "#64748b", marginBottom: 16 }}>
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

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title="Recent Orders"
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
              />
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default Dashboard;
