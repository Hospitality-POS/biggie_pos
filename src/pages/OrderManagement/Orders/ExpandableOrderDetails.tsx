import { useEffect, useState, useMemo } from "react";
import { ProDescriptions } from "@ant-design/pro-components";
import {
  Alert, Button, DatePicker, Form, InputNumber,
  message, Popconfirm, Table, Tooltip, Typography,
} from "antd";
import {
  CloseOutlined, DeleteOutlined, DollarOutlined,
  EditOutlined, RedoOutlined, SaveOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";
import { repostOrderPayment } from "@services/orders";

const { Text } = Typography;

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

const pill = (bg: string, color: string, border: string): React.CSSProperties => ({
  display: "inline-block", borderRadius: 5, padding: "2px 8px",
  fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
  background: bg, color, border: `1px solid ${border}`,
});

const OrderTypeTag: React.FC<{ type: string }> = ({ type }) => {
  const cfg: Record<string, { bg: string; color: string; border: string; label: string }> = {
    Regular: { bg: "#f0fdf4", color: C.green, border: "#bbf7d0", label: "Regular" },
    Subscription_Visit: { bg: "#faf5ff", color: C.purple, border: "#e9d5ff", label: "Subscription Visit" },
    Subscription_Purchase: { bg: "#eff6ff", color: C.blue, border: "#bfdbfe", label: "Subscription Purchase" },
  };
  const s = cfg[type] ?? cfg.Regular;
  return <span style={pill(s.bg, s.color, s.border)}>{s.label}</span>;
};

const ItemTypeTag: React.FC<{ isSubscription: boolean; isMiscellaneous?: boolean }> = ({ isSubscription, isMiscellaneous }) =>
  isMiscellaneous
    ? <span style={pill("#fff7ed", C.orange, "#fed7aa")}>Custom</span>
    : isSubscription
      ? <span style={pill("#faf5ff", C.purple, "#e9d5ff")}>Subscription</span>
      : <span style={pill("#f0fdf4", C.green, "#bbf7d0")}>Regular</span>;

const PaymentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const ok = status === "COMPLETED";
  return (
    <span style={{ ...pill(ok ? "#f0fdf4" : "#fffbeb", ok ? C.green : C.orange, ok ? "#bbf7d0" : "#fde68a"), marginLeft: 6 }}>
      {status}
    </span>
  );
};

interface ProductReference { _id: string; name: string; price: number }
interface CategoryReference { _id: string; name: string }
interface OrderItem {
  _id: string; order_id: string; shop_id: string;
  product_id: ProductReference | null; product_type: string;
  miscellaneous_name?: string;
  category_id: CategoryReference; price: number; quantity: number;
  vat_amount: number; is_subscription_item: boolean;
  createdAt: string; updatedAt: string;
}
interface OrderPayment { _id: string; name: string; amount: number; payment_status: string }
interface UserReference { _id: string; username: string }
interface VATDetail { rate: number; amount: number; net: number }
interface OrderDetailsInterface {
  _id: string; order_no: string; order_type: string; createdAt: string;
  served_by?: UserReference; order_items?: OrderItem[]; order_payments?: OrderPayment[];
  customer_name?: string;
  customer_phone?: string | number;
  customer_email?: string;
  discount?: number; discount_type?: string; discount_amount?: number;
  subtotal: number; total_cart_amount?: number;
  total_vat_amount: number; vat_breakdown?: Record<string, VATDetail>; order_amount: number;
}
interface EditingItem { itemId: string; quantity: number; createdAt: string }

const SectionLabel: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
    <Text style={{ fontSize: 10, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>
      {children}
    </Text>
    {right}
  </div>
);

const MetaRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "7px 0", borderBottom: `1px solid ${C.border}`,
  }}>
    <Text style={{ fontSize: 11, color: C.subText, flexShrink: 0, marginRight: 12 }}>{label}</Text>
    <div style={{ textAlign: "right" }}>{children}</div>
  </div>
);

