import axiosInstance from "./request";

// Saved items: lines typed on invoices and quotes, kept so the next invoice
// or quote can pick them instead of retyping. Backend: biggie_api /saved-items.

export interface SavedItem {
    _id: string;
    description: string;
    unit_price: number;
    vat_rate?: number;
    image?: string;
    source?: "invoice" | "quote";
    use_count?: number;
    last_used_at?: string;
}

export interface SavedItemInput {
    description: string;
    unit_price?: number;
    vat_rate?: number;
    image?: string;
}

export const SAVED_ITEMS_KEY = "saved-items";

export const listSavedItems = async (search?: string) =>
    (await axiosInstance.get<{ data: SavedItem[] }>("/saved-items", { params: { search: search || undefined, limit: 100 } })).data.data;

/** Archives the lines of a saved invoice or quote. Never throws: losing the
 *  archive must not fail the save it follows. */
export const rememberSavedItems = async (items: SavedItemInput[], source: "invoice" | "quote") => {
    const clean = items.filter((i) => i.description?.trim());
    if (!clean.length) return;
    try {
        await axiosInstance.post("/saved-items", { items: clean, source });
    } catch (err) {
        console.warn("Couldn't save items for reuse", err);
    }
};

export const deleteSavedItem = async (id: string) => {
    await axiosInstance.delete(`/saved-items/${id}`);
};
