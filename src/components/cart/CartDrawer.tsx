import React, { Key, useEffect, useMemo, useState } from "react";
import CartItemCard from "./CartItemCard";
import PrintBillModal from "../MODALS/PrintBillModal";
import PrintBillSpaModal from "../MODALS/printBillSpaModal";
import { deleteAllCartItems, getCart, addItemToCart, fetchCartItems } from "../../features/Cart/CartActions";
import { updateCart as updateCartService } from "../../services/cart";
import PaymentDrawer from "../payment/PaymentDrawer";
import SkeletonCartItemCard from "./SkeletonCartItemCard";
import { useAppDispatch, useAppSelector } from "../../store";
import { useNavigate, useParams } from "react-router-dom";
import CartLoader from "../spinner/cartLoader";
import { fetchAllUsersByShopId } from "../../services/users";
import { fetchMainCategories } from "../../services/categories";
import {
  Button, Space, Typography, Tag, Empty, Divider,
  Flex, Avatar, Tooltip, Select, Popconfirm, message, Modal, Form, InputNumber, Input,
} from "antd";
import {
  ClearOutlined, CloseCircleOutlined, OrderedListOutlined,
  PlusCircleOutlined, RestOutlined, SmileFilled,
  SwitcherOutlined, UserOutlined, EditOutlined,
  CalendarOutlined, PrinterOutlined, UserDeleteOutlined, SendOutlined,
} from "@ant-design/icons";
import TransferBillModal from "@components/MODALS/pro/TransferBill";
import ClientPin from "@components/MODALS/ClientPin";
import DiscountModal from "@components/MODALS/pro/DiscountModal";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { usePOSMode } from "@context/POSModeContext";
import { useRetailQueue } from "@context/RetailQueueContext";
import { usePrintDocument, DocumentType } from "../MODALS/Hooks/usePrintDocument";
import {
  sendPrintFromCart,
} from "@services/printAgent";

const { Text } = Typography;

const fmtKsh = (v: number) =>
  `KSH ${v?.toLocaleString("en-KE", { minimumFractionDigits: 0 }) ?? "0"}`;

