import React, { useState } from "react";
import {
  FileDoneOutlined,
  OrderedListOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  FileAddOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Button, DatePicker, Spin, Table, Typography,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import OrdersTable from "./Orders/OrdersTable";
import InvoiceTable from "./Invoices/InvoiceTable";
import ManualIncomeModal from "./Orders/ManualIncomeModal";
import ManualInvoiceModal from "./Invoices/ManualInvoiceModal";
import { getIncomeHistory } from "@services/accounting/income";

const { RangePicker } = DatePicker;
const { Text } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

// ── Tab nav ────────────────────────────────────────────────────────────────
const TAB_CFG = [
  { key: "orders", icon: <ShoppingCartOutlined />, iconColor: C.blue, label: "Orders" },
  { key: "invoices", icon: <FileDoneOutlined />, iconColor: C.green, label: "Invoices" },
  { key: "income", icon: <DollarOutlined />, iconColor: C.orange, label: "Income" },
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

// ── Summary card ───────────────────────────────────────────────────────────
const SummaryCard: React.FC<{
  label: string; value: string; color: string; bg: string;
}> = ({ label, value, color, bg }) => (
  <div style={{
    flex: "1 1 130px", background: bg,
    border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`,
    borderRadius: 8, padding: "10px 14px",
  }}>
    <Text style={{
      fontSize: 10, color: C.subText, textTransform: "uppercase",
      letterSpacing: "0.4px", fontWeight: 700, display: "block", marginBottom: 4,
    }}>
      {label}
    </Text>
    <Text strong style={{ fontSize: 14, color }}>{value}</Text>
  </div>
);

// ── Direction tag ──────────────────────────────────────────────────────────
const DirectionTag: React.FC<{ direction: string }> = ({ direction }) => (
  <span style={{
    display: "inline-block", borderRadius: 5, padding: "2px 8px",
    fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
    background: direction === "inbound" ? "#f0fdf4" : "#fef2f2",
    color: direction === "inbound" ? C.green : C.red,
    border: `1px solid ${direction === "inbound" ? "#bbf7d0" : "#fecaca"}`,
  }}>
    {direction === "inbound" ? "Income" : "Expense"}
  </span>
);

// ── Income tab ─────────────────────────────────────────────────────────────
const IncomeTab: React.FC<{ onPost: () => void }> = ({ onPost }) => {
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  const { data, isLoading } = useQuery({
    queryKey: ["income-history", page, dateRange],
    queryFn: () => getIncomeHistory({
      page, limit: 10,
      from: dateRange[0].toISOString(),
      to: dateRange[1].toISOString(),
    }),
  });

  const payments = data?.payments || [];
  const total = data?.total || 0;
  const totalInbound = payments.filter((p: any) => p.direction === "inbound").reduce((s: number, p: any) => s + p.amount, 0);
  const totalOutbound = payments.filter((p: any) => p.direction === "outbound").reduce((s: number, p: any) => s + p.amount, 0);
  const net = totalInbound - totalOutbound;

  const columns = [
    {
      title: "Date", dataIndex: "payment_date", width: 150,
      render: (v: string) => (
        <Text style={{ fontSize: 12, color: C.subText }}>{dayjs(v).format("DD MMM YYYY HH:mm")}</Text>
      ),
    },
    {
      title: "Type", dataIndex: "payment_type", width: 130,
      render: (type: string, rec: any) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <DirectionTag direction={rec.direction} />
          <Text style={{ fontSize: 11, color: C.subText }}>{type?.replace(/_/g, " ")}</Text>
        </div>
      ),
    },
    {
      title: "Reference", dataIndex: "reference",
      render: (v: string) => v
        ? <Text style={{ fontSize: 12 }}>{v}</Text>
        : <Text style={{ color: C.subText }}>—</Text>,
    },
    {
      title: "Method", dataIndex: "method_id", width: 110,
      render: (m: any) => m?.name
        ? <Text style={{ fontSize: 12 }}>{m.name}</Text>
        : <Text style={{ color: C.subText }}>—</Text>,
    },
    {
      title: "Account", dataIndex: "account_id",
      render: (a: any) => a ? (
        <span style={{
          fontFamily: "monospace", fontSize: 11,
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 4, padding: "1px 6px", color: C.darkText,
        }}>
          {a.account_code} {a.account_name}
        </span>
      ) : <Text style={{ color: C.subText }}>—</Text>,
    },
    {
      title: "Invoice", dataIndex: "invoice_id", width: 110,
      render: (inv: any) => inv ? (
        <span style={{
          background: "#eff6ff", color: C.blue, border: `1px solid #bfdbfe`,
          borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600,
        }}>
          {inv.order_no}
        </span>
      ) : <Text style={{ color: C.subText }}>—</Text>,
    },
    {
      title: "Amount (KES)", dataIndex: "amount", align: "right" as const, width: 130,
      render: (v: number, rec: any) => (
        <Text strong style={{ color: rec.direction === "inbound" ? C.green : C.red, fontSize: 13 }}>
          {rec.direction === "outbound" ? "−" : "+"}
          {fmt(v)}
        </Text>
      ),
    },
    {
      title: "JE", dataIndex: "journal_entry_id", width: 110,
      render: (je: any) => je ? (
        <span style={{
          background: je.status === "Posted" ? "#f0fdf4" : "#fffbeb",
          color: je.status === "Posted" ? C.green : C.orange,
          border: `1px solid ${je.status === "Posted" ? "#bbf7d0" : "#fde68a"}`,
          borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600,
        }}>
          {je.entry_no}
        </span>
      ) : (
        <span style={{ color: C.subText, fontSize: 12 }}>—</span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: 10,
      }}>
        <RangePicker
          value={dateRange}
          onChange={(v) => v && setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs])}
          style={{ borderRadius: 8 }}
          presets={[
            { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
            { label: "This Week", value: [dayjs().startOf("week"), dayjs().endOf("week")] },
            { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
            { label: "Last Month", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
          ]}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={onPost}
          style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 600 }}>
          Post Income / Expense
        </Button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <SummaryCard label="Total Income" value={`KES ${fmt(totalInbound)}`} color={C.green} bg="#f0fdf4" />
        <SummaryCard label="Total Expenses" value={`KES ${fmt(totalOutbound)}`} color={C.red} bg="#fef2f2" />
        <SummaryCard label="Net" value={`KES ${fmt(net)}`} color={net >= 0 ? C.green : C.red} bg={net >= 0 ? "#f0fdf4" : "#fef2f2"} />
      </div>

      {/* Table */}
      <Spin spinning={isLoading}>
        <Table
          rowKey="_id"
          dataSource={payments}
          columns={columns}
          size="small"
          pagination={{
            current: page, total, pageSize: 10, onChange: setPage,
            showTotal: (t) => `${t} entries`,
            style: { marginBottom: 0 },
          }}
          scroll={{ x: 900 }}
          style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}
        />
      </Spin>
    </div>
  );
};

