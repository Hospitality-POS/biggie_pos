import axios from "axios";
import { AI_DUKA_URL } from "@utils/config";

export interface DukaChatRequest {
  prompt: string;
  userId?: string;
  level?: "early_stage" | "growth_stage" | "mature_stage";
  provider?: "gemini" | "openrouter";
  apiKey?: string;
  model?: string;
}

export interface DukaChatResponse {
  agent: string;
  response: string;
}

export interface DukaChatOptions {
  shopId?: string;
  level?: "early_stage" | "growth_stage" | "mature_stage";
  provider?: "gemini" | "openrouter";
  apiKey?: string;
  model?: string;
}

/**
 * Sends a business question or prompt to the deployed Duka AI Agent.
 * Injects the tenant's Bearer token, company code, and active shop ID
 * so Gemini function tools can fetch live POS, inventory, and revenue figures.
 */
export const sendDukaChatMessage = async (
  prompt: string,
  options: DukaChatOptions = {}
): Promise<DukaChatResponse> => {
  const rawUser = localStorage.getItem("user");
  const storedShopId = localStorage.getItem("shopId");
  const storedCompanyCode = localStorage.getItem("companyCode");

  let token: string | undefined;
  let currentUserId: string | undefined;

  if (rawUser) {
    try {
      const user = JSON.parse(rawUser);
      token = user?.Token;
      currentUserId = user?._id || user?.id;
    } catch (e) {
      console.error("[aiDukaService] Failed to parse user from localStorage:", e);
    }
  }

  const payload: DukaChatRequest = {
    prompt,
    userId: options.shopId || storedShopId || undefined,
    level: options.level,
    provider: options.provider || "gemini",
    apiKey: options.apiKey,
    model: options.model,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (storedCompanyCode) {
    headers["companycode"] = storedCompanyCode;
  }
  if (currentUserId) {
    headers["currentUser"] = currentUserId;
  }

  const res = await axios.post<DukaChatResponse>(`${AI_DUKA_URL}/chat`, payload, {
    headers,
  });

  return res.data;
};

/**
 * Fetch the full AI Lining dashboard for a given shop.
 */
export const fetchDukaDashboard = async (shopId: string): Promise<any> => {
  const rawUser = localStorage.getItem("user");
  const storedCompanyCode = localStorage.getItem("companyCode");
  let token: string | undefined;

  if (rawUser) {
    try {
      token = JSON.parse(rawUser)?.Token;
    } catch {}
  }

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (storedCompanyCode) headers["companycode"] = storedCompanyCode;

  const res = await axios.get(`${AI_DUKA_URL}/ai-lining/${shopId}/dashboard`, {
    headers,
  });

  return res.data;
};

/**
 * Mark an insight as applied.
 */
export const applyDukaInsight = async (
  shopId: string,
  insightId: string
): Promise<{ success: boolean; message: string }> => {
  const rawUser = localStorage.getItem("user");
  const storedCompanyCode = localStorage.getItem("companyCode");
  let token: string | undefined;

  if (rawUser) {
    try {
      token = JSON.parse(rawUser)?.Token;
    } catch {}
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (storedCompanyCode) headers["companycode"] = storedCompanyCode;

  const res = await axios.post(
    `${AI_DUKA_URL}/ai-lining/${shopId}/insights/apply`,
    { insight_id: insightId },
    { headers }
  );

  return res.data;
};

/**
 * Record action taken on a stock/operational alert.
 */
export const recordDukaAlertAction = async (
  shopId: string,
  alertId: string
): Promise<{ success: boolean; message: string }> => {
  const rawUser = localStorage.getItem("user");
  const storedCompanyCode = localStorage.getItem("companyCode");
  let token: string | undefined;

  if (rawUser) {
    try {
      token = JSON.parse(rawUser)?.Token;
    } catch {}
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (storedCompanyCode) headers["companycode"] = storedCompanyCode;

  const res = await axios.post(
    `${AI_DUKA_URL}/ai-lining/${shopId}/alerts/action`,
    { alert_id: alertId },
    { headers }
  );

  return res.data;
};

/**
 * Synthesize speech audio using neural TTS.
 * Returns an audio Blob URL that can be played with HTML5 Audio.
 */
export const synthesizeDukaSpeech = async (
  text: string,
  voice: string = "en-KE-AsiliaNeural"
): Promise<string> => {
  const res = await axios.post(
    `${AI_DUKA_URL}/tts`,
    { text, voice },
    { responseType: "blob" }
  );
  return URL.createObjectURL(res.data);
};
