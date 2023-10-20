import React, { Key, useRef } from "react";
import { useSelector } from "react-redux";

import {QRCodeCanvas} from 'qrcode.react';
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
  // IconButton,
} from "@mui/material";
// import { CloseOutlined } from "@mui/icons-material";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";
import PrintDisabledIcon from "@mui/icons-material/PrintDisabled";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import "./bill.css";
import { useParams } from "react-router-dom";
import { useReactToPrint } from 'react-to-print';

// interface CartItem {
//   _id: Key | null | undefined;
//   product_id: { name: string };
//   productName: string;
//   quantity: number;
//   price: number;
// }

interface PrintBillProps {
  openM: boolean;
  onCloseM: () => void;
  cartDetails: any;
  totalAmount: number;
  data: any;
}

const PrintBillModal: React.FC<PrintBillProps> = ({
  openM,
  onCloseM,
  cartDetails,
  data,
  totalAmount,
}) => {
 

  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onAfterPrint: onCloseM
  });
  

  return (
    <Modal open={openM} onClose={onCloseM}>
      <Box className="receiptM" ref={componentRef}>
        <div className="receipt" id="receipt">
          <div className="logo-print">
            <Typography variant="body1">FOOD SUPPORT SERVICES</Typography>
            {/* <img
              src="/android-chrome-512x512.png"
              className="image--logo reciept"
              alt="Restaurant Logo"
              style={{ width: "50px" }}
            /> */}
          </div>

          <p style={{ textAlign: "center", padding: "10px" }}>
            BigSmoke, KAREN
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "-15px",
            }}
          >
            <p>Served By : {cartDetails?.created_by.username}</p>
            <p> Order No: {cartDetails?.order_no} </p>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "-15px",
            }}
          >
            <p> Table No : {cartDetails?.table_id.name} </p>
            <p> Date : {new Date().toLocaleDateString()} </p>
          </div>

          <TableContainer component={Paper} sx={{ mt: 2, width: "100%" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Price</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.map((item: { _id: React.Key | null | undefined; quantity: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; product_id: { name: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; }; price: number; }) => (
                  <TableRow key={item._id}>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell component="th" scope="row">
                      {item?.product_id?.name}
                    </TableCell>
                    <TableCell align="right">
                      ksh.{item?.price?.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <p className="tot" style={{ marginBottom: "-5px" }}>
            Total: <span>Ksh. {totalAmount.toFixed(2)} </span>
          </p>

          <p className="tot" style={{ marginBottom: "-5px" }}>
            {" "}
            Till No. : 7034311{" "}
          </p>

          <p className="tot" style={{ marginBottom: "-5px" }}>
            Phone No. : 07034531
          </p>

          <p className="tot" style={{ marginBottom: "-5px" }}>
            Email : ribracks@gmail.com
          </p>
          <div className="qrcoded">

           <QRCodeCanvas value='https://www.instagram.com/bigsmokekaren/' size={180} className="qrcode"/>
          </div>
          <p className="greeting" style={{ marginBottom: "-5px" }}>
            {" "}
            Thank you for your support!{" "}
          </p>
          <p style={{ textAlign: "center", marginBottom: "-15px" }}>
            Generated on {new Date().toLocaleDateString()}{" "}
          </p>
        </div>

        <Box
          sx={{
            mt: 2,
            display: "flex",
            justifyContent: "flex-end",
            columnGap: 5,
          }}
        >
          <Button
            className="hidden-print"
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
            className="hidden-print"
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

