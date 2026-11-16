import React, { useState } from "react";
import {
    Avatar,
    Badge,
    Col,
    Grid,
    Row,
    Select,
    Space,
    Table,
    Typography,
} from "antd";
import {
    UserOutlined,
    MessageOutlined,
    CheckCircleOutlined,
    RiseOutlined,
    ShoppingCartOutlined,
    ThunderboltOutlined,
    ClockCircleOutlined,
    FieldTimeOutlined,
    TeamOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
    fetchAgents,
    fetchAnalytics,
} from "@services/whatsappService";

const { Title, Text } = Typography;

interface Props {
    shopId: string;
}

const DAYS_OPTIONS = [
    { value: 7, label: "Last 7 days" },
    { value: 30, label: "Last 30 days" },
    { value: 90, label: "Last 90 days" },
];

const AgentStats: React.FC<Props> = ({ shopId }) => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const [days, setDays] = useState(30);

    const { data: analytics, isLoading: analyticsLoading } = useQuery({
        queryKey: ["omnichannel-analytics", shopId, days],
        queryFn: () => fetchAnalytics({ shop_id: shopId, days }),
        enabled: !!shopId,
        staleTime: 60_000,
    });

    const { data: agentsData, isLoading: agentsLoading } = useQuery({
        queryKey: ["omnichannel-agents", shopId],
        queryFn: () => fetchAgents({ shop_id: shopId }),
        enabled: !!shopId,
        staleTime: 10_000,
    });

    const perAgentStats = analytics?.perAgentStats || [];
    const agents = (agentsData?.agents || []) as any[];
    const openConversationsMap = new Map(
        agents.map((a) => [a._id, a.open_conversations])
    );

    const loading = analyticsLoading || agentsLoading;

    const resolutionRate =
        (analytics?.totalConversations || 0) > 0
            ? Math.round(
                  ((analytics?.resolvedOrClosed || 0) / analytics!.totalConversations) * 100
              )
            : 0;

    const fmtMinutes = (mins: number | null | undefined) => {
        if (mins === null || mins === undefined) return "—";
        if (mins <= 0) return "0 min";
        if (mins < 1) return `${Math.round(mins * 60)}s`;
        if (mins < 60) return `${Number.isInteger(mins) ? mins : mins.toFixed(1)} min`;
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        return m ? `${h}h ${m}m` : `${h}h`;
    };

    const columns = [
        {
            title: "Agent",
            dataIndex: "name",
            render: (name: string, record: any) => (
                <Space>
                    <Avatar src={record.thumbnail} icon={<UserOutlined />} size="small" />
                    <Text>{name}</Text>
                </Space>
            ),
        },
        {
            title: "Status",
            dataIndex: "user_id",
            render: (userId: string) => {
                const agent = agents.find((a) => a._id === userId);
                const status = agent?.agent_status || "offline";
                const statusMap: Record<string, "success" | "warning" | "default"> = {
                    online: "success",
                    busy: "warning",
                    offline: "default",
                };
                return (
                    <Badge
                        status={statusMap[status] || "default"}
                        text={status.charAt(0).toUpperCase() + status.slice(1)}
                    />
                );
            },
        },
        {
            title: "Convos",
            dataIndex: "conversations",
            sorter: (a: any, b: any) => a.conversations - b.conversations,
        },
        {
            title: "Messages sent",
            dataIndex: "messages",
            sorter: (a: any, b: any) => a.messages - b.messages,
        },
        {
            title: "Upsell msgs",
            dataIndex: "upsellMessages",
            sorter: (a: any, b: any) => a.upsellMessages - b.upsellMessages,
        },
        {
            title: "Conversion",
            dataIndex: "conversionRate",
            sorter: (a: any, b: any) => a.conversionRate - b.conversionRate,
            render: (v: number) => `${v ?? 0}%`,
        },
        {
            title: "Resolution",
            dataIndex: "resolutionRate",
            sorter: (a: any, b: any) => a.resolutionRate - b.resolutionRate,
            render: (v: number) => `${v ?? 0}%`,
        },
        {
            title: "Avg 1st response",
            dataIndex: "avgFirstResponseMinutes",
            sorter: (a: any, b: any) =>
                (a.avgFirstResponseMinutes ?? Infinity) - (b.avgFirstResponseMinutes ?? Infinity),
            render: (v: number | null) => fmtMinutes(v),
        },
        {
            title: "Median 1st response",
            dataIndex: "medianFirstResponseMinutes",
            sorter: (a: any, b: any) =>
                (a.medianFirstResponseMinutes ?? Infinity) - (b.medianFirstResponseMinutes ?? Infinity),
            render: (v: number | null) => fmtMinutes(v),
        },
        {
            title: "Open",
            dataIndex: "user_id",
            sorter: (a: any, b: any) =>
                (openConversationsMap.get(a.user_id) || 0) -
                (openConversationsMap.get(b.user_id) || 0),
            render: (userId: string) => openConversationsMap.get(userId) || 0,
        },
    ];

    return (
        <div style={{ paddingTop: isMobile ? 10 : 14 }}>
            <Row justify="space-between" align="middle" gutter={[12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
                <Col>
                    <Title level={5} style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>
                        Agent performance
                    </Title>
                </Col>
                <Col>
                    <Select
                        value={days}
                        onChange={(value) => setDays(value)}
                        options={DAYS_OPTIONS}
                        style={{ width: 140 }}
                        size="small"
                    />
                </Col>
            </Row>

            <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
                {[
                    { title: "Total conversations", value: analytics?.totalConversations || 0, icon: <MessageOutlined />, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
                    { title: "Resolved / closed", value: analytics?.resolvedOrClosed || 0, icon: <CheckCircleOutlined />, color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
                    { title: "Upsell messages", value: analytics?.upsellMessages || 0, icon: <RiseOutlined />, color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
                    { title: "Conversion rate", value: `${Math.round((analytics?.conversionRate || 0) * 100)}%`, icon: <ShoppingCartOutlined />, color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" },
                    { title: "Resolution rate", value: `${resolutionRate}%`, icon: <ThunderboltOutlined />, color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
                    { title: "Avg first response", value: fmtMinutes(analytics?.averageFirstResponseMinutes), icon: <ClockCircleOutlined />, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
                    { title: "Median first response", value: fmtMinutes(analytics?.medianFirstResponseMinutes), icon: <FieldTimeOutlined />, color: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
                    { title: "Avg msg / conv", value: analytics?.averageMessagesPerConversation || 0, icon: <TeamOutlined />, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
                ].map((k) => (
                    <Col xs={12} sm={8} lg={6} key={k.title}>
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
                                    fontSize: isMobile ? 16 : 20,
                                    fontWeight: 700,
                                    color: "#0f172a",
                                    marginTop: 2,
                                    lineHeight: 1.2,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {loading ? "…" : k.value}
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>

            <div
                style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
            >
                <Table
                    columns={columns as any}
                    dataSource={perAgentStats}
                    rowKey="user_id"
                    loading={loading}
                    pagination={false}
                    size="small"
                    scroll={isMobile ? { x: 900 } : { x: 1000 }}
                    locale={{ emptyText: "No agent activity for this period" }}
                />
            </div>
        </div>
    );
};

export default AgentStats;
