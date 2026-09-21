import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Typography,
  Row,
  Col,
  Space,
  message,
  notification,
  Radio,
  DatePicker,
  Flex,
  Alert,
  Drawer,
} from "antd";
import {
  ReloadOutlined,
  CalendarOutlined,
  FilterOutlined,
  DashboardOutlined,
  WarningOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  getAdminDashboardAnalysis,
  getBestSellers,
  getSalesChartData,
} from "@services/orders";
import dayjs from "dayjs";
import {
  DashboardKPICards,
  DashboardSalesTrendChart,
  DashboardTopSellersChart,
  DashboardOperationalHub,
} from "src/components/dashboard";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { fmtK } from "@utils/formatters";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PERIOD_LABELS: Record<string, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  custom: "Custom Period",
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

const DashboardAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const primaryColor = usePrimaryColor() || "#10b981";
  const [messageApi, contextHolder] = message.useMessage();

  const [periodFilter, setPeriodFilter] = useState("day");
  const [customDateRange, setCustomDateRange] = useState<any[]>([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const getDateRange = useCallback(() => {
    const today = dayjs();
    let startDate: dayjs.Dayjs, endDate: dayjs.Dayjs;
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

  // 1. Dashboard summary analysis
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admindashBoardAnalysis", startDate.format(), endDate.format()],
    queryFn: () => getAdminDashboardAnalysis(startDate.toISOString(), endDate.toISOString()),
    networkMode: "always",
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 1,
    onError: () => {
      notification.error({
        message: "Failed to fetch dashboard data.",
        duration: 3,
        placement: "bottomRight",
      });
    },
  });

  // 2. Sales Chart data
  const chartPeriod = periodFilter === "custom" ? "day" : (periodFilter as "day" | "week" | "month" | "year");

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["adminSalesChartData", periodFilter, startDate.format(), endDate.format()],
    queryFn: () =>
      getSalesChartData({
        period: chartPeriod,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }),
    networkMode: "always",
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 1,
  });

  // 3. Best Sellers data
  const { data: bestSellersData, isLoading: bestSellersLoading } = useQuery({
    queryKey: ["adminBestSellers", startDate.format(), endDate.format()],
    queryFn: () =>
      getBestSellers({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 15,
      }),
    networkMode: "always",
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 1,
  });

  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      messageApi.success({ content: "Dashboard refreshed!", duration: 2 });
    } catch {
      messageApi.error({ content: "Refresh failed.", duration: 3 });
    }
  }, [refetch, messageApi]);

  const handlePeriodChange = useCallback(
    (value: string) => {
      setPeriodFilter(value);
      setShowCustomDatePicker(value === "custom");
      if (isMobile) setFilterDrawerOpen(false);
    },
    [isMobile]
  );

  const getFormattedDateRange = useCallback(() => {
    const fmt = "MMM D, YYYY";
    switch (periodFilter) {
      case "day":
        return startDate.format("MMM D, YYYY");
      case "week":
        return `${startDate.format(fmt)} – ${endDate.format(fmt)}`;
      case "month":
        return startDate.format("MMMM YYYY");
      case "year":
        return startDate.format("YYYY");
      case "custom":
        if (customDateRange?.length === 2) {
          return `${customDateRange[0].format(fmt)} – ${customDateRange[1].format(fmt)}`;
        }
        return "Custom Range";
      default:
        return startDate.format("MMM D, YYYY");
    }
  }, [periodFilter, startDate, endDate, customDateRange]);

  const isDataLoading = isLoading || isRefetching;
  const growthRate = chartData?.data?.summary?.growth_rate;
  const peakPeriod = chartData?.data?.summary?.peak_period;

  const lowStockCount = Array.isArray(data?.lowStockItems) ? data.lowStockItems.length : 0;

  return (
    <div style={{ paddingBottom: 24 }}>
      {contextHolder}

      {/* ── Mobile Filter Drawer ── */}
      <Drawer
        title="Filter Period"
        placement="bottom"
        height="auto"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        styles={{ body: { paddingBottom: 32 } }}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Radio.Group
            value={periodFilter}
            onChange={(e) => handlePeriodChange(e.target.value)}
            style={{ width: "100%" }}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              {Object.entries(PERIOD_LABELS).map(([val, label]) => (
                <Radio.Button
                  key={val}
                  value={val}
                  style={{ width: "100%", textAlign: "center", borderRadius: 8, marginBottom: 4 }}
                >
                  {label}
                </Radio.Button>
              ))}
            </Space>
          </Radio.Group>
          {showCustomDatePicker && (
            <RangePicker
              value={customDateRange as any}
              onChange={(d) => setCustomDateRange(d || [])}
              allowClear
              style={{ width: "100%" }}
            />
          )}
        </Space>
      </Drawer>

      {/* ── Tier 1: Streamlined Control Header ── */}
      <div style={{ marginBottom: 16 }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Space align="center" size={10}>
            <div
              style={{
                background: `${primaryColor}15`,
                borderRadius: 10,
                padding: "8px 10px",
                color: primaryColor,
                fontSize: 18,
                display: "inline-flex",
              }}
            >
              <DashboardOutlined />
            </div>
            <div>
              <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>
                {PERIOD_LABELS[periodFilter]} · Duka Overview
              </Title>
              <Text style={{ fontSize: 12, color: "#64748b" }}>
                {getFormattedDateRange()} · All Branches & POS Terminals
              </Text>
            </div>
          </Space>

          <Space size="small" wrap>
            {isMobile ? (
              <>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setFilterDrawerOpen(true)}
                  size="middle"
                >
                  {PERIOD_LABELS[periodFilter]}
                </Button>
                <Button
                  type="primary"
                  icon={<ReloadOutlined spin={isRefetching} />}
                  onClick={handleRefresh}
                  loading={isDataLoading}
                  size="middle"
                />
              </>
            ) : (
              <>
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: 8,
                    padding: "4px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <CalendarOutlined style={{ color: primaryColor, fontSize: 13 }} />
                  <Radio.Group
                    value={periodFilter}
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    buttonStyle="solid"
                    size="small"
                  >
                    <Radio.Button value="day">Day</Radio.Button>
                    <Radio.Button value="week">Week</Radio.Button>
                    <Radio.Button value="month">Month</Radio.Button>
                    <Radio.Button value="year">Year</Radio.Button>
                    <Radio.Button value="custom">Custom</Radio.Button>
                  </Radio.Group>
                </div>

                {showCustomDatePicker && (
                  <RangePicker
                    value={customDateRange as any}
                    onChange={(d) => setCustomDateRange(d || [])}
                    allowClear
                    size="small"
                    style={{ minWidth: 240 }}
                  />
                )}

                <Button
                  icon={<ReloadOutlined spin={isRefetching} />}
                  onClick={handleRefresh}
                  loading={isDataLoading}
                  size="small"
                  style={{ fontWeight: 500 }}
                >
                  {isRefetching ? "Refreshing..." : "Refresh"}
                </Button>
              </>
            )}
          </Space>
        </Flex>
      </div>

      {/* ── Conditional Urgent Stock Notice ── */}
      {lowStockCount > 0 && (
        <Alert
          message={
            <Space size={8}>
              <Text strong style={{ color: "#b45309", fontSize: 13 }}>
                Inventory Attention Needed:
              </Text>
              <Text style={{ color: "#78350f", fontSize: 12 }}>
                {lowStockCount} item{lowStockCount > 1 ? "s are" : " is"} depleted or running low in stock.
              </Text>
            </Space>
          }
          type="warning"
          showIcon
          icon={<WarningOutlined style={{ color: "#d97706" }} />}
          action={
            <Button
              size="small"
              type="link"
              onClick={() => navigate("/inventory")}
              style={{ fontWeight: 600, color: "#b45309", padding: 0 }}
            >
              Manage Inventory →
            </Button>
          }
          style={{
            marginBottom: 16,
            borderRadius: 10,
            border: "1px solid #fde68a",
            background: "#fffbeb",
          }}
          closable
        />
      )}

      {/* ── Tier 2: Executive KPI Pulse Cards ── */}
      <DashboardKPICards
        revenue={data?.todayRevenue || 0}
        totalOrders={data?.totalOrderCount || 0}
        growthRate={growthRate}
        activeShops={data?.activeOrders || 0}
        activeShifts={data?.activeShift || 0}
        loading={isDataLoading}
        isAdmin={true}
        onOrdersClick={() => navigate("/orders")}
        onShopsClick={() => navigate("/shops")}
      />

      {/* ── Tier 3: Visual Analytics & Charts Hub ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {/* Left 60%: Sales & Volume Trend (Area Chart) */}
        <Col xs={24} lg={15}>
          <DashboardSalesTrendChart
            data={chartData?.data?.chart_data || []}
            loading={chartLoading}
            title={`Sales Pulse · ${getFormattedDateRange()}`}
            primaryColor={primaryColor}
            peakPeriod={peakPeriod}
          />
        </Col>

        {/* Right 40%: Top Performers & Mix (Bar & Donut Chart) */}
        <Col xs={24} lg={9}>
          <DashboardTopSellersChart
            bestSellersData={bestSellersData}
            loading={bestSellersLoading}
            dateRange={getFormattedDateRange()}
            isMobile={isMobile}
          />
        </Col>
      </Row>

      {/* ── Tier 4: Unified Operations & Fulfillment Hub ── */}
      <Row>
        <Col span={24}>
          <DashboardOperationalHub
            orders={Array.isArray(data?.currentOrders) ? data.currentOrders : []}
            totalOrdersCount={data?.totalOrderCount || 0}
            lowStockItems={Array.isArray(data?.lowStockItems) ? data.lowStockItems : []}
            purchaseOrderStats={data?.purchaseOrderStats}
            loading={isDataLoading}
            isMobile={isMobile}
          />
        </Col>
      </Row>
    </div>
  );
};

export default DashboardAdminPage;