import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { grey } from "@mui/material/colors";
import { createOrder } from "@features/Order/OrderActions";
import { cartVoid, createCart } from "@features/Cart/CartActions";
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
  GlobalOutlined,
  PhoneOutlined,
  SendOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { DrawerForm, ProCard } from "@ant-design/pro-components";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import DiscountModal from "@components/MODALS/pro/DiscountModal";
import pesapalApi from "@services/pesapalApi";
import { fetchAllCustomers, addNewCustomer } from "@services/customers";

const { Text, Title } = Typography;

interface PaymentMethod {
  _id: string;
  name: string;
}

const PaymentDrawer: React.FC = () => {
  const [form] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = (path: string) => (window.location.href = path);
  const id = window.location.pathname.split("/").pop();
  const { cartDetails, totalAmount } = useAppSelector((state) => state.cart);
  const { loading, error } = useAppSelector((state) => state.order);
  const { user } = useAppSelector((state) => state.auth);

  // Payment method states
  const [selectedMethod, setSelectedMethod] = useState<null | string>(null);
  const [secondMethod, setSecondMethod] = useState<null | string>(null);
  const [openModal, setOpenModal] = useState(false);
  const [amount1, setAmount1] = useState(0);
  const [amount2, setAmount2] = useState(0);

  // STK Push states
  const [pesapalEnabled, setPesapalEnabled] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    phone: "",
    name: "",
    email: "",
  });
  const [pesapalModalVisible, setPesapalModalVisible] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // STK Push specific states
  const [stkPaymentStatus, setStkPaymentStatus] = useState<
    "idle" | "sending" | "waiting" | "success" | "failed"
  >("idle");
  const [stkTrackingId, setStkTrackingId] = useState<string>("");
  const [countdown, setCountdown] = useState(0);

  const totalCartAmount =
    cartDetails?.items.reduce((acc, item) => {
      return acc + item.price;
    }, 0) || 0;

  // Phone number validation for Kenyan numbers
  const isValidKenyanPhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
    const patterns = [
      /^\+254[17]\d{8}$/, // +254712345678 or +254112345678
      /^254[17]\d{8}$/, // 254712345678 or 254112345678
      /^0[17]\d{8}$/, // 0712345678 or 0112345678
      /^[17]\d{8}$/, // 712345678 or 112345678
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

  const searchCustomers = async (phone: string) => {
    if (!phone || phone.length < 3) {
      setCustomers([]);
      return;
    }

    try {
      setSearchingCustomers(true);
      const result = await fetchAllCustomers({ phone });
      setCustomers(result?.data || []);
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
      setCustomerInfo({
        phone: customer.phone || "",
        name: customer.customer_name || "",
        email: customer.email || "",
      });
      setIsNewCustomer(false);
    }
  };

  const handlePhoneChange = (phone: string) => {
    setCustomerInfo({ ...customerInfo, phone });

    if (selectedCustomer && selectedCustomer.phone !== phone) {
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
          // Poll payment status API
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
      }, 3000); // Check every 3 seconds
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

  const calculateFinalAmount = () => {
    if (!cartDetails?.discount) {
      return totalCartAmount.toLocaleString();
    }
    if (cartDetails?.discount_type === "percentage") {
      return totalCartAmount - totalCartAmount * (cartDetails?.discount / 100);
    } else {
      return totalCartAmount - cartDetails?.discount;
    }
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
      totalAmountCheck !== totalAmount
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

      // Only proceed after successful order creation
      if (result.type.endsWith("/fulfilled")) {
        setDrawerVisible(false);
        dispatch(createCart(id));
        navigate("/tables");
        message.success("Payment successful!");
      }
    } catch (error) {
      // Error handling is managed by Redux, but drawer stays open
      console.error("Split payment failed:", error);
    }
  };

  const handlePayment = async () => {
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
        order_amount: totalAmount,
        table_id: id,
        updated_by: user?.id,
        order_no: cartDetails?.order_no,
        cart_items: cartDetails.items,
        method_id: selectedMethod,
      };

      try {
        const result = await dispatch(createOrder(orderDetails));

        // Only close drawer and navigate after successful order creation
        if (result.type.endsWith("/fulfilled")) {
          setDrawerVisible(false);
          dispatch(createCart(id));
          navigate("/tables");
          message.success("Payment successful!");
        }
      } catch (error) {
        // Error handling is managed by Redux, but drawer stays open
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

          await addNewCustomer(newCustomerData);
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
        order_amount: totalAmount,
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
      };

      setStkPaymentStatus("sending");
      setCountdown(300); // 5 minutes countdown

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
      return <MobileOutlined style={{ fontSize: "32px" }} />; // Changed to mobile icon for STK push
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

  if (isLoading) {
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
                  disabled={!selectedMethod}
                  icon={<FileOutlined />}
                  block
                >
                  Confirm Order Payment
                </Button>
                <Button
                  block
                  key="cancel"
                  size={"large"}
                  onClick={() => setDrawerVisible(false)}
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
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text strong style={{ fontSize: "20px" }}>
            Order Summary
          </Typography.Text>
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="Subtotal"
                value={totalCartAmount}
                prefix={"KSh."}
                precision={2}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="Discount"
                value={cartDetails?.discount || 0}
                prefix={
                  cartDetails?.discount_type === "percentage" ? (
                    <PercentageOutlined />
                  ) : (
                    "Ksh."
                  )
                }
                precision={2}
              />
            </Col>
          </Row>
          <Statistic
            title="Total After Discount"
            value={calculateFinalAmount()}
            prefix={"KSh."}
            precision={2}
            style={{ marginTop: 16 }}
          />

          <Space direction="vertical" style={{ width: "100%", marginTop: 24 }}>
            <Typography.Title level={4}>Payment Method</Typography.Title>
            <Space
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              {paymentMethods?.map((method: PaymentMethod) => {
                const isPesapal = isPesapalMethod(method._id);
                const isDisabled = isPesapal && !pesapalEnabled;

                return (
                  <ProCard
                    key={method._id}
                    bodyStyle={{ paddingInline: "20px", paddingBlock: "26px" }}
                    bordered
                    onClick={() => handleSelectMethod(method._id)}
                    style={{
                      backgroundColor: `${
                        selectedMethod === method._id ? "#6c1c2c" : grey[400]
                      }`,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      transition: "background-color 0.3s ease",
                      opacity: isDisabled ? 0.5 : 1,
                    }}
                  >
                    <Space
                      style={{
                        color: `${
                          selectedMethod === method._id ? "white" : "inherit"
                        }`,
                      }}
                    >
                      {getPaymentMethodIcon(method)}
                      <Typography.Text
                        strong
                        style={{
                          color: `${
                            selectedMethod === method._id ? "white" : "inherit"
                          }`,
                        }}
                      >
                        {method.name === "M-Pesa"
                          ? "Mpesa"
                          : method.name.includes("pesapal") ||
                            method.name.includes("gateway")
                          ? "STK Push"
                          : method.name.charAt(0).toUpperCase() +
                            method.name.slice(1)}
                        {isDisabled && " (Unavailable)"}
                      </Typography.Text>
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
              {(user?.role === "admin" || user?.role === "cashier") && (
                <Button
                  danger
                  onClick={() => {
                    setSelectedMethod(null);
                  }}
                  icon={<CloseCircleOutlined />}
                >
                  Clear
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

            {selectedMethod !== secondMethod && (
              <SplitBillDialog
                open={openModal}
                handleModalClose={handleModalClose}
                data={paymentMethods}
                selectedMethod={selectedMethod}
                secondMethod={secondMethod}
                totalAmount={totalAmount}
                amount1={amount1}
                amount2={amount2}
                setSelectedMethod={setSelectedMethod}
                setSecondMethod={setSecondMethod}
                setAmount1={setAmount1}
                setAmount2={setAmount2}
                handleSplitConfirm={handleSplitConfirm}
              />
            )}
          </Space>
        </Space>
      </DrawerForm>

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
          {/* STK Push Status Display */}
          {renderSTKPushStatus()}

          {/* Customer Information Form */}
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

          {/* Payment Summary */}
          <Card size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Payment Amount"
                  value={totalAmount}
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

          {/* Action Buttons */}
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

          {/* STK Push Action Buttons */}
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
                Try STK Push
              </Button>
            </Space>
          )}

          {/* Instructions for STK Push */}
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

      {/* Payment Status Monitoring Modal for STK Push */}
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
          <Text>KSh. {totalAmount?.toLocaleString()} paid successfully</Text>
          <Text type="secondary">Redirecting to tables...</Text>
        </Space>
      </Modal>

      {/* Custom CSS for animations */}
      <style jsx>{`
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

        .payment-method-card {
          transition: all 0.3s ease;
          border-radius: 8px;
        }

        .payment-method-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .stk-status-card {
          border-radius: 12px;
          border: 2px dashed #d9d9d9;
          background: linear-gradient(135deg, #f6f9fc 0%, #ffffff 100%);
        }

        .phone-input-container {
          position: relative;
        }

        .phone-validation-icon {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
        }

        .payment-summary-card {
          background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
          color: white;
          border-radius: 12px;
        }

        .payment-summary-card .ant-statistic-title {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        .payment-summary-card .ant-statistic-content {
          color: white !important;
        }

        .stk-push-modal .ant-modal-header {
          background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
        }

        .stk-push-modal .ant-modal-title {
          color: white;
        }

        .stk-push-instructions {
          background: #f6ffed;
          border: 1px solid #b7eb8f;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .stk-push-instructions ul {
          margin: 0;
          padding-left: 20px;
        }

        .stk-push-instructions li {
          margin-bottom: 8px;
          color: #389e0d;
        }

        .customer-info-card {
          background: #fafafa;
          border: 1px solid #d9d9d9;
          border-radius: 8px;
          padding: 16px;
        }

        .payment-amount-display {
          background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
          margin: 16px 0;
        }

        .phone-number-display {
          background: #f0f2f5;
          border: 2px dashed #d9d9d9;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          margin: 8px 0;
          font-family: monospace;
          font-size: 16px;
          font-weight: bold;
        }

        .status-waiting {
          animation: pulse 2s infinite;
        }

        .countdown-timer {
          background: #1890ff;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .ant-modal {
            margin: 10px;
          }

          .payment-method-cards {
            flex-direction: column;
          }

          .payment-method-card {
            width: 100% !important;
            margin-bottom: 8px;
          }

          .stk-push-modal {
            width: 95% !important;
          }
        }

        /* Enhanced Button Styles */
        .stk-push-button {
          background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
          border: none;
          border-radius: 8px;
          height: 44px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(82, 196, 26, 0.3);
          transition: all 0.3s ease;
        }

        .stk-push-button:hover {
          background: linear-gradient(135deg, #389e0d 0%, #237804 100%);
          box-shadow: 0 4px 12px rgba(82, 196, 26, 0.4);
          transform: translateY(-1px);
        }

        .stk-push-button:disabled {
          background: #f5f5f5;
          color: #bfbfbf;
          box-shadow: none;
          transform: none;
        }

        /* Loading States */
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .success-animation {
          animation: successPulse 0.6s ease-in-out;
        }

        @keyframes successPulse {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .error-shake {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-5px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(5px);
          }
        }

        /* Card Hover Effects */
        .info-card {
          transition: all 0.3s ease;
          border-radius: 12px;
        }

        .info-card:hover {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        /* Status Indicators */
        .status-indicator {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-sending {
          background: #e6f7ff;
          color: #1890ff;
          border: 1px solid #91d5ff;
        }

        .status-waiting {
          background: #fff2e8;
          color: #fa8c16;
          border: 1px solid #ffd591;
        }

        .status-success {
          background: #f6ffed;
          color: #52c41a;
          border: 1px solid #b7eb8f;
        }

        .status-failed {
          background: #fff2f0;
          color: #ff4d4f;
          border: 1px solid #ffccc7;
        }
      `}</style>
    </>
  );
};

export default PaymentDrawer;
