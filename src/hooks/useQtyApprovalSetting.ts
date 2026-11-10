import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchShop, updateShop } from "@services/shops";
import { useAppSelector } from "src/store";

// Admin approval for inventory quantity edits (shop setting
// inventory_qty_edit_requires_approval). While it's on, a non-admin's change
// to an item's quantity is held as a request until an admin approves it.

// Stock changed outside the inventory table (an approved quantity request);
// lists listen so they reload
const INVENTORY_CHANGED = "inventory:changed";
export const notifyInventoryChanged = () => window.dispatchEvent(new Event(INVENTORY_CHANGED));
/** Calls `fn` when stock changes; returns the unsubscribe, for useEffect. */
export const onInventoryChanged = (fn: () => void) => {
    window.addEventListener(INVENTORY_CHANGED, fn);
    return () => window.removeEventListener(INVENTORY_CHANGED, fn);
};

export const currentShopId = () => {
    const id = localStorage.getItem("shopId");
    return id && id !== "undefined" ? id : undefined;
};

// Same rule as the API's isAdminUser: the isAdmin flag, or an "admin" role
// (a string, or a role object's role_type), in any case
export const useIsAdmin = () => {
    const { user } = useAppSelector((state) => state.auth);
    const u = user as { role?: string | { role_type?: string }; isAdmin?: boolean } | null | undefined;
    if (u?.isAdmin) return true;
    const role = typeof u?.role === "string" ? u.role : u?.role?.role_type;
    return typeof role === "string" && role.toLowerCase() === "admin";
};

/** The setting, whether this user is bound by it, and a way to change it. */
export const useQtyApprovalSetting = () => {
    const queryClient = useQueryClient();
    const shopId = currentShopId();
    const isAdmin = useIsAdmin();
    const { data: shop, isLoading } = useQuery({
        queryKey: ["shop", shopId],
        queryFn: () => fetchShop(shopId as string),
        enabled: !!shopId,
    });
    const enabled = !!shop?.inventory_qty_edit_requires_approval;

    const mutation = useMutation({
        mutationFn: (checked: boolean) =>
            updateShop({ _id: shopId, inventory_qty_edit_requires_approval: checked }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shop", shopId] }),
    });

    return {
        enabled,
        isAdmin,
        loading: isLoading,
        saving: mutation.isLoading,
        setEnabled: (checked: boolean) => mutation.mutate(checked),
        /** This user's quantity edits wait for an admin. */
        requiresApproval: enabled && !isAdmin,
    };
};
