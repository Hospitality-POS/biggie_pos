import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";
import type { PlanSession, PlanSuggestion, PlanTemplate, TreatmentPlan } from "@pages/TreatmentPlans/types";

const plans = (path = "") => `${BASE_URL}/treatment-plans${path}`;
const templates = (path = "") => `${BASE_URL}/treatment-plan-templates${path}`;
// Name the permission each call needs (POSTs would otherwise read as "create")
const as = (permission: string) => ({ headers: { "x-permission": permission } });
const unwrap = <T>(res: { data: { data: T } }) => res.data.data;

const VIEW = "TREATMENT_PLANS_VIEW";
const MANAGE = "TREATMENT_PLANS_MANAGE";
const TEMPLATES = "TREATMENT_PLAN_TEMPLATES_MANAGE";

// ─── Plans ───────────────────────────────────────────────────────────────────

export const fetchTreatmentPlans = async (params: { customer_id?: string; status?: string } = {}): Promise<TreatmentPlan[]> =>
  unwrap(await axiosInstance.get(plans(), { params, ...as(VIEW) }));

export const fetchTreatmentPlan = async (id: string): Promise<TreatmentPlan> =>
  unwrap(await axiosInstance.get(plans(`/${id}`), as(VIEW)));

export const fetchPlanSuggestions = async (submissionId: string): Promise<PlanSuggestion[]> =>
  unwrap(await axiosInstance.get(plans("/suggestions"), { params: { submission_id: submissionId }, ...as(VIEW) }));

export const createTreatmentPlan = async (input: {
  customer_id: string;
  template_id?: string;
  submission_id?: string;
  title?: string;
  start_date?: string;
}): Promise<TreatmentPlan> => unwrap(await axiosInstance.post(plans(), input, as(MANAGE)));

export const updateTreatmentPlan = async (
  id: string,
  input: Partial<Pick<TreatmentPlan, "title" | "goals" | "home_care" | "notes" | "therapist_name" | "status" | "cancelled_reason">>
): Promise<TreatmentPlan> => unwrap(await axiosInstance.put(plans(`/${id}`), input, as(MANAGE)));

type SessionInput = Partial<Pick<PlanSession, "title" | "planned_date" | "service_name" | "products_notes" | "next_step" | "status">>;

export const addPlanSession = async (id: string, input: SessionInput): Promise<TreatmentPlan> =>
  unwrap(await axiosInstance.post(plans(`/${id}/sessions`), input, as(MANAGE)));

export const updatePlanSession = async (id: string, sid: string, input: SessionInput): Promise<TreatmentPlan> =>
  unwrap(await axiosInstance.put(plans(`/${id}/sessions/${sid}`), input, as(MANAGE)));

export const completePlanSession = async (
  id: string,
  sid: string,
  input: { products_notes?: string; next_step?: string; signed_off_by?: string; completed_at?: string }
): Promise<TreatmentPlan> => unwrap(await axiosInstance.post(plans(`/${id}/sessions/${sid}/complete`), input, as(MANAGE)));

export const deletePlanSession = async (id: string, sid: string): Promise<TreatmentPlan> =>
  unwrap(await axiosInstance.delete(plans(`/${id}/sessions/${sid}`), as(MANAGE)));

// ─── Templates ───────────────────────────────────────────────────────────────

export const fetchPlanTemplates = async (activeOnly = false): Promise<PlanTemplate[]> =>
  unwrap(await axiosInstance.get(templates(), { params: activeOnly ? { active: true } : {}, ...as(VIEW) }));

export const savePlanTemplate = async (input: Partial<PlanTemplate> & { _id?: string }): Promise<PlanTemplate> =>
  input._id
    ? unwrap(await axiosInstance.put(templates(`/${input._id}`), input, as(TEMPLATES)))
    : unwrap(await axiosInstance.post(templates(), input, as(TEMPLATES)));

export const deletePlanTemplate = async (id: string) => {
  await axiosInstance.delete(templates(`/${id}`), as(TEMPLATES));
};

/** API message for a failed call, or null when the request layer already showed one. */
export const planError = (error: unknown, fallback: string): string | null => {
  const e = error as { isPermissionError?: boolean; response?: { status?: number; data?: { message?: string } } };
  if (e?.isPermissionError || [401, 403, 404, 409].includes(e?.response?.status ?? 0)) return null;
  return e?.response?.data?.message || fallback;
};
