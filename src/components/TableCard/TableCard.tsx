import { Card, CardMedia, Typography, Box } from "@mui/material";
import classes from "./table.module.css";
import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { clearcart } from "../../features/Cart/CartSlice";
import useCheckIfUserIsLoggedIn from "../../hooks/useCheckIfUserIsLoggedIn";
import { useNavigate } from "react-router-dom";
import StaffModal from "@components/staffCard/LoginModal";
import { Opacity } from "@mui/icons-material";

interface Table {
  cart_amount: number;
  served_by: string | null;
  isOccupied: boolean;
  _id: string;
  name: string;
}

interface itemProps {
  item: Table;
  openModal: any;
}

const TableCard: React.FC<itemProps> = ({ item , openModal}) => {
  const {user}= useAppSelector(state=>state.auth)
  const {error}=useAppSelector(state=>state.cart)
 
const {checkIfUserIsLoggedIn, isUserLoggedIn}=useCheckIfUserIsLoggedIn()
  const dispatch = useAppDispatch()
   const navigate = useNavigate();
   const [isStaffModalOpen, setStaffModalOpen] = useState(false);
   
  const handleOpen = () => {
        
    dispatch(clearcart())
    checkIfUserIsLoggedIn(item._id,user,error,openModal)
    if(!isUserLoggedIn){
      openModal(item._id)  
    }else{
    navigate(`/dashboard/${item._id}`)
    }
      
  };

  const cardStyles = {
    boxShadow: "none",
    bgcolor: "transparent",
    color: item.isOccupied ? "white":"black",
    position: "relative",
    textAlign: "center",
    cursor: "pointer",
  };

  const imageStyles = {
    border: "none",
    Opacity: item.isOccupied ? 0.5 : 1,
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

  return (
    <>
      <Card
        sx={cardStyles}
        className={classes.container}
        onClick={() => {
          handleOpen();
        }}
      >
        <CardMedia
          // sx={imageStyles}
          component="img"
          alt="Table"
          height="auto"
          image={item.isOccupied ? "/table.svg" : "/table3.svg"}
          className={classes.image}
        />
        <Box sx={textOverlayStyles}>
          <Typography variant="h5" fontWeight={"bold"}>
            {item.name}
          </Typography>
          <Typography variant="body1" fontWeight={"bold"}>
            Amount: {item.cart_amount}
          </Typography>
          <Typography variant="body2" fontWeight={"bold"}>
            {item?.served_by}
          </Typography>
        </Box>
      </Card>
    </>
  );
};

export default TableCard;
