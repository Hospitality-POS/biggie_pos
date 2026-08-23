import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";
import { message } from "antd";

// ─────────────────────────────────────────────────────────────────────────────
// TWILIO ACCOUNT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const createTwilioAccount = async (data: {
  shop_id: string;
  account_type: "platform" | "tenant";
  account_sid?: string;
  auth_token?: string;
  monthly_spend_limit?: number;
  capabilities?: {
    voice: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
}) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/accounts`;
    const response = await axiosInstance.post(url, data);
    message.success("Twilio account created successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to create Twilio account");
    throw error;
  }
};

export const getTwilioAccounts = async (shopId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/accounts?shop_id=${shopId}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to fetch Twilio accounts");
    throw error;
  }
};

export const getTwilioAccountById = async (accountId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/accounts/${accountId}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to fetch Twilio account");
    throw error;
  }
};

export const updateTwilioAccount = async (accountId: string, data: {
  monthly_spend_limit?: number;
  capabilities?: {
    voice: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
}) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/accounts/${accountId}`;
    const response = await axiosInstance.put(url, data);
    message.success("Twilio account updated successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update Twilio account");
    throw error;
  }
};

export const deleteTwilioAccount = async (accountId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/accounts/${accountId}`;
    const response = await axiosInstance.delete(url);
    message.success("Twilio account deleted successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to delete Twilio account");
    throw error;
  }
};

export const getTwilioAccountUsage = async (accountId: string, periodType = "monthly", limit = 12) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/accounts/${accountId}/usage?period_type=${periodType}&limit=${limit}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to fetch account usage");
    throw error;
  }
};

export const testTwilioCredentials = async (data: {
  account_sid: string;
  auth_token: string;
}) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/accounts/test-credentials`;
    const response = await axiosInstance.post(url, data);
    message.success("Twilio credentials are valid");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Invalid Twilio credentials");
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PHONE NUMBER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const provisionPhoneNumber = async (data: {
  shop_id: string;
  twilio_account_id: string;
  phone_type: "local" | "mobile" | "toll-free" | "voip";
  country_code: string;
  area_code?: string;
  contains?: string;
  voice_url?: string;
  sms_url?: string;
}) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/phone-numbers`;
    const response = await axiosInstance.post(url, data);
    message.success("Phone number provisioned successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to provision phone number");
    throw error;
  }
};

export const getPhoneNumbers = async (shopId: string, twilioAccountId?: string, isActive?: boolean) => {
  try {
    let url = `${BASE_URL}/api/crm/twilio/phone-numbers?shop_id=${shopId}`;
    if (twilioAccountId) url += `&twilio_account_id=${twilioAccountId}`;
    if (isActive !== undefined) url += `&is_active=${isActive}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to fetch phone numbers");
    throw error;
  }
};

export const getPhoneNumberById = async (phoneNumberId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/phone-numbers/${phoneNumberId}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to fetch phone number");
    throw error;
  }
};

export const updatePhoneNumber = async (phoneNumberId: string, data: {
  friendly_name?: string;
  voice_url?: string;
  voice_application_sid?: string;
  sms_url?: string;
  whatsapp_enabled?: boolean;
  assigned_to?: string;
  notes?: string;
}) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/phone-numbers/${phoneNumberId}`;
    const response = await axiosInstance.put(url, data);
    message.success("Phone number updated successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update phone number");
    throw error;
  }
};

export const releasePhoneNumber = async (phoneNumberId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/phone-numbers/${phoneNumberId}`;
    const response = await axiosInstance.delete(url);
    message.success("Phone number released successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to release phone number");
    throw error;
  }
};

export const searchAvailableNumbers = async (params: {
  country_code: string;
  area_code?: string;
  contains?: string;
  limit?: number;
}) => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, String(value));
    });
    const url = `${BASE_URL}/api/crm/twilio/phone-numbers/available?${queryParams.toString()}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to search available numbers");
    throw error;
  }
};

export const getPhoneNumberUsage = async (phoneNumberId: string, periodType = "monthly", limit = 12) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/phone-numbers/${phoneNumberId}/usage?period_type=${periodType}&limit=${limit}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to fetch phone number usage");
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VOICE CALLING
// ─────────────────────────────────────────────────────────────────────────────

export const initiateCall = async (data: {
  shop_id: string;
  phone_number_id: string;
  to_number: string;
  from_number?: string;
  customer_id?: string;
  lead_id?: string;
  agent_id: string;
  agent_identity: string;
  record?: boolean;
  url?: string;
}) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/initiate`;
    const response = await axiosInstance.post(url, data);
    message.success("Call initiated successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to initiate call");
    throw error;
  }
};

