import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { fetchShop } from '@services/shops';

export type POSMode = 'restaurant' | 'retail';

interface POSModeContextType {
    posMode: POSMode;
    setPosMode: (mode: POSMode) => Promise<void>;
    isRetailMode: boolean;
    isModeLoading: boolean;
}

const POSModeContext = createContext<POSModeContextType>({
    posMode: 'restaurant',
    setPosMode: async () => { },
    isRetailMode: false,
    isModeLoading: true,
});

export const POSModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [posMode, setPOSModeState] = useState<POSMode>(
        () => (localStorage.getItem('posMode') as POSMode) || 'restaurant'
    );
    const [isModeLoading, setIsModeLoading] = useState(true);
    const lastShopId = useRef<string | null>(null);

    const fetchAndSetMode = (shopId: string) => {
        setIsModeLoading(true);
        fetchShop(shopId)
            .then(shop => {
                const mode: POSMode = shop?.pos_mode || 'restaurant';
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
        // Poll for shopId — handles initial load and shop switches
        const interval = setInterval(() => {
            const shopId = localStorage.getItem('shopId');
            if (
                shopId &&
                shopId !== 'undefined' &&
                shopId !== 'null' &&
                shopId.trim() !== '' &&
                shopId !== lastShopId.current  // ← only re-fetch if shop actually changed
            ) {
                lastShopId.current = shopId;
                fetchAndSetMode(shopId);
            }
        }, 300);

        // Give up after 15s if no shopId ever appears
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
            isModeLoading,
        }}>
            {children}
        </POSModeContext.Provider>
    );
};

export const usePOSMode = () => useContext(POSModeContext);