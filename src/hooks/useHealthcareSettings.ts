import { useQuery } from "@tanstack/react-query";
import { fetchSystemSetupDetailsById } from "@services/systemsetup";
import { usePOSMode } from "@context/POSModeContext";

/**
 * The shop's Healthcare add-on switches (System Setup → Healthcare). The
 * add-on only applies to hospital-mode shops, and feature flags only count
 * while the add-on itself is on, so callers can use them directly.
 */
export interface HealthcareSettings {
  enabled: boolean;
  patientRecords: boolean;
  visits: boolean;
  triage: boolean;
  clinicalNotes: boolean;
  prescriptions: boolean;
  batchTracking: boolean;
  blockExpiredDispensing: boolean;
  nearExpiryDays: number;
  patientNumberPrefix: string;
}

export const HEALTHCARE_SETTINGS_QUERY_KEY = "healthcare-settings";

const OFF: HealthcareSettings = {
  enabled: false,
  patientRecords: false,
  visits: false,
  triage: false,
  clinicalNotes: false,
  prescriptions: false,
  batchTracking: false,
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
      if (!hs.enabled) return OFF;
      // Everything but batch tracking defaults on (matches the API defaults)
      return {
        enabled: true,
        patientRecords: hs.patient_records_enabled !== false,
        visits: hs.visits_enabled !== false,
        triage: hs.visits_enabled !== false && hs.triage_enabled !== false,
        clinicalNotes: hs.visits_enabled !== false && hs.clinical_notes_enabled !== false,
        prescriptions: hs.prescriptions_enabled !== false,
        batchTracking: hs.batch_tracking_enabled === true,
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
