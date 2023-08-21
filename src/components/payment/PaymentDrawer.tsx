import { Key, SetStateAction, useState } from "react";
import {
  Box,
  Button,
  Drawer,
  Typography,
  Card,
  CardContent,
  CardActions,
  Divider,
  CircularProgress,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import MobileScreenShareIcon from "@mui/icons-material/MobileScreenShare";
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
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { id } = useParams();
  const { cartDetails, totalAmount } = useSelector((state: any) => state.cart);
  const { loading, error } = useSelector((state: any) => state.order);
  const { user } = useSelector((state: any) => state.auth);
  const [selectedMethod, setSelectedMethod] = useState(null);
    
  const {
    isLoading,
    error: Derror,
    data,
  } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: () =>
      fetch("http://localhost:3000/payment-methods/").then((res) => res.json()),
  });

  const handleSelectMethod = (method: SetStateAction<null>) => {
    setSelectedMethod(method);
  };

  if (isLoading) {
    return <div>Loading payment methods...</div>;
  }

  if (Derror) {
    return <div>An error occurred while fetching payment methods.</div>;
  }


  const handlePayment = (methodId: any) => {    
    const orderDetails = {
      cart_id: cartDetails?._id,
      order_amount: totalAmount,
      table_id: id,
      updated_by: user.id,
      order_no: cartDetails?.order_no,
      method_id: methodId
    };
    dispatch(createOrder(orderDetails));
    if (!error) {
      dispatch(createCart(id))
      navigate("/tables");
    }
  };
  return (
    <Drawer
      anchor="right"
      open={paymentOpen}
      onClose={handlePaymentClose}
      sx={{ width: "400px" }}
    >
      <Box sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom mt={1}>
          Payment
        </Typography>
        <Typography variant="body1" gutterBottom mb={2}>
          {data.length} Payment method available
        </Typography>
        <Divider />
        <Typography gutterBottom mt={1} variant="h6" fontWeight="light">
          Payment Method
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 2,
            flexWrap: "wrap",
          }}
          mb={4}
        >
          {data.map(
            (method: {
              _id: Key | SetStateAction<null> | undefined;
              name: string;
            }) => (
              <Card
                key={method._id}
                variant={
                  selectedMethod === method._id ? "outlined" : "elevation"
                }
                onClick={() => handleSelectMethod(method._id)}
                sx={{
                  backgroundColor: grey[100],
                  cursor: "pointer",
                  borderRadius: "10px",
                  transition: "background-color 0.3s ease",
                  position: "relative",
                  "&.selected": {
                    borderColor: "green",
                  },
                  width: "100px",
                  height: "70px",
                }}
              >
                {selectedMethod === method._id && (
                  <CheckCircleIcon
                    sx={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      padding: "4px",
                      color: "green",
                    }}
                  />
                )}
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {method.name === "Cash" ? (
                    <>
                      <LocalAtmIcon />
                      <Typography variant="subtitle1" fontSize={16}>
                        cash
                      </Typography>
                    </>
                  ) : method.name === "M-Pesa" ? (
                    <>
                      <MobileScreenShareIcon />
                      <Typography variant="subtitle1" fontSize={16}>
                        M-pesa
                      </Typography>
                    </>
                  ) : method.name === "Card" ? (
                    <>
                      <CreditCardIcon />
                      <Typography variant="subtitle1" fontSize={16}>
                        Card
                      </Typography>
                    </>
                  ) : (
                    ""
                  )}
                </CardContent>
              </Card>
            )
          )}
        </Box>
        <CardActions sx={{ width: "100%", justifyContent: "space-between" }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              handlePaymentClose(), setSelectedMethod(null);
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
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            endIcon={
              loading ? <CircularProgress size={20} /> : <RecommendIcon />
            }
            onClick={()=>handlePayment(selectedMethod)}
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
    </Drawer>
  );
};

export default PaymentDrawer;
