import { BASE_URL } from "@utils/config";

// Hardware attached to PrintAgent PCs (PrintAgent 0.11+): cash drawers,
// printer status, weighing scales and label printers.
//
// Two ways to reach a device:
//  • Cloud — /api/agents/... on the API, relayed to the agent over its
//    WebSocket. Works from any device in the shop.
//  • Local — PrintAgent's device API on http://127.0.0.1:14210 of the PC the
//    browser is running on. Fastest; use it for anything a cashier waits on.

export type PrinterLanguage = "escpos" | "zpl" | "tspl";

export interface PrinterStatus {
  state: "ok" | "warning" | "error" | "offline" | "unknown";
  reachable: boolean;
  source: string;
  online?: boolean | null;
  coverOpen?: boolean | null;
  paperOut?: boolean | null;
  paperNearEnd?: boolean | null;
  error?: boolean | null;
  queuedJobs?: number | null;
  messages: string[];
}

export interface AgentScale {
  id: string;
  name: string;
  protocol: string;
}

export interface WeightReading {
  weight: number | null;
  unit: string;
  stable: boolean;
  overload: boolean;
  underZero: boolean;
  raw: string;
}

export interface DeviceAgent {
  agent_id: string;
  device_name: string;
  zone: string;
  zones: string[];
  routing_mode: "category" | "location";
  printer_type: string;
  printer_port?: string | null;
  printer_host?: string | null;
  printer_network_port?: number | null;
  last_seen?: string | null;
  connected: boolean;
  capabilities: string[];
  printer_language: PrinterLanguage;
  cash_drawer: boolean;
  scales: AgentScale[];
  local_api_port: number | null;
  status: PrinterStatus | null;
  status_checked_at: string | null;
}

export function getCompanyCode(): string {
  try {
    const t = localStorage.getItem("tenant");
    return t ? JSON.parse(t)?.tenant_code ?? "" : "";
  } catch {
    return "";
  }
}

// Device commands wait up to 15 s for the agent on the server side.
const API_TIMEOUT_MS = 20_000;

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        companycode: getCompanyCode(),
        ...(init.headers || {}),
      },
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!res.ok) {
      if (res.status === 404 && !body.error) {
        throw new Error("Hardware devices aren't available on this server yet — the API needs updating.");
      }
      throw new Error(body.error ?? body.message ?? `Request failed (${res.status})`);
    }
    return body as unknown as T;
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw new Error("The server took too long to answer");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ── Cloud (via the API) ────────────────────────────────────────────────────

export const fetchDeviceAgents = (shopId: string) =>
  api<{ agents: DeviceAgent[]; count: number }>(`/api/agents/devices?shop_id=${encodeURIComponent(shopId)}`);

export const openCashDrawer = (agentId: string) =>
  api<{ message: string }>(`/api/agents/${encodeURIComponent(agentId)}/drawer`, { method: "POST" });

export const refreshPrinterStatus = (agentId: string) =>
  api<{ status: PrinterStatus; checkedAt: string }>(`/api/agents/${encodeURIComponent(agentId)}/status`, {
    method: "POST",
  });

export const readAgentScale = (agentId: string, scaleId?: string) =>
  api<{ scaleId: string; reading: WeightReading }>(
    `/api/agents/${encodeURIComponent(agentId)}/scale${scaleId ? `?scale_id=${encodeURIComponent(scaleId)}` : ""}`
  );

export const sendScaleCommand = (agentId: string, command: "tare" | "zero", scaleId?: string) =>
  api<{ message: string }>(`/api/agents/${encodeURIComponent(agentId)}/scale/${command}`, {
    method: "POST",
    body: JSON.stringify(scaleId ? { scale_id: scaleId } : {}),
  });

export const printTestLabel = (agentId: string) =>
  api<{ message: string }>(`/api/agents/${encodeURIComponent(agentId)}/label`, { method: "POST" });

// Label layout understood by PrintAgent: positions and sizes in mm from the
// top-left corner; the agent renders it as ZPL or TSPL for its printer.
export type LabelElement =
  | { type: "text"; x: number; y: number; text: string; sizeMm?: number }
  | {
      type: "barcode";
      x: number;
      y: number;
      data: string;
      symbology?: "code128" | "ean13" | "ean8" | "upca" | "code39";
      heightMm?: number;
      showText?: boolean;
      moduleWidth?: number;
    }
  | { type: "qrcode"; x: number; y: number; data: string; cellSize?: number }
  | { type: "box"; x: number; y: number; width: number; height: number; thicknessMm?: number }
  | { type: "line"; x: number; y: number; width: number; height: number };

export interface LabelJob {
  widthMm: number;
  heightMm: number;
  gapMm?: number;
  dpi?: number;
  copies?: number;
  elements: LabelElement[];
}

export const printAgentLabel = (agentId: string, label: LabelJob) =>
  api<{ message: string }>(`/api/agents/${encodeURIComponent(agentId)}/label`, {
    method: "POST",
    body: JSON.stringify({ label }),
  });

// ── Local (PrintAgent on this computer) ────────────────────────────────────

export const LOCAL_AGENT_URL = "http://127.0.0.1:14210";

export interface LocalDevices {
  printers: Array<{
    agentId: string;
    name: string;
    zones: string[];
    language: PrinterLanguage;
    cashDrawer: boolean;
    status: PrinterStatus | null;
  }>;
  scales: Array<{ id: string; name: string; protocol: string; unit: string }>;
}

async function local<T>(path: string, init: RequestInit = {}, timeoutMs = 4000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${LOCAL_AGENT_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: init.body ? { "Content-Type": "application/json" } : undefined,
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; error?: string };
    if (!body.ok) throw new Error(body.error ?? `PrintAgent request failed (${res.status})`);
    return body.result as T;
  } finally {
    clearTimeout(timer);
  }
}

/** PrintAgent on this computer, or null when it isn't running / reachable. */
export async function detectLocalAgent(): Promise<{ version: string; devices: LocalDevices } | null> {
  try {
    const health = await local<{ version: string }>("/api/v1/health", {}, 1500);
    const devices = await local<LocalDevices>("/api/v1/devices");
    return { version: health.version, devices };
  } catch {
    return null;
  }
}

export const localOpenDrawer = (agentId?: string) =>
  local<{ agentId: string }>(agentId ? `/api/v1/printers/${encodeURIComponent(agentId)}/drawer` : "/api/v1/drawer", {
    method: "POST",
  });

export const localPrintLabel = (agentId: string, label: LabelJob) =>
  local<{ agentId: string }>(
    `/api/v1/printers/${encodeURIComponent(agentId)}/label`,
    { method: "POST", body: JSON.stringify(label) },
    15000
  );

export const localReadScale = (scaleId = "default") =>
  local<WeightReading & { scaleId: string }>(`/api/v1/scales/${encodeURIComponent(scaleId)}/weight`);

export const localScaleCommand = (command: "tare" | "zero", scaleId = "default") =>
  local<null>(`/api/v1/scales/${encodeURIComponent(scaleId)}/${command}`, { method: "POST" });

export function formatWeight(r: WeightReading | null | undefined): string {
  if (!r) return "—";
  if (r.overload) return "Overload";
  if (r.weight === null || r.weight === undefined) return r.stable ? "—" : "Settling…";
  return `${r.weight.toFixed(r.unit === "g" ? 0 : 3)} ${r.unit}`;
}
