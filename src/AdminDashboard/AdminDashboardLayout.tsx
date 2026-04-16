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
  HomeFilled,
  MenuOutlined,
  PoweroffOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "src/store";
import useProLayoutNav from "./defaultprops";
import {
  fetchMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@services/notifications";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { usePrimaryColor } from "@context/PrimaryColorContext";

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

// ── Mobile detection hook ─────────────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
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
  path,
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

// ── Smart overflow nav ────────────────────────────────────────────────────────
// Two-phase render:
//   Phase 1 (measured === false): all items render with visibility:hidden so
//     the browser lays them out and we can read their offsetWidth.
//   Phase 2 (measured === true): items beyond visibleCount get display:none,
//     and the "More" dropdown appears with only the truly hidden routes.
// ResizeObserver re-triggers measurement on every container resize.
interface SmartNavProps {
  routes: Array<{ path?: string; name?: string; label?: string; icon?: React.ReactNode; key?: string }>;
  primaryColor: string;
}

const MORE_BTN_WIDTH = 116; // px reserved for the "More" button

const SmartOverflowNav: React.FC<SmartNavProps> = ({ routes, primaryColor }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefsRef = useRef<(HTMLDivElement | null)[]>([]);
  const moreBtnRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(-1);

  // -1 means "measuring phase — all items visible (but hidden) for offsetWidth reads"
  const [visibleCount, setVisibleCount] = useState<number>(-1);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    // Read natural widths — only valid during measuring phase (all items displayed)
    const widths = itemRefsRef.current.map((el) => (el ? el.offsetWidth : 0));

    const totalAll = widths.reduce((s, w) => s + w, 0);
    if (totalAll <= containerWidth) {
      setVisibleCount(routes.length); // everything fits, no More button
      return;
    }

    // Find how many items fit alongside the More button
    const budget = containerWidth - MORE_BTN_WIDTH;
    let used = 0;
    let count = 0;
    for (let i = 0; i < widths.length; i++) {
      if (used + widths[i] <= budget) {
        used += widths[i];
        count++;
      } else {
        break;
      }
    }
    setVisibleCount(Math.max(0, count));
  }, [routes.length]);

  // Trigger a fresh measurement cycle: reset to phase-1 → paint → measure
  const scheduleMeasure = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    // Reset so all items render visible (but invisible to user) for measurement
    setVisibleCount(-1);
    // Double RAF: first waits for React commit, second for browser layout
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(measure);
    });
  }, [measure]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    scheduleMeasure();

    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(container);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleMeasure, routes]);

  const isMeasuring = visibleCount === -1;

  const isActive = (path?: string) =>
    !!path &&
    (location.pathname === path || location.pathname.startsWith(path + "/"));

  const overflowRoutes = isMeasuring ? [] : routes.slice(visibleCount);
  const hasOverflow = overflowRoutes.length > 0;
  const overflowHasActive = overflowRoutes.some((r) => isActive(r.path));

  const overflowMenuItems = overflowRoutes.map((route) => ({
    key: route.path || route.key || route.name || "",
    icon: <span style={{ fontSize: 14, color: "white" }}>{route.icon}</span>,
    label: (
      <span style={{ fontSize: 13, color: "white" }}>
        {route.name || route.label || ""}
      </span>
    ),
    onClick: () => navigate(route.path || "/admin"),
    style: {
      backgroundColor: isActive(route.path) ? "rgba(255,255,255,0.2)" : "transparent",
      borderRadius: 6,
      fontWeight: isActive(route.path) ? 600 : 400,
      marginBottom: 2,
    },
  }));

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        alignItems: "center",
        flex: 1,
        // Hide overflow so invisible measurement items don't cause scrollbars
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      {routes.map((route, idx) => {
        const active = isActive(route.path);
        // During measurement: all items visible (but container is overflow:hidden)
        // After measurement: items beyond visibleCount get display:none
        const hidden = !isMeasuring && idx >= visibleCount;

        return (
          <div
            key={route.path || idx}
            ref={(el) => { itemRefsRef.current[idx] = el; }}
            onClick={() => { if (!hidden) navigate(route.path || "/admin"); }}
            style={{
              display: hidden ? "none" : "flex",
              // During measurement phase keep invisible so layout is accurate
              // but the user never sees the flash
              visibility: isMeasuring ? "hidden" : "visible",
              alignItems: "center",
              gap: 6,
              padding: "0 14px",
              height: 40,
              cursor: hidden ? "default" : "pointer",
              color: active ? "#fff" : "rgba(255,255,255,0.78)",
              fontWeight: active ? 600 : 400,
              fontSize: 14,
              borderBottom: active
                ? "2px solid rgba(255,255,255,0.9)"
                : "2px solid transparent",
              transition: "color 0.2s, border-color 0.2s",
              whiteSpace: "nowrap",
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            <span style={{ fontSize: 14, display: "flex", alignItems: "center" }}>
              {route.icon}
            </span>
            <span>{route.name || route.label}</span>
          </div>
        );
      })}

      {/* "More" button — only rendered when items genuinely overflow */}
      {hasOverflow && (
        <>
          <style>{`
            .smart-nav-overflow-dropdown .ant-dropdown-menu {
              background-color: ${primaryColor} !important;
              box-shadow: none !important;
              padding: 4px !important;
            }
            .smart-nav-overflow-dropdown .ant-dropdown-menu-item {
              border-radius: 6px !important;
              margin-bottom: 2px !important;
            }
            .smart-nav-overflow-dropdown .ant-dropdown-menu-item:hover {
              background-color: rgba(255,255,255,0.15) !important;
            }
          `}</style>
          <Dropdown
            menu={{ items: overflowMenuItems }}
            placement="bottomRight"
            trigger={["click", "hover"]}
            overlayClassName="smart-nav-overflow-dropdown"
            dropdownRender={(menu) => (
              <div
                style={{
                  backgroundColor: primaryColor,
                  borderRadius: 10,
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  minWidth: 200,
                }}
              >
                {menu}
              </div>
            )}
          >
            <div
              ref={moreBtnRef}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "0 14px",
                height: 40,
                cursor: "pointer",
                color: overflowHasActive ? "#fff" : "rgba(255,255,255,0.78)",
                fontWeight: overflowHasActive ? 600 : 400,
                fontSize: 14,
                borderBottom: overflowHasActive
                  ? "2px solid rgba(255,255,255,0.9)"
                  : "2px solid transparent",
                transition: "all 0.2s",
                userSelect: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <AppstoreOutlined style={{ fontSize: 14 }} />
              <span>More</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.25)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  lineHeight: 1,
                }}
              >
                {overflowRoutes.length}
              </span>
              <DownOutlined style={{ fontSize: 9, opacity: 0.7 }} />
            </div>
          </Dropdown>
        </>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  const storedTenant = localStorage.getItem("tenant");
  const storedUser = localStorage.getItem("user");
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
            onClick={() => markAllAsReadMutation.mutate()}
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

  // ── Breadcrumbs ──────────────────────────────────────────────────────────────
  const breadcrumbItems = location.pathname
    .split("/")
    .filter((p) => p)
    .map((path, index, arr) => {
      const isLast = index === arr.length - 1;
      const url = `/${arr.slice(0, index + 1).join("/")}`;
      const isDynamicSegment =
        /^[a-f0-9]{24}$/i.test(path) || /^[0-9]+$/.test(path);
      const label = isDynamicSegment
        ? "Details"
        : path
          .replace(/-/g, " ")
          .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
      return {
        title: isLast ? (
          <span key={path}>{label}</span>
        ) : (
          <NavLink to={url} key={path}>
            {label}
          </NavLink>
        ),
      };
    });

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
              height={70}
              preview={false}
              alt="logo"
              style={{
                objectFit: "contain",
                maxWidth: 120,
                filter: "brightness(0) invert(1)",
              }}
            />
          ) : (
            <Image
              src="/relia.png"
              height={36}
              width={90}
              preview={false}
              alt="logo"
              style={{ filter: "brightness(0) invert(1)" }}
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

  // ── Desktop header with SmartOverflowNav ─────────────────────────────────────
  // We bypass ProLayout's built-in menu entirely for the top nav on desktop
  // and instead render our own SmartOverflowNav that correctly handles overflow.
  const desktopHeaderRender = () => (
    <div
      style={{
        height: 56,
        background: primaryColor,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
      }}
    >
      {/* Logo */}
      <div style={{ flexShrink: 0 }}>
        {tenant?.tenant_logo?.url ? (
          <Image
            src={tenant.tenant_logo.url}
            height={70}
            preview={false}
            alt="tenant-logo"
            style={{ padding: 4, objectFit: "contain", maxWidth: 110 }}
          />
        ) : (
          <Image
            src="/relia.png"
            height={38}
            width={100}
            preview={false}
            alt="relia-logo"
            style={{ padding: 6 }}
          />
        )}
      </div>

      {/* Smart nav — takes all remaining space, collapses into "More" */}
      <SmartOverflowNav
        routes={navRoutes.route?.routes || []}
        primaryColor={primaryColor}
      />

      {/* Right-side actions */}
      <div style={{ flexShrink: 0 }}>{headerActions}</div>
    </div>
  );

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
        .ant-dropdown-menu-item:hover {
          background: rgba(255, 255, 255, 0.15) !important;
        }
        
        .ant-dropdown-menu-item-active {
          background: rgba(255, 255, 255, 0.1) !important;
        }

        /* Mobile page container padding */
        @media (max-width: 767px) {
          .ant-pro-page-container {
            padding: 12px !important;
            margin: 0 !important;
          }
          .ant-pro-page-container-warp-page-header {
            padding: 8px 12px !important;
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

        /* Smooth drawer transition */
        .ant-drawer-content-wrapper {
          transition: transform 0.28s cubic-bezier(0.32, 0, 0.67, 0) !important;
        }

        /* Notification popover */
        .notification-popover-overlay .ant-popover-inner {
          padding: 0 !important;
        }
      `}</style>

      {MobileDrawer}

      <ProLayout
        style={{ maxWidth: "1920px" }}
        logo={false}
        title=""
        contentWidth="Fluid"
        navTheme="light"
        colorPrimary={primaryColor}
        contentStyle={{ padding: 0, margin: "0 auto" }}
        layout="mix"
        splitMenus={false}
        fixedHeader={false}
        {...navRoutes}
        // Suppress ProLayout's built-in top menu — we render our own SmartOverflowNav
        menuRender={false}
        headerRender={isMobile
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
              {/* Hamburger */}
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

              {/* Logo center */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
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
                      maxWidth: 80,
                      filter: "brightness(0) invert(1)",
                    }}
                  />
                ) : (
                  <Image
                    src="/relia.png"
                    height={30}
                    width={75}
                    preview={false}
                    alt="logo"
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                )}
              </div>

              {/* Right actions */}
              {headerActions}
            </div>
          )
          : desktopHeaderRender
        }
        avatarProps={undefined}
        token={{
          bgLayout: "#f6ffed",
          colorPrimary: primaryColor,
          colorTextAppListIconHover: "black",
          colorTextAppListIcon: "white",
          colorBgAppListIconHover: "white",
          hashId: "reliatech",
          header: {
            colorBgMenuItemSelected: "#f6ffed",
            colorBgHeader: primaryColor,
            colorTextMenu: "#c5bfbfff",
            colorTextMenuSecondary: "#595959",
            colorBgMenuItemHover: "#f6ffed",
          },
        }}
        menuHeaderRender={(logo: any, _title: any) => (
          <div
            id="customize_menu_header"
            style={{ height: "0px", display: "flex", alignItems: "center" }}
          >
            {logo}
          </div>
        )}
        menuItemRender={(item: any, dom: any) => (
          <NavLink to={item.path || "/admin"}>{dom}</NavLink>
        )}
      >
        <PageContainer
          breadcrumb={{
            items: [
              {
                title: (
                  <NavLink to="/admin">
                    <HomeFilled /> {!isMobile && "Home"}
                  </NavLink>
                ),
              },
              ...breadcrumbItems,
            ],
          }}
          style={{ padding: isMobile ? "0 4px" : undefined }}
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
    </>
  );
};

export default AdminDashboard;