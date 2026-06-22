import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";
import { createAsyncThunk } from "@reduxjs/toolkit";

const BASE = `${BASE_URL}/crm/campaigns`;

/* ============================================================
   TYPES
============================================================ */

export type CampaignType =
    | "email"
    | "sms"
    | "social_media"
    | "google_ads"
    | "referral"
    | "event"
    | "flyer"
    | "radio"
    | "tv"
    | "other";

export type CampaignStatus =
    | "draft"
    | "scheduled"
    | "active"
    | "paused"
    | "completed"
    | "cancelled";

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
    // populated by getById
    lead_stats?: Array<{ _id: string; count: number; total_value: number }>;
    targets?: import("./salesTargets").SalesTarget[];
    budgets?: import("./salesBudgets").SalesBudget[];
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

/* ============================================================
   FETCH ALL
============================================================ */

export const fetchAllCampaigns = async (
    params: FetchCampaignsParams = {}
): Promise<CampaignListResponse> => {
    try {
        const response = await axiosInstance.get(BASE, { params });
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to fetch campaigns");
        return { total: 0, page: 1, pages: 0, campaigns: [] };
    }
};

/* ============================================================
   FETCH BY ID  (includes lead_stats, targets, budgets)
============================================================ */

export const getCampaignById = async (
    id: string,
    shop_id: string
): Promise<Campaign | null> => {
    try {
        const response = await axiosInstance.get(`${BASE}/${id}`, { params: { shop_id } });
        return response.data;
    } catch (error: any) {
        const msg = error?.response?.data?.message || "Failed to fetch campaign";
        message.error(msg);
        throw new Error(msg);
    }
};

/* ============================================================
   FETCH CAMPAIGN TARGETS  (SalesTarget docs scoped to a campaign)
============================================================ */

export const getCampaignTargets = async (
    campaign_id: string,
    shop_id: string
): Promise<import("./salesTargets").SalesTarget[]> => {
    try {
        const response = await axiosInstance.get(`${BASE}/${campaign_id}/targets`, {
            params: { shop_id },
        });
        return response.data?.targets || [];
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to fetch campaign targets");
        return [];
    }
};

/* ============================================================
   FETCH CAMPAIGN BUDGETS  (SalesBudget docs scoped to a campaign)
============================================================ */

export const getCampaignBudgets = async (
    campaign_id: string,
    shop_id: string
): Promise<import("./salesBudgets").SalesBudget[]> => {
    try {
        const response = await axiosInstance.get(`${BASE}/${campaign_id}/budgets`, {
            params: { shop_id },
        });
        return response.data?.budgets || [];
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to fetch campaign budgets");
        return [];
    }
};

/* ============================================================
   CREATE
============================================================ */

export const createCampaign = createAsyncThunk(
    "campaigns/create",
    async (
        data: Partial<Campaign> & { shop_id: string; name: string },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.post(BASE, data);
            // message.success("Campaign created successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to create campaign";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   UPDATE
============================================================ */

export const updateCampaign = createAsyncThunk(
    "campaigns/update",
    async (
        { id, data }: { id: string; data: Partial<Campaign> & { shop_id: string } },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.put(`${BASE}/${id}`, data);
            // message.success("Campaign updated successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to update campaign";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   UPDATE STATUS
============================================================ */

export const updateCampaignStatus = createAsyncThunk(
    "campaigns/updateStatus",
    async (
        { id, shop_id, status }: { id: string; shop_id: string; status: CampaignStatus },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.patch(`${BASE}/${id}/status`, { shop_id, status });
            // message.success(`Campaign status updated to '${status}'`);
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to update campaign status";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   UPDATE ACTUALS
============================================================ */

export const updateCampaignActuals = createAsyncThunk(
    "campaigns/updateActuals",
    async (
        {
            id, shop_id,
            actual_spend, actual_revenue, actual_leads, actual_conversions,
        }: {
            id: string; shop_id: string;
            actual_spend?: number; actual_revenue?: number;
            actual_leads?: number; actual_conversions?: number;
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.patch(`${BASE}/${id}/actuals`, {
                shop_id, actual_spend, actual_revenue, actual_leads, actual_conversions,
            });
            // message.success("Campaign actuals updated");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to update actuals";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   DELETE (soft)
============================================================ */

export const deleteCampaign = createAsyncThunk(
    "campaigns/delete",
    async ({ id, shop_id }: { id: string; shop_id: string }, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`${BASE}/${id}`, { params: { shop_id } });
            // message.success("Campaign deleted successfully");
            return id;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to delete campaign";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);