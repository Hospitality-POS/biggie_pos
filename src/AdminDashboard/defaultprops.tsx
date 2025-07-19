import { BarChartOutlined, CompassOutlined, ContactsOutlined, GlobalOutlined, MoneyCollectOutlined, ReconciliationOutlined, SettingOutlined, ShopOutlined, TeamOutlined } from "@ant-design/icons";
import { useLocation } from "react-router-dom";

const useProLayoutNav = () => {
  const location = useLocation();

  const adminMenu = {
    route: {
      path: "/admin",
      routes: [
        {
          path: "/admin/dashboard",
          name: "Dashboard",
          icon: <BarChartOutlined />,
        },
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
          path: "/admin/billing",
          name: "Billing",
          icon: <MoneyCollectOutlined />,
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
export default useProLayoutNav
