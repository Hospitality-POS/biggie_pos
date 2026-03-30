import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getAllTables, createAutoSlot } from '@services/tables';
import { useAppDispatch, useAppSelector } from 'src/store';
import { getCart, deleteAllCartItems } from '../features/Cart/CartActions';
import { clearcart } from '../features/Cart/CartSlice';
import { message } from 'antd';
import axiosInstance from '../services/request';
import { BASE_URL } from '@utils/config';

interface TableSlot {
    _id: string;
    name: string;
    status: string;
    isOccupied?: boolean;
    locatedAt?: any;
}

interface Location {
    _id: string;
    name: string;
    tables: TableSlot[];
}

interface RetailQueueContextType {
    activeTable: TableSlot | null;
    activeLocation: Location | null;
    allLocations: Location[];
    availableTables: TableSlot[];
    occupiedTables: TableSlot[];
    isLoadingSlots: boolean;
    refreshSlots: () => Promise<void>;
    setActiveTable: (table: TableSlot) => void;
    assignNextAvailableTable: () => TableSlot | null;
    queueOrderAndNext: () => Promise<{ success: boolean; nextTable: TableSlot | null }>;
    openNewOrder: () => Promise<void>;
    removeActiveSlot: () => Promise<void>;
}

const defaultValue: RetailQueueContextType = {
    activeTable: null,
    activeLocation: null,
    allLocations: [],
    availableTables: [],
    occupiedTables: [],
    isLoadingSlots: false,
    refreshSlots: async () => { },
    setActiveTable: () => { },
    assignNextAvailableTable: () => null,
    queueOrderAndNext: async () => ({ success: false, nextTable: null }),
    openNewOrder: async () => { },
    removeActiveSlot: async () => { },
};

const RetailQueueContext = createContext<RetailQueueContextType>(defaultValue);

// ── Read posMode from localStorage ────────────────────────────────────────────
// "service" / "restaurant" → physical tables, never auto-create slots
// "retail"                 → auto-create slots as needed
// "hospital"               → physical wards/beds, never auto-create slots
type StoredMode = 'service' | 'restaurant' | 'retail' | 'hospital';

const getStoredMode = (): StoredMode =>
    (localStorage.getItem('posMode') ?? 'service') as StoredMode;

const isAutoSlotMode = (): boolean => getStoredMode() === 'retail';