// ── Invoices tab ───────────────────────────────────────────────────────────
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

// ── Main ───────────────────────────────────────────────────────────────────
function MainOrders() {
  const { hasPOS, hasAccounting } = getModules();

  const getDefaultTab = () => {
    if (hasPOS && !hasAccounting) return "orders";
    if (!hasPOS && hasAccounting) return "invoices";
    return "orders";
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const visibleTabs = TAB_CFG.filter((t) => {
    if (t.key === "orders") return hasPOS;
    if (t.key === "income") return hasAccounting;
    return true;
  });

  const renderTab = () => {
    switch (activeTab) {
      case "orders": return <OrdersTable />;
      case "invoices": return <AccountingInvoicesTab onNew={() => setInvoiceModalOpen(true)} showNewButton={hasAccounting} />;
      case "income": return <IncomeTab onPost={() => setIncomeModalOpen(true)} />;
      default: return null;
    }
  };

  return (
    <>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>

        {/* Header */}
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
            <Text strong style={{ fontSize: 14, color: C.darkText }}>Orders Management</Text>
          </div>
          <TabNav tabs={visibleTabs} active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Body */}
        <div style={{ padding: "16px 18px" }}>
          {renderTab()}
        </div>
      </div>

      <ManualIncomeModal open={incomeModalOpen} onClose={() => setIncomeModalOpen(false)} />
      <ManualInvoiceModal open={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} />
    </>
  );
}

export default MainOrders;