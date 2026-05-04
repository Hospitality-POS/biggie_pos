import { message } from "antd";
import axiosInstance from "./request";
import { BASE_URL, POS_API_KEY } from "@utils/config";

const dalaUrl = `${BASE_URL}/api/dala`;

// ── Types ────────────────────────────────────────────────────────────────────

export interface PropertyType {
  _id: string;
  name: string;
  description?: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Block {
  _id: string;
  name: string;
  code: string;
  property_id: string;
  floors?: number;
  units?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Floor {
  _id: string;
  name: string;
  number: number;
  block_id: string;
  property_id: string;
  units?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  _id: string;
  name: string;
  code: string;
  type: 'residential' | 'commercial' | 'industrial' | 'mixed';
  bedrooms?: number;
  bathrooms?: number;
  size_sqft: number;
  block_id: string;
  floor_id: string;
  property_id: string;
  status: 'available' | 'reserved' | 'sold' | 'rented' | 'maintenance';
  base_price: number;
  current_price?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Phase {
  _id: string;
  name: string;
  description?: string;
  property_id: string;
  start_date: string;
  end_date?: string;
  pricing_multiplier: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Property {
  _id: string;
  name: string;
  description?: string;
  code: string;
  address?: string;
  location?: string;
  property_type_id: string;
  total_units: number;
  available_units: number;
  sold_units: number;
  rented_units: number;
  developer?: string;
  year_built?: number;
  amenities?: string[];
  images?: string[];
  documents?: string[];
  status: 'planning' | 'under_construction' | 'completed' | 'launched';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  property_type?: PropertyType;
  blocks?: Block[];
  phases?: Phase[];
}

export interface PropertySale {
  _id: string;
  property_id: string;
  unit_id: string;
  client_id: string;
  sale_date: string;
  sale_price: number;
  payment_plan: 'cash' | 'installment' | 'mortgage';
  installment_months?: number;
  deposit_paid: number;
  balance_amount: number;
  status: 'pending' | 'deposit_paid' | 'active' | 'completed' | 'cancelled';
  commission_rate: number;
  commission_amount: number;
  commission_status: 'pending' | 'partial' | 'paid';
  sales_agent_id?: string;
  created_at: string;
  updated_at: string;
  property?: Property;
  unit?: Unit;
  client?: any;
  installments?: any[];
}

export interface Commission {
  _id: string;
  sale_id: string;
  agent_id: string;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'partial' | 'paid';
  paid_amount: number;
  balance_amount: number;
  due_date?: string;
  paid_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  sale?: PropertySale;
  agent?: any;
}

export interface Lease {
  _id: string;
  property_id: string;
  unit_id: string;
  tenant_id: string;
  lease_start: string;
  lease_end: string;
  monthly_rent: number;
  security_deposit: number;
  status: 'active' | 'expired' | 'terminated';
  payment_frequency: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  created_at: string;
  updated_at: string;
  property?: Property;
  unit?: Unit;
  tenant?: any;
}

export interface RentPayment {
  _id: string;
  lease_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  payment_method?: string;
  reference?: string;
  created_at: string;
  updated_at: string;
  lease?: Lease;
}

// ── API Headers Helper ────────────────────────────────────────────────────────

const getDalaHeaders = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return {
    'x-pos-request': 'true',
    'x-pos-api-key': POS_API_KEY,
    'x-user-id': user?._id || user?.id || 'pos-system',
    'x-user-name': user?.name || user?.username || 'POS User',
    'x-user-email': user?.email || 'pos@system.local'
  };
};

// ── Property Types API ────────────────────────────────────────────────────────

export const fetchPropertyTypes = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  shop_id?: string;
}) => {
  try {
    // Get shop_id from params or localStorage if not provided
    let shopId = params?.shop_id;
    if (!shopId) {
      const tenantStr = localStorage.getItem('tenant');
      try {
        const tenant = JSON.parse(tenantStr || '{}');
        shopId = tenant.shop_id || '';
      } catch (error) {
        console.error('Error parsing tenant:', error);
      }
    }

    const response = await axiosInstance.get(`${dalaUrl}/property-types`, {
      params: {
        ...params,
        shop_id: shopId,
      },
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch property types:", error);
    throw error;
  }
};

export const createPropertyType = async (data: Partial<PropertyType>) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/property-types`, data, {
      headers: getDalaHeaders()
    });
   // message.success("Property type created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to create property type";
    message.error(errorMessage);
    throw error;
  }
};

export const updatePropertyType = async (id: string, data: Partial<PropertyType>) => {
  try {
    const response = await axiosInstance.put(`${dalaUrl}/property-types/${id}`, data, {
      headers: getDalaHeaders()
    });
    message.success("Property type updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to update property type";
    message.error(errorMessage);
    throw error;
  }
};

export const deletePropertyType = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${dalaUrl}/property-types/${id}`, {
      headers: getDalaHeaders()
    });
    message.success("Property type deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to delete property type";
    message.error(errorMessage);
    throw error;
  }
};

// ── Properties API ────────────────────────────────────────────────────────────

export const fetchProperties = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  property_type_id?: string;
  status?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/properties`, {
      params,
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch properties:", error);
    throw error;
  }
};

export const fetchProperty = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/properties/${id}`, {
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch property:", error);
    throw error;
  }
};

