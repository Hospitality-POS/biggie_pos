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
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import BusinessIcon from "@mui/icons-material/Business";
import { useForm, Controller } from "react-hook-form";

interface SplitBillDialogProps {
  open: boolean;
  handleModalClose: () => void;
  data: any[];
  selectedMethod: string | null;
  secondMethod: string | null;
  amount1: number;
  amount2: number;
  totalAmount: number;
  setSelectedMethod: (method: string) => void;
  setSecondMethod: (method: string) => void;
  setAmount1: (amount: number) => void;
  setAmount2: (amount: number) => void;
  handleSplitConfirm: () => void;
}

const SplitBillDialog: React.FC<SplitBillDialogProps> = ({
  open,
  handleModalClose,
  data,
  selectedMethod,
  secondMethod,
  amount1,
  amount2,
  totalAmount,
  setAmount1,
  setAmount2,
  handleSplitConfirm,
}) => {
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.color_scheme.primary) {
      setPrimaryColor(tenant.color_scheme.primary);
    }
  }, []);

  const { control } = useForm();

  return (
    <Dialog open={open} onClose={handleModalClose} maxWidth="md">
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
          <BusinessIcon />
          Split Bill
        </div>
        <IconButton onClick={handleModalClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* <form onSubmit={handleSubmit(handleSplitConfirm)}> */}
      <DialogContent>
        <DialogContentText style={{ padding: 4 }}>
          Confirm that the Split bill is the same as total.
        </DialogContentText>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Controller
              name="selectedMethod"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Payment Method 1"
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  {...field}
                  value={selectedMethod || ""}
                >
                  {data.map((method: { _id: string; name: string }) => (
                    <MenuItem key={method._id} value={method._id}>
                      {method.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              type="number"
              label="Amount 1"
              value={amount1}
              fullWidth
              margin="dense"
              variant="outlined"
              onChange={(e) => setAmount1(parseInt(e.target.value))}
            />
          </Grid>

          <Grid item xs={6}>
            <Controller
              name="secondMethod"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Payment Method 2"
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  {...field}
                  value={secondMethod || ""}
                >
                  {data.map((method: { _id: string; name: string }) => (
                    <MenuItem key={method._id} value={method._id}>
                      {method.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              type="number"
              label="Amount 2"
              value={amount2}
              fullWidth
              margin="dense"
              variant="outlined"
              onChange={(e) => setAmount2(parseInt(e.target.value))}
            />
          </Grid>
          <Grid item xs={12}></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          sx={{
            pl: 2,
            color: "#fff",
            bgcolor: primaryColor,
            "&:hover": {
              bgcolor: "#bc8c7c",
              color: "#fff",
            },
          }}
          fullWidth
          onClick={handleSplitConfirm}
          disabled={!amount1 || amount1 < 1 || !amount2 || amount2 < 1 || amount1 + amount2 !== totalAmount}
        >
          Confirm Split & confirm payment
        </Button>
      </DialogActions>
      {/* </form> */}
    </Dialog>
  );
};

export default SplitBillDialog;