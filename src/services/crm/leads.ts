import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ParamsType } from "@ant-design/pro-components";

const BASE = `${BASE_URL}/crm/leads`;

/* ============================================================
   TYPES
============================================================ */

export type LeadStage =
    | "new"
    | "contacted"
    | "qualified"
    | "proposal"
    | "negotiation"
    | "won"
    | "lost"
    | "disqualified";

export type LeadSource =
    | "walk_in"
    | "referral"
    | "social_media"
    | "website"
    | "cold_call"
    | "email_campaign"
    | "exhibition"
    | "partner"
    | "other";

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
    lead_name: string;
    company_name?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: LeadAddress;
    stage: LeadStage;
    source?: LeadSource;
    estimated_value?: number;
    currency?: string;
    probability?: number;
    expected_close_date?: string;
    assigned_to?: { _id: string; name: string; username: string };
    campaign_id?: { _id: string; name: string };
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
    tenant_id: string;
    created_by?: string;
    createdAt: string;
    updatedAt: string;
    // attached by getById
    activities?: import("./crm/leadActivities").LeadActivity[];
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
    source?: LeadSource;
    assigned_to?: string;
    campaign_id?: string;
    search?: string;
    page?: number;
    limit?: number;
}

/* ============================================================
   FETCH ALL
============================================================ */

export const fetchAllLeads = async (
    params: FetchLeadsParams = {}
): Promise<LeadListResponse> => {
    try {
        const response = await axiosInstance.get(BASE, { params });
        return response.data;
    } catch (error: any) {
        console.error("Error fetching leads:", error);
        message.error(error?.response?.data?.message || "Failed to fetch leads");
        return { total: 0, page: 1, pages: 0, leads: [] };
    }
};

/* ============================================================
   FETCH BY ID
============================================================ */

export const getLeadById = async (
    leadId: string,
    shop_id: string
): Promise<Lead | null> => {
    try {
        const response = await axiosInstance.get(`${BASE}/${leadId}`, {
            params: { shop_id },
        });
        return response.data;
    } catch (error: any) {
        const msg = error?.response?.data?.message || "Failed to fetch lead";
        message.error(msg);
        throw new Error(msg);
    }
};

/* ============================================================
   PIPELINE SUMMARY
============================================================ */

export const fetchPipelineSummary = async (
    shop_id: string
): Promise<PipelineStageSummary[]> => {
    try {
        const response = await axiosInstance.get(`${BASE}/pipeline-summary`, {
            params: { shop_id },
        });
        return response.data.summary;
    } catch (error: any) {
        console.error("Error fetching pipeline summary:", error);
        message.error(error?.response?.data?.message || "Failed to fetch pipeline summary");
        return [];
    }
};

/* ============================================================
   CREATE
============================================================ */

export const createLead = createAsyncThunk(
    "leads/create",
    async (data: Partial<Lead> & { shop_id: string; lead_name: string }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(BASE, data);
            message.success("Lead created successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to create lead";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   UPDATE
============================================================ */

export const updateLead = createAsyncThunk(
    "leads/update",
    async (
        { id, data }: { id: string; data: Partial<Lead> & { shop_id: string } },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.put(`${BASE}/${id}`, data);
            message.success("Lead updated successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to update lead";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   UPDATE STAGE
============================================================ */

export const updateLeadStage = createAsyncThunk(
    "leads/updateStage",
    async (
        {
            id,
            shop_id,
            stage,
            note,
        }: { id: string; shop_id: string; stage: LeadStage; note?: string },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.patch(`${BASE}/${id}/stage`, {
                shop_id,
                stage,
                note,
            });
            message.success(`Lead moved to '${stage}'`);
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to update stage";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   CONVERT LEAD → CUSTOMER
============================================================ */

export const convertLead = createAsyncThunk(
    "leads/convert",
    async (
        { id, shop_id }: { id: string; shop_id: string },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.post(`${BASE}/${id}/convert`, {
                shop_id,
            });
            message.success("Lead converted to customer successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to convert lead";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   DELETE (soft)
============================================================ */

export const deleteLead = createAsyncThunk(
    "leads/delete",
    async (
        { id, shop_id }: { id: string; shop_id: string },
        { rejectWithValue }
    ) => {
        try {
            await axiosInstance.delete(`${BASE}/${id}`, { params: { shop_id } });
            message.success("Lead deleted successfully");
            return id;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to delete lead";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);