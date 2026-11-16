import { BASE_URL } from "@utils/config";
import dayjs from "dayjs";
import axiosInstance from "./request";

export type ContractState = "Off" | "Scheduled" | "Active" | "Due" | "Grace" | "Restricted" | "Locked";

export interface ContractActivation {
  action: "activate" | "renew" | "reactivate" | "extend" | "disable";
  seq: number;
  enabled?: boolean;
  monthly_fee?: number | null;
  previous_fee?: number | null;
  paid_until?: string | null;
  activated_on?: string | null;
  note?: string | null;
  activated_at: string;
  activated_by?: string | null;
  // Position in the stored history, used to edit the entry
  index: number;
  // Set when the entry was re-dated; activated_at keeps the real time
  effective_date?: string | null;
  // Original paid-until date, kept when someone edited it
  previous_paid_until?: string | null;
  edited_at?: string | null;
  edited_by?: string | null;
}

export interface ContractStatus {
  tenant_code: string;
  install_id: string;
  enabled: boolean;
  state: ContractState;
  days_until_due: number | null;
  days_overdue: number | null;
  // The next, stricter state and when it starts (null once Locked)
  next_state: ContractState | null;
  days_until_next_state: number | null;
  next_state_on: string | null;
  monthly_fee: number | null;
  currency: string;
  paid_until: string | null;
  activated_on: string | null;
  next_period_paid_until: string | null;
  terms: { due_day: number; grace_days: number; restricted_days: number };
  short_codes: boolean;
  clock_warning: boolean;
  generator_available: boolean;
  history_edit_available: boolean;
  // History entry the current paid-until date came from (-1 if none)
  current_entry_index: number;
  // Amounts owed besides the monthly fee (setup fee etc.)
  other_charges: ContractCharge[];
  other_charges_outstanding: number;
  activations: ContractActivation[];
}

export interface ContractCharge {
  _id: string;
  label: string;
  amount: number;
  note?: string | null;
  status: "outstanding" | "paid";
  added_at: string;
  added_by?: string | null;
  status_changed_at?: string | null;
  status_changed_by?: string | null;
}

export const CONTRACT_STATUS_KEY = ["contractStatus"];

// BasePoint staff only (PIN) — records an amount owed, e.g. a setup fee
export const addContractCharge = async (payload: {
  pin: string;
  label: string;
  amount: number;
  note?: string;
}): Promise<{ message: string; status: ContractStatus }> => {
  const response = await axiosInstance.post(`${BASE_URL}/contract/charges`, payload);
  return response.data;
};

// BasePoint staff only (PIN) — marks a charge paid / outstanding / removed
export const setContractChargeStatus = async (
  id: string,
  payload: { pin: string; status: "paid" | "outstanding" | "removed" }
): Promise<{ message: string; status: ContractStatus }> => {
  const response = await axiosInstance.patch(`${BASE_URL}/contract/charges/${id}`, payload);
  return response.data;
};

// Props for BasePointPaymentDetails: monthly fee, outstanding charges and total
export const paymentDetailProps = (s: {
  monthly_fee: number | null;
  currency: string;
  tenant_code: string;
  other_charges?: { label: string; amount: number; status?: string }[];
  other_charges_outstanding?: number;
}) => {
  const extraLines = outstandingChargeLines(s.other_charges, s.currency);
  return {
    amount: formatMoney(s.monthly_fee, s.currency),
    extraLines,
    total: formatMoney(Number(s.monthly_fee || 0) + Number(s.other_charges_outstanding || 0), s.currency),
    reference: s.tenant_code,
  };
};

// Outstanding charges as payment-detail lines, e.g. "Setup fee — KES 15,000"
export const outstandingChargeLines = (
  charges: { label: string; amount: number; status?: string }[] | undefined,
  currency: string
) =>
  (charges || [])
    .filter((c) => !c.status || c.status === "outstanding")
    .map((c) => ({ label: c.label, amount: formatMoney(c.amount, currency) }));

export const fetchContractStatus = async (): Promise<ContractStatus> => {
  const response = await axiosInstance.get(`${BASE_URL}/contract/status`);
  return response.data;
};

