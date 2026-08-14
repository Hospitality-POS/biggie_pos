// ─────────────────────────────────────────────────────────────────────────────
// TWILIO CRM TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface TwilioAccount {
  id: string;
  tenant_id: string;
  company_code: string;
  shop_id: string;
  account_type: "platform" | "tenant";
  account_sid?: string;
  status: "active" | "suspended" | "terminated";
  monthly_spend_limit?: number;
  current_month_spend: number;
  capabilities: {
    voice: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  is_active: boolean;
  account_info?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface TwilioPhoneNumber {
  id: string;
  tenant_id: string;
  company_code: string;
  shop_id: string;
  twilio_account_id: string;
  phone_number: string;
  friendly_name: string;
  country_code: string;
  phone_type: "local" | "mobile" | "toll-free" | "voip";
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  sid: string;
  voice_url?: string;
  sms_url?: string;
  whatsapp_enabled: boolean;
  is_active: boolean;
  status: "active" | "inactive" | "suspended" | "released";
  assigned_to?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Call {
  id: string;
  tenant_id: string;
  company_code: string;
  shop_id: string;
  call_sid: string;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  status: "queued" | "ringing" | "in-progress" | "completed" | "busy" | "failed" | "no-answer" | "canceled";
  call_duration: number;
  customer_id?: string;
  lead_id?: string;
  contact_name?: string;
  agent_id?: string;
  agent_name?: string;
  recording_enabled: boolean;
  recording_url?: string;
  start_time?: string;
  end_time?: string;
  cost: number;
  outcome: "connected" | "no-answer" | "busy" | "failed" | "voicemail" | "unknown";
  created_at?: string;
  updated_at?: string;
}

export interface AgentCallStatus {
  id: string;
  agent_id: string;
  agent_name: string;
  status: "offline" | "available" | "busy" | "on-call" | "away" | "do-not-disturb";
  current_call_id?: string;
  current_call_sid?: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  max_concurrent_calls: number;
  current_calls_count: number;
  total_calls_today: number;
  total_call_duration_today: number;
  device_type: "browser" | "mobile" | "sip-phone" | "other";
  last_heartbeat_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AvailableNumber {
  phone_number: string;
  friendly_name: string;
  region: string;
  locality: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

export interface WorkflowAction {
  type: "make_call" | "send_twilio_sms" | "send_twilio_whatsapp" | "schedule_call" | "add_call_note";
  delay_minutes: number;
  payload: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  shop_id: string;
  name: string;
  description?: string;
  trigger_stage: string;
  run_once: boolean;
  priority: number;
  is_active: boolean;
  actions: WorkflowAction[];
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowLog {
  id: string;
  workflow_id: string;
  lead_id: string;
  action_type: string;
  status: "success" | "failed" | "pending";
  error_message?: string;
  executed_at?: string;
}

export interface UsageRecord {
  period: string;
  voice_minutes: number;
  sms_count: number;
  whatsapp_messages: number;
  cost: number;
}

export interface TwilioAccountFormData {
  account_type: "platform" | "tenant";
  account_sid?: string;
  auth_token?: string;
  monthly_spend_limit?: number;
  capabilities: {
    voice: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
}

export interface PhoneNumberFormData {
  twilio_account_id: string;
  phone_type: "local" | "mobile" | "toll-free" | "voip";
  country_code: string;
  area_code?: string;
  contains?: string;
  voice_url?: string;
  sms_url?: string;
}

export interface CallFormData {
  phone_number_id: string;
  to_number: string;
  customer_id?: string;
  lead_id?: string;
  agent_id?: string;
  record?: boolean;
}
