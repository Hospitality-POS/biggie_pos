import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";
const faq_url = `${BASE_URL}/faq`;

// FAQ Categories

export const fetchAllFaqCategories = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${faq_url}/categories`, {
            params: { name: data?.name },
        });
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to fetch FAQ categories");
    }
};

export const getFaqCategoryById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${faq_url}/category/${id}`);
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to fetch FAQ category");
    }
};

export const addNewFaqCategory = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.post(`${faq_url}/category`, {
            name: params.name,
        });
        message.success("FAQ category added successfully");
        return response.data;
    } catch (error) {
        if (error?.response?.status !== 403) {
            message.error("Failed to add a new FAQ category");
        }
        throw new Error("Failed to add a new FAQ category");
    }
};

export const updateFaqCategory = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.put(
            `${faq_url}/category/${data?._id}`,
            {
                name: data?.name || data?.values?.name,
            }
        );
        message.success("FAQ category updated successfully");
        return response.data;
    } catch (error) {
        if (error?.response?.status !== 403) {
            message.error("Failed to update FAQ category");
        }
        return (error as Error).message;
    }
};

export const deleteFaqCategory = async (id: string) => {
    try {
        const response = await axiosInstance.delete(`${faq_url}/category/${id}`);
        message.success("FAQ category deleted successfully");
        return response.data;
    } catch (error) {
        if (error?.response?.status === 400) {
            message.error("Cannot delete a category with associated FAQs");
        } else if (error?.response?.status !== 403) {
            message.error("Failed to delete FAQ category");
        }
        return (error as Error).message;
    }
};

// FAQs

export const fetchAllFaqs = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(faq_url, {
            params: {
                category: data?.category?._id || data?.category,
                question: data?.question,
            },
        });
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to fetch FAQs");
    }
};

export const getFaqById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${faq_url}/${id}`);
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to fetch FAQ");
    }
};

export const addNewFaq = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.post(faq_url, {
            question: params.question,
            answer: params.answer,
            faq_category_id: params.faq_category_id?._id || params.faq_category_id,
        });
        message.success("FAQ added successfully");
        return response.data;
    } catch (error) {
        if (error?.response?.status !== 403) {
            message.error("Failed to add a new FAQ");
        }
        throw new Error("Failed to add a new FAQ");
    }
};

export const updateFaq = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.put(`${faq_url}/${data?._id}`, {
            question: data?.question || data?.values?.question,
            answer: data?.answer || data?.values?.answer,
            faq_category_id:
                data?.faq_category_id?._id ||
                data?.values?.faq_category_id?._id ||
                data?.faq_category_id ||
                data?.values?.faq_category_id,
        });
        message.success("FAQ updated successfully");
        return response.data;
    } catch (error) {
        if (error?.response?.status !== 403) {
            message.error("Failed to update FAQ");
        }
        return (error as Error).message;
    }
};

export const deleteFaq = async (id: string) => {
    try {
        const response = await axiosInstance.delete(`${faq_url}/${id}`);
        message.success("FAQ deleted successfully");
        return response.data;
    } catch (error) {
        if (error?.response?.status !== 403) {
            message.error("Failed to delete FAQ");
        }
        return (error as Error).message;
    }
};