export const activateContract = async (payload: {
  code: string;
  monthly_fee?: number;
  activation_date?: string;
  extend_until?: string;
}): Promise<{ message: string; status: ContractStatus }> => {
  const response = await axiosInstance.post(`${BASE_URL}/contract/activate`, payload);
  return response.data;
};

// What the payment screen shows before anyone signs in
export interface PublicContractStatus {
  tenant_code: string;
  enabled: boolean;
  state: ContractState;
  days_overdue: number | null;
  monthly_fee: number | null;
  currency: string;
  paid_until: string | null;
  next_period_paid_until: string | null;
  // BasePoint machines only: staff can unlock with the PIN instead of a code
  pin_unlock_available: boolean;
  other_charges: { label: string; amount: number }[];
  other_charges_outstanding: number;
}

// No sign-in needed, BasePoint machines only — issues and applies a code in
// one step with the BasePoint PIN
export const unlockContractWithPin = async (payload: {
  pin: string;
  mode: "activate" | "reactivate" | "extend";
  monthly_fee?: number;
  activation_date?: string;
  paid_until?: string;
  extend_until?: string;
}): Promise<{ message: string; status: PublicContractStatus }> => {
  const response = await axiosInstance.post(`${BASE_URL}/contract/unlock-with-pin`, payload);
  return response.data;
};

// No sign-in needed — used by the payment screen when the system is locked
export const fetchPublicContractStatus = async (): Promise<PublicContractStatus> => {
  const response = await axiosInstance.get(`${BASE_URL}/contract/public-status`);
  return response.data;
};

// No sign-in needed — BasePoint support enters a code on the payment screen
export const unlockContract = async (payload: {
  code: string;
  monthly_fee?: number;
  extend_until?: string;
}): Promise<{ message: string; status: PublicContractStatus }> => {
  const response = await axiosInstance.post(`${BASE_URL}/contract/unlock`, payload);
  return response.data;
};

// The date a history entry is shown under: a re-dated entry's date, an
// activation's activation date, otherwise when it was entered
// (effective_date / activated_on are calendar dates; activated_at is a moment,
// so it is read in local time)
export const historyDateOf = (row: ContractActivation): string =>
  row.effective_date?.slice(0, 10) ||
  (row.action === "activate" ? row.activated_on?.slice(0, 10) : undefined) ||
  dayjs(row.activated_at).format("YYYY-MM-DD");

// BasePoint staff only (PIN) — re-dates or re-notes one history entry
export const editContractHistory = async (
  index: number,
  payload: {
    pin: string;
    activated_at: string;
    effective_date?: string | null;
    note?: string | null;
    paid_until?: string;
  }
): Promise<{ message: string; status: ContractStatus }> => {
  const response = await axiosInstance.patch(`${BASE_URL}/contract/activations/${index}`, payload);
  return response.data;
};

export interface GenerateCodeRequest {
  pin: string;
  action: ContractActivation["action"];
  tenant_code: string;
  install: string;
  fee?: number;
  start?: string;
  paid_until?: string;
  months?: number;
  days?: number;
  note?: string;
}

export interface GeneratedCode {
  code: string;
  short_code: string | null;
  action: ContractActivation["action"];
  tenant: string;
  install: string;
  monthly_fee: number | null;
  currency: string | null;
  activation_date: string | null;
  paid_until: string | null;
  months: number | null;
}

// BasePoint staff only — works where the server has the signing key and PIN
export const generateContractCode = async (payload: GenerateCodeRequest): Promise<GeneratedCode> => {
  const response = await axiosInstance.post(`${BASE_URL}/contract/generate`, payload);
  return response.data;
};

// 6-digit code for reactivating, changing the fee or disabling, e.g. 482915
export const isDigitCode = (code: string) => /^\d{3}[-\s]?\d{3}$/.test(code.trim());

// paid_until / activated_on are calendar dates stored as UTC midnight
export const formatPaidUntil = (value?: string | null) =>
  value ? dayjs(value.slice(0, 10)).format("DD MMM YYYY") : "—";

export const formatMoney =(amount: number | null | undefined, currency = "KES") =>
  amount == null ? "—" : `${currency} ${Number(amount).toLocaleString()}`;
