import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";
import { createAsyncThunk } from "@reduxjs/toolkit";

const categ_url = `${BASE_URL}/customers`;

/* ============================
   CUSTOMER OPERATIONS
============================ */

// Fetch customers (shop_id auto-attached by interceptor)
export const fetchAllCustomers = async (data: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(categ_url, {
      params: {
        // original filters
        customer_name: data.customer_name,
        email: data.email,
        phone: data.phone,
        code: data.code,
        search: data.search,
        // new CRM filters
        lifecycle_stage: data.lifecycle_stage,
        assigned_to: data.assigned_to,
        source: data.source,
        type: data.type,
        tag: data.tag,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    message.error(error?.response?.data?.message || "Failed to fetch customers");
    return [];
  }
};

// Admin fetch (no shop filter required)
export const fetchAdminAllCustomers = async (data: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(categ_url, {
      params: {
        // original filters
        customer_name: data.customer_name,
        email: data.email,
        phone: data.phone,
        code: data.code,
        search: data.search,
        // new CRM filters
        lifecycle_stage: data.lifecycle_stage,
        assigned_to: data.assigned_to,
        source: data.source,
        type: data.type,
        tag: data.tag,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching admin customers:", error);
    message.error(error?.response?.data?.message || "Failed to fetch customers");
    return [];
  }
};

// Add customer
export const addNewCustomer = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(categ_url, params);
    return response;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.message || "Failed to add customer";

    if (error?.response?.status !== 403) {
      message.error(errorMessage);
    }

    throw new Error(errorMessage);
  }
};

// Update customer
export const updateCustomer = async (customerId: string, params: ParamsType) => {
  try {
    const response = await axiosInstance.put(
      `${categ_url}/${customerId}`,
      params
    );
    return response;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.message || "Failed to update customer";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Get customer by ID
export const getCustomerById = async (customerId: string) => {
  try {
    const response = await axiosInstance.get(`${categ_url}/${customerId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.message || "Failed to fetch customer";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Staff clock in/out
export const staffClockInOut = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(
      `${categ_url}/clock-in`,
      params
    );
    return response;
  } catch (error: any) {
    console.error("Clock in/out error:", error);
    const errorMessage =
      error?.response?.data?.message || "Failed to clock in/out";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Log customer visit
export const logCustomerVisit = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(
      `${categ_url}/log-visit`,
      params
    );
    return response;
  } catch (error: any) {
    console.error("Visit log error:", error);
    message.error(
      error?.response?.data?.message || "Failed to log visit"
    );
    throw error;
  }
};

/* ============================
   FEEDBACK OPERATIONS
============================ */

export const fetchAllFeedback = async (params?: {
  feedback_type?: "authenticated" | "anonymous";
  start_date?: string;
  end_date?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${categ_url}/feedback`, {
      params,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching feedback:", error);
    throw new Error(error?.message || "Failed to fetch feedback");
  }
};

export const fetchAnonymousFeedback = async (params?: {
  start_date?: string;
  end_date?: string;
}) => {
  return fetchAllFeedback({
    ...params,
    feedback_type: "anonymous",
  });
};

export const fetchAuthenticatedFeedback = async (params?: {
  start_date?: string;
  end_date?: string;
}) => {
  return fetchAllFeedback({
    ...params,
    feedback_type: "authenticated",
  });
};

export const createAnonymousFeedback = createAsyncThunk(
  "feedback/createAnonymous",
  async (
    feedbackData: {
      company_code: string;
      rating: number;
      review?: string;
      anonymous_customer?: {
        name?: string;
        email?: string;
        phone?: string;
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(
        `${categ_url}/feedback/anonymous`,
        feedbackData
      );
      message.success("Thank you for your feedback!");
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit feedback";
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/* ============================
   GIFT CARD OPERATIONS
============================ */

export const fetchGiftCard = async (code: string) => {
  try {
    const response = await axiosInstance.get(
      `${categ_url}/get-gift-card`,
      { params: { code } }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching gift card:", error);
    throw new Error(error?.message);
  }
};

export const updateGiftCard = createAsyncThunk(
  "giftCard/update",
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(
        `${categ_url}/update-gift-card/${id}`,
        data
      );
      message.success("Gift card updated successfully");
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update gift card";
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchAllGiftCards = async (customerId?: string) => {
  try {
    const response = await axiosInstance.get(
      `${categ_url}/all-cards`,
      {
        params: customerId ? { customer_id: customerId } : {},
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching gift cards:", error);
    throw new Error(error?.message);
  }
};

export const createGiftCard = createAsyncThunk(
  "giftCard/create",
  async (giftCardData: any, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `${categ_url}/new-card`,
        giftCardData
      );
      message.success("Gift card created successfully");
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create gift card";
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const sendGiftCard = createAsyncThunk(
  "giftCard/send",
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `${categ_url}/new-card-email`,
        data
      );
      message.success("Gift card email sent successfully");
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to send gift card email";
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/* ============================
   SCHEDULE OPERATIONS
============================ */

export const createSchedule = createAsyncThunk(
  "schedule/create",
  async (scheduleData: any, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `${categ_url}/new-schedule`,
        scheduleData
      );
      message.success("Schedule created successfully");
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to create schedule";
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchAllSchedules = async (date?: string) => {
  try {
    const response = await axiosInstance.get(
      `${categ_url}/all-schedules`,
      { params: date ? { date } : {} }
    );
    return response;
  } catch (error: any) {
    console.error("Error fetching schedules:", error);
    throw new Error(error?.message);
  }
};

// ✅ FIXED: Convert to async thunk for proper Redux integration
export const updateSchedule = createAsyncThunk(
  "schedule/update",
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      console.log("🔄 Updating schedule:", id, data);
      const response = await axiosInstance.put(
        `${categ_url}/update-schedule/${id}`,
        data
      );
      //  message.success("Schedule updated successfully");
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to update schedule";
      console.error("❌ Update schedule error:", errorMessage, error?.response?.data);
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const removeSchedule = async (scheduleId: string) => {
  try {
    const response = await axiosInstance.delete(
      `${categ_url}/delete-schedule/${scheduleId}`
    );
    message.success("Schedule deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.message || "Failed to delete schedule";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/* ============================
   TYPES
============================ */

export type CustomerType = "individual" | "business" | "government" | "ngo" | "other";

export type CustomerLifecycleStage =
  | "lead"
  | "customer"
  | "repeat"
  | "vip"
  | "at_risk"
  | "churned";

export type CustomerSource =
  | "walk_in"
  | "referral"
  | "social_media"
  | "website"
  | "cold_call"
  | "email_campaign"
  | "exhibition"
  | "partner"
  | "lead_conversion"
  | "other";

export interface CustomerAddress {
  street?: string;
  building?: string;
  floor?: string; // New
  city?: string;
  county?: string;
  postal_code?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
  address_type?: 'billing' | 'shipping' | 'both'; // New
  is_primary?: boolean; // New
  landmark?: string; // New
  directions?: string; // New
}

export interface CustomerContactPerson {
  name?: string;
  title?: string;
  phone?: string;
  email?: string;
}

export interface CustomerSocial {
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
}

export interface CustomerVisit {
  _id: string;
  createdAt: string;
  visit_date: string;
}

export interface Customer {
  _id: string;

  // ── Original POS fields ────────────────────────────────────────────────────
  code: string;
  customer_name: string;
  email?: string;
  phone: string;
  location?: string;
  kra_pin?: string;
  shop_id: string;
  tenant_id?: string;
  created_by?: { _id: string; username: string; name: string };
  updated_by?: string;
  is_active?: boolean;
  notes?: string;
  visits?: CustomerVisit[];
  createdAt: string;
  updatedAt: string;

  // ── Accounting fields ──────────────────────────────────────────────────────
  payment_terms?: number;
  credit_limit?: number;
  account_id?: string;
  opening_balance?: number;
  opening_balance_date?: string;
  current_balance?: number;

  // ── Address (new) ──────────────────────────────────────────────────────────
  address?: CustomerAddress;
  billing_addresses?: CustomerAddress[]; // Multiple addresses support

  // ── CRM fields (new) ──────────────────────────────────────────────────────
  type?: CustomerType;
  company_name?: string;
  industry?: string;
  website?: string;
  vat_number?: string;
  alt_phone?: string;
  alt_email?: string;
  contact_person?: CustomerContactPerson;
  social?: CustomerSocial;
  assigned_to?: { _id: string; name: string; username: string };
  source?: CustomerSource;
  converted_from?: { _id: string; lead_name: string; stage: string };
  campaign_id?: { _id: string; name: string; type: string };
  lifecycle_stage?: CustomerLifecycleStage;
  first_purchase_date?: string;
  last_purchase_date?: string;
  lifetime_value?: number;
  total_orders?: number;
  last_contacted_at?: string;
  next_follow_up?: string;
  loyalty_points?: number;
  tags?: string[];
  date_of_birth?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";

  // ── Attached by getById ────────────────────────────────────────────────────
  activities?: any[];
}