import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";

const hc = (path = "") => `${BASE_URL}/healthcare${path}`;
// Name the permission each call needs, so the request guard doesn't guess
// from the URL (POSTs would otherwise read as "create").
const as = (permission: string) => ({ headers: { "x-permission": permission } });
const unwrap = <T>(res: { data: { data: T } }) => res.data.data;

/** The API's message, for showing to the user. */
export const healthcareError = (error: unknown, fallback: string): string =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PatientCustomer {
  _id: string;
  customer_name?: string;
  phone?: number | string;
  email?: string;
  code?: string;
  date_of_birth?: string;
  gender?: string;
}

export interface Allergy {
  substance: string;
  reaction?: string;
  severity?: "mild" | "moderate" | "severe";
}

export interface PatientProfile {
  _id: string;
  customer_id: string;
  patient_number: string;
  national_id?: string;
  blood_group?: string;
  allergies?: Allergy[];
  chronic_conditions?: string[];
  current_medication?: string;
  next_of_kin?: { name?: string; relationship?: string; phone?: string };
  insurance?: { provider?: string; scheme?: string; member_number?: string; principal_member?: string; valid_until?: string | null };
  notes?: string;
}

export interface PatientRow {
  customer: PatientCustomer;
  profile: PatientProfile | null;
}

export type VisitStage = "waiting" | "triage" | "consultation" | "pharmacy" | "billing" | "completed" | "cancelled";

export interface Vitals {
  temperature_c?: number | null;
  pulse_bpm?: number | null;
  respiratory_rate?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  spo2_percent?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  blood_sugar_mmol?: number | null;
  notes?: string;
  taken_by_name?: string;
  taken_at?: string | null;
}

export interface Diagnosis {
  code?: string;
  description: string;
  kind?: "provisional" | "final";
}

export interface ClinicalNotes {
  chief_complaint?: string;
  history?: string;
  examination?: string;
  plan?: string;
}

export interface Visit {
  _id: string;
  customer_id: string;
  visit_number: string;
  visit_type: "outpatient" | "walk_in_pharmacy" | "follow_up" | "emergency";
  stage: VisitStage;
  priority: "normal" | "urgent" | "emergency";
  payer: "cash" | "insurance" | "corporate";
  doctor_id?: string | null;
  doctor_name?: string;
  vitals?: Vitals | null;
  clinical_notes?: ClinicalNotes;
  diagnoses?: Diagnosis[];
  checked_in_at: string;
  completed_at?: string | null;
  history?: { stage: string; by_name?: string; at: string; notes?: string }[];
  // List extras
  customer?: PatientCustomer | null;
  patient_number?: string;
  has_allergies?: boolean;
}

export interface VisitDetail extends Visit {
  profile: PatientProfile | null;
  prescriptions: Prescription[];
  can_see_notes: boolean;
}

export interface PrescriptionItem {
  _id: string;
  product_id: string;
  name: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  quantity: number;
  instructions?: string;
  dispensed_quantity: number;
  dispensed_batches?: { batch_number: string; expiry_date: string; quantity: number }[];
  suggested_batches?: { batch_id: string; batch_number: string; expiry_date: string; available: number; quantity: number }[];
  short?: number;
}

export type PrescriptionStatus = "pending" | "partially_dispensed" | "dispensed" | "cancelled";

export interface Prescription {
  _id: string;
  customer_id: string;
  visit_id?: string | null;
  source: "internal" | "external";
  prescriber_name?: string;
  external_reference?: string;
  items: PrescriptionItem[];
  notes?: string;
  status: PrescriptionStatus;
  dispensed_by_name?: string;
  dispensed_at?: string | null;
  createdAt: string;
  customer?: PatientCustomer | null;
  patient_number?: string;
}

export interface AllergyWarning {
  item_name: string;
  substance: string;
  severity?: string;
  reaction?: string;
}

