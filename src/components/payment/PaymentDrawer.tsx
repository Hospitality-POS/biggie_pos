import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { createOrder } from "@features/Order/OrderActions";
import { cartVoid, createCart, updateCart } from "@features/Cart/CartActions";
import SplitBillDialog from "../MODALS/Dialogs/SplitBillDialog";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  Alert,
  Button,
  Col,
  Form,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  Typography,
  message,
  Input,
  Select,
  Card,
  Divider,
  Tag,
  Flex,
  Badge,
  Empty,
  Avatar,
} from "antd";
import {
  CloseCircleOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileAddOutlined,
  FileOutlined,
  MobileOutlined,
  StopOutlined,
  WalletOutlined,
  PhoneOutlined,
  SendOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  UserOutlined,
  SearchOutlined,
  GiftOutlined,
  InfoCircleOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { DrawerForm, ProCard } from "@ant-design/pro-components";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import DiscountModal from "@components/MODALS/pro/DiscountModal";
import pesapalApi from "@services/pesapalApi";
import { fetchAllCustomers, addNewCustomer } from "@services/customers";
import { fetchAllPackages } from "@services/subscription";
import SubscriptionPaymentOption from "./SubscriptionPaymentOption";

const { Text, Title } = Typography;

interface PaymentMethod {
  _id: string;
  name: string;
}

interface CustomerDetails {
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
}

type STKPaymentStatus = "idle" | "sending" | "waiting" | "success" | "failed";

const useDebounce = (callback: (...args: any[]) => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  return useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  );
};

interface PaymentDrawerProps {
  customerDetails?: CustomerDetails | null;
}

