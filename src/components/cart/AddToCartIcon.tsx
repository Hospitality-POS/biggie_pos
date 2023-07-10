import { Box, Fab, keyframes } from "@mui/material";
import { green } from "@mui/material/colors";
import Draggable from "react-draggable";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";

function AddToCartIcon({ OpenCart }: any) {
  const glowAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 rgba(0, 0, 0, 0.2);
  }
  50% {
    box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.4);
  }
  100% {
    box-shadow: 0 0 0 rgba(0, 0, 0, 0.2);
  }
`;
  return (
    <>
      <Draggable>
        <Box
          sx={{
            position: "fixed",
            bottom: "20px",
            right: "40px",
            zIndex: 999,
            animation: `${glowAnimation} 2s ease-in-out infinite`,
            borderRadius: "50%",
          }}
        >
          <Fab
            color="primary"
            onClick={OpenCart}
            sx={{
              backgroundColor: green[500],
              width: "60px",
              height: "60px",
              "&:hover": {
                backgroundColor: green[700],
              },
            }}
          >
            <ShoppingCartIcon sx={{ fontSize: 36 }} />
          </Fab>
        </Box>
      </Draggable>
    </>
  );
}

export default AddToCartIcon;
