import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Row, Col, Select, Spin, Typography, Grid, Space, Empty, Button } from "antd";
import {
    MessageOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    SendOutlined,
    ThunderboltOutlined,
    BarChartOutlined,
    PieChartOutlined,
    FundOutlined,
    ApiOutlined,
    TeamOutlined,
    ReloadOutlined,
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
import { fetchCampaignAnalytics, MessagingChannel } from "@services/omnichannel/messagingCampaigns";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text, Title } = Typography;
const { Option } = Select;
const C = THEME_C;

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#0d9488"];
const STATUS_COLORS: Record<string, string> = {
    draft: "#94a3b8",
    scheduled: "#3b82f6",
    sending: "#f59e0b",
    completed: "#10b981",
    failed: "#ef4444",
    cancelled: "#64748b",
};

interface Props {
    shopId: string;
    channel: MessagingChannel;
}

const MessagingAnalytics: React.FC<Props> = ({ shopId, channel }) => {
    const [days, setDays] = useState(30);
    const isMobile = !Grid.useBreakpoint().md;
    const isSms = channel === "sms";

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["messaging-analytics", shopId, channel, days],
        queryFn: () => fetchCampaignAnalytics({ shop_id: shopId, channel, days }),
        enabled: !!shopId,
        staleTime: 30_000,
    });

    const stats = data;

    const chartCardStyle: React.CSSProperties = {
        borderRadius: 12,
        border: `1px solid ${C.border}`,
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

    const chartH = isMobile ? 220 : 260;
    const axisTick = { fontSize: 10, fill: "#64748b" };
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />;
    const tooltipStyle = { borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 };

    return (
        <div>
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
                            background: C.primaryLight,
                            borderRadius: 10,
                            padding: "6px 8px",
                            color: C.primary,
                            fontSize: 18,
                            display: "flex",
                        }}
                    >
                        <BarChartOutlined />
                    </div>
                    <div>
                        <Title level={5} style={{ margin: 0, color: C.darkText, fontWeight: 600 }}>
                            {isSms ? "SMS" : "Email"} Analysis
                        </Title>
                        <Text style={{ fontSize: 12, color: C.subText }}>
                            Delivery performance for {isSms ? "SMS" : "email"} campaigns &amp; quick sends
                        </Text>
                    </div>
                </Space>
                <Space>
                    <Select value={days} onChange={setDays} size="small" style={{ width: 130 }}>
                        <Option value={7}>Last 7 days</Option>
                        <Option value={30}>Last 30 days</Option>
                        <Option value={90}>Last 90 days</Option>
                    </Select>
                    <Button size="small" icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()} />
                </Space>
            </div>

            {isLoading ? (
                <div style={{ textAlign: "center", padding: 60 }}>
                    <Spin size="large" />
                </div>
            ) : !stats || stats.totals.campaigns + stats.totals.quick_sends === 0 ? (
                <Empty
                    description={`No ${isSms ? "SMS" : "email"} activity in the last ${days} days`}
                    style={{ padding: "48px 0" }}
                />
            ) : (
                <>
                    <Row gutter={isMobile ? [8, 8] : [12, 12]}>
                        {[
                            { title: "Bulk Campaigns", value: stats.totals.campaigns, icon: <SendOutlined />, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
                            { title: "Quick Sends", value: stats.totals.quick_sends, icon: <ThunderboltOutlined />, color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
                            { title: "Total Recipients", value: stats.totals.total_recipients, icon: <TeamOutlined />, color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" },
                            { title: "Sent", value: stats.totals.sent_count, icon: <CheckCircleOutlined />, color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
                            { title: "Failed", value: stats.totals.failed_count, icon: <CloseCircleOutlined />, color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
                            { title: "Success Rate", value: `${stats.totals.success_rate}%`, icon: <FundOutlined />, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
                        ].map((k, i) => (
                            <Col xs={12} sm={8} lg={4} key={i}>
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
                                <PieChartOutlined />, "#10b981", "#f0fdf4", "Campaigns by Status",
                                <ResponsiveContainer width="100%" height={chartH}>
                                    <PieChart>
                                        <Pie
                                            data={stats.status_breakdown.map((s) => ({ name: s.status, value: s.count }))}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={isMobile ? 34 : 45}
                                            outerRadius={isMobile ? 62 : 80}
                                            paddingAngle={3}
                                        >
                                            {stats.status_breakdown.map((s, i) => (
                                                <Cell key={i} fill={STATUS_COLORS[s.status] || COLORS[i % COLORS.length]} />
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
                                <MessageOutlined />, "#3b82f6", "#eff6ff", isSms ? "SMS Sent per Day" : "Emails Sent per Day",
                                <ResponsiveContainer width="100%" height={chartH}>
                                    <BarChart
                                        data={stats.daily_trend}
                                        margin={{ top: 10, right: 16, left: isMobile ? -18 : -8, bottom: 0 }}
                                    >
                                        {grid}
                                        <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                                        <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                        <Bar dataKey="sent" stackId="a" fill="#10b981" name="Sent" />
                                        <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Col>

                        <Col xs={24} lg={12}>
                            {chartCard(
                                <FundOutlined />, "#6366f1", "#eef2ff", "Delivery Trend",
                                <ResponsiveContainer width="100%" height={chartH}>
                                    <LineChart
                                        data={stats.daily_trend}
                                        margin={{ top: 10, right: 16, left: isMobile ? -18 : -8, bottom: 0 }}
                                    >
                                        {grid}
                                        <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                                        <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                        <Line type="monotone" dataKey="sent" stroke="#10b981" strokeWidth={2} dot={false} name="Sent" />
                                        <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={false} name="Failed" />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </Col>

                        <Col xs={24} lg={12}>
                            {chartCard(
                                <ApiOutlined />, "#f97316", "#fff7ed", "Performance by Provider",
                                stats.by_provider.length ? (
                                    <ResponsiveContainer width="100%" height={chartH}>
                                        <BarChart
                                            data={stats.by_provider}
                                            layout="vertical"
                                            margin={{ top: 10, right: 16, left: isMobile ? 8 : 24, bottom: 0 }}
                                        >
                                            {grid}
                                            <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <YAxis type="category" dataKey="provider" width={isMobile ? 80 : 110} tick={axisTick} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={tooltipStyle} />
                                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                            <Bar dataKey="sent" stackId="a" fill="#10b981" name="Sent" barSize={isMobile ? 14 : 20} />
                                            <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" radius={[0, 6, 6, 0]} barSize={isMobile ? 14 : 20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <Empty description="No provider data" style={{ padding: "48px 0" }} />
                                )
                            )}
                        </Col>
                    </Row>
                </>
            )}
        </div>
    );
};

export default MessagingAnalytics;
