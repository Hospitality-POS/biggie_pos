export type PlanStatus = "active" | "completed" | "cancelled";
export type SessionStatus = "planned" | "done" | "skipped";

export interface PlanSession {
  _id: string;
  title: string;
  planned_date: string | null;
  service_name: string;
  products_notes: string;
  next_step: string;
  status: SessionStatus;
  completed_at: string | null;
  signed_off_by: string;
}

export interface TreatmentPlan {
  _id: string;
  customer_id: string;
  customer_snapshot: { name: string; phone: string };
  title: string;
  category: string;
  goals: string;
  status: PlanStatus;
  start_date: string;
  therapist_name: string;
  sessions: PlanSession[];
  home_care: string;
  notes: string;
  precautions: { question: string; answer: string }[];
  template_id: string | null;
  source_submission_id: string | null;
  completed_at: string | null;
  cancelled_reason: string;
  history?: { action: string; notes: string; by_name: string; at: string }[];
  progress: { done: number; total: number; next_session: { _id: string; title: string; planned_date: string | null } | null };
  createdAt: string;
  updatedAt: string;
}

export interface TemplateSession {
  title: string;
  service_name: string;
  interval_days: number;
  notes: string;
}

export interface PlanTemplate {
  _id: string;
  name: string;
  category: string;
  description: string;
  goals: string;
  sessions: TemplateSession[];
  home_care: string;
  active: boolean;
  triggers: { form_categories: string[]; answer_keywords: string[] };
}

export interface PlanSuggestion {
  _id: string;
  name: string;
  category: string;
  sessions: number;
  reasons: string[];
}

export const PLAN_STATUS_META: Record<PlanStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#2563eb", bg: "#eff6ff" },
  completed: { label: "Completed", color: "#059669", bg: "#ecfdf5" },
  cancelled: { label: "Cancelled", color: "#94a3b8", bg: "#f1f5f9" },
};

export const SESSION_STATUS_META: Record<SessionStatus, { label: string; color: string; bg: string }> = {
  planned: { label: "Planned", color: "#64748b", bg: "#f1f5f9" },
  done: { label: "Done", color: "#059669", bg: "#ecfdf5" },
  skipped: { label: "Skipped", color: "#94a3b8", bg: "#f8fafc" },
};
