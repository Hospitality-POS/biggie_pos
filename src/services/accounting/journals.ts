import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "../request";
import { message } from "antd";
import { ACCOUNTING_BASE_URL, POS_API_KEY } from "@utils/config";

const journalsUrl = `${ACCOUNTING_BASE_URL}/api/v1/journals`;

const getUser = (): any => {
    try {
        const userStr = localStorage.getItem("user");
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error("Error parsing user from localStorage:", error);
        return null;
    }
};

// Helper to add POS headers with user info
const getPOSHeaders = () => {
    const user = getUser();
    return {
        'x-pos-request': 'true',
        'x-pos-api-key': POS_API_KEY,
        'x-user-id': user?._id || user?.id || 'pos-system',
        'x-user-name': user?.name || user?.username || 'POS User',
        'x-user-email': user?.email || 'pos@system.local'
    };
};

export const fetchAllJournals = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(journalsUrl, {
            params: {
                entry_number: data.entry_number,
                entry_date: data.entry_date,
                status: data.status,
                entry_type: data.entry_type,
                source: data.source,
                start_date: data.start_date,
                end_date: data.end_date,
                search: data.search,
                page: data.page || 1,
                limit: data.limit || 20,
                sort: data.sort || '-entry_date'
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to fetch journal entries");
        throw error;
    }
};

export const addNewJournal = async (params: ParamsType) => {
    try {
        // Map frontend fields to backend expected format
        const payload = {
            entry_date: params.journal_date || params.entry_date,
            entry_type: params.type || params.entry_type || 'general',
            reference: params.reference,
            description: params.description,
            status: params.status || 'draft',
            items: params.entries?.map((entry: any) => ({
                account_id: entry.account_id,
                description: entry.description || params.description,
                debit: parseFloat(entry.debit) || 0,
                credit: parseFloat(entry.credit) || 0,
            })) || [],
            source: 'manual',
        };

        console.log('Creating journal entry with payload:', payload);

        const response = await axiosInstance.post(journalsUrl, payload, {
            headers: getPOSHeaders(),
        });

        message.success("Journal entry created successfully");
        return response.data;
    } catch (error: any) {
        console.error('Create journal error:', error?.response?.data);
        message.error(error?.response?.data?.message || "Failed to create journal entry");
        throw error;
    }
};

export const editJournal = async (params: ParamsType) => {
    try {
        // Map frontend fields to backend expected format
        const payload = {
            entry_date: params.value.journal_date || params.value.entry_date,
            entry_type: params.value.type || params.value.entry_type || 'general',
            reference: params.value.reference,
            description: params.value.description,
            status: params.value.status || 'draft',
            items: params.value.entries?.map((entry: any) => ({
                account_id: entry.account_id,
                description: entry.description || params.value.description,
                debit: parseFloat(entry.debit) || 0,
                credit: parseFloat(entry.credit) || 0,
            })) || [],
        };

        console.log('Updating journal entry with payload:', payload);

        const response = await axiosInstance.put(`${journalsUrl}/${params._id}`, payload, {
            headers: getPOSHeaders(),
        });

        message.success("Journal entry updated successfully");
        return response.data;
    } catch (error: any) {
        console.error('Update journal error:', error?.response?.data);
        message.error(error?.response?.data?.message || "Failed to update journal entry");
        throw error;
    }
};

export const deleteJournal = async (id: string) => {
    try {
        const response = await axiosInstance.delete(`${journalsUrl}/${id}`, {
            headers: getPOSHeaders(),
        });
        message.success("Journal entry deleted successfully");
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to delete journal entry");
        throw error;
    }
};

export const getJournalById = async (id: string) => {
    try {
        const response = await axiosInstance.get(`${journalsUrl}/${id}`, {
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to fetch journal entry");
        throw error;
    }
};

export const postJournal = async (id: string) => {
    try {
        const response = await axiosInstance.post(`${journalsUrl}/${id}/post`, {}, {
            headers: getPOSHeaders(),
        });
        message.success("Journal entry posted successfully");
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to post journal entry");
        throw error;
    }
};

export const voidJournal = async (id: string, reason: string) => {
    try {
        const response = await axiosInstance.post(`${journalsUrl}/${id}/void`, { reason }, {
            headers: getPOSHeaders(),
        });
        message.success("Journal entry voided successfully");
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to void journal entry");
        throw error;
    }
};

export const approveJournal = async (id: string) => {
    try {
        const response = await axiosInstance.post(`${journalsUrl}/${id}/approve`, {}, {
            headers: getPOSHeaders(),
        });
        message.success("Journal entry approved successfully");
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to approve journal entry");
        throw error;
    }
};

// Get general ledger
export const getGeneralLedger = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${journalsUrl}/general-ledger`, {
            params: {
                page: params.page || 1,
                limit: params.limit || 50,
                account_id: params.account_id,
                start_date: params.start_date,
                end_date: params.end_date,
                sort: params.sort || 'createdAt'
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to fetch general ledger");
        throw error;
    }
};

// Get journal statistics
export const getJournalStats = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${journalsUrl}/stats`, {
            params: {
                start_date: params.start_date,
                end_date: params.end_date
            },
            headers: getPOSHeaders(),
        });
        return response.data;
    } catch (error: any) {
        message.error(error?.response?.data?.message || "Failed to fetch journal statistics");
        throw error;
    }
};