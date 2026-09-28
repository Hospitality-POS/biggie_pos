import { getRequest } from "./request";
import { BusinessHealthApiResponse } from "src/interfaces/healthScore";
import { queryClient } from "../main";

export const getBusinessHealthScore = async (
  refresh = false,
  asOfDate?: string
): Promise<BusinessHealthApiResponse> => {
  const params: Record<string, string> = {};
  if (refresh) {
    params.refresh = "true";
  }
  if (asOfDate) {
    params.as_of_date = asOfDate;
  }

  const response = await getRequest("/business-health", {
    params,
    timeout: 600000, // 10-minute timeout for large datasets
  });
  return response.data;
};

/**
 * Invalidates and purges all cached business health queries from React Query
 * upon user logout or session switch.
 */
export const clearBusinessHealthCache = () => {
  try {
    queryClient.cancelQueries(["businessHealthScore"]);
    queryClient.removeQueries(["businessHealthScore"]);
    // Support object filter signature for broad React Query compatibility
    (queryClient as any).cancelQueries?.({ queryKey: ["businessHealthScore"], exact: false });
    (queryClient as any).removeQueries?.({ queryKey: ["businessHealthScore"], exact: false });
    (queryClient as any).invalidateQueries?.({ queryKey: ["businessHealthScore"], exact: false });
  } catch (err) {
    console.warn("Failed to clear business health query cache:", err);
  }
};

