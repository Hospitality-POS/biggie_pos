import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    Avatar,
    Badge,
    Button,
    Divider,
    Dropdown,
    Empty,
    Grid,
    Input,
    List,
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
    PaperClipOutlined,
    SendOutlined,
    UserOutlined,
    UserAddOutlined,
    AudioOutlined,
    EnvironmentOutlined,
    ThunderboltOutlined,
    MessageOutlined,
    CloseOutlined,
    DeleteOutlined,
    ArrowLeftOutlined,
    MoreOutlined,
    FilePdfOutlined,
    FileSearchOutlined,
    PhoneOutlined,
    VideoCameraOutlined,
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
    updateConversationStatus,
    markConversationAsRead,
    fetchAgents,
    handoverConversation,
    deleteConversation,
} from "@services/whatsappService";
import { searchDocuments } from "@services/documents";
import { formatCurrency } from "@utils/formatters";
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
    context_message_id?: string;
    sent_by?: { _id: string; fullname: string; thumbnail?: string };
    location?: { latitude: number; longitude: number; name?: string; address?: string };
    reaction?: { emoji: string; message_id: string };
    createdAt: string;
}

interface SuggestedProduct {
    _id: string;
    name: string;
    // The exact catalog phrase the reply mentioned (variant name when a
    // variant was matched) — used to re-check mentions before sending.
    match_name?: string;
    price?: number | null;
    image_url?: string | null;
    source?: "product" | "inventory";
}

interface Props {
    conversation: Conversation;
    shopId: string;
    primaryColor: string;
    onMessageSent: () => void;
    onConversationUpdate: () => void;
    onConversationDeleted?: () => void;
    onBack?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending: <span style={{ fontSize: 10, color: "#bfbfbf" }}>⏳</span>,
    sent: <CheckOutlined style={{ fontSize: 10, color: "#bfbfbf" }} />,
    delivered: <span style={{ fontSize: 10, color: "#bfbfbf" }}>✓✓</span>,
    read: <span style={{ fontSize: 10, color: "#53bdeb" }}>✓✓</span>,
    failed: <CloseCircleOutlined style={{ fontSize: 10, color: "#ff4d4f" }} />,
};

