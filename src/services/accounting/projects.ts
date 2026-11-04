import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

// ============================================
// TYPES
// ============================================

export type ProjectStatus = "Active" | "On Hold" | "Completed" | "Cancelled";

export interface ProjectTotals {
    revenue: number;
    expenses: number;
    net_profit: number;
}

export interface Project {
    _id: string;
    name: string;
    code?: string;
    description?: string;
    status: ProjectStatus;
    customer_id?: string | { _id: string; customer_name: string } | null;
    start_date?: string;
    end_date?: string;
    budget?: number;
    color?: string;
    shop_id?: string | null;
    is_archived?: boolean;
    totals?: ProjectTotals;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProjectInput {
    name: string;
    code?: string;
    description?: string;
    status?: ProjectStatus;
    customer_id?: string | null;
    start_date?: string;
    end_date?: string;
    budget?: number;
    color?: string;
    shop_id?: string | null;
    is_archived?: boolean;
}

export interface GetProjectsParams {
    search?: string;
    status?: string;
    shop_id?: string;
    include_archived?: boolean;
    with_totals?: boolean;
}

interface ApiError {
    response?: { data?: { message?: string } };
}

const showError = (error: unknown, fallback: string) => {
    const err = error as ApiError;
    message.error(err.response?.data?.message || fallback);
};

// ============================================
// API
// ============================================

export const getProjects = async (params: GetProjectsParams = {}) => {
    const response = await axiosInstance.get(`${BASE_URL}/accounting/projects`, { params });
    return response.data as { projects: Project[] };
};

export const getProjectById = async (id: string, params: { from?: string; to?: string } = {}) => {
    const response = await axiosInstance.get(`${BASE_URL}/accounting/projects/${id}`, { params });
    return response.data as { project: Project };
};

export const createProject = async (data: ProjectInput) => {
    try {
        const response = await axiosInstance.post(`${BASE_URL}/accounting/projects`, data);
        message.success("Project created");
        return response.data as { project: Project };
    } catch (error) {
        showError(error, "Error creating project");
        throw error;
    }
};

export const updateProject = async (id: string, data: Partial<ProjectInput>) => {
    try {
        const response = await axiosInstance.put(`${BASE_URL}/accounting/projects/${id}`, data);
        message.success("Project updated");
        return response.data as { project: Project };
    } catch (error) {
        showError(error, "Error updating project");
        throw error;
    }
};

/** Deletes an unused project; one with transactions is archived instead. */
export const deleteProject = async (id: string) => {
    try {
        const response = await axiosInstance.delete(`${BASE_URL}/accounting/projects/${id}`);
        message.success(response.data?.message || "Project deleted");
        return response.data as { archived: boolean };
    } catch (error) {
        showError(error, "Error deleting project");
        throw error;
    }
};

export type ProjectDocType = "expense" | "bill" | "invoice" | "sales_receipt" | "journal_entry";

/**
 * Tag a document (or a journal entry) with a project — or clear it with null.
 * Updates the document and every journal line it posted.
 */
export const tagProject = async (data: { doc_type: ProjectDocType; doc_id: string; project_id: string | null }) => {
    try {
        const response = await axiosInstance.patch(`${BASE_URL}/accounting/projects/tag`, data);
        message.success(response.data?.message || "Project updated");
        return response.data as { doc_type: ProjectDocType; doc_id: string; project_id: string | null };
    } catch (error) {
        showError(error, "Error tagging project");
        throw error;
    }
};

// ============================================
// PROJECTS REPORT (Profit & Loss per project)
// ============================================

export interface ProjectReportAccount {
    account_id: string;
    account_code: string;
    account_name: string;
    account_type: "REVENUE" | "EXPENSE";
    amount: number;
}

export interface ProjectReportRow {
    revenue: number;
    expenses: number;
    net_profit: number;
    margin_pct: number | null;
    transactions: number;
    accounts: ProjectReportAccount[];
}

export interface ProjectReportProject extends ProjectReportRow {
    _id: string;
    name: string;
    code?: string;
    status: ProjectStatus;
    is_archived: boolean;
    customer_name: string | null;
    start_date?: string;
    end_date?: string;
    budget: number;
    budget_used_pct: number | null;
}

export interface ProjectsReportResponse {
    report: string;
    period: { from: string; to: string };
    projects: ProjectReportProject[];
    untagged: ProjectReportRow;
    totals: {
        tagged_revenue: number;
        tagged_expenses: number;
        tagged_net_profit: number;
        revenue: number;
        expenses: number;
        net_profit: number;
    };
}

export const getProjectsReport = async (params: { from?: string; to?: string; shop_id?: string; status?: string }) => {
    const response = await axiosInstance.get(`${BASE_URL}/accounting/projects/report`, { params });
    return response.data as ProjectsReportResponse;
};
