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
    Form,
    Alert,
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
    AudioOutlined,
    EnvironmentOutlined,
    ThunderboltOutlined,
    MessageOutlined,
    WarningOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
    fetchMessages,
    sendTextMessage,
    sendTemplateMessage,
    sendMediaMessage,
    assignConversation,
    updateConversationStatus,
    markConversationAsRead,
} from "@services/whatsappService";
import {
    Conversation,
    ConversationStatus,
    CHANNEL_CONFIG,
    STATUS_CONFIG,
} from "./OmnichannelInboxPage";

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

// ── Custom Message Modal ──────────────────────────────────────────────────

const CustomMessageModal: React.FC<{
    open: boolean;
    onClose: () => void;
    onSend: (message: string) => void;
    loading: boolean;
    isWindowOpen: boolean;
}> = ({ open, onClose, onSend, loading, isWindowOpen }) => {
    const [message, setMessage] = useState("");

    const handleSend = () => {
        if (message.trim()) {
            onSend(message);
            setMessage("");
        }
    };

    return (
        <Modal
            title={
                <Space>
                    <MessageOutlined />
                    <span>Send Message</span>
                    {!isWindowOpen && (
                        <Tag color="orange" icon={<WarningOutlined />}>
                            Will use template
                        </Tag>
                    )}
                </Space>
            }
            open={open}
            onCancel={onClose}
            onOk={handleSend}
            confirmLoading={loading}
            okText="Send"
            width={500}
        >
            {!isWindowOpen && (
                <Alert
                    message="24-hour window closed"
                    description="Your message will be sent as a template. The customer will receive it and the conversation window will reopen."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}
            <Form layout="vertical">
                <Form.Item label="Message" required>
                    <TextArea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message here..."
                        autoSize={{ minRows: 3, maxRows: 8 }}
                        onPressEnter={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                                handleSend();
                            }
                        }}
                    />
                    <div style={{ fontSize: 11, color: "#bfbfbf", marginTop: 4 }}>
                        Press Ctrl+Enter to send
                    </div>
                </Form.Item>
            </Form>
        </Modal>
    );
};

// ── Template Selection Modal ──────────────────────────────────────────────────

