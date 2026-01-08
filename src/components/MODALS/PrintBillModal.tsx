import React, { useRef } from "react";
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
} from "@mui/material";
import "./bill.css";
import { useReactToPrint } from "react-to-print";
import { ENTITY_NAME } from "@utils/config";
import useSystemDetails from "@hooks/useSystemDetails";
import {
  PrinterFilled,
  PrinterOutlined,
  RestOutlined,
  SafetyCertificateFilled,
} from "@ant-design/icons";
import { Button } from "antd";
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
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const isElectronicsStore = tenant?.business_type?.name === "Electronics";

  const {
    BRAND_NAME1,
    EMAIL_URL,
    PIN,
    PHONE_NO,
    QR_Code,
    Paybill_bs,
    Paybill_ac,
    TILL_NO,
  } = useSystemDetails();

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
    fontSize: "1.2em",
    fontWeight: 800,
  };

  const normalTextStyle = {
    ...baseTextStyle,
    fontSize: "1.1em",
  };

  const tableHeaderStyle = {
    padding: 1,
    fontWeight: 900,
    fontSize: "1.2em",
    color: "#000000",
  };

  const tableDataStyle = {
    padding: 1,
    fontWeight: 700,
    fontSize: "1.1em",
    color: "#000000",
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

  return (
    <ModalForm
      className="receiptM"
      modalProps={{
        centered: true,
        destroyOnClose: true,
        cancelText: "cancel",
        okText: "Confirm Print",
        okButtonProps: { icon: <PrinterFilled /> },
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
      <div
        className="receipt"
        id="receipt"
        ref={componentRef}
        style={{ color: "#000000" }}
      >
        <div
          className="logo-print"
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: 15,
          }}
        >
          <Typography variant="body1" style={headerStyle}>
            {BRAND_NAME1}
          </Typography>
          <Typography variant="body1" style={subheaderStyle}>
            Phone: {PHONE_NO}
          </Typography>
          {Paybill_bs ? (
            <>
              <Typography variant="body1" style={subheaderStyle}>
                Business No: {Paybill_bs}
              </Typography>
              {Paybill_ac && (
                <Typography variant="body1" style={subheaderStyle}>
                  Account No: {Paybill_ac}
                </Typography>
              )}
            </>
          ) : (
            TILL_NO && (
              <Typography variant="body1" style={subheaderStyle}>
                Till No: {TILL_NO}
              </Typography>
            )
          )}
          <Typography variant="body1" style={normalTextStyle}>
            {cartDetails?.clientPin && `Client Pin: ${cartDetails?.clientPin}`}
          </Typography>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="body1" style={subheaderStyle}>
            {cartDetails?.order_no}
          </Typography>
          <Typography variant="body1" style={subheaderStyle}>
            Served By: {cartDetails?.created_by?.username}
          </Typography>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "-15px",
          }}
        >
          <Typography variant="body1" style={subheaderStyle}>
            Table: {cartDetails?.table_id?.name}
          </Typography>
          <Typography variant="body1" style={normalTextStyle}>
            Date: {new Date().toLocaleDateString()} {new Date().getHours()}:
            {new Date().getMinutes()}
          </Typography>
        </div>

        <TableContainer sx={{ mt: 3, width: "inherit" }}>
          <Table style={{ tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...tableHeaderStyle, width: "10%" }}>
                  #
                </TableCell>
                <TableCell sx={tableHeaderStyle}>ITEM</TableCell>
                <TableCell sx={{ ...tableHeaderStyle, textAlign: "right" }}>
                  PRICE(.Ksh)
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
                    <TableCell
                      sx={{
                        ...tableDataStyle,
                        width: "5%",
                        textAlign: "left",
                      }}
                    >
                      {item.quantity}
                    </TableCell>
                    <TableCell
                      component="th"
                      scope="row"
                      sx={{
                        ...tableDataStyle,
                        wordWrap: "break-word",
                      }}
                    >
                      {item?.product_id?.name}
                    </TableCell>
                    <TableCell
                      sx={{
                        ...tableDataStyle,
                        textAlign: "right",
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
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1" style={subheaderStyle}>
              Subtotal:
            </Typography>
            <Typography variant="body1" style={subheaderStyle}>
              Ksh. {subtotal.toLocaleString()}
            </Typography>
          </div>
          {cartDetails?.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body1" style={normalTextStyle}>
                Discount:
              </Typography>
              <Typography variant="body1" style={normalTextStyle}>
                - Ksh.{" "}
                {(cartDetails.discount_type === "percentage"
                  ? subtotal * (cartDetails.discount / 100)
                  : cartDetails.discount
                ).toLocaleString()}
              </Typography>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1" style={normalTextStyle}>
              VAT:
            </Typography>
            <Typography variant="body1" style={normalTextStyle}>
              Ksh. {totalVatAmount.toLocaleString()}
            </Typography>
          </div>
          <div style={{ borderTop: "2px dashed #000", margin: "5px 0" }}></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1" style={headerStyle}>
              Amount Due:
            </Typography>
            <Typography variant="body1" style={headerStyle}>
              Ksh. {grandTotal.toLocaleString()}
            </Typography>
          </div>
        </div>
        {isElectronicsStore && (
          <>
            <div style={{ margin: "15px 0" }}>
              <Typography variant="body1" style={warrantyStyle}>
                <SafetyCertificateFilled /> WARRANTY: 6 MONTHS{" "}
                <SafetyCertificateFilled />
              </Typography>
            </div>
            <div style={{ margin: "10px 0" }}>
              <Typography
                variant="body1"
                style={{ ...normalTextStyle, textAlign: "center" }}
              >
                * This receipt serves as your warranty certificate *
              </Typography>
              <Typography
                variant="body1"
                style={{ ...normalTextStyle, textAlign: "center" }}
              >
                * Please retain for warranty claims *
              </Typography>
            </div>
          </>
        )}

        <Typography
          variant="body1"
          sx={{
            textAlign: "center",
            fontWeight: 900,
            marginTop: isElectronicsStore ? 0 : 5,
          }}
        >
          ===========================
        </Typography>
        <div
          className="qrcoded"
          style={{
            marginTop: 4,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <QRCodeCanvas value={QR_Code} size={100} className="qrcode" />
        </div>
        <Typography
          variant="body1"
          style={{
            ...subheaderStyle,
            textAlign: "center",
            marginTop: 10,
          }}
        >
          Thank you for your support!
        </Typography>
        <Typography
          variant="body1"
          style={{
            ...normalTextStyle,
            textAlign: "center",
          }}
        >
          Info email: {EMAIL_URL}
        </Typography>
        <Typography
          variant="body1"
          style={{
            ...normalTextStyle,
            textAlign: "center",
          }}
        >
          Generated on {new Date().toLocaleDateString()}
        </Typography>
        <Typography
          variant="body1"
          style={{
            ...normalTextStyle,
            textAlign: "center",
          }}
        >
          Powered By Relia Tech Solutions
        </Typography>
      </div>
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
