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

    return useMemo(() => {
        // 1. Try Redux first (reactive — re-renders on store change)
        if (reduxTenant) {
            const parsed = parseModules(reduxTenant);
            // If any flag is true we have good data — use it.
            // If all are false it might be legit OR an empty redux slice,
            // so fall through to localStorage to be sure.
            if (parsed.hasHR || parsed.hasAccounting || parsed.hasMteja || parsed.hasDala || parsed.hasPOS || parsed.hasSignature) return parsed;
        }

        // 2. localStorage fallback (always fresh after login)
        const lsTenant = readFromLocalStorage();
        if (lsTenant) return parseModules(lsTenant);

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