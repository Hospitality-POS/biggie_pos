import { axiosInstance } from '../../../services/client';
import { BASE_URL } from '@utils/config';

const mtejaUrl = `${BASE_URL}/api/crm/mteja-reports`;

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

export const fetchCustomerMasterList = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${mtejaUrl}/customer-master-list`, { params });
  return response.data;
};

export const fetchLeadPipelineReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${mtejaUrl}/lead-pipeline`, { params });
  return response.data;
};

export const fetchCampaignPerformanceReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${mtejaUrl}/campaign-performance`, { params });
  return response.data;
};

export const fetchSalesTargetsReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${mtejaUrl}/sales-targets`, { params });
  return response.data;
};

export const fetchCustomerVisitReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${mtejaUrl}/customer-visits`, { params });
  return response.data;
};

export const fetchLeadActivityReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${mtejaUrl}/lead-activities`, { params });
  return response.data;
};
