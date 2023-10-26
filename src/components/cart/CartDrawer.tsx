import React, { Key, useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  Divider,
  CardMedia,
  Paper,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import CartItemCard from "./CartItemCard";
import PrintIcon from "@mui/icons-material/Print";
import TableBarIcon from "@mui/icons-material/TableBar";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import classes from "./Cart.module.css";
import PrintBillModal from "../MODALS/PrintBillModal";
import {
  cartSent,
  deleteAllCartItems,
  fetchCartItems,
  getCart,
} from "../../features/Cart/CartActions";
import PaymentDrawer from "../payment/PaymentDrawer";
import SkeletonCartItemCard from "./SkeletonCartItemCard";
import { useAppDispatch, useAppSelector } from "../../store";
import { useParams } from "react-router-dom";
import Spinner from "../spinner/Spinner";
import CartLoader from "../spinner/cartLoader";
import SendIcon from '@mui/icons-material/Send';

function formatTotal(totalAmount: { toLocaleString: () => number | string}) {
  return totalAmount.toLocaleString();
}

const CartDrawer: React.FC = () => {
  const [openM, setOpenM] = useState(false);
   const [loadingData, setLoadingData] = useState(false);
  const { cartDetails, totalAmount, cartItems: data, loading } = useAppSelector(
    (state) => state.cart
  );
  const { user } = useAppSelector((state) => state.auth);

  const {id}=useParams()

  const dispatch = useAppDispatch();
  const { tableData: td } = useAppSelector((state) => state.Tables);

  const onCloseM = () => {
    setOpenM(false);
  };

 
  const CartItemCardMemo = React.memo(CartItemCard);

  const memoizedData = useMemo(() => data, [data]);
  const formattedTotal = useMemo(() => formatTotal(totalAmount), [totalAmount]);
  const orderNumber = useMemo(
    () => cartDetails?.order_no,
    [cartDetails?.order_no]
  );

  // const dispatchFetchCart = useCallback(() => {
  //   return dispatch(getCart(id));
  // }, [dispatch, id]);

  const dispatchFetchCart = useCallback(async () => {
    setLoadingData(true); 
    try {
      await dispatch(getCart(id)); 
    } catch (error) {
      console.log("cart eror", error);
      
    } finally {
      setLoadingData(false);
    }
  }, [dispatch, id]);

  useEffect(() => {
    dispatchFetchCart();
  }, [dispatchFetchCart]);

  return (
    <Paper
      elevation={3}
      style={{
        padding: "16px",
        height: "89vh",
        overflow: "hidden",
        overflowY: "auto",
      }}
    >
      <PrintBillModal
        openM={openM}
        onCloseM={onCloseM}
        cartDetails={cartDetails}
        data={data}
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
              {orderNumber}
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
              {td?.name}
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
          {loading 
            ? Array.from({ length: data.length }, (_, index) => (
                <SkeletonCartItemCard key={index} />
              ))
            : data?.map((item: { _id: Key | null | undefined | string }) => (
                <CartItemCardMemo key={item._id} cartItem={item} />
              ))}
            {loadingData && loading ? <CartLoader/>: ''}
              
        </div>
        {memoizedData?.length ? (
          <Grid
            item
            xs={12}
            sx={{ position: "sticky", bottom: 0, backgroundColor: "white" }}
          >
            <Typography variant="body1" fontWeight="bold">
              Total :{" "}
              {totalAmount ? (
                formattedTotal
              ) : (
                <Typography>Calculating...</Typography>
              )}
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              Served By: {cartDetails?.created_by.username}
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
                variant="outlined"
                onClick={() => dispatch(cartSent(cartDetails))}
                endIcon={<SendIcon />}
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
                Send 
              </Button>
              <Button
                variant="contained"
                onClick={() => dispatch(deleteAllCartItems(cartDetails?._id))}
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
      {user?.isAdmin && data?.length > 0 && <PaymentDrawer paymentOpen={false} handlePaymentClose={function (): void {
        throw new Error("Function not implemented.");
      } } />}
    </Paper>
  );
};

export default CartDrawer;
