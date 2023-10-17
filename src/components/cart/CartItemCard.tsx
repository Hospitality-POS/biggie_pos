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
import React, { useEffect, useMemo, useState } from "react";
import {
  deleteCartItem,
  updateCartItems,
} from "../../features/Cart/CartActions";
import { useAppDispatch } from "../../store";
interface cartItemCardProps {
  cartItem: any;
}

function formatQuantity(quantity: { toLocaleString: () => any; }) {
  return quantity?.toLocaleString();
}

const CartItemCard: React.FC<cartItemCardProps> = ({ cartItem }) => {
  const dispatch = useAppDispatch();

  const [quantity, setQuantity] = useState(cartItem.quantity);

  const handleAddQuantity = () => {
    setQuantity((prevQuantity) => prevQuantity + 1);
    dispatch(
      updateCartItems({
        ...cartItem,
        product_id: cartItem.product_id._id,
        quantity,
        price: cartItem.price * quantity,
      })
    );
  };

  const handleReduceQuantity = () => {
    if (quantity > 1) {
      setQuantity((prevQuantity) => prevQuantity - 1);
      dispatch(
        updateCartItems({
          ...cartItem,
          product_id: cartItem.product_id._id,
          quantity,
          price: cartItem.price * quantity,
        })
      );
    }
  };

 
  const formattedPrice = useMemo(() => {
    return `${cartItem.price}`;
  }, [cartItem.price]);
  
  const formattedQuantity = useMemo(() => formatQuantity(cartItem.quantity), [cartItem.quantity]);


  return (
    <Card sx={{ mb: 1, boxShadow: "none", backgroundColor: "#F8F8F8" }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={4}>
            <Typography variant="body1">
              {cartItem?.product_id?.name}
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ display: "flex", alignItems: "center", columnGap: 1 }}>
              
              <Typography variant="body1" ml={4}>
                x {formattedQuantity}
              </Typography>
              
            </Box>
          </Grid>
          <Grid item xs={2} ml={-3}>
            <Typography variant="body1" fontSize="16px" ml={1}>
              ksh.{formattedPrice}
            </Typography>
          </Grid>
        <Grid item xs={2} ml={4}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            sx={{ height: 30, borderRadius: "8px" }}
          >
            <DeleteIcon
              color="error"
              onClick={() => dispatch(deleteCartItem(cartItem._id))}
            />
          </Button>
        </Grid>
        </Grid>
        {/* <Grid
          item
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mt={2}
          columnGap={1}
        > */}
        {/* <TextField
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
          /> */}
        {/* </Grid> */}
      </CardContent>
      <Divider />
    </Card>
  );
};

export default React.memo(CartItemCard);
