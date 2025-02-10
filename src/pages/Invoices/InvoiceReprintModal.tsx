import React, { useRef, useState } from "react";
import { ModalForm } from "@ant-design/pro-form";
import { Button, Spin } from "antd";
import { PrinterOutlined, PrinterFilled } from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import {
  Typography,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import moment from "moment";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import { useMutation } from "@tanstack/react-query";
import { rePrintInvoice } from "@services/cart";

const PrintableContent = React.forwardRef(({ data, BRAND_NAME1, orderNo }, ref) => {
  // Return empty div if no data
  if (!data || data?.length === 0) {
    return <div ref={ref} />;
  }

  return (
    <div className="receipt" id="receipt" ref={ref}>
      <ReportHeader
        brandName={BRAND_NAME1}
        date={data[0]?.createdAt}
        serverName={data[0]?.created_by?.fullname}
        tableName={data[0]?.table_id?.name}
        orderNo={orderNo}
      />
      <ReportTable data={data} />
      <div className="flex flex-col items-center">
        <ReportFooter total={calculateTotal(data)} coopName={COOP_NAME} />
      </div>
    </div>
  );
});

function InvoiceReprintModal({ invoiceId, orderNo }) {
  const componentRef = useRef(null);
  const { BRAND_NAME1 } = useSystemDetails();
  const [data, setData] = useState(null);

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
          />
        )}
      </Spin>
    </ModalForm>
  );
}

const ReportHeader = ({
  brandName,
  date,
  serverName,
  tableName,
  orderNo,
}) => (
  <div className="text-center">
    <Typography
      variant="h5"
      sx={{ fontFamily: "monospace", fontWeight: "bold" }}
    >
      {brandName || ""}
    </Typography>
    <Typography variant="body1" sx={{ fontFamily: "monospace" }}>
      Invoice Reprint
    </Typography>
    <Typography variant="body1" sx={{ fontFamily: "monospace" }}>
        Order No: {orderNo.toUpperCase() || "N/A"}
    </Typography>
    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
      Date: {date ? moment(date).format("MMM-DD-YYYY H:mm A") : "N/A"}
    </Typography>
    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
      Served By: {serverName || "N/A"}
    </Typography>
    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
      Customer Slot: {tableName || "N/A"}
    </Typography>
  </div>
);

const ReportTable = ({ data }) => {
  if (!data || data?.length === 0) return null;

  return (
    <TableContainer sx={{ mt: 2, width: "inherit", mb: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ padding: 1, fontWeight: "bold" }}>Item</TableCell>
            <TableCell sx={{ padding: 1, fontWeight: "bold" }}>Qty</TableCell>
            <TableCell sx={{ padding: 1, fontWeight: "bold" }}>Price</TableCell>
            <TableCell sx={{ padding: 1, fontWeight: "bold" }}>Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item._id}>
              <TableCell sx={{ padding: 1 }}>
                {item.product_id?.name || "N/A"}
              </TableCell>
              <TableCell sx={{ padding: 1 }}>{item.quantity || 0}</TableCell>
              <TableCell sx={{ padding: 1 }}>{item.price || 0}</TableCell>
              <TableCell sx={{ padding: 1 }}>
                {((item.price || 0) * (item.quantity || 0)).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const ReportFooter = ({ total, coopName }) => (
  <>
    <TableRow>
      <TableCell colSpan={4} sx={{ fontWeight: "bold", textAlign: "center" }}>
        Total Amount: Ksh. {(total || 0).toLocaleString()}
      </TableCell>
    </TableRow>
    <Typography
      variant="body1"
      sx={{ fontFamily: "monospace", textAlign: "center", mt: 2 }}
    >
      Powered by: {coopName || ""}
    </Typography>
    <Typography variant="body2" sx={{ textAlign: "center", mt: 1 }}>
      Thank you for your business!
    </Typography>
  </>
);

const calculateTotal = (data) => {
  if (!data || data?.length === 0) return 0;
  return data.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
    0
  );
};

export default InvoiceReprintModal;
