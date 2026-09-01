import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

export type LockModule = "Sales" | "Purchases" | "Banking" | "Accountant";

export interface TransactionLock {
    _id: string;
    shop_id: string;
    module: LockModule;
    lock_date: string;
    reason?: string;
    createdAt?: string;
    updatedAt?: string;
    created_by?: { _id: string; name: string; username: string };
    updated_by?: { _id: string; name: string; username: string };
}

export interface LockPayload {
    shop_id: string;
    module: LockModule;
    lock_date: string;
    reason?: string;
    password: string;
}

/**
 * Get all transaction locks for the current shop.
 */
export const getTransactionLocks = async (shop_id: string) => {
    const response = await axiosInstance.get(`${BASE_URL}/accounting/transaction-locks`, {
        params: { shop_id },
    });
    return response.data as { locks: TransactionLock[]; modules: LockModule[]; lockedModules: string[] };
};

/**
 * Create or update a transaction lock for a module.
 */
export const setTransactionLock = async (data: LockPayload) => {
    try {
        const response = await axiosInstance.post(`${BASE_URL}/accounting/transaction-locks`, data);
        message.success(response.data?.message || "Transaction lock set");
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Error setting transaction lock");
        throw error;
    }
};

/**
 * Remove a transaction lock.
 */
export const removeTransactionLock = async ({ id, password }: { id: string; password: string }) => {
    try {
        await axiosInstance.delete(`${BASE_URL}/accounting/transaction-locks/${id}`, {
            data: { password },
        });
        message.success("Transaction lock removed");
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Error removing transaction lock");
        throw error;
    }
};

/**
 * Generate a new lock password and email it to the business email.
 */
export const forgotTransactionLockPassword = async (data: { shop_id: string; module: LockModule }) => {
    try {
        const response = await axiosInstance.post(`${BASE_URL}/accounting/transaction-locks/forgot-password`, data);
        message.success(response.data?.message || "New password sent to business email");
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Error resetting transaction lock password");
        throw error;
    }
};
