import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";
import { createAsyncThunk } from "@reduxjs/toolkit";

const BASE = `${BASE_URL}/crm/sales-targets`;

/* ============================================================
   TYPES
============================================================ */

export type TargetPeriod =
    | "daily"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "annual"
    | "custom";

export type TargetType =
    | "revenue"
    | "units_sold"
    | "leads_generated"
    | "leads_converted"
    | "gross_profit"
    | "new_customers";

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
    period: TargetPeriod;
    period_start: string;
    period_end: string;
    // ── Scope (at least one should be set) ─────────────────────────────────
    user_id?: { _id: string; fullname: string; username: string; thumbnail?: string } | string;
    role_id?: { _id: string; role_type: string; description?: string } | string;
    department_id?: { _id: string; name: string; code?: string } | string;
    team?: string;   // legacy free-text label
    // ── Campaign / Budget links ─────────────────────────────────────────────
    campaign_id?: { _id: string; name: string; type?: string; status?: string } | string;
    budget_id?: { _id: string; name: string; status?: string; period_start?: string; period_end?: string } | string;
    // ── Optional filters ────────────────────────────────────────────────────
    category_id?: { _id: string; category_name: string } | string;
    product_id?: { _id: string; product_name: string } | string;
    // ── Values ──────────────────────────────────────────────────────────────
    target_value: number;
    actual_value: number;
    currency?: string;
    milestones?: TargetMilestone[];
    notes?: string;
    is_active: boolean;
    shop_id: string;
    tenant_id?: string;
    created_by?: string;
    createdAt: string;
    updatedAt: string;
    // ── Computed (added by controller on lean queries) ──────────────────────
    achievement_percentage?: number;
    gap?: number;
    is_achieved?: boolean;
}

export interface SalesTargetListResponse {
    total: number;
    page: number;
    pages: number;
    targets: SalesTarget[];
}

export interface LeaderboardEntry {
    _id: string;
    name: string;
    thumbnail?: string | null;
    department_name?: string | null;
    target_value: number;
    actual_value: number;
    type: TargetType;
    achievement_pct: number;
    gap: number;
    is_achieved: boolean;
    period_start?: string;
    period_end?: string;
}

export interface FetchTargetsParams {
    shop_id?: string;
    user_id?: string;
    role_id?: string;
    department_id?: string;
    campaign_id?: string;
    budget_id?: string;
    team?: string;
    type?: TargetType;
    period?: TargetPeriod;
    is_active?: boolean;
    page?: number;
    limit?: number;
}

export interface FetchLeaderboardParams {
    shop_id: string;
    type?: TargetType;
    period_start?: string;
    period_end?: string;
    campaign_id?: string;
    department_id?: string;
}

/* ============================================================
   FETCH ALL
============================================================ */

export const fetchAllSalesTargets = async (
    params: FetchTargetsParams = {}
): Promise<SalesTargetListResponse> => {
    try {
        const response = await axiosInstance.get(BASE, { params });
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to fetch sales targets");
        return { total: 0, page: 1, pages: 0, targets: [] };
    }
};

/* ============================================================
   FETCH BY ID
============================================================ */

export const getSalesTargetById = async (
    id: string,
    shop_id: string
): Promise<SalesTarget | null> => {
    try {
        const response = await axiosInstance.get(`${BASE}/${id}`, { params: { shop_id } });
        return response.data;
    } catch (error: any) {
        const msg = error?.response?.data?.message || "Failed to fetch sales target";
        message.error(msg);
        throw new Error(msg);
    }
};

/* ============================================================
   LEADERBOARD
   Supports optional campaign_id and department_id filtering.
============================================================ */

export const fetchLeaderboard = async (
    params: FetchLeaderboardParams
): Promise<LeaderboardEntry[]> => {
    try {
        const response = await axiosInstance.get(`${BASE}/leaderboard`, { params });
        return response.data.leaderboard;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to fetch leaderboard");
        return [];
    }
};

/* ============================================================
   CREATE
   Pass user_id, role_id, or department_id (at least one) to
   scope the target. Pass campaign_id to tie to a campaign.
   Pass budget_id to tie to an approved budget.
============================================================ */

export const createSalesTarget = createAsyncThunk(
    "salesTargets/create",
    async (
        data: Omit<SalesTarget, "_id" | "actual_value" | "createdAt" | "updatedAt"> & {
            user_id?: string;
            role_id?: string;
            department_id?: string;
            campaign_id?: string;
            budget_id?: string;
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.post(BASE, data);
            message.success("Sales target created successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to create sales target";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   UPDATE
============================================================ */

export const updateSalesTarget = createAsyncThunk(
    "salesTargets/update",
    async (
        {
            id,
            data,
        }: {
            id: string;
            data: Partial<SalesTarget> & {
                shop_id: string;
                role_id?: string;
                department_id?: string;
                campaign_id?: string;
                budget_id?: string;
            };
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.put(`${BASE}/${id}`, data);
            message.success("Sales target updated successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to update sales target";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   UPDATE ACTUAL VALUE
============================================================ */

export const updateTargetActual = createAsyncThunk(
    "salesTargets/updateActual",
    async (
        { id, shop_id, actual_value }: { id: string; shop_id: string; actual_value: number },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.patch(`${BASE}/${id}/actual`, {
                shop_id,
                actual_value,
            });
            message.success("Actual value updated");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to update actual value";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   DELETE (soft)
============================================================ */

export const deleteSalesTarget = createAsyncThunk(
    "salesTargets/delete",
    async ({ id, shop_id }: { id: string; shop_id: string }, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`${BASE}/${id}`, { params: { shop_id } });
            message.success("Sales target deleted successfully");
            return id;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to delete sales target";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);