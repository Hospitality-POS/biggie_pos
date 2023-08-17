import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  DialogActions,
  Button,
} from "@mui/material";

interface Product {
  name: string;
  quantity: number;
}

interface ViewProductDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null; 
}

const ViewProductDialog: React.FC<ViewProductDialogProps> = ({
  open,
  onClose,
  product,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>View Product Details</DialogTitle>
      <DialogContent>
        {product && (
          <>
            <Typography variant="subtitle1">
              Product: {product.name}
            </Typography>
            <Typography variant="body1">
              Quantity: {product.quantity}
            </Typography>
            
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewProductDialog;
