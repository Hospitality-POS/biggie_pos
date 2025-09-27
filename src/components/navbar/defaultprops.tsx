import {
  ApiFilled,
  CalculatorFilled,
  BarChartOutlined,
  FolderFilled,
  HomeFilled,
  PrinterFilled,
  SmileFilled,
  SolutionOutlined,
} from "@ant-design/icons";
import { PeopleOutlined } from "@mui/icons-material";
import { useAppSelector } from "src/store";

const useProLayoutNav = () => {
  const { user } = useAppSelector((state) => state.auth);
  const state = !!(user?.role === "admin" || user?.role === "cashier");
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const storeName = 'Services';
  const tableName = tenant?.business_type?.name === "Electronics" || tenant?.business_type?.name === "massage_parlour" ? "Slots" : "Tables";

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
          path: "/home-dashboard",
          name: "Dashboard",
          icon: <BarChartOutlined />,
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
          name: storeName,
          icon: <FolderFilled />,
        },
        {
          path: "/inventory",
          name: 'Inventory',
          icon: <FolderFilled />,
        },
        {
          path: "/employee-shift",
          name: "Shifts",
          icon: <SolutionOutlined />,
        },
        {
          path: "/customers",
          name: "Customers",
          icon: <PeopleOutlined />,
        },
        {
          path: "/reports",
          name: "Reports",
          icon: <ApiFilled />,
        },
      ],
    },

    appList: [
      {
        icon: "/checklist.png",
        title: "Category",
        desc: "Organize your products with clear categories.",
        url: "/Category-settings",
      },
      {
        icon: "/circle-table.png",
        title: tableName,
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
      {
        icon: "/web.png",
        title: "Website Builder",
        desc: "Start Building your website content.",
        url: "/website-builder",
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
export default useProLayoutNav;
