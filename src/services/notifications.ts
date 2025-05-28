import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";
const notification_url = `${BASE_URL}/notifications`;

// Get all notifications
export const fetchAllNotifications = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(notification_url, {
            params: {
                type: data?.type,
                priority: data?.priority,
                read: data?.read,
                page: data?.current,
                limit: data?.pageSize,
            },
        });
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to fetch notifications");
    }
};

// Get notification by ID
export const getNotificationById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${notification_url}/single/${id}`);
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to fetch notification");
    }
};

// Get current user's notifications
export const fetchMyNotifications = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${notification_url}/my-notifications`, {
            params: {
                type: data?.type,
                priority: data?.priority,
                read: data?.read,
                page: data?.current,
                limit: data?.pageSize,
            },
        });
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to fetch your notifications");
    }
};

// Get system notifications
export const fetchSystemNotifications = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${notification_url}/system`, {
            params: {
                type: data?.type,
                priority: data?.priority,
                page: data?.current,
                limit: data?.pageSize,
            },
        });
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to fetch system notifications");
    }
};

// Admin dashboard notifications
export const fetchAdminDashboardNotifications = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${notification_url}/admin-dashboard`, {
            params: {
                type: data?.type,
                priority: data?.priority,
                page: data?.current,
                limit: data?.pageSize,
            },
        });
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to fetch admin dashboard notifications");
    }
};

// Create a new notification (admin only)
export const addNewNotification = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.post(notification_url, {
            title: params.title,
            message: params.message,
            recipient: params.recipient?._id || params.recipient,
            type: params.type,
            priority: params.priority,
            relatedData: params.relatedData,
            expiresAt: params.expiresAt,
        });
        message.success("Notification added successfully");
        return response.data;
    } catch (error) {
        if (error?.response?.status !== 403) {
            message.error("Failed to add a new notification");
        }
        throw new Error("Failed to add a new notification");
    }
};

// Create multiple notifications (admin only)
export const addBulkNotifications = async (notifications: Array<ParamsType>) => {
    try {
        const response = await axiosInstance.post(`${notification_url}/bulk`, {
            notifications,
        });
        message.success(`${response.data.count} notifications added successfully`);
        return response.data;
    } catch (error) {
        if (error?.response?.status !== 403) {
            message.error("Failed to add notifications");
        }
        throw new Error("Failed to add notifications");
    }
};

// Update notification (admin only)
export const updateNotification = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.put(
            `${notification_url}/${data?._id}`,
            {
                title: data?.title || data?.values?.title,
                message: data?.message || data?.values?.message,
                recipient: data?.recipient?._id || data?.values?.recipient?._id || data?.recipient || data?.values?.recipient,
                type: data?.type || data?.values?.type,
                priority: data?.priority || data?.values?.priority,
                relatedData: data?.relatedData || data?.values?.relatedData,
                expiresAt: data?.expiresAt || data?.values?.expiresAt,
            }
        );
        message.success("Notification updated successfully");
        return response.data;
    } catch (error) {
        if (error?.response?.status !== 403) {
            message.error("Failed to update notification");
        }
        return (error as Error).message;
    }
};

// Delete notification
export const deleteNotification = async (id: string) => {
    try {
        const response = await axiosInstance.delete(`${notification_url}/${id}`);
        message.success("Notification deleted successfully");
        return response.data;
    } catch (error) {
        if (error?.response?.status !== 403) {
            message.error("Failed to delete notification");
        }
        return (error as Error).message;
    }
};

// Delete multiple notifications by criteria (admin only)
export const deleteBulkNotifications = async (criteria: ParamsType) => {
    try {
        const response = await axiosInstance.delete(`${notification_url}/bulk`, {
            data: criteria, // For DELETE requests, data must be in the 'data' property
        });
        message.success(`${response.data.deletedCount} notifications deleted successfully`);
        return response.data;
    } catch (error) {
        if (error?.response?.status !== 403) {
            message.error("Failed to delete notifications");
        }
        return (error as Error).message;
    }
};

// Mark notification as read
export const markNotificationAsRead = async (id: string) => {
    try {
        const response = await axiosInstance.patch(`${notification_url}/mark-read/${id}`);
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to mark notification as read");
    }
};

// Mark all notifications as read for current user
export const markAllNotificationsAsRead = async () => {
    try {
        const response = await axiosInstance.patch(`${notification_url}/mark-all-read`);
        message.success("All notifications marked as read");
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to mark all notifications as read");
    }
};

// Mark all notifications as read for specific user (admin only)
export const markAllUserNotificationsAsRead = async (userId: string) => {
    try {
        const response = await axiosInstance.patch(`${notification_url}/mark-all-read/${userId}`);
        message.success("All notifications for user marked as read");
        return response.data;
    } catch (error) {
        if (error?.response?.status !== 403) {
            message.error("Failed to mark all user notifications as read");
        }
        throw new Error("Failed to mark all user notifications as read");
    }
};

// Get notification counts by type (admin only)
export const getNotificationCountsByType = async () => {
    try {
        const response = await axiosInstance.get(`${notification_url}/analytics/by-type`);
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to get notification analytics");
    }
};

// Delete expired notifications (admin only)
export const deleteExpiredNotifications = async () => {
    try {
        const response = await axiosInstance.delete(`${notification_url}/cleanup/expired`);
        message.success(`${response.data.deletedCount} expired notifications deleted`);
        return response.data;
    } catch (error) {
        if (error?.response?.status !== 403) {
            message.error("Failed to delete expired notifications");
        }
        throw new Error("Failed to delete expired notifications");
    }
};

// Get user's notifications by userId (admin only)
export const getUserNotifications = async (userId: string, data: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${notification_url}/user/${userId}`, {
            params: {
                type: data?.type,
                priority: data?.priority,
                read: data?.read,
                page: data?.current,
                limit: data?.pageSize,
            },
        });
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to fetch user notifications");
    }
};