import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";
import { message } from "antd";

export const fetchSystemSetupDetails = async () => {
  try {
    const url = `${BASE_URL}/users/fetch-system-setting/all`;
    const response = await axiosInstance.get(url);
    // console.log("system..", response.data);

    return response.data;
  } catch (error) {
    throw new Error(error?.message);
  }
};
interface CacheEntry {
  shopId: string;
  data: any;
  timestamp: number;
}

let cachedSettings: CacheEntry | null = null;
let inflightSettingsPromise: Promise<any> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export const clearSystemSetupCache = () => {
  cachedSettings = null;
  inflightSettingsPromise = null;
};

export const fetchSystemSetupDetailsById = async (forceRefresh = false) => {
  const shopId = localStorage.getItem("shopId");
  if (!shopId) return null;

  const now = Date.now();
  if (!forceRefresh && cachedSettings && cachedSettings.shopId === shopId && now - cachedSettings.timestamp < CACHE_TTL_MS) {
    return cachedSettings.data;
  }

  if (inflightSettingsPromise) {
    return inflightSettingsPromise;
  }

  inflightSettingsPromise = (async () => {
    try {
      const url = `${BASE_URL}/users/fetch-system-setting/${shopId}`;
      const response = await axiosInstance.get(url);
      cachedSettings = {
        shopId,
        data: response.data,
        timestamp: Date.now(),
      };
      return response.data;
    } catch (error: any) {
      throw new Error(error?.message);
    } finally {
      inflightSettingsPromise = null;
    }
  })();

  return inflightSettingsPromise;
};

export const createSystemSetup = async (data: ParamsType) => {
  try {
    const url = `${BASE_URL}/users/new-system-setting`;
    const response = await axiosInstance.post(url, data);
    clearSystemSetupCache();
    localStorage.setItem("businessId", response?.data?._id);
    // console.log("create..", response.data);
    message.success("System Setup created successfully");
    return response.data;
  } catch (error) {
    message.error("Failed to create a new System Setup");
  }
};

export const updateSystemSetup = async (data: ParamsType) => {
  try {
    // console.log("update..", data);
    const url = `${BASE_URL}/users/update-system-setting`;
    const response = await axiosInstance.put(`${url}/${data._id}`, data.data);
    clearSystemSetupCache();
    //message.success("System Setup updated successfully");
    return response.data;
  } catch (error) {
    message.error("Failed to update System Setup");
  }
};

export const fetchSystemPaymentDetails = async () => {
  const url = `${BASE_URL}/payment-methods/fetch-payment-detail/all`;
  try {
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};