import React, { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Box,
  Typography,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from "@mui/material";
import "./bill.css";
import { useReactToPrint } from "react-to-print";
import { ENTITY_NAME } from "@utils/config";
import useSystemDetails from "@hooks/useSystemDetails";
import {
  PrinterFilled,
  PrinterOutlined,
  RestOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { Button, Switch, Space } from "antd";
import { ModalForm } from "@ant-design/pro-form";
import { useAppSelector } from "src/store";

interface PrintBillProps {
  cartDetails: any;
  data: any;
}

const PrintBillModal: React.FC<PrintBillProps> = ({ cartDetails, data }) => {
  const { subtotal, totalVatAmount, grandTotal } = useAppSelector(
    (state) => state.cart
  );
  const componentRef = useRef<HTMLDivElement>(null);
  const [isPdfView, setIsPdfView] = useState(false);

  const {
    BRAND_NAME1,
    EMAIL_URL,
    PIN,
    PHONE_NO,
    QR_Code,
    Paybill_bs,
    Paybill_ac,
  } = useSystemDetails();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    pageStyle: isPdfView
      ? `
      @page {
        size: A4;
        margin: 20mm;
      }
      @media print {
        * {
          color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 0;
        }
      }
    `
      : `
      @media print {
        * {
          color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `,
  });

  // Define dark and bold text styling to use throughout the component
  const darkTextColor = "#000000";
  const boldFontWeight = 700; // Bold font weight

  // Calculate discount amount based on type (percentage or fixed)
  const discountAmount = cartDetails?.discount
    ? cartDetails.discount_type === "percentage"
      ? (subtotal * cartDetails.discount) / 100
      : cartDetails.discount
    : 0;

  // Calculate subtotal after discount (before VAT)
  const subtotalAfterDiscount = subtotal - discountAmount;

  // PDF A4 styles
  const pdfBaseTextStyle = {
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    color: "#333",
  };

  const pdfHeaderStyle = {
    ...pdfBaseTextStyle,
    fontSize: "28px",
    fontWeight: 700,
    color: "#1a1a1a",
  };

  const pdfSubheaderStyle = {
    ...pdfBaseTextStyle,
    fontSize: "16px",
    fontWeight: 600,
    color: "#444",
  };

  const pdfNormalTextStyle = {
    ...pdfBaseTextStyle,
    fontSize: "14px",
    fontWeight: 400,
  };

  const pdfTableHeaderStyle = {
    padding: "12px 8px",
    fontWeight: 700,
    fontSize: "15px",
    color: "#1a1a1a",
    backgroundColor: "#f5f5f5",
    borderBottom: "2px solid #ddd",
  };

  const pdfTableDataStyle = {
    padding: "10px 8px",
    fontSize: "14px",
    color: "#333",
    borderBottom: "1px solid #eee",
  };

  return (
    <ModalForm
      className="receiptM"
      modalProps={{
        centered: true,
        destroyOnClose: true,
        cancelText: "Cancel",
        okText: isPdfView ? "Save as PDF" : "Print Receipt",
        okButtonProps: {
          icon: isPdfView ? <FilePdfOutlined /> : <PrinterFilled />,
        },
        width: isPdfView ? 900 : 600,
      }}
      trigger={
        <Button type="primary" icon={<PrinterOutlined />}>
          Print Bill
        </Button>
      }
      onFinish={async () => {
        handlePrint();
        return true;
      }}
    >
      <Space
        direction="horizontal"
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <PrinterOutlined style={{ fontSize: 18 }} />
        <Typography variant="body1" style={{ fontWeight: 600, margin: 0 }}>
          Thermal Receipt
        </Typography>
        <Switch
          checked={isPdfView}
          onChange={(checked) => setIsPdfView(checked)}
          checkedChildren="PDF"
          unCheckedChildren="Thermal"
        />
        <Typography variant="body1" style={{ fontWeight: 600, margin: 0 }}>
          A4 PDF
        </Typography>
        <FilePdfOutlined style={{ fontSize: 18 }} />
      </Space>

      {/* Thermal Receipt View */}
      {!isPdfView && (
        <div
          className="receipt"
          id="receipt"
          ref={componentRef}
          style={{ color: darkTextColor, fontWeight: boldFontWeight }}
        >
          <div
            className="logo-print"
            style={{
              display: "flex",
              flexDirection: "column",
              marginBottom: 10,
              color: darkTextColor,
              fontWeight: boldFontWeight,
            }}
          >
            <Typography
              variant="body1"
              style={{
                fontFamily: "monospace",
                fontSize: "1em",
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              {BRAND_NAME1}
            </Typography>
            <Typography
              variant="body1"
              style={{
                fontSize: "0.9em",
                fontFamily: "monospace",
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              Phone: {PHONE_NO}
            </Typography>
            <Typography
              variant="body1"
              style={{
                fontSize: "0.9em",
                fontFamily: "monospace",
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              Paybill No: {Paybill_bs}
            </Typography>
            <Typography
              variant="body1"
              style={{
                fontSize: "0.9em",
                fontFamily: "monospace",
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              Account No: {Paybill_ac}
            </Typography>
            <Typography
              variant="body1"
              style={{
                fontSize: "0.8em",
                fontFamily: "monospace",
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              {cartDetails?.clientPin &&
                `Client Pin: ${cartDetails?.clientPin}`}
            </Typography>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: darkTextColor,
              fontWeight: boldFontWeight,
            }}
          >
            <Typography
              variant="body1"
              style={{
                fontSize: "0.9em",
                fontFamily: "monospace",
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              {cartDetails?.order_no}
            </Typography>
            <Typography
              variant="body1"
              style={{
                fontSize: "0.9em",
                fontFamily: "monospace",
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              Served By: {cartDetails?.created_by?.username}
            </Typography>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "-10px",
              color: darkTextColor,
              fontWeight: boldFontWeight,
            }}
          >
            <Typography
              variant="body1"
              style={{
                fontSize: "0.9em",
                fontFamily: "monospace",
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              Table: {cartDetails?.table_id?.name}
            </Typography>
            <Typography
              variant="body1"
              style={{
                fontSize: "0.8em",
                fontFamily: "monospace",
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              Date: {new Date().toLocaleDateString()} {new Date().getHours()}:
              {new Date().getMinutes()}
            </Typography>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "10px",
              color: darkTextColor,
              fontWeight: boldFontWeight,
              paddingTop: "10px",
            }}
          >
            <Typography
              variant="body1"
              style={{
                fontSize: "0.9em",
                fontFamily: "monospace",
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              {cartDetails?.clientName &&
                ` Client: ${cartDetails?.clientName}`}
            </Typography>
          </div>
          <TableContainer sx={{ mt: 2, width: "inherit" }}>
            <Table style={{ tableLayout: "fixed", color: darkTextColor }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      padding: 0.5,
                      fontWeight: boldFontWeight,
                      width: "10%",
                      color: darkTextColor,
                    }}
                  >
                    #
                  </TableCell>
                  <TableCell
                    sx={{
                      padding: 0.5,
                      fontWeight: boldFontWeight,
                      color: darkTextColor,
                    }}
                  >
                    ITEM
                  </TableCell>
                  <TableCell
                    sx={{
                      padding: 0.5,
                      textAlign: "right",
                      fontWeight: boldFontWeight,
                      color: darkTextColor,
                    }}
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
                          padding: 0.8,
                          fontSize: "0.9em",
                          width: "5%",
                          textAlign: "left",
                          fontWeight: boldFontWeight,
                          color: darkTextColor,
                        }}
                      >
                        {item.quantity}
                      </TableCell>
                      <TableCell
                        component="th"
                        scope="row"
                        sx={{
                          padding: 0.8,
                          fontSize: "0.9em",
                          fontWeight: boldFontWeight,
                          wordWrap: "break-word",
                          color: darkTextColor,
                        }}
                      >
                        {item?.product_id?.name}
                      </TableCell>
                      <TableCell
                        sx={{
                          padding: 0.8,
                          textAlign: "right",
                          fontSize: "0.9em",
                          fontWeight: boldFontWeight,
                          color: darkTextColor,
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
          {cartDetails?.discount > 0 && (
            <Typography
              variant="body1"
              style={{
                fontSize: "0.9em",
                fontFamily: "monospace",
                textAlign: "center",
                fontWeight: boldFontWeight,
                color: darkTextColor,
              }}
            >
              <RestOutlined style={{ color: darkTextColor }} /> Discount:{" "}
              {cartDetails.discount_type === "amount"
                ? `KSH. ${cartDetails.discount.toLocaleString()}`
                : `${cartDetails.discount}%`}
            </Typography>
          )}

          {/* Subtotal */}
          <Typography
            variant="body1"
            style={{
              fontSize: "0.9em",
              fontFamily: "monospace",
              display: "flex",
              justifyContent: "space-between",
              fontWeight: boldFontWeight,
              color: darkTextColor,
              margin: "4px 0",
            }}
          >
            <span>Subtotal:</span>
            <span>Ksh. {subtotal?.toFixed(2)}</span>
          </Typography>

          {/* Discount */}
          {cartDetails?.discount > 0 && (
            <Typography
              variant="body1"
              style={{
                fontSize: "0.9em",
                fontFamily: "monospace",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: boldFontWeight,
                color: darkTextColor,
                margin: "4px 0",
              }}
            >
              <span>
                Discount:{" "}
                {cartDetails.discount_type === "percentage"
                  ? `(${cartDetails.discount}%)`
                  : ""}
              </span>
              <span>-Ksh. {discountAmount.toFixed(2)}</span>
            </Typography>
          )}

          {/* VAT */}
          <Typography
            variant="body1"
            style={{
              fontSize: "0.9em",
              fontFamily: "monospace",
              display: "flex",
              justifyContent: "space-between",
              fontWeight: boldFontWeight,
              color: darkTextColor,
              margin: "4px 0",
            }}
          >
            <span>VAT (16%):</span>
            <span>Ksh. {totalVatAmount?.toFixed(2)}</span>
          </Typography>

          {/* Grand Total */}
          <Typography
            variant="body1"
            style={{
              fontSize: "1em",
              fontFamily: "monospace",
              display: "flex",
              justifyContent: "space-between",
              fontWeight: boldFontWeight,
              color: darkTextColor,
              margin: "8px 0",
              borderTop: "1px dashed #000",
              paddingTop: "4px",
            }}
          >
            <span>Total Amount:</span>
            <span>Ksh. {grandTotal?.toFixed(2)}</span>
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: "center",
              fontWeight: boldFontWeight,
              color: darkTextColor,
            }}
          >
            ===========================
          </Typography>
          <div className="qrcoded" style={{ marginTop: 4 }}>
            <QRCodeCanvas value={QR_Code} size={70} className="qrcode" />
          </div>
          <Typography
            variant="body1"
            style={{
              fontSize: "0.8em",
              fontFamily: "monospace",
              textAlign: "center",
              marginTop: 8,
              color: darkTextColor,
              fontWeight: boldFontWeight,
            }}
          >
            Thank you for your support!
          </Typography>
          <Typography
            variant="body1"
            style={{
              fontSize: "0.8em",
              fontFamily: "monospace",
              textAlign: "center",
              color: darkTextColor,
              fontWeight: boldFontWeight,
            }}
          >
            Info email: {EMAIL_URL}
          </Typography>
          <Typography
            variant="body1"
            style={{
              fontSize: "0.7em",
              fontFamily: "monospace",
              textAlign: "center",
              color: darkTextColor,
              fontWeight: boldFontWeight,
            }}
          >
            Generated on {new Date().toLocaleDateString()}
          </Typography>
        </div>
      )}

      {/* PDF A4 View */}
      {isPdfView && (
        <div
          ref={componentRef}
          style={{
            backgroundColor: "#fff",
            padding: "40px",
            maxWidth: "800px",
            margin: "0 auto",
            boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          }}
        >
          {/* Header Section */}
          <Box
            sx={{
              borderBottom: "3px solid #333",
              paddingBottom: 3,
              marginBottom: 3,
            }}
          >
            <Typography
              variant="h3"
              style={{
                ...pdfHeaderStyle,
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              {BRAND_NAME1}
            </Typography>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Box>
                <Typography variant="body1" style={pdfSubheaderStyle}>
                  Phone: {PHONE_NO}
                </Typography>
                <Typography variant="body1" style={pdfNormalTextStyle}>
                  Paybill No: {Paybill_bs}
                </Typography>
                <Typography variant="body1" style={pdfNormalTextStyle}>
                  Account No: {Paybill_ac}
                </Typography>
                {cartDetails?.clientPin && (
                  <Typography variant="body1" style={pdfNormalTextStyle}>
                    Client Pin: {cartDetails?.clientPin}
                  </Typography>
                )}
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <QRCodeCanvas value={QR_Code} size={120} />
              </Box>
            </Box>
          </Box>

          {/* Order Details */}
          <Box sx={{ marginBottom: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 1,
              }}
            >
              <Typography variant="body1" style={pdfSubheaderStyle}>
                Order No: {cartDetails?.order_no}
              </Typography>
              <Typography variant="body1" style={pdfNormalTextStyle}>
                Date: {new Date().toLocaleDateString()}{" "}
                {new Date().getHours()}:{new Date().getMinutes()}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 1,
              }}
            >
              <Typography variant="body1" style={pdfNormalTextStyle}>
                Table: {cartDetails?.table_id?.name}
              </Typography>
              <Typography variant="body1" style={pdfNormalTextStyle}>
                Served By: {cartDetails?.created_by?.username}
              </Typography>
            </Box>
            {cartDetails?.clientName && (
              <Typography variant="body1" style={pdfNormalTextStyle}>
                Client: {cartDetails?.clientName}
              </Typography>
            )}
          </Box>

          {/* Items Table */}
          <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...pdfTableHeaderStyle, width: "10%" }}>
                    Qty
                  </TableCell>
                  <TableCell sx={pdfTableHeaderStyle}>
                    Item Description
                  </TableCell>
                  <TableCell
                    sx={{ ...pdfTableHeaderStyle, textAlign: "right" }}
                  >
                    Unit Price
                  </TableCell>
                  <TableCell
                    sx={{ ...pdfTableHeaderStyle, textAlign: "right" }}
                  >
                    Total
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.map(
                  (item: {
                    _id: React.Key | null | undefined;
                    quantity: any;
                    product_id: {
                      name: any;
                    };
                    price: number;
                  }) => (
                    <TableRow key={item._id}>
                      <TableCell sx={pdfTableDataStyle}>
                        {item.quantity}
                      </TableCell>
                      <TableCell sx={pdfTableDataStyle}>
                        {item?.product_id?.name}
                      </TableCell>
                      <TableCell
                        sx={{ ...pdfTableDataStyle, textAlign: "right" }}
                      >
                        Ksh. {(item?.price / item.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell
                        sx={{ ...pdfTableDataStyle, textAlign: "right" }}
                      >
                        Ksh. {item?.price?.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Discount Badge (if applicable) */}
          {cartDetails?.discount > 0 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 2,
              }}
            >
              <Box
                sx={{
                  backgroundColor: "#fff9e6",
                  border: "2px solid #ffa500",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <RestOutlined style={{ fontSize: 18, color: "#ffa500" }} />
                <Typography variant="body1" style={pdfSubheaderStyle}>
                  Discount Applied:{" "}
                  {cartDetails.discount_type === "amount"
                    ? `Ksh. ${cartDetails.discount.toLocaleString()}`
                    : `${cartDetails.discount}%`}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Totals Section */}
          <Box
            sx={{
              marginLeft: "auto",
              maxWidth: "400px",
              padding: 2,
              backgroundColor: "#f9f9f9",
              borderRadius: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 1,
              }}
            >
              <Typography variant="body1" style={pdfNormalTextStyle}>
                Subtotal:
              </Typography>
              <Typography variant="body1" style={pdfNormalTextStyle}>
                Ksh. {subtotal?.toFixed(2)}
              </Typography>
            </Box>
            {cartDetails?.discount > 0 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 1,
                }}
              >
                <Typography variant="body1" style={pdfNormalTextStyle}>
                  Discount{" "}
                  {cartDetails.discount_type === "percentage"
                    ? `(${cartDetails.discount}%)`
                    : ""}
                  :
                </Typography>
                <Typography
                  variant="body1"
                  style={{ ...pdfNormalTextStyle, color: "#d32f2f" }}
                >
                  -Ksh. {discountAmount.toFixed(2)}
                </Typography>
              </Box>
            )}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 1,
              }}
            >
              <Typography variant="body1" style={pdfNormalTextStyle}>
                VAT (16%):
              </Typography>
              <Typography variant="body1" style={pdfNormalTextStyle}>
                Ksh. {totalVatAmount?.toFixed(2)}
              </Typography>
            </Box>
            <Divider sx={{ my: 1, borderColor: "#333", borderWidth: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography
                variant="h5"
                style={{ ...pdfHeaderStyle, fontSize: "22px" }}
              >
                Total Amount:
              </Typography>
              <Typography
                variant="h5"
                style={{ ...pdfHeaderStyle, fontSize: "22px" }}
              >
                Ksh. {grandTotal?.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          {/* Footer */}
          <Box
            sx={{
              borderTop: "2px solid #ddd",
              paddingTop: 3,
              marginTop: 4,
              textAlign: "center",
            }}
          >
            <Typography
              variant="body1"
              style={{ ...pdfSubheaderStyle, marginBottom: 8 }}
            >
              Thank you for your business!
            </Typography>
            <Typography
              variant="body1"
              style={{ ...pdfNormalTextStyle, marginBottom: 4 }}
            >
              Email: {EMAIL_URL}
            </Typography>
            <Typography
              variant="body1"
              style={{ ...pdfNormalTextStyle, marginBottom: 4 }}
            >
              Generated on {new Date().toLocaleDateString()}
            </Typography>
            <Typography
              variant="body1"
              style={{ ...pdfNormalTextStyle, color: "#666" }}
            >
              Powered By Relia Tech Solutions
            </Typography>
          </Box>
        </div>
      )}

      <Box
        sx={{
          mt: 2,
          display: "flex",
          justifyContent: "space-evenly",
          columnGap: 5,
        }}
      ></Box>
    </ModalForm>
  );
};

export default PrintBillModal;