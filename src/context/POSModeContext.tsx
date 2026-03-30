import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { fetchShop } from '@services/shops';

export type POSMode = 'restaurant' | 'retail' | 'hospital';

interface POSModeContextType {
    posMode: POSMode;
    setPosMode: (mode: POSMode) => Promise<void>;
    isRetailMode: boolean;
    isHospitalMode: boolean;
    isServiceMode: boolean;
    isModeLoading: boolean;
}

const POSModeContext = createContext<POSModeContextType>({
    posMode: 'restaurant',
    setPosMode: async () => { },
    isRetailMode: false,
    isHospitalMode: false,
    isServiceMode: false,
    isModeLoading: true,
});

// Normalise legacy "restaurant" → "service" so old DB records still work
const normaliseMode = (raw: string | null): POSMode => {
    if (raw === 'retail') return 'retail';
    if (raw === 'hospital') return 'hospital';
    if (raw === 'service') return 'service';
    return 'service'; // "restaurant" and anything else → service
};

export const POSModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [posMode, setPOSModeState] = useState<POSMode>(
        () => normaliseMode(localStorage.getItem('posMode'))
    );
    const [isModeLoading, setIsModeLoading] = useState(true);
    const lastShopId = useRef<string | null>(null);

    const fetchAndSetMode = (shopId: string) => {
        setIsModeLoading(true);
        fetchShop(shopId)
            .then(shop => {
                const mode = normaliseMode(shop?.pos_mode);
                console.log('POSModeContext: mode =', mode, 'shopId =', shopId);
                setPOSModeState(mode);
                localStorage.setItem('posMode', mode);
            })
            .catch(err => {
                console.error('POSModeContext: fetch failed:', err);
            })
            .finally(() => {
                setIsModeLoading(false);
            });
    };

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
                fetchAndSetMode(shopId);
            }
        }, 300);

        const timeout = setTimeout(() => {
            if (!lastShopId.current) {
                console.warn('POSModeContext: no shopId after 15s, defaulting to service');
                setIsModeLoading(false);
            }
        }, 15000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, []);

    const setPosMode = async (mode: POSMode) => {
        setPOSModeState(mode);
        localStorage.setItem('posMode', mode);
    };

    return (
        <POSModeContext.Provider value={{
            posMode,
            setPosMode,
            isRetailMode: posMode === 'retail',
            isHospitalMode: posMode === 'hospital',
            isServiceMode: posMode === 'service' || posMode === 'restaurant',
            isModeLoading,
        }}>
            {children}
        </POSModeContext.Provider>
    );
};

export const usePOSMode = () => useContext(POSModeContext);