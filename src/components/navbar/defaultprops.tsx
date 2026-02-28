import {
  ApiFilled,
  CalculatorFilled,
  BarChartOutlined,
  FolderFilled,
  HomeFilled,
  SmileFilled,
  SolutionOutlined,
  AccountBookOutlined,
  AuditOutlined,
  BankOutlined,
  FileTextOutlined,
  FileSearchOutlined,   // ← NEW: Debit Notes icon
  DashboardOutlined,
  ReconciliationOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { PeopleOutlined } from "@mui/icons-material";
import { useAppSelector } from "src/store";

/**
 * defaultprops.tsx — Shop-level Layout (path="/")
 *
 * Module rules:
 *  - POS only        → 8 POS routes flat (Orders named "Orders") (NO accounting)
 *  - Accounting only → 9 accounting routes flat (Orders named "Invoices & Bills") (NO POS)
 *  - Both active     → POS routes (Orders as "Orders") + Accounting group (Orders as "Invoices & Bills")
 */
const useProLayoutNav = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isAdminOrCashier = !!(user?.role === "admin" || user?.role === "cashier");

  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const storeName = "Services";
  const tableName =
    tenant?.business_type?.name === "Electronics" ||
      tenant?.business_type?.name === "massage_parlour"
      ? "Slots"
      : "Tables";

  // ── Module flags ────────────────────────────────────────────────────────────
  const hasPOS = tenant?.pos_integration?.enabled === true;
  const hasAccounting = tenant?.modules?.accounting === true;

  console.log('[ShopNav] Module check:', {
    'modules.pos': tenant?.pos_integration?.enabled,
    'modules.accounting': tenant?.modules?.accounting,
    'hasPOS': hasPOS,
    'hasAccounting': hasAccounting
  });

  // ── POS routes ──────────────────────────────────────────────────────────────
  const posRoutes = [
    { path: "/tables", name: "Home", icon: <HomeFilled /> },
    { path: "/home-dashboard", name: "Dashboard", icon: <BarChartOutlined /> },
    { path: "/orders", name: "Orders", icon: <CalculatorFilled /> },
    { path: "/store", name: storeName, icon: <FolderFilled /> },
    { path: "/inventory", name: "Inventory", icon: <FolderFilled /> },
    { path: "/employee-shift", name: "Shifts", icon: <SolutionOutlined /> },
    { path: "/customers", name: "Customers", icon: <PeopleOutlined /> },
    { path: "/reports", name: "Reports", icon: <ApiFilled /> },
  ];

  // ── Accounting routes (Orders renamed to "Invoices & Bills") ───────────────
  const accountingRoutes = [
    { path: "/accounting", name: "Overview", icon: <DashboardOutlined /> },
    { path: "/orders", name: "Invoices & Bills", icon: <FileTextOutlined /> },
    { path: "/accounting/notes", name: "Debit/Credit Notes", icon: <FileSearchOutlined /> }, // ← points to existing NotesPage
    { path: "/accounting/journals", name: "Journal Entries", icon: <AuditOutlined /> },
    { path: "/accounting/reconciliation", name: "Bank Reconciliation", icon: <BankOutlined /> },
    { path: "/accounting/reports", name: "Reports", icon: <ReconciliationOutlined /> },
    { path: "/customers", name: "Customers", icon: <PeopleOutlined /> },
    { path: "/suppliers", name: "Suppliers", icon: <FolderFilled /> },
    { path: "/payment-methods", name: "Payment Methods", icon: <CalculatorFilled /> },
    { path: "/system-setup", name: "System Setup", icon: <SettingOutlined /> },
  ];

  // ── POS appList ─────────────────────────────────────────────────────────────
  const posAppList = [
    { icon: "/checklist.png", title: "Category", desc: "Organize your products with clear categories.", url: "/Category-settings" },
    { icon: "/circle-table.png", title: tableName, desc: "Manage Tables location and naming.", url: "/table-settings" },
    { icon: "/material-management.png", title: "Inventory", desc: "Track and manage your stock levels.", url: "/inventory" },
    { icon: "/online-payment.png", title: "Payment methods", desc: "Set up and manage how customers pay.", url: "/payment-methods" },
    { icon: "/supply-chain.png", title: "Suppliers", desc: "Manage your supplier relationships.", url: "/suppliers" },
    { icon: "/system-setup.png", title: "System setup", desc: "Configure your RELIA system for optimal use.", url: "/system-setup" },
    { icon: "/faq.png", title: "FAQs", desc: "Get answers to your most common questions.", url: "/fss-faqs" },
    { icon: "/web.png", title: "Website Builder", desc: "Start Building your website content.", url: "/website-builder" },
  ];

  // ── Accounting appList ──────────────────────────────────────────────────────
  const accountingAppList = [
    { icon: "/accounting-dashboard.png", title: "Accounting", desc: "View your financial overview and KPIs.", url: "/accounting" },
    { icon: "/invoice.png", title: "Invoices & Bills", desc: "Manage customer invoices and supplier bills.", url: "/orders" },
    { icon: "/debit-note.png", title: "Debit/Credit Notes", desc: "Create and manage debit and credit notes.", url: "/accounting/notes" }, // ← NEW
    { icon: "/journal.png", title: "Journal Entries", desc: "Record and post journal entries.", url: "/accounting/journals" },
    { icon: "/bank.png", title: "Reconciliation", desc: "Reconcile bank statements with your books.", url: "/accounting/reconciliation" },
    { icon: "/reports.png", title: "Financial Reports", desc: "P&L, Balance Sheet, VAT, Aging and more.", url: "/accounting/reports" },
    { icon: "/customers.png", title: "Customers", desc: "Manage your customer relationships.", url: "/customers" },
    { icon: "/supply-chain.png", title: "Suppliers", desc: "Manage your supplier relationships.", url: "/suppliers" },
    { icon: "/online-payment.png", title: "Payment Methods", desc: "Set up and manage how customers pay.", url: "/payment-methods" },
    { icon: "/system-setup.png", title: "System Setup", desc: "Configure your RELIA system for optimal use.", url: "/system-setup" },
  ];

  // ── Non-admin: single Home ──────────────────────────────────────────────────
  if (!isAdminOrCashier) {
    return {
      route: {
        path: "/",
        routes: [{ path: "/tables", name: "Home", icon: <SmileFilled /> }],
      },
    };
  }

  // ── Accounting ONLY (no POS) ────────────────────────────────────────────────
  if (hasAccounting && !hasPOS) {
    console.log('[ShopNav] ✅ Showing: Accounting only');
    return {
      route: { path: "/", routes: accountingRoutes },
      appList: accountingAppList,
    };
  }

  // ── POS ONLY (no Accounting) ────────────────────────────────────────────────
  if (hasPOS && !hasAccounting) {
    console.log('[ShopNav] ✅ Showing: POS only');
    return {
      route: { path: "/", routes: posRoutes },
      appList: posAppList,
    };
  }

  // ── Both POS + Accounting active ────────────────────────────────────────────
  if (hasPOS && hasAccounting) {
    console.log('[ShopNav] ✅ Showing: Both POS and Accounting');
    return {
      route: {
        path: "/",
        routes: [
          ...posRoutes,
          {
            path: "/accounting",
            name: "Accounting",
            icon: <AccountBookOutlined />,
            routes: accountingRoutes,
          },
        ],
      },
      appList: [...posAppList, ...accountingAppList],
    };
  }

  // ── Fallback: Neither module enabled ────────────────────────────────────────
  console.log('[ShopNav] ⚠️ Showing: Fallback (no modules)');
  return {
    route: { path: "/", routes: posRoutes },
    appList: posAppList,
  };
};

export default useProLayoutNav;