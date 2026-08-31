import React, { useState } from "react";
import {
    Avatar,
    Badge,
    Button,
    Card,
    Select,
    Space,
    Table,
    Tabs,
    Typography,
} from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchAgents,
    setAgentAvailability,
    updateAgentRole,
} from "@services/whatsappService";
import { fetchAllUsersByShopId } from "@services/users";
import AgentStats from "./AgentStats";

const { Text } = Typography;

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

    const columns = [
        {
            title: "Agent",
            dataIndex: "fullname",
            render: (_: any, record: Agent) => (
                <Space>
                    <Avatar
                        size="small"
                        src={record.thumbnail}
                        icon={<UserOutlined />}
                    />
                    <Text>{record.fullname}</Text>
                </Space>
            ),
        },
        {
            title: "Status",
            dataIndex: "agent_status",
            render: (status: string, record: Agent) => (
                <Select
                    value={status}
                    style={{ width: 120 }}
                    size="small"
                    onChange={(value) =>
                        statusMutation.mutate({
                            agentId: record._id,
                            status: value as "online" | "offline" | "busy",
                        })
                    }
                    loading={statusMutation.isPending}
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
        },
        {
            title: "Actions",
            render: (_: any, record: Agent) => (
                <Button
                    size="small"
                    danger
                    loading={roleMutation.isPending}
                    onClick={() =>
                        roleMutation.mutate({ userId: record._id, is_agent: false })
                    }
                >
                    Deactivate
                </Button>
            ),
        },
    ];

    const agentsContent = (
        <div style={{ paddingTop: 24 }}>
            <Card
                title="Assign a user as support agent"
                size="small"
                style={{ marginBottom: 24 }}
            >
                <Space>
                    <Select
                        showSearch
                        placeholder="Select a user…"
                        value={selectedUserId || undefined}
                        onChange={(value) => setSelectedUserId(value)}
                        style={{ minWidth: 240 }}
                        loading={usersLoading}
                        disabled={nonAgents.length === 0}
                        options={nonAgents.map((u) => ({
                            value: u._id,
                            label: u.fullname,
                        }))}
                    />
                    <Button
                        type="primary"
                        disabled={!selectedUserId}
                        loading={roleMutation.isPending}
                        onClick={() =>
                            selectedUserId &&
                            roleMutation.mutate({ userId: selectedUserId, is_agent: true })
                        }
                    >
                        Make Agent
                    </Button>
                </Space>
            </Card>

            <Table
                columns={columns as any}
                dataSource={agents}
                rowKey="_id"
                loading={agentsLoading}
                pagination={false}
                size="small"
                locale={{ emptyText: "No agents assigned yet" }}
            />
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
