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
  HomeOutlined,
} from "@ant-design/icons";

/**
 * AdminDefaultprops.tsx — Admin Layout (path="/admin")
 *
 * Module rules:
 *  - Duka (POS) only         → Dashboard, Branch, Staff, POS Reports, Documents, Help
 *  - Pesa (Accounting) only  → Accounting Dashboard, Branch, Staff, CoA, Financial Reports, Documents, Help
 *  - Duka + Pesa both        → Dashboard, Branch, Staff, POS Reports, Accounting Dashboard, CoA, Financial Reports, Documents, Help
 *  - Dala ONLY              → Dala Dashboard, Properties, Units, Sales, Leases, Branch, Staff, Help
 *  - Dala + any other       → Dala routes shown alongside other modules
 *  - Mteja ONLY              → Mteja Dashboard, Branch, Staff, Help
 *  - Mteja + any other       → Mteja routes hidden; only the other module(s) show
 *
 * Router paths (Routers.tsx) — must match exactly:
 *  /admin/dashboard
 *  /admin/reports                    ← POS business reports
 *  /admin/documents
 *  /admin/accounting                 ← Accounting dashboard
 *  /admin/accounting/accounts        ← Chart of Accounts  (was /admin/accounts — 404)
 *  /admin/accounting/reports         ← Financial reports   (was /admin/reports — conflict with POS)
 *  /admin/dala                       ← Dala dashboard
 *  /admin/dala/properties            ← Properties management
 *  /admin/dala/units                 ← Units management
 *  /admin/dala/sales                 ← Sales management
 *  /admin/dala/leases                ← Lease management
 *  /admin/dala/commissions           ← Commission management
 *  /admin/dala/rent-collection        ← Rent collection
 *  /admin/dala/reports               ← Dala reports
 *  /admin/shop-management
 *  /admin/staff-management
 *  /admin/mteja
 *  /admin/help-center
 */
const useAdminProLayoutNav = () => {
  const storedTenant = localStorage.getItem("tenant");
  const storedUser = localStorage.getItem("user");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const user = storedUser ? JSON.parse(storedUser) : null;

  const userRole = user?.role?.toLowerCase();

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
    { path: "/admin/shop-management", name: "Branch Management", icon: <ShopOutlined /> },
    { path: "/admin/staff-management", name: "Crew Management", icon: <UsergroupAddOutlined /> },
  ];

  // ── Duka (POS) routes ─────────────────────────────────────────────────────
  const dukaRoutes = [
    { path: "/admin/dashboard", name: "Dashboard", icon: <DashboardOutlined /> },
    ...(userRole === "admin"
      ? [{ path: "/admin/reports", name: "Business Reports", icon: <ReconciliationOutlined /> }]
      : []),
    { path: "/admin/documents", name: "Document Center", icon: <FileDoneOutlined /> },
  ];

  // ── Pesa (Accounting) routes ──────────────────────────────────────────────
  // FIX: paths now match router exactly
  //   /admin/accounts          → /admin/accounting/accounts  (was 404)
  //   /admin/reports           → /admin/accounting/reports   (was clashing with POS reports)
  const pesaRoutes = [
    { path: "/admin/accounting", name: "Accounting Dashboard", icon: <AccountBookOutlined /> },
    { path: "/admin/accounting/accounts", name: "Chart of Accounts", icon: <AuditOutlined /> },
    { path: "/admin/accounting/reports", name: "Financial Reports", icon: <FileTextOutlined /> },
    { path: "/admin/documents", name: "Document Center", icon: <FileDoneOutlined /> },
  ];

  // ── Mteja (CRM) routes — only when Mteja is the sole module ──────────────
  const mtejaRoutes = [
    { path: "/admin/mteja", name: "Mteja Dashboard", icon: <CustomerServiceOutlined /> },
  ];

  // ── Dala (Real Estate) routes ─────────────────────────────────────────────
  const dalaRoutes = [
    { path: "/admin/dala", name: "Dala Dashboard", icon: <HomeOutlined /> },
    { path: "/admin/dala/reports", name: "Dala Reports", icon: <FileTextOutlined /> },
  ];

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

  // ── CASE 4: Dala only ─────────────────────────────────────────────────────
  if (hasDala && !hasDuka && !hasPesa) {
    console.log("[AdminNav] ✅ Dala only (Real Estate)");
    return {
      route: {
        path: "/admin",
        routes: [
          { path: "/admin/dala", name: "Dala Dashboard", icon: <HomeOutlined /> },
          { path: "/admin/dala/reports", name: "Dala Reports", icon: <FileTextOutlined /> },
          { path: "/admin/shop-management", name: "Branch Management", icon: <ShopOutlined /> },
          { path: "/admin/staff-management", name: "Crew Management", icon: <UsergroupAddOutlined /> },
          helpRoute,
        ],
      },
    };
  }

  // ── CASE 5: Duka + Pesa ───────────────────────────────────────────────────
  // FIX: deduplicate Document Center — appears in both dukaRoutes and pesaRoutes.
  // When combined, filter it out of pesaRoutes to avoid two identical nav items.
  if (hasDuka && hasPesa && !hasDala) {
    console.log("[AdminNav] ✅ Duka + Pesa (POS + Accounting)");
    const pesaWithoutDocs = pesaRoutes.filter((r) => r.path !== "/admin/documents");
    return {
      route: {
        path: "/admin",
        routes: [...dukaRoutes, ...commonRoutes, ...pesaWithoutDocs, helpRoute],
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

  // ── FALLBACK: no modules ──────────────────────────────────────────────────
  console.log("[AdminNav] ⚠️ Fallback — no modules");
  return {
    route: {
      path: "/admin",
      routes: [...commonRoutes, helpRoute],
    },
  };
};

export default useAdminProLayoutNav;