const PaymentDrawer: React.FC<PaymentDrawerProps> = ({ customerDetails }) => {
  const [form] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = (path: string) => (window.location.href = path);
  const id = window.location.pathname.split("/").pop();
  const { cartDetails, subtotal, totalVatAmount, grandTotal } = useAppSelector(
    (state) => state.cart
  );
  const { loading } = useAppSelector((state) => state.order);
  const { user } = useAppSelector((state) => state.auth);

  const [selectedMethod, setSelectedMethod] = useState<null | string>(null);
  const [secondMethod, setSecondMethod] = useState<null | string>(null);
  const [openModal, setOpenModal] = useState(false);
  const [amount1, setAmount1] = useState(0);
  const [amount2, setAmount2] = useState(0);

  // selectedCustomerId = ONLY set by in-drawer search. Never from customerDetails prop.
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

  // Pre-populate ONLY customerInfo (phone/name/email) from ClientPin.
  // Never set selectedCustomerId here — subscriptions must only load from in-drawer search.
  useEffect(() => {
    if (drawerVisible && customerDetails) {
      setCustomerInfo({
        phone: customerDetails.customer_phone || "",
        name: customerDetails.customer_name || "",
        email: customerDetails.customer_email || "",
      });
    }
  }, [drawerVisible, customerDetails]);

  // Helper: extract a plain string ID from a value that might be an object or string
  const extractId = (val: any): string | undefined => {
    if (!val) return undefined;
    if (typeof val === "string") return val;
    if (typeof val === "object" && val._id) return String(val._id);
    return undefined;
  };

  // customer_id resolution priority:
  // 1. Explicit in-drawer search selection
  // 2. customer_id saved on cartDetails by ClientPin (extracted safely as string)
  // 3. customer_id from customerDetails prop (extracted safely as string)
  const resolveCustomerId = (): string | undefined => {
    if (selectedCustomerId) return selectedCustomerId;
    const fromCart = extractId(cartDetails?.customer_id);
    if (fromCart) return fromCart;
    const fromProp = extractId(customerDetails?.customer_id);
    if (fromProp) return fromProp;
    return undefined;
  };

  const resolveCustomerName = (): string | undefined =>
    selectedCustomer?.customer_name ||
    customerInfo.name ||
    cartDetails?.client_name ||
    customerDetails?.customer_name ||
    undefined;

  const resolveCustomerPhone = (): string | undefined =>
    customerInfo.phone ||
    cartDetails?.client_pin ||
    customerDetails?.customer_phone ||
    undefined;

  const resolveCustomerEmail = (): string | undefined =>
    customerInfo.email ||
    cartDetails?.client_email ||
    customerDetails?.customer_email ||
    undefined;

  const isValidKenyanPhone = (phone: string): boolean => {
    const c = phone.replace(/[\s\-\(\)]/g, "");
    return [/^\+254[17]\d{8}$/, /^254[17]\d{8}$/, /^0[17]\d{8}$/, /^[17]\d{8}$/].some((p) =>
      p.test(c)
    );
  };

  const formatPhoneNumber = (phone: string): string => {
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
    return list.filter(
      (c) =>
        c &&
        (c.customer_name?.toLowerCase().includes(t) ||
          String(c.phone || "").toLowerCase().includes(t) ||
          c.email?.toLowerCase().includes(t))
    );
  };

  const performSearch = useCallback(async (term: string) => {
    if (!term || term.trim().length < 2) { setCustomers([]); return; }
    try {
      setSearchingCustomers(true);
      const result = await fetchAllCustomers({ search: term.trim() });
      let arr: any[] = [];
      if (Array.isArray(result)) arr = result;
      else if (result && Array.isArray(result.customers)) arr = result.customers;
      else if (result && Array.isArray(result.data)) arr = result.data;
      setCustomers(filterCustomers(arr, term));
    } catch (error) {
      console.error("Error searching customers:", error);
      setCustomers([]);
      message.error("Failed to search customers");
    } finally {
      setSearchingCustomers(false);
    }
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
      setCustomerInfo({
        phone: customer.phone ? String(customer.phone) : "",
        name: customer.customer_name || "",
        email: customer.email || "",
      });
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
            message.success("Payment completed successfully!");
            setTimeout(() => { resetPesapalModal(); setDrawerVisible(false); dispatch(createCart(id)); navigate("/tables"); }, 2000);
          } else if (data.payment_status === "FAILED") {
            setStkPaymentStatus("failed");
            message.error("Payment failed. Please try again.");
          }
        } catch (error) {
          console.error("Error checking payment status:", error);
        }
      }, 3000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [stkPaymentStatus, stkTrackingId]);

  useEffect(() => {
    const check = async () => {
      try { setPesapalEnabled(await pesapalApi.isConfiguredForCurrentTenant()); }
      catch { setPesapalEnabled(false); }
    };
    check();
  }, []);

  const handleRemoveDiscount = () => {
    dispatch(updateCart({ cart: cartDetails, data: { discount: 0, discount_type: "" } } as any));
    message.success("Discount removed successfully.");
  };

  const { isLoading, error: Derror, data: paymentMethods } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: fetchAllPaymentMethods,
    networkMode: "always",
  });

  const isPesapalMethod = (methodId: string) => {
    const method = paymentMethods?.find((m) => m._id === methodId);
    return method?.name.toLowerCase().includes("pal") || method?.name.toLowerCase().includes("gateway");
  };

  const handleSelectMethod = (method: string) => {
    if (useSubscription) { message.info("Please deselect subscription to use a payment method"); return; }
    if (isPesapalMethod(method) && !pesapalEnabled) {
      message.info("STK Push payment is not available. Please contact administrator to enable Pesapal configuration.");
      return;
    }
    if (!selectedMethod) setSelectedMethod(method);
    else if (!secondMethod) { setSecondMethod(method); setOpenModal(true); }
  };

  const handleModalClose = () => { setOpenModal(false); setSecondMethod(null); setAmount1(0); setAmount2(0); };

  const handleSplitConfirm = async () => {
    if (!amount1 || amount1 < 1 || !amount2 || amount2 < 1 || amount1 + amount2 !== grandTotal) {
      message.error("The split amounts must equal the total amount.");
      return;
    }
    try {
      const result = await dispatch(createOrder({
        cart_id: cartDetails?._id,
        order_amount: [amount1, amount2],
        table_id: id,
        updated_by: user?.id,
        order_no: cartDetails?.order_no,
        cart_items: cartDetails.items,
        method_id: [selectedMethod, secondMethod],
        customer_id: resolveCustomerId(),
        customer_name: resolveCustomerName(),
        customer_phone: resolveCustomerPhone(),
        customer_email: resolveCustomerEmail(),
      }));
      if (result.type.endsWith("/fulfilled")) {
        setDrawerVisible(false);
        setSelectedCustomerId(null);
        dispatch(createCart(id));
        navigate("/tables");
        message.success("Payment successful!");
      }
    } catch (error) { console.error("Split payment failed:", error); }
  };

  const handlePayment = async () => {
    if (useSubscription && selectedSubscription) {
      if (!resolveCustomerId()) { message.error("Please select a customer for subscription order"); return; }
      try {
        const result = await dispatch(createOrder({
          cart_id: cartDetails?._id,
          order_amount: 0,
          table_id: id,
          updated_by: user?.id,
          order_no: cartDetails?.order_no,
          cart_items: cartDetails.items,
          method_id: null,
          use_subscription: true,
          subscription_id: selectedSubscription,
          customer_id: resolveCustomerId(),
          customer_name: resolveCustomerName(),
          customer_phone: resolveCustomerPhone(),
          customer_email: resolveCustomerEmail(),
        }));
        if (result.type.endsWith("/fulfilled")) {
          message.success("Order placed successfully using subscription visit!");
          setDrawerVisible(false);
          setSelectedSubscription(null);
          setUseSubscription(false);
          setSelectedCustomerId(null);
          dispatch(createCart(id));
          navigate("/tables");
        }
      } catch (error) { console.error("Subscription order failed:", error); }
      return;
    }

    if (!selectedMethod) { message.error("Please select a payment method."); return; }
    if (isPesapalMethod(selectedMethod)) { setPesapalModalVisible(true); return; }

    if (secondMethod) {
      setOpenModal(true);
    } else {
      try {
        const result = await dispatch(createOrder({
          cart_id: cartDetails?._id,
          order_amount: grandTotal,
          table_id: id,
          updated_by: user?.id,
          order_no: cartDetails?.order_no,
          cart_items: cartDetails.items,
          method_id: selectedMethod,
          customer_id: resolveCustomerId(),
          customer_name: resolveCustomerName(),
          customer_phone: resolveCustomerPhone(),
          customer_email: resolveCustomerEmail(),
        }));
        if (result.type.endsWith("/fulfilled")) {
          setDrawerVisible(false);
          setSelectedCustomerId(null);
          dispatch(createCart(id));
          navigate("/tables");
          message.success("Payment successful!");
        }
      } catch (error) { console.error("Payment failed:", error); }
    }
  };

  const handleSTKPushPayment = async () => {
    if (!customerInfo.phone) { message.error("Customer phone number is required for STK Push payment"); return; }
    if (!isValidKenyanPhone(customerInfo.phone)) {
      message.error("Please enter a valid Kenyan phone number for STK Push (e.g., 0712345678)");
      return;
    }
    try {
      if (isNewCustomer && customerInfo.phone && !selectedCustomer) {
        try {
          const created = await addNewCustomer({
            phone: customerInfo.phone,
            customer_name: customerInfo.name || "Customer",
            email: customerInfo.email || "",
            shop_id: localStorage.getItem("shopId"),
          });
          setSelectedCustomerId(created?.customer?._id || null);
          message.success("New customer created successfully");
        } catch (e) { console.warn("Could not create customer, proceeding:", e); }
      }

      if (!localStorage.getItem("shopId")) { message.error("Shop configuration not found"); return; }

      setStkPaymentStatus("sending");
      setCountdown(300);

      const result = await dispatch(createOrder({
        cart_id: cartDetails?._id,
        order_amount: grandTotal,
        table_id: id,
        updated_by: user?.id,
        order_no: cartDetails?.order_no,
        cart_items: cartDetails.items,
        method_id: selectedMethod,
        payment_type: "stk_push",
        customer_phone: customerInfo.phone,
        customer_name: customerInfo.name || "Customer",
        customer_email: customerInfo.email || `${customerInfo.phone}@customer.local`,
        enable_stk_push: true,
        stk_phone_number: customerInfo.phone,
        customer_id: resolveCustomerId(),
      }));

      if (result?.payload?.payment?.stk_push) {
        setStkPaymentStatus("waiting");
        setStkTrackingId(result.payload.payment.stk_push.tracking_id);
        message.success(`STK Push sent to ${formatPhoneNumber(customerInfo.phone)}`);
      } else {
        setStkPaymentStatus("failed");
        message.error("Failed to send STK Push");
      }
    } catch (error) {
      console.error("STK Push payment error:", error);
      setStkPaymentStatus("failed");
      message.error("Failed to initiate STK Push payment");
    }
  };

  const handleVoidBill = () => {
    Modal.confirm({
      title: "Void Bill",
      content: "Are you sure you want to void this bill?",
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
        setSearchTerm("");
        message.success("Bill voided successfully.");
        navigate("/tables");
      },
    });
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    const name = method.name.toLowerCase();
    if (name === "cash") return <DollarOutlined style={{ fontSize: "32px" }} />;
    if (name === "m-pesa" || name.includes("mpesa")) return <MobileOutlined style={{ fontSize: "32px" }} />;
    if (name === "card") return <CreditCardOutlined style={{ fontSize: "32px" }} />;
    if (name === "debt") return <WalletOutlined style={{ fontSize: "32px" }} />;
    if (name.includes("pesapal") || name.includes("gateway")) return <MobileOutlined style={{ fontSize: "32px" }} />;
    return <FileAddOutlined style={{ fontSize: "32px" }} />;
  };

  const renderSTKPushStatus = () => {
    switch (stkPaymentStatus) {
      case "sending":
        return (
          <Card style={{ textAlign: "center", margin: "16px 0" }}>
            <LoadingOutlined style={{ fontSize: "24px", color: "#1890ff" }} />
            <Title level={4} style={{ margin: "16px 0 8px 0" }}>Sending STK Push...</Title>
            <Text type="secondary">Please wait while we send the payment request</Text>
          </Card>
        );
      case "waiting":
        return (
          <Card style={{ textAlign: "center", margin: "16px 0" }}>
            <MobileOutlined style={{ fontSize: "24px", color: "#52c41a" }} />
            <Title level={4} style={{ margin: "16px 0 8px 0" }}>Payment Request Sent!</Title>
            <Text strong>Check your phone: {formatPhoneNumber(customerInfo.phone)}</Text><br />
            <Text type="secondary">Enter your M-Pesa PIN to complete payment</Text><br />
            <Tag color="blue" style={{ marginTop: 8 }}>
              Time remaining: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
            </Tag>
          </Card>
        );
      case "success":
        return (
          <Card style={{ textAlign: "center", margin: "16px 0" }}>
            <CheckCircleOutlined style={{ fontSize: "24px", color: "#52c41a" }} />
            <Title level={4} style={{ margin: "16px 0 8px 0", color: "#52c41a" }}>Payment Successful!</Title>
            <Text>Redirecting to tables...</Text>
          </Card>
        );
      case "failed":
        return (
          <Card style={{ textAlign: "center", margin: "16px 0" }}>
            <CloseCircleOutlined style={{ fontSize: "24px", color: "#ff4d4f" }} />
            <Title level={4} style={{ margin: "16px 0 8px 0", color: "#ff4d4f" }}>Payment Failed</Title>
            <Text type="secondary">Please try again or use a different payment method</Text>
          </Card>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    if (!drawerVisible) {
      setSearchTerm("");
      setCustomers([]);
      setSelectedCustomerId(null);
      setSelectedCustomer(null);
      setCustomerInfo({ phone: "", name: "", email: "" });
    }
  }, [drawerVisible]);

  if (isLoading || packagesLoading) {
    return (
      <Space style={{ display: "flex", justifyContent: "center", marginTop: 4, width: "100%" }}>
        <Spin />
      </Space>
    );
  }

  if (Derror) {
    return (
      <Space style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
        <Alert message="An error occurred while fetching payment methods." type="error" showIcon />
      </Space>
    );
  }

  return (
    <>
      <DrawerForm
        style={{ display: "flex", flexDirection: "column" }}
        title={
          <Space style={{ display: "flex", justifyContent: "space-between" }}>
            <Typography.Text style={{ fontSize: "20px" }}>Payment</Typography.Text>
            <DiscountModal data={cartDetails} />
          </Space>
        }
        key={"payment"}
        aria-label="payment options"
        resize={{ maxWidth: window.innerWidth * 0.8, minWidth: 560 }}
        open={drawerVisible}
        onOpenChange={setDrawerVisible}
        submitter={{
          submitButtonProps: { block: true },
          render: () => (
            <Flex style={{ justifyContent: "space-between", width: "100%" }} gap={16}>
              <Button
                key="submit" type="primary" size="large"
                onClick={handlePayment} loading={loading}
                disabled={useSubscription ? !selectedSubscription : !selectedMethod}
                icon={useSubscription ? <GiftOutlined /> : <FileOutlined />}
                block
              >
                {useSubscription ? "Confirm Subscription Visit" : "Confirm Payment"}
              </Button>
              <Button
                block key="cancel" size="large"
                onClick={() => {
                  setDrawerVisible(false);
                  setSelectedCustomerId(null);
                  setSelectedSubscription(null);
                  setUseSubscription(false);
                  setSearchTerm("");
                }}
              >
                Cancel
              </Button>
            </Flex>
          ),
        }}
        form={form}
        drawerProps={{
          destroyOnClose: true,
          onClose: () => {
            setSelectedCustomerId(null);
            setSelectedSubscription(null);
            setUseSubscription(false);
            setSelectedMethod(null);
            setSecondMethod(null);
            setSearchTerm("");
          },
        }}
        trigger={
          <Button
            type="primary" block
            onClick={() => {
              if (!cartDetails?.items || cartDetails.items.length === 0) {
                message.error("Cart is empty. Please add items before proceeding to payment.");
                return;
              }
              setDrawerVisible(true);
            }}
          >
            Proceed to Payment
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size="large">

          {/* ORDER SUMMARY */}
          <Card
            title={<Text strong>Order Summary</Text>}
            size="small" bordered={false}
            style={{ backgroundColor: "#fafafa" }}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              <Flex justify="space-between">
                <Text>Subtotal</Text>
                <Text strong>KSH. {subtotal.toLocaleString()}</Text>
              </Flex>
              <Flex justify="space-between" align="center">
                <Text>Discount</Text>
                <Space>
                  <Text type="danger">
                    - KSH. {((subtotal * (cartDetails.discount || 0)) / 100).toLocaleString()}
                  </Text>
                  {cartDetails.discount > 0 && (
                    <Button
                      type="link" danger size="small"
                      onClick={handleRemoveDiscount}
                      icon={<CloseCircleOutlined />}
                      style={{ padding: 0 }}
                    />
                  )}
                </Space>
              </Flex>
              <Flex justify="space-between">
                <Text>VAT</Text>
                <Text>KSH. {totalVatAmount.toLocaleString()}</Text>
              </Flex>
              <Divider style={{ margin: "8px 0" }} />
              <Flex justify="space-between">
                <Title level={5} style={{ margin: 0 }}>Amount Due</Title>
                <Title level={5} style={{ margin: 0, color: "#6c1c2c" }}>
                  KSH. {useSubscription ? "0.00" : grandTotal.toLocaleString()}
                </Title>
              </Flex>
            </Space>
          </Card>

          {useSubscription && (
            <Alert
              message={
                <Space>
                  <GiftOutlined />
                  <Text strong>Using Subscription Visit - Order Total: KSh. 0</Text>
                </Space>
              }
              description="One visit will be deducted from the selected package"
              type="success" showIcon style={{ borderRadius: 8 }}
            />
          )}

          {/* CUSTOMER SEARCH — subscriptions ONLY load when customer selected here */}
          {hasActivePackages && (
            <>
              <Card
                title={
                  <Space>
                    <UserOutlined style={{ color: "#6c1c2c" }} />
                    <Text strong>Customer Selection</Text>
                    {selectedCustomerId && <Badge status="success" text="Selected" />}
                  </Space>
                }
                size="small"
                style={{
                  borderRadius: 8,
                  border: selectedCustomerId ? "2px solid #52c41a" : "1px solid #d9d9d9",
                }}
              >
                <Select
                  style={{ width: "100%" }}
                  size="large"
                  placeholder={
                    <Space>
                      <SearchOutlined />
                      <span>Search by phone, name, or email (min 2 characters)</span>
                    </Space>
                  }
                  showSearch allowClear
                  value={selectedCustomerId}
                  onChange={handleCustomerSelect}
                  onSearch={handleSearch}
                  onClear={() => {
                    setSelectedCustomerId(null);
                    setSelectedCustomer(null);
                    setCustomers([]);
                    setSearchTerm("");
                    setSelectedSubscription(null);
                    setUseSubscription(false);
                  }}
                  filterOption={false}
                  notFoundContent={
                    searchingCustomers ? (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        <Spin size="small" />
                        <div style={{ marginTop: 8 }}><Text type="secondary">Searching customers...</Text></div>
                      </div>
                    ) : searchTerm.length >= 2 && customers.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <div>
                            <Text type="secondary">No customers found for "{searchTerm}"</Text><br />
                            <Text type="secondary" style={{ fontSize: "12px" }}>Try a different search term</Text>
                          </div>
                        }
                      />
                    ) : (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        <InfoCircleOutlined style={{ fontSize: 24, color: "#8c8c8c" }} />
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary">Type at least 2 characters to search</Text>
                        </div>
                      </div>
                    )
                  }
                  suffixIcon={<SearchOutlined />}
                  dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
                >
                  {customers.map((customer: any) => (
                    <Select.Option key={customer._id} value={customer._id}>
                      <div style={{ display: "flex", alignItems: "center", padding: "8px 4px", gap: "12px" }}>
                        <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#6c1c2c", flexShrink: 0 }} size="small" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "14px", color: "#262626", marginBottom: "4px" }}>
                            {customer.customer_name}
                          </div>
                          <Space size={12} style={{ fontSize: "12px", color: "#8c8c8c" }} wrap>
                            {customer.phone && (
                              <span><PhoneOutlined style={{ marginRight: "4px" }} />{String(customer.phone)}</span>
                            )}
                            {customer.email && (
                              <span><MailOutlined style={{ marginRight: "4px" }} />{customer.email}</span>
                            )}
                          </Space>
                        </div>
                      </div>
                    </Select.Option>
                  ))}
                </Select>

                {selectedCustomerId && (
                  <Alert
                    style={{ marginTop: 12, borderRadius: 6 }}
                    message={
                      <Space>
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                        <Text strong>Customer Selected</Text>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar icon={<UserOutlined />} size="small" style={{ backgroundColor: "#6c1c2c" }} />
                          <Text strong>
                            {customers.find((c) => c._id === selectedCustomerId)?.customer_name ||
                              selectedCustomer?.customer_name}
                          </Text>
                        </div>
                        {selectedCustomer?.phone && (
                          <Text type="secondary"><PhoneOutlined /> {String(selectedCustomer.phone)}</Text>
                        )}
                      </Space>
                    }
                    type="success" showIcon={false}
                  />
                )}
              </Card>

              {/* Subscriptions: ONLY render when customer explicitly selected inside this drawer */}
              {selectedCustomerId && (
                <SubscriptionPaymentOption
                  customerId={selectedCustomerId}
                  onSubscriptionSelect={handleSubscriptionSelect}
                  selectedSubscription={selectedSubscription}
                  orderAmount={grandTotal}
                />
              )}

              {!useSubscription && <Divider style={{ margin: "8px 0" }} />}
            </>
          )}

          {/* PAYMENT METHOD SECTION */}
          {!useSubscription && (
            <Card
              title={
                <Space>
                  <WalletOutlined style={{ color: "#6c1c2c" }} />
                  <Text strong>Payment Method</Text>
                </Space>
              }
              size="small" style={{ borderRadius: 8 }}
            >
              <Space
                style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}
                size={[12, 12]}
              >
                {paymentMethods?.map((method: PaymentMethod) => {
                  const isPesapal = isPesapalMethod(method._id);
                  const isDisabled = isPesapal && !pesapalEnabled;
                  const isSelected = selectedMethod === method._id;
                  return (
                    <ProCard
                      key={method._id}
                      bodyStyle={{ paddingInline: "20px", paddingBlock: "20px", minWidth: "120px" }}
                      bordered hoverable={!isDisabled}
                      onClick={() => handleSelectMethod(method._id)}
                      style={{
                        backgroundColor: isSelected ? "#6c1c2c" : "white",
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        transition: "all 0.3s ease",
                        opacity: isDisabled ? 0.5 : 1,
                        border: isSelected ? "2px solid #6c1c2c" : "1px solid #d9d9d9",
                        borderRadius: 8,
                      }}
                    >
                      <Space direction="vertical" align="center" style={{ color: isSelected ? "white" : "inherit" }}>
                        {getPaymentMethodIcon(method)}
                        <Typography.Text strong style={{ color: isSelected ? "white" : "inherit", fontSize: "14px" }}>
                          {method.name === "M-Pesa"
                            ? "Mpesa"
                            : method.name.includes("pesapal") || method.name.includes("gateway")
                              ? "STK Push"
                              : method.name.charAt(0).toUpperCase() + method.name.slice(1)}
                        </Typography.Text>
                        {isDisabled && <Tag color="red" style={{ fontSize: "10px" }}>Unavailable</Tag>}
                      </Space>
                    </ProCard>
                  );
                })}
              </Space>

              <Space style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", marginTop: 16 }}>
                {(user?.role === "admin" || user?.role === "cashier") && selectedMethod && (
                  <Button danger onClick={() => setSelectedMethod(null)} icon={<CloseCircleOutlined />}>
                    Clear Selection
                  </Button>
                )}
                {(user?.role === "admin" || user?.role === "Cashier") && (
                  <Button
                    type="default" onClick={handleVoidBill} icon={<StopOutlined />}
                    style={{ color: "#6c1c2c", borderColor: "#6c1c2c" }}
                  >
                    Void Bill
                  </Button>
                )}
              </Space>
            </Card>
          )}
        </Space>

        {selectedMethod !== secondMethod && (
          <SplitBillDialog
            open={openModal}
            handleModalClose={handleModalClose}
            data={paymentMethods}
            selectedMethod={selectedMethod}
            secondMethod={secondMethod}
            totalAmount={grandTotal}
            amount1={amount1}
            amount2={amount2}
            setSelectedMethod={setSelectedMethod}
            setSecondMethod={setSecondMethod}
            setAmount1={setAmount1}
            setAmount2={setAmount2}
            handleSplitConfirm={handleSplitConfirm}
          />
        )}
      </DrawerForm>

      {/* STK Push Modal */}
      <Modal
        title={<Space align="center"><MobileOutlined style={{ color: "#52c41a" }} /><span>STK Push Payment</span></Space>}
        open={pesapalModalVisible} onCancel={resetPesapalModal}
        footer={null} width={600} maskClosable={false}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          {renderSTKPushStatus()}

          {stkPaymentStatus === "idle" && (
            <Card size="small">
              <Title level={5}>Customer Information</Title>
              <Space direction="vertical" style={{ width: "100%" }}>
                <div>
                  <Text strong><PhoneOutlined /> Customer Phone *</Text>
                  <Input
                    value={customerInfo.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="0712345678 (Kenyan number)"
                    style={{ marginTop: 4 }} maxLength={15}
                    prefix={<PhoneOutlined />}
                  />
                  {customerInfo.phone && !isValidKenyanPhone(customerInfo.phone) && (
                    <Text type="danger" style={{ fontSize: "12px", display: "block", marginTop: 4 }}>
                      Please enter a valid Kenyan phone number (e.g., 0712345678)
                    </Text>
                  )}
                  {searchingCustomers && (
                    <Text type="secondary" style={{ fontSize: "12px", display: "block", marginTop: 4 }}>
                      <LoadingOutlined /> Searching customers...
                    </Text>
                  )}
                </div>

                {customers.length > 0 && !selectedCustomer && (
                  <div>
                    <Text strong>Select Existing Customer</Text>
                    <Select
                      style={{ width: "100%", marginTop: 4 }}
                      placeholder="Choose an existing customer"
                      onSelect={(value) => handleCustomerSelect(value as string)}
                      options={customers.map((c) => ({ value: c._id, label: `${c.customer_name} (${c.phone})` }))}
                    />
                  </div>
                )}

                {(isNewCustomer || !selectedCustomer) && customerInfo.phone && (
                  <>
                    <div>
                      <Text strong>Customer Name</Text>
                      <Input
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                        placeholder="Customer Name" style={{ marginTop: 4 }}
                      />
                    </div>
                    <div>
                      <Text strong>Customer Email (Optional)</Text>
                      <Input
                        type="email" value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                        placeholder="customer@example.com" style={{ marginTop: 4 }}
                      />
                    </div>
                  </>
                )}

                {selectedCustomer && (
                  <Alert
                    message={`Selected: ${selectedCustomer.customer_name} (${selectedCustomer.phone})`}
                    type="success" style={{ marginTop: 8 }} showIcon
                  />
                )}
              </Space>
            </Card>
          )}

          <Card size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="Payment Amount" value={grandTotal} prefix="KSh." precision={2} />
              </Col>
              <Col span={12}>
                <Statistic title="Payment Method" value="STK Push" prefix={<MobileOutlined />} />
              </Col>
            </Row>
          </Card>

          {stkPaymentStatus === "idle" && (
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={resetPesapalModal}>Cancel</Button>
              <Button
                type="primary" onClick={handleSTKPushPayment}
                loading={loading || stkPaymentStatus === "sending"}
                disabled={!customerInfo.phone || !isValidKenyanPhone(customerInfo.phone)}
                icon={<SendOutlined />}
              >
                Send STK Push
              </Button>
            </Space>
          )}

          {stkPaymentStatus === "waiting" && (
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Button onClick={() => { setStkPaymentStatus("idle"); setStkTrackingId(""); setCountdown(0); }}>
                Try Again
              </Button>
              <Button type="default" onClick={resetPesapalModal}>Cancel Payment</Button>
            </Space>
          )}

          {stkPaymentStatus === "failed" && (
            <Space style={{ width: "100%", justifyContent: "center" }}>
              <Button
                type="primary"
                onClick={() => { setStkPaymentStatus("idle"); setStkTrackingId(""); setCountdown(0); }}
                icon={<SendOutlined />}
              >
                Try Again
              </Button>
            </Space>
          )}

          {stkPaymentStatus === "idle" && (
            <Alert
              message="STK Push Instructions"
              description={
                <div>
                  <p>• Customer will receive an M-Pesa prompt on their phone</p>
                  <p>• They need to enter their M-Pesa PIN to complete payment</p>
                  <p>• Payment will be processed automatically once confirmed</p>
                  <p>• Ensure the phone number is correct and active</p>
                </div>
              }
              type="info" showIcon style={{ marginTop: 16 }}
            />
          )}
        </Space>
      </Modal>

      {/* Payment Waiting Modal */}
      <Modal
        title="Payment Status Monitor"
        open={stkPaymentStatus === "waiting"}
        footer={null} closable={false} width={400} centered
      >
        <Space direction="vertical" style={{ width: "100%", textAlign: "center" }} size="large">
          <div style={{ fontSize: "48px" }}>
            <MobileOutlined style={{ color: "#52c41a", animation: "pulse 2s infinite" }} />
          </div>
          <div>
            <Title level={4}>Waiting for Payment</Title>
            <Text>STK Push sent to:</Text><br />
            <Text strong style={{ fontSize: "16px" }}>{formatPhoneNumber(customerInfo.phone)}</Text>
          </div>
          <Text type="secondary">Customer should check their phone and enter M-Pesa PIN</Text>
          <div>
            <Tag color="blue" style={{ fontSize: "14px", padding: "4px 12px" }}>
              ⏱️ {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")} remaining
            </Tag>
          </div>
          <Divider />
          <Space>
            <Button onClick={() => { setStkPaymentStatus("idle"); setStkTrackingId(""); setCountdown(0); }}>
              Cancel & Retry
            </Button>
            <Button type="default" onClick={resetPesapalModal}>Cancel Payment</Button>
          </Space>
        </Space>
      </Modal>

      {/* Success Modal */}
      <Modal title={null} open={stkPaymentStatus === "success"} footer={null} closable={false} width={300} centered>
        <Space direction="vertical" style={{ width: "100%", textAlign: "center" }} size="large">
          <CheckCircleOutlined style={{ fontSize: "64px", color: "#52c41a" }} />
          <Title level={3} style={{ color: "#52c41a", margin: 0 }}>Payment Successful!</Title>
          <Text>KSh. {grandTotal?.toLocaleString()} paid successfully</Text>
          <Text type="secondary">Redirecting to tables...</Text>
        </Space>
      </Modal>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default PaymentDrawer;