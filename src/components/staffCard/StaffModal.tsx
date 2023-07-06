import { Button, Modal, TextField, Grid } from "@mui/material";
import classes from "./staff.module.css"

function StaffModal({setOpen, setPin, pin, open}) {

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
              variant="contained"
              onClick={handleLogin}
              className={classes.loginButton}
            >
              Login
            </Button>
            <Button
              onClick={handleClearPin}
              variant="contained"
              color="warning"
            >
              Clear
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default StaffModal;
