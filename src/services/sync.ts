import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";

export interface SyncConfig {
  enabled: boolean;
  mongo_uri: string | null;
  sync_time: string; // "HH:mm" 24h, in `timezone`
  timezone: string;
  collections: string[];
  remove_missing: boolean;
  last_run_at: string | null;
  last_run_status: "ok" | "partial" | "error" | null;
  last_run_summary: {
    documentsSynced?: number;
    collectionsOk?: number;
    collectionsFailed?: number;
    error?: string;
  } | null;
}

export interface SyncConfigResponse {
  tenant: string;
  validCollections: string[];
  config: SyncConfig;
}

export interface SyncStatusEntry {
  key: string;
  collection: string;
  lastSyncedAt: string | null;
  lastRunAt: string | null;
  lastSyncCount: number;
}

export interface SyncRunResult {
  key: string;
  status: "ok" | "error";
  collection?: string;
  synced?: number;
  deleted?: number;
  error?: string;
}

export interface SyncRunResponse {
  message: string;
  tenant: string;
  mode: "full" | "incremental";
  documentsSynced: number;
  results: SyncRunResult[];
}

export const fetchSyncConfig = async (): Promise<SyncConfigResponse> => {
  const response = await axiosInstance.get(`${BASE_URL}/sync/config`);
  return response.data;
};

export const updateSyncConfig = async (
  data: Partial<SyncConfig>
): Promise<{ message: string; config: SyncConfig }> => {
  const response = await axiosInstance.put(`${BASE_URL}/sync/config`, data);
  return response.data;
};

export const testSyncConnection = async (
  mongo_uri?: string
): Promise<{ message: string; ok: boolean; latencyMs?: number; database?: string }> => {
  const response = await axiosInstance.post(`${BASE_URL}/sync/test`, { mongo_uri });
  return response.data;
};

export const fetchSyncStatus = async (): Promise<{
  tenant: string;
  collections: SyncStatusEntry[];
} | null> => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/sync/status`);
    return response.data;
  } catch {
    return null; // 503 when secondary DB not configured — handled in the UI
  }
};

export const runSyncNow = async (options: {
  collections?: string[];
  full?: boolean;
  removeMissing?: boolean;
}): Promise<SyncRunResponse> => {
  const response = await axiosInstance.post(`${BASE_URL}/sync/run`, options);
  return response.data;
};
