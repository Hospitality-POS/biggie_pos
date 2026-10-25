import axios from "axios";
import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";
import type { FormSubmission, FormSubmissionSummary, PublicFormView, SignatureInput, CustomerAlert } from "@pages/ClientForms/fill/types";
import type { Answers } from "@pages/ClientForms/components/FormRenderer";

const url = (path = "") => `${BASE_URL}/form-submissions${path}`;
const as = (permission: string) => ({ headers: { "x-permission": permission } });
const unwrap = <T>(res: { data: { data: T } }) => res.data.data;

// ─── Staff (logged in) ───────────────────────────────────────────────────────

export const createFormSubmission = async (input: {
  template_id: string;
  customer_id: string;
  channel: "in_store" | "link";
}): Promise<{ submission: FormSubmission; token?: string }> => {
  const res = await axiosInstance.post(url(), input, as("CLIENT_FORMS_SEND"));
  return { submission: res.data.data, token: res.data.token };
};

export const fetchFormSubmissions = async (params: {
  customer_id?: string;
  status?: string;
  limit?: number;
} = {}): Promise<FormSubmissionSummary[]> =>
  unwrap(await axiosInstance.get(url(), { params, ...as("CLIENT_FORMS_VIEW_FILLED") }));

/** The tablet loads an open form with the send permission; signed ones need view. */
export const fetchFormSubmission = async (id: string, purpose: "fill" | "view" = "view"): Promise<FormSubmission> =>
  unwrap(await axiosInstance.get(url(`/${id}`), as(purpose === "fill" ? "CLIENT_FORMS_SEND" : "CLIENT_FORMS_VIEW_FILLED")));

export const fetchCustomerAlerts = async (customerId: string): Promise<CustomerAlert[]> =>
  unwrap(await axiosInstance.get(url("/alerts"), { params: { customer_id: customerId }, ...as("CLIENT_FORMS_VIEW_FILLED") }));

export const saveSubmissionAnswers = async (id: string, answers: Answers) => {
  await axiosInstance.put(url(`/${id}/answers`), { answers }, as("CLIENT_FORMS_SEND"));
};

export const clientSignInStore = async (id: string, answers: Answers, signature: SignatureInput): Promise<FormSubmission> =>
  unwrap(await axiosInstance.post(url(`/${id}/client-sign`), { answers, signature }, as("CLIENT_FORMS_SEND")));

export const staffCountersign = async (
  id: string,
  role: "therapist" | "witness",
  signature: SignatureInput
): Promise<FormSubmission> =>
  unwrap(await axiosInstance.post(url(`/${id}/staff-sign`), { role, signature }, as("CLIENT_FORMS_COUNTERSIGN")));

export const createSigningLink = async (id: string): Promise<{ token: string; submission: FormSubmission }> => {
  const res = await axiosInstance.post(url(`/${id}/link`), {}, as("CLIENT_FORMS_SEND"));
  return { token: res.data.token, submission: res.data.data };
};

export const fetchSignedPdfUrl = async (id: string): Promise<string> =>
  unwrap<{ url: string }>(await axiosInstance.get(url(`/${id}/pdf`), as("CLIENT_FORMS_VIEW_FILLED"))).url;

export const voidFormSubmission = async (id: string, reason: string): Promise<FormSubmission> =>
  unwrap(await axiosInstance.post(url(`/${id}/void`), { reason }, as("CLIENT_FORMS_VOID")));

/** Link the client opens on their phone. */
export const buildSigningLink = (token: string) => {
  const company = localStorage.getItem("companyCode") || "";
  return `${window.location.origin}/f/${token}?c=${encodeURIComponent(company)}`;
};

// ─── Client (public link, no login) ──────────────────────────────────────────

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