export const RetailQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [allLocations, setAllLocations] = useState<Location[]>([]);
    const [activeTable, setActiveTableState] = useState<TableSlot | null>(null);
    const [activeLocation, setActiveLocation] = useState<Location | null>(null);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const lastShopId = useRef<string | null>(null);
    const activeTableRef = useRef<TableSlot | null>(null);
    const isAutoCreating = useRef(false);

    const dispatch = useAppDispatch();
    const cartDetails = useAppSelector((state) => state.cart.cartDetails);

    const loadSlots = useCallback(async () => {
        const shopId = localStorage.getItem('shopId');
        if (!shopId || shopId === 'undefined' || shopId === 'null' || shopId.trim() === '') return;

        setIsLoadingSlots(true);
        try {
            const tables: TableSlot[] = await getAllTables({});

            if (!tables?.length) {
                if (!isAutoSlotMode()) {
                    // Service / hospital: physical tables managed manually — skip auto-create
                    const mode = getStoredMode();
                    console.info(`[RetailQueueContext] No tables found — ${mode} mode, skipping auto-create.`);
                    setAllLocations([]);
                    setIsLoadingSlots(false);
                    return;
                }

                if (isAutoCreating.current) return;
                isAutoCreating.current = true;
                try {
                    message.loading({ content: 'Setting up your first slot...', key: 'auto-init-slot' });
                    const result = await createAutoSlot();
                    const newTable: TableSlot = result.data;
                    message.success({ content: `Slot "${newTable.name}" ready`, key: 'auto-init-slot' });

                    const loc = newTable.locatedAt;
                    const locId = loc && typeof loc === 'object' ? loc._id : (loc || 'default');
                    const locName = loc && typeof loc === 'object'
                        ? (loc.name || loc.locationName || 'Default')
                        : 'Default';

                    const syntheticLocation: Location = { _id: locId, name: locName, tables: [newTable] };
                    setAllLocations([syntheticLocation]);
                    setActiveTableState(newTable);
                    activeTableRef.current = newTable;
                    setActiveLocation(syntheticLocation);
                    dispatch(clearcart());
                    dispatch(getCart(newTable._id));
                } catch (err) {
                    message.error({ content: 'Failed to create initial slot', key: 'auto-init-slot' });
                } finally {
                    isAutoCreating.current = false;
                }
                return;
            }

            // Group by location
            const locationMap = new Map<string, Location>();
            for (const table of tables) {
                const loc = table.locatedAt;
                if (!loc) continue;
                const locId = typeof loc === 'object' ? loc._id : loc;
                const locName = typeof loc === 'object'
                    ? (loc.name || loc.locationName || 'Location')
                    : 'Location';
                if (!locationMap.has(locId)) {
                    locationMap.set(locId, { _id: locId, name: locName, tables: [] });
                }
                locationMap.get(locId)!.tables.push(table);
            }

            const populated = Array.from(locationMap.values());
            setAllLocations(populated);

            if (!activeTableRef.current) {
                for (const loc of populated) {
                    if (loc.tables?.length > 0) {
                        const firstTable = loc.tables[0];
                        setActiveTableState(firstTable);
                        activeTableRef.current = firstTable;
                        setActiveLocation(loc);
                        dispatch(clearcart());
                        dispatch(getCart(firstTable._id));
                        break;
                    }
                }
            }
        } catch (err) {
            console.error('RetailQueueContext: loadSlots failed:', err);
        } finally {
            setIsLoadingSlots(false);
        }
    }, [dispatch]);

    useEffect(() => {
        const interval = setInterval(() => {
            const shopId = localStorage.getItem('shopId');
            if (
                shopId &&
                shopId !== 'undefined' &&
                shopId !== 'null' &&
                shopId.trim() !== '' &&
                shopId !== lastShopId.current
            ) {
                lastShopId.current = shopId;
                setAllLocations([]);
                setActiveTableState(null);
                setActiveLocation(null);
                activeTableRef.current = null;
                loadSlots();
            }
        }, 300);
        return () => clearInterval(interval);
    }, [loadSlots]);

    const setActiveTable = useCallback((table: TableSlot) => {
        const parentLocation = allLocations.find(loc =>
            loc.tables?.some(t => t._id === table._id)
        );
        setActiveTableState(table);
        activeTableRef.current = table;
        setActiveLocation(parentLocation || null);
        dispatch(clearcart());
        dispatch(getCart(table._id));
    }, [allLocations, dispatch]);

    const allTables = allLocations.flatMap(loc => loc.tables || []);

    const availableTables = allLocations.flatMap(loc =>
        (loc.tables || []).filter(t => !t.isOccupied && t.status !== 'occupied')
    );

    const occupiedTables = allLocations.flatMap(loc =>
        (loc.tables || []).filter(t => t.isOccupied || t.status === 'occupied')
    );

    const openNewOrder = useCallback(async () => {
        const next = allTables.find(
            t => t._id !== activeTableRef.current?._id && !t.isOccupied
        );

        if (next) {
            dispatch(clearcart());
            setActiveTable(next);
            message.success(`Switched to ${next.name}`);
            return;
        }

        setIsLoadingSlots(true);
        try {
            const allDbTables: TableSlot[] = await getAllTables({});
            const queueIds = new Set(allTables.map(t => t._id));

            const reusable = allDbTables.find(
                t => !queueIds.has(t._id) && !t.isOccupied
            );

            if (reusable) {
                const loc = reusable.locatedAt;
                const locId = typeof loc === 'object' ? loc._id : loc;
                const locName = typeof loc === 'object'
                    ? (loc.name || loc.locationName || 'Location')
                    : 'Location';

                setAllLocations(prev => {
                    const existing = prev.find(l => l._id === locId);
                    if (existing) {
                        return prev.map(l =>
                            l._id === locId
                                ? { ...l, tables: [...l.tables, reusable] }
                                : l
                        );
                    }
                    return [...prev, { _id: locId, name: locName, tables: [reusable] }];
                });

                dispatch(clearcart());
                setTimeout(() => setActiveTable(reusable), 50);
                message.success(`Switched to ${reusable.name}`);
                return;
            }

            if (!isAutoSlotMode()) {
                const mode = getStoredMode();
                const modeLabel = mode === 'hospital' ? 'ward/bed' : 'table';
                message.warning(`All ${modeLabel}s are currently occupied. Please free one up first.`);
                return;
            }

            message.loading({ content: 'Creating new slot...', key: 'auto-slot' });
            const result = await createAutoSlot();
            const newTable: TableSlot = result.data;
            message.success({ content: `"${newTable.name}" created`, key: 'auto-slot' });

            const loc = newTable.locatedAt;
            const locId = typeof loc === 'object' ? loc._id : (loc || 'default');
            const locName = typeof loc === 'object'
                ? (loc.name || loc.locationName || 'Location')
                : 'Location';

            setAllLocations(prev => {
                const existing = prev.find(l => l._id === locId);
                if (existing) {
                    return prev.map(l =>
                        l._id === locId
                            ? { ...l, tables: [...l.tables, newTable] }
                            : l
                    );
                }
                return [...prev, { _id: locId, name: locName, tables: [newTable] }];
            });

            dispatch(clearcart());
            setTimeout(() => setActiveTable(newTable), 50);

        } catch (err) {
            message.error({ content: 'Failed to open new order', key: 'auto-slot' });
            console.error('openNewOrder failed:', err);
        } finally {
            setIsLoadingSlots(false);
        }
    }, [allTables, setActiveTable, dispatch]);

    const removeActiveSlot = useCallback(async () => {
        if (!activeTableRef.current) return;
        const tableToRemove = activeTableRef.current;
        const cartId = cartDetails?._id;

        try {
            message.loading({ content: `Clearing ${tableToRemove.name}...`, key: 'remove-slot' });

            if (cartId) {
                await dispatch(deleteAllCartItems(cartId));
            }

            await axiosInstance.put(`${BASE_URL}/tables/${tableToRemove._id}`, {
                isOccupied: false,
            });

            const updatedLocations = allLocations
                .map(loc => ({
                    ...loc,
                    tables: loc.tables.filter(t => t._id !== tableToRemove._id),
                }))
                .filter(loc => loc.tables.length > 0);

            setAllLocations(updatedLocations);
            dispatch(clearcart());
            activeTableRef.current = null;
            setActiveTableState(null);
            setActiveLocation(null);

            let switched = false;
            for (const loc of updatedLocations) {
                if (loc.tables?.length > 0) {
                    const next = loc.tables[0];
                    setActiveTableState(next);
                    activeTableRef.current = next;
                    setActiveLocation(loc);
                    dispatch(getCart(next._id));
                    switched = true;
                    break;
                }
            }

            if (!switched) {
                await loadSlots();
            }

            message.success({ content: `${tableToRemove.name} cleared`, key: 'remove-slot' });
        } catch (err) {
            message.error({ content: 'Failed to clear slot', key: 'remove-slot' });
            console.error('removeActiveSlot failed:', err);
        }
    }, [dispatch, allLocations, cartDetails, loadSlots]);

    const assignNextAvailableTable = useCallback((): TableSlot | null => {
        const next = availableTables.find(t => t._id !== activeTableRef.current?._id)
            || availableTables[0]
            || null;
        if (next) {
            dispatch(clearcart());
            setActiveTable(next);
        }
        return next;
    }, [availableTables, setActiveTable, dispatch]);

    const queueOrderAndNext = useCallback(async () => {
        await loadSlots();
        const next = assignNextAvailableTable();
        return { success: true, nextTable: next };
    }, [loadSlots, assignNextAvailableTable]);

    return (
        <RetailQueueContext.Provider value={{
            activeTable,
            activeLocation,
            allLocations,
            availableTables,
            occupiedTables,
            isLoadingSlots,
            refreshSlots: loadSlots,
            setActiveTable,
            assignNextAvailableTable,
            queueOrderAndNext,
            openNewOrder,
            removeActiveSlot,
        }}>
            {children}
        </RetailQueueContext.Provider>
    );
};

export const useRetailQueue = () => useContext(RetailQueueContext);