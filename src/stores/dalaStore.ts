import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { dalaActions, DalaState } from '../features/Dala/dalaSlice';
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

export type { DalaState };

// ── Action Hook ─────────────────────────────────────────────────────────────

export const useDalaActions = () => {
  const dispatch = useAppDispatch();

  return useMemo(
    () => ({
      setLoading: (key: keyof DalaState['loading'], value: boolean) =>
        dispatch(dalaActions.setLoading({ key, value })),

      // Properties
      setProperties: (properties: Property[]) =>
        dispatch(dalaActions.setProperties(properties)),
      addProperty: (property: Property) =>
        dispatch(dalaActions.addProperty(property)),
      updateProperty: (id: string, property: Partial<Property>) =>
        dispatch(dalaActions.updateProperty({ id, property })),
      removeProperty: (id: string) => dispatch(dalaActions.removeProperty(id)),
      setSelectedProperty: (property: Property | null) =>
        dispatch(dalaActions.setSelectedProperty(property)),

      // Property types
      setPropertyTypes: (types: PropertyType[]) =>
        dispatch(dalaActions.setPropertyTypes(types)),
      addPropertyType: (type: PropertyType) =>
        dispatch(dalaActions.addPropertyType(type)),
      updatePropertyType: (id: string, type: Partial<PropertyType>) =>
        dispatch(dalaActions.updatePropertyType({ id, type })),
      removePropertyType: (id: string) =>
        dispatch(dalaActions.removePropertyType(id)),

      // Blocks
      setBlocks: (blocks: Block[]) => dispatch(dalaActions.setBlocks(blocks)),
      addBlock: (block: Block) => dispatch(dalaActions.addBlock(block)),
      updateBlock: (id: string, block: Partial<Block>) =>
        dispatch(dalaActions.updateBlock({ id, block })),
      removeBlock: (id: string) => dispatch(dalaActions.removeBlock(id)),

      // Floors
      setFloors: (floors: Floor[]) => dispatch(dalaActions.setFloors(floors)),
      addFloor: (floor: Floor) => dispatch(dalaActions.addFloor(floor)),
      updateFloor: (id: string, floor: Partial<Floor>) =>
        dispatch(dalaActions.updateFloor({ id, floor })),
      removeFloor: (id: string) => dispatch(dalaActions.removeFloor(id)),

      // Units
      setUnits: (units: Unit[]) => dispatch(dalaActions.setUnits(units)),
      addUnit: (unit: Unit) => dispatch(dalaActions.addUnit(unit)),
      updateUnit: (id: string, unit: Partial<Unit>) =>
        dispatch(dalaActions.updateUnit({ id, unit })),
      removeUnit: (id: string) => dispatch(dalaActions.removeUnit(id)),
      setSelectedUnit: (unit: Unit | null) =>
        dispatch(dalaActions.setSelectedUnit(unit)),

      // Phases
      setPhases: (phases: Phase[]) => dispatch(dalaActions.setPhases(phases)),
      addPhase: (phase: Phase) => dispatch(dalaActions.addPhase(phase)),
      updatePhase: (id: string, phase: Partial<Phase>) =>
        dispatch(dalaActions.updatePhase({ id, phase })),
      removePhase: (id: string) => dispatch(dalaActions.removePhase(id)),

      // Sales
      setSales: (sales: PropertySale[]) => dispatch(dalaActions.setSales(sales)),
      addSale: (sale: PropertySale) => dispatch(dalaActions.addSale(sale)),
      updateSale: (id: string, sale: Partial<PropertySale>) =>
        dispatch(dalaActions.updateSale({ id, sale })),
      removeSale: (id: string) => dispatch(dalaActions.removeSale(id)),
      setSelectedSale: (sale: PropertySale | null) =>
        dispatch(dalaActions.setSelectedSale(sale)),

      // Commissions
      setCommissions: (commissions: Commission[]) =>
        dispatch(dalaActions.setCommissions(commissions)),
      addCommission: (commission: Commission) =>
        dispatch(dalaActions.addCommission(commission)),
      updateCommission: (id: string, commission: Partial<Commission>) =>
        dispatch(dalaActions.updateCommission({ id, commission })),
      removeCommission: (id: string) =>
        dispatch(dalaActions.removeCommission(id)),

      // Leases
      setLeases: (leases: Lease[]) => dispatch(dalaActions.setLeases(leases)),
      addLease: (lease: Lease) => dispatch(dalaActions.addLease(lease)),
      updateLease: (id: string, lease: Partial<Lease>) =>
        dispatch(dalaActions.updateLease({ id, lease })),
      removeLease: (id: string) => dispatch(dalaActions.removeLease(id)),
      setSelectedLease: (lease: Lease | null) =>
        dispatch(dalaActions.setSelectedLease(lease)),

      // Rent payments
      setRentPayments: (payments: RentPayment[]) =>
        dispatch(dalaActions.setRentPayments(payments)),
      addRentPayment: (payment: RentPayment) =>
        dispatch(dalaActions.addRentPayment(payment)),
      updateRentPayment: (id: string, payment: Partial<RentPayment>) =>
        dispatch(dalaActions.updateRentPayment({ id, payment })),
      removeRentPayment: (id: string) =>
        dispatch(dalaActions.removeRentPayment(id)),

      // Dashboard
      setDashboard: (data: any) => dispatch(dalaActions.setDashboard(data)),

      // Filters
      setFilter: (key: keyof DalaState['filters'], value: string) =>
        dispatch(dalaActions.setFilter({ key, value })),
      clearFilters: () => dispatch(dalaActions.clearFilters()),

      // Pagination
      setPagination: (
        key: keyof DalaState['pagination'],
        value: { page: number; limit: number; total?: number }
      ) => dispatch(dalaActions.setPagination({ key, value })),

      // Reset
      resetStore: () => dispatch(dalaActions.resetStore()),
    }),
    [dispatch]
  );
};

