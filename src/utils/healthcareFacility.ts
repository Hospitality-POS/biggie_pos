/**
 * Kinds of healthcare branch (System Setup → Healthcare). Each kind picks
 * the features it needs, the words the app uses and the order of the tabs
 * on the POS screen, so a chemist isn't handed a hospital's patient queue.
 * Features can still be adjusted one by one after choosing.
 */

export type FacilityType = "pharmacy" | "clinic" | "diagnostic" | "hospital" | "custom";

export type HealthcareFlag =
  | "patient_records_enabled"
  | "visits_enabled"
  | "triage_enabled"
  | "clinical_notes_enabled"
  | "prescriptions_enabled"
  | "batch_tracking_enabled"
  | "lab_enabled"
  | "radiology_enabled"
  | "insurance_enabled"
  | "inpatient_enabled";

export interface FacilityPreset {
  type: Exclude<FacilityType, "custom">;
  title: string;
  description: string;
  flags: Record<HealthcareFlag, boolean>;
}

export const FACILITY_PRESETS: FacilityPreset[] = [
  {
    type: "pharmacy",
    title: "Chemist / Pharmacy",
    description: "Sell over the counter, dispense prescriptions, track batches and expiry. No patient queue.",
    flags: {
      patient_records_enabled: true,
      visits_enabled: false,
      triage_enabled: false,
      clinical_notes_enabled: false,
      prescriptions_enabled: true,
      batch_tracking_enabled: true,
      lab_enabled: false,
      radiology_enabled: false,
      insurance_enabled: false,
      inpatient_enabled: false,
    },
  },
  {
    type: "clinic",
    title: "Clinic",
    description: "Outpatients: check-in, triage, the doctor, lab tests, a small pharmacy and insurance.",
    flags: {
      patient_records_enabled: true,
      visits_enabled: true,
      triage_enabled: true,
      clinical_notes_enabled: true,
      prescriptions_enabled: true,
      batch_tracking_enabled: false,
      lab_enabled: true,
      radiology_enabled: false,
      insurance_enabled: true,
      inpatient_enabled: false,
    },
  },
  {
    type: "diagnostic",
    title: "Lab / Diagnostic centre",
    description: "Patients come with a request form: register, test or scan, report, bill. No doctor or pharmacy.",
    flags: {
      patient_records_enabled: true,
      visits_enabled: true,
      triage_enabled: false,
      clinical_notes_enabled: false,
      prescriptions_enabled: false,
      batch_tracking_enabled: false,
      lab_enabled: true,
      radiology_enabled: true,
      insurance_enabled: true,
      inpatient_enabled: false,
    },
  },
  {
    type: "hospital",
    title: "Hospital / Medical centre",
    description: "Everything: queue, triage, doctors, lab and imaging, pharmacy, wards and admissions, insurance.",
    flags: {
      patient_records_enabled: true,
      visits_enabled: true,
      triage_enabled: true,
      clinical_notes_enabled: true,
      prescriptions_enabled: true,
      batch_tracking_enabled: true,
      lab_enabled: true,
      radiology_enabled: true,
      insurance_enabled: true,
      inpatient_enabled: true,
    },
  },
];

export interface FacilityWords {
  /** "Patient" or "Customer" */
  person: string;
  people: string;
  /** What a POS cart slot is called: a ward/bed in hospital, an order elsewhere */
  slot: string;
  newSlot: string;
}

export const facilityWords = (type: FacilityType): FacilityWords => {
  if (type === "pharmacy") return { person: "Customer", people: "Customers", slot: "Order", newSlot: "Open Another Order" };
  if (type === "clinic" || type === "diagnostic") return { person: "Patient", people: "Patients", slot: "Patient", newSlot: "Open Another Patient" };
  return { person: "Patient", people: "Patients", slot: "Ward / Bed", newSlot: "Open Another Patient" };
};

/** Tab order on the POS screen: the desk each kind of branch spends its day at comes first. */
export const facilityTabOrder = (type: FacilityType): string[] => {
  if (type === "pharmacy") return ["billing", "pharmacy", "claims", "queue", "lab", "wards"];
  if (type === "diagnostic") return ["queue", "lab", "billing", "claims", "pharmacy", "wards"];
  return ["queue", "lab", "pharmacy", "wards", "billing", "claims"];
};

const STORAGE_KEY = "healthcareFacility";

/** For code outside React (menus built from localStorage): the last loaded facility type. */
export const getFacilityType = (): FacilityType => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "pharmacy" || v === "clinic" || v === "diagnostic" || v === "hospital" ? v : "custom";
  } catch {
    return "custom";
  }
};

export const rememberFacilityType = (type: FacilityType) => {
  try {
    localStorage.setItem(STORAGE_KEY, type);
  } catch {
    // ignore — wording falls back to the hospital defaults
  }
};

/** What to call the branch on the dashboard: "Pharmacy", "Clinic", "Lab", "Hospital". */
export const facilityTitle = (type: FacilityType) =>
  type === "pharmacy" ? "Pharmacy" : type === "clinic" ? "Clinic" : type === "diagnostic" ? "Lab" : "Hospital";
