import React from "react";
import { Select, Space } from "antd";
import type {
  AgentZoneOption,
  ThermalPrintTarget,
} from "@hooks/useThermalAgentPrint";

interface ThermalPrintControlsProps {
  target: ThermalPrintTarget;
  onTargetChange: (t: ThermalPrintTarget) => void;
  zones: AgentZoneOption[];
  zoneKey?: string;
  onZoneChange: (key: string) => void;
  loading?: boolean;
}

/**
 * Print-destination picker shown next to report "Print" buttons when the
 * thermal view is active: Browser (system print dialog) or IP Printer —
 * where the printer is chosen by the zone a connected print agent serves,
 * matching how bill print jobs are routed.
 */
const ThermalPrintControls: React.FC<ThermalPrintControlsProps> = ({
  target,
  onTargetChange,
  zones,
  zoneKey,
  onZoneChange,
  loading,
}) => (
  <Space size={8} wrap>
    <Select
      size="small"
      value={target}
      onChange={onTargetChange}
      style={{ width: 118 }}
      options={[
        { value: "browser", label: "Browser" },
        { value: "agent", label: "IP Printer" },
      ]}
    />
    {target === "agent" && (
      <Select
        size="small"
        style={{ minWidth: 200 }}
        placeholder={loading ? "Checking printers…" : "Select zone / printer"}
        value={zoneKey ?? zones[0]?.key}
        onChange={onZoneChange}
        loading={loading}
        notFoundContent="No print agents connected"
        options={zones.map((z) => ({
          value: z.key,
          label: `${z.zone} · ${z.deviceName}`,
        }))}
      />
    )}
  </Space>
);

export default ThermalPrintControls;
