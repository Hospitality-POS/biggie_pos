import React, { Key, useEffect, useMemo, useState } from "react";
import CartItemCard from "./CartItemCard";
import PrintBillModal from "../MODALS/PrintBillModal";
import PrintBillSpaModal from "../MODALS/printBillSpaModal";
import {
  deleteAllCartItems,
  getCart,
} from "../../features/Cart/CartActions";
import PaymentDrawer from "../payment/PaymentDrawer";
import SkeletonCartItemCard from "./SkeletonCartItemCard";
import { useAppDispatch, useAppSelector } from "../../store";
import { useNavigate, useParams } from "react-router-dom";
import CartLoader from "../spinner/cartLoader";
import {
  Button, Space, Typography, Tag, Empty, Divider,
  Flex, Avatar, Tooltip, Select, Popconfirm,
} from "antd";
import {
  ClearOutlined,
  CloseCircleOutlined,
  OrderedListOutlined,
  PlusCircleOutlined,
  RestOutlined,
  SmileFilled,
  SwitcherOutlined,
  UserOutlined,
} from "@ant-design/icons";
import TransferBillModal from "@components/MODALS/pro/TransferBill";
import ClientPin from "@components/MODALS/ClientPin";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { ProCard } from "@ant-design/pro-components";
import { usePOSMode } from "@context/POSModeContext";
import { useRetailQueue } from "@context/RetailQueueContext";

