import React, { useRef, useState } from "react";
import { ModalForm } from "@ant-design/pro-form";
import { Button, Spin } from "antd";
import { PrinterOutlined, PrinterFilled, SafetyCertificateFilled } from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import {
  Box,
  Typography,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Grid,
} from "@mui/material";
import moment from "moment";
import { QRCodeCanvas } from "qrcode.react";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import { useMutation } from "@tanstack/react-query";
import { rePrintInvoice } from "@services/cart";

interface InvoiceReprintModalProps {
  invoiceId: string;
  orderNo: string;
}

interface InvoiceItem {
  _id: string;
  product_id: {
    name: string;
  };
  quantity: number;
  price: number;
  createdAt: string;
  created_by: {
    fullname: string;
    username: string;
  };
  table_id: {
    name: string;
  };
}

const PrintableContent = React.forwardRef<HTMLDivElement, {
  data: InvoiceItem[];
  BRAND_NAME1: string;
  orderNo: string;
  EMAIL_URL?: string;
  PHONE_NO?: string;
  QR_Code?: string;
  PIN?: string;
  TILL_NO?: string;
  Paybill_bs?: string;
  Paybill_ac?: string;
}>(({ data, BRAND_NAME1, orderNo, EMAIL_URL, PHONE_NO, QR_Code, PIN, TILL_NO, Paybill_bs, Paybill_ac }, ref) => {
  // Return empty div if no data
  if (!data || data?.length === 0) {
    return <div ref={ref} />;
  }


  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const isElectronicsStore = tenant?.business_type?.name === "Electronics";


  const smallTextStyle = { fontSize: "0.9em", fontWeight: 800, }; // Ensures better fit for thermal printer


  const baseTextStyle = {
    fontFamily: "monospace",
    fontWeight: 700,
    color: "#000000",
  };

  const headerStyle = {
    ...baseTextStyle,
    fontSize: "1.4em",
    fontWeight: 900,
  };

  const subheaderStyle = {
    ...baseTextStyle,
    fontSize: "0.9em",
    fontWeight: 800,
  };


  const warrantyStyle = {
    ...subheaderStyle,
    textAlign: "center",
    border: "2px solid #000",
    padding: "8px",
    margin: "10px 0",
    backgroundColor: "#f9f9f9",
    fontWeight: 900,
  };

  const normalTextStyle = {
    ...baseTextStyle,
    fontSize: "0.9em",
  };

  const tableHeaderStyle = {
    padding: 1,
    fontWeight: 800,
    fontSize: "1.1em",
    color: "#000000",
  };

  const tableDataStyle = {
    padding: 1,
    fontWeight: 700,
    fontSize: "1.1em",
    color: "#000000",
  };

  const total = calculateTotal(data);

  return (
    <div className="receipt" id="receipt" ref={ref} style={{ color: "#000000" }}>
      <div
        className="logo-print"
        style={{
          display: "flex",
          flexDirection: "column",
          marginBottom: 15,
        }}
      >
        <Typography variant="body1" style={headerStyle}>
          {BRAND_NAME1 || ""}
        </Typography>
        <Grid container spacing={1}>
          {/* First Row: Phone & Till/Business No */}
          <Grid item xs={6}>
            <Typography variant="body2" style={subheaderStyle}>
              Phone: {PHONE_NO || "N/A"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" style={subheaderStyle}>
              {TILL_NO ? `Till No: ${TILL_NO}` : Paybill_bs ? `Business No: ${Paybill_bs}` : "N/A"}
            </Typography>
          </Grid>

          {/* Second Row: Account No & PIN */}
          <Grid item xs={6}>
            <Typography variant="body2" style={subheaderStyle}>
              {Paybill_ac ? `Account No: ${Paybill_ac}` : "N/A"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" style={normalTextStyle}>
              {PIN ? `PIN: ${PIN}` : "N/A"}
            </Typography>
          </Grid>

          {/* Invoice Details (Always 2 by 2) */}
          <Grid item xs={6}>
            <Typography variant="body2" style={smallTextStyle}>
              Invoice Reprint
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" style={smallTextStyle}>
              Order No: {orderNo.toUpperCase() || "N/A"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" style={smallTextStyle}>
              Table: {data[0]?.table_id?.name || "N/A"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" style={smallTextStyle}>
              Date: {data[0]?.createdAt ? moment(data[0].createdAt).format("MMM-DD-YYYY H:mm A") : "N/A"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" style={smallTextStyle}>
              Served By: {data[0]?.created_by?.fullname || "N/A"}
            </Typography>
          </Grid>
        </Grid>;

      </div>







      <TableContainer sx={{ mt: 3, width: "inherit" }}>
        <Table style={{ tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...tableHeaderStyle, width: "19%" }}>
                QTY
              </TableCell>
              <TableCell sx={tableHeaderStyle}>
                ITEM
              </TableCell>
              <TableCell sx={{ ...tableHeaderStyle, textAlign: "right" }}>
                PRICE
              </TableCell>
              <TableCell sx={{ ...tableHeaderStyle, textAlign: "right" }}>
                TOTAL
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item._id}>
                <TableCell sx={{ ...tableDataStyle, width: "5%", textAlign: "left" }}>
                  {item.quantity || 0}
                </TableCell>
                <TableCell component="th" scope="row" sx={{ ...tableDataStyle, wordWrap: "break-word" }}>
                  {item.product_id?.name || "N/A"}
                </TableCell>
                <TableCell sx={{ ...tableDataStyle, textAlign: "right" }}>
                  {(item.price || 0).toFixed(2)}
                </TableCell>
                <TableCell sx={{ ...tableDataStyle, textAlign: "right" }}>
                  {((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="body1" style={{ ...headerStyle, textAlign: "center", textDecoration: "underline", marginTop: 10 }}>
        Total Amount: Ksh. {(total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Typography>

      {isElectronicsStore && (
        <>
          <div style={{ margin: "15px 0" }}>
            <Typography variant="body1" style={warrantyStyle}>
              <SafetyCertificateFilled /> WARRANTY: 6 MONTHS <SafetyCertificateFilled />
            </Typography>
          </div>
          <div style={{ margin: "10px 0" }}>
            <Typography variant="body1" style={{ ...normalTextStyle, textAlign: "center" }}>
              * This receipt serves as your warranty certificate *
            </Typography>
            <Typography variant="body1" style={{ ...normalTextStyle, textAlign: "center" }}>
              * Please retain for warranty claims *
            </Typography>
          </div>
        </>
      )}

      <Typography variant="body1" sx={{ textAlign: "center", fontWeight: 900, margin: "15px 0" }}>
        ============================
      </Typography>

      {QR_Code && (
        <div className="qrcoded" style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
          <QRCodeCanvas value={QR_Code} size={100} className="qrcode" />
        </div>
      )}

      <Typography variant="body1" style={{ ...subheaderStyle, textAlign: "center", marginTop: 10 }}>
        Thank you for your business!
      </Typography>

      {EMAIL_URL && (
        <Typography variant="body1" style={{ ...normalTextStyle, textAlign: "center" }}>
          Info email: {EMAIL_URL}
        </Typography>
      )}

      <Typography variant="body1" style={{ ...normalTextStyle, textAlign: "center" }}>
        Generated on {new Date().toLocaleDateString()}
      </Typography>

      <Typography variant="body1" style={{ ...normalTextStyle, textAlign: "center" }}>
        Powered By: {COOP_NAME || ""}
      </Typography>
    </div>
  );
});

function InvoiceReprintModal({ invoiceId, orderNo }: InvoiceReprintModalProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const { BRAND_NAME1, EMAIL_URL, PIN, PHONE_NO, QR_Code, Paybill_bs, Paybill_ac, TILL_NO } = useSystemDetails();
  const [data, setData] = useState<InvoiceItem[] | null>(null);

  const reprintMutation = useMutation(rePrintInvoice, {
    onSuccess: (data) => {
      setData(data);
    },
    onError: (error) => {
      console.log(error);
    },
  });

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    pageStyle: `
      @media print {
        * {
          color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color: black !important;
          font-weight: bold !important;
        }
      }
    `,
  });

  // Only show print button if we have data
  const canPrint = data && data?.length > 0;

  return (
    <ModalForm
      className="receiptM"
      modalProps={{
        centered: true,
        destroyOnClose: true,
        cancelText: "Cancel",
        okText: "Reprint Invoice",
        okButtonProps: {
          icon: <PrinterFilled />,
          disabled: reprintMutation.isLoading || !canPrint,
        },
      }}
      trigger={
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          onClick={() => reprintMutation.mutate(invoiceId)}
        >
          {reprintMutation.isLoading ? "Loading..." : "Reprint Invoice"}
        </Button>
      }
      onFinish={async () => {
        if (canPrint) {
          handlePrint();
        }
        return true;
      }}
    >
      <Spin spinning={reprintMutation.isLoading} tip="Loading invoice data...">
        {data === null ? (
          <div className="text-center p-4">
            Click the button to load invoice data
          </div>
        ) : data?.length === 0 ? (
          <div className="text-center p-4">No invoice data found</div>
        ) : (
          <PrintableContent
            ref={componentRef}
            data={data}
            BRAND_NAME1={BRAND_NAME1}
            orderNo={orderNo}
            EMAIL_URL={EMAIL_URL}
            PHONE_NO={PHONE_NO}
            QR_Code={QR_Code}
            PIN={PIN}
            TILL_NO={TILL_NO}
            Paybill_bs={Paybill_bs}
            Paybill_ac={Paybill_ac}
          />
        )}
      </Spin>
    </ModalForm>
  );
}

const calculateTotal = (data: InvoiceItem[]) => {
  if (!data || data?.length === 0) return 0;
  return data.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
    0
  );
};

export default InvoiceReprintModal;