export const createProperty = async (data: Partial<Property>) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/properties`, data, {
      headers: getDalaHeaders()
    });
    message.success("Property created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to create property";
    message.error(errorMessage);
    throw error;
  }
};

export const updateProperty = async (id: string, data: Partial<Property>) => {
  try {
    const response = await axiosInstance.put(`${dalaUrl}/properties/${id}`, data, {
      headers: getDalaHeaders()
    });
    message.success("Property updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to update property";
    message.error(errorMessage);
    throw error;
  }
};

export const deleteProperty = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${dalaUrl}/properties/${id}`, {
      headers: getDalaHeaders()
    });
    message.success("Property deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to delete property";
    message.error(errorMessage);
    throw error;
  }
};

// ── Blocks API ────────────────────────────────────────────────────────────────

export const fetchBlocks = async (property_id?: string) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/blocks`, {
      params: { property_id },
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch blocks:", error);
    throw error;
  }
};

export const createBlock = async (data: Partial<Block>) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/blocks`, data, {
      headers: getDalaHeaders()
    });
    message.success("Block created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to create block";
    message.error(errorMessage);
    throw error;
  }
};

export const updateBlock = async (id: string, data: Partial<Block>) => {
  try {
    const response = await axiosInstance.put(`${dalaUrl}/blocks/${id}`, data, {
      headers: getDalaHeaders()
    });
    message.success("Block updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to update block";
    message.error(errorMessage);
    throw error;
  }
};

export const deleteBlock = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${dalaUrl}/blocks/${id}`, {
      headers: getDalaHeaders()
    });
    message.success("Block deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to delete block";
    message.error(errorMessage);
    throw error;
  }
};

// ── Floors API ────────────────────────────────────────────────────────────────

export const fetchFloors = async (block_id?: string) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/floors`, {
      params: { block_id },
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch floors:", error);
    throw error;
  }
};

export const createFloor = async (data: Partial<Floor>) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/floors`, data, {
      headers: getDalaHeaders()
    });
    message.success("Floor created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to create floor";
    message.error(errorMessage);
    throw error;
  }
};

export const updateFloor = async (id: string, data: Partial<Floor>) => {
  try {
    const response = await axiosInstance.put(`${dalaUrl}/floors/${id}`, data, {
      headers: getDalaHeaders()
    });
    message.success("Floor updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to update floor";
    message.error(errorMessage);
    throw error;
  }
};

export const deleteFloor = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${dalaUrl}/floors/${id}`, {
      headers: getDalaHeaders()
    });
    message.success("Floor deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to delete floor";
    message.error(errorMessage);
    throw error;
  }
};

// ── Units API ────────────────────────────────────────────────────────────────

