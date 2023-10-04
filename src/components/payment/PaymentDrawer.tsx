import { Key, SetStateAction, useState } from "react";
import {
  Box,
  Button,
  Drawer,
  Typography,
  CardActions,
  CircularProgress,
  Paper,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import MobileScreenShareIcon from "@mui/icons-material/MobileScreenShare";
import CreditCardOffIcon from '@mui/icons-material/CreditCardOff';
import { grey } from "@mui/material/colors";
import RecommendIcon from "@mui/icons-material/Recommend";
import CloseIcon from "@mui/icons-material/Close";
import { useDispatch, useSelector } from "react-redux";
import { createOrder } from "../../features/Order/OrderActions";
import { useNavigate, useParams } from "react-router-dom";
import { createCart } from "../../features/Cart/CartActions";

interface paymentProps {
  paymentOpen: boolean;
  handlePaymentClose: () => void;
}
const PaymentDrawer: React.FC<paymentProps> = ({
  paymentOpen,
  handlePaymentClose,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { cartDetails, totalAmount } = useSelector((state: any) => state.cart);
  const { loading, error } = useSelector((state: any) => state.order);
  const { user } = useSelector((state: any) => state.auth);
  const [selectedMethod, setSelectedMethod] = useState<null | string>(null);

  const {
    isLoading,
    error: Derror,
    data,
  } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: () =>
      fetch("http://localhost:3000/payment-methods/").then((res) => res.json()),
  });

  const handleSelectMethod = (method: string) => {
    setSelectedMethod(method === selectedMethod ? null : method);
  };

  if (isLoading) {
    return <div>Loading payment methods...</div>;
  }

  if (Derror) {
    return <div>An error occurred while fetching payment methods.</div>;
  }

  const handlePayment = (methodId: string) => {
    const orderDetails = {
      cart_id: cartDetails?._id,
      order_amount: totalAmount,
      table_id: id,
      updated_by: user.id,
      order_no: cartDetails?.order_no,
      method_id: methodId,
    };
    dispatch(createOrder(orderDetails));
    if (!error) {
      dispatch(createCart(id));
      navigate("/tables");
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
              backgroundColor: selectedMethod === method._id ? "#6c1c2c" : grey[100],
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
              color={selectedMethod === method._id ? "white" : "inherit"}
            >
              {method.name === "Cash" ? (
                <LocalAtmIcon fontSize="large" />
              ) : method.name === "M-Pesa" ? (
                <MobileScreenShareIcon fontSize="large" />
              ) : method.name === "Card" ? (
                <CreditCardIcon fontSize="large" />
              ) : method.name === "Debt" ? (
                <CreditCardOffIcon fontSize="large" />
              ) :(
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
          Confirm Payment
        </Button>
      </CardActions>
    </Box>
  );
};

export default PaymentDrawer;
