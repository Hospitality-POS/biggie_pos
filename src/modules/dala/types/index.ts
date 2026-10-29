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
  pricePerSqm?: number;
  listPrice?: number;
  pricePerSqmFloor?: number;
  pricePerSqmCeiling?: number;
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

export interface DalaDashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  availableUnits: number;
  occupancyRate: number;
  totalMonthlyRent: number;
  collectedRentThisMonth: number;
  outstandingRent: number;
  activeLeases: number;
  pendingMaintenance: number;
}

// Backward-compatibility aliases
export type PaymentSchedule = any;
export type Buyer = any;
export type Agent = any;
export type PaymentRecord = any;
