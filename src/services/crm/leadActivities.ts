import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";
import { createAsyncThunk } from "@reduxjs/toolkit";

const BASE = `${BASE_URL}/crm/lead-activities`;

/* ============================================================
   TYPES
============================================================ */

export type ActivityType =
    | "call"
    | "email"
    | "meeting"
    | "demo"
    | "note"
    | "task"
    | "whatsapp"
    | "site_visit"
    | "other";

export type ActivityOutcome =
    | "no_answer"
    | "left_voicemail"
    | "follow_up_scheduled"
    | "interested"
    | "not_interested"
    | "callback_requested"
    | "completed"
    | "cancelled";

export interface LeadActivity {
    _id: string;
    lead_id: string;
    customer_id?: string;
    type: ActivityType;
    subject?: string;
    description?: string;
    activity_date: string;
    duration_minutes?: number;
    outcome?: ActivityOutcome;
    next_action?: string;
    next_action_date?: string;
    attachments?: Array<{ name: string; url: string; uploaded_at: string }>;
    shop_id?: string;
    tenant_id?: string;
    created_by?: { _id: string; name: string; username: string };
    createdAt: string;
    updatedAt: string;
}

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

/* ============================================================
   FETCH ALL FOR A LEAD
============================================================ */

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
        console.error("Error fetching activities:", error);
        message.error(error?.response?.data?.message || "Failed to fetch activities");
        return { total: 0, page: 1, pages: 0, activities: [] };
    }
};

/* ============================================================
   ACTIVITY SUMMARY
============================================================ */

export const fetchActivitySummary = async (params: {
    shop_id: string;
    start_date?: string;
    end_date?: string;
}): Promise<ActivitySummaryItem[]> => {
    try {
        const response = await axiosInstance.get(`${BASE}/summary`, { params });
        return response.data.summary;
    } catch (error: any) {
        console.error("Error fetching activity summary:", error);
        message.error(error?.response?.data?.message || "Failed to fetch activity summary");
        return [];
    }
};

/* ============================================================
   CREATE
============================================================ */

export const createLeadActivity = createAsyncThunk(
    "leadActivities/create",
    async (
        data: {
            lead_id: string;
            type: ActivityType;
            shop_id?: string;
            subject?: string;
            description?: string;
            activity_date?: string;
            duration_minutes?: number;
            outcome?: ActivityOutcome;
            next_action?: string;
            next_action_date?: string;
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.post(BASE, data);
            message.success("Activity logged successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to log activity";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   UPDATE
============================================================ */

export const updateLeadActivity = createAsyncThunk(
    "leadActivities/update",
    async (
        { id, data }: { id: string; data: Partial<LeadActivity> },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.put(`${BASE}/${id}`, data);
            message.success("Activity updated successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to update activity";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   DELETE
============================================================ */

export const deleteLeadActivity = createAsyncThunk(
    "leadActivities/delete",
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`${BASE}/${id}`);
            message.success("Activity deleted successfully");
            return id;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to delete activity";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);