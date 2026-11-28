import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { fetchAllInventoryItems } from "@services/products";

// Inventory items (ingredients) as the production screens need them
export interface IngredientOption {
    _id: string;
    name: string;
    unit_name: string;
    quantity: number;
    supplier_price?: number;
    variants: { _id: string; name: string; quantity: number }[];
}

export const useIngredientOptions = (enabled = true) =>
    useQuery({
        queryKey: ["production-ingredients"],
        queryFn: () => fetchAllInventoryItems({}),
        enabled,
        staleTime: 30_000,
        select: (res: any): IngredientOption[] => {
            const items = Array.isArray(res) ? res : res?.data || res?.inventory || [];
            return items.map((i: any) => ({
                _id: i._id,
                name: i.name || i.product_name,
                unit_name: i.unit_id?.name || i.unit_name || "",
                quantity: Number(i.quantity) || 0,
                supplier_price: Number(i.supplier_price) || undefined,
                variants: (i.has_variants ? i.variants || [] : [])
                    .filter((v: any) => v.status !== "inactive" && v.status !== "discontinued")
                    .map((v: any) => ({ _id: v._id, name: v.name, quantity: Number(v.quantity) || 0 })),
            }));
        },
    });

/** Stock of an ingredient line: its variant's when it has one */
export const stockOf = (opt: IngredientOption | undefined, variantId?: string | null) => {
    if (!opt) return null;
    if (variantId) return opt.variants.find((v) => v._id === variantId)?.quantity ?? null;
    return opt.quantity;
};

export const qty = (n?: number | null) =>
    (Number(n) || 0).toLocaleString("en-KE", { maximumFractionDigits: 3 });

export const money = (n?: number | null) =>
    n == null ? "—" : `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const today = () => dayjs().format("YYYY-MM-DD");

export const PRODUCTION_KEYS = {
    mixes: ["production-mixes"],
    runs: ["production-runs"],
    stock: ["production-stock"],
};
