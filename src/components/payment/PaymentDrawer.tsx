/* eslint-disable @typescript-eslint/no-unused-vars */
import { Key, SetStateAction, useState } from "react";
import {
  Box,
  Button,
  Typography,
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
import { cartVoid, createCart } from "../../features/Cart/CartActions";
import { logoutUser } from "../../features/Auth/AuthActions";
import { reset } from "../../features/Auth/AuthSlice";
import SplitBillDialog from "../MODALS/Dialogs/SplitBillDialog";
import { useAppDispatch, useAppSelector } from "../../store";
import BlockIcon from '@mui/icons-material/Block';

interface paymentProps {
  paymentOpen: boolean;
  handlePaymentClose: () => void;
}
const PaymentDrawer: React.FC<paymentProps> = ({
  paymentOpen,
  handlePaymentClose,
}) => {
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
  });

  // const handleSelectMethod = (method: string) => {
  //   setSelectedMethod(method === selectedMethod ? null : method);
  // };

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
    if (amount1 > totalAmount || amount2 > totalAmount) {
      // Add your logic for handling the case when the entered amount exceeds the total amount
      return;
    }
    // Add your logic for handling the split payment confirmation
    console.log("Method 1:", selectedMethod, "Amount 1:", amount1);
    console.log("Method 2:", secondMethod, "Amount 2:", amount2);
    const twoMethods = [selectedMethod,secondMethod]
    const twoAmounts = [amount1, amount2]
    const orderDetails = {
        cart_id: cartDetails?._id,
        order_amount: twoAmounts,
        table_id: id,
        updated_by: user?.id,
        order_no: cartDetails?.order_no,
        method_id: twoMethods,
      };
      dispatch(createOrder(orderDetails));
      if (!error) {
        dispatch(createCart(id));
        dispatch(logoutUser());
        dispatch(reset());
        navigate("/tables");
      }
  };

  if (isLoading) {
    return <div>Loading payment methods...</div>;
  }

  if (Derror) {
    return <div>An error occurred while fetching payment methods.</div>;
  }

  // const handlePayment = (methodId: string) => {
  //   const orderDetails = {
  //     cart_id: cartDetails?._id,
  //     order_amount: totalAmount,
  //     table_id: id,
  //     updated_by: user.id,
  //     order_no: cartDetails?.order_no,
  //     method_id: methodId,
  //   };
  //   dispatch(createOrder(orderDetails));
  //   if (!error) {
  //     dispatch(createCart(id));
  //     dispatch(logoutUser());
  //     dispatch(reset());
  //     navigate("/tables");
  //   }
  // };
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

  return (
    <Box sx={{ mb: 2 }}>
      <Typography gutterBottom mt={1} variant="h6" fontWeight="light">
        Payment Method
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-evenly",
          gap: 2,
          mb: 2,
        }}
      >
        {data.map((method: { _id: string; name: string }) => (
          <Paper
            key={method._id}
            elevation={selectedMethod === method._id ? 3 : 1}
            onClick={() => handleSelectMethod(method._id)}
            sx={{
              backgroundColor:
                selectedMethod === method._id ? "#6c1c2c" : grey[100],
              cursor: "pointer",
              borderRadius: "10px",
              transition: "background-color 0.3s ease",
              position: "relative",
              width: "100px",
              height: "70px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Typography
              variant="inherit"
              fontSize="large"
              sx={{
                display: "flex",
                justifyContent: "cente",
                alignContent: "center",
                flexDirection: "column",
              }}
              color={selectedMethod === method._id ? "white" : "inherit"}
            >
              {method.name === "Cash" ? (
                <>
                  <LocalAtmIcon fontSize="large" />
                  <Typography variant="body1">Cash</Typography>
                </>
              ) : method.name === "M-Pesa" ? (
                <>
                  <MobileScreenShareIcon fontSize="large" />
                  <Typography variant="body1">mpesa</Typography>
                </>
              ) : method.name === "Card" ? (
                <>
                  <CreditCardIcon fontSize="large" />{" "}
                  <Typography variant="body1">card</Typography>
                </>
              ) : method.name === "Debt" ? (
                <>
                  <CreditCardOffIcon fontSize="large" />
                  <Typography variant="body1">Debt</Typography>
                </>
              ) : (
                ""
              )}
            </Typography>
          </Paper>
        ))}
      </Box>
      <CardActions sx={{ width: "100%", justifyContent: "space-between" }}>
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
      </CardActions>

      <SplitBillDialog
        open={openModal}
        handleModalClose={handleModalClose}
        data={data}
        selectedMethod={selectedMethod}
        secondMethod={secondMethod}
        amount1={amount1}
        amount2={amount2}
        setSelectedMethod={setSelectedMethod}
        setSecondMethod={setSecondMethod}
        setAmount1={setAmount1}
        setAmount2={setAmount2}
        handleSplitConfirm={handleSplitConfirm}
      />
    </Box>
  );
};

export default PaymentDrawer;
