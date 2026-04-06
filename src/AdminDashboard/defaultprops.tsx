import {
  AccountBookOutlined,
  AuditOutlined,
  BankOutlined,
  CompassOutlined,
  DashboardOutlined,
  FileTextOutlined,
  FileDoneOutlined,
  ReconciliationOutlined,
  ShopOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  WalletOutlined,
} from "@ant-design/icons";

/**
 * AdminDefaultprops.tsx — Admin Layout (path="/admin")
 *
 * Module rules:
 *  - POS only        → Dashboard, Branch, Staff, Wages, POS Reports, Document Center, Help
 *  - Accounting only → Accounting Dashboard, Branch, Staff, Chart of Accounts,
 *                      Financial Reports, Document Center, Help
 *  - Both active     → Dashboard, Branch, Staff, Wages, POS Reports, Accounting Dashboard,
 *                      Chart of Accounts, Financial Reports, Document Center, Help
 */
const useProLayoutNav = () => {
  const storedTenant = localStorage.getItem("tenant");
  const storedUser = localStorage.getItem("user");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const user = storedUser ? JSON.parse(storedUser) : null;

  const userRole = user?.role?.toLowerCase();

  // ── Module flags ────────────────────────────────────────────────────────────
  const hasPOS = tenant?.pos_integration?.enabled === true;
  const hasAccounting = tenant?.modules?.accounting === true;

  console.log('[AdminNav] Module check:', {
    'modules.pos': tenant?.pos_integration?.enabled,
    'modules.accounting': tenant?.modules?.accounting,
    'hasPOS': hasPOS,
    'hasAccounting': hasAccounting
  });

  // ── Common routes (always shown if any module is active) ───────────────────
  const commonRoutes = [
    { path: "/admin/shop-management", name: "Branch Management", icon: <ShopOutlined /> },
    { path: "/admin/staff-management", name: "Crew Management", icon: <UsergroupAddOutlined /> },
    // ── Document Center — accessible at admin level regardless of module ──────
    { path: "/admin/documents", name: "Document Center", icon: <FileDoneOutlined /> },
  ];

  // ── POS-specific routes ─────────────────────────────────────────────────────
  const posOnlyRoutes = [
    { path: "/admin/dashboard", name: "Dashboard", icon: <DashboardOutlined /> },
    ...(userRole === "admin"
      ? [
        { path: "/admin/reports", name: "Business Reports", icon: <ReconciliationOutlined /> },
      ]
      : []),
  ];

  // ── Accounting-specific routes ──────────────────────────────────────────────
  const accountingOnlyRoutes = [
    { path: "/admin/accounting", name: "Accounting Dashboard", icon: <AccountBookOutlined /> },
    { path: "/admin/accounting/accounts", name: "Chart of Accounts", icon: <AuditOutlined /> },
    { path: "/admin/accounting/reports", name: "Financial Reports", icon: <FileTextOutlined /> },
  ];

  // ── Help Center (always included) ───────────────────────────────────────────
  const helpRoute = { path: "/admin/help-center", name: "Help Center", icon: <CompassOutlined /> };

  // ── Accounting ONLY (no POS) ────────────────────────────────────────────────
  if (hasAccounting && !hasPOS) {
    console.log('[AdminNav] ✅ Showing: Accounting only');
    return {
      route: {
        path: "/admin",
        routes: [
          ...accountingOnlyRoutes,
          ...commonRoutes,
          helpRoute,
        ],
      },
    };
  }

  // ── POS ONLY (no Accounting) ────────────────────────────────────────────────
  if (hasPOS && !hasAccounting) {
    console.log('[AdminNav] ✅ Showing: POS only');
    return {
      route: {
        path: "/admin",
        routes: [
          ...posOnlyRoutes,
          ...commonRoutes,
          helpRoute,
        ],
      },
    };
  }

  // ── Both POS + Accounting active ────────────────────────────────────────────
  if (hasPOS && hasAccounting) {
    console.log('[AdminNav] ✅ Showing: Both POS and Accounting');
    return {
      route: {
        path: "/admin",
        routes: [
          ...posOnlyRoutes,
          ...commonRoutes,
          ...accountingOnlyRoutes,
          helpRoute,
        ],
      },
    };
  }

  // ── Fallback: Neither module enabled ────────────────────────────────────────
  console.log('[AdminNav] ⚠️ Showing: Fallback (no modules enabled)');
  return {
    route: {
      path: "/admin",
      routes: [
        ...commonRoutes,
        helpRoute,
      ],
    },
  };
};

export default useProLayoutNav;