const MobileItemCard: React.FC<{
  item: OrderItem;
  isEditing: boolean;
  loading: boolean;
  deletingItemId: string | null;
  form: any;
  onEdit: (item: OrderItem) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
}> = ({ item, isEditing, loading, deletingItemId, form, onEdit, onSave, onCancel, onDelete }) => {
  const getItemName = () => {
    if (item.product_type === "Miscellaneous") {
      return item.miscellaneous_name || item.product_id?.name || "Custom Item";
    }
    return item.product_id?.name || "Item";
  };

  const isMiscellaneous = item.product_type === "Miscellaneous";

  return (
  <div style={{
    background: "#fff", border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "10px 12px", marginBottom: 8,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
      <Text strong style={{ fontSize: 13, color: C.darkText, flex: 1, marginRight: 8 }}>
        {getItemName()}
      </Text>
      <ItemTypeTag isSubscription={item.is_subscription_item} isMiscellaneous={isMiscellaneous} />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
      <MetaRow label="Category">
        <Text style={{ fontSize: 12 }}>{item.category_id?.name || "—"}</Text>
      </MetaRow>
      <MetaRow label="Price">
        <Text style={{ fontSize: 12 }}>KES {item.price?.toFixed(2)}</Text>
      </MetaRow>
      <MetaRow label="Qty">
        {isEditing ? (
          <Form.Item name="quantity" style={{ margin: 0 }}
            rules={[{ required: true, message: "Required" }, { type: "number", min: 1, message: "Min 1" }]}>
            <InputNumber min={1} size="small" style={{ width: 80 }} />
          </Form.Item>
        ) : (
          <Text style={{ fontSize: 12 }}>{item.quantity}</Text>
        )}
      </MetaRow>
      <MetaRow label="VAT">
        <Text style={{ fontSize: 12, color: C.subText }}>KES {item.vat_amount?.toFixed(2)}</Text>
      </MetaRow>
      <MetaRow label="Line Total">
        <Text strong style={{ fontSize: 12, color: C.primary }}>
          KES {(item.price * item.quantity).toFixed(2)}
        </Text>
      </MetaRow>
      <MetaRow label="Created">
        {isEditing ? (
          <Form.Item name="createdAt" style={{ margin: 0 }} rules={[{ required: true, message: "Required" }]}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" size="small" style={{ width: 190 }} />
          </Form.Item>
        ) : (
          <Text style={{ fontSize: 11, color: C.subText }}>{dayjs(item.createdAt).format("DD MMM YYYY HH:mm")}</Text>
        )}
      </MetaRow>
    </div>
    <div style={{ display: "flex", gap: 6, paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
      {isEditing ? (
        <>
          <Button type="primary" size="small" icon={<SaveOutlined />} onClick={onSave} loading={loading}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 6, flex: 1 }}>
            Save
          </Button>
          <Button size="small" icon={<CloseOutlined />} onClick={onCancel} disabled={loading}
            style={{ borderRadius: 6, flex: 1 }}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(item)}
            style={{ borderRadius: 6, flex: 1, fontSize: 11 }}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this item?"
            description="This will remove the item and recalculate totals."
            onConfirm={() => onDelete(item._id)}
            okText="Yes" cancelText="No" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}
              loading={deletingItemId === item._id} disabled={loading}
              style={{ borderRadius: 6, flex: 1, fontSize: 11 }}>
              Delete
            </Button>
          </Popconfirm>
        </>
      )}
    </div>
  </div>
  );
};

