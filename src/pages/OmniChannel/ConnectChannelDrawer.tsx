import React, { useState } from "react";
import {
    Drawer,
    Button,
    Typography,
    Space,
    Tag,
    List,
    Avatar,
    Popconfirm,
    Spin,
    App,
    Result,
    Divider,
} from "antd";
import {
    CheckCircleFilled,
    DisconnectOutlined,
    PhoneOutlined,
    FacebookOutlined,
    InstagramOutlined,
    LinkOutlined,
    PlusCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchWhatsappChannels,
    disconnectWhatsappChannel,
    initiateOAuthConnect,
} from "@services/whatsappService";
import { CHANNEL_CONFIG } from "./OmnichannelInboxPage";

const { Text, Title, Paragraph } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    shopId: string;
    connectedChannels: {
        whatsapp: boolean;
        messenger: boolean;
        instagram: boolean;
    };
}

interface Channel {
    _id: string;
    channel: string;
    phone_number_id?: string;
    page_id?: string;
    instagram_account_id?: string;
    business_name?: string;
    display_phone_number?: string;
    waba_id?: string;
    is_active: boolean;
}

// ── Channel definitions ───────────────────────────────────────────────────────

const CHANNELS = [
    {
        key: "whatsapp",
        label: "WhatsApp Business",
        description: "Send and receive messages from your WhatsApp Business account.",
        icon: <PhoneOutlined />,
        emoji: "💬",
        color: "#25D366",
        bg: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
    },
    {
        key: "messenger",
        label: "Facebook Messenger",
        description: "Chat with customers messaging your Facebook Page.",
        icon: <FacebookOutlined />,
        emoji: "💙",
        color: "#0084FF",
        bg: "linear-gradient(135deg, #0084FF 0%, #0052CC 100%)",
    },
    {
        key: "instagram",
        label: "Instagram DMs",
        description: "Respond to Instagram direct messages from one inbox.",
        icon: <InstagramOutlined />,
        emoji: "📸",
        color: "#E1306C",
        bg: "linear-gradient(135deg, #E1306C 0%, #833AB4 100%)",
    },
];

// ── Connected channel card ────────────────────────────────────────────────────

