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
import { UserOutlined, UserAddOutlined, TeamOutlined, WifiOutlined, ClockCircleOutlined, MessageOutlined } from "@ant-design/icons";
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

    const cardChrome: React.CSSProperties = {
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    };

    const agentsContent = (
        <div style={{ paddingTop: isMobile ? 10 : 14 }}>
            <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
                {[
                    { title: "Total agents", value: stats.total, icon: <TeamOutlined />, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
                    { title: "Online now", value: stats.online, icon: <WifiOutlined />, color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
                    { title: "Busy", value: stats.busy, icon: <ClockCircleOutlined />, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
                    { title: "Open conversations", value: stats.openConversations, icon: <MessageOutlined />, color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
                ].map((k) => (
                    <Col xs={12} sm={6} key={k.title}>
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
                                <Text style={{ fontSize: isMobile ? 11 : 12, color: "#475569", fontWeight: 500 }}>
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
                                {agentsLoading ? "…" : k.value}
                            </div>
                        </div>
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
        <div style={{ padding: isMobile ? "0 12px 12px" : "0 24px 24px", height: "100%", overflowY: "auto" }}>
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