export const getCallHistory = async (params: {
  shop_id: string;
  direction?: "inbound" | "outbound";
  status?: string;
  agent_id?: string;
  customer_id?: string;
  lead_id?: string;
  limit?: number;
  offset?: number;
}) => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, String(value));
    });
    const url = `${BASE_URL}/api/crm/twilio/voice/calls?${queryParams.toString()}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to fetch call history");
    throw error;
  }
};

export const getActiveCalls = async (shopId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/calls/active?shop_id=${shopId}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    // Don't show error for polling - it's expected to fail sometimes
    console.error("Failed to fetch active calls:", error);
    return { calls: [] };
  }
};

export const answerCall = async (callId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/calls/${callId}/answer`;
    const response = await axiosInstance.post(url);
    message.success("Call answered");
    return response.data;
  } catch (error: unknown) {
    const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to answer call";
    message.error(errorMessage);
    throw error;
  }
};

export const rejectCall = async (callId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/calls/${callId}/reject`;
    const response = await axiosInstance.post(url);
    message.success("Call rejected");
    return response.data;
  } catch (error: unknown) {
    const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to reject call";
    message.error(errorMessage);
    throw error;
  }
};

export const getCallById = async (callId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/calls/${callId}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to fetch call details");
    throw error;
  }
};

export const redirectCall = async (callId: string, data: {
  url: string;
  method?: string;
}) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/calls/${callId}/redirect`;
    const response = await axiosInstance.post(url, data);
    message.success("Call redirected successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to redirect call");
    throw error;
  }
};

export const endCall = async (callId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/calls/${callId}/end`;
    const response = await axiosInstance.post(url);
    message.success("Call ended successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to end call");
    throw error;
  }
};

export const generateTwiML = async (options: {
  say?: string;
  voice?: string;
  language?: string;
  dial?: {
    number: string;
    timeout?: number;
    record?: string;
  };
}) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/twiml`;
    const response = await axiosInstance.post(url, { options });
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to generate TwiML");
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AGENT STATUS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const getAgentStatus = async (shopId: string, agentId?: string) => {
  try {
    let url = `${BASE_URL}/api/crm/twilio/voice/agent-status?shop_id=${shopId}`;
    if (agentId) url += `&agent_id=${agentId}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    // Fail silently — this endpoint can return unrelated permission errors
    // (e.g. ACCOUNTING_DIGITAX_VIEW_INVOICE_STATUS) for non-accounting tenants,
    // which would otherwise break the omnichannel UI for Mteja-only users.
    console.error("Failed to fetch agent status:", error);
    return { agent_statuses: [] };
  }
};

export const updateAgentStatus = async (data: {
  shop_id: string;
  agent_id: string;
  status: "offline" | "available" | "busy" | "on-call" | "away" | "do-not-disturb";
  device_type?: "browser" | "mobile" | "sip-phone" | "other";
  device_info?: string;
}) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/agent-status`;
    const response = await axiosInstance.post(url, data);
    message.success("Agent status updated successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update agent status");
    throw error;
  }
};

export const updateAgentHeartbeat = async (agentId: string) => {
  const url = `${BASE_URL}/api/crm/twilio/voice/agent-status/heartbeat`;
  const response = await axiosInstance.post(url, { agent_id: agentId });
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW AUTOMATION
// ─────────────────────────────────────────────────────────────────────────────

export const createWorkflow = async (data: {
  shop_id: string;
  name: string;
  description?: string;
  trigger_stage: string;
  run_once: boolean;
  priority: number;
  is_active: boolean;
  actions: Array<{
    type: string;
    delay_minutes: number;
    payload: Record<string, unknown>;
  }>;
}) => {
  try {
    const url = `${BASE_URL}/crm/lead-workflows`;
    const response = await axiosInstance.post(url, data);
    message.success("Workflow created successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to create workflow");
    throw error;
  }
};

export const triggerWorkflow = async (workflowId: string, data: {
  shop_id: string;
  lead_id: string;
}) => {
  try {
    const url = `${BASE_URL}/crm/lead-workflows/${workflowId}/trigger`;
    const response = await axiosInstance.post(url, data);
    message.success("Workflow triggered successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to trigger workflow");
    throw error;
  }
};

export const getWorkflowLogs = async (leadId: string, params?: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    const url = `${BASE_URL}/crm/lead-workflows/logs/${leadId}?${queryParams.toString()}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to fetch workflow logs");
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VOICE CLIENT TOKEN GENERATION
// ─────────────────────────────────────────────────────────────────────────────

export const getTwilioVoiceToken = async (data: {
  shop_id: string;
  agent_id: string;
  agent_identity: string;
}) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/token`;
    // Map agent_identity to identity for backend compatibility
    const response = await axiosInstance.post(url, {
      shop_id: data.shop_id,
      agent_id: data.agent_id,
      identity: data.agent_identity, // Backend expects 'identity' parameter
    });
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to get Twilio voice token");
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MISSED CALL MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const getMissedCalls = async (shopId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/missed-calls?shop_id=${shopId}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    console.error('Failed to fetch missed calls:', error);
    throw error;
  }
};

export const getAllMissedCalls = async (shopId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/missed-calls/all?shop_id=${shopId}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    console.error('Failed to fetch all missed calls:', error);
    throw error;
  }
};

export const getMissedCallStats = async (shopId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/missed-calls/stats?shop_id=${shopId}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    console.error('Failed to fetch missed call stats:', error);
    throw error;
  }
};

