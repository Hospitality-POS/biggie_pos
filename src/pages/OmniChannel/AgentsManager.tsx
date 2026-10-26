import React, { useMemo, useState } from "react";
import {
    Avatar,
    Badge,
    Button,
    Card,
    Col,
    Grid,
    Popconfirm,
    Row,
    Select,
    Space,
    Table,
    Tabs,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import {
    UserOutlined,
    UserAddOutlined,
    TeamOutlined,
    WifiOutlined,
    ClockCircleOutlined,
    MessageOutlined,
    RobotOutlined,
    ShoppingCartOutlined,
} from "@ant-design/icons";
import { fetchMarketplaceStats } from "@services/omnichannel/marketplace";
import { formatCurrency } from "@utils/formatters";
import { cardChrome, KpiTile, PageHeader, TONES, useMarketplace } from "./shared/ui";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchAgents,
    setAgentAvailability,
    updateAgentRole,
} from "@services/whatsappService";
import { fetchAllUsersByShopId } from "@services/users";
import AgentStats from "./AgentStats";

const { Title, Text } = Typography;

interface User {
    _id: string;
    fullname: string;
    thumbnail?: string;
    is_agent?: boolean;
}

interface Agent {
    _id: string;
    fullname: string;
    thumbnail?: string;
    agent_status: "online" | "offline" | "busy";
    open_conversations: number;
}

interface Props {
    shopId: string;
}

