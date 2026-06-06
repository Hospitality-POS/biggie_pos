import { ProLayout } from "@ant-design/pro-components";
import {
  Badge,
  Button,
  Dropdown,
  Typography,
  Empty,
  List,
  Popover,
  Modal,
  Tag,
  Avatar,
  Image,
  Space,
  Drawer,
  App,
} from "antd";
import {
  ArrowLeftOutlined,
  BellOutlined,
  DownOutlined,
  PoweroffOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  UserOutlined,
  MenuOutlined,
  CloseOutlined,
  RightOutlined,
  PlusOutlined,
  TeamOutlined,
  ShopOutlined,
  BankOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  RiseOutlined,
  AuditOutlined,
  FileDoneOutlined,
  AppstoreOutlined,
  GlobalOutlined,
  WalletOutlined,
  SwapOutlined,
  // ── CRM ──────────────────────────────────────────────────────────────────
  NotificationOutlined,
  AimOutlined,
  CustomerServiceOutlined,
  // ── Dala ───────────────────────────────────────────────────────────────────
  HomeOutlined,
  AccountBookOutlined,
  ReconciliationOutlined,
  BuildOutlined,
  ApartmentOutlined,
  FileProtectOutlined,
  UsergroupAddOutlined,
  MoneyCollectOutlined,
} from "@ant-design/icons";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "src/store";
import { logoutUser } from "@features/Auth/AuthActions";
import { reset } from "@features/Auth/AuthSlice";
import StaffModal from "@components/staffCard/LoginModal";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@services/notifications";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import useProLayoutNav from "./defaultprops";
import React from "react";
import { getCurrentTenantId } from "@services/tenants";

import AddCustomerModal from "@pages/Customer/AddCustomerModal";
import AddProSupplierModal from "@components/MODALS/pro/AddProSupplierModal";
import AddProPaymentMethodSettingsModal from "@components/MODALS/pro/AddProPaymentSettingsModal";
import AccountFormDrawer from "@pages/ChartOfAccounts/AccountFormDrawer";
import JournalEntryFormDrawer from "@pages/JournalEntry/JournalEntryFormDrawer";
import ManualInvoiceModal from "@pages/OrderManagement/Invoices/ManualInvoiceModal";
import ManualIncomeModal from "@pages/OrderManagement/Orders/ManualIncomeModal";

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  orange: "#f59e0b",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "green", medium: "blue", high: "orange", urgent: "red",
};

const TYPE_MAP: Record<string, { color: string; label: string }> = {
  new_appointment_booking: { color: "purple", label: "New Booking" },
  inventory_out_of_stock: { color: "red", label: "Out of Stock" },
  new_appointment: { color: "green", label: "New Appointment" },
  low_inventory: { color: "orange", label: "Low Inventory" },
  system: { color: "blue", label: "System" },
};

const renderPriorityIndicator = (priority: string) => (
  <Badge color={PRIORITY_COLORS[priority] || "default"} />
);
const renderPriorityTag = (priority: string) => (
  <Tag color={PRIORITY_COLORS[priority] || "default"}>{priority.toUpperCase()}</Tag>
);
const renderTypeTag = (type: string) => {
  const config = TYPE_MAP[type] || { color: "default", label: type.replace(/_/g, " ") };
  return <Tag color={config.color}>{config.label}</Tag>;
};

interface Tenant {
  tenant_code?: string;
  primary_color?: string;
  tenant_logo?: { url?: string };
}

type QuickCreateModal =
  | "customer"
  | "supplier"
  | "coa"
  | "journal"
  | "payment-method"
  | "invoice"
  | "income-expense"
  | null;

