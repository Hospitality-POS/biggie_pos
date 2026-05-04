import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import type {
  Property,
  PropertyType,
  Block,
  Floor,
  Unit,
  Phase,
  PropertySale,
  Commission,
  Lease,
  RentPayment
} from '@services/dala';

// ── Store Types ───────────────────────────────────────────────────────────────

interface DalaState {
  // Loading states
  loading: {
    properties: boolean;
    propertyTypes: boolean;
    blocks: boolean;
    floors: boolean;
    units: boolean;
    sales: boolean;
    commissions: boolean;
    leases: boolean;
    rentPayments: boolean;
    dashboard: boolean;
  };
  
  // Data
  properties: Property[];
  propertyTypes: PropertyType[];
  blocks: Block[];
  floors: Floor[];
  units: Unit[];
  phases: Phase[];
  sales: PropertySale[];
  commissions: Commission[];
  leases: Lease[];
  rentPayments: RentPayment[];
  dashboard: any;
  
  // Selected items
  selectedProperty: Property | null;
  selectedUnit: Unit | null;
  selectedSale: PropertySale | null;
  selectedLease: Lease | null;
  
  // Filters and pagination
  filters: {
    propertySearch: string;
    propertyTypeFilter: string;
    propertyStatusFilter: string;
    unitStatusFilter: string;
    saleStatusFilter: string;
    commissionStatusFilter: string;
    leaseStatusFilter: string;
    rentPaymentStatusFilter: string;
  };
  pagination: {
    properties: { page: number; limit: number; total: number };
    units: { page: number; limit: number; total: number };
    sales: { page: number; limit: number; total: number };
    commissions: { page: number; limit: number; total: number };
    leases: { page: number; limit: number; total: number };
    rentPayments: { page: number; limit: number; total: number };
  };
}

interface DalaActions {
  // Loading actions
  setLoading: (key: keyof DalaState['loading'], value: boolean) => void;
  
  // Property actions
  setProperties: (properties: Property[]) => void;
  addProperty: (property: Property) => void;
  updateProperty: (id: string, property: Partial<Property>) => void;
  removeProperty: (id: string) => void;
  setSelectedProperty: (property: Property | null) => void;
  
  // Property type actions
  setPropertyTypes: (types: PropertyType[]) => void;
  addPropertyType: (type: PropertyType) => void;
  updatePropertyType: (id: string, type: Partial<PropertyType>) => void;
  removePropertyType: (id: string) => void;
  
  // Block actions
  setBlocks: (blocks: Block[]) => void;
  addBlock: (block: Block) => void;
  updateBlock: (id: string, block: Partial<Block>) => void;
  removeBlock: (id: string) => void;
  
  // Floor actions
  setFloors: (floors: Floor[]) => void;
  addFloor: (floor: Floor) => void;
  updateFloor: (id: string, floor: Partial<Floor>) => void;
  removeFloor: (id: string) => void;
  
  // Unit actions
  setUnits: (units: Unit[]) => void;
  addUnit: (unit: Unit) => void;
  updateUnit: (id: string, unit: Partial<Unit>) => void;
  removeUnit: (id: string) => void;
  setSelectedUnit: (unit: Unit | null) => void;
  
  // Phase actions
  setPhases: (phases: Phase[]) => void;
  addPhase: (phase: Phase) => void;
  updatePhase: (id: string, phase: Partial<Phase>) => void;
  removePhase: (id: string) => void;
  
  // Sales actions
  setSales: (sales: PropertySale[]) => void;
  addSale: (sale: PropertySale) => void;
  updateSale: (id: string, sale: Partial<PropertySale>) => void;
  removeSale: (id: string) => void;
  setSelectedSale: (sale: PropertySale | null) => void;
  
  // Commission actions
  setCommissions: (commissions: Commission[]) => void;
  addCommission: (commission: Commission) => void;
  updateCommission: (id: string, commission: Partial<Commission>) => void;
  removeCommission: (id: string) => void;
  
  // Lease actions
  setLeases: (leases: Lease[]) => void;
  addLease: (lease: Lease) => void;
  updateLease: (id: string, lease: Partial<Lease>) => void;
  removeLease: (id: string) => void;
  setSelectedLease: (lease: Lease | null) => void;
  