export interface PrescriptionDetail extends Prescription {
  profile: PatientProfile | null;
  batch_tracking: boolean;
  warnings: AllergyWarning[];
}

export interface NewPrescriptionItem {
  product_id: string;
  name?: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  quantity: number;
  instructions?: string;
}

export interface DispensedLine {
  item_id: string;
  product_id: string;
  name: string;
  quantity: number;
}

export type BatchState = "active" | "expiring" | "expired" | "empty";

export interface StockBatch {
  _id: string;
  product_id: string;
  product_name: string;
  batch_number: string;
  expiry_date: string;
  manufacture_date?: string | null;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  supplier?: string;
  received_at: string;
  written_off_quantity?: number;
  state: BatchState;
}

export interface BatchSummaryBucket {
  batches: number;
  units: number;
  value: number;
}

export interface BatchSummary {
  active: BatchSummaryBucket;
  expiring: BatchSummaryBucket;
  expired: BatchSummaryBucket;
  near_expiry_days: number;
}

// ─── Patients ────────────────────────────────────────────────────────────────

/** Reception, doctors and the pharmacy all search; pass the key the caller holds. */
export const searchPatients = async (search = "", permission = "HEALTHCARE_PATIENTS_VIEW"): Promise<PatientRow[]> =>
  unwrap(await axiosInstance.get(hc("/patients"), { params: { search }, ...as(permission) }));

/** Medical profiles for a list of customers (the Customers table in hospital mode). */
export const fetchPatientProfiles = async (customerIds: string[]): Promise<PatientProfile[]> =>
  customerIds.length
    ? unwrap(
        await axiosInstance.get(hc("/patients/profiles"), {
          params: { ids: customerIds.join(",") },
          ...as("HEALTHCARE_PATIENTS_VIEW"),
        })
      )
    : [];

export const fetchPatient = async (customerId: string): Promise<PatientRow> =>
  unwrap(await axiosInstance.get(hc(`/patients/${customerId}`), as("HEALTHCARE_PATIENTS_VIEW")));

export const savePatientProfile = async (customerId: string, profile: Partial<PatientProfile>): Promise<PatientProfile> =>
  unwrap(await axiosInstance.put(hc(`/patients/${customerId}`), profile, as("HEALTHCARE_PATIENTS_MANAGE")));

// ─── Visits ──────────────────────────────────────────────────────────────────

export const fetchVisits = async (params: { open?: boolean; stage?: VisitStage; customer_id?: string; date?: string } = {}): Promise<Visit[]> =>
  unwrap(
    await axiosInstance.get(hc("/visits"), {
      params: { ...params, open: params.open ? "true" : undefined },
      ...as("HEALTHCARE_VISITS_VIEW"),
    })
  );

export const createVisit = async (body: {
  customer_id: string;
  visit_type?: Visit["visit_type"];
  priority?: Visit["priority"];
  payer?: Visit["payer"];
}): Promise<Visit> => unwrap(await axiosInstance.post(hc("/visits"), body, as("HEALTHCARE_VISITS_MANAGE")));

export const fetchVisit = async (id: string): Promise<VisitDetail> =>
  unwrap(await axiosInstance.get(hc(`/visits/${id}`), as("HEALTHCARE_VISITS_VIEW")));

export const updateVisit = async (id: string, body: Partial<Pick<Visit, "doctor_id" | "doctor_name" | "priority" | "payer">> & { cart_id?: string }) =>
  unwrap<Visit>(await axiosInstance.patch(hc(`/visits/${id}`), body, as("HEALTHCARE_VISITS_MANAGE")));

export const moveVisitStage = async (id: string, stage: VisitStage, notes = "") =>
  unwrap<Visit>(await axiosInstance.patch(hc(`/visits/${id}/stage`), { stage, notes }, as("HEALTHCARE_VISITS_MANAGE")));

export const saveVitals = async (id: string, vitals: Vitals) =>
  unwrap<Vitals>(await axiosInstance.put(hc(`/visits/${id}/vitals`), vitals, as("HEALTHCARE_TRIAGE")));

