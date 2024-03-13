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
} from "@mui/material";
// import DeleteIcon from "@mui/icons-material/Delete";
import React, { useMemo } from "react";
import { deleteCartItem } from "../../features/Cart/CartActions";
import { useAppDispatch, useAppSelector } from "../../store";
import AddTaskIcon from "@mui/icons-material/AddTask";
import { Space } from "antd/lib";
import { Typography } from "antd";
import { DeleteFilled } from "@ant-design/icons";
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
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={3}>
            <Typography.Text ellipsis={{ rows: 2, expandable: true }}>
              {cartItem?.product_id?.name}
            </Typography.Text>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ display: "flex", alignItems: "center", columnGap: 1 }}>
              <Typography.Text strong>
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
              </Typography.Text>
            </Box>
          </Grid>
          <Grid item xs={3} ml={-2}>
            <Typography.Text strong>
              ksh.{formattedPrice ? formattedPrice : 0}
            </Typography.Text>
          </Grid>
          <Grid item xs={3} ml={2}>
            {cartItem.sent ? (
              <Space>
                <IconButton>
                  <AddTaskIcon color="success" fontSize="small" />
                </IconButton>
                {user?.isAdmin && (
                  <Button
                    variant="contained"
                    color="inherit"
                    size="small"
                    sx={{ height: 35, borderRadius: "5px" }}
                  >
                    <DeleteFilled
                      onClick={() => dispatch(deleteCartItem(cartItem._id))}
                    />
                  </Button>
                )}
              </Space>
            ) : (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  sx={{ height: 30, borderRadius: "8px" }}
                >
                  <DeleteFilled
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
