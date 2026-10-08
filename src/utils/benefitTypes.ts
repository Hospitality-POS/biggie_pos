// Configurable benefit/allowance types for Bandu HR.
// Defaults follow KRA taxable-benefit rules; tenants can override them in
// System Setup → Payroll → "Default Allowances & Benefits"
// (persisted at payroll_settings.benefits_defaults).

export type BenefitMode = "fixed" | "percent_of_value" | "higher_of_rent_or_percent";
export type BenefitKind = "benefit" | "allowance";

export interface BenefitTypeDefault {
  key: string;
  label: string;
  // benefit → employee "Benefits" tab; allowance → "Allowances" tab
  kind: BenefitKind;
  enabled: boolean;
  mode: BenefitMode;
  amount?: number; // fixed mode — default monthly amount
  percent?: number; // percent_of_value / higher_of_rent_or_percent
  taxable: boolean;
}

export const DEFAULT_BENEFIT_TYPES: BenefitTypeDefault[] = [
  {
    key: "house",
    label: "House",
    kind: "benefit",
    enabled: true,
    mode: "higher_of_rent_or_percent",
    percent: 15,
    taxable: true,
  },
  {
    key: "motor_vehicle",
    label: "Motor Vehicle",
    kind: "benefit",
    enabled: true,
    mode: "percent_of_value",
    percent: 2,
    taxable: true,
  },
  { key: "medical", label: "Medical", kind: "benefit", enabled: true, mode: "fixed", amount: 0, taxable: true },
  { key: "leave_days", label: "Leave Days", kind: "benefit", enabled: true, mode: "fixed", amount: 0, taxable: true },
  { key: "airtime", label: "Airtime", kind: "allowance", enabled: true, mode: "fixed", amount: 0, taxable: true },
  { key: "transport", label: "Transport", kind: "allowance", enabled: true, mode: "fixed", amount: 0, taxable: true },
];

/** Benefit types configured in system settings, falling back to KRA defaults. */
export const resolveBenefitTypes = (payrollSettings: any): BenefitTypeDefault[] =>
  Array.isArray(payrollSettings?.benefits_defaults) && payrollSettings.benefits_defaults.length > 0
    ? payrollSettings.benefits_defaults.map((b: any) => ({
        kind: "benefit",
        ...b,
      }))
    : DEFAULT_BENEFIT_TYPES;

/**
 * Compute the taxable benefit amount for a benefit type.
 * - fixed                      → the configured/default amount
 * - percent_of_value           → percent% of the asset value (e.g. car cost)
 * - higher_of_rent_or_percent  → max(percent% of gross salary, actual rent)
 */
export const computeBenefitAmount = (
  type: BenefitTypeDefault,
  input: { value?: number; rent?: number; gross?: number } = {}
): number => {
  switch (type.mode) {
    case "percent_of_value":
      return Math.round(((input.value || 0) * (type.percent || 0)) / 100);
    case "higher_of_rent_or_percent":
      return Math.round(
        Math.max(((input.gross || 0) * (type.percent || 0)) / 100, input.rent || 0)
      );
    default:
      return Math.round(input.value ?? type.amount ?? 0);
  }
};
