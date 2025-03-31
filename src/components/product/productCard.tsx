import React, { useState, useMemo, useEffect } from "react";
import Paper from "@mui/material/Paper";
import { useDispatch } from "react-redux";
import { addItemToCart, fetchCartItems } from "../../features/Cart/CartActions";
import { useParams } from "react-router-dom";
import { addItem, subtractItem } from "../../features/Cart/CartSlice";
import { useAppDispatch, useAppSelector } from "../../store";
import { Typography } from "antd";
import useCartItemsData from "@hooks/cartItemsData";

interface menudetails {
  quantity: number;
  _id: string;
  name: string;
  price: number;
  desc: string;
  thumbnail?: string;
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

const ProductCard: React.FC<ProductCardProps> = ({ menu }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { cartDetails, loading } = useAppSelector((state) => state.cart);
  const [quantity, setQuantity] = useState(0);
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.primary_color) {
      setPrimaryColor(tenant.primary_color);
    }
  }, []);

  const dispatch = useAppDispatch();
  const { id } = useParams();

  const formattedQuantity = useMemo(
    () => formatQuantity(menu.quantity),
    [menu.quantity]
  );

  const handleAddToCart = () => {
    if (!loading) {
      dispatch(
        addItemToCart({
          cart_id: cartDetails?._id,
          product_id: menu._id,
          price: menu.price,
          created_by: user?.id,
          quantity: formattedQuantity,
          desc: menu.desc,
          table_id: id,
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
        height: "250px", // Increased height to accommodate the image
        overflow: "hidden",
        cursor: "pointer",
        backgroundColor: isHovered ? "#8a2e42" : primaryColor,
        transition: "all 0.3s ease",
        borderRadius: "8px",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
            e.currentTarget.src = defaultImagePath; // Fallback to default image on error
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

        {menu.desc && (
          <Typography.Paragraph
            ellipsis={{ rows: 2 }}
            style={{
              fontSize: "12px",
              margin: "0 0 8px 0",
              color: "rgba(255, 255, 255, 0.85)",
              textAlign: "center",
            }}
          >
            {menu.desc}
          </Typography.Paragraph>
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
            Ksh. {formattedPrice}
          </Typography.Text>

          <div
            style={{
              marginTop: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
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
              Add to Cart
            </Typography.Text>
          </div>
        </div>
      </div>
    </Paper>
  );
};

export default React.memo(ProductCard);