import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { grey } from "@mui/material/colors";
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
} from "antd";
import {
  CloseCircleOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileAddOutlined,
  FileOutlined,
  MobileOutlined,
  PercentageOutlined,
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

type STKPaymentStatus = "idle" | "sending" | "waiting" | "success" | "failed";

const PaymentDrawer: React.FC = () => {
  const [form] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = (path: string) => (window.location.href = path);
  const id = window.location.pathname.split("/").pop();
  const { cartDetails, subtotal, totalVatAmount, grandTotal } = useAppSelector(
    (state) => state.cart
  );
  const { loading, error } = useAppSelector((state) => state.order);
  const { user } = useAppSelector((state) => state.auth);

  // Payment method states
  const [selectedMethod, setSelectedMethod] = useState<null | string>(null);
  const [secondMethod, setSecondMethod] = useState<null | string>(null);
  const [openModal, setOpenModal] = useState(false);
  const [amount1, setAmount1] = useState(0);
  const [amount2, setAmount2] = useState(0);

  // Customer & Subscription states
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);
  const [useSubscription, setUseSubscription] = useState(false);

  // STK Push states
  const [pesapalEnabled, setPesapalEnabled] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    phone: "",
    name: "",
    email: "",
  });
  const [pesapalModalVisible, setPesapalModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  // STK Push specific states - FIXED: Proper type annotation
  const [stkPaymentStatus, setStkPaymentStatus] = useState<STKPaymentStatus>("idle");
  const [stkTrackingId, setStkTrackingId] = useState<string>("");
  const [countdown, setCountdown] = useState(0);

  // Check if shop has active packages
  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ["packages", localStorage.getItem("shopId")],
    queryFn: () => fetchAllPackages({ is_active: true }),
    networkMode: "always",
  });

  const activePackages = packagesData?.packages || [];
  const hasActivePackages = activePackages.length > 0;

  // Phone number validation for Kenyan numbers
  const isValidKenyanPhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
    const patterns = [
      /^\+254[17]\d{8}$/,
      /^254[17]\d{8}$/,
      /^0[17]\d{8}$/,
      /^[17]\d{8}$/,
    ];
    return patterns.some((pattern) => pattern.test(cleanPhone));
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string): string => {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
    if (cleanPhone.startsWith("+254")) {
      return cleanPhone;
    } else if (cleanPhone.startsWith("254")) {
      return "+" + cleanPhone;
    } else if (cleanPhone.startsWith("0")) {
      return "+254" + cleanPhone.substring(1);
    } else if (cleanPhone.match(/^[17]\d{8}$/)) {
      return "+254" + cleanPhone;
    }
    return phone;
  };

  const searchCustomers = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 3) {
      setCustomers([]);
      return;
    }

    try {
      setSearchingCustomers(true);
      const result = await fetchAllCustomers({ search: searchTerm });
      setCustomers(result || []);
    } catch (error) {
      console.error("Error searching customers:", error);
      setCustomers([]);
    } finally {
      setSearchingCustomers(false);
    }
  };

  const handleCustomerSelect = (value: string, option: any) => {
    const customer = customers.find((c) => c._id === value);
    if (customer) {
      setSelectedCustomer(customer);
      setSelectedCustomerId(customer._id);
      setCustomerInfo({
        phone: customer.phone?.toString() || "",
        name: customer.customer_name || "",
        email: customer.email || "",
      });
      setIsNewCustomer(false);
    }
  };

  const handlePhoneChange = (phone: string) => {
    setCustomerInfo({ ...customerInfo, phone });

    if (selectedCustomer && selectedCustomer.phone?.toString() !== phone) {
      setSelectedCustomer(null);
      setIsNewCustomer(true);
    }

    const timeoutId = setTimeout(() => {
      searchCustomers(phone);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const resetPesapalModal = () => {
    setCustomerInfo({ phone: "", name: "", email: "" });
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setCustomers([]);
    setPesapalModalVisible(false);
    setStkPaymentStatus("idle");
    setStkTrackingId("");
    setCountdown(0);
  };

  // Handle subscription selection
  const handleSubscriptionSelect = (subscriptionId: string | null) => {
    setSelectedSubscription(subscriptionId);
    setUseSubscription(!!subscriptionId);

    // If subscription is selected, clear payment methods
    if (subscriptionId) {
      setSelectedMethod(null);
      setSecondMethod(null);
    }
  };

  // STK Push countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Check payment status periodically for STK Push
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (stkPaymentStatus === "waiting" && stkTrackingId) {
      intervalId = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/orders/payment-status?tracking_id=${stkTrackingId}`
          );
          const data = await response.json();

          if (data.success && data.payment_status === "COMPLETED") {
            setStkPaymentStatus("success");
            message.success("Payment completed successfully!");
            setTimeout(() => {
              resetPesapalModal();
              setDrawerVisible(false);
              dispatch(createCart(id));
              navigate("/tables");
            }, 2000);
          } else if (data.payment_status === "FAILED") {
            setStkPaymentStatus("failed");
            message.error("Payment failed. Please try again.");
          }
        } catch (error) {
          console.error("Error checking payment status:", error);
        }
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [stkPaymentStatus, stkTrackingId]);

  useEffect(() => {
    const checkPesapalStatus = async () => {
      try {
        const isConfigured = await pesapalApi.isConfiguredForCurrentTenant();
        setPesapalEnabled(isConfigured);
      } catch (error) {
        setPesapalEnabled(false);
      }
    };

    checkPesapalStatus();
  }, []);

  const handleRemoveDiscount = () => {
    const cartUpdateData = {
      cart: cartDetails,
      data: {
        discount: 0,
        discount_type: "",
      },
    };
    dispatch(updateCart(cartUpdateData as any));
    message.success("Discount removed successfully.");
  };

  const {
    isLoading,
    error: Derror,
    data: paymentMethods,
  } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: fetchAllPaymentMethods,
    networkMode: "always",
  });

  const isPesapalMethod = (methodId: string) => {
    const method = paymentMethods?.find((m) => m._id === methodId);
    return (
      method?.name.toLowerCase().includes("pal") ||
      method?.name.toLowerCase().includes("gateway")
    );
  };

  const handleSelectMethod = (method: string) => {
    // Don't allow method selection if subscription is selected
    if (useSubscription) {
      message.info("Please deselect subscription to use a payment method");
      return;
    }

    if (isPesapalMethod(method) && !pesapalEnabled) {
      message.info(
        "STK Push payment is not available. Please contact administrator to enable Pesapal configuration."
      );
      return;
    }

    if (!selectedMethod) {
      setSelectedMethod(method);
    } else if (!secondMethod) {
      setSecondMethod(method);
      setOpenModal(true);
    }
  };

  const handleModalClose = () => {
    setOpenModal(false);
    setSecondMethod(null);
    setAmount1(0);
    setAmount2(0);
  };

  const handleSplitConfirm = async () => {
    const totalAmountCheck = amount1 + amount2;
    if (
      !amount1 ||
      amount1 < 1 ||
      !amount2 ||
      amount2 < 1 ||
      totalAmountCheck !== grandTotal
    ) {
      message.error("The split amounts must equal the total amount.");
      return;
    }

    const twoMethods = [selectedMethod, secondMethod];
    const twoAmounts = [amount1, amount2];
    const orderDetails = {
      cart_id: cartDetails?._id,
      order_amount: twoAmounts,
      table_id: id,
      updated_by: user?.id,
      order_no: cartDetails?.order_no,
      cart_items: cartDetails.items,
      method_id: twoMethods,
    };

    try {
      const result = await dispatch(createOrder(orderDetails));

      if (result.type.endsWith("/fulfilled")) {
        setDrawerVisible(false);
        dispatch(createCart(id));
        navigate("/tables");
        message.success("Payment successful!");
      }
    } catch (error) {
      console.error("Split payment failed:", error);
    }
  };

  const handlePayment = async () => {
    // Handle subscription payment
    if (useSubscription && selectedSubscription) {
      if (!selectedCustomerId) {
        message.error("Please select a customer for subscription order");
        return;
      }

      const orderDetails = {
        cart_id: cartDetails?._id,
        order_amount: 0,
        table_id: id,
        updated_by: user?.id,
        order_no: cartDetails?.order_no,
        cart_items: cartDetails.items,
        method_id: null,
        use_subscription: true,
        subscription_id: selectedSubscription,
        customer_id: selectedCustomerId,
      };

      try {
        const result = await dispatch(createOrder(orderDetails));

        if (result.type.endsWith("/fulfilled")) {
          message.success("Order placed successfully using subscription visit!");
          setDrawerVisible(false);
          setSelectedSubscription(null);
          setUseSubscription(false);
          setSelectedCustomerId(null);
          dispatch(createCart(id));
          navigate("/tables");
        }
      } catch (error) {
        console.error("Subscription order failed:", error);
      }
      return;
    }

    // Regular payment flow
    if (!selectedMethod) {
      message.error("Please select a payment method.");
      return;
    }

    if (isPesapalMethod(selectedMethod)) {
      setPesapalModalVisible(true);
      return;
    }

    if (secondMethod) {
      setOpenModal(true);
    } else {
      const orderDetails = {
        cart_id: cartDetails?._id,
        order_amount: grandTotal,
        table_id: id,
        updated_by: user?.id,
        order_no: cartDetails?.order_no,
        cart_items: cartDetails.items,
        method_id: selectedMethod,
        customer_id: selectedCustomerId || undefined,
      };

      try {
        const result = await dispatch(createOrder(orderDetails));

        if (result.type.endsWith("/fulfilled")) {
          setDrawerVisible(false);
          setSelectedCustomerId(null);
          dispatch(createCart(id));
          navigate("/tables");
          message.success("Payment successful!");
        }
      } catch (error) {
        console.error("Payment failed:", error);
      }
    }
  };

  const handleSTKPushPayment = async () => {
    if (!customerInfo.phone) {
      message.error("Customer phone number is required for STK Push payment");
      return;
    }

    if (!isValidKenyanPhone(customerInfo.phone)) {
      message.error(
        "Please enter a valid Kenyan phone number for STK Push (e.g., 0712345678)"
      );
      return;
    }

    try {
      if (isNewCustomer && customerInfo.phone && !selectedCustomer) {
        try {
          const newCustomerData = {
            phone: customerInfo.phone,
            customer_name: customerInfo.name || "Customer",
            email: customerInfo.email || "",
            shop_id: localStorage.getItem("shopId"),
          };

          const createdCustomer = await addNewCustomer(newCustomerData);
          setSelectedCustomerId(createdCustomer?.customer?._id || null);
          message.success("New customer created successfully");
        } catch (customerError) {
          console.warn(
            "Could not create customer, but proceeding with payment:",
            customerError
          );
        }
      }

      const shopId = localStorage.getItem("shopId");
      if (!shopId) {
        message.error("Shop configuration not found");
        return;
      }

      const orderDetails = {
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
        customer_email:
          customerInfo.email || `${customerInfo.phone}@customer.local`,
        enable_stk_push: true,
        stk_phone_number: customerInfo.phone,
        customer_id: selectedCustomerId || undefined,
      };

      setStkPaymentStatus("sending");
      setCountdown(300);

      const result = await dispatch(createOrder(orderDetails));

      if (result?.payload?.payment?.stk_push) {
        setStkPaymentStatus("waiting");
        setStkTrackingId(result.payload.payment.stk_push.tracking_id);
        message.success(
          `STK Push sent to ${formatPhoneNumber(customerInfo.phone)}`
        );
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
        message.success("Bill voided successfully.");
        navigate("/tables");
      },
    });
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    const name = method.name.toLowerCase();

    if (name === "cash") {
      return <DollarOutlined style={{ fontSize: "32px" }} />;
    } else if (name === "m-pesa" || name.includes("mpesa")) {
      return <MobileOutlined style={{ fontSize: "32px" }} />;
    } else if (name === "card") {
      return <CreditCardOutlined style={{ fontSize: "32px" }} />;
    } else if (name === "debt") {
      return <WalletOutlined style={{ fontSize: "32px" }} />;
    } else if (name.includes("pesapal") || name.includes("gateway")) {
      return <MobileOutlined style={{ fontSize: "32px" }} />;
    } else {
      return <FileAddOutlined style={{ fontSize: "32px" }} />;
    }
  };

  const renderSTKPushStatus = () => {
    switch (stkPaymentStatus) {
      case "sending":
        return (
          <Card style={{ textAlign: "center", margin: "16px 0" }}>
            <LoadingOutlined style={{ fontSize: "24px", color: "#1890ff" }} />
            <Title level={4} style={{ margin: "16px 0 8px 0" }}>
              Sending STK Push...
            </Title>
            <Text type="secondary">
              Please wait while we send the payment request
            </Text>
          </Card>
        );

      case "waiting":
        return (
          <Card style={{ textAlign: "center", margin: "16px 0" }}>
            <MobileOutlined style={{ fontSize: "24px", color: "#52c41a" }} />
            <Title level={4} style={{ margin: "16px 0 8px 0" }}>
              Payment Request Sent!
            </Title>
            <Text strong>
              Check your phone: {formatPhoneNumber(customerInfo.phone)}
            </Text>
            <br />
            <Text type="secondary">
              Enter your M-Pesa PIN to complete payment
            </Text>
            <br />
            <Tag color="blue" style={{ marginTop: 8 }}>
              Time remaining: {Math.floor(countdown / 60)}:
              {String(countdown % 60).padStart(2, "0")}
            </Tag>
          </Card>
        );

      case "success":
        return (
          <Card style={{ textAlign: "center", margin: "16px 0" }}>
            <CheckCircleOutlined
              style={{ fontSize: "24px", color: "#52c41a" }}
            />
            <Title
              level={4}
              style={{ margin: "16px 0 8px 0", color: "#52c41a" }}
            >
              Payment Successful!
            </Title>
            <Text>Redirecting to tables...</Text>
          </Card>
        );

      case "failed":
        return (
          <Card style={{ textAlign: "center", margin: "16px 0" }}>
            <CloseCircleOutlined
              style={{ fontSize: "24px", color: "#ff4d4f" }}
            />
            <Title
              level={4}
              style={{ margin: "16px 0 8px 0", color: "#ff4d4f" }}
            >
              Payment Failed
            </Title>
            <Text type="secondary">
              Please try again or use a different payment method
            </Text>
          </Card>
        );

      default:
        return null;
    }
  };

  if (isLoading || packagesLoading) {
    return (
      <Space
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 4,
          width: "100%",
        }}
      >
        <Spin />
      </Space>
    );
  }

  if (Derror) {
    return (
      <Space
        style={{ display: "flex", justifyContent: "center", marginTop: 4 }}
      >
        <Alert
          message="An error occurred while fetching payment methods."
          type="error"
          showIcon
        />
      </Space>
    );
  }

  return (
    <>
      <DrawerForm
        style={{ display: "flex", flexDirection: "column" }}
        title={
          <Space style={{ display: "flex", justifyContent: "space-between" }}>
            <Typography.Text style={{ fontSize: "20px" }}>
              Payment
            </Typography.Text>
            <DiscountModal data={cartDetails} />
          </Space>
        }
        key={"payment"}
        aria-label="payment options"
        resize={{
          maxWidth: window.innerWidth * 0.8,
          minWidth: 560,
        }}
        open={drawerVisible}
        onOpenChange={setDrawerVisible}
        submitter={{
          submitButtonProps: {
            block: true,
          },
          render: () => {
            return (
              <Flex
                style={{ justifyContent: "space-between", width: "100%" }}
                gap={16}
              >
                <Button
                  key="submit"
                  type="primary"
                  size={"large"}
                  onClick={handlePayment}
                  loading={loading}
                  disabled={useSubscription ? !selectedSubscription : !selectedMethod}
                  icon={useSubscription ? <GiftOutlined /> : <FileOutlined />}
                  block
                >
                  {useSubscription
                    ? "Confirm Subscription Visit"
                    : "Confirm Payment"}
                </Button>
                <Button
                  block
                  key="cancel"
                  size={"large"}
                  onClick={() => {
                    setDrawerVisible(false);
                    setSelectedCustomerId(null);
                    setSelectedSubscription(null);
                    setUseSubscription(false);
                  }}
                >
                  Cancel
                </Button>
              </Flex>
            );
          },
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
          },
        }}
        trigger={
          <Button
            type="primary"
            block
            onClick={() => {
              if (!cartDetails?.items || cartDetails.items.length === 0) {
                message.error(
                  "Cart is empty. Please add items before proceeding to payment."
                );
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
            size="small"
            bordered={false}
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
                    - KSH.{" "}
                    {(
                      (subtotal * (cartDetails.discount || 0)) /
                      100
                    ).toLocaleString()}
                  </Text>
                  {cartDetails.discount > 0 && (
                    <Button
                      type="link"
                      danger
                      size="small"
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
                <Title level={5} style={{ margin: 0 }}>
                  Amount Due
                </Title>
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
              type="success"
              showIcon
              style={{ borderRadius: 8 }}
            />
          )}

          {/* CUSTOMER & SUBSCRIPTION SECTION - Enhanced UI */}
          {hasActivePackages && (
            <>
              <Card
                title={
                  <Space>
                    <UserOutlined style={{ color: "#6c1c2c" }} />
                    <Text strong>Customer Selection</Text>
                    {selectedCustomerId && (
                      <Badge status="success" text="Selected" />
                    )}
                  </Space>
                }
                size="small"
                style={{
                  borderRadius: 8,
                  border: selectedCustomerId ? "2px solid #52c41a" : "1px solid #d9d9d9"
                }}
              >
                <Select
                  style={{ width: "100%" }}
                  size="large"
                  placeholder={
                    <Space>
                      <SearchOutlined />
                      <span>Search by phone or name (min 3 characters)</span>
                    </Space>
                  }
                  showSearch
                  allowClear
                  value={selectedCustomerId}
                  onChange={(value) => {
                    setSelectedCustomerId(value);
                    if (!value) {
                      setSelectedSubscription(null);
                      setUseSubscription(false);
                    }
                  }}
                  onSearch={(value) => {
                    if (value.length >= 3) {
                      searchCustomers(value);
                    } else {
                      setCustomers([]);
                    }
                  }}
                  filterOption={false}
                  notFoundContent={
                    searchingCustomers ? (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        <Spin size="small" />
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary">Searching customers...</Text>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        <InfoCircleOutlined style={{ fontSize: 24, color: "#8c8c8c" }} />
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary">Type at least 3 characters to search</Text>
                        </div>
                      </div>
                    )
                  }
                  suffixIcon={<SearchOutlined />}
                >
                  {customers.map((customer: any) => (
                    <Select.Option key={customer._id} value={customer._id}>
                      <Space direction="vertical" size={0} style={{ width: "100%" }}>
                        <Flex justify="space-between" align="center">
                          <Text strong>{customer.customer_name}</Text>
                          {customer.phone && (
                            <Tag color="blue" icon={<PhoneOutlined />}>
                              {customer.phone}
                            </Tag>
                          )}
                        </Flex>
                        {customer.email && (
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            {customer.email}
                          </Text>
                        )}
                      </Space>
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
                      customers.find((c) => c._id === selectedCustomerId) && (
                        <Space direction="vertical" size={4}>
                          <Text>
                            {customers.find((c) => c._id === selectedCustomerId)?.customer_name}
                          </Text>
                          <Text type="secondary">
                            {customers.find((c) => c._id === selectedCustomerId)?.phone}
                          </Text>
                        </Space>
                      )
                    }
                    type="success"
                    showIcon={false}
                  />
                )}
              </Card>

              {/* SUBSCRIPTION PAYMENT OPTION - Always show if customer is selected */}
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

          {/* PAYMENT METHOD SECTION - Only show when NOT using subscription */}
          {!useSubscription && (
            <Card
              title={
                <Space>
                  <WalletOutlined style={{ color: "#6c1c2c" }} />
                  <Text strong>Payment Method</Text>
                </Space>
              }
              size="small"
              style={{ borderRadius: 8 }}
            >
              <Space
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
                size={[12, 12]}
              >
                {paymentMethods?.map((method: PaymentMethod) => {
                  const isPesapal = isPesapalMethod(method._id);
                  const isDisabled = isPesapal && !pesapalEnabled;
                  const isSelected = selectedMethod === method._id;

                  return (
                    <ProCard
                      key={method._id}
                      bodyStyle={{
                        paddingInline: "20px",
                        paddingBlock: "20px",
                        minWidth: "120px"
                      }}
                      bordered
                      hoverable={!isDisabled}
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
                      <Space
                        direction="vertical"
                        align="center"
                        style={{
                          color: isSelected ? "white" : "inherit",
                        }}
                      >
                        {getPaymentMethodIcon(method)}
                        <Typography.Text
                          strong
                          style={{
                            color: isSelected ? "white" : "inherit",
                            fontSize: "14px",
                          }}
                        >
                          {method.name === "M-Pesa"
                            ? "Mpesa"
                            : method.name.includes("pesapal") ||
                              method.name.includes("gateway")
                              ? "STK Push"
                              : method.name.charAt(0).toUpperCase() +
                              method.name.slice(1)}
                        </Typography.Text>
                        {isDisabled && (
                          <Tag color="red" style={{ fontSize: "10px" }}>
                            Unavailable
                          </Tag>
                        )}
                      </Space>
                    </ProCard>
                  );
                })}
              </Space>

              <Space
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  marginTop: 16,
                }}
              >
                {(user?.role === "admin" || user?.role === "cashier") && selectedMethod && (
                  <Button
                    danger
                    onClick={() => {
                      setSelectedMethod(null);
                    }}
                    icon={<CloseCircleOutlined />}
                  >
                    Clear Selection
                  </Button>
                )}
                {(user?.role === "admin" || user?.role === "Cashier") && (
                  <Button
                    type="default"
                    onClick={handleVoidBill}
                    icon={<StopOutlined />}
                    style={{
                      color: "#6c1c2c",
                      borderColor: "#6c1c2c",
                    }}
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
        title={
          <Space align="center">
            <MobileOutlined style={{ color: "#52c41a" }} />
            <span>STK Push Payment</span>
          </Space>
        }
        open={pesapalModalVisible}
        onCancel={resetPesapalModal}
        footer={null}
        width={600}
        maskClosable={false}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          {renderSTKPushStatus()}

          {stkPaymentStatus === "idle" && (
            <Card size="small">
              <Title level={5}>Customer Information</Title>

              <Space direction="vertical" style={{ width: "100%" }}>
                <div>
                  <Text strong>
                    <PhoneOutlined /> Customer Phone *
                  </Text>
                  <Input
                    value={customerInfo.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="0712345678 (Kenyan number)"
                    style={{ marginTop: 4 }}
                    maxLength={15}
                    prefix={<PhoneOutlined />}
                  />
                  {customerInfo.phone &&
                    !isValidKenyanPhone(customerInfo.phone) && (
                      <Text
                        type="danger"
                        style={{
                          fontSize: "12px",
                          display: "block",
                          marginTop: 4,
                        }}
                      >
                        Please enter a valid Kenyan phone number (e.g.,
                        0712345678)
                      </Text>
                    )}
                  {searchingCustomers && (
                    <Text
                      type="secondary"
                      style={{
                        fontSize: "12px",
                        display: "block",
                        marginTop: 4,
                      }}
                    >
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
                      onSelect={handleCustomerSelect}
                      options={customers.map((customer) => ({
                        value: customer._id,
                        label: `${customer.customer_name} (${customer.phone})`,
                      }))}
                    />
                  </div>
                )}

                {(isNewCustomer || !selectedCustomer) && customerInfo.phone && (
                  <>
                    <div>
                      <Text strong>Customer Name</Text>
                      <Input
                        value={customerInfo.name}
                        onChange={(e) =>
                          setCustomerInfo({
                            ...customerInfo,
                            name: e.target.value,
                          })
                        }
                        placeholder="Customer Name"
                        style={{ marginTop: 4 }}
                      />
                    </div>

                    <div>
                      <Text strong>Customer Email (Optional)</Text>
                      <Input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) =>
                          setCustomerInfo({
                            ...customerInfo,
                            email: e.target.value,
                          })
                        }
                        placeholder="customer@example.com"
                        style={{ marginTop: 4 }}
                      />
                    </div>
                  </>
                )}

                {selectedCustomer && (
                  <Alert
                    message={`Selected: ${selectedCustomer.customer_name} (${selectedCustomer.phone})`}
                    type="success"
                    style={{ marginTop: 8 }}
                    showIcon
                  />
                )}
              </Space>
            </Card>
          )}

          <Card size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Payment Amount"
                  value={grandTotal}
                  prefix="KSh."
                  precision={2}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Payment Method"
                  value="STK Push"
                  prefix={<MobileOutlined />}
                />
              </Col>
            </Row>
          </Card>

          {stkPaymentStatus === "idle" && (
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={resetPesapalModal}>Cancel</Button>
              <Button
                type="primary"
                onClick={handleSTKPushPayment}
                loading={loading || stkPaymentStatus === "sending"}
                disabled={
                  !customerInfo.phone || !isValidKenyanPhone(customerInfo.phone)
                }
                icon={<SendOutlined />}
              >
                Send STK Push
              </Button>
            </Space>
          )}

          {stkPaymentStatus === "waiting" && (
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Button
                onClick={() => {
                  setStkPaymentStatus("idle");
                  setStkTrackingId("");
                  setCountdown(0);
                }}
              >
                Try Again
              </Button>
              <Button type="default" onClick={resetPesapalModal}>
                Cancel Payment
              </Button>
            </Space>
          )}

          {stkPaymentStatus === "failed" && (
            <Space style={{ width: "100%", justifyContent: "center" }}>
              <Button
                type="primary"
                onClick={() => {
                  setStkPaymentStatus("idle");
                  setStkTrackingId("");
                  setCountdown(0);
                }}
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
                  <p>
                    • They need to enter their M-Pesa PIN to complete payment
                  </p>
                  <p>
                    • Payment will be processed automatically once confirmed
                  </p>
                  <p>• Ensure the phone number is correct and active</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Space>
      </Modal>

      {/* Payment Waiting Modal */}
      <Modal
        title="Payment Status Monitor"
        open={stkPaymentStatus === "waiting"}
        footer={null}
        closable={false}
        width={400}
        centered
      >
        <Space
          direction="vertical"
          style={{ width: "100%", textAlign: "center" }}
          size="large"
        >
          <div style={{ fontSize: "48px" }}>
            <MobileOutlined
              style={{ color: "#52c41a", animation: "pulse 2s infinite" }}
            />
          </div>

          <div>
            <Title level={4}>Waiting for Payment</Title>
            <Text>STK Push sent to:</Text>
            <br />
            <Text strong style={{ fontSize: "16px" }}>
              {formatPhoneNumber(customerInfo.phone)}
            </Text>
          </div>

          <div>
            <Text type="secondary">
              Customer should check their phone and enter M-Pesa PIN
            </Text>
          </div>

          <div>
            <Tag color="blue" style={{ fontSize: "14px", padding: "4px 12px" }}>
              ⏱️ {Math.floor(countdown / 60)}:
              {String(countdown % 60).padStart(2, "0")} remaining
            </Tag>
          </div>

          <Divider />

          <Space>
            <Button
              onClick={() => {
                setStkPaymentStatus("idle");
                setStkTrackingId("");
                setCountdown(0);
              }}
            >
              Cancel & Retry
            </Button>
            <Button type="default" onClick={resetPesapalModal}>
              Cancel Payment
            </Button>
          </Space>
        </Space>
      </Modal>

      {/* Success Modal */}
      <Modal
        title={null}
        open={stkPaymentStatus === "success"}
        footer={null}
        closable={false}
        width={300}
        centered
      >
        <Space
          direction="vertical"
          style={{ width: "100%", textAlign: "center" }}
          size="large"
        >
          <CheckCircleOutlined style={{ fontSize: "64px", color: "#52c41a" }} />
          <Title level={3} style={{ color: "#52c41a", margin: 0 }}>
            Payment Successful!
          </Title>
          <Text>KSh. {grandTotal?.toLocaleString()} paid successfully</Text>
          <Text type="secondary">Redirecting to tables...</Text>
        </Space>
      </Modal>

      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default PaymentDrawer;