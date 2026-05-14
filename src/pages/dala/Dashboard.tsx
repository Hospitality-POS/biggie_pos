import React, { useState } from 'react';
import { ProCard } from '@ant-design/pro-components';
import {
  Row,
  Col,
  Typography,
  Space,
  Select,
  Tag,
  Table,
  Spin,
  Alert,
  Progress,
  Tooltip,
  Button,
  App,
} from 'antd';
import {
    HomeOutlined,
    DollarOutlined,
    CalendarOutlined,
    TrophyOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    SyncOutlined,
    DashboardOutlined,
    BuildOutlined as ToolOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { fetchDalaDashboard } from '@services/dala';
import { useDalaDashboard } from '../../stores/dalaStore';
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtK = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return fmt(v);
};

const MONTH_LABELS: string[] = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KPICardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    bg: string;
    pctChange?: number | null;
    suffix?: string;
    prefix?: string;
}

const KPICard: React.FC<KPICardProps> = ({
    title, value, icon, color, bg, pctChange, suffix, prefix = "KES",
}) => (
    <div
        style={{
            background: bg,
            borderRadius: 12,
            padding: "20px 24px",
            height: "100%",
            position: "relative",
            overflow: "hidden",
        }}
    >
        {/* decorative circle */}
        <div
            style={{
                position: "absolute",
                right: -20,
                top: -20,
                width: 90,
                height: 90,
                borderRadius: "50%",
                background: `${color}22`,
            }}
        />
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Space align="center">
                <div
                    style={{
                        background: `${color}20`,
                        borderRadius: 8,
                        padding: "6px 8px",
                        color,
                        fontSize: 18,
                        lineHeight: 1,
                    }}
                >
                    {icon}
                </div>
                <Text style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{title}</Text>
            </Space>
            <Text
                strong
                style={{ fontSize: 22, color: "#0f172a", display: "block", lineHeight: 1.2 }}
            >
                {prefix} {fmtK(value)}
                {suffix && <span style={{ fontSize: 13, marginLeft: 4, color: "#64748b" }}>{suffix}</span>}
            </Text>
            {pctChange !== null && pctChange !== undefined && (
                <Space size={4}>
                    {pctChange >= 0 ? (
                        <ArrowUpOutlined style={{ color: "#10b981", fontSize: 11 }} />
                    ) : (
                        <ArrowDownOutlined style={{ color: "#ef4444", fontSize: 11 }} />
                    )}
                    <Text style={{ fontSize: 11, color: pctChange >= 0 ? "#10b981" : "#ef4444" }}>
                        {Math.abs(pctChange)}% vs last month
                    </Text>
                </Space>
            )}
        </Space>
    </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const DalaDashboard: React.FC = () => {
    const { data: dashboard, setDashboard } = useDalaDashboard();
    const primaryColor = usePrimaryColor();
    const now = dayjs();

    const [fiscalYear, setFiscalYear] = useState(now.year());
    const [fiscalMonth, setFiscalMonth] = useState(now.month() + 1);

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
            commissionStats,
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
        queryKey: ['dala-dashboard'],
        queryFn: () => fetchDalaDashboard(),
        onSuccess: (data) => {
            setDashboard(normalizeDashboardData(data));
        },
    });

    const dashboardData = normalizeDashboardData(data || dashboard);

    // Extract real data from dashboard API response
    const revenueData = dashboardData?.revenueTrend || [
        {
            month: MONTH_LABELS[fiscalMonth],
            revenue: dashboardData?.summary?.totalSalesRevenue || 0,
            rent: dashboardData?.summary?.totalRentRevenue || 0,
            total: dashboardData?.summary?.totalRevenue || 0,
        },
    ];
    const propertyTypeData = dashboardData?.propertyTypes || [];

    // ── Chart data ─────────────────────────────────────────────────────────────

    const plChartData = revenueData.map((m: any) => ({
        name: m.month,
        "Sales Revenue": m.revenue || 0,
        "Rent Revenue": m.rent || 0,
        "Total Revenue": m.total || (m.revenue || 0) + (m.rent || 0),
    }));

    // ── Year options ───────────────────────────────────────────────────────────

    const yearOptions = Array.from({ length: 5 }, (_, i) => {
        const y = now.year() - i;
        return { label: String(y), value: y };
    });

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
        label: MONTH_LABELS[i + 1],
        value: i + 1,
    }));

  if (isLoading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
                <Spin size="large" />
                <span style={{ color: "#64748b", fontSize: 13 }}>Loading Dala dashboard…</span>
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

    const recentSales = dashboardData?.recentSales || [];
    const recentLeases = dashboardData?.recentLeases || [];
    const recentRentPayments = dashboardData?.recentRentPayments || [];
    const recentMaintenanceTickets = dashboardData?.recentMaintenanceTickets || [];
    const unitStatusData = [
        { name: "Available", value: dashboardData?.availableUnits || 0, color: "#10b981" },
        { name: "Occupied", value: dashboardData?.leasedProperties || 0, color: "#3b82f6" },
        { name: "Sold", value: dashboardData?.soldProperties || 0, color: "#f59e0b" },
    ].filter(item => item.value > 0);

    return (
        <App>
            <div style={{ padding: "0 0 24px" }}>

                {/* ── Header ── */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 24,
                    }}
                >
                    <Space align="center" size={12}>
                        <div
                            style={{
                                background: `${primaryColor}15`,
                                borderRadius: 10,
                                padding: "8px 10px",
                                color: primaryColor,
                                fontSize: 20,
                            }}
                        >
                            <DashboardOutlined />
                        </div>
                        <div>
                            <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
                                Dala Dashboard
                            </Title>
                            <Text style={{ fontSize: 12, color: "#64748b" }}>
                                {MONTH_LABELS[fiscalMonth]} {fiscalYear} · Property Management Overview
                            </Text>
                        </div>
                    </Space>

                    <Space>
                        <Select
                            value={fiscalMonth}
                            onChange={setFiscalMonth}
                            options={monthOptions}
                            style={{ width: 80 }}
                            size="small"
                        />
                        <Select
                            value={fiscalYear}
                            onChange={setFiscalYear}
                            options={yearOptions}
                            style={{ width: 90 }}
                            size="small"
                        />
                        <Button
                            size="small"
                            icon={<SyncOutlined spin={isFetching} />}
                            onClick={() => refetch()}
                        >
                            Refresh
                        </Button>
                    </Space>
                </div>

                {/* ── Section 1: KPI Cards ── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Total Properties"
                            value={dashboardData?.totalProperties || 0}
                            icon={<HomeOutlined />}
                            color="#6366f1"
                            bg="#eef2ff"
                            pctChange={12}
                            prefix=""
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Available Units"
                            value={dashboardData?.propertiesForSale || 0}
                            icon={<DollarOutlined />}
                            color="#10b981"
                            bg="#f0fdf4"
                            pctChange={8}
                            prefix=""
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Occupied Units"
                            value={dashboardData?.propertiesForLease || 0}
                            icon={<CalendarOutlined />}
                            color="#3b82f6"
                            bg="#eff6ff"
                            pctChange={5}
                            prefix=""
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Total Revenue"
                            value={dashboardData?.totalRevenue || 0}
                            icon={<TrophyOutlined />}
                            color="#f59e0b"
                            bg="#fff7ed"
                            pctChange={-3}
                            prefix=""
                        />
                    </Col>
                </Row>

                {/* ── Section 2: Revenue + Portfolio Mix ── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} lg={16}>
                        <ProCard
                            title={<Text strong>Revenue Overview</Text>}
                            bordered
                            bodyStyle={{ paddingTop: 8 }}
                            size="small"
                        >
                            <ResponsiveContainer width="100%" height={240}>
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

                    <Col xs={24} lg={8}>
                        <ProCard
                            title={<Text strong>Unit Status</Text>}
                            bordered
                            bodyStyle={{ paddingTop: 8 }}
                            size="small"
                        >
                            <ResponsiveContainer width="100%" height={140}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            ...unitStatusData
                                        ]}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={58}
                                        innerRadius={30}
                                    >
                                        {[
                                            ...unitStatusData
                                        ].map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <ReTooltip
                                        formatter={(v: number, name: string) => [v, name]}
                                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ marginTop: 8 }}>
                                {[
                                    ...unitStatusData
                                ].map((e, i) => (
                                    <div
                                        key={i}
                                        style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}
                                    >
                                        <Space size={6}>
                                            <div
                                                style={{
                                                    width: 8, height: 8, borderRadius: "50%",
                                                    background: e.color, flexShrink: 0,
                                                }}
                                            />
                                            <Text style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>
                                                {e.name}
                                            </Text>
                                        </Space>
                                        <Text style={{ fontSize: 11, fontWeight: 600 }}>{e.value}</Text>
                                    </div>
                                ))}
                            </div>
                        </ProCard>
                    </Col>
                </Row>

                {/* ── Section 3: Property Operations Overview ── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>

                    {/* Revenue Collection */}
                    <Col xs={24} lg={8}>
                        <ProCard title={<Text strong>Revenue Collection</Text>} bordered size="small">
                            <Space direction="vertical" size={16} style={{ width: "100%" }}>
                                <div
                                    style={{
                                        background: "#f0fdf4",
                                        borderRadius: 8,
                                        padding: "12px 16px",
                                    }}
                                >
                                    <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>
                                        Monthly Rental Income
                                    </Text>
                                    <Text strong style={{ fontSize: 20, color: "#10b981" }}>
                                        KES {fmtK(dashboardData?.monthlyRentCollected || 0)}
                                    </Text>
                                    <div style={{ marginTop: 6, display: "flex", gap: 16 }}>
                                        <div>
                                            <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Expected</Text>
                                            <Text style={{ fontSize: 12, color: "#1d39c4" }}>
                                                {fmtK(dashboardData?.monthlyRentBilled || 0)}
                                            </Text>
                                        </div>
                                        <div>
                                            <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Outstanding</Text>
                                            <Text style={{ fontSize: 12, color: "#ef4444" }}>
                                                {fmtK(dashboardData?.rentOutstanding || 0)}
                                            </Text>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        background: "#eff6ff",
                                        borderRadius: 8,
                                        padding: "12px 16px",
                                    }}
                                >
                                    <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>
                                        Monthly Sales Revenue
                                    </Text>
                                    <Text strong style={{ fontSize: 20, color: "#3b82f6" }}>
                                        KES {fmtK(dashboardData?.monthlySalesRevenue || 0)}
                                    </Text>
                                    <div style={{ marginTop: 6, display: "flex", gap: 16 }}>
                                        <div>
                                            <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Pending</Text>
                                            <Text style={{ fontSize: 12, color: "#f59e0b" }}>
                                                {fmtK(dashboardData?.pendingSalesRevenue || 0)}
                                            </Text>
                                        </div>
                                        <div>
                                            <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Commission</Text>
                                            <Text style={{ fontSize: 12, color: "#10b981" }}>
                                                {fmtK(dashboardData?.monthlyCommission || 0)}
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            </Space>
                        </ProCard>
                    </Col>

                    {/* Property Status */}
                    <Col xs={24} lg={8}>
                        <ProCard
                            title={<Text strong>Property Status</Text>}
                            extra={
                                <Text strong style={{ color: "#3b82f6", fontSize: 14 }}>
                                    {dashboardData?.totalProperties || 0} Properties
                                </Text>
                            }
                            bordered
                            size="small"
                        >
                            <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                {propertyTypeData.length === 0 ? (
                                    <Text type="secondary" style={{ fontSize: 12 }}>No properties configured</Text>
                                ) : (
                                    propertyTypeData.map((property: any, i: number) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "8px 10px",
                                                background: "#f8fafc",
                                                borderRadius: 8,
                                                borderLeft: `3px solid ${primaryColor}`,
                                            }}
                                        >
                                            <Space direction="vertical" size={0}>
                                                <Text style={{ fontSize: 12, fontWeight: 600 }}>{property.type}</Text>
                                                <Text style={{ fontSize: 10, color: "#94a3b8" }}>{property.count} units</Text>
                                            </Space>
                                            <Text
                                                strong
                                                style={{
                                                    fontSize: 13,
                                                    color: "#0f172a",
                                                }}
                                            >
                                                {property.occupancyRate || 0}% occupied
                                            </Text>
                                        </div>
                                    ))
                                )}
                            </Space>
                        </ProCard>
                    </Col>

                    {/* Transaction Activity */}
                    <Col xs={24} lg={8}>
                        <ProCard title={<Text strong>Transaction Activity</Text>} bordered size="small">
                            <Space direction="vertical" size={10} style={{ width: "100%" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f0fdf4", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Active Leases</Text>
                                    <Text strong style={{ color: "#10b981" }}>{dashboardData?.activeLeases || 0}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#eff6ff", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Pending Sales</Text>
                                    <Text strong style={{ color: "#3b82f6" }}>{dashboardData?.pendingSales || 0}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#fff7ed", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Completed Sales</Text>
                                    <Text strong style={{ color: "#f59e0b" }}>{dashboardData?.completedSales || 0}</Text>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "12px",
                                        background: "#f8fafc",
                                        borderRadius: 8,
                                        border: "1px solid #e2e8f0",
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: 600 }}>
                                        Total This Month
                                    </Text>
                                    <Text strong style={{ fontSize: 16, color: "#0f172a" }}>
                                        {(dashboardData?.activeLeases || 0) + (dashboardData?.pendingSales || 0) + (dashboardData?.completedSales || 0)}
                                    </Text>
                                </div>

                                {/* Transaction status pills */}
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                                    <Tooltip title="Lease renewal rate">
                                        <div style={{ background: "#f0fdf4", borderRadius: 6, padding: "4px 10px", fontSize: 11 }}>
                                            🏠 {dashboardData?.occupancyRate || 0}% Occupancy
                                        </div>
                                    </Tooltip>
                                    <Tooltip title="Sales conversion rate">
                                        <div style={{ background: "#eff6ff", borderRadius: 6, padding: "4px 10px", fontSize: 11 }}>
                                            💰 {dashboardData?.completedSales || 0}/{dashboardData?.totalSales || 0} Completed
                                        </div>
                                    </Tooltip>
                                </div>
                            </Space>
                        </ProCard>
                    </Col>
                </Row>

                {/* ── Section 4: Sales, Leases and Collections ── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} lg={8}>
                        <ProCard title={<Text strong>Sales Pipeline</Text>} bordered size="small">
                            <Space direction="vertical" size={10} style={{ width: "100%" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f0fdf4", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Completed Revenue</Text>
                                    <Text strong style={{ color: "#10b981" }}>KES {fmtK(dashboardData?.salesStats?.completedRevenue || 0)}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#fff7ed", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Pending Revenue</Text>
                                    <Text strong style={{ color: "#f59e0b" }}>KES {fmtK(dashboardData?.salesStats?.pendingRevenue || 0)}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#eff6ff", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Cancelled Sales</Text>
                                    <Text strong style={{ color: "#3b82f6" }}>{dashboardData?.cancelledSales || 0}</Text>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "12px",
                                        background: "#f8fafc",
                                        borderRadius: 8,
                                        border: "1px solid #e2e8f0",
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: 600 }}>
                                        Total Sales
                                    </Text>
                                    <Text strong style={{ fontSize: 16, color: "#0f172a" }}>
                                        {dashboardData?.totalSales || 0}
                                    </Text>
                                </div>
                            </Space>
                        </ProCard>
                    </Col>

                    <Col xs={24} lg={8}>
                        <ProCard title={<Text strong>Lease Summary</Text>} bordered size="small">
                            <Space direction="vertical" size={10} style={{ width: "100%" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f0fdf4", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Active Leases</Text>
                                    <Text strong style={{ color: "#10b981" }}>{dashboardData?.activeLeases || 0}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#eff6ff", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Total Rent Amount</Text>
                                    <Text strong style={{ color: "#3b82f6" }}>KES {fmtK(dashboardData?.leaseStats?.totalRentAmount || 0)}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#fff7ed", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Deposits Paid</Text>
                                    <Text strong style={{ color: "#f59e0b" }}>KES {fmtK(dashboardData?.leaseStats?.totalDepositPaid || 0)}</Text>
                                </div>
                                <Progress percent={dashboardData?.occupancyRate || 0} strokeColor={primaryColor} size="small" />
                            </Space>
                        </ProCard>
                    </Col>

                    <Col xs={24} lg={8}>
                        <ProCard
                            title={<Text strong>Rental Collection</Text>}
                            bordered
                            size="small"
                        >
                            <Space direction="vertical" size={10} style={{ width: "100%" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f0fdf4", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Collected</Text>
                                    <Text strong style={{ color: "#10b981" }}>KES {fmtK(dashboardData?.rentalStats?.totalCollected || 0)}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#eff6ff", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Total Billed</Text>
                                    <Text strong style={{ color: "#3b82f6" }}>KES {fmtK(dashboardData?.rentalStats?.totalBilled || 0)}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#fff7ed", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Outstanding</Text>
                                    <Text strong style={{ color: "#f59e0b" }}>KES {fmtK(dashboardData?.rentalStats?.outstandingBalance || 0)}</Text>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "12px",
                                        background: "#f8fafc",
                                        borderRadius: 8,
                                        border: "1px solid #e2e8f0",
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: 600 }}>
                                        Paid Invoices
                                    </Text>
                                    <Text strong style={{ fontSize: 16, color: "#0f172a" }}>
                                        {dashboardData?.rentalStats?.paidInvoices || 0}/{dashboardData?.rentalStats?.totalInvoices || 0}
                                    </Text>
                                </div>
                            </Space>
                        </ProCard>
                    </Col>
                </Row>

                {/* ── Section 5: Recent Activities ── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Maintenance Tickets"
                            value={dashboardData?.totalMaintenanceTickets || 0}
                            icon={<ToolOutlined />}
                            color="#722ed1"
                            bg="#f9f0ff"
                            pctChange={null}
                            prefix=""
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Open Maintenance"
                            value={dashboardData?.openMaintenanceTickets || 0}
                            icon={<ToolOutlined />}
                            color="#faad14"
                            bg="#fffbe6"
                            pctChange={null}
                            prefix=""
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Urgent Tickets"
                            value={dashboardData?.maintenanceStats?.urgentTickets || 0}
                            icon={<ToolOutlined />}
                            color="#ff4d4f"
                            bg="#fff1f0"
                            pctChange={null}
                            prefix=""
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Maintenance Cost"
                            value={dashboardData?.maintenanceStats?.actualCost || dashboardData?.maintenanceStats?.estimatedCost || 0}
                            icon={<DollarOutlined />}
                            color="#13c2c2"
                            bg="#e6fffb"
                            pctChange={null}
                            prefix="KES"
                        />
                    </Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={8}>
                        <ProCard
                            title={<Text strong>Recent Sales</Text>}
                            bordered
                            size="small"
                            bodyStyle={{ padding: 0 }}
                        >
                            <Table
                                rowKey="_id"
                                dataSource={recentSales}
                                columns={[
                                    {
                                        title: "Property",
                                        dataIndex: "propertyName",
                                        width: 120,
                                        render: (v: string, record: any) => (
                                            <Space direction="vertical" size={0}>
                                                <Text style={{ fontSize: 12, fontWeight: 600 }}>{v || "N/A"}</Text>
                                                <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record.saleCode}</Text>
                                            </Space>
                                        ),
                                    },
                                    {
                                        title: "Client",
                                        dataIndex: "customerName",
                                        width: 100,
                                        render: (v: string) => <Text style={{ fontSize: 12 }}>{v || "N/A"}</Text>,
                                    },
                                    {
                                        title: "Amount",
                                        dataIndex: "salePrice",
                                        align: "right" as const,
                                        width: 100,
                                        render: (v: number) => (
                                            <Text strong style={{ fontSize: 12, color: "#1d39c4" }}>
                                                {fmtK(v)}
                                            </Text>
                                        ),
                                    },
                                    {
                                        title: "Status",
                                        dataIndex: "status",
                                        width: 90,
                                        render: (status: string) => (
                                            <Tag
                                                style={{
                                                    background: status === 'completed' ? "#f0fdf4" : status === 'pending' ? "#fff7ed" : "#eff6ff",
                                                    color: status === 'completed' ? "#10b981" : status === 'pending' ? "#f59e0b" : "#3b82f6",
                                                    border: "none",
                                                    fontSize: 10,
                                                    borderRadius: 4,
                                                }}
                                            >
                                                {status.toUpperCase()}
                                            </Tag>
                                        ),
                                    },
                                ]}
                                pagination={false}
                                size="small"
                                locale={{ emptyText: "No sales this period" }}
                            />
                        </ProCard>
                    </Col>

                    <Col xs={24} lg={8}>
                        <ProCard
                            title={<Text strong>Recent Leases</Text>}
                            bordered
                            size="small"
                            bodyStyle={{ padding: 0 }}
                        >
                            <Table
                                rowKey="_id"
                                dataSource={recentLeases}
                                columns={[
                                    {
                                        title: "Property",
                                        dataIndex: "propertyName",
                                        width: 110,
                                        render: (v: string, record: any) => (
                                            <Space direction="vertical" size={0}>
                                                <Text style={{ fontSize: 12, fontWeight: 600 }}>{v || "N/A"}</Text>
                                                <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record.unitName || "-"}</Text>
                                            </Space>
                                        ),
                                    },
                                    {
                                        title: "Rent",
                                        dataIndex: "rentAmount",
                                        align: "right" as const,
                                        width: 80,
                                        render: (v: number) => (
                                            <Text strong style={{ fontSize: 12, color: "#1d39c4" }}>
                                                {fmtK(v)}
                                            </Text>
                                        ),
                                    },
                                    {
                                        title: "Ends",
                                        dataIndex: "endDate",
                                        width: 80,
                                        render: (date: string) => (
                                            <Text style={{ fontSize: 11, color: "#64748b" }}>
                                                {dayjs(date).format("DD MMM")}
                                            </Text>
                                        ),
                                    },
                                    {
                                        title: "Status",
                                        dataIndex: "status",
                                        width: 90,
                                        render: (status: string) => (
                                            <Tag
                                                style={{
                                                    background: status === 'active' ? "#f0fdf4" : status === 'pending' ? "#fff7ed" : "#fef2f2",
                                                    color: status === 'active' ? "#10b981" : status === 'pending' ? "#f59e0b" : "#ef4444",
                                                    border: "none",
                                                    fontSize: 10,
                                                    borderRadius: 4,
                                                }}
                                            >
                                                {status.toUpperCase()}
                                            </Tag>
                                        ),
                                    },
                                ]}
                                pagination={false}
                                size="small"
                                locale={{ emptyText: "No recent leases" }}
                            />
                        </ProCard>
                    </Col>
                    <Col xs={24} lg={8}>
                        <ProCard
                            title={<Text strong>Recent Rent Payments</Text>}
                            bordered
                            size="small"
                            bodyStyle={{ padding: 0 }}
                        >
                            <Table
                                rowKey="_id"
                                dataSource={recentRentPayments}
                                columns={[
                                    {
                                        title: "Property",
                                        dataIndex: "propertyName",
                                        width: 110,
                                        render: (v: string, record: any) => (
                                            <Space direction="vertical" size={0}>
                                                <Text style={{ fontSize: 12, fontWeight: 600 }}>{v || "N/A"}</Text>
                                                <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record.unitName || "-"}</Text>
                                            </Space>
                                        ),
                                    },
                                    {
                                        title: "Amount",
                                        dataIndex: "amount",
                                        align: "right" as const,
                                        width: 80,
                                        render: (v: number) => (
                                            <Text strong style={{ fontSize: 12, color: "#1d39c4" }}>
                                                {fmtK(v)}
                                            </Text>
                                        ),
                                    },
                                    {
                                        title: "Method",
                                        dataIndex: "paymentMethod",
                                        width: 80,
                                        render: (method: string) => <Text style={{ fontSize: 12 }}>{method?.toUpperCase() || "-"}</Text>,
                                    },
                                    {
                                        title: "Status",
                                        dataIndex: "status",
                                        width: 90,
                                        render: (status: string) => (
                                            <Tag
                                                style={{
                                                    background: status === 'confirmed' ? "#f0fdf4" : "#fff7ed",
                                                    color: status === 'confirmed' ? "#10b981" : "#f59e0b",
                                                    border: "none",
                                                    fontSize: 10,
                                                    borderRadius: 4,
                                                }}
                                            >
                                                {status?.toUpperCase() || "-"}
                                            </Tag>
                                        ),
                                    },
                                ]}
                                pagination={false}
                                size="small"
                                locale={{ emptyText: "No recent rent payments" }}
                            />
                        </ProCard>
                    </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
                    <Col xs={24}>
                        <ProCard
                            title={<Text strong>Recent Maintenance Tickets</Text>}
                            bordered
                            size="small"
                            bodyStyle={{ padding: 0 }}
                        >
                            <Table
                                rowKey="_id"
                                dataSource={recentMaintenanceTickets}
                                columns={[
                                    {
                                        title: "Ticket",
                                        dataIndex: "ticketNumber",
                                        width: 140,
                                        render: (ticketNumber: string, record: any) => (
                                            <Space direction="vertical" size={0}>
                                                <Text style={{ fontSize: 12, fontWeight: 600 }}>{ticketNumber || "-"}</Text>
                                                <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record.title || "-"}</Text>
                                            </Space>
                                        ),
                                    },
                                    {
                                        title: "Type",
                                        dataIndex: "ticketType",
                                        width: 140,
                                        render: (type: string) => (
                                            <Tag color={type === "property_maintenance" ? "green" : "purple"}>
                                                {type?.replace(/_/g, " ").toUpperCase() || "-"}
                                            </Tag>
                                        ),
                                    },
                                    {
                                        title: "Property",
                                        dataIndex: "propertyName",
                                        render: (propertyName: string, record: any) => (
                                            <Space direction="vertical" size={0}>
                                                <Text style={{ fontSize: 12 }}>{propertyName || "-"}</Text>
                                                <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record.unitName || "-"}</Text>
                                            </Space>
                                        ),
                                    },
                                    {
                                        title: "Priority",
                                        dataIndex: "priority",
                                        width: 100,
                                        render: (priority: string) => (
                                            <Tag color={priority === "urgent" ? "red" : priority === "high" ? "orange" : "blue"}>
                                                {priority?.toUpperCase() || "-"}
                                            </Tag>
                                        ),
                                    },
                                    {
                                        title: "Status",
                                        dataIndex: "status",
                                        width: 110,
                                        render: (status: string) => (
                                            <Tag color={status === "resolved" || status === "closed" ? "green" : status === "in_progress" ? "blue" : "orange"}>
                                                {status?.replace(/_/g, " ").toUpperCase() || "-"}
                                            </Tag>
                                        ),
                                    },
                                    {
                                        title: "Assigned",
                                        dataIndex: "assignedTo",
                                        width: 130,
                                        render: (assignedTo: string) => assignedTo || "-",
                                    },
                                    {
                                        title: "Est. Cost",
                                        dataIndex: "estimatedCost",
                                        align: "right" as const,
                                        width: 110,
                                        render: (amount: number) => `KES ${fmtK(amount || 0)}`,
                                    },
                                    {
                                        title: "Created",
                                        dataIndex: "createdAt",
                                        width: 100,
                                        render: (date: string) => date ? dayjs(date).format("DD MMM") : "-",
                                    },
                                ]}
                                pagination={false}
                                size="small"
                                locale={{ emptyText: "No recent maintenance tickets" }}
                            />
                        </ProCard>
                    </Col>
                </Row>

            </div>
        </App>
    );
};

export default DalaDashboard;