  // Rent payment actions
  setRentPayments: (payments: RentPayment[]) => void;
  addRentPayment: (payment: RentPayment) => void;
  updateRentPayment: (id: string, payment: Partial<RentPayment>) => void;
  removeRentPayment: (id: string) => void;
  
  // Dashboard actions
  setDashboard: (data: any) => void;
  
  // Filter actions
  setFilter: (key: keyof DalaState['filters'], value: string) => void;
  clearFilters: () => void;
  
  // Pagination actions
  setPagination: (key: keyof DalaState['pagination'], value: { page: number; limit: number; total?: number }) => void;
  
  // Reset actions
  resetStore: () => void;
}

// ── Initial State ─────────────────────────────────────────────────────────────

const initialState: DalaState = {
  loading: {
    properties: false,
    propertyTypes: false,
    blocks: false,
    floors: false,
    units: false,
    sales: false,
    commissions: false,
    leases: false,
    rentPayments: false,
    dashboard: false,
  },
  properties: [],
  propertyTypes: [],
  blocks: [],
  floors: [],
  units: [],
  phases: [],
  sales: [],
  commissions: [],
  leases: [],
  rentPayments: [],
  dashboard: null,
  selectedProperty: null,
  selectedUnit: null,
  selectedSale: null,
  selectedLease: null,
  filters: {
    propertySearch: '',
    propertyTypeFilter: '',
    propertyStatusFilter: '',
    unitStatusFilter: '',
    saleStatusFilter: '',
    commissionStatusFilter: '',
    leaseStatusFilter: '',
    rentPaymentStatusFilter: '',
  },
  pagination: {
    properties: { page: 1, limit: 20, total: 0 },
    units: { page: 1, limit: 20, total: 0 },
    sales: { page: 1, limit: 20, total: 0 },
    commissions: { page: 1, limit: 20, total: 0 },
    leases: { page: 1, limit: 20, total: 0 },
    rentPayments: { page: 1, limit: 20, total: 0 },
  },
};

// ── Store Creation ─────────────────────────────────────────────────────────────

