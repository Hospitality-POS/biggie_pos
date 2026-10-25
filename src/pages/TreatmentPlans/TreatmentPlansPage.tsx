import React, { useState } from "react";
import { Grid, Segmented, Typography } from "antd";
import { ScheduleOutlined, AppstoreOutlined, TeamOutlined } from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";
import PlansList from "./PlansList";
import PlanTemplates from "./PlanTemplates";

const { Title, Text } = Typography;
const C = THEME_C;

const TreatmentPlansPage: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [view, setView] = useState<"plans" | "templates">("plans");

  return (
    <div style={{ padding: isMobile ? 12 : "16px 24px", background: C.bg, minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div
          style={{
            width: isMobile ? 40 : 46,
            height: isMobile ? 40 : 46,
            borderRadius: 12,
            background: "linear-gradient(135deg, #f0fdfa 0%, #f5f3ff 100%)",
            color: "#0d9488",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isMobile ? 19 : 22,
          }}
        >
          <ScheduleOutlined />
        </div>
        <div>
          <Title level={isMobile ? 5 : 4} style={{ margin: 0, letterSpacing: -0.3 }}>
            Treatment Plans
          </Title>
          <Text style={{ fontSize: isMobile ? 11.5 : 13, color: C.subText }}>
            Courses of treatment for each client — sessions, products used and progress
          </Text>
        </div>
      </div>

      <Segmented
        value={view}
        onChange={(v) => setView(v as "plans" | "templates")}
        options={[
          { value: "plans", label: "Client plans", icon: <TeamOutlined /> },
          { value: "templates", label: "Plan templates", icon: <AppstoreOutlined /> },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: isMobile ? 12 : 16 }}>
        {view === "plans" ? <PlansList showCustomer /> : <PlanTemplates />}
      </div>
    </div>
  );
};

export default TreatmentPlansPage;
