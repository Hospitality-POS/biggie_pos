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
  floorNumber: number;
  blockId: string;
  propertyId: string;
  description?: string;
  status: 'active' | 'inactive' | 'under_construction';
  units?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnitPricing {
  basePrice: number;
  pricePerSqm: number;
  minPrice: number;
  maxPrice: number;
  currency: 'KES' | 'USD' | 'EUR' | 'GBP';
}

export interface Apartment {
  apartmentName: string;
  apartmentNumber?: string;
  area: {
    value: number;
    unit: 'sqm' | 'sqft';
  };
  status: 'available' | 'reserved' | 'sold' | 'occupied' | 'under_construction';
  pricePerSqmOverride?: number;
  saleListPrice?: number;
  rentPerSqmOverride?: number;
  monthlyRentOverride?: number;
  soldTo?: string;
  soldDate?: string;
  customerId?: string;
  currentLeaseId?: string;
  currentOccupant?: string;
  notes?: string;
}

export interface Unit {
  _id: string;
  name: string;
  code: string;
  type: 'residential' | 'commercial' | 'industrial' | 'mixed';
  unitType?: string;
  unitNumber?: string;
  areaSqm: number;
  blockId: string;
  floorId: string;
  propertyId: string;
  status: 'available' | 'reserved' | 'sold' | 'rented' | 'maintenance';
  pricing?: UnitPricing;
  // Legacy pricing fields (retained for backward compatibility)
  pricePerSqm?: number;
  listPrice?: number;
  pricePerSqmFloor?: number;
  pricePerSqmCeiling?: number;
  // Rental pricing fields
  rentPerSqm?: number;
  monthlyRent?: number;
  serviceCharge?: number;
  depositMonths?: number;
  depositAmount?: number;
  rentDueDay?: number;
  rentFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  utilities?: {
    water?: boolean;
    electricity?: boolean;
    internet?: boolean;
    garbage?: boolean;
  };
  // Apartment tracking
  trackIndividualUnits?: boolean;
  apartments?: Apartment[];
  totalUnits?: number;
  availableUnits?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhasePricing {
  phasePrice: number;
  pricePerSqm: number;
  minPrice: number;
  maxPrice: number;
  currency: 'KES' | 'USD' | 'EUR' | 'GBP';
  priceAdjustment: number;
}

export interface Phase {
  _id: string;
  name: string;
  description?: string;
  property_id: string;
  start_date: string;
  end_date?: string;
  pricing_multiplier?: number;
  pricing?: PhasePricing;
  // Legacy field retained for backward compatibility
  price?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Property {
  _id: string;
  name: string;
  description?: string;
  code?: string;
  address?: string;
  location?: any;
  property_type_id?: string;
  propertyType?: string;
  category?: string;
  purpose?: 'sale' | 'rent' | 'lease' | 'rental' | 'mixed';
  defaultPricePerSqm?: number;
  defaultRentPerSqm?: number;
  defaultServiceCharge?: number;
  defaultDepositMonths?: number;
  defaultRentDueDay?: number;
  defaultUtilities?: { water: boolean; electricity: boolean; internet: boolean; garbage: boolean };
  currency?: string;
  total_units?: number;
  available_units?: number;
  sold_units?: number;
  rented_units?: number;
  developer?: string;
  year_built?: number;
  amenities?: string[];
  features?: string[];
  images?: string[];
  documents?: any[];
  status: string;
  is_active?: boolean;
  isBlockless?: boolean;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
  shop_id?: string;
  property_type?: PropertyType;
  blocks?: Block[];
  phases?: Phase[];
  units?: any[];
  occupancySummary?: any;
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
    // Get shop_id from localStorage if not provided
    let shopId = data.shop_id as string;
    
    if (!shopId) {
      shopId = localStorage.getItem("shopId") || '';
    }

    const dataWithIds = {
      ...data,
      shop_id: shopId,
    };

    const response = await axiosInstance.post(`${dalaUrl}/property-types`, dataWithIds, {
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

export const fetchProperties = async (populate: boolean = true) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/properties`, {
      headers: getDalaHeaders(),
      params: { populate }
    });
    console.log('my properties',response );
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
  
    return response.data;
  } catch (error: any) {
    console.log('error val',error );
    const errorMessage = error?.response?.data?.error || "Failed to create property";
    message.error(errorMessage);
    throw error;
  }
};

export const updateProperty = async (id: string, data: Partial<Property>) => {
  try {
    const response = await axiosInstance.put(`${dalaUrl}/properties/${id}`, data, {
      headers: getDalaHeaders(),
      params: { populate: false }
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
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to delete property";
    message.error(errorMessage);
    throw error;
  }
};

export const importProperties = async (data: { properties: Partial<Property>[] }) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/properties/import`, data, {
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to import properties";
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

// ── Sales Payments API ─────────────────────────────────────────────────────────

export const fetchSalePayments = async (params?: {
  page?: number;
  limit?: number;
  saleId?: string;
  customerId?: string;
  paymentPlanId?: string;
  status?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  shop_id?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/sale-payments`, {
      params,
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch sale payments:", error);
    throw error;
  }
};

export const recordSalePayment = async (data: {
  saleId: string;
  paymentPlanId?: string;
  customerId: string;
  propertyId?: string;
  unitId?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  paymentType?: string;
  reference?: string;
  receiptNumber?: string;
  etimsRefNumber?: string;
  notes?: string;
  attachments?: any[];
  shop_id?: string;
}) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/sale-payments`, data, {
      headers: getDalaHeaders()
    });
    message.success("Sale payment recorded successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to record sale payment";
    message.error(errorMessage);
    throw error;
  }
};

export const reverseSalePayment = async (id: string, reversalReason?: string) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/sale-payments/${id}/reverse`, {
      reversalReason
    }, {
      headers: getDalaHeaders()
    });
    message.success("Sale payment reversed successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to reverse sale payment";
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
  saleId?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/commissions`, {
      params,
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch commissions:", error);
    throw error;
  }
};

export const payCommission = async (saleId: string, amount: number, notes?: string, paymentMethod?: string, reference?: string, withholdingTax?: any) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/commissions/pay`, {
      saleId,
      amount,
      notes,
      paymentMethod,
      reference,
      withholdingTax
    }, {
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || error?.response?.data?.message || "Failed to record commission payment";
    throw error;
  }
};

// ── Leases API ───────────────────────────────────────────────────────────────

export const fetchLeases = async (params?: {
  page?: number;
  limit?: number;
  propertyId?: string;
  status?: string;
  occupantId?: string;
  shop_id?: string;
  startDate?: string;
  endDate?: string;
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

export const createLease = async (data: {
  propertyId: string;
  unitId: string;
  occupantId: string;
  leaseType: string;
  startDate: string;
  endDate?: string;
  leaseAmount: number;
  leasePerSqm?: number;
  paymentFrequency?: string;
  paymentDueDay?: number;
  unitAreaSqm?: number;
  currency?: string;
  depositAmount?: number;
  depositPaid?: number;
  depositPaidDate?: string;
  depositRefunded?: number;
  depositRefundedDate?: string;
  depositDeductions?: number;
  depositNotes?: string;
  serviceChargeAmount?: number;
  serviceChargeFrequency?: string;
  utilities?: { water: boolean; electricity: boolean; internet: boolean; garbage: boolean };
  status?: string;
  signedDate?: string;
  leaseEscalations?: any[];
  documents?: any[];
  notes?: string;
  blockId?: string;
  floorId?: string;
  [key: string]: any;
}) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/leases`, data, {
      headers: getDalaHeaders()
    });

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
  
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to update lease";
    message.error(errorMessage);
    throw error;
  }
};

export const deleteLease = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${dalaUrl}/leases/${id}`, {
      headers: getDalaHeaders()
    });
   
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to delete lease";
    message.error(errorMessage);
    throw error;
  }
};

export const activateLease = async (id: string) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/leases/${id}/activate`, {}, {
      headers: getDalaHeaders()
    });
    message.success("Lease activated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to activate lease";
    message.error(errorMessage);
    throw error;
  }
};

