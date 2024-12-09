import { ApiFilled, CalculatorFilled, BarChartOutlined, FolderFilled, HomeFilled, PrinterFilled, SmileFilled, SolutionOutlined } from "@ant-design/icons";
import { useAppSelector } from "src/store";

const useProLayoutNav = () => {
  const { user } = useAppSelector((state) => state.auth);
  const state = !!(user?.role === "admin" || user?.role === "cashier");
  const adminMenu = {
    route: {
      path: "/",
      routes: [
        {
          path: "/tables",
          name: "Home",
          icon: <HomeFilled />,
        },

        {
          path: "/orders",
          name: "Orders",
          icon: <CalculatorFilled />,
        },
        {
          path: "/invoices",
          name: "Invoices",
          icon: <PrinterFilled />,
        },
        {
          path: "/store",
          name: "Store",
          icon: <FolderFilled />,
        },
        {
          path: "/employee-shift",
          name: "Shifts",
          icon: <SolutionOutlined />,
        },
        {
          path: "/reports",
          name: "Reports",
          icon: <ApiFilled />,
        },
        {
          path: "/home-dashboard",
          name: "Dashboard",
          icon: <BarChartOutlined />,
        },
      ],
    },

    appList: [
      {
        icon: "/people.png",
        title: "Users/People",
        desc: "Control user access and permissions.",
        url: "/users",
      },
      {
        icon: "/checklist.png",
        title: "Category",
        desc: "Organize your products with clear categories.",
        url: "/Category-settings",
      },
      {
        icon: "/circle-table.png",
        title: "Tables",
        desc: "Manage Tables location and naming.",
        url: "/table-settings",
      },
      {
        icon: "/material-management.png",
        title: "Inventory",
        desc: "Track and manage your stock levels.",
        url: "/inventory",
      },

      {
        icon: "/online-payment.png",
        title: "Payment methods",
        desc: "Set up and manage how customers pay.",
        url: "/payment-methods",
      },
      {
        icon: "/supply-chain.png",
        title: "Suppliers",
        desc: "Manage your supplier relationships.",
        url: "/suppliers",
      },
      {
        icon: "/system-setup.png",
        title: "System setup",
        desc: "Configure your RELIA system for optimal use.",
        url: "/system-setup",
      },
      {
        icon: "/faq.png",
        title: "FAQs",
        desc: "Get answers to your most common questions.",
        url: "/fss-faqs",
      },
    ],
  };
  const userMenu = {
    route: {
      path: "/",
      routes: [
        {
          path: "/tables",
          name: "Home",
          icon: <SmileFilled />,
        },
      ],
    },
  };
  return state ? adminMenu : userMenu;
};
export default useProLayoutNav
