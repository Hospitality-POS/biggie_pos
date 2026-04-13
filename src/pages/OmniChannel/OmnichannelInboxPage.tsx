import React, { useState, useCallback, useMemo } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
    Button,
    Space,
    Typography,
    Badge,
    Row,
    Col,
    App,
    Statistic,
    Tooltip,
    Alert,
    Segmented,
    Spin,
    Empty,
} from "antd";
import {
    PlusOutlined,
    MessageOutlined,
    ReloadOutlined,
    SettingOutlined,
    WifiOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchConversations,
    fetchWhatsappChannels,
} from "@services/whatsappService";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import ConversationList from "./ConversationList";
import MessageThread from "./MessageThread";
import ConnectChannelDrawer from "./ConnectChannelDrawer";

const { Text, Title } = Typography;

export type Channel = "all" | "whatsapp" | "messenger" | "instagram";
export type ConversationStatus = "open" | "pending" | "resolved" | "closed";

export interface Conversation {
    _id: string;
    channel: "whatsapp" | "messenger" | "instagram";
    external_contact_name: string;
    external_contact_phone?: string;
    external_contact_id: string;
    customer_id?: string;
    status: ConversationStatus;
    last_message_at: string;
    last_message_preview?: string;
    unread_count: number;
    phone_number_id?: string;
    assigned_to?: { _id: string; fullname: string; thumbnail?: string };
    is_window_open?: boolean;
}

export const getShopId = (): string => {
    try {
        const shopId = localStorage.getItem("shopId");
        return shopId && shopId !== "{}" && shopId !== "null" ? shopId : "";
    } catch {
        return "";
    }
};

export const CHANNEL_CONFIG: Record<
    string,
    { label: string; color: string; icon: string; bg: string }
> = {
    whatsapp: { label: "WhatsApp", color: "#25D366", bg: "#f0fdf4", icon: "💬" },
    messenger: { label: "Messenger", color: "#0084FF", bg: "#eff6ff", icon: "💙" },
    instagram: { label: "Instagram", color: "#E1306C", bg: "#fff0f5", icon: "📸" },
};

export const STATUS_CONFIG: Record<
    ConversationStatus,
    { label: string; badge: "success" | "processing" | "warning" | "error" | "default"; color: string }
> = {
    open: { label: "Open", badge: "success", color: "#52c41a" },
    pending: { label: "Pending", badge: "warning", color: "#faad14" },
    resolved: { label: "Resolved", badge: "default", color: "#8c8c8c" },
    closed: { label: "Closed", badge: "error", color: "#ff4d4f" },
};

