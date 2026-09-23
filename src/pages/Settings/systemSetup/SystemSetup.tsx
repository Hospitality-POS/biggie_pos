import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  UserOutlined,
  DollarCircleOutlined,
  PrinterOutlined,
  LockOutlined,
  FontColorsOutlined,
  BankOutlined,
  BellOutlined,
  WhatsAppOutlined,
  HomeOutlined,
  BookOutlined,
  SettingOutlined,
  RightOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { Typography, Grid } from "antd";
import { useQuery } from "@tanstack/react-query";
import Profile from "./Profile";
import PaymentDetailsSettings from "../paymentMethodLevel/PaymentDetailsSettings";
import PrinterSettings from "./PrinterSettings";
import PrivacySettings from "./PrivacySettings";
import ReceiptAppearanceSettings from "./ReceiptAppearanceSettings";
import BankDetailsSettings from "./BankDetailsSettings";
import NotificationSettings from "./NotificationSettings";
import WhatsAppSenderRegistration from "./WhatsAppSenderRegistration";
import HotelSettings from "./HotelSettings";
import TransactionLocking from "./TransactionLocking";
import ChartOfAccountsSettings from "./ChartOfAccountsSettings";
import CurrencyPage from "@pages/Currency/CurrencyPage";
import { fetchShop } from "@services/shops";
import { THEME_C } from "@utils/getPrimaryColor";
import { makePermissionChecker } from "@utils/accessControl";
import { useAppSelector } from "src/store";

const { Text, Title } = Typography;

const C = THEME_C;

interface SettingSection {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  group: string;
  render: () => React.ReactNode;
}

