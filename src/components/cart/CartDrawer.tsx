/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Box,
  Button,
  Drawer,
  Typography,
  Card,
  CardContent,
  Grid,
  Divider,
  IconButton,
  CardMedia,
  Badge,
} from "@mui/material";
import CartItemCard from "./CartItemCard";
import { useSelector } from "react-redux";
import React, { Key } from "react";
import PrintIcon from "@mui/icons-material/Print";
import AddCardIcon from "@mui/icons-material/AddCard";
import { CloseRounded } from "@mui/icons-material";
import TableBarIcon from "@mui/icons-material/TableBar";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import classes from "./Cart.module.css";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Spinner from "../spinner/Spinner";

interface CartDrawerProps {
  tableData: any;
  cartOpen: boolean | undefined;
  handleCartClose: () => void;
  handlePaymentOpen: () => void;
}
const CartDrawer: React.FC<CartDrawerProps> = ({
  cartOpen,
  handleCartClose,
  handlePaymentOpen,
  tableData,
}) => {
  const { cartDetails } = useSelector((state: any) => state.cart);
  const { user } = useSelector((state: any) => state.auth);

  const {
    data: cartItems,
    isLoading,
    isError,
    error,
  } = useQuery(
    ["cartItems", cartDetails?._id],
    () => fetchCartItems(cartDetails?._id),
    {
      refetchInterval: 1000,
    }
  );

  const fetchCartItems = async (cartId: string) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/cart/cart-items/${cartId}`
      );
      return response.data;
    } catch (error) {
      throw new Error("Error fetching cart items: " + error.message);
    }
  };

  if (isLoading) {
    return <Spinner/>;
  }

  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <Drawer
      anchor="right"
      open={cartOpen}
      onClose={handleCartClose}
      style={{ height: "100vh", overflowY: "auto" }}
    >
      <Box sx={{ width: "430px", mt: 2 }}>
        <Grid
          item
          xs={12}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Grid
            item
            xs={12}
            pl={2}
            sx={{
              display: "flex",
              columnGap: 2,
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            <Button
              variant="outlined"
              sx={{
                pl: 2,
                color: "#6c1c2c",
                borderColor: "#6c1c2c",
                "&:hover": {
                  borderColor: "#bc8c7c",
                  color: "#bc8c7c",
                },
              }}
              startIcon={<BookmarkBorderIcon />}
            >
              {cartDetails?.order_no}
            </Button>
          </Grid>
          <Grid
            item
            xs={12}
            pl={2}
            sx={{
              display: "flex",
              columnGap: 2,
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            <Button
              variant="contained"
              sx={{
                pl: 2,
                bgcolor: "#6c1c2c",
                "&:hover": {
                  bgcolor: "#bc8c7c",
                  color: "#ffff",
                },
              }}
              startIcon={<TableBarIcon />}
            >
              {tableData?.name}
            </Button>
          </Grid>

          <IconButton onClick={handleCartClose}>
            <CloseRounded fontSize="large" />
          </IconButton>
        </Grid>

        <Card sx={{ mb: 2, boxShadow: "none" }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6}>
                <Typography variant="body1" fontWeight="bold">
                  Item
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="body1" fontWeight="bold" pl={1}>
                  Qty
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="body1" fontWeight="bold">
                  Price
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
          <Divider />
        </Card>

        <Box sx={{ maxHeight: "calc(100vh - 250px)", overflowY: "auto" }}>
          {cartItems?.map((item: { _id: Key | null | undefined }) => (
            <CartItemCard key={item._id} cartItem={item} />
          ))}
        </Box>

        {cartItems?.length ? (
          <Grid
            item
            xs={12}
            sx={{ position: "sticky", bottom: 0, backgroundColor: "white" }}
          >
            <Typography variant="body1" fontWeight="bold" pl={2}>
              Total :{" "}
              {cartItems
                .reduce(
                  (accumulator: number, item: { price: number }) =>
                    accumulator + item.price,
                  0
                )
                .toLocaleString()}
            </Typography>
            <Typography variant="body1" fontWeight="bold" pl={2}>
              Served By: {user.name}{" "}
            </Typography>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: 2,
                columnGap: 2,
                bottom: 0,
              }}
            >
              <Button
                variant="outlined"
                endIcon={<PrintIcon />}
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
                Print Bill
              </Button>
              <Button
                variant="contained"
                onClick={handlePaymentOpen}
                endIcon={<AddCardIcon />}
                sx={{
                  pl: 2,
                  bgcolor: "#6c1c2c",
                  "&:hover": {
                    bgcolor: "#bc8c7c",
                    color: "#ffff",
                  },
                }}
              >
                Proceed to Payment
              </Button>
            </Box>
          </Grid>
        ) : (
          <Card className={classes.cardm}>
            <Badge
              badgeContent="Empty"
              color="error"
              overlap="circular"
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              className={classes.badge}
            >
              <CardMedia
                component="img"
                alt="Basket"
                className={classes.media}
                image="/basket.png"
                sx={{ width: 100 }}
              />
            </Badge>
          </Card>
        )}
      </Box>
    </Drawer>
  );
};

export default CartDrawer;
