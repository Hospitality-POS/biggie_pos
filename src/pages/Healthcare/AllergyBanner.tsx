import React from "react";
import { Alert, Tag } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import type { Allergy, AllergyWarning } from "@services/healthcare";

const SEVERITY_COLOR = { mild: "gold", moderate: "orange", severe: "red" } as const;

/** The patient's allergies, always shown at the top of clinical screens. */
export const AllergyBanner: React.FC<{ allergies?: Allergy[] }> = ({ allergies }) => {
  if (!allergies?.length) return null;
  return (
    <Alert
      type="error"
      showIcon
      icon={<WarningOutlined />}
      message="Allergies"
      description={
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {allergies.map((a) => (
            <Tag key={a.substance} color={SEVERITY_COLOR[a.severity ?? "moderate"]}>
              {a.substance}
              {a.reaction ? ` — ${a.reaction}` : ""}
            </Tag>
          ))}
        </div>
      }
    />
  );
};

/** Medicines on a prescription that match the patient's allergies. */
export const AllergyWarnings: React.FC<{ warnings?: AllergyWarning[] }> = ({ warnings }) => {
  if (!warnings?.length) return null;
  return (
    <Alert
      type="error"
      showIcon
      message="Check before dispensing: possible allergy"
      description={
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {warnings.map((w) => (
            <li key={`${w.item_name}-${w.substance}`}>
              <b>{w.item_name}</b> — patient is allergic to <b>{w.substance}</b>
              {w.severity ? ` (${w.severity})` : ""}
              {w.reaction ? `: ${w.reaction}` : ""}
            </li>
          ))}
        </ul>
      }
    />
  );
};