export const useDalaStore = create<DalaState & DalaActions>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Loading actions
      setLoading: (key, value) =>
        set(
          (state) => ({
            loading: { ...state.loading, [key]: value },
          }),
          false,
          `dala-loading-${key}`
        ),
      
      // Property actions
      setProperties: (properties) =>
        set({ properties }, false, 'dala-set-properties'),
      
      addProperty: (property) =>
        set(
          (state) => ({
            properties: [...state.properties, property],
          }),
          false,
          'dala-add-property'
        ),
      
      updateProperty: (id, updatedProperty) =>
        set(
          (state) => ({
            properties: state.properties.map((property) =>
              property._id === id ? { ...property, ...updatedProperty } : property
            ),
            selectedProperty:
              state.selectedProperty?._id === id
                ? { ...state.selectedProperty, ...updatedProperty }
                : state.selectedProperty,
          }),
          false,
          'dala-update-property'
        ),
      
      removeProperty: (id) =>
        set(
          (state) => ({
            properties: state.properties.filter((property) => property._id !== id),
            selectedProperty: state.selectedProperty?._id === id ? null : state.selectedProperty,
          }),
          false,
          'dala-remove-property'
        ),
      
      setSelectedProperty: (property) =>
        set({ selectedProperty: property }, false, 'dala-set-selected-property'),
      
      // Property type actions
      setPropertyTypes: (propertyTypes) =>
        set({ propertyTypes }, false, 'dala-set-property-types'),
      
      addPropertyType: (type) =>
        set(
          (state) => ({
            propertyTypes: [...state.propertyTypes, type],
          }),
          false,
          'dala-add-property-type'
        ),
      
      updatePropertyType: (id, updatedType) =>
        set(
          (state) => ({
            propertyTypes: state.propertyTypes.map((type) =>
              type._id === id ? { ...type, ...updatedType } : type
            ),
          }),
          false,
          'dala-update-property-type'
        ),
      
      removePropertyType: (id) =>
        set(
          (state) => ({
            propertyTypes: state.propertyTypes.filter((type) => type._id !== id),
          }),
          false,
          'dala-remove-property-type'
        ),
      
      // Block actions
      setBlocks: (blocks) =>
        set({ blocks }, false, 'dala-set-blocks'),
      
      addBlock: (block) =>
        set(
          (state) => ({
            blocks: [...state.blocks, block],
          }),
          false,
          'dala-add-block'
        ),
      
      updateBlock: (id, updatedBlock) =>
        set(
          (state) => ({
            blocks: state.blocks.map((block) =>
              block._id === id ? { ...block, ...updatedBlock } : block
            ),
          }),
          false,
          'dala-update-block'
        ),
      
      removeBlock: (id) =>
        set(
          (state) => ({
            blocks: state.blocks.filter((block) => block._id !== id),
          }),
          false,
          'dala-remove-block'
        ),
      
      // Floor actions
      setFloors: (floors) =>
        set({ floors }, false, 'dala-set-floors'),
      
      addFloor: (floor) =>
        set(
          (state) => ({
            floors: [...state.floors, floor],
          }),
          false,
          'dala-add-floor'
        ),
      
      updateFloor: (id, updatedFloor) =>
        set(
          (state) => ({
            floors: state.floors.map((floor) =>
              floor._id === id ? { ...floor, ...updatedFloor } : floor
            ),
          }),
          false,
          'dala-update-floor'
        ),
      
      removeFloor: (id) =>
        set(
          (state) => ({
            floors: state.floors.filter((floor) => floor._id !== id),
          }),
          false,
          'dala-remove-floor'
        ),
      
      // Unit actions
      setUnits: (units) =>
        set({ units }, false, 'dala-set-units'),
      
      addUnit: (unit) =>
        set(
          (state) => ({
            units: [...state.units, unit],
          }),
          false,
          'dala-add-unit'
        ),
      
      updateUnit: (id, updatedUnit) =>
        set(
          (state) => ({
            units: state.units.map((unit) =>
              unit._id === id ? { ...unit, ...updatedUnit } : unit
            ),
            selectedUnit:
              state.selectedUnit?._id === id ? { ...state.selectedUnit, ...updatedUnit } : state.selectedUnit,
          }),
          false,
          'dala-update-unit'
        ),
      
      removeUnit: (id) =>
        set(
          (state) => ({
            units: state.units.filter((unit) => unit._id !== id),
            selectedUnit: state.selectedUnit?._id === id ? null : state.selectedUnit,
          }),
          false,
          'dala-remove-unit'
        ),
      
      setSelectedUnit: (unit) =>
        set({ selectedUnit: unit }, false, 'dala-set-selected-unit'),
      
      // Phase actions
      setPhases: (phases) =>
        set({ phases }, false, 'dala-set-phases'),
      
      addPhase: (phase) =>
        set(
          (state) => ({
            phases: [...state.phases, phase],
          }),
          false,
          'dala-add-phase'
        ),
      
      updatePhase: (id, updatedPhase) =>
        set(
          (state) => ({
            phases: state.phases.map((phase) =>
              phase._id === id ? { ...phase, ...updatedPhase } : phase
            ),
          }),
          false,
          'dala-update-phase'
        ),
      
      removePhase: (id) =>
        set(
          (state) => ({
            phases: state.phases.filter((phase) => phase._id !== id),
          }),
          false,
          'dala-remove-phase'
        ),
      
      // Sales actions
      setSales: (sales) =>
        set({ sales }, false, 'dala-set-sales'),
      
      addSale: (sale) =>
        set(
          (state) => ({
            sales: [...state.sales, sale],
          }),
          false,
          'dala-add-sale'
        ),
      
      updateSale: (id, updatedSale) =>
        set(
          (state) => ({
            sales: state.sales.map((sale) =>
              sale._id === id ? { ...sale, ...updatedSale } : sale
            ),
            selectedSale:
              state.selectedSale?._id === id ? { ...state.selectedSale, ...updatedSale } : state.selectedSale,
          }),
          false,
          'dala-update-sale'
        ),
      
      removeSale: (id) =>
        set(
          (state) => ({
            sales: state.sales.filter((sale) => sale._id !== id),
            selectedSale: state.selectedSale?._id === id ? null : state.selectedSale,
          }),
          false,
          'dala-remove-sale'
        ),
      
      setSelectedSale: (sale) =>
        set({ selectedSale: sale }, false, 'dala-set-selected-sale'),
      
      // Commission actions
      setCommissions: (commissions) =>
        set({ commissions }, false, 'dala-set-commissions'),
      
      addCommission: (commission) =>
        set(
          (state) => ({
            commissions: [...state.commissions, commission],
          }),
          false,
          'dala-add-commission'
        ),
      
      updateCommission: (id, updatedCommission) =>
        set(
          (state) => ({
            commissions: state.commissions.map((commission) =>
              commission._id === id ? { ...commission, ...updatedCommission } : commission
            ),
          }),
          false,
          'dala-update-commission'
        ),
      
      removeCommission: (id) =>
        set(
          (state) => ({
            commissions: state.commissions.filter((commission) => commission._id !== id),
          }),
          false,
          'dala-remove-commission'
        ),
      
      // Lease actions
      setLeases: (leases) =>
        set({ leases }, false, 'dala-set-leases'),
      
      addLease: (lease) =>
        set(
          (state) => ({
            leases: [...state.leases, lease],
          }),
          false,
          'dala-add-lease'
        ),
      
      updateLease: (id, updatedLease) =>
        set(
          (state) => ({
            leases: state.leases.map((lease) =>
              lease._id === id ? { ...lease, ...updatedLease } : lease
            ),
            selectedLease:
              state.selectedLease?._id === id ? { ...state.selectedLease, ...updatedLease } : state.selectedLease,
          }),
          false,
          'dala-update-lease'
        ),
      
      removeLease: (id) =>
        set(
          (state) => ({
            leases: state.leases.filter((lease) => lease._id !== id),
            selectedLease: state.selectedLease?._id === id ? null : state.selectedLease,
          }),
          false,
          'dala-remove-lease'
        ),
      
      setSelectedLease: (lease) =>
        set({ selectedLease: lease }, false, 'dala-set-selected-lease'),
      
      // Rent payment actions
      setRentPayments: (rentPayments) =>
        set({ rentPayments }, false, 'dala-set-rent-payments'),
      
      addRentPayment: (payment) =>
        set(
          (state) => ({
            rentPayments: [...state.rentPayments, payment],
          }),
          false,
          'dala-add-rent-payment'
        ),
      
      updateRentPayment: (id, updatedPayment) =>
        set(
          (state) => ({
            rentPayments: state.rentPayments.map((payment) =>
              payment._id === id ? { ...payment, ...updatedPayment } : payment
            ),
          }),
          false,
          'dala-update-rent-payment'
        ),
      
      removeRentPayment: (id) =>
        set(
          (state) => ({
            rentPayments: state.rentPayments.filter((payment) => payment._id !== id),
          }),
          false,
          'dala-remove-rent-payment'
        ),
      
      // Dashboard actions
      setDashboard: (dashboard) =>
        set({ dashboard }, false, 'dala-set-dashboard'),
      
      // Filter actions
      setFilter: (key, value) =>
        set(
          (state) => ({
            filters: { ...state.filters, [key]: value },
          }),
          false,
          `dala-set-filter-${key}`
        ),
      
      clearFilters: () =>
        set(
          {
            filters: initialState.filters,
          },
          false,
          'dala-clear-filters'
        ),
      
      // Pagination actions
      setPagination: (key, value) =>
        set(
          (state) => ({
            pagination: {
              ...state.pagination,
              [key]: { ...state.pagination[key], ...value },
            },
          }),
          false,
          `dala-set-pagination-${key}`
        ),
      
      // Reset actions
      resetStore: () =>
        set(initialState, false, 'dala-reset-store'),
    }),
    {
      name: 'dala-store',
      partialize: (state) => ({
        // Only persist non-sensitive data
        filters: state.filters,
        pagination: state.pagination,
      }),
    }
  )
);

