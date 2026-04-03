import React, { useState } from "react";
import {
  FileDoneOutlined,
  OrderedListOutlined,
  ShoppingCartOutlined,
  FileAddOutlined,
} from "@ant-design/icons";
import { Button, Typography } from "antd";
import OrdersTable from "./Orders/OrdersTable";
import InvoiceTable from "./Invoices/InvoiceTable";
import ManualInvoiceModal from "./Invoices/ManualInvoiceModal";

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
  { key: "orders", icon: <ShoppingCartOutlined />, iconColor: C.blue, label: "Orders" },
  { key: "invoices", icon: <FileDoneOutlined />, iconColor: C.green, label: "Invoices" },
];

const TabNav: React.FC<{
  tabs: { key: string; icon: React.ReactNode; iconColor: string; label: string }[];
  active: string;
  onChange: (k: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {tabs.map((t) => {
      const on = t.key === active;
      return (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          background: on ? C.primary : C.bg,
          color: on ? "#fff" : C.subText,
          border: `1px solid ${on ? C.primary : C.border}`,
          borderRadius: 8, padding: "7px 13px", fontSize: 12,
          fontWeight: on ? 700 : 500, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          transition: "all 0.15s",
        }}>
          <span style={{ color: on ? "#fff" : t.iconColor, fontSize: 13 }}>{t.icon}</span>
          {t.label}
        </button>
      );
    })}
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

const AccountingInvoicesTab: React.FC<{ onNew: () => void; showNewButton: boolean }> = ({ onNew, showNewButton }) => (
  <div>
    {showNewButton && (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Button type="primary" icon={<FileAddOutlined />} onClick={onNew}
          style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 600 }}>
          New Invoice
        </Button>
      </div>
    )}
    <InvoiceTable />
  </div>
);

function MainOrders() {
  const { hasPOS, hasAccounting } = getModules();

  const getDefaultTab = () => {
    if (hasPOS && !hasAccounting) return "orders";
    if (!hasPOS && hasAccounting) return "invoices";
    return "orders";
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const visibleTabs = TAB_CFG.filter((t) => {
    if (t.key === "orders") return hasPOS;
    return true;
  });

  const renderTab = () => {
    switch (activeTab) {
      case "orders": return <OrdersTable />;
      case "invoices": return <AccountingInvoicesTab onNew={() => setInvoiceModalOpen(true)} showNewButton={hasAccounting} />;
      default: return null;
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
          <TabNav tabs={visibleTabs} active={activeTab} onChange={setActiveTab} />
        </div>

        <div style={{ padding: "16px 18px" }}>
          {renderTab()}
        </div>
      </div>

      <ManualInvoiceModal open={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} />
    </>
  );
}

export default MainOrders;