import React, { useState, useMemo, useEffect } from "react";
import Paper from "@mui/material/Paper";
import { useDispatch } from "react-redux";
import { addItemToCart, fetchCartItems } from "../../features/Cart/CartActions";
import { useParams } from "react-router-dom";
import { addItem, subtractItem } from "../../features/Cart/CartSlice";
import { useAppDispatch, useAppSelector } from "../../store";
import { Typography } from "antd";
import useCartItemsData from "@hooks/cartItemsData";
import { AccessTime, ShoppingCart, Build } from "@mui/icons-material";

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

function formatQuantity(quantity: number) {
  return quantity?.toLocaleString();
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
  const { cartDetails, loading } = useAppSelector((state) => state.cart);
  const [quantity, setQuantity] = useState(0);
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.color_scheme.primary) {
      setPrimaryColor(tenant.color_scheme.primary);
    }
  }, []);

  const dispatch = useAppDispatch();
  const { id } = useParams();

  const formattedQuantity = useMemo(() => {
    return 1; // Always use quantity of 1 for cart operations
  }, []);

  const handleAddToCart = () => {
    if (!loading) {
      dispatch(
        addItemToCart({
          cart_id: cartDetails?._id,
          product_id: menu._id,
          product_type: menu.type === 'product' ? 'Product_Inventory' : 'Product',
          price: menu.price,
          created_by: user?.id,
          quantity: formattedQuantity,
          desc: menu.desc,
          table_id: id,
          ...(menu.type === 'service' && menu.duration && { duration: menu.duration })
        })
      );
    }
  };

  const { invalidate } = useCartItemsData();

  const handleIncrement = () => {
    dispatch(addItem(menu._id));
    dispatch(fetchCartItems(cartDetails?._id));
    invalidate();
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      setQuantity(quantity - 1);
      dispatch(subtractItem(menu._id));
      dispatch(fetchCartItems(cartDetails?._id));
    }
  };

  const formattedPrice = useMemo(() => formatPrice(menu.price), [menu.price]);

  // Default image path
  const defaultImagePath = "/download.png";

  // Get badge properties based on type
  const getBadgeProps = () => {
    if (menu.type === 'service') {
      return {
        color: '#2196F3',
        icon: <Build style={{ fontSize: '12px', marginRight: '4px' }} />,
        text: 'SERVICE'
      };
    }
    return {
      color: '#4CAF50',
      icon: <ShoppingCart style={{ fontSize: '12px', marginRight: '4px' }} />,
      text: 'PRODUCT'
    };
  };

  const badgeProps = getBadgeProps();

  const getActionText = () => {
    return menu.type === 'service' ? 'Book Service' : 'Add to Cart';
  };

  return (
    <Paper
      elevation={isHovered ? 6 : 3}
      onClick={() => {
        if (!loading) {
          handleIncrement();
          handleAddToCart();
        }
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0",
        width: "180px",
        height: "250px", // Back to original height
        overflow: "hidden",
        cursor: "pointer",
        backgroundColor: isHovered ? "#8a2e42" : primaryColor,
        transition: "all 0.3s ease",
        borderRadius: "8px",
        position: "relative",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Type Badge */}
      <div
        style={{
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
        }}
      >
        {badgeProps.icon}
        {badgeProps.text}
      </div>

      {/* Image Container */}
      <div
        style={{
          width: "100%",
          height: "120px",
          overflow: "hidden",
          position: "relative",
          borderTopLeftRadius: "8px",
          borderTopRightRadius: "8px",
        }}
      >
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
          onError={(e) => {
            e.currentTarget.src = defaultImagePath;
          }}
        />
      </div>

      {/* Content Container */}
      <div
        style={{
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          flexGrow: 1,
        }}
      >
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

        {/* Service Duration */}
        {menu.type === 'service' && menu.duration && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "8px",
              color: "rgba(255, 255, 255, 0.95)",
              fontSize: "11px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              padding: "4px 8px",
              borderRadius: "8px",
            }}
          >
            <AccessTime style={{ fontSize: '12px', marginRight: '4px' }} />
            {formatDuration(menu.duration)}
          </div>
        )}

        <div style={{ marginTop: "auto", textAlign: "center" }}>
          <Typography.Text
            strong
            style={{
              fontSize: "18px",
              color: "white",
              display: "block",
              fontWeight: "bold",
            }}
          >
            {menu.type === 'service' ? 'From ' : ''}Ksh. {formattedPrice}
            {menu.type === 'service' && menu.duration && (
              <span style={{ fontSize: '12px', opacity: 0.8 }}>
                /{menu.duration < 60 ? 'session' : 'hour'}
              </span>
            )}
          </Typography.Text>

          <div
            style={{
              marginTop: "8px",
              backgroundColor: isHovered ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.15)",
              padding: "4px 12px",
              borderRadius: "4px",
              display: "inline-block",
              transition: "background-color 0.3s ease",
            }}
          >
            <Typography.Text
              style={{
                color: "white",
                fontSize: "12px",
              }}
            >
              {getActionText()}
            </Typography.Text>
          </div>
        </div>
      </div>
    </Paper>
  );
};

export default React.memo(ProductCard);