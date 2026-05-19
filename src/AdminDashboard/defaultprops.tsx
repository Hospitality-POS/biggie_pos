import {
  DashboardOutlined,
  ShopOutlined,
  CustomerServiceOutlined,
  AuditOutlined,
  FileDoneOutlined,
  CompassOutlined,
  UsergroupAddOutlined,
  ReconciliationOutlined,
} from "@ant-design/icons";

/**
 * AdminDefaultprops.tsx — Admin Layout (path="/admin")
 *
 * Module rules:
 *  - Duka (POS) only         → Dashboard, Branch, Staff, POS Reports, Documents, Help
 *  - Pesa (Accounting) only  → Accounting Dashboard, Branch, Staff, CoA, Reports, Documents, Help
 *  - Duka + Pesa both        → Dashboard, Branch, Staff, POS Reports, Accounting Dashboard, CoA, Reports, Documents, Help
 *  - Mteja ONLY              → Mteja Dashboard, Branch, Staff, Help
 *  - Mteja + any other       → Mteja routes hidden; only the other module(s) show
 *
 * Router paths (Routers.tsx) — must match exactly:
 *  /admin/dashboard
 *  /admin/reports                    ← Unified reports page
 *  /admin/documents
 *  /admin/accounting                 ← Accounting dashboard
 *  /admin/accounting/accounts        ← Chart of Accounts  (was /admin/accounts — 404)
 *  /admin/reports                    ← Unified reports page (includes POS, Accounting, CRM, HR)
 *  /admin/shop-management
 *  /admin/staff-management
 *  /admin/mteja
 *  /admin/help-center
 */
