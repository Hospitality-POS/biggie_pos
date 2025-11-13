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
  MoneyCollectOutlined
} from "@ant-design/icons";
import { useLocation } from "react-router-dom";

const useProLayoutNav = () => {
  const location = useLocation();

  // Get tenant from localStorage to determine module access
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  // Check which modules are enabled (borrowing from Discover page logic)
  const hasAccountingAccess = tenant?.modules?.accounting === true &&
    tenant?.accounting_database?.enabled === true;
  const hasPosAccess = tenant?.pos_integration?.enabled === true;

  // Determine the layout type based on enabled modules
  const isAccountingOnly = hasAccountingAccess && !hasPosAccess;
  const isPosOnly = hasPosAccess && !hasAccountingAccess;
  const hasBothModules = hasAccountingAccess && hasPosAccess;

  // Build dynamic menu structure
  const buildMenuStructure = () => {
    const routes = [];

    // ========== DASHBOARD ==========
    // Show dashboard if user has any module access
    if (hasAccountingAccess || hasPosAccess) {
      routes.push({
        path: "/admin/dashboard",
        name: "Dashboard",
        icon: <DashboardOutlined />,
      });
    }

    // ========== ACCOUNTING-ONLY LAYOUT ==========
    if (isAccountingOnly) {
      // For accounting-only users, promote accounting features to top level
      // This gives them a cleaner, dedicated accounting experience

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

      // Contacts
      routes.push({
        path: "/admin/contacts",
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
        ]
      });

      // Accounting
      routes.push({
        path: "/admin/accounting-core",
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
        ]
      });

      // Reports
      routes.push({
        name: "Reports",
        path: "/admin/accounting/reports",
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
        ]
      });
    }

    // ========== POS-ONLY LAYOUT ==========
    else if (isPosOnly) {
      // For POS-only users, show POS features prominently
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
    }

    // ========== COMBINED MODULES LAYOUT ==========
    else if (hasBothModules) {
      // For users with both modules, organize features logically

      // POS Operations
      routes.push({
        path: "/admin/operations",
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
        ]
      });

      // Accounting Module (nested)
      routes.push({
        path: "/admin/accounting",
        name: "Accounting",
        icon: <CalculatorOutlined />,
        routes: [
          {
            path: "/admin/accounting/dashboard",
            name: "Dashboard",
            icon: <DashboardOutlined />,
          },
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
        ]
      });

      // Shared Customers
      routes.push({
        path: "/admin/contacts",
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
        ]
      });

      // Combined Reports
      routes.push({
        name: "Reports",
        path: "/admin/reports",
        icon: <BarChartOutlined />,
        routes: [
          // Business Reports
          {
            path: "/admin/reports",
            name: "Business Overview",
            icon: <DashboardOutlined />,
          },
          // Accounting Reports
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
        ]
      });
    }

    // ========== COMMON FEATURES (Always visible) ==========

    // Billing - Show if user has any module access
    if (hasAccountingAccess || hasPosAccess) {
      routes.push({
        path: "/admin/billing",
        name: "Billing",
        icon: <MoneyCollectOutlined />,
      });
    }

    // Help Center
    routes.push({
      path: "/admin/help-center",
      name: "Help Center",
      icon: <CompassOutlined />,
    });

    // Discover (for enabling/managing modules)
    routes.push({
      path: "/admin/discover",
      name: "Discover",
      icon: <GlobalOutlined />,
    });

    // Settings
    routes.push({
      path: "/admin/settings",
      name: "Settings",
      icon: <SettingOutlined />,
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