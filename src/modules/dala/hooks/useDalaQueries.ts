import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { message } from 'antd';
import {
  fetchProperties,
  fetchProperty,
  fetchUnits,
  fetchPropertyTypes,
  fetchPropertySales,
  fetchLeases,
  fetchRentPayments,
  fetchDalaDashboard,
  createProperty,
  updateProperty,
  deleteProperty,
  Property,
  Unit,
  PropertySale,
  Lease,
  RentPayment,
  PropertyType,
} from '../services/dalaApi';

// ── Canonical React Query Hooks ─────────────────────────────────────────────

export function useDalaPropertiesQuery(populate = true) {
  return useQuery({
    queryKey: ['dala', 'properties', { populate }],
    queryFn: async () => {
      const res = await fetchProperties(populate);
      return (res?.data || res || []) as Property[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useDalaPropertyQuery(id?: string) {
  return useQuery({
    queryKey: ['dala', 'property', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetchProperty(id);
      return (res?.data || res) as Property;
    },
    enabled: !!id,
  });
}

export function useDalaUnitsQuery(params?: { property_id?: string; status?: string }) {
  return useQuery({
    queryKey: ['dala', 'units', params],
    queryFn: async () => {
      const res = await fetchUnits(params);
      return (res?.data || res || []) as Unit[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useDalaPropertyTypesQuery() {
  return useQuery({
    queryKey: ['dala', 'property-types'],
    queryFn: async () => {
      const res = await fetchPropertyTypes();
      return (res?.data || res || []) as PropertyType[];
    },
    staleTime: 1000 * 60 * 15,
  });
}

export function useDalaSalesQuery(params?: any) {
  return useQuery({
    queryKey: ['dala', 'sales', params],
    queryFn: async () => {
      const res = await fetchPropertySales(params);
      return (res?.data || res || []) as PropertySale[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useDalaLeasesQuery(params?: any) {
  return useQuery({
    queryKey: ['dala', 'leases', params],
    queryFn: async () => {
      const res = await fetchLeases(params);
      return (res?.data || res || []) as Lease[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useDalaRentPaymentsQuery(params?: any) {
  return useQuery({
    queryKey: ['dala', 'rent-payments', params],
    queryFn: async () => {
      const res = await fetchRentPayments(params);
      return (res?.data || res || []) as RentPayment[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useDalaDashboardQuery(params?: any) {
  return useQuery({
    queryKey: ['dala', 'dashboard', params],
    queryFn: async () => {
      const res = await fetchDalaDashboard(params);
      return res?.data || res;
    },
    staleTime: 1000 * 60 * 2,
  });
}

// ── Mutations ───────────────────────────────────────────────────────────────

export function useCreatePropertyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createProperty(data),
    onSuccess: () => {
      message.success('Property created successfully');
      queryClient.invalidateQueries({ queryKey: ['dala', 'properties'] });
      queryClient.invalidateQueries({ queryKey: ['dala', 'dashboard'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to create property');
    },
  });
}

export function useUpdatePropertyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProperty(id, data),
    onSuccess: (_, { id }) => {
      message.success('Property updated successfully');
      queryClient.invalidateQueries({ queryKey: ['dala', 'properties'] });
      queryClient.invalidateQueries({ queryKey: ['dala', 'property', id] });
      queryClient.invalidateQueries({ queryKey: ['dala', 'dashboard'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to update property');
    },
  });
}

export function useDeletePropertyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProperty(id),
    onSuccess: () => {
      message.success('Property deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['dala', 'properties'] });
      queryClient.invalidateQueries({ queryKey: ['dala', 'dashboard'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to delete property');
    },
  });
}

// ── Backward-Compatible Facades (Replacing dalaStore & dalaSlice) ─────────────

export const useDalaProperties = () => {
  const { data: properties = [], refetch } = useDalaPropertiesQuery();
  return useMemo(() => {
    return Object.assign([...properties], {
      data: properties,
      setProperties: () => refetch(),
    });
  }, [properties, refetch]);
};

export const useDalaUnits = (propertyId?: string) => {
  const { data: units = [], refetch } = useDalaUnitsQuery(propertyId ? { property_id: propertyId } : undefined);
  return useMemo(() => {
    return Object.assign([...units], {
      data: units,
      setUnits: () => refetch(),
    });
  }, [units, refetch]);
};

export const useDalaSales = () => {
  const { data: sales = [] } = useDalaSalesQuery();
  return sales;
};

export const useDalaLeases = () => {
  const { data: leases = [] } = useDalaLeasesQuery();
  return leases;
};

export const useDalaRentPayments = () => {
  const { data: rentPayments = [] } = useDalaRentPaymentsQuery();
  return rentPayments;
};

export const useDalaPropertyTypes = () => {
  const { data: propertyTypes = [] } = useDalaPropertyTypesQuery();
  return propertyTypes;
};

export const useDalaDashboard = () => {
  const { data: dashboard, refetch } = useDalaDashboardQuery();
  return { data: dashboard, setDashboard: () => refetch() };
};

export const useDalaSelectedProperty = () => {
  const [selected, setSelected] = useState<Property | null>(null);
  return selected;
};

export const useDalaUnitsByProperty = (propertyId?: string) => {
  const { data: units = [] } = useDalaUnitsQuery(propertyId ? { property_id: propertyId } : undefined);
  return units;
};

export const useDalaBlocksByProperty = (_propertyId?: string) => {
  return [];
};

export const useDalaActions = () => {
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      setLoading: () => {},
      setSelectedProperty: () => {},
      setSelectedUnit: () => {},
      setSelectedSale: () => {},
      setSelectedLease: () => {},
      setFilter: () => {},
      clearFilters: () => {},
      setPagination: () => {},
      resetStore: () => {
        queryClient.invalidateQueries({ queryKey: ['dala'] });
      },
    }),
    [queryClient]
  );
};
