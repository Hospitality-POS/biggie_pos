import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { grey } from "@mui/material/colors";
import { createOrder } from "@features/Order/OrderActions";
import { useNavigate, useParams } from "react-router-dom";
import { cartVoid, createCart } from "@features/Cart/CartActions";
import { logoutUser } from "@features/Auth/AuthActions";
import { reset } from "@features/Auth/AuthSlice";
import SplitBillDialog from "../MODALS/Dialogs/SplitBillDialog";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  Alert,
  Button,
  Col,
  Divider,
  Form,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  Typography,
  message,
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
} from "@ant-design/icons";
import { DrawerForm, ProCard } from "@ant-design/pro-components";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import DiscountModal from "@components/MODALS/pro/DiscountModal";

const PaymentDrawer: React.FC = () => {
  const [form] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { cartDetails, totalAmount } = useAppSelector((state) => state.cart);
  const { loading, error } = useAppSelector((state) => state.order);
  const { user } = useAppSelector((state) => state.auth);
  const [selectedMethod, setSelectedMethod] = useState<null | string>(null);
  const [secondMethod, setSecondMethod] = useState<null | string>(null);
  const [openModal, setOpenModal] = useState(false);
  const [amount1, setAmount1] = useState(0);
  const [amount2, setAmount2] = useState(0);

  const totalCartAmount = cartDetails?.items.reduce((acc, item) => {
    return acc + item.price;
  }, 0) || 0;

  // Function to calculate the final amount after discount
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
    data: paymentMethods
  } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: fetchAllPaymentMethods,
    networkMode: "always",
  });

  const handleSelectMethod = (method: string) => {
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

  const handleSplitConfirm = () => {
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

    dispatch(createOrder(orderDetails));

    // Close drawer after payment processing
    setDrawerVisible(false);

    if (!error) {
      dispatch(createCart(id));
      navigate("/tables");
      message.success("Payment successful!");
    }
  };

  const handlePayment = () => {
    if (!selectedMethod) {
      message.error("Please select a payment method.");
      return;
    }

    if (secondMethod) {
      // Open the modal for splitting the bill
      setOpenModal(true);
    } else {
      // Process single payment method
      const orderDetails = {
        cart_id: cartDetails?._id,
        order_amount: totalAmount,
        table_id: id,
        updated_by: user?.id,
        order_no: cartDetails?.order_no,
        cart_items: cartDetails.items,
        method_id: selectedMethod,
      };

      dispatch(createOrder(orderDetails));

      // Close drawer after payment processing
      setDrawerVisible(false);

      if (!error) {
        dispatch(createCart(id));
        navigate("/tables");
        message.success("Payment successful!");
      }
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

        // Close drawer after voiding
        setDrawerVisible(false);

        message.success("Bill voided successfully.");
        navigate("/tables");
      }
    });
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
        render: () => [
          <Button
            key="cancel"
            onClick={() => setDrawerVisible(false)}
            style={{ marginRight: 8 }}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handlePayment}
            loading={loading}
            disabled={!selectedMethod}
            icon={<FileOutlined />}
            block
          >
            Confirm Order Payment
          </Button>,
        ],
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
            // Validate cart has items before opening payment drawer
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
            {paymentMethods?.map((method: { _id: string; name: string }) => (
              <ProCard
                key={method._id}
                bodyStyle={{ paddingInline: "20px", paddingBlock: "26px" }}
                bordered
                onClick={() => handleSelectMethod(method._id)}
                style={{
                  backgroundColor: `${selectedMethod === method._id ? "#6c1c2c" : grey[400]}`,
                  cursor: "pointer",
                  transition: "background-color 0.3s ease",
                }}
              >
                <Space
                  style={{
                    color: `${selectedMethod === method._id ? "white" : "inherit"}`,
                  }}
                >
                  {method.name === "Cash" ? (
                    <>
                      <DollarOutlined style={{ fontSize: "32px" }} />
                      <Typography.Text
                        strong
                        style={{
                          color: `${selectedMethod === method._id ? "white" : "inherit"}`,
                        }}
                      >
                        Cash
                      </Typography.Text>
                    </>
                  ) : method.name === "M-Pesa" ? (
                    <>
                      <MobileOutlined style={{ fontSize: "32px" }} />
                      <Typography.Text
                        strong
                        style={{
                          color: `${selectedMethod === method._id ? "white" : "inherit"}`,
                        }}
                      >
                        Mpesa
                      </Typography.Text>
                    </>
                  ) : method.name === "Card" ? (
                    <>
                      <CreditCardOutlined style={{ fontSize: "32px" }} />
                      <Typography.Text
                        strong
                        style={{
                          color: `${selectedMethod === method._id ? "white" : "inherit"}`,
                        }}
                      >
                        Card
                      </Typography.Text>
                    </>
                  ) : method.name === "Debt" ? (
                    <>
                      <WalletOutlined style={{ fontSize: "32px" }} />
                      <Typography.Text
                        strong
                        style={{
                          color: `${selectedMethod === method._id ? "white" : "inherit"}`,
                        }}
                      >
                        Debt
                      </Typography.Text>
                    </>
                  ) : (
                    <>
                      <FileAddOutlined style={{ fontSize: "32px" }} />
                      <Typography.Text
                        strong
                        style={{
                          color: `${selectedMethod === method._id ? "white" : "inherit"}`,
                        }}
                      >
                        {method?.name[0]?.toUpperCase()}
                        {method?.name?.slice(1)}
                      </Typography.Text>
                    </>
                  )}
                </Space>
              </ProCard>
            ))}
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
                  "&:hover": {
                    borderColor: "#bc8c7c",
                    color: "#bc8c7c",
                  },
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
  );
};

export default PaymentDrawer;