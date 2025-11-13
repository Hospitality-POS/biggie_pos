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
  TransactionOutlined
} from "@ant-design/icons";
import { useLocation } from "react-router-dom";

const useProLayoutNav = () => {
  const location = useLocation();

  // Get tenant from localStorage to check accounting access
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const hasAccountingAccess = tenant?.modules?.accounting && tenant?.accounting_database?.enabled;

  const adminMenu = {
    route: {
      path: "/admin",
      routes: [
        {
          path: "/admin/dashboard",
          name: "Dashboard",
          icon: <BarChartOutlined />,
        },
        // Conditionally add Accounting menu
        ...(hasAccountingAccess ? [{
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
              icon: <FileTextOutlined />,
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
              path: "/admin/accounting/customers",
              name: "Customers",
              icon: <TeamOutlined />,
            },
            {
              path: "/admin/accounting/vendors",
              name: "Vendors",
              icon: <ShoppingCartOutlined />,
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
            {
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
            },
          ]
        }] : []),
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
          path: "/admin/customer-list",
          name: "Customers",
          icon: <ContactsOutlined />,
        },
        {
          path: "/admin/reports",
          name: "Business Reports",
          icon: <ReconciliationOutlined />,
        },
        {
          path: "/admin/help-center",
          name: "Help Center",
          icon: <CompassOutlined />,
        },
        {
          path: "/admin/discover",
          name: "Discover",
          icon: <GlobalOutlined />,
        },
        {
          path: "/admin/settings",
          name: "Settings",
          icon: <SettingOutlined />,
        },
      ],
    },
  };

  return adminMenu;
};

export default useProLayoutNav;