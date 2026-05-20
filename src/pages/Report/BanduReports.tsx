import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ── Redirect to new Bandu Reports Page ───────────────────────────────────────────────
const BanduReports: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new standalone Bandu reports page
    navigate("/hr/reports", { replace: true });
  }, [navigate]);

  return null;
};

export default BanduReports;
