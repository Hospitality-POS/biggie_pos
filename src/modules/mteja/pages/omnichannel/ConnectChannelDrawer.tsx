import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
    Drawer,
    Button,
    Typography,
    Space,
    Tag,
    Popconfirm,
    Spin,
    App,
    Input,
    Segmented,
    Steps,
    Tooltip,
    Grid,
} from "antd";
import {
    CheckCircleFilled,
    DisconnectOutlined,
    LinkOutlined,
    LockOutlined,
    MobileOutlined,
    QrcodeOutlined,
    SyncOutlined,
    WarningFilled,
} from "@ant-design/icons";
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
    resyncWhatsAppWeb,
    connectWhatsappChannel,
} from "@services/whatsappService";
import { THEME_C } from "@utils/getPrimaryColor";
import { CHANNEL_CONFIG } from "./OmnichannelInboxPage";
import { tintStyle } from "./shared/ui";

const { Text, Paragraph } = Typography;
const C = THEME_C;
const WA_GREEN = "#25D366";
const WA_DARK = "#008069";

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
    shop_id?: string;
    phone_number_id?: string;
    page_id?: string;
    instagram_account_id?: string;
    business_name?: string;
    display_phone_number?: string;
    waba_id?: string;
    is_active: boolean;
}

type Health = "live" | "reconnect" | "off" | "soon";

const HEALTH: Record<Health, { label: string; color: string; bg: string }> = {
    live: { label: "Live", color: "#16a34a", bg: "#f0fdf4" },
    reconnect: { label: "Needs reconnect", color: "#d97706", bg: "#fffbeb" },
    off: { label: "Not connected", color: "#64748b", bg: "#f8fafc" },
    soon: { label: "Coming soon", color: "#94a3b8", bg: "#f8fafc" },
};

// Plain-language versions of the WhatsApp Web client states.
const STATUS_TEXT: Record<string, string> = {
    idle: "Preparing…",
    starting: "Starting a secure session…",
    initializing: "Starting a secure session…",
    qr: "Waiting for you to scan",
    pairing: "Waiting for you to enter the code",
    authenticated: "Linked — syncing your chats…",
    loading: "Loading your chats…",
    ready: "Connected",
    error: "Something went wrong — try again",
    disconnected: "Disconnected",
};

const formatPhone = (p?: string) => {
    const d = String(p || "").replace(/\D/g, "");
    return d ? `+${d}` : "";
};

const channelIconTile = (key: string, size = 40) => {
    const cfg = CHANNEL_CONFIG[key];
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: 12,
                background: cfg?.color,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: `0 4px 12px -4px ${cfg?.color}`,
            }}
        >
            <span style={{ display: "flex", transform: `scale(${size / 32})` }}>{cfg?.icon}</span>
        </div>
    );
};

const sectionLabel = (text: string) => (
    <Text
        style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            color: "#94a3b8",
            display: "block",
            margin: "20px 0 8px",
        }}
    >
        {text}
    </Text>
);

const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
    overflow: "hidden",
};

// Numbered "how to link" instructions, as WhatsApp shows them.
const LinkInstructions: React.FC<{ method: "qr" | "phone" }> = ({ method }) => (
    <ol style={{ margin: 0, paddingLeft: 18, color: "#475569", fontSize: 12.5, lineHeight: 1.8, textAlign: "left" }}>
        <li>Open <b>WhatsApp</b> on the shop's phone</li>
        <li>Tap <b>⋮ Menu</b> (Android) or <b>Settings</b> (iPhone) → <b>Linked devices</b></li>
        <li>Tap <b>Link a device</b></li>
        {method === "qr" ? (
            <li>Point the phone at the QR code on this screen</li>
        ) : (
            <li>Choose <b>Link with phone number instead</b> and type the code below</li>
        )}
    </ol>
);

// ── Connected WhatsApp / channel card ─────────────────────────────────────────

