import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import {
  fetchAllPaymentMethods,
  fetchAllPaymentDetails,
  addNewPaymentMethod,
  updateMethod,
  deletePaymentMethod,
  addNewPaymentDetail,
  updateDetail,
  deletePaymentDetail,
} from "@services/paymentMethod";
import { ParamsType } from "@ant-design/pro-components";
import { message } from "antd";

export const PAYMENT_METHOD_QUERY_KEYS = {
  all: ["payment-methods"] as const,
  list: (params?: ParamsType) => ["payment-methods", "list", params ?? {}] as const,
  details: (params?: ParamsType) => ["payment-methods", "details", params ?? {}] as const,
};

export function usePaymentMethodsQuery(
  params?: ParamsType,
  options?: Omit<UseQueryOptions<any, Error, any, any>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: PAYMENT_METHOD_QUERY_KEYS.list(params),
    queryFn: async () => {
      const res = await fetchAllPaymentMethods(params ?? {});
      return Array.isArray(res) ? res : res?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    networkMode: "always",
    ...options,
  });
}

export function usePaymentDetailsQuery(
  params?: ParamsType,
  options?: Omit<UseQueryOptions<any, Error, any, any>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: PAYMENT_METHOD_QUERY_KEYS.details(params),
    queryFn: async () => {
      const res = await fetchAllPaymentDetails(params ?? {});
      return Array.isArray(res) ? res : res?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    networkMode: "always",
    ...options,
  });
}

export function usePaymentMethodMutations() {
  const queryClient = useQueryClient();

  const addMethod = useMutation({
    mutationFn: (params: ParamsType) => addNewPaymentMethod(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHOD_QUERY_KEYS.all });
    },
  });

  const updateMethodMutation = useMutation({
    mutationFn: (data: ParamsType) => updateMethod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHOD_QUERY_KEYS.all });
    },
  });

  const deleteMethodMutation = useMutation({
    mutationFn: (id: string | ParamsType) => deletePaymentMethod(id as any),
    onSuccess: () => {
      message.success("Payment method deleted successfully");
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHOD_QUERY_KEYS.all });
    },
  });

  const addDetail = useMutation({
    mutationFn: (params: ParamsType) => addNewPaymentDetail(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHOD_QUERY_KEYS.details() });
    },
  });

  const updateDetailMutation = useMutation({
    mutationFn: (data: ParamsType) => updateDetail(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHOD_QUERY_KEYS.details() });
    },
  });

  const deleteDetailMutation = useMutation({
    mutationFn: (id: string | ParamsType) => deletePaymentDetail(id as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHOD_QUERY_KEYS.details() });
    },
  });

  return {
    addMethod,
    updateMethod: updateMethodMutation,
    deleteMethod: deleteMethodMutation,
    addDetail,
    updateDetail: updateDetailMutation,
    deleteDetail: deleteDetailMutation,
  };
}
