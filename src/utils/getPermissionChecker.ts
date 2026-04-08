import { makePermissionChecker } from "@utils/accessControl";

/**
 * Builds a permission checker from the currently authenticated user stored
 * in localStorage.
 *
 * Reads role from `user.role` (same source as useProLayoutNav / AdminRoute)
 * so that admin users automatically pass every permission check.
 *
 * Usage:
 *   const can = useMemo(() => getPermissionChecker(), []);
 *   if (can("INVENTORY_VIEW")) { ... }
 */
export const getPermissionChecker = (): ((key: string) => boolean) => {
    try {
        const raw = localStorage.getItem("user");
        const user = raw ? JSON.parse(raw) : null;

        // Admin bypass — same logic as AdminRoute and useProLayoutNav
        const isAdmin = user?.role === "admin";

        const rolePermissions: string[] =
            user?.rolePermissions ?? user?.permissions ?? [];

        return makePermissionChecker(rolePermissions, isAdmin);
    } catch {
        return (_key: string) => false;
    }
};