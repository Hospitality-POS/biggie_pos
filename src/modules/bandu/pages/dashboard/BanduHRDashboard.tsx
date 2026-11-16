import React, { useState, useCallback } from "react";
import { App, Spin, Alert, Button, Tabs, Badge, Space } from "antd";
import {
  ThunderboltOutlined,
  TeamOutlined,
  DollarOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBranchFilter } from "@components/BranchFilter/BranchFilter";
import { fetchHRDashboard, type HRDashboardData } from "@services/bandu/dashboard";
import { clockIn, clockOut, fetchClockStatus } from "@services/hr/leave";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import dayjs from "dayjs";

import {
  getShopId,
  BanduHeader,
  BanduExecutiveKPIs,
  OverviewPulseTab,
  WorkforceTab,
  PayrollTab,
  OperationsTab,
  StaffClockModal,
} from "./components";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

const BanduHRDashboard: React.FC = () => {
  const ownShopId = getShopId();
  const primaryColor = usePrimaryColor();
  const isAdmin = !ownShopId;
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Branch filtering
  const { shopId, shops, branchId, setBranchId, showFilter } = useBranchFilter(ownShopId);
  const branchName = shops.find((s) => s._id === branchId)?.name;

  // Period state
  const [periodFilter, setPeriodFilter] = useState("month");
  const [customDateRange, setCustomDateRange] = useState<any[]>([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Tab & Modal state
  const [activeTab, setActiveTab] = useState<string>("pulse");
  const [operationsSubTab, setOperationsSubTab] = useState<string>("pending-leave");
  const [clockLinkModalOpen, setClockLinkModalOpen] = useState(false);

  // Staff clock-in link for QR kiosk
  const clockLinkUrl = (() => {
    try {
      const tenant = JSON.parse(localStorage.getItem("tenant") || "null");
      return `${import.meta.env.VITE_APP_URL}/admin/staff-clock-in?tenant_id=${tenant?._id}&tenant_code=${tenant?.tenant_code}&shop_id=${ownShopId}`;
    } catch {
      return "";
    }
  })();

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

  const formattedDateRange = (() => {
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
  })();

  const handlePeriodChange = useCallback((value: string) => {
    setPeriodFilter(value);
    setShowCustomDatePicker(value === "custom");
  }, []);

  // Main Dashboard Data query
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["bandu-hr-dashboard", shopId, startDate.format(), endDate.format()],
    queryFn: async () => {
      const result = await fetchHRDashboard({
        shop_id: shopId || undefined,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      return result;
    },
    enabled: true,
    retry: 2,
  });

  // Clock status query
  const { data: clockStatus } = useQuery({
    queryKey: ["clock-status"],
    queryFn: fetchClockStatus,
    refetchInterval: 60000,
  });

  const handleClockIn = async () => {
    try {
      await clockIn();
      queryClient.invalidateQueries({ queryKey: ["clock-status"] });
    } catch {
      // Error handled by service
    }
  };

  const handleClockOut = async () => {
    try {
      await clockOut();
      queryClient.invalidateQueries({ queryKey: ["clock-status"] });
    } catch {
      // Error handled by service
    }
  };

  const handleNavigateToOperations = (subTab?: string) => {
    if (subTab) setOperationsSubTab(subTab);
    setActiveTab("operations");
  };

  const dashboardData: HRDashboardData = data || ({} as HRDashboardData);

  const employeeStats = dashboardData.employee_stats || {
    total_employees: 0,
    active_employees: 0,
    on_leave: 0,
    suspended: 0,
    terminated: 0,
    resigned: 0,
    new_hires_this_month: 0,
  };
  const leaveStats = dashboardData.leave_stats || {
    total_requests: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    on_leave_today: 0,
  };
  const attendanceStats = dashboardData.attendance_stats || {
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    average_attendance_rate: 0,
    on_leave_today: 0,
  };
  const payrollStats = dashboardData.payroll_stats || {
    total_payroll_this_month: 0,
    total_deductions: 0,
    net_pay: 0,
    pending_payroll: 0,
  };

  const upcomingBirthdays = dashboardData.upcoming_birthdays || [];
  const expiringDocuments = dashboardData.expiring_documents || [];
  const recentActivities = dashboardData.recent_activities || [];
  const onLeaveToday = dashboardData.on_leave_today || [];
  const pendingLeaves = dashboardData.pending_leave_requests || [];
  const anniversaries = dashboardData.workforce?.upcoming_anniversaries || [];
  const trackedStaff = attendanceStats.tracked_staff || 0;

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
        <span style={{ color: "#64748b", fontSize: 13 }}>Loading Bandu HR Dashboard…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ padding: 40 }}>
        <Alert
          type="error"
          showIcon
          message="Failed to load Bandu HR"
          description="Could not connect to the HR service. Check your connection and try again."
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
        {/* ── Control Bar ── */}
        <BanduHeader
          periodFilter={periodFilter}
          onPeriodChange={handlePeriodChange}
          customDateRange={customDateRange}
          onCustomDateRangeChange={(d) => setCustomDateRange(d || [])}
          showCustomDatePicker={showCustomDatePicker}
          formattedDateRange={formattedDateRange}
          branchName={branchName}
          isAdmin={isAdmin}
          isMobile={isMobile}
          primaryColor={primaryColor}
          showFilter={showFilter}
          shops={shops}
          branchId={branchId}
          onBranchChange={setBranchId}
          clockStatus={clockStatus}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
          onOpenKioskModal={() => setClockLinkModalOpen(true)}
          onRefresh={() => refetch()}
          isFetching={isFetching}
        />

        {/* ── Tier 1: 4 Executive KPI Cards ── */}
        <BanduExecutiveKPIs
          employeeStats={employeeStats}
          attendanceStats={attendanceStats}
          trackedStaff={trackedStaff}
          leaveStats={leaveStats}
          payrollStats={payrollStats}
          isMobile={isMobile}
          onSelectTab={setActiveTab}
        />

        {/* ── Tier 2: Thematic Workspaces (Tabs) ── */}
        <div style={{ marginTop: 16 }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            size={isMobile ? "small" : "middle"}
            items={[
              {
                key: "pulse",
                label: (
                  <Space size={6}>
                    <ThunderboltOutlined />
                    <span>Today's Pulse & Attendance</span>
                  </Space>
                ),
                children: (
                  <OverviewPulseTab
                    attendanceStats={attendanceStats}
                    onLeaveToday={onLeaveToday}
                    attendanceTrend={dashboardData.attendance_trend || []}
                    pendingLeaves={pendingLeaves}
                    expiringDocuments={expiringDocuments}
                    leaveBalance={dashboardData.leave_balance}
                    primaryColor={primaryColor}
                    isMobile={isMobile}
                    onNavigateToOperations={handleNavigateToOperations}
                  />
                ),
              },
              {
                key: "workforce",
                label: (
                  <Space size={6}>
                    <TeamOutlined />
                    <span>Workforce & Talent</span>
                  </Space>
                ),
                children: (
                  <WorkforceTab
                    workforce={dashboardData.workforce}
                    employeeStats={employeeStats}
                    departmentsTotal={dashboardData.departments_total}
                    employeesByDepartment={dashboardData.employees_by_department}
                    genderBreakdown={dashboardData.gender_breakdown}
                    isMobile={isMobile}
                  />
                ),
              },
              {
                key: "payroll",
                label: (
                  <Space size={6}>
                    <DollarOutlined />
                    <span>Payroll & Statutory</span>
                  </Space>
                ),
                children: (
                  <PayrollTab
                    payrollStats={payrollStats}
                    payrollTrend={dashboardData.payroll_trend}
                    statutory={dashboardData.statutory}
                    payrollPipeline={dashboardData.payroll_pipeline}
                    formattedDateRange={formattedDateRange}
                    isMobile={isMobile}
                  />
                ),
              },
              {
                key: "operations",
                label: (
                  <Space size={6}>
                    <AuditOutlined />
                    <span>Operations & Records</span>
                    {pendingLeaves.length > 0 && (
                      <Badge count={pendingLeaves.length} style={{ backgroundColor: "#f59e0b" }} />
                    )}
                  </Space>
                ),
                children: (
                  <OperationsTab
                    pendingLeaves={pendingLeaves}
                    recentActivities={recentActivities}
                    upcomingBirthdays={upcomingBirthdays}
                    expiringDocuments={expiringDocuments}
                    anniversaries={anniversaries}
                    activeSubTab={operationsSubTab}
                    onSubTabChange={setOperationsSubTab}
                    primaryColor={primaryColor}
                    isMobile={isMobile}
                  />
                ),
              },
            ]}
          />
        </div>

        {/* ── Staff Clock Modal ── */}
        <StaffClockModal
          open={clockLinkModalOpen}
          onClose={() => setClockLinkModalOpen(false)}
          clockLinkUrl={clockLinkUrl}
          primaryColor={primaryColor}
        />
      </div>
    </App>
  );
};

export default BanduHRDashboard;
