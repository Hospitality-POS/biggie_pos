import { useEffect, useRef, useState } from "react";
import {
  ActionType,
  ProColumns,
  ProFormInstance,
  ProTable,
} from "@ant-design/pro-components";
import ExpandedRowContent from "./ExpandableOrderDetails";
import { deleteOrderById, getAllOrders, updateOrder, repostOrderPayment } from "@services/orders";
import {
  Button, DatePicker, Drawer, Form, message,
  Modal, Popconfirm, Tooltip, Typography,
} from "antd";
import { CSVLink } from "react-csv";
import dayjs from "dayjs";
import { ENTITY_NAME } from "@utils/config";
import {
  CalendarOutlined, DeleteOutlined, DollarOutlined,
  DownloadOutlined, FilterOutlined, RedoOutlined, UserOutlined,
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

const OrderTypeTag: React.FC<{ type: string }> = ({ type }) => {
  const cfg: Record<string, { bg: string; color: string; border: string; icon: string }> = {
    Regular: { bg: "#f0fdf4", color: C.green, border: "#bbf7d0", icon: "🛒" },
    Subscription_Visit: { bg: "#faf5ff", color: C.purple, border: "#e9d5ff", icon: "📋" },
    Subscription_Purchase: { bg: "#eff6ff", color: C.blue, border: "#bfdbfe", icon: "💳" },
  };
  const s = cfg[type] ?? cfg.Regular;
  return <span style={badge(s.bg, s.color, s.border)}>{s.icon} {type?.replace(/_/g, " ")}</span>;
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
    <Drawer
      open={open} onClose={onClose} placement="bottom" height="auto"
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
            <FilterOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>Filter Orders</Text>
        </div>
      }
      destroyOnClose
      styles={{
        body: { padding: "16px 16px 0" },
        footer: { padding: "12px 16px", borderTop: `1px solid ${C.border}` },
      }}
      footer={
        <div style={{ display: "flex", gap: 8 }}>
          <Button block onClick={() => { form.resetFields(); onSearch({}); onClose(); }} style={{ borderRadius: 8 }}>Reset</Button>
          <Button block type="primary" onClick={handleApply} style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
            Apply Filters
          </Button>
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
        <Form.Item name="order_no" label="Order No.">
          <input placeholder="Enter order number" style={{
            width: "100%", height: 36, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "0 11px", fontSize: 13, outline: "none", color: C.darkText,
          }} />
        </Form.Item>
        <Form.Item name="name" label="Table Name">
          <input placeholder="Enter table name" style={{
            width: "100%", height: 36, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "0 11px", fontSize: 13, outline: "none", color: C.darkText,
          }} />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

const MobileOrderCard: React.FC<{
  record: any;
  isAdmin: boolean;
  repostingPaymentId: string | null;
  onEditDate: (r: any) => void;
  onRepost: (id: string, force: boolean) => void;
  onDelete: (id: string) => void;
  onExpand: (r: any) => void;
  expanded: boolean;
  onRefresh: () => void;
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
          <Text style={{ fontSize: 11, color: C.subText }}>
            {record.createdAt ? dayjs(record.createdAt).format("DD MMM YYYY HH:mm") : "N/A"}
          </Text>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
        <Button size="small" onClick={() => onExpand(record)}
          style={{ flex: "1 1 auto", borderRadius: 6, fontSize: 11 }}>
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
              <Button
                size="small"
                type={needsPayment ? "primary" : "default"}
                danger={hasPayments && !needsPayment}
                icon={needsPayment ? <DollarOutlined /> : <RedoOutlined />}
                loading={repostingPaymentId === record._id}
                style={needsPayment ? { background: C.primary, borderColor: C.primary, borderRadius: 6 } : { borderRadius: 6 }}
              >
                {needsPayment ? "Fix" : "Repost"}
              </Button>
            </Popconfirm>
          </Tooltip>
        )}

        {isAdmin && (
          <Popconfirm
            title="Delete this order?"
            description="This will permanently delete the order and all related records."
            onConfirm={() => onDelete(record._id)}
            okText="Yes" cancelText="No" okButtonProps={{ danger: true }}
          >
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

const OrdersTable = () => {
  const isMobile = useIsMobile();

  const [exportOrderData, setExportOrderData] = useState([]);
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

  const actionRef = useRef<ActionType>();
  const formRef = useRef<ProFormInstance>();
  const [dateForm] = Form.useForm();

  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  const [queryParams, setQueryParams] = useState({
    page: 1, limit: 10,
    start_date: dayjs().startOf("day").toISOString(),
    end_date: dayjs().endOf("day").toISOString(),
  });

  const loadMobileData = async (page: number, filters: any = {}) => {
    setMobileLoading(true);
    try {
      const { dateRange, ...rest } = filters;
      const response = await getAllOrders({
        ...rest, page, limit: 15,
        start_date: dateRange?.[0] ? dayjs(dateRange[0]).startOf("day").toISOString() : dayjs().startOf("day").toISOString(),
        end_date: dateRange?.[1] ? dayjs(dateRange[1]).endOf("day").toISOString() : dayjs().endOf("day").toISOString(),
      });
      setMobileData(page === 1 ? (response || []) : (prev) => [...prev, ...(response || [])]);
      setMobileTotal(response.pagination?.total || 0);
    } finally {
      setMobileLoading(false);
    }
  };

  useEffect(() => {
    if (isMobile) loadMobileData(1, mobileFilters);
  }, [isMobile]);

  const handleMobileFilter = (filters: any) => {
    setMobileFilters(filters);
    setMobilePage(1);
    loadMobileData(1, filters);
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
        message.success(
          `Order timestamp updated! ${order_items_updated} item(s) and ${order_payments_updated} payment(s) updated.`, 5,
        );
      }
      setDateModalVisible(false);
      setEditingOrderId(null);
      dateForm.resetFields();
      actionRef.current?.reload();
      if (isMobile) refreshMobile();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setDateModalVisible(false);
    setEditingOrderId(null);
    dateForm.resetFields();
  };

  const handleRepostOrderPayment = async (orderId: string, forceRecreate = false) => {
    try {
      setRepostingPaymentId(orderId);
      const response = await repostOrderPayment(orderId, { force_recreate: forceRecreate });
      actionRef.current?.reload();
      if (isMobile) refreshMobile();
      return response;
    } finally {
      setRepostingPaymentId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    const success = await deleteOrderById(id);
    if (success) {
      actionRef.current?.reload();
      if (isMobile) refreshMobile();
    }
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
      "Time Closed": order?.createdAt ? dayjs(order.createdAt).format("MMM DD, YYYY h:mm A") : "N/A",
      "Order Type": order?.order_type || "Regular",
      "Payment Status": order?.order_payments?.length > 0 ? "Paid" : "Missing Payment",
    };
  });

  const desktopColumns: ProColumns[] = [
    {
      title: "Order No.", dataIndex: "order_no",
      hideInSearch: false, copyable: true,
      fieldProps: { placeholder: "Enter Order number" },
    },
    {
      title: "Order Type", dataIndex: "order_type", key: "order_type", hideInSearch: true,
      render: (text: string) => <OrderTypeTag type={text} />,
    },
    {
      title: "Table", dataIndex: ["table_id", "name"], key: "name",
      hideInSearch: false, fieldProps: { placeholder: "Enter table name" },
      render: (text: string, record: any) => <TableBadge text={text} orderType={record.order_type} />,
    },
    {
      title: "Closed By", dataIndex: ["updated_by", "username"], key: "closed-by", hideInSearch: true,
      render: (text: string) => <ClosedByTag username={text} />,
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
      title: "Time Closed", dataIndex: "createdAt", hideInSearch: true, valueType: "dateTime",
      render: (text: string) => (
        <Text style={{ fontSize: 12, color: C.subText }}>
          {text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "N/A"}
        </Text>
      ),
      sorter: (a, b) => new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime(),
    },
    {
      title: "Actions", search: false, key: "action", width: 220, fixed: "right",
      render: (_text, record) => {
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
                  <Button
                    type={needsPayment ? "primary" : "link"} size="small"
                    danger={hasPayments && !needsPayment}
                    icon={needsPayment ? <DollarOutlined /> : <RedoOutlined />}
                    loading={repostingPaymentId === record._id}
                    style={needsPayment
                      ? { background: C.primary, borderColor: C.primary, borderRadius: 6 }
                      : { padding: "0 4px" }}
                  >
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
      open={dateModalVisible}
      onOk={handleSaveOrderDate}
      onCancel={handleCancelEdit}
      confirmLoading={loading}
      okText="Save" cancelText="Cancel"
      width="min(480px, 96vw)"
      style={{ top: 20 }}
      styles={{ body: { padding: "20px 24px" } }}
      okButtonProps={{ style: { background: C.primary, borderColor: C.primary, borderRadius: 8 } }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
            <CalendarOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>Edit Order Date & Time</Text>
        </div>
      }
    >
      <Form form={dateForm} layout="vertical">
        <Form.Item
          name="createdAt" label="Order Date & Time"
          rules={[{ required: true, message: "Please select order date and time" }]}
          extra={
            <Text style={{ fontSize: 11, color: C.subText }}>
              This will update the order timestamp and propagate to all order items and payments.
            </Text>
          }
        >
          <DatePicker showTime format="YYYY-MM-DD HH:mm:ss"
            style={{ width: "100%", borderRadius: 8 }} placeholder="Select date and time" />
        </Form.Item>
      </Form>
    </Modal>
  );

  // ── Mobile render ──────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Mobile header */}
        <div style={{
          background: "#fff", border: `1px solid ${C.border}`,
          borderRadius: 12, marginBottom: 12, overflow: "hidden",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8,
            padding: "12px 14px", background: C.bg, borderBottom: `1px solid ${C.border}`,
          }}>
            {/* Left: title + count stacked */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <Text strong style={{ fontSize: 14, color: C.darkText, lineHeight: 1.3 }}>Orders</Text>
              <Text style={{ fontSize: 11, color: C.subText, lineHeight: 1.3 }}>
                {mobileLoading && mobilePage === 1
                  ? "Loading…"
                  : `${mobileTotal} order${mobileTotal !== 1 ? "s" : ""} found`}
              </Text>
            </div>

            {/* Right: Filter + CSV — flex row, never wrap */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              <Button
                size="small" icon={<FilterOutlined />}
                onClick={() => setFilterOpen(true)}
                style={{ borderRadius: 8, borderColor: C.border, height: 30, fontSize: 12 }}
              >
                Filter
              </Button>
              <CSVLink
                data={csvData}
                filename={`${ENTITY_NAME}_Orders_${dayjs().format("YYYY-MM-DD")}.csv`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  height: 30, padding: "0 10px", borderRadius: 8, fontSize: 12,
                  background: C.primary, color: "#fff", textDecoration: "none",
                  fontWeight: 500, whiteSpace: "nowrap",
                }}
              >
                <DownloadOutlined style={{ fontSize: 12 }} /> CSV
              </CSVLink>
            </div>
          </div>
        </div>

        {/* Cards / empty state */}
        {mobileLoading && mobilePage === 1 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.subText }}>Loading…</div>
        ) : mobileData.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "48px 16px",
            background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`,
          }}>
            <Text style={{ color: C.subText, fontSize: 13 }}>No orders found.</Text>
            <br />
            <Button size="small" icon={<FilterOutlined />} onClick={() => setFilterOpen(true)}
              style={{ marginTop: 12, borderRadius: 8 }}>
              Adjust Filters
            </Button>
          </div>
        ) : (
          <>
            {mobileData.map((record) => (
              <MobileOrderCard
                key={record._id}
                record={record}
                isAdmin={isAdmin}
                repostingPaymentId={repostingPaymentId}
                onEditDate={handleEditOrderDate}
                onRepost={handleRepostOrderPayment}
                onDelete={handleDelete}
                expanded={expandedId === record._id}
                onExpand={(r) => setExpandedId(expandedId === r._id ? null : r._id)}
                onRefresh={refreshMobile}
              />
            ))}

            {mobileData.length < mobileTotal && (
              <Button
                block loading={mobileLoading}
                onClick={() => { const n = mobilePage + 1; setMobilePage(n); loadMobileData(n, mobileFilters); }}
                style={{ borderRadius: 8, marginBottom: 16 }}
              >
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

  // ── Desktop render ────────────────────────────────────────────────────
  return (
    <>
      <ProTable
        rowKey="_id"
        cardBordered
        formRef={formRef}
        form={{
          onFinish: async (values) => {
            const { dateRange, ...rest } = values;
            setQueryParams({ ...rest, page: 1, limit: queryParams.limit });
            return true;
          },
          initialValues: { dateRange: [dayjs().startOf("day"), dayjs().endOf("day")] },
        }}
        search={{
          labelWidth: "auto", defaultCollapsed: false,
          searchText: "Search", resetText: "Reset",
          optionRender: (_, __, dom) => [...dom],
        }}
        toolbar={{
          title: "Orders", tooltip: "Order Management",
          actions: [
            <CSVLink
              key="csv"
              data={csvData}
              filename={`${ENTITY_NAME}_Orders_${dayjs().format("YYYY-MM-DD")}.csv`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                height: 32, padding: "0 15px", borderRadius: 8, fontSize: 13,
                background: C.primary, color: "#fff", textDecoration: "none", fontWeight: 500,
              }}
            >
              <DownloadOutlined /> Export CSV
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
          const { current, pageSize, dateRange, _timestamp, ...rest } = params;
          try {
            const response = await getAllOrders({
              ...rest, page: current, limit: pageSize,
              start_date: dateRange?.[0] ? dayjs(dateRange[0]).startOf("day").toISOString() : dayjs().startOf("day").toISOString(),
              end_date: dateRange?.[1] ? dayjs(dateRange[1]).endOf("day").toISOString() : dayjs().endOf("day").toISOString(),
            });
            setExportOrderData(response);
            return { data: response, success: true, total: response.pagination?.total || 0 };
          } catch {
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
    </>
  );
};

export default OrdersTable;