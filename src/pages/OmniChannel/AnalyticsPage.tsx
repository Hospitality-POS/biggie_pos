import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Row, Col, Statistic, Select, Spin, Typography } from "antd";
import {
    MessageOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    ShoppingCartOutlined,
    RiseOutlined,
    UserOutlined,
    TeamOutlined,
    FieldTimeOutlined,
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

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface Props {
    shopId: string;
}

const COLORS = ["#1890ff", "#52c41a", "#faad14", "#ff4d4f", "#722ed1", "#13c2c2"];

const AnalyticsPage: React.FC<Props> = ({ shopId }) => {
    const [days, setDays] = useState(30);

    const { data, isLoading } = useQuery({
        queryKey: ["omnichannel-analytics", shopId, days],
        queryFn: () =>
            fetchAnalytics({ shop_id: shopId, days }) as Promise<AnalyticsData>,
        enabled: !!shopId,
    });

    const stats = data;

    const formatMinutes = (val?: number) =>
        val === undefined || val === null ? "--" : `${val} min`;

    return (
        <div style={{ padding: 24, height: "100%", overflowY: "auto" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 24,
                }}
            >
                <Title level={4} style={{ margin: 0 }}>
                    Omnichannel Analytics
                </Title>
                <Select value={days} onChange={setDays} style={{ width: 140 }}>
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
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Card>
                                <Statistic
                                    title="Conversations"
                                    value={stats.totalConversations}
                                    prefix={<MessageOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Card>
                                <Statistic
                                    title="Messages"
                                    value={stats.totalMessages}
                                    prefix={<MessageOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Card>
                                <Statistic
                                    title="Resolution Rate"
                                    value={stats.resolutionRate || 0}
                                    suffix="%"
                                    prefix={<CheckCircleOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Card>
                                <Statistic
                                    title="Avg First Response"
                                    value={formatMinutes(stats.averageFirstResponseMinutes)}
                                    prefix={<ClockCircleOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Card>
                                <Statistic
                                    title="Median First Response"
                                    value={formatMinutes(stats.medianFirstResponseMinutes)}
                                    prefix={<FieldTimeOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Card>
                                <Statistic
                                    title="Upsell Messages"
                                    value={stats.upsellMessages}
                                    prefix={<RiseOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Card>
                                <Statistic
                                    title="Customer Conversion Rate"
                                    value={stats.conversionRate || 0}
                                    suffix="%"
                                    prefix={<ShoppingCartOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Card>
                                <Statistic
                                    title="Avg Msgs / Conversation"
                                    value={stats.averageMessagesPerConversation}
                                    prefix={<MessageOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Card>
                                <Statistic
                                    title="Active Agents"
                                    value={stats.totalAgents}
                                    prefix={<TeamOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Card>
                                <Statistic
                                    title="Customers"
                                    value={stats.totalCustomers}
                                    prefix={<UserOutlined />}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                        <Col xs={24} lg={12}>
                            <Card title="Conversations by Status">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={Object.entries(stats.statusBreakdown).map(
                                                ([name, value]) => ({ name, value })
                                            )}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            label
                                        >
                                            {Object.entries(stats.statusBreakdown).map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="First Response Time">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart
                                        data={[
                                            {
                                                name: "< 15 min",
                                                count: stats.responseTimeBuckets.under15,
                                            },
                                            {
                                                name: "15-60 min",
                                                count: stats.responseTimeBuckets.under60,
                                            },
                                            {
                                                name: "1-24 h",
                                                count: stats.responseTimeBuckets.under24h,
                                            },
                                            {
                                                name: "> 24 h",
                                                count: stats.responseTimeBuckets.over24h,
                                            },
                                        ]}
                                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#1890ff" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="Messages per Day">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart
                                        data={stats.messagesByDay}
                                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="inbound" stackId="a" fill="#52c41a" />
                                        <Bar dataKey="outbound" stackId="a" fill="#1890ff" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="Conversations per Day">
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart
                                        data={stats.conversationsByDay}
                                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="conversations"
                                            stroke="#722ed1"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Card title="Top Agents">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart
                                        data={stats.topAgents}
                                        layout="vertical"
                                        margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis type="category" dataKey="name" width={100} />
                                        <Tooltip />
                                        <Bar dataKey="messages" fill="#13c2c2" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>
                    </Row>

                    <Card title="AI Insights" style={{ marginTop: 24 }}>
                        <Paragraph
                            style={{
                                whiteSpace: "pre-wrap",
                                fontSize: 14,
                                lineHeight: 1.6,
                            }}
                        >
                            {stats.insights || "No insights available."}
                        </Paragraph>
                    </Card>
                </>
            ) : (
                <Card>
                    <Paragraph type="secondary">No analytics data available.</Paragraph>
                </Card>
            )}
        </div>
    );
};

export default AnalyticsPage;
