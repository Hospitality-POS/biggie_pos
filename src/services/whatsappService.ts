import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

/**
 * WHATSAPP / OMNICHANNEL SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Supports multiple channels:
 *   - WhatsApp Business API
 *   - Facebook Messenger
 *   - Instagram Business Messaging
 *
 * Authentication uses Meta OAuth — no manual token entry required.
 * The backend handles token exchange, webhook registration, and storage.
 *
 * Routes:
 *   app.use("/omnichannel/channels",       ...)   ← channel CRUD + OAuth
 *   app.use("/omnichannel/conversations",  ...)   ← conversation ops
 *   app.use("/omnichannel/messages",       ...)   ← message ops
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const channelUrl = `${BASE_URL}/omnichannel/channels`;
const conversationUrl = `${BASE_URL}/omnichannel/conversations`;
const messageUrl = `${BASE_URL}/omnichannel/messages`;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Channel {
    _id: string;
    channel: "whatsapp" | "messenger" | "instagram";
    shop_id: string;
    tenant_id: string;
    company_code: string;
    phone_number_id?: string;
    waba_id?: string;
    page_id?: string;
    instagram_account_id?: string;
    display_phone_number?: string;
    business_name?: string;
    is_active: boolean;
    webhook_verified: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Conversation {
    _id: string;
    channel: "whatsapp" | "messenger" | "instagram";
    shop_id: string;
    external_contact_id: string;
    external_contact_name: string;
    external_contact_phone?: string;
    customer_id?: string;
    status: "open" | "pending" | "resolved" | "closed";
    last_message_at: string;
    last_message_preview?: string;
    unread_count: number;
    phone_number_id?: string;
    page_id?: string;
    instagram_account_id?: string;
    assigned_to?: { _id: string; fullname: string; thumbnail?: string };
    is_window_open?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Message {
    _id: string;
    conversation_id: string;
    shop_id: string;
    direction: "inbound" | "outbound";
    message_type: "text" | "image" | "video" | "audio" | "document" | "location" | "template" | "reaction" | "unsupported";
    content: string;
    media_url?: string;
    media_id?: string;
    media_mime_type?: string;
    media_filename?: string;
    template_name?: string;
    template_params?: string[];
    location?: {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
    };
    reaction?: {
        emoji: string;
        message_id: string;
    };
    status: "pending" | "sent" | "delivered" | "read" | "received" | "failed";
    meta_message_id?: string;
    context_message_id?: string;
    sent_by?: { _id: string; fullname: string; thumbnail?: string };
    createdAt: string;
    updatedAt: string;
}

export type ChannelType = "whatsapp" | "messenger" | "instagram";

// ── Shared error handler ──────────────────────────────────────────────────────

const handleError = (error: any, userMessage?: string) => {
    const status = error?.response?.status;
    const errorMessage = error?.response?.data?.message || error?.message;

    if (status === 403) throw error;
    if (status === 401) {
        message.error("Authentication failed. Please try reconnecting.");
    } else if (userMessage) {
        message.error(userMessage);
    } else if (errorMessage) {
        message.error(errorMessage);
    }

    throw error?.response?.data || error;
};

// ── OAuth Connect (replaces manual token entry) ───────────────────────────────

export interface InitiateOAuthParams {
    channel: ChannelType | string;
    shop_id: string;
}

export interface InitiateOAuthResponse {
    oauth_url: string;   // The Meta OAuth URL to open in the popup
    state: string;       // CSRF state token — match against the postMessage response
}

/**
 * Step 1: Ask the backend for the Meta OAuth URL.
 *
 * Backend should:
 *  - Generate a secure `state` token tied to shop_id + channel
 *  - Build the Meta OAuth URL with correct scopes per channel:
 *      WhatsApp:  whatsapp_business_management, whatsapp_business_messaging
 *      Messenger: pages_messaging, pages_read_engagement, pages_manage_metadata
 *      Instagram: instagram_basic, instagram_manage_messages, pages_show_list
 *  - Return { oauth_url, state }
 */
export const initiateOAuthConnect = async (
    params: InitiateOAuthParams
): Promise<InitiateOAuthResponse> => {
    try {
        const response = await axiosInstance.post(`${channelUrl}/oauth/initiate`, params);
        return response.data;
    } catch (error) {
        handleError(error, "Could not initiate connection. Please try again.");
        throw error;
    }
};

