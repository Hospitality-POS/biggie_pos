/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import React, { useMemo } from "react";
import { deleteCartItem } from "../../features/Cart/CartActions";
import { useAppDispatch, useAppSelector } from "../../store";
import AddTaskIcon from "@mui/icons-material/AddTask";
import { Space } from "antd/lib";
interface cartItemCardProps {
  cartItem: any;
}

function formatQuantity(quantity: number) {
  return quantity?.toString();
}

// eslint-disable-next-line react-refresh/only-export-components
const CartItemCard: React.FC<cartItemCardProps> = ({ cartItem }) => {
  const dispatch = useAppDispatch();

  const { user } = useAppSelector((state) => state.auth);

  const formattedPrice = useMemo(() => {
    return `${cartItem.price}`;
  }, [cartItem.price]);

  const formattedQuantity = useMemo(
    () => formatQuantity(cartItem.quantity),
    [cartItem.quantity]
  );

  return (
    <Card
      key={cartItem._id}
      sx={{
        mb: 1,
        boxShadow: "none",
        backgroundColor: cartItem.sent ? "#6c1c2c" : "#F8F8F8",
        color: cartItem.sent ? "#fff" : "black",
      }}
    >
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
                x{" "}
                {cartItem.quantity ? (
                  formattedQuantity
                ) : (
                  <CircularProgress
                    size={20}
                    thickness={8}
                    sx={{ ml: 1 }}
                    color="inherit"
                  />
                )}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={2} ml={-3}>
            <Typography variant="body1" fontSize="16px" ml={1}>
              ksh.{formattedPrice ? formattedPrice : 0}
            </Typography>
          </Grid>
          <Grid item xs={2} ml={4}>
            {cartItem.sent ? (
              <Space>
                <IconButton>
                  <AddTaskIcon color="success" fontSize="small" />
                </IconButton>
                {user?.isAdmin && (<Button
                  variant="outlined"
                  color="error"
                  size="small"
                  sx={{ height: 30, borderRadius: "8px" }}
                >
                  <DeleteIcon
                    color="error"
                    onClick={() => dispatch(deleteCartItem(cartItem._id))}
                  />
                </Button>)}
              </Space>
            ) : (
              <>
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
              </>
            )}
          </Grid>
        </Grid>
      </CardContent>
      <Divider />
    </Card>
  );
};

export default React.memo(CartItemCard);
