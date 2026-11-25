import { useQuery } from "@tanstack/react-query";
import { fetchShop } from "@services/shops";

/**
 * Damage tracking (System Setup → Inventory Controls): record services and
 * inventory items that get damaged, spoilt or expire. Off by default.
 */
export function useDamagesSetting(): boolean {
  const shopId = localStorage.getItem("shopId");
  const validShop = !!shopId && shopId !== "null" && shopId !== "undefined";
  const { data } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: validShop,
    staleTime: 60 * 1000,
  });
  return !!data?.damages_enabled;
}
