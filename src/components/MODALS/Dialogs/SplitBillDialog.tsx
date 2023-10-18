import React from "react";
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
  setSelectedMethod,
  setSecondMethod,
  setAmount1,
  setAmount2,
  handleSplitConfirm,
}) => {
  const { handleSubmit, control } = useForm();

  return (
    <Dialog open={open} onClose={handleModalClose} maxWidth="md">
      <DialogTitle
        style={{
          backgroundColor: "#6c1c2c",
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

      <DialogContent>
        <DialogContentText style={{ padding: 4 }}>
          Confirm that the Split bill is the same as total.
        </DialogContentText>
        <form onSubmit={handleSubmit(handleSplitConfirm)}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Controller
                name="selectedMethod"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Payment Method 1"
                    value={selectedMethod || ""}
                    fullWidth
                    margin="dense"
                    variant="outlined"
                    {...field}
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
                    value={secondMethod || ""}
                    fullWidth
                    margin="dense"
                    variant="outlined"
                    {...field}
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
            <Grid item xs={12}>
            </Grid>
          </Grid>
        </form>
      </DialogContent>
      <DialogActions>
        {/* <Button
          variant="outlined"
          sx={{
            pl: 2,
            color: "#6c1c2c",
            borderColor: "#6c1c2c",
            "&:hover": {
              borderColor: "#bc8c7c",
              color: "#bc8c7c",
            },
          }}
          onClick={handleModalClose}
        >
          Cancel
        </Button> */}
        <Button
          variant="contained"
          sx={{
            pl: 2,
            color: "#fff",
            bgcolor: "#6c1c2c",
            "&:hover": {
              bgcolor: "#bc8c7c",
              color: "#fff",
            },
          }}
          fullWidth
          onClick={handleSplitConfirm}
        >
          Confirm Split
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SplitBillDialog;