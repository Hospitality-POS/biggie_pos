import { useState } from "react";
import {
  Box,
  Button,
  Drawer,
  Typography,
  Card,
  CardContent,
  CardActions,
  Divider,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import MobileScreenShareIcon from '@mui/icons-material/MobileScreenShare';

function PaymentDrawer({ paymentOpen, handlePaymentClose }) {
  const [selectedMethod, setSelectedMethod] = useState(null);

  const { isLoading, error, data } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: () =>
      fetch("http://localhost:3000/payment-methods/").then((res) => res.json()),
  });
  //   console.log(data);

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
  };

  if (isLoading) {
    return <div>Loading payment methods...</div>;
  }

  if (error) {
    return <div>An error occurred while fetching payment methods.</div>;
  }

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
        <Box sx={{ display: "flex", flexDirection: "row", gap: 2, flexWrap:"wrap" }} mb={4}>
          {data.map((method:any) => (
            <Card
              key={method._id}
              variant={selectedMethod === method._id ? "outlined" : "elevation"}
              onClick={() => handleSelectMethod(method._id)}
              sx={{
                cursor: "pointer",
                borderRadius: "10px",
                position: "relative",
                "&.selected": {
                  borderColor: "green",
                },
                width: "100px",
                height: "70px",
              }}
            >
               {selectedMethod === method._id && (
                
                <CheckCircleIcon sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    padding: "4px",
                    color: "green",
                  }} />
                
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
                    <Typography variant="subtitle1">cash</Typography>
                  </>
                ) : method.name === "M-Pesa" ? (
                  <>
                    <MobileScreenShareIcon />
                    <Typography variant="subtitle1">M-pesa</Typography>
                  </>
                ) : method.name === "Card" ? (
                  <>
                    <CreditCardIcon />
                    <Typography variant="subtitle1">Card</Typography>
                  </>
                ) : (
                  ""
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
        <CardActions>
          <Button variant="outlined" color="primary">
            Cancel
          </Button>
          <Button variant="contained" color="primary">
            Confirm Payment
          </Button>
        </CardActions>
      </Box>
    </Drawer>
  );
}

export default PaymentDrawer;