const ProNavbar = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const navRoutes = useProLayoutNav();
  const { user } = useAppSelector((state) => state.auth);
  const primaryColor = usePrimaryColor();
  const isMobile = useIsMobile();

  const shopId = getCurrentTenantId();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [quickCreateModal, setQuickCreateModal] = useState<QuickCreateModal>(null);

  const isAdmin = user?.role === "admin";
  const isAdminRoute = location.pathname.startsWith("/admin");

  // ── Module flags ──────────────────────────────────────────────────────────
  const getModuleFlags = () => {
    try {
      const storedTenant = localStorage.getItem("tenant");
      if (!storedTenant) return { hasPOS: true, hasAccounting: false, hasMteja: false, hasBandu: false, hasDala: false };
      const tenantData = JSON.parse(storedTenant);
      return {
        hasPOS: tenantData?.pos_integration?.enabled === true,
        hasAccounting: !!(tenantData?.accounting_database?.enabled || tenantData?.modules?.accounting),
        hasMteja: tenantData?.modules?.crm === true,   // ← CRM gate
        hasBandu: tenantData?.modules?.payroll === true,
        hasDala: tenantData?.modules?.dala === true,    // ← Real Estate gate
      };
    } catch {
      return { hasPOS: true, hasAccounting: false, hasMteja: false, hasBandu: false, hasDala: false };
    }
  };

  const { hasPOS, hasAccounting, hasMteja, hasBandu, hasDala } = getModuleFlags();

  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    if (storedTenant) setTenant(JSON.parse(storedTenant));
  }, []);

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  const { data: notificationData, isLoading } = useQuery({
    queryKey: ["userNotifications", { limit: 10 }],
    queryFn: () => fetchMyNotifications({ pageSize: 10, current: 1 }),
    networkMode: "always",
    refetchOnWindowFocus: true,
    enabled: !!user?.id,
    cacheTime: 0,
    staleTime: 0,
    retry: 2,
  });

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userNotifications"] }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userNotifications"] }),
  });

  const unreadNotificationsCount = notificationData?.unreadCount || 0;
  const recentNotifications = (notificationData?.data || []).filter((n: any) => !n.read).slice(0, 5);

  const handleViewDetails = (notification: any) => {
    setSelectedNotification(notification);
    setDetailsModalVisible(true);
    if (!notification.read) markAsReadMutation.mutate(notification._id);
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    localStorage.removeItem("shopId");
    dispatch(reset());
    navigate("/login");
    queryClient.removeQueries(["userNotifications"]);
    setMobileDrawerOpen(false);
  };

  const handleBackToAdmin = () => {
    localStorage.removeItem("shopId");
    navigate("/admin/dashboard");
    setMobileDrawerOpen(false);
  };

  const notificationsPath = isAdminRoute ? "/admin/notifications" : "/notifications";

  const closeQuickCreate = () => setQuickCreateModal(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
    queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
    queryClient.invalidateQueries({ queryKey: ["income-history"] });
    queryClient.invalidateQueries({ queryKey: ["bank-imports"] });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["folders"] });
    // CRM caches
    queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
    queryClient.invalidateQueries({ queryKey: ["crm-campaigns"] });
  };

  const fakeActionRef = { current: { reload: invalidateAll, reset: invalidateAll } };

  // ── Calculate selected key for navigation ─────────────────────────────────
  const selectedKey = (() => {
    const routes = navRoutes?.route?.routes || [];
    const matchingRoutes = routes.filter((route: any) => 
      location.pathname === route.path ||
      (route.path !== "/" && location.pathname.startsWith(route.path + "/"))
    );
    if (matchingRoutes.length === 0) return location.pathname;
    const mostSpecific = matchingRoutes.reduce((longest: any, current: any) => 
      current.path.length > longest.path.length ? current : longest
    );
    return mostSpecific.path;
  })();

  // ── Quick Create menu items ───────────────────────────────────────────────
  const getQuickCreateItems = () => {
    const items: any[] = [];

    // ── People — always shown ─────────────────────────────────────────────
    items.push({
      type: "group" as const,
      label: (
        <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
          People
        </Text>
      ),
      children: [
        {
          key: "customer",
          icon: <TeamOutlined style={{ color: "#3b82f6" }} />,
          label: <span style={{ fontSize: 13 }}>Customer</span>,
          onClick: () => setQuickCreateModal("customer"),
        },
        {
          key: "vendor",
          icon: <ShopOutlined style={{ color: "#8b5cf6" }} />,
          label: <span style={{ fontSize: 13 }}>Vendor / Supplier</span>,
          onClick: () => setQuickCreateModal("supplier"),
        },
      ],
    });

    // ── Accounting — only when hasAccounting ──────────────────────────────
    if (hasAccounting) {
      items.push({
        type: "group" as const,
        label: (
          <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
            Accounting
          </Text>
        ),
        children: [
          {
            key: "coa",
            icon: <BankOutlined style={{ color: "#0ea5e9" }} />,
            label: <span style={{ fontSize: 13 }}>Chart of Account</span>,
            onClick: () => setQuickCreateModal("coa"),
          },
          {
            key: "journal",
            icon: <AuditOutlined style={{ color: "#6366f1" }} />,
            label: <span style={{ fontSize: 13 }}>Journal Entry</span>,
            onClick: () => setQuickCreateModal("journal"),
          },
          {
            key: "payment-method",
            icon: <CreditCardOutlined style={{ color: "#f59e0b" }} />,
            label: <span style={{ fontSize: 13 }}>Payment Method</span>,
            onClick: () => setQuickCreateModal("payment-method"),
          },
          {
            key: "bank-statement",
            icon: <FileExcelOutlined style={{ color: "#16a34a" }} />,
            label: <span style={{ fontSize: 13 }}>Bank Statement Import</span>,
            onClick: () => navigate(isAdmin ? "/admin/accounting/bank-statements" : "/accounting/bank-statements"),
          },
          {
            key: "currencies",
            icon: <GlobalOutlined style={{ color: "#0d9488" }} />,
            label: <span style={{ fontSize: 13 }}>Currency Settings</span>,
            onClick: () => navigate("/accounting/currencies"),
          },
        ],
      });
    }

    // ── Transactions — POS or Accounting ─────────────────────────────────
    if (hasPOS || hasAccounting) {
      const txChildren = [
        ...(hasPOS ? [{
          key: "invoice",
          icon: <FileTextOutlined style={{ color: "#10b981" }} />,
          label: <span style={{ fontSize: 13 }}>Invoice / Quote</span>,
          onClick: () => setQuickCreateModal("invoice"),
        }] : []),
        ...(hasAccounting ? [{
          key: "income-expense",
          icon: <RiseOutlined style={{ color: "#22c55e" }} />,
          label: <span style={{ fontSize: 13 }}>Expense / Bill</span>,
          onClick: () => setQuickCreateModal("income-expense"),
        }] : []),
      ];
      if (txChildren.length > 0) {
        items.push({
          type: "group" as const,
          label: (
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
              Transactions
            </Text>
          ),
          children: txChildren,
        });
      }
    }

    // ── Documents — always shown ───────────────────────────────────────────
    items.push({
      type: "group" as const,
      label: (
        <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
          Documents
        </Text>
      ),
      children: [
        {
          key: "document-center",
          icon: <FileDoneOutlined style={{ color: "#2f54eb" }} />,
          label: <span style={{ fontSize: 13 }}>Document Center</span>,
          onClick: () => navigate(isAdmin ? "/admin/documents" : "/documents"),
        },
      ],
    });

    // ── CRM — ONLY when hasMteja === true ─────────────────────────────────
    if (hasMteja) {
      items.push({
        type: "group" as const,
        label: (
          <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
            CRM
          </Text>
        ),
        children: [
          {
            key: "crm-customer",
            icon: <TeamOutlined style={{ color: C.primary }} />,
            label: <span style={{ fontSize: 13 }}>New Customer</span>,
            onClick: () => setQuickCreateModal("customer"),
          },
          {
            key: "crm-lead",
            icon: <NotificationOutlined style={{ color: "#7c3aed" }} />,
            label: <span style={{ fontSize: 13 }}>New Lead</span>,
            onClick: () => navigate(isAdmin ? "/admin/crm/leads" : "/crm/leads"),
          },
          {
            key: "crm-campaign",
            icon: <NotificationOutlined style={{ color: "#0891b2" }} />,
            label: <span style={{ fontSize: 13 }}>New Campaign</span>,
            onClick: () => navigate(isAdmin ? "/admin/crm/campaigns" : "/crm/campaigns"),
          },
          {
            key: "crm-target",
            icon: <AimOutlined style={{ color: "#16a34a" }} />,
            label: <span style={{ fontSize: 13 }}>New Sales Target</span>,
            onClick: () => navigate(isAdmin ? "/admin/crm/sales-targets" : "/crm/sales-targets"),
          },
        ],
      });
    }

    // ── Bandu HR — only when hasBandu ─────────────────────────────────────
    if (hasBandu) {
      items.push({
        type: "group" as const,
        label: (
          <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
            HR & Payroll
          </Text>
        ),
        children: [
          {
            key: "employee",
            icon: <TeamOutlined style={{ color: "#8b5cf6" }} />,
            label: <span style={{ fontSize: 13 }}>Add Employee</span>,
            onClick: () => navigate(isAdmin ? "/admin/bandu/employees" : "/bandu/employees"),
          },
          {
            key: "payroll",
            icon: <FileTextOutlined style={{ color: "#10b981" }} />,
            label: <span style={{ fontSize: 13 }}>Process Payroll</span>,
            onClick: () => navigate(isAdmin ? "/admin/bandu/payroll" : "/bandu/payroll"),
          },
        ],
      });
    }

    // ── Dala Real Estate — only when hasDala ─────────────────────────────
    if (hasDala) {
      items.push({
        type: "group" as const,
        label: (
          <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
            Real Estate
          </Text>
        ),
        children: [
          {
            key: "property",
            icon: <BuildOutlined style={{ color: "#6c1c2c" }} />,
            label: <span style={{ fontSize: 13 }}>New Property</span>,
            onClick: () => navigate(isAdmin ? "/admin/dala/properties" : "/dala/properties"),
          },
          {
            key: "unit",
            icon: <ApartmentOutlined style={{ color: "#0891b2" }} />,
            label: <span style={{ fontSize: 13 }}>Add Unit</span>,
            onClick: () => navigate(isAdmin ? "/admin/dala/units" : "/dala/units"),
          },
          {
            key: "sale",
            icon: <MoneyCollectOutlined style={{ color: "#16a34a" }} />,
            label: <span style={{ fontSize: 13 }}>Property Sale</span>,
            onClick: () => navigate(isAdmin ? "/admin/dala/sales" : "/dala/sales"),
          },
          {
            key: "lease",
            icon: <FileProtectOutlined style={{ color: "#7c3aed" }} />,
            label: <span style={{ fontSize: 13 }}>Create Lease</span>,
            onClick: () => navigate(isAdmin ? "/admin/dala/leases" : "/dala/leases"),
          },
          {
            key: "tenant",
            icon: <UsergroupAddOutlined style={{ color: "#f59e0b" }} />,
            label: <span style={{ fontSize: 13 }}>Add Tenant</span>,
            onClick: () => navigate(isAdmin ? "/admin/dala/tenants" : "/dala/tenants"),
          },
        ],
      });
    }

    return items;
  };

  const quickCreateItems = getQuickCreateItems();

  const QuickCreateButton = (
    <Dropdown
      menu={{ items: quickCreateItems }}
      trigger={["click"]}
      placement="bottomRight"
      overlayStyle={{ minWidth: 220, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }}
    >
      <Button
        icon={<PlusOutlined />}
        shape="circle"
        size="middle"
        style={{
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "white", width: 36, height: 36, fontSize: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      />
    </Dropdown>
  );

  const notificationsContent = (
    <div style={{ width: 330, maxHeight: 460, overflow: "auto" }}>
      <div style={{
        padding: "12px 16px 10px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid #f0f0f0",
      }}>
        <Text strong style={{ fontSize: 14 }}>Notifications</Text>
        {unreadNotificationsCount > 0 && (
          <Button type="link" size="small" onClick={() => markAllAsReadMutation.mutate()}
            style={{ padding: 0, fontSize: 12 }}>
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 20, textAlign: "center", color: C.subText, fontSize: 13 }}>Loading…</div>
      ) : recentNotifications.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No unread notifications" style={{ padding: "20px 0" }} />
      ) : (
        <List
          dataSource={recentNotifications}
          renderItem={(item: any) => (
            <List.Item
              style={{
                padding: "10px 16px", background: "rgba(24,144,255,0.04)",
                cursor: "pointer", borderBottom: "1px solid #f8fafc",
              }}
              onClick={() => handleViewDetails(item)}
            >
              <List.Item.Meta
                avatar={renderPriorityIndicator(item.priority)}
                title={
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Text strong style={{ fontSize: 13 }}>{item.title}</Text>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 8, whiteSpace: "nowrap" }}>
                      {dayjs(item.createdAt).fromNow()}
                    </Text>
                  </div>
                }
                description={
                  <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: item.message }}>
                    {item.message}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}

      <div style={{ textAlign: "center", padding: "8px 16px", borderTop: "1px solid #f0f0f0" }}>
        <Button type="link" size="small" onClick={() => navigate(notificationsPath)} style={{ fontSize: 12 }}>
          View all notifications
        </Button>
      </div>
    </div>
  );

  const userMenuItems = [
    {
      key: "profile",
      icon: (
        <div style={{ display: "flex", alignItems: "center", width: "100%", padding: "2px 0" }}>
          <Avatar
            src={user?.thumbnail} alt={user?.email}
            style={{ border: `2px solid ${primaryColor}`, width: 48, height: 48 }}
            size="large" icon={<UserOutlined />}
          />
          <Space direction="vertical" style={{ marginLeft: 12, gap: 2, flex: 1 }} size="small">
            <Typography.Text strong style={{ fontSize: 14, color: "#262626" }}>
              {user?.name || "User Name"}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12, color: "#8c8c8c" }}
              ellipsis={{ tooltip: user?.email }}>
              {user?.email}
            </Typography.Text>
            <Typography.Link
              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user?.id}`); }}
              style={{ fontSize: 12, fontWeight: 500, color: primaryColor }}>
              View Your Profile
            </Typography.Link>
          </Space>
        </div>
      ),
      onClick: () => navigate(`/profile/${user?.id}`),
      style: {
        padding: "8px 12px", height: "auto",
        background: "linear-gradient(135deg, rgba(24,144,255,0.05), rgba(24,144,255,0.02))",
        borderRadius: 8, margin: 4,
      },
    },
    { type: "divider" as const },
    ...(isAdmin ? [{
      key: "back-to-admin",
      icon: <ArrowLeftOutlined style={{ fontSize: 14, color: C.primary }} />,
      label: <span style={{ fontWeight: 600, color: C.primary }}>Back to Admin Dashboard</span>,
      onClick: handleBackToAdmin,
      style: {
        padding: "8px 12px", margin: "2px 4px", borderRadius: 6,
        background: C.primaryLight, border: `1px solid ${C.primary}22`,
      },
    }] : []),
    ...(isAdmin ? [{ type: "divider" as const }] : []),
    {
      key: "notifications",
      icon: <BellOutlined style={{ fontSize: 15, color: "#52c41a" }} />,
      label: (
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 500 }}>Notifications</span>
          {unreadNotificationsCount > 0 && (
            <Tag color="green" style={{ fontSize: 11 }}>{unreadNotificationsCount}</Tag>
          )}
        </Space>
      ),
      onClick: () => navigate(notificationsPath),
      style: { padding: "8px 12px", margin: "2px 4px", borderRadius: 6 },
    },
    ...(isAdmin || user?.role === "cashier"
      ? [
        {
          key: "faqs",
          icon: <QuestionCircleOutlined style={{ fontSize: 15, color: "#722ed1" }} />,
          label: "FAQs",
          onClick: () => navigate("/fss-faqs"),
          style: { padding: "8px 12px", margin: "2px 4px", borderRadius: 6 },
        },
        {
          key: "help-center",
          icon: <CustomerServiceOutlined style={{ fontSize: 15, color: "#1890ff" }} />,
          label: "Help Center",
          onClick: () => navigate("/help-center"),
          style: { padding: "8px 12px", margin: "2px 4px", borderRadius: 6 },
        },
        {
          key: "settings",
          icon: <SettingOutlined style={{ fontSize: 15, color: "#13c2c2" }} />,
          label: "Settings",
          onClick: () => navigate("/system-setup"),
          style: { padding: "8px 12px", margin: "2px 4px", borderRadius: 6 },
        },
      ]
      : [
        {
          key: "help-center",
          icon: <CustomerServiceOutlined style={{ fontSize: 15, color: "#1890ff" }} />,
          label: "Help Center",
          onClick: () => navigate("/help-center"),
          style: { padding: "8px 12px", margin: "2px 4px", borderRadius: 6 },
        },
      ]),
    {
      key: "logout",
      icon: <PoweroffOutlined style={{ fontSize: 15 }} />,
      label: <span style={{ fontWeight: 500 }}>Logout</span>,
      onClick: handleLogout,
      danger: true,
      style: {
        padding: "8px 12px", margin: "2px 4px", borderRadius: 6,
        border: "1px solid rgba(255,77,79,0.1)",
      },
    },
  ];

  const headerActions = (
    <Space size={isMobile ? 6 : "middle"} align="center">
      {QuickCreateButton}

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
          count={unreadNotificationsCount} showZero={false}
          offset={[-6, 6]} overflowCount={99} size="small"
          style={{
            backgroundColor: unreadNotificationsCount > 1 ? "#ff4d4f" : "#52c41a",
            fontSize: 10,
          }}
        >
          <Button
            icon={<BellOutlined />} shape="circle" size="middle"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "white", width: 36, height: 36, fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          />
        </Badge>
      </Popover>

      {!isMobile && user && (
        <Dropdown
          menu={{ items: userMenuItems }}
          arrow={{ pointAtCenter: true }}
          trigger={["hover", "click"]}
          placement="bottomCenter"
          overlayStyle={{ minWidth: 280, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
        >
          <Button
            type="text"
            style={{
              padding: "4px 8px",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 50, height: "auto", minHeight: 36,
            }}
          >
            <Space align="center" size={8} style={{ cursor: "pointer" }}>
              <Badge dot status="success" offset={[-4, 26]}>
                <Avatar
                  src={user?.thumbnail} icon={<UserOutlined />} size={30}
                  style={{ border: "2px solid rgba(255,255,255,0.3)" }}
                />
              </Badge>
              <div style={{ textAlign: "left", lineHeight: 1.2 }}>
                <Text strong style={{
                  color: "white", fontSize: 13, display: "block",
                  maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user?.name || "User"}
                </Text>
                <Text style={{
                  color: "rgba(255,255,255,0.75)", fontSize: 11, display: "block",
                  maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user?.role || "Role"}
                </Text>
              </div>
              <DownOutlined style={{ color: "rgba(255,255,255,0.8)", fontSize: 10 }} />
            </Space>
          </Button>
        </Dropdown>
      )}

      {isMobile && user && (
        <Badge dot color="green" offset={[-3, 26]}>
          <Avatar
            src={user?.thumbnail} icon={<UserOutlined />} size={32}
            style={{ border: "2px solid rgba(255,255,255,0.4)", cursor: "pointer" }}
            onClick={() => setMobileDrawerOpen(true)}
          />
        </Badge>
      )}
    </Space>
  );

  const mobileNavItems = navRoutes?.route?.routes || [];

  const MobileDrawer = (
    <Drawer
      open={mobileDrawerOpen}
      onClose={() => setMobileDrawerOpen(false)}
      placement="left"
      width={300}
      styles={{
        header: { display: "none" },
        body: { padding: 0, display: "flex", flexDirection: "column" },
        wrapper: { boxShadow: "4px 0 32px rgba(0,0,0,0.15)" },
      }}
    >
      <div style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)`,
        padding: "24px 20px 20px", position: "relative",
      }}>
        <button
          onClick={() => setMobileDrawerOpen(false)}
          style={{
            position: "absolute", right: 16, top: 16,
            background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%",
            width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "white", fontSize: 13,
          }}
        >
          <CloseOutlined />
        </button>

        <div style={{ marginBottom: 16 }}>
          {tenant?.tenant_logo?.url ? (
            <img src={tenant.tenant_logo.url} alt="logo"
              style={{ height: 38, maxWidth: 110, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          ) : (
            <img src="/relia.png" alt="logo" style={{ height: 34, width: 85, filter: "brightness(0) invert(1)" }} />
          )}
        </div>

        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge dot color="green" offset={[-3, 36]}>
              <Avatar src={user?.thumbnail} icon={<UserOutlined />} size={44}
                style={{ border: "2px solid rgba(255,255,255,0.4)" }} />
            </Badge>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "white", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.name || "User"}
              </div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
                {user?.email}
              </div>
              <div style={{
                display: "inline-block", background: "rgba(255,255,255,0.2)",
                borderRadius: 4, padding: "1px 8px", fontSize: 10,
                color: "rgba(255,255,255,0.9)", textTransform: "uppercase", letterSpacing: "0.5px",
              }}>
                {user?.role || "Staff"}
              </div>
            </div>
          </div>
        )}
      </div>

      {isAdmin && (
        <div
          onClick={handleBackToAdmin}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "11px 20px",
            background: C.primaryLight,
            borderBottom: `1px solid ${C.primary}22`,
            cursor: "pointer",
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: C.primary, display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <ArrowLeftOutlined style={{ color: "white", fontSize: 13 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.primary, lineHeight: 1.2 }}>
              Back to Admin Dashboard
            </div>
            <div style={{ fontSize: 11, color: C.subText, lineHeight: 1.2, marginTop: 1 }}>
              Switch back to admin view
            </div>
          </div>
          <RightOutlined style={{ fontSize: 11, color: C.primary }} />
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {mobileNavItems.map((item: any) => {
          // Find the most specific path match to avoid multiple active states
          const matchingItems = mobileNavItems.filter(navItem => 
            location.pathname === navItem.path ||
            (navItem.path !== "/" && location.pathname.startsWith(navItem.path + "/"))
          );
          const mostSpecificMatch = matchingItems.reduce((longest, current) => 
            current.path.length > longest.path.length ? current : longest
          , matchingItems[0]);
          const isActive = mostSpecificMatch?.path === item.path;
          return (
            <NavLink key={item.path || item.key} to={item.path || "/"} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 20px", margin: "2px 8px", borderRadius: 10,
                background: isActive ? `${primaryColor}12` : "transparent",
                borderLeft: isActive ? `3px solid ${primaryColor}` : "3px solid transparent",
                cursor: "pointer",
              }}>
                <span style={{ fontSize: 16, color: isActive ? primaryColor : C.subText, width: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.icon}
                </span>
                <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? primaryColor : C.darkText, flex: 1 }}>
                  {item.name}
                </span>
                <RightOutlined style={{ fontSize: 10, color: "#94a3b8" }} />
              </div>
            </NavLink>
          );
        })}
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, padding: "8px 0" }}>
        {[
          { icon: <BellOutlined />, label: "Notifications", path: notificationsPath, color: C.green, badge: unreadNotificationsCount },
          ...(isAdmin || user?.role === "cashier"
            ? [
              { icon: <SettingOutlined />, label: "Settings", path: "/system-setup", color: "#06b6d4" },
              { icon: <QuestionCircleOutlined />, label: "FAQs", path: "/fss-faqs", color: "#6366f1" },
            ]
            : []),
        ].map((item: any) => (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", cursor: "pointer" }}
          >
            <span style={{ color: item.color, fontSize: 15 }}>{item.icon}</span>
            <span style={{ fontSize: 14, color: "#374151", flex: 1 }}>{item.label}</span>
            {item.badge > 0 && (
              <Tag color="green" style={{ fontSize: 10, marginLeft: "auto" }}>{item.badge}</Tag>
            )}
          </div>
        ))}

        <div
          onClick={handleLogout}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", cursor: "pointer", color: C.red }}
        >
          <PoweroffOutlined style={{ fontSize: 15 }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>Logout</span>
        </div>
      </div>
    </Drawer>
  );

  return (
    <App>
      <style>{`
        .ant-pro-global-header svg,
        .ant-pro-global-header .anticon { color: white !important; }
        .ant-pro-global-header-collapsed-button,
        .ant-pro-sider-collapsed-button { color: white !important; }
        .ant-dropdown-menu-item:hover { background: rgba(255, 255, 255, 0.15) !important; }
        .ant-dropdown-menu-item-active { background: rgba(255, 255, 255, 0.1) !important; }
        .nav-overflow-popup .ant-menu { background: ${primaryColor} !important; border-radius: 10px !important; padding: 4px !important; border: none !important; box-shadow: 0 8px 24px rgba(0,0,0,0.14) !important; }
        .nav-overflow-popup .ant-menu-item { color: rgba(255,255,255,0.85) !important; border-radius: 6px !important; margin: 2px 0 !important; height: 38px !important; line-height: 38px !important; }
        .nav-overflow-popup .ant-menu-item:hover { background: rgba(255,255,255,0.15) !important; color: #fff !important; }
        .nav-overflow-popup .ant-menu-item-selected { background: rgba(255,255,255,0.2) !important; color: #fff !important; font-weight: 600; }
        .nav-overflow-popup .ant-menu-item .anticon { color: rgba(255,255,255,0.85) !important; }
        .nav-overflow-popup .ant-menu-item:hover .anticon { color: #fff !important; }
        .ant-menu-overflow-item-rest .ant-menu-title-content { display: none !important; }
        .ant-menu-overflow-item-rest { padding: 0 !important; }
        .ant-menu-overflow-item-rest > .ant-menu-submenu-title { padding: 0 !important; margin: 0 !important; background: transparent !important; }
        .ant-menu-overflow-item-rest > .ant-menu-submenu-title::after { display: none !important; }
        @media (max-width: 767px) { .ant-pro-page-container { padding: 12px !important; } .ant-pro-global-header { padding: 0 12px !important; } }
        .notification-popover-overlay .ant-popover-inner { padding: 0 !important; }
      `}</style>

      {MobileDrawer}

      {/* ── Quick-create modals ──────────────────────────────────────────── */}
      <AddCustomerModal
        visible={quickCreateModal === "customer"}
        onClose={closeQuickCreate}
        onSuccess={() => { invalidateAll(); closeQuickCreate(); }}
        mode="add"
      />
      <AddProSupplierModal
        actionRef={fakeActionRef}
        edit={false}
        externalOpen={quickCreateModal === "supplier"}
        onExternalClose={closeQuickCreate}
      />
      <AccountFormDrawer
        open={quickCreateModal === "coa"}
        onClose={closeQuickCreate}
        onSuccess={() => { invalidateAll(); closeQuickCreate(); }}
        editingAccount={null}
        accounts={[]}
        shopId={shopId}
      />
      <JournalEntryFormDrawer
        open={quickCreateModal === "journal"}
        onClose={closeQuickCreate}
        onSuccess={() => { invalidateAll(); closeQuickCreate(); }}
        shopId={shopId}
      />
      <AddProPaymentMethodSettingsModal
        actionRef={fakeActionRef}
        edit={false}
        externalOpen={quickCreateModal === "payment-method"}
        onExternalClose={closeQuickCreate}
      />
      <ManualInvoiceModal
        open={quickCreateModal === "invoice"}
        onClose={closeQuickCreate}
      />
      <ManualIncomeModal
        open={quickCreateModal === "income-expense"}
        onClose={closeQuickCreate}
      />

      <ProLayout
        style={{ maxWidth: "1920px" }}
        logo={
          tenant?.tenant_logo?.url ? (
            <Image src={tenant.tenant_logo.url} height={isMobile ? 44 : 60} preview={false} alt="tenant-logo"
              style={{ padding: isMobile ? 3 : 5, objectFit: "contain", maxWidth: isMobile ? 90 : 120 }} />
          ) : (
            <Image src="/relia.png" height={isMobile ? 38 : 90} width={isMobile ? 90 : 120}
              preview={false} alt="relia-logo" style={{ padding: isMobile ? 6 : 12 }} />
          )
        }
        title=""
        menuHeaderRender={(logo: any, title: any) => (
          <div id="customize_menu_header" style={{ height: 32, display: "flex", alignItems: "center", gap: 8 }}>
            {logo}{title}
          </div>
        )}
        colorPrimary={primaryColor}
        contentWidth="Fluid"
        navTheme="light"
        contentStyle={{ padding: 0, margin: "0 auto" }}
        layout="top"
        splitMenus={false}
        fixedHeader={true}
        menuRender={isMobile ? false : undefined}
        menuProps={{
          overflowedIndicatorPopupClassName: "nav-overflow-popup",
          overflowedIndicator: (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 14px", height: 40, cursor: "pointer", color: "rgba(255,255,255,0.85)", fontSize: 14, userSelect: "none" }}>
              <AppstoreOutlined style={{ fontSize: 14 }} />
              <span>More</span>
              <DownOutlined style={{ fontSize: 9, opacity: 0.7 }} />
            </div>
          ),
        }}
        headerRender={
          isMobile
            ? () => (
              <div style={{ height: 52, background: primaryColor, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
                <button
                  onClick={() => setMobileDrawerOpen(true)}
                  style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", fontSize: 16 }}
                >
                  <MenuOutlined style={{ color: "white" }} />
                </button>
                <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
                  {tenant?.tenant_logo?.url ? (
                    <img src={tenant.tenant_logo.url} alt="logo" style={{ height: 34, maxWidth: 80, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
                  ) : (
                    <img src="/relia.png" alt="logo" style={{ height: 28, width: 70, filter: "brightness(0) invert(1)" }} />
                  )}
                </div>
                {user ? headerActions : (
                  <StaffModal setOpen={setStaffModalOpen} open={staffModalOpen} tbl="staff" showButton />
                )}
              </div>
            )
            : undefined
        }
        avatarProps={
          !isMobile
            ? {
              src: user?.thumbnail,
              shape: "circle",
              size: "large",
              style: { border: "2px solid white", width: 32, height: 32 },
              render: (_props: any, _dom: any) =>
                user ? headerActions : (
                  <StaffModal setOpen={setStaffModalOpen} open={staffModalOpen} tbl="staff" showButton />
                ),
            }
            : undefined
        }
        {...navRoutes}
        location={{
          pathname: location.pathname,
        }}
        selectedKeys={[selectedKey]}
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
        menuItemRender={(item: any, dom: any) => (
          <NavLink to={item?.path || "/"}>{dom}</NavLink>
        )}
      >
        {children}

        <Modal
          title="Notification Details"
          open={detailsModalVisible}
          onCancel={() => setDetailsModalVisible(false)}
          footer={[<Button key="close" onClick={() => setDetailsModalVisible(false)}>Close</Button>]}
          width={isMobile ? "94vw" : 560}
          styles={{ body: { padding: isMobile ? 12 : 24 } }}
        >
          {selectedNotification && (
            <div>
              <Title level={isMobile ? 5 : 4}>{selectedNotification.title}</Title>
              <Space style={{ marginBottom: 16, flexWrap: "wrap" }}>
                {renderTypeTag(selectedNotification.type)}
                {renderPriorityTag(selectedNotification.priority)}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(selectedNotification.createdAt).format("MMM D, YYYY h:mm A")}
                </Text>
              </Space>
              <Text>{selectedNotification.message}</Text>
              {selectedNotification.additionalInfo && (
                <div style={{ marginTop: 16 }}>
                  <Title level={5}>Additional Info</Title>
                  <pre style={{ whiteSpace: "pre-wrap", background: C.bg, padding: 12, borderRadius: 6, fontSize: 12, border: `1px solid ${C.border}` }}>
                    {JSON.stringify(selectedNotification.additionalInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </Modal>
      </ProLayout>
    </App>
  );
};

export default ProNavbar;