const ConnectedCard: React.FC<{
    channel: Channel;
    channelType: string;
    onDisconnect: (id: string) => void;
    disconnecting: boolean;
    liveWhatsappReady?: boolean;
    onReconnected?: () => void;
}> = ({ channel, channelType, onDisconnect, disconnecting, liveWhatsappReady, onReconnected }) => {
    const { message: antMessage } = App.useApp();
    const [webDisconnecting, setWebDisconnecting] = useState(false);
    const [resyncing, setResyncing] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
    const [reconnectQr, setReconnectQr] = useState<string | null>(null);

    // The "Active" DB record only means this channel was connected at some
    // point — the WhatsApp Web session itself is a live, separate thing that
    // can silently drop (e.g. needs a fresh QR scan) without the DB record
    // changing. Surface that distinction instead of always showing "Active".
    const isWhatsapp = channelType === "whatsapp";
    const isLiveDisconnected = isWhatsapp && liveWhatsappReady === false;
    const viaCloudApi = isWhatsapp && !!channel.waba_id;
    const health: Health = isLiveDisconnected ? "reconnect" : "live";
    const h = HEALTH[health];

    const title =
        (isWhatsapp ? formatPhone(channel.display_phone_number || channel.phone_number_id) : "") ||
        channel.business_name ||
        channel.page_id ||
        channel.instagram_account_id ||
        "Connected account";

    const handleDisconnect = async () => {
        setWebDisconnecting(true);
        try {
            await disconnectWhatsAppWeb(channel.shop_id);
            onDisconnect(channel._id);
            antMessage.success("WhatsApp disconnected");
        } catch {
            /* ignore disconnect error */
        }
        setWebDisconnecting(false);
    };

    const handleResync = async () => {
        setResyncing(true);
        try {
            await resyncWhatsAppWeb(channel.shop_id);
            antMessage.success("Syncing recent chats — they'll appear in the inbox shortly");
        } catch {
            /* ignore resync error */
        }
        setResyncing(false);
    };

    useEffect(() => {
        if (!reconnecting) return;
        let stopped = false;
        const poll = async () => {
            try {
                const [qrData, statusData] = await Promise.allSettled([
                    getWhatsAppWebQR(channel.shop_id),
                    getWhatsAppWebStatus(channel.shop_id),
                ]);
                if (stopped) return;
                const qrValue = qrData.status === "fulfilled" ? qrData.value?.qr : null;
                const ready = statusData.status === "fulfilled" ? statusData.value?.ready : false;
                setReconnectQr(qrValue || null);
                if (ready) {
                    setReconnecting(false);
                    setReconnectQr(null);
                    antMessage.success("WhatsApp reconnected");
                    onReconnected?.();
                }
            } catch {
                /* ignore poll error */
            }
        };
        poll();
        const interval = setInterval(poll, 2000);
        return () => {
            stopped = true;
            clearInterval(interval);
        };
    }, [reconnecting]);

    const handleReconnect = async () => {
        setReconnecting(true);
        setReconnectQr(null);
        try {
            await startWhatsAppWeb({ method: "qr", shop_id: channel.shop_id });
        } catch (err: any) {
            setReconnecting(false);
            antMessage.error(err?.message || "Could not start WhatsApp Web reconnection");
        }
    };

    return (
        <div style={{ ...cardStyle, borderColor: isLiveDisconnected ? "#fde68a" : "#e2e8f0", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
                {channelIconTile(channelType, 42)}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 15, color: "#0f172a", display: "block" }} ellipsis>
                        {title}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#64748b" }}>
                        {isWhatsapp
                            ? viaCloudApi
                                ? `WhatsApp Cloud API · WABA ${channel.waba_id}`
                                : "Linked device · WhatsApp Web"
                            : channel.page_id
                                ? `Page ${channel.page_id}`
                                : `Account ${channel.instagram_account_id || ""}`}
                    </Text>
                </div>
                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: h.bg,
                        color: h.color,
                        fontSize: 12,
                        fontWeight: 600,
                        border: `1px solid ${h.color}33`,
                        flexShrink: 0,
                    }}
                >
                    {health === "live" ? <CheckCircleFilled /> : <WarningFilled />}
                    {h.label}
                </span>
            </div>

            {isLiveDisconnected && !reconnecting && (
                <div style={{ margin: "0 14px 12px", padding: "8px 10px", borderRadius: 10, background: "#fffbeb", color: "#92400e", fontSize: 12.5 }}>
                    The phone logged this device out, so new messages aren't arriving. Reconnect and scan the QR
                    code with the same WhatsApp number.
                </div>
            )}

            {reconnecting && (
                <div style={{ padding: "4px 14px 16px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                    <div style={{ padding: 10, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }}>
                        {reconnectQr ? (
                            <QRCodeSVG value={reconnectQr} size={180} />
                        ) : (
                            <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Spin tip="Generating QR…" />
                            </div>
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                        <LinkInstructions method="qr" />
                        <Button size="small" type="link" danger style={{ padding: 0, marginTop: 6 }} onClick={() => setReconnecting(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            <div style={{ display: "flex", borderTop: "1px solid #f1f5f9" }}>
                {isWhatsapp ? (
                    <>
                        {isLiveDisconnected ? (
                            <Button
                                type="text"
                                block
                                icon={<QrcodeOutlined />}
                                loading={reconnecting}
                                onClick={handleReconnect}
                                style={{ height: 42, borderRadius: 0, color: "#d97706", fontWeight: 600 }}
                            >
                                Reconnect
                            </Button>
                        ) : (
                            <Tooltip title="Pull in recent chats from the phone">
                                <Button
                                    type="text"
                                    block
                                    icon={<SyncOutlined spin={resyncing} />}
                                    loading={resyncing}
                                    onClick={handleResync}
                                    style={{ height: 42, borderRadius: 0 }}
                                >
                                    Sync chats
                                </Button>
                            </Tooltip>
                        )}
                        <div style={{ width: 1, background: "#f1f5f9" }} />
                        <Popconfirm
                            title="Disconnect WhatsApp?"
                            description="This logs the linked device out. Customers' messages stop arriving here until you connect again."
                            onConfirm={handleDisconnect}
                            okText="Disconnect"
                            okButtonProps={{ danger: true }}
                        >
                            <Button
                                type="text"
                                block
                                danger
                                icon={<DisconnectOutlined />}
                                loading={webDisconnecting}
                                style={{ height: 42, borderRadius: 0 }}
                            >
                                Disconnect
                            </Button>
                        </Popconfirm>
                    </>
                ) : (
                    <Popconfirm
                        title="Disconnect this channel?"
                        description="You will stop receiving messages from this account."
                        onConfirm={() => onDisconnect(channel._id)}
                        okText="Disconnect"
                        okButtonProps={{ danger: true }}
                    >
                        <Button type="text" block danger icon={<DisconnectOutlined />} loading={disconnecting} style={{ height: 42, borderRadius: 0 }}>
                            Disconnect
                        </Button>
                    </Popconfirm>
                )}
            </div>
        </div>
    );
};

// ── OAuth channel row (Messenger / Instagram) ─────────────────────────────────

const OAuthChannelRow: React.FC<{
    channelKey: string;
    label: string;
    description: string;
    shopId: string;
    onSuccess: () => void;
    disabled?: boolean;
}> = ({ channelKey, label, description, shopId, onSuccess, disabled }) => {
    const { message: antMessage } = App.useApp();
    const [loading, setLoading] = useState(false);

    const handleConnect = async () => {
        if (disabled) return;
        setLoading(true);
        try {
            // Get the OAuth URL from the backend
            const { oauth_url, state } = await initiateOAuthConnect({ channel: channelKey, shop_id: shopId });

            // Open the Meta OAuth popup
            const popup = window.open(oauth_url, "meta_oauth", "width=600,height=700,scrollbars=yes,resizable=yes");
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", opacity: disabled ? 0.75 : 1 }}>
            {channelIconTile(channelKey, 36)}
            <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 14, color: "#0f172a", display: "block" }}>{label}</Text>
                <Text style={{ fontSize: 12, color: "#64748b" }}>{description}</Text>
            </div>
            {disabled ? (
                <Tag style={{ borderRadius: 999, margin: 0, color: "#94a3b8" }}>Coming soon</Tag>
            ) : (
                <Button size="small" loading={loading} onClick={handleConnect} style={{ borderRadius: 8 }}>
                    Connect
                </Button>
            )}
        </div>
    );
};

// ── WhatsApp Web connect flow (QR or phone pairing) ───────────────────────────

const WhatsAppConnectCard: React.FC<{ shopId: string; onSuccess: () => void }> = ({ shopId, onSuccess }) => {
    const { message: antMessage } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [showPanel, setShowPanel] = useState(false);
    const [method, setMethod] = useState<"qr" | "phone">("qr");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [qr, setQr] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("idle");

    const handleConnect = async () => {
        if (method === "phone" && phoneNumber.replace(/\D/g, "").length < 9) {
            antMessage.warning("Enter the shop's WhatsApp number with country code, e.g. 254712345678");
            return;
        }
        setLoading(true);
        setShowPanel(true);
        setStatus("starting");
        try {
            await startWhatsAppWeb(
                method === "phone"
                    ? { method: "phone", phoneNumber: phoneNumber.replace(/\D/g, ""), shop_id: shopId }
                    : { method: "qr", shop_id: shopId }
            );
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
            await disconnectWhatsAppWeb(shopId);
        } catch {
            /* ignore stop disconnect error */
        }
    };

    useEffect(() => {
        if (!showPanel) return;
        let stopped = false;
        const poll = async () => {
            try {
                const [qrData, codeData, statusData] = await Promise.allSettled([
                    getWhatsAppWebQR(shopId),
                    getWhatsAppWebPairingCode(shopId),
                    getWhatsAppWebStatus(shopId),
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
        return () => {
            stopped = true;
            clearInterval(interval);
        };
    }, [showPanel, shopId, onSuccess, antMessage]);

    // Where the person is in the linking process.
    const linked = ["authenticated", "loading", "ready"].includes(status);
    const codeShown = method === "qr" ? !!qr : !!pairingCode;
    const current = !showPanel ? 0 : linked ? 2 : codeShown ? 1 : 0;

    return (
        <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "linear-gradient(135deg,#f0fdf4 0%,#ffffff 70%)" }}>
                {channelIconTile("whatsapp", 42)}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 15, color: "#0f172a", display: "block" }}>WhatsApp</Text>
                    <Text style={{ fontSize: 12, color: "#64748b" }}>
                        Link the shop's WhatsApp like WhatsApp Web — chats, orders and bookings land in this inbox.
                    </Text>
                </div>
            </div>

            <div style={{ padding: "4px 16px 16px" }}>
                <Steps
                    size="small"
                    current={current}
                    style={{ margin: "10px 0 14px" }}
                    items={[
                        { title: "Start" },
                        { title: method === "qr" ? "Scan" : "Enter code" },
                        { title: "Connected" },
                    ]}
                />

                {showPanel ? (
                    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                        <div
                            style={{
                                padding: 12,
                                background: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: 14,
                                minWidth: 200,
                                minHeight: 200,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexDirection: "column",
                            }}
                        >
                            {linked ? (
                                <Space direction="vertical" align="center">
                                    <Spin />
                                    <Text style={{ fontSize: 12.5, color: WA_DARK }}>Linked — syncing chats…</Text>
                                </Space>
                            ) : method === "qr" ? (
                                qr ? (
                                    <QRCodeSVG value={qr} size={200} />
                                ) : (
                                    <Spin tip="Generating QR code…" />
                                )
                            ) : pairingCode ? (
                                <div style={{ textAlign: "center" }}>
                                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Your code</Text>
                                    <Text strong copyable style={{ fontSize: 26, letterSpacing: 4, color: "#0f172a" }}>
                                        {pairingCode}
                                    </Text>
                                </div>
                            ) : (
                                <Spin tip="Getting your code…" />
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <LinkInstructions method={method} />
                            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: status === "error" ? "#ef4444" : linked ? WA_GREEN : "#f59e0b",
                                        flexShrink: 0,
                                    }}
                                />
                                <Text style={{ fontSize: 12, color: "#475569" }}>{STATUS_TEXT[status] || status}</Text>
                            </div>
                            {method === "qr" && qr && !linked && (
                                <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                                    The code refreshes every ~20 seconds — that's normal.
                                </Text>
                            )}
                            <Button size="small" danger type="link" onClick={handleStop} style={{ padding: 0, marginTop: 8 }}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <Segmented
                            block
                            value={method}
                            onChange={(v) => setMethod(v as "qr" | "phone")}
                            options={[
                                { value: "qr", label: "Scan QR code", icon: <QrcodeOutlined /> },
                                { value: "phone", label: "Use phone number", icon: <MobileOutlined /> },
                            ]}
                            style={{ marginBottom: 12 }}
                        />
                        {method === "phone" ? (
                            <Input
                                size="large"
                                prefix={<Text type="secondary">+</Text>}
                                placeholder="254712345678"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                onPressEnter={handleConnect}
                                style={{ marginBottom: 12, borderRadius: 10 }}
                            />
                        ) : (
                            <Paragraph style={{ fontSize: 12.5, color: "#64748b", marginBottom: 12 }}>
                                Have the shop's phone ready — you'll scan a QR code from WhatsApp → Linked devices.
                            </Paragraph>
                        )}
                        <Button
                            type="primary"
                            block
                            size="large"
                            icon={<LinkOutlined />}
                            loading={loading}
                            onClick={handleConnect}
                            className="omni-btn-tint"
                            style={{ ...tintStyle(WA_GREEN), background: WA_GREEN, borderColor: WA_GREEN, borderRadius: 10, fontWeight: 600 }}
                        >
                            {loading ? "Starting…" : "Connect WhatsApp"}
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

// ── Main Drawer ───────────────────────────────────────────────────────────────

const ConnectChannelDrawer: React.FC<Props> = ({ open, onClose, onSuccess, shopId }) => {
    const queryClient = useQueryClient();
    const isMobile = !Grid.useBreakpoint().md;
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

    // The DB "Active" flag only reflects that a WhatsApp channel was set up
    // at some point — poll the live client status too, so a session that got
    // logged out (needs a fresh QR scan) doesn't keep showing as "Active".
    const { data: liveWaStatus } = useQuery({
        queryKey: ["whatsapp-web-live-status", shopId],
        queryFn: () => getWhatsAppWebStatus(shopId),
        enabled: open && channelsByType.whatsapp.length > 0,
        refetchInterval: 10000,
    });
    const liveWhatsappReady: boolean | undefined = liveWaStatus?.ready;

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
        queryClient.invalidateQueries({ queryKey: ["whatsapp-web-live-status"] });
        onSuccess();
    };

    const health = (key: string): Health => {
        if (key !== "whatsapp") return channelsByType[key].length ? "live" : "soon";
        if (!channelsByType.whatsapp.length) return "off";
        return liveWhatsappReady === false ? "reconnect" : "live";
    };
    const liveCount = (["whatsapp", "messenger", "instagram"] as const).filter((k) => health(k) === "live").length;
    const hasWhatsapp = channelsByType.whatsapp.length > 0;

    const header = (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        flexShrink: 0,
                    }}
                >
                    <LinkOutlined style={{ fontSize: 17, color: C.primary }} />
                </div>
                <div style={{ minWidth: 0 }}>
                    <Text strong style={{ fontSize: 15, color: "#0f172a", display: "block" }}>Connect Channels</Text>
                    <Text style={{ fontSize: 11.5, color: "#64748b" }}>
                        {liveCount ? `${liveCount} channel${liveCount === 1 ? "" : "s"} live` : "Bring your customer chats into one inbox"}
                    </Text>
                </div>
            </div>
            <Button size="small" type="text" onClick={onClose} style={{ color: "#64748b", fontWeight: 600, fontSize: 13 }}>
                ✕
            </Button>
        </div>
    );

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={isMobile ? "100%" : 500}
            closeIcon={null}
            title={header}
            destroyOnClose
            styles={{
                body: { background: "#f8fafc", padding: 16 },
                header: { padding: "12px 16px", background: "#ffffff", borderBottom: "1px solid #eef2f6" },
            }}
        >
            {channelsLoading ? (
                <div style={{ textAlign: "center", padding: 80 }}>
                    <Spin size="large" />
                </div>
            ) : (
                <>
                    {/* At-a-glance status */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                        {(["whatsapp", "messenger", "instagram"] as const).map((key) => {
                            const hh = HEALTH[health(key)];
                            return (
                                <div key={key} style={{ ...cardStyle, padding: "10px 8px", textAlign: "center" }}>
                                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>{channelIconTile(key, 30)}</div>
                                    <Text style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block" }}>
                                        {CHANNEL_CONFIG[key]?.label}
                                    </Text>
                                    <Text style={{ fontSize: 10.5, color: hh.color, fontWeight: 600 }}>● {hh.label}</Text>
                                </div>
                            );
                        })}
                    </div>

                    {sectionLabel("WhatsApp")}
                    {hasWhatsapp ? (
                        channelsByType.whatsapp.map((ch) => (
                            <ConnectedCard
                                key={ch._id}
                                channel={ch}
                                channelType="whatsapp"
                                onDisconnect={(id) => disconnectMutation.mutate(id)}
                                disconnecting={disconnectingId === ch._id}
                                liveWhatsappReady={liveWhatsappReady}
                                onReconnected={handleConnectSuccess}
                            />
                        ))
                    ) : (
                        <WhatsAppConnectCard shopId={shopId} onSuccess={handleConnectSuccess} />
                    )}

                    {(channelsByType.messenger.length > 0 || channelsByType.instagram.length > 0) && (
                        <>
                            {sectionLabel("Connected social accounts")}
                            {(["messenger", "instagram"] as const).map((key) =>
                                channelsByType[key].map((ch) => (
                                    <ConnectedCard
                                        key={ch._id}
                                        channel={ch}
                                        channelType={key}
                                        onDisconnect={(id) => disconnectMutation.mutate(id)}
                                        disconnecting={disconnectingId === ch._id}
                                        onReconnected={handleConnectSuccess}
                                    />
                                ))
                            )}
                        </>
                    )}

                    {sectionLabel("More channels")}
                    <div style={cardStyle}>
                        <OAuthChannelRow
                            channelKey="messenger"
                            label="Facebook Messenger"
                            description="Chat with customers who message your Facebook Page"
                            shopId={shopId}
                            onSuccess={handleConnectSuccess}
                            disabled
                        />
                        <div style={{ height: 1, background: "#f1f5f9", margin: "0 14px" }} />
                        <OAuthChannelRow
                            channelKey="instagram"
                            label="Instagram DMs"
                            description="Reply to Instagram direct messages from this inbox"
                            shopId={shopId}
                            onSuccess={handleConnectSuccess}
                            disabled
                        />
                    </div>

                    {/* Accurate privacy note for how each channel connects */}
                    <div
                        style={{
                            marginTop: 16,
                            padding: "12px 14px",
                            background: "#fff",
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            display: "flex",
                            gap: 10,
                        }}
                    >
                        <LockOutlined style={{ color: "#16a34a", marginTop: 3 }} />
                        <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                            <b style={{ color: "#0f172a" }}>Private and secure.</b> WhatsApp connects as a linked device —
                            the same way WhatsApp Web does — and you can unlink it any time from the phone or here. Keep
                            the phone connected to the internet now and then so the session stays active.
                        </Text>
                    </div>
                </>
            )}
        </Drawer>
    );
};

export default ConnectChannelDrawer;
