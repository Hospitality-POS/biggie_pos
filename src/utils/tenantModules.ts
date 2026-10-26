// Whether a Discover module is activated for a tenant, read from the tenant
// details record. Shared by the Discover page and anything that should only
// show content for activated modules (e.g. the Help Center).
export type TenantModuleId =
  | "relia_pos"
  | "relia_accounting"
  | "relia_payroll"
  | "mteja"
  | "dala"
  | "etims";

export const isTenantModuleEnabled = (tenant: any, id: TenantModuleId): boolean => {
  if (!tenant) return false;
  switch (id) {
    case "relia_pos":
      return tenant.pos_integration?.enabled === true;
    case "relia_accounting":
      return tenant.modules?.accounting === true;
    case "relia_payroll":
      return tenant.modules?.bandu_hr === true || tenant.modules?.payroll === true;
    case "mteja":
      return tenant.modules?.crm === true;
    case "dala":
      return tenant.modules?.dala === true;
    case "etims":
      return tenant.etims_config?.enabled === true;
    default:
      return false;
  }
};