const CartDrawer: React.FC = () => {
  const [loadingData, setLoadingData] = useState(false);
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const {
    cartDetails,
    subtotal,
    totalVatAmount,
    grandTotal,
    cartItems: data,
    loading,
  } = useAppSelector((state) => state.cart);
  const { user } = useAppSelector((state) => state.auth);

  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { tableData: td } = useAppSelector((state) => state.Tables);
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const { isRetailMode } = usePOSMode();
  const {
    activeTable,
    allLocations,
    isLoadingSlots,
    setActiveTable,
    openNewOrder,
    removeActiveSlot,
  } = useRetailQueue();

  const tableId = useMemo(() => {
    if (isRetailMode) return activeTable?._id;
    return id && id !== "tables" ? id : null;
  }, [isRetailMode, activeTable?._id, id]);

  // Total slots currently in queue
  const totalQueueSlots = useMemo(() => {
    return (allLocations || []).reduce((acc, loc) => acc + (loc.tables?.length || 0), 0);
  }, [allLocations]);

  const CartItemCardMemo = React.memo(CartItemCard);
  const memoizedData = useMemo(() => data, [data]);

  const discountAmount = useMemo(() => {
    if (!cartDetails?.discount) return 0;
    if (cartDetails?.discount_type === "percentage") {
      return subtotal * (cartDetails?.discount / 100);
    }
    return cartDetails?.discount;
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
  }, [
    cartDetails?.customer_id,
    cartDetails?.client_name,
    cartDetails?.client_pin,
    cartDetails?.client_email,
  ]);

  useEffect(() => {
    const dispatchFetchCart = async () => {
      if (!tableId || tableId === "tables") return;
      setLoadingData(true);
      try {
        await dispatch(getCart(tableId));
        if (!isRetailMode && !data && !cartDetails) {
          navigate("/tables");
        }
      } catch (error) {
        console.error("cart error", error);
      } finally {
        setLoadingData(false);
      }
    };
    dispatchFetchCart();
  }, [dispatch, tableId, td?._id, isRetailMode, navigate]);

  const allSlots = useMemo(() => {
    return (allLocations || []).flatMap((loc: any) =>
      (loc.tables || []).map((t: any) => ({
        value: t._id,
        label: `${loc.name} · ${t.name}`,
        table: t,
      }))
    );
  }, [allLocations]);

  const handleSlotSwitch = (tableSlotId: string) => {
    const slot = allSlots.find(s => s.value === tableSlotId);
    if (slot) setActiveTable(slot.table);
  };

  const isOnlySlot = totalQueueSlots <= 1;

  return (
    <ProCard
      bordered
      type="inner"
      style={{ overflow: "hidden", overflowY: "auto" }}
      bodyStyle={{ backgroundColor: "white" }}
    >
      <Space direction="vertical" style={{ width: "100%" }}>

        {/* ── Retail: slot switcher ──────────────────────────────────────── */}
        {isRetailMode && (
          <div style={{
            background: `${primaryColor}12`,
            border: `1px solid ${primaryColor}30`,
            borderRadius: 8,
            padding: "8px 10px",
            marginBottom: 4,
          }}>
            <Flex align="center" justify="space-between" gap={8}>
              <Typography.Text
                strong
                style={{ fontSize: 12, color: primaryColor, whiteSpace: 'nowrap' }}
              >
                Active Slot
              </Typography.Text>
              <Select
                size="small"
                style={{ flex: 1 }}
                value={activeTable?._id}
                loading={isLoadingSlots}
                onChange={handleSlotSwitch}
                options={allSlots}
                placeholder="Select slot"
              />

              {/* ── Clear slot button — disabled when only one slot ── */}
              <Popconfirm
                title={`Clear "${activeTable?.name}"?`}
                description="This will empty the cart and free up this slot."
                onConfirm={() => removeActiveSlot()}
                okText="Clear"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                disabled={!activeTable || isOnlySlot}
              >
                <Tooltip title={isOnlySlot ? "Cannot remove the only slot" : "Clear this slot"}>
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
              style={{ marginTop: 8, borderColor: primaryColor, color: primaryColor }}
              onClick={() => openNewOrder()}
            >
              {isLoadingSlots ? 'Creating slot...' : 'Open Another Order'}
            </Button>
          </div>
        )}

        {/* ── Top row ───────────────────────────────────────────────────── */}
        <Space style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
          <Button
            style={{ color: primaryColor, borderColor: primaryColor }}
            icon={<OrderedListOutlined />}
          >
            {orderNumber?.toLocaleUpperCase() || "NO ORDER"}
          </Button>

          <TransferBillModal data={data} />

          <Button type="primary" icon={<SwitcherOutlined />}>
            {isRetailMode ? activeTable?.name || 'No Slot' : td?.name || 'No Table'}
          </Button>
        </Space>

        {/* ── Customer info banner ──────────────────────────────────────── */}
        {customerDetails && (
          <Flex
            align="center"
            gap={8}
            style={{
              backgroundColor: "#f6ffed",
              border: "1px solid #b7eb8f",
              borderRadius: 6,
              padding: "6px 10px",
            }}
          >
            <Avatar
              size="small"
              icon={<UserOutlined />}
              style={{ backgroundColor: primaryColor }}
            />
            <Space direction="vertical" size={0}>
              <Typography.Text strong style={{ fontSize: 13 }}>
                {customerDetails.customer_name || "Customer"}
              </Typography.Text>
              {customerDetails.customer_phone && (
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {customerDetails.customer_phone}
                  {customerDetails.customer_email ? ` · ${customerDetails.customer_email}` : ""}
                </Typography.Text>
              )}
            </Space>
            {customerDetails.customer_id && (
              <Tooltip title="Linked to customer account">
                <Tag color="green" style={{ marginLeft: "auto", fontSize: 11 }}>
                  Linked
                </Tag>
              </Tooltip>
            )}
          </Flex>
        )}

        {/* ── Cart headers ──────────────────────────────────────────────── */}
        <Space style={{ display: "flex", justifyContent: "space-between", width: "84%" }}>
          <Typography.Title level={5}>Item</Typography.Title>
          <Typography.Title level={5}>Qty</Typography.Title>
          <Typography.Title level={5}>Price</Typography.Title>
          <Typography.Title level={5}>Delete</Typography.Title>
        </Space>

        <Divider style={{ margin: "4px 0" }} />

        {/* ── Cart items ────────────────────────────────────────────────── */}
        <div style={{ maxHeight: "calc(92vh - 460px)", overflowY: "auto", width: "100%" }}>
          {loading
            ? Array.from({ length: data?.length || 3 }, (_, index) => (
              <SkeletonCartItemCard key={index} />
            ))
            : data?.map((item: { _id: Key | null | undefined | string }) => (
              <CartItemCardMemo key={item._id} cartItem={item} />
            ))}
          {loadingData && loading ? <CartLoader /> : ""}
        </div>

        {memoizedData?.length ? (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Flex gap={16} wrap justify="space-between">
              {cartDetails?.tip_amount && (
                <Typography.Text strong>
                  <RestOutlined /> Tip Value:
                  {cartDetails?.tip_type === "amount"
                    ? ` KSH. ${cartDetails?.tip_amount?.toLocaleString()}`
                    : ` ${cartDetails?.tip_amount}%`}
                </Typography.Text>
              )}
            </Flex>

            <Flex gap={16} wrap justify="space-between">
              {cartDetails?.discount > 0 && discountAmount != null && (
                <>
                  <Typography.Text strong>
                    Discount: KSH. {discountAmount.toLocaleString()}{" "}
                    <Tag color="green">
                      {cartDetails.discount_type === "percentage"
                        ? `${cartDetails.discount}% Discount Applied`
                        : `KSH ${cartDetails.discount.toLocaleString()} Discount Applied`}
                    </Tag>
                  </Typography.Text>
                  {grandTotal != null && (
                    <Typography.Text delete style={{ opacity: 0.7 }}>
                      Original Amount: KSH. {grandTotal.toLocaleString()}
                    </Typography.Text>
                  )}
                </>
              )}
            </Flex>

            <Space direction="vertical" style={{ width: "100%" }}>
              <Flex align="center" justify="space-between">
                <Typography.Text>Subtotal</Typography.Text>
                <Typography.Text>KSH. {subtotal.toLocaleString()}</Typography.Text>
              </Flex>
              <Flex align="center" justify="space-between">
                <Typography.Text>Discount</Typography.Text>
                <Typography.Text>- KSH. {discountAmount.toLocaleString()}</Typography.Text>
              </Flex>
              <Flex align="center" justify="space-between">
                <Typography.Text>VAT</Typography.Text>
                <Typography.Text>KSH. {totalVatAmount}</Typography.Text>
              </Flex>
              <Divider style={{ margin: "4px 0" }} />
              <Flex align="center" justify="space-between">
                <Typography.Text strong style={{ fontSize: "16px" }}>
                  Amount Due
                </Typography.Text>
                <Typography.Text strong style={{ fontSize: "16px" }}>
                  KSH. {grandTotal.toLocaleString()}
                </Typography.Text>
              </Flex>
              <Flex align="center" justify="end">
                <Typography.Text>
                  Served By: <SmileFilled /> {cartDetails?.created_by?.username || "Staff"}
                </Typography.Text>
              </Flex>
            </Space>

            <Space style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              marginBottom: "10px",
            }}>
              <ClientPin cart={cartDetails} />
              {tenant?.business_type?.name === "massage_parlour" ? (
                <PrintBillSpaModal cartDetails={cartDetails} data={data} />
              ) : (
                <PrintBillModal cartDetails={cartDetails} data={data} />
              )}
            </Space>

            {user?.role === "admin" && (
              <Button
                danger
                block
                onClick={() => dispatch(deleteAllCartItems(cartDetails?._id))}
                icon={<CloseCircleOutlined />}
              >
                Clear
              </Button>
            )}
          </Space>
        ) : (
          <Empty
            image="/basket.png"
            imageStyle={{ opacity: 0.6 }}
            description="Add items to your cart to view them here"
          />
        )}
      </Space>

      <div style={{ display: "flex", marginTop: 20 }}>
        {(user?.role === "admin" || user?.role === "cashier") && (data?.length ?? 0) > 0 && (
          <PaymentDrawer customerDetails={customerDetails} />
        )}
      </div>
    </ProCard>
  );
};

export default CartDrawer;