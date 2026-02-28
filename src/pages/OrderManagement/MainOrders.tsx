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
  Card, Space, Tabs, Typography, Button, Table, Tag, DatePicker,
  Row, Col, Statistic, Spin,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import OrdersTable from "./Orders/OrdersTable";
import InvoiceTable from "./Invoices/InvoiceTable";
import ManualIncomeModal from "./Orders/ManualIncomeModal";
import ManualInvoiceModal from "./Invoices/ManualInvoiceModal";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { getIncomeHistory } from "@services/accounting/income";

const { RangePicker } = DatePicker;

// ── Tenant helpers ────────────────────────────────────────────────────────────
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

// ── Income history tab ────────────────────────────────────────────────────────
const IncomeTab: React.FC<{ onPost: () => void }> = ({ onPost }) => {
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  const { data, isLoading } = useQuery({
    queryKey: ["income-history", page, dateRange],
    queryFn: () => getIncomeHistory({
      page,
      limit: 10,
      from: dateRange[0].toISOString(),
      to: dateRange[1].toISOString(),
    }),
  });

  const payments = data?.payments || [];
  const total = data?.total || 0;

  // ── Totals from current page data ─────────────────────────────────────────
  const totalInbound = payments.filter((p: any) => p.direction === "inbound")
    .reduce((s: number, p: any) => s + p.amount, 0);
  const totalOutbound = payments.filter((p: any) => p.direction === "outbound")
    .reduce((s: number, p: any) => s + p.amount, 0);

  const columns = [
    {
      title: "Date",
      dataIndex: "payment_date",
      render: (v: string) => dayjs(v).format("DD MMM YYYY HH:mm"),
      width: 160,
    },
    {
      title: "Description / Type",
      dataIndex: "payment_type",
      render: (type: string, rec: any) => (
        <Space direction="vertical" size={0}>
          <Tag color={rec.direction === "inbound" ? "green" : "red"}>
            {rec.direction === "inbound" ? "Income" : "Expense"}
          </Tag>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {type?.replace(/_/g, " ")}
          </Typography.Text>
        </Space>
      ),
      width: 130,
    },
    {
      title: "Reference",
      dataIndex: "reference",
      render: (v: string) => v || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Method",
      dataIndex: "method_id",
      render: (m: any) => m?.name || "—",
      width: 120,
    },
    {
      title: "Account",
      dataIndex: "account_id",
      render: (a: any) => a
        ? <Typography.Text code style={{ fontSize: 11 }}>{a.account_code} {a.account_name}</Typography.Text>
        : "—",
    },
    {
      title: "Invoice",
      dataIndex: "invoice_id",
      render: (inv: any) => inv
        ? <Tag color="blue">{inv.order_no}</Tag>
        : <Typography.Text type="secondary">—</Typography.Text>,
      width: 110,
    },
    {
      title: "Amount (KES)",
      dataIndex: "amount",
      align: "right" as const,
      render: (v: number, rec: any) => (
        <Typography.Text
          strong
          style={{ color: rec.direction === "inbound" ? "#52c41a" : "#ff4d4f" }}
        >
          {rec.direction === "outbound" ? "−" : "+"}
          {v?.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
        </Typography.Text>
      ),
      width: 130,
    },
    {
      title: "JE",
      dataIndex: "journal_entry_id",
      render: (je: any) => je
        ? <Tag color={je.status === "Posted" ? "green" : "orange"}>{je.entry_no}</Tag>
        : <Tag color="default">—</Tag>,
      width: 110,
    },
  ];

  return (
    <div>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(v) => v && setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs])}
              presets={[
                { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
                { label: "This Week", value: [dayjs().startOf("week"), dayjs().endOf("week")] },
                { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
                { label: "Last Month", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
              ]}
            />
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={onPost}>
            Post Income / Expense
          </Button>
        </Col>
      </Row>

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" style={{ borderLeft: "4px solid #52c41a" }}>
            <Statistic
              title="Total Income"
              value={totalInbound}
              precision={2}
              prefix="KES"
              valueStyle={{ color: "#52c41a", fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderLeft: "4px solid #ff4d4f" }}>
            <Statistic
              title="Total Expenses"
              value={totalOutbound}
              precision={2}
              prefix="KES"
              valueStyle={{ color: "#ff4d4f", fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderLeft: "4px solid #1890ff" }}>
            <Statistic
              title="Net"
              value={totalInbound - totalOutbound}
              precision={2}
              prefix="KES"
              valueStyle={{
                color: totalInbound - totalOutbound >= 0 ? "#52c41a" : "#ff4d4f",
                fontSize: 18,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <Spin spinning={isLoading}>
        <Table
          rowKey="_id"
          dataSource={payments}
          columns={columns}
          size="small"
          pagination={{
            current: page,
            total,
            pageSize: 10,
            onChange: setPage,
            showTotal: (t) => `${t} entries`,
          }}
          scroll={{ x: 900 }}
        />
      </Spin>
    </div>
  );
};

// ── Accounting invoices tab (wraps existing InvoiceTable + add button) ────────
const AccountingInvoicesTab: React.FC<{ onNew: () => void; showNewButton: boolean }> = ({ onNew, showNewButton }) => (
  <div>
    {showNewButton && (
      <Row justify="end" style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<FileAddOutlined />} onClick={onNew}>
          New Invoice
        </Button>
      </Row>
    )}
    <InvoiceTable />
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
function MainOrders() {
  const primaryColor = usePrimaryColor();
  const { hasPOS, hasAccounting } = getModules();

  // Determine default tab based on enabled modules
  const getDefaultTab = () => {
    if (hasPOS && !hasAccounting) return "orders";
    if (!hasPOS && hasAccounting) return "invoices";
    return "orders"; // Both enabled
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const tabItems = [
    // ── Tab 1: POS Orders (only if POS enabled) ──────────────────────────────
    ...(hasPOS
      ? [{
        key: "orders",
        label: <Space><ShoppingCartOutlined style={{ color: "#1890ff" }} />Orders</Space>,
        children: <OrdersTable />,
      }]
      : []
    ),

    // ── Tab 2: Invoices (always shown, but New Invoice button only if Accounting enabled) ─
    {
      key: "invoices",
      label: <Space><FileDoneOutlined style={{ color: "#52c41a" }} />Invoices</Space>,
      children: (
        <AccountingInvoicesTab
          onNew={() => setInvoiceModalOpen(true)}
          showNewButton={hasAccounting} // ✅ Only show "New Invoice" if accounting enabled
        />
      ),
    },

    // ── Tab 3: Income (only if Accounting enabled) ───────────────────────────
    ...(hasAccounting
      ? [{
        key: "income",
        label: <Space><DollarOutlined style={{ color: "#faad14" }} />Income</Space>,
        children: <IncomeTab onPost={() => setIncomeModalOpen(true)} />,
      }]
      : []
    ),
  ];

  return (
    <>
      <Card
        bordered
        bodyStyle={{ padding: 0 }}
        title={
          <Space>
            <OrderedListOutlined style={{ fontSize: 18, color: primaryColor }} />
            <Typography.Title level={4} style={{ margin: 0 }}>
              Orders Management
            </Typography.Title>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="large"
          items={tabItems}
          style={{ padding: "0 16px" }}
          tabBarStyle={{ marginBottom: 0 }}
          destroyInactiveTabPane={false}
        />
      </Card>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <ManualIncomeModal
        open={incomeModalOpen}
        onClose={() => setIncomeModalOpen(false)}
      />
      <ManualInvoiceModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
      />
    </>
  );
}

export default MainOrders;