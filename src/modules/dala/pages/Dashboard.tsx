import React, { useState, useCallback } from "react";
import { ProCard } from "@ant-design/pro-components";
import { App, Spin, Alert, Button, Space, Badge } from "antd";
import {
  HomeOutlined,
  DollarOutlined,
  WalletOutlined,
  BuildOutlined as ToolOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { fetchDalaDashboard } from "@services/dala";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { useDalaDashboard } from "@dala/hooks/useDalaQueries";
import {
  MONTH_LABELS,
  normalizeDashboardData,
  useIsMobile,
  DalaHeader,
  DalaExecutiveKPIs,
  PortfolioUnitsTab,
  SalesDealsTab,
  TenanciesCollectionsTab,
  MaintenanceCommissionsTab,
} from "./components";

const DalaDashboard: React.FC = () => {
  const { data: dashboard, setDashboard } = useDalaDashboard();
  const primaryColor = usePrimaryColor() || "#10b981";
  const isMobile = useIsMobile();
  const location = useLocation();

  // Route-aware admin layout detection
  const isAdminLayout = location.pathname.startsWith("/admin");

  // Workspace tab state
  const [activeTab, setActiveTab] = useState<string>("portfolio");

  // Period filter & custom range state
  const [periodFilter, setPeriodFilter] = useState("month");
  const [customDateRange, setCustomDateRange] = useState<any[]>([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const getDateRange = useCallback(() => {
    const today = dayjs();
    switch (periodFilter) {
      case "day":
        return { startDate: today.startOf("day"), endDate: today.endOf("day") };
      case "week":
        return { startDate: today.startOf("week"), endDate: today.endOf("week") };
      case "month":
        return { startDate: today.startOf("month"), endDate: today.endOf("month") };
      case "year":
        return { startDate: today.startOf("year"), endDate: today.endOf("year") };
      case "custom":
        if (customDateRange?.length === 2) {
          return {
            startDate: customDateRange[0].startOf("day"),
            endDate: customDateRange[1].endOf("day"),
          };
        }
        return { startDate: today.startOf("month"), endDate: today.endOf("month") };
      default:
        return { startDate: today.startOf("month"), endDate: today.endOf("month") };
    }
  }, [periodFilter, customDateRange]);

  const { startDate, endDate } = getDateRange();
  const fiscalMonth = endDate.month() + 1;

  const getFormattedDateRange = useCallback(() => {
    const formatStr = "MMM D, YYYY";
    switch (periodFilter) {
      case "day":
        return startDate.format("MMM D, YYYY");
      case "week":
        return `${startDate.format(formatStr)} – ${endDate.format(formatStr)}`;
      case "month":
        return startDate.format("MMMM YYYY");
      case "year":
        return startDate.format("YYYY");
      case "custom":
        if (customDateRange?.length === 2) {
          return `${customDateRange[0].format(formatStr)} – ${customDateRange[1].format(formatStr)}`;
        }
        return "Custom Range";
      default:
        return startDate.format("MMMM YYYY");
    }
  }, [periodFilter, startDate, endDate, customDateRange]);

  const handlePeriodChange = useCallback(
    (value: string) => {
      setPeriodFilter(value);
      setShowCustomDatePicker(value === "custom");
      if (isMobile) setFilterDrawerOpen(false);
    },
    [isMobile]
  );

  // ── Unified Dala Dashboard Query ───────────────────────────────────────────
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["dala-dashboard", periodFilter, startDate.format(), endDate.format()],
    queryFn: () =>
      fetchDalaDashboard({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        period: periodFilter,
      }),
    onSuccess: (resData) => {
      setDashboard(normalizeDashboardData(resData));
    },
    retry: 1,
  });

  const dashboardData = normalizeDashboardData(data || dashboard);

  // Revenue trend chart calculations
  const revenueData = dashboardData?.revenueTrend || [
    {
      month: MONTH_LABELS[fiscalMonth] || "Month",
      revenue: dashboardData?.summary?.totalSalesRevenue || 0,
      rent: dashboardData?.summary?.totalRentRevenue || 0,
      total: dashboardData?.summary?.totalRevenue || 0,
    },
  ];

  const plChartData = revenueData.map((m: any) => ({
    name: m.month,
    "Sales Revenue": m.revenue || 0,
    "Rent Revenue": m.rent || 0,
    "Total Revenue": m.total || (m.revenue || 0) + (m.rent || 0),
  }));

  const openTicketsCount = dashboardData?.openMaintenanceTickets || 0;
  const paymentPlansDueCount = dashboardData?.paymentPlansDue?.total || 0;

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          gap: 12,
        }}
      >
        <Spin size="large" />
        <span style={{ color: "#64748b", fontSize: 13 }}>Loading Dala Real Estate…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ padding: 40 }}>
        <Alert
          type="error"
          showIcon
          message="Failed to load Dala dashboard"
          description="Could not connect to the Dala service. Check your connection and try again."
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <App>
      <div style={{ padding: "0 0 24px" }}>
        {/* ── Tier 1: Header & Filter Controls ── */}
        <DalaHeader
          isMobile={isMobile}
          primaryColor={primaryColor}
          periodFilter={periodFilter}
          onPeriodChange={handlePeriodChange}
          customDateRange={customDateRange}
          onCustomDateRangeChange={(d) => setCustomDateRange(d || [])}
          showCustomDatePicker={showCustomDatePicker}
          filterDrawerOpen={filterDrawerOpen}
          setFilterDrawerOpen={setFilterDrawerOpen}
          formattedDateRange={getFormattedDateRange()}
          isFetching={isFetching}
          onRefresh={() => refetch()}
        />

        {/* ── Tier 2: 4 Headline Executive KPIs (5-Second Rule) ── */}
        <DalaExecutiveKPIs
          dashboardData={dashboardData}
          isMobile={isMobile}
          onSelectTab={setActiveTab}
        />

        {/* ── Tier 3: 4 Purpose-Driven Thematic Workspaces (Tabs) ── */}
        <ProCard
          bordered
          size="small"
          style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}
          bodyStyle={{
            padding: isMobile ? "10px 8px" : "16px",
            width: "100%",
            maxWidth: "100%",
          }}
          tabs={{
            activeKey: activeTab,
            onChange: setActiveTab,
            type: "line",
            size: isMobile ? "small" : "middle",
            items: [
              {
                key: "portfolio",
                label: (
                  <Space size={6}>
                    <HomeOutlined />
                    <span>{isMobile ? "Portfolio" : "Portfolio & Units"}</span>
                  </Space>
                ),
                children: (
                  <PortfolioUnitsTab
                    dashboardData={dashboardData}
                    isMobile={isMobile}
                    isAdminLayout={isAdminLayout}
                    primaryColor={primaryColor}
                  />
                ),
              },
              {
                key: "sales",
                label: (
                  <Space size={6}>
                    <DollarOutlined />
                    <span>{isMobile ? "Sales" : "Deals & Sales Pipeline"}</span>
                    {dashboardData?.pendingSales > 0 && (
                      <Badge count={dashboardData.pendingSales} style={{ backgroundColor: "#10b981" }} />
                    )}
                  </Space>
                ),
                children: (
                  <SalesDealsTab
                    dashboardData={dashboardData}
                    plChartData={plChartData}
                    isMobile={isMobile}
                    isAdminLayout={isAdminLayout}
                    primaryColor={primaryColor}
                  />
                ),
              },
              {
                key: "collections",
                label: (
                  <Space size={6}>
                    <WalletOutlined />
                    <span>{isMobile ? "Rent" : "Tenancies & Rent"}</span>
                    {paymentPlansDueCount > 0 && (
                      <Badge count={paymentPlansDueCount} style={{ backgroundColor: "#ef4444" }} />
                    )}
                  </Space>
                ),
                children: (
                  <TenanciesCollectionsTab
                    dashboardData={dashboardData}
                    isMobile={isMobile}
                    isAdminLayout={isAdminLayout}
                  />
                ),
              },
              {
                key: "operations",
                label: (
                  <Space size={6}>
                    <ToolOutlined />
                    <span>{isMobile ? "Ops" : "Maintenance & Operations"}</span>
                    {openTicketsCount > 0 && (
                      <Badge count={openTicketsCount} style={{ backgroundColor: "#faad14" }} />
                    )}
                  </Space>
                ),
                children: (
                  <MaintenanceCommissionsTab
                    dashboardData={dashboardData}
                    isMobile={isMobile}
                    isAdminLayout={isAdminLayout}
                  />
                ),
              },
            ],
          }}
        />
      </div>
    </App>
  );
};

export default DalaDashboard;