/**
 * Step 2 (called by the OAuth callback page in your app):
 *
 * After Meta redirects back to your callback URL with `?code=...&state=...`,
 * the callback page should call this to complete the connection.
 *
 * Backend should:
 *  - Validate the state token
 *  - Exchange the code for a long-lived access token via Meta Graph API
 *  - Fetch the connected phone number IDs / page IDs / WABA IDs automatically
 *  - Register the webhook subscription automatically
 *  - Save the channel record with encrypted token
 *  - postMessage({ type: "OAUTH_SUCCESS", state }) back to the opener window
 */
export const completeOAuthConnect = async (params: {
    code: string;
    state: string;
    channel: ChannelType;
}): Promise<Channel> => {
    try {
        const response = await axiosInstance.post(`${channelUrl}/oauth/callback`, params);
        return response.data;
    } catch (error) {
        handleError(error, "Failed to complete channel connection.");
        throw error;
    }
};

// ── Channel Management ────────────────────────────────────────────────────────

/**
 * Fetch all channels for the current shop
 * Returns: { channels: Channel[], total: number }
 */
export const fetchChannels = async (params?: ParamsType) => {
    try {
        const response = await axiosInstance.get(channelUrl, { params });
        return response.data;
    } catch (error) {
        console.warn("[fetchChannels] failed:", error?.response?.status, error?.message);
        return { channels: [], total: 0 };
    }
};

// Alias for backward compatibility
export const fetchWhatsappChannels = fetchChannels;

/**
 * Update channel details
 */
export const updateChannel = async (channelId: string, values: Partial<Channel>) => {
    try {
        const response = await axiosInstance.put(`${channelUrl}/${channelId}`, values);
        // message.success("Channel updated successfully");
        return response.data;
    } catch (error) {
        handleError(error, "Error updating channel");
    }
};

export const updateWhatsappChannel = updateChannel;

/**
 * Disconnect / deactivate a channel
 */
export const disconnectChannel = async (channelId: string) => {
    try {
        const response = await axiosInstance.delete(`${channelUrl}/${channelId}`);
        // message.success("Channel disconnected");
        return response.data;
    } catch (error) {
        handleError(error, "Error disconnecting channel");
    }
};

export const disconnectWhatsappChannel = disconnectChannel;

// Legacy manual connect — kept for admin/fallback use only
export const connectWhatsappChannel = async (params: any) => {
    try {
        const response = await axiosInstance.post(channelUrl, params);
        return response.data;
    } catch (error) {
        handleError(error, `Error connecting ${params.channel} channel`);
    }
};

export const connectChannel = connectWhatsappChannel;

// ── Conversations ─────────────────────────────────────────────────────────────

export interface FetchConversationsParams {
    shop_id: string;
    status?: "open" | "pending" | "resolved" | "closed";
    channel?: ChannelType;
    assigned_to?: string;
    search?: string;
    page?: number;
    limit?: number;
}

/**
 * Fetch paginated conversations
 * Returns: { conversations, total, status_counts, channel_counts }
 */
export const fetchConversations = async (params: FetchConversationsParams) => {
    try {
        const response = await axiosInstance.get(conversationUrl, { params });
        return response.data;
    } catch (error) {
        console.warn("[fetchConversations] failed:", error?.response?.status, error?.message);
        return { conversations: [], total: 0, status_counts: {}, channel_counts: {} };
    }
};

