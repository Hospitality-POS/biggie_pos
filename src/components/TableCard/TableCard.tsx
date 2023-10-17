import { Card, CardMedia, Typography, Box } from "@mui/material";
import classes from "./table.module.css";
import React, { useState } from "react";
import { createCart, getCart } from "../../features/Cart/CartActions";
import StaffModal from "../staffCard/StaffModal";
import { useAppDispatch, useAppSelector } from "../../store";

interface Table {
    isOccupied: boolean;
    _id: string;
    name: string
  
}


interface itemProps {
  item: Table;
}


const TableCard: React.FC<itemProps> = ({ item }) => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");

  const handleOpen = () => {
    setOpen(true);
  };

  const cardStyles = {
    boxShadow: "none",
    bgcolor: "transparent",
    color: item.isOccupied ? "black" : "white",
    position: "relative", 
    textAlign: "center",
  };

  const imageStyles = {
    border: "none",
    opacity: item.isOccupied ? 0.5 : 1,
    maxWidth: "100%", 
  };

  const textOverlayStyles = {
    position: "absolute",
    top: "47%", 
    left: "50%", 
    width: "100%",
    transform: "translate(-50%, -50%)",
    zIndex: 1, 
  };

  const handleCreate = async() => {
    if (user) {
      const cartDetails = {
        table_id: item._id,
        created_by: user.id,
      };
     dispatch(createCart(cartDetails));
     dispatch(getCart(item._id))
    }
  };

  return (<>
    <Card sx={cardStyles} className={classes.container} onClick={()=>{handleCreate(),handleOpen()}}>
      <CardMedia
        sx={imageStyles}
        component="img"
        alt="Table"
        height="auto"
        image="/table.png"
        className={classes.image}
      />
      <Box sx={textOverlayStyles}>
        <Typography variant="h6">{item.name}</Typography>
        <Typography variant="body1">Amount: {item.cart_amount}</Typography>
        <Typography variant="body2">{item.served_by? item.served_by : ""}</Typography> 
      </Box>
    </Card>
          <StaffModal setOpen={setOpen} setPin={setPin} pin={pin} open={open} item={item} />
  </>

  );
};

export default TableCard;