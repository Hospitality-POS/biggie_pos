/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { Alert, Button, Modal, Space, Spin, Typography } from "antd";
import {
  CloseCircleOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileAddOutlined,
  LikeOutlined,
  LoadingOutlined,
  MobileOutlined,
  StopOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { fetchAllPaymentMethods } from "@services/paymentMethod";

const PaymentDrawer: React.FC = () => {
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

  const {
    isLoading,
    error: Derror,
    data,
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
    setSelectedMethod(null);
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
    // dispatch(getCart(id))
    if (!error) {
      dispatch(createCart(id));
      dispatch(logoutUser());
      dispatch(reset());
      navigate("/tables");
    }
  };

  const handlePayment = (methodId: string) => {
    if (secondMethod) {
      // logic to open the modal for splitting the bill
      setOpenModal(true);
    } else {
      const orderDetails = {
        cart_id: cartDetails?._id,
        order_amount: totalAmount,
        table_id: id,
        updated_by: user?.id,
        order_no: cartDetails?.order_no,
        cart_items: cartDetails.items,
        method_id: methodId,
      };
      dispatch(createOrder(orderDetails));
      if (!error) {
        dispatch(createCart(id));
        dispatch(logoutUser());
        dispatch(reset());
        navigate("/tables");
      }
    }
  };

  const handleVoidBill = () => {
    dispatch(cartVoid(cartDetails));
    dispatch(createCart(id));
    Modal.info({title:"Void Bill", content:"Voided bill Succesfully", centered: true})
    dispatch(logoutUser());
    dispatch(reset());
    navigate("/tables");

  };

  if (isLoading) {
    return (
      <Space
        style={{ display: "flex", justifyContent: "center", marginTop: 4 }}
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
    <Space direction="vertical" style={{ width: "100%" }}>
      <Typography.Title level={5}>Payment Method</Typography.Title>
      <Space
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        {data.map((method: { _id: string; name: string }) => (
          <ProCard
            key={method._id}
            bodyStyle={{ paddingInline: "12px", paddingBlock: "16px" }}
            bordered
            onClick={() => handleSelectMethod(method._id)}
            style={{
              backgroundColor: `${
                selectedMethod === method._id ? "#6c1c2c" : grey[400]
              }`,
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
                  <Typography.Text
                    strong
                    style={{
                      color: `${
                        selectedMethod === method._id ? "white" : "inherit"
                      }`,
                    }}
                  >
                    Cash
                  </Typography.Text>
                  <DollarOutlined style={{ fontSize: "16px" }} />
                </>
              ) : method.name === "M-Pesa" ? (
                <>
                  <Typography.Text
                    strong
                    style={{
                      color: `${
                        selectedMethod === method._id ? "white" : "inherit"
                      }`,
                    }}
                  >
                    mpesa
                  </Typography.Text>
                  <MobileOutlined style={{ fontSize: "16px" }} />
                </>
              ) : method.name === "Card" ? (
                <>
                  <Typography.Text
                    strong
                    style={{
                      color: `${
                        selectedMethod === method._id ? "white" : "inherit"
                      }`,
                    }}
                  >
                    card
                  </Typography.Text>
                  <CreditCardOutlined style={{ fontSize: "16px" }} />
                </>
              ) : method.name === "Debt" ? (
                <>
                  <Typography.Text
                    strong
                    style={{
                      color: `${
                        selectedMethod === method._id ? "white" : "inherit"
                      }`,
                    }}
                  >
                    Debt
                  </Typography.Text>
                  <WalletOutlined style={{ fontSize: "16px" }} />
                </>
              ) : (
                <>
                  <Typography.Text
                    strong
                    style={{
                      color: `${
                        selectedMethod === method._id ? "white" : "inherit"
                      }`,
                    }}
                  >
                    {method.name}
                  </Typography.Text>
                  <FileAddOutlined style={{ fontSize: "26px" }} />
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
          marginTop: 4,
        }}
      >
        <Button
          danger
          onClick={() => {
            setSelectedMethod(null);
          }}
          icon={<CloseCircleOutlined />}
        >
          Clear
        </Button>
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
        <Button
          type="primary"
          icon={loading ? <LoadingOutlined /> : <LikeOutlined />}
          onClick={() => handlePayment(selectedMethod as string)}
          disabled={!selectedMethod}
        >
          Confirm
        </Button>
      </Space>

      {selectedMethod !== secondMethod && (
        <SplitBillDialog
          open={openModal}
          handleModalClose={handleModalClose}
          data={data}
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
  );
};

export default PaymentDrawer;
