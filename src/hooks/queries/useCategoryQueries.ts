import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import {
  fetchAllCategories,
  addNewCategory,
  updateCategory,
  deleteCategory,
  fetchSubCategories,
  addNewSubCategory,
  editSubCategory,
  deleteSubCategory,
} from "@services/categories";
import { ParamsType } from "@ant-design/pro-components";
import { message } from "antd";

export const CATEGORY_QUERY_KEYS = {
  all: ["categories"] as const,
  list: (params?: ParamsType & { shop_id?: string }) => ["categories", "list", params ?? {}] as const,
  subcategories: (params?: ParamsType) => ["categories", "subcategories", params ?? {}] as const,
};

export function useCategoriesQuery(
  params?: ParamsType & { shop_id?: string },
  options?: Omit<UseQueryOptions<any, Error, any, any>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.list(params),
    queryFn: async () => {
      const res = await fetchAllCategories(params ?? {});
      return Array.isArray(res) ? res : res?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    networkMode: "always",
    ...options,
  });
}

export function useSubCategoriesQuery(
  params?: ParamsType,
  options?: Omit<UseQueryOptions<any, Error, any, any>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.subcategories(params),
    queryFn: async () => {
      const res = await fetchSubCategories(params ?? {});
      return Array.isArray(res) ? res : res?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    networkMode: "always",
    ...options,
  });
}

export function useCategoryMutations() {
  const queryClient = useQueryClient();

  const addCategory = useMutation({
    mutationFn: (params: ParamsType) => addNewCategory(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.all });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (data: ParamsType) => updateCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.all });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string | ParamsType) => deleteCategory(id as any),
    onSuccess: () => {
      message.success("Category deleted successfully");
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.all });
    },
  });

  const addSubCategory = useMutation({
    mutationFn: (params: ParamsType) => addNewSubCategory(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.subcategories() });
    },
  });

  const updateSubCategoryMutation = useMutation({
    mutationFn: (data: ParamsType) => editSubCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.subcategories() });
    },
  });

  const deleteSubCategoryMutation = useMutation({
    mutationFn: (id: string | ParamsType) => deleteSubCategory(id as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.subcategories() });
    },
  });

  return {
    addCategory,
    updateCategory: updateCategoryMutation,
    deleteCategory: deleteCategoryMutation,
    addSubCategory,
    updateSubCategory: updateSubCategoryMutation,
    deleteSubCategory: deleteSubCategoryMutation,
  };
}