const useAdminProLayoutNav = () => {
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  // ── Module flags ──────────────────────────────────────────────────────────
  const hasDuka = tenant?.pos_integration?.enabled === true;
  const hasPesa = tenant?.modules?.accounting === true;
  const hasMteja = tenant?.modules?.crm === true;
  const hasDala = tenant?.modules?.dala === true;

  const isMtejaOnly = hasMteja && !hasDuka && !hasPesa && !hasDala;

  console.log("[AdminNav] Module check:", {
    "Duka (POS)": tenant?.pos_integration?.enabled,
    "Pesa (Accounting)": tenant?.modules?.accounting,
    "Mteja (CRM)": tenant?.modules?.crm,
    "Dala (Real Estate)": tenant?.modules?.dala,
    hasDuka,
    hasPesa,
    hasMteja,
    hasDala,
    isMtejaOnly,
  });

  // ── Common routes (always shown) ──────────────────────────────────────────
  const commonRoutes = [
    { path: "/admin/reports", name: "Reports", icon: <ReconciliationOutlined /> },
    { path: "/admin/shop-management", name: "Branch Management", icon: <ShopOutlined /> },
    { path: "/admin/staff-management", name: "Crew Management", icon: <UsergroupAddOutlined /> },
  ];

  // ── Duka (POS) routes ─────────────────────────────────────────────────────
  const dukaRoutes = [
    { path: "/admin/dashboard", name: "Dashboard", icon: <DashboardOutlined /> },
    { path: "/admin/documents", name: "Document Center", icon: <FileDoneOutlined /> },
  ];

  // ── Pesa (Accounting) routes ──────────────────────────────────────────────
  // FIX: paths now match router exactly
  //   /admin/accounts          → /admin/accounting/accounts  (was 404)
  //   /admin/dashboard         → Unified dashboard page (includes POS, Accounting, Mteja)
  const pesaRoutes = [
    { path: "/admin/dashboard", name: "Dashboard", icon: <DashboardOutlined /> },
    { path: "/admin/accounting/accounts", name: "Chart of Accounts", icon: <AuditOutlined /> },
    { path: "/admin/documents", name: "Document Center", icon: <FileDoneOutlined /> },
  ];

  // ── Mteja (CRM) routes — only when Mteja is the sole module ──────────────
  const mtejaRoutes = [
    { path: "/admin/mteja", name: "Mteja Dashboard", icon: <CustomerServiceOutlined /> },
  ];

  // ── Dala (Real Estate) routes ─────────────────────────────────────────────
  const dalaRoutes = [];

  // ── Help Center (always last) ─────────────────────────────────────────────
  const helpRoute = {
    path: "/admin/help-center",
    name: "Help Center",
    icon: <CompassOutlined />,
  };

  // ── CASE 1: Mteja ONLY ────────────────────────────────────────────────────
  if (isMtejaOnly) {
    console.log("[AdminNav] ✅ Mteja ONLY");
    return {
      route: {
        path: "/admin",
        routes: [...mtejaRoutes, ...commonRoutes, helpRoute],
      },
    };
  }

  // ── CASE 2: Duka only ─────────────────────────────────────────────────────
  if (hasDuka && !hasPesa && !hasDala) {
    console.log("[AdminNav] ✅ Duka only (POS)");
    return {
      route: {
        path: "/admin",
        routes: [...dukaRoutes, ...commonRoutes, helpRoute],
      },
    };
  }

  // ── CASE 3: Pesa only ─────────────────────────────────────────────────────
  if (hasPesa && !hasDuka && !hasDala) {
    console.log("[AdminNav] ✅ Pesa only (Accounting)");
    return {
      route: {
        path: "/admin",
        routes: [...pesaRoutes, ...commonRoutes, helpRoute],
      },
    };
  }

  // ── CASE 4: Duka + Pesa ───────────────────────────────────────────────────
  // FIX: deduplicate Document Center and Dashboard — appears in both dukaRoutes and pesaRoutes.
  // When combined, filter them out of pesaRoutes to avoid duplicate nav items.
  if (hasDuka && hasPesa) {
    console.log("[AdminNav] ✅ Duka + Pesa (POS + Accounting)");
    const pesaWithoutDocsAndDashboard = pesaRoutes.filter((r) => r.path !== "/admin/documents" && r.path !== "/admin/dashboard");
    return {
      route: {
        path: "/admin",
        routes: [...dukaRoutes, ...commonRoutes, ...pesaWithoutDocsAndDashboard, helpRoute],
      },
    };
  }

  // ── CASE 5: Mteja + Dala ───────────────────────────────────────────────────
  if (hasMteja && hasDala && !hasDuka && !hasPesa) {
    console.log("[AdminNav] ✅ Mteja + Dala (CRM + Real Estate)");
    return {
      route: {
        path: "/admin",
        routes: [...mtejaRoutes, ...dalaRoutes, ...commonRoutes, helpRoute],
      },
    };
  }

  // ── CASE 6: Duka + Dala ───────────────────────────────────────────────────
  if (hasDuka && hasDala && !hasPesa) {
    console.log("[AdminNav] ✅ Duka + Dala (POS + Real Estate)");
    return {
      route: {
        path: "/admin",
        routes: [...dukaRoutes, ...dalaRoutes, ...commonRoutes, helpRoute],
      },
    };
  }

  // ── CASE 7: Pesa + Dala ───────────────────────────────────────────────────
  if (hasPesa && hasDala && !hasDuka) {
    console.log("[AdminNav] ✅ Pesa + Dala (Accounting + Real Estate)");
    const pesaWithoutDocs = pesaRoutes.filter((r) => r.path !== "/admin/documents");
    return {
      route: {
        path: "/admin",
        routes: [...pesaWithoutDocs, ...dalaRoutes, ...commonRoutes, helpRoute],
      },
    };
  }

  // ── CASE 8: Duka + Pesa + Dala ─────────────────────────────────────────────
  if (hasDuka && hasPesa && hasDala) {
    console.log("[AdminNav] ✅ Duka + Pesa + Dala (POS + Accounting + Real Estate)");
    const pesaWithoutDocs = pesaRoutes.filter((r) => r.path !== "/admin/documents");
    return {
      route: {
        path: "/admin",
        routes: [...dukaRoutes, ...pesaWithoutDocs, ...dalaRoutes, ...commonRoutes, helpRoute],
      },
    };
  }

  // ── FALLBACK: no modules or unexpected combination ─────────────────────────────
  console.log("[AdminNav] ⚠️ Fallback — no modules or unexpected combination");
  const routesToShow = [
    ...(hasDuka ? dukaRoutes : []),
    ...(hasPesa ? pesaRoutes : []),
    ...(hasDala ? dalaRoutes : []),
    ...(hasMteja ? mtejaRoutes : []),
    ...commonRoutes,
    helpRoute,
  ];
  // Deduplicate routes based on path
  const uniqueRoutes = Array.from(new Map(routesToShow.map(r => [r.path, r])).values());
  return {
    route: {
      path: "/admin",
      routes: uniqueRoutes,
    },
  };
};

export default useAdminProLayoutNav;