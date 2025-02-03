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
import { PeopleOutlineRounded } from "@mui/icons-material";
import { CheckCard } from "@ant-design/pro-components";

const { Title, Text } = Typography;

const QUICK_ACCESS_BUTTONS = [
  {
    icon: <ShoppingCartOutlined />,
    text: "Orders",
    route: "/orders",
    color: "#1890ff",
  },
  {
    icon: <ShopOutlined />,
    text: "Inventory",
    route: "/inventory",
    color: "#52c41a",
  },
  {
    icon: <TruckOutlined />,
    text: "Deliveries",
    route: "/inventory",
    color: "#722ed1",
  },
  {
    icon: <TeamOutlined />,
    text: "Suppliers",
    route: "/suppliers",
    color: "#faad14",
  },
  {
    icon: <ClockCircleOutlined />,
    text: "Shifts",
    route: "/employee-shift",
    color: "#eb2f96",
  },
  {
    icon: <TableOutlined />,
    text: "Tables",
    route: "/table-settings",
    color: "#fa541c",
  },
  {
    icon: <UsergroupAddOutlined />,
    text: "Customers",
    route: "/customers",
    color: "#13c2c2",
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
  <Col xs={24} sm={12} lg={4}>
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
    <CheckCard hoverable style={{ textAlign: "center", width: "100%" }} onClick={onClick} cover>
      <Space direction="vertical">
        {React.cloneElement(icon, {
          style: { fontSize: 24, color },
        })}
        <Text>{text}</Text>
      </Space>
    </CheckCard>
  </Col>
);

const Dashboard = () => {
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
      prefix:<ContactsOutlined />,
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
      <div style={{ padding: 0 }}>
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 24 }}
        >
          <Title level={4}>Today's Overview</Title>
          <Space>
            <Button
              type="dashed"
              loading={isLoading || isRefetching}
              icon={<ClockCircleOutlined />}
              size="large"
            >
              {new Date().toLocaleString("en-US", dateOptions)}
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined spin={isRefetching} />}
              onClick={handleRefresh}
              loading={isLoading || isRefetching}
              disabled={isLoading || isRefetching}
            >
              {isRefetching ? "Refreshing..." : "Refresh"}
            </Button>
            <Tooltip title="Copy Customer URL">
              <Button icon={<CopyOutlined />} onClick={handleCopyCustomerUrl}>
                Copy Customer URL
              </Button>
            </Tooltip>
            <Tooltip title="Copy Staff URL">
              <Button icon={<CopyOutlined />} onClick={handleCopyStaffUrl}>
                Copy Staff URL
              </Button>
            </Tooltip>
            {/* <Text>{new Date().toLocaleString()}</Text> */}
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
            <Card title="Recent Orders" extra={<a href="/orders">View All</a>}>
              {isLoading || isRefetching ? (
                <Skeleton active />
              ) : (
                <Table
                  columns={ORDER_COLUMNS}
                  dataSource={data?.currentOrders}
                  pagination={{
                    hideOnSinglePage: true,
                    defaultPageSize: 5,
                  }}
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
              extra={<a href="/inventory">View All</a>}
            >
              {isLoading || isRefetching ? (
                <Skeleton active />
              ) : (
                <Table
                  columns={STOCK_COLUMNS}
                  dataSource={data?.lowStockItems}
                  pagination={{
                    hideOnSinglePage: true,
                    defaultPageSize: 5,
                  }}
                  size="small"
                />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default Dashboard;
