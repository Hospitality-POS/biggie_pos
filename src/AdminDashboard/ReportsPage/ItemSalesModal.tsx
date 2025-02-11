import React, { useRef, useMemo, forwardRef } from "react";
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
import "@components/MODALS/bill.css";

const PrintableContent = forwardRef(
  (
    {
      data,
      startDate,
      endDate,
      BRAND_NAME1,
      overallTotal,
      overallupplierTotal,
      totalCommissionAmount,
      COOP_NAME,
    },
    ref
  ) => (
    <div className="receipt" id="receipt" ref={ref}>
      <ReportHeader
        brandName={BRAND_NAME1}
        startDate={startDate}
        endDate={endDate}
      />
      <ReportTable data={data} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <ReportFooter
          overallTotal={overallTotal}
          overallupplierTotal={overallupplierTotal}
          totalCommissionAmount={totalCommissionAmount}
          coopName={COOP_NAME}
        />
      </div>
    </div>
  )
);

function ItemSalesModal({ data, startDate, endDate, loading }) {
  const componentRef = useRef(null);
  const { BRAND_NAME1 } = useSystemDetails();

  const { overallTotal, totalCommissionAmount } = useMemo(() => {
    let total = 0;
    let commission = 0;
    data?.forEach((item) => {
      total += getTotalAmount(item.orderItems);
      commission += item.commissionAmt;
    });
    return { overallTotal: total, totalCommissionAmount: commission };
  }, [data]);


  const overallupplierTotal = data?.reduce(
    (accumulator: number, item: { orderItems: any[] }) =>
      accumulator + getSupplierTotalAmount(item.orderItems),
    0
  );

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  return (
    <ModalForm
      className="receiptM"
      modalProps={{
        centered: true,
        destroyOnClose: true,
        cancelText: "Cancel",
        okText: "Confirm Print",
        okButtonProps: { icon: <PrinterFilled />, disabled: loading },
      }}
      trigger={
        <Button type="primary" icon={<PrinterOutlined />} htmlType="submit">
          Print Item Sales Report
        </Button>
      }
      onFinish={async () => {
        handlePrint();
        return true;
      }}
    >
      <Spin
        spinning={loading || !startDate}
        tip="Kindly fill in the form to load the report..."
      >
        <PrintableContent
          key={JSON.stringify(data)}
          ref={componentRef}
          data={data}
          startDate={startDate}
          endDate={endDate}
          BRAND_NAME1={BRAND_NAME1}
          overallTotal={overallTotal}
          overallupplierTotal={overallupplierTotal}
          totalCommissionAmount={totalCommissionAmount}
          COOP_NAME={COOP_NAME}
        />
      </Spin>
    </ModalForm>
  );
}

const ReportHeader = ({ brandName, startDate, endDate }) => (
  <>
    <div
      className="logo-print"
      style={{ display: "flex", flexDirection: "column" }}
    >
      {brandName && brandName !== "undefined undefined" && (
        <Typography
          variant="h5"
          textAlign="center"
          sx={{ fontFamily: "monospace", fontWeight: "bold" }}
        >
          {brandName}
        </Typography>
      )}
      <Typography variant="h6" sx={{ fontFamily: "monospace" }}>
        ITEM SALES REPORT
      </Typography>
    </div>
    <p style={{ textAlign: "center", fontFamily: "monospace" }}>
      From: {moment(startDate).format("MMM-DD-YYYY H:mm A")} <br /> to <br />
      {moment(endDate).format("MMM-DD-YYYY H:mm A")}
    </p>
  </>
);

const ReportTable = ({ data }) => (
  <TableContainer sx={{ mt: 2, width: "inherit", mb: 2 }}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontSize: "1em", padding: 0, fontWeight: "bold" }}>
            Product
          </TableCell>
          <TableCell
            sx={{
              fontSize: "1em",
              textAlign: "right",
              fontWeight: "bold",
              padding: 2,
            }}
          >
            Amount(.ksh)
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data?.map((item) => (
          <React.Fragment key={item.id}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", padding: 0 }}>
                {item.name}
              </TableCell>
              <TableCell sx={{ textAlign: "right", fontWeight: "bold" }}>
                {getTotalAmount(item.orderItems).toFixed(2)}
              </TableCell>

            </TableRow>
            {item.orderItems?.length > 0 && (
              <OrderItemsSubTable orderItems={item.orderItems} />
            )}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

const OrderItemsSubTable = ({ orderItems }) => (
  <TableRow>
    <TableCell colSpan={2} sx={{ padding: 0 }}>
      <TableContainer sx={{ width: "inherit" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ padding: 1 }}>QTY</TableCell>
              <TableCell sx={{ padding: 0 }}>ITEM</TableCell>
              <TableCell sx={{ padding: 0 }}>STOCK COST</TableCell>
              <TableCell sx={{ padding: 0 }}>PRICE(.Ksh)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orderItems.map((orderItem) => (
              <TableRow key={orderItem.id}>
                <TableCell sx={{ borderBottom: "none", padding: 1 }}>
                  {orderItem.quantity.toFixed(1)}
                </TableCell>
                <TableCell
                  sx={{ borderBottom: "none", padding: 1, fontWeight: "bold" }}
                >
                  {orderItem.name}
                </TableCell>
                <TableCell sx={{ borderBottom: "none", padding: 1 }}>
                  {orderItem.supplier_price * orderItem.quantity || 0}
                </TableCell>
                <TableCell sx={{ borderBottom: "none", padding: 1 }}>
                  {orderItem.amount.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </TableCell>
  </TableRow>
);

const ReportFooter = ({ overallTotal, totalCommissionAmount, coopName, overallupplierTotal }) => (
  <>
    <TableRow>
      <TableCell colSpan={3} sx={{ fontWeight: "bold", textAlign: "center" }}>
        Overall Total: Ksh. <span>{overallTotal?.toLocaleString() || 0}</span>
      </TableCell>
    </TableRow>
    <TableCell colSpan={3} sx={{ fontWeight: "bold", textAlign: "center" }}>
      Overall Stock Total: Ksh. <span>{overallupplierTotal?.toLocaleString() || 0}</span>
    </TableCell>
    <TableRow>
      <TableCell colSpan={3} sx={{ fontWeight: "bold", textAlign: "center" }}>
        Overall Commission: Ksh. <span>{totalCommissionAmount || 0}</span>
      </TableCell>
    </TableRow>
    <Typography
      variant="body1"
      style={{ fontSize: "1em", fontFamily: "monospace", textAlign: "center" }}
    >
      Powered by: {coopName}
    </Typography>
    <Typography variant="body1" sx={{ textAlign: "center", fontSize: "0.9em" }}>
      Generated on {moment().format("MMM/DD/YYYY")}
    </Typography>
  </>
);

function getTotalAmount(orderItems) {
  return orderItems?.reduce((total, item) => total + item.total_amount, 0) || 0;
}

function getSupplierTotalAmount(orderItems: any[]): number {
  let total = 0;

  orderItems?.forEach((item) => {
    const supplierPrice = Number(item.supplier_price) || 0; // Ensure it's a valid number
    const quantity = Number(item.quantity) || 0; // Ensure it's a valid number
    total += supplierPrice * quantity;
  });

  return total;
}


export default ItemSalesModal;
