import { Button, Modal, TextField, Grid } from "@mui/material";
import classes from "./staff.module.css";
import LoginIcon from "@mui/icons-material/Login";
import BackspaceIcon from "@mui/icons-material/Backspace";

function StaffModal({ setOpen, setPin, pin, open }) {
  const handleClose = () => {
    setOpen(false);
  };

  const handleNumberClick = (number: string | number) => {
    setPin((prevPin: string | number) => prevPin + number);
  };

  const handleClearPin = () => {
    setPin("");
  };

  const handleLogin = () => {
    // Perform login with the entered pin
    console.log("Login with pin:", pin);
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
             type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            fullWidth
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
