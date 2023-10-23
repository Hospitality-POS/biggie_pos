import React, { useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Grid, DialogContentText, IconButton, InputAdornment, Alert, MenuItem } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import AlertTitle from "@mui/material/AlertTitle";
import EmailIcon from "@mui/icons-material/Email";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import PhoneIcon from "@mui/icons-material/Phone";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { updateUser } from "../../../features/Auth/AuthActions";
import { resetMessage } from "../../../features/Auth/AuthSlice";
import { useAppDispatch, useAppSelector } from "../../../store";


interface User {
  username: string;
  fullname: string;
  id: number;
  name: string;
  email: string;
  phone: number;
  role: string;
  pin: number | string;
  idNumber: number;
  isAdmin: boolean;
}

interface EditUserDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({ open, onClose, userId }) => {
  const { selected } = useAppSelector((state) => state.auth);
  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<User>();

//   console.log(selected);

  const { newmessage, IsError, isLoading } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  const handleConfirmAddUser = (userDetails: User) => {
    dispatch(resetMessage());
    dispatch(updateUser({ userId, userDetails }));
    handleClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    reset({
      fullname: selected?.fullname || "",
      username: selected?.username || "",
      email: selected?.email || "",
      pin: selected?.pin || 0,
      phone: selected?.phone || 0,
      isAdmin: selected?.isAdmin || false,
      idNumber: selected?.idNumber || 0,
    });
  }, [reset, selected]);

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
          <AccountCircleIcon />
          Edit User Details
        </div>
        <IconButton onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {IsError && (
        <Alert severity="error" onClose={() => dispatch(resetMessage())}>
          <AlertTitle>Error</AlertTitle>
          <strong>{newmessage}</strong>
        </Alert>
      )}
      <DialogContent>
        <DialogContentText style={{ padding: 4 }}>
          Fill in the details for the new user
        </DialogContentText>
        <form onSubmit={handleSubmit(handleConfirmAddUser)}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="fullname"
                control={control}
                defaultValue={selected?.fullname || ""}
                rules={{ required: "Full Name is required" }}
                render={({ field }) => (
                  <TextField
                    label="fullname"
                    variant="outlined"
                    {...field}
                    fullWidth
                    margin="dense"
                    error={!!errors.fullname}
                    helperText={errors.fullname?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="username"
                control={control}
                defaultValue={selected?.username || ""}
                rules={{ required: "Username is required" }}
                render={({ field }) => (
                  <TextField
                    label="Username"
                    variant="outlined"
                    {...field}
                    fullWidth
                    margin="dense"
                    error={!!errors.username}
                    helperText={errors.username?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="email"
                control={control}
                defaultValue={selected.email || ""}
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Invalid email format",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    label="Email"
                    variant="outlined"
                    {...field}
                    fullWidth
                    margin="dense"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="pin"
                control={control}
                defaultValue={selected?.pin || ""}
                rules={{
                  required: "PIN is required",
                  pattern: {
                    value: /^[0-9]{4}$/,
                    message: "PIN must be 4 digits",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    label="PIN"
                    type="password"
                    variant="outlined"
                    {...field}
                    fullWidth
                    margin="dense"
                    error={!!errors.pin}
                    helperText={errors.pin?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <VpnKeyIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="phone"
                control={control}
                defaultValue={selected?.phone || ""}
                rules={{ required: "Phone is required" }}
                render={({ field }) => (
                  <TextField
                    label="Phone"
                    type="tel"
                    variant="outlined"
                    {...field}
                    fullWidth
                    margin="dense"
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="isAdmin"
                control={control}
                defaultValue={
                  selected?.isAdmin || ""
                }
                render={({ field }) => (
                  <TextField
                    label="isAdmin"
                    variant="outlined"
                    select
                    {...field}
                    fullWidth
                    margin="dense"
                    error={!!errors.isAdmin}
                    helperText={errors.isAdmin?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccountCircleIcon />
                        </InputAdornment>
                      ),
                    }}
                  >
                    <MenuItem value="true">True</MenuItem>
                    <MenuItem value="false">False</MenuItem>
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="idNumber"
                control={control}
                defaultValue={selected?.idNumber || ""}
                rules={{ required: "ID Number is required" }}
                render={({ field }) => (
                  <TextField
                    label="ID Number"
                    type="number"
                    variant="outlined"
                    {...field}
                    fullWidth
                    margin="dense"
                    error={!!errors.idNumber}
                    helperText={errors.idNumber?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CreditCardIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>
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
              disabled={isLoading}
            >
              {isLoading ? "Saving User Details..." : "Save User"}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
