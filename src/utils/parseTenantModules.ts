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
    // Canonical branded properties
    hasDuka: boolean;
    hasPesa: boolean;
    hasBandu: boolean;
    duka: boolean;
    pesa: boolean;
    bandu: boolean;
    dala: boolean;
    mteja: boolean;
    esign: boolean;
}

export const NO_TENANT_MODULES: TenantModules = {
    hasHR: false,
    hasAccounting: false,
    hasMteja: false,
    hasDala: false,
    hasPOS: false,
    hasSignature: false,
    hasDuka: false,
    hasPesa: false,
    hasBandu: false,
    duka: false,
    pesa: false,
    bandu: false,
    dala: false,
    mteja: false,
    esign: false,
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

// ── Check canonical module licensing ──────────────────────────────────────────
export function isModuleEnabled(
    modules: TenantModules | null | undefined,
    moduleKey: string
): boolean {
    if (!modules) return false;
    switch (moduleKey.toLowerCase()) {
        case "duka":
        case "pos":
            return modules.hasDuka || modules.hasPOS || modules.duka;
        case "pesa":
        case "accounting":
            return modules.hasPesa || modules.hasAccounting || modules.pesa;
        case "bandu":
        case "hr":
        case "payroll":
            return modules.hasBandu || modules.hasHR || modules.bandu;
        case "dala":
        case "real_estate":
        case "properties":
            return modules.hasDala || modules.dala;
        case "mteja":
        case "crm":
            return modules.hasMteja || modules.mteja;
        case "esign":
        case "signature":
            return modules.hasSignature || modules.esign;
        default:
            return false;
    }
}

// ── Parse module flags from a raw tenant object ───────────────────────────────
export function parseTenantModules(tenant: any): TenantModules {
    if (!tenant) return NO_TENANT_MODULES;

    const mods = tenant.modules ?? tenant.module_flags ?? tenant.features ?? {};

    const hasHR = anyEnabled(
        mods.bandu,
        mods.bandu_hr,
        mods.payroll,
        mods.hr,
        mods.HR,
        mods.hrm,
        mods.human_resources
    );
    const hasAccounting = anyEnabled(
        mods.pesa,
        mods.accounting,
        mods.ACCOUNTING,
        mods.finance,
        mods.accounts,
        mods.financial,
        tenant?.accounting_database?.enabled
    );
    const hasMteja = anyEnabled(
        mods.mteja,
        mods.crm,
        mods.CRM,
        mods.customer_engagement
    );
    const hasDala = anyEnabled(
        mods.dala,
        mods.DALA,
        mods.property_management,
        mods.real_estate
    );
    const hasPOS =
        tenant?.pos_integration?.enabled === true ||
        isEnabled(mods.duka) ||
        isEnabled(mods.pos);
    const hasSignature = anyEnabled(
        mods.esign,
        mods.signature,
        mods.SIGNATURE,
        mods.esignature,
        mods.e_signature
    );

    return {
        hasHR,
        hasAccounting,
        hasMteja,
        hasDala,
        hasPOS,
        hasSignature,
        hasDuka: hasPOS,
        hasPesa: hasAccounting,
        hasBandu: hasHR,
        duka: hasPOS,
        pesa: hasAccounting,
        bandu: hasHR,
        dala: hasDala,
        mteja: hasMteja,
        esign: hasSignature,
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
