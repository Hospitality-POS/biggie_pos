import * as React from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Collapse from "@mui/material/Collapse";
import CloseIcon from "@mui/icons-material/Close";
import { useDispatch, useSelector } from "react-redux";
import { closeModal } from "../../features/Order/OrderSlice";

export default function SuccesssModal() {
  const {  openModal } = useSelector((state: any) => state.order);

  const dispatch = useDispatch()

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Collapse in={openModal}>
        <Alert
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => {
                dispatch(closeModal())
              }}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
          sx={{ mb: 2 }}
        >
          {openModal && "Order placed successfully"}
        </Alert>
      </Collapse>
    </Box>
  );
}
