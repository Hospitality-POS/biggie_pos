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

import { usePrimaryColor } from "@context/PrimaryColorContext";

interface cartItemCardProps {
  cartItem: any;
}

function formatQuantity(quantity: number | undefined | null): string {
  return quantity?.toString() || "0";
}

function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null || isNaN(price)) {
    return "0";
  }
  return price.toLocaleString();
}

// eslint-disable-next-line react-refresh/only-export-components
const CartItemCard: React.FC<cartItemCardProps> = ({ cartItem }) => {
  const dispatch = useAppDispatch();

  const { cartDetails } = useAppSelector((state) => state.cart);

  const primaryColor = usePrimaryColor();

  const { user } = useAppSelector((state) => state.auth);

  // Safe price formatting with null checks
  const formattedPrice = useMemo(() => {
    return formatPrice(cartItem?.price);
  }, [cartItem?.price]);

  // Safe quantity formatting with null checks
  const formattedQuantity = useMemo(() => {
    return formatQuantity(cartItem?.quantity);
  }, [cartItem?.quantity]);

  const { invalidate } = useCartItemsData();

  // Calculate the discounted price for this item with null safety
  const discountedPrice = useMemo(() => {
    // Check if cartItem.price exists and is valid
    if (!cartItem?.price || !cartDetails?.discount) return null;

    let discountAmount = 0;
    const itemPrice = cartItem.price || 0;

    if (cartDetails?.discount_type === "percentage") {
      discountAmount = itemPrice * ((cartDetails.discount || 0) / 100);
    } else {
      // For fixed amount discount, distribute proportionally based on item price
      const totalCartAmount = (cartDetails?.items || []).reduce((acc, item) => {
        return acc + (item?.price || 0);
      }, 0);

      if (totalCartAmount > 0) {
        discountAmount = (itemPrice / totalCartAmount) * (cartDetails.discount || 0);
      }
    }

    const newPrice = itemPrice - discountAmount;
    return newPrice > 0 ? formatPrice(newPrice) : "0";
  }, [cartItem?.price, cartDetails?.discount, cartDetails?.discount_type, cartDetails?.items]);

  // Early return if cartItem is not properly loaded
  if (!cartItem) {
    return null;
  }

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
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={3}>
            <Typography.Text
              ellipsis={{ rows: 2, expandable: true }}
              style={{ color: `${cartItem.sent ? "#fff" : "#000"}` }}
            >
              {cartItem?.product_id?.name || "Product Name"}
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
                x {cartItem.quantity !== undefined && cartItem.quantity !== null ? formattedQuantity : <LoadingOutlined />}
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
                  Ksh. {formattedPrice}
                </Typography.Text>
                <br />
                <Typography.Text
                  strong
                  style={{
                    color: `${cartItem.sent ? "#fff" : "#000"}`,
                  }}
                >
                  Ksh. {discountedPrice}
                </Typography.Text>
              </div>
            ) : (
              <Typography.Text
                strong
                style={{ color: `${cartItem.sent ? "#fff" : "#000"}` }}
              >
                Ksh. {formattedPrice}
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
                      if (cartItem._id) {
                        dispatch(deleteCartItem(cartItem._id));
                        invalidate();
                      }
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
                    if (cartItem._id) {
                      dispatch(deleteCartItem(cartItem._id));
                      invalidate();
                    }
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