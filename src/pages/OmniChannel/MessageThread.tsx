import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Avatar,
    Badge,
    Button,
    Divider,
    Dropdown,
    Input,
    MenuProps,
    Modal,
    Select,
    Space,
    Spin,
    Tag,
    Tooltip,
    Typography,
    Upload,
    App,
} from "antd";
import {
    CheckOutlined,
    CloseCircleOutlined,
    DownOutlined,
    FileOutlined,
    MoreOutlined,
    PaperClipOutlined,
    SendOutlined,
    UserOutlined,
    UserAddOutlined,
    AudioOutlined,
    EnvironmentOutlined,
    ThunderboltOutlined,
    MessageOutlined,
    CloseOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
    fetchMessages,
    sendTextMessage,
    sendMediaMessage,
    suggestReply,
    convertConversationToCustomer,
    convertConversationToLead,
    assignConversation,
    updateConversationStatus,
    markConversationAsRead,
    fetchAgents,
    handoverConversation,
} from "@services/whatsappService";
import {
    Conversation,
    ConversationStatus,
    CHANNEL_CONFIG,
    STATUS_CONFIG,
} from "./OmnichannelInboxPage";
import ScriptsManager from "./ScriptsManager";

const { Text } = Typography;
const { TextArea } = Input;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
    _id: string;
    conversation_id: string;
    direction: "inbound" | "outbound";
    message_type: string;
    content: string;
    media_url?: string;
    media_filename?: string;
    media_mime_type?: string;
    template_name?: string;
    status: "pending" | "sent" | "delivered" | "read" | "received" | "failed";
    meta_message_id?: string;
    sent_by?: { _id: string; fullname: string; thumbnail?: string };
    location?: { latitude: number; longitude: number; name?: string; address?: string };
    reaction?: { emoji: string; message_id: string };
    createdAt: string;
}

interface Props {
    conversation: Conversation;
    shopId: string;
    primaryColor: string;
    onMessageSent: () => void;
    onConversationUpdate: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending: <span style={{ fontSize: 10, color: "#bfbfbf" }}>⏳</span>,
    sent: <CheckOutlined style={{ fontSize: 10, color: "#bfbfbf" }} />,
    delivered: <span style={{ fontSize: 10, color: "#bfbfbf" }}>✓✓</span>,
    read: <span style={{ fontSize: 10, color: "#53bdeb" }}>✓✓</span>,
    failed: <CloseCircleOutlined style={{ fontSize: 10, color: "#ff4d4f" }} />,
};

// ── Text formatting ───────────────────────────────────────────────────────────

const FormattedText: React.FC<{ text?: string }> = ({ text }) => {
    if (!text) return null;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {text.split("\n").map((line, i) => {
                const bullet = line.match(/^(\s*)[-*]\s+(.*)$/);
                const numbered = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
                if (bullet) {
                    return (
                        <div key={i} style={{ paddingLeft: 10, textIndent: -8 }}>
                            • {bullet[2]}
                        </div>
                    );
                }
                if (numbered) {
                    return (
                        <div key={i} style={{ paddingLeft: 10, textIndent: -8 }}>
                            {numbered[2]}. {numbered[3]}
                        </div>
                    );
                }
                return <div key={i}>{line}</div>;
            })}
        </div>
    );
};

// ── Message Bubble ────────────────────────────────────────────────────────────

const MessageBubble: React.FC<{ msg: Message; channelColor: string }> = ({
    msg,
    channelColor,
}) => {
    const isOut = msg.direction === "outbound";

    const bubbleStyle: React.CSSProperties = {
        maxWidth: "68%",
        padding: "8px 12px",
        borderRadius: isOut ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
        background: isOut ? channelColor : "#f0f0f0",
        color: isOut ? "#fff" : "#262626",
        fontSize: 13,
        lineHeight: "1.5",
        wordBreak: "break-word",
        position: "relative",
    };

    const renderContent = () => {
        switch (msg.message_type) {
            case "image":
                return msg.media_url ? (
                    <img
                        src={msg.media_url}
                        alt="media"
                        style={{
                            maxWidth: 220,
                            maxHeight: 220,
                            borderRadius: 8,
                            display: "block",
                            marginBottom: msg.content ? 6 : 0,
                        }}
                    />
                ) : null;

            case "video":
                return msg.media_url ? (
                    <video
                        src={msg.media_url}
                        controls
                        style={{
                            maxWidth: 220,
                            maxHeight: 220,
                            borderRadius: 8,
                            display: "block",
                        }}
                    />
                ) : (
                    <Text style={{ color: isOut ? "rgba(255,255,255,0.7)" : "#8c8c8c" }}>
                        Video message
                    </Text>
                );

            case "document":
                return (
                    <a
                        href={msg.media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            color: isOut ? "#fff" : "#1677ff",
                            textDecoration: "none",
                        }}
                    >
                        <FileOutlined style={{ fontSize: 18 }} />
                        <span style={{ fontSize: 12 }}>
                            {msg.media_filename || "Document"}
                        </span>
                    </a>
                );

            case "audio":
                return msg.media_url ? (
                    <audio controls style={{ maxWidth: 220, height: 36 }}>
                        <source src={msg.media_url} type={msg.media_mime_type} />
                    </audio>
                ) : (
                    <Space>
                        <AudioOutlined />
                        <Text style={{ color: isOut ? "#fff" : undefined }}>
                            Audio message
                        </Text>
                    </Space>
                );

            case "location":
                return (
                    <a
                        href={`https://maps.google.com/?q=${msg.location?.latitude},${msg.location?.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            color: isOut ? "#fff" : "#1677ff",
                            textDecoration: "none",
                        }}
                    >
                        <EnvironmentOutlined style={{ fontSize: 16 }} />
                        <span style={{ fontSize: 12 }}>
                            {msg.location?.name || "Location shared"}
                        </span>
                    </a>
                );

            case "reaction":
                return (
                    <span style={{ fontSize: 22 }}>{msg.reaction?.emoji || "👍"}</span>
                );

            case "template":
                return (
                    <Space direction="vertical" size={2}>
                        <Tag
                            icon={<ThunderboltOutlined />}
                            color="blue"
                            style={{ fontSize: 10 }}
                        >
                            {msg.template_name || "Template"}
                        </Tag>
                        {msg.content && <FormattedText text={msg.content} />}
                    </Space>
                );

            case "unsupported":
                return (
                    <Text
                        style={{
                            fontSize: 12,
                            fontStyle: "italic",
                            color: isOut ? "rgba(255,255,255,0.7)" : "#8c8c8c",
                        }}
                    >
                        Unsupported message type
                    </Text>
                );

            default:
                return <FormattedText text={msg.content} />;
        }
    };

    return (
        <div
            style={{
                display: "flex",
                justifyContent: isOut ? "flex-end" : "flex-start",
                marginBottom: 6,
                alignItems: "flex-end",
                gap: 6,
            }}
        >
            {!isOut && (
                <Avatar
                    size={24}
                    icon={<UserOutlined />}
                    style={{ flexShrink: 0, marginBottom: 2 }}
                />
            )}

            <div style={bubbleStyle}>
                {renderContent()}
                {["image", "document", "video"].includes(msg.message_type) &&
                    msg.content && (
                        <div style={{ marginTop: 4, fontSize: 12 }}>
                            <FormattedText text={msg.content} />
                        </div>
                    )}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: 3,
                        marginTop: 3,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 10,
                            color: isOut ? "rgba(255,255,255,0.65)" : "#bfbfbf",
                        }}
                    >
                        {dayjs(msg.createdAt).format("HH:mm")}
                    </Text>
                    {isOut && STATUS_ICONS[msg.status]}
                </div>
            </div>

            {isOut && msg.sent_by && (
                <Tooltip title={msg.sent_by.fullname}>
                    <Avatar
                        size={24}
                        src={msg.sent_by.thumbnail}
                        icon={<UserOutlined />}
                        style={{ flexShrink: 0, marginBottom: 2 }}
                    />
                </Tooltip>
            )}
        </div>
    );
};

// ── Date Separator ────────────────────────────────────────────────────────────

const DateSeparator: React.FC<{ date: string }> = ({ date }) => (
    <Divider plain style={{ fontSize: 11, color: "#bfbfbf", margin: "8px 0" }}>
        {dayjs(date).isSame(dayjs(), "day")
            ? "Today"
            : dayjs(date).isSame(dayjs().subtract(1, "day"), "day")
                ? "Yesterday"
                : dayjs(date).format("DD MMM YYYY")}
    </Divider>
);

// ── Main Component ────────────────────────────────────────────────────────────

const MessageThread: React.FC<Props> = ({
    conversation,
    shopId,
    primaryColor,
    onMessageSent,
    onConversationUpdate,
}) => {
    const { message: antMessage } = App.useApp();
    const queryClient = useQueryClient();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: agentsData } = useQuery({
        queryKey: ["omnichannel-agents", shopId],
        queryFn: () => fetchAgents({ shop_id: shopId }),
        enabled: !!shopId,
        staleTime: 30_000,
    });

    const handoverMutation = useMutation({
        mutationFn: (agentId: string) => handoverConversation(conversation._id, agentId),
        onSuccess: () => {
            antMessage.success("Conversation handed over");
            onConversationUpdate();
            queryClient.invalidateQueries({ queryKey: ["omnichannel-agents"] });
        },
        onError: (error: any) => {
            antMessage.error(error?.response?.data?.message || "Could not hand over");
        },
    });

    const agents = agentsData?.agents || [];
    const currentAgent = agents.find((a) => a._id === conversation.assigned_to?._id);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [isAutoScroll, setIsAutoScroll] = useState(true);

    const [text, setText] = useState("");
    const [page, setPage] = useState(1);
    const [allMessages, setAllMessages] = useState<Message[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [sendingMedia, setSendingMedia] = useState(false);
    const [convertOpen, setConvertOpen] = useState(false);
    const [convertType, setConvertType] = useState<"customer" | "lead" | null>(null);
    const [convertName, setConvertName] = useState(conversation.external_contact_name || "");
    const [scriptsOpen, setScriptsOpen] = useState(false);

    const cfg = CHANNEL_CONFIG[conversation.channel];
    const statusCfg = STATUS_CONFIG[conversation.status];

    // ── Fetch messages (oldest first, then we'll reverse for display) ─────────

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["messages", conversation._id, page],
        queryFn: () => fetchMessages(conversation._id, { page, limit: 30 }),
        enabled: !!conversation._id,
        refetchInterval: 8000,
        refetchOnMount: "always",
        staleTime: 0,
    });

    // Handle pagination - load older messages (append to top)
    useEffect(() => {
        if (data?.messages) {
            // API returns messages from oldest to newest per page
            // For page 1: messages [1-30] (oldest first)
            // For page 2: messages [31-60] (older messages)

            if (page === 1) {
                // First page: store as is (oldest to newest)
                setAllMessages(data.messages);
            } else {
                // Load more: prepend older messages to the beginning
                setAllMessages(prev => [...data.messages, ...prev]);
            }
            setHasMore(data.hasMore);
            setIsLoadingMore(false);
        }
    }, [data, page]);

    // Reset when conversation changes
    useEffect(() => {
        setPage(1);
        setAllMessages([]);
        setHasMore(true);
        setText("");
        setIsAutoScroll(true);
    }, [conversation._id]);

    // Scroll to bottom when new messages arrive (only if auto-scroll is enabled)
    useEffect(() => {
        if (isAutoScroll && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [allMessages, isAutoScroll]);

    // Mark as read when conversation is opened
    useEffect(() => {
        if (conversation.unread_count > 0) {
            markConversationAsRead(conversation._id).catch(() => { });
        }
    }, [conversation._id, conversation.unread_count]);

    // Handle scroll to detect when user scrolls up to load more
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const isAtTop = target.scrollTop === 0;

        // Check if user is at the bottom (within 100px)
        const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
        setIsAutoScroll(isAtBottom);

        // Load more messages when scrolling to top
        if (isAtTop && hasMore && !isLoadingMore && page > 0) {
            setIsLoadingMore(true);
            setPage(prev => prev + 1);
        }
    }, [hasMore, isLoadingMore, page]);

    // ── Send text message ──────────────────────────────────────────────────────

    const sendMutation = useMutation({
        mutationFn: () =>
            sendTextMessage({
                conversation_id: conversation._id,
                content: text.trim(),
            }),
        onSuccess: () => {
            setText("");
            refetch();
            onMessageSent();
            onConversationUpdate();
            // Scroll to bottom after sending
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        },
        onError: (error: any) => {
            antMessage.error(error?.response?.data?.message || "Failed to send message");
        },
    });

    // ── AI reply suggestion ──────────────────────────────────────────────────────

    const suggestMutation = useMutation({
        mutationFn: () => suggestReply({ conversation_id: conversation._id, shop_id: shopId }),
        onSuccess: (data: any) => {
            if (data?.result) setText(data.result);
        },
        onError: (error: any) => {
            antMessage.error(error?.response?.data?.message || "Could not get AI suggestion");
        },
    });

    const handleSend = () => {
        if (!text.trim()) return;
        sendMutation.mutate();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (text.trim()) {
                sendMutation.mutate();
            }
        }
    };

    const handleSendMedia = async (file: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const media_url = e.target?.result as string;
            if (!media_url) return;
            const media_type = file.type.startsWith("image/")
                ? "image"
                : file.type.startsWith("video/")
                    ? "video"
                    : "document";
            setSendingMedia(true);
            const result = await sendMediaMessage({
                conversation_id: conversation._id,
                media_type,
                media_url,
                caption: "",
                filename: file.name,
            });
            setSendingMedia(false);
            if (result) {
                antMessage.success("Media sent");
                refetch();
                onMessageSent();
                onConversationUpdate();
            }
        };
        reader.readAsDataURL(file);
    };

    // ── Status update ──────────────────────────────────────────────────────────

    const statusMutation = useMutation({
        mutationFn: (status: ConversationStatus) =>
            updateConversationStatus(conversation._id, status),
        onSuccess: () => onConversationUpdate(),
    });

    const statusMenu: MenuProps = {
        items: (["open", "pending", "resolved", "closed"] as ConversationStatus[])
            .filter((s) => s !== conversation.status)
            .map((s) => ({
                key: s,
                label: (
                    <Space>
                        <Badge status={STATUS_CONFIG[s].badge} />
                        <span style={{ textTransform: "capitalize" }}>{s}</span>
                    </Space>
                ),
                onClick: () => statusMutation.mutate(s),
            })),
    };

    // ── Convert / Link ─────────────────────────────────────────────────────────

    const openConvert = (type: "customer" | "lead") => {
        setConvertName(conversation.external_contact_name || "");
        setConvertType(type);
        setConvertOpen(true);
    };

    const handleConvert = async () => {
        if (!convertName.trim() || !convertType) return;
        let result;
        if (convertType === "customer") {
            result = await convertConversationToCustomer({
                conversation_id: conversation._id,
                customer_name: convertName.trim(),
            });
        } else {
            result = await convertConversationToLead({
                conversation_id: conversation._id,
                lead_name: convertName.trim(),
            });
        }
        if (result) {
            antMessage.success(`${convertType === "customer" ? "Customer" : "Lead"} created and linked`);
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            queryClient.invalidateQueries({ queryKey: ["mteja-recent-customers"] });
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
            queryClient.invalidateQueries({ queryKey: ["mteja-recent-leads"] });
            onConversationUpdate();
        }
        setConvertOpen(false);
    };

    const convertMenu: MenuProps = {
        items: [
            { key: "customer", label: "Convert to Customer", icon: <UserAddOutlined />, onClick: () => openConvert("customer") },
            { key: "lead", label: "Convert to Lead", icon: <UserAddOutlined />, onClick: () => openConvert("lead") },
        ],
    };

    // ── Group messages by date ─────────────────────────────────────────────────

    const groupedMessages: { date: string; messages: Message[] }[] = [];
    allMessages.forEach((msg) => {
        const date = dayjs(msg.createdAt).format("YYYY-MM-DD");
        const last = groupedMessages[groupedMessages.length - 1];
        if (last && last.date === date) {
            last.messages.push(msg);
        } else {
            groupedMessages.push({ date, messages: [msg] });
        }
    });

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    background: "#fff",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "10px 16px",
                        borderBottom: "1px solid #f0f0f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexShrink: 0,
                    }}
                >
                    <Space size={10}>
                        <div style={{ position: "relative" }}>
                            <Avatar
                                size={36}
                                icon={<UserOutlined />}
                                style={{ background: cfg?.bg, color: cfg?.color }}
                            />
                            <span
                                style={{
                                    position: "absolute",
                                    bottom: -1,
                                    right: -1,
                                    width: 13,
                                    height: 13,
                                    borderRadius: "50%",
                                    background: cfg?.color,
                                    border: "2px solid #fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 7,
                                }}
                            >
                                {cfg?.icon}
                            </span>
                        </div>
                        <div>
                            <Text strong style={{ fontSize: 14, display: "block" }}>
                                {conversation.external_contact_name ||
                                    conversation.external_contact_id}
                            </Text>
                            <Space size={4}>
                                <Badge status={statusCfg.badge} />
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {statusCfg.label}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    · {cfg?.label}
                                </Text>
                                {conversation.external_contact_phone && (
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        · {conversation.external_contact_phone}
                                    </Text>
                                )}
                            </Space>
                        </div>
                    </Space>

                    <Space>
                        {conversation.assigned_to && (
                            <Tooltip title={`Assigned to ${conversation.assigned_to.fullname}`}>
                                <Tag size="small" icon={<UserOutlined />}>
                                    {conversation.assigned_to.fullname}
                                </Tag>
                            </Tooltip>
                        )}
                        <Select
                            size="small"
                            placeholder="Handover to…"
                            value={conversation.assigned_to?._id || undefined}
                            onChange={(value: string) => {
                                if (value && value !== conversation.assigned_to?._id) {
                                    handoverMutation.mutate(value);
                                }
                            }}
                            loading={handoverMutation.isPending}
                            showSearch
                            style={{ minWidth: 150 }}
                            options={agents.map((agent) => ({
                                value: agent._id,
                                label: `${agent.fullname} (${agent.open_conversations})`,
                                disabled: agent._id === conversation.assigned_to?._id,
                            }))}
                        />
                        <Button size="small" onClick={() => setScriptsOpen(true)}>
                            Scripts
                        </Button>
                        <Dropdown menu={convertMenu} trigger={["click"]}>
                            <Button size="small" icon={<UserAddOutlined />}>
                                Convert
                            </Button>
                        </Dropdown>
                        <Dropdown menu={statusMenu} trigger={["click"]}>
                            <Button size="small" icon={<DownOutlined />}>
                                {conversation.status.charAt(0).toUpperCase() +
                                    conversation.status.slice(1)}
                            </Button>
                        </Dropdown>
                        <Button
                            size="small"
                            icon={<CloseOutlined />}
                            disabled={conversation.status === "closed"}
                            loading={statusMutation.isPending}
                            onClick={() => statusMutation.mutate("closed")}
                        >
                            Close
                        </Button>
                    </Space>
                </div>

                {/* Messages Container - with scroll handling */}
                <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "12px 16px",
                        background: "#fafafa",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* Loading indicator for older messages */}
                    {isLoadingMore && (
                        <div style={{ textAlign: "center", marginBottom: 12 }}>
                            <Spin size="small" />
                            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                                Loading older messages...
                            </Text>
                        </div>
                    )}

                    {/* No more messages indicator */}
                    {!hasMore && allMessages.length > 0 && (
                        <div style={{ textAlign: "center", marginBottom: 12 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                ─── Beginning of conversation ───
                            </Text>
                        </div>
                    )}

                    {isLoading && page === 1 ? (
                        <div style={{ textAlign: "center", padding: 40 }}>
                            <Spin />
                        </div>
                    ) : groupedMessages.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 40, color: "#bfbfbf" }}>
                            <MessageOutlined style={{ fontSize: 48, marginBottom: 12 }} />
                            <div>No messages yet</div>
                            <div style={{ fontSize: 12, marginTop: 8 }}>
                                Send a message to start the conversation
                            </div>
                        </div>
                    ) : (
                        groupedMessages.map(({ date, messages }) => (
                            <div key={date}>
                                <DateSeparator date={date} />
                                {messages.map((msg) => (
                                    <MessageBubble
                                        key={msg._id}
                                        msg={msg}
                                        channelColor={cfg?.color || primaryColor}
                                    />
                                ))}
                            </div>
                        ))
                    )}

                    {/* Scroll anchor - always at bottom */}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div
                    style={{
                        padding: "10px 12px",
                        borderTop: "1px solid #f0f0f0",
                        flexShrink: 0,
                        background: "#fff",
                    }}
                >
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                        <Upload
                            accept="image/*,video/*"
                            showUploadList={false}
                            beforeUpload={(file) => {
                                handleSendMedia(file as File);
                                return false;
                            }}
                        >
                            <Button
                                icon={<PaperClipOutlined />}
                                size="large"
                                disabled={sendingMedia}
                                loading={sendingMedia}
                                style={{ height: 48, width: 48 }}
                            />
                        </Upload>

                        <div style={{ position: "relative", flex: 1 }}>
                            <TextArea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder=""
                                autoSize={{ minRows: 2, maxRows: 4 }}
                                style={{ 
                                    flex: 1, 
                                    borderRadius: 8, 
                                    resize: "none"
                                }}
                            />
                            {!text && (
                                <div style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    pointerEvents: "none",
                                    color: "#bfbfbf",
                                    fontSize: 14,
                                    userSelect: "none",
                                    width: "100%",
                                    textAlign: "center"
                                }}>
                                    Type a message… (Enter to send, Shift+Enter for new line)
                                </div>
                            )}
                        </div>

                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={handleSend}
                            loading={sendMutation.isPending || sendingMedia}
                            disabled={!text.trim()}
                            size="large"
                            style={{
                                background: cfg?.color || primaryColor,
                                borderColor: cfg?.color || primaryColor,
                                borderRadius: 8,
                                height: 48,
                            }}
                        >
                            Send
                        </Button>
                        <Tooltip title="AI suggestion">
                            <Button
                                icon={<ThunderboltOutlined />}
                                onClick={() => suggestMutation.mutate()}
                                loading={suggestMutation.isPending}
                                size="large"
                                style={{ height: 48, width: 48 }}
                            />
                        </Tooltip>
                    </div>
                </div>
            </div>

            <Modal
                title={convertType === "customer" ? "Convert to Customer" : "Convert to Lead"}
                open={convertOpen}
                onCancel={() => setConvertOpen(false)}
                onOk={handleConvert}
                okText="Convert"
                width={400}
            >
                <Input
                    value={convertName}
                    onChange={(e) => setConvertName(e.target.value)}
                    placeholder="Enter name"
                    onPressEnter={handleConvert}
                    style={{ marginTop: 8 }}
                />
            </Modal>

            <Modal
                title="Reply Scripts"
                open={scriptsOpen}
                onCancel={() => setScriptsOpen(false)}
                width={900}
                footer={null}
                destroyOnClose
            >
                <ScriptsManager
                    shopId={shopId}
                    readOnly
                />
            </Modal>
        </>
    );
};

export default MessageThread;