import React, { useMemo, useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
  Tabs,
  Table,
  Badge,
  Typography,
  Space,
  Button,
  Tag,
  Progress,
  Row,
  Col,
  Empty,
  Skeleton,
  Input,
} from "antd";
import {
  ShoppingCartOutlined,
  WarningOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ShopOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { fmtK } from "@utils/formatters";

const { Text } = Typography;

interface OperationalHubProps {
  orders: any[];
  totalOrdersCount?: number;
  lowStockItems: any[];
  purchaseOrderStats?: {
    totalPurchaseOrders: number;
    totalPOValue: number;
    pendingPOs: number;
    approvedPOs: number;
    deliveredPOs: number;
    avgPOValue: number;
    recentPurchaseOrders: any[];
  };
  loading?: boolean;
  isMobile?: boolean;
  hospital?: boolean;
  hotel?: boolean;
  /** Show the Branch column (admin view spans several shops) */
  showBranch?: boolean;
}

const PAGE_SIZE = 8;
const MUTED = "#64748b";
const INK = "#0f172a";

// The API fills missing relations with placeholder strings; treat those as empty.
const PLACEHOLDERS = new Set(["unknown", "undefined", "unknown shop", "unknown supplier", "null", ""]);
const clean = (v: any): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return PLACEHOLDERS.has(s.toLowerCase()) ? null : s;
};

const ksh = (v: any) => `Ksh ${Math.round(Number(v || 0)).toLocaleString()}`;

const PAYMENT_STATUS: Record<string, { color: string; label: string }> = {
  COMPLETED: { color: "success", label: "Paid" },
  PENDING: { color: "warning", label: "Unpaid" },
  FAILED: { color: "error", label: "Failed" },
  REFUNDED: { color: "default", label: "Refunded" },
};

const PO_STATUS: Record<string, { color: string; label: string }> = {
  pending: { color: "warning", label: "Pending" },
  approved: { color: "processing", label: "Approved" },
  partially_delivered: { color: "cyan", label: "Partly Delivered" },
  fully_delivered: { color: "success", label: "Delivered" },
  cancelled: { color: "error", label: "Cancelled" },
};

const StatusTag: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <Tag color={color} bordered={false} style={{ borderRadius: 4, fontSize: 11, marginInlineEnd: 0 }}>
    {label}
  </Tag>
);

const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: 11, color: MUTED }}>{children}</span>
);

const Dash = () => <span style={{ color: "#cbd5e1" }}>—</span>;

const StatTile: React.FC<{ label: string; value: React.ReactNode; color?: string; isMobile?: boolean }> = ({
  label,
  value,
  color = INK,
  isMobile,
}) => (
  <div
    style={{
      background: "#f8fafc",
      padding: isMobile ? "6px 10px" : "8px 12px",
      borderRadius: 8,
      border: "1px solid #eef2f7",
      height: "100%",
    }}
  >
    <Text style={{ fontSize: 11, color: MUTED, display: "block" }}>{label}</Text>
    <Text strong style={{ fontSize: isMobile ? 13 : 15, color }}>
      {value}
    </Text>
  </div>
);

const matches = (q: string, ...fields: any[]) =>
  !q || fields.some((f) => String(f ?? "").toLowerCase().includes(q));

const useIsMobileHook = () => {
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  React.useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
};

