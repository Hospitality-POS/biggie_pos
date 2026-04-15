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
 *  - POS only           → Dashboard, Branch, Staff, POS Reports, Documents, Help
 *  - Accounting only    → Accounting Dashboard, Branch, Staff, CoA, Financial Reports, Documents, Help
 *  - Both active        → Dashboard, Branch, Staff, POS Reports, Accounting Dashboard, CoA, Financial Reports, Documents, Help
 *  - Mteja only         → Mteja Dashboard, Customers, Conversations, Branch, Staff, Documents, Help
 *  - Mteja + POS        → POS routes + Branch/Staff/Docs + Mteja block + Help
 *  - Mteja + Accounting → Accounting routes + Branch/Staff/Docs + Mteja block + Help
 *  - Mteja + both       → Combined routes + Mteja block + Help
 *
 * NOTE: Customers and Conversations are ONLY shown when Mteja is active.
 *       They are not shown in POS-only or Accounting-only nav.
 */
const useAdminProLayoutNav = () => {
  const storedTenant = localStorage.getItem("tenant");
  const storedUser = localStorage.getItem("user");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const user = storedUser ? JSON.parse(storedUser) : null;

  const userRole = user?.role?.toLowerCase();

  // ── Module flags ─────────────────────────────────────────────────────────────
  const hasPOS = tenant?.pos_integration?.enabled === true;
  const hasAccounting = tenant?.modules?.accounting === true;
  const hasMteja = tenant?.modules?.crm === true;
  const isMtejaOnly = hasMteja && !hasPOS && !hasAccounting;

  console.log("[AdminNav] Module check:", {
    "pos_integration.enabled": tenant?.pos_integration?.enabled,
    "modules.accounting": tenant?.modules?.accounting,
    "modules.crm": tenant?.modules?.crm,
    hasPOS,
    hasAccounting,
    hasMteja,
    isMtejaOnly,
  });

  // ── Common routes (always shown regardless of modules) ──────────────────────
  // NOTE: Customers & Conversations are intentionally NOT here —
  //       they only appear via mtejaRoutes when hasMteja is true.
  const commonRoutes = [
    { path: "/admin/shop-management", name: "Branch Management", icon: <ShopOutlined /> },
    { path: "/admin/staff-management", name: "Crew Management", icon: <UsergroupAddOutlined /> },

  ];

  // ── POS-specific routes ──────────────────────────────────────────────────────
  const posRoutes = [
    { path: "/admin/dashboard", name: "Dashboard", icon: <DashboardOutlined /> },
    ...(userRole === "admin"
      ? [{ path: "/admin/reports", name: "Business Reports", icon: <ReconciliationOutlined /> }]
      : []),
    { path: "/admin/documents", name: "Document Center", icon: <FileDoneOutlined /> },
  ];

  // ── Accounting-specific routes ───────────────────────────────────────────────
  const accountingRoutes = [
    { path: "/admin/accounting", name: "Accounting Dashboard", icon: <AccountBookOutlined /> },
    { path: "/admin/accounting/accounts", name: "Chart of Accounts", icon: <AuditOutlined /> },
    { path: "/admin/accounting/reports", name: "Financial Reports", icon: <FileTextOutlined /> },
    { path: "/admin/documents", name: "Document Center", icon: <FileDoneOutlined /> },
  ];

  // ── Mteja routes — ONLY injected when hasMteja is true ──────────────────────
  // Mteja Dashboard → Customers → Conversations
  const mtejaRoutes = [
    { path: "/admin/mteja", name: "Mteja Dashboard", icon: <CustomerServiceOutlined /> },
  ];

  // ── Help Center (always last) ────────────────────────────────────────────────
  const helpRoute = { path: "/admin/help-center", name: "Help Center", icon: <CompassOutlined /> };

  // ════════════════════════════════════════════════════════════════════════════
  // CASE 1: Mteja ONLY
  // Mteja Dashboard → Customers → Conversations → Branch → Staff → Documents → Help
  // ════════════════════════════════════════════════════════════════════════════
  if (isMtejaOnly) {
    console.log("[AdminNav] ✅ Mteja only");
    return {
      route: {
        path: "/admin",
        routes: [...mtejaRoutes, ...commonRoutes, helpRoute],
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CASE 2: Accounting only (no POS)
  // ════════════════════════════════════════════════════════════════════════════
  if (hasAccounting && !hasPOS) {
    console.log("[AdminNav] ✅ Accounting only" + (hasMteja ? " + Mteja" : ""));
    return {
      route: {
        path: "/admin",
        routes: [
          ...accountingRoutes,
          ...commonRoutes,
          ...(hasMteja ? mtejaRoutes : []),
          helpRoute,
        ],
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CASE 3: POS only (no Accounting)
  // ════════════════════════════════════════════════════════════════════════════
  if (hasPOS && !hasAccounting) {
    console.log("[AdminNav] ✅ POS only" + (hasMteja ? " + Mteja" : ""));
    return {
      route: {
        path: "/admin",
        routes: [
          ...posRoutes,
          ...commonRoutes,
          ...(hasMteja ? mtejaRoutes : []),
          helpRoute,
        ],
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CASE 4: Both POS + Accounting
  // ════════════════════════════════════════════════════════════════════════════
  if (hasPOS && hasAccounting) {
    console.log("[AdminNav] ✅ POS + Accounting" + (hasMteja ? " + Mteja" : ""));
    return {
      route: {
        path: "/admin",
        routes: [
          ...posRoutes,
          ...commonRoutes,
          ...accountingRoutes,
          ...(hasMteja ? mtejaRoutes : []),
          helpRoute,
        ],
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