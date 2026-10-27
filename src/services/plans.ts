import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";
import type { PlanSession, PlanSuggestion, PlanTemplate, TreatmentPlan } from "@pages/FormsPlans/plans/types";
import type { Audience } from "@pages/FormsPlans/forms/types";
import { audienceConfig, type AudienceConfig } from "@pages/FormsPlans/audience";

const plans = (path = "") => `${BASE_URL}/plans${path}`;
const templates = (path = "") => `${BASE_URL}/plan-templates${path}`;
// Name the permission each call needs (POSTs would otherwise read as
// "create"); client and employee plans use different keys.
const as = (audience: Audience | undefined, action: keyof AudienceConfig["perms"]) => ({
  headers: { "x-permission": audienceConfig(audience).perms[action] },
});
const unwrap = <T>(res: { data: { data: T } }) => res.data.data;

/** A plan's audience from the plan itself. */
export const planAudience = (plan: Pick<TreatmentPlan, "subject_type"> | null | undefined): Audience =>
  plan?.subject_type === "employee" ? "employee" : "client";

// ─── Plans ───────────────────────────────────────────────────────────────────

export const fetchPlans = async (
  audience: Audience,
  params: { customer_id?: string; employee_id?: string; status?: string } = {}
): Promise<TreatmentPlan[]> => unwrap(await axiosInstance.get(plans(), { params: { ...params, audience }, ...as(audience, "plansView") }));

export interface PlanAnalytics {
  total: number;
  by_status: Partial<Record<"active" | "completed" | "cancelled", number>>;
  sessions: { total: number; done: number; skipped: number; overdue: number };
  per_day: { date: string; count: number }[];
  by_plan: { key: string; name: string; category?: string; total: number; completed: number }[];
  by_owner: { name: string; plans: number; active: number }[];
  avg_days_to_finish: number | null;
  from_forms: number;
  people: number;
}

export const fetchPlanAnalytics = async (audience: Audience, params: { from?: string; to?: string } = {}): Promise<PlanAnalytics> =>
  unwrap(await axiosInstance.get(plans("/analytics"), { params: { ...params, audience }, ...as(audience, "plansView") }));

/** The plan as a PDF, for saving or printing. */
export const fetchPlanPdfBlob = async (id: string, audience?: Audience): Promise<Blob> =>
  (await axiosInstance.get(plans(`/${id}/pdf`), { responseType: "blob", ...as(audience, "plansView") })).data;

export const fetchPlan = async (id: string, audience?: Audience): Promise<TreatmentPlan> =>
  unwrap(await axiosInstance.get(plans(`/${id}`), as(audience, "plansView")));

export const fetchPlanSuggestions = async (submissionId: string, audience?: Audience): Promise<PlanSuggestion[]> =>
  unwrap(await axiosInstance.get(plans("/suggestions"), { params: { submission_id: submissionId }, ...as(audience, "plansView") }));

/** Start a plan for a customer or an employee (person_id). */
export const createPlan = async (
  audience: Audience,
  input: { person_id: string; template_id?: string; submission_id?: string; title?: string; start_date?: string }
): Promise<TreatmentPlan> => {
  const { person_id, ...rest } = input;
  const body = { ...rest, audience, [audience === "employee" ? "employee_id" : "customer_id"]: person_id };
  return unwrap(await axiosInstance.post(plans(), body, as(audience, "plansManage")));
};

export const updatePlan = async (
  id: string,
  input: Partial<Pick<TreatmentPlan, "title" | "goals" | "guidance" | "notes" | "owner_name" | "status" | "cancelled_reason">>,
  audience?: Audience
): Promise<TreatmentPlan> => unwrap(await axiosInstance.put(plans(`/${id}`), input, as(audience, "plansManage")));

type SessionInput = Partial<Pick<PlanSession, "title" | "planned_date" | "service_name" | "products_notes" | "next_step" | "status">>;

export const addPlanSession = async (id: string, input: SessionInput, audience?: Audience): Promise<TreatmentPlan> =>
  unwrap(await axiosInstance.post(plans(`/${id}/sessions`), input, as(audience, "plansManage")));

export const updatePlanSession = async (id: string, sid: string, input: SessionInput, audience?: Audience): Promise<TreatmentPlan> =>
  unwrap(await axiosInstance.put(plans(`/${id}/sessions/${sid}`), input, as(audience, "plansManage")));

export const completePlanSession = async (
  id: string,
  sid: string,
  input: { products_notes?: string; next_step?: string; signed_off_by?: string; completed_at?: string },
  audience?: Audience
): Promise<TreatmentPlan> => unwrap(await axiosInstance.post(plans(`/${id}/sessions/${sid}/complete`), input, as(audience, "plansManage")));

export const deletePlanSession = async (id: string, sid: string, audience?: Audience): Promise<TreatmentPlan> =>
  unwrap(await axiosInstance.delete(plans(`/${id}/sessions/${sid}`), as(audience, "plansManage")));

// ─── Templates ───────────────────────────────────────────────────────────────

export const fetchPlanTemplates = async (audience: Audience, activeOnly = false): Promise<PlanTemplate[]> =>
  unwrap(
    await axiosInstance.get(templates(), {
      params: { audience, ...(activeOnly ? { active: true } : {}) },
      ...as(audience, "plansView"),
    })
  );

export const savePlanTemplate = async (audience: Audience, input: Partial<PlanTemplate> & { _id?: string }): Promise<PlanTemplate> =>
  input._id
    ? unwrap(await axiosInstance.put(templates(`/${input._id}`), input, as(audience, "planTemplatesManage")))
    : unwrap(await axiosInstance.post(templates(), { ...input, audience }, as(audience, "planTemplatesManage")));

export const deletePlanTemplate = async (id: string, audience?: Audience) => {
  await axiosInstance.delete(templates(`/${id}`), as(audience, "planTemplatesManage"));
};

/** API message for a failed call, or null when the request layer already showed one. */
export const planError = (error: unknown, fallback: string): string | null => {
  const e = error as { isPermissionError?: boolean; response?: { status?: number; data?: { message?: string } } };
  if (e?.isPermissionError || [401, 403, 404, 409].includes(e?.response?.status ?? 0)) return null;
  return e?.response?.data?.message || fallback;
};
