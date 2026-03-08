import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { createOrder } from "@features/Order/OrderActions";
import { cartVoid, createCart, updateCart } from "@features/Cart/CartActions";
import SplitBillDialog from "../MODALS/Dialogs/SplitBillDialog";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  Alert, Button, Col, Form, Modal, Row, Space, Spin, Statistic,
  Typography, message, Input, Select, Card, Divider, Tag, Flex,
  Badge, Empty, Avatar,
} from "antd";
import {
  CloseCircleOutlined, CreditCardOutlined, DollarOutlined,
  FileAddOutlined, FileOutlined, MobileOutlined, StopOutlined,
  WalletOutlined, PhoneOutlined, SendOutlined, CheckCircleOutlined,
  LoadingOutlined, UserOutlined, SearchOutlined, GiftOutlined,
  InfoCircleOutlined, MailOutlined,
} from "@ant-design/icons";
import { DrawerForm, ProCard } from "@ant-design/pro-components";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import DiscountModal from "@components/MODALS/pro/DiscountModal";
import pesapalApi from "@services/pesapalApi";
import { fetchAllCustomers, addNewCustomer } from "@services/customers";
import { fetchAllPackages } from "@services/subscription";
import SubscriptionPaymentOption from "./SubscriptionPaymentOption";
import { usePOSMode } from "@context/POSModeContext";
import { useRetailQueue } from "@context/RetailQueueContext";

const { Text, Title } = Typography;

interface PaymentMethod { _id: string; name: string; }
interface CustomerDetails {
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
}
type STKPaymentStatus = "idle" | "sending" | "waiting" | "success" | "failed";

const useDebounce = (callback: (...args: any[]) => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
};

const fmtKsh = (v: number) =>
  `KSH ${v?.toLocaleString("en-KE", { minimumFractionDigits: 0 }) ?? "0"}`;

// ── Payment method icon map ────────────────────────────────────────────────
const getMethodIcon = (name: string, size = 26) => {
  const n = name.toLowerCase();
  const style = { fontSize: size };
  if (n === "cash") return <DollarOutlined style={style} />;
  if (n.includes("mpesa") || n === "m-pesa") return <MobileOutlined style={style} />;
  if (n === "card") return <CreditCardOutlined style={style} />;
  if (n === "debt") return <WalletOutlined style={style} />;
  if (n.includes("pesapal") || n.includes("gateway")) return <MobileOutlined style={style} />;
  return <FileAddOutlined style={style} />;
};

const getMethodLabel = (name: string) => {
  if (name === "M-Pesa") return "M-Pesa";
  if (name.toLowerCase().includes("pesapal") || name.toLowerCase().includes("gateway")) return "STK Push";
  return name.charAt(0).toUpperCase() + name.slice(1);
};

// ── STK status card ────────────────────────────────────────────────────────
const STKStatusCard: React.FC<{
  status: STKPaymentStatus;
  phone: string;
  countdown: number;
  formatPhone: (p: string) => string;
  onRetry: () => void;
  onCancel: () => void;
}> = ({ status, phone, countdown, formatPhone, onRetry, onCancel }) => {
  const configs = {
    sending: {
      icon: <LoadingOutlined style={{ fontSize: 32, color: "#3b82f6" }} spin />,
      title: "Sending Payment Request…",
      sub: "Please wait while we send the STK push",
      color: "#3b82f6",
      bg: "#eff6ff",
      border: "#bfdbfe",
    },
    waiting: {
      icon: <MobileOutlined style={{ fontSize: 32, color: "#10b981" }} />,
      title: "Check Your Phone",
      sub: `STK sent to ${formatPhone(phone)} — enter your M-Pesa PIN`,
      color: "#10b981",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    },
    success: {
      icon: <CheckCircleOutlined style={{ fontSize: 32, color: "#10b981" }} />,
      title: "Payment Confirmed!",
      sub: "Redirecting you now…",
      color: "#10b981",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    },
    failed: {
      icon: <CloseCircleOutlined style={{ fontSize: 32, color: "#ef4444" }} />,
      title: "Payment Failed",
      sub: "Please try again or choose a different method",
      color: "#ef4444",
      bg: "#fef2f2",
      border: "#fecaca",
    },
  };
  if (status === "idle") return null;
  const c = configs[status];
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        padding: "20px 16px",
        textAlign: "center",
        marginBottom: 12,
      }}
    >
      <div style={{ marginBottom: 10 }}>{c.icon}</div>
      <Text strong style={{ fontSize: 15, color: c.color, display: "block", marginBottom: 4 }}>
        {c.title}
      </Text>
      <Text style={{ fontSize: 13, color: "#64748b", display: "block" }}>{c.sub}</Text>
      {status === "waiting" && (
        <Tag
          color="blue"
          style={{ marginTop: 10, fontSize: 13, padding: "2px 12px", borderRadius: 20 }}
        >
          ⏱ {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
        </Tag>
      )}
      {(status === "waiting" || status === "failed") && (
        <Flex justify="center" gap={8} style={{ marginTop: 14 }}>
          <Button size="small" onClick={onRetry}>
            {status === "waiting" ? "Cancel & Retry" : "Try Again"}
          </Button>
          <Button size="small" danger onClick={onCancel}>Cancel Payment</Button>
        </Flex>
      )}
    </div>
  );
};

