export const getPrimaryColor = (): string => {
    try {
        const storedTenant = localStorage.getItem("tenant");
        const tenant = storedTenant ? JSON.parse(storedTenant) : null;

        return tenant?.color_scheme?.primary;
    } catch (error) {
        console.error("Error reading tenant from localStorage:", error);
        return "#6c1c2c";
    }
};
