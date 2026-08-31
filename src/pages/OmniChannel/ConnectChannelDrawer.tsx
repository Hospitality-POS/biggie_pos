import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
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
    Input,
    Radio,
} from "antd";
import {
    CheckCircleFilled,
    DisconnectOutlined,
    LinkOutlined,
    PlusCircleOutlined,
} from "@ant-design/icons";

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);

const MessengerIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M12 0C5.373 0 0 4.373 0 9.75c0 2.884 1.624 5.456 4.128 7.094l-.641 3.156 3.723-1.549c1.536.392 3.18.392 4.716 0l3.723 1.549-.641-3.156C22.376 15.206 24 12.634 24 9.75 24 4.373 18.627 0 12 0zm-1.5 13.5l-3.75-3.75 1.5-1.5 2.25 2.25 6-6 1.5 1.5-7.5 7.5z"/>
    </svg>
);

const InstagramIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
);
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchWhatsappChannels,
    disconnectWhatsappChannel,
    initiateOAuthConnect,
    startWhatsAppWeb,
    getWhatsAppWebQR,
    getWhatsAppWebPairingCode,
    getWhatsAppWebStatus,
    disconnectWhatsAppWeb,
    connectWhatsappChannel,
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
        icon: <WhatsAppIcon />,
        color: "#25D366",
        bg: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
    },
    {
        key: "messenger",
        label: "Facebook Messenger",
        description: "Chat with customers messaging your Facebook Page.",
        icon: <MessengerIcon />,
        color: "#0084FF",
        bg: "linear-gradient(135deg, #0084FF 0%, #0052CC 100%)",
    },
    {
        key: "instagram",
        label: "Instagram DMs",
        description: "Respond to Instagram direct messages from one inbox.",
        icon: <InstagramIcon />,
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
    const { message: antMessage } = App.useApp();
    const cfg = CHANNEL_CONFIG[channelType];
    const [webDisconnecting, setWebDisconnecting] = useState(false);

    const handleDisconnect = async () => {
        setWebDisconnecting(true);
        try {
            await disconnectWhatsAppWeb();
            onDisconnect(channel._id);
            antMessage.success("WhatsApp disconnected");
        } catch {}
        setWebDisconnecting(false);
    };

    const actions: React.ReactNode[] =
        channelType === "whatsapp"
            ? [
                <Popconfirm
                    key="disconnect"
                    title="Disconnect this channel?"
                    description="This will log the WhatsApp Web client out and remove the channel."
                    onConfirm={handleDisconnect}
                    okText="Disconnect"
                    okButtonProps={{ danger: true }}
                >
                    <Button
                        danger
                        type="text"
                        size="large"
                        icon={<DisconnectOutlined />}
                        loading={webDisconnecting}
                        style={{ borderRadius: 8 }}
                    >
                        Disconnect
                    </Button>
                </Popconfirm>,
            ]
            : [
                <Popconfirm
                    key="remove"
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
            ];

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
            actions={actions}
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
                                channel.page_id ||
                                channel.instagram_account_id ||
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
                            : channel.page_id
                                ? `Page ID: ${channel.page_id}`
                                : channel.instagram_account_id
                                    ? `IG ID: ${channel.instagram_account_id}`
                                    : null}
                    </Text>
                </div>
            </div>
        </ProCard>
    );
};

// ── OAuth Connect Button ──────────────────────────────────────────────────────

const OAuthConnectButton: React.FC<{
    channelKey: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    shopId: string;
    connectedCount: number;
    onSuccess: () => void;
    disabled?: boolean;
    buttonLabel?: string;
}> = ({ channelKey, label, description, icon, color, bg, shopId, connectedCount, onSuccess, disabled, buttonLabel }) => {
    const { message: antMessage } = App.useApp();
    const [loading, setLoading] = useState(false);

    const handleConnect = async () => {
        if (disabled) return;
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
        <ProCard
            style={{
                borderRadius: 12,
                marginBottom: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
            bodyStyle={{
                padding: 0,
                overflow: "hidden"
            }}
        >
            {/* Channel header bar */}
            <div
                style={{
                    background: bg,
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                }}
            >
                <span style={{ fontSize: 28, color: "#fff", display: "flex", alignItems: "center" }}>{icon}</span>
                <div style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontWeight: 600, fontSize: 16, display: "block" }}>
                        {label}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 13 }}>
                        {description}
                    </Text>
                </div>
                {connectedCount > 0 && (
                    <Tag
                        icon={<CheckCircleFilled />}
                        style={{
                            background: "rgba(255,255,255,0.25)",
                            borderColor: "rgba(255,255,255,0.5)",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 500,
                            borderRadius: 12,
                            padding: "4px 12px",
                        }}
                    >
                        {connectedCount} connected
                    </Tag>
                )}
            </div>

            {/* Connect button area */}
            <div style={{ padding: "16px 20px", background: "#fff" }}>
                <Button
                    icon={<PlusCircleOutlined />}
                    disabled={disabled}
                    loading={!disabled && loading}
                    onClick={handleConnect}
                    size="large"
                    style={{
                        width: "100%",
                        height: 44,
                        borderColor: color,
                        color: color,
                        fontWeight: 500,
                        fontSize: 14,
                        borderRadius: 8,
                    }}
                >
                    {disabled
                        ? buttonLabel || "Coming soon"
                        : loading
                            ? "Opening Meta Login…"
                            : `Connect ${label}`}
                </Button>
            </div>
        </ProCard>
    );
};

