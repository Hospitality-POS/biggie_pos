import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  TextField,
  Grid,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { loginUser } from "../../features/Auth/AuthActions";
import classes from "./staff.module.css";
import LoginIcon from "@mui/icons-material/Login";
import BackspaceIcon from "@mui/icons-material/Backspace";
import { useAppDispatch, useAppSelector } from "../../store";
import useCheckIfUserIsLoggedIn from "../../hooks/useCheckIfUserIsLoggedIn";

interface StaffModalProps {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPin: React.Dispatch<React.SetStateAction<string>>;
  pin: string;
  open: boolean;
  tbl: string;
}

const StaffModal: React.FC<StaffModalProps> = ({
  setOpen,
  setPin,
  pin,
  open,
  tbl,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { isError, isSuccess, isLoading, user } = useAppSelector(
    (state) => state.auth
  );
  const { error: cartError } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();
  const { checkIfUserIsLoggedIn, isUserLoggedIn } = useCheckIfUserIsLoggedIn();

  const handleClickShowPassword = () => {
    setShowPassword((show) => !show);
  };

  const handleClose = () => {
    setOpen(false);
    setNotificationOpen(false);
  };

  const handleNumberClick = (number: string | number) => {
    setPin((prevPin) => prevPin + number);
    setNotificationOpen(false);
  };

  const handleClearPin = () => {
    setPin("");
    setNotificationOpen(false);
  };

  const handleLogin = () => {
    dispatch(loginUser({ pin }));
    checkIfUserIsLoggedIn(tbl, user, cartError, setOpen);
    if (!isUserLoggedIn) {
      setOpen(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        className={classes.modal}
      >
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>
            Enter your PIN to login.
          </DialogContentText>
          <TextField
            label="Enter PIN"
            variant="filled"
            autoFocus
            type={showPassword ? "text" : "password"}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            fullWidth
            sx={{ mb: 3 }}
            error={notificationOpen}
            helperText={notificationOpen ? "Invalid PIN" : ""}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={handleClickShowPassword}
                  edge="end"
                  size="large"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
          />
          <Grid container spacing={1} className={classes.numPad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((number) => (
              <Grid item key={number} className={classes.numPadContainer}>
                <Button
                  className={classes.numPadButton}
                  onClick={() => handleNumberClick(number)}
                >
                  {number}
                </Button>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={handleLogin}
            className={classes.loginButton}
            sx={{ display: "flex", alignContent: "center" }}
          >
            Login{" "}
            {isLoading ? (
              <CircularProgress size={20} thickness={8} sx={{ ml: 1 }} />
            ) : (
              <LoginIcon fontSize="small" sx={{ ml: 1 }} />
            )}
          </Button>
          <Button
            onClick={handleClearPin}
            variant="outlined"
            color="warning"
            sx={{ display: "flex", alignContent: "center" }}
          >
            Clear <BackspaceIcon fontSize="small" sx={{ ml: 1 }} />
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StaffModal;
