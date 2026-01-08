import { message } from "antd";

/**
 * Get valid shop_id from localStorage
 * Returns null if invalid
 */
export const getValidShopId = (): string | null => {
    const shopId = localStorage.getItem("shopId");

    if (!shopId || shopId === "undefined" || shopId === "null" || shopId.trim() === "") {
        console.warn("❌ Invalid shop_id detected:", shopId);
        return null;
    }

    return shopId;
};

/**
 * Require shop_id or redirect to login
 * Throws error if shop_id is invalid
 */
export const requireShopId = (): string => {
    const shopId = getValidShopId();

    if (!shopId) {
        message.error("Shop ID not found. Please log in again.");
        // Optionally redirect to login
        setTimeout(() => {
            window.location.href = "/login";
        }, 1500);
        throw new Error("Shop ID required");
    }

    return shopId;
};

/**
 * Validate and clean shop_id on login
 */
export const setShopId = (shopId: any): boolean => {
    if (!shopId || shopId === "undefined" || shopId === "null" || String(shopId).trim() === "") {
        console.error("❌ Attempted to set invalid shop_id:", shopId);
        localStorage.removeItem("shopId");
        return false;
    }

    const cleanShopId = String(shopId).trim();
    localStorage.setItem("shopId", cleanShopId);
    console.log("✅ Shop ID set:", cleanShopId);
    return true;
};

/**
 * Clear shop_id
 */
export const clearShopId = (): void => {
    localStorage.removeItem("shopId");
    console.log("🗑️ Shop ID cleared");
};