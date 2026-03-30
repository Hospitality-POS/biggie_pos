import React, { Key, useEffect, useMemo, useState } from "react";
import CartItemCard from "./CartItemCard";
import PrintBillModal from "../MODALS/PrintBillModal";
import PrintBillSpaModal from "../MODALS/printBillSpaModal";
import { deleteAllCartItems, getCart } from "../../features/Cart/CartActions";
import { updateCart as updateCartService } from "../../services/cart";
import PaymentDrawer from "../payment/PaymentDrawer";
import SkeletonCartItemCard from "./SkeletonCartItemCard";
import { useAppDispatch, useAppSelector } from "../../store";
import { useNavigate, useParams } from "react-router-dom";
import CartLoader from "../spinner/cartLoader";
import { fetchAllUsersByShopId } from "../../services/users";
import {
  Button, Space, Typography, Tag, Empty, Divider,
  Flex, Avatar, Tooltip, Select, Popconfirm, Badge,
} from "antd";
import {
  ClearOutlined, CloseCircleOutlined, OrderedListOutlined,
  PlusCircleOutlined, RestOutlined, SmileFilled,
  SwitcherOutlined, UserOutlined, EditOutlined,
} from "@ant-design/icons";
import TransferBillModal from "@components/MODALS/pro/TransferBill";
import ClientPin from "@components/MODALS/ClientPin";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { usePOSMode } from "@context/POSModeContext";
import { useRetailQueue } from "@context/RetailQueueContext";

const { Text, Title } = Typography;

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtKsh = (v: number) =>
  `KSH ${v?.toLocaleString("en-KE", { minimumFractionDigits: 0 }) ?? "0"}`;

// ── Summary row ───────────────────────────────────────────────────────────────
const SummaryRow: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  strong?: boolean;
  accent?: string;
  strike?: boolean;
  muted?: boolean;
}> = ({ label, value, strong, accent, strike, muted }) => (
  <Flex align="center" justify="space-between" style={{ padding: "3px 0" }}>
    <Text
      style={{
        fontSize: strong ? 15 : 13,
        fontWeight: strong ? 700 : 400,
        color: muted ? "#94a3b8" : "#374151",
      }}
    >
      {label}
    </Text>
    <Text
      delete={strike}
      style={{
        fontSize: strong ? 15 : 13,
        fontWeight: strong ? 700 : 400,
        color: accent || (muted ? "#94a3b8" : "#374151"),
      }}
    >
      {value}
    </Text>
  </Flex>
);

