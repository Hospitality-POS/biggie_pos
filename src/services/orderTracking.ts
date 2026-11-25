import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";

// Order tracking (speed of service). On/off per shop in
// System Setup → Privacy; Orders → Order Tracking shows the live station
// board (kitchen/bar tap Ready) and how long each order stage takes.

export interface KitchenTicketItem {
  cart_item_id: string | null;
  name: string;
  quantity: number;
  notes: string | null;
}

export interface KitchenTicket {
  _id: string;
  cart_id: string;
  order_no: string | null;
  table_name: string | null;
  location_name: string | null;
  station: string;
  items: KitchenTicketItem[];
  sent_at: string;
  status: "Pending" | "Ready";
  ready_at: string | null;
}

export interface StageDurations {
  to_send: number | null;
  prep: number | null;
  to_close: number | null;
}

export type StageKey = keyof StageDurations;

export interface TrackedOrder {
  cart_id: string;
  order_no: string;
  table: string | null;
  waiter: string | null;
  status: "Open" | "Closed";
  placed_at: string;
  sent_at: string | null;
  ready_at: string | null;
  closed_at: string | null;
  tickets: number;
  pending_tickets: number;
  durations: StageDurations;
  total_seconds: number | null;
  slowest_stage: StageKey | null;
  slowest_stage_label: string | null;
  stations: { station: string; tickets: number; pending: number; avg_prep_seconds: number | null }[];
}

export interface StationStats {
  station: string;
  tickets: number;
  pending: number;
  avg_prep_seconds: number | null;
  median_prep_seconds: number | null;
  max_prep_seconds: number | null;
}

export interface OrderTrackingStats {
  enabled: boolean;
  summary: {
    orders: number;
    closed: number;
    waiting_on_station: number;
    avg_to_send_seconds: number | null;
    avg_prep_seconds: number | null;
    avg_to_close_seconds: number | null;
    avg_total_seconds: number | null;
    median_prep_seconds: number | null;
    bottleneck: StageKey | null;
    bottleneck_label: string | null;
  };
  stations: StationStats[];
  orders: TrackedOrder[];
}

export const getOrderTrackingSettings = async (shopId: string): Promise<{ enabled: boolean }> => {
  try {
    const res = await axiosInstance.get(`${BASE_URL}/order-tracking/settings`, {
      params: { shop_id: shopId },
    });
    return res.data?.data ?? { enabled: false };
  } catch {
    return { enabled: false };
  }
};

export const getKitchenTickets = async (
  shopId: string,
  status: "Pending" | "Ready",
  station?: string
): Promise<{ tickets: KitchenTicket[]; stations: string[] }> => {
  const res = await axiosInstance.get(`${BASE_URL}/order-tracking/tickets`, {
    params: { shop_id: shopId, status, station: station || undefined },
  });
  return res.data?.data ?? { tickets: [], stations: [] };
};

export const markTicketReady = async (ticketId: string, ready = true): Promise<KitchenTicket> => {
  const res = await axiosInstance.patch(`${BASE_URL}/order-tracking/tickets/${ticketId}/ready`, { ready });
  return res.data?.data;
};

export const getOrderTrackingStats = async (
  shopId: string,
  startDate: string,
  endDate: string
): Promise<OrderTrackingStats> => {
  const res = await axiosInstance.get(`${BASE_URL}/order-tracking/stats`, {
    params: { shop_id: shopId, start_date: startDate, end_date: endDate },
  });
  return res.data?.data;
};

/** 754 → "12m 34s", 4000 → "1h 6m". */
export const fmtDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return s ? `${m}m ${s}s` : `${m}m`;
};
