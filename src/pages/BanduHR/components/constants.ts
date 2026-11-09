import type { HRDashboardData } from "@services/bandu/dashboard";

export const PERIOD_LABELS: Record<string, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  custom: "Custom Period",
};

export const LEAVE_COLORS: Record<string, string> = {
  annual: "#10b981",
  sick: "#f59e0b",
  emergency: "#f97316",
  maternity: "#8b5cf6",
  paternity: "#3b82f6",
  compassionate: "#ef4444",
  unpaid: "#64748b",
};

export const DEPARTMENT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export const GENDER_COLORS: Record<string, string> = {
  male: "#3b82f6",
  female: "#ec4899",
  other: "#8b5cf6",
  prefer_not_to_say: "#64748b",
  not_specified: "#94a3b8",
};

export const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  on_leave: "#3b82f6",
  suspended: "#f59e0b",
  terminated: "#ef4444",
  resigned: "#64748b",
};

export const EMPLOYMENT_TYPE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
  "#64748b",
  "#94a3b8",
];

export const STATUTORY_ITEMS: { key: keyof HRDashboardData["statutory"]; label: string; color: string }[] = [
  { key: "paye", label: "PAYE", color: "#6366f1" },
  { key: "nssf", label: "NSSF", color: "#10b981" },
  { key: "shif", label: "SHIF", color: "#06b6d4" },
  { key: "housing_levy", label: "Housing Levy", color: "#f59e0b" },
  { key: "nita", label: "NITA", color: "#8b5cf6" },
  { key: "withholding_tax", label: "Withholding Tax", color: "#ec4899" },
];

export const PIPELINE_STAGES: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "#94a3b8" },
  pending_approval: { label: "Pending approval", color: "#f59e0b" },
  approved: { label: "Approved", color: "#3b82f6" },
  processed: { label: "Processed", color: "#8b5cf6" },
  paid: { label: "Paid", color: "#10b981" },
};

export const titleCase = (s: string) =>
  (s || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const fmt = (v: number) =>
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const getShopId = (): string => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.shop_id || user?.shopId || user?.shop || user?.branchId || user?.branch_id || "";
  } catch {
    return "";
  }
};
