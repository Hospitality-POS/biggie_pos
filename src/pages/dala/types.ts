export interface Sale {
  _id: string;
  id?: string;
  saleCode: string;
  salePrice: number | string;
  amountPaid?: number | string;
  paymentTotals?: {
    totalPaid?: number;
    depositPaid?: number;
    outstandingBalance?: number;
    paymentPercentage?: number;
  };
  commissionPercentage?: number | string;
  commissionAmount?: number | string;
  commissionPaid?: number | string;
  commissionStatus?: string;
  property?: string;
  unit?: string;
  unitId?: string;
  propertyId?: string;
  status?: string;
  saleData?: Sale;
  payments?: Payment[];
  allPayments?: Payment[];
  commission?: {
    _id?: string;
    amount?: number | string;
    percentage?: number | string;
    rate?: number | string;
    status?: string;
    commissionPayments?: CommissionPayment[];
  };
  commissionPayments?: CommissionPayment[];
  agentId?: string;
  agent?: {
    _id?: string;
    name?: string;
    email?: string;
  };
  createdAt?: string | Date;
}

export interface Payment {
  _id?: string;
  amount: number;
  date?: string;
  status?: string;
  method?: string;
}

export interface CommissionPayment {
  _id?: string;
  amount: number;
  netAmount?: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  description?: string;
  notes?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

export interface AgentSaleDetails {
  saleId: string;
  saleCode: string;
  salePrice: number | string;
  amountPaid: number | string;
  paymentTotals?: {
    totalPaid?: number;
    depositPaid?: number;
    outstandingBalance?: number;
    paymentPercentage?: number;
  };
  commissionPercentage: string;
  commissionAmount: string;
  commissionPaid: string;
  property: string;
  unit?: string;
  agent?: string;
  agentName?: string;
  commissionStatus: string;
  paymentProgress?: number;
  saleData?: Sale;
  commissionPayments?: CommissionPayment[];
  status?: string;
  payments?: Payment[];
  allPayments?: Payment[];
  commission?: {
    _id?: string;
    amount?: number | string;
    percentage?: number | string;
    rate?: number | string;
    status?: string;
    commissionPayments?: CommissionPayment[];
  };
}

export interface AgentCommissionReport {
  agentId: string;
  agentName: string;
  agentEmail: string;
  totalSales: number;
  totalSaleValue: number;
  totalCommission: number;
  totalCommissionPaid: number;
  sales: AgentSaleDetails[];
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
  total_units?: number;
  available_units?: number;
  sold_units?: number;
  rented_units?: number;
  status: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  shop_id?: string;
  blocks?: any[];
  phases?: any[];
  units?: any[];
}

export interface PropertyAnalysis {
  propertyId: string;
  propertyName: string;
  salesCount: number;
  totalValue: number;
  percentage: string | number;
  topAgent?: {
    agentName: string;
    salesCount: number;
    totalValue: number;
  };
}

export interface PortfolioProperty {
  propertyId: string;
  propertyName: string;
  location?: string;
  totalUnits: number;
  soldUnits: number;
  reservedUnits: number;
  availableUnits: number;
  rentedUnits?: number;
  salesProgress: number | string;
  totalValue: number;
  units: PortfolioUnit[];
}

export interface PortfolioUnit {
  unitId: string;
  unitType: string;
  plotSize: string;
  price: number;
  totalUnits: number;
  soldUnits: number;
  availableUnits: number;
  salesProgress: number | string;
  status: 'sold' | 'reserved' | 'available' | 'rented';
  sales: UnitSale[];
}

export interface UnitSale {
  saleId: string;
  saleCode: string;
  customer: string;
  saleDate: string;
  salePrice: number;
  quantity: number;
  agentName: string;
  status: string;
}
