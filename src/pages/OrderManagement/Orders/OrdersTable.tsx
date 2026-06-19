import { useEffect, useRef, useState, useMemo } from "react";
import {
  ActionType,
  ProColumns,
  ProFormInstance,
  ProTable,
} from "@ant-design/pro-components";
import ExpandedRowContent from "./ExpandableOrderDetails";
import AddOrderModal from "./AddOrderModal";
import { deleteOrderById, getAllOrders, updateOrder, repostOrderPayment } from "@services/orders";
import {
  Button, DatePicker, Drawer, Form, message,
  Modal, Popconfirm, Tooltip, Typography,
} from "antd";
import { CSVLink } from "react-csv";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import { ENTITY_NAME, COOP_NAME } from "@utils/config";
import useSystemDetails from "@hooks/useSystemDetails";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import {
  CalendarOutlined, DeleteOutlined, DollarOutlined,
  DownloadOutlined, FilterOutlined, RedoOutlined, UserOutlined,
  RiseOutlined, ShoppingCartOutlined, CheckCircleOutlined,
  WarningOutlined, CreditCardOutlined, FilePdfOutlined, PrinterFilled,
} from "@ant-design/icons";
import { useAppSelector } from "src/store";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  orange: "#f59e0b",
  purple: "#8b5cf6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

const badge = (bg: string, color: string, border: string): React.CSSProperties => ({
  display: "inline-block", borderRadius: 5, padding: "2px 8px",
  fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
  background: bg, color, border: `1px solid ${border}`,
});

// ── Safe date formatter ────────────────────────────────────────────────────
// Always reads the raw ISO string from the record, never trusts ProTable's
// pre-processed `text` argument which can be mangled by valueType:"dateTime".
const safeFormatDate = (raw: any, format = "DD MMM YYYY HH:mm"): string => {
  if (!raw) return "N/A";
  const d = dayjs(raw);
  return d.isValid() ? d.format(format) : "N/A";
};

const OrderTypeTag: React.FC<{ type: string }> = ({ type }) => {
  const typeStr = typeof type === 'string' ? type : 'Regular';
  const cfg: Record<string, { bg: string; color: string; border: string; icon: string }> = {
    Regular: { bg: "#f0fdf4", color: C.green, border: "#bbf7d0", icon: "🛒" },
    Subscription_Visit: { bg: "#faf5ff", color: C.purple, border: "#e9d5ff", icon: "📋" },
    Subscription_Purchase: { bg: "#eff6ff", color: C.blue, border: "#bfdbfe", icon: "💳" },
  };
  const s = cfg[typeStr] ?? cfg.Regular;
  const displayType = typeStr.replace(/_/g, " ");
  return <span style={badge(s.bg, s.color, s.border)}>{s.icon} {displayType}</span>;
};

const PaymentStatusTag: React.FC<{ payments: any[]; orderType: string; orderAmount: any }> = ({
  payments, orderType, orderAmount,
}) => {
  if (orderType === "Subscription_Visit")
    return <span style={badge("#faf5ff", C.purple, "#e9d5ff")}>Pre-paid</span>;
  if (!payments || payments.length === 0)
    return (
      <Tooltip title="No payment records found. Click repost to fix.">
        <span style={badge("#fef2f2", C.red, "#fecaca")}>Missing</span>
      </Tooltip>
    );
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const amt = Array.isArray(orderAmount)
    ? orderAmount.reduce((s: number, a: any) => s + (Number(a) || 0), 0)
    : Number(orderAmount) || 0;
  const isPaid = totalPaid >= amt;
  return (
    <span style={badge(isPaid ? "#f0fdf4" : "#fffbeb", isPaid ? C.green : C.orange, isPaid ? "#bbf7d0" : "#fde68a")}>
      {isPaid ? "✓ Paid" : "Partial"}
    </span>
  );
};

const TableBadge: React.FC<{ text: string; orderType: string }> = ({ text, orderType }) => {
  if (orderType === "Subscription_Purchase")
    return <span style={badge("#eff6ff", C.blue, "#bfdbfe")}>● Package Purchase</span>;
  const ok = text && text !== "-";
  return (
    <span style={badge(ok ? "#f0fdf4" : "#fef2f2", ok ? C.green : C.red, ok ? "#bbf7d0" : "#fecaca")}>
      {ok ? "● " + text : "No Table"}
    </span>
  );
};

const ClosedByTag: React.FC<{ username: string }> = ({ username }) =>
  username
    ? <span style={badge("#f0fdf4", C.green, "#bbf7d0")}><UserOutlined style={{ marginRight: 3 }} />{username}</span>
    : <span style={badge(C.bg, C.subText, C.border)}>System</span>;

