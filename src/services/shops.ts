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

// Display string — works for legacy string and new location object
export const locationDisplay = (location: string | ShopLocation | null | undefined): string => {
  if (!location) return "";
  if (typeof location === "string") return location;
  return location.formatted_address || location.address || "";
};

export const fetchAllShops = async (params?: ParamsType) => {
  try {
    const response = await axiosInstance.get(url, { params });
    return response.data;
  } catch (error) {
    console.error(error);
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
    throw error;
  }
};