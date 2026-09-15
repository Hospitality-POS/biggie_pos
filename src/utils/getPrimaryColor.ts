// getPrimaryColor.ts
export const getPrimaryColor = (): string => {
    try {
        const storedTenant = localStorage.getItem("tenant");
        const tenant = storedTenant ? JSON.parse(storedTenant) : null;

        return (
            tenant?.color_scheme?.primary ||
            tenant?.primary_color ||
            tenant?.theme?.primary ||
            "#0E388A"
        );
    } catch (error) {
        console.error("Error reading tenant from localStorage:", error);
        return "#0E388A";
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
        const clean = (hex || "#0E388A").replace("#", "").trim();
        const fullHex = clean.length === 3
            ? clean.split("").map((c) => c + c).join("")
            : clean;
        const num = parseInt(fullHex, 16);
        if (isNaN(num)) return [14, 56, 138];
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    } catch {
        return [14, 56, 138];
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
    secondary: "#14EF4A",
    accent: "#14EF4A",
    navy: "#1F2B5D",
    blue: "#0E388A",
    green: "#14EF4A",
    orange: "#f59e0b",
    red: "#ef4444",
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