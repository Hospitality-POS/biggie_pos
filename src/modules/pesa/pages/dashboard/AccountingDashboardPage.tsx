import React, { useState, useCallback } from "react";
import { ProCard } from "@ant-design/pro-components";
import { App, Spin, Alert, Button, Space, Badge } from "antd";
import {
  LineChartOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { useBranchFilter } from "@components/BranchFilter/BranchFilter";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { getAccountingDashboard } from "@services/accounting/accountingDashboard";
import {
  getShopId,
  useIsMobile,
  PesaHeader,
  PesaExecutiveKPIs,
  OverviewPLTab,
  CashLiquidityTab,
  TaxComplianceTab,
  LedgerAuditTab,
} from "./components";

const AccountingDashboardPage: React.FC = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const primaryColor = usePrimaryColor();
  const storedShopId = getShopId();

  // Route-aware admin layout detection
  const isAdminLayout = location.pathname.startsWith("/admin") || !storedShopId;

  // Branch filter hook for multi-branch organizations
  const { shopId: hookShopId, shops, branchId, setBranchId } = useBranchFilter(storedShopId);
  const activeShopId = isAdminLayout ? branchId : storedShopId;
  const showFilter = isAdminLayout && shops.length > 0;
  const branchName = shops.find((s) => s._id === branchId)?.name;

  // Workspace tab state
  const [activeTab, setActiveTab] = useState<string>("overview");

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
  const fiscalYear = endDate.year();
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

  // ── Unified Accounting Dashboard Query ──────────────────────────────────────
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: [
      "accounting-dashboard",
      activeShopId,
      fiscalYear,
      fiscalMonth,
      startDate.format(),
      endDate.format(),
    ],
    queryFn: () =>
      getAccountingDashboard({
        shop_id: activeShopId || undefined,
        fiscal_year: fiscalYear,
        fiscal_month: fiscalMonth,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      }),
    enabled: true,
    retry: 1,
  });

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
        <span style={{ color: "#64748b", fontSize: 13 }}>Loading Pesa…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ padding: 40 }}>
        <Alert
          type="error"
          showIcon
          message="Failed to load Pesa"
          description="Could not connect to the accounting service. Check your connection and try again."
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const {
    overview,
    journal_summary,
    pl_trend,
    cash_positions,
    ar_ap_summary,
    notes_summary,
    recent_entries,
    top_expense_accounts,
    vat_summary,
    reconciliation_status,
    sales_receipts_summary,
  } = data;

  // ── Executive Financial calculations ────────────────────────────────────────
  const rev = overview?.revenue?.amount || 0;
  const exp = overview?.expenses?.amount || 0;
  const costRatio = rev > 0 ? ((exp / rev) * 100).toFixed(1) : "0.0";

  const cash = cash_positions?.total_cash || 0;
  const ar = ar_ap_summary?.accounts_receivable?.total_outstanding || 0;
  const ap = ar_ap_summary?.accounts_payable?.total_outstanding || 0;
  const workingCapital = cash + ar - ap;

  const isProfit = overview?.net_profit?.is_profit ?? ((overview?.net_profit?.amount || 0) >= 0);
  const netMargin =
    overview?.profit_margin ??
    (rev > 0 ? Number(((overview.net_profit.amount / rev) * 100).toFixed(1)) : 0);

  return (
    <App>
      <div style={{ padding: "0 0 24px" }}>
        {/* ── Tier 1: Header & Filter Controls ── */}
        <PesaHeader
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
          showFilter={showFilter}
          shops={shops}
          branchId={branchId}
          onBranchChange={setBranchId}
          branchName={branchName}
        />

        {/* ── Tier 2: 4 Headline Executive KPIs (5-Second Rule) ── */}
        <PesaExecutiveKPIs
          overview={overview}
          workingCapital={workingCapital}
          costRatio={costRatio}
          isProfit={isProfit}
          netMargin={netMargin}
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
                key: "overview",
                label: (
                  <Space size={6}>
                    <LineChartOutlined />
                    <span>{isMobile ? "P&L Pulse" : "Profit & Loss Pulse"}</span>
                  </Space>
                ),
                children: (
                  <OverviewPLTab
                    plTrend={pl_trend}
                    journalSummary={journal_summary}
                    topExpenseAccounts={top_expense_accounts}
                    isMobile={isMobile}
                    isAdminLayout={isAdminLayout}
                  />
                ),
              },
              {
                key: "liquidity",
                label: (
                  <Space size={6}>
                    <BankOutlined />
                    <span>{isMobile ? "Cash" : "Cash & Liquidity"}</span>
                  </Space>
                ),
                children: (
                  <CashLiquidityTab
                    cashPositions={cash_positions}
                    arApSummary={ar_ap_summary}
                    reconciliationStatus={reconciliation_status}
                    primaryColor={primaryColor}
                    isMobile={isMobile}
                    isAdminLayout={isAdminLayout}
                  />
                ),
              },
              {
                key: "tax",
                label: (
                  <Space size={6}>
                    <SafetyCertificateOutlined />
                    <span>{isMobile ? "Tax" : "Tax & Sales Receipts"}</span>
                  </Space>
                ),
                children: (
                  <TaxComplianceTab
                    vatSummary={vat_summary}
                    salesReceiptsSummary={sales_receipts_summary}
                    primaryColor={primaryColor}
                    isMobile={isMobile}
                    isAdminLayout={isAdminLayout}
                  />
                ),
              },
              {
                key: "ledger",
                label: (
                  <Space size={6}>
                    <AuditOutlined />
                    <span>{isMobile ? "Ledger" : "Ledger & Audit"}</span>
                    <Badge count={recent_entries.length} style={{ backgroundColor: "#3b82f6" }} />
                  </Space>
                ),
                children: (
                  <LedgerAuditTab
                    journalSummary={journal_summary}
                    notesSummary={notes_summary}
                    recentEntries={recent_entries}
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

export default AccountingDashboardPage;