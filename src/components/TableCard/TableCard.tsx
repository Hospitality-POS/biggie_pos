import { Card, CardMedia, Typography, Box, Tooltip } from "@mui/material";
import { LockOutlined } from "@ant-design/icons";
import classes from "./table.module.css";
import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { clearcart } from "../../features/Cart/CartSlice";
import useCheckIfUserIsLoggedIn from "../../hooks/useCheckIfUserIsLoggedIn";
import { useNavigate } from "react-router-dom";

import { usePrimaryColor } from "@context/PrimaryColorContext";

interface Table {
  cart_amount: number;
  served_by: string | null;
  isOccupied: boolean;
  _id: string;
  name: string;
  isLocked?: boolean;
  status?: string;
}

interface itemProps {
  item: Table;
  openModal: any;
}

const TableCard: React.FC<itemProps> = ({ item, openModal }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { error } = useAppSelector((state) => state.cart);

  const { checkIfUserIsLoggedIn, isUserLoggedIn } = useCheckIfUserIsLoggedIn();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Color state management
  const primaryColor = usePrimaryColor();

  // Compute isLocked based on privacy settings
  const [isLocked, setIsLocked] = React.useState(false);
  const [enablePrivacy, setEnablePrivacy] = React.useState(false);

  React.useEffect(() => {
    const fetchPrivacySetting = async () => {
      try {
        const { fetchSystemSetupDetailsById } = await import('../../services/systemsetup');
        const systemSettings = await fetchSystemSetupDetailsById();
        setEnablePrivacy(systemSettings?.enable_privacy || false);
      } catch (err) {
        setEnablePrivacy(false);
      }
    };
    fetchPrivacySetting();
  }, []);

  React.useEffect(() => {
    if (!enablePrivacy) {
      setIsLocked(false);
      return;
    }

    const currentUser = user?._id || user?.id;
    const userRole = (typeof user?.role === 'string' ? user?.role : user?.roleData?.role_type)?.toLowerCase();

    if (userRole !== "waiter" || !currentUser) {
      setIsLocked(false);
      return;
    }

    // If cart_amount is 0, allow any waiter to open the table
    if (item.cart_amount === 0) {
      setIsLocked(false);
      console.log(`🔍 [TableCard] Table ${item.name}: cart_amount=0, allowing access`);
      return;
    }

    const servedByCurrentUser = item.served_by === currentUser || item.served_by === user?.name;
    const isEmpty = !item.isOccupied && item.status !== 'occupied';
    const locked = !servedByCurrentUser && !isEmpty;
    setIsLocked(locked);
    console.log(`🔍 [TableCard] Table ${item.name}: served_by=${item.served_by}, user=${user?.name}, isLocked=${locked}`);
  }, [enablePrivacy, user, item.served_by, item.isOccupied, item.status, item.cart_amount]);


  // Helper function to lighten color (reduced percentage to maintain color identity)
  const lightenColor = (color: string, percent: number = 15) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const lightenedR = Math.min(255, Math.round(r + (255 - r) * percent / 100));
    const lightenedG = Math.min(255, Math.round(g + (255 - g) * percent / 100));
    const lightenedB = Math.min(255, Math.round(b + (255 - b) * percent / 100));

    return `#${lightenedR.toString(16).padStart(2, '0')}${lightenedG.toString(16).padStart(2, '0')}${lightenedB.toString(16).padStart(2, '0')}`;
  };

  // Helper function to convert hex to RGB values for filter calculation
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  // Function to create CSS filter that converts black SVG to desired color
  const createColorFilter = (targetColor: string) => {
    const rgb = hexToRgb(targetColor);
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    return `brightness(0) saturate(100%) invert(${Math.round(r * 100)}%) sepia(100%) saturate(${Math.round(Math.max(r, g, b) * 10000)}%) hue-rotate(${Math.round(Math.atan2(g - b, r - (g + b) / 2) * 180 / Math.PI)}deg) brightness(${Math.round(Math.max(r, g, b) * 100)}%) contrast(100%)`;
  };

  const handleOpen = () => {
    if (isLocked) return; // Prevent opening locked tables
    dispatch(clearcart());
    checkIfUserIsLoggedIn(item._id, user, error, openModal);
    if (!isUserLoggedIn) {
      openModal(item._id);
    } else {
      navigate(`/dashboard/${item._id}`);
    }
  };

  // Determine which color to use based on occupied state
  const currentColor = item.isOccupied ? lightenColor(primaryColor) : primaryColor;

  const cardStyles = {
    boxShadow: "none",
    bgcolor: "transparent",
    color: item.isOccupied ? "white" : "black",
    position: "relative",
    textAlign: "center",
    cursor: isLocked ? "not-allowed" : "pointer",
    opacity: isLocked ? 0.5 : 1,
  };

  const imageStyles = {
    border: "none",
    opacity: item.isOccupied ? 0.5 : 1,
    maxWidth: "100%",
    // Use currentColor to generate the filter
    filter: createColorFilter(currentColor),
  };

  const overlayStyles = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    mixBlendMode: "multiply",
    pointerEvents: "none",
    zIndex: 0,
  };

  const textOverlayStyles = {
    position: "absolute",
    top: "47%",
    left: "50%",
    width: "100%",
    transform: "translate(-50%, -50%)",
    zIndex: 2,
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
        <Box sx={{ position: "relative" }}>
          <CardMedia
            sx={imageStyles}
            component="img"
            alt="Table"
            height="auto"
            image={item.isOccupied ? "/table.svg" : "/table3.svg"}
            className={classes.image}
          />

          {/* Color overlay using currentColor */}
          <Box sx={overlayStyles} />

          <Box sx={textOverlayStyles}>
            {isLocked && (
              <LockOutlined
                style={{
                  fontSize: 32,
                  color: "white",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                  marginBottom: "8px",
                }}
              />
            )}
            <Typography
              variant="h5"
              fontWeight={"bold"}
              sx={{
                color: "white",
                textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                marginBottom: "8px",
              }}
            >
              {item.name}
            </Typography>
            <Typography
              variant="body1"
              fontWeight={"bold"}
              sx={{
                color: "white",
                textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                marginBottom: "4px",
              }}
            >
              Amount: {item.cart_amount.toLocaleString()}
            </Typography>
            {item?.served_by && (
              <Typography
                variant="body2"
                fontWeight={"bold"}
                sx={{
                  color: "white",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                {item.served_by}
              </Typography>
            )}
          </Box>
        </Box>
      </Card>
    </>
  );
};

export default TableCard;