import React, { useEffect, useState } from "react";
import { Switch, Space, Typography, Alert, Spin, InputNumber, Input, Button, Modal, message } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  MedicineBoxOutlined,
  IdcardOutlined,
  TeamOutlined,
  HeartOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  CalendarOutlined,
  StopOutlined,
  ShopOutlined,
  BankOutlined,
  CheckCircleFilled,
  ScanOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { fetchSystemSetupDetailsById, updateSystemSetup } from "../../../services/systemsetup";
import { HEALTHCARE_SETTINGS_QUERY_KEY } from "../../../hooks/useHealthcareSettings";
import { FACILITY_PRESETS, type FacilityPreset, type FacilityType } from "@utils/healthcareFacility";
import { THEME_C } from "../../../utils/getPrimaryColor";

const { Text } = Typography;

const C = THEME_C;

type HealthcareFlag =
  | "enabled"
  | "patient_records_enabled"
  | "visits_enabled"
  | "triage_enabled"
  | "clinical_notes_enabled"
  | "prescriptions_enabled"
  | "batch_tracking_enabled"
  | "lab_enabled"
  | "radiology_enabled"
  | "insurance_enabled"
  | "block_expired_dispensing";

type HealthcareSettingsState = Record<HealthcareFlag, boolean> & {
  facility_type: FacilityType;
  near_expiry_days: number;
  patient_number_prefix: string;
};

// Mirrors the API defaults: the add-on itself is off; once it is on, every
// feature but batch tracking is available straight away.
const DEFAULTS: HealthcareSettingsState = {
  enabled: false,
  patient_records_enabled: true,
  visits_enabled: true,
  triage_enabled: true,
  clinical_notes_enabled: true,
  prescriptions_enabled: true,
  batch_tracking_enabled: false,
  lab_enabled: false,
  radiology_enabled: false,
  insurance_enabled: false,
  block_expired_dispensing: true,
  near_expiry_days: 90,
  patient_number_prefix: "PT",
  facility_type: "custom",
};

const FACILITY_ICONS: Record<FacilityPreset["type"], React.ReactNode> = {
  pharmacy: <ShopOutlined />,
  clinic: <MedicineBoxOutlined />,
  diagnostic: <ExperimentOutlined />,
  hospital: <BankOutlined />,
};

const SectionLabel: React.FC<{ text: string }> = ({ text }) => (
  <Text
    style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: "#94a3b8",
      display: "block",
      marginBottom: 10,
    }}
  >
    {text}
  </Text>
);

const ToggleRow: React.FC<{
  icon: React.ReactNode;
  color: string;
  bg: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  loading?: boolean;
  disabled?: boolean;
}> = ({ icon, color, bg, title, description, checked, onChange, loading, disabled }) => (
  <div
    style={{
      background: "#fff",
      border: `1px solid ${checked && !disabled ? `${color}33` : "#e2e8f0"}`,
      borderRadius: 10,
      padding: "14px 16px",
      opacity: disabled ? 0.55 : 1,
      transition: "border-color 0.15s ease, opacity 0.15s ease",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: bg,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 17,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: 14, display: "block", color: "#0f172a" }}>
          {title}
        </Text>
        <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginTop: 2, lineHeight: 1.5 }}>
          {description}
        </Text>
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        loading={loading}
        disabled={disabled}
        style={{ flexShrink: 0 }}
        checkedChildren="ON"
        unCheckedChildren="OFF"
      />
    </div>
  </div>
);

const HealthcareSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<HealthcareSettingsState>(DEFAULTS);
  const [systemSettingsId, setSystemSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState<number>(DEFAULTS.near_expiry_days);
  const [prefix, setPrefix] = useState<string>(DEFAULTS.patient_number_prefix);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchSystemSetupDetailsById(true);
        setSystemSettingsId(data?._id || null);
        const next = { ...DEFAULTS, ...(data?.healthcare_settings ?? {}) };
        setSettings(next);
        setExpiryDays(next.near_expiry_days);
        setPrefix(next.patient_number_prefix);
      } catch (error) {
        console.error("Failed to fetch healthcare settings:", error);
        message.error("Failed to load Healthcare settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async (key: string, patch: Partial<HealthcareSettingsState>, successMsg: string) => {
    if (!systemSettingsId) {
      message.error("System settings not found");
      return;
    }
    setUpdating(key);
    try {
      const result = await updateSystemSetup({
        _id: systemSettingsId,
        data: { healthcare_settings: patch },
      });
      // updateSystemSetup swallows errors and returns undefined
      if (!result) return;
      setSettings((prev) => ({ ...prev, ...patch }));
      // The POS menus show Healthcare screens from these flags
      queryClient.invalidateQueries({ queryKey: [HEALTHCARE_SETTINGS_QUERY_KEY] });
      message.success(successMsg);
    } finally {
      setUpdating(null);
    }
  };

  const handleToggle = (flag: HealthcareFlag, successMsg: (checked: boolean) => string) => (checked: boolean) =>
    save(flag, { [flag]: checked }, successMsg(checked));

  /** Choosing the kind of branch switches on just the features it uses. */
  const chooseFacility = (preset: FacilityPreset) => {
    const apply = () =>
      save(
        `facility-${preset.type}`,
        { enabled: true, facility_type: preset.type, ...preset.flags },
        `Set up as ${preset.title}`
      );
    if (!settings.enabled || settings.facility_type === "custom" || settings.facility_type === preset.type) {
      apply();
      return;
    }
    Modal.confirm({
      title: `Set this branch up as ${preset.title}?`,
      content: "The features below change to suit it. Nothing already saved is deleted; switched-off screens are just hidden.",
      okText: "Change",
      onOk: apply,
    });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  const off = !settings.enabled;
  const prefixClean = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

  return (
    <ProCard
      bordered
      title={
        <Space>
          <MedicineBoxOutlined style={{ color: C.primary }} />
          <Text strong>Healthcare</Text>
        </Space>
      }
      bodyStyle={{ padding: "14px 16px" }}
    >
      <Space direction="vertical" size={24} style={{ width: "100%" }}>
        <div>
          <SectionLabel text="Add-on" />
          <ToggleRow
            icon={<MedicineBoxOutlined />}
            color="#0ea5e9"
            bg="#f0f9ff"
            title={settings.enabled ? "Healthcare Add-on Active" : "Healthcare Add-on Off"}
            description="For clinics, pharmacies and hospitals: patient records, a patient queue from reception to the pharmacy, prescriptions and medicine expiry. Adds Queue and Pharmacy tabs next to Billing on the POS screen."
            checked={settings.enabled}
            onChange={handleToggle("enabled", (c) => (c ? "Healthcare activated" : "Healthcare turned off"))}
            loading={updating === "enabled"}
          />
        </div>

        <div>
          <SectionLabel text="What kind of facility is this branch?" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
            {FACILITY_PRESETS.map((preset) => {
              const chosen = settings.enabled && settings.facility_type === preset.type;
              return (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => chooseFacility(preset)}
                  disabled={!!updating}
                  style={{
                    textAlign: "left",
                    background: chosen ? "#f0f9ff" : "#fff",
                    border: `1.5px solid ${chosen ? "#0ea5e9" : "#e2e8f0"}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    cursor: updating ? "wait" : "pointer",
                    font: "inherit",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#0ea5e9", fontSize: 16 }}>{FACILITY_ICONS[preset.type]}</span>
                    <Text strong>{preset.title}</Text>
                    {chosen && <CheckCircleFilled style={{ color: "#0ea5e9", marginLeft: "auto" }} />}
                  </div>
                  <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginTop: 4, lineHeight: 1.5 }}>{preset.description}</Text>
                </button>
              );
            })}
          </div>
          <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 8 }}>
            Choosing one switches on only what that kind of branch uses and sets the POS tabs and wording (a chemist sees Customers and Billing first).
            You can still switch single features on or off below.
          </Text>
        </div>

        <div>
          <SectionLabel text="Patients & visits (clinic)" />
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <ToggleRow
              icon={<IdcardOutlined />}
              color="#2563eb"
              bg="#eff6ff"
              title="Patient Records"
              description="Adds a Medical tab to each patient in Customers: patient number, ID number, blood group, allergies, chronic conditions, next of kin and insurance."
              checked={settings.patient_records_enabled}
              onChange={handleToggle("patient_records_enabled", (c) => (c ? "Patient Records turned on" : "Patient Records turned off"))}
              loading={updating === "patient_records_enabled"}
              disabled={off}
            />
            <ToggleRow
              icon={<TeamOutlined />}
              color="#7c3aed"
              bg="#f5f3ff"
              title="Patient Queue & Visits"
              description="Check patients in at reception and move them through triage, the doctor, the pharmacy and billing, with a running history of each visit."
              checked={settings.visits_enabled}
              onChange={handleToggle("visits_enabled", (c) => (c ? "Patient Queue turned on" : "Patient Queue turned off"))}
              loading={updating === "visits_enabled"}
              disabled={off}
            />
            <ToggleRow
              icon={<HeartOutlined />}
              color="#e11d48"
              bg="#fff1f2"
              title="Triage Vitals"
              description="Record temperature, pulse, blood pressure, oxygen, weight, height and blood sugar on each visit."
              checked={settings.triage_enabled}
              onChange={handleToggle("triage_enabled", (c) => (c ? "Triage turned on" : "Triage turned off"))}
              loading={updating === "triage_enabled"}
              disabled={off || !settings.visits_enabled}
            />
            <ToggleRow
              icon={<FileTextOutlined />}
              color="#0d9488"
              bg="#f0fdfa"
              title="Clinical Notes & Diagnosis"
              description="The doctor's complaints, history, examination, plan and diagnoses (ICD-10 optional). Only staff with the clinical notes permission can see them."
              checked={settings.clinical_notes_enabled}
              onChange={handleToggle("clinical_notes_enabled", (c) => (c ? "Clinical Notes turned on" : "Clinical Notes turned off"))}
              loading={updating === "clinical_notes_enabled"}
              disabled={off || !settings.visits_enabled}
            />
          </Space>
        </div>

        <div>
          <SectionLabel text="Pharmacy" />
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <ToggleRow
              icon={<ExperimentOutlined />}
              color="#16a34a"
              bg="#f0fdf4"
              title="Prescriptions & Dispensing"
              description="Doctors prescribe from stock with dose, frequency and duration; the pharmacy dispenses, gets allergy warnings, and adds what was given to the bill."
              checked={settings.prescriptions_enabled}
              onChange={handleToggle("prescriptions_enabled", (c) => (c ? "Prescriptions turned on" : "Prescriptions turned off"))}
              loading={updating === "prescriptions_enabled"}
              disabled={off}
            />
            <ToggleRow
              icon={<CalendarOutlined />}
              color="#f59e0b"
              bg="#fffbeb"
              title="Batch & Expiry Tracking"
              description="Record the batch number and expiry date of medicine as it comes in, under Inventory → Batches & Expiry. Dispensing takes the soonest-expiring batch first."
              checked={settings.batch_tracking_enabled}
              onChange={handleToggle("batch_tracking_enabled", (c) => (c ? "Batch tracking turned on" : "Batch tracking turned off"))}
              loading={updating === "batch_tracking_enabled"}
              disabled={off}
            />
            <ToggleRow
              icon={<StopOutlined />}
              color="#dc2626"
              bg="#fef2f2"
              title="Block Dispensing From Expired Batches"
              description="Refuse to dispense from a batch past its expiry date. When off, the pharmacist can still pick an expired batch on purpose."
              checked={settings.block_expired_dispensing}
              onChange={handleToggle("block_expired_dispensing", (c) =>
                c ? "Expired batches can no longer be dispensed" : "Expired batches can be dispensed on purpose"
              )}
              loading={updating === "block_expired_dispensing"}
              disabled={off || !settings.batch_tracking_enabled}
            />
          </Space>
        </div>

        <div>
          <SectionLabel text="Lab & imaging" />
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <ToggleRow
              icon={<ExperimentOutlined />}
              color="#7c3aed"
              bg="#f5f3ff"
              title="Laboratory"
              description="Doctors order lab tests on a visit. The lab collects the sample, enters results, which are flagged against reference ranges, and the patient goes back to the doctor. Adds a Lab tab next to the queue."
              checked={settings.lab_enabled}
              onChange={handleToggle("lab_enabled", (c) => (c ? "Laboratory turned on" : "Laboratory turned off"))}
              loading={updating === "lab_enabled"}
              disabled={off}
            />
            <ToggleRow
              icon={<ScanOutlined />}
              color="#0891b2"
              bg="#ecfeff"
              title="Imaging (X-ray, ultrasound, scans)"
              description="Doctors order imaging on a visit and the radiographer writes the report, in the same Lab tab."
              checked={settings.radiology_enabled}
              onChange={handleToggle("radiology_enabled", (c) => (c ? "Imaging turned on" : "Imaging turned off"))}
              loading={updating === "radiology_enabled"}
              disabled={off}
            />
          </Space>
        </div>

        <div>
          <SectionLabel text="Insurance" />
          <ToggleRow
            icon={<SafetyCertificateOutlined />}
            color="#2563eb"
            bg="#eff6ff"
            title="Insurance & Claims"
            description="Set up insurers, corporate and government payers with their schemes, co-pay and pre-authorisation rules. Reception picks the payer at check-in, and claims are built from what was given on the visit and tracked until paid."
            checked={settings.insurance_enabled}
            onChange={handleToggle("insurance_enabled", (c) => (c ? "Insurance & Claims turned on" : "Insurance & Claims turned off"))}
            loading={updating === "insurance_enabled"}
            disabled={off}
          />
        </div>

        <div>
          <SectionLabel text="Numbers & alerts" />
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <Text style={{ minWidth: 220 }}>Patient number prefix</Text>
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                maxLength={10}
                style={{ width: 120 }}
                disabled={off}
              />
              <Text type="secondary" style={{ fontSize: 12.5 }}>
                e.g. {prefixClean || "PT"}-000123
              </Text>
              <Button
                size="small"
                disabled={off || !prefixClean || prefixClean === settings.patient_number_prefix}
                loading={updating === "patient_number_prefix"}
                onClick={() => save("patient_number_prefix", { patient_number_prefix: prefixClean }, "Patient number prefix saved")}
              >
                Save
              </Button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <Text style={{ minWidth: 220 }}>Warn this many days before expiry</Text>
              <InputNumber
                min={1}
                max={730}
                value={expiryDays}
                onChange={(v) => setExpiryDays(Number(v) || 1)}
                style={{ width: 120 }}
                disabled={off || !settings.batch_tracking_enabled}
              />
              <Button
                size="small"
                disabled={off || !settings.batch_tracking_enabled || expiryDays === settings.near_expiry_days}
                loading={updating === "near_expiry_days"}
                onClick={() => save("near_expiry_days", { near_expiry_days: expiryDays }, "Expiry warning saved")}
              >
                Save
              </Button>
            </div>
          </Space>
        </div>

        <Alert
          type="info"
          showIcon
          message="Only for clinics, pharmacies and hospitals"
          description="This add-on only shows for branches in hospital mode and stays off unless you switch it on here. Turning something off hides its screens but keeps every patient record, visit, prescription and batch already saved. Give staff access under Roles → Healthcare."
        />
      </Space>
    </ProCard>
  );
};

export default HealthcareSettings;
