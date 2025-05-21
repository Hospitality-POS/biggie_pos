import React, { useEffect, useState } from "react";
import { Badge, Breadcrumb, Button, Dropdown, Empty, Image, List, Popover, Space, Typography, Modal, Tag } from "antd";
import { PageContainer, ProLayout } from "@ant-design/pro-components";
import {
  BellOutlined,
  CompassOutlined,
  DashboardOutlined,
  HomeFilled,
  PoweroffOutlined,
  SettingOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "src/store";
import useProLayoutNav from "./defaultprops";
import { fetchMyNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@services/notifications"; // Import notification services
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

const AdminDashboard: React.FC = () => {
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const navRoutes = useProLayoutNav();
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // State for notification details modal
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  // Default color value
  const defaultColor = "#6c1c2c";
  // Use tenant primary color if it exists, otherwise use default
  const primaryColor = tenant && tenant.primary_color ? tenant.primary_color : defaultColor;

  const handleLogin = () => {
    navigate("/login");
  };

  const handleLogout = () => {
    navigate("/login");
  };

  // Fetch notifications for current user with a larger limit to ensure we get enough unread ones
  const { data: notificationData, isLoading } = useQuery({
    queryKey: ["userNotifications", { limit: 10 }],
    queryFn: () => fetchMyNotifications({ pageSize: 10, current: 1 }),
    networkMode: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
    retry: 2,
  });

  // Mutations for notification actions
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
  });

  // Get unread notification count and recent notifications
  const unreadNotificationsCount = notificationData?.unreadCount || 0;

  // Filter to only show unread notifications (up to 5)
  const recentNotifications = (notificationData?.data || [])
    .filter((notification: any) => !notification.read)
    .slice(0, 5);

  // Handle viewing notification details
  const handleViewDetails = (notification: any) => {
    setSelectedNotification(notification);
    setDetailsModalVisible(true);

    // Mark as read when viewing details (if not already read)
    if (!notification.read) {
      markAsReadMutation.mutate(notification._id);
    }
  };

  // Handle marking a notification as read
  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  // Handle marking all notifications as read
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  // Navigate to notifications page
  const goToNotifications = () => {
    navigate("/admin/notifications");
  };

  // Close details modal
  const handleCloseDetails = () => {
    setDetailsModalVisible(false);
  };

  // Render priority badge
  const renderPriorityIndicator = (priority: string) => {
    let color = "";
    switch (priority) {
      case "low":
        color = "green";
        break;
      case "medium":
        color = "blue";
        break;
      case "high":
        color = "orange";
        break;
      case "urgent":
        color = "red";
        break;
      default:
        color = "default";
    }
    return <Badge color={color} />;
  };

  // Render priority tag
  const renderPriorityTag = (priority: string) => {
    let color = "";
    switch (priority) {
      case "low":
        color = "green";
        break;
      case "medium":
        color = "blue";
        break;
      case "high":
        color = "orange";
        break;
      case "urgent":
        color = "red";
        break;
      default:
        color = "default";
    }
    return <Tag color={color}>{priority.toUpperCase()}</Tag>;
  };

  // Render notification type tag
  const renderTypeTag = (type: string) => {
    let color = "";
    let label = "";
    switch (type) {
      case "new_appointment_booking":
        color = "purple";
        label = "New Appointment Booking";
        break;
      case "inventory_out_of_stock":
        color = "red";
        label = "Out of Stock";
        break;
      case "new_appointment":
        color = "green";
        label = "New Appointment";
        break;
      case "low_inventory":
        color = "orange";
        label = "Low Inventory";
        break;
      case "system":
        color = "blue";
        label = "System";
        break;
      default:
        color = "default";
        label = type.replace(/_/g, " ");
    }
    return <Tag color={color}>{label}</Tag>;
  };

  // Create notifications menu content
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
        <div style={{ padding: 20, textAlign: 'center' }}>
          Loading notifications...
        </div>
      ) : recentNotifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No unread notifications"
          style={{ padding: '20px 0' }}
        />
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
                  <Text
                    type="secondary"
                    style={{ fontSize: '13px' }}
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

      // Check if the path is a dynamic segment (e.g., an ID)
      const isDynamicSegment =
        /^[a-f0-9]{24}$/i.test(path) || /^[0-9]+$/.test(path); // Regex for MongoDB ObjectId or numeric IDs
      const label = isDynamicSegment
        ? "Details" // Generic label for dynamic segments
        : path
          .replace(/-/g, " ") // Replace hyphens with spaces
          .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());  // Map or format unknown paths

      return {
        title: isLast ? (
          <span key={path}>{label}</span>
        ) : (
          <NavLink to={url} key={path}>{label}</NavLink>
        ),
      };
    });

  return (
    <ProLayout
      logo={
        tenant?.tenant_code === "RPOS-000004" ? (
          <Image
            src="/android-chrome-512x512.png"
            height={60}
            preview={true}
            alt="fss-logo"
            style={{ padding: 5 }}
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
        src: "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg",
        shape: "circle",
        alt: "image",
        size: "default",
        title: (
          <Typography.Text strong={true} style={{ color: "white" }} code={true}>
            {user && user.name}
          </Typography.Text>
        ),
        render: (_props, dom) => {
          return (
            <Space size="middle">
              <Popover
                content={notificationsContent}
                placement="bottomRight"
                trigger="click"
                overlayStyle={{ width: 350 }}
                arrow={{ pointAtCenter: true }}
              >
                <Badge
                  count={unreadNotificationsCount}
                  showZero
                  offset={[-5, 5]}
                  overflowCount={99}
                  style={{
                    backgroundColor: unreadNotificationsCount > 0 ? '#ff4d4f' : '#52c41a'
                  }}
                >
                  <Button
                    icon={<BellOutlined />}
                    shape="circle"
                  />
                </Badge>
              </Popover>
              {user ? (
                <>
                  <Dropdown
                    arrow
                    menu={{
                      disabled: user ? false : true,
                      items: [
                        {
                          key: "profile",
                          icon: <UserOutlined />,
                          label: "Profile",
                          onClick: () => navigate(`/admin/profile/${user?.id}`),
                        },
                        { type: "divider" },
                        {
                          key: "Help Center",
                          icon: <CompassOutlined />,
                          label: "Help Center",
                          onClick: () => navigate("/admin/help-center"),
                        },
                        {
                          key: "Settings",
                          icon: <SettingOutlined />,
                          label: "Settings",
                        },
                        {
                          key: "notifications",
                          icon: <BellOutlined />,
                          label: (
                            <Space>
                              Notifications
                              {unreadNotificationsCount >= 0 && (
                                <Badge
                                  count={unreadNotificationsCount}
                                  showZero
                                  size="small"
                                  style={{
                                    backgroundColor: unreadNotificationsCount > 0 ? '#ff4d4f' : '#52c41a'
                                  }}
                                />
                              )}
                            </Space>
                          ),
                          onClick: () => navigate("/admin/notifications"),
                        },
                        {
                          key: "logout",
                          icon: <PoweroffOutlined />,
                          label: "Logout",
                          onClick: handleLogout,
                          danger: true,
                        },
                      ],
                    }}
                  >
                    {dom}
                  </Dropdown>
                </>
              ) : (
                <Button icon={<PoweroffOutlined />} onClick={handleLogin}>
                  Login
                </Button>
              )}
            </Space>
          );
        },
      }}
      token={{
        bgLayout: "#f6ffed",
        colorPrimary: primaryColor,
        colorTextAppListIconHover: "black",
        colorTextAppListIcon: "white",
        colorBgAppListIconHover: "white",
        hashId: "fss001",
        header: {
          colorBgMenuItemSelected: "#f6ffed",
          colorBgHeader: primaryColor,
          colorTextMenu: "#ffff",
          colorTextMenuSecondary: "#f6ffed",
          colorBgMenuItemHover: "#f6ffed",
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
        header={{
          extra: [
            <Breadcrumb style={{ cursor: "pointer" }} key="breadcrumb">
              <Breadcrumb.Item onClick={() => navigate("/admin")} key="admin-home">
                <HomeFilled /> <span>Home</span>
              </Breadcrumb.Item>
              <Breadcrumb.Item key="admin-dashboard">
                <DashboardOutlined /> <span>Dashboard</span>
              </Breadcrumb.Item>
            </Breadcrumb>,
          ],
        }}
      >
        <Outlet />
      </PageContainer>

      {/* Notification Details Modal */}
      <Modal
        title="Notification Details"
        open={detailsModalVisible}
        onCancel={handleCloseDetails}
        footer={[
          <Button key="close" onClick={handleCloseDetails}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedNotification && (
          <div>
            <Title level={4}>{selectedNotification.title}</Title>
            <div style={{ marginBottom: 16 }}>
              <Space>
                {renderTypeTag(selectedNotification.type)}
                {renderPriorityTag(selectedNotification.priority)}
                <Text type="secondary">
                  {dayjs(selectedNotification.createdAt).format('MMMM D, YYYY h:mm A')}
                </Text>
              </Space>
            </div>
            <div style={{ marginBottom: 24 }}>
              <Text>{selectedNotification.message}</Text>
            </div>
            {selectedNotification.additionalInfo && (
              <div style={{ marginBottom: 16 }}>
                <Title level={5}>Additional Information</Title>
                <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
                  {JSON.stringify(selectedNotification.additionalInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </ProLayout>
  );
};

export default AdminDashboard;