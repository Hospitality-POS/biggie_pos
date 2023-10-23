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
  MenuItem,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import AlertTitle from "@mui/material/AlertTitle";
import EmailIcon from "@mui/icons-material/Email";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import PhoneIcon from "@mui/icons-material/Phone";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { createUser } from "../../../features/Auth/AuthActions";
import { resetMessage } from "../../../features/Auth/AuthSlice";
import { useAppDispatch, useAppSelector } from "../../../store";

interface User {
  fullname: string;
  username: string;
  email: string;
  pin: string;
  phone: string;
  idNumber: string;
  isAdmin: string;
}

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onAddUser: (user: User) => void;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({
  open,
  onClose,
  onAddUser,
}) => {
  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<User>();
  const [newUser, setNewUser] = useState<User>({
    fullname: "",
    username: "",
    email: "",
    pin: "",
    phone: "",
    idNumber: "",
    isAdmin: "false",
  });

  const { newmessage, IsError, isLoading } = useAppSelector(
    (state) => state.auth
  );

  const dispatch = useAppDispatch();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setNewUser((prevUser) => ({
      ...prevUser,
      [name]: value,
    }));
  };

  const handleConfirmAddUser = (data: User) => {
    dispatch(resetMessage());
    dispatch(createUser(data));
    onAddUser(data);
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
          <AccountCircleIcon />
          Add New User
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
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Controller
              name="fullname"
              control={control}
              rules={{ required: "Full Name is required" }}
              defaultValue={newUser.fullname}
              render={({ field }) => (
                <TextField
                  label="Full Name"
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
              rules={{ required: "Username is required" }}
              defaultValue={newUser.username}
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
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: "Invalid email format",
                },
              }}
              defaultValue={newUser.email}
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
              rules={{
                required: "PIN is required",

                pattern: {
                  value: /^[0-9]{4}$/,
                  message: "PIN must be 4 digits",
                },
              }}
              defaultValue={newUser.pin}
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
              rules={{ required: "Phone is required" }}
              defaultValue={newUser.phone}
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
                  <Controller
                    name="isAdmin"
                    control={control}
                    defaultValue={newUser.isAdmin}
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
              rules={{ required: "ID Number is required" }}
              defaultValue={newUser.idNumber}
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
          onClick={handleSubmit(handleConfirmAddUser)}
          disabled={isLoading}
        >
          {isLoading ? "Adding User..." : "Add User"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddUserDialog;