export const noticeLease = async (id: string, data: {
  noticeDate?: string;
  vacateDate?: string;
}) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/leases/${id}/notice`, data, {
      headers: getDalaHeaders()
    });
    message.success("Notice period set successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to set notice period";
    message.error(errorMessage);
    throw error;
  }
};

export const terminateLease = async (id: string, data: {
  terminationDate?: string;
  terminationReason?: string;
}) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/leases/${id}/terminate`, data, {
      headers: getDalaHeaders()
    });
    message.success("Lease terminated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to terminate lease";
    message.error(errorMessage);
    throw error;
  }
};

export const renewLease = async (id: string, data: {
  startDate: string;
  endDate?: string;
  leaseAmount?: number;
}) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/leases/${id}/renew`, data, {
      headers: getDalaHeaders()
    });
    message.success("Lease renewed successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to renew lease";
    message.error(errorMessage);
    throw error;
  }
};

// ── Rent Payments API ─────────────────────────────────────────────────────────

export const fetchRentPayments = async (params?: {
  page?: number;
  limit?: number;
  leaseId?: string;
  status?: string;
  paymentMethod?: string;
  paymentType?: string;
  startDate?: string;
  endDate?: string;
  shop_id?: string;
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

export const recordRentPayment = async (data: {
  leaseId: string;
  invoiceId?: string;
  occupantId?: string;
  propertyId?: string;
  unitId?: string;
  paymentDate: string;
  amount: number;
  currency?: string;
  paymentMethod: string;
  mpesaCode?: string;
  bankReference?: string;
  chequeNumber?: string;
  paymentType?: string;
  periodCovered?: string;
  status?: string;
  notes?: string;
  receiptNumber?: string;
  shop_id?: string;
}) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/rent-payments`, data, {
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

export const reverseRentPayment = async (id: string, reversalReason?: string) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/rent-payments/${id}/reverse`, {
      reversalReason
    }, {
      headers: getDalaHeaders()
    });
    message.success("Payment reversed successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to reverse payment";
    message.error(errorMessage);
    throw error;
  }
};

// ── Rent Invoices API ─────────────────────────────────────────────────────────

export const fetchRentInvoices = async (params?: {
  leaseId?: string;
  propertyId?: string;
  occupantId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  shop_id?: string;
  page?: number;
  limit?: number;
}) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/rent-invoices`, {
      params,
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch rent invoices:", error);
    throw error;
  }
};

