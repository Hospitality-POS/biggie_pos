import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";
import { createAsyncThunk } from "@reduxjs/toolkit";

const consultation_url = `${BASE_URL}/consultations`;

interface ConsultationParams {
    shop_id?: string;
    customer_id?: string;
    staff_id?: string;
    service_type?: 'facial' | 'massage' | 'wood_therapy' | 'other';
    status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    start_date?: string;
    end_date?: string;
}

interface GuestCustomer {
    name: string;
    email: string;
    phone: string;
}

interface ConsultationDetails {
    // For Facial
    skin_type?: 'normal' | 'dry' | 'oily' | 'combination' | 'sensitive';
    skin_concerns?: string[];
    allergies?: string;
    // For Massage & Wood Therapy
    target_areas?: string[];
    pressure_preference?: 'light' | 'medium' | 'firm' | 'deep';
    medical_conditions?: string;
    pain_areas?: string;
    // For Wood Therapy
    cellulite_concerns?: boolean;
    body_contouring_goals?: string;
}

interface ConsultationData {
    company_code?: string;
    tenant_id?: string;
    customer_id?: string;
    shop_id: string;
    staff_id?: string;
    booking_type: 'authenticated' | 'guest';
    guest_customer?: GuestCustomer;
    service_type: 'facial' | 'massage' | 'wood_therapy' | 'other';
    appointment_date: string;
    start_time: string;
    end_time: string;
    duration: number;
    special_requests?: string;
    consultation_details?: ConsultationDetails;
    price?: number;
}

// Fetch all consultations with filters
export const fetchAllConsultations = async (params?: ConsultationParams) => {
    try {
        const shopId = params?.shop_id || localStorage.getItem("shopId");

        const response = await axiosInstance.get(consultation_url, {
            params: {
                shop_id: shopId,
                customer_id: params?.customer_id,
                staff_id: params?.staff_id,
                service_type: params?.service_type,
                status: params?.status,
                start_date: params?.start_date,
                end_date: params?.end_date,
            },
        });
        return response.data;
    } catch (error: any) {
        throw new Error(error?.message || "Failed to fetch consultations");
    }
};

// Create a new consultation
export const createConsultation = createAsyncThunk(
    "consultation/create",
    async (consultationData: ConsultationData, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(
                consultation_url,
                consultationData
            );
            // message.success("Consultation booked successfully!");
            return response.data;
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || error?.message || "Failed to book consultation";
            message.error(errorMessage);
            return rejectWithValue(errorMessage);
        }
    }
);

// Get consultation by ID
export const fetchConsultationById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${consultation_url}/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error?.message || "Failed to fetch consultation");
    }
};

// Update consultation status
export const updateConsultationStatus = async (
    id: string,
    statusData: {
        status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
        notes?: string;
        cancelled_by?: 'customer' | 'staff' | 'system';
        cancellation_reason?: string;
    }
) => {
    try {
        const response = await axiosInstance.patch(
            `${consultation_url}/${id}/status`,
            statusData
        );
        // message.success("Status updated successfully!");
        return response.data;
    } catch (error: any) {
        const errorMessage = error?.response?.data?.message || error?.message || "Failed to update status";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

// Update consultation details
export const updateConsultation = async (id: string, updateData: Partial<ConsultationData>) => {
    try {
        const response = await axiosInstance.put(
            `${consultation_url}/${id}`,
            updateData
        );
        // message.success("Consultation updated successfully!");
        return response.data;
    } catch (error: any) {
        const errorMessage = error?.response?.data?.message || error?.message || "Failed to update consultation";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

// Delete consultation
export const deleteConsultation = async (id: string) => {
    try {
        const response = await axiosInstance.delete(`${consultation_url}/${id}`);
        // message.success("Consultation deleted successfully!");
        return response.data;
    } catch (error: any) {
        const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete consultation";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

// Get available time slots
export const fetchAvailableSlots = async (
    shop_id: string,
    date: string,
    staff_id?: string
) => {
    try {
        const response = await axiosInstance.get(`${consultation_url}/available-slots`, {
            params: {
                shop_id,
                date,
                staff_id,
            },
        });
        return response.data;
    } catch (error: any) {
        throw new Error(error?.message || "Failed to fetch available slots");
    }
};

// Get upcoming consultations for a customer
export const fetchUpcomingConsultations = async (customer_id: string) => {
    try {
        const response = await axiosInstance.get(
            `${consultation_url}/customer/${customer_id}/upcoming`
        );
        return response.data;
    } catch (error: any) {
        throw new Error(error?.message || "Failed to fetch upcoming consultations");
    }
};

// Send consultation reminder
export const sendConsultationReminder = async (id: string) => {
    try {
        const response = await axiosInstance.post(
            `${consultation_url}/${id}/reminder`
        );
        // message.success("Reminder sent successfully!");
        return response.data;
    } catch (error: any) {
        const errorMessage = error?.response?.data?.message || error?.message || "Failed to send reminder";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

// Get consultations by date range
export const fetchConsultationsByDateRange = async (
    start_date: string,
    end_date: string,
    shop_id?: string
) => {
    try {
        const shopId = shop_id || localStorage.getItem("shopId");
        const response = await axiosInstance.get(consultation_url, {
            params: {
                shop_id: shopId,
                start_date,
                end_date,
            },
        });
        return response.data;
    } catch (error: any) {
        throw new Error(error?.message || "Failed to fetch consultations");
    }
};

// Get consultations by service type
export const fetchConsultationsByServiceType = async (
    service_type: 'facial' | 'massage' | 'wood_therapy' | 'other',
    shop_id?: string
) => {
    try {
        const shopId = shop_id || localStorage.getItem("shopId");
        const response = await axiosInstance.get(consultation_url, {
            params: {
                shop_id: shopId,
                service_type,
            },
        });
        return response.data;
    } catch (error: any) {
        throw new Error(error?.message || "Failed to fetch consultations");
    }
};

// Get consultations by status
export const fetchConsultationsByStatus = async (
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show',
    shop_id?: string
) => {
    try {
        const shopId = shop_id || localStorage.getItem("shopId");
        const response = await axiosInstance.get(consultation_url, {
            params: {
                shop_id: shopId,
                status,
            },
        });
        return response.data;
    } catch (error: any) {
        throw new Error(error?.message || "Failed to fetch consultations");
    }
};

export default {
    fetchAllConsultations,
    createConsultation,
    fetchConsultationById,
    updateConsultationStatus,
    updateConsultation,
    deleteConsultation,
    fetchAvailableSlots,
    fetchUpcomingConsultations,
    sendConsultationReminder,
    fetchConsultationsByDateRange,
    fetchConsultationsByServiceType,
    fetchConsultationsByStatus,
};