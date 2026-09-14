// getPrimaryColor.ts
export const getPrimaryColor = (): string => {
    try {
        const storedTenant = localStorage.getItem("tenant");
        const tenant = storedTenant ? JSON.parse(storedTenant) : null;

        return (
            tenant?.color_scheme?.primary ||
            tenant?.primary_color ||
            tenant?.theme?.primary ||
            "#6c1c2c"
        );
    } catch (error) {
        console.error("Error reading tenant from localStorage:", error);
        return "#6c1c2c";
    }
};

// Helper function to trigger updates across the app
export const updateTenantInStorage = (tenantData: any) => {
    try {
        localStorage.setItem("tenant", JSON.stringify(tenantData));

        // Dispatch custom event to notify all components
        window.dispatchEvent(new CustomEvent("tenantUpdated", { detail: tenantData }));
    } catch (error) {
        console.error("Error updating tenant in localStorage:", error);
    }
};

/**
 * Convert a hex color code to an [r, g, b] tuple.
 * Useful for jsPDF and PDF generation libraries.
 */
export const hexToRgb = (hex: string): [number, number, number] => {
    try {
        const clean = (hex || "#6c1c2c").replace("#", "").trim();
        const fullHex = clean.length === 3
            ? clean.split("").map((c) => c + c).join("")
            : clean;
        const num = parseInt(fullHex, 16);
        if (isNaN(num)) return [108, 28, 44];
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    } catch {
        return [108, 28, 44];
    }
};

/**
 * Dynamic theme palette where `primary` and `primaryLight` are getters
 * that automatically evaluate the current tenant's primary color at runtime.
 */
export const getThemePalette = (overridePrimary?: string) => ({
    get primary() {
        return overridePrimary || getPrimaryColor();
    },
    get primaryLight() {
        const p = overridePrimary || getPrimaryColor();
        return `${p}18`;
    },
    green: "#10b981",
    orange: "#f59e0b",
    red: "#ef4444",
    blue: "#3b82f6",
    indigo: "#6366f1",
    purple: "#8b5cf6",
    teal: "#0d9488",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
    white: "#ffffff",
});

export const THEME_C = getThemePalette();