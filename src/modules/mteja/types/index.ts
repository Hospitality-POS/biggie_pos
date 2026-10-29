export type LeadStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'disqualified';

export type LeadSource =
  | 'walk_in'
  | 'referral'
  | 'social_media'
  | 'website'
  | 'cold_call'
  | 'email_campaign'
  | 'exhibition'
  | 'partner'
  | 'other';

export interface LeadAddress {
  street?: string;
  city?: string;
  county?: string;
  country?: string;
}

export interface StageHistoryEntry {
  stage: LeadStage;
  changed_at: string;
  changed_by?: { _id: string; name: string };
  note?: string;
}

export interface Lead {
  _id: string;
  entity_type?: 'individual' | 'company';
  lead_name?: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: LeadAddress;
  stage: LeadStage;
  source?: LeadSource | string;
  project?: string;
  estimated_value?: number;
  currency?: string;
  probability?: number;
  expected_close_date?: string;
  assigned_to?: { _id: string; name?: string; fullname?: string; username: string };
  campaign_id?: { _id: string; name: string } | string;
  customer_id?: { _id: string; customer_name: string; code: string };
  converted_at?: string;
  converted_by?: { _id: string; name: string };
  lost_reason?: string;
  lost_to_competitor?: string;
  next_follow_up?: string;
  last_contacted_at?: string;
  notes?: string;
  tags?: string[];
  stage_history?: StageHistoryEntry[];
  is_active: boolean;
  shop_id: string;
  tenant_id?: string;
  created_by?: string;
  createdAt: string;
  updatedAt: string;
  activities?: LeadActivity[];
  documents?: any[];
}

export interface PipelineStageSummary {
  _id: LeadStage;
  count: number;
  total_value: number;
  avg_probability: number;
}

export interface LeadListResponse {
  total: number;
  page: number;
  pages: number;
  leads: Lead[];
}

export interface FetchLeadsParams {
  shop_id?: string;
  stage?: LeadStage;
  source?: string;
  project?: string;
  assigned_to?: string;
  campaign_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AnalyseLeadResult {
  sheetUsed: string;
  headerRowDetectedAt: number;
  totalDataRows: number;
  mappedColumns: string[];
  columnMapping: Record<string, string>;
  missingRequired: string[];
  missingRecommended: string[];
  unmappedColumns: string[];
  advice: Array<{ level: 'error' | 'warning' | 'info'; message: string }>;
  canImport: boolean;
  previewRows: any[];
}

export interface ImportLeadResult {
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    auto_created?: {
      staff?: string[];
    };
    format_detected?: {
      sheet: string;
      header_row: number;
      mapped_columns: number;
    };
  };
  errors: Array<{ row: number; name: string; reason: string }>;
}

export type CampaignType =
  | 'email'
  | 'sms'
  | 'social_media'
  | 'google_ads'
  | 'referral'
  | 'event'
  | 'flyer'
  | 'radio'
  | 'tv'
  | 'other';

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface Campaign {
  _id: string;
  name: string;
  description?: string;
  type?: CampaignType;
  status: CampaignStatus;
  start_date?: string;
  end_date?: string;
  budget?: number;
  actual_spend?: number;
  currency?: string;
  target_leads?: number;
  target_conversions?: number;
  target_revenue?: number;
  actual_leads?: number;
  actual_conversions?: number;
  actual_revenue?: number;
  target_audience?: string;
  regions?: string[];
  tags?: string[];
  expense_account_id?: string;
  owner_id?: { _id: string; fullname: string; username: string };
  notes?: string;
  is_active: boolean;
  shop_id: string;
  tenant_id?: string;
  created_by?: string;
  createdAt: string;
  updatedAt: string;
  lead_stats?: Array<{ _id: string; count: number; total_value: number }>;
  targets?: SalesTarget[];
  budgets?: SalesBudget[];
}

export interface CampaignListResponse {
  total: number;
  page: number;
  pages: number;
  campaigns: Campaign[];
}

export interface FetchCampaignsParams {
  shop_id?: string;
  status?: CampaignStatus;
  type?: CampaignType;
  search?: string;
  page?: number;
  limit?: number;
}

