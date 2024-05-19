import { getAllCartItems } from "@services/cart";
import { transferCartitems } from "@services/tables";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notification } from "antd";
import { useMemo } from "react";
import { useAppSelector } from "src/store";

function useCartItemsData() {
  const queryclient = useQueryClient();

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

  const {
    data,
    isLoading,
    refetch: yuyu,
  } = useQuery(queryKey, async () => getAllCartItems(cartDetails?._id), {
    onError: (error) => console.error("Error fetching cart items:", error),
    enabled: !!cartDetails?._id,
    refetchOnWindowFocus: false,
    networkMode: "always",
  });

  const invalidate = async () =>
    await queryclient.invalidateQueries({
      queryKey: ["cartItems", cartDetails?._id],
    });

  const { data: response, mutateAsync: transferBillMutate } = useMutation({
    mutationFn: (tranferData: any) => transferCartitems(tranferData),
    networkMode: "always",
    onSuccess: () => {
      console.log("invalidatedddd");

      invalidate();
      // yuyu();
      notification.success({
        message: `Success`,
        description: "Successfully transfered the products",
        placement: "bottomLeft",
      });
    },
  });

  return {
    data,
    isLoading,
    invalidate,
    response,
    transferBillMutate,
  };
}

export default useCartItemsData;
