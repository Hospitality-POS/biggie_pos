import {
  AccountBookOutlined,
  AuditOutlined,
  CompassOutlined,
  DashboardOutlined,
  FileTextOutlined,
  FileDoneOutlined,
  ReconciliationOutlined,
  ShopOutlined,
  UsergroupAddOutlined,
  CustomerServiceOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { PeopleOutlined as MuiPeopleOutlined } from "@mui/icons-material";

/**
 * AdminDefaultprops.tsx — Admin Layout (path="/admin")
 *
 * Module rules:
 *  - Duka (POS) only              → Dashboard, Branch, Staff, POS Reports, Documents, Help
 *  - Pesa (Accounting) only       → Accounting Dashboard, Branch, Staff, CoA, Financial Reports, Documents, Help
 *  - Duka + Pesa both active      → Dashboard, Branch, Staff, POS Reports, Accounting Dashboard, CoA, Financial Reports, Documents, Help
 *  - Mteja (CRM) ONLY             → Mteja Dashboard, Customers, Conversations, Branch, Staff, Documents, Help
 *  - Mteja + ANY other module     → NO Mteja routes at all (only the other module(s) + Branch/Staff/Docs + Help)
 *
 * NOTE: Mteja Dashboard is ONLY shown when Mteja is the SOLE active module.
 *       If Duka (POS) OR Pesa (Accounting) is enabled, ALL Mteja routes are completely hidden.
 */
const useAdminProLayoutNav = () => {
  const storedTenant = localStorage.getItem("tenant");
  const storedUser = localStorage.getItem("user");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const user = storedUser ? JSON.parse(storedUser) : null;

  const userRole = user?.role?.toLowerCase();

  // ── Module flags ─────────────────────────────────────────────────────────────
  const hasDuka = tenant?.pos_integration?.enabled === true;      // Duka = POS
  const hasPesa = tenant?.modules?.accounting === true;           // Pesa = Accounting
  const hasMteja = tenant?.modules?.crm === true;                 // Mteja = CRM

  // Mteja is ONLY shown when it's the ONLY module enabled (no Duka, no Pesa)
  const isMtejaOnly = hasMteja && !hasDuka && !hasPesa;

  console.log("[AdminNav] Module check:", {
    "Duka (POS)": tenant?.pos_integration?.enabled,
    "Pesa (Accounting)": tenant?.modules?.accounting,
    "Mteja (CRM)": tenant?.modules?.crm,
    hasDuka,
    hasPesa,
    hasMteja,
    isMtejaOnly,
  });

  // ── Common routes (always shown regardless of modules) ──────────────────────
  const commonRoutes = [
    { path: "/admin/shop-management", name: "Branch Management", icon: <ShopOutlined /> },
    { path: "/admin/staff-management", name: "Crew Management", icon: <UsergroupAddOutlined /> },
  ];

  // ── Duka (POS) routes ──────────────────────────────────────────────────────
  const dukaRoutes = [
    { path: "/admin/dashboard", name: "Dashboard", icon: <DashboardOutlined /> },
    ...(userRole === "admin"
      ? [{ path: "/admin/reports", name: "Business Reports", icon: <ReconciliationOutlined /> }]
      : []),
    { path: "/admin/documents", name: "Document Center", icon: <FileDoneOutlined /> },
  ];

  // ── Pesa (Accounting) routes ───────────────────────────────────────────────
  const pesaRoutes = [
    { path: "/admin/accounting", name: "Accounting Dashboard", icon: <AccountBookOutlined /> },
    { path: "/admin/accounting/accounts", name: "Chart of Accounts", icon: <AuditOutlined /> },
    { path: "/admin/accounting/reports", name: "Financial Reports", icon: <FileTextOutlined /> },
    { path: "/admin/documents", name: "Document Center", icon: <FileDoneOutlined /> },
  ];

  // ── Mteja (CRM) routes — ONLY included when Mteja is the SOLE module ────────
  const mtejaRoutes = [
    { path: "/admin/mteja", name: "Mteja Dashboard", icon: <CustomerServiceOutlined /> },
  ];

  // ── Help Center (always last) ────────────────────────────────────────────────
  const helpRoute = { path: "/admin/help-center", name: "Help Center", icon: <CompassOutlined /> };

  // ════════════════════════════════════════════════════════════════════════════
  // CASE 1: Mteja ONLY (no Duka, no Pesa)
  // Show: Mteja Dashboard → Customers → Conversations → Branch → Staff → Documents → Help
  // ════════════════════════════════════════════════════════════════════════════
  if (isMtejaOnly) {
    console.log("[AdminNav] ✅ Mteja ONLY - showing Mteja Dashboard and Mteja routes");
    return {
      route: {
        path: "/admin",
        routes: [...mtejaRoutes, ...commonRoutes, helpRoute],
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CASE 2: Duka only (POS only) - Mteja routes are COMPLETELY HIDDEN
  // ════════════════════════════════════════════════════════════════════════════
  if (hasDuka && !hasPesa) {
    console.log("[AdminNav] ✅ Duka only (POS only) - Mteja routes hidden" + (hasMteja ? " (Mteja exists but hidden)" : ""));
    return {
      route: {
        path: "/admin",
        routes: [...dukaRoutes, ...commonRoutes, helpRoute],
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CASE 3: Pesa only (Accounting only) - Mteja routes are COMPLETELY HIDDEN
  // ════════════════════════════════════════════════════════════════════════════
  if (hasPesa && !hasDuka) {
    console.log("[AdminNav] ✅ Pesa only (Accounting only) - Mteja routes hidden" + (hasMteja ? " (Mteja exists but hidden)" : ""));
    return {
      route: {
        path: "/admin",
        routes: [...pesaRoutes, ...commonRoutes, helpRoute],
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CASE 4: Both Duka + Pesa (POS + Accounting) - Mteja routes are COMPLETELY HIDDEN
  // ════════════════════════════════════════════════════════════════════════════
  if (hasDuka && hasPesa) {
    console.log("[AdminNav] ✅ Duka + Pesa (POS + Accounting) - Mteja routes hidden" + (hasMteja ? " (Mteja exists but hidden)" : ""));
    return {
      route: {
        path: "/admin",
        routes: [...dukaRoutes, ...commonRoutes, ...pesaRoutes, helpRoute],
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FALLBACK: No modules at all
  // ════════════════════════════════════════════════════════════════════════════
  console.log("[AdminNav] ⚠️ Fallback — no modules");
  return {
    route: {
      path: "/admin",
      routes: [...commonRoutes, helpRoute],
    },
  };
};

export default useAdminProLayoutNav;