export const fetchConversationById = async (conversationId: string) => {
    try {
        const response = await axiosInstance.get(`${conversationUrl}/${conversationId}`);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

export const assignConversation = async (conversationId: string, assignedTo: string | null) => {
    try {
        const response = await axiosInstance.patch(
            `${conversationUrl}/${conversationId}/assign`,
            { assigned_to: assignedTo }
        );
        // message.success("Conversation assigned successfully");
        return response.data;
    } catch (error) {
        handleError(error, "Error assigning conversation");
    }
};

export const updateConversationStatus = async (conversationId: string, status: string) => {
    try {
        const response = await axiosInstance.patch(
            `${conversationUrl}/${conversationId}/status`,
            { status }
        );
        // message.success(`Conversation marked as ${status}`);
        return response.data;
    } catch (error) {
        handleError(error, "Error updating conversation status");
    }
};

export const markConversationAsRead = async (conversationId: string) => {
    try {
        const response = await axiosInstance.patch(`${conversationUrl}/${conversationId}/read`);
        return response.data;
    } catch (error) {
        console.warn("[markConversationAsRead] failed:", error?.message);
        return null;
    }
};

// ── Messages ──────────────────────────────────────────────────────────────────

export interface FetchMessagesParams {
    page?: number;
    limit?: number;
}

export const fetchMessages = async (conversationId: string, params?: FetchMessagesParams) => {
    try {
        const response = await axiosInstance.get(`${messageUrl}/${conversationId}`, { params });
        return response.data;
    } catch (error) {
        console.warn("[fetchMessages] failed:", error?.response?.status, error?.message);
        return { messages: [], total: 0, hasMore: false };
    }
};

export const sendTextMessage = async (params: { conversation_id: string; content: string }) => {
    try {
        const response = await axiosInstance.post(`${messageUrl}/text`, {
            conversation_id: params.conversation_id,
            content: params.content,
        });
        return response.data;
    } catch (error) {
        handleError(error, "Error sending message");
    }
};

export const sendTemplateMessage = async (params: {
    conversation_id: string;
    template_name: string;
    language_code?: string;
    template_params?: string[];
}) => {
    try {
        const response = await axiosInstance.post(`${messageUrl}/template`, {
            conversation_id: params.conversation_id,
            template_name: params.template_name,
            language_code: params.language_code || "en_US",
            template_params: params.template_params || [],
        });
        // message.success("Template message sent");
        return response.data;
    } catch (error) {
        handleError(error, "Error sending template message");
    }
};

export const sendMediaMessage = async (params: {
    conversation_id: string;
    media_type: "image" | "video" | "audio" | "document";
    media_url?: string;
    media_id?: string;
    caption?: string;
    filename?: string;
}) => {
    try {
        const response = await axiosInstance.post(`${messageUrl}/media`, {
            conversation_id: params.conversation_id,
            media_type: params.media_type,
            media_url: params.media_url || null,
            media_id: params.media_id || null,
            caption: params.caption || "",
            filename: params.filename || null,
        });
        return response.data;
    } catch (error) {
        handleError(error, "Error sending media");
    }
};

export const sendLocationMessage = async (params: {
    conversation_id: string;
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
}) => {
    try {
        const response = await axiosInstance.post(`${messageUrl}/location`, params);
        return response.data;
    } catch (error) {
        handleError(error, "Error sending location");
    }
};

export const uploadMedia = async (params: { file: File; phone_number_id: string }) => {
    try {
        const formData = new FormData();
        formData.append("file", params.file);
        formData.append("phone_number_id", params.phone_number_id);

        const response = await axiosInstance.post(`${messageUrl}/upload-media`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    } catch (error) {
        handleError(error, "Error uploading media");
    }
};

export const uploadWhatsappMedia = uploadMedia;

// ── Helpers ───────────────────────────────────────────────────────────────────

export const getChannelInfo = (channelType: ChannelType) => ({
    whatsapp: { name: "WhatsApp", color: "#25D366", icon: "💬", bg: "#f0fdf4" },
    messenger: { name: "Messenger", color: "#0084FF", icon: "💙", bg: "#eff6ff" },
    instagram: { name: "Instagram", color: "#E1306C", icon: "📸", bg: "#fff0f5" },
}[channelType]);

export const formatMessagePreview = (msg: Message, maxLength = 50): string => {
    let preview = msg.content;
    if (msg.message_type === "image") preview = "📷 Image";
    else if (msg.message_type === "video") preview = "🎥 Video";
    else if (msg.message_type === "audio") preview = "🎵 Audio";
    else if (msg.message_type === "document") preview = `📄 ${msg.media_filename || "Document"}`;
    else if (msg.message_type === "location") preview = "📍 Location";
    else if (msg.message_type === "template") preview = `📋 Template: ${msg.template_name}`;
    else if (msg.message_type === "reaction") preview = `👍 ${msg.reaction?.emoji}`;
    return preview.length > maxLength ? preview.substring(0, maxLength) + "..." : preview;
};

export const getStatusColor = (status: Message["status"]): string =>
    ({ pending: "#faad14", sent: "#52c41a", delivered: "#1890ff", read: "#52c41a", received: "#52c41a", failed: "#ff4d4f" }[status]);

export const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};