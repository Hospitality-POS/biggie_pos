import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import {
  fetchItemSalesReport,
  fetchPurchaseReport,
  fetchVATSummary,
  fetchVoidedReport,
  fetchDeliveryReport,
  fetchInventoryUsageReport,
} from "@services/reports";
import { ParamsType } from "@ant-design/pro-components";

export const REPORT_QUERY_KEYS = {
  sales: (params?: ParamsType) => ["report", "sales", params ?? {}] as const,
  purchase: (params?: ParamsType) => ["report", "purchase", params ?? {}] as const,
  vat: (params?: ParamsType) => ["report", "vat", params ?? {}] as const,
  voided: (params?: ParamsType) => ["report", "voided", params ?? {}] as const,
  delivery: (params?: ParamsType) => ["report", "delivery", params ?? {}] as const,
  inventoryUsage: (params?: ParamsType) => ["report", "inventory-usage", params ?? {}] as const,
};

export function useSalesReportQuery(
  params?: ParamsType,
  options?: Omit<UseQueryOptions<any, Error, any, any>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: REPORT_QUERY_KEYS.sales(params),
    queryFn: async () => {
      const res = await fetchItemSalesReport(params ?? {});
      return Array.isArray(res) ? res : res?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    networkMode: "always",
    ...options,
  });
}

export function usePurchaseReportQuery(
  params?: ParamsType,
  options?: Omit<UseQueryOptions<any, Error, any, any>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: REPORT_QUERY_KEYS.purchase(params),
    queryFn: async () => {
      const res = await fetchPurchaseReport(params ?? {});
      return Array.isArray(res) ? res : res?.data || res;
    },
    staleTime: 5 * 60 * 1000,
    networkMode: "always",
    ...options,
  });
}

export function useVATReportQuery(
  params?: ParamsType,
  options?: Omit<UseQueryOptions<any, Error, any, any>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: REPORT_QUERY_KEYS.vat(params),
    queryFn: async () => {
      const res = await fetchVATSummary(params ?? {});
      return res?.data || res;
    },
    staleTime: 5 * 60 * 1000,
    networkMode: "always",
    ...options,
  });
}

export function useVoidedReportQuery(
  params?: ParamsType,
  options?: Omit<UseQueryOptions<any, Error, any, any>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: REPORT_QUERY_KEYS.voided(params),
    queryFn: async () => {
      const res = await fetchVoidedReport(params ?? {});
      return Array.isArray(res) ? res : res?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    networkMode: "always",
    ...options,
  });
}

export function useDeliveryReportQuery(
  params?: ParamsType,
  options?: Omit<UseQueryOptions<any, Error, any, any>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: REPORT_QUERY_KEYS.delivery(params),
    queryFn: async () => {
      const res = await fetchDeliveryReport(params ?? {});
      return Array.isArray(res) ? res : res?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    networkMode: "always",
    ...options,
  });
}

export function useInventoryUsageReportQuery(
  params?: ParamsType,
  options?: Omit<UseQueryOptions<any, Error, any, any>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: REPORT_QUERY_KEYS.inventoryUsage(params),
    queryFn: async () => {
      const res = await fetchInventoryUsageReport(params ?? {});
      return Array.isArray(res) ? res : res?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    networkMode: "always",
    ...options,
  });
}
