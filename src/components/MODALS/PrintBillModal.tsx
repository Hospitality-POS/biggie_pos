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
  import Meta from "antd/es/card/Meta";
  import { BRAND_NAME, ENTITY_NAME, PHONE_NO, QR_Code, TILL_NO } from "@utils/config";

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
            <div
              className="logo-print"
              style={{
                display: "flex",
                flexDirection: "column",
                marginBottom: 15,
              }}
            >
              {/* <img
                src="/android-chrome-512x512.png"
                className="image--logo reciept"
                alt="Restaurant Logo"
                style={{ width: "50px" }}
              /> */}
              <Typography
                variant="body1"
                style={{ fontFamily: "monospace", fontSize: "1.3em" }}
              >
                {BRAND_NAME}
              </Typography>
              <Typography
                variant="body1"
                style={{ fontFamily: "monospace", fontSize: "1.2em" }}
              >
                {ENTITY_NAME}
              </Typography>
              <Typography
                variant="body1"
                style={{ fontSize: "1.2em", fontFamily: "monospace" }}
              >
                Phone: {PHONE_NO}
              </Typography>
              <Typography
                variant="body1"
                style={{ fontSize: "1.2em", fontFamily: "monospace" }}
              >
                Till: {TILL_NO}
              </Typography>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Typography
                variant="body1"
                style={{ fontSize: "1.15em", fontFamily: "monospace" }}
              >
                {cartDetails?.order_no}
              </Typography>
              <Typography
                variant="body1"
                style={{ fontSize: "1.15em", fontFamily: "monospace" }}
              >
                Served By: {cartDetails?.created_by.username}
              </Typography>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "-15px",
              }}
            >
              <Typography
                variant="body1"
                style={{ fontSize: "1.15em", fontFamily: "monospace" }}
              >
                Table: {cartDetails?.table_id.name}
              </Typography>
              <Typography
                variant="body1"
                style={{ fontSize: "1em", fontFamily: "monospace" }}
              >
                Date: {new Date().toLocaleDateString()} {new Date().getHours()}:
                {new Date().getMinutes()}
              </Typography>
            </div>
            <TableContainer sx={{ mt: 3, width: "inherit" }}>
              <Table style={{ tableLayout: "fixed" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ padding: 1, fontWeight: "bold", width: "10%" }}>
                      #
                    </TableCell>
                    <TableCell sx={{ padding: 1, fontWeight: "bold" }}>
                      ITEM
                    </TableCell>
                    <TableCell
                      sx={{ padding: 1, textAlign: "right", fontWeight: "bold" }}
                    >
                      PRICE(.Ksh)
                    </TableCell>
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
                        <TableCell
                          sx={{
                            padding: 1.2,
                            fontSize: "1em",
                            width: "5%",
                            textAlign: "left",
                            fontWeight: "bold",
                          }}
                        >
                          {item.quantity}
                        </TableCell>
                        <TableCell
                          component="th"
                          scope="row"
                          sx={{
                            padding: 1,
                            fontSize: "1.2em",
                            fontWeight: "bold",
                            wordWrap: "break-word",
                          }}
                        >
                          {item?.product_id?.name}
                        </TableCell>
                        <TableCell
                          sx={{
                            padding: 1,
                            textAlign: "right",
                            fontSize: "1em",
                            fontWeight: "bold",
                          }}
                        >
                          {item?.price?.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography
              variant="body1"
              style={{
                fontSize: "1.2em",
                fontFamily: "monospace",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              Total: Ksh.{totalAmount.toFixed(2)}
            </Typography>

            <Typography
              variant="body1"
              sx={{ textAlign: "center", fontWeight: "12px" }}
            >
              ============================
            </Typography>
            <div className="qrcoded" style={{ marginTop: 4 }}>
              <QRCodeCanvas value={QR_Code} size={80} className="qrcode" />
            </div>
            <Typography
              variant="body1"
              style={{
                fontSize: "0.9em",
                fontFamily: "monospace",
                textAlign: "center",
                marginTop: 10,
              }}
            >
              Thank you for your support!
            </Typography>
            <Typography
              variant="body1"
              style={{
                fontSize: "0.9em",
                fontFamily: "monospace",
                textAlign: "center",
              }}
            >
              Info email: bigsmokekaren@gmail.com
            </Typography>
            <Typography
              variant="body1"
              style={{
                fontSize: "0.8em",
                fontFamily: "monospace",
                textAlign: "center",
              }}
            >
              Generated on {new Date().toLocaleDateString()}
            </Typography>
            {/* <Typography
              variant="body1"
              style={{
                fontSize: "0.8em",
                fontFamily: "monospace",
                textAlign: "center",
              }}
            >
              Powered by: FSS ltd.
            </Typography> */}
          </div>

          <Box
            sx={{
              mt: 2,
              display: "flex",
              justifyContent: "space-evenly",
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
