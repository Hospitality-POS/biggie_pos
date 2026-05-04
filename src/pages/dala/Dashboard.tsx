import React, { useState } from 'react';
import { ProCard } from '@ant-design/pro-components';
import {
  Row,
  Col,
  Typography,
  Space,
  Select,
  Badge,
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
    FileTextOutlined,
    PlusOutlined,
    EyeOutlined,
    CalendarOutlined,
    TrophyOutlined,
    FireOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    SyncOutlined,
    DashboardOutlined,
    RiseOutlined,
    FallOutlined,
    BankOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDalaDashboard } from '@services/dala';
import { useDalaDashboard } from '../../stores/dalaStore';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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

const PROPERTY_COLORS = {
    apartments: "#6366f1",
    houses: "#3b82f6", 
    commercial: "#06b6d4",
    land: "#10b981",
};

const EXPENSE_PALETTE = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

const MONTH_LABELS: string[] = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const PROPERTY_SOURCE_COLORS: Record<string, string> = {
    direct_listing: "#6366f1",
    agent_referral: "#3b82f6",
    website: "#06b6d4",
    social_media: "#10b981",
    walk_in: "#f59e0b",
    other: "#8b5cf6",
};

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
    const navigate = useNavigate();
    const { data: dashboard, setDashboard } = useDalaDashboard();
    const primaryColor = usePrimaryColor();
    const now = dayjs();

    const [fiscalYear, setFiscalYear] = useState(now.year());
    const [fiscalMonth, setFiscalMonth] = useState(now.month() + 1);

    const { data, isLoading, isFetching, isError, refetch } = useQuery({
        queryKey: ['dala-dashboard'],
        queryFn: fetchDalaDashboard,
        onSuccess: (data) => {
            setDashboard(data.data);
        },
    });

    // Extract real data from dashboard API response
    const revenueData = dashboard?.revenueTrend || [];
    const occupancyData = dashboard?.occupancyData || [];
    const propertyTypeData = dashboard?.propertyTypes || [];
    const performanceMetrics = dashboard?.performanceMetrics || {};

    // ── Chart data ─────────────────────────────────────────────────────────────

    const plChartData = revenueData.map((m: any) => ({
        name: m.month,
        Revenue: m.revenue || 0,
        Expenses: m.expenses || 0,
        "Net P/L": (m.revenue || 0) - (m.expenses || 0),
    }));

    const propertySourceData = [
        { name: "Direct Listing", value: dashboard?.propertySources?.direct_listing || 5, color: PROPERTY_SOURCE_COLORS.direct_listing },
        { name: "Agent Referral", value: dashboard?.propertySources?.agent_referral || 3, color: PROPERTY_SOURCE_COLORS.agent_referral },
        { name: "Website", value: dashboard?.propertySources?.website || 8, color: PROPERTY_SOURCE_COLORS.website },
        { name: "Social Media", value: dashboard?.propertySources?.social_media || 2, color: PROPERTY_SOURCE_COLORS.social_media },
        { name: "Walk In", value: dashboard?.propertySources?.walk_in || 1, color: PROPERTY_SOURCE_COLORS.walk_in },
    ].filter(item => item.value > 0);

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

    const recentSales = dashboard?.recentSales || [];
    const upcomingRentPayments = dashboard?.upcomingRentPayments || [];

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
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/dala/properties')}>
                            Add Property
                        </Button>
                    </Space>
                </div>

                {/* ── Section 1: KPI Cards ── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Total Properties"
                            value={dashboard?.totalProperties || 0}
                            icon={<HomeOutlined />}
                            color="#6366f1"
                            bg="#eef2ff"
                            pctChange={12}
                            prefix=""
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Properties for Sale"
                            value={dashboard?.propertiesForSale || 0}
                            icon={<DollarOutlined />}
                            color="#10b981"
                            bg="#f0fdf4"
                            pctChange={8}
                            prefix=""
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Properties for Lease"
                            value={dashboard?.propertiesForLease || 0}
                            icon={<CalendarOutlined />}
                            color="#3b82f6"
                            bg="#eff6ff"
                            pctChange={5}
                            prefix=""
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Active Transactions"
                            value={(dashboard?.activeLeases || 0) + (dashboard?.pendingSales || 0)}
                            icon={<TrophyOutlined />}
                            color="#f59e0b"
                            bg="#fff7ed"
                            pctChange={-3}
                            prefix=""
                        />
                    </Col>
                </Row>

                {/* ── Section 2: Revenue Trend + Occupancy Pie ── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} lg={16}>
                        <ProCard
                            title={<Text strong>Revenue Overview — Last 6 Months</Text>}
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
                                    <Line type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5} dot={false} name="Sales Revenue" />
                                    <Line type="monotone" dataKey="Expenses" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Rental Income" />
                                    <Line type="monotone" dataKey="Net P/L" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="4 4" name="Total Revenue" />
                                </LineChart>
                            </ResponsiveContainer>
                        </ProCard>
                    </Col>

                    <Col xs={24} lg={8}>
                        <ProCard
                            title={<Text strong>Property Types</Text>}
                            bordered
                            bodyStyle={{ paddingTop: 8 }}
                            size="small"
                        >
                            <ResponsiveContainer width="100%" height={140}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: "For Sale", value: dashboard?.propertiesForSale || 0, color: "#10b981" },
                                            { name: "For Lease", value: dashboard?.propertiesForLease || 0, color: "#3b82f6" },
                                            { name: "Sold", value: dashboard?.soldProperties || 0, color: "#f59e0b" },
                                            { name: "Leased", value: dashboard?.leasedProperties || 0, color: "#ef4444" },
                                        ].filter(item => item.value > 0)}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={58}
                                        innerRadius={30}
                                    >
                                        {[
                                            { name: "For Sale", value: dashboard?.propertiesForSale || 0, color: "#10b981" },
                                            { name: "For Lease", value: dashboard?.propertiesForLease || 0, color: "#3b82f6" },
                                            { name: "Sold", value: dashboard?.soldProperties || 0, color: "#f59e0b" },
                                            { name: "Leased", value: dashboard?.leasedProperties || 0, color: "#ef4444" },
                                        ].filter(item => item.value > 0).map((entry, i) => (
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
                                    { name: "For Sale", value: dashboard?.propertiesForSale || 0, color: "#10b981" },
                                    { name: "For Lease", value: dashboard?.propertiesForLease || 0, color: "#3b82f6" },
                                    { name: "Sold", value: dashboard?.soldProperties || 0, color: "#f59e0b" },
                                    { name: "Leased", value: dashboard?.leasedProperties || 0, color: "#ef4444" },
                                ].filter(item => item.value > 0).map((e, i) => (
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
                                        KES {fmtK(dashboard?.monthlyRentCollected || 0)}
                                    </Text>
                                    <div style={{ marginTop: 6, display: "flex", gap: 16 }}>
                                        <div>
                                            <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Expected</Text>
                                            <Text style={{ fontSize: 12, color: "#1d39c4" }}>
                                                {fmtK(dashboard?.monthlyRentBilled || 0)}
                                            </Text>
                                        </div>
                                        <div>
                                            <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Outstanding</Text>
                                            <Text style={{ fontSize: 12, color: "#ef4444" }}>
                                                {fmtK(dashboard?.rentOutstanding || 0)}
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
                                        KES {fmtK(dashboard?.monthlySalesRevenue || 0)}
                                    </Text>
                                    <div style={{ marginTop: 6, display: "flex", gap: 16 }}>
                                        <div>
                                            <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Pending</Text>
                                            <Text style={{ fontSize: 12, color: "#f59e0b" }}>
                                                {fmtK(dashboard?.pendingSalesRevenue || 0)}
                                            </Text>
                                        </div>
                                        <div>
                                            <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Commission</Text>
                                            <Text style={{ fontSize: 12, color: "#10b981" }}>
                                                {fmtK(dashboard?.monthlyCommission || 0)}
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
                                    {dashboard?.totalProperties || 0} Properties
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
                                    <Text strong style={{ color: "#10b981" }}>{dashboard?.activeLeases || 0}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#eff6ff", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Pending Sales</Text>
                                    <Text strong style={{ color: "#3b82f6" }}>{dashboard?.pendingSales || 0}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#fff7ed", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Completed Sales</Text>
                                    <Text strong style={{ color: "#f59e0b" }}>{dashboard?.completedSales || 0}</Text>
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
                                        {(dashboard?.activeLeases || 0) + (dashboard?.pendingSales || 0) + (dashboard?.completedSales || 0)}
                                    </Text>
                                </div>

                                {/* Transaction status pills */}
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                                    <Tooltip title="Lease renewal rate">
                                        <div style={{ background: "#f0fdf4", borderRadius: 6, padding: "4px 10px", fontSize: 11 }}>
                                            🔄 {dashboard?.renewalRate || 0}% Renewal
                                        </div>
                                    </Tooltip>
                                    <Tooltip title="Sales conversion rate">
                                        <div style={{ background: "#eff6ff", borderRadius: 6, padding: "4px 10px", fontSize: 11 }}>
                                            💰 {dashboard?.salesConversionRate || 0}% Conversion
                                        </div>
                                    </Tooltip>
                                </div>
                            </Space>
                        </ProCard>
                    </Col>
                </Row>

                {/* ── Section 4: Property Performance Metrics ── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} lg={8}>
                        <ProCard title={<Text strong>Lease Activity</Text>} bordered size="small">
                            <Space direction="vertical" size={10} style={{ width: "100%" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f0fdf4", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Active Leases</Text>
                                    <Text strong style={{ color: "#10b981" }}>{dashboard?.activeLeases || 0}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#fff7ed", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Expiring This Month</Text>
                                    <Text strong style={{ color: "#f59e0b" }}>{dashboard?.expiringLeases || 0}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#eff6ff", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>New This Month</Text>
                                    <Text strong style={{ color: "#3b82f6" }}>{dashboard?.newLeases || 0}</Text>
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
                                        Avg Lease Duration
                                    </Text>
                                    <Text strong style={{ fontSize: 16, color: "#0f172a" }}>
                                        {dashboard?.averageLeaseDuration || 0} months
                                    </Text>
                                </div>

                                {/* Lease status pills */}
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                                    <Tooltip title="Renewal rate">
                                        <div style={{ background: "#f0fdf4", borderRadius: 6, padding: "4px 10px", fontSize: 11 }}>
                                            � {dashboard?.renewalRate || 0}% Renewal
                                        </div>
                                    </Tooltip>
                                    <Tooltip title="Vacancy rate">
                                        <div style={{ background: "#fff7ed", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#f59e0b" }}>
                                            🔑 {dashboard?.vacancyRate || 0}% Vacancy
                                        </div>
                                    </Tooltip>
                                </div>
                            </Space>
                        </ProCard>
                    </Col>

                    <Col xs={24} lg={8}>
                        <ProCard title={<Text strong>Tenant Satisfaction</Text>} bordered size="small">
                            <Space direction="vertical" size={12} style={{ width: "100%" }}>
                                {/* Satisfaction Metrics */}
                                <div>
                                    <Text style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>
                                        Satisfaction Scores
                                    </Text>
                                    {[
                                        { metric: "Overall", score: dashboard?.tenantSatisfaction || 0, color: "#10b981" },
                                        { metric: "Maintenance", score: dashboard?.maintenanceSatisfaction || 0, color: "#3b82f6" },
                                        { metric: "Communication", score: dashboard?.communicationSatisfaction || 0, color: "#f59e0b" },
                                    ].map((item) => (
                                        <div key={item.metric} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                            <Space size={6}>
                                                <div
                                                    style={{
                                                        width: 8, height: 8, borderRadius: "50%",
                                                        background: item.color, flexShrink: 0,
                                                    }}
                                                />
                                                <Text style={{ fontSize: 12 }}>{item.metric}</Text>
                                            </Space>
                                            <Space>
                                                <Text strong style={{ fontSize: 12, color: item.color }}>
                                                    {item.score}/5.0
                                                </Text>
                                            </Space>
                                        </div>
                                    ))}
                                    <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 6, paddingTop: 6 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <Text style={{ fontSize: 11, color: "#64748b" }}>Response Rate</Text>
                                            <Text strong style={{ color: "#0f172a", fontSize: 12 }}>
                                                {dashboard?.surveyResponseRate || 0}%
                                            </Text>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent complaints alert */}
                                {(dashboard?.recentComplaints || 0) > 0 && (
                                    <Alert
                                        type="warning"
                                        showIcon
                                        icon={<WarningOutlined />}
                                        message={`${dashboard?.recentComplaints || 0} complaint${(dashboard?.recentComplaints || 0) > 1 ? "s" : ""} this week`}
                                        style={{ padding: "4px 10px", fontSize: 12 }}
                                    />
                                )}
                            </Space>
                        </ProCard>
                    </Col>

                    <Col xs={24} lg={8}>
                        <ProCard
                            title={<Text strong>Property Insights</Text>}
                            bordered
                            size="small"
                        >
                            <Space direction="vertical" size={10} style={{ width: "100%" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f0fdf4", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Avg Rent/sq ft</Text>
                                    <Text strong style={{ color: "#10b981" }}>KES {dashboard?.avgRentPerSqft || 0}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#eff6ff", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Time to Lease</Text>
                                    <Text strong style={{ color: "#3b82f6" }}>
                                        {dashboard?.timeToLease || 0} days
                                    </Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#fff7ed", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>Turnover Rate</Text>
                                    <Text strong style={{ color: "#f59e0b" }}>
                                        {dashboard?.turnoverRate || 0}%
                                    </Text>
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
                                        Net Operating Income
                                    </Text>
                                    <Text strong style={{ fontSize: 16, color: "#0f172a" }}>
                                        KES {fmtK(dashboard?.netOperatingIncome || 0)}
                                    </Text>
                                </div>
                            </Space>
                        </ProCard>
                    </Col>
                </Row>

                {/* ── Section 5: Recent Activities ── */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
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
                                        dataIndex: ["property", "name"],
                                        width: 120,
                                        render: (v: string, record: any) => (
                                            <Space direction="vertical" size={0}>
                                                <Text style={{ fontSize: 12, fontWeight: 600 }}>{v}</Text>
                                                {record.property?.type && (
                                                    <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record.property.type}</Text>
                                                )}
                                            </Space>
                                        ),
                                    },
                                    {
                                        title: "Client",
                                        dataIndex: ["client", "name"],
                                        width: 100,
                                        render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
                                    },
                                    {
                                        title: "Date",
                                        dataIndex: "createdAt",
                                        width: 80,
                                        render: (date: string) => (
                                            <Text style={{ fontSize: 11, color: "#64748b" }}>
                                                {dayjs(date).format("DD MMM")}
                                            </Text>
                                        ),
                                    },
                                    {
                                        title: "Amount",
                                        dataIndex: "sale_price",
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

                    <Col xs={24} lg={12}>
                        <ProCard
                            title={<Text strong>Upcoming Rent Payments</Text>}
                            bordered
                            size="small"
                            bodyStyle={{ padding: 0 }}
                        >
                            <Table
                                rowKey="_id"
                                dataSource={upcomingRentPayments}
                                columns={[
                                    {
                                        title: "Unit",
                                        dataIndex: ["unit", "name"],
                                        width: 80,
                                        render: (v: string, record: any) => (
                                            <Space direction="vertical" size={0}>
                                                <Text style={{ fontSize: 12, fontWeight: 600 }}>{v}</Text>
                                                {record.unit?.type && (
                                                    <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record.unit.type}</Text>
                                                )}
                                            </Space>
                                        ),
                                    },
                                    {
                                        title: "Tenant",
                                        dataIndex: ["tenant", "name"],
                                        width: 100,
                                        render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
                                    },
                                    {
                                        title: "Amount",
                                        dataIndex: "amount",
                                        align: "right" as const,
                                        width: 100,
                                        render: (v: number) => (
                                            <Text strong style={{ fontSize: 12, color: "#1d39c4" }}>
                                                {fmtK(v)}
                                            </Text>
                                        ),
                                    },
                                    {
                                        title: "Due",
                                        dataIndex: "due_date",
                                        width: 70,
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
                                                    background: status === 'overdue' ? "#fef2f2" : status === 'pending' ? "#fff7ed" : "#f0fdf4",
                                                    color: status === 'overdue' ? "#ef4444" : status === 'pending' ? "#f59e0b" : "#10b981",
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
                                locale={{ emptyText: "No upcoming payments" }}
                            />
                        </ProCard>
                    </Col>
                </Row>

            </div>
        </App>
    );
};

export default DalaDashboard;
