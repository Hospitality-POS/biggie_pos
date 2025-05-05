import React, { useEffect, useState } from "react";
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
  CheckCircleOutlined,
  DownOutlined,
  RightOutlined,
  ArrowRightOutlined,
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

    queryClient.removeQueries(['userNotifications']);
  };

  // Fetch notifications for current user with a larger limit to ensure we get enough unread ones
  const { data: notificationData, isLoading } = useQuery({
    queryKey: ["userNotifications", { limit: 10 }],
    queryFn: () => fetchMyNotifications({ pageSize: 10, current: 1 }),
    networkMode: "always",
    refetchOnWindowFocus: true,
    enabled: !!user?.id, // Only fetch if user is logged in AND has an ID
    cacheTime: 0, // This prevents cross-user cache contamination
    staleTime: 0, // Always fetch fresh data for security
    retry: 2,
    onError: (error) => {
      console.error("Failed to fetch notifications:", error);
    },
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
    onError: (error) => {
      console.error("Failed to mark all notifications as read:", error);
    },
    cacheTime: 0, 
    networkMode: "always"
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
        src: user?.thumbnail || "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg",
        shape: "circle",
        alt: "image",
        size: "large",
        render: (_props, dom) => {
          return (
            <Space size="middle">
              <Popover
                content={notificationsContent}
                placement="bottomRight"
                trigger={["hover", "click"]} // Added click for better mobile UX
                overlayStyle={{
                  width: 350,
                  padding: 0
                }}
                overlayClassName="notification-popover-overlay"
                arrow={{ pointAtCenter: true }}
                overlayInnerStyle={{
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  padding: 0
                }}
              >
                <Badge
                  count={unreadNotificationsCount}
                  showZero={false} // Only show when there are notifications
                  offset={[-8, 8]}
                  overflowCount={99}
                  size="small"
                  style={{
                    backgroundColor: unreadNotificationsCount > 1 ? '#ff4d4f' : '#52c41a',
                    boxShadow: '0 2px 8px rgba(255, 77, 79, 0.3)',
                    fontSize: '10px',
                    lineHeight: '14px'
                  }}
                >
                  <Button
                    icon={<BellOutlined />}
                    shape="circle"
                    size="middle"
                    className="notification-button"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      width: '44px',
                      height: '44px',
                      fontSize: '16px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  />
                </Badge>
              </Popover>
              {user ? ( // Only show dropdown menu when user is logged in
                <>
                  <Dropdown
                    autoFocus
                    menu={{
                      disabled: user ? false : true,
                      items: [
                        {
                          key: "profile",
                          className: "profile-menu-item",
                          icon: (
                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '2px 0' }}>
                              <Avatar
                                src={user?.thumbnail || "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg"}
                                alt={user?.email}
                                style={{
                                  border: `2px solid ${primaryColor}`,
                                  width: 48,
                                  height: 48,
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                                }}
                                size="large"
                              />
                              <Space direction="vertical" style={{ marginLeft: 12, gap: 2, flex: 1 }} size="small">
                                <Typography.Text
                                  strong
                                  style={{
                                    fontSize: 14,
                                    color: '#262626',
                                    lineHeight: 1.2
                                  }}
                                >
                                  {user?.name || "User Name"}
                                </Typography.Text>
                                <Typography.Text
                                  type="secondary"
                                  style={{
                                    fontSize: 12,
                                    lineHeight: 1.2,
                                    color: '#8c8c8c'
                                  }}
                                  ellipsis={{ tooltip: user?.email }}
                                >
                                  {user?.email || "user@example.com"}
                                </Typography.Text>
                                <Typography.Link
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/admin/profile/${user?.id}`);
                                  }}
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: primaryColor || '#1890ff'
                                  }}
                                >
                                  View Your Profile
                                </Typography.Link>
                              </Space>
                            </div>
                          ),
                          onClick: () => navigate(`/admin/profile/${user?.id}`),
                          style: {
                            padding: '8px 12px',
                            height: 'auto',
                            background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.05), rgba(24, 144, 255, 0.02))',
                            border: '1px solid rgba(24, 144, 255, 0.1)',
                            borderRadius: '8px',
                            margin: '4px',
                            transition: 'all 0.2s ease'
                          }
                        },
                        {
                          type: "divider",
                          style: {
                            margin: '8px 12px',
                            background: 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.06), transparent)'
                          }
                        },
                        {
                          key: "notifications",
                          icon: <BellOutlined style={{ fontSize: 16, color: '#52c41a' }} />,
                          label: (
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 500 }}>Notifications</span>
                              {unreadNotificationsCount >= 0 && (
                                <Tag
                                  color={unreadNotificationsCount > 0 ? 'green' : 'default'}
                                  style={{
                                    fontSize: 12,
                                    lineHeight: 1.2,
                                    transition: 'all 0.2s ease',
                                  }}
                                  className="notification-badge"
                                >
                                  {unreadNotificationsCount > 1 ? unreadNotificationsCount : 0}
                                </Tag>
                              )}
                            </Space>
                          ),
                          onClick: () => navigate("/admin/notifications"),
                          style: {
                            padding: '12px 16px',
                            margin: '2px 4px',
                            borderRadius: '6px',
                            transition: 'all 0.2s ease'
                          }
                        },
                        {
                          key: "help-center",
                          icon: <CompassOutlined style={{ fontSize: 16, color: '#722ed1' }} />,
                          label: <span style={{ fontWeight: 500 }}>Help Center</span>,
                          onClick: () => navigate("/admin/help-center"),
                          style: {
                            padding: '12px 16px',
                            margin: '2px 4px',
                            borderRadius: '6px',
                            transition: 'all 0.2s ease'
                          }
                        },
                        {
                          key: "settings",
                          icon: <SettingOutlined style={{ fontSize: 16, color: '#13c2c2' }} />,
                          label: <span style={{ fontWeight: 500 }}>Settings</span>,
                          style: {
                            padding: '12px 16px',
                            margin: '2px 4px',
                            borderRadius: '6px',
                            transition: 'all 0.2s ease'
                          }
                        },
                        {
                          type: "divider",
                          style: {
                            margin: '8px 12px',
                            background: 'linear-gradient(90deg, transparent, rgba(255, 77, 79, 0.2), transparent)'
                          }
                        },
                        {
                          key: "logout",
                          icon: <PoweroffOutlined style={{ fontSize: 16 }} />,
                          label: <span style={{ fontWeight: 500 }}>Logout</span>,
                          onClick: handleLogout,
                          danger: true,
                          style: {
                            padding: '8px 12px',
                            margin: '2px 4px',
                            borderRadius: '6px',
                            transition: 'all 0.2s ease',
                            border: '1px solid rgba(255, 77, 79, 0.1)'
                          }
                        },
                      ],
                    }}
                    arrow={{ pointAtCenter: true }}
                    trigger={["hover", "click"]}
                    placement="bottomCenter"
                    overlayClassName="enhanced-user-dropdown"
                    overlayStyle={{
                      minWidth: 280,
                      borderRadius: 12,
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
                      border: 'none',
                      background: 'rgba(255, 255, 255, 0.98)',
                      backdropFilter: 'blur(20px)',
                    }}
                  >
                    <Button
                      type="text"
                      className="user-dropdown-trigger"
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: 50,
                        height: 'auto',
                        minHeight: '36px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.15)',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                        }
                      }}
                    >
                      <Space align="center" size={8} style={{ cursor: "pointer" }}>
                        <Badge
                          dot
                          status="success"
                          offset={[-6, 24]}
                          style={{ backgroundColor: '#52c41a' }}
                        >
                          <Avatar
                            src={
                              user?.thumbnail ||
                              "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg"
                            }
                            alt={user?.email}
                            size={32}
                            icon={<UserOutlined />}
                            style={{
                              border: "2px solid rgba(255, 255, 255, 0.3)",
                              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.15)'
                            }}
                          />
                        </Badge>

                        <div style={{
                          textAlign: "left",
                          lineHeight: 1.2,
                          minWidth: 0, // Prevents text overflow issues
                          flex: 1
                        }}>
                          <Text
                            strong
                            style={{
                              color: "white",
                              fontSize: 13,
                              fontWeight: 600,
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                              display: 'block',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 100
                            }}
                          >
                            {user?.name || "User Name"}
                          </Text>

                          <Text
                            style={{
                              color: "rgba(255, 255, 255, 0.8)",
                              fontSize: 11,
                              fontWeight: 400,
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                              display: 'block',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 100
                            }}
                          >
                            {user?.role || "User Role"}
                          </Text>
                        </div>

                        <DownOutlined
                          style={{
                            color: "rgba(255, 255, 255, 0.9)",
                            fontSize: 10,
                            transition: 'transform 0.3s ease',
                            filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))'
                          }}
                          className="dropdown-arrow"
                        />
                      </Space>
                    </Button>
                  </Dropdown>
                </>
               ): (
                <Button icon={<PoweroffOutlined />} onClick={handleLogin}>
                  Login
                </Button>
              )
              }
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


<style jsx>{`
  .user-dropdown-trigger:hover .dropdown-arrow {
    transform: rotate(180deg);
  }
  
  .user-dropdown-overlay .ant-dropdown-menu {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 12px;
    padding: 8px 0;
    border: none;
  }
  
  .user-dropdown-overlay .ant-dropdown-menu-item {
    padding: 12px 20px;
    transition: all 0.2s ease;
  }
  
  .user-dropdown-overlay .ant-dropdown-menu-item:hover {
    background: rgba(24, 144, 255, 0.08);
  }
  
  .user-dropdown-overlay .ant-dropdown-menu-item-divider {
    margin: 8px 20px;
    background: rgba(0, 0, 0, 0.08);
  }

  .notification-button:hover {
    background: rgba(255, 255, 255, 0.15) !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
  }

  .notification-button .anticon {
    transition: transform 0.3s ease;
  }

  .notification-button:hover .anticon {
    transform: scale(1.1);
  }

  .notification-popover-overlay .ant-popover-inner {
    border-radius: 12px !important;
    overflow: hidden;
  }

  .notification-popover-overlay .ant-popover-arrow {
    display: none; /* Hide default arrow for cleaner look */
  }

  /* Optional: Add a subtle pulse animation for unread notifications */
  @keyframes notification-pulse {
    0% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(255, 77, 79, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0); }
  }

  .notification-button[data-has-notifications="true"] {
    animation: notification-pulse 2s infinite;
  }

  /* Enhanced badge styling */
  .ant-badge-count {
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
`}</style>
export default AdminDashboard;