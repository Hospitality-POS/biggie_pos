import { Card, CardMedia, Typography, Box } from "@mui/material";
import classes from "./table.module.css";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createCart } from "../../features/Cart/CartActions";
import { fetchProducts } from "../../features/Product/ProductAction";
import StaffModal from "../staffCard/StaffModal";

interface Item {
  item: any;
}

const TableCard: React.FC<Item> = ({ item }) => {
  const { user } = useSelector((state: any) => state.auth);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");

  const handleOpen = () => {
    setOpen(true);
  };

  const cardStyles = {
    boxShadow: "none",
    bgcolor: "transparent",
    color: item.isOccupied ? "black" : "white",
    position: "relative", // Added to create a relative positioning context
    textAlign: "center",
  };

  const imageStyles = {
    border: "none",
    opacity: item.isOccupied ? 0.5 : 1,
    maxWidth: "100%", // Adjust the image size
  };

  const textOverlayStyles = {
    position: "absolute",
    top: "47%", // Center vertically
    left: "50%", // Center horizontally
    width: "100%",
    transform: "translate(-50%, -50%)", // Center text within the card
    zIndex: 1, // Place text above the image
  };

  const handleCreate = async() => {
    if (user) {
      const cartDetails = {
        table_id: item._id,
        created_by: user.id,
      };
     dispatch(createCart(cartDetails));
      // dispatch(fetchProducts())
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
        <Typography variant="body1">Amount: ksh. 3,000</Typography>
        <Typography variant="body2">mike kamau</Typography>
      </Box>
    </Card>
          <StaffModal setOpen={setOpen} setPin={setPin} pin={pin} open={open} item={item} />
  </>

  );
};

export default TableCard;