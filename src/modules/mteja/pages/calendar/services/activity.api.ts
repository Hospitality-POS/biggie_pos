import { message } from 'antd';
import type { ParamsType } from '@ant-design/pro-components';
import { axiosInstance } from '../../../services/client';
import { BASE_URL } from '@utils/config';
import type {
  LeadActivity,
  ActivityType,
  ActivityOutcome,
  ActivityStatus,
  ActivityPriority,
  ActivityLocationType,
} from '../../../types';

const BASE = `${BASE_URL}/api/crm/lead-activities`;

export interface ActivityListResponse {
  total: number;
  page: number;
  pages: number;
  activities: LeadActivity[];
}

export interface ActivitySummaryItem {
  _id: ActivityType;
  count: number;
  avg_duration: number;
}

export interface CreateActivityPayload {
  lead_id?: string;
  customer_id?: string;
  type: ActivityType;
  shop_id?: string;
  subject?: string;
  description?: string;
  activity_date?: string;
  duration_minutes?: number;
  outcome?: ActivityOutcome;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  next_action?: string;
  next_action_date?: string;
  location_type?: ActivityLocationType;
  meeting_link?: string;
  attendees?: string[];
}

export const fetchAllActivities = async (params: {
  shop_id?: string;
  lead_id?: string;
  customer_id?: string;
  type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
} = {}): Promise<ActivityListResponse> => {
  try {
    const response = await axiosInstance.get(BASE, { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch activities');
    return { total: 0, page: 1, pages: 0, activities: [] };
  }
};

export const fetchLeadActivities = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(BASE, { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch activities');
    return { data: [], total: 0 };
  }
};

export const fetchActivitiesByLead = async (
  lead_id: string,
  params: { type?: ActivityType; page?: number; limit?: number } = {}
): Promise<ActivityListResponse> => {
  try {
    const response = await axiosInstance.get(`${BASE}/lead/${lead_id}`, {
      params,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch activities');
    return { total: 0, page: 1, pages: 0, activities: [] };
  }
};

export const fetchActivitySummary = async (params: {
  shop_id: string;
  start_date?: string;
  end_date?: string;
}): Promise<ActivitySummaryItem[]> => {
  try {
    const response = await axiosInstance.get(`${BASE}/summary`, { params });
    return response.data.summary;
  } catch (error: any) {
    console.error('Error fetching activity summary:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch activity summary');
    return [];
  }
};

export const createLeadActivity = async (data: CreateActivityPayload | any) => {
  try {
    const response = await axiosInstance.post(BASE, data);
    message.success('Activity logged successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to log activity';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateLeadActivity = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.put(`${BASE}/${id}`, data);
    message.success('Activity updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update activity';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const resolveActivity = async (
  id: string,
  outcome: 'done' | 'cancelled'
): Promise<LeadActivity | null> => {
  try {
    const response = await axiosInstance.put(`${BASE}/${id}`, {
      status: outcome,
      resolved_at: new Date().toISOString(),
    });
    message.success(outcome === 'done' ? 'Marked as done' : 'Activity cancelled');
    return response.data?.activity || null;
  } catch (error: any) {
    message.error(error?.response?.data?.message || 'Failed to update activity');
    return null;
  }
};

export const rescheduleActivity = async (
  id: string,
  activity_date: string
): Promise<LeadActivity | null> => {
  try {
    const response = await axiosInstance.put(`${BASE}/${id}`, {
      activity_date,
      status: 'open',
      resolved_at: null,
    });
    message.success('Activity rescheduled');
    return response.data?.activity || null;
  } catch (error: any) {
    message.error(error?.response?.data?.message || 'Failed to reschedule activity');
    return null;
  }
};

export const deleteLeadActivity = async (id: string, shop_id?: string) => {
  try {
    const response = await axiosInstance.delete(`${BASE}/${id}`, {
      params: shop_id ? { shop_id } : undefined,
    });
    message.success('Activity deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete activity';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};
