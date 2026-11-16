import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Col, Empty, Grid, Progress, Row, Space, Spin, Typography } from "antd";
import {
    CalendarOutlined,
    CarOutlined,
    DollarOutlined,
    GiftOutlined,
    RiseOutlined,
    RobotOutlined,
    ShopOutlined,
    ShoppingCartOutlined,
    SyncOutlined,
} from "@ant-design/icons";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { fetchMarketplaceStats } from "@services/omnichannel/marketplace";
import { formatCurrency } from "@utils/formatters";
import { cardChrome, KpiTile, TONES } from "./shared/ui";

const { Text } = Typography;

interface Props {
    shopId: string;
    days: number;
}

const FULFIL_COLORS: Record<string, string> = {
    Collect: "#10b981",
    Delivery: "#f97316",
    "Gift cards / services": "#8b5cf6",
};

/**
 * WhatsApp Marketplace performance — sales closed in chat, how they were
 * fulfilled, gift cards, bookings and how much the assistant closed alone.
 */
const MarketplaceAnalytics: React.FC<Props> = ({ shopId, days }) => {
    const isMobile = !Grid.useBreakpoint().md;
    const { data: s, isLoading } = useQuery({
        queryKey: ["marketplace-stats", shopId, days],
        queryFn: () => fetchMarketplaceStats(shopId, days),
        enabled: !!shopId,
        staleTime: 30_000,
    });

    if (isLoading) {
        return (
            <div style={{ textAlign: "center", padding: 80 }}>
                <Spin size="large" />
            </div>
        );
    }
    if (!s) {
        return <Empty description="Marketplace stats are unavailable right now" style={{ padding: 48 }} />;
    }

    const chartH = isMobile ? 220 : 260;
    const axisTick = { fontSize: 10, fill: "#64748b" };
    const tooltipStyle = { borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 };
    const assistantShare = s.orders ? Math.round((s.assistant.orders / s.orders) * 100) : 0;
    const fulfilData = [
        { name: "Collect", value: s.fulfilment.collect },
        { name: "Delivery", value: s.fulfilment.delivery },
        { name: "Gift cards / services", value: s.fulfilment.none },
    ].filter((d) => d.value > 0);

    const title = (icon: React.ReactNode, color: string, label: string) => (
        <Space size={6}>
            <span style={{ color }}>{icon}</span>
            <Text strong style={{ fontSize: 13 }}>{label}</Text>
        </Space>
    );

    return (
        <>
            <Row gutter={isMobile ? [8, 8] : [12, 12]}>
                {[
                    { title: "Chat sales", value: formatCurrency(s.revenue), icon: <DollarOutlined />, ...TONES.green },
                    { title: "Orders", value: s.orders, icon: <ShoppingCartOutlined />, ...TONES.blue },
                    { title: "Avg order value", value: formatCurrency(s.average_order_value), icon: <RiseOutlined />, ...TONES.indigo },
                    {
                        title: "Chat conversion",
                        value: `${s.chat_conversion_rate}%`,
                        icon: <SyncOutlined />,
                        hint: "Orders per new WhatsApp conversation in this period",
                        ...TONES.teal,
                    },
                    {
                        title: "Gift cards sold",
                        value: s.gift_cards.count ? `${s.gift_cards.count} · ${formatCurrency(s.gift_cards.value)}` : 0,
                        icon: <GiftOutlined />,
                        ...TONES.pink,
                    },
                    { title: "Bookings in chat", value: s.bookings, icon: <CalendarOutlined />, ...TONES.violet },
                    {
                        title: "In checkout now",
                        value: s.active_flows.checkouts + s.active_flows.bookings,
                        icon: <ShopOutlined />,
                        hint: `${s.active_flows.checkouts} placing an order · ${s.active_flows.bookings} booking — open the chat to follow or take over`,
                        ...TONES.amber,
                    },
                    {
                        title: "Closed by assistant",
                        value: `${assistantShare}%`,
                        icon: <RobotOutlined />,
                        hint: `${s.assistant.orders} orders (${formatCurrency(s.assistant.revenue)}) completed with no agent involved`,
                        ...TONES.orange,
                    },
                ].map((k) => (
                    <Col xs={12} sm={8} lg={6} key={k.title}>
                        <KpiTile {...k} />
                    </Col>
                ))}
            </Row>

            <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginTop: isMobile ? 10 : 14 }}>
                <Col xs={24} lg={16}>
                    <Card size="small" style={{ ...cardChrome, height: "100%" }} title={title(<DollarOutlined />, "#10b981", "Chat sales per day")}>
                        {s.orders === 0 ? (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="No chat orders yet — customers can text MENU or ORDER to start"
                            />
                        ) : (
                            <ResponsiveContainer width="100%" height={chartH}>
                                <AreaChart data={s.by_day} margin={{ top: 10, right: 16, left: isMobile ? -10 : 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="mktRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} minTickGap={16} />
                                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(v: any, name: any) => (name === "revenue" ? [formatCurrency(Number(v)), "Sales"] : [v, "Orders"])}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#mktRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card size="small" style={{ ...cardChrome, height: "100%" }} title={title(<CarOutlined />, "#f97316", "Collect vs delivery")}>
                        {fulfilData.length === 0 ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No orders yet" />
                        ) : (
                            <ResponsiveContainer width="100%" height={chartH}>
                                <PieChart>
                                    <Pie
                                        data={fulfilData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={isMobile ? 34 : 45}
                                        outerRadius={isMobile ? 62 : 78}
                                        paddingAngle={3}
                                    >
                                        {fulfilData.map((d) => (
                                            <Cell key={d.name} fill={FULFIL_COLORS[d.name]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={14}>
                    <Card size="small" style={{ ...cardChrome, height: "100%" }} title={title(<ShoppingCartOutlined />, "#3b82f6", "Top items sold in chat")}>
                        {s.top_items.length === 0 ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing sold in chat yet" />
                        ) : (
                            <ResponsiveContainer width="100%" height={Math.max(160, s.top_items.length * 34)}>
                                <BarChart data={s.top_items} layout="vertical" margin={{ top: 4, right: 24, left: isMobile ? 8 : 24, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="name" width={isMobile ? 80 : 120} tick={axisTick} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(v: any, name: any) => (name === "revenue" ? [formatCurrency(Number(v)), "Sales"] : [v, "Qty"])}
                                    />
                                    <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={isMobile ? 14 : 18} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={10}>
                    <Card size="small" style={{ ...cardChrome, height: "100%" }} title={title(<RobotOutlined />, "#f97316", "Who closed the sale")}>
                        <Space direction="vertical" size={14} style={{ width: "100%" }}>
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <Text style={{ fontSize: 12 }}>🤖 Assistant on its own</Text>
                                    <Text strong style={{ fontSize: 12 }}>
                                        {s.assistant.orders} · {formatCurrency(s.assistant.revenue)}
                                    </Text>
                                </div>
                                <Progress percent={assistantShare} showInfo={false} strokeColor="#f97316" size="small" />
                            </div>
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <Text style={{ fontSize: 12 }}>💬 Agent offers in chat</Text>
                                    <Text strong style={{ fontSize: 12 }}>
                                        {s.orders - s.assistant.orders} · {formatCurrency(s.revenue - s.assistant.revenue)}
                                    </Text>
                                </div>
                                <Progress percent={s.orders ? 100 - assistantShare : 0} showInfo={false} strokeColor="#3b82f6" size="small" />
                            </div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Per-agent chat sales are in the <b>Agents</b> tab. Each order counts for the shop whose
                                WhatsApp took it, even when it's collected at another shop.
                            </Text>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </>
    );
};

export default MarketplaceAnalytics;
