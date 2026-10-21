/**
 * parseTenantModules.ts
 *
 * Turns a raw tenant record into product flags. Kept free of React and the
 * Redux store so non-component code (e.g. the axios permission check in
 * services/request.ts) can use it without an import cycle. Components should
 * use the useTenantModules hook, which builds on this.
 */

export interface TenantModules {
    hasHR: boolean;
    hasAccounting: boolean;
    hasMteja: boolean;  // tenant.modules.crm === true  →  Mteja CRM module
    hasDala: boolean;  // tenant.modules.dala === true  →  Dala Property Management module
    hasPOS: boolean;   // tenant.pos_integration?.enabled === true  →  Duka by Base POS module
    hasSignature: boolean;  // tenant.modules.signature === true  →  E-Signature module
}

export const NO_TENANT_MODULES: TenantModules = {
    hasHR: false, hasAccounting: false, hasMteja: false, hasDala: false, hasPOS: false, hasSignature: false,
};

// ── Normalise a single flag value ─────────────────────────────────────────────
const isEnabled = (v: any): boolean => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") return v === "true" || v === "1" || v === "enabled";
    if (typeof v === "object" && v !== null)
        return !!(v.enabled ?? v.active ?? v.is_active ?? true);
    return false;
};

// A module is on when any of its aliases is on — a `false` on one alias
// (e.g. modules.hr) must not hide a `true` on another (e.g. modules.bandu_hr).
const anyEnabled = (...values: any[]): boolean => values.some(isEnabled);

// ── Parse module flags from a raw tenant object ───────────────────────────────
export function parseTenantModules(tenant: any): TenantModules {
    if (!tenant) return NO_TENANT_MODULES;

    const mods = tenant.modules ?? tenant.module_flags ?? tenant.features ?? {};

    return {
        hasHR: anyEnabled(
            mods.hr,
            mods.HR,
            mods.hrm,
            mods.bandu_hr,  // Bandu by Base — same flag the HR routes check
            mods.payroll,
            mods.human_resources
        ),
        hasAccounting: anyEnabled(
            mods.accounting,
            mods.ACCOUNTING,
            mods.finance,
            mods.accounts,
            mods.financial,
            tenant?.accounting_database?.enabled // legacy shape
        ),
        hasMteja: anyEnabled(
            mods.crm,  // canonical key — tenant.modules.crm
            mods.CRM,
            mods.mteja,
            mods.customer_engagement
        ),
        hasDala: anyEnabled(
            mods.dala,
            mods.DALA,
            mods.property_management,
            mods.real_estate
        ),
        hasPOS: anyEnabled(
            tenant?.pos_integration?.enabled,
            mods.pos,
            mods.POS,
            mods.duka
        ),
        hasSignature: anyEnabled(
            mods.signature,
            mods.SIGNATURE,
            mods.esignature,
            mods.e_signature,
            mods.esign
        ),
    };
}

// ── Read the tenant saved at login ────────────────────────────────────────────
export function readStoredTenant(): any {
    try {
        const raw = localStorage.getItem("tenant");
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}
