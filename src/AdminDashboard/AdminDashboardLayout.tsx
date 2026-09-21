import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Badge,
  Button,
  Dropdown,
  Empty,
  Image,
  List,
  Popover,
  Space,
  Typography,
  Modal,
  Tag,
  Avatar,
  Drawer,
  Tooltip,
  message,
} from "antd";
import { PageContainer, ProLayout } from "@ant-design/pro-components";
import {
  AppstoreOutlined,
  BellOutlined,
  CompassOutlined,
  CreditCardOutlined,
  CloseOutlined,
  DownOutlined,
  GlobalOutlined,
  MenuOutlined,
  PoweroffOutlined,
  SettingOutlined,
  UserOutlined,
  BranchesOutlined,
  ShopOutlined,
  ArrowRightOutlined,
  DashboardOutlined,
  UsergroupAddOutlined,
  ReconciliationOutlined,
  FileDoneOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "src/store";
import useProLayoutNav from "./defaultprops";
import BiasharaAIFab from "./BiasharaAIFab";
import { fetchAllShops, locationDisplay } from "@services/shops";
import {
  fetchMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@services/notifications";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { makeTileImg, ICONS } from "src/components/navbar/defaultprops";

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

// ── Mobile detection hook ─────────────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1025);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1025);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

// ── Mobile nav item ───────────────────────────────────────────────────────────
interface MobileNavItemProps {
  icon?: React.ReactNode;
  label: string;
  path: string;
  isActive: boolean;
  onClick: () => void;
  primaryColor: string;
  children?: MobileNavItemProps[];
}

const MobileNavItem: React.FC<MobileNavItemProps> = ({
  icon,
  label,
  isActive,
  onClick,
  primaryColor,
  children,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const hasChildren = children && children.length > 0;

  return (
    <div>
      <div
        onClick={hasChildren ? () => setExpanded(!expanded) : onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 20px",
          borderRadius: 10,
          margin: "2px 8px",
          background: isActive ? `${primaryColor}15` : "transparent",
          borderLeft: isActive
            ? `3px solid ${primaryColor}`
            : "3px solid transparent",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <span
          style={{
            fontSize: 16,
            color: isActive ? primaryColor : "#64748b",
            width: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? primaryColor : "#1e293b",
          }}
        >
          {label}
        </span>
        {hasChildren && (
          <span
            style={{
              fontSize: 10,
              color: "#94a3b8",
              transform: expanded ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          >
            ▼
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <div style={{ paddingLeft: 16 }}>
          {children!.map((child) => (
            <MobileNavItem
              key={child.path}
              {...child}
              primaryColor={primaryColor}
            />
          ))}
        </div>
      )}
    </div>
  );
};


// ── Main component ─────────────────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const allNavRoutes = useProLayoutNav();
  const hiddenRoutes = ["help-center"];

  const navRoutes = useMemo(() => {
    const filteredRoutes =
      allNavRoutes.route?.routes?.filter(
        (route: any) =>
          !hiddenRoutes.includes(route.key || route.path?.split("/").pop())
      ) || [];
    return {
      ...allNavRoutes,
      route: { ...allNavRoutes.route, routes: filteredRoutes },
    };
  }, [allNavRoutes]);

  const { user: authUser } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const primaryColor = usePrimaryColor();
  const isMobile = useIsMobile();

  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAppListOpen, setMobileAppListOpen] = useState(false);

  const [currentShopId, setCurrentShopId] = useState<string | null>(() => {
    return localStorage.getItem("shopId");
  });

  const { data: shops = [] } = useQuery<any[]>({
    queryKey: ["admin-header-shops"],
    queryFn: () => fetchAllShops({}),
    staleTime: 60000,
  });

  const currentShop = useMemo(() => {
    if (!shops || !shops.length) return null;
    return shops.find((s: any) => s._id === currentShopId) || shops[0];
  }, [shops, currentShopId]);

  const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
  const hasAccounting = !!(tenant?.accounting_database?.enabled || tenant?.modules?.accounting);
  const hasMteja = tenant?.modules?.crm === true;
  const hasDala = tenant?.modules?.dala === true;
  const isAccountingOnly = hasAccounting && !hasPOS && !hasDala;
  const isMtejaOnly = hasMteja && !hasPOS && !hasAccounting && !hasDala;
  const isDalaOnly = hasDala && !hasPOS && !hasAccounting && !hasMteja;

  const shopLandingPath = isMtejaOnly
    ? "/crm/leads"
    : isAccountingOnly
      ? "/accounting"
      : isDalaOnly
        ? "/dala/properties"
        : hasPOS
          ? "/tables"
          : "/home-dashboard";

  // Auto-redirect to first available route
  useEffect(() => {
    if (location.pathname === "/admin" || location.pathname === "/admin/") {
      const firstRoute = navRoutes.route?.routes?.[0]?.path;
      if (firstRoute && firstRoute !== "/admin") {
        navigate(firstRoute, { replace: true });
      }
    }
  }, [location.pathname, navRoutes, navigate]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
    queryClient.removeQueries(["userNotifications"]);
  };

  const { data: notificationData, isLoading } = useQuery({
    queryKey: ["userNotifications", { limit: 10 }],
    queryFn: () => fetchMyNotifications({ pageSize: 10, current: 1 }),
    networkMode: "always",
    refetchOnWindowFocus: true,
    enabled: !!authUser?.id,
    cacheTime: 0,
    staleTime: 0,
    retry: 2,
  });

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["userNotifications"] }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["userNotifications"] }),
    networkMode: "always",
  });

  const unreadNotificationsCount = notificationData?.unreadCount || 0;
  const recentNotifications = (notificationData?.data || [])
    .filter((n: any) => !n.read)
    .slice(0, 5);

  const handleViewDetails = (notification: any) => {
    setSelectedNotification(notification);
    setDetailsModalVisible(true);
    if (!notification.read) markAsReadMutation.mutate(notification._id);
  };

  const renderPriorityIndicator = (priority: string) => {
    const colorMap: any = {
      low: "green",
      medium: "blue",
      high: "orange",
      urgent: "red",
    };
    return <Badge color={colorMap[priority] || "default"} />;
  };

  const renderPriorityTag = (priority: string) => {
    const colorMap: any = {
      low: "green",
      medium: "blue",
      high: "orange",
      urgent: "red",
    };
    return (
      <Tag color={colorMap[priority] || "default"}>
        {priority.toUpperCase()}
      </Tag>
    );
  };

  const renderTypeTag = (type: string) => {
    const typeMap: any = {
      new_appointment_booking: {
        color: "purple",
        label: "New Appointment Booking",
      },
      inventory_out_of_stock: { color: "red", label: "Out of Stock" },
      new_appointment: { color: "green", label: "New Appointment" },
      low_inventory: { color: "orange", label: "Low Inventory" },
      system: { color: "blue", label: "System" },
    };
    const config = typeMap[type] || {
      color: "default",
      label: type.replace(/_/g, " "),
    };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  // ── Notifications panel ──────────────────────────────────────────────────────
  const notificationsContent = (
    <div style={{ width: 340, maxHeight: 480, overflow: "auto" }}>
      <div
        style={{
          padding: "12px 16px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Text strong style={{ fontSize: 14 }}>
          Notifications
        </Text>
        {unreadNotificationsCount > 0 && (
          <Button
            type="link"
            size="small"
            onClick={() => markAllAsReadMutation.mutate({})}
            style={{ padding: 0, fontSize: 12 }}
          >
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div
          style={{ padding: 20, textAlign: "center", color: "#64748b", fontSize: 13 }}
        >
          Loading…
        </div>
      ) : recentNotifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No unread notifications"
          style={{ padding: "20px 0" }}
        />
      ) : (
        <List
          dataSource={recentNotifications}
          renderItem={(item: any) => (
            <List.Item
              style={{
                padding: "10px 16px",
                background: "rgba(24, 144, 255, 0.04)",
                cursor: "pointer",
                borderBottom: "1px solid #f8fafc",
              }}
              onClick={() => handleViewDetails(item)}
            >
              <List.Item.Meta
                avatar={renderPriorityIndicator(item.priority)}
                title={
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Text strong style={{ fontSize: 13, lineHeight: 1.3 }}>
                      {item.title}
                    </Text>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 11,
                        marginLeft: 8,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dayjs(item.createdAt).fromNow()}
                    </Text>
                  </div>
                }
                description={
                  <Text
                    type="secondary"
                    style={{ fontSize: 12 }}
                    ellipsis={{ tooltip: item.message }}
                  >
                    {item.message}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}

      <div
        style={{
          textAlign: "center",
          padding: "8px 16px",
          borderTop: "1px solid #f0f0f0",
        }}
      >
        <Button
          type="link"
          size="small"
          onClick={() => navigate("/admin/notifications")}
          style={{ fontSize: 12 }}
        >
          View all notifications
        </Button>
      </div>
    </div>
  );

  // ── Mobile menu drawer ────────────────────────────────────────────────────────
  const buildMobileNavItems = (routes: any[]): MobileNavItemProps[] =>
    routes.map((route) => ({
      icon: route.icon,
      label: route.name || route.label || "",
      path: route.path || "/admin",
      isActive:
        location.pathname === route.path ||
        location.pathname.startsWith(route.path + "/"),
      onClick: () => navigate(route.path || "/admin"),
      primaryColor,
      children: route.routes ? buildMobileNavItems(route.routes) : undefined,
    }));

  const mobileNavItems = buildMobileNavItems(navRoutes.route?.routes || []);

  const MobileDrawer = (
    <Drawer
      open={mobileMenuOpen}
      onClose={() => setMobileMenuOpen(false)}
      placement="left"
      width={300}
      styles={{
        header: { display: "none" },
        body: { padding: 0, display: "flex", flexDirection: "column" },
        wrapper: { boxShadow: "4px 0 32px rgba(0,0,0,0.15)" },
      }}
    >
      {/* Drawer header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)`,
          padding: "24px 20px 20px",
          position: "relative",
        }}
      >
        <button
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: "absolute",
            right: 16,
            top: 16,
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "white",
            fontSize: 14,
          }}
        >
          <CloseOutlined />
        </button>

        {/* Logo */}
        <div style={{ marginBottom: 20 }}>
          {tenant?.tenant_logo?.url ? (
            <Image
              src={tenant.tenant_logo.url}
              height={56}
              preview={false}
              alt="logo"
              style={{
                objectFit: "contain",
                maxWidth: 140,
                filter: "brightness(0) invert(1)",
              }}
            />
          ) : (
            <Image
              src="/relia.png"
              height={56}
              preview={false}
              alt="logo"
              style={{
                objectFit: "contain",
                maxWidth: 140,
                filter: "brightness(0) invert(1)",
              }}
            />
          )}
        </div>

        {/* User profile strip */}
        {authUser && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Badge dot status="success" offset={[-4, 28]}>
              <Avatar
                src={authUser?.avatar || authUser?.thumbnail}
                icon={<UserOutlined />}
                size={44}
                style={{ border: "2px solid rgba(255,255,255,0.4)" }}
              />
            </Badge>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {authUser?.name || "User"}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 11,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {authUser?.email}
              </div>
              <div
                style={{
                  display: "inline-block",
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: 4,
                  padding: "1px 8px",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.9)",
                  marginTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {authUser?.role || "Staff"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <div
        style={{ flex: 1, overflowY: "auto", paddingTop: 8, paddingBottom: 8 }}
      >
        {mobileNavItems.map((item) => (
          <MobileNavItem key={item.path} {...item} />
        ))}
      </div>

      {/* Bottom actions */}
      <div style={{ borderTop: "1px solid #f1f5f9", padding: "12px 8px" }}>
        {[
          {
            icon: <BellOutlined />,
            label: "Notifications",
            path: "/admin/notifications",
            color: "#10b981",
          },
          {
            icon: <CreditCardOutlined />,
            label: "Billing",
            path: "/admin/billing",
            color: "#f59e0b",
          },
          {
            icon: <SettingOutlined />,
            label: "Settings",
            path: "/admin/settings",
            color: "#06b6d4",
          },
          {
            icon: <GlobalOutlined />,
            label: "Discover",
            path: "/admin/discover",
            color: "#3b82f6",
          },
        ].map((item) => (
          <div
            key={item.path}
            onClick={() => {
              navigate(item.path);
              setMobileMenuOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              borderRadius: 8,
              margin: "2px 0",
              cursor: "pointer",
            }}
          >
            <span style={{ color: item.color, fontSize: 15 }}>{item.icon}</span>
            <span style={{ fontSize: 14, color: "#374151" }}>{item.label}</span>
            {item.label === "Notifications" && unreadNotificationsCount > 0 && (
              <Tag color="green" style={{ marginLeft: "auto", fontSize: 10 }}>
                {unreadNotificationsCount}
              </Tag>
            )}
          </div>
        ))}
        <div
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 20px",
            borderRadius: 8,
            margin: "2px 0",
            cursor: "pointer",
            color: "#ef4444",
          }}
        >
          <PoweroffOutlined style={{ fontSize: 15 }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>Logout</span>
        </div>
      </div>
    </Drawer>
  );

  // ── Header action bar (shared mobile/desktop avatar area) ────────────────────
  const headerActions = (
    <Space size={isMobile ? 6 : "middle"} align="center">
      {/* Bell */}
      <Popover
        content={notificationsContent}
        placement="bottomRight"
        trigger={["hover", "click"]}
        overlayInnerStyle={{
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          border: "1px solid rgba(0,0,0,0.06)",
          padding: 0,
        }}
      >
        <Badge
          count={unreadNotificationsCount}
          showZero={false}
          offset={[-6, 6]}
          overflowCount={99}
          size="small"
          style={{
            backgroundColor:
              unreadNotificationsCount > 1 ? "#ff4d4f" : "#52c41a",
            fontSize: "10px",
          }}
        >
          <Button
            icon={<BellOutlined />}
            shape="circle"
            size="middle"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "white",
              width: 36,
              height: 36,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        </Badge>
      </Popover>

      {/* User dropdown — desktop only; mobile uses drawer */}
      {!isMobile && authUser && (
        <Dropdown
          arrow
          menu={{
            items: [
              {
                key: "profile",
                icon: (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "2px 0",
                    }}
                  >
                    <Avatar
                      src={authUser?.thumbnail}
                      alt={authUser?.email}
                      style={{
                        border: `2px solid ${primaryColor}`,
                        width: 48,
                        height: 48,
                      }}
                      size="large"
                    />
                    <Space
                      direction="vertical"
                      style={{ marginLeft: 12, gap: 2, flex: 1 }}
                      size="small"
                    >
                      <Typography.Text
                        strong
                        style={{ fontSize: 14, color: "#262626" }}
                      >
                        {authUser?.name || "User Name"}
                      </Typography.Text>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12 }}
                        ellipsis={{ tooltip: authUser?.email }}
                      >
                        {authUser?.email}
                      </Typography.Text>
                      <Typography.Link
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/profile/${authUser?.id}`);
                        }}
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: primaryColor,
                        }}
                      >
                        View Profile
                      </Typography.Link>
                    </Space>
                  </div>
                ),
                onClick: () => navigate(`/admin/profile/${authUser?.id}`),
                style: {
                  padding: "8px 12px",
                  height: "auto",
                  background:
                    "linear-gradient(135deg, rgba(24,144,255,0.05), rgba(24,144,255,0.02))",
                  borderRadius: 8,
                  margin: 4,
                },
              },
              { type: "divider" },
              {
                key: "notifications",
                icon: (
                  <BellOutlined style={{ fontSize: 15, color: "#52c41a" }} />
                ),
                label: (
                  <Space
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <span>Notifications</span>
                    {unreadNotificationsCount > 0 && (
                      <Tag color="green">{unreadNotificationsCount}</Tag>
                    )}
                  </Space>
                ),
                onClick: () => navigate("/admin/notifications"),
              },
              {
                key: "billing",
                icon: (
                  <CreditCardOutlined
                    style={{ fontSize: 15, color: "#faad14" }}
                  />
                ),
                label: "Billing",
                onClick: () => navigate("/admin/billing"),
              },
              {
                key: "help-center",
                icon: (
                  <CompassOutlined
                    style={{ fontSize: 15, color: "#722ed1" }}
                  />
                ),
                label: "Help Center",
                onClick: () => navigate("/admin/help-center"),
              },
              {
                key: "discover",
                icon: (
                  <GlobalOutlined style={{ fontSize: 15, color: "#1890ff" }} />
                ),
                label: "Discover",
                onClick: () => navigate("/admin/discover"),
              },
              {
                key: "settings",
                icon: (
                  <SettingOutlined style={{ fontSize: 15, color: "#13c2c2" }} />
                ),
                label: "Settings",
                onClick: () => navigate("/admin/settings"),
              },
              { type: "divider" },
              {
                key: "logout",
                icon: <PoweroffOutlined style={{ fontSize: 15 }} />,
                label: "Logout",
                onClick: handleLogout,
                danger: true,
              },
            ],
          }}
          trigger={["hover", "click"]}
          placement="bottomRight"
          overlayStyle={{
            minWidth: 280,
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}
        >
          <Button
            type="text"
            style={{
              padding: "4px 8px",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 50,
              height: "auto",
              minHeight: 36,
            }}
          >
            <Space align="center" size={8} style={{ cursor: "pointer" }}>
              <Badge dot status="success" offset={[-4, 26]}>
                <Avatar
                  src={authUser?.avatar || authUser?.thumbnail}
                  icon={<UserOutlined />}
                  size={30}
                  style={{ border: "2px solid rgba(255,255,255,0.3)" }}
                />
              </Badge>
              <div style={{ textAlign: "left", lineHeight: 1.2 }}>
                <Text
                  strong
                  style={{
                    color: "white",
                    fontSize: 13,
                    display: "block",
                    maxWidth: 90,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {authUser?.name || "User"}
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 11,
                    display: "block",
                    maxWidth: 90,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {authUser?.role || "Role"}
                </Text>
              </div>
              <DownOutlined
                style={{ color: "rgba(255,255,255,0.8)", fontSize: 10 }}
              />
            </Space>
          </Button>
        </Dropdown>
      )}

      {/* Mobile avatar (no dropdown — menu is in drawer) */}
      {isMobile && authUser && (
        <Badge dot status="success" offset={[-3, 26]}>
          <Avatar
            src={authUser?.avatar || authUser?.thumbnail}
            icon={<UserOutlined />}
            size={32}
            style={{
              border: "2px solid rgba(255,255,255,0.4)",
              cursor: "pointer",
            }}
            onClick={() => setMobileMenuOpen(true)}
          />
        </Badge>
      )}
    </Space>
  );

  // ── ProLayout Native AppList configuration ──────────────────────────────────
  const adminAppList = useMemo(() => {
    const outletChildren = (shops || []).map((shop: any) => {
      const isSelected = shop._id === currentShop?._id;
      const shopMode = shop.shop_mode || shop.mode || "";
      return {
        icon: makeTileImg(isSelected ? primaryColor : "#0ea5e9", ICONS.table, shop.name),
        title: (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? primaryColor : "inherit" }}>
              {shop.name}
            </span>
            {isSelected && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: "14px",
                  padding: "1px 6px",
                  borderRadius: 10,
                  background: `${primaryColor}1c`,
                  color: primaryColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Active
              </span>
            )}
            {shopMode && !isSelected && (
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  lineHeight: "14px",
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: "#f1f5f9",
                  color: "#64748b",
                  textTransform: "capitalize",
                }}
              >
                {shopMode}
              </span>
            )}
          </span>
        ),
        desc: shop.location ? locationDisplay(shop.location) : "Launch outlet workspace",
        url: shopLandingPath,
        shopId: shop._id,
        shop: shop,
      };
    });

    const oversightChildren = [
      {
        icon: makeTileImg("#3b82f6", ICONS.reports, "dashboard"),
        title: "Executive Dashboard",
        desc: "Multi-outlet performance & analytics",
        url: "/admin/dashboard",
      },
      {
        icon: makeTileImg("#0ea5e9", ICONS.table, "shop-management"),
        title: "Branch Management",
        desc: "Configure outlets, registers & locations",
        url: "/admin/shop-management",
      },
      {
        icon: makeTileImg("#8b5cf6", ICONS.customers, "staff-management"),
        title: "Crew Management",
        desc: "Roles, permissions & staff accounts",
        url: "/admin/staff-management",
      },
      {
        icon: makeTileImg("#10b981", ICONS.reports, "reports"),
        title: "Consolidated Reports",
        desc: "Financial audits, sales & audit trails",
        url: "/admin/reports",
      },
      {
        icon: makeTileImg("#6366f1", ICONS.documents, "documents"),
        title: "Document Center",
        desc: "Invoices, agreements & cloud receipts",
        url: "/admin/documents",
      },
      {
        icon: makeTileImg("#64748b", ICONS.settings, "settings"),
        title: "Platform Settings",
        desc: "Tenant preferences & system configs",
        url: "/admin/settings",
      },
    ];

    return [
      {
        title: "Outlets & Branches",
        desc: "Switch branch or launch store operations workspace",
        children: outletChildren,
      },
      {
        title: "Platform Oversight",
        desc: "Cross-system administration & management tools",
        children: oversightChildren,
      },
    ];
  }, [shops, currentShop, primaryColor, shopLandingPath]);

  const handleAppItemClick = (item: any, popoverRef?: any) => {
    if (popoverRef?.current) {
      popoverRef.current.click();
    } else {
      setTimeout(() => document.body.click(), 10);
    }
    if (item?.shopId) {
      localStorage.setItem("shopId", item.shopId);
      localStorage.setItem("shop", JSON.stringify(item.shop));
      setCurrentShopId(item.shopId);
      message.success(`Switched to ${item.shop.name}`);
      navigate(item.url || shopLandingPath);
    } else if (item?.url) {
      navigate(item.url);
    }
  };

  return (
    <>
      {/* ── Global styles ── */}
      <style>{`
        /* White hamburger on mobile */
        .ant-pro-global-header-collapsed-button,
        .ant-pro-sider-collapsed-button,
        .ant-layout-sider-trigger {
          color: white !important;
        }

        /* ProLayout hamburger override */
        .ant-pro-global-header .ant-pro-global-header-logo + span,
        .ant-pro-global-header [class*="collapsedButton"],
        .ant-pro-layout-container [class*="menuRender"] button {
          color: white !important;
        }

        /* Force all SVG icons in header area white */
        .ant-pro-global-header svg,
        .ant-pro-global-header .anticon {
          color: white !important;
          fill: white !important;
        }

        /* Keep bell & user icons white */
        .notification-button svg,
        .notification-button .anticon {
          color: white !important;
        }

        /* Hover effect for dropdown menu items */
        .ant-dropdown-menu-item:not(.ant-dropdown-menu-item-danger):hover,
        .ant-dropdown-menu-item:not(.ant-dropdown-menu-item-danger).ant-dropdown-menu-item-active {
          background-color: #f1f5f9 !important;
        }
        
        .ant-dropdown-menu-item-danger:hover,
        .ant-dropdown-menu-item-danger.ant-dropdown-menu-item-active {
          background-color: #ff4d4f !important;
          border-color: #ff4d4f !important;
        }
        .ant-dropdown-menu-item-danger:hover *,
        .ant-dropdown-menu-item-danger.ant-dropdown-menu-item-active * {
          color: #ffffff !important;
        }

        .ant-pro-page-container-warp-page-header {
          display: none !important;
        }

        /* Mobile/tablet page container padding */
        @media (max-width: 992px) {
          .ant-pro-page-container {
            padding: 0 !important;
            margin: 0 !important;
          }
          .ant-pro-page-container-children-container {
            padding: 8px 10px !important;
          }
          .ant-pro-page-container-children-content {
            padding: 0 !important;
          }
          .ant-pro-page-container-warp-page-header {
            padding: 8px 10px !important;
          }
          .ant-breadcrumb {
            font-size: 12px !important;
          }
          .ant-pro-global-header {
            padding: 0 12px !important;
            height: 52px !important;
            line-height: 52px !important;
          }
          .ant-layout-content {
            overflow-x: hidden;
          }
        }

        @media (max-width: 768px) {
          .ant-pro-page-container-children-container {
            padding: 6px 10px !important;
          }
          .ant-pro-page-container-warp-page-header {
            padding: 6px 10px !important;
          }

          /* ProLayout Native AppList Popover Mobile Responsiveness */
          .ant-pro-layout-apps-popover {
            width: calc(100vw - 16px) !important;
            max-width: calc(100vw - 16px) !important;
            left: 8px !important;
            right: 8px !important;
            top: 56px !important;
          }
          .ant-pro-layout-apps-popover .ant-popover-content {
            width: 100% !important;
            max-width: 100% !important;
          }
          .ant-pro-layout-apps-popover .ant-popover-inner {
            width: 100% !important;
            max-width: 100% !important;
            padding: 12px 10px !important;
            border-radius: 14px !important;
            box-sizing: border-box !important;
            max-height: calc(85vh - 60px) !important;
            overflow-y: auto !important;
          }
          .ant-pro-layout-apps-default-content {
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .ant-pro-layout-apps-default-content-list {
            width: 100% !important;
            max-width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
          }
          .ant-pro-layout-apps-default-content-list-item-group {
            width: 100% !important;
            margin-bottom: 12px !important;
          }
          .ant-pro-layout-apps-default-content-list-item-group-title {
            font-size: 13px !important;
            font-weight: 700 !important;
            margin: 8px 0 6px 4px !important;
            color: #334155 !important;
          }
          .ant-pro-layout-apps-default-content-list-item {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 54px !important;
            display: block !important;
            padding: 8px 10px !important;
            box-sizing: border-box !important;
            border-radius: 8px !important;
            margin-bottom: 4px !important;
          }
          .ant-pro-layout-apps-default-content-list-item a {
            display: flex !important;
            align-items: center !important;
            width: 100% !important;
          }
          .ant-pro-layout-apps-default-content-list-item a > img,
          .ant-pro-layout-apps-default-content-list-item a > div:first-child {
            width: 38px !important;
            height: 38px !important;
            flex-shrink: 0 !important;
            border-radius: 8px !important;
          }
          .ant-pro-layout-apps-default-content-list-item a > div:last-child {
            margin-inline-start: 12px !important;
            flex: 1 !important;
            min-width: 0 !important;
            overflow: hidden !important;
          }
          .ant-pro-layout-apps-default-content-list-item a > div:last-child > div {
            font-size: 13px !important;
            line-height: 18px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }
          .ant-pro-layout-apps-default-content-list-item a > div:last-child > span {
            font-size: 11px !important;
            line-height: 16px !important;
            display: block !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }
        }

        /* Smooth drawer transition */
        .ant-drawer-content-wrapper {
          transition: transform 0.28s cubic-bezier(0.32, 0, 0.67, 0) !important;
        }

        /* Active nav tab brand background */
        .ant-pro-top-nav-header .ant-menu-item-selected {
          background: rgba(255,255,255,0.22) !important;
          border-radius: 6px !important;
        }
        .ant-pro-top-nav-header .ant-menu-submenu-selected > .ant-menu-submenu-title {
          background: rgba(255,255,255,0.22) !important;
          border-radius: 6px !important;
        }
        .ant-pro-top-nav-header .ant-menu-item-selected,
        .ant-pro-top-nav-header .ant-menu-submenu-selected .ant-menu-submenu-title {
          color: #ffffff !important;
        }

        /* ProLayout top nav icon overrides */
        .ant-pro-top-nav-header .ant-menu-item .ant-pro-base-menu-horizontal-item-icon,
        .ant-pro-top-nav-header .ant-menu-submenu-title .ant-pro-base-menu-horizontal-item-icon {
          display: none !important;
        }
        /* Hide ProLayout's native icons in overflow popup */
        .nav-overflow-popup .ant-pro-base-menu-horizontal-item-icon {
          display: none !important;
        }
        /* Submenu popup background */
        .ant-menu-submenu-popup {
          background: ${primaryColor} !important;
        }
        .ant-menu-submenu-popup .ant-menu {
          background: ${primaryColor} !important;
        }
        /* Overflow popup (More dropdown) styling */
        .nav-overflow-popup {
          background: ${primaryColor} !important;
        }
        .nav-overflow-popup .ant-menu {
          background: ${primaryColor} !important;
        }
        .nav-overflow-popup .ant-menu-item {
          color: rgba(255,255,255,0.85) !important;
        }
        .nav-overflow-popup .ant-menu-item:hover {
          color: #ffffff !important;
          background: rgba(255,255,255,0.1) !important;
        }
        .nav-overflow-popup .ant-menu-item-selected {
          color: #ffffff !important;
          background: rgba(255,255,255,0.15) !important;
        }
        .nav-overflow-popup .ant-menu-item .anticon {
          color: rgba(255,255,255,0.85) !important;
        }
        .nav-overflow-popup .ant-menu-item:hover .anticon {
          color: #ffffff !important;
        }
        .nav-overflow-popup .ant-menu-item-selected .anticon {
          color: #ffffff !important;
        }

        /* Logo and left header vertical alignment */
        .ant-pro-top-nav-header-main-left,
        .ant-pro-top-nav-header-logo,
        .ant-pro-top-nav-header-logo > div,
        #customize_menu_header {
          display: flex !important;
          align-items: center !important;
          height: 100% !important;
        }
        #customize_menu_header img {
          display: block !important;
          max-height: 36px !important;
          width: auto !important;
          object-fit: contain !important;
        }

        /* Notification popover */
        .notification-popover-overlay .ant-popover-inner {
          padding: 0 !important;
        }
      `}</style>

      {MobileDrawer}

      <ProLayout
        style={{ maxWidth: "1920px" }}
        logo={
          tenant?.tenant_logo?.url ? (
            <img
              src={tenant.tenant_logo.url}
              alt="tenant-logo"
              style={{
                height: isMobile ? 32 : 36,
                maxHeight: 36,
                maxWidth: isMobile ? 96 : 130,
                objectFit: "contain",
                display: "block",
                cursor: "pointer",
              }}
              onClick={() => navigate("/admin/dashboard")}
            />
          ) : (
            <img
              src="/relia.png"
              alt="relia-logo"
              style={{
                height: isMobile ? 30 : 34,
                maxHeight: 34,
                maxWidth: isMobile ? 96 : 130,
                objectFit: "contain",
                display: "block",
                cursor: "pointer",
              }}
              onClick={() => navigate("/admin/dashboard")}
            />
          )
        }
        title=""
        menuHeaderRender={(logo: any) => (
          <div
            id="customize_menu_header"
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={() => navigate("/admin/dashboard")}
          >
            {logo}
          </div>
        )}
        layout="top"
        splitMenus={false}
        fixedHeader={true}
        contentWidth="Fluid"
        navTheme="light"
        colorPrimary={primaryColor}
        contentStyle={{ padding: 0, margin: "0 auto" }}
        breadcrumbProps={{ items: [] }}
        {...navRoutes}
        appList={adminAppList}
        itemClick={handleAppItemClick}
        onItemClick={handleAppItemClick}
        menuRender={isMobile ? false : undefined}
        menuProps={{
          overflowedIndicatorPopupClassName: "nav-overflow-popup",
          overflowedIndicator: (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "0 14px",
                height: 40,
                cursor: "pointer",
                color: "rgba(255,255,255,0.85)",
                fontSize: 14,
                userSelect: "none",
              }}
            >
              <AppstoreOutlined style={{ fontSize: 14 }} />
              <span>More</span>
              <DownOutlined style={{ fontSize: 9, opacity: 0.7 }} />
            </div>
          ),
        }}
        avatarProps={
          !isMobile
            ? {
                src: authUser?.avatar || authUser?.thumbnail,
                render: (_props: any, _dom: any) => headerActions,
              }
            : undefined
        }
        headerRender={
          isMobile
            ? () => (
                <div
                  style={{
                    height: 52,
                    background: primaryColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 16px",
                    position: "sticky",
                    top: 0,
                    zIndex: 100,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => setMobileMenuOpen(true)}
                      style={{
                        background: "rgba(255,255,255,0.15)",
                        border: "1px solid rgba(255,255,255,0.25)",
                        borderRadius: 8,
                        width: 36,
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "white",
                        fontSize: 16,
                      }}
                    >
                      <MenuOutlined style={{ color: "white" }} />
                    </button>
                    <Popover
                      open={mobileAppListOpen}
                      onOpenChange={setMobileAppListOpen}
                      trigger={["click"]}
                      placement="bottomLeft"
                      overlayClassName="ant-pro-layout-apps-popover"
                      content={
                        <div
                          className="ant-pro-layout-apps-default-content"
                          style={{
                            maxHeight: "calc(82vh - 60px)",
                            overflowY: "auto",
                            width: "100%",
                          }}
                        >
                          <ul className="ant-pro-layout-apps-default-content-list" style={{ width: "100%", margin: 0, padding: 0 }}>
                            {adminAppList.map((group, gIdx) => (
                              <div key={gIdx} className="ant-pro-layout-apps-default-content-list-item-group">
                                <div className="ant-pro-layout-apps-default-content-list-item-group-title">
                                  {group.title}
                                </div>
                                {group.children?.map((item: any, iIdx: number) => (
                                  <li
                                    key={iIdx}
                                    className="ant-pro-layout-apps-default-content-list-item"
                                    onClick={() => {
                                      setMobileAppListOpen(false);
                                      handleAppItemClick(item);
                                    }}
                                  >
                                    <a>
                                      {item.icon}
                                      <div>
                                        <div>{item.title}</div>
                                        {item.desc && <span>{item.desc}</span>}
                                      </div>
                                    </a>
                                  </li>
                                ))}
                              </div>
                            ))}
                          </ul>
                        </div>
                      }
                    >
                      <button
                        style={{
                          background: mobileAppListOpen
                            ? "rgba(255,255,255,0.28)"
                            : "rgba(255,255,255,0.15)",
                          border: "1px solid rgba(255,255,255,0.25)",
                          borderRadius: 8,
                          width: 36,
                          height: 36,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "white",
                        }}
                        title="Switch Outlets & Apps"
                      >
                        <svg width="15" height="15" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M0 0h3v3H0V0zm4.5 0h3v3h-3V0zM9 0h3v3H9V0zM0 4.5h3v3H0v-3zm4.503 0h3v3h-3v-3zM9 4.5h3v3H9v-3zM0 9h3v3H0V9zm4.503 0h3v3h-3V9zM9 9h3v3H9V9z" />
                        </svg>
                      </button>
                    </Popover>
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      transform: "translateX(-50%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {tenant?.tenant_logo?.url ? (
                      <Image
                        src={tenant.tenant_logo.url}
                        height={36}
                        preview={false}
                        alt="logo"
                        style={{
                          objectFit: "contain",
                          maxWidth: 96,
                          filter: "brightness(0) invert(1)",
                          cursor: "pointer",
                        }}
                        onClick={() => navigate("/admin/dashboard")}
                      />
                    ) : (
                      <Image
                        src="/relia.png"
                        height={32}
                        preview={false}
                        alt="logo"
                        style={{
                          objectFit: "contain",
                          maxWidth: 96,
                          filter: "brightness(0) invert(1)",
                          cursor: "pointer",
                        }}
                        onClick={() => navigate("/admin/dashboard")}
                      />
                    )}
                  </div>

                  {headerActions}
                </div>
              )
            : undefined
        }
        location={{ pathname: location.pathname }}
        token={{
          bgLayout: "#f6ffed",
          colorPrimary: primaryColor,
          colorTextAppListIconHover: "black",
          colorTextAppListIcon: "white",
          colorBgAppListIconHover: "white",
          hashId: "reliatech",
          header: {
            colorBgMenuItemSelected: `rgba(255,255,255,0.22)`,
            colorBgHeader: primaryColor,
            colorTextMenu: "rgba(255,255,255,0.85)",
            colorTextMenuSecondary: "rgba(255,255,255,0.7)",
            colorBgMenuItemHover: "rgba(255,255,255,0.12)",
          },
        }}
        menuItemRender={(item: any, dom: any) => (
          <NavLink to={item?.path || "/admin"}>
            {item?.icon ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: 15,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{dom}</span>
              </span>
            ) : (
              dom
            )}
          </NavLink>
        )}
      >
        <PageContainer
          pageHeaderRender={false}
          breadcrumbRender={false}
          title={false}
          childrenContentStyle={isMobile ? { padding: 0 } : undefined}
          style={isMobile ? { padding: 0 } : undefined}
        >
          <Outlet />
        </PageContainer>

        <Modal
          title="Notification Details"
          open={detailsModalVisible}
          onCancel={() => setDetailsModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailsModalVisible(false)}>
              Close
            </Button>,
          ]}
          width={isMobile ? "94vw" : 600}
          styles={{ body: { padding: isMobile ? 12 : 24 } }}
        >
          {selectedNotification && (
            <div>
              <Title level={isMobile ? 5 : 4}>
                {selectedNotification.title}
              </Title>
              <Space style={{ marginBottom: 16, flexWrap: "wrap" }}>
                {renderTypeTag(selectedNotification.type)}
                {renderPriorityTag(selectedNotification.priority)}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(selectedNotification.createdAt).format(
                    "MMM D, YYYY h:mm A"
                  )}
                </Text>
              </Space>
              <Text>{selectedNotification.message}</Text>
            </div>
          )}
        </Modal>
      </ProLayout>
      <BiasharaAIFab />
    </>
  );
};

export default AdminDashboard;