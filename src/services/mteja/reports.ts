import axiosInstance from "../request";
import { BASE_URL } from "@utils/config";

const mtejaUrl = `${BASE_URL}/api/crm/mteja-reports`;

// ── Report Types ────────────────────────────────────────────────────────────────

export interface ReportParams {
  shop_id?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  source?: string;
  agent_id?: string;
  assigned_to?: string;
  lifecycle_stage?: string;
  type?: string;
  tag?: string;
  stage?: string;
  campaign_id?: string;
  period?: string;
  year?: number;
  customer_id?: string;
  lead_id?: string;
  activity_type?: string;
  limit?: number;
}

// ── Mteja/CRM Reports ─────────────────────────────────────────────────────────

/**
 * Customer Master List
 * Complete customer directory with CRM fields, lifecycle stages, sources, types, tags
 */
export const fetchCustomerMasterList = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${mtejaUrl}/customer-master-list`, { params });
  return response.data;
};

/**
 * Lead Pipeline Report
 * Lead stages and conversion tracking, source and campaign analysis, estimated value and probability
 */
export const fetchLeadPipelineReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${mtejaUrl}/lead-pipeline`, { params });
  return response.data;
};

/**
 * Campaign Performance Report
 * Campaign ROI and budget tracking, lead generation and conversion metrics
 */
export const fetchCampaignPerformanceReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${mtejaUrl}/campaign-performance`, { params });
  return response.data;
};

/**
 * Sales Target vs Actual Report
 * Sales target achievement tracking, revenue and customer acquisition goals
 */
export const fetchSalesTargetsReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${mtejaUrl}/sales-targets`, { params });
  return response.data;
};

/**
 * Customer Visit Report
 * Customer visit tracking and outcomes, visit type and purpose analysis
 */
export const fetchCustomerVisitReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${mtejaUrl}/customer-visits`, { params });
  return response.data;
};

/**
 * Lead Activity Report
 * Complete lead activity history, activity type breakdown, outcome tracking
 */
export const fetchLeadActivityReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${mtejaUrl}/lead-activities`, { params });
  return response.data;
};