const AmountCell: React.FC<{ record: any }> = ({ record }) => {
  const value = record.order_amount;
  if (value === null || value === undefined) {
    const label = `KES 0.00${record.order_type === "Subscription_Visit" ? " (Pre-paid)" : ""}`;
    return record.order_type === "Subscription_Visit"
      ? <Tooltip title="Pre-paid via subscription"><span style={badge("#faf5ff", C.purple, "#e9d5ff")}>{label}</span></Tooltip>
      : <Text style={{ fontSize: 12 }}>{label}</Text>;
  }
  if (Array.isArray(value)) {
    const total = value.reduce((s: number, a: any) => s + (Number(a) || 0), 0);
    const detail = value.map((v: any) => `KES ${(Number(v) || 0).toFixed(2)}`).join(" + ");
    return (
      <Tooltip title={`Split payment: ${detail}`}>
        <span style={badge("#eff6ff", C.blue, "#bfdbfe")}>KES {total.toFixed(2)} (Split)</span>
      </Tooltip>
    );
  }
  const num = Number(value);
  if (isNaN(num))
    return (
      <Tooltip title={`Value: ${value} (type: ${typeof value})`}>
        <span style={badge("#fef2f2", C.red, "#fecaca")}>Invalid</span>
      </Tooltip>
    );
  if (record.order_type === "Subscription_Visit" && num === 0)
    return (
      <Tooltip title="Pre-paid via subscription">
        <span style={badge("#faf5ff", C.purple, "#e9d5ff")}>KES {num.toFixed(2)} (Pre-paid)</span>
      </Tooltip>
    );
  return <Text strong style={{ fontSize: 13, color: C.darkText }}>KES {num.toFixed(2)}</Text>;
};

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS STRIP
// ═══════════════════════════════════════════════════════════════════════════
interface OrderAnalytics {
  totalRevenue: number; totalOrders: number; paidOrders: number;
  missingPayments: number; avgOrderValue: number; regularOrders: number;
  subscriptionOrders: number; topClosedBy: string;
}

