import React, { useState, useMemo } from "react";
import { Typography } from "antd";
import { OrderedListOutlined, ShoppingCartOutlined, FileDoneOutlined , LockOutlined, CheckCircleOutlined } from "@ant-design/icons";
import OrdersTable from "@pages/OrderManagement/Orders/OrdersTable";
import OrdersByLocation from "@pages/OrderManagement/Orders/OrdersByLocation";
import InvoiceTable from "@pages/OrderManagement/Invoices/InvoiceTable";
import ManualInvoiceModal from "@pages/OrderManagement/Invoices/ManualInvoiceModal";
import { getPermissionChecker } from "@utils/getPermissionChecker";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { THEME_C } from "@utils/getPrimaryColor";
import { getStoredShopId, useMarketplace } from "@pages/OmniChannel/shared/ui";
import { useTenantModules } from "@hooks/useTenantModules";
import { useIsCompact } from "@hooks/useIsCompact";

const { Text } = Typography;

const C = THEME_C;

const TAB_CFG = [
  {
    key: "orders",
    icon: <ShoppingCartOutlined />,
    iconColor: C.blue,
    label: "Orders",
    permissionKey: "ORDERS_VIEW",
  },
  {
    key: "done",
    icon: <CheckCircleOutlined />,
    iconColor: C.green,
    label: "Order Analysis",
    permissionKey: "ORDERS_VIEW",
  },
  {
    key: "invoices",
    icon: <FileDoneOutlined />,
    iconColor: C.green,
    label: "Invoices",
    permissionKey: "ACCOUNTING_INVOICE_VIEW",
  },
];

const TabNav: React.FC<{
  tabs: { key: string; icon: React.ReactNode; iconColor: string; label: string; allowed: boolean }[];
  active: string;
  onChange: (k: string) => void;
  primaryColor: string;
}> = ({ tabs, active, onChange, primaryColor }) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {tabs.map((t) => {
      const on = t.key === active;
      return (
        <button
          key={t.key}
          onClick={() => t.allowed && onChange(t.key)}
          title={!t.allowed ? "You don't have permission to access this section" : undefined}
          style={{
            background: on ? primaryColor : C.bg,
            color: on ? "#fff" : t.allowed ? C.subText : "#cbd5e1",
            border: `1px solid ${on ? primaryColor : C.border}`,
            borderRadius: 8, padding: "7px 13px", fontSize: 12,
            fontWeight: on ? 700 : 500,
            cursor: t.allowed ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.15s",
            opacity: t.allowed ? 1 : 0.5,
          }}
        >
          <span style={{ color: on ? "#fff" : t.allowed ? t.iconColor : "#cbd5e1", fontSize: 13 }}>
            {t.allowed ? t.icon : <LockOutlined />}
          </span>
          {t.label}
        </button>
      );
    })}
  </div>
);

const LockedTab = ({ label }: { label: string }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "60px 24px", gap: 12,
    color: "#94a3b8", textAlign: "center",
  }}>
    <LockOutlined style={{ fontSize: 32, color: "#cbd5e1" }} />
    <Text style={{ fontSize: 14, color: "#94a3b8" }}>
      You don't have permission to access <strong>{label}</strong>.
    </Text>
    <Text style={{ fontSize: 12, color: "#cbd5e1" }}>
      Contact your administrator to request access.
    </Text>
  </div>
);

const AccountingInvoicesTab: React.FC = () => (
  <div>
    <InvoiceTable />
  </div>
);

function MainOrders() {
  const primaryColor = usePrimaryColor();
  const isCompact = useIsCompact();
  const { hasPOS: hasDuka, hasAccounting } = useTenantModules();

  // Chat orders from the WhatsApp Marketplace are real orders, so a Mteja
  // shop selling in chat gets the Orders tabs even without Duka (POS).
  const shopId = getStoredShopId();
  const { enabled: sellsInChat } = useMarketplace(shopId);
  const hasPOS = hasDuka || sellsInChat;

  // Admin users get can() === true for every key via makePermissionChecker
  const can = useMemo(() => getPermissionChecker(), []);

  const visibleTabs = useMemo(
    () =>
      TAB_CFG
        .filter((t) => {
          // Orders list and Order Analysis need Duka (POS) or chat selling.
          if (t.key === "orders" || t.key === "done") return hasPOS;
          return true;
        })
        .map((t) => ({ ...t, allowed: can(t.permissionKey) })),
    [hasPOS, can]
  );

  const getDefaultTab = () => {
    const firstAllowed = visibleTabs.find((t) => t.allowed);
    if (firstAllowed) return firstAllowed.key;
    if (hasPOS && !hasAccounting) return "orders";
    if (!hasPOS && hasAccounting) return "invoices";
    return "orders";
  };

  // The shop settings load after first paint, so the default tab is derived
  // until the user picks one — otherwise Orders would never become the default.
  const [pickedTab, setActiveTab] = useState<string | null>(null);
  const activeTab =
    pickedTab && visibleTabs.some((t) => t.key === pickedTab) ? pickedTab : getDefaultTab();
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const activeTabCfg = visibleTabs.find((t) => t.key === activeTab);

  const renderTab = () => {
    if (!activeTabCfg?.allowed) {
      return <LockedTab label={activeTabCfg?.label ?? activeTab} />;
    }
    switch (activeTab) {
      case "orders":
        return <OrdersTable />;
      case "done":
        return <OrdersByLocation />;
      case "invoices":
        return <AccountingInvoicesTab />;
      default:
        return null;
    }
  };

  return (
    <>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 10,
          padding: isCompact ? "12px" : "14px 18px", background: C.bg, borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              background: C.primaryLight, borderRadius: 8,
              padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1,
            }}>
              <OrderedListOutlined />
            </div>
            <Text strong style={{ fontSize: 14, color: C.darkText }}>Orders & Invoices</Text>
          </div>
          <TabNav tabs={visibleTabs} active={activeTab} onChange={setActiveTab} primaryColor={primaryColor} />
        </div>

        <div style={{ padding: isCompact ? "10px" : "16px 18px" }}>
          {renderTab()}
        </div>
      </div>

      <ManualInvoiceModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
      />
    </>
  );
}

export default MainOrders;