// ── Selectors ───────────────────────────────────────────────────────────────

export const useDalaProperties = () => {
  const properties = useDalaStore((state) => state.properties);
  const setProperties = useDalaStore((state) => state.setProperties);
  return { data: properties, setProperties };
};
export const useDalaPropertyTypes = () => useDalaStore((state) => state.propertyTypes);
export const useDalaBlocks = () => useDalaStore((state) => state.blocks);
export const useDalaFloors = () => useDalaStore((state) => state.floors);
export const useDalaUnits = () => useDalaStore((state) => state.units);
export const useDalaPhases = () => useDalaStore((state) => state.phases);
export const useDalaSales = () => useDalaStore((state) => state.sales);
export const useDalaCommissions = () => useDalaStore((state) => state.commissions);
export const useDalaLeases = () => useDalaStore((state) => state.leases);
export const useDalaRentPayments = () => useDalaStore((state) => state.rentPayments);
export const useDalaDashboard = () => {
  const dashboard = useDalaStore((state) => state.dashboard);
  const setDashboard = useDalaStore((state) => state.setDashboard);
  return { data: dashboard, setDashboard };
};
export const useDalaLoading = () => useDalaStore((state) => state.loading);
export const useDalaFilters = () => useDalaStore((state) => state.filters);
export const useDalaPagination = () => useDalaStore((state) => state.pagination);

