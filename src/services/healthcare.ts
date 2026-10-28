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

export type VisitStage = "waiting" | "triage" | "consultation" | "lab" | "pharmacy" | "billing" | "completed" | "cancelled";

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
  payer_id?: string | null;
  scheme_id?: string | null;
  member_number?: string;
  member_verified?: boolean;
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
  lab_orders: LabOrder[];
  claims: Pick<Claim, "_id" | "claim_number" | "status" | "claim_amount" | "payer_name">[];
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
  payer_id?: string;
  scheme_id?: string;
  member_number?: string;
  member_verified?: boolean;
}): Promise<Visit> => unwrap(await axiosInstance.post(hc("/visits"), body, as("HEALTHCARE_VISITS_MANAGE")));

export const fetchVisit = async (id: string): Promise<VisitDetail> =>
  unwrap(await axiosInstance.get(hc(`/visits/${id}`), as("HEALTHCARE_VISITS_VIEW")));

export const updateVisit = async (
  id: string,
  body: Partial<Pick<Visit, "doctor_id" | "doctor_name" | "priority" | "payer" | "payer_id" | "scheme_id" | "member_number" | "member_verified">> & { cart_id?: string }
) =>
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

// ─── Laboratory & imaging ────────────────────────────────────────────────────

export type LabDepartment = "lab" | "radiology";
export type LabStatus = "ordered" | "sample_collected" | "in_progress" | "completed" | "cancelled";

export interface LabParameter {
  name: string;
  unit?: string;
  ref_low?: number | null;
  ref_high?: number | null;
  ref_text?: string;
}

export interface LabTest {
  _id: string;
  name: string;
  code?: string;
  department: LabDepartment;
  sample_type?: string;
  turnaround_minutes?: number | null;
  product_id: string;
  product_type: "Product" | "Product_Inventory";
  parameters: LabParameter[];
  is_active: boolean;
  /** Current price of the POS item it bills as */
  price?: number | null;
}

export interface LabResult {
  parameter: string;
  value: string;
  unit?: string;
  ref_range?: string;
  flag?: "" | "low" | "high" | "abnormal";
}

export interface LabOrderItem {
  _id: string;
  test_id: string;
  name: string;
  product_id: string;
  product_type: "Product" | "Product_Inventory";
  price: number;
  status: LabStatus;
  results: LabResult[];
  report?: string;
  completed_by_name?: string;
  completed_at?: string | null;
  // On a single order: the test's set-up, for entering results
  parameters?: LabParameter[];
  sample_type?: string;
}

export interface LabOrder {
  _id: string;
  order_number: string;
  customer_id: string;
  visit_id?: string | null;
  department: LabDepartment;
  priority: "routine" | "urgent";
  clinical_notes?: string;
  items: LabOrderItem[];
  status: LabStatus;
  ordered_by_name?: string;
  sample_collected_at?: string | null;
  sample_collected_by_name?: string;
  completed_at?: string | null;
  billed_at?: string | null;
  createdAt: string;
  customer?: PatientCustomer | null;
  patient_number?: string;
}

export const fetchLabTests = async (params: { department?: LabDepartment; active?: boolean } = {}, permission = "HEALTHCARE_LAB_VIEW") =>
  unwrap<LabTest[]>(
    await axiosInstance.get(hc("/lab-tests"), {
      params: { department: params.department, active: params.active ? "true" : undefined },
      ...as(permission),
    })
  );

export const createLabTest = async (body: Partial<LabTest>) =>
  unwrap<LabTest>(await axiosInstance.post(hc("/lab-tests"), body, as("HEALTHCARE_LAB_SETUP")));

export const updateLabTest = async (id: string, body: Partial<LabTest>) =>
  unwrap<LabTest>(await axiosInstance.patch(hc(`/lab-tests/${id}`), body, as("HEALTHCARE_LAB_SETUP")));

export const fetchLabOrders = async (
  params: { department?: LabDepartment; status?: LabStatus | "open"; visit_id?: string; customer_id?: string } = {},
  permission = "HEALTHCARE_LAB_VIEW"
) => unwrap<LabOrder[]>(await axiosInstance.get(hc("/lab-orders"), { params, ...as(permission) }));

export const fetchLabOrder = async (id: string, permission = "HEALTHCARE_LAB_VIEW") =>
  unwrap<LabOrder>(await axiosInstance.get(hc(`/lab-orders/${id}`), as(permission)));

export const createLabOrder = async (body: {
  customer_id: string;
  visit_id?: string;
  test_ids: string[];
  priority?: LabOrder["priority"];
  clinical_notes?: string;
}) => unwrap<LabOrder[]>(await axiosInstance.post(hc("/lab-orders"), body, as("HEALTHCARE_LAB_ORDER")));

export const collectSample = async (id: string) =>
  unwrap<LabOrder>(await axiosInstance.post(hc(`/lab-orders/${id}/collect`), {}, as("HEALTHCARE_LAB_WORK")));

export const saveLabResults = async (
  id: string,
  items: { item_id: string; results?: { parameter: string; value: string }[]; report?: string; complete?: boolean }[]
) => unwrap<LabOrder>(await axiosInstance.put(hc(`/lab-orders/${id}/results`), { items }, as("HEALTHCARE_LAB_WORK")));

export const markLabOrderBilled = async (id: string) =>
  unwrap<LabOrder>(await axiosInstance.post(hc(`/lab-orders/${id}/billed`), {}, as("HEALTHCARE_LAB_WORK")));

export const cancelLabOrder = async (id: string, reason: string, permission = "HEALTHCARE_LAB_ORDER") =>
  unwrap<LabOrder>(await axiosInstance.post(hc(`/lab-orders/${id}/cancel`), { reason }, as(permission)));

// ─── Insurance & claims ──────────────────────────────────────────────────────