const ExpandedRowContent = ({
  record,
  onRefresh,
}: {
  record: OrderDetailsInterface;
  onRefresh?: () => void;
}) => {
  const isMobile = useIsMobile();

  const {
    _id: orderId, order_no, order_type, createdAt,
    served_by, order_items = [], order_payments = [],
    customer_name, customer_phone, customer_email,
    discount = 0, discount_type, discount_amount,
    subtotal, total_cart_amount,
    total_vat_amount, vat_breakdown, order_amount,
  } = record;

  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editingOrderTs, setEditingOrderTs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [repostingPayment, setRepostingPayment] = useState(false);
  const [form] = Form.useForm();
  const [orderTimestampForm] = Form.useForm();

  const formattedCreatedAt = new Date(createdAt).toLocaleString();
  const hasPayments = order_payments?.length > 0;
  const isRegularOrder = order_type === "Regular";
  const needsPayment = isRegularOrder && !hasPayments;
  const orderItemsTotal = order_items.reduce((s, i) => s + i.price * i.quantity, 0);

  // Handle served_by as array or single object
  const servedByUsers = useMemo(() => {
    if (!served_by) return [];
    if (Array.isArray(served_by)) {
      return served_by.map((u: any) => typeof u === "string" ? { username: u } : u);
    }
    return [served_by];
  }, [served_by]);

  // ── Discount display ────────────────────────────────────────────────────
  // Use stored discount_amount if available (backend-calculated).
  // Fall back to computing from discount + discount_type on total_cart_amount.
  const computedDiscountAmount = (() => {
    if (discount_amount !== undefined && discount_amount !== null) {
      return Number(discount_amount);
    }
    if (!discount || discount <= 0) return 0;
    const base = total_cart_amount || subtotal;
    if (discount_type === "percentage") {
      return (discount / 100) * base;
    }
    return Number(discount);
  })();

  // grossBeforeDiscount = what the order would have cost with no discount
  // = order_amount + discountAmount
  const grossBeforeDiscount = order_amount + computedDiscountAmount;

  const discountLabel = (() => {
    if (!discount || discount <= 0) return null;
    if (discount_type === "percentage") return `Discount (${discount}% off)`;
    return `Discount (KES ${Number(discount).toFixed(2)} off)`;
  })();

  const vatBreakdownItems = vat_breakdown
    ? Object.entries(vat_breakdown).map(([type, d]) => ({
      label: `VAT (${type})`,
      value: `KES ${d.amount?.toFixed(2)} (${(d.rate * 100).toFixed(0)}%)`,
    }))
    : [];

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleEditOrderTimestamp = () => {
    setEditingOrderTs(true);
    orderTimestampForm.setFieldsValue({ createdAt: dayjs(createdAt) });
  };

  const handleSaveOrderTimestamp = async () => {
    try {
      const values = await orderTimestampForm.validateFields();
      setLoading(true);
      await axiosInstance.put(`${BASE_URL}/orders/${orderId}`, { createdAt: values.createdAt.toISOString() });
      message.success("Order timestamp updated successfully");
      setEditingOrderTs(false);
      orderTimestampForm.resetFields();
      onRefresh?.();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Error updating order timestamp");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrderTimestamp = () => {
    setEditingOrderTs(false);
    orderTimestampForm.resetFields();
  };

  const handleRepostPayment = async (forceRecreate = false) => {
    try {
      setRepostingPayment(true);
      await repostOrderPayment(orderId, { force_recreate: forceRecreate });
      onRefresh?.();
    } finally {
      setRepostingPayment(false);
    }
  };

  const handleEdit = (item: OrderItem) => {
    setEditingItem({ itemId: item._id, quantity: item.quantity, createdAt: item.createdAt });
    form.setFieldsValue({ quantity: item.quantity, createdAt: dayjs(item.createdAt) });
  };

  const handleCancel = () => { setEditingItem(null); form.resetFields(); };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await axiosInstance.patch(`${BASE_URL}/orders/items/${editingItem?.itemId}`, {
        quantity: values.quantity,
        createdAt: values.createdAt.toISOString(),
      });
      message.success("Order item updated successfully");
      setEditingItem(null);
      form.resetFields();
      onRefresh?.();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Error updating order item");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      setDeletingItemId(itemId);
      setLoading(true);
      await axiosInstance.delete(`${BASE_URL}/orders/items/${itemId}`);
      message.success("Order item deleted successfully");
      onRefresh?.();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Error deleting order item");
    } finally {
      setLoading(false);
      setDeletingItemId(null);
    }
  };

  const PaymentList = () => (
    order_payments.length === 1 ? (
      <span style={{ fontSize: 12 }}>
        {order_payments[0].name} — KES {order_payments[0].amount?.toLocaleString()}
        {order_payments[0].payment_status && <PaymentStatusBadge status={order_payments[0].payment_status} />}
      </span>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {order_payments.map((p, i) => (
          <span key={`${p.name}-${i}`} style={{ fontSize: 12 }}>
            {p.name} — KES {p.amount?.toLocaleString()}
            {p.payment_status && <PaymentStatusBadge status={p.payment_status} />}
          </span>
        ))}
      </div>
    )
  );

  const orderItemsColumns = [
    {
      title: "Product", dataIndex: ["product_id", "name"], key: "product_name",
      render: (_: any, item: OrderItem) => {
        const itemName = item.product_type === "Miscellaneous"
          ? item.miscellaneous_name || item.product_id?.name || "Custom Item"
          : item.product_id?.name || "Item";
        return <Text strong style={{ fontSize: 12 }}>{itemName}</Text>;
      },
    },
    {
      title: "Category", dataIndex: ["category_id", "name"], key: "category_name",
      render: (text: string) => <Text style={{ fontSize: 12, color: C.subText }}>{text}</Text>,
    },
    {
      title: "Price", dataIndex: "price", key: "price", align: "right" as const,
      render: (price: number) => <Text style={{ fontSize: 12 }}>KES {price?.toFixed(2)}</Text>,
    },
    {
      title: "Qty", dataIndex: "quantity", key: "quantity", align: "center" as const,
      render: (quantity: number, item: OrderItem) =>
        editingItem?.itemId === item._id ? (
          <Form.Item name="quantity" style={{ margin: 0 }}
            rules={[{ required: true, message: "Required" }, { type: "number", min: 1, message: "Min 1" }]}>
            <InputNumber min={1} size="small" style={{ width: 70 }} />
          </Form.Item>
        ) : <Text style={{ fontSize: 12 }}>{quantity}</Text>,
    },
    {
      title: "VAT", dataIndex: "vat_amount", key: "vat_amount", align: "right" as const,
      render: (vat: number) => <Text style={{ fontSize: 12, color: C.subText }}>KES {vat?.toFixed(2)}</Text>,
    },
    {
      title: "Line Total", key: "line_total", align: "right" as const,
      render: (_: any, item: OrderItem) => {
        const qty = editingItem?.itemId === item._id
          ? form.getFieldValue("quantity") || item.quantity
          : item.quantity;
        return <Text strong style={{ fontSize: 12 }}>KES {(item.price * qty).toFixed(2)}</Text>;
      },
    },
    {
      title: "Type", dataIndex: "is_subscription_item", key: "is_subscription_item",
      render: (_: any, item: OrderItem) => {
        const isMiscellaneous = item.product_type === "Miscellaneous";
        return <ItemTypeTag isSubscription={item.is_subscription_item} isMiscellaneous={isMiscellaneous} />;
      },
    },
    {
      title: "Created", dataIndex: "createdAt", key: "createdAt",
      render: (date: string, item: OrderItem) =>
        editingItem?.itemId === item._id ? (
          <Form.Item name="createdAt" style={{ margin: 0 }} rules={[{ required: true, message: "Required" }]}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" size="small" style={{ width: 180 }} />
          </Form.Item>
        ) : <Text style={{ fontSize: 12, color: C.subText }}>{dayjs(date).format("MMM DD, YYYY HH:mm")}</Text>,
    },
    {
      title: "Actions", key: "actions", align: "center" as const, width: 140,
      render: (_: any, item: OrderItem) =>
        editingItem?.itemId === item._id ? (
          <div style={{ display: "flex", gap: 4 }}>
            <Button type="primary" size="small" icon={<SaveOutlined />} onClick={handleSave} loading={loading}
              style={{ background: C.primary, borderColor: C.primary, borderRadius: 6 }}>Save</Button>
            <Button size="small" icon={<CloseOutlined />} onClick={handleCancel} disabled={loading}
              style={{ borderRadius: 6 }}>Cancel</Button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 4 }}>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(item)}
              style={{ padding: "0 4px", color: C.subText }}>Edit</Button>
            <Popconfirm
              title="Delete this item?"
              description="This will remove the item and recalculate totals."
              onConfirm={() => handleDeleteItem(item._id)}
              okText="Yes" cancelText="No" okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}
                loading={deletingItemId === item._id} disabled={loading}
                style={{ padding: "0 4px" }}>Delete</Button>
            </Popconfirm>
          </div>
        ),
    },
  ];

  const MissingPaymentAlert = () =>
    isRegularOrder && needsPayment ? (
      <Alert
        type="warning" showIcon message="Missing Payment Records"
        style={{ marginBottom: 14, borderRadius: 8 }}
        description={
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
            <Text style={{ fontSize: 12 }}>This order is missing payment records. Click below to create them automatically.</Text>
            <Popconfirm
              title="Create payment records?"
              description="This will create payment records based on the order's payment methods and amount."
              onConfirm={() => handleRepostPayment(false)}
              okText="Yes" cancelText="No"
            >
              <Button type="primary" size="small" icon={<DollarOutlined />} loading={repostingPayment}
                style={{ width: "fit-content", background: C.primary, borderColor: C.primary, borderRadius: 6 }}>
                Create Payment Records
              </Button>
            </Popconfirm>
          </div>
        }
      />
    ) : null;

  const PaymentMethodSection = () => (
    order_payments.length > 0 ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <PaymentList />
        {isRegularOrder && (
          <Tooltip title="Recreate payment records">
            <Popconfirm
              title="Recreate payment records?"
              description="This will delete existing payments and recreate them."
              onConfirm={() => handleRepostPayment(true)}
              okText="Yes" cancelText="No" okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<RedoOutlined />} loading={repostingPayment}
                style={{ padding: 0, width: "fit-content" }}>
                Repost Payments
              </Button>
            </Popconfirm>
          </Tooltip>
        )}
      </div>
    ) : order_type === "Subscription_Visit" ? (
      <span style={pill("#fffbeb", C.orange, "#fde68a")}>No Payment (Pre-paid via Subscription)</span>
    ) : (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={pill("#fef2f2", C.red, "#fecaca")}>Missing Payment Records</span>
        {isRegularOrder && (
          <Popconfirm
            title="Create payment records?"
            description="This will create payment records for this order."
            onConfirm={() => handleRepostPayment(false)}
            okText="Yes" cancelText="No"
          >
            <Button type="primary" size="small" icon={<DollarOutlined />} loading={repostingPayment}
              style={{ background: C.primary, borderColor: C.primary, borderRadius: 6 }}>
              Fix
            </Button>
          </Popconfirm>
        )}
      </div>
    )
  );

  const EditableDateSection = () =>
    editingOrderTs ? (
      <Form form={orderTimestampForm} layout={isMobile ? "vertical" : "inline"}>
        <Form.Item name="createdAt" rules={[{ required: true, message: "Required" }]}
          style={{ marginBottom: isMobile ? 8 : 0 }}>
          <DatePicker showTime format="YYYY-MM-DD HH:mm:ss"
            style={{ width: isMobile ? "100%" : 220, borderRadius: 7 }} />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <Button type="primary" size="small" icon={<SaveOutlined />} onClick={handleSaveOrderTimestamp} loading={loading}
              style={{ background: C.primary, borderColor: C.primary, borderRadius: 6 }}>Save</Button>
            <Button size="small" icon={<CloseOutlined />} onClick={handleCancelOrderTimestamp} disabled={loading}
              style={{ borderRadius: 6 }}>Cancel</Button>
          </div>
        </Form.Item>
      </Form>
    ) : (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Text style={{ fontSize: 12 }}>{formattedCreatedAt}</Text>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={handleEditOrderTimestamp}
          style={{ padding: "0 4px", color: C.subText }}>Edit</Button>
      </div>
    );

  // ── Summary section — shared between mobile and desktop ─────────────────
  // Shows: Subtotal (gross before discount) → Discount → VAT (info) → Amount Due
  const SummarySection = () => (
    <>
      {/* Gross before discount */}
      <MetaRow label="Subtotal">
        <Text strong style={{ fontSize: 12 }}>
          KES {computedDiscountAmount > 0 ? grossBeforeDiscount.toFixed(2) : order_amount.toFixed(2)}
        </Text>
      </MetaRow>

      {/* Discount line — only shown when a discount was actually applied */}
      {computedDiscountAmount > 0 && discountLabel && (
        <MetaRow label={discountLabel}>
          <span style={pill("#fef2f2", C.red, "#fecaca")}>
            − KES {computedDiscountAmount.toFixed(2)}
          </span>
        </MetaRow>
      )}

      {/* VAT breakdown — informational only, already included in order_amount */}
      {vatBreakdownItems.map((item, i) => (
        <MetaRow key={i} label={`${item.label} (incl.)`}>
          <Text style={{ fontSize: 12, color: C.subText }}>{item.value}</Text>
        </MetaRow>
      ))}

      {total_vat_amount > 0 && vatBreakdownItems.length === 0 && (
        <MetaRow label="VAT (incl.)">
          <span style={pill("#eff6ff", C.blue, "#bfdbfe")}>KES {total_vat_amount?.toFixed(2)}</span>
        </MetaRow>
      )}

      {/* Payments */}
      {order_payments.length > 0 && (
        <MetaRow label="Total Paid">
          <Text strong style={{ fontSize: 12, color: C.green }}>
            KES {order_payments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
          </Text>
        </MetaRow>
      )}

      {/* Amount Due — always the prominent final line */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
        <Text style={{ fontSize: 12, color: C.subText }}>Amount Due</Text>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text strong style={{ fontSize: 15, color: C.primary }}>KES {order_amount?.toFixed(2)}</Text>
          {order_type === "Subscription_Visit" && order_amount === 0 && (
            <span style={pill("#faf5ff", C.purple, "#e9d5ff")}>Pre-paid</span>
          )}
        </div>
      </div>
    </>
  );

  // ── MOBILE layout ────────────────────────────────────────────────────────
  if (isMobile) {
    const card = (content: React.ReactNode) => (
      <div style={{
        background: "#fff", border: `1px solid ${C.border}`,
        borderRadius: 10, padding: "12px 14px", marginBottom: 10,
      }}>
        {content}
      </div>
    );

    return (
      <div style={{ padding: "8px 0" }}>
        <MissingPaymentAlert />

        {card(
          <>
            <SectionLabel>Order Info</SectionLabel>
            <MetaRow label="Order No.">
              <Text strong style={{ fontSize: 12 }}>{order_no}</Text>
            </MetaRow>
            <MetaRow label="Type">
              <OrderTypeTag type={order_type} />
            </MetaRow>
            <MetaRow label="Date">
              <EditableDateSection />
            </MetaRow>
            <MetaRow label="Served By">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" }}>
                {servedByUsers.length > 0 ? (
                  servedByUsers.map((u: any, i: number) => (
                    <span key={i} style={{ fontSize: 12 }}>
                      {u?.username || "N/A"}{i < servedByUsers.length - 1 ? ", " : ""}
                    </span>
                  ))
                ) : (
                  <Text style={{ fontSize: 12 }}>N/A</Text>
                )}
              </div>
            </MetaRow>
            <div style={{ paddingTop: 7 }}>
              <Text style={{ fontSize: 11, color: C.subText }}>Payment</Text>
              <div style={{ marginTop: 6 }}>
                <PaymentMethodSection />
              </div>
            </div>
          </>,
        )}

        {customer_name && card(
          <>
            <SectionLabel>Customer</SectionLabel>
            <MetaRow label="Name">
              <Text strong style={{ fontSize: 12 }}>{customer_name}</Text>
            </MetaRow>
            {customer_email && (
              <MetaRow label="Email">
                <Text style={{ fontSize: 12 }}>{customer_email}</Text>
              </MetaRow>
            )}
            <MetaRow label="Phone">
              <Text style={{ fontSize: 12 }}>{customer_phone}</Text>
            </MetaRow>
          </>,
        )}

        {order_items.length > 0 && (
          <>
            <div style={{ marginBottom: 6, paddingLeft: 2 }}>
              <SectionLabel>
                Order Items ({order_items.length})
                {order_type === "Subscription_Visit" && <span style={{ ...pill("#faf5ff", C.purple, "#e9d5ff"), marginLeft: 8 }}>Pre-paid</span>}
                {order_type === "Subscription_Purchase" && <span style={{ ...pill("#eff6ff", C.blue, "#bfdbfe"), marginLeft: 8 }}>Package</span>}
              </SectionLabel>
            </div>
            <Form form={form} component={false}>
              {order_items.map((item) => (
                <MobileItemCard
                  key={item._id} item={item}
                  isEditing={editingItem?.itemId === item._id}
                  loading={loading} deletingItemId={deletingItemId} form={form}
                  onEdit={handleEdit} onSave={handleSave} onCancel={handleCancel}
                  onDelete={handleDeleteItem}
                />
              ))}
            </Form>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 14px", marginBottom: 10, background: C.primaryLight, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <Text style={{ fontSize: 12, color: C.subText, marginRight: 12 }}>Items Total</Text>
              <Text strong style={{ fontSize: 13, color: C.primary }}>KES {orderItemsTotal.toFixed(2)}</Text>
            </div>
          </>
        )}

        {card(
          <>
            <SectionLabel>Summary</SectionLabel>
            <SummarySection />
          </>,
        )}
      </div>
    );
  }

  // ── DESKTOP layout ────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 16, background: C.bg }}>
      <MissingPaymentAlert />

      {order_items.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>
            Order Items
            {order_type === "Subscription_Visit" && <span style={{ ...pill("#faf5ff", C.purple, "#e9d5ff"), marginLeft: 8 }}>Subscription Visit (Pre-paid)</span>}
            {order_type === "Subscription_Purchase" && <span style={{ ...pill("#eff6ff", C.blue, "#bfdbfe"), marginLeft: 8 }}>Package Purchase</span>}
          </SectionLabel>
          <Form form={form} component={false}>
            <Table
              dataSource={order_items}
              columns={orderItemsColumns}
              rowKey="_id"
              pagination={false}
              size="small"
              bordered
              style={{ borderRadius: 8, overflow: "hidden" }}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5} align="right">
                      <Text strong style={{ fontSize: 12 }}>Items Total:</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong style={{ fontSize: 12, color: C.primary }}>KES {orderItemsTotal.toFixed(2)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} colSpan={3} />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Form>
        </div>
      )}

      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <ProDescriptions column={2} bordered size="small">

          <ProDescriptions.Item label="Order Number">
            <Text strong style={{ fontSize: 12 }}>{order_no}</Text>
          </ProDescriptions.Item>

          <ProDescriptions.Item label="Order Type">
            <OrderTypeTag type={order_type} />
          </ProDescriptions.Item>

          <ProDescriptions.Item label="Date" span={2}>
            <EditableDateSection />
          </ProDescriptions.Item>

          <ProDescriptions.Item label="Served By">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {servedByUsers.length > 0 ? (
                servedByUsers.map((u: any, i: number) => (
                  <span key={i} style={{ fontSize: 12 }}>
                    {u?.username || "N/A"}{i < servedByUsers.length - 1 ? ", " : ""}
                  </span>
                ))
              ) : (
                <Text style={{ fontSize: 12 }}>N/A</Text>
              )}
            </div>
          </ProDescriptions.Item>

          {customer_name && (
            <>
              <ProDescriptions.Item label="Customer Name">
                <Text strong style={{ fontSize: 12 }}>{customer_name}</Text>
              </ProDescriptions.Item>
              {customer_email && (
                <ProDescriptions.Item label="Customer Email">
                  <Text style={{ fontSize: 12 }}>{customer_email}</Text>
                </ProDescriptions.Item>
              )}
              <ProDescriptions.Item label="Customer Phone">
                <Text style={{ fontSize: 12 }}>{customer_phone}</Text>
              </ProDescriptions.Item>
            </>
          )}

          <ProDescriptions.Item label="Payment Method" span={2}>
            <PaymentMethodSection />
          </ProDescriptions.Item>

          {/* Subtotal = gross before discount */}
          <ProDescriptions.Item label="Subtotal" span={2}>
            <Text strong style={{ fontSize: 12 }}>
              KES {computedDiscountAmount > 0 ? grossBeforeDiscount.toFixed(2) : order_amount.toFixed(2)}
            </Text>
          </ProDescriptions.Item>

          {/* Discount — only shown when applied */}
          {computedDiscountAmount > 0 && discountLabel && (
            <ProDescriptions.Item label={discountLabel} span={2}>
              <span style={pill("#fef2f2", C.red, "#fecaca")}>
                − KES {computedDiscountAmount.toFixed(2)}
              </span>
            </ProDescriptions.Item>
          )}

          {/* VAT breakdown — informational */}
          {vatBreakdownItems.map((item, i) => (
            <ProDescriptions.Item key={i} label={`${item.label} (incl.)`}>
              <Text style={{ fontSize: 12 }}>{item.value}</Text>
            </ProDescriptions.Item>
          ))}

          {total_vat_amount > 0 && vatBreakdownItems.length === 0 && (
            <ProDescriptions.Item label="VAT (incl.)" span={2}>
              <span style={pill("#eff6ff", C.blue, "#bfdbfe")}>KES {total_vat_amount?.toFixed(2)}</span>
            </ProDescriptions.Item>
          )}

          {/* Amount Due — prominent */}
          <ProDescriptions.Item label="Amount Due" span={2}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Text strong style={{ fontSize: 13, color: C.primary }}>KES {order_amount?.toFixed(2)}</Text>
              {order_type === "Subscription_Visit" && order_amount === 0 && (
                <span style={pill("#faf5ff", C.purple, "#e9d5ff")}>Pre-paid</span>
              )}
            </div>
          </ProDescriptions.Item>

          {order_payments.length > 0 && (
            <ProDescriptions.Item label="Total Payments" span={2}>
              <Text strong style={{ fontSize: 12, color: C.green }}>
                KES {order_payments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
              </Text>
            </ProDescriptions.Item>
          )}

        </ProDescriptions>
      </div>
    </div>
  );
};

export default ExpandedRowContent;