const AgentsManager: React.FC<Props> = ({ shopId }) => {
    const queryClient = useQueryClient();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [activeSubTab, setActiveSubTab] = useState("agents");

    const { data: agentsData, isLoading: agentsLoading } = useQuery({
        queryKey: ["omnichannel-agents", shopId],
        queryFn: () => fetchAgents({ shop_id: shopId }),
        enabled: !!shopId,
        staleTime: 10_000,
        refetchInterval: 10_000,
    });

    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ["users-shop", shopId],
        queryFn: () => fetchAllUsersByShopId(),
        enabled: !!shopId,
    });

    const agents = (agentsData?.agents || []) as Agent[];
    const users = (usersData?.users || []) as User[];

    // Chat sales per agent (last 30 days) when the marketplace is on.
    const { enabled: marketplaceOn } = useMarketplace(shopId);
    const { data: mktStats } = useQuery({
        queryKey: ["marketplace-stats", shopId, 30],
        queryFn: () => fetchMarketplaceStats(shopId, 30),
        enabled: !!shopId && marketplaceOn,
        staleTime: 60_000,
    });
    const salesByAgent = useMemo(
        () => new Map((mktStats?.by_agent || []).map((a) => [a.agent_id, a])),
        [mktStats]
    );

    const statusMutation = useMutation({
        mutationFn: ({
            agentId,
            status,
        }: {
            agentId: string;
            status: "online" | "offline" | "busy";
        }) => setAgentAvailability(agentId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["omnichannel-agents"] });
        },
    });

    const roleMutation = useMutation({
        mutationFn: ({
            userId,
            is_agent,
        }: {
            userId: string;
            is_agent: boolean;
        }) => updateAgentRole(userId, is_agent),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["omnichannel-agents"] });
            queryClient.invalidateQueries({ queryKey: ["users-shop"] });
            setSelectedUserId(null);
        },
    });

    const nonAgents = users.filter((u) => !u.is_agent);

    const stats = useMemo(
        () => ({
            total: agents.length,
            online: agents.filter((a) => a.agent_status === "online").length,
            busy: agents.filter((a) => a.agent_status === "busy").length,
            openConversations: agents.reduce((sum, a) => sum + (a.open_conversations || 0), 0),
        }),
        [agents]
    );

    const columns = [
        {
            title: "Agent",
            dataIndex: "fullname",
            render: (_: any, record: Agent) => (
                <Space size={12}>
                    <Badge
                        dot
                        status={
                            record.agent_status === "online"
                                ? "success"
                                : record.agent_status === "busy"
                                  ? "warning"
                                  : "default"
                        }
                        offset={[-4, 32]}
                    >
                        <Avatar
                            size={40}
                            src={record.thumbnail}
                            icon={<UserOutlined />}
                        />
                    </Badge>
                    <Text strong>{record.fullname}</Text>
                </Space>
            ),
        },
        {
            title: "Status",
            dataIndex: "agent_status",
            width: 160,
            render: (status: string, record: Agent) => (
                <Select
                    value={status}
                    style={{ width: 130 }}
                    size="small"
                    onChange={(value) =>
                        statusMutation.mutate({
                            agentId: record._id,
                            status: value as "online" | "offline" | "busy",
                        })
                    }
                    loading={statusMutation.isLoading}
                >
                    <Select.Option value="online">
                        <Badge status="success" text="Online" />
                    </Select.Option>
                    <Select.Option value="busy">
                        <Badge status="warning" text="Busy" />
                    </Select.Option>
                    <Select.Option value="offline">
                        <Badge status="default" text="Offline" />
                    </Select.Option>
                </Select>
            ),
        },
        {
            title: "Open Conversations",
            dataIndex: "open_conversations",
            align: "center" as const,
            width: 160,
            render: (count: number) =>
                count > 0 ? (
                    <Tag color="blue">{count}</Tag>
                ) : (
                    <Text type="secondary">0</Text>
                ),
        },
        ...(marketplaceOn
            ? [
                  {
                      title: (
                          <Tooltip title="Orders placed from offers this agent sent in chat — last 30 days">
                              <span>Chat sales (30d)</span>
                          </Tooltip>
                      ),
                      key: "chat_sales",
                      width: 170,
                      render: (_: any, record: Agent) => {
                          const s = salesByAgent.get(record._id);
                          return s ? (
                              <div>
                                  <Text strong style={{ fontSize: 13 }}>{formatCurrency(s.revenue)}</Text>
                                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                                      {s.orders} order{s.orders === 1 ? "" : "s"}
                                  </Text>
                              </div>
                          ) : (
                              <Text type="secondary">—</Text>
                          );
                      },
                  },
              ]
            : []),
        {
            title: "",
            width: 120,
            align: "right" as const,
            render: (_: any, record: Agent) => (
                <Popconfirm
                    title="Remove agent?"
                    description={`${record.fullname} will no longer receive conversations.`}
                    okText="Remove"
                    okButtonProps={{ danger: true }}
                    onConfirm={() =>
                        roleMutation.mutate({ userId: record._id, is_agent: false })
                    }
                >
                    <Tooltip title="Remove from agents">
                        <Button size="small" danger loading={roleMutation.isLoading}>
                            Remove
                        </Button>
                    </Tooltip>
                </Popconfirm>
            ),
        },
    ];

    const kpis = [
        { title: "Total agents", value: stats.total, icon: <TeamOutlined />, ...TONES.blue },
        { title: "Online now", value: stats.online, icon: <WifiOutlined />, ...TONES.green },
        { title: "Busy", value: stats.busy, icon: <ClockCircleOutlined />, ...TONES.amber },
        { title: "Open conversations", value: stats.openConversations, icon: <MessageOutlined />, ...TONES.indigo },
        ...(marketplaceOn
            ? [
                  {
                      title: "Chat sales by agents",
                      value: mktStats ? formatCurrency(mktStats.revenue - mktStats.assistant.revenue) : "—",
                      icon: <ShoppingCartOutlined />,
                      hint: "Last 30 days, from offers agents sent in chat",
                      ...TONES.teal,
                  },
                  {
                      title: "Closed by assistant",
                      value: mktStats ? `${mktStats.assistant.orders} · ${formatCurrency(mktStats.assistant.revenue)}` : "—",
                      icon: <RobotOutlined />,
                      hint: "Last 30 days — orders customers completed with the WhatsApp assistant alone",
                      ...TONES.orange,
                  },
              ]
            : []),
    ];

    const agentsContent = (
        <div style={{ paddingTop: isMobile ? 10 : 14 }}>
            <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
                {kpis.map((k) => (
                    <Col xs={12} sm={marketplaceOn ? 8 : 6} lg={marketplaceOn ? 4 : 6} key={k.title}>
                        <KpiTile {...k} loading={agentsLoading} />
                    </Col>
                ))}
            </Row>

            <Card size="small" style={{ ...cardChrome, marginBottom: isMobile ? 12 : 16 }}>
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <Space align="center" size={10}>
                        <div
                            style={{
                                background: "#eff6ff",
                                borderRadius: 8,
                                padding: "4px 7px",
                                color: "#3b82f6",
                                fontSize: 14,
                                display: "flex",
                            }}
                        >
                            <UserAddOutlined />
                        </div>
                        <div>
                            <Title level={5} style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>
                                Add an agent
                            </Title>
                            <Text style={{ fontSize: 12, color: "#64748b" }}>
                                Assign a team member to handle omnichannel conversations
                            </Text>
                        </div>
                    </Space>
                    <Space wrap>
                        <Select
                            showSearch
                            placeholder="Select a user…"
                            value={selectedUserId || undefined}
                            onChange={(value) => setSelectedUserId(value)}
                            style={{ minWidth: 260 }}
                            loading={usersLoading}
                            disabled={nonAgents.length === 0}
                            options={nonAgents.map((u) => ({
                                value: u._id,
                                label: u.fullname,
                            }))}
                            notFoundContent={
                                usersLoading ? "Loading…" : "All users are already agents"
                            }
                        />
                        <Button
                            type="primary"
                            icon={<UserAddOutlined />}
                            disabled={!selectedUserId}
                            loading={roleMutation.isLoading}
                            onClick={() =>
                                selectedUserId &&
                                roleMutation.mutate({ userId: selectedUserId, is_agent: true })
                            }
                        >
                            Make Agent
                        </Button>
                    </Space>
                </Space>
            </Card>

            <Card size="small" styles={{ body: { padding: 0 } }} style={{ ...cardChrome, overflow: "hidden" }}>
                <Table
                    columns={columns as any}
                    dataSource={agents}
                    rowKey="_id"
                    loading={agentsLoading}
                    pagination={false}
                    size="middle"
                    scroll={isMobile ? { x: 560 } : undefined}
                    locale={{ emptyText: "No agents assigned yet" }}
                />
            </Card>
        </div>
    );

    return (
        <div style={{ padding: isMobile ? 12 : 20, height: "100%", overflowY: "auto" }}>
            <PageHeader
                icon={<TeamOutlined />}
                {...TONES.blue}
                title="Agents"
                marketplace={marketplaceOn}
                subtitle={
                    marketplaceOn
                        ? "Who handles conversations — and how much they sell in chat"
                        : "Who handles conversations, their availability and performance"
                }
            />
            <Tabs
                activeKey={activeSubTab}
                onChange={setActiveSubTab}
                items={[
                    {
                        key: "agents",
                        label: "Agents",
                        children: agentsContent,
                    },
                    {
                        key: "performance",
                        label: "Performance",
                        children: <AgentStats shopId={shopId} />,
                    },
                ]}
            />
        </div>
    );
};

export default AgentsManager;
