/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { deleteCartItem } from "../../features/Cart/CartActions";
import { useAppDispatch, useAppSelector } from "../../store";
import AddTaskIcon from "@mui/icons-material/AddTask";
import { Space } from "antd/lib";
import { Button, Typography, notification } from "antd";
import { DeleteOutlined, LoadingOutlined } from "@ant-design/icons";
import useCartItemsData from "@hooks/cartItemsData";
interface cartItemCardProps {
  cartItem: any;
}

function formatQuantity(quantity: number) {
  return quantity?.toString();
}

// eslint-disable-next-line react-refresh/only-export-components
const CartItemCard: React.FC<cartItemCardProps> = ({ cartItem }) => {
  const dispatch = useAppDispatch();
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");
  const { cartDetails } = useAppSelector((state) => state.cart);

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.color_scheme.primary) {
      setPrimaryColor(tenant.color_scheme.primary);
    }
  }, []);

  const { user } = useAppSelector((state) => state.auth);

  const formattedPrice = useMemo(() => {
    return `${cartItem.price.toLocaleString()}`;
  }, [cartItem.price]);

  const formattedQuantity = useMemo(
    () => formatQuantity(cartItem.quantity),
    [cartItem.quantity]
  );
  const { invalidate } = useCartItemsData();

  // Calculate the discounted price for this item
  const discountedPrice = useMemo(() => {
    if (!cartDetails?.discount) return null;

    let discountAmount = 0;
    if (cartDetails?.discount_type === "percentage") {
      discountAmount = cartItem.price * (cartDetails.discount / 100);
    } else {
      // For fixed amount discount, distribute proportionally based on item price
      const totalCartAmount = cartDetails.items.reduce((acc, item) => acc + item.price, 0);
      discountAmount = (cartItem.price / totalCartAmount) * cartDetails.discount;
    }

    const newPrice = cartItem.price - discountAmount;
    return newPrice > 0 ? newPrice.toLocaleString() : "0";
  }, [cartItem.price, cartDetails?.discount, cartDetails?.discount_type, cartDetails?.items]);

  return (
    <Card
      key={cartItem._id}
      sx={{
        mb: 1,
        boxShadow: "none",
        backgroundColor: cartItem.sent ? primaryColor : "#f6ffed",
        color: cartItem.sent ? "#fff" : "black",
      }}
    >
      <CardContent>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={3}>
            <Typography.Text
              ellipsis={{ rows: 2, expandable: true }}
              style={{ color: `${cartItem.sent ? "#fff" : "#000"}` }}
            >
              {cartItem?.product_id?.name}
            </Typography.Text>
          </Grid>
          <Grid item xs={3}>
            <Box
              sx={{ display: "flex", alignItems: "center", columnGap: 1 }}
              style={{ color: `${cartItem.sent ? "#fff" : "#000"}` }}
            >
              <Typography.Text
                strong
                style={{ color: `${cartItem.sent ? "#fff" : "#000"}` }}
              >
                x {cartItem.quantity ? formattedQuantity : <LoadingOutlined />}
              </Typography.Text>
            </Box>
          </Grid>
          <Grid item xs={3} ml={-3}>
            {discountedPrice ? (
              <div>
                <Typography.Text
                  delete
                  style={{
                    color: `${cartItem.sent ? "#fff" : "#000"}`,
                    opacity: 0.7
                  }}
                >
                  {formattedPrice}
                </Typography.Text>
                <br />
                <Typography.Text
                  strong
                  style={{
                    color: `${cartItem.sent ? "#fff" : "#000"}`,
                  }}
                >
                  {discountedPrice}
                </Typography.Text>
              </div>
            ) : (
              <Typography.Text
                strong
                style={{ color: `${cartItem.sent ? "#fff" : "#000"}` }}
              >
                {formattedPrice ? formattedPrice : 0}
              </Typography.Text>
            )}
          </Grid>
          <Grid item xs={3}>
            {cartItem.sent ? (
              <Space>
                {user?.role === "admin" && (
                  <Button
                    danger
                    style={{ width: "40px", padding: 0 }}
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      dispatch(deleteCartItem(cartItem._id));
                      invalidate();
                    }}
                  ></Button>
                )}
                <IconButton>
                  <AddTaskIcon color="success" fontSize="small" />
                </IconButton>
              </Space>
            ) : (
              <>
                <Button
                  danger
                  style={{ width: "40px" }}
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    dispatch(deleteCartItem(cartItem._id));
                    invalidate();
                  }}
                ></Button>
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