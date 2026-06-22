import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";
import { createAsyncThunk } from "@reduxjs/toolkit";

const BASE = `${BASE_URL}/crm/departments`;

/* ============================================================
   TYPES
============================================================ */

export interface Department {
    _id: string;
    name: string;
    code?: string;
    description?: string;
    // ── Hierarchy ───────────────────────────────────────────────────────────
    parent_id?: { _id: string; name: string; code?: string } | string | null;
    children?: Pick<Department, "_id" | "name" | "code" | "description">[];
    // ── Leadership ──────────────────────────────────────────────────────────
    head_user_id?: {
        _id: string;
        fullname: string;
        username: string;
        thumbnail?: string;
    } | string | null;
    // ── Role associations ────────────────────────────────────────────────────
    associated_roles?: Array<{ _id: string; role_type: string; description?: string }> | string[];
    // ── Stats (populated by getById) ─────────────────────────────────────────
    member_count?: number;
    targets?: import("./salesTargets").SalesTarget[];
    budgets?: import("./salesBudgets").SalesBudget[];
    // ── Meta ─────────────────────────────────────────────────────────────────
    is_active: boolean;
    color?: string;
    icon?: string;
    tenant_id: string;
    created_by?: string;
    createdAt: string;
    updatedAt: string;
}

export interface DepartmentMember {
    _id: string;
    fullname: string;
    username: string;
    email: string;
    thumbnail?: string;
    status: string;
    shop_id?: string;
    roleId?: { _id: string; role_type: string };
}

export interface DepartmentListResponse {
    total: number;
    departments: Department[];
}

export interface FetchDepartmentsParams {
    search?: string;
    is_active?: boolean;
    parent_id?: string | "root";  // "root" → top-level only
}

export interface CreateDepartmentData {
    name: string;
    code?: string;
    description?: string;
    parent_id?: string | null;
    head_user_id?: string | null;
    associated_roles?: string[];
    color?: string;
    icon?: string;
    tenant_id: string;
}

export interface AssignUsersData {
    user_ids: string[];
    mode: "add" | "remove";
}

/* ============================================================
   FETCH ALL  (tenant-level — no shop_id needed)
============================================================ */

export const fetchAllDepartments = async (
    params: FetchDepartmentsParams = {}
): Promise<DepartmentListResponse> => {
    try {
        const response = await axiosInstance.get(BASE, { params });
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to fetch departments");
        return { total: 0, departments: [] };
    }
};

/* ============================================================
   FETCH BY ID  (includes children, member_count, targets, budgets)
============================================================ */

export const getDepartmentById = async (id: string): Promise<Department | null> => {
    try {
        const response = await axiosInstance.get(`${BASE}/${id}`);
        return response.data;
    } catch (error: any) {
        const msg = error?.response?.data?.message || "Failed to fetch department";
        message.error(msg);
        throw new Error(msg);
    }
};

/* ============================================================
   FETCH MEMBERS
============================================================ */

export const getDepartmentMembers = async (
    id: string,
    shop_id?: string
): Promise<{ department: string; total: number; members: DepartmentMember[] }> => {
    try {
        const response = await axiosInstance.get(`${BASE}/${id}/members`, {
            params: shop_id ? { shop_id } : {},
        });
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to fetch department members");
        return { department: "", total: 0, members: [] };
    }
};

/* ============================================================
   CREATE
============================================================ */

export const createDepartment = createAsyncThunk(
    "departments/create",
    async (data: CreateDepartmentData, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(BASE, data);
            // message.success("Department created successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to create department";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   UPDATE
============================================================ */

export const updateDepartment = createAsyncThunk(
    "departments/update",
    async (
        { id, data }: { id: string; data: Partial<CreateDepartmentData> },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.put(`${BASE}/${id}`, data);
            // message.success("Department updated successfully");
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to update department";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   ASSIGN / REMOVE USERS
   mode "add"    → sets department_id on the listed users
   mode "remove" → clears department_id from the listed users
============================================================ */

export const assignUsersToDepartment = createAsyncThunk(
    "departments/assignUsers",
    async (
        { id, user_ids, mode = "add" }: { id: string } & AssignUsersData,
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.post(`${BASE}/${id}/assign`, {
                user_ids,
                mode,
            });
            // message.success(
            //     mode === "remove"
            //         ? "Users removed from department"
            //         : "Users assigned to department"
            // );
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to assign users";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);

/* ============================================================
   DELETE (soft)
   Also clears department_id on all department members server-side.
============================================================ */

export const deleteDepartment = createAsyncThunk(
    "departments/delete",
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.delete(`${BASE}/${id}`);
            // message.success("Department deleted successfully");
            return { id, members_unassigned: response.data?.members_unassigned ?? 0 };
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to delete department";
            message.error(msg);
            return rejectWithValue(msg);
        }
    }
);