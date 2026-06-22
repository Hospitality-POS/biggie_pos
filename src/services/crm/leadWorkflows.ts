import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { LeadStage } from "./leads";

const BASE = `${BASE_URL}/crm/lead-workflows`;

/* ============================================================
   TYPES
============================================================ */

export type WorkflowActionType =
    | "assign_user"
    | "send_email"
    | "send_sms"
    | "send_whatsapp"
    | "create_activity"
    | "schedule_follow_up"
    | "add_tag"
    | "remove_tag"
    | "add_to_campaign"
    | "remove_from_campaign"
    | "notify_user"
    | "convert_to_customer"
    | "webhook";

export interface WorkflowActionPayload {
    user_id?: string;
    template_id?: string;
    message?: string;
    subject?: string;
    activity_type?: string;
    activity_subject?: string;
    activity_description?: string;
    follow_up_days?: number;
    tag?: string;
    campaign_id?: string;
    notify_user_id?: string;
    notification_message?: string;
    webhook_url?: string;
    webhook_method?: "GET" | "POST" | "PUT";
}

export interface WorkflowAction {
    _id?: string;
    type: WorkflowActionType;
    delay_minutes?: number;
    payload?: WorkflowActionPayload;
}

export interface LeadWorkflow {
    _id: string;
    name: string;
    description?: string;
    trigger_stage: LeadStage;
    trigger_source?: string;
    trigger_min_value?: number;
    trigger_assigned_to?: string;
    actions: WorkflowAction[];
    run_once: boolean;
    priority: number;
    is_active: boolean;
    shop_id: string;
    tenant_id?: string;
    created_by?: { _id: string; name: string; username: string };
    createdAt: string;
    updatedAt: string;
}

export interface WorkflowLog {
    _id: string;
    lead_id: string;
    workflow_id: { _id: string; name: string; trigger_stage: LeadStage };
    action_type?: string;
    status: "pending" | "success" | "failed" | "skipped";
    triggered_at: string;
    completed_at?: string;
    error_message?: string;
    payload_snapshot?: any;
}

export interface WorkflowLogResponse {
    total: number;
    page: number;
    pages: number;
    logs: WorkflowLog[];
}

/* ============================================================
   FETCH ALL
============================================================ */

export const fetchAllWorkflows = async (params: {
    shop_id: string;
    trigger_stage?: LeadStage;
    is_active?: boolean;
}): Promise<LeadWorkflow[]> => {
    try {
        const response = await axiosInstance.get(BASE, { params });
        return response.data.workflows;
    } catch (error: any) {
        console.error("Error fetching workflows:", error);
        message.error(error?.response?.data?.message || "Failed to fetch workflows");
        return [];
    }
};

/* ============================================================
   FETCH BY ID
============================================================ */

export const getWorkflowById = async (
    id: string,
    shop_id: string
): Promise<LeadWorkflow | null> => {
    try {
        const response = await axiosInstance.get(`${BASE}/${id}`, {
            params: { shop_id },
        });
        return response.data.workflow;
    } catch (error: any) {
        const msg = error?.response?.data?.message || "Failed to fetch workflow";
        message.error(msg);
        throw new Error(msg);
    }
};

/* ============================================================
   FETCH LOGS FOR A LEAD
============================================================ */

export const fetchWorkflowLogs = async (
    lead_id: string,
    params: { status?: string; page?: number; limit?: number } = {}
): Promise<WorkflowLogResponse> => {
    try {
        const response = await axiosInstance.get(`${BASE}/logs/${lead_id}`, {
            params,
        });
        return response.data;
    } catch (error: any) {
        console.error("Error fetching workflow logs:", error);
        message.error(error?.response?.data?.message || "Failed to fetch workflow logs");
        return { total: 0, page: 1, pages: 0, logs: [] };
    }
};

/* ============================================================
   CREATE
============================================================ */

export const createWorkflow = createAsyncThunk(
    "leadWorkflows/create",
    async (
        data: Omit<LeadWorkflow, "_id" | "createdAt" | "updatedAt">,
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.post(BASE, data);
            // message.success("Workflow created successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to create workflow";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   UPDATE
============================================================ */

export const updateWorkflow = createAsyncThunk(
    "leadWorkflows/update",
    async (
        { id, data }: { id: string; data: Partial<LeadWorkflow> & { shop_id: string } },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.put(`${BASE}/${id}`, data);
            // message.success("Workflow updated successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to update workflow";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   TOGGLE ACTIVE
============================================================ */

export const toggleWorkflowActive = createAsyncThunk(
    "leadWorkflows/toggle",
    async (
        { id, shop_id }: { id: string; shop_id: string },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.patch(`${BASE}/${id}/toggle`, {
                shop_id,
            });
            // message.success(response.data.message);
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to toggle workflow";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   MANUALLY TRIGGER FOR A LEAD
============================================================ */

export const triggerWorkflowForLead = createAsyncThunk(
    "leadWorkflows/trigger",
    async (
        { id, shop_id, lead_id }: { id: string; shop_id: string; lead_id: string },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.post(`${BASE}/${id}/trigger`, {
                shop_id,
                lead_id,
            });
            // message.success("Workflow triggered successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to trigger workflow";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   DELETE
============================================================ */

export const deleteWorkflow = createAsyncThunk(
    "leadWorkflows/delete",
    async (
        { id, shop_id }: { id: string; shop_id: string },
        { rejectWithValue }
    ) => {
        try {
            await axiosInstance.delete(`${BASE}/${id}`, { params: { shop_id } });
            // message.success("Workflow deleted successfully");
            return id;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to delete workflow";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);