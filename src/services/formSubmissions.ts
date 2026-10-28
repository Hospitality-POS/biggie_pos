import axios from "axios";
import { BASE_URL, shareableOrigin } from "@utils/config";
import axiosInstance from "./request";
import type { FormSubmission, FormSubmissionSummary, PublicFormView, SignatureInput, CustomerAlert } from "@pages/FormsPlans/forms/fill/types";
import type { Answers } from "@pages/FormsPlans/forms/components/FormRenderer";
import type { Audience } from "@pages/FormsPlans/forms/types";
import { audienceConfig, type AudienceConfig } from "@pages/FormsPlans/audience";

const url = (path = "") => `${BASE_URL}/form-submissions${path}`;
// Client and employee forms need different permission keys
const as = (audience: Audience | undefined, action: keyof AudienceConfig["perms"]) => ({
  headers: { "x-permission": audienceConfig(audience).perms[action] },
});
const unwrap = <T>(res: { data: { data: T } }) => res.data.data;

// ─── Staff (logged in) ───────────────────────────────────────────────────────

/** Prepare a form for a customer (customer_id) or an employee (employee_id). */
export const createFormSubmission = async (
  audience: Audience,
  input: { template_id: string; person_id: string; channel: "in_store" | "link" }
): Promise<{ submission: FormSubmission; token?: string }> => {
  const { person_id, ...rest } = input;
  const body = { ...rest, [audience === "employee" ? "employee_id" : "customer_id"]: person_id };
  const res = await axiosInstance.post(url(), body, as(audience, "send"));
  return { submission: res.data.data, token: res.data.token };
};

export const fetchFormSubmissions = async (
  audience: Audience,
  params: { customer_id?: string; employee_id?: string; status?: string; limit?: number } = {}
): Promise<FormSubmissionSummary[]> =>
  unwrap(await axiosInstance.get(url(), { params: { ...params, audience }, ...as(audience, "viewFilled") }));

/** The tablet loads an open form with the send permission; signed ones need view. */
export const fetchFormSubmission = async (id: string, purpose: "fill" | "view" = "view", audience?: Audience): Promise<FormSubmission> =>
  unwrap(await axiosInstance.get(url(`/${id}`), as(audience, purpose === "fill" ? "send" : "viewFilled")));

/** Flagged answers from a person's signed forms (medical alerts / HR follow-ups). */
export const fetchPersonAlerts = async (audience: Audience, personId: string): Promise<CustomerAlert[]> =>
  unwrap(
    await axiosInstance.get(url("/alerts"), {
      params: { [audience === "employee" ? "employee_id" : "customer_id"]: personId },
      ...as(audience, "viewFilled"),
    })
  );

export const saveSubmissionAnswers = async (id: string, answers: Answers, audience?: Audience) => {
  await axiosInstance.put(url(`/${id}/answers`), { answers }, as(audience, "send"));
};

export const clientSignInStore = async (id: string, answers: Answers, signature: SignatureInput, audience?: Audience): Promise<FormSubmission> =>
  unwrap(await axiosInstance.post(url(`/${id}/client-sign`), { answers, signature }, as(audience, "send")));

export const staffCountersign = async (
  id: string,
  role: "therapist" | "witness",
  signature: SignatureInput,
  audience?: Audience
): Promise<FormSubmission> =>
  unwrap(await axiosInstance.post(url(`/${id}/staff-sign`), { role, signature }, as(audience, "countersign")));

export interface ClientSavedSignature {
  signer_name: string;
  method: "draw" | "type";
  typed_name?: string;
  data: string | null;
  saved_at: string;
}

/** The person's signature kept from an earlier form (tablet). */
export const fetchSavedClientSignature = async (id: string, audience?: Audience): Promise<ClientSavedSignature | null> =>
  unwrap(await axiosInstance.get(url(`/${id}/saved-signature`), as(audience, "send")));

// ─── Staff signature library (shared with E-Signature) ──────────────────────

export interface LibrarySignature {
  _id: string;
  name: string;
  signature_type: "draw" | "type" | "upload" | "initials" | "stamp";
  data?: string;
}

export const fetchMySignatures = async (): Promise<LibrarySignature[]> =>
  (await axiosInstance.get(`${BASE_URL}/users/signature-library`, { params: { type: "signature" } })).data?.signatures ?? [];

export const saveMySignature = async (input: { name: string; signature_type: "draw" | "type"; data: string }) => {
  await axiosInstance.post(`${BASE_URL}/users/signature-library`, { ...input, type: "signature" });
};

