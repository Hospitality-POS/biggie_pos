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
}

interface RecipePayload {
  product_id: string;
  recipe_items: RecipeItem[];
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
  recipeData: RecipeItem[]
) => {
  try {
    const payload: RecipePayload = {
      product_id: productId,
      recipe_items: recipeData.map((item) => ({
        inventory_id: item.item,
        unit_id: item.unit,
        quantity: item.quantity,
      })),
    };

    const response = await axiosInstance.post(recipeUrl, payload);
    message.success("Recipe created successfully");
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    if (error?.response?.status != 403) {
      message.error("Failed to create recipe");
    }
    throw err;
  }
};

export const updateRecipe = async (
  productId: string,
  recipeData: RecipeItem[]
) => {
  try {
    const payload: RecipePayload = {
      product_id: productId,
      recipe_items: recipeData.map((item) => ({
        inventory_id: item.item,
        unit_id: item.unit,
        quantity: item.quantity,
      })),
    };

    const response = await axiosInstance.put(`${recipeUrl}/${productId}`, payload);
    message.success("Recipe updated successfully");
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    if (error?.response?.status != 403) {
      message.error("Failed to update recipe");
    }
    return null;
  }
};

export const deleteRecipe = async (productId: string) => {
  try {
    const response = await axiosInstance.delete(`${recipeUrl}/${productId}`);
    // message.success("Recipe deleted successfully");
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    if (error?.response?.status != 403) {
      message.error("Failed to delete recipe");
    }
    return null;
  }
};