export const progressMissedCall = async (assignmentId: string, shopId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/missed-calls/${assignmentId}/progress`;
    const response = await axiosInstance.post(url, { shop_id: shopId });
    message.success("Missed call marked in progress");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to progress missed call");
    throw error;
  }
};

export const callbackMissedCall = async (assignmentId: string, data: {
  shop_id: string;
  callback_call_id?: string;
  notes?: string;
}) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/missed-calls/${assignmentId}/callback`;
    const response = await axiosInstance.post(url, data);
    message.success("Callback completed successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to complete callback");
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CALL QUEUE (live dashboard)
// ─────────────────────────────────────────────────────────────────────────────

export const getCallQueue = async (shopId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/queue?shop_id=${shopId}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    console.error("Failed to fetch call queue:", error);
    return { queue: [], queue_depth: 0, longest_wait_seconds: 0 };
  }
};

export const getCallQueueStats = async (shopId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/queue/stats?shop_id=${shopId}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    console.error("Failed to fetch queue stats:", error);
    return { queue_depth: 0 };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CALL TRANSCRIPTION
// ─────────────────────────────────────────────────────────────────────────────

export const transcribeCall = async (data: { call_sid?: string; recording_sid?: string }) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/calls/transcribe`;
    const response = await axiosInstance.post(url, data);
    message.success("Transcription job submitted");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to submit transcription");
    throw error;
  }
};

export const getCallerContext = async (phone: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/voice/caller-context?phone=${encodeURIComponent(phone)}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    console.error('Failed to fetch caller context:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TWILIO WHATSAPP MESSAGING
// ─────────────────────────────────────────────────────────────────────────────

export const sendTwilioWhatsAppMessage = async (data: {
  shop_id: string;
  from_number?: string;
  messaging_service_sid?: string;
  to_number: string;
  body?: string;
  media_url?: string;
  use_template?: boolean;
  content_sid?: string;
  template_params?: Record<string, string>;
}) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/whatsapp/send`;
    const response = await axiosInstance.post(url, data);
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to send WhatsApp message");
    throw error;
  }
};

export const getTwilioWhatsAppConversations = async (shopId: string, status?: string, page = 1, limit = 30) => {
  try {
    let url = `${BASE_URL}/api/crm/twilio/whatsapp/conversations?shop_id=${shopId}&page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    console.error('Failed to fetch WhatsApp conversations:', error);
    throw error;
  }
};

export const getTwilioWhatsAppMessages = async (conversationId: string, page = 1, limit = 50) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/whatsapp/messages?conversation_id=${conversationId}&page=${page}&limit=${limit}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    console.error('Failed to fetch WhatsApp messages:', error);
    throw error;
  }
};

export const getTwilioWhatsAppTemplates = async (shopId: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/whatsapp/templates?shop_id=${shopId}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    console.error('Failed to fetch WhatsApp templates:', error);
    throw error;
  }
};

export const createTwilioWhatsAppTemplate = async (data: {
  shop_id: string;
  twilio_account_id: string;
  name: string;
  body: string;
  language?: string;
  category?: string;
  variables?: string[];
}) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/whatsapp/templates`;
    const response = await axiosInstance.post(url, data);
    message.success("Template added successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to add template");
    throw error;
  }
};

export const getTwilioWhatsAppTemplateStatus = async (id: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/whatsapp/templates/${id}/status`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to refresh template status");
    throw error;
  }
};

export const deleteTwilioWhatsAppTemplate = async (id: string) => {
  try {
    const url = `${BASE_URL}/api/crm/twilio/whatsapp/templates/${id}`;
    const response = await axiosInstance.delete(url);
    message.success("Template removed successfully");
    return response.data;
  } catch (error: unknown) {
    message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to remove template");
    throw error;
  }
};
