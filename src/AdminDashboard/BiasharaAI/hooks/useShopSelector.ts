import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllShops } from "@services/shops";

export interface UseShopSelectorReturn {
  shops: any[];
  loadingShops: boolean;
  selectedShopId: string;
  setSelectedShopId: (shopId: string) => void;
  currentShop: any | null;
}

export const useShopSelector = (): UseShopSelectorReturn => {
  const [selectedShopId, setSelectedShopId] = useState<string>(() => {
    return localStorage.getItem("shopId") || "";
  });

  const { data: shops = [], isLoading: loadingShops } = useQuery<any[]>({
    queryKey: ["admin-header-shops"],
    queryFn: () => fetchAllShops({}),
    staleTime: 60000,
  });

  useEffect(() => {
    if (!selectedShopId && shops.length > 0) {
      setSelectedShopId(shops[0]._id);
    }
  }, [shops, selectedShopId]);

  const currentShop = useMemo(() => {
    return shops.find((s: any) => s._id === selectedShopId) || shops[0] || null;
  }, [shops, selectedShopId]);

  return {
    shops,
    loadingShops,
    selectedShopId,
    setSelectedShopId,
    currentShop,
  };
};
