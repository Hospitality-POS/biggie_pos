import React, { createContext, useContext, useMemo } from "react";
import { getPrimaryColor } from "../utils/getPrimaryColor";

const PrimaryColorContext = createContext<string>(getPrimaryColor());

export const PrimaryColorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const primaryColor = useMemo(() => getPrimaryColor(), []);
    return (
        <PrimaryColorContext.Provider value={primaryColor}>
            {children}
        </PrimaryColorContext.Provider>
    );
};

export const usePrimaryColor = () => useContext(PrimaryColorContext);