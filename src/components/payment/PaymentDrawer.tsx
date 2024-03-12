/* eslint-disable @typescript-eslint/no-unused-vars */
import { Key, SetStateAction, useState } from "react";
import {
  Box,
  Button,
  CardActions,
  CircularProgress,
  Paper,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import MobileScreenShareIcon from "@mui/icons-material/MobileScreenShare";
import CreditCardOffIcon from "@mui/icons-material/CreditCardOff";
import { grey } from "@mui/material/colors";
import RecommendIcon from "@mui/icons-material/Recommend";
import CloseIcon from "@mui/icons-material/Close";
import { createOrder } from "../../features/Order/OrderActions";
import { useNavigate, useParams } from "react-router-dom";
import { cartVoid, createCart, getCart } from "../../features/Cart/CartActions";
import { logoutUser } from "../../features/Auth/AuthActions";
import { reset } from "../../features/Auth/AuthSlice";
import SplitBillDialog from "../MODALS/Dialogs/SplitBillDialog";
import { useAppDispatch, useAppSelector } from "../../store";
import BlockIcon from "@mui/icons-material/Block";
import { PaymentOutlined } from "@mui/icons-material";
import { Space, Typography } from "antd";
import {
  CreditCardOutlined,
  DollarOutlined,
  FileAddOutlined,
  MobileOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";

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
    queryFn: () =>
      fetch("http://localhost:3000/payment-methods/").then((res) => res.json()),
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

  if (isLoading) {
    return <div>Loading payment methods...</div>;
  }

  if (Derror) {
    return <div>An error occurred while fetching payment methods.</div>;
  }

  return (
    <section>
      <Typography.Title level={4}>Payment Method</Typography.Title>
      <Space
        style={{ display: "flex", justifyContent: "space-between", padding: 4, flexWrap:"wrap" }}
      >
        {data.map((method: { _id: string; name: string }) => (
          <ProCard
            key={method._id}
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
                  <DollarOutlined style={{ fontSize: "26px" }} />
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
                </>
              ) : method.name === "M-Pesa" ? (
                <>
                  <MobileOutlined style={{ fontSize: "26px" }} />
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
                </>
              ) : method.name === "Card" ? (
                <>
                  <CreditCardOutlined style={{ fontSize: "26px" }} />
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
                </>
              ) : method.name === "Debt" ? (
                <>
                  <WalletOutlined style={{ fontSize: "26px" }} />
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
                </>
              ) : (
                <>
                  <FileAddOutlined style={{ fontSize: "26px" }} />
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
                </>
              )}
            </Space>
          </ProCard>
        ))}
      </Space>
      <Space
        style={{ display: "flex", justifyContent: "space-between", padding: 4 }}
      >
        <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            setSelectedMethod(null);
          }}
          endIcon={<CloseIcon />}
          sx={{
            pl: 2,
            color: "#6c1c2c",
            borderColor: "#6c1c2c",

            "&:hover": {
              borderColor: "#bc8c7c",
              color: "#bc8c7c",
            },
          }}
        >
          clear
        </Button>
        <Button
          variant="outlined"
          onClick={() => dispatch(cartVoid(cartDetails))}
          endIcon={<BlockIcon />}
          sx={{
            pl: 2,
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
          variant="contained"
          color="primary"
          endIcon={loading ? <CircularProgress size={20} /> : <RecommendIcon />}
          onClick={() => handlePayment(selectedMethod as string)}
          disabled={!selectedMethod}
          sx={{
            pl: 2,
            bgcolor: "#6c1c2c",
            "&:hover": {
              bgcolor: "#bc8c7c",
              color: "#ffff",
            },
          }}
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
    </section>
  );
};

export default PaymentDrawer;
