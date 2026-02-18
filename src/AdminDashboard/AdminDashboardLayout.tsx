import React, { useState, useMemo, useEffect } from "react";
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
} from "antd";
import { PageContainer, ProLayout } from "@ant-design/pro-components";
import {
  BellOutlined,
  CompassOutlined,
  HomeFilled,
  PoweroffOutlined,
  SettingOutlined,
  UserOutlined,
  DownOutlined,
  GlobalOutlined,
  CreditCardOutlined,
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

const AdminDashboard: React.FC = () => {
  const storedTenant = localStorage.getItem("tenant");
  const storedUser = localStorage.getItem("user");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const user = storedUser ? JSON.parse(storedUser) : null;

  const allNavRoutes = useProLayoutNav();
  const hiddenRoutes = ["help-center"];

  // Filter hidden routes
  const navRoutes = useMemo(() => {
    const filteredRoutes =
      allNavRoutes.route?.routes?.filter(
        (route) =>
          !hiddenRoutes.includes(route.key || route.path?.split("/").pop())
      ) || [];

    return {
      ...allNavRoutes,
      route: {
        ...allNavRoutes.route,
        routes: filteredRoutes,
      },
    };
  }, [allNavRoutes]);

  const { user: authUser } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  const primaryColor = usePrimaryColor();

  // Auto-redirect to first available route if on /admin root
  useEffect(() => {
    if (location.pathname === "/admin" || location.pathname === "/admin/") {
      const firstRoute = navRoutes.route?.routes?.[0]?.path;
      if (firstRoute && firstRoute !== "/admin") {
        navigate(firstRoute, { replace: true });
      }
    }
  }, [location.pathname, navRoutes, navigate]);

  const handleLogin = () => {
    navigate("/login");
  };

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
    onError: (error) => {
      console.error("Failed to fetch notifications:", error);
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
    },
    onError: (error) => {
      console.error("Failed to mark all notifications as read:", error);
    },
    cacheTime: 0,
    networkMode: "always",
  });

  const unreadNotificationsCount = notificationData?.unreadCount || 0;
  const recentNotifications = (notificationData?.data || [])
    .filter((notification: any) => !notification.read)
    .slice(0, 5);

  const handleViewDetails = (notification: any) => {
    setSelectedNotification(notification);
    setDetailsModalVisible(true);
    if (!notification.read) {
      markAsReadMutation.mutate(notification._id);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const goToNotifications = () => {
    navigate("/admin/notifications");
  };

  const handleCloseDetails = () => {
    setDetailsModalVisible(false);
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

  const notificationsContent = (
    <div style={{ width: 350, maxHeight: 500, overflow: "auto" }}>
      <div
        style={{
          padding: "12px 12px 8px",
          display: "flex",
          justifyContent: "space-between",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Text strong>Notifications</Text>
        {unreadNotificationsCount > 0 && (
          <Button
            type="link"
            size="small"
            onClick={handleMarkAllAsRead}
            style={{ padding: 0 }}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 20, textAlign: "center" }}>
          Loading notifications...
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
                padding: "12px 16px",
                backgroundColor: "rgba(24, 144, 255, 0.05)",
                cursor: "pointer",
              }}
              onClick={() => handleViewDetails(item)}
            >
              <List.Item.Meta
                avatar={renderPriorityIndicator(item.priority)}
                title={
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Text strong>{item.title}</Text>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {dayjs(item.createdAt).fromNow()}
                    </Text>
                  </div>
                }
                description={
                  <Text
                    type="secondary"
                    style={{ fontSize: "13px" }}
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
        <Button type="link" onClick={goToNotifications}>
          View all notifications
        </Button>
      </div>
    </div>
  );

  const breadcrumbItems = location.pathname
    .split("/")
    .filter((path) => path)
    .map((path, index, arr) => {
      const isLast = index === arr.length - 1;
      const url = `/${arr.slice(0, index + 1).join("/")}`;

      const isDynamicSegment =
        /^[a-f0-9]{24}$/i.test(path) || /^[0-9]+$/.test(path);
      const label = isDynamicSegment
        ? "Details"
        : path
          .replace(/-/g, " ")
          .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());

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

  return (
    <>
      <ProLayout
        style={{ maxWidth: "1920px" }}
        logo={
          tenant?.tenant_logo?.url ? (
            <Image
              src={tenant.tenant_logo.url}
              height={60}
              preview={false}
              alt="tenant-logo"
              style={{
                padding: 5,
                objectFit: "contain",
                maxWidth: "120px",
              }}
            />
          ) : (
            <Image
              src="/relia.png"
              height={55}
              width={120}
              preview={false}
              alt="relia-logo"
              style={{ padding: 12 }}
            />
          )
        }
        title=""
        contentWidth="Fluid"
        navTheme="light"
        colorPrimary={primaryColor}
        contentStyle={{ padding: 0, margin: "0 auto" }}
        layout="mix"
        splitMenus={true}
        fixedHeader={false}
        {...navRoutes}
        avatarProps={{
          src:
            authUser?.thumbnail ||
            "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg",
          shape: "circle",
          alt: "image",
          size: "large",
          style: { border: `2px solid white`, width: 32, height: 32 },
          render: (_props, dom) => (
            <Space size="middle">
              <Popover
                content={notificationsContent}
                placement="bottomRight"
                trigger={["hover", "click"]}
                overlayStyle={{ width: 350, padding: 0 }}
                overlayClassName="notification-popover-overlay"
                arrow={{ pointAtCenter: true }}
                overlayInnerStyle={{
                  borderRadius: 12,
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  background: "rgba(255, 255, 255, 0.98)",
                  backdropFilter: "blur(20px)",
                  padding: 0,
                }}
              >
                <Badge
                  count={unreadNotificationsCount}
                  showZero={false}
                  offset={[-8, 8]}
                  overflowCount={99}
                  size="small"
                  style={{
                    backgroundColor:
                      unreadNotificationsCount > 1 ? "#ff4d4f" : "#52c41a",
                    boxShadow: "0 2px 8px rgba(255, 77, 79, 0.3)",
                    fontSize: "10px",
                    lineHeight: "14px",
                  }}
                >
                  <Button
                    icon={<BellOutlined />}
                    shape="circle"
                    size="middle"
                    className="notification-button"
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "rgba(255, 255, 255, 0.9)",
                      width: "44px",
                      height: "44px",
                      fontSize: "16px",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  />
                </Badge>
              </Popover>

              {authUser ? (
                <Dropdown
                  autoFocus
                  arrow
                  menu={{
                    disabled: !authUser,
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
                                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
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
                                style={{
                                  fontSize: 14,
                                  color: "#262626",
                                  lineHeight: 1.2,
                                }}
                              >
                                {authUser?.name || "User Name"}
                              </Typography.Text>
                              <Typography.Text
                                type="secondary"
                                style={{
                                  fontSize: 12,
                                  lineHeight: 1.2,
                                  color: "#8c8c8c",
                                }}
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
                            "linear-gradient(135deg, rgba(24, 144, 255, 0.05), rgba(24, 144, 255, 0.02))",
                          borderRadius: "8px",
                          margin: "4px",
                        },
                      },
                      { type: "divider" },
                      {
                        key: "notifications",
                        icon: (
                          <BellOutlined
                            style={{ fontSize: 16, color: "#52c41a" }}
                          />
                        ),
                        label: (
                          <Space
                            style={{
                              width: "100%",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>Notifications</span>
                            {unreadNotificationsCount > 0 && (
                              <Tag color="green">
                                {unreadNotificationsCount}
                              </Tag>
                            )}
                          </Space>
                        ),
                        onClick: () => navigate("/admin/notifications"),
                      },
                      {
                        key: "billing",
                        icon: (
                          <CreditCardOutlined
                            style={{ fontSize: 16, color: "#faad14" }}
                          />
                        ),
                        label: "Billing",
                        onClick: () => navigate("/admin/billing"),
                      },
                      {
                        key: "help-center",
                        icon: (
                          <CompassOutlined
                            style={{ fontSize: 16, color: "#722ed1" }}
                          />
                        ),
                        label: "Help Center",
                        onClick: () => navigate("/admin/help-center"),
                      },
                      {
                        key: "discover",
                        icon: (
                          <GlobalOutlined
                            style={{ fontSize: 16, color: "#1890ff" }}
                          />
                        ),
                        label: "Discover",
                        onClick: () => navigate("/admin/discover"),
                      },
                      {
                        key: "settings",
                        icon: (
                          <SettingOutlined
                            style={{ fontSize: 16, color: "#13c2c2" }}
                          />
                        ),
                        label: "Settings",
                        onClick: () => navigate("/admin/settings"),
                      },
                      { type: "divider" },
                      {
                        key: "logout",
                        icon: <PoweroffOutlined style={{ fontSize: 16 }} />,
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
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <Button
                    type="text"
                    className="user-dropdown-trigger"
                    style={{
                      padding: "4px 8px",
                      background: "rgba(255, 255, 255, 0.1)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: 50,
                      height: "auto",
                      minHeight: "36px",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    <Space
                      align="center"
                      size={8}
                      style={{ cursor: "pointer" }}
                    >
                      <Badge dot status="success" offset={[-6, 24]}>
                        <Avatar
                          src={authUser?.avatar || authUser?.thumbnail}
                          alt={authUser?.email}
                          size={32}
                          style={{
                            border: "2px solid rgba(255, 255, 255, 0.3)",
                            boxShadow: "0 1px 4px rgba(0, 0, 0, 0.15)",
                          }}
                          icon={<UserOutlined />}
                        />
                      </Badge>
                      <div
                        style={{
                          textAlign: "left",
                          lineHeight: 1.2,
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <Text
                          strong
                          style={{
                            color: "white",
                            fontSize: 13,
                            fontWeight: 600,
                            textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 100,
                          }}
                        >
                          {authUser?.name || "User"}
                        </Text>

                        <Text
                          style={{
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: 11,
                            fontWeight: 400,
                            textShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 100,
                          }}
                        >
                          {authUser?.role || "Role"}
                        </Text>
                      </div>
                      <DownOutlined
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          fontSize: 10,
                        }}
                      />
                    </Space>
                  </Button>
                </Dropdown>
              ) : (
                <Button icon={<PoweroffOutlined />} onClick={handleLogin}>
                  Login
                </Button>
              )}
            </Space>
          ),
        }}
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
        menuHeaderRender={(logo, title) => (
          <div
            id="customize_menu_header"
            style={{
              height: "0px",
              display: "flex",
              alignItems: "center",
              rowGap: 8,
            }}
          >
            {logo}
          </div>
        )}
        menuItemRender={(item, dom) => {
          return <NavLink to={item.path || "/admin"}>{dom}</NavLink>;
        }}
      >
        <PageContainer
          breadcrumb={{
            items: [
              {
                title: (
                  <NavLink to="/admin">
                    <HomeFilled /> Home
                  </NavLink>
                ),
              },
              ...breadcrumbItems,
            ],
          }}
        >
          <Outlet />
        </PageContainer>

        <Modal
          title="Notification Details"
          open={detailsModalVisible}
          onCancel={handleCloseDetails}
          footer={[
            <Button key="close" onClick={handleCloseDetails}>
              Close
            </Button>,
          ]}
          width={600}
        >
          {selectedNotification && (
            <div>
              <Title level={4}>{selectedNotification.title}</Title>
              <Space style={{ marginBottom: 16 }}>
                {renderTypeTag(selectedNotification.type)}
                {renderPriorityTag(selectedNotification.priority)}
                <Text type="secondary">
                  {dayjs(selectedNotification.createdAt).format(
                    "MMMM D, YYYY h:mm A"
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