import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";
import { createAsyncThunk } from "@reduxjs/toolkit";
const categ_url = `${BASE_URL}/customers`;

export const fetchAllCustomers = async (data: ParamsType) => {
  try {
    const shopId = localStorage.getItem("shopId");

    const response = await axiosInstance.get(categ_url, {
      params: {
        shop_id: shopId,
        customer_name: data.customer_name,
        email: data.email,
        phone: data.phone,
        code: data.code,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(error?.message);
  }
};

export const fetchAdminAllCustomers = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(categ_url, {
      params: {
        customer_name: data.customer_name,
        email: data.email,
        phone: data.phone,
        code: data.code,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(error?.message);
  }
};

export const addNewCustomer = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(categ_url, { ...params });
    message.success("Customer added successfully");
    return response;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Failed to add a new customer");
    }
    throw new Error("Failed to add a new customer", error);
  }
};

export const staffClockInOut = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(categ_url + "/clock-in", {
      ...params,
    });
    return response;
  } catch (error) {
    console.log("error", error);
    throw new Error(error?.response?.data?.message || "Failed to clock in/out");
  }
};

export const logCustomerVisit = async (params: ParamsType) => {
  try {
    console.log("params", params);
    const response = await axiosInstance.post(categ_url + "/log-visit", {
      ...params,
    });
    return response;
  } catch (error) {
    console.log("error", error);
  }
};

// Feedback operations
export const fetchAllFeedback = async (params?: {
  shop_id?: string;
  feedback_type?: 'authenticated' | 'anonymous';
  start_date?: string;
  end_date?: string;
}) => {
  try {
    const shopId = params?.shop_id || localStorage.getItem("shopId");

    const response = await axiosInstance.get(`${categ_url}/feedback`, {
      params: {
        shop_id: shopId,
        feedback_type: params?.feedback_type,
        start_date: params?.start_date,
        end_date: params?.end_date,
      },
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error?.message || "Failed to fetch feedback");
  }
};

export const fetchAnonymousFeedback = async (params?: {
  shop_id?: string;
  start_date?: string;
  end_date?: string;
}) => {
  try {
    const shopId = params?.shop_id || localStorage.getItem("shopId");

    const response = await axiosInstance.get(`${categ_url}/feedback`, {
      params: {
        shop_id: shopId,
        feedback_type: 'anonymous',
        start_date: params?.start_date,
        end_date: params?.end_date,
      },
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error?.message || "Failed to fetch anonymous feedback");
  }
};

export const fetchAuthenticatedFeedback = async (params?: {
  shop_id?: string;
  start_date?: string;
  end_date?: string;
}) => {
  try {
    const shopId = params?.shop_id || localStorage.getItem("shopId");

    const response = await axiosInstance.get(`${categ_url}/feedback`, {
      params: {
        shop_id: shopId,
        feedback_type: 'authenticated',
        start_date: params?.start_date,
        end_date: params?.end_date,
      },
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error?.message || "Failed to fetch authenticated feedback");
  }
};

export const createAnonymousFeedback = createAsyncThunk(
  "feedback/createAnonymous",
  async (feedbackData: {
    company_code: string;
    shop_id?: string;
    rating: number;
    review?: string;
    anonymous_customer?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `${categ_url}/feedback/anonymous`,
        feedbackData
      );
      message.success("Thank you for your feedback!");
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to submit feedback";
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchGiftCard = async (data: any) => {
  try {
    const url = `${categ_url}/get-gift-card`;

    const response = await axiosInstance.get(url, {
      params: { code: data },
    });
    return response.data;
  } catch (error) {
    throw new Error(error?.message);
  }
};

export const updateGiftCard = createAsyncThunk(
  "giftCard/update",
  async ({ id, data }, { rejectWithValue }) => {
    console.log("cilli", data);
    try {
      const response = await axiosInstance.put(
        `${categ_url}/update-gift-card/${id}`,
        data
      );
      return response.data;
    } catch (error: any) {
      message.error(error?.message || "Failed to update gift card");
      return rejectWithValue(error?.message || "Failed to update gift card");
    }
  }
);

export const fetchAllGiftCards = async (data: any) => {
  try {
    const url = `${categ_url}/all-cards`;

    const response = await axiosInstance.get(url, {
      params: { customer_id: data },
    });
    return response.data;
  } catch (error) {
    throw new Error(error?.message);
  }
};

export const createGiftCard = createAsyncThunk(
  "giftCard/create",
  async (giftCardData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        categ_url + "/new-card",
        giftCardData
      );
      return response.data;
    } catch (error: any) {
      message.error(error?.message || "Failed to create gift card");
      return rejectWithValue(error?.message || "Failed to create gift card");
    }
  }
);

// Send gift card email thunk
export const sendGiftCard = createAsyncThunk(
  "giftCard/send",
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        categ_url + "/new-card-email",
        data
      );
      return response.data;
    } catch (error: any) {
      message.error(error?.message || "Failed to send gift card email");
      return rejectWithValue(
        error?.message || "Failed to send gift card email"
      );
    }
  }
);

// Schedule operations
export const createSchedule = createAsyncThunk(
  "schedule/create",
  async (scheduleData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        categ_url + "/new-schedule",
        scheduleData
      );
      return response.data;
    } catch (error: any) {
      message.error(error?.message || "Failed to create schedule");
      return rejectWithValue(error?.message || "Failed to create schedule");
    }
  }
);

export const fetchAllSchedules = async (date?: string) => {
  try {
    const url = `${categ_url}/all-schedules`;
    const params = date ? { date } : {};

    const response = await axiosInstance.get(url, {
      params,
    });
    return response;
  } catch (error: any) {
    throw new Error(error?.message);
  }
};

export const updateSchedule = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.put(
      `${categ_url}/update-schedule/${id}`,
      data
    );
    return response.data;
  } catch (error: any) {
    return error?.message || "Failed to update schedule";
  }
};

export const removeSchedule = async (scheduleId: string) => {
  try {
    const response = await axiosInstance.delete(
      `${categ_url}/delete-schedule/${scheduleId}`
    );
    return response.data;
  } catch (error: any) {
    return error?.message || "Failed to delete schedule";
  }
};