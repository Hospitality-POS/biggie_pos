import React, { Key, useRef } from "react";
import { useSelector } from "react-redux";

import { QRCodeCanvas } from "qrcode.react";
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
  Dialog,
  DialogContent,
  // IconButton,
} from "@mui/material";
// import { CloseOutlined } from "@mui/icons-material";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";
import PrintDisabledIcon from "@mui/icons-material/PrintDisabled";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import "./bill.css";
import { useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";

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
    onAfterPrint: onCloseM,
  });

  return (
    <Dialog open={openM} onClose={onCloseM} maxWidth="sm" fullWidth>
      <DialogContent className="receiptM" ref={componentRef}>
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
            <p style={{ textTransform: "uppercase" }}>
              {" "}
              Order No: {cartDetails?.order_no}{" "}
            </p>
            <p>Served By : {cartDetails?.created_by.username}</p>
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
  <Table style={{ tableLayout: "fixed" }}>
    <TableHead>
      <TableRow>
        <TableCell style={{ borderBottom: "1px solid black", width: 40 }}>Qty</TableCell>
        <TableCell style={{ borderBottom: "1px solid black", width: 140 }}>Item</TableCell>
        <TableCell style={{ borderBottom: "1px solid black",width: 80 }}>Price (Ksh.)</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {data?.map((item: { _id: React.Key | null | undefined; quantity: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; product_id: { name: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; }; price: number; }) => (
        <TableRow key={item._id} style={{ borderBottom: "1px solid black" }}>
          <TableCell style={{ borderBottom: "none" }}>{item.quantity}</TableCell>
          <TableCell component="th" scope="row" style={{ borderBottom: "none" }}>
            {item?.product_id?.name}
          </TableCell>
          <TableCell style={{ borderBottom: "none" }}>{item?.price?.toFixed(2)}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>

          {/* <TableContainer component={Paper} sx={{ mt: 2, width: "100%" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Qty</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>Price (Ksh.)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.map(
                  (item: {
                    _id: React.Key | null | undefined;
                    quantity:
                      | string
                      | number
                      | boolean
                      | React.ReactElement<
                          any,
                          string | React.JSXElementConstructor<any>
                        >
                      | Iterable<React.ReactNode>
                      | React.ReactPortal
                      | null
                      | undefined;
                    product_id: {
                      name:
                        | string
                        | number
                        | boolean
                        | React.ReactElement<
                            any,
                            string | React.JSXElementConstructor<any>
                          >
                        | Iterable<React.ReactNode>
                        | React.ReactPortal
                        | null
                        | undefined;
                    };
                    price: number;
                  }) => (
                    <TableRow key={item._id}>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell component="th" scope="row">
                        {item?.product_id?.name}
                      </TableCell>
                      <TableCell>{item?.price?.toFixed(2)}</TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer> */}

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              marginTop: 10,
              justifyContent: "space-evenly",
              width: "100%",
            }}
          >
            <div style={{ marginBottom: "5px", flex: 1 }}>

              <p className="tot" style={{ margin: "0" }}>
                Till No. : 7034311
              </p>
              <p className="tot" style={{ margin: "0" }}>
                Phone No. : 07034531
              </p>
            </div>

            <div style={{ marginBottom: "5px", flex: 1 }}>
              <p className="tot" style={{ margin: "0" }}>
                Total: <span>Ksh. {totalAmount.toFixed(2)}</span>
              </p>

              {/* <p className="tot" style={{ margin: "0" }}>
                Email: ribracks@gmail.com
              </p> */}
            </div>
          </div>

          <div className="qrcoded" style={{ marginTop: 4 }}>
            <QRCodeCanvas
              value="https://www.instagram.com/bigsmokekaren/"
              size={80}
              className="qrcode"
            />
          </div>
      

           <p className="greeting" style={{ margin: "0", fontSize: 7, paddingTop: 12}}>
                Email: bigsmokekaren@gmail.com
              </p>
       
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
      </DialogContent>
    </Dialog>
  );
};

export default PrintBillModal;