interface PaymentDrawerProps { customerDetails?: CustomerDetails | null; }

const PaymentDrawer: React.FC<PaymentDrawerProps> = ({ customerDetails }) => {
  const [form] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = (path: string) => (window.location.href = path);

  const rawId = window.location.pathname.split("/").pop();
  const { isRetailMode } = usePOSMode();
  const { activeTable } = useRetailQueue();
  const id = isRetailMode ? activeTable?._id : (rawId && rawId !== "tables" ? rawId : undefined);

  const { cartDetails, subtotal, totalVatAmount, grandTotal } = useAppSelector((s) => s.cart);
  const { loading } = useAppSelector((s) => s.order);
  const { user } = useAppSelector((s) => s.auth);

  const [selectedMethod, setSelectedMethod] = useState<null | string>(null);
  const [secondMethod, setSecondMethod] = useState<null | string>(null);
  const [openModal, setOpenModal] = useState(false);
  const [amount1, setAmount1] = useState(0);
  const [amount2, setAmount2] = useState(0);

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);
  const [useSubscription, setUseSubscription] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [pesapalEnabled, setPesapalEnabled] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ phone: "", name: "", email: "" });
  const [pesapalModalVisible, setPesapalModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  const [stkPaymentStatus, setStkPaymentStatus] = useState<STKPaymentStatus>("idle");
  const [stkTrackingId, setStkTrackingId] = useState<string>("");
  const [countdown, setCountdown] = useState(0);

  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ["packages", localStorage.getItem("shopId")],
    queryFn: () => fetchAllPackages({ is_active: true }),
    networkMode: "always",
  });
  const activePackages = packagesData?.packages || [];
  const hasActivePackages = activePackages.length > 0;

  useEffect(() => {
    if (drawerVisible && customerDetails) {
      setCustomerInfo({
        phone: customerDetails.customer_phone || "",
        name: customerDetails.customer_name || "",
        email: customerDetails.customer_email || "",
      });
    }
  }, [drawerVisible, customerDetails]);

  const extractId = (val: any) => {
    if (!val) return undefined;
    if (typeof val === "string") return val;
    if (typeof val === "object" && val._id) return String(val._id);
  };

  const resolveCustomerId = () =>
    selectedCustomerId || extractId(cartDetails?.customer_id) || extractId(customerDetails?.customer_id);
  const resolveCustomerName = () =>
    selectedCustomer?.customer_name || customerInfo.name || cartDetails?.client_name || customerDetails?.customer_name;
  const resolveCustomerPhone = () =>
    customerInfo.phone || cartDetails?.client_pin || customerDetails?.customer_phone;
  const resolveCustomerEmail = () =>
    customerInfo.email || cartDetails?.client_email || customerDetails?.customer_email;

  const isValidKenyanPhone = (phone: string) => {
    const c = phone.replace(/[\s\-\(\)]/g, "");
    return [/^\+254[17]\d{8}$/, /^254[17]\d{8}$/, /^0[17]\d{8}$/, /^[17]\d{8}$/].some((p) => p.test(c));
  };

  const formatPhoneNumber = (phone: string) => {
    const c = phone.replace(/[\s\-\(\)]/g, "");
    if (c.startsWith("+254")) return c;
    if (c.startsWith("254")) return "+" + c;
    if (c.startsWith("0")) return "+254" + c.substring(1);
    if (c.match(/^[17]\d{8}$/)) return "+254" + c;
    return phone;
  };

  const filterCustomers = (list: any[], term: string) => {
    if (!term?.trim()) return [];
    const t = term.toLowerCase().trim();
    return list.filter((c) =>
      c?.customer_name?.toLowerCase().includes(t) ||
      String(c?.phone || "").toLowerCase().includes(t) ||
      c?.email?.toLowerCase().includes(t)
    );
  };

  const performSearch = useCallback(async (term: string) => {
    if (!term || term.trim().length < 2) { setCustomers([]); return; }
    try {
      setSearchingCustomers(true);
      const result = await fetchAllCustomers({ search: term.trim() });
      let arr: any[] = Array.isArray(result) ? result : result?.customers || result?.data || [];
      setCustomers(filterCustomers(arr, term));
    } catch { setCustomers([]); message.error("Failed to search customers"); }
    finally { setSearchingCustomers(false); }
  }, []);

  const debouncedSearch = useDebounce(performSearch, 500);

  const handleSearch = (value: string) => {
    const trimmed = value.trim();
    setSearchTerm(trimmed);
    debouncedSearch(trimmed);
  };

  const handleCustomerSelect = (value: string) => {
    const customer = customers.find((c) => c._id === value);
    if (customer) {
      setSelectedCustomer(customer);
      setSelectedCustomerId(customer._id);
      setCustomerInfo({ phone: customer.phone ? String(customer.phone) : "", name: customer.customer_name || "", email: customer.email || "" });
      setIsNewCustomer(false);
      setSearchTerm("");
      setCustomers([]);
    }
  };

  const handlePhoneChange = (phone: string) => {
    const trimmed = phone.trim();
    setCustomerInfo({ ...customerInfo, phone: trimmed });
    if (selectedCustomer && selectedCustomer.phone?.toString() !== trimmed) {
      setSelectedCustomer(null);
      setIsNewCustomer(true);
    }
    if (trimmed.length >= 2) handleSearch(trimmed);
    else setCustomers([]);
  };

  const resetPesapalModal = () => {
    setCustomerInfo({ phone: "", name: "", email: "" });
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setCustomers([]);
    setSearchTerm("");
    setPesapalModalVisible(false);
    setStkPaymentStatus("idle");
    setStkTrackingId("");
    setCountdown(0);
  };

  const handleSubscriptionSelect = (subscriptionId: string | null) => {
    setSelectedSubscription(subscriptionId);
    setUseSubscription(!!subscriptionId);
    if (subscriptionId) { setSelectedMethod(null); setSecondMethod(null); }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (stkPaymentStatus === "waiting" && stkTrackingId) {
      intervalId = setInterval(async () => {
        try {
          const response = await fetch(`/api/orders/payment-status?tracking_id=${stkTrackingId}`);
          const data = await response.json();
          if (data.success && data.payment_status === "COMPLETED") {
            setStkPaymentStatus("success");
            message.success("Payment completed!");
            setTimeout(() => { resetPesapalModal(); setDrawerVisible(false); dispatch(createCart(id)); navigate("/tables"); }, 2000);
          } else if (data.payment_status === "FAILED") {
            setStkPaymentStatus("failed");
            message.error("Payment failed. Please try again.");
          }
        } catch { }
      }, 3000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [stkPaymentStatus, stkTrackingId]);

  useEffect(() => {
    const check = async () => {
      try { setPesapalEnabled(await pesapalApi.isConfiguredForCurrentTenant()); } catch { setPesapalEnabled(false); }
    };
    check();
  }, []);

  useEffect(() => {
    if (!drawerVisible) {
      setSearchTerm(""); setCustomers([]); setSelectedCustomerId(null);
      setSelectedCustomer(null); setCustomerInfo({ phone: "", name: "", email: "" });
    }
  }, [drawerVisible]);

  const handleRemoveDiscount = () => {
    dispatch(updateCart({ cart: cartDetails, data: { discount: 0, discount_type: "" } } as any));
    message.success("Discount removed.");
  };

  const { isLoading, error: Derror, data: paymentMethods } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: fetchAllPaymentMethods,
    networkMode: "always",
  });

  const isPesapalMethod = (methodId: string) => {
    const m = paymentMethods?.find((m) => m._id === methodId);
    return m?.name.toLowerCase().includes("pal") || m?.name.toLowerCase().includes("gateway");
  };

  const handleSelectMethod = (method: string) => {
    if (useSubscription) { message.info("Deselect subscription to use a payment method"); return; }
    if (isPesapalMethod(method) && !pesapalEnabled) {
      message.info("STK Push is not configured. Contact your administrator."); return;
    }
    if (!selectedMethod) setSelectedMethod(method);
    else if (!secondMethod) { setSecondMethod(method); setOpenModal(true); }
  };

  const handleModalClose = () => { setOpenModal(false); setSecondMethod(null); setAmount1(0); setAmount2(0); };

  const handleSplitConfirm = async () => {
    if (!amount1 || amount1 < 1 || !amount2 || amount2 < 1 || amount1 + amount2 !== grandTotal) {
      message.error("Split amounts must equal the total."); return;
    }
    if (!id) { message.error("No active table or slot."); return; }
    try {
      const result = await dispatch(createOrder({
        cart_id: cartDetails?._id, order_amount: [amount1, amount2], table_id: id,
        updated_by: user?.id, order_no: cartDetails?.order_no, cart_items: cartDetails.items,
        method_id: [selectedMethod, secondMethod], customer_id: resolveCustomerId(),
        customer_name: resolveCustomerName(), customer_phone: resolveCustomerPhone(), customer_email: resolveCustomerEmail(),
      }));
      if (result.type.endsWith("/fulfilled")) {
        setDrawerVisible(false); setSelectedCustomerId(null);
        dispatch(createCart(id)); navigate("/tables"); message.success("Payment successful!");
      }
    } catch { }
  };

  const handlePayment = async () => {
    if (!id) { message.error("No active table or slot."); return; }
    if (useSubscription && selectedSubscription) {
      if (!resolveCustomerId()) { message.error("Please select a customer for subscription order"); return; }
      try {
        const result = await dispatch(createOrder({
          cart_id: cartDetails?._id, order_amount: 0, table_id: id,
          updated_by: user?.id, order_no: cartDetails?.order_no, cart_items: cartDetails.items,
          method_id: null, use_subscription: true, subscription_id: selectedSubscription,
          customer_id: resolveCustomerId(), customer_name: resolveCustomerName(),
          customer_phone: resolveCustomerPhone(), customer_email: resolveCustomerEmail(),
        }));
        if (result.type.endsWith("/fulfilled")) {
          message.success("Order placed using subscription visit!");
          setDrawerVisible(false); setSelectedSubscription(null); setUseSubscription(false);
          setSelectedCustomerId(null); dispatch(createCart(id)); navigate("/tables");
        }
      } catch { }
      return;
    }
    if (!selectedMethod) { message.error("Please select a payment method."); return; }
    if (isPesapalMethod(selectedMethod)) { setPesapalModalVisible(true); return; }
    if (secondMethod) { setOpenModal(true); return; }
    try {
      const result = await dispatch(createOrder({
        cart_id: cartDetails?._id, order_amount: grandTotal, table_id: id,
        updated_by: user?.id, order_no: cartDetails?.order_no, cart_items: cartDetails.items,
        method_id: selectedMethod, customer_id: resolveCustomerId(),
        customer_name: resolveCustomerName(), customer_phone: resolveCustomerPhone(), customer_email: resolveCustomerEmail(),
      }));
      if (result.type.endsWith("/fulfilled")) {
        setDrawerVisible(false); setSelectedCustomerId(null);
        dispatch(createCart(id)); navigate("/tables"); message.success("Payment successful!");
      }
    } catch { }
  };

  const handleSTKPushPayment = async () => {
    if (!id) { message.error("No active table or slot."); return; }
    if (!customerInfo.phone) { message.error("Customer phone is required for STK Push"); return; }
    if (!isValidKenyanPhone(customerInfo.phone)) { message.error("Please enter a valid Kenyan phone number"); return; }
    try {
      if (isNewCustomer && customerInfo.phone && !selectedCustomer) {
        try {
          const created = await addNewCustomer({
            phone: customerInfo.phone, customer_name: customerInfo.name || "Customer",
            email: customerInfo.email || "", shop_id: localStorage.getItem("shopId"),
          });
          setSelectedCustomerId(created?.customer?._id || null);
        } catch (e) { console.warn("Could not create customer, proceeding:", e); }
      }
      setStkPaymentStatus("sending");
      setCountdown(300);
      const result = await dispatch(createOrder({
        cart_id: cartDetails?._id, order_amount: grandTotal, table_id: id,
        updated_by: user?.id, order_no: cartDetails?.order_no, cart_items: cartDetails.items,
        method_id: selectedMethod, payment_type: "stk_push",
        customer_phone: customerInfo.phone, customer_name: customerInfo.name || "Customer",
        customer_email: customerInfo.email || `${customerInfo.phone}@customer.local`,
        enable_stk_push: true, stk_phone_number: customerInfo.phone, customer_id: resolveCustomerId(),
      }));
      if (result?.payload?.payment?.stk_push) {
        setStkPaymentStatus("waiting");
        setStkTrackingId(result.payload.payment.stk_push.tracking_id);
        message.success(`STK Push sent to ${formatPhoneNumber(customerInfo.phone)}`);
      } else { setStkPaymentStatus("failed"); message.error("Failed to send STK Push"); }
    } catch { setStkPaymentStatus("failed"); message.error("Failed to initiate STK Push payment"); }
  };

  const handleVoidBill = () => {
    Modal.confirm({
      title: "Void this bill?",
      content: "This action cannot be undone.",
      okText: "Yes, Void it",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => {
        dispatch(cartVoid(cartDetails));
        dispatch(createCart(id));
        setDrawerVisible(false);
        setSelectedCustomerId(null);
        setSelectedSubscription(null);
        setUseSubscription(false);
        message.success("Bill voided.");
        navigate("/tables");
      },
    });
  };

  if (isLoading || packagesLoading) return (
    <Flex justify="center" style={{ width: "100%", padding: "4px 0" }}><Spin /></Flex>
  );

  if (Derror) return (
    <Alert message="Failed to load payment methods." type="error" showIcon style={{ margin: "4px 0" }} />
  );

  return (
    <>
      {/* Trigger button — lives outside DrawerForm to avoid lifecycle coupling */}
      <Button
        type="primary" block size="large"
        style={{ borderRadius: 8 }}
        onClick={() => {
          if (!cartDetails?.items || cartDetails.items.length === 0) {
            message.error("Cart is empty. Add items before proceeding.");
            return;
          }
          setDrawerVisible(true);
        }}
      >
        Proceed to Payment
      </Button>

      <DrawerForm
        title={<Text strong style={{ fontSize: 18 }}>Payment</Text>}
        key="payment"
        resize={{ maxWidth: window.innerWidth * 0.9, minWidth: Math.min(520, window.innerWidth - 32) }}
        open={drawerVisible}
        onOpenChange={(v) => {
          if (!v) {
            setSelectedCustomerId(null); setSelectedSubscription(null);
            setUseSubscription(false); setSelectedMethod(null);
            setSecondMethod(null); setSearchTerm("");
          }
          setDrawerVisible(v);
        }}
        form={form}
        submitter={{
          render: () => (
            <Flex gap={10} style={{ width: "100%" }}>
              <Button
                type="primary" size="large" block onClick={handlePayment} loading={loading}
                disabled={useSubscription ? !selectedSubscription : !selectedMethod}
                icon={useSubscription ? <GiftOutlined /> : <FileOutlined />}
                style={{ borderRadius: 8 }}
              >
                {useSubscription ? "Confirm Subscription" : "Confirm Payment"}
              </Button>
              <Button
                size="large" block onClick={() => {
                  setDrawerVisible(false);
                  setSelectedCustomerId(null);
                  setSelectedSubscription(null);
                  setUseSubscription(false);
                  setSearchTerm("");
                }}
                style={{ borderRadius: 8 }}
              >
                Cancel
              </Button>
            </Flex>
          ),
        }}
        drawerProps={{
          destroyOnClose: true,
          zIndex: 1300,
          getContainer: () => document.body,
          onClose: () => {
            setSelectedCustomerId(null); setSelectedSubscription(null);
            setUseSubscription(false); setSelectedMethod(null);
            setSecondMethod(null); setSearchTerm("");
            setDrawerVisible(false);
          },
          extra: <DiscountModal data={cartDetails} />,
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={16}>

          {/* ── Order summary ─────────────────────────────────────────────── */}
          <div
            style={{
              background: "#f8fafc",
              borderRadius: 12,
              padding: "14px 16px",
              border: "1px solid #e2e8f0",
            }}
          >
            <Text strong style={{ fontSize: 13, color: "#64748b", letterSpacing: 0.5, textTransform: "uppercase" }}>
              Order Summary
            </Text>
            <Divider style={{ margin: "10px 0 8px" }} />
            <Space direction="vertical" style={{ width: "100%" }} size={4}>
              <Flex justify="space-between">
                <Text style={{ color: "#64748b", fontSize: 13 }}>Subtotal</Text>
                <Text style={{ fontSize: 13 }}>{fmtKsh(subtotal)}</Text>
              </Flex>
              <Flex justify="space-between" align="center">
                <Text style={{ color: "#64748b", fontSize: 13 }}>Discount</Text>
                <Flex align="center" gap={6}>
                  <Text type="danger" style={{ fontSize: 13 }}>
                    - {fmtKsh((subtotal * (cartDetails?.discount || 0)) / 100)}
                  </Text>
                  {cartDetails?.discount > 0 && (
                    <Button
                      type="text" danger size="small"
                      onClick={handleRemoveDiscount}
                      icon={<CloseCircleOutlined />}
                      style={{ padding: 0, height: "auto", lineHeight: 1 }}
                    />
                  )}
                </Flex>
              </Flex>
              <Flex justify="space-between">
                <Text style={{ color: "#64748b", fontSize: 13 }}>VAT</Text>
                <Text style={{ fontSize: 13 }}>{fmtKsh(totalVatAmount)}</Text>
              </Flex>
              <Divider style={{ margin: "8px 0" }} />
              <Flex justify="space-between" align="center">
                <Text strong style={{ fontSize: 15 }}>Amount Due</Text>
                <Text strong style={{ fontSize: 17, color: "#6c1c2c" }}>
                  {fmtKsh(useSubscription ? 0 : grandTotal)}
                </Text>
              </Flex>
            </Space>
          </div>

          {useSubscription && (
            <Alert
              message={<Flex gap={6} align="center"><GiftOutlined /><Text strong>Using Subscription — Order Total: KSH 0</Text></Flex>}
              description="One visit will be deducted from the selected package"
              type="success" showIcon={false}
              style={{ borderRadius: 8 }}
            />
          )}

          {/* ── Customer search ────────────────────────────────────────────── */}
          {hasActivePackages && (
            <>
              <div
                style={{
                  borderRadius: 12,
                  border: selectedCustomerId ? "2px solid #10b981" : "1px solid #e2e8f0",
                  overflow: "hidden",
                  transition: "border-color 0.2s",
                }}
              >
                <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid #f1f5f9", background: "#fafafa" }}>
                  <Flex align="center" gap={8}>
                    <UserOutlined style={{ color: "#6c1c2c", fontSize: 13 }} />
                    <Text strong style={{ fontSize: 13 }}>Customer</Text>
                    {selectedCustomerId && (
                      <Tag color="success" style={{ fontSize: 11, margin: 0, borderRadius: 10 }}>Selected</Tag>
                    )}
                  </Flex>
                </div>
                <div style={{ padding: "10px 14px" }}>
                  <Select
                    style={{ width: "100%" }}
                    size="large"
                    placeholder={<Flex gap={6} align="center"><SearchOutlined /><span>Search by phone, name or email…</span></Flex>}
                    showSearch allowClear
                    value={selectedCustomerId}
                    onChange={handleCustomerSelect}
                    onSearch={handleSearch}
                    onClear={() => {
                      setSelectedCustomerId(null); setSelectedCustomer(null);
                      setCustomers([]); setSearchTerm("");
                      setSelectedSubscription(null); setUseSubscription(false);
                    }}
                    filterOption={false}
                    notFoundContent={
                      searchingCustomers ? (
                        <Flex justify="center" align="center" style={{ padding: 20, gap: 8 }}>
                          <Spin size="small" />
                          <Text type="secondary" style={{ fontSize: 13 }}>Searching…</Text>
                        </Flex>
                      ) : searchTerm.length >= 2 && customers.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description={<Text type="secondary" style={{ fontSize: 13 }}>No customers found for "{searchTerm}"</Text>}
                        />
                      ) : (
                        <Flex justify="center" direction="vertical" align="center" style={{ padding: 20 }}>
                          <SearchOutlined style={{ fontSize: 20, color: "#cbd5e1", marginBottom: 6 }} />
                          <Text type="secondary" style={{ fontSize: 12 }}>Type 2+ characters to search</Text>
                        </Flex>
                      )
                    }
                    suffixIcon={<SearchOutlined />}
                    dropdownStyle={{ maxHeight: 360, overflow: "auto" }}
                  >
                    {customers.map((customer: any) => (
                      <Select.Option key={customer._id} value={customer._id}>
                        <Flex align="center" gap={10} style={{ padding: "6px 0" }}>
                          <Avatar icon={<UserOutlined />} size={28}
                            style={{ background: "#6c1c2c", flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text strong style={{ fontSize: 13, display: "block" }}>{customer.customer_name}</Text>
                            <Flex gap={10} style={{ fontSize: 11, color: "#94a3b8" }}>
                              {customer.phone && <span><PhoneOutlined style={{ marginRight: 3 }} />{String(customer.phone)}</span>}
                              {customer.email && <span><MailOutlined style={{ marginRight: 3 }} />{customer.email}</span>}
                            </Flex>
                          </div>
                        </Flex>
                      </Select.Option>
                    ))}
                  </Select>

                  {selectedCustomerId && (
                    <Flex
                      align="center" gap={8}
                      style={{
                        marginTop: 10, background: "#f0fdf4", border: "1px solid #bbf7d0",
                        borderRadius: 8, padding: "8px 10px",
                      }}
                    >
                      <CheckCircleOutlined style={{ color: "#10b981", fontSize: 14 }} />
                      <Avatar icon={<UserOutlined />} size={22} style={{ background: "#6c1c2c" }} />
                      <div>
                        <Text strong style={{ fontSize: 13 }}>
                          {customers.find((c) => c._id === selectedCustomerId)?.customer_name || selectedCustomer?.customer_name}
                        </Text>
                        {selectedCustomer?.phone && (
                          <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>
                            {String(selectedCustomer.phone)}
                          </Text>
                        )}
                      </div>
                    </Flex>
                  )}
                </div>
              </div>

              {selectedCustomerId && (
                <SubscriptionPaymentOption
                  customerId={selectedCustomerId}
                  onSubscriptionSelect={handleSubscriptionSelect}
                  selectedSubscription={selectedSubscription}
                  orderAmount={grandTotal}
                />
              )}
            </>
          )}

          {/* ── Payment methods ────────────────────────────────────────────── */}
          {!useSubscription && (
            <div
              style={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid #f1f5f9", background: "#fafafa" }}>
                <Flex align="center" gap={8}>
                  <WalletOutlined style={{ color: "#6c1c2c", fontSize: 13 }} />
                  <Text strong style={{ fontSize: 13 }}>Payment Method</Text>
                  {selectedMethod && (
                    <Tag color="blue" style={{ fontSize: 11, margin: 0, borderRadius: 10 }}>
                      {getMethodLabel(paymentMethods?.find((m) => m._id === selectedMethod)?.name || "")}
                    </Tag>
                  )}
                </Flex>
              </div>

              <div style={{ padding: "12px 14px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                    gap: 10,
                  }}
                >
                  {paymentMethods?.map((method: PaymentMethod) => {
                    const isPesapal = isPesapalMethod(method._id);
                    const isDisabled = isPesapal && !pesapalEnabled;
                    const isSelected = selectedMethod === method._id;
                    return (
                      <button
                        key={method._id}
                        onClick={() => !isDisabled && handleSelectMethod(method._id)}
                        disabled={isDisabled}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          padding: "14px 8px",
                          borderRadius: 10,
                          border: isSelected ? "2px solid #6c1c2c" : "1.5px solid #e2e8f0",
                          background: isSelected ? "#6c1c2c" : "#fff",
                          color: isSelected ? "white" : "#374151",
                          cursor: isDisabled ? "not-allowed" : "pointer",
                          opacity: isDisabled ? 0.45 : 1,
                          transition: "all 0.18s ease",
                          outline: "none",
                          boxShadow: isSelected ? "0 2px 10px rgba(108,28,44,0.25)" : "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected && !isDisabled)
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "#6c1c2c";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected)
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0";
                        }}
                      >
                        {getMethodIcon(method.name, 22)}
                        <Text style={{ fontSize: 12, fontWeight: 600, color: "inherit", textAlign: "center" }}>
                          {getMethodLabel(method.name)}
                        </Text>
                        {isDisabled && (
                          <Tag color="error" style={{ fontSize: 10, margin: 0, borderRadius: 4 }}>Off</Tag>
                        )}
                      </button>
                    );
                  })}
                </div>

                {(selectedMethod || (user?.role === "admin" || user?.role === "Cashier")) && (
                  <Flex gap={8} style={{ marginTop: 12 }} wrap="wrap">
                    {selectedMethod && (user?.role === "admin" || user?.role === "cashier") && (
                      <Button
                        size="small" danger onClick={() => setSelectedMethod(null)}
                        icon={<CloseCircleOutlined />} style={{ borderRadius: 6 }}
                      >
                        Clear
                      </Button>
                    )}
                    {(user?.role === "admin" || user?.role === "Cashier") && (
                      <Button
                        size="small" onClick={handleVoidBill} icon={<StopOutlined />}
                        style={{ color: "#6c1c2c", borderColor: "#6c1c2c", borderRadius: 6 }}
                      >
                        Void Bill
                      </Button>
                    )}
                  </Flex>
                )}
              </div>
            </div>
          )}
        </Space>

        {selectedMethod !== secondMethod && (
          <SplitBillDialog
            open={openModal} handleModalClose={handleModalClose} data={paymentMethods}
            selectedMethod={selectedMethod} secondMethod={secondMethod} totalAmount={grandTotal}
            amount1={amount1} amount2={amount2}
            setSelectedMethod={setSelectedMethod} setSecondMethod={setSecondMethod}
            setAmount1={setAmount1} setAmount2={setAmount2} handleSplitConfirm={handleSplitConfirm}
          />
        )}
      </DrawerForm>

      {/* ── STK Push Modal ────────────────────────────────────────────────── */}
      <Modal
        title={<Flex align="center" gap={8}><MobileOutlined style={{ color: "#10b981" }} /><span>STK Push Payment</span></Flex>}
        open={pesapalModalVisible} onCancel={resetPesapalModal}
        footer={null} width={Math.min(520, window.innerWidth - 32)} maskClosable={false}
        centered zIndex={1400} getContainer={() => document.body}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={14}>

          {/* Status banner */}
          <STKStatusCard
            status={stkPaymentStatus} phone={customerInfo.phone} countdown={countdown}
            formatPhone={formatPhoneNumber}
            onRetry={() => { setStkPaymentStatus("idle"); setStkTrackingId(""); setCountdown(0); }}
            onCancel={resetPesapalModal}
          />

          {/* Customer info form — only when idle */}
          {stkPaymentStatus === "idle" && (
            <div style={{ borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", background: "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                <Text strong style={{ fontSize: 13 }}>Customer Information</Text>
              </div>
              <Space direction="vertical" style={{ width: "100%", padding: "12px 14px" }} size={10}>
                <div>
                  <Text strong style={{ fontSize: 13 }}><PhoneOutlined /> Phone Number *</Text>
                  <Input
                    value={customerInfo.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="0712345678"
                    style={{ marginTop: 6, borderRadius: 8 }}
                    maxLength={15}
                    prefix={<PhoneOutlined style={{ color: "#94a3b8" }} />}
                    status={customerInfo.phone && !isValidKenyanPhone(customerInfo.phone) ? "error" : ""}
                  />
                  {customerInfo.phone && !isValidKenyanPhone(customerInfo.phone) && (
                    <Text type="danger" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                      Enter a valid Kenyan number (e.g. 0712345678)
                    </Text>
                  )}
                  {searchingCustomers && (
                    <Flex gap={6} align="center" style={{ marginTop: 4 }}>
                      <LoadingOutlined style={{ fontSize: 12, color: "#94a3b8" }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>Searching customers…</Text>
                    </Flex>
                  )}
                </div>

                {customers.length > 0 && !selectedCustomer && (
                  <div>
                    <Text strong style={{ fontSize: 13 }}>Existing Customer</Text>
                    <Select
                      style={{ width: "100%", marginTop: 6 }}
                      placeholder="Choose an existing customer"
                      onSelect={(v) => handleCustomerSelect(v as string)}
                      options={customers.map((c) => ({ value: c._id, label: `${c.customer_name} (${c.phone})` }))}
                    />
                  </div>
                )}

                {(isNewCustomer || !selectedCustomer) && customerInfo.phone && (
                  <>
                    <div>
                      <Text strong style={{ fontSize: 13 }}>Customer Name</Text>
                      <Input
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                        placeholder="Full name"
                        style={{ marginTop: 6, borderRadius: 8 }}
                      />
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 13 }}>Email <Text type="secondary" style={{ fontWeight: 400 }}>(optional)</Text></Text>
                      <Input
                        type="email" value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                        placeholder="customer@email.com"
                        style={{ marginTop: 6, borderRadius: 8 }}
                        prefix={<MailOutlined style={{ color: "#94a3b8" }} />}
                      />
                    </div>
                  </>
                )}

                {selectedCustomer && (
                  <Flex align="center" gap={8}
                    style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 10px" }}
                  >
                    <CheckCircleOutlined style={{ color: "#10b981" }} />
                    <Text strong style={{ fontSize: 13 }}>
                      {selectedCustomer.customer_name} · {String(selectedCustomer.phone)}
                    </Text>
                  </Flex>
                )}
              </Space>
            </div>
          )}

          {/* Amount summary */}
          <div
            style={{
              background: "#f8fafc", borderRadius: 10,
              border: "1px solid #e2e8f0", padding: "12px 14px",
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="Amount" value={grandTotal} prefix="KSh." precision={0} valueStyle={{ fontSize: 18 }} />
              </Col>
              <Col span={12}>
                <Statistic title="Method" value="STK Push" prefix={<MobileOutlined />} valueStyle={{ fontSize: 16 }} />
              </Col>
            </Row>
          </div>

          {stkPaymentStatus === "idle" && (
            <>
              <Flex justify="flex-end" gap={8}>
                <Button onClick={resetPesapalModal} style={{ borderRadius: 8 }}>Cancel</Button>
                <Button
                  type="primary" onClick={handleSTKPushPayment}
                  loading={loading || stkPaymentStatus === "sending"}
                  disabled={!customerInfo.phone || !isValidKenyanPhone(customerInfo.phone)}
                  icon={<SendOutlined />}
                  style={{ borderRadius: 8 }}
                >
                  Send STK Push
                </Button>
              </Flex>

              <Alert
                message="How STK Push works"
                description="Customer receives an M-Pesa prompt on their phone. They enter their PIN to confirm payment. Ensure the number is active and has sufficient balance."
                type="info" showIcon style={{ borderRadius: 8 }}
              />
            </>
          )}
        </Space>
      </Modal>

      {/* ── Payment waiting overlay modal ─────────────────────────────────── */}
      <Modal
        title={null} open={stkPaymentStatus === "waiting"} footer={null}
        closable={false} width={360} centered zIndex={1400} getContainer={() => document.body}
      >
        <Space direction="vertical" style={{ width: "100%", textAlign: "center", padding: "8px 0" }} size={14}>
          <div
            style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "#f0fdf4", border: "2px solid #bbf7d0",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto",
            }}
          >
            <MobileOutlined style={{ fontSize: 28, color: "#10b981" }} />
          </div>
          <Title level={4} style={{ margin: 0 }}>Waiting for Payment</Title>
          <Text style={{ fontSize: 13 }}>STK Push sent to</Text>
          <Text strong style={{ fontSize: 15 }}>{formatPhoneNumber(customerInfo.phone)}</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>Enter M-Pesa PIN on your phone to confirm</Text>
          <Tag color="blue" style={{ fontSize: 13, padding: "3px 14px", borderRadius: 20 }}>
            ⏱ {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
          </Tag>
          <Divider style={{ margin: "4px 0" }} />
          <Flex justify="center" gap={8}>
            <Button onClick={() => { setStkPaymentStatus("idle"); setStkTrackingId(""); setCountdown(0); }}>
              Cancel & Retry
            </Button>
            <Button danger onClick={resetPesapalModal}>Cancel Payment</Button>
          </Flex>
        </Space>
      </Modal>

      {/* ── Success modal ─────────────────────────────────────────────────── */}
      <Modal title={null} open={stkPaymentStatus === "success"} footer={null} closable={false} width={300} centered zIndex={1400} getContainer={() => document.body}>
        <Space direction="vertical" style={{ width: "100%", textAlign: "center", padding: "16px 0" }} size={12}>
          <div
            style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "#f0fdf4", border: "2px solid #bbf7d0",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto",
            }}
          >
            <CheckCircleOutlined style={{ fontSize: 36, color: "#10b981" }} />
          </div>
          <Title level={3} style={{ color: "#10b981", margin: 0 }}>Payment Successful!</Title>
          <Text style={{ fontSize: 14 }}>{fmtKsh(grandTotal)} confirmed</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>Redirecting…</Text>
        </Space>
      </Modal>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.75; }
        }
      `}</style>
    </>
  );
};

export default PaymentDrawer;