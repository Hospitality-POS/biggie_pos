import React, { useState } from "react";
import {
    Avatar,
    Badge,
    Card,
    Col,
    Grid,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Typography,
} from "antd";
import { UserOutlined } from "@ant-design/icons";
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
        <div style={{ paddingTop: 24 }}>
            <Row justify="space-between" align="middle" gutter={[12, 12]} style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={5} style={{ margin: 0 }}>
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

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Card size="small">
                        <Statistic
                            title="Total conversations"
                            value={analytics?.totalConversations || 0}
                            loading={loading}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Card size="small">
                        <Statistic
                            title="Resolved / closed"
                            value={analytics?.resolvedOrClosed || 0}
                            loading={loading}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Card size="small">
                        <Statistic
                            title="Upsell messages"
                            value={analytics?.upsellMessages || 0}
                            loading={loading}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Card size="small">
                        <Statistic
                            title="Conversion rate"
                            value={`${Math.round((analytics?.conversionRate || 0) * 100)}%`}
                            loading={loading}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Card size="small">
                        <Statistic
                            title="Resolution rate"
                            value={`${resolutionRate}%`}
                            loading={loading}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Card size="small">
                        <Statistic
                            title="Avg first response"
                            value={fmtMinutes(analytics?.averageFirstResponseMinutes)}
                            loading={loading}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Card size="small">
                        <Statistic
                            title="Median first response"
                            value={fmtMinutes(analytics?.medianFirstResponseMinutes)}
                            loading={loading}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Card size="small">
                        <Statistic
                            title="Avg msg / conv"
                            value={analytics?.averageMessagesPerConversation || 0}
                            loading={loading}
                        />
                    </Card>
                </Col>
            </Row>

            <Table
                columns={columns as any}
                dataSource={perAgentStats}
                rowKey="user_id"
                loading={loading}
                pagination={false}
                size="small"
                scroll={isMobile ? { x: 900 } : { x: 1000 }}
                title={() => "Agent performance"}
                locale={{ emptyText: "No agent activity for this period" }}
            />
        </div>
    );
};

export default AgentStats;
