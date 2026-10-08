import { BASE_URL } from "@utils/config";
import { message } from "antd";
import { AxiosError } from "axios";

import axiosInstance from "./request";

const recipeUrl = `${BASE_URL}/recipe`;

interface RecipeItem {
  inventory_id?: string;
  unit_id?: string;
  quantity?: number;
  item?: string;
  unit?: string;
  _id?: string;
  ratio?: number;
  formatType?: string;
  itemFormat?: string; // Format for individual item
  variant_id?: string | null; // Inventory variant to deduct (when item has variants)
}

interface RecipePayload {
  product_id: string;
  recipeItems: RecipeItem[];
  shop_id?: string;
}

// All recipe lines for the shop — grouped per service by the caller.
export const fetchAllRecipes = async () => {
  try {
    const response = await axiosInstance.get(recipeUrl);
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    console.error("Error fetching recipes:", err.message);
    if (err.response?.status != 403) {
      message.error("Failed to fetch formulas");
    }
    throw err;
  }
};

export const fetchRecipe = async (productId: string) => {
  try {
    const response = await axiosInstance.get(`${recipeUrl}/${productId}`);
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    console.error("Error fetching recipe:", err.message);
    if (err.response?.status === 404) {
      return null;
    }
    if (error?.response?.status != 403) {
      message.error("Failed to fetch recipe");
    }
    throw err;
  }
};

export const createRecipe = async (
  productId: string,
  payload: any
) => {
  try {
    const requestData: RecipePayload = {
      product_id: productId,
      recipeItems: payload.recipeItems.map((item) => ({
        inventory_id: item.item,
        unit_id: item.unit,
        quantity: item.quantity,
        ratio: item.ratio || 1,
        formatType: item.itemFormat || "direct", // Use item-specific format
        variant_id: item.variant_id || null
      })),
      shop_id: payload.shop_id
    };

    const response = await axiosInstance.post(recipeUrl, requestData);
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    console.error("Error creating recipe:", err);
    if (error?.response?.status != 403) {
      message.error("Failed to create recipe");
    }
    throw err;
  }
};

export const updateRecipe = async (
  productId: string,
  payload: any
) => {
  try {
    const requestData = {
      recipeItems: payload.recipeItems.map((item) => ({
        inventory_id: item.item,
        unit_id: item.unit,
        quantity: item.quantity,
        ratio: item.ratio || 1,
        formatType: item.itemFormat || "direct", // Use item-specific format
        variant_id: item.variant_id || null
      })),
    };

    const response = await axiosInstance.put(`${recipeUrl}/${productId}`, requestData);
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    console.error("Error updating recipe:", err);
    if (error?.response?.status != 403) {
      message.error("Failed to update recipe");
    }
    throw err;
  }
};

export const deleteRecipe = async (recipeId: string) => {
  try {
    const response = await axiosInstance.delete(`${recipeUrl}/${recipeId}`);
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    if (error?.response?.status != 403) {
      message.error("Failed to delete recipe");
    }
    return null;
  }
};

// ── RECIPE EXCEL IMPORT/EXPORT ──────────────────────────────────────────────

interface RecipePreviewRow {
  rowNum: number;
  service: string;
  inventory: string;
  variant: string;
  quantity: string;
  unit: string;
  format: string;
  ratio: string;
  ok: boolean;
  issue: string | null;
}

export interface AnalyseRecipeResult {
  canImport: boolean;
  sheetUsed: string;
  headerRowDetectedAt: number;
  totalDataRows: number;
  validRows: number;
  servicesReady: number;
  mappedColumns: string[];
  unmappedColumns: string[];
  missingRequired: string[];
  missingRecommended: string[];
  columnMapping: Record<string, string>;
  advice: Array<{ level: "success" | "warning" | "error" | "info"; message: string }>;
  previewRows: RecipePreviewRow[];
}

export interface ImportRecipeResult {
  message: string;
  summary: {
    total: number;
    services: number;
    items: number;
    replaced: number;
    skipped: number;
    errors: number;
  };
  warnings: string[];
  errors: Array<{ row: number | string; name: string; reason: string }>;
}

export const RECIPE_TEMPLATE_SAMPLES = [
  { key: "restaurant", label: "Restaurant" },
  { key: "manufacturing", label: "Manufacturing" },
  { key: "spa", label: "Spa & Wellness" },
  { key: "salon", label: "Salon & Barbershop" },
  { key: "cafe", label: "Café & Bakery" },
] as const;

export const downloadRecipeTemplate = async (sample?: string): Promise<void> => {
  try {
    const response = await axiosInstance.get(`${recipeUrl}/template`, {
      responseType: "blob",
      params: sample ? { sample } : {},
    });

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = sample ? `recipe_template_${sample}.xlsx` : "recipe_import_template.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    message.success("Template downloaded successfully");
  } catch (error) {
    console.error("Error downloading recipe template:", error);
    message.error("Failed to download template");
    throw new Error("Failed to download recipe template");
  }
};

export const analyseRecipeFile = async (file: File): Promise<AnalyseRecipeResult> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post<AnalyseRecipeResult>(
      `${recipeUrl}/analyse-import`,
      formData,
      { headers: { "Content-Type": undefined } }
    );

    return response.data;
  } catch (error: any) {
    console.error("Error analysing recipe file:", error);
    const errMsg =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      "Failed to analyse file. Please check the file format and try again.";
    if (error?.response?.status !== 403) message.error(errMsg);
    throw error;
  }
};

export const importRecipesFromExcel = async (
  file: File,
  shopId: string
): Promise<ImportRecipeResult> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("shop_id", shopId);

    const response = await axiosInstance.post<ImportRecipeResult>(
      `${recipeUrl}/import`,
      formData,
      { headers: { "Content-Type": undefined } }
    );

    const data = response.data;

    if (data.summary.services > 0) {
      message.success(
        `Formula import complete — ${data.summary.services} service(s) updated, ${data.summary.items} line(s) saved`
      );
    } else if (data.summary.errors > 0) {
      const firstErr = data.errors?.[0];
      message.warning(
        firstErr
          ? `Import issue: ${firstErr.reason}`
          : "No formulas were imported — check the error details below."
      );
    } else {
      message.warning("No formulas were imported. Check the error details.");
    }

    return data;
  } catch (error: any) {
    console.error("Error importing recipes from Excel:", error);
    const errMsg =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      "Failed to import formulas. Please try again.";
    if (error?.response?.status !== 403) message.error(errMsg);
    throw error;
  }
};