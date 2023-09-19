import React, { useState } from "react";
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
import BusinessIcon from "@mui/icons-material/Business";
import LocationOnIcon from "@mui/icons-material/LocationOn"; // Icon for locatedAt
import { useDispatch, useSelector } from "react-redux";
import { createTable } from "../../../features/Table/TableActions";
import { resetTableMessage } from "../../../features/Table/TableSlice";
import TableIcon from "@mui/icons-material/TableChart"; 

interface Table {
  name: string;
  locatedAt: string;
  isOccupied: boolean;
}

interface AddTableDialogProps {
  open: boolean;
  onClose: () => void;
  onAddTable: (table: Table) => void;
}

const AddTableDialog: React.FC<AddTableDialogProps> = ({
  open,
  onClose,
  onAddTable,
}) => {
  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<Table>();
  const [newTable, setNewTable] = useState<Table>({
    name: "",
    locatedAt: "",
    isOccupied: false, 
  });

  const { newTableMessage, isError, isLoading } = useSelector(
    (state: any) => state.Tables
  );
  

  const dispatch = useDispatch();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setNewTable((prevTable) => ({
      ...prevTable,
      [name]: value,
    }));
  };

  const handleConfirmAddTable = (data: Table) => {
    dispatch(resetTableMessage());
    dispatch(createTable(data));
    onAddTable(data);
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
          <TableIcon />
          Add New Table
        </div>
        <IconButton onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {isError && (
        <Alert severity="error" onClose={() => dispatch(resetTableMessage())}>
          <AlertTitle>Error</AlertTitle>
          <strong>{newTableMessage}</strong>
        </Alert>
      )}
      <DialogContent>
        <DialogContentText style={{ padding: 4 }}>
          Fill in the details for the new table
        </DialogContentText>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Controller
              name="name"
              control={control}
              rules={{ required: "Name is required" }}
              defaultValue={newTable.name}
              render={({ field }) => (
                <TextField
                  label="Name"
                  variant="outlined"
                  {...field}
                  fullWidth
                  margin="dense"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TableIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <Controller
              name="locatedAt"
              control={control}
              rules={{ required: "Location is required" }}
              defaultValue={newTable.locatedAt}
              render={({ field }) => (
                <TextField
                  label="Location"
                  variant="outlined"
                  {...field}
                  fullWidth
                  margin="dense"
                  error={!!errors.locatedAt}
                  helperText={errors.locatedAt?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOnIcon />
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
            color: "#6c1c2c",
            borderColor: "#6c1c2c",
            "&:hover": {
              borderColor: "#bc8c7c",
              color: "#bc8c7c",
            },
          }}
          fullWidth
          onClick={handleSubmit(handleConfirmAddTable)}
          disabled={isLoading}
        >
          {isLoading ? "Adding Table..." : "Add Table"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddTableDialog;