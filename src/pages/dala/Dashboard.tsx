import React, { useState, useCallback } from 'react';
import { ProCard } from '@ant-design/pro-components';
import {
  Row,
  Col,
  Typography,
  Space,
  Radio,
  DatePicker,
  Tag,
  Table,
  Spin,
  Alert,
  Progress,
  Tooltip,
  Button,
  App,
  Empty,
  Segmented,
  Badge,
} from 'antd';
import {
  HomeOutlined,
  DollarOutlined,
  TrophyOutlined,
  CalendarOutlined,
  SyncOutlined,
  DashboardOutlined,
  BuildOutlined as ToolOutlined,
  WalletOutlined,
  AlertOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { fetchDalaDashboard } from '@services/dala';
import { useDalaDashboard } from '../../stores/dalaStore';
import { fmtK } from '@utils/formatters';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { usePrimaryColor } from '@context/PrimaryColorContext';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const PERIOD_LABELS: Record<string, string> = {
  day: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  custom: 'Custom Period',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  (v || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_LABELS: string[] = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ── KPI Card Component (Unified Duka & Mteja Style) ──────────────────────────

interface KPICardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  subtext?: React.ReactNode;
  onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  color,
  bg,
  border,
  subtext,
  onClick,
}) => (
  <div
    onClick={onClick}
    style={{
      background: bg,
      borderRadius: 12,
      padding: '16px 18px',
      border: `1px solid ${border}`,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform .15s ease, box-shadow .15s ease',
      height: '100%',
    }}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
      }
    }}
    onMouseLeave={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }
    }}
  >
    <Space direction="vertical" size={3} style={{ width: '100%' }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{title}</Text>
        <div
          style={{
            background: "#ffffff",
            borderRadius: 8,
            padding: "4px 6px",
            color,
            fontSize: 14,
            lineHeight: 1,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#0f172a",
          letterSpacing: -0.3,
          lineHeight: 1.2,
          marginTop: 2,
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 2 }}>{subtext}</div>
    </Space>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const DalaDashboard: React.FC = () => {
  const { data: dashboard, setDashboard } = useDalaDashboard();
  const primaryColor = usePrimaryColor();
  const now = dayjs();

  const [periodFilter, setPeriodFilter] = useState('month');
  const [customDateRange, setCustomDateRange] = useState<any[]>([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [sideView, setSideView] = useState<string>('units');

  const getDateRange = useCallback(() => {
    const today = dayjs();
    switch (periodFilter) {
      case 'day':
        return { startDate: today.startOf('day'), endDate: today.endOf('day') };
      case 'week':
        return { startDate: today.startOf('week'), endDate: today.endOf('week') };
      case 'month':
        return { startDate: today.startOf('month'), endDate: today.endOf('month') };
      case 'year':
        return { startDate: today.startOf('year'), endDate: today.endOf('year') };
      case 'custom':
        if (customDateRange?.length === 2) {
          return {
            startDate: customDateRange[0].startOf('day'),
            endDate: customDateRange[1].endOf('day'),
          };
        }
        return { startDate: today.startOf('month'), endDate: today.endOf('month') };
      default:
        return { startDate: today.startOf('month'), endDate: today.endOf('month') };
    }
  }, [periodFilter, customDateRange]);

  const { startDate, endDate } = getDateRange();
  const fiscalYear = endDate.year();
  const fiscalMonth = endDate.month() + 1;

  const getFormattedDateRange = useCallback(() => {
    const formatStr = 'MMM D, YYYY';
    switch (periodFilter) {
      case 'day':
        return startDate.format('MMM D, YYYY');
      case 'week':
        return `${startDate.format(formatStr)} – ${endDate.format(formatStr)}`;
      case 'month':
        return startDate.format('MMMM YYYY');
      case 'year':
        return startDate.format('YYYY');
      case 'custom':
        if (customDateRange?.length === 2) {
          return `${customDateRange[0].format(formatStr)} – ${customDateRange[1].format(formatStr)}`;
        }
        return 'Custom Range';
      default:
        return startDate.format('MMMM YYYY');
    }
  }, [periodFilter, startDate, endDate, customDateRange]);

  const handlePeriodChange = useCallback((value: string) => {
    setPeriodFilter(value);
    setShowCustomDatePicker(value === 'custom');
  }, []);

  const normalizeDashboardData = (payload: any) => {
    const source = payload?.data || payload || {};
    const summary = source.summary || {};
    const salesStats = source.salesStats || {};
    const leaseStats = source.leaseStats || {};
    const rentalStats = source.rentalStats || {};
    const commissionStats = source.commissionStats || {};
    const maintenanceStats = source.maintenanceStats || {};

    return {
      ...source,
      summary,
      salesStats,
      leaseStats,
      rentalStats,
      commissionStats: {
        ...commissionStats,
        paidCommission: commissionStats.paidCommissionAmount || commissionStats.paidCommission || 0,
        pendingCommission: commissionStats.pendingCommissionAmount || commissionStats.pendingCommission || 0,
        paidCount: commissionStats.paidCommissions || 0,
        pendingCount: commissionStats.pendingCommissions || 0,
        partialCount: commissionStats.partialCommissions || 0,
      },
      maintenanceStats,
      totalProperties: source.totalProperties ?? summary.totalProperties ?? 0,
      totalUnits: source.totalUnits ?? summary.totalUnits ?? 0,
      availableUnits: source.availableUnits ?? summary.availableUnits ?? 0,
      soldProperties: source.soldProperties ?? summary.soldUnits ?? 0,
      leasedProperties: source.leasedProperties ?? summary.occupiedUnits ?? 0,
      propertiesForSale: source.propertiesForSale ?? summary.availableUnits ?? 0,
      propertiesForLease: source.propertiesForLease ?? summary.occupiedUnits ?? 0,
      totalRevenue: source.totalRevenue ?? summary.totalRevenue ?? salesStats.totalRevenue ?? 0,
      monthlySalesRevenue: source.monthlySalesRevenue ?? summary.totalSalesRevenue ?? salesStats.totalRevenue ?? 0,
      monthlyRentCollected: source.monthlyRentCollected ?? summary.totalRentRevenue ?? rentalStats.totalCollected ?? 0,
      monthlyRentBilled: source.monthlyRentBilled ?? rentalStats.totalBilled ?? leaseStats.totalRentAmount ?? 0,
      rentOutstanding: source.rentOutstanding ?? rentalStats.outstandingBalance ?? 0,
      pendingSalesRevenue: source.pendingSalesRevenue ?? salesStats.pendingRevenue ?? 0,
      totalCommission: source.totalCommission ?? summary.totalCommission ?? commissionStats.totalCommission ?? 0,
      monthlyCommission: source.monthlyCommission ?? commissionStats.totalCommission ?? summary.totalCommission ?? 0,
      pendingSales: source.pendingSales ?? salesStats.pendingSales ?? 0,
      completedSales: source.completedSales ?? salesStats.completedSales ?? 0,
      cancelledSales: source.cancelledSales ?? salesStats.cancelledSales ?? 0,
      totalSales: source.totalSales ?? salesStats.totalSales ?? 0,
      activeLeases: source.activeLeases ?? leaseStats.activeLeases ?? 0,
      pendingLeases: source.pendingLeases ?? leaseStats.pendingLeases ?? 0,
      expiredLeases: source.expiredLeases ?? leaseStats.expiredLeases ?? 0,
      totalLeases: source.totalLeases ?? leaseStats.totalLeases ?? 0,
      totalMaintenanceTickets: source.totalMaintenanceTickets ?? summary.totalMaintenanceTickets ?? maintenanceStats.totalTickets ?? 0,
      openMaintenanceTickets: source.openMaintenanceTickets ?? summary.openMaintenanceTickets ?? maintenanceStats.openTickets ?? 0,
      occupancyRate: source.occupancyRate ?? summary.occupancyRate ?? 0,
      recentSales: source.recentSales || [],
      recentLeases: source.recentLeases || [],
      recentRentPayments: source.recentRentPayments || [],
      recentMaintenanceTickets: source.recentMaintenanceTickets || [],
      topAgents: source.topAgents || [],
      paymentPlansDue: source.paymentPlansDue || { total: 0, totalBalance: 0, top5: [], all: [] },
      propertyTypes: source.propertyTypes || [
        {
          type: 'Available',
          count: summary.availableUnits || 0,
          occupancyRate: 0,
        },
        {
          type: 'Occupied',
          count: summary.occupiedUnits || 0,
          occupancyRate: summary.occupancyRate || 0,
        },
      ].filter((item) => item.count > 0),
    };
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['dala-dashboard', periodFilter, startDate.format(), endDate.format()],
    queryFn: () =>
      fetchDalaDashboard({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        period: periodFilter,
      }),
    onSuccess: (data) => {
      setDashboard(normalizeDashboardData(data));
    },
  });

  const dashboardData = normalizeDashboardData(data || dashboard);

  const paymentPlansDue = dashboardData?.paymentPlansDue || {};
  const paymentsDue = Array.isArray(paymentPlansDue?.top5) ? paymentPlansDue.top5 : [];
  const totalPaymentDue = paymentPlansDue?.totalBalance || 0;
  const totalPaymentCount = paymentPlansDue?.total || 0;

  const revenueData = dashboardData?.revenueTrend || [
    {
      month: MONTH_LABELS[fiscalMonth],
      revenue: dashboardData?.summary?.totalSalesRevenue || 0,
      rent: dashboardData?.summary?.totalRentRevenue || 0,
      total: dashboardData?.summary?.totalRevenue || 0,
    },
  ];
  const propertyTypeData = dashboardData?.propertyTypes || [];

  const plChartData = revenueData.map((m: any) => ({
    name: m.month,
    'Sales Revenue': m.revenue || 0,
    'Rent Revenue': m.rent || 0,
    'Total Revenue': m.total || (m.revenue || 0) + (m.rent || 0),
  }));

  const recentSales = dashboardData?.recentSales || [];
  const recentLeases = dashboardData?.recentLeases || [];
  const recentRentPayments = dashboardData?.recentRentPayments || [];
  const recentMaintenanceTickets = dashboardData?.recentMaintenanceTickets || [];
  const topAgents = dashboardData?.topAgents || [];

  const unitStatusData = [
    { name: 'Available', value: dashboardData?.availableUnits || 0, color: '#10b981' },
    { name: 'Occupied', value: dashboardData?.leasedProperties || 0, color: '#3b82f6' },
    { name: 'Sold', value: dashboardData?.soldProperties || 0, color: '#f59e0b' },
  ].filter((item) => item.value > 0);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
          gap: 12,
        }}
      >
        <Spin size="large" />
        <span style={{ color: '#64748b', fontSize: 13 }}>Loading Dala Real Estate…</span>
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
      <div style={{ padding: '0 0 24px' }}>
        {/* ── Tier 1: Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Space align="center" size={12}>
            <div
              style={{
                background: `${primaryColor}15`,
                borderRadius: 10,
                padding: '8px 10px',
                color: primaryColor,
                fontSize: 20,
              }}
            >
              <DashboardOutlined />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                {PERIOD_LABELS[periodFilter] || 'Overview'} · Dala Real Estate
              </Title>
              <Text style={{ fontSize: 12, color: '#64748b' }}>
                {getFormattedDateRange()} · Property portfolio management, leases, collections & transactions
              </Text>
            </div>
          </Space>

          <Space size="small" wrap>
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 8,
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid #e2e8f0',
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
                style={{ minWidth: 240 }}
                size="small"
              />
            )}
            <Button
              size="small"
              icon={<SyncOutlined spin={isFetching} />}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </Space>
        </div>

        {/* ── Tier 2: 4 Executive KPI Cards (Matching Duka, Mteja & Pesa Style) ── */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={12} lg={6}>
            <KPICard
              title="Portfolio Scale"
              value={`${dashboardData?.totalProperties || 0} Units`}
              icon={<HomeOutlined />}
              color="#6366f1"
              bg="#eef2ff"
              border="#c7d2fe"
              subtext={
                <Text style={{ fontSize: 11, color: "#64748b" }}>
                  {dashboardData?.availableUnits || 0} available · {dashboardData?.occupancyRate || 0}% occupancy
                </Text>
              }
            />
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <KPICard
              title="Total Revenue"
              value={`KES ${fmtK(dashboardData?.totalRevenue || 0)}`}
              icon={<TrophyOutlined />}
              color="#10b981"
              bg="#f0fdf4"
              border="#bbf7d0"
              subtext={
                <Text style={{ fontSize: 11, color: "#64748b" }}>
                  Sales: KES {fmtK(dashboardData?.monthlySalesRevenue || 0)} · Rent: KES {fmtK(dashboardData?.monthlyRentCollected || 0)}
                </Text>
              }
            />
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <KPICard
              title="Rental Collections"
              value={`KES ${fmtK(dashboardData?.monthlyRentCollected || 0)}`}
              icon={<WalletOutlined />}
              color="#3b82f6"
              bg="#eff6ff"
              border="#bfdbfe"
              subtext={
                <Text style={{ fontSize: 11, color: "#64748b" }}>
                  Billed: KES {fmtK(dashboardData?.monthlyRentBilled || 0)} · Unpaid: KES {fmtK(dashboardData?.rentOutstanding || 0)}
                </Text>
              }
            />
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <KPICard
              title="Commissions Pipeline"
              value={`KES ${fmtK(dashboardData?.totalCommission || 0)}`}
              icon={<DollarOutlined />}
              color="#8b5cf6"
              bg="#f5f3ff"
              border="#ddd6fe"
              subtext={
                <Text style={{ fontSize: 11, color: "#64748b" }}>
                  Paid: KES {fmtK(dashboardData?.commissionStats?.paidCommission || 0)} · Pending: KES {fmtK(dashboardData?.commissionStats?.pendingCommission || 0)}
                </Text>
              }
            />
          </Col>
        </Row>

        {/* ── Tier 3: Visual Analytics Hub ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {/* Revenue Overview Trend */}
          <Col xs={24} lg={15}>
            <ProCard
              title={<Text strong>Revenue Trend Overview</Text>}
              bordered
              bodyStyle={{ paddingTop: 8 }}
              size="small"
            >
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={plChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                  <ReTooltip
                    formatter={(val: number) => [`KES ${fmt(val)}`, undefined]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Sales Revenue" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Rent Revenue" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Total Revenue" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </ProCard>
          </Col>

          {/* Unit Status & Performance Hub */}
          <Col xs={24} lg={9}>
            <ProCard
              title={<Text strong>Portfolio & Agents</Text>}
              bordered
              bodyStyle={{ paddingTop: 8 }}
              size="small"
              extra={
                <Segmented
                  size="small"
                  value={sideView}
                  onChange={(v) => setSideView(v as string)}
                  options={[
                    { label: 'Units', value: 'units' },
                    { label: 'Top Agents', value: 'agents' },
                  ]}
                />
              }
            >
              {sideView === 'units' ? (
                <div>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={unitStatusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={58}
                        innerRadius={30}
                      >
                        {unitStatusData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <ReTooltip
                        formatter={(v: number, name: string) => [v, name]}
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 8, maxHeight: 95, overflowY: "auto" }}>
                    {unitStatusData.map((e, i) => (
                      <div
                        key={i}
                        style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}
                      >
                        <Space size={6}>
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: e.color,
                              flexShrink: 0,
                            }}
                          />
                          <Text style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>
                            {e.name}
                          </Text>
                        </Space>
                        <Text style={{ fontSize: 11, fontWeight: 600 }}>{e.value} units</Text>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ maxHeight: 235, overflowY: 'auto' }}>
                  {topAgents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8', fontSize: 12 }}>
                      No agent activity recorded
                    </div>
                  ) : (
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      {topAgents.map((agent: any, i: number) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 8px',
                            background: '#f8fafc',
                            borderRadius: 6,
                            borderLeft: `3px solid ${primaryColor}`,
                          }}
                        >
                          <Space size={6}>
                            <UserOutlined style={{ color: '#64748b', fontSize: 12 }} />
                            <div>
                              <Text style={{ fontSize: 11, fontWeight: 600, display: 'block' }}>
                                {agent.agentName || 'Agent'}
                              </Text>
                              <Text style={{ fontSize: 10, color: '#94a3b8' }}>
                                {agent.totalSales || 0} sales · {agent.conversionRate?.toFixed(1) || 0}% conv
                              </Text>
                            </div>
                          </Space>
                          <Text strong style={{ fontSize: 12, color: '#10b981' }}>
                            KES {fmtK(agent.totalSalesValue || 0)}
                          </Text>
                        </div>
                      ))}
                    </Space>
                  )}
                </div>
              )}
            </ProCard>
          </Col>
        </Row>

        {/* ── Tier 4: Unified Real Estate Operations Hub ── */}
        <ProCard
          bordered
          size="small"
          bodyStyle={{ padding: "0 12px 12px" }}
          tabs={{
            type: "line",
            items: [
              {
                key: "sales",
                label: (
                  <Space size={6}>
                    <DollarOutlined />
                    <span>Sales Pipeline</span>
                    {recentSales.length > 0 && (
                      <Badge count={recentSales.length} style={{ backgroundColor: "#10b981" }} />
                    )}
                  </Space>
                ),
                children: (
                  <div>
                    <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Completed Revenue</Text>
                          <Text strong style={{ fontSize: 14, color: '#10b981', display: 'block' }}>
                            KES {fmtK(dashboardData?.salesStats?.completedRevenue || 0)}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#fff7ed', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Pending Revenue</Text>
                          <Text strong style={{ fontSize: 14, color: '#f59e0b', display: 'block' }}>
                            KES {fmtK(dashboardData?.salesStats?.pendingRevenue || 0)}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#eff6ff', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Pending Sales</Text>
                          <Text strong style={{ fontSize: 14, color: '#3b82f6', display: 'block' }}>
                            {dashboardData?.pendingSales || 0}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Total Sales Count</Text>
                          <Text strong style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>
                            {dashboardData?.totalSales || 0}
                          </Text>
                        </div>
                      </Col>
                    </Row>
                    <Table
                      rowKey="_id"
                      dataSource={recentSales}
                      columns={[
                        {
                          title: 'Property',
                          dataIndex: 'propertyName',
                          width: 140,
                          render: (v: string, record: any) => (
                            <Space direction="vertical" size={0}>
                              <Text style={{ fontSize: 12, fontWeight: 600 }}>{v || 'N/A'}</Text>
                              <Text style={{ fontSize: 10, color: '#94a3b8' }}>{record.saleCode}</Text>
                            </Space>
                          ),
                        },
                        {
                          title: 'Client',
                          dataIndex: 'customerName',
                          width: 130,
                          render: (v: string) => <Text style={{ fontSize: 12 }}>{v || 'N/A'}</Text>,
                        },
                        {
                          title: 'Amount',
                          dataIndex: 'salePrice',
                          align: 'right' as const,
                          width: 110,
                          render: (v: number) => (
                            <Text strong style={{ fontSize: 12, color: '#1d39c4' }}>
                              KES {fmtK(v)}
                            </Text>
                          ),
                        },
                        {
                          title: 'Status',
                          dataIndex: 'status',
                          width: 90,
                          render: (status: string) => (
                            <Tag
                              style={{
                                background: status === 'completed' ? '#f0fdf4' : status === 'pending' ? '#fff7ed' : '#eff6ff',
                                color: status === 'completed' ? '#10b981' : status === 'pending' ? '#f59e0b' : '#3b82f6',
                                border: 'none',
                                fontSize: 10,
                                borderRadius: 4,
                              }}
                            >
                              {status?.toUpperCase() || '-'}
                            </Tag>
                          ),
                        },
                      ]}
                      pagination={{ pageSize: 5, size: 'small' }}
                      size="small"
                      locale={{ emptyText: 'No recent sales' }}
                    />
                  </div>
                ),
              },
              {
                key: "leases",
                label: (
                  <Space size={6}>
                    <HomeOutlined />
                    <span>Leases & Tenancies</span>
                    {recentLeases.length > 0 && (
                      <Badge count={recentLeases.length} style={{ backgroundColor: "#3b82f6" }} />
                    )}
                  </Space>
                ),
                children: (
                  <div>
                    <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Active Leases</Text>
                          <Text strong style={{ fontSize: 14, color: '#10b981', display: 'block' }}>
                            {dashboardData?.activeLeases || 0}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#eff6ff', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Total Rent Value</Text>
                          <Text strong style={{ fontSize: 14, color: '#3b82f6', display: 'block' }}>
                            KES {fmtK(dashboardData?.leaseStats?.totalRentAmount || 0)}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#fff7ed', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Deposits Held</Text>
                          <Text strong style={{ fontSize: 14, color: '#f59e0b', display: 'block' }}>
                            KES {fmtK(dashboardData?.leaseStats?.totalDepositPaid || 0)}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Occupancy Rate</Text>
                          <Text strong style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>
                            {dashboardData?.occupancyRate || 0}%
                          </Text>
                        </div>
                      </Col>
                    </Row>
                    <Table
                      rowKey="_id"
                      dataSource={recentLeases}
                      columns={[
                        {
                          title: 'Property',
                          dataIndex: 'propertyName',
                          width: 140,
                          render: (v: string, record: any) => (
                            <Space direction="vertical" size={0}>
                              <Text style={{ fontSize: 12, fontWeight: 600 }}>{v || 'N/A'}</Text>
                              <Text style={{ fontSize: 10, color: '#94a3b8' }}>{record.unitName || '-'}</Text>
                            </Space>
                          ),
                        },
                        {
                          title: 'Rent',
                          dataIndex: 'rentAmount',
                          align: 'right' as const,
                          width: 110,
                          render: (v: number) => (
                            <Text strong style={{ fontSize: 12, color: '#1d39c4' }}>
                              KES {fmtK(v)}
                            </Text>
                          ),
                        },
                        {
                          title: 'Ends',
                          dataIndex: 'endDate',
                          width: 110,
                          render: (date: string) => (
                            <Text style={{ fontSize: 11, color: '#64748b' }}>
                              {date ? dayjs(date).format('DD MMM YYYY') : '-'}
                            </Text>
                          ),
                        },
                        {
                          title: 'Status',
                          dataIndex: 'status',
                          width: 90,
                          render: (status: string) => (
                            <Tag
                              style={{
                                background: status === 'active' ? '#f0fdf4' : status === 'pending' ? '#fff7ed' : '#fef2f2',
                                color: status === 'active' ? '#10b981' : status === 'pending' ? '#f59e0b' : '#ef4444',
                                border: 'none',
                                fontSize: 10,
                                borderRadius: 4,
                              }}
                            >
                              {status?.toUpperCase() || '-'}
                            </Tag>
                          ),
                        },
                      ]}
                      pagination={{ pageSize: 5, size: 'small' }}
                      size="small"
                      locale={{ emptyText: 'No recent leases' }}
                    />
                  </div>
                ),
              },
              {
                key: "rent",
                label: (
                  <Space size={6}>
                    <WalletOutlined />
                    <span>Rent Collections</span>
                    {recentRentPayments.length > 0 && (
                      <Badge count={recentRentPayments.length} style={{ backgroundColor: "#8b5cf6" }} />
                    )}
                  </Space>
                ),
                children: (
                  <div>
                    <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Collected</Text>
                          <Text strong style={{ fontSize: 14, color: '#10b981', display: 'block' }}>
                            KES {fmtK(dashboardData?.rentalStats?.totalCollected || 0)}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#eff6ff', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Total Billed</Text>
                          <Text strong style={{ fontSize: 14, color: '#3b82f6', display: 'block' }}>
                            KES {fmtK(dashboardData?.rentalStats?.totalBilled || 0)}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#fff7ed', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Outstanding</Text>
                          <Text strong style={{ fontSize: 14, color: '#f59e0b', display: 'block' }}>
                            KES {fmtK(dashboardData?.rentalStats?.outstandingBalance || 0)}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Paid Invoices</Text>
                          <Text strong style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>
                            {dashboardData?.rentalStats?.paidInvoices || 0}/{dashboardData?.rentalStats?.totalInvoices || 0}
                          </Text>
                        </div>
                      </Col>
                    </Row>
                    <Table
                      rowKey="_id"
                      dataSource={recentRentPayments}
                      columns={[
                        {
                          title: 'Property',
                          dataIndex: 'propertyName',
                          width: 140,
                          render: (v: string, record: any) => (
                            <Space direction="vertical" size={0}>
                              <Text style={{ fontSize: 12, fontWeight: 600 }}>{v || 'N/A'}</Text>
                              <Text style={{ fontSize: 10, color: '#94a3b8' }}>{record.unitName || '-'}</Text>
                            </Space>
                          ),
                        },
                        {
                          title: 'Amount',
                          dataIndex: 'amount',
                          align: 'right' as const,
                          width: 110,
                          render: (v: number) => (
                            <Text strong style={{ fontSize: 12, color: '#1d39c4' }}>
                              KES {fmtK(v)}
                            </Text>
                          ),
                        },
                        {
                          title: 'Method',
                          dataIndex: 'paymentMethod',
                          width: 100,
                          render: (method: string) => (
                            <Tag style={{ fontSize: 10 }}>{method?.replace(/_/g, ' ').toUpperCase() || '-'}</Tag>
                          ),
                        },
                        {
                          title: 'Status',
                          dataIndex: 'status',
                          width: 90,
                          render: (status: string) => (
                            <Tag color={status === 'confirmed' ? 'green' : 'orange'} style={{ fontSize: 10 }}>
                              {status?.toUpperCase() || '-'}
                            </Tag>
                          ),
                        },
                      ]}
                      pagination={{ pageSize: 5, size: 'small' }}
                      size="small"
                      locale={{ emptyText: 'No recent rent payments' }}
                    />
                  </div>
                ),
              },
              {
                key: "plans",
                label: (
                  <Space size={6}>
                    <AlertOutlined />
                    <span>Payment Plans Due</span>
                    {totalPaymentCount > 0 && (
                      <Badge count={totalPaymentCount} style={{ backgroundColor: "#ef4444" }} />
                    )}
                  </Space>
                ),
                children: (
                  <div>
                    <div
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: 8,
                        padding: '10px 14px',
                        marginBottom: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <Space size={8}>
                        <AlertOutlined style={{ color: '#ef4444', fontSize: 16 }} />
                        <Text strong style={{ color: '#991b1b', fontSize: 13 }}>
                          Total Overdue / Due Balance: KES {fmtK(totalPaymentDue)}
                        </Text>
                      </Space>
                      <Tag color="error">{totalPaymentCount} total plans</Tag>
                    </div>
                    <Table
                      rowKey="_id"
                      dataSource={paymentsDue}
                      columns={[
                        {
                          title: 'Client',
                          dataIndex: 'customerName',
                          width: 140,
                          render: (v: string, record: any) => (
                            <Space direction="vertical" size={0}>
                              <Text style={{ fontSize: 12, fontWeight: 600 }}>{v || 'N/A'}</Text>
                              <Text style={{ fontSize: 10, color: '#94a3b8' }}>{record.propertyName || '-'}</Text>
                            </Space>
                          ),
                        },
                        {
                          title: 'Sale Code',
                          dataIndex: 'saleCode',
                          width: 110,
                          render: (code: string) => <Text style={{ fontSize: 11 }}>{code || '-'}</Text>,
                        },
                        {
                          title: 'Due Date',
                          dataIndex: 'dueDate',
                          width: 100,
                          render: (date: string) => (
                            <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: 500 }}>
                              {date ? dayjs(date).format('DD MMM') : '-'}
                            </Text>
                          ),
                        },
                        {
                          title: 'Installment',
                          dataIndex: 'installmentAmount',
                          align: 'right' as const,
                          width: 110,
                          render: (v: number) => (
                            <Text strong style={{ fontSize: 12, color: '#ef4444' }}>
                              KES {fmtK(v)}
                            </Text>
                          ),
                        },
                        {
                          title: 'Balance',
                          dataIndex: 'balance',
                          align: 'right' as const,
                          width: 110,
                          render: (v: number) => `KES ${fmtK(v)}`,
                        },
                        {
                          title: 'Status',
                          dataIndex: 'status',
                          width: 90,
                          render: (status: string) => (
                            <Tag color={status === 'active' ? 'green' : 'orange'} style={{ fontSize: 10 }}>
                              {status?.toUpperCase() || 'ACTIVE'}
                            </Tag>
                          ),
                        },
                      ]}
                      pagination={{ pageSize: 5, size: 'small' }}
                      size="small"
                      locale={{ emptyText: <Empty description="No payment plans due" style={{ padding: 12 }} /> }}
                    />
                  </div>
                ),
              },
              {
                key: "maintenance",
                label: (
                  <Space size={6}>
                    <ToolOutlined />
                    <span>Maintenance & Repairs</span>
                    {dashboardData?.openMaintenanceTickets > 0 && (
                      <Badge count={dashboardData.openMaintenanceTickets} style={{ backgroundColor: "#faad14" }} />
                    )}
                  </Space>
                ),
                children: (
                  <div>
                    <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#f9f0ff', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Total Tickets</Text>
                          <Text strong style={{ fontSize: 14, color: '#722ed1', display: 'block' }}>
                            {dashboardData?.totalMaintenanceTickets || 0}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#fffbe6', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Open Tickets</Text>
                          <Text strong style={{ fontSize: 14, color: '#d48806', display: 'block' }}>
                            {dashboardData?.openMaintenanceTickets || 0}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#fff1f0', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Urgent Tickets</Text>
                          <Text strong style={{ fontSize: 14, color: '#cf1322', display: 'block' }}>
                            {dashboardData?.maintenanceStats?.urgentTickets || 0}
                          </Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div style={{ background: '#e6fffb', padding: '8px 10px', borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Est. Cost</Text>
                          <Text strong style={{ fontSize: 14, color: '#08979c', display: 'block' }}>
                            KES {fmtK(dashboardData?.maintenanceStats?.actualCost || dashboardData?.maintenanceStats?.estimatedCost || 0)}
                          </Text>
                        </div>
                      </Col>
                    </Row>
                    <Table
                      rowKey="_id"
                      dataSource={recentMaintenanceTickets}
                      columns={[
                        {
                          title: 'Ticket',
                          dataIndex: 'ticketNumber',
                          width: 120,
                          render: (ticketNumber: string, record: any) => (
                            <Space direction="vertical" size={0}>
                              <Text style={{ fontSize: 12, fontWeight: 600 }}>{ticketNumber || '-'}</Text>
                              <Text style={{ fontSize: 10, color: '#94a3b8' }}>{record.title || '-'}</Text>
                            </Space>
                          ),
                        },
                        {
                          title: 'Property',
                          dataIndex: 'propertyName',
                          render: (propertyName: string, record: any) => (
                            <Space direction="vertical" size={0}>
                              <Text style={{ fontSize: 12 }}>{propertyName || '-'}</Text>
                              <Text style={{ fontSize: 10, color: '#94a3b8' }}>{record.unitName || '-'}</Text>
                            </Space>
                          ),
                        },
                        {
                          title: 'Priority',
                          dataIndex: 'priority',
                          width: 90,
                          render: (priority: string) => (
                            <Tag color={priority === 'urgent' ? 'red' : priority === 'high' ? 'orange' : 'blue'} style={{ fontSize: 10 }}>
                              {priority?.toUpperCase() || '-'}
                            </Tag>
                          ),
                        },
                        {
                          title: 'Status',
                          dataIndex: 'status',
                          width: 100,
                          render: (status: string) => (
                            <Tag color={status === 'resolved' || status === 'closed' ? 'green' : status === 'in_progress' ? 'blue' : 'orange'} style={{ fontSize: 10 }}>
                              {status?.replace(/_/g, ' ').toUpperCase() || '-'}
                            </Tag>
                          ),
                        },
                        {
                          title: 'Est. Cost',
                          dataIndex: 'estimatedCost',
                          align: 'right' as const,
                          width: 110,
                          render: (amount: number) => `KES ${fmtK(amount || 0)}`,
                        },
                      ]}
                      pagination={{ pageSize: 5, size: 'small' }}
                      size="small"
                      locale={{ emptyText: 'No recent maintenance tickets' }}
                    />
                  </div>
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

