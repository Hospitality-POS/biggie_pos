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

interface TenantModules {
    hasHR: boolean;
    hasAccounting: boolean;
    hasMteja: boolean;  // tenant.modules.crm === true  →  Mteja CRM module
    hasDala: boolean;  // tenant.modules.dala === true  →  Dala Property Management module
    hasPOS: boolean;   // tenant.pos_integration?.enabled === true  →  Duka by Base POS module
}

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

// ── Normalise a single flag value ─────────────────────────────────────────────
const isEnabled = (v: any): boolean => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") return v === "true" || v === "1" || v === "enabled";
    if (typeof v === "object" && v !== null)
        return !!(v.enabled ?? v.active ?? v.is_active ?? true);
    return false;
};

// ── Parse module flags from a raw tenant object ───────────────────────────────
function parseModules(tenant: any): TenantModules {
    if (!tenant) return { hasHR: false, hasAccounting: false, hasMteja: false, hasDala: false, hasPOS: false };

    const mods = tenant.modules ?? tenant.module_flags ?? tenant.features ?? {};

    return {
        hasHR: isEnabled(
            mods.hr ??
            mods.HR ??
            mods.hrm ??
            mods.payroll ??  // Bandu by Base uses modules.payroll
            mods.human_resources
        ),
        hasAccounting: isEnabled(
            mods.accounting ??
            mods.ACCOUNTING ??
            mods.finance ??
            mods.accounts ??
            mods.financial
        ) || isEnabled(tenant?.accounting_database?.enabled), // legacy shape
        hasMteja: isEnabled(
            mods.crm ??  // canonical key — tenant.modules.crm
            mods.CRM ??
            mods.mteja ??
            mods.customer_engagement
        ),
        hasDala: isEnabled(
            mods.dala ??
            mods.DALA ??
            mods.property_management ??
            mods.real_estate
        ),
        hasPOS: isEnabled(
            tenant?.pos_integration?.enabled ??
            mods.pos ??
            mods.POS ??
            mods.duka
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
    const reduxTenant = useAppSelector(selectTenantFromRedux);

    return useMemo(() => {
        // 1. Try Redux first (reactive — re-renders on store change)
        if (reduxTenant) {
            const parsed = parseModules(reduxTenant);
            // If any flag is true we have good data — use it.
            // If all are false it might be legit OR an empty redux slice,
            // so fall through to localStorage to be sure.
            if (parsed.hasHR || parsed.hasAccounting || parsed.hasMteja) return parsed;
        }

        // 2. localStorage fallback (always fresh after login)
        const lsTenant = readFromLocalStorage();
        if (lsTenant) return parseModules(lsTenant);

        // 3. No data at all
        return { hasHR: false, hasAccounting: false, hasMteja: false, hasDala: false, hasPOS: false };
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