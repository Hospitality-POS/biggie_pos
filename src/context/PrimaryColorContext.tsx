import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getPrimaryColor } from "../utils/getPrimaryColor";

interface PrimaryColorContextType {
    primaryColor: string;
    refreshPrimaryColor: () => void;
}

const PrimaryColorContext = createContext<PrimaryColorContextType>({
    primaryColor: getPrimaryColor(),
    refreshPrimaryColor: () => { }
});

export const PrimaryColorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [primaryColor, setPrimaryColor] = useState(() => getPrimaryColor());

    const refreshPrimaryColor = useCallback(() => {
        const newColor = getPrimaryColor();
        setPrimaryColor(newColor);
    }, []);

    // Listen for localStorage changes (when user switches tabs/windows)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'tenant') {
                refreshPrimaryColor();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [refreshPrimaryColor]);

    // Listen for custom events (for same-tab updates)
    useEffect(() => {
        const handleTenantUpdate = () => {
            refreshPrimaryColor();
        };

        window.addEventListener('tenantUpdated', handleTenantUpdate);
        return () => window.removeEventListener('tenantUpdated', handleTenantUpdate);
    }, [refreshPrimaryColor]);

    const contextValue = {
        primaryColor,
        refreshPrimaryColor
    };

    return (
        <PrimaryColorContext.Provider value={contextValue}>
            {children}
        </PrimaryColorContext.Provider>
    );
};

export const usePrimaryColor = () => {
    const context = useContext(PrimaryColorContext);
    return context.primaryColor;
};

export const useRefreshPrimaryColor = () => {
    const context = useContext(PrimaryColorContext);
    return context.refreshPrimaryColor;
};