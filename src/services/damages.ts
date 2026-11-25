import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";

// Damages: items written off as damaged, spoilt or expired
// (System Setup → Inventory Controls → Damage Tracking)
const url = `${BASE_URL}/damages`;

export type DamageReason = "dropped" | "expired" | "spoilt" | "broken_in_delivery" | "other";

export const DAMAGE_REASONS: { value: DamageReason; label: string; color: string }[] = [
  { value: "dropped", label: "Dropped", color: "orange" },
  { value: "expired", label: "Expired / stale", color: "gold" },
  { value: "spoilt", label: "Spoilt", color: "volcano" },
  { value: "broken_in_delivery", label: "Broken in delivery", color: "purple" },
  { value: "other", label: "Other", color: "default" },
];

export const reasonLabel = (r: string) => DAMAGE_REASONS.find((x) => x.value === r)?.label || r;

export interface DamageIngredient {
  inventory_id: string;
  name: string;
  variant_name?: string | null;
  quantity: number;
  unit_cost?: number | null;
}

export interface Damage {
  _id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  reason: DamageReason;
  note?: string;
  damaged_at: string;
  unit_price: number;
  unit_cost: number | null;
  value_at_price: number;
  value_at_cost: number | null;
  cost_source?: "recipe" | "entered" | null;
  ingredients: DamageIngredient[];
  journal_entry_id?: string | null;
  recorded_by_name?: string;
  status: "active" | "voided";
  voided_by_name?: string;
  voided_at?: string;
  void_reason?: string;
}

export interface DamageGroup {
  key: string;
  label: string;
  count: number;
  quantity: number;
  value_at_price: number;
  value_at_cost: number;
}

export interface DamagesResponse {
  data: Damage[];
  summary: {
    count: number;
    quantity: number;
    value_at_price: number;
    value_at_cost: number;
    by_reason: DamageGroup[];
    by_product: DamageGroup[];
  };
}

export interface DamageEstimate {
  price: number;
  recipe_unit_cost: number | null;
  last_entered_unit_cost: number | null;
  ingredients: {
    inventory_id: string;
    name: string;
    per_item: number;
    unit: string;
    in_stock: number;
    buying_price: number | null;
  }[];
}

const apiError = (e: any, fallback: string) =>
  new Error(e?.response?.data?.error || e?.response?.data?.message || fallback);

export const fetchDamages = async (params: {
  start?: string;
  end?: string;
  reason?: string;
  product_id?: string;
  include_voided?: boolean;
}): Promise<DamagesResponse> => {
  try {
    const shopId = localStorage.getItem("shopId");
    const res = await axiosInstance.get(url, {
      params: { ...params, shop_id: shopId || undefined, include_voided: params.include_voided ? "true" : undefined },
    });
    return res.data;
  } catch (e) {
    throw apiError(e, "Failed to load damages");
  }
};

export const fetchDamageEstimate = async (productId: string): Promise<DamageEstimate> => {
  try {
    const res = await axiosInstance.get(`${url}/product/${productId}/estimate`);
    return res.data;
  } catch (e) {
    throw apiError(e, "Failed to load item details");
  }
};

export const recordDamage = async (body: {
  product_id: string;
  quantity: number;
  reason: DamageReason;
  note?: string;
  unit_cost?: number;
  damaged_at?: string;
}): Promise<{ damage: Damage; warning?: string | null }> => {
  try {
    const shopId = localStorage.getItem("shopId");
    const res = await axiosInstance.post(url, { ...body, shop_id: shopId || undefined });
    return res.data;
  } catch (e) {
    throw apiError(e, "Failed to record damage");
  }
};

export const voidDamage = async (id: string, reason?: string): Promise<{ damage: Damage; warning?: string | null }> => {
  try {
    const res = await axiosInstance.patch(`${url}/${id}/void`, { reason });
    return res.data;
  } catch (e) {
    throw apiError(e, "Failed to void damage");
  }
};
