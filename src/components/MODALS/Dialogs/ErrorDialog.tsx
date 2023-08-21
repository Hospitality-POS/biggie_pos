import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import ErrorIcon from "@mui/icons-material/Error";

const dialogTitleStyle = {
  position: "relative", // To make the CloseIcon position relative to the title
};

const errorIconStyle = {
  margin: "0 auto",
  fontSize: "60px", 
  color: "red",
  display: "block",
  textAlign: "center", // To center the icon
};

const closeIconStyle = {
  position: "absolute",
  right: "8px",
  top: "8px",
  color: "grey",
};

const ErrorDialog = ({ error, onClose }) => {
  return (
    <Dialog open={error !== null} onClose={onClose}>
      <DialogTitle style={dialogTitleStyle}>
      </DialogTitle>
      <DialogContent>
        <ErrorIcon style={errorIconStyle} />
        <DialogContentText>{error}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ErrorDialog;
