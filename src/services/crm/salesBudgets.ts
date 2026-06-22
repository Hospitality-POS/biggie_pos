import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";
import { createAsyncThunk } from "@reduxjs/toolkit";

const BASE = `${BASE_URL}/crm/sales-budgets`;

/* ============================================================
   TYPES
============================================================ */

export type BudgetPeriod = "monthly" | "quarterly" | "annual" | "custom";

export type BudgetStatus =
    | "draft"
    | "submitted"
    | "approved"
    | "rejected"
    | "locked";

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
    // ── Campaign & Department links ─────────────────────────────────────────
    campaign_id?: { _id: string; name: string; status: string; type?: string } | string;
    department_id?: { _id: string; name: string; code?: string } | string;
    // ── Financials ──────────────────────────────────────────────────────────
    budgeted_revenue?: number;
    actual_revenue?: number;
    budgeted_cogs?: number;
    actual_cogs?: number;
    budgeted_expenses?: number;
    actual_expenses?: number;
    currency?: string;
    lines?: BudgetLine[];
    // ── Approval ────────────────────────────────────────────────────────────
    submitted_by?: { _id: string; fullname: string; username: string };
    submitted_at?: string;
    approved_by?: { _id: string; fullname: string; username: string };
    approved_at?: string;
    rejection_reason?: string;
    notes?: string;
    is_active: boolean;
    shop_id: string;
    tenant_id?: string;
    created_by?: { _id: string; fullname: string; username: string };
    createdAt: string;
    updatedAt: string;
    // ── Computed (added by controller) ──────────────────────────────────────
    revenue_variance?: number;
    revenue_variance_pct?: number | null;
    budgeted_gross_profit?: number;
    actual_gross_profit?: number;
}

export interface SalesBudgetListResponse {
    total: number;
    page: number;
    pages: number;
    budgets: SalesBudget[];
}

export interface FetchBudgetsParams {
    shop_id?: string;
    status?: BudgetStatus;
    period?: BudgetPeriod;
    campaign_id?: string;
    department_id?: string;
    page?: number;
    limit?: number;
}

/* ============================================================
   FETCH ALL
============================================================ */

export const fetchAllSalesBudgets = async (
    params: FetchBudgetsParams = {}
): Promise<SalesBudgetListResponse> => {
    try {
        const response = await axiosInstance.get(BASE, { params });
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to fetch sales budgets");
        return { total: 0, page: 1, pages: 0, budgets: [] };
    }
};

/* ============================================================
   FETCH BY ID
============================================================ */

export const getSalesBudgetById = async (
    id: string,
    shop_id: string
): Promise<SalesBudget | null> => {
    try {
        const response = await axiosInstance.get(`${BASE}/${id}`, { params: { shop_id } });
        return response.data;
    } catch (error: any) {
        const msg = error?.response?.data?.message || "Failed to fetch budget";
        message.error(msg);
        throw new Error(msg);
    }
};

/* ============================================================
   CREATE
   campaign_id and department_id are optional — pass them to
   scope a budget to a specific campaign or department.
============================================================ */

export const createSalesBudget = createAsyncThunk(
    "salesBudgets/create",
    async (
        data: Partial<SalesBudget> & {
            shop_id: string;
            name: string;
            period_start: string;
            period_end: string;
            campaign_id?: string;
            department_id?: string;
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.post(BASE, data);
            // message.success("Budget created successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to create budget";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   UPDATE
============================================================ */

export const updateSalesBudget = createAsyncThunk(
    "salesBudgets/update",
    async (
        {
            id,
            data,
        }: {
            id: string;
            data: Partial<SalesBudget> & { shop_id: string; campaign_id?: string; department_id?: string };
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.put(`${BASE}/${id}`, data);
            // message.success("Budget updated successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to update budget";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   SUBMIT FOR APPROVAL
============================================================ */

export const submitSalesBudget = createAsyncThunk(
    "salesBudgets/submit",
    async ({ id, shop_id }: { id: string; shop_id: string }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.patch(`${BASE}/${id}/submit`, { shop_id });
            // message.success("Budget submitted for approval");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to submit budget";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   APPROVE / REJECT
============================================================ */

export const approveSalesBudget = createAsyncThunk(
    "salesBudgets/approve",
    async (
        {
            id, shop_id, action, rejection_reason,
        }: {
            id: string; shop_id: string;
            action: "approve" | "reject";
            rejection_reason?: string;
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.patch(`${BASE}/${id}/approve`, {
                shop_id, action, rejection_reason,
            });
            // message.success(action === "approve" ? "Budget approved" : "Budget rejected");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to process budget approval";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   UPDATE ACTUALS
============================================================ */

export const updateBudgetActuals = createAsyncThunk(
    "salesBudgets/updateActuals",
    async (
        {
            id, shop_id, actual_revenue, actual_cogs, actual_expenses,
        }: {
            id: string; shop_id: string;
            actual_revenue?: number; actual_cogs?: number; actual_expenses?: number;
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.patch(`${BASE}/${id}/actuals`, {
                shop_id, actual_revenue, actual_cogs, actual_expenses,
            });
            // message.success("Budget actuals updated");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to update budget actuals";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   DELETE (soft)
============================================================ */

export const deleteSalesBudget = createAsyncThunk(
    "salesBudgets/delete",
    async ({ id, shop_id }: { id: string; shop_id: string }, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`${BASE}/${id}`, { params: { shop_id } });
            // message.success("Budget deleted successfully");
            return id;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to delete budget";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);