// Mirrors the backend mention check: a suggested product's image is only sent
// if its name still appears in the message the agent actually sends.
const isProductMentioned = (text: string, name?: string): boolean => {
    const n = (name || "").trim();
    if (!text || n.length < 3) return false;
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\w])${escaped}([^\\w]|$)`, "i").test(text);
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

const MessageBubble: React.FC<{ msg: Message; channelColor: string; onReply?: (msg: Message) => void; isReplying?: boolean }> = ({
    msg,
    channelColor,
    onReply,
    isReplying,
}) => {
    const isOut = msg.direction === "outbound";

    const bubbleStyle: React.CSSProperties = {
        maxWidth: "85%",
        padding: "8px 12px",
        borderRadius: isOut ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
        background: isOut ? channelColor : "#f0f0f0",
        color: isOut ? "#fff" : "#262626",
        fontSize: 13,
        lineHeight: "1.5",
        wordBreak: "break-word",
        position: "relative",
        cursor: onReply ? "pointer" : "default",
        boxShadow: isReplying ? `0 0 0 2px ${channelColor}` : undefined,
        transition: "box-shadow 0.15s ease",
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

            case "call": {
                const callLink = msg.content?.match(/https:\/\/call\.whatsapp\.com\/\S+/)?.[0];
                const isVideo = /video/i.test(msg.content || "");
                return (
                    <Space size={6}>
                        {isVideo ? <VideoCameraOutlined /> : <PhoneOutlined />}
                        {callLink ? (
                            <a
                                href={callLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: isOut ? "#fff" : "#1677ff" }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {isOut ? "Tap to join the call" : msg.content}
                            </a>
                        ) : (
                            <span>{msg.content}</span>
                        )}
                    </Space>
                );
            }

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

            <div
                style={bubbleStyle}
                onClick={() => onReply?.(msg)}
                title={onReply ? "Click to reply" : undefined}
            >
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
    onConversationDeleted,
    onBack,
}) => {
    const { message: antMessage } = App.useApp();
    const queryClient = useQueryClient();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
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

    const agents: any[] = (agentsData?.agents || []) as any[];
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [isAutoScroll, setIsAutoScroll] = useState(true);

    const [text, setText] = useState("");
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    // Older messages loaded on-demand via "scroll up to load more" — kept
    // separate from the live latest-page poll below so that once a user has
    // scrolled up, new incoming/sent messages keep arriving instead of the
    // auto-refresh getting stuck re-polling an older, static page forever.
    const [historyPage, setHistoryPage] = useState(1);
    const [olderMessages, setOlderMessages] = useState<Message[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [sendingMedia, setSendingMedia] = useState(false);
    const [convertOpen, setConvertOpen] = useState(false);
    const [convertType, setConvertType] = useState<"customer" | "lead" | null>(null);
    const [convertName, setConvertName] = useState(conversation.external_contact_name || "");
    const [convertPhone, setConvertPhone] = useState(conversation.external_contact_phone || "");
    const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
    const [dispatchAgent, setDispatchAgent] = useState<string>("");
    const [scriptsOpen, setScriptsOpen] = useState(false);
    const [docModalOpen, setDocModalOpen] = useState(false);
    const [docSearch, setDocSearch] = useState("");
    const [docResults, setDocResults] = useState<any[]>([]);
    const [docLoading, setDocLoading] = useState(false);
    // Products the AI suggestion referenced that have an image — their photos
    // are attached to the reply so the customer sees what they are buying.
    const [suggestedProducts, setSuggestedProducts] = useState<SuggestedProduct[]>([]);


    const cfg = CHANNEL_CONFIG[conversation.channel];
    const statusCfg = STATUS_CONFIG[conversation.status];

    // ── Fetch messages ──────────────────────────────────────────────────────
    // Always poll page 1 (the newest 30 messages) on its own query key so new
    // messages keep syncing in real time regardless of how much history the
    // user has scrolled up to load.
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["messages", conversation._id, "latest"],
        queryFn: () => fetchMessages(conversation._id, { page: 1, limit: 30 }),
        enabled: !!conversation._id,
        refetchInterval: 5000,
        refetchOnMount: "always",
        staleTime: 0,
    });

    const latestMessages = data?.messages || [];
    const total = data?.total ?? 0;

    // Merge older (manually loaded) history with the live latest page,
    // de-duplicating by _id in case their ranges overlap.
    const allMessages = useMemo(() => {
        const merged = new Map<string, Message>();
        [...olderMessages, ...latestMessages].forEach((m) => merged.set(m._id, m));
        return Array.from(merged.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    }, [olderMessages, latestMessages]);

    useEffect(() => {
        setHasMore(total > allMessages.length);
    }, [total, allMessages.length]);

    // Load an older page of history and prepend it (doesn't affect the live poll above).
    const loadOlderMessages = useCallback(async () => {
        const nextPage = historyPage + 1;
        try {
            const result = await fetchMessages(conversation._id, { page: nextPage, limit: 30 });
            if (result?.messages?.length) {
                setOlderMessages((prev) => [...result.messages, ...prev]);
                setHistoryPage(nextPage);
            }
            if (result && !result.hasMore) setHasMore(false);
        } finally {
            setIsLoadingMore(false);
        }
    }, [conversation._id, historyPage]);

    // Reset when conversation changes
    useEffect(() => {
        setHistoryPage(1);
        setOlderMessages([]);
        setHasMore(true);
        setText("");
        setReplyingTo(null);
        setSuggestedProducts([]);
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
        if (isAtTop && hasMore && !isLoadingMore) {
            setIsLoadingMore(true);
            loadOlderMessages();
        }
    }, [hasMore, isLoadingMore, loadOlderMessages]);

    // ── Send text message ──────────────────────────────────────────────────────

    const sendMutation = useMutation({
        mutationFn: async (productsToSend: (SuggestedProduct & { image_url: string })[]) => {
            await sendTextMessage({
                conversation_id: conversation._id,
                content: text.trim(),
                context_message_id: replyingTo?._id,
            });
            // Send each suggested product's photo so the customer sees what
            // they are buying. Failures are toasted by sendMediaMessage — keep
            // going so one bad image doesn't block the rest.
            for (const p of productsToSend) {
                try {
                    await sendMediaMessage({
                        conversation_id: conversation._id,
                        media_type: "image",
                        media_url: p.image_url,
                        caption: p.price != null ? `${p.name} — ${formatCurrency(p.price)}` : p.name,
                    });
                } catch {
                    // continue with remaining product images
                }
            }
        },
        onSuccess: () => {
            setText("");
            setReplyingTo(null);
            setSuggestedProducts([]);
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
            setSuggestedProducts(
                (data?.suggested_products || []).filter((p: SuggestedProduct) => p.image_url)
            );
        },
        onError: (error: any) => {
            antMessage.error(error?.response?.data?.message || "Could not get AI suggestion");
        },
    });

    // Suggested products whose names still appear in the drafted text and that
    // have an image — these get sent as WhatsApp photos with the reply.
    const pendingProductImages = suggestedProducts
        .filter((p): p is SuggestedProduct & { image_url: string } =>
            !!p.image_url && isProductMentioned(text, p.match_name || p.name)
        )
        .slice(0, 5);

    const handleSend = () => {
        const content = text.trim();
        if (!content) return;
        // Only attach images for products still mentioned in the final text —
        // if the agent edited the suggestion to drop a product, its image
        // should not go out either.
        sendMutation.mutate(pendingProductImages);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
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
            try {
                const result = await sendMediaMessage({
                    conversation_id: conversation._id,
                    media_type,
                    media_url,
                    caption: "",
                    filename: file.name,
                    context_message_id: replyingTo?._id,
                });
                if (result) {
                    antMessage.success("Media sent");
                    setReplyingTo(null);
                    refetch();
                    onMessageSent();
                    onConversationUpdate();
                }
            } catch {
                // sendMediaMessage already toasts the error
            } finally {
                setSendingMedia(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // ── Suggest / send PDF documents from the Document Center ───────────────────

    const generateDocumentQuery = useCallback(() => {
        const textMessages = allMessages
            .filter((m) => m.content && m.message_type !== "template")
            .slice(-5);
        const query = textMessages.map((m) => m.content).join("\n").trim();
        return query || conversation.last_message_preview || "document";
    }, [allMessages, conversation.last_message_preview]);

    const handleSuggestDocuments = useCallback(async () => {
        const query = docSearch.trim() || generateDocumentQuery();
        if (!query) return;
        setDocLoading(true);
        try {
            const res = await searchDocuments({ q: query, mode: "ai", pageSize: 10 });
            const docs = (res.data || []).filter((d: any) => d.attachments?.length);
            setDocResults(docs);
        } catch {
            antMessage.error("Could not suggest documents");
        } finally {
            setDocLoading(false);
        }
    }, [docSearch, generateDocumentQuery]);

    const handleSendDocument = async (doc: any) => {
        const att = doc.attachments?.[0];
        if (!att?.file_url) return;
        setSendingMedia(true);
        try {
            const result = await sendMediaMessage({
                conversation_id: conversation._id,
                media_type: "document",
                media_url: att.file_url,
                caption: "",
                filename: att.file_name || doc.name || "document.pdf",
                context_message_id: replyingTo?._id,
            });
            if (result) {
                antMessage.success("Document sent");
                setReplyingTo(null);
                setDocModalOpen(false);
                refetch();
                onMessageSent();
                onConversationUpdate();
            }
        } catch {
            // sendMediaMessage already toasts the error
        } finally {
            setSendingMedia(false);
        }
    };

    // ── Status update ──────────────────────────────────────────────────────────

    const statusMutation = useMutation({
        mutationFn: ({ status, assignedTo }: { status: ConversationStatus; assignedTo?: string }) =>
            updateConversationStatus(conversation._id, status, assignedTo),
        onSuccess: () => onConversationUpdate(),
    });

    const statusMenu: MenuProps = {
        items: (["open", "pending", "pending_dispatch", "resolved", "closed"] as ConversationStatus[])
            .filter((s) => s !== conversation.status)
            .map((s) => ({
                key: s,
                label: (
                    <Space>
                        <Badge status={STATUS_CONFIG[s].badge} />
                        <span style={{ textTransform: "capitalize" }}>{s.replace(/_/g, " ")}</span>
                    </Space>
                ),
                onClick: () => {
                    if (s === "pending_dispatch") {
                        setDispatchAgent(conversation.assigned_to?._id || "");
                        setDispatchModalOpen(true);
                    } else {
                        statusMutation.mutate({ status: s });
                    }
                },
            })),
    };

    // ── Convert / Link ─────────────────────────────────────────────────────────

    const openConvert = (type: "customer" | "lead") => {
        setConvertName(conversation.external_contact_name || "");
        setConvertPhone(conversation.external_contact_phone || "");
        setConvertType(type);
        setConvertOpen(true);
    };

    const handleConvert = async () => {
        if (!convertName.trim() || !convertType) return;
        let result;
        if (convertType === "customer") {
            if (!conversation.external_contact_phone && !convertPhone.trim()) {
                antMessage.error("Phone number is required");
                return;
            }
            result = await convertConversationToCustomer({
                conversation_id: conversation._id,
                customer_name: convertName.trim(),
                phone: convertPhone.trim() || undefined,
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

    const handleMarkDispatch = () => {
        if (!dispatchAgent) return;
        statusMutation.mutate({ status: "pending_dispatch", assignedTo: dispatchAgent });
        setDispatchModalOpen(false);
    };

    // ── WhatsApp calls ─────────────────────────────────────────────────────────

    const showCallComingSoon = () => {
        antMessage.info("WhatsApp calls are coming soon");
    };

    const handleDelete = () => {
        Modal.confirm({
            title: "Delete conversation?",
            content: "This will permanently remove the conversation and all its messages.",
            okText: "Delete",
            okType: "danger",
            onOk: async () => {
                try {
                    await deleteConversation(conversation._id);
                    onConversationUpdate();
                    onConversationDeleted?.();
                } catch {
                    // Error already handled/toasted by the service
                }
            },
        });
    };

    const convertMenu: MenuProps = {
        items: [
            { key: "customer", label: "Convert to Customer", icon: <UserAddOutlined />, onClick: () => openConvert("customer") },
            { key: "lead", label: "Convert to Lead", icon: <UserAddOutlined />, onClick: () => openConvert("lead") },
        ],
    };

    const moreMenu: MenuProps = {
        items: [
            ...(conversation.channel === "whatsapp"
                ? [
                      {
                          key: "voice-call",
                          label: "Voice call · Coming soon",
                          icon: <PhoneOutlined />,
                          onClick: showCallComingSoon,
                      },
                      {
                          key: "video-call",
                          label: "Video call · Coming soon",
                          icon: <VideoCameraOutlined />,
                          onClick: showCallComingSoon,
                      },
                  ]
                : []),
            { key: "scripts", label: "Scripts", icon: <MessageOutlined />, onClick: () => setScriptsOpen(true) },
            {
                key: "convert",
                label: "Convert",
                icon: <UserAddOutlined />,
                children: convertMenu.items,
            },
            {
                key: "status",
                label: "Change status",
                icon: <DownOutlined />,
                children: statusMenu.items,
            },
            { key: "close", label: "Close conversation", icon: <CloseOutlined />, onClick: () => statusMutation.mutate({ status: "closed" }) },
            { key: "delete", label: "Delete conversation", danger: true, icon: <DeleteOutlined />, onClick: handleDelete },
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
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                        {isMobile && onBack && (
                            <Button
                                type="text"
                                icon={<ArrowLeftOutlined />}
                                onClick={onBack}
                                style={{ padding: "0 4px", flexShrink: 0 }}
                            />
                        )}
                        <div style={{ position: "relative", flexShrink: 0 }}>
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
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <Text strong style={{ fontSize: 14, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {conversation.external_contact_name ||
                                    conversation.external_contact_id}
                            </Text>
                            <Space size={4} style={{ display: "flex", flexWrap: "nowrap", overflow: "hidden" }}>
                                <Badge status={statusCfg.badge} />
                                <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                                    {statusCfg.label}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                                    · {cfg?.label}
                                </Text>
                                {!isMobile && conversation.external_contact_phone && (
                                    <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                                        · {conversation.external_contact_phone}
                                    </Text>
                                )}
                            </Space>
                        </div>
                    </div>

                    {isMobile ? (
                        <Space size={4} wrap>
                            <Select
                                size="small"
                                placeholder="Assign"
                                value={conversation.assigned_to?._id || undefined}
                                onChange={(value: string) => {
                                    if (value && value !== conversation.assigned_to?._id) {
                                        handoverMutation.mutate(value);
                                    }
                                }}
                                loading={handoverMutation.isPending}
                                showSearch
                                style={{ width: 82 }}
                                options={agents.map((agent: any) => ({
                                    value: agent._id,
                                    label: `${agent.fullname} (${agent.open_conversations})`,
                                    disabled: agent._id === conversation.assigned_to?._id,
                                }))}
                            />
                            <Dropdown menu={moreMenu} trigger={["click"]} placement="bottomRight">
                                <Button size="small" icon={<MoreOutlined />} style={{ width: 32, height: 32 }} />
                            </Dropdown>
                        </Space>
                    ) : (
                        <Space wrap size="middle">
                            {conversation.channel === "whatsapp" && (
                                <>
                                    <Tooltip title="Voice calls — coming soon">
                                        <Button
                                            size="small"
                                            icon={<PhoneOutlined />}
                                            onClick={showCallComingSoon}
                                        />
                                    </Tooltip>
                                    <Tooltip title="Video calls — coming soon">
                                        <Button
                                            size="small"
                                            icon={<VideoCameraOutlined />}
                                            onClick={showCallComingSoon}
                                        />
                                    </Tooltip>
                                </>
                            )}
                            {conversation.assigned_to && (
                                <Tooltip title={`Assigned to ${conversation.assigned_to.fullname}`}>
                                    <Tag icon={<UserOutlined />}>
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
                                options={agents.map((agent: any) => ({
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
                                danger
                                icon={<DeleteOutlined />}
                                onClick={handleDelete}
                            >
                                Delete
                            </Button>
                            <Button
                                size="small"
                                icon={<CloseOutlined />}
                                disabled={conversation.status === "closed"}
                                loading={statusMutation.isPending}
                                onClick={() => statusMutation.mutate({ status: "closed" })}
                            >
                                Close
                            </Button>
                        </Space>
                    )}
                </div>

                {/* Messages Container - with scroll handling */}
                <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: isMobile ? "8px 10px" : "12px 16px",
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

                    {isLoading && allMessages.length === 0 ? (
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
                                        onReply={setReplyingTo}
                                        isReplying={replyingTo?._id === msg._id}
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
                    {replyingTo && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                padding: "6px 10px",
                                marginBottom: 8,
                                background: "#f6f6f6",
                                borderRadius: 8,
                                borderLeft: `3px solid ${cfg?.color || primaryColor}`,
                                fontSize: 12,
                            }}
                        >
                            <div style={{ overflow: "hidden" }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    Replying to {replyingTo.direction === "outbound" ? "yourself" : "customer"}
                                </Text>
                                <div style={{ color: "#595959", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {replyingTo.content || "[media]"}
                                </div>
                            </div>
                            <Button
                                type="text"
                                size="small"
                                icon={<CloseOutlined />}
                                onClick={() => setReplyingTo(null)}
                            />
                        </div>
                    )}
                    {pendingProductImages.length > 0 && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "6px 10px",
                                marginBottom: 8,
                                background: "#f6f6f6",
                                borderRadius: 8,
                                overflowX: "auto",
                                fontSize: 12,
                            }}
                        >
                            <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                                Product images will be sent with this reply:
                            </Text>
                            {pendingProductImages.map((p) => (
                                    <Tooltip key={p._id} title={p.name}>
                                        <div
                                            style={{
                                                position: "relative",
                                                flexShrink: 0,
                                                width: 44,
                                                height: 44,
                                            }}
                                        >
                                            <img
                                                src={p.image_url}
                                                alt={p.name}
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                    objectFit: "cover",
                                                    borderRadius: 6,
                                                    display: "block",
                                                }}
                                            />
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<CloseOutlined style={{ fontSize: 8, color: "#fff" }} />}
                                                onClick={() =>
                                                    setSuggestedProducts((prev) =>
                                                        prev.filter((sp) => sp._id !== p._id)
                                                    )
                                                }
                                                style={{
                                                    position: "absolute",
                                                    top: -5,
                                                    right: -5,
                                                    width: 16,
                                                    height: 16,
                                                    minWidth: 16,
                                                    padding: 0,
                                                    borderRadius: "50%",
                                                    background: "rgba(0,0,0,0.6)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            />
                                        </div>
                                    </Tooltip>
                                ))}
                        </div>
                    )}
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "flex-end",
                            flexWrap: isMobile ? "wrap" : "nowrap",
                        }}
                    >
                        <Upload
                            accept="image/*,video/*,.pdf,application/pdf"
                            showUploadList={false}
                            beforeUpload={(file) => {
                                handleSendMedia(file as File);
                                return false;
                            }}
                        >
                            <Button
                                icon={<PaperClipOutlined />}
                                size={isMobile ? "middle" : "large"}
                                disabled={sendingMedia}
                                loading={sendingMedia}
                                style={{ height: isMobile ? 36 : 48, width: isMobile ? 36 : 48 }}
                            />
                        </Upload>

                        <Tooltip title="Suggest a document">
                            <Button
                                icon={<FileSearchOutlined />}
                                onClick={() => {
                                    setDocModalOpen(true);
                                    handleSuggestDocuments();
                                }}
                                loading={docLoading}
                                size={isMobile ? "middle" : "large"}
                                style={{ height: isMobile ? 36 : 48, width: isMobile ? 36 : 48 }}
                            />
                        </Tooltip>

                        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                            <TextArea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={isMobile ? "Type a message…" : "Type a message… (Enter to send, Shift+Enter for new line)"}
                                autoSize={{ minRows: isMobile ? 1 : 2, maxRows: isMobile ? 3 : 4 }}
                                style={{
                                    flex: 1,
                                    borderRadius: 8,
                                    resize: "none",
                                }}
                            />
                        </div>

                        {text && (
                            <Tooltip title="Clear message">
                                <Button
                                    icon={<CloseOutlined />}
                                    onClick={() => setText("")}
                                    size={isMobile ? "middle" : "large"}
                                    style={{ height: isMobile ? 36 : 48, width: isMobile ? 36 : 48 }}
                                />
                            </Tooltip>
                        )}

                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={handleSend}
                            loading={sendMutation.isPending || sendingMedia}
                            disabled={!text.trim()}
                            size={isMobile ? "middle" : "large"}
                            style={{
                                background: cfg?.color || primaryColor,
                                borderColor: cfg?.color || primaryColor,
                                borderRadius: 8,
                                height: isMobile ? 36 : 48,
                            }}
                        >
                            {!isMobile && "Send"}
                        </Button>
                        <Tooltip title="AI suggestion">
                            <Button
                                icon={<ThunderboltOutlined />}
                                onClick={() => suggestMutation.mutate()}
                                loading={suggestMutation.isPending}
                                size={isMobile ? "middle" : "large"}
                                style={{ height: isMobile ? 36 : 48, width: isMobile ? 36 : 48 }}
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
                {convertType === "customer" && (
                    <Input
                        value={convertPhone}
                        onChange={(e) => setConvertPhone(e.target.value)}
                        placeholder="Enter phone number"
                        onPressEnter={handleConvert}
                        style={{ marginTop: 8 }}
                    />
                )}
            </Modal>

            <Modal
                title="Move to Pending Dispatch"
                open={dispatchModalOpen}
                onCancel={() => setDispatchModalOpen(false)}
                onOk={handleMarkDispatch}
                okText="Assign & Mark"
                okButtonProps={{ disabled: !dispatchAgent }}
                confirmLoading={statusMutation.isPending}
                width={400}
                destroyOnClose
            >
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Select the agent who will handle dispatch for this conversation.
                </Text>
                <Select
                    style={{ width: "100%", marginTop: 12 }}
                    placeholder="Select dispatch agent"
                    value={dispatchAgent || undefined}
                    onChange={setDispatchAgent}
                    showSearch
                    options={agents.map((agent: any) => ({
                        value: agent._id,
                        label: `${agent.fullname} (${agent.open_conversations} open)`,
                    }))}
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

            <Modal
                title="Suggest a document to share"
                open={docModalOpen}
                onCancel={() => setDocModalOpen(false)}
                footer={null}
                width={isMobile ? "90vw" : 600}
                destroyOnClose
            >
                <Input.Search
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    onSearch={handleSuggestDocuments}
                    placeholder="Search documents by content…"
                    allowClear
                    loading={docLoading}
                    style={{ marginBottom: 16 }}
                />
                {docResults.length === 0 ? (
                    <Empty description={docLoading ? "Searching…" : "No documents found"} />
                ) : (
                    <List
                        dataSource={docResults}
                        loading={docLoading}
                        renderItem={(doc: any) => {
                            const att = doc.attachments?.[0];
                            return (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="send"
                                            type="primary"
                                            size="small"
                                            icon={<SendOutlined />}
                                            loading={sendingMedia}
                                            onClick={() => handleSendDocument(doc)}
                                        >
                                            Send
                                        </Button>,
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={doc.name || "Untitled document"}
                                        description={
                                            <Space size={4} wrap>
                                                                                                <FilePdfOutlined />
                                                                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                                                                    {att?.file_name || doc.document_type || "PDF"}
                                                                                                </Text>
                                                                                            </Space>
                                        }
                                    />
                                </List.Item>
                            );
                        }}
                    />
                )}
            </Modal>

        </>
    );
};

export default MessageThread;