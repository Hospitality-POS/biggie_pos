import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";
import type { Audience } from "@pages/FormsPlans/forms/types";

export type FormsInsightType = "forms" | "plans" | "alert" | "recommendation";

export interface FormsInsight {
  type: FormsInsightType;
  title: string;
  detail: string;
  subject: string | null;
}

export interface FormsInsightsResult {
  headline: string;
  insights: FormsInsight[];
  generatedAt: string;
  cached?: boolean;
}

/** Same window as the analytics tab: from (ISO) or nothing for all time. */
export interface FormsInsightsParams {
  audience: Audience;
  from?: string;
  to?: string;
}

const url = `${BASE_URL}/forms-insights`;
const unwrap = <T>(res: { data: { data: T } }) => res.data.data;

/** AI findings for the Forms & Plans analytics; `fresh` skips the server's one-hour cache. */
export const fetchFormsInsights = async (params: FormsInsightsParams & { fresh?: boolean }): Promise<FormsInsightsResult> =>
  unwrap(await axiosInstance.post(url, params));

/** Follow-up question about the same numbers. */
export const askFormsAssistant = async (
  params: FormsInsightsParams & { question: string; history: { role: "user" | "ai"; text: string }[] }
): Promise<{ answer: string }> => unwrap(await axiosInstance.post(`${url}/ask`, params));
