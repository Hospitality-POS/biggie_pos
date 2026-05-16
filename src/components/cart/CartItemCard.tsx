/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
} from "@mui/material";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { deleteCartItem, addQtyCart, removeQtyCart, updateCartItemQty, updateCartItems } from "../../features/Cart/CartActions";
import { useAppDispatch, useAppSelector } from "../../store";
import AddTaskIcon from "@mui/icons-material/AddTask";
import { Space } from "antd/lib";
import { Button, Typography, notification, Tooltip, Input, Popconfirm } from "antd";
import { DeleteOutlined, LoadingOutlined, EditOutlined, FileTextOutlined } from "@ant-design/icons";
import useCartItemsData from "@hooks/cartItemsData";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import axiosInstance from "../../services/axiosInstance";

interface cartItemCardProps {
  cartItem: any;
}

function formatQuantity(quantity: number | undefined | null): string {
  return quantity?.toString() || "0";
}

function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null || isNaN(price)) return "0";
  return price.toLocaleString();
}

const CartItemCard: React.FC<cartItemCardProps> = ({ cartItem }) => {
  const dispatch = useAppDispatch();
  const { cartDetails } = useAppSelector((state) => state.cart);
  const { user } = useAppSelector((state) => state.auth);
  const primaryColor = usePrimaryColor();
  const { invalidate } = useCartItemsData();

  const [isEditingQty, setIsEditingQty] = useState(false);
  const [qtyInputValue, setQtyInputValue] = useState<string>("");
  const [stepLoading, setStepLoading] = useState<"add" | "remove" | null>(null);
  const [qtyLoading, setQtyLoading] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(cartItem?.notes || "");
  const [notesLoading, setNotesLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canEditQty = user?.role === "admin" || user?.role === "cashier";

  // Sync display when cart updates externally
  useEffect(() => {
    if (!isEditingQty) {
      setQtyInputValue(String(cartItem?.quantity ?? 0));
    }
  }, [cartItem?.quantity, isEditingQty]);

  // Sync notes when cart updates externally
  useEffect(() => {
    if (!isEditingNotes) {
      setNotesValue(cartItem?.notes || "");
    }
  }, [cartItem?.notes, isEditingNotes]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditingQty && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingQty]);

  const formattedPrice = useMemo(() => formatPrice(cartItem?.price), [cartItem?.price]);
  const formattedQuantity = useMemo(() => formatQuantity(cartItem?.quantity), [cartItem?.quantity]);

  const discountedPrice = useMemo(() => {
    if (!cartItem?.price || !cartDetails?.discount) return null;
    const itemPrice = cartItem.price;
    let discountAmount = 0;
    if (cartDetails.discount_type === "percentage") {
      discountAmount = itemPrice * (cartDetails.discount / 100);
    } else {
      const totalCartAmount = (cartDetails?.items || []).reduce(
        (acc: number, item: any) => acc + (item?.price || 0), 0
      );
      if (totalCartAmount > 0) {
        discountAmount = (itemPrice / totalCartAmount) * cartDetails.discount;
      }
    }
    const newPrice = itemPrice - discountAmount;
    return newPrice > 0 ? formatPrice(newPrice) : "0";
  }, [cartItem?.price, cartDetails?.discount, cartDetails?.discount_type, cartDetails?.items]);

  const handleStepAdd = async () => {
    if (!canEditQty || stepLoading || qtyLoading) return;
    setStepLoading("add");
    try {
      await dispatch(addQtyCart(cartItem));
      invalidate();
    } catch {
      notification.error({ message: "Failed to update quantity" });
    } finally {
      setStepLoading(null);
    }
  };

  const handleStepRemove = async () => {
    if (!canEditQty || stepLoading || qtyLoading || cartItem.quantity <= 1) return;
    setStepLoading("remove");
    try {
      await dispatch(removeQtyCart(cartItem));
      invalidate();
    } catch {
      notification.error({ message: "Failed to update quantity" });
    } finally {
      setStepLoading(null);
    }
  };

  const commitQtyChange = async () => {
    setIsEditingQty(false);
    const parsed = parseInt(qtyInputValue, 10);

    if (isNaN(parsed) || parsed < 1 || parsed === cartItem.quantity) {
      setQtyInputValue(String(cartItem.quantity));
      return;
    }

    setQtyLoading(true);
    try {
      await dispatch(updateCartItemQty({ cartItem, quantity: parsed }));
      invalidate();
    } catch {
      notification.error({ message: "Failed to update quantity" });
      setQtyInputValue(String(cartItem.quantity));
    } finally {
      setQtyLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { commitQtyChange(); return; }
    if (e.key === "Escape") {
      setIsEditingQty(false);
      setQtyInputValue(String(cartItem.quantity));
      return;
    }
    if (!/[\d]/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleSaveNotes = async () => {
    setIsEditingNotes(false);
    if (notesValue === cartItem?.notes) return;

    setNotesLoading(true);
    try {
      await dispatch(updateCartItems({ _id: cartItem._id, cart_id: cartDetails._id, notes: notesValue } as any));
      invalidate();
    } catch {
      notification.error({ message: "Failed to update notes" });
      setNotesValue(cartItem?.notes || "");
    } finally {
      setNotesLoading(false);
    }
  };

  if (!cartItem) return null;

  const isSent = cartItem.sent;
  const textColor = isSent ? "#fff" : "#000";

  return (
    <Card
      key={cartItem._id}
      sx={{
        mb: 1,
        boxShadow: "none",
        backgroundColor: isSent ? primaryColor : "#f6ffed",
        color: textColor,
        transition: "background-color 0.2s ease",
      }}
    >
      <CardContent sx={{ pb: "8px !important", pt: "10px !important", px: "12px !important" }}>
        <Grid container spacing={1} alignItems="center">

          {/* Item Name */}
          <Grid item xs={4}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Typography.Text
                ellipsis={{ tooltip: cartItem?.product_id?.name }}
                style={{ color: textColor, fontSize: 13, fontWeight: 500 }}
              >
                {cartItem?.product_id?.name || "Product Name"}
              </Typography.Text>
              <Tooltip
                title={
                  <div style={{ maxWidth: 250 }}>
                    {cartItem?.notes ? (
                      <div style={{ background: "#fef08a", padding: 8, borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                        <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 4, color: "#854d0e" }}>📝 Notes:</div>
                        <div style={{ fontSize: 12, color: "#713f12" }}>{cartItem.notes}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>No notes</div>
                    )}
                  </div>
                }
                placement="top"
              >
                <FileTextOutlined
                  style={{
                    fontSize: 14,
                    color: cartItem?.notes ? primaryColor : "#94a3b8",
                    cursor: canEditQty ? "pointer" : "default",
                    flexShrink: 0
                  }}
                  onClick={() => {
                    if (canEditQty) {
                      setNotesValue(cartItem?.notes || "");
                      setIsEditingNotes(true);
                    }
                  }}
                />
              </Tooltip>
            </div>
            {/* Notes editing input */}
            {isEditingNotes && (
              <div style={{ marginTop: 6 }}>
                <Input.TextArea
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  onBlur={handleSaveNotes}
                  onPressEnter={handleSaveNotes}
                  placeholder="Add notes (e.g., extra spicy, no onions)"
                  style={{ fontSize: 12 }}
                  autoFocus
                />
              </div>
            )}
          </Grid>

          {/* Quantity Controls */}
          <Grid item xs={4}>
            {canEditQty ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>

                {/* Minus */}
                <button
                  onClick={handleStepRemove}
                  disabled={!!stepLoading || qtyLoading || cartItem.quantity <= 1}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: `1.5px solid ${isSent ? "rgba(255,255,255,0.5)" : primaryColor}`,
                    backgroundColor: "transparent",
                    color: isSent ? "#fff" : primaryColor,
                    cursor: (cartItem.quantity <= 1 || !!stepLoading) ? "not-allowed" : "pointer",
                    opacity: cartItem.quantity <= 1 ? 0.35 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    fontSize: 16,
                    fontWeight: "bold",
                    lineHeight: 1,
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                  }}
                >
                  {stepLoading === "remove"
                    ? <LoadingOutlined style={{ fontSize: 10 }} />
                    : "−"}
                </button>

                {/* Quantity: click to type */}
                {isEditingQty ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: "2px" }}>
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      value={qtyInputValue}
                      onChange={(e) => setQtyInputValue(e.target.value)}
                      onBlur={commitQtyChange}
                      onKeyDown={handleKeyDown}
                      style={{
                        width: 38,
                        height: 26,
                        textAlign: "center",
                        border: `2px solid ${primaryColor}`,
                        borderRadius: 5,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#000",
                        backgroundColor: "#fff",
                        outline: "none",
                        padding: "0 2px",
                        boxShadow: `0 0 0 2px ${primaryColor}22`,
                      }}
                    />
                    {/* Confirm tick */}
                    <button
                      onMouseDown={(e) => { e.preventDefault(); commitQtyChange(); }}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: "none",
                        backgroundColor: "#52c41a",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        fontSize: 11,
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </button>
                  </Box>
                ) : (
                  <Tooltip title="Click to set quantity" placement="top" mouseEnterDelay={0.5}>
                    <button
                      onClick={() => {
                        if (!qtyLoading && !stepLoading) {
                          setQtyInputValue(String(cartItem.quantity));
                          setIsEditingQty(true);
                        }
                      }}
                      style={{
                        minWidth: 30,
                        height: 26,
                        border: `1px dashed ${isSent ? "rgba(255,255,255,0.4)" : `${primaryColor}55`}`,
                        borderRadius: 5,
                        backgroundColor: isSent ? "rgba(255,255,255,0.15)" : `${primaryColor}0f`,
                        color: textColor,
                        cursor: qtyLoading ? "wait" : "pointer",
                        fontSize: 13,
                        fontWeight: 700,
                        padding: "0 6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s ease",
                        flexShrink: 0,
                      }}
                    >
                      {qtyLoading
                        ? <LoadingOutlined style={{ fontSize: 11, color: textColor }} />
                        : cartItem.quantity !== undefined && cartItem.quantity !== null
                          ? formattedQuantity
                          : <LoadingOutlined style={{ fontSize: 11 }} />
                      }
                    </button>
                  </Tooltip>
                )}

                {/* Plus */}
                <button
                  onClick={handleStepAdd}
                  disabled={!!stepLoading || qtyLoading}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: `1.5px solid ${isSent ? "rgba(255,255,255,0.5)" : primaryColor}`,
                    backgroundColor: "transparent",
                    color: isSent ? "#fff" : primaryColor,
                    cursor: !!stepLoading ? "not-allowed" : "pointer",
                    opacity: !!stepLoading ? 0.4 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    fontSize: 16,
                    fontWeight: "bold",
                    lineHeight: 1,
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                  }}
                >
                  {stepLoading === "add"
                    ? <LoadingOutlined style={{ fontSize: 10 }} />
                    : "+"}
                </button>

              </Box>
            ) : (
              // Read-only for non-admin/cashier
              <Typography.Text strong style={{ color: textColor }}>
                x {cartItem.quantity !== undefined && cartItem.quantity !== null
                  ? formattedQuantity
                  : <LoadingOutlined />}
              </Typography.Text>
            )}
          </Grid>

          {/* Price */}
          <Grid item xs={2} sx={{ ml: -1 }}>
            {discountedPrice ? (
              <div>
                <Typography.Text
                  delete
                  style={{ color: textColor, opacity: 0.6, fontSize: 11, display: "block" }}
                >
                  {formattedPrice}
                </Typography.Text>
                <Typography.Text strong style={{ color: textColor, fontSize: 12 }}>
                  {discountedPrice}
                </Typography.Text>
              </div>
            ) : (
              <Typography.Text strong style={{ color: textColor, fontSize: 12 }}>
                {formattedPrice}
              </Typography.Text>
            )}
          </Grid>

          {/* Delete / Sent */}
          <Grid item xs={2}>
            {isSent ? (
              <Space>
                {user?.role === "admin" && (
                  <Button
                    danger
                    size="small"
                    style={{ width: "32px", padding: 0 }}
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      if (cartItem._id) {
                        dispatch(deleteCartItem(cartItem._id));
                        invalidate();
                      }
                    }}
                  />
                )}
                <IconButton size="small">
                  <AddTaskIcon color="success" fontSize="small" />
                </IconButton>
              </Space>
            ) : (
              <Button
                danger
                size="small"
                style={{ width: "32px", padding: 0 }}
                icon={<DeleteOutlined />}
                onClick={() => {
                  if (cartItem._id) {
                    dispatch(deleteCartItem(cartItem._id));
                    invalidate();
                  }
                }}
              />
            )}
          </Grid>

        </Grid>
      </CardContent>
      <Divider sx={{ my: 0 }} />
    </Card>
  );
};

export default React.memo(CartItemCard);