import { useQuery } from "@tanstack/react-query";
import { fetchShop } from "@services/shops";

/**
 * Refills (System Setup → Inventory Controls), opt-in for retail shops such
 * as water refill points: filled items are made by refilling empties with
 * water, and filled stock is counted until it's sold.
 */
export function useRefillSetting(): boolean {
  const shopId = localStorage.getItem("shopId");
  const validShop = !!shopId && shopId !== "null" && shopId !== "undefined";
  const { data } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: validShop,
    staleTime: 60 * 1000,
  });
  return data?.pos_mode === "retail" && !!data?.refill_enabled;
}