export const fetchUnits = async (params?: {
  property_id?: string;
  block_id?: string;
  floor_id?: string;
  status?: string;
  type?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/units`, {
      params,
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch units:", error);
    throw error;
  }
};

export const fetchUnit = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/units/${id}`, {
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch unit:", error);
    throw error;
  }
};

export const createUnit = async (data: Partial<Unit>) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/units`, data, {
      headers: getDalaHeaders()
    });
    message.success("Unit created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to create unit";
    message.error(errorMessage);
    throw error;
  }
};

export const updateUnit = async (id: string, data: Partial<Unit>) => {
  try {
    const response = await axiosInstance.put(`${dalaUrl}/units/${id}`, data, {
      headers: getDalaHeaders()
    });
    message.success("Unit updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to update unit";
    message.error(errorMessage);
    throw error;
  }
};

export const deleteUnit = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${dalaUrl}/units/${id}`, {
      headers: getDalaHeaders()
    });
    message.success("Unit deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to delete unit";
    message.error(errorMessage);
    throw error;
  }
};

// ── Sales API ────────────────────────────────────────────────────────────────

export const fetchPropertySales = async (params?: {
  page?: number;
  limit?: number;
  property_id?: string;
  status?: string;
  agent_id?: string;
  start_date?: string;
  end_date?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/sales`, {
      params,
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch property sales:", error);
    throw error;
  }
};

export const createPropertySale = async (data: Partial<PropertySale>) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/sales`, data, {
      headers: getDalaHeaders()
    });
    message.success("Property sale created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to create property sale";
    message.error(errorMessage);
    throw error;
  }
};

export const updatePropertySale = async (id: string, data: Partial<PropertySale>) => {
  try {
    const response = await axiosInstance.put(`${dalaUrl}/sales/${id}`, data, {
      headers: getDalaHeaders()
    });
    message.success("Property sale updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to update property sale";
    message.error(errorMessage);
    throw error;
  }
};

// ── Commissions API ───────────────────────────────────────────────────────────

export const fetchCommissions = async (params?: {
  page?: number;
  limit?: number;
  agent_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/commissions`, {
      params,
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch commissions:", error);
    throw error;
  }
};

export const payCommission = async (id: string, amount: number, notes?: string) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/commissions/${id}/pay`, {
      amount,
      notes
    }, {
      headers: getDalaHeaders()
    });
    message.success("Commission payment recorded successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to record commission payment";
    message.error(errorMessage);
    throw error;
  }
};

// ── Leases API ───────────────────────────────────────────────────────────────

export const fetchLeases = async (params?: {
  page?: number;
  limit?: number;
  property_id?: string;
  status?: string;
  tenant_id?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/leases`, {
      params,
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch leases:", error);
    throw error;
  }
};

export const createLease = async (data: Partial<Lease>) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/leases`, data, {
      headers: getDalaHeaders()
    });
    message.success("Lease created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to create lease";
    message.error(errorMessage);
    throw error;
  }
};

export const updateLease = async (id: string, data: Partial<Lease>) => {
  try {
    const response = await axiosInstance.put(`${dalaUrl}/leases/${id}`, data, {
      headers: getDalaHeaders()
    });
    message.success("Lease updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to update lease";
    message.error(errorMessage);
    throw error;
  }
};

// ── Rent Payments API ─────────────────────────────────────────────────────────

export const fetchRentPayments = async (params?: {
  page?: number;
  limit?: number;
  lease_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/rent-payments`, {
      params,
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch rent payments:", error);
    throw error;
  }
};

export const recordRentPayment = async (lease_id: string, data: {
  amount: number;
  payment_method: string;
  reference?: string;
  notes?: string;
}) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/leases/${lease_id}/rent-payments`, data, {
      headers: getDalaHeaders()
    });
    message.success("Rent payment recorded successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to record rent payment";
    message.error(errorMessage);
    throw error;
  }
};

// ── Dashboard & Reports API ───────────────────────────────────────────────────

export const fetchDalaDashboard = async () => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/dashboard`, {
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch dashboard data:", error);
    throw error;
  }
};

export const fetchPropertyReport = async (property_id: string, params?: {
  start_date?: string;
  end_date?: string;
  report_type?: 'sales' | 'rentals' | 'occupancy' | 'financial';
}) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/properties/${property_id}/reports`, {
      params,
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch property report:", error);
    throw error;
  }
};
