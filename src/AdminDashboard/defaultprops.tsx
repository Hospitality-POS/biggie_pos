import { BarChartOutlined, CompassOutlined, ReconciliationOutlined, ShopOutlined, TeamOutlined } from "@ant-design/icons";
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
          path: "/admin/reports",
          name: "Business Reports",
          icon: <ReconciliationOutlined />,
        },
        {
          path: "/admin/help-center",
          name: "Help Center",
          icon: <CompassOutlined />,
        },
      ],
    },
  };
  
  return adminMenu;
};
export default useProLayoutNav
