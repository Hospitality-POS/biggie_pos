/**
 * dalaStore.ts (Deprecated Redux Facade)
 *
 * All state management for Dala has been migrated to React Query.
 * This file maintains 100% backward compatibility by forwarding to
 * @dala/hooks/useDalaQueries without requiring Redux store allocation.
 */

export * from '../modules/dala/hooks/useDalaQueries';
export type { Property, PropertyType, Block, Floor, Unit, Phase, PropertySale, Commission, Lease, RentPayment } from '../modules/dala/types';
