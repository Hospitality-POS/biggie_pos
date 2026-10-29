export type {
  Property,
  PropertyType,
  Block,
  Floor,
  Unit,
  Apartment,
  UnitPricing,
  Phase,
  PropertySale,
  Commission,
  Lease,
  RentPayment,
  PaymentSchedule,
  Buyer,
  Agent,
  PaymentRecord,
} from '@services/dala';

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
