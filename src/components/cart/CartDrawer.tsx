import {
  Box,
  Button,
  Drawer,
  Typography,
  Card,
  CardContent,
  Grid,
  Divider,
} from "@mui/material";
import CartItemCard from "./CartItemCard";
import { useSelector } from "react-redux";
import { Key } from "react";

function CartDrawer({ cartOpen, handleCartClose, handlePaymentOpen }) {
  const CartItem = useSelector((state) => state.cart);
  // console.log(CartItem+ "waa");
  
  return (
    <Drawer anchor="right" open={cartOpen} onClose={handleCartClose}>
      <Box sx={{ width: "400px", p: 2, mt: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom mt={1}>
          Order #djf8i
        </Typography>

        <Card sx={{ mb: 2, boxShadow: "none" }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6}>
                <Typography variant="body1">Item</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="body1">Quantity</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="body1">Price</Typography>
              </Grid>
            </Grid>
          </CardContent>
          <Divider />
        </Card>

        {CartItem?.map((Item: { _id: Key | null | undefined; }) => (
          <CartItemCard key={Item._id} cartItem={Item}/>
        ))}

        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Button variant="contained" onClick={handlePaymentOpen}>
            Proceed to Payment
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

export default CartDrawer;
