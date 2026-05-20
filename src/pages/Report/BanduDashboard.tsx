import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ── Redirect to new Bandu HR Dashboard ───────────────────────────────────────────────
const BanduHRDashboard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new standalone Bandu dashboard
    navigate("/hr/dashboard", { replace: true });
  }, [navigate]);

  return null;
};

export default BanduHRDashboard;
