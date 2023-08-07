import React, { Key } from "react";
import { useSelector } from "react-redux";
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
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

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

  const cartId = cartDetails?._id
  const {data}=useQuery(["cart", cartId], async() => await axios.get(`http://localhost:3000/cart/cart/${cartId}`))
  

  return (
    <Modal open={openM} onClose={onCloseM}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          // width: "80%",
          bgcolor: "white",
          p: 3,
          borderRadius: "4px",
          boxShadow: 2, 
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            mt: 2,
            width: "100%",
            maxWidth: "350px",
            margin: "0 auto",
            boxShadow: "10px",
            padding: 2,
            backgroundColor: "#fff",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              marginBottom: 2,
            }}
          >
            <img
              src="/android-chrome-512x512.png"
              alt="Restaurant Logo"
              style={{ width: "100px", height: "80px" }}
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
              Order No: 
            </Typography>{data?.data.order_no}
            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
              Table No: 
            </Typography>{data?.data.table_id.name}
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
              Date: 
            </Typography>{new Date().toLocaleDateString()}
            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
              Served By: 
            </Typography>{data?.data.created_by.username}
          </Box>

          <TableContainer component={Paper} sx={{ mt: 2, width: "100%" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Price</TableCell>
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
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell />
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    Total:
                  </TableCell>
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
          className="no-print"
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
            endIcon={<LocalPrintshopIcon />}
          >
            Print
          </Button>
          <Button
          className="no-print"
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
