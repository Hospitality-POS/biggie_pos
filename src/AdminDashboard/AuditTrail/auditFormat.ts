import dayjs from "dayjs";
import type { AuditLog } from "@services/audit";

// Model names (as stored by the API) → words people use in the shop
export const ENTITY_LABELS: Record<string, string> = {
  order: "Order",
  order_items: "Order item",
  order_payments: "Payment",
  "Payment-detail": "Payment detail",
  Void: "Void",
  "void-item": "Voided item",
  discount: "Discount",
  Refund: "Refund",
  SalesReceipt: "Sales receipt",
  invoice: "Invoice",
  Invoice: "Invoice",
  Bill: "Bill",
  Expense: "Expense",
  PettyCashTransaction: "Petty cash",
  "gift-card": "Gift card",
  tips: "Tip",
  "tips-settings": "Tip settings",
  Payment_method: "Payment method",
  Product: "Product",
  Product_Inventory: "Inventory product",
  InventoryItem: "Inventory item",
  Category: "Category",
  Recipe: "Recipe",
  Transfer: "Stock transfer",
  TransferItem: "Transfer item",
  PurchaseOrder: "Purchase order",
  Delivery: "Delivery",
  DeliveryItems: "Delivery item",
  JournalEntry: "Journal entry",
  ChartOfAccount: "Account",
  TransactionLock: "Transaction lock",
  User: "Staff member",
  Role: "Role",
  "role-type": "Role permissions",
  permission: "Permission",
  Shift: "Shift",
  Wage: "Wage",
  BanduPayroll: "Payroll",
  Customer: "Customer",
  Shop: "Branch",
  "system-setting": "System setting",
};

export const humanize = (value: string) =>
  value
    .replace(/\.\$\./g, ".")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

export const entityLabel = (entity?: string) =>
  entity ? ENTITY_LABELS[entity] ?? humanize(entity) : "Record";

export const ENTITY_OPTIONS = Object.entries(ENTITY_LABELS)
  .filter(([key]) => key !== "Invoice") // same label as "invoice"
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label));

type ActionStyle = { verb: string; color: string; bg: string };

export const ACTION_STYLES: Record<string, ActionStyle> = {
  create: { verb: "created", color: "#047857", bg: "#ecfdf5" },
  update: { verb: "updated", color: "#1d4ed8", bg: "#eff6ff" },
  delete: { verb: "deleted", color: "#b91c1c", bg: "#fef2f2" },
  update_many: { verb: "bulk-updated", color: "#6d28d9", bg: "#f5f3ff" },
  delete_many: { verb: "bulk-deleted", color: "#b91c1c", bg: "#fef2f2" },
};

export const HTTP_STYLE: ActionStyle = { verb: "sent", color: "#475569", bg: "#f1f5f9" };

export const actionStyle = (log: AuditLog): ActionStyle =>
  log.kind === "http" ? HTTP_STYLE : ACTION_STYLES[log.action] ?? HTTP_STYLE;

export const METHOD_VERBS: Record<string, string> = {
  POST: "Created / submitted",
  PUT: "Updated",
  PATCH: "Updated",
  DELETE: "Deleted",
};

export const statusColor = (status?: number) => {
  if (!status) return "default";
  if (status < 300) return "success";
  if (status < 400) return "processing";
  if (status < 500) return "warning";
  return "error";
};

// Shortens Mongo ids inside URLs: /orders/65f1c0…9a2b → /orders/…9a2b
export const shortenPath = (path?: string) =>
  (path || "").replace(/\b[a-f0-9]{24}\b/gi, (id) => `…${id.slice(-4)}`);

export const shortId = (id?: string) => (id ? (id.length > 10 ? `…${id.slice(-6)}` : id) : "");

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export type FormattedValue = { text: string; muted?: boolean; redacted?: boolean };

export const formatValue = (value: unknown): FormattedValue => {
  if (value === undefined || value === null || value === "") return { text: "empty", muted: true };
  if (value === "[redacted]") return { text: "hidden", redacted: true };
  if (typeof value === "boolean") return { text: value ? "Yes" : "No" };
  if (typeof value === "number") return { text: value.toLocaleString() };
  if (typeof value === "string") {
    if (ISO_DATE.test(value) && dayjs(value).isValid()) {
      return { text: dayjs(value).format("D MMM YYYY, HH:mm") };
    }
    return { text: value };
  }
  if (Array.isArray(value)) {
    if (!value.length) return { text: "none", muted: true };
    if (value.every((v) => typeof v !== "object")) return { text: value.join(", ") };
    return { text: `${value.length} item${value.length === 1 ? "" : "s"}` };
  }
  try {
    const json = JSON.stringify(value);
    return { text: json.length > 120 ? `${json.slice(0, 117)}…` : json };
  } catch {
    return { text: String(value) };
  }
};

export const OP_LABELS: Record<string, string> = {
  $inc: "changed by",
  $push: "added",
  $addToSet: "added",
  $pull: "removed",
  $unset: "cleared",
};

export const initials = (name?: string) =>
  (name || "?")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const AVATAR_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#059669", "#0891b2", "#4f46e5", "#ca8a04"];

export const avatarColor = (key?: string) => {
  if (!key) return "#94a3b8";
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export const dayHeading = (ts: string) => {
  const day = dayjs(ts).startOf("day");
  const today = dayjs().startOf("day");
  if (day.isSame(today)) return `Today · ${day.format("ddd D MMM")}`;
  if (day.isSame(today.subtract(1, "day"))) return `Yesterday · ${day.format("ddd D MMM")}`;
  return day.format("dddd, D MMMM YYYY");
};
