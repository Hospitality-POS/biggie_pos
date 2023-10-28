import React, { Key, useRef } from "react";
import { useSelector } from "react-redux";

import { QRCodeCanvas } from "qrcode.react";
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

interface PurchaseReportProps {
  openM: boolean;
  onCloseM: () => void;
  startDate:any;
  endDate: any;
}

const PurchaseReportModal: React.FC<PurchaseReportProps> = ({
  openM,
  onCloseM,
  startDate,
  endDate
}) => {

  const componentRef = useRef<HTMLDivElement>(null);
    const {purchaseReport: data}=useAppSelector(state=>state.Report)
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onAfterPrint: onCloseM,
  });

  return (
    <Dialog open={openM} onClose={onCloseM} maxWidth="sm" fullWidth>
      <DialogContent className="receiptM" ref={componentRef}>
        <div className="receipt" id="receipt">
          <div className="logo-print">
            <Typography variant="body1">PURCHASE REPORT</Typography>
          </div>

          <p style={{ textAlign: "center", padding: "10px" }}>
            From: {startDate} to {endDate}
          </p>

          <TableContainer component={Paper} sx={{ mt: 2, width: "100%" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>No.</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Amount (Ksh.)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.map((item: any, index:number) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.id ? <>{index + 1}</> : ""}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      {item.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

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

export default PurchaseReportModal;