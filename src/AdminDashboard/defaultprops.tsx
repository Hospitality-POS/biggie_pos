import {
  BarChartOutlined,
  CompassOutlined,
  ContactsOutlined,
  GlobalOutlined,
  ReconciliationOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
  CalculatorOutlined,
  DashboardOutlined,
  FileTextOutlined,
  DollarOutlined,
  BankOutlined,
  ShoppingCartOutlined,
  AccountBookOutlined,
  DollarCircleOutlined,
  CreditCardOutlined,
  FundOutlined,
  TransactionOutlined,
  FileProtectOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useLocation } from "react-router-dom";

const useProLayoutNav = () => {
  const location = useLocation();

  // Get tenant and user from localStorage
  const storedTenant = localStorage.getItem("tenant");
  const storedUser = localStorage.getItem("user");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const user = storedUser ? JSON.parse(storedUser) : null;

  // Get user role (normalize to lowercase)
  const userRole = user?.role?.toLowerCase();

  // Check which modules are enabled
  const hasAccountingAccess =
    tenant?.modules?.accounting === true &&
    tenant?.accounting_database?.enabled === true;
  const hasPosAccess = tenant?.pos_integration?.enabled === true;

  // Determine the layout type based on enabled modules
  const isAccountingOnly = hasAccountingAccess && !hasPosAccess;
  const isPosOnly = hasPosAccess && !hasAccountingAccess;
  const hasBothModules = hasAccountingAccess && hasPosAccess;

  // Build dynamic menu structure based on user role and enabled modules
  const buildMenuStructure = () => {
    const routes = [];

    // ========== ROLE: ACCOUNTING ==========
    if (userRole === "accounting") {
      // Accounting users only see accounting features
      routes.push({
        path: "/admin/dashboard",
        name: "Dashboard",
        icon: <DashboardOutlined />,
      });

      // Sales & Revenue
      routes.push({
        path: "/admin/accounting/invoices",
        name: "Invoices",
        icon: <FileTextOutlined />,
      });

      routes.push({
        path: "/admin/accounting/receipts",
        name: "Receipts",
        icon: <CreditCardOutlined />,
      });

      // Purchases & Expenses
      routes.push({
        path: "/admin/accounting/bills",
        name: "Bills",
        icon: <FileProtectOutlined />,
      });

      routes.push({
        path: "/admin/accounting/expenses",
        name: "Expenses",
        icon: <DollarCircleOutlined />,
      });

      routes.push({
        path: "/admin/accounting/payments",
        name: "Payments",
        icon: <DollarOutlined />,
      });

      // Contacts - Fixed: Parent path now points to first child
      routes.push({
        path: "/admin/accounting/customers", // ✅ Points to first child
        name: "Contacts",
        icon: <ContactsOutlined />,
        routes: [
          {
            path: "/admin/accounting/customers",
            name: "Customers",
            icon: <TeamOutlined />,
          },
          {
            path: "/admin/accounting/vendors",
            name: "Vendors",
            icon: <ShoppingCartOutlined />,
          },
        ],
      });

      // Accounting Core - Fixed: Parent path now points to first child
      routes.push({
        path: "/admin/accounting/accounts", // ✅ Points to first child
        name: "Accounting",
        icon: <CalculatorOutlined />,
        routes: [
          {
            path: "/admin/accounting/accounts",
            name: "Chart of Accounts",
            icon: <BankOutlined />,
          },
          {
            path: "/admin/accounting/journals",
            name: "Journal Entries",
            icon: <AccountBookOutlined />,
          },
          {
            path: "/admin/accounting/reconciliation",
            name: "Bank Reconciliation",
            icon: <ReconciliationOutlined />,
          },
        ],
      });

      // Reports - Fixed: Parent path now points to first child
      routes.push({
        name: "Reports",
        path: "/admin/accounting/reports/profit-loss", // ✅ Points to first child
        icon: <BarChartOutlined />,
        routes: [
          {
            path: "/admin/accounting/reports/profit-loss",
            name: "Profit & Loss",
            icon: <FundOutlined />,
          },
          {
            path: "/admin/accounting/reports/balance-sheet",
            name: "Balance Sheet",
            icon: <AccountBookOutlined />,
          },
          {
            path: "/admin/accounting/reports/cash-flow",
            name: "Cash Flow",
            icon: <TransactionOutlined />,
          },
          {
            path: "/admin/accounting/reports/trial-balance",
            name: "Trial Balance",
            icon: <ReconciliationOutlined />,
          },
          {
            path: "/admin/accounting/reports/ar-aging",
            name: "AR Aging",
            icon: <TeamOutlined />,
          },
          {
            path: "/admin/accounting/reports/ap-aging",
            name: "AP Aging",
            icon: <ShoppingCartOutlined />,
          },
          {
            path: "/admin/accounting/reports/tax-summary",
            name: "Tax Summary",
            icon: <FileTextOutlined />,
          },
        ],
      });

      // Help Center (always visible)
      routes.push({
        path: "/admin/help-center",
        name: "Help Center",
        icon: <CompassOutlined />,
      });

      return routes;
    }

    // ========== ROLE: ADMIN (POS-ONLY) ==========
    if (userRole === "admin" && isPosOnly) {
      routes.push({
        path: "/admin/dashboard",
        name: "Dashboard",
        icon: <DashboardOutlined />,
      });

      routes.push({
        path: "/admin/shop-management",
        name: "Shop Management",
        icon: <ShopOutlined />,
      });

      routes.push({
        path: "/admin/staff-management",
        name: "Staff Management",
        icon: <TeamOutlined />,
      });

      routes.push({
        path: "/admin/wages",
        name: "Wage Management",
        icon: <WalletOutlined />,
      });

      routes.push({
        path: "/admin/customer-list",
        name: "Customers",
        icon: <ContactsOutlined />,
      });

      routes.push({
        path: "/admin/reports",
        name: "Reports",
        icon: <ReconciliationOutlined />,
      });

      routes.push({
        path: "/admin/help-center",
        name: "Help Center",
        icon: <CompassOutlined />,
      });

      return routes;
    }

    // ========== ROLE: ADMIN (ACCOUNTING-ONLY) ==========
    if (userRole === "admin" && isAccountingOnly) {
      // Admin with accounting-only sees accounting features
      routes.push({
        path: "/admin/dashboard",
        name: "Dashboard",
        icon: <DashboardOutlined />,
      });

      // Same structure as accounting user
      routes.push({
        path: "/admin/accounting/invoices",
        name: "Invoices",
        icon: <FileTextOutlined />,
      });

      routes.push({
        path: "/admin/accounting/receipts",
        name: "Receipts",
        icon: <CreditCardOutlined />,
      });

      routes.push({
        path: "/admin/accounting/bills",
        name: "Bills",
        icon: <FileProtectOutlined />,
      });

      routes.push({
        path: "/admin/accounting/expenses",
        name: "Expenses",
        icon: <DollarCircleOutlined />,
      });

      routes.push({
        path: "/admin/accounting/payments",
        name: "Payments",
        icon: <DollarOutlined />,
      });

      // Contacts - Fixed
      routes.push({
        path: "/admin/accounting/customers", // ✅ Points to first child
        name: "Contacts",
        icon: <ContactsOutlined />,
        routes: [
          {
            path: "/admin/accounting/customers",
            name: "Customers",
            icon: <TeamOutlined />,
          },
          {
            path: "/admin/accounting/vendors",
            name: "Vendors",
            icon: <ShoppingCartOutlined />,
          },
        ],
      });

      // Accounting Core - Fixed
      routes.push({
        path: "/admin/accounting/accounts", // ✅ Points to first child
        name: "Accounting",
        icon: <CalculatorOutlined />,
        routes: [
          {
            path: "/admin/accounting/accounts",
            name: "Chart of Accounts",
            icon: <BankOutlined />,
          },
          {
            path: "/admin/accounting/journals",
            name: "Journal Entries",
            icon: <AccountBookOutlined />,
          },
          {
            path: "/admin/accounting/reconciliation",
            name: "Bank Reconciliation",
            icon: <ReconciliationOutlined />,
          },
        ],
      });

      // Reports - Fixed
      routes.push({
        name: "Reports",
        path: "/admin/accounting/reports/profit-loss", // ✅ Points to first child
        icon: <BarChartOutlined />,
        routes: [
          {
            path: "/admin/accounting/reports/profit-loss",
            name: "Profit & Loss",
            icon: <FundOutlined />,
          },
          {
            path: "/admin/accounting/reports/balance-sheet",
            name: "Balance Sheet",
            icon: <AccountBookOutlined />,
          },
          {
            path: "/admin/accounting/reports/cash-flow",
            name: "Cash Flow",
            icon: <TransactionOutlined />,
          },
          {
            path: "/admin/accounting/reports/trial-balance",
            name: "Trial Balance",
            icon: <ReconciliationOutlined />,
          },
          {
            path: "/admin/accounting/reports/ar-aging",
            name: "AR Aging",
            icon: <TeamOutlined />,
          },
          {
            path: "/admin/accounting/reports/ap-aging",
            name: "AP Aging",
            icon: <ShoppingCartOutlined />,
          },
          {
            path: "/admin/accounting/reports/tax-summary",
            name: "Tax Summary",
            icon: <FileTextOutlined />,
          },
        ],
      });

      routes.push({
        path: "/admin/help-center",
        name: "Help Center",
        icon: <CompassOutlined />,
      });

      return routes;
    }

    // ========== ROLE: ADMIN (BOTH MODULES) ==========
    if (userRole === "admin" && hasBothModules) {
      routes.push({
        path: "/admin/dashboard",
        name: "Dashboard",
        icon: <DashboardOutlined />,
      });

      // POS Operations - Fixed
      routes.push({
        path: "/admin/shop-management", // ✅ Points to first child
        name: "Operations",
        icon: <ShopOutlined />,
        routes: [
          {
            path: "/admin/shop-management",
            name: "Shop Management",
            icon: <ShopOutlined />,
          },
          {
            path: "/admin/staff-management",
            name: "Staff Management",
            icon: <TeamOutlined />,
          },
          {
            path: "/admin/wages",
            name: "Wage Management",
            icon: <WalletOutlined />,
          },
        ],
      });

      // Accounting Module - Fixed
      routes.push({
        path: "/admin/accounting/invoices", // ✅ Points to first child
        name: "Accounting",
        icon: <CalculatorOutlined />,
        routes: [
          {
            path: "/admin/accounting/invoices",
            name: "Invoices",
            icon: <FileTextOutlined />,
          },
          {
            path: "/admin/accounting/bills",
            name: "Bills",
            icon: <FileProtectOutlined />,
          },
          {
            path: "/admin/accounting/expenses",
            name: "Expenses",
            icon: <DollarCircleOutlined />,
          },
          {
            path: "/admin/accounting/payments",
            name: "Payments",
            icon: <DollarOutlined />,
          },
          {
            path: "/admin/accounting/receipts",
            name: "Receipts",
            icon: <CreditCardOutlined />,
          },
          {
            path: "/admin/accounting/accounts",
            name: "Chart of Accounts",
            icon: <BankOutlined />,
          },
          {
            path: "/admin/accounting/journals",
            name: "Journal Entries",
            icon: <AccountBookOutlined />,
          },
          {
            path: "/admin/accounting/reconciliation",
            name: "Bank Reconciliation",
            icon: <ReconciliationOutlined />,
          },
        ],
      });

      // Shared Contacts - Fixed
      routes.push({
        path: "/admin/customer-list", // ✅ Points to first child
        name: "Contacts",
        icon: <ContactsOutlined />,
        routes: [
          {
            path: "/admin/customer-list",
            name: "Customers",
            icon: <TeamOutlined />,
          },
          {
            path: "/admin/accounting/vendors",
            name: "Vendors",
            icon: <ShoppingCartOutlined />,
          },
        ],
      });

      // Combined Reports - Fixed
      routes.push({
        name: "Reports",
        path: "/admin/reports", // ✅ Points to first child
        icon: <BarChartOutlined />,
        routes: [
          {
            path: "/admin/reports",
            name: "Business Overview",
            icon: <DashboardOutlined />,
          },
          {
            path: "/admin/accounting/reports/profit-loss",
            name: "Profit & Loss",
            icon: <FundOutlined />,
          },
          {
            path: "/admin/accounting/reports/balance-sheet",
            name: "Balance Sheet",
            icon: <AccountBookOutlined />,
          },
          {
            path: "/admin/accounting/reports/cash-flow",
            name: "Cash Flow",
            icon: <TransactionOutlined />,
          },
        ],
      });

      routes.push({
        path: "/admin/help-center",
        name: "Help Center",
        icon: <CompassOutlined />,
      });

      return routes;
    }

    // ========== DEFAULT/FALLBACK ==========
    // If no role matches or no modules enabled, show minimal menu
    routes.push({
      path: "/admin/dashboard",
      name: "Dashboard",
      icon: <DashboardOutlined />,
    });

    routes.push({
      path: "/admin/help-center",
      name: "Help Center",
      icon: <CompassOutlined />,
    });

    return routes;
  };

  const adminMenu = {
    route: {
      path: "/admin",
      routes: buildMenuStructure(),
    },
  };

  return adminMenu;
};

export default useProLayoutNav;