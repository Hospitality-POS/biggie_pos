import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "../../../store";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

// Generic protected route component that can handle both regular and admin routes
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { user } = useAppSelector((state) => state.auth);
  const shopId = localStorage.getItem("shopId");
  const companyCode = localStorage.getItem("companyCode");

  const location = useLocation();

  if (!user) {
    // Redirect unauthenticated users to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && user.role !== "admin") {
    // Redirect non-admin users trying to access admin routes
    return <Navigate to="/tables" replace />;
  }

  return <>{children}</>;
};

// Component for regular protected routes
export const Private: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const shopId = localStorage.getItem("shopId");
  const companyCode = localStorage.getItem("companyCode");

  if (!shopId || !companyCode) {
    return <Navigate to="/login" replace />;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
};

// Component for admin-only routes
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Check subscription status before admin access
  try {
    const tenantData = localStorage.getItem("tenant");
    if (tenantData) {
      const tenant = JSON.parse(tenantData);
      if (tenant.subscription_status === "suspended") {
        return <Navigate to="/billing" replace />;
      }
    }
  } catch (error) {
    console.error("Error checking subscription status:", error);
  }

  return <ProtectedRoute requireAdmin>{children}</ProtectedRoute>;
};

export default Private;
