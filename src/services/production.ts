import axiosInstance from "./request";

// Production & Stock (System Setup): services made ahead in production runs
// and counted as stock. Backend: biggie_api /production.

export type DamageReason = "dropped" | "expired" | "spoilt" | "broken_in_delivery" | "other";

export interface MixIngredient {
    inventory_id: string;
    variant_id?: string | null;
    name?: string;
    variant_name?: string | null;
    unit_name?: string | null;
    quantity: number; // per batch
}

export interface MixOutput {
    product_id: string;
    name?: string;
    quantity: number; // expected per batch
}

/** A production formula ("mix" in the UI): ingredients in, items out, per batch */
export interface ProductionMix {
    _id: string;
    name: string;
    note?: string;
    ingredients: MixIngredient[];
    outputs: MixOutput[];
}

export interface RunIngredient {
    inventory_id: string;
    variant_id?: string | null;
    name: string;
    variant_name?: string | null;
    unit_name?: string | null;
    planned: number;
    used?: number | null;
    unit_cost?: number | null;
    qty_before?: number;
    qty_after?: number;
}

export interface RunOutput {
    product_id: string;
    name: string;
    expected: number;
    good?: number | null;
    damaged?: number;
    damage_reason?: DamageReason | null;
    qty_before?: number;
    qty_after?: number;
}

export type RunStatus = "in_progress" | "completed" | "cancelled";

export interface ProductionRun {
    _id: string;
    run_no: string;
    formula_id?: string | null;
    formula_name: string;
    batches: number;
    production_date: string;
    status: RunStatus;
    ingredients: RunIngredient[];
    outputs: RunOutput[];
    ingredient_cost?: number | null;
    unit_cost?: number | null;
    total_good?: number;
    total_damaged?: number;
    note?: string;
    created_by_name?: string;
    completed_at?: string;
    completed_by_name?: string;
}

export interface StockedService {
    _id: string;
    name: string;
    price: number;
    quantity: number;
    min_viable_quantity?: number;
    thumbnail?: string;
    low: boolean;
    last_production?: { date: string; good: number } | null;
}

export interface StartRunBody {
    formula_id?: string;
    batches: number;
    production_date: string; // YYYY-MM-DD
    note?: string;
}

export interface CompleteRunBody {
    ingredients: { inventory_id: string; variant_id?: string | null; used: number }[];
    outputs: { product_id: string; good: number; damaged: number; damage_reason?: DamageReason }[];
    note?: string;
}

const base = "/production";

/** The API answers { error } for production failures */
export const productionError = (err: any, fallback: string) =>
    err?.response?.data?.error || err?.response?.data?.message || fallback;

export const listMixes = async () =>
    (await axiosInstance.get<{ data: ProductionMix[] }>(`${base}/formulas`)).data.data;

export const saveMix = async (mix: Omit<ProductionMix, "_id"> & { _id?: string }) => {
    const { _id, ...body } = mix;
    const res = _id
        ? await axiosInstance.put<{ data: ProductionMix }>(`${base}/formulas/${_id}`, body)
        : await axiosInstance.post<{ data: ProductionMix }>(`${base}/formulas`, body);
    return res.data.data;
};

export const deleteMix = async (id: string) => {
    await axiosInstance.delete(`${base}/formulas/${id}`);
};

export const listRuns = async (params: { status?: RunStatus; from?: string; to?: string; page?: number; limit?: number } = {}) =>
    (await axiosInstance.get<{ data: ProductionRun[]; total: number }>(`${base}/runs`, { params })).data;

export const startRun = async (body: StartRunBody) =>
    (await axiosInstance.post<{ data: ProductionRun }>(`${base}/runs`, body)).data.data;

export const completeRun = async (id: string, body: CompleteRunBody) =>
    (await axiosInstance.post<{ data: ProductionRun; warnings: string[] }>(`${base}/runs/${id}/complete`, body)).data;

export const cancelRun = async (id: string) =>
    (await axiosInstance.post<{ data: ProductionRun }>(`${base}/runs/${id}/cancel`)).data.data;

export const listStockedServices = async () =>
    (await axiosInstance.get<{ data: StockedService[] }>(`${base}/stock`)).data.data;

export const countStock = async (productId: string, quantity: number) =>
    (await axiosInstance.post(`${base}/stock/${productId}/count`, { quantity })).data;

export const DAMAGE_REASONS: { value: DamageReason; label: string }[] = [
    { value: "spoilt", label: "Spoilt / burnt" },
    { value: "dropped", label: "Dropped" },
    { value: "broken_in_delivery", label: "Broken" },
    { value: "expired", label: "Expired" },
    { value: "other", label: "Other" },
];
