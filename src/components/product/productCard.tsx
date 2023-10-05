import React, { useState } from "react";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useDispatch, useSelector } from "react-redux";
import { addItemToCart, fetchCartItems } from "../../features/Cart/CartActions";
import { useParams } from "react-router-dom";
import { addItem, subtractItem } from "../../features/Cart/CartSlice";

function formatPrice(price) {
  return price.toLocaleString();
}

interface ProductCardProps {
  menu: {
    quantity: any;
    _id: string;
    name: string;
    price: number;
    desc: string;
  };
}

const ProductCard: React.FC<ProductCardProps> = ({ menu }) => {
  const { user } = useSelector((state: any) => state.auth);
  const { cartDetails } = useSelector((state: any) => state.cart);
  const [quantity, setQuantity] = useState(0);

  const dispatch = useDispatch();
  const { id } = useParams();

  const handleAddToCart = () => {
    // Dispatch an action to add the item to the cart
    dispatch(
      addItemToCart({
        cart_id: cartDetails._id,
        product_id: menu._id,
        price: menu.price,
        created_by: user.id,
        quantity: menu.quantity,
        desc: menu.desc,
        table_id: id,
      })
    );
  };

  const handleIncrement = () => {
    // Dispatch an action to increment the item quantity in the cart
    dispatch(addItem(menu._id));
    // Fetch updated cart items after incrementing
    dispatch(fetchCartItems(cartDetails?._id));
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      setQuantity(quantity - 1);
      // Dispatch an action to decrement the item quantity in the cart
      dispatch(subtractItem(menu._id));
      // Fetch updated cart items after decrementing
      dispatch(fetchCartItems(cartDetails?._id));
    }
  };

  return (
    <Paper
      elevation={3}
      onClick={() => {
        handleIncrement();
        handleAddToCart();
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "16px",
        maxWidth: "200px",
        maxHeight: "150px",
        height: "150px",
        width: "150px",
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
      <div>
        <Typography
          variant="h6"
          gutterBottom
          style={{
            fontWeight: "inherit",
            whiteSpace: "normal",
            wordWrap: "break-word",
            color: "white",
            textOverflow: "ellipsis",
          }}
        >
          {menu.name}
        </Typography>
        <Typography
          variant="body1"
          fontSize={18}
          mb={2}
          style={{ opacity: 0.7, marginTop: "auto", color: "white" }}
         
        >
          Ksh. {formatPrice(menu.price)}
        </Typography>
      </div>
    </Paper>
  );
};

export default ProductCard;