const ConnectedCard: React.FC<{
    channel: Channel;
    channelType: string;
    onDisconnect: (id: string) => void;
    disconnecting: boolean;
}> = ({ channel, channelType, onDisconnect, disconnecting }) => {
    const cfg = CHANNEL_CONFIG[channelType];
    return (
        <List.Item
            style={{
                padding: "10px 14px",
                background: "#fafafa",
                borderRadius: 8,
                marginBottom: 8,
                border: "1px solid #f0f0f0",
            }}
            actions={[
                <Popconfirm
                    title="Disconnect this channel?"
                    description="You will stop receiving messages from this account."
                    onConfirm={() => onDisconnect(channel._id)}
                    okText="Disconnect"
                    okButtonProps={{ danger: true }}
                >
                    <Button
                        danger
                        type="text"
                        size="small"
                        icon={<DisconnectOutlined />}
                        loading={disconnecting}
                    >
                        Remove
                    </Button>
                </Popconfirm>,
            ]}
        >
            <List.Item.Meta
                avatar={
                    <Avatar
                        size={36}
                        style={{
                            background: cfg?.color,
                            fontSize: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {cfg?.icon}
                    </Avatar>
                }
                title={
                    <Space size={6}>
                        <Text style={{ fontSize: 13, fontWeight: 500 }}>
                            {channel.business_name ||
                                channel.display_phone_number ||
                                channel.page_id ||
                                channel.instagram_account_id ||
                                "Connected Account"}
                        </Text>
                        <Tag
                            icon={<CheckCircleFilled />}
                            color="success"
                            style={{ fontSize: 11, lineHeight: "18px" }}
                        >
                            Active
                        </Tag>
                    </Space>
                }
                description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {channel.display_phone_number || channel.waba_id
                            ? `${channel.display_phone_number ?? ""} ${channel.waba_id ? `· WABA ${channel.waba_id}` : ""}`.trim()
                            : channel.page_id
                                ? `Page ID: ${channel.page_id}`
                                : channel.instagram_account_id
                                    ? `IG ID: ${channel.instagram_account_id}`
                                    : null}
                    </Text>
                }
            />
        </List.Item>
    );
};

// ── OAuth Connect Button ──────────────────────────────────────────────────────

const OAuthConnectButton: React.FC<{
    channelKey: string;
    label: string;
    description: string;
    emoji: string;
    color: string;
    bg: string;
    shopId: string;
    connectedCount: number;
    onSuccess: () => void;
}> = ({ channelKey, label, description, emoji, color, bg, shopId, connectedCount, onSuccess }) => {
    const { message: antMessage } = App.useApp();
    const [loading, setLoading] = useState(false);

    const handleConnect = async () => {
        setLoading(true);
        try {
            // Get the OAuth URL from the backend
            const { oauth_url, state } = await initiateOAuthConnect({
                channel: channelKey,
                shop_id: shopId,
            });

            // Open the Meta OAuth popup
            const popup = window.open(
                oauth_url,
                "meta_oauth",
                "width=600,height=700,scrollbars=yes,resizable=yes"
            );

            if (!popup) {
                antMessage.error("Popup blocked. Please allow popups for this site and try again.");
                setLoading(false);
                return;
            }

            // Listen for the OAuth callback message from the popup
            const handleMessage = (event: MessageEvent) => {
                if (event.data?.type === "OAUTH_SUCCESS" && event.data?.state === state) {
                    window.removeEventListener("message", handleMessage);
                    popup.close();
                    setLoading(false);
                    antMessage.success(`${label} connected successfully!`);
                    onSuccess();
                } else if (event.data?.type === "OAUTH_ERROR" && event.data?.state === state) {
                    window.removeEventListener("message", handleMessage);
                    popup.close();
                    setLoading(false);
                    antMessage.error(event.data?.message || `Failed to connect ${label}`);
                }
            };

            window.addEventListener("message", handleMessage);

            // Detect if the popup was closed without completing OAuth
            const popupWatcher = setInterval(() => {
                if (popup.closed) {
                    clearInterval(popupWatcher);
                    window.removeEventListener("message", handleMessage);
                    setLoading(false);
                }
            }, 500);
        } catch (err: any) {
            antMessage.error(err?.message || `Could not initiate ${label} connection`);
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                borderRadius: 12,
                border: "1px solid #f0f0f0",
                overflow: "hidden",
                marginBottom: 12,
            }}
        >
            {/* Channel header bar */}
            <div
                style={{
                    background: bg,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                }}
            >
                <span style={{ fontSize: 28 }}>{emoji}</span>
                <div style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontWeight: 600, fontSize: 15, display: "block" }}>
                        {label}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>
                        {description}
                    </Text>
                </div>
                {connectedCount > 0 && (
                    <Tag
                        icon={<CheckCircleFilled />}
                        style={{
                            background: "rgba(255,255,255,0.2)",
                            borderColor: "rgba(255,255,255,0.4)",
                            color: "#fff",
                            fontSize: 11,
                        }}
                    >
                        {connectedCount} connected
                    </Tag>
                )}
            </div>

            {/* Connect button area */}
            <div style={{ padding: "14px 18px", background: "#fff" }}>
                <Button
                    icon={<PlusCircleOutlined />}
                    loading={loading}
                    onClick={handleConnect}
                    style={{
                        width: "100%",
                        height: 40,
                        borderColor: color,
                        color: color,
                        fontWeight: 500,
                        fontSize: 13,
                    }}
                >
                    {loading ? "Opening Meta Login…" : `Connect ${label}`}
                </Button>
            </div>
        </div>
    );
};

// ── Main Drawer ───────────────────────────────────────────────────────────────

