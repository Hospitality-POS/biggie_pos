import React, { Key, useState } from "react";
import {
  Button,
  Modal,
  Box,
  Typography,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from "@mui/material";
import { CloseOutlined } from "@mui/icons-material";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";
import PrintDisabledIcon from "@mui/icons-material/PrintDisabled";
import { useSelector } from "react-redux";

interface CartItem {
  _id: Key | null | undefined;
  product_id: any;
  productName: string;
  quantity: number;
  price: number;
}

interface PrintBillProps {
  openM: boolean;
  onCloseM: () => void;
  cartDetails: {
    table_id: string;
    created_by: string;
    order_no: string;
    order_amount: string;
    cart_id: string;
    cartItems: CartItem[];
  };
  totalAmount: number;
}

const PrintBillModal: React.FC<PrintBillProps> = ({
  openM,
  onCloseM,
  cartDetails,
  totalAmount,
}) => {
  const { cartItems } = useSelector((state: any) => state.cart);
  const handlePrint = () => {
    window.print();
    onCloseM();
  };

  return (
    <Modal open={openM} onClose={onCloseM}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80%",
          bgcolor: "white",
          p: 3,
          borderRadius: "4px",
          boxShadow: 2, // Adding a shadow to the receipt
        }}
      >
        <Paper
          className="no-print"
          sx={{
            padding: "10px",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#6c1c2c",
          }}
        >
          <img
            src="/android-chrome-512x512.png"
            alt="Restaurant Logo"
            style={{ width: "50px", height: "50px", borderRadius: "50%" }}
          />
          <Typography variant="h6" ml={2}>
            Receipt
          </Typography>
          <IconButton onClick={onCloseM}>
            <CloseOutlined />
          </IconButton>
        </Paper>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: "bold" }}>
            Order No: {cartDetails?.order_no}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: "bold" }}>
            Table No: {cartDetails?.table_id}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: "bold" }}>
            Date: {new Date().toLocaleDateString()}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: "bold" }}>
            Served By: {cartDetails?.created_by}
          </Typography>

          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cartItems?.map((item: CartItem) => (
                  <TableRow key={item._id}>
                    <TableCell component="th" scope="row">
                      {item.product_id.name}
                    </TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">
                      ${item.price.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      ${(item.quantity * item.price).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell />
                  <TableCell />
                  <TableCell sx={{ fontWeight: "bold" }}>Total:</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    ${totalAmount.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box
          sx={{
            mt: 2,
            display: "flex",
            justifyContent: "flex-end",
            columnGap: 5,
          }}
        >
          <Button
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
            onClick={handlePrint}
            startIcon={<LocalPrintshopIcon />}
          >
            Print
          </Button>
          <Button
            variant="contained"
            sx={{
              pl: 2,
              bgcolor: "#6c1c2c",
              "&:hover": {
                bgcolor: "#bc8c7c",
                color: "#ffff",
              },
            }}
            onClick={onCloseM}
            endIcon={<PrintDisabledIcon />}
          >
            Cancel
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default PrintBillModal;
