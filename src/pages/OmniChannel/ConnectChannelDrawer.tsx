import React from "react";
import { ProCard } from "@ant-design/pro-components";
import {
    Drawer,
    Button,
    Typography,
    Space,
    Tag,
    Avatar,
    Popconfirm,
    Spin,
    App,
    Divider,
} from "antd";
import {
    CheckCircleFilled,
    DisconnectOutlined,
    LinkOutlined,
    SettingOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.M157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchWhatsappChannels,
    disconnectWhatsappChannel,
} from "@services/whatsappService";
import { CHANNEL_CONFIG } from "./OmnichannelInboxPage";

const { Text, Paragraph } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    shopId: string;
    connectedChannels: {
        whatsapp: boolean;
    };
}

interface Channel {
    _id: string;
    channel: string;
    phone_number_id?: string;
    business_name?: string;
    display_phone_number?: string;
    waba_id?: string;
    is_active: boolean;
}

// ── Connected channel card ────────────────────────────────────────────────────

const ConnectedCard: React.FC<{
    channel: Channel;
    channelType: string;
    onDisconnect: (id: string) => void;
    disconnecting: boolean;
}> = ({ channel, channelType, onDisconnect, disconnecting }) => {
    const cfg = CHANNEL_CONFIG[channelType];
    return (
        <ProCard
            size="small"
            style={{
                borderRadius: 12,
                marginBottom: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
            bodyStyle={{
                padding: "16px 20px",
            }}
            actions={[
                <Popconfirm
                    key="disconnect"
                    title="Disconnect this channel?"
                    description="You will stop receiving messages from this account."
                    onConfirm={() => onDisconnect(channel._id)}
                    okText="Disconnect"
                    okButtonProps={{ danger: true }}
                >
                    <Button
                        danger
                        type="text"
                        size="large"
                        icon={<DisconnectOutlined />}
                        loading={disconnecting}
                        style={{ borderRadius: 8 }}
                    >
                        Remove
                    </Button>
                </Popconfirm>,
            ]}
        >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <Avatar
                    size={42}
                    style={{
                        background: `linear-gradient(135deg, ${cfg?.color} 0%, ${cfg?.color}dd 100%)`,
                        fontSize: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                >
                    {cfg?.icon}
                </Avatar>
                <div style={{ flex: 1 }}>
                    <Space size={8} style={{ marginBottom: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: 600, color: "#262626" }}>
                            {channel.business_name ||
                                channel.display_phone_number ||
                                "Connected Account"}
                        </Text>
                        <Tag
                            icon={<CheckCircleFilled />}
                            color="success"
                            style={{ 
                                fontSize: 11, 
                                lineHeight: "20px",
                                fontWeight: 500,
                                borderRadius: 12
                            }}
                        >
                            Active
                        </Tag>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        {channel.display_phone_number || channel.waba_id
                            ? `${channel.display_phone_number ?? ""} ${channel.waba_id ? `· WABA ${channel.waba_id}` : ""}`.trim()
                            : null}
                    </Text>
                </div>
            </div>
        </ProCard>
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
    const navigate = useNavigate();
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
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10,
                    padding: '8px 0'
                }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(24,144,255,0.1) 0%, rgba(24,144,255,0.05) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <LinkOutlined style={{ color: "#1677ff", fontSize: 18 }} />
                    </div>
                    <Text strong style={{ fontSize: 17, fontWeight: 600 }}>
                        Connect WhatsApp via Twilio
                    </Text>
                </div>
            }
            open={open}
            onClose={onClose}
            width={500}
            destroyOnClose
            styles={{
                body: { background: "#fafafa" }
            }}
        >
            {/* Intro */}
            <div style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                padding: "20px",
                borderRadius: 12,
                marginBottom: 24,
                border: "1px solid #f0f0f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
            }}>
                <Paragraph type="secondary" style={{ fontSize: 14, marginBottom: 0, lineHeight: 1.6 }}>
                    Connect WhatsApp via Twilio to enable messaging. Configure your Twilio credentials in System Setup to get started.
                </Paragraph>
            </div>

            {channelsLoading ? (
                <div style={{ textAlign: "center", padding: 80 }}>
                    <Spin size="large" />
                </div>
            ) : (
                <>
                    {/* Connected accounts summary */}
                    {totalConnected > 0 && (
                        <>
                            <Text
                                type="secondary"
                                style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#8c8c8c" }}
                            >
                                Connected Accounts
                            </Text>
                            <div style={{ marginTop: 12, marginBottom: 24 }}>
                                {channelsByType.whatsapp.map((ch) => (
                                    <ConnectedCard
                                        key={ch._id}
                                        channel={ch}
                                        channelType="whatsapp"
                                        onDisconnect={(id) => disconnectMutation.mutate(id)}
                                        disconnecting={disconnectingId === ch._id}
                                    />
                                ))}
                            </div>
                            <Divider style={{ margin: "0 0 24px" }} />
                        </>
                    )}

                    {/* Setup instructions */}
                    <Text
                        type="secondary"
                        style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#8c8c8c" }}
                    >
                        Setup Instructions
                    </Text>
                    <div style={{ marginTop: 12 }}>
                        <ProCard
                            style={{
                                borderRadius: 12,
                                marginBottom: 16,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            }}
                            bodyStyle={{
                                padding: "20px",
                            }}
                        >
                            <Space direction="vertical" size={12} style={{ width: "100%" }}>
                                <Text style={{ fontSize: 14, color: "#262626" }}>
                                    To connect WhatsApp via Twilio:
                                </Text>
                                <ol style={{ margin: 0, paddingLeft: 20, color: "#595959", fontSize: 13 }}>
                                    <li style={{ marginBottom: 8 }}>Go to System Setup → Twilio Settings</li>
                                    <li style={{ marginBottom: 8 }}>Configure your Twilio Account SID and Auth Token</li>
                                    <li style={{ marginBottom: 8 }}>Set up your WhatsApp Sandbox or Business API</li>
                                    <li>Return here to verify your connection</li>
                                </ol>
                                <Button
                                    type="primary"
                                    icon={<SettingOutlined />}
                                    onClick={() => {
                                        onClose();
                                        navigate("/system-setup");
                                    }}
                                    style={{ marginTop: 8, width: "100%" }}
                                >
                                    Go to System Setup
                                </Button>
                            </Space>
                        </ProCard>
                    </div>
                </>
            )}
        </Drawer>
    );
};

export default ConnectChannelDrawer;
