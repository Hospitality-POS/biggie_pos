import React from "react";
import DashboardAdminPage from "./DashboardPage";

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
 * AdminDukaDashboardPage
 *
 * Standalone admin dashboard page for Duka (POS) platform oversight.
 * Renders cross-branch POS metrics, charts, and operational hub directly
 * without multi-module tabs.
 */
const AdminDukaDashboardPage: React.FC = () => {
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        padding: isMobile ? "6px 4px" : "16px 24px",
        background: "#f8fafc",
        minHeight: "100%",
      }}
    >
      <DashboardAdminPage />
    </div>
  );
};

export default AdminDukaDashboardPage;
