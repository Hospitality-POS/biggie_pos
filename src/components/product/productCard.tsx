import React, { useState, useMemo, useCallback } from "react";
import Paper from "@mui/material/Paper";
import { addItemToCart, addQtyCart } from "../../features/Cart/CartActions";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store";
import { Typography } from "antd";
import useCartItemsData from "@hooks/cartItemsData";
import { AccessTime, ShoppingCart, Build } from "@mui/icons-material";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { usePOSMode } from "@context/POSModeContext";
import { useRetailQueue } from "@context/RetailQueueContext";

interface menudetails {
  quantity?: number;
  duration?: number;
  _id: string;
  name: string;
  price: number;
  desc: string;
  thumbnail?: string;
  type?: 'product' | 'service';
  usage_type?: string;
  supplier_price?: number;
  unit_id?: any;
  activateInventory?: boolean;
  addons?: any[];
  category?: any;
  subcategory_id?: any;
}

interface ProductCardProps {
  menu: menudetails;
}

function formatPrice(price: number) {
  return price?.toLocaleString();
}

function formatDuration(duration: number) {
  if (duration < 60) {
    return `${duration} min`;
  } else {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
}

const ProductCard: React.FC<ProductCardProps> = ({ menu }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { cartDetails, cartItems, loading } = useAppSelector((state) => state.cart);
  const [isHovered, setIsHovered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const primaryColor = usePrimaryColor();
  const { isRetailMode } = usePOSMode();
  const { activeTable } = useRetailQueue();

  const lightenColor = (color: string, percent: number = 20) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const lightenedR = Math.min(255, Math.round(r + (255 - r) * percent / 100));
    const lightenedG = Math.min(255, Math.round(g + (255 - g) * percent / 100));
    const lightenedB = Math.min(255, Math.round(b + (255 - b) * percent / 100));
    return `#${lightenedR.toString(16).padStart(2, '0')}${lightenedG.toString(16).padStart(2, '0')}${lightenedB.toString(16).padStart(2, '0')}`;
  };

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
        (item as any).productId === menu._id
    );
  }, [cartItems, menu._id]);

  const handleAddToCart = useCallback(async () => {
    if (loading || isProcessing) return;
    if (!tableId) {
      console.warn('ProductCard: no tableId available, skipping addToCart');
      return;
    }

    setIsProcessing(true);
    try {
      if (existingCartItem) {
        // ── Item already in cart — increment quantity only, never resend price ──
        // addQtyCart does: existing.quantity + 1 via PUT /cart-item/:id
        // It does NOT modify price, so the unit price stays correct and
        // calculateTotals() will compute lineTotal = unitPrice * newQty correctly.
        await dispatch(addQtyCart(existingCartItem));
      } else {
        // ── New item — add fresh with unit price ──────────────────────────────
        // We only send price once (on first add). All subsequent clicks go through
        // addQtyCart above which only touches quantity, never price.
        await dispatch(
          addItemToCart({
            cart_id: cartDetails?._id || undefined,
            product_id: menu._id,
            product_type: menu.type === 'product' ? 'Product_Inventory' : 'Product',
            price: menu.price,         // unit price — set exactly once
            created_by: user?.id,
            quantity: formattedQuantity,
            desc: menu.desc,
            table_id: tableId,
            ...(menu.type === 'service' && menu.duration && { duration: menu.duration }),
          })
        );
      }
      invalidate();
    } catch (error) {
      console.error('Failed to add item to cart:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [
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
    formattedQuantity,
    invalidate,
    existingCartItem,
  ]);

  const formattedPrice = useMemo(() => formatPrice(menu.price), [menu.price]);

  const defaultImagePath = "/download.png";

  const getBadgeProps = () => {
    if (menu.type === 'service') {
      return {
        color: '#2196F3',
        icon: <Build style={{ fontSize: '12px', marginRight: '4px' }} />,
        text: 'SERVICE',
      };
    }
    return {
      color: '#4CAF50',
      icon: <ShoppingCart style={{ fontSize: '12px', marginRight: '4px' }} />,
      text: 'PRODUCT',
    };
  };

  const badgeProps = getBadgeProps();

  // Show current quantity in cart on the action button (handy UX hint)
  const cartQty = existingCartItem?.quantity ?? 0;

  const getActionText = () => {
    if (isProcessing) return 'Adding...';
    if (!tableId) return 'Loading slot...';
    if (cartQty > 0) {
      return menu.type === 'service' ? `Book Again (×${cartQty})` : `Add Again (×${cartQty})`;
    }
    return menu.type === 'service' ? 'Book Service' : 'Add to Cart';
  };

  const handleClick = useCallback(() => {
    if (!loading && !isProcessing && tableId) {
      handleAddToCart();
    }
  }, [loading, isProcessing, tableId, handleAddToCart]);

  const hoverColor = lightenColor(primaryColor, 15);

  return (
    <Paper
      elevation={isHovered ? 6 : 3}
      onClick={handleClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0",
        width: "180px",
        height: "250px",
        overflow: "hidden",
        cursor: (loading || isProcessing || !tableId) ? "wait" : "pointer",
        backgroundColor: isHovered ? hoverColor : primaryColor,
        transition: "all 0.3s ease",
        borderRadius: "8px",
        position: "relative",
        opacity: (loading || isProcessing) ? 0.7 : 1,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Type Badge */}
      <div style={{
        position: "absolute",
        top: "8px",
        right: "8px",
        backgroundColor: badgeProps.color,
        color: 'white',
        padding: "4px 8px",
        borderRadius: "12px",
        fontSize: "10px",
        fontWeight: "bold",
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      }}>
        {badgeProps.icon}
        {badgeProps.text}
      </div>

      {/* Cart quantity badge — shown when item is already in cart */}
      {cartQty > 0 && (
        <div style={{
          position: "absolute",
          top: "8px",
          left: "8px",
          backgroundColor: "rgba(0,0,0,0.65)",
          color: "white",
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          fontSize: "11px",
          fontWeight: "bold",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}>
          {cartQty}
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          color: "white",
          padding: "8px 16px",
          borderRadius: "4px",
          fontSize: "12px",
          zIndex: 10,
        }}>
          Adding...
        </div>
      )}

      {/* Image Container */}
      <div style={{
        width: "100%",
        height: "120px",
        overflow: "hidden",
        position: "relative",
        borderTopLeftRadius: "8px",
        borderTopRightRadius: "8px",
      }}>
        <img
          src={menu.thumbnail || defaultImagePath}
          alt={menu.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.3s ease",
            transform: isHovered ? "scale(1.05)" : "scale(1)",
          }}
          onError={(e) => { e.currentTarget.src = defaultImagePath; }}
        />
      </div>

      {/* Content Container */}
      <div style={{
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        flexGrow: 1,
      }}>
        <Typography.Title
          level={4}
          ellipsis={{ rows: 2 }}
          style={{
            fontSize: "16px",
            margin: "0 0 8px 0",
            color: "white",
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          {menu.name}
        </Typography.Title>

        {menu.type === 'service' && menu.duration && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "8px",
            color: "rgba(255, 255, 255, 0.95)",
            fontSize: "11px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            padding: "4px 8px",
            borderRadius: "8px",
          }}>
            <AccessTime style={{ fontSize: '12px', marginRight: '4px' }} />
            {formatDuration(menu.duration)}
          </div>
        )}

        <div style={{ marginTop: "auto", textAlign: "center" }}>
          <Typography.Text strong style={{
            fontSize: "18px",
            color: "white",
            display: "block",
            fontWeight: "bold",
          }}>
            {menu.type === 'service' ? 'From ' : ''}Ksh. {formattedPrice}
            {menu.type === 'service' && menu.duration && (
              <span style={{ fontSize: '12px', opacity: 0.8 }}>
                /{menu.duration < 60 ? 'session' : 'hour'}
              </span>
            )}
          </Typography.Text>

          <div style={{
            marginTop: "8px",
            backgroundColor: isHovered ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.15)",
            padding: "4px 12px",
            borderRadius: "4px",
            display: "inline-block",
            transition: "background-color 0.3s ease",
          }}>
            <Typography.Text style={{ color: "white", fontSize: "12px" }}>
              {getActionText()}
            </Typography.Text>
          </div>
        </div>
      </div>
    </Paper>
  );
};

export default React.memo(ProductCard);