const TemplateModal: React.FC<{
    open: boolean;
    onClose: () => void;
    onSend: (templateName: string, params: string[]) => void;
    loading: boolean;
}> = ({ open, onClose, onSend, loading }) => {
    const [templateName, setTemplateName] = useState("hello_world");
    const [params, setParams] = useState<string[]>([]);

    const templates = [
        { name: "hello_world", label: "Hello World", params: [] },
        { name: "order_confirmation", label: "Order Confirmation", params: ["order_number"] },
        { name: "shipping_update", label: "Shipping Update", params: ["tracking_number"] },
        { name: "payment_received", label: "Payment Received", params: ["amount"] },
        { name: "support_message", label: "Support Message", params: ["issue"] },
    ];

    const selectedTemplate = templates.find(t => t.name === templateName);

    const handleSend = () => {
        onSend(templateName, params);
        setTemplateName("hello_world");
        setParams([]);
    };

    return (
        <Modal
            title="Send Template Message"
            open={open}
            onCancel={onClose}
            onOk={handleSend}
            confirmLoading={loading}
            okText="Send Template"
            width={500}
        >
            <Form layout="vertical">
                <Form.Item label="Template" required>
                    <Select
                        value={templateName}
                        onChange={setTemplateName}
                        options={templates.map(t => ({ label: t.label, value: t.name }))}
                    />
                </Form.Item>
                {selectedTemplate?.params.map((param, index) => (
                    <Form.Item key={param} label={param.replace("_", " ").toUpperCase()}>
                        <Input
                            placeholder={`Enter ${param}`}
                            onChange={(e) => {
                                const newParams = [...params];
                                newParams[index] = e.target.value;
                                setParams(newParams);
                            }}
                        />
                    </Form.Item>
                ))}
            </Form>
        </Modal>
    );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending: <span style={{ fontSize: 10, color: "#bfbfbf" }}>⏳</span>,
    sent: <CheckOutlined style={{ fontSize: 10, color: "#bfbfbf" }} />,
    delivered: <span style={{ fontSize: 10, color: "#bfbfbf" }}>✓✓</span>,
    read: <span style={{ fontSize: 10, color: "#53bdeb" }}>✓✓</span>,
    failed: <CloseCircleOutlined style={{ fontSize: 10, color: "#ff4d4f" }} />,
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
                        {msg.content && <span>{msg.content}</span>}
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
                return <span>{msg.content}</span>;
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
                        <div style={{ marginTop: 4, fontSize: 12 }}>{msg.content}</div>
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
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [isAutoScroll, setIsAutoScroll] = useState(true);

    const [text, setText] = useState("");
    const [page, setPage] = useState(1);
    const [allMessages, setAllMessages] = useState<Message[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [customMessageOpen, setCustomMessageOpen] = useState(false);

    const cfg = CHANNEL_CONFIG[conversation.channel];
    const statusCfg = STATUS_CONFIG[conversation.status];
    const isWhatsApp = conversation.channel === "whatsapp";
    const windowOpen = conversation.is_window_open;

    // ── Fetch messages (oldest first, then we'll reverse for display) ─────────

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["messages", conversation._id, page],
        queryFn: () => fetchMessages(conversation._id, { page, limit: 30 }),
        enabled: !!conversation._id,
        refetchInterval: 8000,
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
            if (error?.response?.data?.window_expired) {
                antMessage.warning("24hr window expired. Sending as template instead.");
                sendAsTemplate(text.trim());
            } else {
                antMessage.error("Failed to send message");
            }
        },
    });

    // ── Send custom message as template ────────────────────────────────────────

    const customTemplateMutation = useMutation({
        mutationFn: (message: string) =>
            sendTemplateMessage({
                conversation_id: conversation._id,
                template_name: "hello_world",
                language_code: "en_US",
                template_params: [message],
            }),
        onSuccess: () => {
            antMessage.success("Message sent successfully via template");
            setCustomMessageOpen(false);
            refetch();
            onMessageSent();
            onConversationUpdate();
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        },
        onError: () => {
            antMessage.error("Failed to send message. Please try a different template.");
        },
    });

    // ── Send as template function ──────────────────────────────────────────────

    const sendAsTemplate = (message: string) => {
        customTemplateMutation.mutate(message);
    };

    // ── Send template message ──────────────────────────────────────────────────

    const templateMutation = useMutation({
        mutationFn: ({ templateName, templateParams }: { templateName: string; templateParams: string[] }) =>
            sendTemplateMessage({
                conversation_id: conversation._id,
                template_name: templateName,
                language_code: "en_US",
                template_params: templateParams,
            }),
        onSuccess: () => {
            antMessage.success("Template message sent successfully");
            setTemplateModalOpen(false);
            refetch();
            onMessageSent();
            onConversationUpdate();
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        },
        onError: () => {
            antMessage.error("Failed to send template message");
        },
    });

    const handleSend = () => {
        if (!text.trim()) return;

        if (isWhatsApp && !windowOpen) {
            setCustomMessageOpen(true);
        } else {
            sendMutation.mutate();
        }
    };

    const handleSendCustomMessage = (message: string) => {
        sendAsTemplate(message);
        setText("");
    };

    const handleSendTemplate = (templateName: string, params: string[]) => {
        templateMutation.mutate({ templateName, templateParams: params });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (isWhatsApp && !windowOpen && text.trim()) {
                setCustomMessageOpen(true);
            } else if (text.trim()) {
                sendMutation.mutate();
            }
        }
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
                        {isWhatsApp && (
                            <Tooltip
                                title={
                                    windowOpen
                                        ? "24hr window open - can send text messages"
                                        : "24hr window closed - messages will be sent as templates"
                                }
                            >
                                <Tag
                                    style={{ cursor: "default", fontSize: 11 }}
                                    color={windowOpen ? "success" : "orange"}
                                >
                                    {windowOpen ? "Window Open" : "Template Mode"}
                                </Tag>
                            </Tooltip>
                        )}
                        <Button
                            size="small"
                            icon={<ThunderboltOutlined />}
                            onClick={() => setTemplateModalOpen(true)}
                            type="primary"
                            ghost
                        >
                            Templates
                        </Button>
                        <Dropdown menu={statusMenu} trigger={["click"]}>
                            <Button size="small" icon={<DownOutlined />}>
                                {conversation.status.charAt(0).toUpperCase() +
                                    conversation.status.slice(1)}
                            </Button>
                        </Dropdown>
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
                    {isWhatsApp && !windowOpen && (
                        <Alert
                            message="Template Mode Active"
                            description="Messages will be sent as templates to bypass the 24-hour window restriction."
                            type="info"
                            showIcon
                            style={{ marginBottom: 8 }}
                            action={
                                <Button
                                    size="small"
                                    type="primary"
                                    ghost
                                    onClick={() => setTemplateModalOpen(true)}
                                >
                                    Browse Templates
                                </Button>
                            }
                        />
                    )}

                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                        <Tooltip title="Send as template">
                            <Button
                                icon={<ThunderboltOutlined />}
                                size="small"
                                type="text"
                                onClick={() => setTemplateModalOpen(true)}
                                style={{ color: "#faad14", marginBottom: 2 }}
                            />
                        </Tooltip>

                        <TextArea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                isWhatsApp && !windowOpen
                                    ? "Type your message... (will be sent as template)"
                                    : "Type a message… (Enter to send, Shift+Enter for new line)"
                            }
                            autoSize={{ minRows: 1, maxRows: 5 }}
                            style={{ flex: 1, borderRadius: 8, resize: "none" }}
                        />

                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={handleSend}
                            loading={sendMutation.isPending || customTemplateMutation.isPending}
                            disabled={!text.trim()}
                            style={{
                                background: cfg?.color || primaryColor,
                                borderColor: cfg?.color || primaryColor,
                                borderRadius: 8,
                                marginBottom: 2,
                            }}
                        >
                            Send
                        </Button>
                    </div>
                </div>
            </div>

            {/* Custom Message Modal (for closed window) */}
            <CustomMessageModal
                open={customMessageOpen}
                onClose={() => setCustomMessageOpen(false)}
                onSend={handleSendCustomMessage}
                loading={customTemplateMutation.isPending}
                isWindowOpen={windowOpen}
            />

            {/* Template Modal */}
            <TemplateModal
                open={templateModalOpen}
                onClose={() => setTemplateModalOpen(false)}
                onSend={handleSendTemplate}
                loading={templateMutation.isPending}
            />
        </>
    );
};

export default MessageThread;