// Combined selectors
export const useDalaSelectedProperty = () => useDalaStore((state) => state.selectedProperty);
export const useDalaSelectedUnit = () => useDalaStore((state) => state.selectedUnit);
export const useDalaSelectedSale = () => useDalaStore((state) => state.selectedSale);
export const useDalaSelectedLease = () => useDalaStore((state) => state.selectedLease);

// Computed selectors
export const useDalaPropertyById = (id: string) =>
  useDalaStore((state) => state.properties.find((property) => property._id === id));

export const useDalaUnitsByProperty = (propertyId: string) =>
  useDalaStore((state) => state.units.filter((unit) => unit.property_id === propertyId));

export const useDalaBlocksByProperty = (propertyId: string) =>
  useDalaStore((state) => state.blocks.filter((block) => block.property_id === propertyId));

export const useDalaFloorsByBlock = (blockId: string) =>
  useDalaStore((state) => state.floors.filter((floor) => floor.block_id === blockId));

export const useDalaUnitsByBlock = (blockId: string) =>
  useDalaStore((state) => state.units.filter((unit) => unit.block_id === blockId));

export const useDalaUnitsByFloor = (floorId: string) =>
  useDalaStore((state) => state.units.filter((unit) => unit.floor_id === floorId));

export const useDalaSalesByProperty = (propertyId: string) =>
  useDalaStore((state) => state.sales.filter((sale) => sale.property_id === propertyId));

export const useDalaLeasesByProperty = (propertyId: string) =>
  useDalaStore((state) => state.leases.filter((lease) => lease.property_id === propertyId));

export const useDalaCommissionsByAgent = (agentId: string) =>
  useDalaStore((state) => state.commissions.filter((commission) => commission.agent_id === agentId));

export const useDalaFilteredProperties = () =>
  useDalaStore(
    (state) => {
      const { properties } = state;
      const { propertySearch, propertyTypeFilter, propertyStatusFilter } = state.filters;
      
      return properties.filter((property) => {
        const matchesSearch = !propertySearch || 
          property.name.toLowerCase().includes(propertySearch.toLowerCase()) ||
          property.code.toLowerCase().includes(propertySearch.toLowerCase()) ||
          property.description?.toLowerCase().includes(propertySearch.toLowerCase());
        
        const matchesType = !propertyTypeFilter || property.property_type_id === propertyTypeFilter;
        const matchesStatus = !propertyStatusFilter || property.status === propertyStatusFilter;
        
        return matchesSearch && matchesType && matchesStatus;
      });
    },
    shallow
  );

export const useDalaFilteredUnits = () =>
  useDalaStore((state) => {
    const { units } = state;
    const { unitStatusFilter } = state.filters;
    
    return units.filter((unit) => {
      const matchesStatus = !unitStatusFilter || unit.status === unitStatusFilter;
      return matchesStatus;
    });
  });

export const useDalaFilteredSales = () =>
  useDalaStore((state) => {
    const { sales } = state;
    const { saleStatusFilter } = state.filters;
    
    return sales.filter((sale) => {
      const matchesStatus = !saleStatusFilter || sale.status === saleStatusFilter;
      return matchesStatus;
    });
  });
