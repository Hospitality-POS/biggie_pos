import React, { useState, useEffect } from "react";
import CloseIcon from '@mui/icons-material/Close';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  DialogContentText,
} from "@mui/material";

interface AddLocationDialogProps {
  open: boolean;
  onClose: () => void;
  onAddLocation: (location: string) => void;
}

const AddNewTableLocationDialog: React.FC<AddLocationDialogProps> = ({
  open,
  onClose,
  onAddLocation,
}) => {
  const [location, setLocation] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.color_scheme.primary) {
      setPrimaryColor(tenant.color_scheme.primary);
    }
  }, []);

  const handleAddLocation = () => {
    if (location.trim() !== "") {
      onAddLocation(location);
      setLocation("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
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
            gap: "40px",
            color: "white",
            display: "flex",
            alignItems: "center",
          }}
        >

          Add New Table location
        </div>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <DialogContentText style={{ padding: 4 }}>
          Fill in the details for the new Location
        </DialogContentText>
        <TextField
          label="New Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleAddLocation}
          variant="outlined"
          color="primary"
          fullWidth
          sx={{
            color: primaryColor,
            borderColor: primaryColor,
            "&:hover": {
              borderColor: "#bc8c7c",
              color: "#bc8c7c",
            },
          }}
        >
          Add Location
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddNewTableLocationDialog;