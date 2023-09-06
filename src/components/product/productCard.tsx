import React, { useState } from "react";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useDispatch, useSelector } from "react-redux";
import { addItemToCart, fetchCartItems } from "../../features/Cart/CartActions";
import { useParams } from "react-router-dom";

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
    console.log("Quantity added to cart:", quantity);
  };

  const handleIncrement = () => {
    setQuantity(quantity + 1);
    dispatch(fetchCartItems(cartDetails?._id));
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      setQuantity(quantity - 1);
    }
    dispatch(fetchCartItems(cartDetails?._id));
  };

  return (
    <Paper elevation={3} style={{ padding: "16px", maxWidth: "200px" }}>
      <Typography variant="h6" gutterBottom style={{ fontWeight: "bold" }}>
        {menu.name}
      </Typography>
      <Typography variant="body1" fontSize={18} mb={2} style={{ opacity: 0.7 }}>
        Ksh. {formatPrice(menu.price)}
      </Typography>
      <div>
        <Button
          variant="outlined"
          onClick={handleDecrement}
          sx={{
            color: "#6c1c2c",
            borderColor: "#6c1c2c",
            "&:hover": {
              borderColor: "#bc8c7c",
              color: "#bc8c7c",
            },
          }}
          disabled={quantity === 0}
        >
          -
        </Button>
        <span style={{ margin: "0 10px", fontWeight: "bold" }}>{quantity}</span>
        <Button
          variant="outlined"
          onClick={() => (handleIncrement(), handleAddToCart())}
          sx={{
            color: "#6c1c2c",
            borderColor: "#6c1c2c",
            "&:hover": {
              borderColor: "#bc8c7c",
              color: "#bc8c7c",
            },
          }}
        >
          +
        </Button>
      </div>
      {/* <Button
        variant="contained"
        color="primary"
        onClick={handleAddToCart}
        style={{ marginTop: "10px" }}
      >
        Add to Cart
      </Button> */}
    </Paper>
  );
};

export default ProductCard;
