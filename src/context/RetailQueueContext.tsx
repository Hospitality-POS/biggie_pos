import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getAllTables, createAutoSlot } from '@services/tables';
import { useAppDispatch } from 'src/store';
import { getCart } from '../features/Cart/CartActions';
import { clearcart } from '../features/Cart/CartSlice';
import { message } from 'antd';

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

export const RetailQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [allLocations, setAllLocations] = useState<Location[]>([]);
    const [activeTable, setActiveTableState] = useState<TableSlot | null>(null);
    const [activeLocation, setActiveLocation] = useState<Location | null>(null);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const lastShopId = useRef<string | null>(null);
    const activeTableRef = useRef<TableSlot | null>(null);
    const isAutoCreating = useRef(false);

    const dispatch = useAppDispatch();

    const loadSlots = useCallback(async () => {
        const shopId = localStorage.getItem('shopId');
        if (!shopId || shopId === 'undefined' || shopId === 'null' || shopId.trim() === '') {
            return;
        }

        setIsLoadingSlots(true);
        try {
            const tables: TableSlot[] = await getAllTables({});

            // ── Auto-create a slot if none exist ──────────────────────────
            if (!tables?.length) {
                if (isAutoCreating.current) return;
                isAutoCreating.current = true;
                try {
                    message.loading({ content: 'Setting up your first slot...', key: 'auto-init-slot' });
                    const result = await createAutoSlot();
                    const newTable: TableSlot = result.data;
                    message.success({ content: `Slot "${newTable.name}" ready`, key: 'auto-init-slot' });

                    // Build a synthetic location from the new table
                    const loc = newTable.locatedAt;
                    const locId = loc && typeof loc === 'object' ? loc._id : (loc || 'default');
                    const locName = loc && typeof loc === 'object'
                        ? (loc.name || loc.locationName || 'Default')
                        : 'Default';

                    const syntheticLocation: Location = {
                        _id: locId,
                        name: locName,
                        tables: [newTable],
                    };

                    setAllLocations([syntheticLocation]);
                    setActiveTableState(newTable);
                    activeTableRef.current = newTable;
                    setActiveLocation(syntheticLocation);
                    dispatch(clearcart());
                    dispatch(getCart(newTable._id));
                } catch (err) {
                    message.error({ content: 'Failed to create initial slot', key: 'auto-init-slot' });
                    console.error('RetailQueueContext: auto-create initial slot failed:', err);
                } finally {
                    isAutoCreating.current = false;
                }
                return;
            }

            // ── Normal path: tables exist ─────────────────────────────────
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

            // Auto-select first table only on initial load
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

    // Watch for shopId changes
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
            message.loading({ content: 'Creating new slot...', key: 'auto-slot' });
            const result = await createAutoSlot();
            const newTable: TableSlot = result.data;
            message.success({ content: `"${newTable.name}" created`, key: 'auto-slot' });
            await loadSlots();
            dispatch(clearcart());
            setActiveTable(newTable);
        } catch (err) {
            message.error({ content: 'Failed to create new slot', key: 'auto-slot' });
            console.error('openNewOrder: auto-create failed:', err);
        } finally {
            setIsLoadingSlots(false);
        }
    }, [allTables, setActiveTable, loadSlots, dispatch]);

    // Only clears the cart — does NOT delete the table/slot
    const removeActiveSlot = useCallback(async () => {
        if (!activeTableRef.current) return;
        const tableToRemove = activeTableRef.current;

        try {
            message.loading({ content: `Clearing ${tableToRemove.name}...`, key: 'remove-slot' });
            dispatch(clearcart());
            message.success({ content: `${tableToRemove.name} cleared`, key: 'remove-slot' });
        } catch (err) {
            message.error({ content: 'Failed to clear slot', key: 'remove-slot' });
            console.error('removeActiveSlot failed:', err);
        }
    }, [dispatch]);

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