export type TargetPeriod =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annual'
  | 'custom';

export type TargetType =
  | 'revenue'
  | 'units_sold'
  | 'leads_generated'
  | 'leads_converted'
  | 'gross_profit'
  | 'new_customers';

export interface TargetMilestone {
  label?: string;
  target?: number;
  actual?: number;
  date?: string;
}

export interface SalesTarget {
  _id: string;
  name: string;
  description?: string;
  type: TargetType;
  target_type?: 'individual' | 'department' | 'company';
  period: TargetPeriod;
  period_start: string;
  period_end: string;
  user_id?: { _id: string; fullname: string; username: string; thumbnail?: string } | string;
  role_id?: { _id: string; role_type: string; description?: string } | string;
  department_id?: { _id: string; name: string; code?: string } | string;
  team?: string;
  is_company_wide?: boolean;
  campaign_id?: { _id: string; name: string; type?: string; status?: string } | string;
  budget_id?: { _id: string; name: string; status?: string; period_start?: string; period_end?: string } | string;
  category_id?: { _id: string; category_name: string } | string;
  product_id?: { _id: string; product_name: string } | string;
  target_value: number;
  actual_value: number;
  currency?: string;
  milestones?: TargetMilestone[];
  status?: 'active' | 'completed' | 'missed';
  notes?: string;
  shop_id: string;
  createdAt: string;
  updatedAt: string;
}

export type BudgetPeriod = 'monthly' | 'quarterly' | 'annual' | 'custom';

export type BudgetStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'locked';

export interface BudgetLine {
  _id?: string;
  label?: string;
  category_id?: string;
  account_id?: string;
  budgeted_revenue?: number;
  actual_revenue?: number;
  budgeted_cogs?: number;
  actual_cogs?: number;
  budgeted_expenses?: number;
  actual_expenses?: number;
  notes?: string;
}

export interface SalesBudget {
  _id: string;
  name: string;
  description?: string;
  status: BudgetStatus;
  period: BudgetPeriod;
  period_start: string;
  period_end: string;
  campaign_id?: { _id: string; name: string; status: string; type?: string } | string;
  department_id?: { _id: string; name: string; code?: string } | string;
  budgeted_revenue?: number;
  actual_revenue?: number;
  budgeted_cogs?: number;
  actual_cogs?: number;
  budgeted_expenses?: number;
  actual_expenses?: number;
  currency?: string;
  lines?: BudgetLine[];
  submitted_by?: { _id: string; fullname: string; username: string };
  submitted_at?: string;
  approved_by?: { _id: string; fullname: string; username: string };
  approved_at?: string;
  rejection_reason?: string;
  shop_id: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'demo'
  | 'note'
  | 'task'
  | 'whatsapp'
  | 'site_visit'
  | 'ticket'
  | 'other';

export type ActivityOutcome =
  | 'no_answer'
  | 'left_voicemail'
  | 'follow_up_scheduled'
  | 'interested'
  | 'not_interested'
  | 'callback_requested'
  | 'completed'
  | 'cancelled';

export type ActivityStatus = 'open' | 'done' | 'cancelled';
export type ActivityPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ActivityLocationType = 'online' | 'in_person' | 'phone';

export interface LeadActivity {
  _id: string;
  lead_id?: string | { _id: string; lead_name?: string; company_name?: string; entity_type?: string; stage?: string };
  customer_id?: string | { _id: string; customer_name?: string; company_name?: string };
  type: ActivityType;
  subject?: string;
  description?: string;
  activity_date: string;
  duration_minutes?: number;
  outcome?: ActivityOutcome;
  status?: ActivityStatus;
  resolved_at?: string;
  priority?: ActivityPriority;
  next_action?: string;
  next_action_date?: string;
  location_type?: ActivityLocationType;
  meeting_link?: string;
  attendees?: Array<{ _id: string; name: string; username: string }> | string[];
  attachments?: Array<{ name: string; url: string; uploaded_at: string }>;
  shop_id?: string;
  tenant_id?: string;
}
