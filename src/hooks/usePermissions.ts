import { useAppSelector } from "src/store";
import { makePermissionChecker } from "@utils/accessControl";

/**
 * Hook to check if the current user has specific permissions.
 * 
 * Usage:
 *   const { can, hasAll, hasAny } = usePermissions();
 *   
 *   if (can("SIGNATURE_CREATE")) { ... }
 *   if (hasAll(["SIGNATURE_CREATE", "SIGNATURE_UPDATE"])) { ... }
 *   if (hasAny(["SIGNATURE_CREATE", "SIGNATURE_VIEW"])) { ... }
 */
export function usePermissions() {
    const { user } = useAppSelector((state) => state.auth);

    const isAdmin = user?.role === "admin";
    const rolePermissions: string[] =
        (user as any)?.rolePermissions ?? (user as any)?.permissions ?? [];

    const can = makePermissionChecker(rolePermissions, isAdmin);

    const hasAll = (permissions: string[]): boolean => {
        if (isAdmin) return true;
        return permissions.every(p => rolePermissions.includes(p));
    };

    const hasAny = (permissions: string[]): boolean => {
        if (isAdmin) return true;
        return permissions.some(p => rolePermissions.includes(p));
    };

    const hasModuleAccess = (moduleScope: string): boolean => {
        if (isAdmin) return true;
        // Check if user has any permissions for the given module scope
        return rolePermissions.some(p => {
            const permission = (window as any)?.PERMISSIONS?.[p];
            return permission?.moduleScope === moduleScope;
        });
    };

    return {
        can,
        hasAll,
        hasAny,
        hasModuleAccess,
        isAdmin,
        permissions: rolePermissions,
    };
}