const SystemSetup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("payment-detail");
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  // Below lg the sidebar is replaced by scrollable pills so the content
  // area keeps a usable width on tablets and phones.
  const showSidebar = !!screens.lg;

  // Measure the space left below the app navbar so the sidebar and the
  // content pane can scroll independently instead of scrolling the page.
  const rootRef = useRef<HTMLDivElement>(null);
  const [availHeight, setAvailHeight] = useState<number | null>(null);
  useEffect(() => {
    const update = () => {
      if (rootRef.current) {
        setAvailHeight(
          Math.max(320, window.innerHeight - rootRef.current.getBoundingClientRect().top)
        );
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const shopId = localStorage.getItem("shopId");

  const { data: shopData } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
  });

  const isHotelMode = shopData?.pos_mode === "hotel";

  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
  const hasAccounting = !!(
    tenant?.accounting_database?.enabled ||
    tenant?.modules?.accounting
  );

  const { user } = useAppSelector((state) => state.auth);
  const rolePermissions: string[] =
    (user as any)?.rolePermissions ?? (user as any)?.permissions ?? [];
  const can = makePermissionChecker(rolePermissions, user?.role === "admin");
  // Same gate the currencies nav item used before it moved here.
  const canSeeCurrencies = can("ACCOUNTING_COA_VIEW");

  const sections = useMemo<SettingSection[]>(() => {
    const list: SettingSection[] = [
      {
        key: "payment-detail",
        label: "Payment Methods",
        description: "Till, paybill & account numbers",
        icon: <DollarCircleOutlined />,
        color: "#10b981",
        bg: "#f0fdf4",
        group: "Payments",
        render: () => <PaymentDetailsSettings />,
      },
      {
        key: "bank-details",
        label: "Bank Details",
        description: "Bank accounts shown on receipts",
        icon: <BankOutlined />,
        color: "#3b82f6",
        bg: "#eff6ff",
        group: "Payments",
        render: () => <BankDetailsSettings />,
      },
    ];

    if (hasPOS) {
      list.push(
        {
          key: "printer-settings",
          label: "Printer Settings",
          description: "Receipt printers & print agents",
          icon: <PrinterOutlined />,
          color: "#8b5cf6",
          bg: "#f5f3ff",
          group: "POS & Receipts",
          render: () => <PrinterSettings />,
        },
        {
          key: "receipt-appearance",
          label: "Receipt Appearance",
          description: "Font size & receipt styling",
          icon: <FontColorsOutlined />,
          color: "#0d9488",
          bg: "#f0fdfa",
          group: "POS & Receipts",
          render: () => <ReceiptAppearanceSettings />,
        },
        {
          key: "privacy",
          label: "Privacy",
          description: "Cart visibility, printing & warranty",
          icon: <LockOutlined />,
          color: "#f59e0b",
          bg: "#fffbeb",
          group: "POS & Receipts",
          render: () => <PrivacySettings />,
        }
      );
    }

    list.push(
      {
        key: "profile",
        label: "System Profile",
        description: "Business name, contacts & KRA pin",
        icon: <UserOutlined />,
        color: "#3b82f6",
        bg: "#eff6ff",
        group: "General",
        render: () => <Profile />,
      },
      {
        key: "notification-settings",
        label: "Notifications",
        description: "Alerts & notification channels",
        icon: <BellOutlined />,
        color: "#f59e0b",
        bg: "#fffbeb",
        group: "General",
        render: () => <NotificationSettings />,
      },
      {
        key: "whatsapp-registration",
        label: "WhatsApp",
        description: "Sender registration & messaging",
        icon: <WhatsAppOutlined />,
        color: "#22c55e",
        bg: "#f0fdf4",
        group: "Integrations",
        render: () => <WhatsAppSenderRegistration />,
      }
    );

    if (hasAccounting) {
      list.push(
        {
          key: "transaction-locking",
          label: "Transaction Locking",
          description: "Lock periods for accounting entries",
          icon: <LockOutlined />,
          color: "#ef4444",
          bg: "#fef2f2",
          group: "Accounting",
          render: () => <TransactionLocking />,
        },
        {
          key: "chart-of-accounts",
          label: "Chart of Accounts",
          description: "Default account mappings",
          icon: <BookOutlined />,
          color: "#6366f1",
          bg: "#eef2ff",
          group: "Accounting",
          render: () => <ChartOfAccountsSettings />,
        }
      );
    }

    if (canSeeCurrencies) {
      list.push({
        key: "currencies",
        label: "Currencies",
        description: "Multi-currency & exchange rates",
        icon: <GlobalOutlined />,
        color: "#0d9488",
        bg: "#f0fdfa",
        group: hasAccounting ? "Accounting" : "General",
        render: () => <CurrencyPage />,
      });
    }

    if (isHotelMode) {
      list.push({
        key: "hotel-settings",
        label: "Hotel Settings",
        description: "Check-in, WiFi & room policies",
        icon: <HomeOutlined />,
        color: "#8b5cf6",
        bg: "#f5f3ff",
        group: "Hotel",
        render: () => <HotelSettings />,
      });
    }

    return list;
  }, [hasPOS, hasAccounting, isHotelMode, canSeeCurrencies]);

  const activeSection =
    sections.find((s) => s.key === activeTab) ?? sections[0];

  // Preserve group order for the sidebar
  const groups = useMemo(() => {
    const map = new Map<string, SettingSection[]>();
    for (const s of sections) {
      if (!map.has(s.group)) map.set(s.group, []);
      map.get(s.group)!.push(s);
    }
    return [...map.entries()];
  }, [sections]);

  const iconChip = (s: SettingSection, size = 34) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        background: s.bg,
        color: s.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.5,
        flexShrink: 0,
      }}
    >
      {s.icon}
    </div>
  );

  const sidebarItem = (s: SettingSection) => {
    const active = s.key === activeSection?.key;
    return (
      <div
        key={s.key}
        onClick={() => setActiveTab(s.key)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 10,
          cursor: "pointer",
          background: active ? C.primaryLight : "transparent",
          border: `1px solid ${active ? `${C.primary}40` : "transparent"}`,
          transition: "background 0.15s ease, border-color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = "#f1f5f9";
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = "transparent";
        }}
      >
        {iconChip(s, 32)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              color: active ? C.primary : "#0f172a",
              display: "block",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {s.label}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: C.subText,
              display: "block",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {s.description}
          </Text>
        </div>
        {active && (
          <RightOutlined style={{ fontSize: 10, color: C.primary }} />
        )}
      </div>
    );
  };

  const mobilePill = (s: SettingSection) => {
    const active = s.key === activeSection?.key;
    return (
      <div
        key={s.key}
        onClick={() => setActiveTab(s.key)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 14px",
          borderRadius: 999,
          cursor: "pointer",
          whiteSpace: "nowrap",
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          color: active ? "#fff" : "#334155",
          background: active ? C.primary : "#fff",
          border: `1px solid ${active ? C.primary : "#e2e8f0"}`,
          transition: "all 0.15s ease",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14, display: "inline-flex" }}>{s.icon}</span>
        {s.label}
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      style={{
        padding: isMobile ? "12px" : "16px 24px",
        height: availHeight ?? "100vh",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* fade the content pane in when switching sections + slim scrollbars */}
      <style>{`
        @keyframes setupFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .setup-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .setup-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .setup-scroll::-webkit-scrollbar-track { background: transparent; }
        .setup-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .setup-pills::-webkit-scrollbar { display: none; }
        .setup-pills { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: isMobile ? 14 : 20,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: isMobile ? 40 : 46,
            height: isMobile ? 40 : 46,
            borderRadius: 12,
            background: C.primaryLight,
            color: C.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isMobile ? 19 : 22,
            flexShrink: 0,
          }}
        >
          <SettingOutlined />
        </div>
        <div>
          <Title
            level={isMobile ? 5 : 4}
            style={{ margin: 0, color: "#0f172a", letterSpacing: -0.3 }}
          >
            System Setup
          </Title>
          <Text style={{ fontSize: isMobile ? 11 : 13, color: C.subText }}>
            Configure payments, printing, privacy and integrations
            {shopData?.name ? ` for ${shopData.name}` : ""}
          </Text>
        </div>
      </div>

      {/* ── Mobile section pills ─────────────────────────────────────── */}
      {!showSidebar && (
        <div
          className="setup-pills"
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            padding: "2px 2px 10px",
            marginBottom: 4,
            WebkitOverflowScrolling: "touch",
            flexShrink: 0,
          }}
        >
          {sections.map(mobilePill)}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "stretch",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* ── Sidebar menu (desktop) ─────────────────────────────────── */}
        {showSidebar && (
          <div
            className="setup-scroll"
            style={{
              width: 264,
              flexShrink: 0,
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "10px 8px",
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {groups.map(([group, items], gi) => (
              <div key={group} style={{ marginBottom: gi === groups.length - 1 ? 0 : 6 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: "#94a3b8",
                    padding: "8px 12px 4px",
                  }}
                >
                  {group}
                </div>
                {items.map(sidebarItem)}
              </div>
            ))}
          </div>
        )}

        {/* ── Content card ───────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {activeSection && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: isMobile ? "14px 16px" : "18px 22px",
                  borderBottom: "1px solid #f1f5f9",
                  flexShrink: 0,
                }}
              >
                {iconChip(activeSection, isMobile ? 34 : 40)}
                <div style={{ minWidth: 0 }}>
                  <Text
                    strong
                    style={{
                      fontSize: isMobile ? 14 : 16,
                      color: "#0f172a",
                      display: "block",
                    }}
                  >
                    {activeSection.label}
                  </Text>
                  <Text style={{ fontSize: isMobile ? 11 : 12, color: C.subText }}>
                    {activeSection.description}
                  </Text>
                </div>
              </div>

              <div
                key={activeSection.key}
                className="setup-scroll"
                style={{
                  padding: isMobile ? "12px" : "20px 22px",
                  animation: "setupFadeIn 0.2s ease",
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                }}
              >
                {activeSection.render()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSetup;
