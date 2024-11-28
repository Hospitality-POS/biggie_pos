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
} from "@ant-design/icons";
import { Button } from "antd";
import { ModalForm } from "@ant-design/pro-form";
import { printInvoice } from "@services/cart";
import ShowConfirm from "@utils/ConfirmUtil";

interface PrintBillProps {
  cartDetails: any;
  totalAmount: number;
  data: any;
}

const PrintBillModal: React.FC<PrintBillProps> = ({
  cartDetails,
  data,
  totalAmount,
}) => {
  const componentRef = useRef<HTMLDivElement>(null);

  const { BRAND_NAME1, EMAIL_URL, PIN, PHONE_NO, QR_Code, Paybill_bs } =
    useSystemDetails();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  return (
    <ModalForm
      className="receiptM"
      modalProps={{
        centered: true,
        destroyOnClose: true,
        cancelText: "close",
        okText: "Confirm Print",
        okButtonProps: { icon: <PrinterFilled /> },
      }}
      trigger={
        <Button type="primary" icon={<PrinterOutlined />}>
          Print Bill
        </Button>
      }
      onFinish={async () => {
        try {
          const confirmed = await ShowConfirm({
            title: `Do you want to print this bill with ETR machine?`,
            position: true,
            cancelText: "Without ETR",
          });
          if (confirmed) {
            await printInvoice({ cart_id: cartDetails?._id, print_etr: true, print: true });
            return true;
          } else {
            await printInvoice({ cart_id: cartDetails?._id, print_etr: false, print: true });
            return true;
          }
        } catch (error) {
          console.log(error);
          return false;
        }
      }}
    >
      <div className="receipt" id="receipt" ref={componentRef}>
        <div
          className="logo-print"
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: 15,
          }}
        >
          {/* <img
                src="/logokil.png"
                className="image--logo reciept"
                alt="Restaurant Logo"
                style={{ width: "70%" }}
              /> */}
          <Typography
            variant="body1"
            style={{ fontFamily: "monospace", fontSize: "1.3em", textAlign: "center" }}
          >
            {BRAND_NAME1}
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
            Till: {Paybill_bs}
          </Typography>
          {/* <Typography
              variant="body1"
              style={{ fontSize: "1em", fontFamily: "monospace" }}
            >
              PIN: {PIN}
            </Typography> */}
          <Typography
            variant="body1"
            style={{ fontSize: "1em", fontFamily: "monospace" }}
          >
            Client Pin: {cartDetails?.clientPin}
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
          <Typography
            variant="body1"
            style={{ fontSize: "1.15em", fontFamily: "monospace" }}
          >
            Table: {cartDetails?.table_id?.name}
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
                <TableCell
                  sx={{ padding: 1, fontWeight: "bold", width: "10%" }}
                >
                  #
                </TableCell>
                <TableCell sx={{ padding: 1, fontWeight: "bold" }}>
                  ITEM
                </TableCell>
                <TableCell
                  sx={{
                    padding: 1,
                    textAlign: "right",
                    fontWeight: "bold",
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
        {cartDetails?.discount && (
          <Typography
            variant="body1"
            style={{
              fontSize: "1.2em",
              fontFamily: "monospace",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            <RestOutlined /> Discount:
            {cartDetails?.discount_type === "amount"
              ? `KSH. ${cartDetails?.discount?.toLocaleString()}`
              : `${cartDetails?.discount}%`}
          </Typography>
        )}
        <Typography
          variant="body1"
          style={{
            fontSize: "1.2em",
            fontFamily: "monospace",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          Amount Due: Ksh.{totalAmount?.toFixed(2)}
        </Typography>

        <Typography
          variant="body1"
          sx={{ textAlign: "center", fontWeight: "12px" }}
        >
          ============================
        </Typography>
        {/* <div className="qrcoded" style={{ marginTop: 4 }}>
          <QRCodeCanvas value={QR_Code} size={80} className="qrcode" />
        </div> */}
        <Typography
          variant="body1"
          style={{
            fontSize: "0.9em",
            fontFamily: "monospace",
            textAlign: "center",
            marginTop: 10,
          }}
        >
          Thank you! and come again!
        </Typography>
        <Typography
          variant="body1"
          style={{
            fontSize: "0.9em",
            fontFamily: "monospace",
            textAlign: "center",
          }}
        >
          Info email: {EMAIL_URL}
        </Typography>
        <Typography
          variant="body1"
          style={{
            fontSize: "0.8em",
            fontFamily: "monospace",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Generated on {new Date().toLocaleDateString()}
        </Typography>
        <Typography
          variant="body1"
          style={{
            fontSize: "0.8em",
            fontFamily: "monospace",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          A product of RELIA TECH  for more Info
          <br /> contact us on 0747665877
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
