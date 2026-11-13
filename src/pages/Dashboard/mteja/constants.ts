import dayjs from "dayjs";
import { THEME_C } from "@utils/getPrimaryColor";
import { fmtKES } from "@utils/formatters";
import type { SalesTarget } from "@services/crm/salesTargets";

// ── Color Constants ───────────────────────────────────────────────────────────
export const C = {
  ...THEME_C,
  get primary() { return THEME_C.primary; },
  get primaryLight() { return THEME_C.primaryLight; },
  success: "#10b981",
  successLight: "#f0fdf4",
  warning: "#f59e0b",
  warningLight: "#fffbeb",
  error: "#ef4444",
  errorLight: "#fef2f2",
  purple: "#6366f1",
  purpleLight: "#f5f3ff",
  orange: "#f97316",
  orangeLight: "#fff7ed",
  teal: "#0d9488",
  tealLight: "#f0fdfa",
  blue: "#3b82f6",
  blueLight: "#eff6ff",
  gray: "#64748b",
  text: "#0f172a",
  subtext: "#64748b",
};

export const PERIOD_LABELS: Record<string, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  custom: "Custom",
};

export const LEAD_STAGES = [
  { key: "new", label: "New", color: "#64748b" },
  { key: "contacted", label: "Contacted", color: "#3b82f6" },
  { key: "qualified", label: "Qualified", color: "#6366f1" },
  { key: "proposal", label: "Proposal", color: "#f97316" },
  { key: "negotiation", label: "Negotiation", color: "#f59e0b" },
  { key: "won", label: "Won", color: "#10b981" },
  { key: "lost", label: "Lost", color: "#ef4444" },
];

export const TARGET_TYPE_LABELS: Record<string, string> = {
  revenue: "Revenue",
  units_sold: "Units Sold",
  leads_generated: "Leads Generated",
  leads_converted: "Leads Converted",
  gross_profit: "Gross Profit",
  new_customers: "New Customers",
};

export const LIVE_TARGET_TYPES = ["revenue", "leads_generated", "leads_converted", "new_customers"];

export const CH_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
  messenger: "#0084FF",
  instagram: "#E1306C",
  email: "#3b82f6",
  sms: "#f97316",
};

export const ST_COLORS: Record<string, string> = {
  open: C.blue,
  pending: C.warning,
  resolved: C.success,
  closed: C.gray,
};

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export const isMoneyTarget = (t?: string) => t === "revenue" || t === "gross_profit";

export const fmtTargetValue = (v: number | undefined, type?: string) =>
  isMoneyTarget(type) ? fmtKES(v || 0) : (v || 0).toLocaleString();

export const achievementColor = (p: number) => (p >= 100 ? "#10b981" : p >= 70 ? "#f59e0b" : "#ef4444");

export const targetTimeLeft = (t: SalesTarget): { text: string; color: string } => {
  const today = dayjs().startOf("day");
  const start = dayjs(t.period_start).startOf("day");
  const end = dayjs(t.period_end).startOf("day");
  if (today.isBefore(start)) {
    const n = start.diff(today, "day");
    return { text: `Starts in ${n} day${n === 1 ? "" : "s"}`, color: "#3b82f6" };
  }
  const left = end.diff(today, "day");
  if (left < 0) return { text: `Ended ${-left} day${left === -1 ? "" : "s"} ago`, color: "#64748b" };
  if (left === 0) return { text: "Last day", color: "#ef4444" };
  return { text: `${left} day${left === 1 ? "" : "s"} left`, color: left <= 7 ? "#f59e0b" : "#0d9488" };
};

export const formatSource = (s?: string) =>
  (s || "other").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

export const getStoredShopId = (): string => {
  try {
    const v = localStorage.getItem("shopId");
    return v && v !== "{}" && v !== "null" && v !== "undefined" ? v : "";
  } catch {
    return "";
  }
};

export const playChime = () => {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    /* ignore */
  }
};