export const createSigningLink = async (id: string, audience?: Audience): Promise<{ token: string; submission: FormSubmission }> => {
  const res = await axiosInstance.post(url(`/${id}/link`), {}, as(audience, "send"));
  return { token: res.data.token, submission: res.data.data };
};

export const fetchSignedPdfUrl = async (id: string, audience?: Audience): Promise<string> =>
  unwrap<{ url: string }>(await axiosInstance.get(url(`/${id}/pdf`), as(audience, "viewFilled"))).url;

/** Email the signing link; `email` defaults to the person's address on file. */
export const emailSigningLink = async (
  id: string,
  audience: Audience | undefined,
  input: { token: string; link_url: string; email?: string }
): Promise<{ message: string; email: string }> => {
  const res = await axiosInstance.post(url(`/${id}/email-link`), input, as(audience, "send"));
  return { message: res.data.message, email: res.data.data?.email };
};

/** Email the signed copy with the PDF attached; `email` defaults to the person's address on file. */
export const emailSignedPdf = async (
  id: string,
  audience: Audience | undefined,
  input: { email?: string } = {}
): Promise<{ message: string; email: string }> => {
  const res = await axiosInstance.post(url(`/${id}/email-pdf`), input, as(audience, "viewFilled"));
  return { message: res.data.message, email: res.data.data?.email };
};

/** The signed PDF itself, through the API, for previewing and saving in the app. */
export const fetchSignedPdfBlob = async (id: string, audience?: Audience): Promise<Blob> =>
  (await axiosInstance.get(url(`/${id}/pdf/file`), { responseType: "blob", ...as(audience, "viewFilled") })).data;

export interface FormAnalytics {
  total: number;
  by_status: Partial<Record<"pending" | "in_progress" | "awaiting_therapist" | "completed" | "voided", number>>;
  by_channel: Partial<Record<"in_store" | "link", number>>;
  by_form: { template_id: string; name: string; category?: string; total: number; completed: number; alerts: number }[];
  per_day: { date: string; count: number }[];
  avg_hours_to_sign: number | null;
  people: number;
  alerts: number;
}

export const fetchFormAnalytics = async (audience: Audience, params: { from?: string; to?: string } = {}): Promise<FormAnalytics> =>
  unwrap(await axiosInstance.get(url("/analytics"), { params: { ...params, audience }, ...as(audience, "viewFilled") }));

export const voidFormSubmission = async (id: string, reason: string, audience?: Audience): Promise<FormSubmission> =>
  unwrap(await axiosInstance.post(url(`/${id}/void`), { reason }, as(audience, "void")));

/** Link the client or employee opens on their phone. */
export const buildSigningLink = (token: string) => {
  const company = localStorage.getItem("companyCode") || "";
  return `${shareableOrigin()}/f/${token}?c=${encodeURIComponent(company)}`;
};

// ─── Client / employee (public link, no login) ──────────────────────────────────────────

const publicUrl = (token: string, companyCode: string, path = "") =>
  `${BASE_URL}/public-forms/${encodeURIComponent(token)}${path}?companycode=${encodeURIComponent(companyCode)}`;

export const fetchPublicForm = async (token: string, companyCode: string): Promise<PublicFormView> =>
  (await axios.get(publicUrl(token, companyCode))).data.data;

export const savePublicAnswers = async (token: string, companyCode: string, answers: Answers) => {
  await axios.put(publicUrl(token, companyCode, "/answers"), { answers });
};

export const signPublicForm = async (token: string, companyCode: string, answers: Answers, signature: SignatureInput) =>
  (await axios.post(publicUrl(token, companyCode, "/sign"), { answers, signature })).data.data as {
    status: string;
    has_pdf: boolean;
  };

export const fetchPublicSavedSignature = async (token: string, companyCode: string): Promise<ClientSavedSignature | null> =>
  (await axios.get(publicUrl(token, companyCode, "/saved-signature"))).data.data;

export const fetchPublicPdfUrl = async (token: string, companyCode: string): Promise<string> =>
  (await axios.get(publicUrl(token, companyCode, "/pdf"))).data.data.url;

/** Message from a failed public/staff call, plus the list of unanswered questions. */
export const submissionError = (error: unknown, fallback: string) => {
  const e = error as { isPermissionError?: boolean; response?: { status?: number; data?: { message?: string; missing?: string[]; expired?: boolean } } };
  return {
    message: e?.response?.data?.message || fallback,
    missing: e?.response?.data?.missing ?? [],
    expired: !!e?.response?.data?.expired,
    status: e?.response?.status ?? 0,
    // The staff request layer already showed a toast for these
    alreadyShown: !!e?.isPermissionError || [401, 403, 404, 409].includes(e?.response?.status ?? 0),
  };
};
