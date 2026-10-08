import { createSlice, PayloadAction } from '@reduxjs/toolkit';
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
  RentPayment,
} from '@services/dala';

export interface DalaState {
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
  selectedProperty: Property | null;
  selectedUnit: Unit | null;
  selectedSale: PropertySale | null;
  selectedLease: Lease | null;
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

export const initialDalaState: DalaState = {
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

export const dalaSlice = createSlice({
  name: 'dala',
  initialState: initialDalaState,
  reducers: {
    setLoading: (
      state,
      action: PayloadAction<{ key: keyof DalaState['loading']; value: boolean }>
    ) => {
      state.loading[action.payload.key] = action.payload.value;
    },

    // Property reducers
    setProperties: (state, action: PayloadAction<Property[]>) => {
      state.properties = action.payload;
    },
    addProperty: (state, action: PayloadAction<Property>) => {
      state.properties.push(action.payload);
    },
    updateProperty: (
      state,
      action: PayloadAction<{ id: string; property: Partial<Property> }>
    ) => {
      state.properties = state.properties.map((p) =>
        p._id === action.payload.id ? { ...p, ...action.payload.property } : p
      );
      if (state.selectedProperty?._id === action.payload.id) {
        state.selectedProperty = {
          ...state.selectedProperty,
          ...action.payload.property,
        };
      }
    },
    removeProperty: (state, action: PayloadAction<string>) => {
      state.properties = state.properties.filter((p) => p._id !== action.payload);
      if (state.selectedProperty?._id === action.payload) {
        state.selectedProperty = null;
      }
    },
    setSelectedProperty: (state, action: PayloadAction<Property | null>) => {
      state.selectedProperty = action.payload;
    },

    // Property type reducers
    setPropertyTypes: (state, action: PayloadAction<PropertyType[]>) => {
      state.propertyTypes = action.payload;
    },
    addPropertyType: (state, action: PayloadAction<PropertyType>) => {
      state.propertyTypes.push(action.payload);
    },
    updatePropertyType: (
      state,
      action: PayloadAction<{ id: string; type: Partial<PropertyType> }>
    ) => {
      state.propertyTypes = state.propertyTypes.map((t) =>
        t._id === action.payload.id ? { ...t, ...action.payload.type } : t
      );
    },
    removePropertyType: (state, action: PayloadAction<string>) => {
      state.propertyTypes = state.propertyTypes.filter((t) => t._id !== action.payload);
    },

    // Block reducers
    setBlocks: (state, action: PayloadAction<Block[]>) => {
      state.blocks = action.payload;
    },
    addBlock: (state, action: PayloadAction<Block>) => {
      state.blocks.push(action.payload);
    },
    updateBlock: (
      state,
      action: PayloadAction<{ id: string; block: Partial<Block> }>
    ) => {
      state.blocks = state.blocks.map((b) =>
        b._id === action.payload.id ? { ...b, ...action.payload.block } : b
      );
    },
    removeBlock: (state, action: PayloadAction<string>) => {
      state.blocks = state.blocks.filter((b) => b._id !== action.payload);
    },

    // Floor reducers
    setFloors: (state, action: PayloadAction<Floor[]>) => {
      state.floors = action.payload;
    },
    addFloor: (state, action: PayloadAction<Floor>) => {
      state.floors.push(action.payload);
    },
    updateFloor: (
      state,
      action: PayloadAction<{ id: string; floor: Partial<Floor> }>
    ) => {
      state.floors = state.floors.map((f) =>
        f._id === action.payload.id ? { ...f, ...action.payload.floor } : f
      );
    },
    removeFloor: (state, action: PayloadAction<string>) => {
      state.floors = state.floors.filter((f) => f._id !== action.payload);
    },

    // Unit reducers
    setUnits: (state, action: PayloadAction<Unit[]>) => {
      state.units = action.payload;
    },
    addUnit: (state, action: PayloadAction<Unit>) => {
      state.units.push(action.payload);
    },
    updateUnit: (
      state,
      action: PayloadAction<{ id: string; unit: Partial<Unit> }>
    ) => {
      state.units = state.units.map((u) =>
        u._id === action.payload.id ? { ...u, ...action.payload.unit } : u
      );
      if (state.selectedUnit?._id === action.payload.id) {
        state.selectedUnit = { ...state.selectedUnit, ...action.payload.unit };
      }
    },
    removeUnit: (state, action: PayloadAction<string>) => {
      state.units = state.units.filter((u) => u._id !== action.payload);
      if (state.selectedUnit?._id === action.payload) {
        state.selectedUnit = null;
      }
    },
    setSelectedUnit: (state, action: PayloadAction<Unit | null>) => {
      state.selectedUnit = action.payload;
    },

    // Phase reducers
    setPhases: (state, action: PayloadAction<Phase[]>) => {
      state.phases = action.payload;
    },
    addPhase: (state, action: PayloadAction<Phase>) => {
      state.phases.push(action.payload);
    },
    updatePhase: (
      state,
      action: PayloadAction<{ id: string; phase: Partial<Phase> }>
    ) => {
      state.phases = state.phases.map((p) =>
        p._id === action.payload.id ? { ...p, ...action.payload.phase } : p
      );
    },
    removePhase: (state, action: PayloadAction<string>) => {
      state.phases = state.phases.filter((p) => p._id !== action.payload);
    },

    // Sales reducers
    setSales: (state, action: PayloadAction<PropertySale[]>) => {
      state.sales = action.payload;
    },
    addSale: (state, action: PayloadAction<PropertySale>) => {
      state.sales.push(action.payload);
    },
    updateSale: (
      state,
      action: PayloadAction<{ id: string; sale: Partial<PropertySale> }>
    ) => {
      state.sales = state.sales.map((s) =>
        s._id === action.payload.id ? { ...s, ...action.payload.sale } : s
      );
      if (state.selectedSale?._id === action.payload.id) {
        state.selectedSale = { ...state.selectedSale, ...action.payload.sale };
      }
    },
    removeSale: (state, action: PayloadAction<string>) => {
      state.sales = state.sales.filter((s) => s._id !== action.payload);
      if (state.selectedSale?._id === action.payload) {
        state.selectedSale = null;
      }
    },
    setSelectedSale: (state, action: PayloadAction<PropertySale | null>) => {
      state.selectedSale = action.payload;
    },

    // Commission reducers
    setCommissions: (state, action: PayloadAction<Commission[]>) => {
      state.commissions = action.payload;
    },
    addCommission: (state, action: PayloadAction<Commission>) => {
      state.commissions.push(action.payload);
    },
    updateCommission: (
      state,
      action: PayloadAction<{ id: string; commission: Partial<Commission> }>
    ) => {
      state.commissions = state.commissions.map((c) =>
        c._id === action.payload.id ? { ...c, ...action.payload.commission } : c
      );
    },
    removeCommission: (state, action: PayloadAction<string>) => {
      state.commissions = state.commissions.filter((c) => c._id !== action.payload);
    },

    // Lease reducers
    setLeases: (state, action: PayloadAction<Lease[]>) => {
      state.leases = action.payload;
    },
    addLease: (state, action: PayloadAction<Lease>) => {
      state.leases.push(action.payload);
    },
    updateLease: (
      state,
      action: PayloadAction<{ id: string; lease: Partial<Lease> }>
    ) => {
      state.leases = state.leases.map((l) =>
        l._id === action.payload.id ? { ...l, ...action.payload.lease } : l
      );
      if (state.selectedLease?._id === action.payload.id) {
        state.selectedLease = { ...state.selectedLease, ...action.payload.lease };
      }
    },
    removeLease: (state, action: PayloadAction<string>) => {
      state.leases = state.leases.filter((l) => l._id !== action.payload);
      if (state.selectedLease?._id === action.payload) {
        state.selectedLease = null;
      }
    },
    setSelectedLease: (state, action: PayloadAction<Lease | null>) => {
      state.selectedLease = action.payload;
    },

    // Rent payment reducers
    setRentPayments: (state, action: PayloadAction<RentPayment[]>) => {
      state.rentPayments = action.payload;
    },
    addRentPayment: (state, action: PayloadAction<RentPayment>) => {
      state.rentPayments.push(action.payload);
    },
    updateRentPayment: (
      state,
      action: PayloadAction<{ id: string; payment: Partial<RentPayment> }>
    ) => {
      state.rentPayments = state.rentPayments.map((rp) =>
        rp._id === action.payload.id ? { ...rp, ...action.payload.payment } : rp
      );
    },
    removeRentPayment: (state, action: PayloadAction<string>) => {
      state.rentPayments = state.rentPayments.filter((rp) => rp._id !== action.payload);
    },

    // Dashboard reducers
    setDashboard: (state, action: PayloadAction<any>) => {
      state.dashboard = action.payload;
    },

    // Filter reducers
    setFilter: (
      state,
      action: PayloadAction<{ key: keyof DalaState['filters']; value: string }>
    ) => {
      state.filters[action.payload.key] = action.payload.value;
    },
    clearFilters: (state) => {
      state.filters = initialDalaState.filters;
    },

    // Pagination reducers
    setPagination: (
      state,
      action: PayloadAction<{
        key: keyof DalaState['pagination'];
        value: { page: number; limit: number; total?: number };
      }>
    ) => {
      state.pagination[action.payload.key] = {
        ...state.pagination[action.payload.key],
        ...action.payload.value,
      };
    },

    // Reset reducer
    resetStore: () => initialDalaState,
  },
});

export const dalaActions = dalaSlice.actions;
export default dalaSlice.reducer;
