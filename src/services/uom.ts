import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import { AxiosError } from "axios";
import axiosInstance from "./request";

const uomUrl = `${BASE_URL}/uom`;

interface Uom {
  name: string;
  _id: string;
}

export const fetchAllUom = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.get(uomUrl, { params });
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    if ((error as any)?.response?.status != 403) {
      message.error("Failed to fetch uom");
    }
    throw err;
  }
};

export const createUom = async (uomData: Uom) => {
  try {
    const response = await axiosInstance.post(uomUrl, uomData);
    // message.success("UOM created successfully");
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    if ((error as any)?.response?.status != 403) {
      message.error("Failed to create uom");
    }
    throw err;
  }
};

export const updateUom = async (uomData: Uom) => {
  try {
    const response = await axiosInstance.put(`${uomUrl}/${uomData._id}`, uomData);
    // message.success("UOM updated successfully");
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    if ((error as any)?.response?.status != 403) {
      message.error("Failed to update uom");
    }
    throw err;
  }
};

export const deleteUom = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${uomUrl}/${id}`);
    // message.success("UOM deleted successfully");
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    if ((error as any)?.response?.status != 403) {
      message.error("Failed to delete uom");
    }
    throw err;
  }
};

// ── DELETE MULTIPLE ───────────────────────────────────────────────────────────
export const deleteMultipleUom = async (ids: string[]): Promise<{ deleted: number; failed: number }> => {
  try {
    const response = await axiosInstance.delete(`${uomUrl}/bulk/delete`, {
      data: { ids },
    });
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    if ((error as any)?.response?.status !== 403) {
      message.error("Failed to delete selected UoMs");
    }
    throw err;
  }
};

// ── DELETE ALL ────────────────────────────────────────────────────────────────
export const deleteAllUom = async (shopId: string): Promise<{ deleted: number }> => {
  try {
    const response = await axiosInstance.delete(`${uomUrl}/bulk/delete-all`, {
      data: { shop_id: shopId },
    });
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    if ((error as any)?.response?.status !== 403) {
      message.error("Failed to delete all UoMs");
    }
    throw err;
  }
};