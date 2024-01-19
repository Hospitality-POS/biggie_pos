import { ChromeFilled, SmileFilled } from "@ant-design/icons";
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
          icon: <SmileFilled />,
        },

        {
          path: "/orders",
          name: "orders",
          icon: <ChromeFilled />,
        },
        {
          path: "/store",
          name: "store",
          icon: <ChromeFilled />,
        },
        {
          path: "/reports",
          name: "Reports",
          icon: <ChromeFilled />,
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
        title: "Category Settings",
        desc: "Add, view or update Categories",
        url: "/Category-settings",
      },
      {
        icon: "/circle-table.png",
        title: "Tables Settings",
        desc: "Add, view or update tables",
        url: "/table-settings",
      },
      {
        icon: "/material-management.png",
        title: "Inventory settings",
        desc: "Add, view or update Product inventory",
        url: "/Inventory",
      },

      {
        icon: "online-payment.png",
        title: "payment methods",
        desc: "Add, view or update payment methods",
        url: "/payment-settings",
      },
      {
        icon: "/supply-chain.png",
        title: "suppliers",
        desc: "Add, view or update suppliers",
        url: "/Supplier",
      },
      {
        icon: "/faq.png",
        title: "FAQs",
        desc: "Freuently asked questions?",
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
