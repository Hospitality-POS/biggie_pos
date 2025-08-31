// getPrimaryColor.ts - Keep your existing function
export const getPrimaryColor = (): string => {
    try {
        const storedTenant = localStorage.getItem("tenant");
        const tenant = storedTenant ? JSON.parse(storedTenant) : null;

        return tenant?.color_scheme?.primary || "#6c1c2c";
    } catch (error) {
        console.error("Error reading tenant from localStorage:", error);
        return "#6c1c2c";
    }
};

// Add this helper function to trigger updates
export const updateTenantInStorage = (tenantData: any) => {
    try {
        localStorage.setItem("tenant", JSON.stringify(tenantData));

        // Dispatch custom event to notify all components
        window.dispatchEvent(new CustomEvent('tenantUpdated'));
    } catch (error) {
        console.error("Error updating tenant in localStorage:", error);
    }
};