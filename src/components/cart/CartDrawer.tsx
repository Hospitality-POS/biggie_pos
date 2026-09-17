import React, { Key, useEffect, useMemo, useState } from "react";
import CartItemCard from "./CartItemCard";
import PrintBillModal from "../MODALS/PrintBillModal";
import {
  closeCartAfterPrint,
  createCart,
  deleteAllCartItems,
  getCart,
  fetchCartItems,
  updateCart,
} from "../../features/Cart/CartActions";
import { clearPendingPrint, setPendingPrint } from "../../features/PendingPrint/PendingPrintSlice";
import { updateCart as updateCartService } from "../../services/cart";
import PaymentDrawer from "../payment/PaymentDrawer";
import SkeletonCartItemCard from "./SkeletonCartItemCard";
import { useAppDispatch, useAppSelector } from "../../store";
import { useNavigate, useParams } from "react-router-dom";
import CartLoader from "../spinner/cartLoader";
import { useQuery } from "@tanstack/react-query";
import { fetchShop, sendCheckinInfo } from "../../services/shops";
import { getCustomerById, fetchAllCustomers } from "../../services/customers";
import {
  Alert,
  Button,
  Space,
  Typography,
  Empty,
  Flex,
  Tooltip,
  Select,
  Popconfirm,
  message,
} from "antd";
import {
  ClearOutlined,
  CloseCircleOutlined,
  OrderedListOutlined,
  PlusCircleOutlined,
  SwitcherOutlined,
  CalendarOutlined,
  SendOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import TransferBillModal from "@components/MODALS/pro/TransferBill";
import ClientPin from "@components/MODALS/ClientPin";
import DiscountModal from "@components/MODALS/pro/DiscountModal";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { usePOSMode } from "@context/POSModeContext";
import { useRetailQueue } from "@context/RetailQueueContext";
import { usePrintDocument, DocumentType } from "../MODALS/Hooks/usePrintDocument";
import useSystemDetails from "@hooks/useSystemDetails";
import { sendPrintFromCart } from "@services/printAgent";
import dayjs from "dayjs";

import CartCustomerBanner from "./components/CartCustomerBanner";
import CartSummary from "./components/CartSummary";
import CustomItemModal from "./components/CustomItemModal";
import StaffEarningsModal from "./components/StaffEarningsModal";
import StaffAssignModal from "./components/StaffAssignModal";

const { Text } = Typography;

const formatCartDate = (dateString: string) => {
  if (!dateString) return null;
  const d = dayjs(dateString);
  if (!d.isValid()) return null;
  if (d.isSame(dayjs(), "day")) return `Today at ${d.format("hh:mm A")}`;
  if (d.isSame(dayjs().subtract(1, "day"), "day")) return `Yesterday at ${d.format("hh:mm A")}`;
  return d.format("MMM D, YYYY hh:mm A");
};

const CartDrawer: React.FC = () => {
  const [loadingData, setLoadingData] = useState(false);
  const [editingServedBy, setEditingServedBy] = useState(false);
  const [updatingServedBy, setUpdatingServedBy] = useState(false);
  const [delinkingCustomer, setDelinkingCustomer] = useState(false);
  const [sendingToPrinter, setSendingToPrinter] = useState(false);
  const [showSendButton, setShowSendButton] = useState(false);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [sendingHotelInfo, setSendingHotelInfo] = useState(false);
  const [earningsModalOpen, setEarningsModalOpen] = useState(false);
  const [closingPendingPrint, setClosingPendingPrint] = useState(false);

  const documentType: DocumentType = "bill";

  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const shopId = localStorage.getItem("shopId");
  const { staff_earning_enabled } = useSystemDetails();

  const { data: shopData } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const isHotelMode = shopData?.pos_mode === "hotel";

  const {
    cartDetails,
    subtotal,
    totalVatAmount,
    grandTotal,
    cartItems: data,
    loading,
  } = useAppSelector((s) => s.cart);
  const { user } = useAppSelector((s) => s.auth);
  const { tableData: td } = useAppSelector((s) => s.Tables);
  const pendingPrintSnapshot = useAppSelector((s) => s.pendingPrint.snapshot);

  const { data: customerData } = useQuery({
    queryKey: ["customer", cartDetails?.customer_id],
    queryFn: async () => {
      const customerId = cartDetails?.customer_id;
      if (!customerId) return null;

      if (typeof customerId === "object" && customerId !== null && customerId._id) {
        try {
          return await getCustomerById(customerId._id);
        } catch (error) {
          console.error("Failed to fetch customer by _id from object:", { customerId, error });
          return customerId;
        }
      }

      if (typeof customerId === "string" && customerId.startsWith("CUST-")) {
        const result = await fetchAllCustomers({ code: customerId });
        return Array.isArray(result) && result.length > 0 ? result[0] : null;
      }

      try {
        return await getCustomerById(customerId);
      } catch (error) {
        console.error("Failed to fetch customer by ID:", { customerId, error });
        return null;
      }
    },
    enabled: !!cartDetails?.customer_id,
  });

  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const { isRetailMode, isHospitalMode } = usePOSMode();
  const {
    activeTable,
    allLocations,
    isLoadingSlots,
    setActiveTable,
    openNewOrder,
    removeActiveSlot,
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

  const discountAmount = useMemo(() => {
    if (!cartDetails?.discount || cartDetails.discount <= 0) return 0;
    if (cartDetails.discount_type === "percentage") {
      return parseFloat(((subtotal * cartDetails.discount) / 100).toFixed(2));
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
  }, [
    cartDetails?.customer_id,
    cartDetails?.client_name,
    cartDetails?.client_pin,
    cartDetails?.client_email,
    cartDetails?.client_phone,
  ]);

  const servedByIds = useMemo(() => {
    const cb = cartDetails?.served_by ?? cartDetails?.created_by;
    if (!cb) return [];
    if (Array.isArray(cb)) {
      return cb.map((u: any) => (typeof u === "string" ? u : u?._id)).filter(Boolean);
    }
    if (typeof cb === "object" && cb._id) return [cb._id];
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
    const savedCaptainOrder = localStorage.getItem("captain_order_enabled");
    setShowSendButton(savedCaptainOrder === "true");
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
    const shopIdValue = localStorage.getItem("shopId") ?? "";
    const companyCode = localStorage.getItem("companyCode") ?? "";

    try {
      await sendPrintFromCart(cartId, shopIdValue, companyCode);
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
        const isCartId = window.location.pathname.includes("/cart/cart/");
        if (isCartId) {
          await dispatch(fetchCartItems(tableId));
        } else {
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
    () =>
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

  // ── Restrict printing the bill until payment is completed (applies to everyone) ──
  const requirePaymentBeforePrint = !!shopData?.require_payment_before_print;
  // True when the cart currently shown here is the exact one that was just
  // paid for and is awaiting print — it's deliberately left untouched (not
  // cleared/replaced) until the cashier explicitly closes the print prompt.
  // The backend keeps such carts "Open" with pending_print=true, so this also
  // covers the state after a page refresh or on another device.
  const isAwaitingPrintCart =
    (!!pendingPrintSnapshot &&
      !!cartDetails?._id &&
      pendingPrintSnapshot.cartDetails?._id === cartDetails._id) ||
    !!cartDetails?.pending_print;
  const printLocked =
    requirePaymentBeforePrint && (data?.length ?? 0) > 0 && !isAwaitingPrintCart;

  // If the page was refreshed (or the cart opened elsewhere) while a paid cart
  // is still awaiting its bill print, rebuild the pending-print snapshot from
  // the live cart so the global print/close prompt comes back. Independent of
  // the shop toggle so a cart left pending can always be closed afterwards.
  useEffect(() => {
    if (cartDetails?.pending_print && !pendingPrintSnapshot && (data?.length ?? 0) > 0) {
      dispatch(
        setPendingPrint({
          cartDetails,
          data: data ?? [],
          subtotal,
          totalVatAmount,
          grandTotal,
        })
      );
    }
  }, [cartDetails, pendingPrintSnapshot, data, subtotal, totalVatAmount, grandTotal, dispatch]);

  // Explicit "Close" on the paid cart: this is the ONLY place the cart/table
  // is torn down after a held payment. Closes the paid cart on the backend
  // (frees the table), then starts the next cart for the table — mirroring
  // what payment normally does when the setting is off.
  const handleClosePendingPrint = async () => {
    const cartId = pendingPrintSnapshot?.cartDetails?._id || cartDetails?._id;
    const table =
      pendingPrintSnapshot?.cartDetails?.table_id?._id ||
      pendingPrintSnapshot?.cartDetails?.table_id ||
      cartDetails?.table_id?._id ||
      cartDetails?.table_id;
    setClosingPendingPrint(true);
    try {
      if (cartId) {
        await dispatch(closeCartAfterPrint(cartId)).unwrap();
      }
      if (table) {
        await dispatch(
          createCart({ table_id: table, created_by: user?.id || user?._id } as any)
        ).unwrap();
        await dispatch(getCart(table)).unwrap();
      }
      // Only drop the pending state after the backend work succeeded.
      dispatch(clearPendingPrint());
    } catch (e: any) {
      message.error(typeof e === "string" ? e : e?.message || "Failed to close the cart");
    } finally {
      setClosingPendingPrint(false);
    }
  };

  const canCheckout =
    (user?.role === "admin" || user?.role === "cashier") &&
    (data?.length ?? 0) > 0 &&
    !isAwaitingPrintCart;

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

  const handleDelinkCustomer = async () => {
    const cartId = cartDetails?._id;
    if (!cartId) return;
    setDelinkingCustomer(true);
    try {
      const updateData = {
        customer_id: null,
        client_name: null,
        client_pin: null,
        client_email: null,
        client_phone: null,
      };
      await dispatch(updateCart({ cart: cartDetails, data: updateData } as any));
      message.success("Customer delinked successfully");
    } catch (e) {
      console.error("Failed to delink customer", e);
      message.error("Failed to delink customer");
    } finally {
      setDelinkingCustomer(false);
    }
  };

  const handleResendHotelInfo = async () => {
    if (!shopId || !customerDetails) {
      message.error("Missing required information");
      return;
    }

    setSendingHotelInfo(true);
    try {
      const customerName =
        customerData?.fullname ||
        customerData?.customer_name ||
        customerDetails.customer_name ||
        "";
      const customerEmail = customerData?.email || customerDetails.customer_email;
      const customerPhone = customerData?.phone || customerDetails.customer_phone;
      const roomNumber =
        activeTable?.name || cartDetails?.table_id?.name || cartDetails?.table_id;

      await sendCheckinInfo({
        shop_id: shopId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        room_number: roomNumber,
      });
      message.success("Hotel check-in information resent successfully");
    } catch (error) {
      console.error("Failed to resend hotel info:", error);
      message.error("Failed to resend hotel information");
    } finally {
      setSendingHotelInfo(false);
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
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
          scrollbarWidth: "thin",
          scrollbarColor: "#e2e8f0 transparent",
        }}
      >
        {/* Slot switcher */}
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
                fontSize: 11,
                color: primaryColor,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                display: "block",
                marginBottom: 6,
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
                    size="small"
                    danger
                    type="text"
                    icon={<ClearOutlined />}
                    disabled={!activeTable || isLoadingSlots || isOnlySlot}
                  />
                </Tooltip>
              </Popconfirm>
            </Flex>
            <Button
              type="dashed"
              block
              size="small"
              icon={<PlusCircleOutlined />}
              loading={isLoadingSlots}
              style={{
                marginTop: 8,
                borderColor: primaryColor,
                color: primaryColor,
                borderRadius: 6,
              }}
              onClick={() => openNewOrder()}
            >
              {isLoadingSlots ? "Creating…" : addOrderLabel}
            </Button>
          </div>
        )}

        {/* Order Header */}
        <Flex
          align="center"
          justify="space-between"
          wrap="wrap"
          gap={6}
          style={{ marginBottom: 10 }}
        >
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "5px 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
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
              type="primary"
              size="small"
              icon={<SwitcherOutlined />}
              style={{
                background: primaryColor,
                borderColor: primaryColor,
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              {slotLabel}
            </Button>
          </Flex>
        </Flex>

        {/* Cart created date */}
        {cartCreatedDate && (
          <div
            style={{
              background: "#fefce8",
              border: "1px solid #fde047",
              borderRadius: 8,
              padding: "6px 10px",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CalendarOutlined style={{ color: "#eab308", fontSize: 14 }} />
            <Text style={{ fontSize: 12, color: "#854d0e" }}>
              Cart created: {cartCreatedDate}
            </Text>
          </div>
        )}

        {/* Customer Banner */}
        <CartCustomerBanner
          customerDetails={customerDetails}
          primaryColor={primaryColor}
          userRole={user?.role}
          isHotelMode={isHotelMode}
          delinkingCustomer={delinkingCustomer}
          onDelinkCustomer={handleDelinkCustomer}
          sendingHotelInfo={sendingHotelInfo}
          onResendHotelInfo={handleResendHotelInfo}
        />

        {/* Column headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 96px 74px minmax(36px, auto)",
            gap: 6,
            padding: "6px 10px",
            background: "#f8fafc",
            borderRadius: 6,
            marginBottom: 6,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#94a3b8",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              textAlign: "left",
            }}
          >
            Item
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#94a3b8",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            Qty
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#94a3b8",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              textAlign: "right",
            }}
          >
            Price
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#94a3b8",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              textAlign: "center",
            }}
          />
        </div>

        {/* Cart items */}
        <div style={{ marginBottom: 8 }}>
          {loading
            ? Array.from({ length: data?.length || 3 }, (_, i) => (
                <SkeletonCartItemCard key={i} />
              ))
            : data?.map((item: { _id: Key | null | undefined | string }) => (
                <CartItemCardMemo key={item._id} cartItem={item} />
              ))}
          {loadingData && loading && <CartLoader />}
        </div>

        {/* Empty state */}
        {!memoizedData?.length && !loading && (
          <div style={{ padding: "20px 0", textAlign: "center" }}>
            <Empty
              image="/basket.png"
              imageStyle={{ height: 64, opacity: 0.5 }}
              description={
                <Text style={{ fontSize: 13, color: "#94a3b8" }}>Add items to get started</Text>
              }
            />
            <Button
              type="dashed"
              icon={<PlusCircleOutlined />}
              onClick={() => setIsCustomItemModalOpen(true)}
              style={{
                marginTop: 12,
                borderColor: primaryColor,
                color: primaryColor,
                borderRadius: 6,
              }}
            >
              Add Custom Item
            </Button>
          </div>
        )}

        {/* Order summary */}
        {memoizedData?.length > 0 && (
          <CartSummary
            cartDetails={cartDetails}
            subtotal={subtotal}
            grandTotal={grandTotal}
            discountAmount={discountAmount}
            grossBeforeDiscount={grossBeforeDiscount}
            displayVat={displayVat}
            primaryColor={primaryColor}
            isReprint={isReprint}
            printsRemaining={printsRemaining}
            statusLoading={statusLoading}
            staffEarningEnabled={staff_earning_enabled}
            userRole={user?.role}
            onOpenEarningsModal={() => setEarningsModalOpen(true)}
            onOpenAssignStaffModal={() => setEditingServedBy(true)}
          />
        )}

        {/* Action buttons */}
        {memoizedData?.length > 0 && (
          <Space direction="vertical" style={{ width: "100%" }} size={8}>
            {isAwaitingPrintCart ? (
              <>
                {/* Paid cart awaiting bill print — message on top, then the
                    print and close actions in one equal-width row. */}
                <Alert
                  type="success"
                  showIcon
                  icon={<PrinterOutlined />}
                  message={`Payment complete${orderNumber ? ` for ${orderNumber.toLocaleUpperCase()}` : ""} — print the bill below.`}
                  style={{ borderRadius: 8 }}
                />
                <Flex gap={8} style={{ width: "100%" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <PrintBillModal
                      cartDetails={cartDetails}
                      data={data}
                      isSpa={isSpa}
                      printLocked={false}
                      triggerBlock
                      {...printProps}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Popconfirm
                      title="Close this order?"
                      description="This closes the paid cart and frees the table for a new order. Make sure you've printed the bill first."
                      okText="Close"
                      cancelText="Cancel"
                      onConfirm={handleClosePendingPrint}
                    >
                      <Button
                        danger
                        block
                        loading={closingPendingPrint}
                        style={{ borderRadius: 6 }}
                      >
                        Close Order
                      </Button>
                    </Popconfirm>
                  </div>
                </Flex>
              </>
            ) : (
              <Flex
                gap={8}
                wrap="wrap"
                justify="space-evenly"
                align="center"
                style={{ width: "100%" }}
              >
                <ClientPin cart={cartDetails} />
                <Button
                  icon={<PlusCircleOutlined />}
                  onClick={() => setIsCustomItemModalOpen(true)}
                  style={{ borderColor: primaryColor, color: primaryColor, borderRadius: 6 }}
                >
                  Custom Item
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
                <PrintBillModal
                  cartDetails={cartDetails}
                  data={data}
                  isSpa={isSpa}
                  printLocked={printLocked}
                  {...printProps}
                />
                {(user?.role === "admin" || user?.role === "cashier") && (
                  <DiscountModal data={cartDetails} />
                )}
              </Flex>
            )}
            {user?.role === "admin" && !isAwaitingPrintCart && (
              <Popconfirm
                title="Clear all items?"
                description="This will remove everything from the cart."
                onConfirm={() => dispatch(deleteAllCartItems(cartDetails?._id))}
                okText="Clear"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
              >
                <Button
                  danger
                  block
                  size="middle"
                  icon={<CloseCircleOutlined />}
                  style={{ borderRadius: 6 }}
                >
                  Clear Cart
                </Button>
              </Popconfirm>
            )}
          </Space>
        )}
      </div>

      {/* Sticky checkout footer — hidden while the paid cart awaits print;
          the print/close controls for it sit in the action area above. */}
      {canCheckout && (
        <div
          style={{
            flexShrink: 0,
            padding: "10px 14px",
            paddingBottom: "max(10px, env(safe-area-inset-bottom))",
            borderTop: "1px solid #e2e8f0",
            background: "#fff",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <PaymentDrawer
            customerDetails={customerDetails}
            holdForPrint={requirePaymentBeforePrint}
          />
        </div>
      )}

      {/* Custom Item Modal */}
      <CustomItemModal
        open={isCustomItemModalOpen}
        onClose={() => setIsCustomItemModalOpen(false)}
        cartId={cartDetails?._id}
        userId={user?._id}
        primaryColor={primaryColor}
        onSuccess={() => {
          if (tableId) dispatch(getCart(tableId));
        }}
      />

      {/* Staff Earnings Modal */}
      <StaffEarningsModal
        open={earningsModalOpen}
        onClose={() => setEarningsModalOpen(false)}
        cartDetails={cartDetails}
        grandTotal={grandTotal}
        primaryColor={primaryColor}
        onSuccess={() => {
          if (tableId) dispatch(getCart(tableId));
        }}
      />

      {/* Staff Assign Modal */}
      <StaffAssignModal
        open={editingServedBy}
        onClose={() => setEditingServedBy(false)}
        servedByIds={servedByIds}
        onSave={handleServedByChange}
        updating={updatingServedBy}
      />
    </div>
  );
};

export default CartDrawer;