const DashboardOperationalHub: React.FC<OperationalHubProps> = ({
  orders = [],
  totalOrdersCount = 0,
  lowStockItems = [],
  purchaseOrderStats,
  loading = false,
  isMobile: isMobileProp,
  hospital = false,
  hotel = false,
  showBranch = false,
}) => {
  const detectedMobile = useIsMobileHook();
  const isMobile = isMobileProp !== undefined ? isMobileProp : detectedMobile;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("orders");
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();

  const poStats = purchaseOrderStats || {
    totalPurchaseOrders: 0,
    totalPOValue: 0,
    pendingPOs: 0,
    approvedPOs: 0,
    deliveredPOs: 0,
    avgPOValue: 0,
    recentPurchaseOrders: [],
  };
  const purchaseOrders = poStats.recentPurchaseOrders || [];

  const deliveryRate = poStats.totalPurchaseOrders > 0
    ? Math.round((poStats.deliveredPOs / poStats.totalPurchaseOrders) * 100)
    : 0;

  const placeLabel = hospital ? "Ward / Bed" : hotel ? "Room" : "Table";

  // ── Derived, filtered rows ─────────────────────────────────────────────────
  const orderRows = useMemo(
    () =>
      orders.filter((o) =>
        matches(q, o.order_no, o.customer_name, clean(o.shop_name), clean(o.servedBy), clean(o.table))
      ),
    [orders, q]
  );

  const orderSummary = useMemo(() => {
    const value = orders.reduce((s, o) => s + Number(o.order_amount || 0), 0);
    const unpaid = orders.filter((o) => o.payment_status && o.payment_status !== "COMPLETED").length;
    return { value, unpaid, avg: orders.length ? value / orders.length : 0 };
  }, [orders]);

  const stockRows = useMemo(
    () =>
      [...lowStockItems]
        .filter((i) => matches(q, i.name, i.code, clean(i.shop_name)))
        // most urgent first: lowest share of the minimum level
        .sort((a, b) => {
          const ra = Number(a.quantity || 0) / Math.max(Number(a.min_viable_quantity || 0), 1);
          const rb = Number(b.quantity || 0) / Math.max(Number(b.min_viable_quantity || 0), 1);
          return ra - rb;
        }),
    [lowStockItems, q]
  );
  const outOfStock = lowStockItems.filter((i) => Number(i.quantity || 0) <= 0).length;

  const poRows = useMemo(
    () => purchaseOrders.filter((p: any) => matches(q, p.po_number, clean(p.supplier_name), clean(p.shop_name))),
    [purchaseOrders, q]
  );

  // ── Columns ────────────────────────────────────────────────────────────────
  const orderIdCell = (_: any, r: any) => (
    <div style={{ lineHeight: 1.3 }}>
      <Text strong style={{ fontSize: 13, color: INK }}>
        {r.order_no || "—"}
      </Text>
      <div>
        <Muted>{r.createdAt ? dayjs(r.createdAt).format("MMM D, HH:mm") : ""}</Muted>
      </div>
    </div>
  );
  const paymentStatusCell = (s: string) => {
    const meta = PAYMENT_STATUS[s];
    return meta ? <StatusTag {...meta} /> : <Dash />;
  };
  const amountCell = (amount: number) => (
    <Text strong style={{ fontSize: 13, color: INK }}>
      {ksh(amount)}
    </Text>
  );

  const orderColumns: any[] = isMobile
    ? [
        { title: "Order", key: "order", render: orderIdCell },
        { title: "Status", dataIndex: "payment_status", key: "status", width: 80, render: paymentStatusCell },
        { title: "Amount", dataIndex: "order_amount", key: "amount", align: "right", width: 100, render: amountCell },
      ]
    : [
        { title: "Order", key: "order", width: 150, render: orderIdCell },
        showBranch && {
          title: "Branch",
          dataIndex: "shop_name",
          key: "shop_name",
          width: 140,
          ellipsis: true,
          render: (v: string) => (clean(v) ? <Text style={{ fontSize: 12 }}>{v}</Text> : <Dash />),
        },
        {
          title: "Customer",
          key: "customer",
          ellipsis: true,
          render: (_: any, r: any) =>
            clean(r.customer_name) ? (
              <div style={{ lineHeight: 1.3 }}>
                <Text style={{ fontSize: 12 }}>{r.customer_name}</Text>
                {clean(r.customer_phone) && (
                  <div>
                    <Muted>{r.customer_phone}</Muted>
                  </div>
                )}
              </div>
            ) : (
              <Muted>Walk-in</Muted>
            ),
        },
        {
          title: placeLabel,
          dataIndex: "table",
          key: "table",
          width: 110,
          ellipsis: true,
          render: (v: string) => (clean(v) ? <Text style={{ fontSize: 12 }}>{v}</Text> : <Dash />),
        },
        {
          title: "Served By",
          dataIndex: "servedBy",
          key: "servedBy",
          width: 130,
          ellipsis: true,
          render: (v: string) => (clean(v) ? <Text style={{ fontSize: 12 }}>{v}</Text> : <Dash />),
        },
        {
          title: "Payment",
          key: "payment",
          width: 170,
          render: (_: any, r: any) => (
            <Space size={4} wrap>
              {paymentStatusCell(r.payment_status)}
              {(r.payment_methods || []).slice(0, 2).map((m: string) => (
                <Muted key={m}>{m}</Muted>
              ))}
            </Space>
          ),
        },
        {
          title: "Amount",
          dataIndex: "order_amount",
          key: "amount",
          width: 130,
          align: "right",
          sorter: (a: any, b: any) => Number(a.order_amount || 0) - Number(b.order_amount || 0),
          render: amountCell,
        },
      ].filter(Boolean);

  const stockLevelCell = (_: any, r: any) => {
    const qty = Number(r.quantity || 0);
    const min = Number(r.min_viable_quantity || 0);
    const pct = min > 0 ? Math.max(0, Math.min(100, Math.round((qty / min) * 100))) : 0;
    const color = qty <= 0 ? "#ef4444" : "#f59e0b";
    return (
      <div style={{ minWidth: isMobile ? 70 : 140 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <Text strong style={{ color, fontSize: 12 }}>
            {qty.toLocaleString()}
          </Text>
          <Muted>min {min.toLocaleString()}</Muted>
        </div>
        <Progress percent={pct} size="small" showInfo={false} strokeColor={color} style={{ margin: 0 }} />
      </div>
    );
  };
  const stockStatusCell = (_: any, r: any) =>
    Number(r.quantity || 0) <= 0 ? (
      <StatusTag color="error" label="Out of stock" />
    ) : (
      <StatusTag color="warning" label="Low stock" />
    );

  const stockColumns: any[] = isMobile
    ? [
        {
          title: "Item",
          dataIndex: "name",
          key: "name",
          ellipsis: true,
          render: (name: string) => <Text style={{ fontSize: 12 }}>{name}</Text>,
        },
        { title: "Stock", key: "level", width: 110, render: stockLevelCell },
      ]
    : [
        {
          title: "Item",
          dataIndex: "name",
          key: "name",
          ellipsis: true,
          render: (name: string, r: any) => (
            <div style={{ lineHeight: 1.3 }}>
              <Text strong style={{ fontSize: 13, color: INK }}>
                {name || "Unnamed item"}
              </Text>
              {clean(r.code) && (
                <div>
                  <Muted>{r.code}</Muted>
                </div>
              )}
            </div>
          ),
        },
        showBranch && {
          title: "Branch",
          dataIndex: "shop_name",
          key: "shop_name",
          width: 150,
          ellipsis: true,
          render: (v: string) => (clean(v) ? <Text style={{ fontSize: 12 }}>{v}</Text> : <Dash />),
        },
        { title: "Stock Level", key: "level", width: 200, render: stockLevelCell },
        {
          title: "Shortfall",
          key: "shortfall",
          width: 100,
          align: "right",
          render: (_: any, r: any) => (
            <Text style={{ fontSize: 12 }}>
              {Math.max(0, Number(r.min_viable_quantity || 0) - Number(r.quantity || 0)).toLocaleString()}
            </Text>
          ),
        },
        { title: "Status", key: "status", width: 120, render: stockStatusCell },
      ].filter(Boolean);

  const poIdCell = (_: any, r: any) => (
    <div style={{ lineHeight: 1.3 }}>
      <Text strong style={{ fontSize: 13, color: INK }}>
        {r.po_number || "—"}
      </Text>
      <div>
        <Muted>{r.createdAt ? dayjs(r.createdAt).format("MMM D, YYYY") : ""}</Muted>
      </div>
    </div>
  );
  const poStatusCell = (s: string) => {
    const meta = PO_STATUS[s] || { color: "default", label: s?.replace(/_/g, " ") || "—" };
    return <StatusTag {...meta} />;
  };

  const poColumns: any[] = isMobile
    ? [
        { title: "PO", key: "po", render: poIdCell },
        { title: "Status", dataIndex: "status", key: "status", width: 100, render: poStatusCell },
        { title: "Amount", dataIndex: "total_amount", key: "amount", align: "right", width: 90, render: (v: number) => <Text strong style={{ fontSize: 12 }}>{fmtK(v || 0)}</Text> },
      ]
    : [
        { title: "PO", key: "po", width: 150, render: poIdCell },
        {
          title: "Supplier",
          dataIndex: "supplier_name",
          key: "supplier_name",
          ellipsis: true,
          render: (v: string) => (clean(v) ? <Text style={{ fontSize: 12 }}>{v}</Text> : <Dash />),
        },
        showBranch && {
          title: "Branch",
          dataIndex: "shop_name",
          key: "shop_name",
          width: 140,
          ellipsis: true,
          render: (v: string) => (clean(v) ? <Text style={{ fontSize: 12 }}>{v}</Text> : <Dash />),
        },
        {
          title: "Created By",
          dataIndex: "created_by_name",
          key: "created_by_name",
          width: 130,
          ellipsis: true,
          render: (v: string) => (clean(v) ? <Text style={{ fontSize: 12 }}>{v}</Text> : <Dash />),
        },
        {
          title: "Expected",
          dataIndex: "expected_delivery_date",
          key: "expected",
          width: 120,
          render: (d: string, r: any) => {
            if (!d) return <Dash />;
            const overdue =
              dayjs(d).isBefore(dayjs(), "day") && !["fully_delivered", "cancelled"].includes(r.status);
            return (
              <Text style={{ fontSize: 12, color: overdue ? "#dc2626" : undefined }}>
                {dayjs(d).format("MMM D")}
                {overdue ? " · overdue" : ""}
              </Text>
            );
          },
        },
        { title: "Status", dataIndex: "status", key: "status", width: 130, render: poStatusCell },
        {
          title: "Amount",
          dataIndex: "total_amount",
          key: "amount",
          width: 130,
          align: "right",
          sorter: (a: any, b: any) => Number(a.total_amount || 0) - Number(b.total_amount || 0),
          render: amountCell,
        },
      ].filter(Boolean);

  // ── Shared table chrome ───────────────────────────────────────────────────
  const renderTable = (columns: any[], rows: any[], keyField: (r: any, i?: number) => string, empty: React.ReactNode) => (
    <Table
      columns={columns}
      dataSource={rows}
      size="small"
      rowKey={keyField}
      pagination={rows.length > PAGE_SIZE ? { pageSize: PAGE_SIZE, showSizeChanger: false, size: "small" } : false}
      scroll={{ x: isMobile ? 360 : 860 }}
      locale={{ emptyText: q ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No matches" /> : empty }}
    />
  );

  const toolbar = (placeholder: string, linkLabel: string, to: string) => (
    <Flexbar>
      <Input
        allowClear
        size="small"
        prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: isMobile ? "100%" : 260, flex: isMobile ? 1 : undefined }}
      />
      <Button
        type="link"
        size="small"
        onClick={() => navigate(to)}
        style={{ fontSize: 12, paddingRight: 0 }}
      >
        {linkLabel} <ArrowRightOutlined />
      </Button>
    </Flexbar>
  );

  const tabLabel = (icon: React.ReactNode, full: string, short: string, count: number, color: string) => (
    <Space size={isMobile ? 4 : 6}>
      {icon}
      <span>{isMobile ? short : full}</span>
      {count > 0 && <Badge count={count} overflowCount={99} style={{ backgroundColor: color, fontSize: 10 }} />}
    </Space>
  );

  const tabItems = [
    {
      key: "orders",
      label: tabLabel(<ShoppingCartOutlined />, "Recent Orders", "Orders", totalOrdersCount || orders.length, "#3b82f6"),
      children: (
        <div>
          {orders.length > 0 && (
            <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
              <Col xs={12} sm={6}>
                <StatTile label="Orders in Period" value={(totalOrdersCount || orders.length).toLocaleString()} isMobile={isMobile} />
              </Col>
              <Col xs={12} sm={6}>
                <StatTile label={`Latest ${orders.length} Value`} value={`Ksh ${fmtK(orderSummary.value)}`} color="#10b981" isMobile={isMobile} />
              </Col>
              <Col xs={12} sm={6}>
                <StatTile label="Avg. Order" value={`Ksh ${fmtK(orderSummary.avg)}`} isMobile={isMobile} />
              </Col>
              <Col xs={12} sm={6}>
                <StatTile
                  label="Unpaid (latest)"
                  value={orderSummary.unpaid}
                  color={orderSummary.unpaid > 0 ? "#f59e0b" : INK}
                  isMobile={isMobile}
                />
              </Col>
            </Row>
          )}
          {toolbar("Search order, customer, staff…", `View all orders (${(totalOrdersCount || orders.length).toLocaleString()})`, "/orders")}
          {renderTable(
            orderColumns,
            orderRows,
            (r) => r._id || r.order_no,
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No orders in this period" style={{ padding: "24px 0" }} />
          )}
        </div>
      ),
    },
    {
      key: "stock",
      label: tabLabel(
        <WarningOutlined style={{ color: lowStockItems.length > 0 ? "#ef4444" : undefined }} />,
        "Inventory Watchlist",
        "Inventory",
        lowStockItems.length,
        "#ef4444"
      ),
      children: (
        <div>
          {lowStockItems.length > 0 && (
            <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
              <Col xs={12} sm={6}>
                <StatTile label="Items Below Minimum" value={lowStockItems.length} color="#f59e0b" isMobile={isMobile} />
              </Col>
              <Col xs={12} sm={6}>
                <StatTile label="Out of Stock" value={outOfStock} color={outOfStock > 0 ? "#ef4444" : INK} isMobile={isMobile} />
              </Col>
            </Row>
          )}
          {toolbar("Search item, code, branch…", "Open inventory", "/inventory")}
          {renderTable(
            stockColumns,
            stockRows,
            (r) => r._id,
            <Empty
              image={<CheckCircleOutlined style={{ fontSize: 32, color: "#10b981" }} />}
              description="All items are well stocked"
              style={{ padding: "24px 0" }}
            />
          )}
        </div>
      ),
    },
    {
      key: "pos",
      label: tabLabel(<FileTextOutlined />, "Purchase Orders", "POs", poStats.totalPurchaseOrders, "#8b5cf6"),
      children: (
        <div>
          {poStats.totalPurchaseOrders > 0 && (
            <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
              <Col xs={12} sm={6}>
                <StatTile label="Total PO Value" value={`Ksh ${fmtK(poStats.totalPOValue)}`} color="#10b981" isMobile={isMobile} />
              </Col>
              <Col xs={12} sm={6}>
                <StatTile label="Pending Approval" value={poStats.pendingPOs} color="#f59e0b" isMobile={isMobile} />
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ background: "#f8fafc", padding: isMobile ? "6px 10px" : "8px 12px", borderRadius: 8, border: "1px solid #eef2f7", height: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, color: MUTED }}>Fulfillment Rate</Text>
                    <Text strong style={{ fontSize: 11, color: "#3b82f6" }}>
                      {poStats.deliveredPOs}/{poStats.totalPurchaseOrders} · {deliveryRate}%
                    </Text>
                  </div>
                  <Progress percent={deliveryRate} size="small" strokeColor="#3b82f6" showInfo={false} />
                </div>
              </Col>
            </Row>
          )}
          {toolbar("Search PO, supplier, branch…", `View all purchase orders (${poStats.totalPurchaseOrders})`, "/purchase-orders")}
          {renderTable(
            poColumns,
            poRows,
            (r) => r._id || r.po_number,
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No purchase orders in this period" style={{ padding: "24px 0" }} />
          )}
        </div>
      ),
    },
  ];

  return (
    <ProCard
      bordered
      headerBordered
      size="small"
      style={{
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      title={
        <Space size={8}>
          <div
            style={{
              background: "#eff6ff",
              borderRadius: 8,
              padding: isMobile ? "3px 6px" : "4px 8px",
              color: "#3b82f6",
              display: "inline-flex",
              fontSize: isMobile ? 12 : 14,
            }}
          >
            <ShopOutlined />
          </div>
          <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
            Operations & Fulfillment Hub
          </Text>
        </Space>
      }
      bodyStyle={{ padding: isMobile ? "6px 8px 12px" : "8px 16px 16px" }}
    >
      {loading ? (
        <div style={{ padding: 20 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={(k) => {
            setActiveTab(k);
            setSearch("");
          }}
          items={tabItems}
          size={isMobile ? "small" : "middle"}
        />
      )}
    </ProCard>
  );
};

const Flexbar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      flexWrap: "wrap",
    }}
  >
    {children}
  </div>
);

export default DashboardOperationalHub;
