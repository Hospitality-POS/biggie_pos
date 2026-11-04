/**
 * useTenantModules.ts
 *
 * Reads the active tenant's module flags from the best available source,
 * trying in order:
 *
 *  1. Redux — tries every common slice path the app might use
 *  2. localStorage "tenant" — always the most up-to-date value (set on login)
 *
 * Returns { hasHR, hasAccounting, hasMteja } as stable booleans.
 *
 * Usage:
 *   const { hasHR, hasAccounting, hasMteja } = useTenantModules();
 */

import { useMemo } from "react";
import { useAppSelector } from "src/store";
import {
    TenantModules,
    NO_TENANT_MODULES,
    parseTenantModules as parseModules,
    readStoredTenant as readFromLocalStorage,
    restrictToRoleModules,
} from "@utils/parseTenantModules";

export type { TenantModules };

// ── Try to pluck the tenant object from any known Redux shape ─────────────────
function selectTenantFromRedux(state: any): any {
    return (
        state?.auth?.user?.tenant ||
        state?.auth?.tenant ||
        state?.auth?.currentUser?.tenant ||
        state?.tenant?.data ||
        state?.tenant?.current ||
        state?.shop?.tenant ||
        null
    );
}

// ── The hook ──────────────────────────────────────────────────────────────────
export function useTenantModules(): TenantModules {
    const reduxTenant = useAppSelector(selectTenantFromRedux);
    const tenantModules = useTenantWideModules(reduxTenant);

    // Staff on a role limited to some products (e.g. Pesa only) see just those,
    // even when the business has more. Admins always see everything.
    const user = useAppSelector((state: any) => state?.auth?.user);
    const isAdmin = user?.isAdmin === true || user?.role === "admin";
    const roleModules: string[] | undefined = isAdmin ? undefined : user?.roleData?.modules;

    return useMemo(
        () => restrictToRoleModules(tenantModules, roleModules),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [tenantModules, (roleModules ?? []).join(",")]
    );
}

function useTenantWideModules(reduxTenant: any): TenantModules {
    return useMemo(() => {
        // 1. localStorage first: Discover's Enable / Disable refreshes the
        //    stored tenant (then reloads), while the Redux copy keeps the
        //    flags from login — so Redux alone can show a module that was
        //    just switched off.
        const storedTenant = readFromLocalStorage();
        if (storedTenant) return parseModules(storedTenant);

        // 2. Redux (reactive — re-renders on store change)
        if (reduxTenant) {
            const parsed = parseModules(reduxTenant);
            // If any flag is true we have good data — use it.
            // If all are false it might be legit OR an empty redux slice,
            // so fall through to localStorage to be sure.
            if (parsed.hasHR || parsed.hasAccounting || parsed.hasMteja || parsed.hasDala || parsed.hasPOS || parsed.hasSignature) return parsed;
        }

        // 3. No data at all
        return NO_TENANT_MODULES;
    }, [reduxTenant]);
}

/**
 * Non-hook version for use outside components (e.g. utility functions,
 * route guards, permission helpers called before the component tree mounts).
 * Reads only from localStorage — no reactivity.
 */
export function getTenantModulesSync(): TenantModules {
    return parseModules(readFromLocalStorage());
}