const formatCartDate = (dateString: string) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const cartDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (cartDate.getTime() === today.getTime()) {
    return `Today at ${date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`;
  } else if (cartDate.getTime() === yesterday.getTime()) {
    return `Yesterday at ${date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return date.toLocaleDateString("en-KE", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const SummaryRow: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  strong?: boolean;
  accent?: string;
  muted?: boolean;
}> = ({ label, value, strong, accent, muted }) => (
  <Flex align="center" justify="space-between" style={{ padding: "3px 0" }}>
    <Text style={{
      fontSize: strong ? 15 : 13,
      fontWeight: strong ? 700 : 400,
      color: muted ? "#94a3b8" : "#374151",
    }}>
      {label}
    </Text>
    <Text style={{
      fontSize: strong ? 15 : 13,
      fontWeight: strong ? 700 : 400,
      color: accent || (muted ? "#94a3b8" : "#374151"),
    }}>
      {value}
    </Text>
  </Flex>
);

// ── Print status badge shown in the cart summary ───────────────────────────
const PrintStatusBadge: React.FC<{
  isReprint: boolean;
  printsRemaining: number | null;
  statusLoading: boolean;
  primaryColor: string;
}> = ({ isReprint, printsRemaining, statusLoading, primaryColor }) => {
  if (statusLoading) return null;
  if (!isReprint) return null;

  return (
    <Flex
      align="center"
      gap={6}
      style={{
        background: "#fff7ed",
        border: "1px solid #fed7aa",
        borderRadius: 8,
        padding: "6px 10px",
        marginBottom: 8,
      }}
    >
      <PrinterOutlined style={{ color: "#f97316", fontSize: 13 }} />
      <Text style={{ fontSize: 12, color: "#c2410c", flex: 1 }}>
        Reprint — previously printed
      </Text>
      {printsRemaining !== null && (
        <Tag
          color={printsRemaining === 0 ? "error" : "warning"}
          style={{ fontSize: 10, borderRadius: 4, margin: 0 }}
        >
          {printsRemaining === 0
            ? "Limit reached"
            : `${printsRemaining} left`}
        </Tag>
      )}
    </Flex>
  );
};

const CartDrawer: React.FC = () => {
  const [loadingData, setLoadingData] = useState(false);
  const [staffList, setStaffList] = useState<{ value: string; label: string }[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [editingServedBy, setEditingServedBy] = useState(false);
  const [updatingServedBy, setUpdatingServedBy] = useState(false);
  const [delinkingCustomer, setDelinkingCustomer] = useState(false);
  const [sendingToPrinter, setSendingToPrinter] = useState(false);
  const [showSendButton, setShowSendButton] = useState(false);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItemLoading, setCustomItemLoading] = useState(false);
  const [mainCategories, setMainCategories] = useState<{ value: string; label: string }[]>([]);

  // Document type driving which print status to check.
  const documentType: DocumentType = "bill";

  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const {
    cartDetails, subtotal, totalVatAmount, grandTotal,
    cartItems: data, loading,
  } = useAppSelector((s) => s.cart);
  const { user } = useAppSelector((s) => s.auth);
  const { tableData: td } = useAppSelector((s) => s.Tables);

  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const { isRetailMode, isHospitalMode } = usePOSMode();
  const {
    activeTable, allLocations, isLoadingSlots,
    setActiveTable, openNewOrder, removeActiveSlot,
  } = useRetailQueue();

  const isSlotMode = isRetailMode || isHospitalMode;

  const tableId = useMemo(() => {
    if (isSlotMode) return activeTable?._id;
    return id && id !== "tables" ? id : null;
  }, [isSlotMode, activeTable?._id, id]);

  const totalQueueSlots = useMemo(
    () => (allLocations || []).reduce((acc, loc) => acc + (loc.tables?.length || 0), 0),
    [allLocations]
  );

  const CartItemCardMemo = React.memo(CartItemCard);
  const memoizedData = useMemo(() => data, [data]);

  // ── usePrintDocument ──────────────────────────────────────────────────────
  const orderNo = useMemo(() => cartDetails?.order_no, [cartDetails?.order_no]);

  const {
    canPrint,
    isReprint,
    printsRemaining,
    printStatus,
    statusLoading,
    recordPrint,
    refreshStatus,
  } = usePrintDocument({
    orderNo,
    documentType,
    cartDetails,
    data: data ?? [],
    autoCheck: true,
  });

  const printProps = {
    canPrint,
    isReprint,
    printsRemaining,
    printStatus,
    statusLoading,
    recordPrint,
  };

  // ── Discount display math ─────────────────────────────────────────────────
  const discountAmount = useMemo(() => {
    if (!cartDetails?.discount || cartDetails.discount <= 0) return 0;
    if (cartDetails.discount_type === "percentage") {
      return parseFloat((subtotal * cartDetails.discount / 100).toFixed(2));
    }
    return cartDetails.discount;
  }, [cartDetails?.discount, cartDetails?.discount_type, subtotal]);

  const grossBeforeDiscount = useMemo(
    () => parseFloat((grandTotal + discountAmount).toFixed(2)),
    [grandTotal, discountAmount]
  );

  const displayVat = useMemo(() => {
    if (!totalVatAmount || !subtotal) return totalVatAmount;
    if (discountAmount <= 0) return totalVatAmount;
    const vatRate = totalVatAmount / subtotal;
    const discountedNet = subtotal - discountAmount;
    return parseFloat((discountedNet * vatRate).toFixed(2));
  }, [subtotal, totalVatAmount, discountAmount]);

  const orderNumber = useMemo(() => cartDetails?.order_no, [cartDetails?.order_no]);

  const cartCreatedDate = useMemo(() => {
    const createdAt = cartDetails?.createdAt || cartDetails?.created_at;
    if (!createdAt) return null;
    return formatCartDate(createdAt);
  }, [cartDetails?.createdAt, cartDetails?.created_at]);



  const customerDetails = useMemo(() => {
    if (cartDetails?.customer_id) {
      return {
        customer_id: cartDetails.customer_id,
        customer_name: cartDetails.client_name || null,
        customer_phone: cartDetails.client_phone || null,
        customer_email: cartDetails.client_email || null,
        client_pin: cartDetails.client_pin || null,
      };
    }
    if (cartDetails?.client_name || cartDetails?.client_pin) {
      return {
        customer_id: null,
        customer_name: cartDetails.client_name || null,
        customer_phone: cartDetails.client_phone || null,
        customer_email: cartDetails.client_email || null,
        client_pin: cartDetails.client_pin || null,
      };
    }
    return null;
  }, [cartDetails?.customer_id, cartDetails?.client_name, cartDetails?.client_pin, cartDetails?.client_email, cartDetails?.client_phone]);

  const servedByIds = useMemo(() => {
    const cb = cartDetails?.served_by ?? cartDetails?.created_by;
    if (!cb) return [];
    // Handle array format (new)
    if (Array.isArray(cb)) {
      return cb.map((u: any) => typeof u === "string" ? u : u?._id).filter(Boolean);
    }
    // Handle single object format (old)
    if (typeof cb === "object" && cb._id) return [cb._id];
    // Handle single string format (old)
    if (typeof cb === "string") return [cb];
    return [];
  }, [cartDetails?.served_by, cartDetails?.created_by]);

  const slotLabel = useMemo(() => {
    if (isHospitalMode) return activeTable?.name || "No Ward/Bed";
    if (isRetailMode) return activeTable?.name || "No Slot";
    return td?.name || "No Table";
  }, [isHospitalMode, isRetailMode, activeTable?.name, td?.name]);

  const slotSectionLabel = isHospitalMode ? "Active Ward / Bed" : "Active Slot";
  const addOrderLabel = isHospitalMode ? "Open Another Patient" : "Open Another Order";
  const clearSlotTitle = isHospitalMode
    ? `Clear "${activeTable?.name}"? This will empty the cart and free this bed/ward.`
    : `Clear "${activeTable?.name}"? This will empty the cart and free up this slot.`;

  useEffect(() => {
    const loadStaff = async () => {
      setLoadingStaff(true);
      try {
        const users = await fetchAllUsersByShopId();
        const filtered = (users || [])
          .filter((u: any) => u.role?.role_type?.toLowerCase() !== "admin")
          .map((u: any) => ({
            value: u._id,
            label: u.username || u.fullname || u.email || "Unknown",
          }));
        setStaffList(filtered);
      } catch (e) {
        console.error("Failed to load staff list", e);
      } finally {
        setLoadingStaff(false);
      }
    };
    loadStaff();
  }, []);

  useEffect(() => {
    // Load global captain_order setting from localStorage
    const savedCaptainOrder = localStorage.getItem("captain_order_enabled");
    setShowSendButton(savedCaptainOrder === "true");
  }, []);

  useEffect(() => {
    const loadMainCategories = async () => {
      try {
        const categories = await fetchMainCategories();
        setMainCategories(categories.map((cat: any) => ({ value: cat._id, label: cat.name })));
      } catch (error) {
        console.error("Failed to load main categories:", error);
      }
    };
    loadMainCategories();
  }, []);

  const handleSendToPrinter = async () => {
    const cartId = cartDetails?._id;
    if (!cartId) {
      message.error("Cart ID not found");
      return;
    }
    
    const items: any[] = Array.isArray(data) ? data : [];
    if (!items.length) {
      message.warning("No items in cart to send to printer");
      return;
    }
    
    setSendingToPrinter(true);
    
    const shopId = localStorage.getItem("shopId") ?? "";
    const companyCode = localStorage.getItem("companyCode") ?? "";

    try {
      await sendPrintFromCart(cartId, shopId, companyCode);
      message.success("Printing jobs have been initiated");
    } catch (error: any) {
      console.error("Error sending to printer:", error);
      message.error(error.message || "Failed to send order to printer");
    } finally {
      setSendingToPrinter(false);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      if (!tableId || tableId === "tables") return;
      setLoadingData(true);
      try {
        // Check if the URL pattern is /cart/cart/:cartId (cart ID) or /dashboard/:id (table ID)
        const isCartId = window.location.pathname.includes('/cart/cart/');
        
        if (isCartId) {
          // URL has cart ID, fetch cart items using cart ID
          await dispatch(fetchCartItems(tableId));
        } else {
          // URL has table ID, fetch cart using table ID
          await dispatch(getCart(tableId));
        }
        
        await refreshStatus();
        if (!isSlotMode && !data && !cartDetails) navigate("/tables");
      } catch (e) {
        console.error("cart error", e);
      } finally {
        setLoadingData(false);
      }
    };
    fetch();
  }, [dispatch, tableId, td?._id, isSlotMode, navigate]);

  const allSlots = useMemo(
    () => (allLocations || []).flatMap((loc: any) =>
      (loc.tables || []).map((t: any) => ({
        value: t._id,
        label: `${loc.name} · ${t.name}`,
        table: t,
      }))
    ),
    [allLocations]
  );

  const isOnlySlot = totalQueueSlots <= 1;
  const isSpa = tenant?.business_type?.name === "massage_parlour";
  const canCheckout = (user?.role === "admin" || user?.role === "cashier") && (data?.length ?? 0) > 0;

  const handleServedByChange = async (newUserIds: string[]) => {
    const cartId = cartDetails?._id ?? cartDetails?.id;
    if (!cartId) return;
    setUpdatingServedBy(true);
    try {
      await updateCartService(cartId, { served_by: newUserIds });
      await dispatch(getCart(tableId));
      setEditingServedBy(false);
    } catch (e) {
      console.error("Failed to update served by", e);
    } finally {
      setUpdatingServedBy(false);
    }
  };

  // ── Delink customer from cart ─────────────────────────────────────────────
  // Clears customer_id, client_name, client_pin, client_email and any
  // subscription fields so the cart becomes a walk-in order.
  const handleDelinkCustomer = async () => {
    const cartId = cartDetails?._id;
    if (!cartId) return;
    setDelinkingCustomer(true);
    try {
      await updateCartService(cartId, {
        customer_id: undefined,
        client_name: undefined,
        client_pin: undefined,
        client_email: undefined,
        client_phone: undefined,
      });
      if (tableId) await dispatch(getCart(tableId));
      message.success("Customer delinked successfully");
    } catch (e) {
      console.error("Failed to delink customer", e);
      message.error("Failed to delink customer");
    } finally {
      setDelinkingCustomer(false);
    }
  };

  const [customItemForm] = Form.useForm();

  const handleAddCustomItem = async () => {
    try {
      const values = await customItemForm.validateFields();
      setCustomItemLoading(true);
      
      const cartId = cartDetails?._id;
      if (!cartId) {
        message.error("Cart not found");
        return;
      }

      await dispatch(addItemToCart({
        cart_id: cartId,
        product_id: null,
        product_type: "Miscellaneous",
        miscellaneous_name: values.name,
        main_category: values.main_category,
        price: values.price,
        quantity: values.quantity,
        created_by: user?._id || "",
        vat_type: "STANDARD",
        notes: values.notes || "",
        addons: [],
      }));

      message.success("Custom item added successfully");
      setIsCustomItemModalOpen(false);
      customItemForm.resetFields();
      
      // Auto-refresh cart to show the new item
      if (tableId) {
        await dispatch(getCart(tableId));
      }
    } catch (error) {
      console.error("Failed to add custom item", error);
      message.error("Failed to add custom item");
    } finally {
      setCustomItemLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}>

        {/* ── Slot switcher ─────────────────────────────────────────────── */}
        {isSlotMode && (
          <div style={{ background: `${primaryColor}0f`, border: `1px solid ${primaryColor}30`, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
            <Text strong style={{ fontSize: 11, color: primaryColor, letterSpacing: 0.8, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              {slotSectionLabel}
            </Text>
            <Flex align="center" gap={6}>
              <Select
                size="small" style={{ flex: 1, minWidth: 0 }}
                value={activeTable?._id} loading={isLoadingSlots}
                onChange={(v) => { const slot = allSlots.find((s) => s.value === v); if (slot) setActiveTable(slot.table); }}
                options={allSlots} placeholder="Select slot"
              />
              <Popconfirm
                title={clearSlotTitle} onConfirm={() => removeActiveSlot()}
                okText="Clear" okButtonProps={{ danger: true }} cancelText="Cancel"
                disabled={!activeTable || isOnlySlot}
              >
                <Tooltip title={isOnlySlot ? "Cannot remove the only slot" : "Clear slot"}>
                  <Button size="small" danger type="text" icon={<ClearOutlined />} disabled={!activeTable || isLoadingSlots || isOnlySlot} />
                </Tooltip>
              </Popconfirm>
            </Flex>
            <Button
              type="dashed" block size="small" icon={<PlusCircleOutlined />}
              loading={isLoadingSlots}
              style={{ marginTop: 8, borderColor: primaryColor, color: primaryColor, borderRadius: 6 }}
              onClick={() => openNewOrder()}
            >
              {isLoadingSlots ? "Creating…" : addOrderLabel}
            </Button>
          </div>
        )}

        {/* ── Header ────────────────────────────────────────────────────── */}
        <Flex align="center" justify="space-between" wrap="wrap" gap={6} style={{ marginBottom: 10 }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <OrderedListOutlined style={{ color: primaryColor, fontSize: 13 }} />
            <Text strong style={{ fontSize: 12, color: primaryColor }}>
              {orderNumber?.toLocaleUpperCase() || "NO ORDER"}
            </Text>
          </div>
          <Flex gap={6} align="center">
            <TransferBillModal data={data} />
            <Button
              type="primary" size="small" icon={<SwitcherOutlined />}
              style={{ background: primaryColor, borderColor: primaryColor, borderRadius: 6, fontSize: 12 }}
            >
              {slotLabel}
            </Button>
          </Flex>
        </Flex>

        {/* ── Cart date ─────────────────────────────────────────────────── */}
        {cartCreatedDate && (
          <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: 8, padding: "6px 10px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarOutlined style={{ color: "#eab308", fontSize: 14 }} />
            <Text style={{ fontSize: 12, color: "#854d0e" }}>Cart created: {cartCreatedDate}</Text>
          </div>
        )}

        {/* ── Customer banner ───────────────────────────────────────────── */}
        {customerDetails && (
          <Flex
            align="center"
            gap={8}
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              padding: "8px 10px",
              marginBottom: 10,
            }}
          >
            {/* Avatar */}
            <Avatar
              size={28}
              icon={<UserOutlined />}
              style={{ background: primaryColor, flexShrink: 0 }}
            />

            {/* Customer info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ fontSize: 13, display: "block", lineHeight: 1.3 }}>
                {customerDetails.customer_name || "Customer"}
              </Text>
              {customerDetails.customer_phone && (
                <Text style={{ fontSize: 11, color: "#64748b" }}>
                  {customerDetails.customer_phone}
                  {customerDetails.customer_email ? ` · ${customerDetails.customer_email}` : ""}
                </Text>
              )}
            </div>

            {/* Linked badge */}
            {customerDetails.customer_id && (
              <Tag
                color="success"
                style={{ fontSize: 10, borderRadius: 4, flexShrink: 0, margin: 0 }}
              >
                Linked
              </Tag>
            )}

            {/* ── Delink button — admin / cashier only ───────────────── */}
            {(user?.role === "admin" || user?.role === "cashier") && (
              <Popconfirm
                title="Remove customer from this order?"
                description="The order will continue as a walk-in. This cannot be undone."
                onConfirm={handleDelinkCustomer}
                okText="Remove"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                placement="topRight"
              >
                <Tooltip title="Remove customer">
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<UserDeleteOutlined style={{ fontSize: 14 }} />}
                    loading={delinkingCustomer}
                    style={{
                      flexShrink: 0,
                      borderRadius: 6,
                      padding: "0 6px",
                      height: 26,
                    }}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </Flex>
        )}

        {/* ── Column headers ────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 52px 80px 32px", gap: 4, padding: "4px 6px", background: "#f8fafc", borderRadius: 6, marginBottom: 6 }}>
          {["Item", "Qty", "Price", ""].map((h, i) => (
            <Text key={i} style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: 0.5, textTransform: "uppercase", textAlign: i > 0 ? "center" : "left" }}>
              {h}
            </Text>
          ))}
        </div>

        {/* ── Cart items ────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 8 }}>
          {loading
            ? Array.from({ length: data?.length || 3 }, (_, i) => <SkeletonCartItemCard key={i} />)
            : data?.map((item: { _id: Key | null | undefined | string }) => (
              <CartItemCardMemo key={item._id} cartItem={item} />
            ))}
          {loadingData && loading && <CartLoader />}
        </div>

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {!memoizedData?.length && !loading && (
          <div style={{ padding: "20px 0", textAlign: "center" }}>
            <Empty
              image="/basket.png"
              imageStyle={{ height: 64, opacity: 0.5 }}
              description={<Text style={{ fontSize: 13, color: "#94a3b8" }}>Add items to get started</Text>}
            />
            <Button
              type="dashed"
              icon={<PlusCircleOutlined />}
              onClick={() => setIsCustomItemModalOpen(true)}
              style={{ marginTop: 12, borderColor: primaryColor, color: primaryColor, borderRadius: 6 }}
            >
              Add Miscellaneous Item
            </Button>
          </div>
        )}

        {/* ── Order summary ─────────────────────────────────────────────── */}
        {memoizedData?.length > 0 && (
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px", marginBottom: 10, border: "1px solid #e2e8f0" }}>

            {cartDetails?.tip_amount && (
              <>
                <SummaryRow
                  label={<><RestOutlined style={{ marginRight: 4 }} />Tip</>}
                  value={cartDetails.tip_type === "amount" ? fmtKsh(cartDetails.tip_amount) : `${cartDetails.tip_amount}%`}
                />
                <Divider style={{ margin: "6px 0" }} />
              </>
            )}

            {discountAmount > 0 ? (
              <>
                <SummaryRow label="Subtotal" value={fmtKsh(grossBeforeDiscount)} muted />
                <SummaryRow
                  label={
                    <Flex align="center" gap={6}>
                      Discount
                      <Tag color="success" style={{ fontSize: 10, margin: 0, borderRadius: 4 }}>
                        {cartDetails.discount_type === "percentage"
                          ? `${cartDetails.discount}% off`
                          : fmtKsh(cartDetails.discount)}
                      </Tag>
                    </Flex>
                  }
                  value={`- ${fmtKsh(discountAmount)}`}
                  accent="#10b981"
                  muted
                />
              </>
            ) : (
              <SummaryRow label="Subtotal" value={fmtKsh(grandTotal)} muted />
            )}

            <SummaryRow label="VAT" value={fmtKsh(displayVat)} muted />

            <Divider style={{ margin: "8px 0" }} />

            <SummaryRow
              label="Amount Due"
              value={fmtKsh(grandTotal)}
              strong
              accent={primaryColor}
            />

            {/* ── Print status badge ────────────────────────────────────── */}
            <Divider style={{ margin: "8px 0" }} />
            <PrintStatusBadge
              isReprint={isReprint}
              printsRemaining={printsRemaining}
              statusLoading={statusLoading}
              primaryColor={primaryColor}
            />

            {/* ── Served by ─────────────────────────────────────────────── */}
            {editingServedBy ? (
              <div style={{ background: `${primaryColor}08`, border: `1px solid ${primaryColor}40`, borderRadius: 8, padding: "8px 10px" }}>
                <Text style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                  <SmileFilled style={{ color: "#fbbf24", marginRight: 4 }} />
                  Assign staff members
                </Text>
                <Flex align="center" gap={6}>
                  <Select
                    mode="multiple"
                    size="middle" style={{ flex: 1 }}
                    loading={loadingStaff || updatingServedBy}
                    disabled={updatingServedBy}
                    value={servedByIds}
                    options={staffList}
                    placeholder={loadingStaff ? "Loading…" : staffList.length === 0 ? "No staff found" : "Select staff members"}
                    onChange={handleServedByChange}
                    autoFocus
                  />
                  <Button size="middle" onClick={() => setEditingServedBy(false)} disabled={updatingServedBy} style={{ borderRadius: 6 }}>
                    Cancel
                  </Button>
                </Flex>
              </div>
            ) : (
              <div
                onClick={() => (user?.role === "admin" || user?.role === "cashier") && cartDetails?._id && setEditingServedBy(true)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px",
                  cursor: (user?.role === "admin" || user?.role === "cashier") && cartDetails?._id ? "pointer" : "default",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => {
                  if ((user?.role === "admin" || user?.role === "cashier") && cartDetails?._id) {
                    (e.currentTarget as HTMLDivElement).style.borderColor = primaryColor;
                    (e.currentTarget as HTMLDivElement).style.background = `${primaryColor}06`;
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0";
                  (e.currentTarget as HTMLDivElement).style.background = "#fff";
                }}
              >
                <Flex align="center" gap={6}>
                  <SmileFilled style={{ color: "#fbbf24", fontSize: 14 }} />
                  <div>
                    <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", lineHeight: 1.2 }}>Served by</Text>
                    <Flex align="center" gap={4}>
                      <Text style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>
                        {(() => {
                          const servedBy = cartDetails?.served_by;
                          if (!servedBy || (Array.isArray(servedBy) && servedBy.length === 0)) {
                            return cartDetails?.created_by?.username || "Staff";
                          }
                          if (Array.isArray(servedBy)) {
                            if (servedBy.length === 0) return cartDetails?.created_by?.username || "Staff";
                            if (servedBy.length === 1) return servedBy[0]?.username || servedBy[0]?.fullname || "Staff";
                            return `${servedBy[0]?.username || servedBy[0]?.fullname || "Staff"}`;
                          }
                          return servedBy?.username || servedBy?.fullname || cartDetails?.created_by?.username || "Staff";
                        })()}
                      </Text>
                      {Array.isArray(cartDetails?.served_by) && cartDetails.served_by.length > 1 && (
                        <Tag style={{ fontSize: 10, borderRadius: 4, margin: 0, padding: "0 6px" }}>
                          +{cartDetails.served_by.length - 1}
                        </Tag>
                      )}
                    </Flex>
                  </div>
                </Flex>
                {(user?.role === "admin" || user?.role === "cashier") && cartDetails?._id && (
                  <Flex
                    align="center" gap={4}
                    style={{ background: `${primaryColor}15`, border: `1px solid ${primaryColor}40`, borderRadius: 6, padding: "3px 8px", color: primaryColor, fontSize: 11, fontWeight: 600, pointerEvents: "none" }}
                  >
                    <EditOutlined style={{ fontSize: 11 }} />
                    Change
                  </Flex>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Action buttons ────────────────────────────────────────────── */}
        {memoizedData?.length > 0 && (
          <Space direction="vertical" style={{ width: "100%" }} size={8}>
            <Flex gap={8} wrap="wrap">
              <ClientPin cart={cartDetails} />
         
                <Button
                  icon={<PlusCircleOutlined />}
                  onClick={() => setIsCustomItemModalOpen(true)}
                  style={{ borderColor: primaryColor, color: primaryColor, borderRadius: 6 }}
                >
                  Add Miscellaneous Item
                </Button>
          
              {showSendButton && (
                <Button
                  icon={<SendOutlined />}
                  loading={sendingToPrinter}
                  disabled={!data?.length}
                  onClick={handleSendToPrinter}
                  style={{ borderColor: "#f97316", color: "#f97316", borderRadius: 6 }}
                >
                  Send
                </Button>
              )}
              {isSpa ? (
                <PrintBillSpaModal
                  cartDetails={cartDetails}
                  data={data}
                  {...printProps}
                />
              ) : (
                <PrintBillModal
                  cartDetails={cartDetails}
                  data={data}
                  {...printProps}
                />
              )}
              {(user?.role === "admin" || user?.role === "cashier") && (
                <DiscountModal data={cartDetails} />
              )}
            </Flex>
            {user?.role === "admin" && (
              <Popconfirm
                title="Clear all items?"
                description="This will remove everything from the cart."
                onConfirm={() => dispatch(deleteAllCartItems(cartDetails?._id))}
                okText="Clear" okButtonProps={{ danger: true }} cancelText="Cancel"
              >
                <Button danger block size="small" icon={<CloseCircleOutlined />} style={{ borderRadius: 6 }}>
                  Clear Cart
                </Button>
              </Popconfirm>
            )}
          </Space>
        )}
      </div>

      {/* ── Sticky checkout footer ────────────────────────────────────────── */}
      {canCheckout && (
        <div style={{ flexShrink: 0, padding: "10px 14px", borderTop: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 -2px 8px rgba(0,0,0,0.04)" }}>
          <PaymentDrawer customerDetails={customerDetails} />
        </div>
      )}

      {/* ── Custom Item Modal ─────────────────────────────────────────────── */}
      <Modal
        open={isCustomItemModalOpen}
        onCancel={() => {
          setIsCustomItemModalOpen(false);
          customItemForm.resetFields();
        }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PlusCircleOutlined style={{ color: primaryColor }} />
            <span>Add Miscellaneous Item</span>
          </div>
        }
        onOk={handleAddCustomItem}
        confirmLoading={customItemLoading}
        okText="Add Item"
        cancelText="Cancel"
        width={500}
      >
        <Form form={customItemForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Item Name"
            rules={[{ required: true, message: "Please enter item name" }]}
          >
            <Input placeholder="e.g., Custom Service Fee" />
          </Form.Item>
          <Form.Item
            name="main_category"
            label="Main Category"
            rules={[{ required: true, message: "Please select main category" }]}
          >
            <Select
              placeholder="Select main category"
              options={mainCategories}
              loading={!mainCategories.length}
            />
          </Form.Item>
          <Form.Item
            name="price"
            label="Price"
            rules={[{ required: true, message: "Please enter price" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              precision={2}
              placeholder="0.00"
              prefix="KES"
            />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[{ required: true, message: "Please enter quantity" }]}
            initialValue={1}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={1}
              precision={0}
            />
          </Form.Item>
          <Form.Item
            name="notes"
            label="Notes (Optional)"
          >
            <Input.TextArea
              rows={2}
              placeholder="Add any additional notes..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CartDrawer;