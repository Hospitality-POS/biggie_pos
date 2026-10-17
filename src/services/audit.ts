import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";

export interface AuditChange {
  f: string;
  op?: string;
  from?: unknown;
  to?: unknown;
}

export interface AuditLog {
  _id: string;
  ts: string;
  kind: "http" | "data";
  action: string;
  entity?: string;
  entity_id?: string;
  entity_label?: string;
  actor?: { id?: string; name?: string; role?: string; is_admin?: boolean };
  shop_id?: string;
  changes?: AuditChange[];
  meta?: Record<string, any>;
  request_id?: string;
  method?: string;
  path?: string;
  status?: number;
  duration_ms?: number;
  ip?: string;
}

export interface AuditLogFilters {
  entity?: string;
  entity_id?: string;
  user_id?: string;
  shop_id?: string;
  kind?: "http" | "data";
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

export interface AuditLogPage {
  data: AuditLog[];
  next_cursor: string | null;
  retention_days: number;
  /** false while this business is not in the audit rollout */
  audit_enabled?: boolean;
}

export const fetchAuditLogs = async (filters: AuditLogFilters = {}): Promise<AuditLogPage> => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== "")
  );
  const response = await axiosInstance.get(`${BASE_URL}/audit-logs`, { params });
  return response.data;
};

// ── Analytics & AI insights ─────────────────────────────────────────────────

export interface AuditCounters {
  events: number;
  changes: number;
  requests: number;
  creates: number;
  updates: number;
  deletes: number;
  sensitive: number;
  afterHours: number;
  priceChanges: number;
  failed: number;
}

export interface AuditUserStats extends AuditCounters {
  userId: string;
  name: string | null;
  role: string | null;
  firstTs: string | null;
  lastTs: string | null;
  shops: string[];
  sessionMinutes: number;
  activeMinutes: number;
  sessions: number;
  daysActive: number;
  avgMinutesPerDay: number;
  typicalStartMinute: number | null;
  typicalEndMinute: number | null;
}

export interface AuditShopStats extends Partial<AuditCounters> {
  shopId: string;
  name: string | null;
  sessionMinutes: number;
  activeUsers: number;
  lastTs?: string;
}

export interface AuditAnalytics {
  period: { from: string; to: string; shopId: string | null; tzOffsetMinutes: number };
  afterHours: { start: number; end: number };
  presenceAvailable: boolean;
  totals: AuditCounters & { activeUsers: number; sessionMinutes: number };
  users: AuditUserStats[];
  shops: AuditShopStats[];
  entities: { entity: string; count: number; creates: number; updates: number; deletes: number }[];
  daily: { day: string; events: number; changes: number; sensitive: number }[];
  heatmap: { dow: number; hour: number; count: number }[];
  recentSensitive: AuditLog[];
  generatedAt: string;
  cached?: boolean;
  /** false while this business is not in the audit rollout */
  audit_enabled?: boolean;
}

export type AuditInsightType = "risk" | "productivity" | "pattern" | "recommendation";

export interface AuditInsights {
  headline: string;
  insights: { type: AuditInsightType; title: string; detail: string; subject: string | null }[];
  generatedAt: string;
  cached?: boolean;
}

export interface AuditRangeParams {
  from: string;
  to: string;
  shop_id?: string;
}

export const fetchAuditAnalytics = async (params: AuditRangeParams & { fresh?: boolean }): Promise<AuditAnalytics> => {
  const { fresh, ...rest } = params;
  const response = await axiosInstance.get(`${BASE_URL}/audit-logs/analytics`, {
    params: { ...rest, ...(fresh ? { fresh: "1" } : {}) },
  });
  return response.data;
};

export const fetchAuditInsights = async (params: AuditRangeParams & { fresh?: boolean }): Promise<AuditInsights> => {
  const response = await axiosInstance.post(`${BASE_URL}/audit-logs/insights`, params);
  return response.data;
};

export interface AuditChatTurn {
  role: "user" | "ai";
  text: string;
}

export const askAuditAssistant = async (
  params: AuditRangeParams & { question: string; history: AuditChatTurn[] }
): Promise<{ answer: string }> => {
  const response = await axiosInstance.post(`${BASE_URL}/audit-logs/ask`, params);
  return response.data;
};
