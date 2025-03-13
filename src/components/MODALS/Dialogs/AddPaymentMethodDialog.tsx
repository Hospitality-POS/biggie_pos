import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  DialogContentText,
  IconButton,
  InputAdornment,
  Alert,
  AlertTitle,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import CloseIcon from "@mui/icons-material/Close";
import PaymentIcon from "@mui/icons-material/Payment";
import { useDispatch, useSelector } from "react-redux";
import { resetPaymentMessage } from "../../../features/Payment/PaymentMethodSlice";
import { createPaymentMethod } from "../../../features/Payment/PaymentMethodActions";

interface PaymentMethod {
  name: string;
}

interface AddPaymentMethodDialogProps {
  open: boolean;
  onClose: () => void;
  onAddPaymentMethod: (paymentMethod: PaymentMethod) => void;
}

const AddPaymentMethodDialog: React.FC<AddPaymentMethodDialogProps> = ({
  open,
  onClose,
  onAddPaymentMethod,
}) => {
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.primary_color) {
      setPrimaryColor(tenant.primary_color);
    }
  }, []);

  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<PaymentMethod>();
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>({
    name: "",
  });

  const { newPaymentMethodMessage, IsError, isLoading } = useSelector(
    (state: any) => state.PaymentMethods
  );

  const dispatch = useDispatch();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setNewPaymentMethod((prevPaymentMethod) => ({
      ...prevPaymentMethod,
      [name]: value,
    }));
  };

  const handleConfirmAddPaymentMethod = (data: PaymentMethod) => {
    dispatch(resetPaymentMessage());
    dispatch(createPaymentMethod(data));
    onAddPaymentMethod(data);
    handleClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} maxWidth="md" onClose={handleClose}>

      <DialogTitle
        style={{
          backgroundColor: primaryColor,
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            gap: "10px",
            color: "white",
            display: "flex",
            alignItems: "center",
          }}
        >
          <PaymentIcon />
          Add New Payment Method
        </div>
        <IconButton onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {IsError && (
        <Alert
          severity="error"
          onClose={() => dispatch(resetPaymentMessage())}
        >
          <AlertTitle>Error</AlertTitle>
          <strong>{newPaymentMethodMessage}</strong>
        </Alert>
      )}
      <DialogContent>
        <DialogContentText style={{ padding: 4 }}>
          Fill in the details for the new payment method
        </DialogContentText>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Controller
              name="name"
              control={control}
              rules={{ required: "Name is required" }}
              defaultValue={newPaymentMethod.name}
              render={({ field }) => (
                <TextField
                  label="Payment Method Name"
                  variant="outlined"
                  {...field}
                  fullWidth
                  margin="dense"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PaymentIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button
          type="submit"
          variant="outlined"
          sx={{
            pl: 2,
            color: primaryColor,
            borderColor: primaryColor,
            "&:hover": {
              borderColor: "#bc8c7c",
              color: "#bc8c7c",
            },
          }}
          fullWidth
          onClick={handleSubmit(handleConfirmAddPaymentMethod)}
          disabled={isLoading}
        >
          {isLoading ? "Adding Payment Method..." : "Add Payment Method"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPaymentMethodDialog;