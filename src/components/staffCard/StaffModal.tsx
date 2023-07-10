import { Button, Modal, TextField, Grid, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import classes from "./staff.module.css";
import LoginIcon from "@mui/icons-material/Login";
import BackspaceIcon from "@mui/icons-material/Backspace";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../features/Auth/AuthActions";



interface StaffModalProps{
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPin: React.Dispatch<React.SetStateAction<string>>;
  pin: string;
  open: boolean;
  username: string;
}
const StaffModal:React.FC<StaffModalProps> = ({ setOpen, setPin, pin, open,username })=> {
  const [showPassword, setShowPassword] = useState(false);
  const {isError, isSuccess, isLoading, message} = useSelector(state=>state.auth)
  const dispatch = useDispatch()
  const handleClickShowPassword = () => {
    setShowPassword((show) => !show);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleNumberClick = (number: string | number) => {
    setPin((prevPin) => prevPin + number);
  };

  const handleClearPin = () => {
    setPin("");
  };

  const handleLogin = () => {
    // Perform login with the entered pin
    // console.log("Login with pin:", username, pin);
    dispatch(loginUser({username,pin}))
    handleClose();
  };

  return (
    <>
      {/* Modal */}
      <Modal open={open} onClose={handleClose} className={classes.modal}>
        <div className={classes.modalContent}>
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
              Login <LoginIcon fontSize="small" sx={{ ml: 1 }} />
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
}

export default StaffModal;
