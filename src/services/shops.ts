import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const url = `${BASE_URL}/shops`;

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export interface ShopLocation {
  address: string;
  place_id?: string | null;
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  country?: string | null;
  formatted_address?: string | null;
  maps_url?: string | null;
}

export interface ShopPrintSettings {
  enabled?: boolean;
  global_print_limit?: number | null;
  per_document_type_limits?: {
    bill?: number | null;
    receipt?: number | null;
    invoice?: number | null;
    quotation?: number | null;
  };
  allow_reprint?: boolean;
  reprint_requires_admin?: boolean;
  reprint_requires_reason?: boolean;
  save_on_print?: boolean;
}

export const locationFromGooglePlace = (place: google.maps.places.PlaceResult): ShopLocation => {
  const getComponent = (type: string) =>
    place.address_components?.find(c => c.types.includes(type))?.long_name ?? null;

  return {
    address: place.name || place.formatted_address || "",
    place_id: place.place_id ?? null,
    lat: place.geometry?.location?.lat() ?? null,
    lng: place.geometry?.location?.lng() ?? null,
    city: getComponent("locality") || getComponent("administrative_area_level_2"),
    country: getComponent("country"),
    formatted_address: place.formatted_address ?? null,
    maps_url: place.url ?? null,
  };
};

export const locationDisplay = (location: string | ShopLocation | null | undefined): string => {
  if (!location) return "";
  if (typeof location === "string") return location;
  return location.formatted_address || location.address || "";
};

export const fetchAllShops = async (params?: ParamsType) => {
  try {
    const response = await axiosInstance.get(url, { params });
    console.log("fetchAllShops response:", response.data);
    return response.data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createShop = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(url, params);
    message.success("Shop created successfully");
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 403) {
      message.error("Error creating shop");
    }
    throw error;
  }
};

export const updateShop = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.put(`${url}/${params?._id}`, params);
    message.success("Shop updated successfully");
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 403) {
      message.error("Error updating shop");
    }
    throw error;
  }
};

export const updatePosMode = async (shopId: string, posMode: "restaurant" | "retail") => {
  try {
    const response = await axiosInstance.patch(`${url}/${shopId}/pos-mode`, { pos_mode: posMode });
    message.success("POS mode updated");
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 403) {
      message.error("Error updating POS mode");
    }
    throw error;
  }
};

export const updateShopPrintSettings = async (
  shopId: string,
  settings: ShopPrintSettings
): Promise<boolean> => {
  try {
    await axiosInstance.put(
      `${BASE_URL}/printed-documents/shop-settings/${shopId}`,
      settings
    );
    message.success("Print settings saved");
    return true;
  } catch (error: any) {
    if (error?.response?.status !== 403) {
      message.error(error?.response?.data?.message || "Error saving print settings");
    }
    return false;
  }
};

export const deleteShop = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${url}/${id}`);
    message.success("Shop deleted successfully");
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 403) {
      message.error("Error deleting shop");
    }
    throw error;
  }
};

export const fetchShop = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${url}/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching shop:', error);
    throw error;
  }
};