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
// import { useParams } from "react-router-dom";

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
  // const CartItem = useSelector((state: any) => state.cart);
  const CartItem = useSelector((state: any) => state.cart);
  const { user } = useSelector((state: any) => state.auth);
  // console.log(CartItem+ "waa");

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
              {" "}
              #837B
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
              {" "}
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
          {CartItem?.map((Item: { _id: Key | null | undefined }) => (
            <CartItemCard key={Item._id} cartItem={Item} />
          ))}
        </Box>

        {/* <Divider /> */}

        {CartItem?.length ? (
          <Grid
            item
            xs={12}
            sx={{ position: "sticky", bottom: 0, backgroundColor: "white" }}
          >
            <Typography variant="body1" fontWeight="bold" pl={2}>
              Total :{" "}
              {CartItem.reduce(
                (accumulator, item) => accumulator + item.price,
                0
              ).toLocaleString()}
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
