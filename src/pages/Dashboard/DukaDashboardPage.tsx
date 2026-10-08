import React from "react";
import Dashboard from "./Dashboard";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

/**
 * DukaDashboardPage
 *
 * Standalone dashboard page for Duka (POS).
 * Renders Duka's performance metrics, KPIs, charts, and operational hub directly
 * without multi-module tabs, consistent with Pesa, Mteja, Bandu, and Dala.
 */
const DukaDashboardPage: React.FC = () => {
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        padding: isMobile ? "6px 4px" : "16px 24px",
        background: "#f8fafc",
        minHeight: "100%",
      }}
    >
      <Dashboard />
    </div>
  );
};

export default DukaDashboardPage;
