import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { fetchShop } from '@services/shops';

export type POSMode = 'restaurant' | 'retail' | 'hospital' | 'hotel';

interface POSModeContextType {
    posMode: POSMode;
    setPosMode: (mode: POSMode) => Promise<void>;
    isRetailMode: boolean;
    isHospitalMode: boolean;
    isHotelMode: boolean;
    isServiceMode: boolean;
    isModeLoading: boolean;
}

const POSModeContext = createContext<POSModeContextType>({
    posMode: 'restaurant',
    setPosMode: async () => { },
    isRetailMode: false,
    isHospitalMode: false,
    isHotelMode: false,
    isServiceMode: false,
    isModeLoading: true,
});

// Normalise legacy modes to current enum values
const normaliseMode = (raw: string | null): POSMode => {
    if (raw === 'retail') return 'retail';
    if (raw === 'hospital') return 'hospital';
    if (raw === 'hotel') return 'hotel';
    if (raw === 'restaurant') return 'restaurant';
    if (raw === 'service') return 'restaurant'; // Legacy "service" → "restaurant"
    return 'restaurant'; // Default to restaurant
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
        const checkShopId = () => {
            const shopId = localStorage.getItem('shopId');
            if (
                shopId &&
                shopId !== 'undefined' &&
                shopId !== 'null' &&
                shopId.trim() !== ''
            ) {
                // Always fetch on mount or when shop changes
                if (shopId !== lastShopId.current) {
                    console.log('POSModeContext: Shop changed from', lastShopId.current, 'to', shopId);
                    lastShopId.current = shopId;
                    // Clear localStorage posMode when shop changes to force refetch from shop
                    localStorage.removeItem('posMode');
                    fetchAndSetMode(shopId);
                }
            }
        };

        // Initial check - force fetch even if shopId is already set
        const initialShopId = localStorage.getItem('shopId');
        if (initialShopId && initialShopId !== 'undefined' && initialShopId !== 'null' && initialShopId.trim() !== '') {
            console.log('POSModeContext: Initial mount with shopId', initialShopId, '- forcing fetch from database');
            lastShopId.current = initialShopId;
            localStorage.removeItem('posMode');
            fetchAndSetMode(initialShopId);
        }

        // Check periodically for shop changes
        const interval = setInterval(checkShopId, 500);

        const timeout = setTimeout(() => {
            if (!lastShopId.current) {
                console.warn('POSModeContext: no shopId after 15s, defaulting to restaurant');
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
            isHotelMode: posMode === 'hotel',
            isServiceMode: posMode === 'restaurant',
            isModeLoading,
        }}>
            {children}
        </POSModeContext.Provider>
    );
};

export const usePOSMode = () => useContext(POSModeContext);