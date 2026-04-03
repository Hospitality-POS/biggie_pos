/**
 * useTenantModules.ts
 *
 * Reads the active tenant's module flags (hr, accounting, etc.) from the
 * best available source, trying in order:
 *
 *  1. Redux — tries every common slice path the app might use
 *  2. localStorage "tenant" — always the most up-to-date value (set on login)
 *
 * Returns { hasHR, hasAccounting } as stable booleans.
 *
 * Usage:
 *   const { hasHR, hasAccounting } = useTenantModules();
 */

import { useMemo } from "react";
import { useAppSelector } from "src/store";

interface TenantModules {
    hasHR: boolean;
    hasAccounting: boolean;
}

// ── Try to pluck the tenant object from any known Redux shape ─────────────────
function selectTenantFromRedux(state: any): any {
    return (
        // most common shapes — add more here if your slices change
        state?.auth?.user?.tenant ||
        state?.auth?.tenant ||
        state?.auth?.currentUser?.tenant ||
        state?.tenant?.data ||
        state?.tenant?.current ||
        state?.shop?.tenant ||
        null
    );
}

// ── Parse module flags from a raw tenant object ───────────────────────────────
function parseModules(tenant: any): TenantModules {
    if (!tenant) return { hasHR: false, hasAccounting: false };

    const mods = tenant.modules ?? tenant.module_flags ?? tenant.features ?? {};

    // Normalise — the flag might be true/false, "true"/"false", 1/0, or an object
    const isEnabled = (v: any): boolean => {
        if (typeof v === "boolean") return v;
        if (typeof v === "number") return v !== 0;
        if (typeof v === "string") return v === "true" || v === "1" || v === "enabled";
        if (typeof v === "object" && v !== null) return !!(v.enabled ?? v.active ?? v.is_active ?? true);
        return false;
    };

    return {
        hasHR: isEnabled(mods.hr ?? mods.HR ?? mods.hrm ?? mods.human_resources),
        hasAccounting: isEnabled(
            mods.accounting ??
            mods.ACCOUNTING ??
            mods.finance ??
            mods.accounts ??
            mods.financial
        ),
    };
}

// ── Read from localStorage as fallback ────────────────────────────────────────
function readFromLocalStorage(): any {
    try {
        const raw = localStorage.getItem("tenant");
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// ── The hook ──────────────────────────────────────────────────────────────────
export function useTenantModules(): TenantModules {
    // Read from Redux — will re-render on store change
    const reduxTenant = useAppSelector(selectTenantFromRedux);

    return useMemo(() => {
        // 1. Try Redux first (reactive)
        if (reduxTenant) {
            const parsed = parseModules(reduxTenant);
            // If either flag is true, we have good data — use it
            if (parsed.hasHR || parsed.hasAccounting) return parsed;
            // If both are false it MIGHT be a legit "no modules" tenant, but
            // also might be a stale/empty redux slice — fall through to localStorage
        }

        // 2. localStorage fallback (always fresh after login)
        const lsTenant = readFromLocalStorage();
        if (lsTenant) return parseModules(lsTenant);

        // 3. No data at all
        return { hasHR: false, hasAccounting: false };
    }, [reduxTenant]);
}

/**
 * Non-hook version for use outside components (e.g. in utility functions).
 * Reads only from localStorage.
 */
export function getTenantModulesSync(): TenantModules {
    return parseModules(readFromLocalStorage());
}