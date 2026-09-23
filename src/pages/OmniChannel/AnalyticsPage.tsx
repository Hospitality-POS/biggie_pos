import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Row, Col, Select, Spin, Typography, Grid, Space } from "antd";
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
} from "@ant-design/icons";
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

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface Props {
    shopId: string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#0d9488"];

const AnalyticsPage: React.FC<Props> = ({ shopId }) => {
    const [days, setDays] = useState(30);
    const isMobile = !Grid.useBreakpoint().md;

    const { data, isLoading } = useQuery({
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
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: isMobile ? 12 : 16,
                }}
            >
                <Space align="center" size={10}>
                    <div
                        style={{
                            background: "#eff6ff",
                            borderRadius: 10,
                            padding: "6px 8px",
                            color: "#3b82f6",
                            fontSize: 18,
                            display: "flex",
                        }}
                    >
                        <BarChartOutlined />
                    </div>
                    <div>
                        <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>
                            Analytics
                        </Title>
                        <Text style={{ fontSize: 12, color: "#64748b" }}>
                            Omnichannel performance overview
                        </Text>
                    </div>
                </Space>
                <Select value={days} onChange={setDays} size="small" style={{ width: 130 }}>
                    <Option value={7}>Last 7 days</Option>
                    <Option value={30}>Last 30 days</Option>
                    <Option value={90}>Last 90 days</Option>
                </Select>
            </div>

            {isLoading ? (
                <div style={{ textAlign: "center", padding: 80 }}>
                    <Spin size="large" />
                </div>
            ) : stats ? (
                <>
                    <Row gutter={isMobile ? [8, 8] : [12, 12]}>
                        {[
                            { title: "Conversations", value: stats.totalConversations, icon: <MessageOutlined />, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
                            { title: "Messages", value: stats.totalMessages, icon: <MessageOutlined />, color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" },
                            { title: "Resolution Rate", value: `${stats.resolutionRate || 0}%`, icon: <CheckCircleOutlined />, color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
                            { title: "Avg First Response", value: formatMinutes(stats.averageFirstResponseMinutes), icon: <ClockCircleOutlined />, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
                            { title: "Median First Response", value: formatMinutes(stats.medianFirstResponseMinutes), icon: <FieldTimeOutlined />, color: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
                            { title: "Upsell Messages", value: stats.upsellMessages, icon: <RiseOutlined />, color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
                            { title: "Customer Conversion", value: `${stats.conversionRate || 0}%`, icon: <ShoppingCartOutlined />, color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
                            { title: "Avg Msgs / Conv.", value: stats.averageMessagesPerConversation, icon: <MessageOutlined />, color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
                            { title: "Active Agents", value: stats.totalAgents, icon: <TeamOutlined />, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
                            { title: "Customers", value: stats.totalCustomers, icon: <UserOutlined />, color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" },
                            { title: "Pending Dispatch", value: stats.pendingDispatch || 0, icon: <RocketOutlined />, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
                            { title: "Avg Dispatch Wait", value: formatMinutes(stats.avgDispatchWaitMinutes), icon: <HourglassOutlined />, color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
                        ].map((k, i) => (
                            <Col xs={12} sm={8} lg={6} key={i}>
                                <div
                                    style={{
                                        background: k.bg,
                                        border: `1px solid ${k.border}`,
                                        borderRadius: isMobile ? 10 : 12,
                                        padding: isMobile ? "10px 12px" : "14px 16px",
                                        height: "100%",
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                                        <Text
                                            style={{
                                                fontSize: isMobile ? 11 : 12,
                                                color: "#475569",
                                                fontWeight: 500,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {k.title}
                                        </Text>
                                        <div
                                            style={{
                                                background: "#fff",
                                                borderRadius: 7,
                                                padding: "3px 6px",
                                                color: k.color,
                                                fontSize: 13,
                                                lineHeight: 1,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {k.icon}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: isMobile ? 17 : 22,
                                            fontWeight: 700,
                                            color: "#0f172a",
                                            marginTop: 2,
                                            lineHeight: 1.2,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        {k.value}
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>

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

                    <Card
                        size="small"
                        style={{ ...chartCardStyle, marginTop: isMobile ? 10 : 14 }}
                        title={chartTitle(<ThunderboltOutlined />, "#6366f1", "#eef2ff", "AI Insights")}
                    >
                        <Paragraph
                            style={{
                                whiteSpace: "pre-wrap",
                                fontSize: 13,
                                lineHeight: 1.7,
                                color: "#475569",
                                marginBottom: 0,
                            }}
                        >
                            {stats.insights || "No insights available."}
                        </Paragraph>
                    </Card>
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
        </div>
    );
};

export default AnalyticsPage;
