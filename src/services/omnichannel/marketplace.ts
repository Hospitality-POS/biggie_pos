import { BASE_URL } from "@utils/config";
import axiosInstance from "../request";

/**
 * WHATSAPP MARKETPLACE — GUIDED FLOWS
 * ═══════════════════════════════════════════════════════════════════════════════
 * The assistant walks a WhatsApp customer step by step to a finished sale,
 * gift card or appointment. Agents can start a flow for the customer, see
 * which step they're on, and take over at any point.
 *
 * Routes (under the /omnichannel router):
 *   POST /omnichannel/marketplace/flow                  ← start a flow
 *   POST /omnichannel/marketplace/flow/cancel           ← agent takes over
 *   GET  /omnichannel/marketplace/flow/:conversation_id ← current step
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const flowUrl = `${BASE_URL}/omnichannel/marketplace/flow`;

export type GuidedFlow = "hub" | "shop" | "giftcard" | "booking";

export interface FlowStateInactive {
    active: false;
}

export interface FlowStateOrder {
    active: true;
    kind: "order";
    flow: "offer" | "selfserve" | "giftcard" | "booking_payment" | "hub" | string;
    step: string;
    step_label: string;
    items: { name: string; quantity: number; price: number; kind?: string }[];
    total: number;
    method_name: string | null;
    payment_ref: string | null;
    fulfilment: {
        method: "collect" | "delivery";
        address: string | null;
        fee: number;
        label: string | null;
    } | null;
    created_at: string | null;
}

export interface FlowStateBooking {
    active: true;
    kind: "booking";
    flow: "standalone" | "post_order" | string;
    step: "service" | "date" | "slot" | "confirm" | string;
    step_label: string;
    services: { name: string; quantity: number; price: number | null }[];
    date: string | null;
    date_label: string | null;
    start_time: string | null;
    order_no: string | null;
    created_at: string | null;
}

export type FlowState = FlowStateInactive | FlowStateOrder | FlowStateBooking;

export const fetchFlowState = async (conversationId: string): Promise<FlowState> => {
    const response = await axiosInstance.get(`${flowUrl}/${conversationId}`);
    return response.data;
};

export const startGuidedFlow = async (conversationId: string, flow: GuidedFlow) => {
    const response = await axiosInstance.post(flowUrl, { conversation_id: conversationId, flow });
    return response.data;
};

export interface MarketplaceStats {
    days: number;
    orders: number;
    revenue: number;
    average_order_value: number;
    gift_cards: { count: number; value: number };
    bookings: number;
    fulfilment: { collect: number; delivery: number; none: number };
    active_flows: { checkouts: number; bookings: number };
    chat_conversion_rate: number;
    assistant: { orders: number; revenue: number };
    by_agent: { agent_id: string; orders: number; revenue: number }[];
    by_day: { date: string; orders: number; revenue: number }[];
    top_items: { name: string; quantity: number; revenue: number }[];
}

export const fetchMarketplaceStats = async (shopId: string, days = 30): Promise<MarketplaceStats> => {
    const response = await axiosInstance.get(`${BASE_URL}/omnichannel/marketplace/stats`, {
        params: { shop_id: shopId, days },
    });
    return response.data;
};

export const cancelGuidedFlow = async (conversationId: string, notify = true) => {
    const response = await axiosInstance.post(`${flowUrl}/cancel`, {
        conversation_id: conversationId,
        notify,
    });
    return response.data;
};
