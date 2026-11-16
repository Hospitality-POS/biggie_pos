import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import {
  fetchAllSuppliers,
  getSupplierById,
  addNewSupplier,
  editSupplier,
  deleteSupplier,
} from "@services/supplier";
import { ParamsType } from "@ant-design/pro-components";
import { message } from "antd";

export const SUPPLIER_QUERY_KEYS = {
  all: ["suppliers"] as const,
  list: (params?: ParamsType) => ["suppliers", "list", params ?? {}] as const,
  detail: (id?: string) => ["suppliers", "detail", id] as const,
};

export function useSuppliersQuery(
  params?: ParamsType,
  options?: Omit<UseQueryOptions<any, Error, any, any>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: SUPPLIER_QUERY_KEYS.list(params),
    queryFn: async () => {
      const res = await fetchAllSuppliers(params ?? {});
      return Array.isArray(res) ? res : res?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    networkMode: "always",
    ...options,
  });
}

export function useSupplierDetailQuery(
  id?: string,
  options?: Omit<UseQueryOptions<any, Error, any, any>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: SUPPLIER_QUERY_KEYS.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const res = await getSupplierById(id);
      return res?.data || res;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    networkMode: "always",
    ...options,
  });
}

export function useSupplierMutations() {
  const queryClient = useQueryClient();

  const addSupplier = useMutation({
    mutationFn: (params: ParamsType) => addNewSupplier(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_QUERY_KEYS.all });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: (params: ParamsType) => editSupplier(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_QUERY_KEYS.all });
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string | ParamsType) => deleteSupplier(id as any),
    onSuccess: () => {
      message.success("Supplier deleted successfully");
      queryClient.invalidateQueries({ queryKey: SUPPLIER_QUERY_KEYS.all });
    },
  });

  return {
    addSupplier,
    updateSupplier: updateSupplierMutation,
    deleteSupplier: deleteSupplierMutation,
  };
}
