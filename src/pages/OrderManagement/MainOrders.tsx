import React, { useState, useMemo } from "react";
import { Typography } from "antd";
import { OrderedListOutlined, ShoppingCartOutlined, FileDoneOutlined , LockOutlined } from "@ant-design/icons";
import OrdersTable from "./Orders/OrdersTable";
import InvoiceTable from "./Invoices/InvoiceTable";
import ManualInvoiceModal from "./Invoices/ManualInvoiceModal";
import { getPermissionChecker } from "@utils/getPermissionChecker";
import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Text } = Typography;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  blue: "#3b82f6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

const TAB_CFG = [
  {
    key: "orders",
    icon: <ShoppingCartOutlined />,
    iconColor: C.blue,
    label: "Orders",
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

const getModules = () => {
  try {
    const tenant = JSON.parse(localStorage.getItem("tenant") || "{}");
    return {
      hasPOS: tenant?.pos_integration?.enabled === true,
      hasAccounting: tenant?.modules?.accounting === true,
    };
  } catch {
    return { hasPOS: false, hasAccounting: false };
  }
};

const AccountingInvoicesTab: React.FC = () => (
  <div>
    <InvoiceTable />
  </div>
);

function MainOrders() {
  const primaryColor = usePrimaryColor();
  const { hasPOS, hasAccounting } = getModules();

  // Admin users get can() === true for every key via makePermissionChecker
  const can = useMemo(() => getPermissionChecker(), []);

  const visibleTabs = useMemo(
    () =>
      TAB_CFG
        .filter((t) => {
          if (t.key === "orders") return hasPOS;
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

  const [activeTab, setActiveTab] = useState(getDefaultTab);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const activeTabCfg = visibleTabs.find((t) => t.key === activeTab);

  const renderTab = () => {
    if (!activeTabCfg?.allowed) {
      return <LockedTab label={activeTabCfg?.label ?? activeTab} />;
    }
    switch (activeTab) {
      case "orders":
        return <OrdersTable />;
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
          padding: "14px 18px", background: C.bg, borderBottom: `1px solid ${C.border}`,
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

        <div style={{ padding: "16px 18px" }}>
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