import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";
import type { Audience } from "@pages/FormsPlans/forms/types";

export interface CustomCategory {
  _id?: string;
  key: string;
  label: string;
  emoji: string;
  color: string;
}

const url = `${BASE_URL}/form-categories`;
const unwrap = <T>(res: { data: { data: T } }) => res.data.data;

/** The shop's own treatments (client) or form types (employee). */
export const fetchFormCategories = async (audience: Audience): Promise<CustomCategory[]> =>
  unwrap(await axiosInstance.get(url, { params: { audience } }));

/** Add one by name; returns the existing one if the shop already has it. */
export const createFormCategory = async (audience: Audience, label: string, emoji?: string): Promise<CustomCategory> =>
  unwrap(await axiosInstance.post(url, { audience, label, emoji }));
