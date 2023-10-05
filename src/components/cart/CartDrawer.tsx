import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  Divider,
  IconButton,
  CardMedia,
  Badge,
  Paper,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import CartItemCard from "./CartItemCard";
import { useDispatch, useSelector } from "react-redux";
import React, { Key, useState } from "react";
import PrintIcon from "@mui/icons-material/Print";
import AddCardIcon from "@mui/icons-material/AddCard";
import { CloseRounded } from "@mui/icons-material";
import TableBarIcon from "@mui/icons-material/TableBar";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import classes from "./Cart.module.css";
import PrintBillModal from "../MODALS/PrintBillModal";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { deleteAllCartItems } from "../../features/Cart/CartActions";
import PaymentDrawer from "../payment/PaymentDrawer";

interface CartDrawerProps {
  tableData: any;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ tableData }) => {
  const [openM, setOpenM] = useState(false);
  const { cartDetails, totalAmount, cartItems } = useSelector(
    (state: any) => state.cart
  );
  const { user } = useSelector((state: any) => state.auth);
  const dispatch = useDispatch();

  const onCloseM = () => {
    setOpenM(false);
  };

  const cartId = cartDetails?._id;
  const { data } = useQuery(
    ["cart", cartId],
    async () => await axios.get(`http://localhost:3000/cart/cart/${cartId}`)
  );

  return (
    <Paper elevation={3} style={{ padding: "16px", maxHeight: "100vh", overflow: "hidden", overflowY: "auto"  }}>
      <PrintBillModal
        openM={openM}
        onCloseM={onCloseM}
        cartDetails={cartDetails}
        totalAmount={totalAmount}
      />
      <Box sx={{ width: "400px" }}>
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
        </Grid>
        <Card sx={{ mb: 2, boxShadow: "none" }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6}>
                <Typography variant="body1" fontWeight="bold">
                  Item
                </Typography>
              </Grid>
              <Grid item xs={3} ml={-5}>
                <Typography variant="body1" fontWeight="bold">
                  Qty
                </Typography>
              </Grid>
              <Grid item xs={3} ml={-2}>
                <Typography variant="body1" fontWeight="bold">
                  Price
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
          <Divider />
        </Card>
        <div
          style={{
            maxHeight: "calc(100vh - 300px)", 
            overflowY: "auto",
          }}
        >
          {cartItems?.map((item: { _id: Key | null | undefined }) => (
            <CartItemCard key={item._id} cartItem={item} />
          ))}
        </div>
        {cartItems?.length ? (
          <Grid
            item
            xs={12}
            sx={{ position: "sticky", bottom: 0, backgroundColor: "white" }}
          >
            <Typography variant="body1" fontWeight="bold">
              Total : {totalAmount}
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              Served By: {data?.data?.created_by.username}
            </Typography>
            <Box
              sx={{
                display: "flex",
                mt: 2,
                columnGap: 2,
                bottom: 0,
              }}
            >
              <Button
                variant="outlined"
                onClick={() => setOpenM(true)}
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
                onClick={() => dispatch(deleteAllCartItems(cartId))}
                endIcon={<ClearIcon />}
                sx={{
                  pl: 1,
                  bgcolor: "#6c1c2c",
                  "&:hover": {
                    bgcolor: "#bc8c7c",
                    color: "#ffff",
                  },
                }}
              >
                Clear
              </Button>
            </Box>
          </Grid>
        ) : (
          <Card className={classes.cardm}>
            <div>
              <CardMedia
                component="img"
                alt="Basket"
                className={classes.media}
                image="/basket.png"
                sx={{ width: 100 }}
              />
              <Typography variant="body1" gutterBottom>
                No items added
              </Typography>
            </div>
          </Card>
        )}
      </Box>
      {user.isAdmin && cartItems?.length > 0 && <PaymentDrawer />}
    </Paper>
  );
};

export default CartDrawer;
