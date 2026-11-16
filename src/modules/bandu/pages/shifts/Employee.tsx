import React, { useMemo } from "react";
import { LockOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import RestaurantShiftSchedule from "./RestaurantShiftSchedule";
import { getPermissionChecker } from "@utils/getPermissionChecker";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;

const C = THEME_C;

// ── Permission locked placeholder ─────────────────────────────────────────────
const PermissionLockedTab: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "60px 24px", textAlign: "center",
    border: `1px solid ${C.border}`, borderRadius: 12, background: C.white,
  }}>
    <div style={{
      width: 64, height: 64, borderRadius: 16, background: "#f8fafc",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 28, color: "#cbd5e1", marginBottom: 20,
    }}>
      <LockOutlined />
    </div>
    <Text strong style={{ fontSize: 16, color: C.darkText, display: "block", marginBottom: 8 }}>
      Access restricted
    </Text>
    <Text style={{ fontSize: 13, color: C.subText, maxWidth: 360, lineHeight: 1.6 }}>
      You don't have permission to access <strong>{label}</strong>.
      Contact your administrator to request access.
    </Text>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
// Leave, attendance and payroll live in Bandu (HR); this page is the shift
// schedule only.
const EmployeePage: React.FC = () => {
  // Admin users bypass all checks via makePermissionChecker(isAdmin=true)
  const can = useMemo(() => getPermissionChecker(), []);

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      {can("SHIFTS_VIEW")
        ? <RestaurantShiftSchedule />
        : <PermissionLockedTab label="Shifts" />}
    </div>
  );
};

export default EmployeePage;
