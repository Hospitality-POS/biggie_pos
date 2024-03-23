import {  ApiFilled, CalculatorFilled, FolderFilled, HomeFilled, SmileFilled } from "@ant-design/icons";
import { useAppSelector } from "src/store";

  const useProLayoutNav = () => {
  const { user } = useAppSelector((state) => state.auth);
  const state = user?.isAdmin;
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
          path: "/store",
          name: "Store",
          icon: <FolderFilled />,
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
        icon: "/people.png",
        title: "Users/People",
        desc: "Add, view or update users",
        url: "/users",
      },
      {
        icon: "/checklist.png",
        title: "Category",
        desc: "Add, view or update Categories",
        url: "/Category-settings",
      },
      {
        icon: "/circle-table.png",
        title: "Tables",
        desc: "Add, view or update tables",
        url: "/table-settings",
      },
      {
        icon: "/material-management.png",
        title: "Inventory",
        desc: "Coming soon!",
        url: "/inventory",
      },

      {
        icon: "/online-payment.png",
        title: "Payment methods",
        desc: "Add, view or update payment methods",
        url: "/payment-methods",
      },
      {
        icon: "/supply-chain.png",
        title: "Suppliers",
        desc: "Coming Soon!",
        url: "/suppliers",
      },
      {
        icon: "/faq.png",
        title: "FAQs",
        desc: "Frequently asked questions?",
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
  return  state ? adminMenu : userMenu;
};
export default useProLayoutNav