export const saveClinicalNotes = async (id: string, body: { clinical_notes: ClinicalNotes; diagnoses: Diagnosis[] }) =>
  unwrap<{ clinical_notes: ClinicalNotes; diagnoses: Diagnosis[] }>(
    await axiosInstance.put(hc(`/visits/${id}/notes`), body, as("HEALTHCARE_CLINICAL_NOTES"))
  );

// ─── Prescriptions ───────────────────────────────────────────────────────────

export const fetchPrescriptions = async (params: { status?: PrescriptionStatus | "open"; customer_id?: string; visit_id?: string } = {}) =>
  unwrap<Prescription[]>(await axiosInstance.get(hc("/prescriptions"), { params, ...as("HEALTHCARE_PRESCRIPTIONS_VIEW") }));

export const createPrescription = async (body: {
  customer_id: string;
  visit_id?: string;
  source?: "internal" | "external";
  external_reference?: string;
  notes?: string;
  items: NewPrescriptionItem[];
}): Promise<{ data: Prescription; warnings: AllergyWarning[] }> => {
  const res = await axiosInstance.post(
    hc("/prescriptions"),
    body,
    as(body.source === "external" ? "HEALTHCARE_DISPENSE" : "HEALTHCARE_PRESCRIBE")
  );
  return { data: res.data.data, warnings: res.data.warnings ?? [] };
};

export const fetchPrescription = async (id: string): Promise<PrescriptionDetail> =>
  unwrap(await axiosInstance.get(hc(`/prescriptions/${id}`), as("HEALTHCARE_PRESCRIPTIONS_VIEW")));

export const dispensePrescription = async (
  id: string,
  items: { item_id: string; quantity: number; batches?: { batch_id: string; quantity: number }[] }[]
): Promise<{ data: Prescription; dispensed: DispensedLine[] }> => {
  const res = await axiosInstance.post(hc(`/prescriptions/${id}/dispense`), { items }, as("HEALTHCARE_DISPENSE"));
  return { data: res.data.data, dispensed: res.data.dispensed ?? [] };
};

export const cancelPrescription = async (id: string, reason: string, source: Prescription["source"]) =>
  unwrap<Prescription>(
    await axiosInstance.post(
      hc(`/prescriptions/${id}/cancel`),
      { reason },
      as(source === "external" ? "HEALTHCARE_DISPENSE" : "HEALTHCARE_PRESCRIBE")
    )
  );

// ─── Batches ─────────────────────────────────────────────────────────────────

export const fetchBatches = async (params: { status?: BatchState; product_id?: string; search?: string } = {}) => {
  const res = await axiosInstance.get(hc("/batches"), { params, ...as("HEALTHCARE_BATCHES_VIEW") });
  return { data: res.data.data as StockBatch[], nearExpiryDays: res.data.near_expiry_days as number };
};

export const fetchBatchSummary = async (): Promise<BatchSummary> =>
  unwrap(await axiosInstance.get(hc("/batches/summary"), as("HEALTHCARE_BATCHES_VIEW")));

export const createBatch = async (body: {
  product_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  unit_cost?: number;
  supplier?: string;
  manufacture_date?: string;
}) => unwrap<StockBatch>(await axiosInstance.post(hc("/batches"), body, as("HEALTHCARE_BATCHES_MANAGE")));

export const updateBatch = async (id: string, body: Partial<Pick<StockBatch, "batch_number" | "expiry_date" | "unit_cost" | "supplier">>) =>
  unwrap<StockBatch>(await axiosInstance.patch(hc(`/batches/${id}`), body, as("HEALTHCARE_BATCHES_MANAGE")));

export const writeOffBatch = async (id: string, quantity: number, reason: string) =>
  unwrap<StockBatch>(await axiosInstance.post(hc(`/batches/${id}/write-off`), { quantity, reason }, as("HEALTHCARE_BATCHES_MANAGE")));
