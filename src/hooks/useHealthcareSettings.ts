import { useQuery } from "@tanstack/react-query";
import { fetchSystemSetupDetailsById } from "@services/systemsetup";
import { usePOSMode } from "@context/POSModeContext";
import { facilityWords, rememberFacilityType, type FacilityType, type FacilityWords } from "@utils/healthcareFacility";

/**
 * The shop's Healthcare add-on switches (System Setup → Healthcare). The
 * add-on only applies to hospital-mode shops, and feature flags only count
 * while the add-on itself is on, so callers can use them directly.
 */
export interface HealthcareSettings {
  enabled: boolean;
  /** What kind of branch this is (chemist, clinic, diagnostic centre, hospital) */
  facilityType: FacilityType;
  words: FacilityWords;
  patientRecords: boolean;
  visits: boolean;
  triage: boolean;
  clinicalNotes: boolean;
  prescriptions: boolean;
  batchTracking: boolean;
  lab: boolean;
  radiology: boolean;
  /** Lab or imaging — either one makes ordering tests possible */
  diagnostics: boolean;
  insurance: boolean;
  blockExpiredDispensing: boolean;
  nearExpiryDays: number;
  patientNumberPrefix: string;
}

export const HEALTHCARE_SETTINGS_QUERY_KEY = "healthcare-settings";

const OFF: HealthcareSettings = {
  enabled: false,
  facilityType: "custom",
  words: facilityWords("custom"),
  patientRecords: false,
  visits: false,
  triage: false,
  clinicalNotes: false,
  prescriptions: false,
  batchTracking: false,
  lab: false,
  radiology: false,
  diagnostics: false,
  insurance: false,
  blockExpiredDispensing: true,
  nearExpiryDays: 90,
  patientNumberPrefix: "PT",
};

export function useHealthcareSettings(): HealthcareSettings & { isLoading: boolean } {
  const { isHospitalMode } = usePOSMode();
  const shopId = localStorage.getItem("shopId");
  const validShop = !!shopId && shopId !== "null" && shopId !== "undefined" && shopId !== "{}";

  const { data, isLoading } = useQuery({
    queryKey: [HEALTHCARE_SETTINGS_QUERY_KEY, shopId],
    queryFn: async (): Promise<HealthcareSettings> => {
      const settings = await fetchSystemSetupDetailsById();
      const hs = settings?.healthcare_settings ?? {};
      const facilityType: FacilityType = hs.facility_type ?? "custom";
      rememberFacilityType(facilityType);
      if (!hs.enabled) return OFF;
      // Batch tracking, lab, imaging and insurance default off; the rest on (matches the API)
      return {
        enabled: true,
        facilityType,
        words: facilityWords(facilityType),
        patientRecords: hs.patient_records_enabled !== false,
        visits: hs.visits_enabled !== false,
        triage: hs.visits_enabled !== false && hs.triage_enabled !== false,
        clinicalNotes: hs.visits_enabled !== false && hs.clinical_notes_enabled !== false,
        prescriptions: hs.prescriptions_enabled !== false,
        batchTracking: hs.batch_tracking_enabled === true,
        lab: hs.lab_enabled === true,
        radiology: hs.radiology_enabled === true,
        diagnostics: hs.lab_enabled === true || hs.radiology_enabled === true,
        insurance: hs.insurance_enabled === true,
        blockExpiredDispensing: hs.block_expired_dispensing !== false,
        nearExpiryDays: hs.near_expiry_days ?? 90,
        patientNumberPrefix: hs.patient_number_prefix || "PT",
      };
    },
    enabled: validShop && isHospitalMode,
    staleTime: 5 * 60_000,
  });

  if (!isHospitalMode) return { ...OFF, isLoading: false };
  return { ...(data ?? OFF), isLoading };
}
