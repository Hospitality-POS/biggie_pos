// ── Pesa Accounting Constants & Utilities ──────────────────────────────────────

export const PERIOD_LABELS: Record<string, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  custom: "Custom Period",
};

export const getShopId = (): string => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.shop_id || user?.shopId || user?.shop || user?.branchId || user?.branch_id || "";
  } catch {
    return "";
  }
};

export const fmt = (v: number) =>
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const SOURCE_COLORS: Record<string, string> = {
  manual: "#6366f1",
  journal: "#ec4899",
  pos_sale: "#3b82f6",
  pos_subscription: "#06b6d4",
  invoice: "#10b981",
  bill: "#f59e0b",
  payment: "#8b5cf6",
  reconciliation: "#6366f1",
  bank_upload: "#fbbf24",
  income: "#10b981",
  expense: "#f97316",
  payroll: "#8b5cf6",
  credit_note: "#06b6d4",
  debit_note: "#3b82f6",
  note_void: "#ef4444",
};

export const EXPENSE_PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#06b6d4",
];
