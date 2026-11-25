import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";

// Damages: items written off as damaged, spoilt or expired
// (System Setup → Inventory Controls → Damage Tracking)
const url = `${BASE_URL}/damages`;

export type DamageItemType = "product" | "inventory";

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
  item_type?: DamageItemType;
  product_id?: string;
  inventory_id?: string;
  // The item's name (service or inventory item)
  product_name: string;
  variant_name?: string | null;
  unit_name?: string | null;
  quantity: number;
  reason: DamageReason;
  note?: string;
  damaged_at: string;
  unit_price: number;
  unit_cost: number | null;
  value_at_price: number;
  value_at_cost: number | null;
  cost_source?: "recipe" | "buying_price" | "entered" | null;
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
  item_type: DamageItemType;
  price: number;
  // Cost of one item from buying prices (recipe ingredients for a service,
  // the item's own buying price for an inventory item)
  suggested_unit_cost: number | null;
  cost_basis: "recipe" | "buying_price" | null;
  recipe_unit_cost: number | null;
  last_entered_unit_cost: number | null;
  unit?: string;
  variants: { _id: string; name: string; quantity: number; price: number | null }[];
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
  item_type?: DamageItemType;
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

export const fetchDamageEstimate = async (kind: DamageItemType, id: string): Promise<DamageEstimate> => {
  try {
    const res = await axiosInstance.get(`${url}/${kind === "inventory" ? "inventory" : "product"}/${id}/estimate`);
    return res.data;
  } catch (e) {
    throw apiError(e, "Failed to load item details");
  }
};

export const recordDamage = async (body: {
  item_type: DamageItemType;
  product_id?: string;
  inventory_id?: string;
  variant_id?: string;
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