export const createRentInvoice = async (data: {
  leaseId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  lines?: Array<{
    description: string;
    lineType: string;
    quantity?: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
  }>;
  notes?: string;
  shop_id?: string;
  [key: string]: any;
}) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/rent-invoices`, data, {
      headers: getDalaHeaders()
    });
    message.success("Invoice created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to create invoice";
    message.error(errorMessage);
    throw error;
  }
};

export const issueRentInvoice = async (id: string) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/rent-invoices/${id}/issue`, {}, {
      headers: getDalaHeaders()
    });
    message.success("Invoice issued successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to issue invoice";
    message.error(errorMessage);
    throw error;
  }
};

export const waiveRentInvoice = async (id: string, reason?: string) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/rent-invoices/${id}/waive`, { reason }, {
      headers: getDalaHeaders()
    });
    message.success("Invoice waived successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to waive invoice";
    message.error(errorMessage);
    throw error;
  }
};

export const generateBulkInvoices = async (data: {
  propertyId?: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  shop_id?: string;
}) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/rent-invoices/generate`, data, {
      headers: getDalaHeaders()
    });
  
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to generate invoices";
    message.error(errorMessage);
    throw error;
  }
};

// ── Maintenance & Tickets API ─────────────────────────────────────────────────

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

export const fetchMaintenanceTickets = async (params?: MaintenanceTicketParams) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/maintenance`, {
      params,
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch maintenance tickets:", error);
    throw error;
  }
};

export const fetchMaintenanceTicket = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/maintenance/${id}`, {
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch maintenance ticket:", error);
    throw error;
  }
};

