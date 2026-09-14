import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getPrimaryColor, getThemePalette, THEME_C } from "../utils/getPrimaryColor";

interface PrimaryColorContextType {
    primaryColor: string;
    refreshPrimaryColor: () => void;
}

const initialColor = getPrimaryColor();
if (typeof document !== "undefined" && initialColor) {
    document.documentElement.style.setProperty("--primary-color", initialColor);
    document.documentElement.style.setProperty("--primary-color-light", `${initialColor}18`);
}

const PrimaryColorContext = createContext<PrimaryColorContextType>({
    primaryColor: initialColor,
    refreshPrimaryColor: () => { /* no-op default */ }
});

export const PrimaryColorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [primaryColor, setPrimaryColor] = useState(() => getPrimaryColor());

    const refreshPrimaryColor = useCallback(() => {
        const newColor = getPrimaryColor();
        setPrimaryColor(newColor);
    }, []);

    // Synchronize CSS custom properties on :root
    useEffect(() => {
        if (primaryColor && typeof document !== "undefined") {
            document.documentElement.style.setProperty("--primary-color", primaryColor);
            document.documentElement.style.setProperty("--primary-color-light", `${primaryColor}18`);
        }
    }, [primaryColor]);

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

export const usePrimaryColor = (): string => {
    const context = useContext(PrimaryColorContext);
    return context.primaryColor;
};

export const useRefreshPrimaryColor = () => {
    const context = useContext(PrimaryColorContext);
    return context.refreshPrimaryColor;
};

export const useThemePalette = () => {
    const primaryColor = usePrimaryColor();
    return useMemo(() => getThemePalette(primaryColor), [primaryColor]);
};

export { THEME_C, getThemePalette };