const computeAnalytics = (orders: any[]): OrderAnalytics => {
  if (!orders.length) return {
    totalRevenue: 0, totalOrders: 0, paidOrders: 0, missingPayments: 0,
    avgOrderValue: 0, regularOrders: 0, subscriptionOrders: 0, topClosedBy: "—",
  };

  let revenue = 0, paid = 0, missing = 0, regular = 0, subs = 0;
  const closedByCount: Record<string, number> = {};

  orders.forEach(o => {
    const amt = Array.isArray(o.order_amount)
      ? o.order_amount.reduce((s: number, a: any) => s + (Number(a) || 0), 0)
      : Number(o.order_amount) || 0;
    revenue += amt;

    if (o.order_type === "Regular") {
      regular++;
      if (o.order_payments?.length > 0) paid++; else missing++;
    } else {
      subs++;
      paid++;
    }

    const name = o.updated_by?.username;
    if (name) closedByCount[name] = (closedByCount[name] || 0) + 1;
  });

  const topClosedBy = Object.entries(closedByCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  return {
    totalRevenue: revenue, totalOrders: orders.length, paidOrders: paid,
    missingPayments: missing, avgOrderValue: orders.length > 0 ? revenue / orders.length : 0,
    regularOrders: regular, subscriptionOrders: subs, topClosedBy,
  };
};

const fmtKES = (v: number) => {
  if (v >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `KES ${(v / 1_000).toFixed(1)}K`;
  return `KES ${v.toFixed(0)}`;
};

const AnalyticsStrip: React.FC<{ orders: any[]; loading: boolean; isMobile: boolean }> = ({
  orders, loading, isMobile,
}) => {
  const stats = useMemo(() => {
    return computeAnalytics(orders);
  }, [orders]);

  const cards = [
    { label: "Total Revenue", value: fmtKES(stats.totalRevenue), sub: `${stats.totalOrders} orders`, icon: <RiseOutlined />, iconBg: "#fdf2f4", iconColor: C.primary, accent: C.primary },
    { label: "Avg Order Value", value: fmtKES(stats.avgOrderValue), sub: "per order", icon: <ShoppingCartOutlined />, iconBg: "#eff6ff", iconColor: C.blue, accent: C.blue },
    { label: "All Orders", value: stats.totalOrders.toString(), sub: `${stats.paidOrders} paid`, icon: <CheckCircleOutlined />, iconBg: "#f0fdf4", iconColor: C.green, accent: C.green },
    { label: "Missing Payments", value: stats.missingPayments.toString(), sub: stats.missingPayments > 0 ? "needs attention" : "all clear", icon: <WarningOutlined />, iconBg: stats.missingPayments > 0 ? "#fef2f2" : "#f0fdf4", iconColor: stats.missingPayments > 0 ? C.red : C.green, accent: stats.missingPayments > 0 ? C.red : C.green },
    { label: "Subscriptions", value: stats.subscriptionOrders.toString(), sub: `${stats.regularOrders} regular`, icon: <CreditCardOutlined />, iconBg: "#faf5ff", iconColor: C.purple, accent: C.purple },
    { label: "Top Cashier", value: stats.topClosedBy, sub: "most closed orders", icon: <UserOutlined />, iconBg: "#fff7ed", iconColor: C.orange, accent: C.orange },
  ];

  if (loading && !orders.length) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, 1fr)", gap: 10, marginBottom: 16 }}>
        {cards.map((_, i) => (
          <div key={i} style={{ height: isMobile ? 76 : 84, background: "#f1f5f9", borderRadius: 10, animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, 1fr)", gap: 10, marginBottom: 16 }}>
      {cards.map((card) => (
        <div key={card.label} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: isMobile ? "10px 12px" : "12px 14px", position: "relative", overflow: "hidden", transition: "box-shadow 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: card.accent, borderRadius: "10px 10px 0 0" }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontSize: 10, color: C.subText, fontWeight: 500, letterSpacing: "0.3px", textTransform: "uppercase" }}>{card.label}</Text>
            <div style={{ background: card.iconBg, color: card.iconColor, borderRadius: 6, padding: "3px 5px", fontSize: 12, lineHeight: 1 }}>{card.icon}</div>
          </div>
          <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: C.darkText, lineHeight: 1.2, marginBottom: 2 }}>{card.value}</div>
          <div style={{ fontSize: 10, color: C.subText }}>{card.sub}</div>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE FILTER DRAWER
// ═══════════════════════════════════════════════════════════════════════════
const MobileFilterDrawer: React.FC<{
  open: boolean; onClose: () => void; onSearch: (p: any) => void;
}> = ({ open, onClose, onSearch }) => {
  const [form] = Form.useForm();
  const handleApply = async () => {
    const v = await form.validateFields();
    onSearch(v);
    onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} placement="bottom" height="auto"
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}><FilterOutlined /></div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>Filter Orders</Text>
        </div>
      }
      destroyOnClose
      styles={{ body: { padding: "16px 16px 0" }, footer: { padding: "12px 16px", borderTop: `1px solid ${C.border}` } }}
      footer={
        <div style={{ display: "flex", gap: 8 }}>
          <Button block onClick={() => { form.resetFields(); onSearch({}); onClose(); }} style={{ borderRadius: 8 }}>Reset</Button>
          <Button block type="primary" onClick={handleApply} style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>Apply Filters</Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="dateRange" label="Date Range">
          <RangePicker
            style={{ width: "100%", borderRadius: 8 }}
            presets={[
              { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
              { label: "Yesterday", value: [dayjs().subtract(1, "days").startOf("day"), dayjs().subtract(1, "days").endOf("day")] },
              { label: "This Week", value: [dayjs().startOf("week"), dayjs().endOf("week")] },
              { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
            ]}
          />
        </Form.Item>
        <Form.Item name="order_type" label="Order Type">
          <select style={{ width: "100%", height: 36, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0 11px", fontSize: 13, outline: "none", color: C.darkText }}>
            <option value="">All Types</option>
            <option value="Regular">Regular</option>
            <option value="Subscription_Visit">Subscription Visit</option>
            <option value="Subscription_Purchase">Subscription Purchase</option>
          </select>
        </Form.Item>
        <Form.Item name="order_no" label="Order No.">
          <input placeholder="Enter order number" style={{ width: "100%", height: 36, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0 11px", fontSize: 13, outline: "none", color: C.darkText }} />
        </Form.Item>
        <Form.Item name="name" label="Table Name">
          <input placeholder="Enter table name" style={{ width: "100%", height: 36, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0 11px", fontSize: 13, outline: "none", color: C.darkText }} />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE ORDER CARD
// ═══════════════════════════════════════════════════════════════════════════
const MobileOrderCard: React.FC<{
  record: any; isAdmin: boolean; repostingPaymentId: string | null;
  onEditDate: (r: any) => void; onRepost: (id: string, force: boolean) => void;
  onDelete: (id: string) => void; onExpand: (r: any) => void;
  expanded: boolean; onRefresh: () => void;
}> = ({ record, isAdmin, repostingPaymentId, onEditDate, onRepost, onDelete, onExpand, expanded, onRefresh }) => {
  const hasPayments = record.order_payments?.length > 0;
  const isRegular = record.order_type === "Regular";
  const needsPayment = isRegular && !hasPayments;

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <Text strong style={{ fontSize: 13, color: C.darkText }}>{record.order_no}</Text>
        <OrderTypeTag type={record.order_type} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 11, color: C.subText }}>Table</Text>
          <TableBadge text={record.table_id?.name} orderType={record.order_type} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 11, color: C.subText }}>Closed By</Text>
          <ClosedByTag username={record.updated_by?.username} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 11, color: C.subText }}>Amount</Text>
          <AmountCell record={record} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 11, color: C.subText }}>Payment</Text>
          <PaymentStatusTag payments={record.order_payments} orderType={record.order_type} orderAmount={record.order_amount} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 11, color: C.subText }}>Time</Text>
          {/* FIX: Read record.createdAt directly — safe, always an ISO string */}
          <Text style={{ fontSize: 11, color: C.subText }}>
            {safeFormatDate(record.createdAt, "DD MMM YYYY HH:mm")}
          </Text>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
        <Button size="small" onClick={() => onExpand(record)} style={{ flex: "1 1 auto", borderRadius: 6, fontSize: 11 }}>
          {expanded ? "Hide Details" : "View Details"}
        </Button>
        <Tooltip title="Edit order date/time">
          <Button size="small" icon={<CalendarOutlined />} onClick={() => onEditDate(record)} style={{ borderRadius: 6 }} />
        </Tooltip>
        {isRegular && (
          <Tooltip title={needsPayment ? "Create missing payment records" : "Recreate payment records"}>
            <Popconfirm
              title={needsPayment ? "Create payment records?" : "Recreate payment records?"}
              description={needsPayment ? "This will create payment records for this order." : "This will delete existing payments and recreate them."}
              onConfirm={() => onRepost(record._id, hasPayments)}
              okText="Yes" cancelText="No"
              okButtonProps={{ danger: hasPayments, loading: repostingPaymentId === record._id }}
            >
              <Button size="small" type={needsPayment ? "primary" : "default"} danger={hasPayments && !needsPayment}
                icon={needsPayment ? <DollarOutlined /> : <RedoOutlined />}
                loading={repostingPaymentId === record._id}
                style={needsPayment ? { background: C.primary, borderColor: C.primary, borderRadius: 6 } : { borderRadius: 6 }}>
                {needsPayment ? "Fix" : "Repost"}
              </Button>
            </Popconfirm>
          </Tooltip>
        )}
        {isAdmin && (
          <Popconfirm title="Delete this order?" description="This will permanently delete the order and all related records."
            onConfirm={() => onDelete(record._id)} okText="Yes" cancelText="No" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
          </Popconfirm>
        )}
      </div>
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <ExpandedRowContent record={record} onRefresh={onRefresh} />
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const OrdersTable = () => {
  const isMobile = useIsMobile();
  const [exportOrderData, setExportOrderData] = useState<any[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [repostingPaymentId, setRepostingPaymentId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mobileData, setMobileData] = useState<any[]>([]);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobilePage, setMobilePage] = useState(1);
  const [mobileTotal, setMobileTotal] = useState(0);
  const [mobileFilters, setMobileFilters] = useState<any>({});
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [addOrderModalOpen, setAddOrderModalOpen] = useState(false);

  const actionRef = useRef<ActionType>();
  const formRef = useRef<ProFormInstance>();
  const [dateForm] = Form.useForm();
  const printRef = useRef<HTMLDivElement>(null);

  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";
  const { systemDetails } = useSystemDetails();
  const primaryColor = usePrimaryColor();
  
  // Get tenant data from localStorage like login page
  const [tenant, setTenant] = useState<any>(null);
  
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    if (storedTenant) {
      try {
        const parsedTenant = JSON.parse(storedTenant);
        setTenant(parsedTenant);
      } catch (error) {
        console.error("Error parsing tenant:", error);
      }
    }
  }, []);
  
  const brandName = tenant?.name || systemDetails?.brand_name || COOP_NAME;

  const [queryParams, setQueryParams] = useState({
    page: 1, limit: 10,
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: dayjs().format('YYYY-MM-DD'),
  });

  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [selectedOrderType, setSelectedOrderType] = useState<string>("");

  const filteredAnalyticsData = useMemo(() => {
    if (!selectedOrderType) return analyticsData;
    return analyticsData.filter((order: any) => order.order_type === selectedOrderType);
  }, [analyticsData, selectedOrderType]);

  const filteredMobileData = useMemo(() => {
    if (!selectedOrderType) return mobileData;
    return mobileData.filter((order: any) => order.order_type === selectedOrderType);
  }, [mobileData, selectedOrderType]);

  const loadMobileData = async (page: number, filters: any = {}) => {
    setMobileLoading(true);
    setAnalyticsLoading(true);
    try {
      const { dateRange, order_type, ...rest } = filters;
      const startDate = dateRange?.[0] ? dayjs(dateRange[0]).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
      const endDate = dateRange?.[1] ? dayjs(dateRange[1]).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
      const apiParams: any = {
        ...rest, page, limit: 15,
        start_date: startDate,
        end_date: endDate,
      };
      const response = await getAllOrders(apiParams);
      setMobileData(page === 1 ? (response || []) : (prev: any[]) => [...prev, ...(response || [])]);
      setMobileTotal(response.pagination?.total || 0);
      setAnalyticsData(response || []);
      setSelectedOrderType(order_type || "");
    } finally {
      setMobileLoading(false);
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => { if (isMobile) loadMobileData(1, mobileFilters); }, [isMobile]);

  const handleMobileFilter = (filters: any) => {
    setMobileFilters(filters); setMobilePage(1); loadMobileData(1, filters);
  };

  const refreshMobile = () => loadMobileData(1, mobileFilters);

  const handleEditOrderDate = (record: any) => {
    setEditingOrderId(record._id);
    setDateModalVisible(true);
    dateForm.setFieldsValue({ createdAt: dayjs(record.createdAt) });
  };

  const handleSaveOrderDate = async () => {
    try {
      const values = await dateForm.validateFields();
      setLoading(true);
      const response = await updateOrder(editingOrderId!, { createdAt: values.createdAt.toISOString() });
      if (response?.timestamp_update) {
        const { order_items_updated, order_payments_updated } = response.timestamp_update;
        message.success(`Order timestamp updated! ${order_items_updated} item(s) and ${order_payments_updated} payment(s) updated.`, 5);
      }
      setDateModalVisible(false); setEditingOrderId(null); dateForm.resetFields();
      actionRef.current?.reload();
      if (isMobile) refreshMobile();
    } catch { } finally { setLoading(false); }
  };

  const handleCancelEdit = () => { setDateModalVisible(false); setEditingOrderId(null); dateForm.resetFields(); };

  const handleRepostOrderPayment = async (orderId: string, forceRecreate = false) => {
    try {
      setRepostingPaymentId(orderId);
      const response = await repostOrderPayment(orderId, { force_recreate: forceRecreate });
      actionRef.current?.reload();
      if (isMobile) refreshMobile();
      return response;
    } finally { setRepostingPaymentId(null); }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    const success = await deleteOrderById(id);
    if (success) { actionRef.current?.reload(); if (isMobile) refreshMobile(); }
  };

  const csvData = (exportOrderData || []).map((order: any) => {
    const orderAmount = Array.isArray(order?.order_amount)
      ? order.order_amount.reduce((s: number, a: any) => s + (Number(a) || 0), 0)
      : Number(order?.order_amount) || 0;
    return {
      "Order No": order?.order_no || "",
      Table: order?.table_id?.name || (order.subscription_id ? "Subscription_Purchase" : "Deleted"),
      "Closed By": order?.updated_by?.username || "N/A",
      "Payment Method": order?.order_payments?.[0]?.name || "N/A",
      Amount: `KES ${orderAmount.toFixed(2)}`,
      // FIX: use safeFormatDate instead of dayjs(order.createdAt).format(...)
      "Time Closed": safeFormatDate(order?.createdAt, "MMM DD, YYYY h:mm A"),
      "Order Type": order?.order_type || "Regular",
      "Payment Status": order?.order_payments?.length > 0 ? "Paid" : "Missing Payment",
    };
  });

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const handleExportPDF = () => {
    setPrintModalOpen(true);
  };

  // ── Print component ─────────────────────────────────────────────────────
  const OrdersPrintComponent = () => {
    const startDate = queryParams.start_date;
    const endDate = queryParams.end_date;
    const totalRevenue = analyticsData.reduce((s: number, o: any) => {
      const amt = Array.isArray(o.order_amount)
        ? o.order_amount.reduce((s: number, a: any) => s + (Number(a) || 0), 0)
        : Number(o.order_amount) || 0;
      return s + amt;
    }, 0);

    // Lighten the primary color for backgrounds
    const lightenColor = (color: string, percent: number) => {
      const num = parseInt(color.replace("#", ""), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    };

    const primaryLight = lightenColor(primaryColor, 90);

    return (
      <div ref={printRef} style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
        <style>{`
          @media print {
            @page { size: A4; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; }
          }
        `}</style>
        
        {/* Header with Logo */}
        <div style={{ textAlign: "center", marginBottom: "20px", paddingBottom: "15px", borderBottom: `2px solid ${primaryColor}` }}>
          {tenant?.tenant_logo?.url ? (
            <img 
              src={tenant.tenant_logo.url} 
              alt="tenant-logo"
              style={{ maxWidth: "150px", maxHeight: "80px", marginBottom: "10px", objectFit: "contain" }}
            />
          ) : (
            <img
              src="/relia.png"
              alt="relia-logo"
              style={{ maxWidth: "150px", maxHeight: "80px", marginBottom: "10px" }}
            />
          )}
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#333" }}>{brandName}</div>
          <div style={{ fontSize: "14px", fontWeight: "bold", color: primaryColor, marginTop: "5px" }}>ORDERS REPORT</div>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            {dayjs(startDate).format("MMM DD, YYYY")} - {dayjs(endDate).format("MMM DD, YYYY")}
          </div>
          {tenant?.location && (
            <div style={{ fontSize: "11px", color: "#999", marginTop: "3px" }}>{tenant.location}</div>
          )}
        </div>

        {/* Summary */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", padding: "15px", background: primaryLight, borderRadius: "8px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#666" }}>Total Orders</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: primaryColor }}>{analyticsData.length}</div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#666" }}>Total Revenue</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#10b981" }}>
              KES {totalRevenue.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
          <thead>
            <tr style={{ background: primaryColor, color: "white" }}>
              <th style={{ padding: "8px", textAlign: "left", border: "1px solid #ddd" }}>Order Number</th>
              <th style={{ padding: "8px", textAlign: "left", border: "1px solid #ddd" }}>Date</th>
              <th style={{ padding: "8px", textAlign: "left", border: "1px solid #ddd" }}>Served By</th>
              <th style={{ padding: "8px", textAlign: "left", border: "1px solid #ddd" }}>Customer Name</th>
              <th style={{ padding: "8px", textAlign: "left", border: "1px solid #ddd" }}>Payment Method</th>
              <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {analyticsData.map((order: any, index: number) => {
              const servedBy = Array.isArray(order.served_by)
                ? order.served_by.map((u: any) => typeof u === "string" ? u : u?.username).filter(Boolean).join(", ")
                : order.served_by?.username || "—";
              const paymentMethod = order.order_payments?.[0]?.name || "—";
              const paymentStatus = order.order_payments?.[0]?.payment_status || "—";
              const totalPayments = order.order_payments?.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0) || 0;
              return (
                <tr key={order._id} style={{ background: index % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                  <td style={{ padding: "6px", border: "1px solid #ddd" }}>{order.order_no}</td>
                  <td style={{ padding: "6px", border: "1px solid #ddd" }}>{dayjs(order.createdAt).format("DD/MM/YYYY, HH:mm:ss")}</td>
                  <td style={{ padding: "6px", border: "1px solid #ddd" }}>{servedBy}</td>
                  <td style={{ padding: "6px", border: "1px solid #ddd" }}>{order.customer_name || "—"}</td>
                  <td style={{ padding: "6px", border: "1px solid #ddd" }}>
                    {paymentMethod} — KES {totalPayments.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {paymentStatus && <span style={{ marginLeft: 4, color: "#10b981" }}>{paymentStatus}</span>}
                  </td>
                  <td style={{ padding: "6px", border: "1px solid #ddd", textAlign: "right" }}>
                    KES {totalPayments.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ marginTop: "30px", paddingTop: "15px", borderTop: "1px solid #ddd", textAlign: "center", fontSize: "10px", color: "#999" }}>
          <div>Generated on {dayjs().format("DD MMM YYYY HH:mm")}</div>
          <div>{brandName}</div>
        </div>
      </div>
    );
  };

  // ── Desktop columns ────────────────────────────────────────────────────
  const desktopColumns: ProColumns[] = [
    {
      title: "Order No.", dataIndex: "order_no",
      hideInSearch: false, copyable: true,
      fieldProps: { placeholder: "Enter Order number" },
    },
    {
      title: "Order Type", dataIndex: "order_type", key: "order_type", hideInSearch: false,
      valueType: "select",
      valueEnum: {
        Regular: { text: "Regular" },
        Subscription_Visit: { text: "Subscription Visit" },
        Subscription_Purchase: { text: "Subscription Purchase" },
      },
      render: (_: any, record: any) => <OrderTypeTag type={record.order_type} />,
    },
    {
      title: "Table", dataIndex: ["table_id", "name"], key: "name",
      hideInSearch: false, fieldProps: { placeholder: "Enter table name" },
      render: (text: string, record: any) => <TableBadge text={text} orderType={record.order_type} />,
    },
    {
      title: "Served By", dataIndex: "served_by", key: "served-by", hideInSearch: true,
      render: (_: any, record: any) => {
        const servedBy = Array.isArray(record.served_by)
          ? record.served_by.map((u: any) => typeof u === "string" ? u : u?.username).filter(Boolean).join(", ")
          : record.served_by?.username || "—";
        return <Text style={{ fontSize: 12 }}>{servedBy}</Text>;
      },
    },
    {
      title: "Amount", dataIndex: "order_amount", key: "order-amount", hideInSearch: true, ellipsis: true,
      render: (_: any, record: any) => <AmountCell record={record} />,
    },
    {
      title: "Payment Status", dataIndex: "order_payments", key: "payment_status", hideInSearch: true,
      render: (payments: any[], record: any) => (
        <PaymentStatusTag payments={payments} orderType={record.order_type} orderAmount={record.order_amount} />
      ),
    },
    {
      title: "Time Closed",
      dataIndex: "createdAt",
      hideInSearch: true,
      // ── FIX ────────────────────────────────────────────────────────────
      // Do NOT use valueType: "dateTime" here.
      // When valueType is set, ProTable pre-processes the raw value through its
      // own date rendering pipeline before passing it to render(text, record).
      // The `text` argument then arrives as a locale-formatted string like
      // "2026/03/17 16:30:10" or even an invalid value, which dayjs() can't
      // reliably re-parse. Always read record.createdAt directly instead.
      render: (_: any, record: any) => (
        <Text style={{ fontSize: 12, color: C.subText }}>
          {safeFormatDate(record.createdAt, "DD MMM YYYY HH:mm")}
        </Text>
      ),
      sorter: (a: any, b: any) =>
        new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime(),
    },
    {
      title: "Actions", search: false, key: "action", width: 220, fixed: "right",
      render: (_text: any, record: any) => {
        const hasPayments = record.order_payments?.length > 0;
        const isRegular = record.order_type === "Regular";
        const needsPayment = isRegular && !hasPayments;
        return (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            <Tooltip title="Edit order date/time">
              <Button type="link" size="small" icon={<CalendarOutlined />}
                onClick={() => handleEditOrderDate(record)}
                style={{ padding: "0 4px", color: C.subText }}>
                Date
              </Button>
            </Tooltip>

            {isRegular && (
              <Tooltip title={needsPayment ? "Create missing payment records" : "Recreate payment records"}>
                <Popconfirm
                  title={needsPayment ? "Create payment records?" : "Recreate payment records?"}
                  description={needsPayment ? "This will create payment records for this order." : "This will delete existing payments and recreate them."}
                  onConfirm={() => handleRepostOrderPayment(record._id, hasPayments)}
                  okText="Yes" cancelText="No"
                  okButtonProps={{ danger: hasPayments, loading: repostingPaymentId === record._id }}
                >
                  <Button type={needsPayment ? "primary" : "link"} size="small"
                    danger={hasPayments && !needsPayment}
                    icon={needsPayment ? <DollarOutlined /> : <RedoOutlined />}
                    loading={repostingPaymentId === record._id}
                    style={needsPayment ? { background: C.primary, borderColor: C.primary, borderRadius: 6 } : { padding: "0 4px" }}>
                    {needsPayment ? "Fix" : "Repost"}
                  </Button>
                </Popconfirm>
              </Tooltip>
            )}

            <Tooltip title={isAdmin ? "Delete order" : "Admin only"}>
              <Popconfirm
                title="Delete this order?"
                description="This will permanently delete the order and all related records."
                onConfirm={() => handleDelete(record._id)}
                okText="Yes" cancelText="No" okButtonProps={{ danger: true }}
                disabled={!isAdmin}
              >
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  disabled={!isAdmin}
                  style={{ padding: "0 4px", cursor: isAdmin ? "pointer" : "not-allowed", opacity: isAdmin ? 1 : 0.5 }}>
                  Delete
                </Button>
              </Popconfirm>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  const EditDateModal = (
    <Modal
      open={dateModalVisible} onOk={handleSaveOrderDate} onCancel={handleCancelEdit}
      confirmLoading={loading} okText="Save" cancelText="Cancel"
      width="min(480px, 96vw)" style={{ top: 20 }}
      styles={{ body: { padding: "20px 24px" } }}
      okButtonProps={{ style: { background: C.primary, borderColor: C.primary, borderRadius: 8 } }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}><CalendarOutlined /></div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>Edit Order Date & Time</Text>
        </div>
      }
    >
      <Form form={dateForm} layout="vertical">
        <Form.Item name="createdAt" label="Order Date & Time"
          rules={[{ required: true, message: "Please select order date and time" }]}
          extra={<Text style={{ fontSize: 11, color: C.subText }}>This will update the order timestamp and propagate to all order items and payments.</Text>}
        >
          <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: "100%", borderRadius: 8 }} placeholder="Select date and time" />
        </Form.Item>
      </Form>
    </Modal>
  );

  // ── Mobile render ──────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <AnalyticsStrip orders={filteredAnalyticsData} loading={analyticsLoading} isMobile={true} />
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "12px 14px", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <Text strong style={{ fontSize: 14, color: C.darkText, lineHeight: 1.3 }}>Orders</Text>
              <Text style={{ fontSize: 11, color: C.subText, lineHeight: 1.3 }}>
                {mobileLoading && mobilePage === 1 ? "Loading…" : `${mobileTotal} order${mobileTotal !== 1 ? "s" : ""} found`}
              </Text>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              <Button size="small" icon={<FilterOutlined />} onClick={() => setFilterOpen(true)} style={{ borderRadius: 8, borderColor: C.border, height: 30, fontSize: 12 }}>Filter</Button>
              <CSVLink data={csvData} filename={`${ENTITY_NAME}_Orders_${dayjs().format("YYYY-MM-DD")}.csv`}>
                <Button size="small" icon={<DownloadOutlined />} type="primary" style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 30, fontSize: 12 }}>
                  CSV
                </Button>
              </CSVLink>
            </div>
          </div>
        </div>

        {mobileLoading && mobilePage === 1 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.subText }}>Loading…</div>
        ) : filteredMobileData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 16px", background: "#fff", borderRadius: 10, border: `1px solid ${C.border}` }}>
            <Text style={{ color: C.subText, fontSize: 13 }}>No orders found.</Text><br />
            <Button size="small" icon={<FilterOutlined />} onClick={() => setFilterOpen(true)} style={{ marginTop: 12, borderRadius: 8 }}>Adjust Filters</Button>
          </div>
        ) : (
          <>
            {filteredMobileData.map((record) => (
              <MobileOrderCard key={record._id} record={record} isAdmin={isAdmin}
                repostingPaymentId={repostingPaymentId}
                onEditDate={handleEditOrderDate} onRepost={handleRepostOrderPayment}
                onDelete={handleDelete} expanded={expandedId === record._id}
                onExpand={(r) => setExpandedId(expandedId === r._id ? null : r._id)}
                onRefresh={refreshMobile}
              />
            ))}
            {mobileData.length < mobileTotal && (
              <Button block loading={mobileLoading}
                onClick={() => { const n = mobilePage + 1; setMobilePage(n); loadMobileData(n, mobileFilters); }}
                style={{ borderRadius: 8, marginBottom: 16 }}>
                Load More ({mobileData.length} / {mobileTotal})
              </Button>
            )}
          </>
        )}
        <MobileFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onSearch={handleMobileFilter} />
        {EditDateModal}
      </>
    );
  }

  // ── Desktop render ─────────────────────────────────────────────────────
  return (
    <>
      <AnalyticsStrip orders={filteredAnalyticsData} loading={analyticsLoading} isMobile={false} />
      <ProTable
        rowKey="_id"
        cardBordered
        formRef={formRef}
        form={{
          onFinish: async (values) => {
            const { dateRange, ...rest } = values;
            const startDate = dateRange?.[0] ? dayjs(dateRange[0]).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
            const endDate = dateRange?.[1] ? dayjs(dateRange[1]).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
            setQueryParams({ ...rest, page: 1, limit: queryParams.limit, start_date: startDate, end_date: endDate });
            return true;
          },
          initialValues: { dateRange: [dayjs(), dayjs()] },
        }}
        search={{
          labelWidth: "auto", defaultCollapsed: false,
          searchText: "Search", resetText: "Reset",
          optionRender: (_, __, dom) => [...dom],
        }}
        toolbar={{
          title: "Orders", tooltip: "Order Management",
          actions: [
            <Button key="add" type="primary" icon={<ShoppingCartOutlined />} onClick={() => setAddOrderModalOpen(true)} style={{ background: primaryColor, borderColor: primaryColor, borderRadius: 8 }}>
              Add Order
            </Button>,
            <Button key="pdf" icon={<FilePdfOutlined />} onClick={handleExportPDF} style={{ borderRadius: 8 }}>
              Export PDF
            </Button>,
            <CSVLink key="csv" data={csvData}
              filename={`${ENTITY_NAME}_Orders_${dayjs().format("YYYY-MM-DD")}.csv`}>
              <Button type="primary" icon={<DownloadOutlined />} style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
                Export CSV
              </Button>
            </CSVLink>,
          ],
        }}
        columns={[
          {
            title: "Date Range", dataIndex: "dateRange",
            valueType: "dateRange", hideInTable: true,
            fieldProps: {
              ranges: {
                Today: [dayjs().startOf("day"), dayjs().endOf("day")],
                Yesterday: [dayjs().subtract(1, "days").startOf("day"), dayjs().subtract(1, "days").endOf("day")],
                "This Week": [dayjs().startOf("week"), dayjs().endOf("week")],
                "Last Week": [dayjs().subtract(1, "week").startOf("week"), dayjs().subtract(1, "week").endOf("week")],
                "This Month": [dayjs().startOf("month"), dayjs().endOf("month")],
              },
            },
          },
          ...desktopColumns,
        ]}
        request={async (params) => {
          const { current, pageSize, dateRange, _timestamp, order_type, ...rest } = params;
          const startDate = dateRange?.[0] ? dayjs(dateRange[0]).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
          const endDate = dateRange?.[1] ? dayjs(dateRange[1]).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
          setAnalyticsLoading(true);
          setSelectedOrderType(order_type || "");
          try {
            const apiParams: any = {
              ...rest, page: current, limit: pageSize,
              start_date: startDate,
              end_date: endDate,
            };
            const response = await getAllOrders(apiParams);
            setExportOrderData(response);
            setAnalyticsData(response || []);
            setAnalyticsLoading(false);
            // Filter data locally since backend doesn't support order_type
            const filteredData = order_type ? (response || []).filter((order: any) => order.order_type === order_type) : response;
            return { data: filteredData, success: true, total: filteredData.length };
          } catch {
            setAnalyticsLoading(false);
            return { data: [], success: false, total: 0 };
          }
        }}
        pagination={{
          pageSize: queryParams.limit, current: queryParams.page,
          showQuickJumper: true, showSizeChanger: true,
          onChange: (page, pageSize) => setQueryParams((prev) => ({ ...prev, page, limit: pageSize })),
        }}
        expandable={{
          expandedRowRender: (record) => (
            <ExpandedRowContent record={record} onRefresh={() => actionRef.current?.reload()} />
          ),
          defaultExpandAllRows: false,
          expandIconColumnIndex: 1,
        }}
        actionRef={actionRef}
        scroll={{ x: 1200 }}
      />
      {EditDateModal}

      {/* Add Order Modal */}
      <AddOrderModal
        open={addOrderModalOpen}
        onClose={() => setAddOrderModalOpen(false)}
        onSuccess={() => actionRef.current?.reload()}
      />

      {/* PDF Export Modal */}
      <Modal
        open={printModalOpen}
        onCancel={() => setPrintModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setPrintModalOpen(false)}>Close</Button>,
          <Button key="print" type="primary" icon={<PrinterFilled />} onClick={handlePrint} style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
            Print / Save as PDF
          </Button>,
        ]}
        width={800}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FilePdfOutlined style={{ color: C.primary }} />
            <span>Export Orders as PDF</span>
          </div>
        }
        styles={{ body: { padding: "20px", maxHeight: "70vh", overflow: "auto" } }}
      >
        <OrdersPrintComponent />
      </Modal>
    </>
  );
};

export default OrdersTable;