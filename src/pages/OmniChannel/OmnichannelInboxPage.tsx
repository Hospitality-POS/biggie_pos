import React, { useState, useCallback, useMemo } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
    Button,
    Space,
    Typography,
    Badge,
    App,
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

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);

const MessengerIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M12 0C5.373 0 0 4.373 0 9.75c0 2.884 1.624 5.456 4.128 7.094l-.641 3.156 3.723-1.549c1.536.392 3.18.392 4.716 0l3.723 1.549-.641-3.156C22.376 15.206 24 12.634 24 9.75 24 4.373 18.627 0 12 0zm-1.5 13.5l-3.75-3.75 1.5-1.5 2.25 2.25 6-6 1.5 1.5-7.5 7.5z"/>
    </svg>
);

const InstagramIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
);
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
    { label: string; color: string; icon: React.ReactNode; bg: string }
> = {
    whatsapp: { label: "WhatsApp", color: "#25D366", bg: "#f0fdf4", icon: <WhatsAppIcon /> },
    messenger: { label: "Messenger", color: "#0084FF", bg: "#eff6ff", icon: <MessengerIcon /> },
    instagram: { label: "Instagram", color: "#E1306C", bg: "#fff0f5", icon: <InstagramIcon /> },
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
                <Space size={6} align="center">
                    <span style={{ color: CHANNEL_CONFIG[ch].color, display: "flex", alignItems: "center" }}>
                        {CHANNEL_CONFIG[ch].icon}
                    </span>
                    <span style={{ lineHeight: 1 }}>{CHANNEL_CONFIG[ch].label}</span>
                    {(channelCounts[ch] || 0) > 0 && (
                        <Badge
                            count={channelCounts[ch]}
                            size="small"
                            style={{ fontSize: 10, backgroundColor: CHANNEL_CONFIG[ch].color }}
                        />
                    )}
                </Space>
            ),
            value: ch,
        })),
    ];

    return (
        <App>
            <div style={{ 
                minHeight: "100vh",
                // background: "#f5f5f5",
                padding: "24px"
            }}>
                {!channelsLoading && !anyConnected && (
                    <ProCard
                        bordered={false}
                        style={{ 
                            marginBottom: 24,
                            borderRadius: 16,
                            // background: "linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)",
                            // border: "1px solid #bae7ff"
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                            <div style={{
                                width: 80,
                                height: 80,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #ffffff 0%, #e6f7ff 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 4px 12px rgba(24,144,255,0.15)"
                            }}>
                                <WifiOutlined style={{ fontSize: 36, color: "#1890ff" }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Title level={4} style={{ margin: 0, marginBottom: 8, color: "#262626", fontSize: 20 }}>
                                    Welcome to Your Omnichannel Inbox
                                </Title>
                                <Text style={{ fontSize: 15, color: "#595959", display: "block" }}>
                                    Connect WhatsApp, Messenger, or Instagram to start receiving messages from all your customers in one place.
                                </Text>
                            </div>
                            <Button
                                type="primary"
                                size="large"
                                onClick={() => setConnectDrawerOpen(true)}
                                icon={<PlusOutlined />}
                                style={{ 
                                    borderRadius: 10,
                                    fontWeight: 600,
                                    background: primaryColor,
                                    borderColor: primaryColor,
                                    height: 44,
                                    padding: "0 28px",
                                    fontSize: 15
                                }}
                            >
                                Connect Channel
                            </Button>
                        </div>
                    </ProCard>
                )}

                <ProCard
                    bordered={false}
                    bodyStyle={{ padding: 0 }}
                    style={{ 
                        borderRadius: 16,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                        overflow: "hidden"
                    }}
                    title={
                        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 12,
                                padding: '12px 20px',
                                background: 'linear-gradient(135deg, rgba(24,144,255,0.1) 0%, rgba(24,144,255,0.05) 100%)',
                                borderRadius: 12
                            }}>
                                <MessageOutlined style={{ fontSize: 24, color: primaryColor }} />
                                <Title level={4} style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                                    Inbox
                                </Title>
                            </div>
                            <Segmented
                                options={channelOptions}
                                value={activeChannel}
                                onChange={(v) => {
                                    setActiveChannel(v as Channel);
                                    setPage(1);
                                    setSelectedConversation(null);
                                }}
                                size="large"
                                style={{ 
                                    background: "#f5f5f5",
                                    padding: 6,
                                    borderRadius: 10
                                }}
                            />
                            {isFetching && !conversationsLoading && (
                                <Spin size="small" />
                            )}
                        </div>
                    }
                    extra={
                        <Space size={12}>
                            <Tooltip title="Refresh">
                                <Button
                                    icon={<ReloadOutlined />}
                                    size="large"
                                    loading={isFetching || channelsLoading}
                                    onClick={() => {
                                        queryClient.invalidateQueries({ queryKey: ["omnichannel-channels"] });
                                        if (anyConnected) {
                                            refetch();
                                        }
                                    }}
                                    style={{ borderRadius: 10, height: 40 }}
                                />
                            </Tooltip>
                            <Tooltip title="Channel Settings">
                                <Button
                                    icon={<SettingOutlined />}
                                    size="large"
                                    onClick={() => setConnectDrawerOpen(true)}
                                    style={{ borderRadius: 10, height: 40 }}
                                />
                            </Tooltip>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setConnectDrawerOpen(true)}
                                style={{ 
                                    background: primaryColor, 
                                    borderColor: primaryColor,
                                    borderRadius: 10,
                                    fontWeight: 600,
                                    height: 40,
                                    padding: "0 20px"
                                }}
                                size="large"
                            >
                                Connect Channel
                            </Button>
                        </Space>
                    }
                >
                    <div style={{ display: "flex", height: "calc(100vh - 280px)", minHeight: 700 }}>
                        <div
                            style={{
                                width: 380,
                                borderRight: "1px solid #f0f0f0",
                                flexShrink: 0,
                                overflowY: "auto",
                                background: "#fafafa"
                            }}
                        >
                        {!anyConnected && !channelsLoading ? (
                            <div style={{ 
                                marginTop: 80, 
                                padding: 24,
                                textAlign: "center"
                            }}>
                                <div style={{
                                    width: 120,
                                    height: 120,
                                    margin: "0 auto 24px",
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}>
                                    <MessageOutlined style={{ fontSize: 56, color: "#1890ff" }} />
                                </div>
                                <Title level={4} style={{ marginBottom: 12, color: "#262626" }}>
                                    No Channels Connected
                                </Title>
                                <Text type="secondary" style={{ fontSize: 14, display: "block", marginBottom: 24 }}>
                                    Connect WhatsApp, Messenger, or Instagram to start receiving messages
                                </Text>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => setConnectDrawerOpen(true)}
                                    size="large"
                                    style={{ 
                                        background: primaryColor, 
                                        borderColor: primaryColor,
                                        borderRadius: 8,
                                        fontWeight: 500
                                    }}
                                >
                                    Connect a Channel
                                </Button>
                            </div>
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

                    <div style={{ flex: 1, overflow: "hidden", background: "#fff" }}>
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
                                    gap: 16,
                                    background: "linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)"
                                }}
                            >
                                <div style={{
                                    width: 160,
                                    height: 160,
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}>
                                    <MessageOutlined style={{ fontSize: 72, color: "#d9d9d9" }} />
                                </div>
                                <div style={{ textAlign: "center" }}>
                                    <Title level={4} style={{ color: "#8c8c8c", marginBottom: 8 }}>
                                        Start a Conversation
                                    </Title>
                                    <Text type="secondary" style={{ fontSize: 15 }}>
                                        Select a conversation from the list to start messaging
                                    </Text>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </ProCard>
            </div>

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