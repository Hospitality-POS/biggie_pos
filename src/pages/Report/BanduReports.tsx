import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ── Redirect to unified reports page ───────────────────────────────────────────────
const BanduReports: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the unified reports page
    navigate("/admin/reports", { replace: true });
  }, [navigate]);

  return null;
};

export default BanduReports;
