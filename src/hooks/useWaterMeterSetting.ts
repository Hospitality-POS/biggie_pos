import { useQuery } from "@tanstack/react-query";
import { fetchShop } from "@services/shops";

/**
 * Water meter tracking (System Setup → Privacy → Inventory). Only applies to
 * retail-mode shops — e.g. water refilling stations that measure stock with a
 * meter instead of counting it.
 */
export function useWaterMeterSetting(): boolean {
  const shopId = localStorage.getItem("shopId");
  const validShop = !!shopId && shopId !== "null" && shopId !== "undefined";
  const { data } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: validShop,
    staleTime: 60 * 1000,
  });
  return data?.pos_mode === "retail" && !!data?.water_meter_enabled;
}
