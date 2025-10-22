import React, { useState, useMemo } from "react";
import { Badge, Breadcrumb, Button, Dropdown, Empty, Image, List, Popover, Space, Typography, Modal, Tag, Avatar } from "antd";
import { PageContainer, ProLayout } from "@ant-design/pro-components";
import {
  BellOutlined,
  CompassOutlined,
  DashboardOutlined,
  HomeFilled,
  PoweroffOutlined,
  SettingOutlined,
  UserOutlined,
  DownOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "src/store";
import useProLayoutNav from "./defaultprops";
import { fetchMyNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@services/notifications";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { usePrimaryColor } from "@context/PrimaryColorContext";

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

const AdminDashboard: React.FC = () => {
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const allNavRoutes = useProLayoutNav();
  const hiddenRoutes = ['help-center'];

  // Simply filter hidden routes - accounting routes are already handled in defaultprops.tsx
  const navRoutes = useMemo(() => {
    const filteredRoutes = allNavRoutes.route?.routes?.filter(route =>
      !hiddenRoutes.includes(route.key || route.path?.split('/').pop())
    ) || [];

    return {
      ...allNavRoutes,
      route: {
        ...allNavRoutes.route,
        routes: filteredRoutes
      }
    };
  }, [allNavRoutes]);

  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  const primaryColor = usePrimaryColor();

  const handleLogin = () => {
    navigate("/login");
  };

  const handleLogout = () => {
    navigate("/login");
    queryClient.removeQueries(['userNotifications']);
  };

  const { data: notificationData, isLoading } = useQuery({
    queryKey: ["userNotifications", { limit: 10 }],
    queryFn: () => fetchMyNotifications({ pageSize: 10, current: 1 }),
    networkMode: "always",
    refetchOnWindowFocus: true,
    enabled: !!user?.id,
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
    networkMode: "always"
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
      urgent: "red"
    };
    return <Badge color={colorMap[priority] || "default"} />;
  };

  const renderPriorityTag = (priority: string) => {
    const colorMap: any = {
      low: "green",
      medium: "blue",
      high: "orange",
      urgent: "red"
    };
    return <Tag color={colorMap[priority] || "default"}>{priority.toUpperCase()}</Tag>;
  };

  const renderTypeTag = (type: string) => {
    const typeMap: any = {
      new_appointment_booking: { color: "purple", label: "New Appointment Booking" },
      inventory_out_of_stock: { color: "red", label: "Out of Stock" },
      new_appointment: { color: "green", label: "New Appointment" },
      low_inventory: { color: "orange", label: "Low Inventory" },
      system: { color: "blue", label: "System" }
    };
    const config = typeMap[type] || { color: "default", label: type.replace(/_/g, " ") };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const notificationsContent = (
    <div style={{ width: 350, maxHeight: 500, overflow: 'auto' }}>
      <div style={{
        padding: '12px 12px 8px',
        display: 'flex',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <Text strong>Notifications</Text>
        {unreadNotificationsCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllAsRead} style={{ padding: 0 }}>
            Mark all as read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 20, textAlign: 'center' }}>Loading notifications...</div>
      ) : recentNotifications.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No unread notifications" style={{ padding: '20px 0' }} />
      ) : (
        <List
          dataSource={recentNotifications}
          renderItem={(item: any) => (
            <List.Item
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(24, 144, 255, 0.05)',
                cursor: 'pointer'
              }}
              onClick={() => handleViewDetails(item)}
            >
              <List.Item.Meta
                avatar={renderPriorityIndicator(item.priority)}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>{item.title}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {dayjs(item.createdAt).fromNow()}
                    </Text>
                  </div>
                }
                description={
                  <Text type="secondary" style={{ fontSize: '13px' }} ellipsis={{ tooltip: item.message }}>
                    {item.message}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}

      <div style={{
        textAlign: 'center',
        padding: '8px 16px',
        borderTop: '1px solid #f0f0f0'
      }}>
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
          <NavLink to={url} key={path}>{label}</NavLink>
        ),
      };
    });

  return (
    <>
      <style>
        {`
          /* Fix for user dropdown menu - force dark text */
          .ant-dropdown-menu-item,
          .ant-dropdown-menu-submenu-title {
            color: #262626 !important;
          }
          
          .ant-dropdown-menu-item:hover,
          .ant-dropdown-menu-submenu-title:hover {
            background-color: #f5f5f5 !important;
            color: #262626 !important;
          }
          
          .ant-dropdown-menu-item .anticon,
          .ant-dropdown-menu-submenu-title .anticon {
            color: inherit !important;
          }
          
          /* Fix for ProLayout top navigation menu items */
          .ant-pro-top-nav-header-menu .ant-menu-item,
          .ant-pro-top-nav-header-menu .ant-menu-submenu-title {
            color: #ffffff !important;
          }
          
          .ant-pro-top-nav-header-menu .ant-menu-item:hover,
          .ant-pro-top-nav-header-menu .ant-menu-submenu-title:hover {
            color: #ffffff !important;
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
          
          .ant-pro-top-nav-header-menu .ant-menu-item-selected {
            color: #ffffff !important;
            background-color: rgba(255, 255, 255, 0.2) !important;
          }

          /* Make accounting submenu dropdown wider */
          .ant-menu-submenu-popup {
            min-width: 240px !important;
          }
          
          /* Specifically target accounting submenu if needed */
          .ant-menu-submenu-popup[data-menu-id*="accounting"] {
            min-width: 280px !important;
          }

          /* Fix submenu dropdown text color */
          .ant-menu-submenu-popup .ant-menu-item,
          .ant-menu-submenu-popup .ant-menu-submenu-title {
            color: #262626 !important;
          }
          
          .ant-menu-submenu-popup .ant-menu-item:hover,
          .ant-menu-submenu-popup .ant-menu-submenu-title:hover {
            background-color: #f5f5f5 !important;
            color: ${primaryColor} !important;
          }
          
          .ant-menu-submenu-popup .ant-menu-item-selected {
            background-color: ${primaryColor}15 !important;
            color: ${primaryColor} !important;
          }
        `}
      </style>

      <ProLayout
        logo={
          tenant?.tenant_logo?.url ? (
            <Image
              src={tenant.tenant_logo.url}
              height={60}
              preview={true}
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
              preview={true}
              alt="relia-logo"
              style={{ padding: 12 }}
            />
          )
        }
        title=""
        contentWidth="Fluid"
        navTheme="light"
        layout="top"
        splitMenus={false}
        fixedHeader={true}
        {...navRoutes}
        avatarProps={{
          src:
            user?.thumbnail ||
            "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg",
          shape: "circle",
          alt: "image",
          size: "large",
          render: (_props, dom) => (
            <Space size="middle">
              <Popover
                content={notificationsContent}
                placement="bottomRight"
                trigger={["hover", "click"]}
                overlayStyle={{ width: 380, padding: 0 }}
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
                    style={{
                      background: primaryColor,
                      border: "none",
                      color: "white",
                      width: "44px",
                      height: "44px",
                      fontSize: "16px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </Badge>
              </Popover>

              {user ? (
                <Dropdown
                  autoFocus
                  menu={{
                    disabled: !user,
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
                              src={user?.thumbnail}
                              alt={user?.email}
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
                                {user?.name || "User Name"}
                              </Typography.Text>
                              <Typography.Text
                                type="secondary"
                                style={{ fontSize: 12 }}
                              >
                                {user?.email}
                              </Typography.Text>
                              <Typography.Link
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/profile/${user?.id}`);
                                }}
                                style={{ fontSize: 12, color: primaryColor }}
                              >
                                View Profile
                              </Typography.Link>
                            </Space>
                          </div>
                        ),
                        onClick: () => navigate(`/admin/profile/${user?.id}`),
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
                          <BellOutlined style={{ fontSize: 16, color: "#52c41a" }} />
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
                  placement="bottomCenter"
                  overlayStyle={{
                    width: 360,
                  }}
                >
                  <Button
                    type="text"
                    style={{ padding: "4px 8px", borderRadius: 50 }}
                  >
                    <Space align="center" size={8}>
                      <Badge dot status="success" offset={[-6, 24]}>
                        <Avatar
                          src={user?.thumbnail}
                          alt={user?.email}
                          size={32}
                          icon={<UserOutlined />}
                        />
                      </Badge>
                      <div style={{ textAlign: "left", lineHeight: 1.2 }}>
                        <Text strong style={{ color: "white", fontSize: 13 }}>
                          {user?.name || "User"}
                        </Text>
                        <br />
                        <Text
                          style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 11 }}
                        >
                          {user?.role || "Role"}
                        </Text>
                      </div>
                      <DownOutlined
                        style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: 10 }}
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
          header: {
            colorBgHeader: primaryColor,
            colorTextMenu: "#ffffff",
          },
        }}
        menuItemRender={(item, dom) => (
          <NavLink to={item.path || "/admin"}>{dom}</NavLink>
        )}
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
          footer={[<Button key="close" onClick={handleCloseDetails}>Close</Button>]}
          width={600}
        >
          {selectedNotification && (
            <div>
              <Title level={4}>{selectedNotification.title}</Title>
              <Space style={{ marginBottom: 16 }}>
                {renderTypeTag(selectedNotification.type)}
                {renderPriorityTag(selectedNotification.priority)}
                <Text type="secondary">
                  {dayjs(selectedNotification.createdAt).format('MMMM D, YYYY h:mm A')}
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