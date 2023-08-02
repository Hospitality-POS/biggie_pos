/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useDispatch } from "react-redux";
import React, { useState } from "react";
import {
  deleteCartItem,
  updateCartItems,
} from "../../features/Cart/CartActions";
interface cartItemCardProps {
  cartItem: any;
}
const CartItemCard: React.FC<cartItemCardProps> = ({ cartItem }) => {
  const dispatch = useDispatch();

  const [quantity, setQuantity] = useState(cartItem.quantity);

  const handleAddQuantity = () => {
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);

    const updatedCartItem = {
      ...cartItem,
      quantity: newQuantity,
      price: cartItem.price * newQuantity,
    };
    dispatch(updateCartItems([updatedCartItem]));
  };

  const handleReduceQuantity = () => {
    if (quantity > 1) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
      const updatedCartItem = {
        ...cartItem,
        quantity: newQuantity,
        price: cartItem.price * newQuantity,
      };
      dispatch(updateCartItems([updatedCartItem]));
    } else {
      dispatch(deleteCartItem(cartItem._id));
    }
  };

  return (
    <Card sx={{ mb: 1, boxShadow: "none", backgroundColor: "#F8F8F8" }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6}>
            <Typography variant="body1">{cartItem?.product_id.name}</Typography>
          </Grid>
          <Grid item xs={3} ml={-2}>
            <Box sx={{ display: "flex", alignItems: "center", columnGap: 1 }}>
              <IconButton
                size="small"
                sx={{ borderRadius: 50, border: 1 }}
                disabled={quantity === 1}
                onClick={handleReduceQuantity}
              >
                <RemoveIcon />
              </IconButton>

              <Typography variant="body1">{cartItem.quantity}</Typography>
              <IconButton
                size="small"
                sx={{ borderRadius: 50, border: 1 }}
                onClick={handleAddQuantity}
              >
                <AddIcon />
              </IconButton>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="body1" fontSize="16px" ml={3}>
              ksh.{cartItem.price}
            </Typography>
          </Grid>
        </Grid>
        <Grid
          item
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mt={2}
          columnGap={1}
        >
          <TextField
            placeholder={cartItem.desc}
            variant="outlined"
            size="small"
            fullWidth
            InputProps={{
              endAdornment: (
                <IconButton size="small">
                  <AddIcon />
                </IconButton>
              ),
            }}
          />
          <Button
            variant="outlined"
            color="error"
            size="small"
            sx={{ height: 40, borderRadius: "8px" }}
          >
            <DeleteIcon
              color="error"
              onClick={() => dispatch(deleteCartItem(cartItem._id))}
            />
          </Button>
        </Grid>
      </CardContent>
      <Divider />
    </Card>
  );
};

export default CartItemCard;