export const createMaintenanceTicket = async (data: any) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/maintenance`, data, {
      headers: getDalaHeaders()
    });
    message.success("Maintenance ticket created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to create maintenance ticket";
    message.error(errorMessage);
    throw error;
  }
};

export const updateMaintenanceTicket = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.put(`${dalaUrl}/maintenance/${id}`, data, {
      headers: getDalaHeaders()
    });
    message.success("Maintenance ticket updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to update maintenance ticket";
    message.error(errorMessage);
    throw error;
  }
};

export const deleteMaintenanceTicket = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${dalaUrl}/maintenance/${id}`, {
      headers: getDalaHeaders()
    });
    message.success("Maintenance ticket deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to delete maintenance ticket";
    message.error(errorMessage);
    throw error;
  }
};

export const updateMaintenanceTicketStatus = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.patch(`${dalaUrl}/maintenance/${id}/status`, data, {
      headers: getDalaHeaders()
    });
    message.success("Ticket status updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to update ticket status";
    message.error(errorMessage);
    throw error;
  }
};

export const addMaintenanceTicketUpdate = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/maintenance/${id}/updates`, data, {
      headers: getDalaHeaders()
    });
    message.success("Ticket update added successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to add ticket update";
    message.error(errorMessage);
    throw error;
  }
};

export const addMaintenanceTicketCost = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/maintenance/${id}/costs`, data, {
      headers: getDalaHeaders()
    });
    message.success("Ticket cost added successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to add ticket cost";
    message.error(errorMessage);
    throw error;
  }
};

export const fetchMaintenanceStats = async (params?: { shop_id?: string }) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/maintenance/stats`, {
      params,
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch maintenance stats:", error);
    throw error;
  }
};

// ── Maintenance Categories API ─────────────────────────────────────────────────

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

export const fetchMaintenanceCategories = async (params?: {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
  shop_id?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/maintenance-categories`, {
      params,
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch maintenance categories:", error);
    throw error;
  }
};

export const fetchMaintenanceCategory = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/maintenance-categories/${id}`, {
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch maintenance category:", error);
    throw error;
  }
};

export const createMaintenanceCategory = async (data: Partial<MaintenanceCategory>) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/maintenance-categories`, data, {
      headers: getDalaHeaders()
    });
    message.success("Maintenance category created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to create maintenance category";
    message.error(errorMessage);
    throw error;
  }
};

export const updateMaintenanceCategory = async (id: string, data: Partial<MaintenanceCategory>) => {
  try {
    const response = await axiosInstance.put(`${dalaUrl}/maintenance-categories/${id}`, data, {
      headers: getDalaHeaders()
    });
    message.success("Maintenance category updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to update maintenance category";
    message.error(errorMessage);
    throw error;
  }
};

export const deleteMaintenanceCategory = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${dalaUrl}/maintenance-categories/${id}`, {
      headers: getDalaHeaders()
    });
    message.success("Maintenance category deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to delete maintenance category";
    message.error(errorMessage);
    throw error;
  }
};

export const toggleMaintenanceCategoryStatus = async (id: string) => {
  try {
    const response = await axiosInstance.patch(`${dalaUrl}/maintenance-categories/${id}/toggle-status`, {}, {
      headers: getDalaHeaders()
    });
    message.success("Category status updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to toggle category status";
    message.error(errorMessage);
    throw error;
  }
};

export const reorderMaintenanceCategories = async (data: { categories: Array<{ id: string; sortOrder: number }> }) => {
  try {
    const response = await axiosInstance.post(`${dalaUrl}/maintenance-categories/reorder`, data, {
      headers: getDalaHeaders()
    });
    message.success("Categories reordered successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || "Failed to reorder categories";
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
