import React, { useState, useMemo } from "react";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import { useDispatch, useSelector } from "react-redux";
import { addItemToCart, fetchCartItems } from "../../features/Cart/CartActions";
import { useParams } from "react-router-dom";
import { addItem, subtractItem } from "../../features/Cart/CartSlice";
import { useAppDispatch, useAppSelector } from "../../store";
import { Typography } from "antd";

interface menudetails {
  quantity: number;
    _id: string;
    name: string;
    price: number;
    desc: string;
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

  const dispatch = useAppDispatch();
  const { id } = useParams();

  const formattedQuantity = useMemo(() => formatQuantity(menu.quantity), [menu.quantity]);

  const handleAddToCart = () => {
    if(!loading){
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

  const handleIncrement = () => {
    dispatch(addItem(menu._id));
    dispatch(fetchCartItems(cartDetails?._id));
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      setQuantity(quantity - 1);
      dispatch(subtractItem(menu._id));
      dispatch(fetchCartItems(cartDetails?._id));
    }
  };

  const formattedPrice = useMemo(() => formatPrice(menu.price), [menu.price]);


  return (
    <Paper
      elevation={3}
      onClick={() => {
         if (!loading) {
        handleIncrement();
        handleAddToCart();
         }
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "16px",
        maxWidth: "200px",
        // maxHeight: "150px",
        height: "180px",
        width: "180px",
        overflow: "hidden",
        cursor: "pointer",
        backgroundColor: "#6c1c2c",
        transition: "background-color 0.3s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "grey";
        e.currentTarget.style.color = "white";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#6c1c2c";
        e.currentTarget.style.color = "Black";
      }}
    >
        <Typography.Title level={4}
          ellipsis={{rows:3}}
          style={{
            fontWeight: "inherit",
            whiteSpace: "normal",
            wordWrap: "break-word",
            color: "white",
            textOverflow: "ellipsis",
          }}
        >
          {menu.name}
        </Typography.Title>
        <Typography.Text
          style={{ opacity: 0.7, marginTop: "auto", color: "white" }}
        >
          Ksh. {formattedPrice}
        </Typography.Text>
    </Paper>
  );
};

export default React.memo(ProductCard);