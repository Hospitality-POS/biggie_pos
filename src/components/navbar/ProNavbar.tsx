// MainComponent.js
import { ProLayout } from "@ant-design/pro-components";
import { Badge, Button, Dropdown, Typography, Empty, List, Popover, Modal, Tag } from "antd/lib";
import {
  BellOutlined,
  DashboardOutlined,
  DownOutlined,
  PoweroffOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { NavLink, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "src/store";
import { logoutUser } from "@features/Auth/AuthActions";
import { reset } from "@features/Auth/AuthSlice";
import { Avatar, Flex, Image, Space } from "antd";
import useProLayoutNav from "./defaultprops";
import StaffModal from "@components/staffCard/LoginModal";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from "@services/notifications";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

interface Tenant {
  tenant_code?: string;
  primary_color?: string;
  color_scheme?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
  tenant_logo?: {
    url?: string;
    filename?: string;
    size?: number;
  };
}

const ProNavbar = ({ children }) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigate();
  const queryClient = useQueryClient();
  const navRoutes = useProLayoutNav();
  const { user } = useAppSelector((state) => state.auth);

  // State for notification details modal
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  const handleLogout = () => {
    dispatch(logoutUser());
    localStorage.removeItem("shopId");
    dispatch(reset());
    navigation("/login");

    queryClient.removeQueries(['userNotifications']);
  };

  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");
  const [tenant, setTenant] = useState<Tenant | null>(null);

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const parsedTenant = storedTenant ? JSON.parse(storedTenant) : null;

    if (parsedTenant) {
      setTenant(parsedTenant);
      // Use color_scheme.primary if available, otherwise fall back to primary_color
      if (parsedTenant.color_scheme?.primary) {
        setPrimaryColor(parsedTenant.color_scheme.primary);
      } else if (parsedTenant.primary_color) {
        setPrimaryColor(parsedTenant.primary_color);
      }
    }
  }, []);

  // Fetch notifications for current user with a larger limit to ensure we get enough unread ones
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
    navigation("/notifications");
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

  const userMenuItems = [
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
                navigation(`/profile/${user?.id}`);
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
      onClick: () => navigation(`/profile/${user?.id}`),
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
    (user?.role === "admin")
    &&
    {
      key: "dashboard",
      icon: <DashboardOutlined style={{ fontSize: 16, color: '#7f7f7f' }} />,
      label: "Dashboard",
      Style: {
        padding: '8px 12px',
        margin: '2px 4px',
        borderRadius: '6px',
        transition: 'all 0.2s ease'
      },
      onClick: () => {
        localStorage.removeItem("shopId"), navigation("/admin/dashboard");
      },
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
              {unreadNotificationsCount > 0 ? unreadNotificationsCount : 0}
            </Tag>
          )}
        </Space>
      ),
      onClick: () => navigation("/admin/notifications"),
      style: {
        padding: '8px 12px',
        margin: '2px 4px',
        borderRadius: '6px',
        transition: 'all 0.2s ease'
      }
    },
    (user && (user?.role === "admin" || user?.role === "cashier")) &&
    {
      key: "faqs",
      icon: <QuestionCircleOutlined style={{ fontSize: 16, color: '#722ed1' }} />,
      label: "FAQs",
      style: {
        padding: '8px 12px',
        margin: '2px 4px',
        borderRadius: '6px',
        transition: 'all 0.2s ease'
      },
      onClick: () => navigation("/fss-faqs"),
    },
    (user && (user?.role === "admin" || user?.role === "cashier")) &&
    {
      key: "Settings",
      icon: <SettingOutlined style={{ fontSize: 16, color: '#13c2c2' }} />,
      label: "Settings",
      style: {
        padding: '8px 12px',
        margin: '2px 4px',
        borderRadius: '6px',
        transition: 'all 0.2s ease'
      },
      onClick: () => navigation("/system-setup"),
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
  ];

  const [open, setOpen] = useState(false);
  const tbl = "staff";
  return (
    <>
      <ProLayout
        style={{ maxWidth: "1920px" }}
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
                maxWidth: "120px"
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
        menuHeaderRender={(logo, title) => (
          <div
            id="customize_menu_header"
            style={{
              height: "32px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {logo}
            {title}
          </div>
        )}
        colorPrimary={primaryColor}
        contentWidth="Fluid"
        navTheme="light"
        contentStyle={{ padding: 0, margin: "0 auto" }}
        layout="top"
        splitMenus={false}
        fixedHeader={true}
        avatarProps={{
          src: user?.thumbnail || "https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg",
          shape: "circle",
          alt: "image",
          size: "large",
          style: { border: `2px solid white`, width: 32, height: 32 },
          render: (_props, dom) => {
            return (
              <>
                {user ? (
                  <Space size="middle">
                    {/* Notification Bell with Badge and Popover */}
                    <Popover
                      content={notificationsContent}
                      placement="bottomRight"
                      trigger={["hover", "click"]}
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
                        showZero={false}
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

                    <Dropdown
                      menu={{ items: userMenuItems }}
                      arrow={{ pointAtCenter: true }}
                      trigger={["hover", "click"]}
                      placement="bottomCenter"
                      overlayClassName="user-dropdown-overlay"
                      overlayStyle={{
                        minWidth: 280,
                        borderRadius: 12,
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
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
                            minWidth: 0,
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
                  </Space>
                ) : (
                  <StaffModal
                    setOpen={setOpen}
                    open={open}
                    tbl={tbl}
                    showButton
                  />
                )}
              </>
            );
          },
        }}
        {...navRoutes}
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
          <NavLink to={item?.path || "/"}>{dom}</NavLink>
        )}
      >
        {children}

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
    </>
  );
};

export default ProNavbar;