// ── Selectors & Backward-Compatible Consumer Hooks ──────────────────────────

/**
 * Returns properties as a hybrid array + object with `{ data, setProperties }`
 * to support both `properties.data`, `properties.setProperties(...)`, and direct array iteration.
 */
export const useDalaProperties = () => {
  const dispatch = useAppDispatch();
  const properties = useAppSelector((state) => state.dala.properties);
  const setProperties = useCallback(
    (props: Property[]) => dispatch(dalaActions.setProperties(props)),
    [dispatch]
  );

  return useMemo(() => {
    return Object.assign([...properties], {
      data: properties,
      setProperties,
    });
  }, [properties, setProperties]);
};

export const useDalaPropertyTypes = () =>
  useAppSelector((state) => state.dala.propertyTypes);

export const useDalaBlocks = () =>
  useAppSelector((state) => state.dala.blocks);

export const useDalaFloors = () =>
  useAppSelector((state) => state.dala.floors);

/**
 * Returns units as a hybrid array + object with `{ data, setUnits }`.
 */
export const useDalaUnits = () => {
  const dispatch = useAppDispatch();
  const units = useAppSelector((state) => state.dala.units);
  const setUnits = useCallback(
    (u: Unit[]) => dispatch(dalaActions.setUnits(u)),
    [dispatch]
  );

  return useMemo(() => {
    return Object.assign([...units], {
      data: units,
      setUnits,
    });
  }, [units, setUnits]);
};

export const useDalaPhases = () =>
  useAppSelector((state) => state.dala.phases);

export const useDalaSales = () =>
  useAppSelector((state) => state.dala.sales);

export const useDalaCommissions = () =>
  useAppSelector((state) => state.dala.commissions);

export const useDalaLeases = () =>
  useAppSelector((state) => state.dala.leases);

export const useDalaRentPayments = () =>
  useAppSelector((state) => state.dala.rentPayments);

export const useDalaDashboard = () => {
  const dispatch = useAppDispatch();
  const dashboard = useAppSelector((state) => state.dala.dashboard);
  const setDashboard = useCallback(
    (data: any) => dispatch(dalaActions.setDashboard(data)),
    [dispatch]
  );
  return { data: dashboard, setDashboard };
};

export const useDalaLoading = () =>
  useAppSelector((state) => state.dala.loading);

export const useDalaFilters = () =>
  useAppSelector((state) => state.dala.filters);

export const useDalaPagination = () =>
  useAppSelector((state) => state.dala.pagination);

// Combined selectors
export const useDalaSelectedProperty = () =>
  useAppSelector((state) => state.dala.selectedProperty);

export const useDalaSelectedUnit = () =>
  useAppSelector((state) => state.dala.selectedUnit);

export const useDalaSelectedSale = () =>
  useAppSelector((state) => state.dala.selectedSale);

export const useDalaSelectedLease = () =>
  useAppSelector((state) => state.dala.selectedLease);

// Computed selectors
export const useDalaPropertyById = (id: string) => {
  const properties = useAppSelector((state) => state.dala.properties);
  return useMemo(
    () => properties.find((property) => property._id === id),
    [properties, id]
  );
};

