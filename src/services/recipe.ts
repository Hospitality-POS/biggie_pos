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
}

interface RecipePayload {
  product_id: string;
  recipeItems: RecipeItem[];
  shop_id?: string;
}

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
        formatType: item.itemFormat || "direct" // Use item-specific format
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
        formatType: item.itemFormat || "direct" // Use item-specific format
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