// ── WhatsApp Web Connect Button (QR or phone pairing) ──────────────────────────

const WhatsAppWebConnectButton: React.FC<{
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    shopId: string;
    onSuccess: () => void;
}> = ({ label, description, icon, color, bg, shopId, onSuccess }) => {
    const { message: antMessage } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [showPanel, setShowPanel] = useState(false);
    const [method, setMethod] = useState<"qr" | "phone">("qr");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [qr, setQr] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("idle");

    const handleConnect = async () => {
        if (method === "phone" && !phoneNumber.trim()) {
            antMessage.warning("Please enter your WhatsApp phone number.");
            return;
        }
        setLoading(true);
        setShowPanel(true);
        setStatus("starting");
        try {
            await startWhatsAppWeb(method === "phone" ? { method: "phone", phoneNumber } : { method: "qr" });
        } catch (err: any) {
            setLoading(false);
            setShowPanel(false);
            antMessage.error(err?.message || "Could not start WhatsApp Web");
        }
    };

    const handleStop = async () => {
        setLoading(false);
        setShowPanel(false);
        setQr(null);
        setPairingCode(null);
        setStatus("idle");
        try {
            await disconnectWhatsAppWeb();
        } catch {}
    };

    useEffect(() => {
        if (!showPanel) return;
        let stopped = false;
        const poll = async () => {
            try {
                const [qrData, codeData, statusData] = await Promise.allSettled([
                    getWhatsAppWebQR(),
                    getWhatsAppWebPairingCode(),
                    getWhatsAppWebStatus(),
                ]);
                if (stopped) return;

                const qrValue = qrData.status === "fulfilled" ? qrData.value?.qr : null;
                const codeValue = codeData.status === "fulfilled" ? codeData.value?.code : null;
                const currentStatus = statusData.status === "fulfilled" ? statusData.value : null;

                setQr(qrValue || null);
                setPairingCode(codeValue || null);
                setStatus(currentStatus?.status || "idle");

                if (currentStatus?.ready && currentStatus?.phone) {
                    stopped = true;
                    await connectWhatsappChannel({
                        channel: "whatsapp",
                        shop_id: shopId,
                        phone_number_id: currentStatus.phone,
                        display_phone_number: currentStatus.phone,
                        access_token: "wwebjs",
                        verify_token: "wwebjs",
                        business_name: "WhatsApp Web",
                    });
                    antMessage.success("WhatsApp connected successfully!");
                    onSuccess();
                    setShowPanel(false);
                    setLoading(false);
                } else if (currentStatus?.status === "error") {
                    stopped = true;
                    setLoading(false);
                    antMessage.error("WhatsApp Web failed to start.");
                }
            } catch (err: any) {
                const errorMessage = err?.response?.data?.message || err?.message || JSON.stringify(err);
                console.error("WhatsApp Web poll error", err);
                antMessage.error(errorMessage || "Failed to connect WhatsApp.");
                setLoading(false);
            }
        };
        poll();
        const interval = setInterval(poll, 3000);
        return () => { stopped = true; clearInterval(interval); };
    }, [showPanel, shopId, onSuccess, antMessage]);

    return (
        <ProCard
            style={{
                borderRadius: 12,
                marginBottom: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
            bodyStyle={{
                padding: 0,
                overflow: "hidden"
            }}
        >
            {/* Channel header bar */}
            <div
                style={{
                    background: bg,
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                }}
            >
                <span style={{ fontSize: 28, color: "#fff", display: "flex", alignItems: "center" }}>{icon}</span>
                <div style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontWeight: 600, fontSize: 16, display: "block" }}>
                        {label}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 13 }}>
                        {description}
                    </Text>
                </div>
            </div>

            {/* QR / phone connection panel */}
            <div style={{ padding: "16px 20px", background: "#fff" }}>
                {showPanel ? (
                    <div style={{ textAlign: "center" }}>
                        {method === "qr" && (
                            qr ? (
                                <>
                                    <QRCodeSVG value={qr} size={256} style={{ marginBottom: 16 }} />
                                    <Paragraph type="secondary">
                                        Scan this QR code with WhatsApp on your phone.
                                    </Paragraph>
                                </>
                            ) : (
                                <div style={{ padding: 40 }}>
                                    <Spin size="large" />
                                    <Paragraph type="secondary" style={{ marginTop: 16 }}>
                                        Waiting for QR code...
                                    </Paragraph>
                                </div>
                            )
                        )}
                        {method === "phone" && (
                            pairingCode ? (
                                <>
                                    <Paragraph style={{ fontSize: 16, marginBottom: 8 }}>
                                        Your WhatsApp pairing code:
                                    </Paragraph>
                                    <Text strong style={{ fontSize: 28, letterSpacing: 4 }} copyable>
                                        {pairingCode}
                                    </Text>
                                    <Paragraph type="secondary" style={{ marginTop: 12 }}>
                                        Open WhatsApp &rarr; Settings &rarr; Linked Devices &rarr; Link with phone number, then enter the code.
                                    </Paragraph>
                                </>
                            ) : (
                                <div style={{ padding: 40 }}>
                                    <Spin size="large" />
                                    <Paragraph type="secondary" style={{ marginTop: 16 }}>
                                        Waiting for pairing code...
                                    </Paragraph>
                                </div>
                            )
                        )}
                        <Text type="secondary" style={{ display: "block", marginTop: 8, marginBottom: 12 }}>
                            Status: {status}
                        </Text>
                        <Button onClick={handleStop} danger>
                            Cancel
                        </Button>
                    </div>
                ) : (
                    <>
                        <Radio.Group
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            style={{ marginBottom: 12 }}
                            optionType="button"
                            buttonStyle="solid"
                        >
                            <Radio.Button value="qr">QR Code</Radio.Button>
                            <Radio.Button value="phone">Phone Number</Radio.Button>
                        </Radio.Group>

                        {method === "phone" && (
                            <Input
                                placeholder="WhatsApp number e.g. 254712345678"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                style={{ marginBottom: 12 }}
                                size="large"
                            />
                        )}

                        <Button
                            icon={<PlusCircleOutlined />}
                            loading={loading}
                            onClick={handleConnect}
                            size="large"
                            style={{
                                width: "100%",
                                height: 44,
                                borderColor: color,
                                color: color,
                                fontWeight: 500,
                                fontSize: 14,
                                borderRadius: 8,
                            }}
                        >
                            {loading ? "Starting WhatsApp…" : `Connect ${label}`}
                        </Button>

                    </>
                )}
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
                        Connect Channels
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
                    Connect your social accounts in one click. We handle the rest — no tokens, no
                    webhook setup, no developer knowledge required.
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
                            <Divider style={{ margin: "0 0 24px" }} />
                        </>
                    )}

                    {/* Connect buttons */}
                    <Text
                        type="secondary"
                        style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#8c8c8c" }}
                    >
                        Add a Channel
                    </Text>
                    <div style={{ marginTop: 12 }}>
                        {CHANNELS.map((ch) =>
                            ch.key === "whatsapp" ? (
                                <WhatsAppWebConnectButton
                                    key={ch.key}
                                    label={ch.label}
                                    description={ch.description}
                                    icon={ch.icon}
                                    color={ch.color}
                                    bg={ch.bg}
                                    shopId={shopId}
                                    onSuccess={handleConnectSuccess}
                                />
                            ) : (
                                <OAuthConnectButton
                                    key={ch.key}
                                    channelKey={ch.key}
                                    label={ch.label}
                                    description={ch.description}
                                    icon={ch.icon}
                                    color={ch.color}
                                    bg={ch.bg}
                                    shopId={shopId}
                                    connectedCount={channelsByType[ch.key]?.length || 0}
                                    onSuccess={handleConnectSuccess}
                                    disabled={ch.key === "messenger" || ch.key === "instagram"}
                                    buttonLabel="Coming soon"
                                />
                            )
                        )}
                    </div>

                    {/* Footer note */}
                    <div
                        style={{
                            marginTop: 24,
                            padding: "16px 18px",
                            background: "linear-gradient(135deg, #f8f9fa 0%, #f0f0f0 100%)",
                            borderRadius: 12,
                            border: "1px solid #f0f0f0",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                        }}
                    >
                        <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
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