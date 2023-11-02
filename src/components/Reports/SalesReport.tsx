import React, { Key, useRef } from "react";
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
import "../MODALS/bill.css"

interface SalesReportProps {
  openM: boolean;
  onCloseM: () => void;
  startDate: any;
  endDate: any;
}

const SalesReportModal: React.FC<SalesReportProps> = ({
  openM,
  onCloseM,
  startDate,
  endDate,
}) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const { salesReport: data, loading } = useAppSelector(
    (state) => state.Report
  );
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onAfterPrint: onCloseM,
  });

  return (
    <>
      {loading ? (
        <Spinner />
      ) : (
        <Dialog open={openM} onClose={onCloseM} maxWidth="sm" fullWidth>
          <DialogContent className="receiptM" ref={componentRef}>
            <div className="receipt" id="receipt">
              <div className="logo-print">
                <Typography variant="body1">SALES REPORT</Typography>
              </div>

              <p style={{ textAlign: "center", padding: "5px" }}>
                From: {startDate} to {endDate}
              </p>

              <TableContainer sx={{ mt: 2, width: "inherit" }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {/* <TableCell>No.</TableCell> */}
                      <TableCell sx={{ fontSize: "1em" }}>Product</TableCell>
                      <TableCell sx={{ fontSize: "1em" }}>
                        Amount(.ksh)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data?.map((item: any, index: number) => (
                      <React.Fragment key={item.id}>
                        <TableRow>
                          {/* <TableCell>{index + 1}</TableCell> */}
                          <TableCell sx={{ fontWeight: "bold" }}>
                            {item.name}
                          </TableCell>
                          <TableCell>
                            {getTotalAmount(item.orderItems).toFixed(2)}
                          </TableCell>
                        </TableRow>
                        {item.orderItems?.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={3}>
                              <TableContainer sx={{ width: "inherit" }}>
                                <Table>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{width: 30}}>Qty</TableCell>
                                      <TableCell>Name</TableCell>
                                      <TableCell>Price(.Ksh)</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {item.orderItems.map((orderItem: any) => (
                                      <TableRow key={orderItem.id}>
                                        <TableCell>
                                          {orderItem.quantity}
                                        </TableCell>
                                        <TableCell>{orderItem.name}</TableCell>
                                        <TableCell>
                                          {orderItem.amount.toFixed(2)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <p style={{ textAlign: "center", marginBottom: "-15px" }}>
                Generated on {new Date().toLocaleDateString()}{" "}
              </p>
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
      )}
    </>
  );
};

export default SalesReportModal;

function getTotalAmount(orderItems: any[]) {
  let total = 0;
  orderItems?.forEach((item) => {
    total += item.total_amount;
  });
  return total;
}
