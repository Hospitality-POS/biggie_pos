import React, { useRef } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  Typography,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Box,
} from "@mui/material";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";
import PrintDisabledIcon from "@mui/icons-material/PrintDisabled";
import { useReactToPrint } from "react-to-print";
import { useAppSelector } from "../../store";
import Spinner from "../spinner/Spinner";
import "../MODALS/bill.css";
import { Spin } from "antd/lib";
import { BRAND_NAME, COOP_NAME } from "@utils/config";
import moment from "moment";
import useSystemDetails from "@hooks/useSystemDetails";

interface DeliveryReportProps {
  openM: boolean;
  onCloseM: () => void;
  startDate: any;
  endDate: any;
}

const DeliveryReportModal: React.FC<DeliveryReportProps> = ({
  openM,
  onCloseM,
  startDate,
  endDate,
}) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const { BRAND_NAME1 } = useSystemDetails();
  const {
    deliveryReport: data,
    loading,
    error,
  } = useAppSelector((state) => state.Report);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onAfterPrint: onCloseM,
  });

  const overallTotal = data?.reduce(
    (accumulator: number, item: { deliveryItems: any[] }) =>
      accumulator + getTotalDeliveryAmount(item.deliveryItems),
    0
  );
  if (error) return;
  return (
    <>
      {loading ? (
        <Spin
          size="large"
          fullscreen
          tip="Generating delivery report, Please wait ..."
        />
      ) : (
        <Dialog open={openM} onClose={onCloseM} maxWidth="sm" fullWidth>
          <DialogContent className="receiptM" ref={componentRef}>
            <div className="receipt" id="receipt">
              <div
                className="logo-print"
                style={{ display: "flex", flexDirection: "column" }}
              >
                <Typography
                  variant="h5"
                  style={{ textAlign: "center" }}
                  sx={{ fontFamily: "monospace", fontWeight: "bold" }}
                >
                  {BRAND_NAME1}
                </Typography>
                <Typography variant="h6" sx={{ fontFamily: "monospace" }}>
                  Delivery Report
                </Typography>
              </div>

              <p style={{ textAlign: "center", fontFamily: "monospace" }}>
                From: {moment(startDate).format("MMM-DD-YYYY H:MM A")} <br /> to{" "}
                <br />
                {moment(endDate).format("MMM-DD-YYYY H:MM A")}
              </p>

              <TableContainer sx={{ mt: 2, width: "inherit", mb: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{ fontSize: "1em", padding: 0, fontWeight: "bold" }}
                      >
                        Delivery ID
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: "1em",
                          textAlign: "right",
                          fontWeight: "bold",
                          padding: 2,
                        }}
                      >
                        Amount (.ksh)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data?.map((item: any, index: number) => (
                      <React.Fragment key={item.id}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: "bold", padding: 0 }}>
                            {item.deliveryID}
                          </TableCell>
                          <TableCell
                            sx={{ textAlign: "right", fontWeight: "bold" }}
                          >
                            {getTotalDeliveryAmount(item.deliveryItems).toFixed(
                              2
                            )}
                          </TableCell>
                        </TableRow>
                        {item.deliveryItems?.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={2} sx={{ padding: 0 }}>
                              <TableContainer sx={{ width: "inherit" }}>
                                <Table>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ padding: 1 }}>
                                        QTY
                                      </TableCell>
                                      <TableCell sx={{ padding: 0 }}>
                                        ITEM
                                      </TableCell>
                                      <TableCell sx={{ padding: 0 }}>
                                        PRICE (.Ksh)
                                      </TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {item.deliveryItems.map(
                                      (deliveryItem: any) => (
                                        <TableRow key={deliveryItem.id}>
                                          <TableCell
                                            sx={{
                                              borderBottom: "none",
                                              padding: 1,
                                            }}
                                          >
                                            {deliveryItem.quantity.toFixed(1)}
                                          </TableCell>
                                          <TableCell
                                            sx={{
                                              borderBottom: "none",
                                              padding: 1,
                                              fontWeight: "bold",
                                            }}
                                          >
                                            {deliveryItem.name}
                                          </TableCell>
                                          <TableCell
                                            sx={{
                                              borderBottom: "none",
                                              padding: 1,
                                            }}
                                          >
                                            {deliveryItem.amount.toFixed(2)}
                                          </TableCell>
                                        </TableRow>
                                      )
                                    )}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        sx={{ fontWeight: "bold", textAlign: "center" }}
                      >
                        Overall Total:{" "}
                        <span>{overallTotal?.toLocaleString()}</span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography
                variant="body1"
                style={{
                  fontSize: "1em",
                  fontFamily: "monospace",
                  textAlign: "center",
                }}
              >
                Powered by: {COOP_NAME}
              </Typography>
              <Typography
                variant="body1"
                sx={{ textAlign: "center", fontSize: "0.9em" }}
              >
                Generated on {moment(Date()).format("MMM/DD/YYYY H:MM A")}
              </Typography>
            </div>

            <Box
              className="hidden-print"
              sx={{
                mt: 2,
                display: "flex",
                justifyContent: "space-evenly",
                columnGap: 5,
              }}
            >
              {/* <Button
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
              </Button> */}
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
                Close
              </Button>
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default DeliveryReportModal;

function getTotalDeliveryAmount(deliveryItems: any[]) {
  let total = 0;
  deliveryItems?.forEach((item) => {
    total += item.total_amount;
  });
  return total;
}
