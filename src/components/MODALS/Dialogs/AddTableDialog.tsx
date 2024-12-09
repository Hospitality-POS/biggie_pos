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
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { useForm, Controller } from "react-hook-form";
import { useDispatch } from "react-redux";
import axiosInstance from "../../../services/request";
import { useQuery, useMutation } from "@tanstack/react-query";
import TableIcon from "@mui/icons-material/TableChart";
import { createTable } from "../../../features/Table/TableActions";
import { resetTableMessage } from "../../../features/Table/TableSlice";
import { useAppSelector } from "../../../store";

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

  const { newTableMessage, isError, isLoading } = useAppSelector(
    (state) => state.Tables
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
    dispatch(createTable(data))
    createTableMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const fetchLocations = async () => {
    const response = await axiosInstance.get("http://localhost:3000/tables/location/locations");
    return response.data;
  };

  const { data: locationData, isLoading: isLocationLoading } = useQuery(
    ["locations"],
    fetchLocations
  );

  // todo: confirm the fn of this line 
  const createTableMutation = useMutation(createTable, {
    onSuccess: (data) => {
      onAddTable(data);
      handleClose();
    },
  });

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
                <div>
                  <InputLabel>Location</InputLabel>
                  <Select
                    label="Location"
                    {...field}
                    fullWidth
                    margin="dense"
                    error={!!errors.locatedAt}
                    helperText={errors.locatedAt?.message}
                    startAdornment={
                      <InputAdornment position="start">
                        <LocationOnIcon />
                      </InputAdornment>
                    }
                  >
                    {isLocationLoading ? (
                      <MenuItem disabled>Loading locations...</MenuItem>
                    ) : (
                      locationData?.map((location: { _id: React.Key | null | undefined; name: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined; }) => (
                        <MenuItem key={location._id} value={location._id}>
                          {location?.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </div>
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