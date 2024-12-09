import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
} from "@mui/material";
import { Spin } from "antd";
import { useReactToPrint } from "react-to-print";
import { useAppSelector } from "../../store";
import moment from "moment";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";

interface PurchaseReportProps {
  openM: boolean;
  onCloseM: () => void;
  startDate: any;
  endDate: any;
}

const PurchaseReportModal: React.FC<PurchaseReportProps> = ({
  openM,
  onCloseM,
  startDate,
  endDate,
}) => {
  const { BRAND_NAME1 } = useSystemDetails();
  const componentRef = useRef<HTMLDivElement>(null);

  const { purchaseReport: data, loading, error } = useAppSelector(
    (state) => state.Report
  );

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onAfterPrint: onCloseM,
  });

  if (loading) {
    return (
      <Spin
        size="large"
        fullscreen
        tip="Generating Purchase Report, please wait..."
      />
    );
  }

  if (error) return null;

  return (
    <Dialog open={openM} onClose={onCloseM} maxWidth="sm" fullWidth>
      <DialogContent>
        <div ref={componentRef} style={{ padding: 24 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Typography variant="h5" style={{ fontWeight: "bold" }}>
              {BRAND_NAME1}
            </Typography>
            <Typography variant="h6">Purchase Report</Typography>
            <Typography>
              From: {moment(startDate).format("MMM-DD-YYYY H:MM A")}
            </Typography>
            <Typography>
              To: {moment(endDate).format("MMM-DD-YYYY H:MM A")}
            </Typography>
          </div>

          <TableContainer style={{ marginBottom: 24 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell style={{ fontWeight: "bold" }}>No.</TableCell>
                  <TableCell style={{ fontWeight: "bold" }}>Method</TableCell>
                  <TableCell style={{ fontWeight: "bold", textAlign: "right" }}>
                    Amount (Ksh)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.payment_methods.map((item: any, index: number) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell style={{ textAlign: "right" }}>
                      {item.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} style={{ textAlign: "center" }}>
                    <strong>Overall Total: </strong>
                    {data?.totalCost.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} style={{ textAlign: "center" }}>
                    <strong>Overall Discount: </strong>
                    {data?.totalDiscountAmount?.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} style={{ textAlign: "center" }}>
                    <strong>Overall Inclusive Discount: </strong>
                    {data?.totalInclusiveDiscount?.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography
            style={{ textAlign: "center", fontWeight: "bold", marginBottom: 16 }}
          >
            Powered by: {COOP_NAME}
          </Typography>
          <Typography
            style={{ textAlign: "center", fontSize: "0.9em" }}
          >
            Generated on {moment().format("MMM/DD/YYYY H:MM A")}
          </Typography>
        </div>

        <Box
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 16,
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={onCloseM}
          >
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseReportModal;
