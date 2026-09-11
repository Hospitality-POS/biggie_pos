import React, { useMemo, useState } from "react";
import {
    Avatar,
    Badge,
    Button,
    Card,
    Col,
    Popconfirm,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Tabs,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import { UserOutlined, UserAddOutlined, TeamOutlined } from "@ant-design/icons";
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

    const agentsContent = (
        <div style={{ paddingTop: 24 }}>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title="Total agents"
                            value={stats.total}
                            loading={agentsLoading}
                            prefix={<TeamOutlined style={{ fontSize: 16, color: "#8c8c8c" }} />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title="Online now"
                            value={stats.online}
                            loading={agentsLoading}
                            valueStyle={{ color: "#52c41a" }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title="Busy"
                            value={stats.busy}
                            loading={agentsLoading}
                            valueStyle={{ color: "#faad14" }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title="Open conversations"
                            value={stats.openConversations}
                            loading={agentsLoading}
                        />
                    </Card>
                </Col>
            </Row>

            <Card size="small" style={{ marginBottom: 24 }}>
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <div>
                        <Title level={5} style={{ margin: 0 }}>
                            Add an agent
                        </Title>
                        <Text type="secondary">
                            Assign a team member to handle omnichannel conversations
                        </Text>
                    </div>
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

            <Card size="small" styles={{ body: { padding: 0 } }}>
                <Table
                    columns={columns as any}
                    dataSource={agents}
                    rowKey="_id"
                    loading={agentsLoading}
                    pagination={false}
                    size="middle"
                    locale={{ emptyText: "No agents assigned yet" }}
                />
            </Card>
        </div>
    );

    return (
        <div style={{ padding: "0 24px 24px", height: "100%", overflowY: "auto" }}>
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
