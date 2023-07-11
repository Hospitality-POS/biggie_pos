import { Button, Modal, TextField, Grid, IconButton, Alert, CircularProgress } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../features/Auth/AuthActions";
import NotificationModal from "../notification/NotificationModal";
import classes from "./staff.module.css";
import LoginIcon from "@mui/icons-material/Login";
import BackspaceIcon from "@mui/icons-material/Backspace";
import { Navigate, useNavigate } from "react-router-dom";
// import NotificationModal from "./NotificationModal";

interface StaffModalProps {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPin: React.Dispatch<React.SetStateAction<string>>;
  pin: string;
  open: boolean;
  username: string;
}

const StaffModal: React.FC<StaffModalProps> = ({
  setOpen,
  setPin,
  pin,
  open,
  username,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationType, setNotificationType] = useState<
    "error" | "success" | ""
  >("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const { isError, isSuccess, isLoading, message } = useSelector(
    (state) => state.auth
  );
  const navigate = useNavigate()
  const dispatch = useDispatch();

  const handleClickShowPassword = () => {
    setShowPassword((show) => !show);
  };

  const handleClose = () => {
    setOpen(false);
    setNotificationOpen(false)
  };

  const handleNumberClick = (number: string | number) => {
    setPin((prevPin) => prevPin + number);
    setNotificationOpen(false)
  };

  const handleClearPin = () => {
    setPin("");
    setNotificationOpen(false)
  };

  const handleLogin = () => {
    dispatch(loginUser({ username, pin }));
    // handleClose();
  };

  useEffect(() => {
    if (isLoading) {
      setNotificationType("");
    } else if (isError) {
      setNotificationOpen(true);
      setNotificationType("error");
      setNotificationMessage("Invalid Pin, Please try again!");
    } else if (isSuccess) {
      setNotificationOpen(true);
      setNotificationType("success");
      setNotificationMessage("Login successful");
      navigate("/tables")
    }
  }, [isLoading, isError, isSuccess, message, setOpen, navigate]);

  const handleNotificationClose = () => {
    setNotificationOpen(false);
  };

  return (
    <>
      <Modal open={open} onClose={handleClose} className={classes.modal}>
        <div className={classes.modalContent}>
          { notificationOpen && (<Alert severity="error" onClose={handleNotificationClose}>{notificationMessage}</Alert>)}
          <TextField
            label="Enter PIN"
            variant="outlined"
            type={showPassword ? "text" : "password"}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            fullWidth
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
          <div className={classes.pinbutton}>
            <Button
              variant="outlined"
              onClick={handleLogin}
              className={classes.loginButton}
              sx={{ display: "flex", alignContent: "center" }}
            >
              Login {isLoading ? <CircularProgress size={20} thickness={8} sx={{ ml: 1 }}/>:<LoginIcon fontSize="small" sx={{ ml: 1 }} />}
            </Button>
            <Button
              onClick={handleClearPin}
              variant="outlined"
              color="warning"
              sx={{ display: "flex", alignContent: "center" }}
            >
              Clear <BackspaceIcon fontSize="small" sx={{ ml: 1 }} />
            </Button>
          </div>
        </div>
      </Modal>

    </>
  );
};

export default StaffModal;
