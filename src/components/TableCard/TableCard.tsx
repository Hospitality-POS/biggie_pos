import { Card, CardMedia } from "@mui/material";
import classes from "./table.module.css";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { createCart } from "../../features/Cart/CartActions";
import { fetchProducts } from "../../features/Product/ProductAction";

interface Item {
  item: any;
}

const TableCard: React.FC<Item> = ({ item }) => {
  const { user } = useSelector((state: any) => state.auth);
  const dispatch = useDispatch();

  const cardStyles = {
    boxShadow: "none",
    bgcolor: "transparent",
    color: item.isOccupied ? "black" : "white",
  };

  const imageStyles = {
    border: "none",
    opacity: item.isOccupied ? 0.5 : 1,
  };

  const handleCreate = () => {
    if (user) {
      const cartDetails = {
        table_id: item._id,
        created_by: user.id,
      };
      dispatch(createCart(cartDetails));
      // dispatch(fetchProducts())
    }
  };

  return (
    <Card
      sx={cardStyles}
      className={classes.container}
      onClick={handleCreate} 
    >
      <div className={classes.cardContent}>
        <CardMedia
          sx={imageStyles}
          component="img"
          alt="Table"
          height="120"
          image="/table.png"
          className={classes.image}
        />
        <div className={classes.name}>{item.name}</div>
      </div>
    </Card>
  );
};

export default TableCard;
