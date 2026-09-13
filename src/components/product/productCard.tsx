import React, { useState, useMemo, useCallback } from "react";
import { Typography, Button } from "antd";
import {
  ShoppingOutlined,
  ToolOutlined,
  PlusOutlined,
  CheckOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { addItemToCart, addQtyCart, createCart, getCart } from "../../features/Cart/CartActions";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store";
import useCartItemsData from "@hooks/cartItemsData";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { usePOSMode } from "@context/POSModeContext";
import { useRetailQueue } from "@context/RetailQueueContext";
import AddonSelectionModal from "../MODALS/pro/AddonSelectionModal";

interface menudetails {
  quantity?: number;
  duration?: number;
  _id: string;
  name: string;
  price: number;
  desc: string;
  thumbnail?: string;
  type?: "product" | "service";
  usage_type?: string;
  supplier_price?: number;
  unit_id?: string | number | null;
  activateInventory?: boolean;
  addons?: unknown[];
  category?: unknown;
  subcategory_id?: unknown;
}

interface ProductCardProps {
  menu: menudetails;
  handleCart?: () => void;
  style?: React.CSSProperties;
}

function formatPrice(price: number) {
  return price?.toLocaleString();
}

function formatDuration(duration: number) {
  if (duration < 60) {
    return `${duration} min`;
  }
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

const ProductCard: React.FC<ProductCardProps> = ({ menu, handleCart, style }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { cartDetails, cartItems, loading } = useAppSelector((state) => state.cart);
  const [isHovered, setIsHovered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const primaryColor = usePrimaryColor() || "#10b981";
  const { isRetailMode } = usePOSMode();
  const { activeTable } = useRetailQueue();

  const dispatch = useAppDispatch();
  const { id } = useParams();
  const { invalidate } = useCartItemsData();

  // In retail mode use the auto-assigned slot, otherwise use URL param
  const tableId = isRetailMode ? activeTable?._id : id;
  const formattedQuantity = useMemo(() => 1, []);

  // Check if this product already exists in the cart
  const existingCartItem = useMemo(() => {
    return cartItems?.find(
      (item) =>
        item.product_id === menu._id ||
        (item as { productId?: string }).productId === menu._id
    );
  }, [cartItems, menu._id]);

  const cartQty = existingCartItem?.quantity ?? 0;
  const currency = (cartDetails as { currency?: string } | null)?.currency || "KES";
  const formattedPrice = useMemo(() => formatPrice(menu.price), [menu.price]);

  const hasValidImage = Boolean(
    menu.thumbnail &&
    menu.thumbnail !== "/download.png" &&
    !imageError
  );

  const handleAddToCart = useCallback(
    async (addons?: string[]) => {
      if (loading || isProcessing) return;
      if (!tableId) {
        console.warn("ProductCard: no tableId available, skipping addToCart");
        return;
      }

      setIsProcessing(true);
      try {
        let cartId = cartDetails?._id;
        if (!cartId) {
          const createResult = await dispatch(
            createCart({
              table_id: tableId,
              created_by: user?.id || user?._id,
            })
          );
          if (createResult.type.endsWith("/fulfilled")) {
            cartId = (createResult as { payload?: { _id?: string } }).payload?._id;
            await dispatch(getCart(tableId));
          } else {
            console.error("Failed to create cart");
            return;
          }
        }

        const existingHasAddons = existingCartItem?.addons && existingCartItem.addons.length > 0;
        const addingWithAddons = addons && addons.length > 0;

        if (existingCartItem && !existingHasAddons && !addingWithAddons) {
          await dispatch(addQtyCart(existingCartItem));
        } else {
          await dispatch(
            addItemToCart({
              cart_id: cartId,
              product_id: menu._id,
              product_type: menu.type === "product" ? "Product_Inventory" : "Product",
              price: menu.price,
              created_by: user?.id || user?._id,
              quantity: formattedQuantity,
              desc: menu.desc,
              table_id: tableId,
              ...(menu.type === "service" && menu.duration && { duration: menu.duration }),
              ...(addingWithAddons && { addons }),
            })
          );
        }
        invalidate();
        handleCart?.();
      } catch (error) {
        console.error("Failed to add item to cart:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      loading,
      isProcessing,
      tableId,
      dispatch,
      menu._id,
      menu.type,
      menu.price,
      menu.desc,
      menu.duration,
      cartDetails?._id,
      user?.id,
      user?._id,
      formattedQuantity,
      invalidate,
      existingCartItem,
      handleCart,
    ]
  );

  const handleClick = useCallback(() => {
    if (!loading && !isProcessing && tableId) {
      const existingHasAddons = existingCartItem?.addons && existingCartItem.addons.length > 0;
      const productHasAddons = menu.addons && menu.addons.length > 0;

      if (productHasAddons || existingHasAddons) {
        setAddonModalOpen(true);
      } else {
        handleAddToCart();
      }
    }
  }, [loading, isProcessing, tableId, menu.addons, existingCartItem, handleAddToCart]);

  const handleAddonModalConfirm = (selectedAddonIds: string[]) => {
    handleAddToCart(selectedAddonIds);
  };

  return (
    <>
      <div
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: "150px",
          minHeight: "260px",
          borderRadius: "12px",
          overflow: "hidden",
          backgroundColor: "#ffffff",
          border: `1px solid ${isHovered ? primaryColor : "#e2e8f0"}`,
          boxShadow: isHovered
            ? `0 8px 20px ${primaryColor}22, 0 2px 6px rgba(0,0,0,0.06)`
            : "0 1px 4px rgba(0,0,0,0.04)",
          cursor: loading || isProcessing || !tableId ? "wait" : "pointer",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          opacity: loading || isProcessing ? 0.75 : 1,
          transform: isHovered ? "translateY(-2px)" : "translateY(0)",
          ...style,
        }}
      >
        {/* Top media container */}
        <div
          style={{
            width: "100%",
            height: "125px",
            overflow: "hidden",
            position: "relative",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          {/* Cart Quantity Badge (Top-Left) */}
          {cartQty > 0 && (
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                backgroundColor: primaryColor,
                color: "#ffffff",
                padding: "2px 8px",
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 4,
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                zIndex: 2,
              }}
            >
              <CheckOutlined style={{ fontSize: 10 }} />
              <span>{cartQty} in cart</span>
            </div>
          )}

          {/* Addon Tag (Top-Right) */}
          {menu.addons && menu.addons.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                backgroundColor: "rgba(100, 116, 139, 0.85)",
                color: "#ffffff",
                padding: "2px 8px",
                borderRadius: 12,
                fontSize: 10,
                fontWeight: 600,
                boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                zIndex: 2,
              }}
            >
              + Addons
            </div>
          )}

          {/* Image or Branded Vector Placeholder */}
          {hasValidImage ? (
            <img
              src={menu.thumbnail}
              alt={menu.name}
              onError={() => setImageError(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "transform 0.3s ease",
                transform: isHovered ? "scale(1.05)" : "scale(1)",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  background: `${primaryColor}14`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "transform 0.25s ease",
                  transform: isHovered ? "scale(1.08)" : "scale(1)",
                }}
              >
                {menu.type === "service" ? (
                  <ToolOutlined style={{ fontSize: 24, color: primaryColor }} />
                ) : (
                  <ShoppingOutlined style={{ fontSize: 24, color: primaryColor }} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div
          style={{
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "space-between",
          }}
        >
          {/* Title & metadata */}
          <div>
            <Typography.Text
              strong
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#0f172a",
                lineHeight: 1.35,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                minHeight: "38px",
              }}
              title={menu.name}
            >
              {menu.name}
            </Typography.Text>

            {menu.type === "service" && menu.duration ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "#64748b",
                  backgroundColor: "#f1f5f9",
                  padding: "2px 6px",
                  borderRadius: 6,
                  marginTop: 4,
                }}
              >
                <ClockCircleOutlined style={{ fontSize: 11 }} />
                <span>{formatDuration(menu.duration)}</span>
              </div>
            ) : null}
          </div>

          {/* Price & Action Button */}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                {currency}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                {formattedPrice}
              </span>
              {menu.type === "service" && menu.duration ? (
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  /{menu.duration < 60 ? "session" : "hr"}
                </span>
              ) : null}
            </div>

            {/* Touch Action Button */}
            <Button
              type={cartQty > 0 ? "default" : "primary"}
              block
              size="middle"
              icon={cartQty > 0 ? <CheckOutlined /> : <PlusOutlined />}
              loading={isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              style={{
                marginTop: 8,
                height: 34,
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 12,
                ...(cartQty > 0
                  ? {
                      backgroundColor: `${primaryColor}14`,
                      color: primaryColor,
                      borderColor: primaryColor,
                    }
                  : {
                      backgroundColor: primaryColor,
                      borderColor: primaryColor,
                      boxShadow: `0 2px 6px ${primaryColor}28`,
                    }),
              }}
            >
              {isProcessing
                ? "Adding..."
                : cartQty > 0
                ? `Add Again (${cartQty})`
                : menu.type === "service"
                ? "Book Service"
                : "Add to Cart"}
            </Button>
          </div>
        </div>
      </div>

      <AddonSelectionModal
        open={addonModalOpen}
        onClose={() => setAddonModalOpen(false)}
        product={menu}
        onConfirm={handleAddonModalConfirm}
      />
    </>
  );
};

const MemoizedProductCard = React.memo(ProductCard);
export default MemoizedProductCard;