// ── Main component ────────────────────────────────────────────────────────────
const CartDrawer: React.FC = () => {
  const [loadingData, setLoadingData] = useState(false);
  const [staffList, setStaffList] = useState<{ value: string; label: string }[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [editingServedBy, setEditingServedBy] = useState(false);
  const [updatingServedBy, setUpdatingServedBy] = useState(false);

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

  // Hospital and retail both resolve tableId from activeTable (slot/ward/bed)
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

  const discountAmount = useMemo(() => {
    if (!cartDetails?.discount) return 0;
    return cartDetails.discount_type === "percentage"
      ? subtotal * (cartDetails.discount / 100)
      : cartDetails.discount;
  }, [subtotal, cartDetails?.discount, cartDetails?.discount_type]);

  const orderNumber = useMemo(() => cartDetails?.order_no, [cartDetails?.order_no]);

  const customerDetails = useMemo(() => {
    if (cartDetails?.customer_id) {
      return {
        customer_id: cartDetails.customer_id,
        customer_name: cartDetails.client_name || null,
        customer_phone: cartDetails.client_pin || null,
        customer_email: cartDetails.client_email || null,
      };
    }
    if (cartDetails?.client_name || cartDetails?.client_pin) {
      return {
        customer_id: null,
        customer_name: cartDetails.client_name || null,
        customer_phone: cartDetails.client_pin || null,
        customer_email: cartDetails.client_email || null,
      };
    }
    return null;
  }, [cartDetails?.customer_id, cartDetails?.client_name, cartDetails?.client_pin, cartDetails?.client_email]);

  const servedById = useMemo(() => {
    const cb = cartDetails?.served_by ?? cartDetails?.created_by;
    if (!cb) return undefined;
    if (typeof cb === "string") return cb;
    if (typeof cb === "object" && cb._id) return cb._id;
    return undefined;
  }, [cartDetails?.served_by, cartDetails?.created_by]);

  // ── Slot label (context-aware) ─────────────────────────────────────────────
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

  // ── Fetch staff list ───────────────────────────────────────────────────────
  useEffect(() => {
    const loadStaff = async () => {
      setLoadingStaff(true);
      try {
        const users = await fetchAllUsersByShopId();
        const filtered = (users || [])
          .filter((u: any) => u.role !== "admin")
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
    const fetch = async () => {
      if (!tableId || tableId === "tables") return;
      setLoadingData(true);
      try {
        await dispatch(getCart(tableId));
        if (!isSlotMode && !data && !cartDetails) navigate("/tables");
      } catch (e) {
        console.error("cart error", e);
      } finally {
        setLoadingData(false);
      }
    };
    fetch();
  }, [dispatch, tableId, td?._id, isSlotMode, navigate]);

  const allSlots = useMemo(() =>
    (allLocations || []).flatMap((loc: any) =>
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

  // ── Handle served-by update ───────────────────────────────────────────────
  const handleServedByChange = async (newUserId: string) => {
    const cartId = cartDetails?._id ?? cartDetails?.id;
    if (!cartId) return;
    setUpdatingServedBy(true);
    try {
      await updateCartService(cartId, { served_by: newUserId });
      await dispatch(getCart(tableId));
      setEditingServedBy(false);
    } catch (e) {
      console.error("Failed to update served by", e);
    } finally {
      setUpdatingServedBy(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#fff",
        overflow: "hidden",
      }}
    >
      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
          scrollbarWidth: "thin",
          scrollbarColor: "#e2e8f0 transparent",
        }}
      >
        {/* ── Slot/ward switcher (retail + hospital) ────────────────────── */}
        {isSlotMode && (
          <div
            style={{
              background: `${primaryColor}0f`,
              border: `1px solid ${primaryColor}30`,
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 12,
            }}
          >
            <Text
              strong
              style={{
                fontSize: 11, color: primaryColor, letterSpacing: 0.8,
                textTransform: "uppercase", display: "block", marginBottom: 6,
              }}
            >
              {slotSectionLabel}
            </Text>
            <Flex align="center" gap={6}>
              <Select
                size="small"
                style={{ flex: 1, minWidth: 0 }}
                value={activeTable?._id}
                loading={isLoadingSlots}
                onChange={(v) => {
                  const slot = allSlots.find((s) => s.value === v);
                  if (slot) setActiveTable(slot.table);
                }}
                options={allSlots}
                placeholder="Select slot"
              />
              <Popconfirm
                title={clearSlotTitle}
                onConfirm={() => removeActiveSlot()}
                okText="Clear"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                disabled={!activeTable || isOnlySlot}
              >
                <Tooltip title={isOnlySlot ? "Cannot remove the only slot" : "Clear slot"}>
                  <Button
                    size="small" danger type="text" icon={<ClearOutlined />}
                    disabled={!activeTable || isLoadingSlots || isOnlySlot}
                  />
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

        {/* ── Header row ───────────────────────────────────────────────── */}
        <Flex align="center" justify="space-between" wrap="wrap" gap={6} style={{ marginBottom: 10 }}>
          <div
            style={{
              background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: 8, padding: "5px 10px",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
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

        {/* ── Customer banner ──────────────────────────────────────────── */}
        {customerDetails && (
          <Flex
            align="center" gap={8}
            style={{
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 8, padding: "8px 10px", marginBottom: 10,
            }}
          >
            <Avatar size={28} icon={<UserOutlined />}
              style={{ background: primaryColor, flexShrink: 0 }} />
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
            {customerDetails.customer_id && (
              <Tag color="success" style={{ fontSize: 10, borderRadius: 4, flexShrink: 0, margin: 0 }}>
                Linked
              </Tag>
            )}
          </Flex>
        )}

        {/* ── Column headers ───────────────────────────────────────────── */}
        <div
          style={{
            display: "grid", gridTemplateColumns: "1fr 52px 80px 32px",
            gap: 4, padding: "4px 6px",
            background: "#f8fafc", borderRadius: 6, marginBottom: 6,
          }}
        >
          {["Item", "Qty", "Price", ""].map((h, i) => (
            <Text
              key={i}
              style={{
                fontSize: 11, fontWeight: 600, color: "#94a3b8",
                letterSpacing: 0.5, textTransform: "uppercase",
                textAlign: i > 0 ? "center" : "left",
              }}
            >
              {h}
            </Text>
          ))}
        </div>

        {/* ── Cart items ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 8 }}>
          {loading
            ? Array.from({ length: data?.length || 3 }, (_, i) => <SkeletonCartItemCard key={i} />)
            : data?.map((item: { _id: Key | null | undefined | string }) => (
              <CartItemCardMemo key={item._id} cartItem={item} />
            ))}
          {loadingData && loading && <CartLoader />}
        </div>

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {!memoizedData?.length && !loading && (
          <div style={{ padding: "20px 0", textAlign: "center" }}>
            <Empty
              image="/basket.png"
              imageStyle={{ height: 64, opacity: 0.5 }}
              description={
                <Text style={{ fontSize: 13, color: "#94a3b8" }}>Add items to get started</Text>
              }
            />
          </div>
        )}

        {/* ── Order summary ─────────────────────────────────────────────── */}
        {memoizedData?.length > 0 && (
          <div
            style={{
              background: "#f8fafc", borderRadius: 10,
              padding: "10px 12px", marginBottom: 10,
              border: "1px solid #e2e8f0",
            }}
          >
            {cartDetails?.tip_amount && (
              <>
                <SummaryRow
                  label={<><RestOutlined style={{ marginRight: 4 }} />Tip</>}
                  value={
                    cartDetails.tip_type === "amount"
                      ? fmtKsh(cartDetails.tip_amount)
                      : `${cartDetails.tip_amount}%`
                  }
                />
                <Divider style={{ margin: "6px 0" }} />
              </>
            )}

            <SummaryRow label="Subtotal" value={fmtKsh(subtotal)} muted />

            {discountAmount > 0 && (
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
            )}

            <SummaryRow label="VAT" value={`KSH ${totalVatAmount}`} muted />
            <Divider style={{ margin: "8px 0" }} />
            <SummaryRow label="Amount Due" value={fmtKsh(grandTotal)} strong accent={primaryColor} />

            {/* ── Served by ──────────────────────────────────────────────── */}
            <Divider style={{ margin: "8px 0" }} />
            {editingServedBy ? (
              <div
                style={{
                  background: `${primaryColor}08`,
                  border: `1px solid ${primaryColor}40`,
                  borderRadius: 8, padding: "8px 10px",
                }}
              >
                <Text style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                  <SmileFilled style={{ color: "#fbbf24", marginRight: 4 }} />
                  Change staff member
                </Text>
                <Flex align="center" gap={6}>
                  <Select
                    size="middle" style={{ flex: 1 }}
                    loading={loadingStaff || updatingServedBy}
                    disabled={updatingServedBy}
                    value={staffList.find((s) => s.value === servedById) ? servedById : undefined}
                    options={staffList}
                    placeholder={loadingStaff ? "Loading…" : staffList.length === 0 ? "No staff found" : "Select staff"}
                    onChange={handleServedByChange}
                    autoFocus
                  />
                  <Button size="middle" onClick={() => setEditingServedBy(false)}
                    disabled={updatingServedBy} style={{ borderRadius: 6 }}>
                    Cancel
                  </Button>
                </Flex>
              </div>
            ) : (
              <div
                onClick={() =>
                  (user?.role === "admin" || user?.role === "cashier") &&
                  cartDetails?._id &&
                  setEditingServedBy(true)
                }
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "#fff", border: "1px solid #e2e8f0",
                  borderRadius: 8, padding: "8px 10px",
                  cursor: (user?.role === "admin" || user?.role === "cashier") && cartDetails?._id
                    ? "pointer" : "default",
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
                    <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", lineHeight: 1.2 }}>
                      Served by
                    </Text>
                    <Text style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>
                      {cartDetails?.served_by?.username || cartDetails?.created_by?.username || "Staff"}
                    </Text>
                  </div>
                </Flex>
                {(user?.role === "admin" || user?.role === "cashier") && cartDetails?._id && (
                  <Flex
                    align="center" gap={4}
                    style={{
                      background: `${primaryColor}15`, border: `1px solid ${primaryColor}40`,
                      borderRadius: 6, padding: "3px 8px",
                      color: primaryColor, fontSize: 11, fontWeight: 600,
                      pointerEvents: "none",
                    }}
                  >
                    <EditOutlined style={{ fontSize: 11 }} />
                    Change
                  </Flex>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Action buttons ───────────────────────────────────────────── */}
        {memoizedData?.length > 0 && (
          <Space direction="vertical" style={{ width: "100%" }} size={8}>
            <Flex gap={8} wrap="wrap">
              <ClientPin cart={cartDetails} />
              {isSpa ? (
                <PrintBillSpaModal cartDetails={cartDetails} data={data} />
              ) : (
                <PrintBillModal cartDetails={cartDetails} data={data} />
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

      {/* ── Sticky checkout footer ───────────────────────────────────────── */}
      {canCheckout && (
        <div
          style={{
            flexShrink: 0, padding: "10px 14px",
            borderTop: "1px solid #e2e8f0",
            background: "#fff", boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <PaymentDrawer customerDetails={customerDetails} />
        </div>
      )}
    </div>
  );
};

export default CartDrawer;