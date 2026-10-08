import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

/**
 * SMS & EMAIL CAMPAIGNS SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * Lets a shop connect its own SMS/email sender accounts (Africa's Talking,
 * Onfon, Twilio, Brevo, Mailchimp, SendGrid, plain SMTP, or any custom HTTP
 * gateway) and run bulk SMS/Email campaigns to leads, customers, an imported
 * Excel list, or a manually pasted list.
 *
 * Routes (mounted under the existing /omnichannel router):
 *   /omnichannel/senders             ← sender (provider) connections
 *   /omnichannel/campaigns           ← bulk SMS/Email campaigns
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const sendersUrl = `${BASE_URL}/omnichannel/senders`;
const campaignsUrl = `${BASE_URL}/omnichannel/campaigns`;
const messagesUrl = `${BASE_URL}/omnichannel/messages`;

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessagingChannel = "sms" | "email";
export type SmsProvider = "africastalking" | "onfon" | "twilio" | "custom_http";
export type EmailProvider = "brevo" | "mailchimp" | "sendgrid" | "smtp" | "custom_http";

export interface SenderConfig {
    _id: string;
    name?: string;
    channel: MessagingChannel;
    provider: SmsProvider | EmailProvider;
    sender_id?: string;
    from_email?: string;
    from_name?: string;
    default_template?: string;
    is_active: boolean;
    is_default: boolean;
    last_tested_at?: string;
    last_test_status?: "success" | "failed" | null;
    last_test_message?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SenderCredentialsPayload {
    // Africa's Talking
    api_key?: string;
    username?: string;
    sandbox?: boolean;
    // Onfon
    client_id?: string;
    base_url?: string;
    // Twilio
    account_sid?: string;
    auth_token?: string;
    messaging_service_sid?: string;
    from_number?: string;
    // Email: Brevo / Mailchimp / SendGrid share `api_key` above
    // SMTP
    host?: string;
    port?: number;
    secure?: boolean;
    password?: string;
    // Custom HTTP (SMS or Email)
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body_template?: Record<string, any> | string;
}

export type CampaignAudience = "customers" | "leads" | "both" | "excel" | "manual";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "completed" | "failed" | "cancelled";
export type RecipientStatus = "pending" | "sent" | "failed" | "delivered";

export interface CampaignRecipient {
    name?: string;
    phone?: string;
    email?: string;
    source: "customer" | "lead" | "excel" | "manual";
    status: RecipientStatus;
    error?: string;
    sent_at?: string;
}

export interface MessageCampaign {
    _id: string;
    name: string;
    channel: MessagingChannel;
    sender_config_id?: SenderConfig | string;
    subject?: string;
    message: string;
    audience: CampaignAudience;
    recipients?: CampaignRecipient[];
    total_recipients: number;
    sent_count: number;
    delivered_count: number;
    failed_count: number;
    status: CampaignStatus;
    scheduled_at?: string;
    started_at?: string;
    completed_at?: string;
    is_quick_send?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AudiencePreview {
    total: number;
    recipients: Array<{ name?: string; phone?: string; email?: string; source: string }>;
}

// ── Shared error handler ──────────────────────────────────────────────────────

const handleError = (error: any, userMessage: string) => {
    const msg = error?.response?.data?.message || error?.message || userMessage;
    message.error(msg);
    throw error;
};

// ── Senders ───────────────────────────────────────────────────────────────────

export const fetchSenders = async (params: { shop_id: string; channel?: MessagingChannel }) => {
    try {
        const response = await axiosInstance.get(sendersUrl, { params });
        return response.data as { senders: SenderConfig[] };
    } catch (error: any) {
        console.warn("[fetchSenders] failed:", error?.message);
        return { senders: [] };
    }
};

export const connectSender = async (payload: {
    shop_id: string;
    channel: MessagingChannel;
    provider: SmsProvider | EmailProvider;
    name?: string;
    sender_id?: string;
    from_email?: string;
    from_name?: string;
    default_template?: string;
    is_default?: boolean;
    credentials: SenderCredentialsPayload;
}) => {
    try {
        const response = await axiosInstance.post(sendersUrl, payload);
        message.success("Sender connected successfully");
        return response.data;
    } catch (error: any) {
        return handleError(error, "Failed to connect sender");
    }
};

export const updateSender = async (id: string, payload: Partial<SenderConfig> & { shop_id: string; credentials?: SenderCredentialsPayload }) => {
    try {
        const response = await axiosInstance.put(`${sendersUrl}/${id}`, payload);
        message.success("Sender updated successfully");
        return response.data;
    } catch (error: any) {
        return handleError(error, "Failed to update sender");
    }
};

export const disconnectSender = async (id: string, shop_id: string) => {
    try {
        const response = await axiosInstance.delete(`${sendersUrl}/${id}`, { params: { shop_id } });
        message.success("Sender disconnected");
        return response.data;
    } catch (error: any) {
        return handleError(error, "Failed to disconnect sender");
    }
};

export const testSender = async (id: string, shop_id: string, to: string) => {
    try {
        const response = await axiosInstance.post(`${sendersUrl}/${id}/test`, { shop_id, to });
        message.success("Test message sent successfully");
        return response.data;
    } catch (error: any) {
        return handleError(error, "Test send failed");
    }
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface CampaignAnalytics {
    totals: {
        campaigns: number;
        quick_sends: number;
        total_recipients: number;
        sent_count: number;
        delivered_count: number;
        failed_count: number;
        success_rate: number;
    };
    status_breakdown: Array<{ status: CampaignStatus; count: number }>;
    daily_trend: Array<{ date: string; sent: number; failed: number }>;
    by_provider: Array<{ provider: string; sent: number; failed: number }>;
}

export const fetchCampaignAnalytics = async (params: { shop_id: string; channel?: MessagingChannel; days?: number; start_date?: string; end_date?: string }) => {
    try {
        const response = await axiosInstance.get(`${campaignsUrl}/analytics`, { params });
        return response.data as CampaignAnalytics;
    } catch (error: any) {
        console.warn("[fetchCampaignAnalytics] failed:", error?.message);
        return {
            totals: { campaigns: 0, quick_sends: 0, total_recipients: 0, sent_count: 0, delivered_count: 0, failed_count: 0, success_rate: 0 },
            status_breakdown: [],
            daily_trend: [],
            by_provider: [],
        } as CampaignAnalytics;
    }
};

// ── Campaigns ─────────────────────────────────────────────────────────────────

export const fetchCampaigns = async (params: { shop_id: string; channel?: MessagingChannel; status?: CampaignStatus; page?: number; limit?: number }) => {
    try {
        const response = await axiosInstance.get(campaignsUrl, { params });
        return response.data as { total: number; page: number; pages: number; campaigns: MessageCampaign[] };
    } catch (error: any) {
        console.warn("[fetchCampaigns] failed:", error?.message);
        return { total: 0, page: 1, pages: 0, campaigns: [] };
    }
};

export const getCampaignById = async (id: string, shop_id: string) => {
    try {
        const response = await axiosInstance.get(`${campaignsUrl}/${id}`, { params: { shop_id } });
        return response.data as MessageCampaign;
    } catch (error: any) {
        return handleError(error, "Failed to fetch campaign");
    }
};

export const previewAudience = async (params: { shop_id: string; audience: "customers" | "leads" | "both"; channel: MessagingChannel }) => {
    try {
        const response = await axiosInstance.get(`${campaignsUrl}/recipients/preview`, { params });
        return response.data as AudiencePreview;
    } catch (error: any) {
        console.warn("[previewAudience] failed:", error?.message);
        return { total: 0, recipients: [] };
    }
};

// Fetch through axiosInstance (auth + tenant headers) and save the blob —
// a raw window.open hits the API without credentials → "Tenant code required"
export const downloadContactsTemplate = async () => {
    try {
        const response = await axiosInstance.get(`${campaignsUrl}/import/template`, {
            responseType: "blob",
        });
        const blob = new Blob([response.data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "contacts-template.xlsx";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        message.success("Template downloaded successfully");
    } catch (error: any) {
        message.error("Failed to download template");
        throw error;
    }
};

export const importContacts = async (shop_id: string, file: File) => {
    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("shop_id", shop_id);
        const response = await axiosInstance.post(`${campaignsUrl}/import`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data as {
            total: number;
            contacts: Array<{ name?: string; phone?: string; email?: string; source: string }>;
            errors: Array<{ row: number; message: string }>;
        };
    } catch (error: any) {
        return handleError(error, "Failed to import contacts");
    }
};

export const createCampaign = async (payload: {
    shop_id: string;
    name: string;
    channel: MessagingChannel;
    subject?: string;
    message: string;
    sender_config_id: string;
    audience: CampaignAudience;
    manual_recipients?: Array<{ name?: string; phone?: string; email?: string; source?: string }>;
    scheduled_at?: string;
    campaign_id?: string;
}) => {
    try {
        const response = await axiosInstance.post(campaignsUrl, payload);
        message.success("Campaign created successfully");
        return response.data as { message: string; campaign: MessageCampaign };
    } catch (error: any) {
        return handleError(error, "Failed to create campaign");
    }
};

export const sendCampaign = async (id: string, shop_id: string) => {
    try {
        const response = await axiosInstance.post(`${campaignsUrl}/${id}/send`, { shop_id });
        message.success(response.data?.message || "Campaign queued for sending");
        return response.data;
    } catch (error: any) {
        return handleError(error, "Failed to send campaign");
    }
};

export const deleteCampaign = async (id: string, shop_id: string) => {
    try {
        const response = await axiosInstance.delete(`${campaignsUrl}/${id}`, { params: { shop_id } });
        message.success("Campaign deleted");
        return response.data;
    } catch (error: any) {
        return handleError(error, "Failed to delete campaign");
    }
};

// ── Quick Send (one-off, not a bulk campaign) ──────────────────────────────────

export const sendSingleMessage = async (payload: {
    shop_id: string;
    channel: MessagingChannel;
    sender_config_id: string;
    to: string;
    name?: string;
    subject?: string;
    message: string;
}) => {
    try {
        const response = await axiosInstance.post(`${messagesUrl}/send-single`, payload);
        message.success(response.data?.message || "Message sent successfully");
        return response.data;
    } catch (error: any) {
        return handleError(error, "Failed to send message");
    }
};
