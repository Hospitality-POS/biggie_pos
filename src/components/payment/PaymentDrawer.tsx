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
import { grey } from "@mui/material/colors";

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
                    <Typography variant="subtitle1" fontSize={16}>cash</Typography>
                  </>
                ) : method.name === "M-Pesa" ? (
                  <>
                    <MobileScreenShareIcon />
                    <Typography variant="subtitle1" fontSize={16}>M-pesa</Typography>
                  </>
                ) : method.name === "Card" ? (
                  <>
                    <CreditCardIcon />
                    <Typography variant="subtitle1" fontSize={16}>Card</Typography>
                  </>
                ) : (
                  ""
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
        <CardActions sx={{width: "100%", justifyContent: "space-between"}}>
          <Button variant="outlined" color="primary" onClick={()=>{handlePaymentClose(), setSelectedMethod(null)}}>
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
