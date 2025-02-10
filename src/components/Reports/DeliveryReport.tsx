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
import { Spin } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useAppSelector } from "../../store";
import moment from "moment";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import { useReactToPrint } from "react-to-print";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";
import PrintDisabledIcon from "@mui/icons-material/PrintDisabled";

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
    // onAfterPrint: onCloseM,
  });

  // Calculate total cost
  const totalCost = data
    ?.reduce((acc: number, item: any) => {
      const itemTotal = (Number(item.supplier_price) || 0) * Number(item.quantity);
      return acc + itemTotal;
    }, 0)
    .toFixed(2);

  if (error) return null;

  if (loading) {
    return <Spin size="large" fullscreen tip="Generating Delivery Report..." />;
  }

  return (
    <Dialog open={openM} onClose={onCloseM} maxWidth="sm" fullWidth>
      <DialogContent className="receiptM" ref={componentRef}>
        <div className="receipt" id="receipt">
          <div
            className="logo-print"
            style={{ display: "flex", flexDirection: "column" }}
          >
            {BRAND_NAME1 && BRAND_NAME1 !== "undefined undefined" && (
              <Typography
                variant="h5"
                textAlign={"center"}
                sx={{ fontFamily: "monospace", fontWeight: "bold" }}
              >
                {BRAND_NAME1}
              </Typography>
            )}
            <Typography variant="h6" sx={{ fontFamily: "monospace" }}>
              DELIVERY REPORT
            </Typography>
          </div>
          <p style={{ textAlign: "center", padding: "10px" }}>
            From: {moment(startDate).format("MMM-DD-YYYY H:MM A")} <br /> to
            <br /> {moment(endDate).format("MMM-DD-YYYY H:MM A")}
          </p>

          <TableContainer sx={{ mt: 2, width: "100%", mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Item(s)</TableCell>
                  <TableCell sx={{ fontWeight: "bold", textAlign: "right" }}>
                    Unit(s)
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", textAlign: "right" }}>
                    Qty
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", textAlign: "right" }}>
                    Price
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.map((item: any, index: number) => (
                  <TableRow key={item.inventory_id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {item.uom}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {item.quantity?.toFixed(1) || 0}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {item.supplier_price?.toFixed(2) || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableRow>
                <TableCell
                  colSpan={3}
                  sx={{ fontWeight: "bold", textAlign: "center" }}
                >
                  Total Cost : Ksh. {totalCost?.toLocaleString()}
                </TableCell>
                {/* <TableCell sx={{ textAlign: "right" }}>{totalCost}</TableCell> */}
              </TableRow>
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
            Generated on {moment().format("MMM/DD/YYYY H:MM A")}
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

export default DeliveryReportModal;
