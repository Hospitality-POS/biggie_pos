import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Row, Col, Select, Spin, Typography, Grid, Space, Segmented } from "antd";
import {
    MessageOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    ShoppingCartOutlined,
    RiseOutlined,
    UserOutlined,
    TeamOutlined,
    FieldTimeOutlined,
    RocketOutlined,
    HourglassOutlined,
    BarChartOutlined,
    PieChartOutlined,
    ThunderboltOutlined,
    InboxOutlined,
    ShopOutlined,
} from "@ant-design/icons";
import { KpiTile, PageHeader, TONES, useMarketplace } from "./shared/ui";
import MarketplaceAnalytics from "./MarketplaceAnalytics";
import InsightsDrawer from "./InsightsDrawer";
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    LineChart,
    Line,
} from "recharts";
import { fetchAnalytics, type AnalyticsData } from "@services/whatsappService";

const { Text } = Typography;
const { Option } = Select;

interface Props {
    shopId: string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#0d9488"];

const AnalyticsPage: React.FC<Props> = ({ shopId }) => {
    const [days, setDays] = useState(30);
    const isMobile = !Grid.useBreakpoint().md;
    const { enabled: marketplaceOn, shopName } = useMarketplace(shopId);
    // AI Insights stay out of the way until asked for — opened as a drawer.
    const [insightsOpen, setInsightsOpen] = useState(false);
    const [view, setView] = useState<"inbox" | "marketplace">("inbox");
    const activeView = marketplaceOn ? view : "inbox";

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["omnichannel-analytics", shopId, days],
        queryFn: () =>
            fetchAnalytics({ shop_id: shopId, days }) as Promise<AnalyticsData>,
        enabled: !!shopId,
    });

    const stats = data;

    const formatMinutes = (val?: number | null) => {
        if (val === undefined || val === null) return "--";
        if (val <= 0) return "0 min";
        if (val < 1) return `${Math.round(val * 60)}s`;
        if (val < 60) return `${Number.isInteger(val) ? val : val.toFixed(1)} min`;
        const h = Math.floor(val / 60);
        const m = Math.round(val % 60);
        return m ? `${h}h ${m}m` : `${h}h`;
    };

    const chartCardStyle: React.CSSProperties = {
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        height: "100%",
    };

    const chartTitle = (icon: React.ReactNode, color: string, bg: string, label: string) => (
        <Space size={6}>
            <div
                style={{
                    background: bg,
                    borderRadius: 7,
                    padding: "3px 6px",
                    color,
                    display: "inline-flex",
                    fontSize: 12,
                }}
            >
                {icon}
            </div>
            <Text strong style={{ fontSize: 13 }}>{label}</Text>
        </Space>
    );

    const chartCard = (
        icon: React.ReactNode,
        color: string,
        bg: string,
        label: string,
        chart: React.ReactNode
    ) => (
        <Card
            size="small"
            style={chartCardStyle}
            styles={{ body: { padding: isMobile ? "8px 4px" : "12px 8px" } }}
            title={chartTitle(icon, color, bg, label)}
        >
            {chart}
        </Card>
    );

    const chartH = isMobile ? 220 : 280;
    const axisTick = { fontSize: 10, fill: "#64748b" };
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />;
    const tooltipStyle = { borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 };

    return (
        <div style={{ padding: isMobile ? 12 : 20, height: "100%", overflowY: "auto" }}>
            <PageHeader
                icon={<BarChartOutlined />}
                {...TONES.blue}
                title="Analytics"
                marketplace={marketplaceOn}
                subtitle={
                    activeView === "marketplace"
                        ? "Sales, gift cards and bookings closed in WhatsApp"
                        : "Conversations, response times and team performance"
                }
                extra={
                    <>
                        <Button
                            size="small"
                            icon={<ThunderboltOutlined />}
                            onClick={() => setInsightsOpen(true)}
                            style={{
                                borderRadius: 14,
                                fontWeight: 600,
                                color: "#4f46e5",
                                background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(236,72,153,0.12) 100%)",
                                border: "1px solid rgba(99,102,241,0.35)",
                            }}
                        >
                            AI Insights
                        </Button>
                        {marketplaceOn && (
                            <Segmented
                                size="small"
                                value={activeView}
                                onChange={(v) => setView(v as "inbox" | "marketplace")}
                                options={[
                                    { value: "inbox", icon: <InboxOutlined />, label: "Inbox" },
                                    { value: "marketplace", icon: <ShopOutlined />, label: "Marketplace" },
                                ]}
                            />
                        )}
                        <Select value={days} onChange={setDays} size="small" style={{ width: 130 }}>
                            <Option value={7}>Last 7 days</Option>
                            <Option value={30}>Last 30 days</Option>
                            <Option value={90}>Last 90 days</Option>
                        </Select>
                    </>
                }
            />

            {activeView === "marketplace" ? (
                <MarketplaceAnalytics shopId={shopId} days={days} />
            ) : isLoading ? (
                <div style={{ textAlign: "center", padding: 80 }}>
                    <Spin size="large" />
                </div>
            ) : stats ? (
                <>
                    {[
                        {
                            label: "Conversations",
                            tiles: [
                                { title: "Conversations", value: stats.totalConversations, icon: <MessageOutlined />, ...TONES.blue },
                                { title: "Messages", value: stats.totalMessages, icon: <MessageOutlined />, ...TONES.teal },
                                { title: "Avg msgs / conversation", value: stats.averageMessagesPerConversation, icon: <MessageOutlined />, ...TONES.indigo },
                                { title: "Customers", value: stats.totalCustomers, icon: <UserOutlined />, ...TONES.teal },
                            ],
                        },
                        {
                            label: "Service quality",
                            tiles: [
                                { title: "Resolution rate", value: `${stats.resolutionRate || 0}%`, icon: <CheckCircleOutlined />, ...TONES.green },
                                { title: "Avg first response", value: formatMinutes(stats.averageFirstResponseMinutes), icon: <ClockCircleOutlined />, ...TONES.amber },
                                { title: "Median first response", value: formatMinutes(stats.medianFirstResponseMinutes), icon: <FieldTimeOutlined />, ...TONES.orange },
                                { title: "Active agents", value: stats.totalAgents, icon: <TeamOutlined />, ...TONES.blue },
                            ],
                        },
                        {
                            label: "Sales & dispatch",
                            tiles: [
                                { title: "Customer conversion", value: `${stats.conversionRate || 0}%`, icon: <ShoppingCartOutlined />, ...TONES.green },
                                { title: "Upsell messages", value: stats.upsellMessages, icon: <RiseOutlined />, ...TONES.violet },
                                { title: "Pending dispatch", value: stats.pendingDispatch || 0, icon: <RocketOutlined />, ...TONES.amber },
                                { title: "Avg dispatch wait", value: formatMinutes(stats.avgDispatchWaitMinutes), icon: <HourglassOutlined />, ...TONES.violet },
                            ],
                        },
                    ].map((group) => (
                        <div key={group.label} style={{ marginBottom: isMobile ? 8 : 12 }}>
                            <Text
                                type="secondary"
                                style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", display: "block", marginBottom: 6 }}
                            >
                                {group.label}
                            </Text>
                            <Row gutter={isMobile ? [8, 8] : [12, 12]}>
                                {group.tiles.map((k) => (
                                    <Col xs={12} sm={12} lg={6} key={k.title}>
                                        <KpiTile {...k} />
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    ))}

                    <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginTop: isMobile ? 10 : 14 }}>
                        <Col xs={24} lg={12}>
                            {chartCard(
                                <PieChartOutlined />, "#10b981", "#f0fdf4", "Conversations by Status",
                                <ResponsiveContainer width="100%" height={chartH}>
                                    <PieChart>
                                        <Pie
                                            data={Object.entries(stats.statusBreakdown).map(
                                                ([name, value]) => ({ name, value })
                                            )}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={isMobile ? 34 : 45}
                                            outerRadius={isMobile ? 62 : 80}
                                            paddingAngle={3}
                                        >
                                            {Object.entries(stats.statusBreakdown).map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </Col>

                        <Col xs={24} lg={12}>
                            {chartCard(
                                <ClockCircleOutlined />, "#f59e0b", "#fffbeb", "First Response Time",
                                <ResponsiveContainer width="100%" height={chartH}>
                                    <BarChart
                                        data={[
                                            { name: "< 15 min", count: stats.responseTimeBuckets.under15 },
                                            { name: "15-60 min", count: stats.responseTimeBuckets.under60 },
                                            { name: "1-24 h", count: stats.responseTimeBuckets.under24h },
                                            { name: "> 24 h", count: stats.responseTimeBuckets.over24h },
                                        ]}
                                        margin={{ top: 10, right: 16, left: isMobile ? -18 : -8, bottom: 0 }}
                                    >
                                        {grid}
                                        <XAxis dataKey="name" tick={axisTick} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} interval={0} />
                                        <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={isMobile ? 26 : 40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Col>

                        <Col xs={24} lg={12}>
                            {chartCard(
                                <MessageOutlined />, "#3b82f6", "#eff6ff", "Messages per Day",
                                <ResponsiveContainer width="100%" height={chartH}>
                                    <BarChart
                                        data={stats.messagesByDay}
                                        margin={{ top: 10, right: 16, left: isMobile ? -18 : -8, bottom: 0 }}
                                    >
                                        {grid}
                                        <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                                        <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                        <Bar dataKey="inbound" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="outbound" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Col>

                        <Col xs={24} lg={12}>
                            {chartCard(
                                <BarChartOutlined />, "#6366f1", "#eef2ff", "Conversations per Day",
                                <ResponsiveContainer width="100%" height={chartH}>
                                    <LineChart
                                        data={stats.conversationsByDay}
                                        margin={{ top: 10, right: 16, left: isMobile ? -18 : -8, bottom: 0 }}
                                    >
                                        {grid}
                                        <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                                        <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Line type="monotone" dataKey="conversations" stroke="#6366f1" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </Col>

                        <Col xs={24} lg={12}>
                            {chartCard(
                                <TeamOutlined />, "#0d9488", "#f0fdfa", "Top Agents",
                                <ResponsiveContainer width="100%" height={chartH}>
                                    <BarChart
                                        data={stats.topAgents}
                                        layout="vertical"
                                        margin={{ top: 10, right: 16, left: isMobile ? 8 : 24, bottom: 0 }}
                                    >
                                        {grid}
                                        <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="name" width={isMobile ? 70 : 100} tick={axisTick} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Bar dataKey="messages" fill="#0d9488" radius={[0, 6, 6, 0]} barSize={isMobile ? 14 : 20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Col>

                        <Col xs={24} lg={12}>
                            {chartCard(
                                <RocketOutlined />, "#f97316", "#fff7ed", "Dispatches per Day",
                                <ResponsiveContainer width="100%" height={chartH}>
                                    <LineChart
                                        data={stats.dispatchesByDay || []}
                                        margin={{ top: 10, right: 16, left: isMobile ? -18 : -8, bottom: 0 }}
                                    >
                                        {grid}
                                        <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                                        <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Line type="monotone" dataKey="dispatches" stroke="#f97316" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </Col>

                        <Col xs={24} lg={12}>
                            {chartCard(
                                <HourglassOutlined />, "#8b5cf6", "#f5f3ff", "Pending Dispatch by Agent",
                                <ResponsiveContainer width="100%" height={chartH}>
                                    <BarChart
                                        data={stats.dispatchByAgent || []}
                                        layout="vertical"
                                        margin={{ top: 10, right: 16, left: isMobile ? 8 : 24, bottom: 0 }}
                                    >
                                        {grid}
                                        <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="name" width={isMobile ? 70 : 100} tick={axisTick} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Bar dataKey="conversations" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={isMobile ? 14 : 20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Col>
                    </Row>
                </>
            ) : (
                <div
                    style={{
                        padding: "48px 24px",
                        textAlign: "center",
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                    }}
                >
                    <Text style={{ color: "#64748b" }}>No analytics data available.</Text>
                </div>
            )}

            <InsightsDrawer
                open={insightsOpen}
                onClose={() => setInsightsOpen(false)}
                shopId={shopId}
                shopName={shopName}
                days={days}
                stats={stats}
                loading={isLoading}
                refreshing={isFetching && !isLoading}
                onRefresh={() => refetch()}
                marketplaceOn={marketplaceOn}
            />
        </div>
    );
};

export default AnalyticsPage;
