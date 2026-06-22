import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const gallery_url = `${BASE_URL}/gallery`;

export const fetchAllImages = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${gallery_url}/images`, {
            params: {
                category: data?.category,
                isActive: data?.isActive,
                search: data?.search,
                page: data?.page || 1,
                limit: data?.limit || 20,
            },
        });
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to fetch gallery images");
    }
};

export const getImageById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${gallery_url}/images/${id}`);
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to fetch gallery image");
    }
};

export const uploadImage = async (formData: FormData) => {
    try {
        const response = await axiosInstance.post(`${gallery_url}/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        // message.success("Image uploaded successfully");
        return response.data;
    } catch (error) {
        console.error("Upload error:", error);
        if (error?.response?.status !== 403) {
            const errorMessage = error?.response?.data?.error || "Failed to upload image";
            message.error(errorMessage);
        }
        throw new Error("Failed to upload image");
    }
};

export const updateImage = async (imageId: string, data: ParamsType, newFile?: File) => {
    try {
        const formData = new FormData();

        if (newFile) {
            formData.append('image', newFile);
        }

        Object.keys(data).forEach(key => {
            if (data[key] !== undefined && data[key] !== null) {
                if (key === 'tags' && Array.isArray(data[key])) {
                    formData.append(key, JSON.stringify(data[key]));
                } else {
                    formData.append(key, data[key]);
                }
            }
        });

        const response = await axiosInstance.put(`${gallery_url}/update/${imageId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        // message.success("Image updated successfully");
        return response.data;
    } catch (error) {
        console.error("Update error:", error);
        if (error?.response?.status !== 403) {
            const errorMessage = error?.response?.data?.message || "Failed to update image";
            message.error(errorMessage);
        }
        return (error as Error).message;
    }
};

export const deleteImage = async (id: string) => {
    try {
        const response = await axiosInstance.delete(`${gallery_url}/delete/${id}`);
        // message.success("Image deleted successfully");
        return response.data;
    } catch (error) {
        console.error("Delete error:", error);
        if (error?.response?.status !== 403) {
            const errorMessage = error?.response?.data?.error || "Failed to delete image";
            message.error(errorMessage);
        }
        return (error as Error).message;
    }
};

export const toggleImageStatus = async (id: string) => {
    try {
        const response = await axiosInstance.patch(`${gallery_url}/toggle-status/${id}`);
        // message.success("Image status updated successfully");
        return response.data;
    } catch (error) {
        console.error("Toggle status error:", error);
        if (error?.response?.status !== 403) {
            const errorMessage = error?.response?.data?.error || "Failed to update image status";
            message.error(errorMessage);
        }
        return (error as Error).message;
    }
};

export const validateImageFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
        message.error('Please upload only image files (JPEG, PNG, GIF, WebP)');
        return false;
    }

    if (file.size > maxSize) {
        message.error('Image size should be less than 10MB');
        return false;
    }

    return true;
};

export const prepareImageFormData = (
    file: File,
    additionalData: {
        title?: string;
        description?: string;
        category?: string;
        alt_text?: string;
        tags?: string[];
    }
): FormData => {
    const formData = new FormData();

    formData.append('image', file);


    if (additionalData.title) {
        formData.append('title', String(additionalData.title));
    }

    if (additionalData.description) {
        formData.append('description', String(additionalData.description));
    }

    if (additionalData.category) {
        formData.append('category', String(additionalData.category));
    }

    if (additionalData.alt_text) {
        formData.append('alt_text', String(additionalData.alt_text));
    }

    if (additionalData.tags && additionalData.tags.length > 0) {
        formData.append('tags', JSON.stringify(additionalData.tags));
    }

    return formData;
};