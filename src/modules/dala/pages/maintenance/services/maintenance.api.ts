import { message } from 'antd';
import { axiosInstance, DALA_API_URL, getDalaHeaders } from '../../../services/client';

export interface MaintenanceTicketParams {
  shop_id?: string;
  ticketType?: 'property_maintenance' | 'general';
  status?: string;
  priority?: string;
  category?: string;
  propertyId?: string;
  unitId?: string;
  leaseId?: string;
  occupantId?: string;
  saleId?: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MaintenanceCategory {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  shop_id?: string;
  tenant_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ── Maintenance Tickets ───────────────────────────────────────────────────────

export const fetchMaintenanceTickets = async (params?: MaintenanceTicketParams) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/maintenance`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch maintenance tickets:', error);
    throw error;
  }
};

export const fetchMaintenanceTicket = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/maintenance/${id}`, {
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch maintenance ticket:', error);
    throw error;
  }
};

export const createMaintenanceTicket = async (data: any) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/maintenance`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Maintenance ticket created successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to create maintenance ticket';
    message.error(errorMessage);
    throw error;
  }
};

export const updateMaintenanceTicket = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.put(`${DALA_API_URL}/maintenance/${id}`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Maintenance ticket updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to update maintenance ticket';
    message.error(errorMessage);
    throw error;
  }
};

export const deleteMaintenanceTicket = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${DALA_API_URL}/maintenance/${id}`, {
      headers: getDalaHeaders(),
    });
    message.success('Maintenance ticket deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to delete maintenance ticket';
    message.error(errorMessage);
    throw error;
  }
};

export const updateMaintenanceTicketStatus = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.patch(`${DALA_API_URL}/maintenance/${id}/status`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Ticket status updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to update ticket status';
    message.error(errorMessage);
    throw error;
  }
};

export const addMaintenanceTicketUpdate = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/maintenance/${id}/updates`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Ticket update added successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to add ticket update';
    message.error(errorMessage);
    throw error;
  }
};

export const addMaintenanceTicketCost = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/maintenance/${id}/costs`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Ticket cost added successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to add ticket cost';
    message.error(errorMessage);
    throw error;
  }
};

export const fetchMaintenanceStats = async (params?: { shop_id?: string }) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/maintenance/stats`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch maintenance stats:', error);
    throw error;
  }
};

// ── Maintenance Categories ────────────────────────────────────────────────────

export const fetchMaintenanceCategories = async (params?: {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
  shop_id?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/maintenance-categories`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch maintenance categories:', error);
    throw error;
  }
};

export const fetchMaintenanceCategory = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/maintenance-categories/${id}`, {
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch maintenance category:', error);
    throw error;
  }
};

export const createMaintenanceCategory = async (data: Partial<MaintenanceCategory>) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/maintenance-categories`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Maintenance category created successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to create maintenance category';
    message.error(errorMessage);
    throw error;
  }
};

export const updateMaintenanceCategory = async (id: string, data: Partial<MaintenanceCategory>) => {
  try {
    const response = await axiosInstance.put(`${DALA_API_URL}/maintenance-categories/${id}`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Maintenance category updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to update maintenance category';
    message.error(errorMessage);
    throw error;
  }
};

export const deleteMaintenanceCategory = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${DALA_API_URL}/maintenance-categories/${id}`, {
      headers: getDalaHeaders(),
    });
    message.success('Maintenance category deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to delete maintenance category';
    message.error(errorMessage);
    throw error;
  }
};

export const toggleMaintenanceCategoryStatus = async (id: string) => {
  try {
    const response = await axiosInstance.patch(
      `${DALA_API_URL}/maintenance-categories/${id}/toggle-status`,
      {},
      { headers: getDalaHeaders() }
    );
    message.success('Category status updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to toggle category status';
    message.error(errorMessage);
    throw error;
  }
};

export const reorderMaintenanceCategories = async (data: {
  categories: Array<{ id: string; sortOrder: number }>;
}) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/maintenance-categories/reorder`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Categories reordered successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to reorder categories';
    message.error(errorMessage);
    throw error;
  }
};
