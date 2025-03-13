import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";

interface AcceptDeliveryDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

const AcceptDeliveryDialog: React.FC<AcceptDeliveryDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const [receivedQuantity, setReceivedQuantity] = useState<number>(0);
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.primary_color) {
      setPrimaryColor(tenant.primary_color);
    }
  }, []);

  const handleAcceptDeliveryConfirm = () => {
    onConfirm(receivedQuantity);
    setReceivedQuantity(0);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle style={{ backgroundColor: primaryColor, color: "white" }}>
        Accept Delivery
      </DialogTitle>
      <DialogContent style={{ paddingTop: 16 }}>
        <DialogContentText sx={{ padding: 2 }}>
          Enter the received quantity:
        </DialogContentText>
        <TextField
          label="Received Quantity"
          type="number"
          InputProps={{ inputProps: { min: 0 } }}
          value={receivedQuantity}
          onChange={(e) => setReceivedQuantity(parseInt(e.target.value))}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleAcceptDeliveryConfirm} color="primary" autoFocus>
          Accept
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AcceptDeliveryDialog;