export interface Scheme {
  _id?: string;
  name: string;
  copay_type: "none" | "percent" | "fixed";
  copay_value: number;
  preauth_above?: number | null;
  visit_limit?: number | null;
  is_active?: boolean;
}

export interface Payer {
  _id: string;
  name: string;
  kind: "insurance" | "corporate" | "government";
  contact_person?: string;
  phone?: string;
  email?: string;
  payment_terms_days?: number;
  schemes: Scheme[];
  is_active: boolean;
}

export type ClaimStatus = "draft" | "submitted" | "approved" | "partially_paid" | "paid" | "rejected";

export interface ClaimLine {
  _id?: string;
  kind: "consultation" | "lab" | "radiology" | "medicine" | "procedure" | "other";
  description: string;
  quantity: number;
  unit_price: number;
  amount?: number;
}

export interface Claim {
  _id: string;
  claim_number: string;
  payer_id: string;
  payer_name: string;
  scheme_id?: string | null;
  scheme_name?: string;
  customer_id: string;
  visit_id?: string | null;
  member_number?: string;
  principal_member?: string;
  preauth_number?: string;
  diagnoses?: { code?: string; description: string }[];
  lines: ClaimLine[];
  total: number;
  copay_amount: number;
  claim_amount: number;
  approved_amount?: number | null;
  paid_amount: number;
  payments: { _id?: string; amount: number; date: string; reference?: string; recorded_by_name?: string }[];
  status: ClaimStatus;
  submitted_at?: string | null;
  rejection_reason?: string;
  notes?: string;
  history?: { status: string; by_name?: string; at: string; notes?: string }[];
  createdAt: string;
  customer?: PatientCustomer | null;
  profile?: Pick<PatientProfile, "patient_number" | "national_id"> | null;
}

export const fetchPayers = async (activeOnly = false, permission = "HEALTHCARE_CLAIMS_VIEW") =>
  unwrap<Payer[]>(
    await axiosInstance.get(hc("/payers"), { params: { active: activeOnly ? "true" : undefined }, ...as(permission) })
  );

export const createPayer = async (body: Partial<Payer>) =>
  unwrap<Payer>(await axiosInstance.post(hc("/payers"), body, as("HEALTHCARE_PAYERS_MANAGE")));

export const updatePayer = async (id: string, body: Partial<Payer>) =>
  unwrap<Payer>(await axiosInstance.patch(hc(`/payers/${id}`), body, as("HEALTHCARE_PAYERS_MANAGE")));

export const fetchClaims = async (params: { status?: ClaimStatus | "outstanding"; payer_id?: string; customer_id?: string } = {}) =>
  unwrap<Claim[]>(await axiosInstance.get(hc("/claims"), { params, ...as("HEALTHCARE_CLAIMS_VIEW") }));

export const fetchClaim = async (id: string) => unwrap<Claim>(await axiosInstance.get(hc(`/claims/${id}`), as("HEALTHCARE_CLAIMS_VIEW")));

export const fetchVisitClaimLines = async (visitId: string) =>
  unwrap<{
    lines: ClaimLine[];
    payer_id?: string | null;
    scheme_id?: string | null;
    member_number: string;
    principal_member: string;
    diagnoses: { code?: string; description: string }[];
  }>(await axiosInstance.get(hc("/claims/visit-lines"), { params: { visit_id: visitId }, ...as("HEALTHCARE_CLAIMS_MANAGE") }));

export const createClaim = async (body: {
  visit_id?: string;
  customer_id?: string;
  payer_id: string;
  scheme_id?: string;
  member_number?: string;
  principal_member?: string;
  preauth_number?: string;
  lines: ClaimLine[];
  notes?: string;
}) => unwrap<Claim>(await axiosInstance.post(hc("/claims"), body, as("HEALTHCARE_CLAIMS_MANAGE")));

export const updateClaim = async (id: string, body: Partial<Pick<Claim, "member_number" | "principal_member" | "preauth_number" | "notes" | "lines">>) =>
  unwrap<Claim>(await axiosInstance.patch(hc(`/claims/${id}`), body, as("HEALTHCARE_CLAIMS_MANAGE")));

export const submitClaim = async (id: string) =>
  unwrap<Claim>(await axiosInstance.post(hc(`/claims/${id}/submit`), {}, as("HEALTHCARE_CLAIMS_MANAGE")));

export const approveClaim = async (id: string, approvedAmount?: number) =>
  unwrap<Claim>(await axiosInstance.post(hc(`/claims/${id}/approve`), { approved_amount: approvedAmount }, as("HEALTHCARE_CLAIMS_MANAGE")));

export const rejectClaim = async (id: string, reason: string) =>
  unwrap<Claim>(await axiosInstance.post(hc(`/claims/${id}/reject`), { reason }, as("HEALTHCARE_CLAIMS_MANAGE")));

export const recordClaimPayment = async (id: string, body: { amount: number; date?: string; reference?: string }) =>
  unwrap<Claim>(await axiosInstance.post(hc(`/claims/${id}/payments`), body, as("HEALTHCARE_CLAIMS_MANAGE")));

// ─── Reports ─────────────────────────────────────────────────────────────────

export type HealthcareReportKind = "visits" | "morbidity" | "lab" | "dispensing" | "expiry" | "claims" | "ageing";

/** Rows of a healthcare register or return (Reports page → Healthcare). */
export const fetchHealthcareReportRows = async (
  kind: HealthcareReportKind,
  params: { from?: string; to?: string; department?: LabDepartment; days?: number; payer_id?: string; status?: string } = {}
) => unwrap<Record<string, unknown>[]>(await axiosInstance.get(hc(`/reports/${kind}`), { params, ...as("HEALTHCARE_REPORTS_VIEW") }));