export const useDalaUnitsByProperty = (propertyId: string) => {
  const dispatch = useAppDispatch();
  const units = useAppSelector((state) => state.dala.units);
  const filteredUnits = useMemo(
    () => units.filter((unit) => unit.property_id === propertyId),
    [units, propertyId]
  );
  const setUnits = useCallback(
    (u: Unit[]) => dispatch(dalaActions.setUnits(u)),
    [dispatch]
  );

  return useMemo(() => {
    return Object.assign([...filteredUnits], {
      data: filteredUnits,
      setUnits,
    });
  }, [filteredUnits, setUnits]);
};

export const useDalaBlocksByProperty = (propertyId: string) => {
  const dispatch = useAppDispatch();
  const blocks = useAppSelector((state) => state.dala.blocks);
  const filteredBlocks = useMemo(
    () => blocks.filter((block) => block.property_id === propertyId),
    [blocks, propertyId]
  );
  const setBlocks = useCallback(
    (b: Block[]) => dispatch(dalaActions.setBlocks(b)),
    [dispatch]
  );

  return useMemo(() => {
    return Object.assign([...filteredBlocks], {
      data: filteredBlocks,
      setBlocks,
    });
  }, [filteredBlocks, setBlocks]);
};

export const useDalaFloorsByBlock = (blockId: string) => {
  const dispatch = useAppDispatch();
  const floors = useAppSelector((state) => state.dala.floors);
  const filteredFloors = useMemo(
    () => floors.filter((floor) => floor.block_id === blockId),
    [floors, blockId]
  );
  const setFloors = useCallback(
    (f: Floor[]) => dispatch(dalaActions.setFloors(f)),
    [dispatch]
  );

  return useMemo(() => {
    return Object.assign([...filteredFloors], {
      data: filteredFloors,
      setFloors,
    });
  }, [filteredFloors, setFloors]);
};

export const useDalaUnitsByBlock = (blockId: string) => {
  const units = useAppSelector((state) => state.dala.units);
  return useMemo(
    () => units.filter((unit) => unit.block_id === blockId),
    [units, blockId]
  );
};

export const useDalaUnitsByFloor = (floorId: string) => {
  const units = useAppSelector((state) => state.dala.units);
  return useMemo(
    () => units.filter((unit) => unit.floor_id === floorId),
    [units, floorId]
  );
};

export const useDalaSalesByProperty = (propertyId: string) => {
  const sales = useAppSelector((state) => state.dala.sales);
  return useMemo(
    () => sales.filter((sale) => sale.property_id === propertyId),
    [sales, propertyId]
  );
};

export const useDalaLeasesByProperty = (propertyId: string) => {
  const leases = useAppSelector((state) => state.dala.leases);
  return useMemo(
    () => leases.filter((lease) => lease.property_id === propertyId),
    [leases, propertyId]
  );
};

export const useDalaCommissionsByAgent = (agentId: string) => {
  const commissions = useAppSelector((state) => state.dala.commissions);
  return useMemo(
    () => commissions.filter((commission) => commission.agent_id === agentId),
    [commissions, agentId]
  );
};

export const useDalaFilteredProperties = () => {
  const properties = useAppSelector((state) => state.dala.properties);
  const { propertySearch, propertyTypeFilter, propertyStatusFilter } =
    useAppSelector((state) => state.dala.filters);

  return useMemo(() => {
    return properties.filter((property) => {
      const matchesSearch =
        !propertySearch ||
        property.name.toLowerCase().includes(propertySearch.toLowerCase()) ||
        property.code.toLowerCase().includes(propertySearch.toLowerCase()) ||
        property.description?.toLowerCase().includes(propertySearch.toLowerCase());

      const matchesType =
        !propertyTypeFilter || property.property_type_id === propertyTypeFilter;
      const matchesStatus =
        !propertyStatusFilter || property.status === propertyStatusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [properties, propertySearch, propertyTypeFilter, propertyStatusFilter]);
};

export const useDalaFilteredUnits = () => {
  const units = useAppSelector((state) => state.dala.units);
  const unitStatusFilter = useAppSelector(
    (state) => state.dala.filters.unitStatusFilter
  );

  return useMemo(() => {
    return units.filter((unit) => {
      const matchesStatus = !unitStatusFilter || unit.status === unitStatusFilter;
      return matchesStatus;
    });
  }, [units, unitStatusFilter]);
};

export const useDalaFilteredSales = () => {
  const sales = useAppSelector((state) => state.dala.sales);
  const saleStatusFilter = useAppSelector(
    (state) => state.dala.filters.saleStatusFilter
  );

  return useMemo(() => {
    return sales.filter((sale) => {
      const matchesStatus = !saleStatusFilter || sale.status === saleStatusFilter;
      return matchesStatus;
    });
  }, [sales, saleStatusFilter]);
};