const ConnectChannelDrawer: React.FC<Props> = ({
    open,
    onClose,
    onSuccess,
    shopId,
    connectedChannels,
}) => {
    const queryClient = useQueryClient();
    const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

    const { data: channelsData, isLoading: channelsLoading } = useQuery({
        queryKey: ["omnichannel-channels-drawer", shopId],
        queryFn: () => fetchWhatsappChannels({ shop_id: shopId }),
        enabled: open && !!shopId,
    });

    const channels: Channel[] = channelsData?.channels || [];

    const channelsByType: Record<string, Channel[]> = {
        whatsapp: channels.filter((c) => c.channel === "whatsapp"),
        messenger: channels.filter((c) => c.channel === "messenger"),
        instagram: channels.filter((c) => c.channel === "instagram"),
    };

    const disconnectMutation = useMutation({
        mutationFn: (id: string) => {
            setDisconnectingId(id);
            return disconnectWhatsappChannel(id);
        },
        onSuccess: () => {
            setDisconnectingId(null);
            queryClient.invalidateQueries({ queryKey: ["omnichannel-channels-drawer"] });
            queryClient.invalidateQueries({ queryKey: ["omnichannel-channels"] });
            onSuccess();
        },
        onError: () => setDisconnectingId(null),
    });

    const handleConnectSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ["omnichannel-channels-drawer"] });
        queryClient.invalidateQueries({ queryKey: ["omnichannel-channels"] });
        onSuccess();
    };

    const totalConnected = Object.values(connectedChannels).filter(Boolean).length;

    return (
        <Drawer
            title={
                <Space>
                    <LinkOutlined style={{ color: "#1677ff" }} />
                    <Text strong style={{ fontSize: 15 }}>
                        Connect Channels
                    </Text>
                </Space>
            }
            open={open}
            onClose={onClose}
            width={480}
            destroyOnClose
        >
            {/* Intro */}
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 20 }}>
                Connect your social accounts in one click. We handle the rest — no tokens, no
                webhook setup, no developer knowledge required.
            </Paragraph>

            {channelsLoading ? (
                <div style={{ textAlign: "center", padding: 60 }}>
                    <Spin size="large" />
                </div>
            ) : (
                <>
                    {/* Connected accounts summary */}
                    {totalConnected > 0 && (
                        <>
                            <Text
                                type="secondary"
                                style={{ fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}
                            >
                                Connected Accounts
                            </Text>
                            <div style={{ marginTop: 8, marginBottom: 20 }}>
                                {CHANNELS.map(({ key }) =>
                                    channelsByType[key].map((ch) => (
                                        <ConnectedCard
                                            key={ch._id}
                                            channel={ch}
                                            channelType={key}
                                            onDisconnect={(id) => disconnectMutation.mutate(id)}
                                            disconnecting={disconnectingId === ch._id}
                                        />
                                    ))
                                )}
                            </div>
                            <Divider style={{ margin: "0 0 20px" }} />
                        </>
                    )}

                    {/* Connect buttons */}
                    <Text
                        type="secondary"
                        style={{ fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                        Add a Channel
                    </Text>
                    <div style={{ marginTop: 12 }}>
                        {CHANNELS.map((ch) => (
                            <OAuthConnectButton
                                key={ch.key}
                                channelKey={ch.key}
                                label={ch.label}
                                description={ch.description}
                                emoji={ch.emoji}
                                color={ch.color}
                                bg={ch.bg}
                                shopId={shopId}
                                connectedCount={channelsByType[ch.key]?.length || 0}
                                onSuccess={handleConnectSuccess}
                            />
                        ))}
                    </div>

                    {/* Footer note */}
                    <div
                        style={{
                            marginTop: 20,
                            padding: "12px 14px",
                            background: "#f9f9f9",
                            borderRadius: 8,
                            border: "1px solid #f0f0f0",
                        }}
                    >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            🔒 <strong>Secure by default.</strong> Your access tokens are encrypted
                            and never exposed. We use Meta's official OAuth — the same flow used by
                            Shopify, Zendesk, and HubSpot.
                        </Text>
                    </div>
                </>
            )}
        </Drawer>
    );
};

export default ConnectChannelDrawer;