const OmnichannelInboxPage: React.FC = () => {
    const shopId = getShopId();
    const primaryColor = usePrimaryColor();
    const queryClient = useQueryClient();

    const [activeChannel, setActiveChannel] = useState<Channel>("all");
    const [activeStatus, setActiveStatus] = useState<ConversationStatus | "all">("all");
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [connectDrawerOpen, setConnectDrawerOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const {
        data: channelsData,
        isLoading: channelsLoading,
    } = useQuery({
        queryKey: ["omnichannel-channels", shopId],
        queryFn: () => fetchWhatsappChannels({ shop_id: shopId }),
        enabled: !!shopId,
        staleTime: 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
    });

    const channels = channelsData?.channels || [];

    const connected = {
        whatsapp: channels.some((c: any) => c.channel === "whatsapp" && c.is_active),
        messenger: channels.some((c: any) => c.channel === "messenger" && c.is_active),
        instagram: channels.some((c: any) => c.channel === "instagram" && c.is_active),
    };
    const anyConnected = connected.whatsapp || connected.messenger || connected.instagram;

    const {
        data: conversationsData,
        isLoading: conversationsLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: [
            "omnichannel-conversations",
            shopId,
            activeChannel,
            activeStatus,
            page,
            search,
        ],
        queryFn: () =>
            fetchConversations({
                shop_id: shopId,
                channel: activeChannel === "all" ? undefined : activeChannel,
                status: activeStatus === "all" ? undefined : activeStatus,
                page,
                limit: 30,
                search: search || undefined,
            }),
        enabled: !!shopId && anyConnected,
        staleTime: 5_000,
        retry: 1,
        refetchInterval: anyConnected ? 5_000 : false,
        refetchOnWindowFocus: true,
    });

    const conversations = conversationsData?.conversations || [];
    const totalCount = conversationsData?.total || 0;

    // Calculate status counts from conversations array
    const statusCounts = useMemo(() => {
        const counts = {
            open: 0,
            pending: 0,
            resolved: 0,
            closed: 0,
            resolved_today: conversationsData?.status_counts?.resolved_today || 0
        };

        conversations.forEach(conv => {
            if (conv.status === "open") counts.open++;
            else if (conv.status === "pending") counts.pending++;
            else if (conv.status === "resolved") counts.resolved++;
            else if (conv.status === "closed") counts.closed++;
        });

        return counts;
    }, [conversations, conversationsData]);

    // Calculate channel counts from conversations array
    const channelCounts = useMemo(() => {
        const counts = {
            whatsapp: 0,
            messenger: 0,
            instagram: 0
        };

        conversations.forEach(conv => {
            if (conv.channel === "whatsapp") counts.whatsapp++;
            else if (conv.channel === "messenger") counts.messenger++;
            else if (conv.channel === "instagram") counts.instagram++;
        });

        return counts;
    }, [conversations]);

    const handleConversationSelect = useCallback((conv: Conversation) => {
        setSelectedConversation(conv);
    }, []);

    const handleMessageSent = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["omnichannel-conversations"] });
        queryClient.invalidateQueries({ queryKey: ["messages"] });
    }, [queryClient]);

    const handleConversationUpdate = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["omnichannel-conversations"] });
        if (selectedConversation) {
            queryClient.invalidateQueries({ queryKey: ["messages", selectedConversation._id] });
        }
    }, [queryClient, selectedConversation]);

    const handleConnectSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["omnichannel-channels"] });
        setConnectDrawerOpen(false);
    }, [queryClient]);

    if (!shopId) {
        return (
            <App>
                <Alert
                    type="warning"
                    showIcon
                    message="Shop not found"
                    description="Could not determine your shop ID. Please log out and log back in."
                />
            </App>
        );
    }

    const channelOptions = [
        {
            label: (
                <Space size={4}>
                    <span>All</span>
                    {totalCount > 0 && (
                        <Badge count={totalCount} size="small" style={{ fontSize: 10 }} />
                    )}
                </Space>
            ),
            value: "all",
        },
        ...["whatsapp", "messenger", "instagram"].map((ch) => ({
            label: (
                <Space size={4}>
                    <span style={{ color: CHANNEL_CONFIG[ch].color }}>
                        {CHANNEL_CONFIG[ch].icon}
                    </span>
                    <span>{CHANNEL_CONFIG[ch].label}</span>
                    {(channelCounts[ch] || 0) > 0 && (
                        <Badge
                            count={channelCounts[ch]}
                            size="small"
                            style={{ fontSize: 10, backgroundColor: CHANNEL_CONFIG[ch].color }}
                        />
                    )}
                    {!connected[ch as keyof typeof connected] && (
                        <Badge status="default" />
                    )}
                </Space>
            ),
            value: ch,
        })),
    ];

    return (
        <App>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Open Conversations"
                            value={statusCounts.open}
                            prefix={<MessageOutlined />}
                            valueStyle={{ color: primaryColor, fontSize: 22 }}
                            loading={conversationsLoading}
                        />
                    </ProCard>
                </Col>
                <Col xs={12} sm={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Pending"
                            value={statusCounts.pending}
                            valueStyle={{
                                color: statusCounts.pending > 0 ? "#faad14" : "#8c8c8c",
                                fontSize: 22,
                            }}
                            loading={conversationsLoading}
                        />
                    </ProCard>
                </Col>
                <Col xs={12} sm={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Connected Channels"
                            value={channelsLoading ? "-" : Object.values(connected).filter(Boolean).length}
                            suffix="/ 3"
                            valueStyle={{ color: primaryColor, fontSize: 22 }}
                            loading={channelsLoading}
                        />
                    </ProCard>
                </Col>
                <Col xs={12} sm={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Resolved Today"
                            value={statusCounts.resolved_today}
                            valueStyle={{ color: "#52c41a", fontSize: 22 }}
                            loading={conversationsLoading}
                        />
                    </ProCard>
                </Col>
            </Row>

            {!channelsLoading && !anyConnected && (
                <Alert
                    type="info"
                    showIcon
                    icon={<WifiOutlined />}
                    style={{ marginBottom: 16 }}
                    message="No channels connected yet"
                    description="Connect WhatsApp, Messenger, or Instagram to start receiving messages in your inbox."
                    action={
                        <Button
                            size="small"
                            type="primary"
                            onClick={() => setConnectDrawerOpen(true)}
                        >
                            Connect Now
                        </Button>
                    }
                />
            )}

            <ProCard
                bordered
                bodyStyle={{ padding: 0 }}
                title={
                    <Space wrap>
                        <MessageOutlined style={{ fontSize: 18, color: primaryColor }} />
                        <Title level={4} style={{ margin: 0 }}>
                            Inbox
                        </Title>
                        <Segmented
                            options={channelOptions}
                            value={activeChannel}
                            onChange={(v) => {
                                setActiveChannel(v as Channel);
                                setPage(1);
                                setSelectedConversation(null);
                            }}
                            style={{ marginLeft: 8 }}
                        />
                        {isFetching && !conversationsLoading && (
                            <Spin size="small" />
                        )}
                    </Space>
                }
                extra={
                    <Space>
                        <Tooltip title="Refresh">
                            <Button
                                icon={<ReloadOutlined />}
                                size="small"
                                loading={isFetching}
                                onClick={() => refetch()}
                            />
                        </Tooltip>
                        <Tooltip title="Channel Settings">
                            <Button
                                icon={<SettingOutlined />}
                                size="small"
                                onClick={() => setConnectDrawerOpen(true)}
                            />
                        </Tooltip>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setConnectDrawerOpen(true)}
                            style={{ background: primaryColor, borderColor: primaryColor }}
                        >
                            Connect Channel
                        </Button>
                    </Space>
                }
            >
                <div style={{ display: "flex", height: "calc(100vh - 280px)", minHeight: 500 }}>
                    <div
                        style={{
                            width: 340,
                            borderRight: "1px solid #f0f0f0",
                            flexShrink: 0,
                            overflowY: "auto",
                        }}
                    >
                        {!anyConnected && !channelsLoading ? (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Connect a channel to see conversations"
                                style={{ marginTop: 60 }}
                            />
                        ) : (
                            <ConversationList
                                conversations={conversations}
                                loading={conversationsLoading}
                                selectedId={selectedConversation?._id || null}
                                activeStatus={activeStatus}
                                total={totalCount}
                                page={page}
                                pageSize={30}
                                search={search}
                                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                                onStatusChange={(s) => { setActiveStatus(s); setPage(1); }}
                                onPageChange={setPage}
                                onSelect={handleConversationSelect}
                                statusCounts={statusCounts}
                                primaryColor={primaryColor}
                            />
                        )}
                    </div>

                    <div style={{ flex: 1, overflow: "hidden" }}>
                        {selectedConversation ? (
                            <MessageThread
                                conversation={selectedConversation}
                                shopId={shopId}
                                onMessageSent={handleMessageSent}
                                onConversationUpdate={handleConversationUpdate}
                                primaryColor={primaryColor}
                            />
                        ) : (
                            <div
                                style={{
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#bfbfbf",
                                    gap: 12,
                                }}
                            >
                                <MessageOutlined style={{ fontSize: 48 }} />
                                <Text type="secondary" style={{ fontSize: 15 }}>
                                    Select a conversation to start messaging
                                </Text>
                            </div>
                        )}
                    </div>
                </div>
            </ProCard>

            <ConnectChannelDrawer
                open={connectDrawerOpen}
                onClose={() => setConnectDrawerOpen(false)}
                onSuccess={handleConnectSuccess}
                shopId={shopId}
                connectedChannels={connected}
            />
        </App>
    );
};

export default OmnichannelInboxPage;