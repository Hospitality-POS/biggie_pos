import { getAllCartItems } from "@services/cart";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAppSelector } from "src/store";

function useCartItemsData() {
  const {
    cartDetails,
    //    totalAmount,
    //    cartItems: data2,
    //    loading,
  } = useAppSelector((state) => state.cart);

  const queryKey = useMemo(
    () => ["cartItems", cartDetails?._id],
    [cartDetails?._id]
  );

  const { data, isLoading, refetch } = useQuery(
    queryKey,
    async () => getAllCartItems(cartDetails?._id),
    {
      onError: (error) => console.error("Error fetching cart items:", error),
      enabled: !!cartDetails?._id,
      refetchOnWindowFocus: false,
      networkMode: "always",
    }
  );
  return {
    data,
    isLoading,
    refetch,
  };
}

export default useCartItemsData;
