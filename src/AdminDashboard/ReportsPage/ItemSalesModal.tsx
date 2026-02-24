import React, { useRef, useMemo, forwardRef } from "react";
import { ModalForm } from "@ant-design/pro-form";
import { Button, Spin, Empty } from "antd";
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
  Divider,
  Box,
  Chip,
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
      overallSupplierTotal,
      totalCommissionAmount,
      totalSubscriptionItems,
      totalRegularItems,
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
          marginTop: "16px",
        }}
      >
        <ReportFooter
          overallTotal={overallTotal}
          overallSupplierTotal={overallSupplierTotal}
          totalCommissionAmount={totalCommissionAmount}
          totalSubscriptionItems={totalSubscriptionItems}
          totalRegularItems={totalRegularItems}
          coopName={COOP_NAME}
        />
      </div>
    </div>
  )
);

function ItemSalesModal({ data, startDate, endDate, loading }) {
  const componentRef = useRef(null);
  const { BRAND_NAME1 } = useSystemDetails();

  // ✅ FIX: Extract data array from API response
  const salesData = useMemo(() => {
    if (!data) return [];

    // If data has 'success' and 'data' properties (new API format)
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }

    // If data is already an array (old format)
    if (Array.isArray(data)) {
      return data;
    }

    // If data is wrapped in a 'data' property
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  }, [data]);

  const {
    overallTotal,
    totalCommissionAmount,
    overallSupplierTotal,
    totalSubscriptionItems,
    totalRegularItems
  } = useMemo(() => {
    let total = 0;
    let commission = 0;
    let supplierTotal = 0;
    let subscriptionItems = 0;
    let regularItems = 0;

    salesData.forEach((item) => {
      const itemTotal = getTotalAmount(item.orderItems);
      const itemSupplierTotal = getSupplierTotalAmount(item.orderItems);

      total += itemTotal;
      commission += item.commissionAmt || 0;
      supplierTotal += itemSupplierTotal;

      // Track subscription vs regular items
      if (item.subscription_breakdown) {
        subscriptionItems += item.subscription_breakdown.total_subscription_items || 0;
        regularItems += item.subscription_breakdown.total_regular_items || 0;
      }
    });

    return {
      overallTotal: total,
      totalCommissionAmount: commission,
      overallSupplierTotal: supplierTotal,
      totalSubscriptionItems: subscriptionItems,
      totalRegularItems: regularItems
    };
  }, [salesData]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const hasData = salesData && salesData.length > 0;

  return (
    <ModalForm
      className="receiptM"
      modalProps={{
        centered: true,
        destroyOnClose: true,
        cancelText: "Cancel",
        okText: "Confirm Print",
        okButtonProps: {
          icon: <PrinterFilled />,
          disabled: loading || !hasData
        },
      }}
      trigger={
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          htmlType="submit"
          disabled={!hasData}
        >
          Print Item Sales Report
        </Button>
      }
      onFinish={async () => {
        if (hasData) {
          handlePrint();
        }
        return true;
      }}
      width={800}
    >
      <Spin
        spinning={loading}
        tip="Loading sales report..."
      >
        {!startDate || !endDate ? (
          <Empty
            description="Please select date range to load the report"
            style={{ padding: "40px 0" }}
          />
        ) : !hasData && !loading ? (
          <Empty
            description="No sales data found for the selected period"
            style={{ padding: "40px 0" }}
          />
        ) : (
          <PrintableContent
            key={JSON.stringify(salesData)}
            ref={componentRef}
            data={salesData}
            startDate={startDate}
            endDate={endDate}
            BRAND_NAME1={BRAND_NAME1}
            overallTotal={overallTotal}
            overallSupplierTotal={overallSupplierTotal}
            totalCommissionAmount={totalCommissionAmount}
            totalSubscriptionItems={totalSubscriptionItems}
            totalRegularItems={totalRegularItems}
            COOP_NAME={COOP_NAME}
          />
        )}
      </Spin>
    </ModalForm>
  );
}

const ReportHeader = ({ brandName, startDate, endDate }) => (
  <Box sx={{ mb: 2 }}>
    <div
      className="logo-print"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: "16px"
      }}
    >
      {brandName && brandName !== "undefined undefined" && (
        <Typography
          variant="h5"
          textAlign="center"
          sx={{
            fontFamily: "monospace",
            fontWeight: "bold",
            mb: 1
          }}
        >
          {brandName}
        </Typography>
      )}
      <Typography
        variant="h6"
        sx={{
          fontFamily: "monospace",
          fontWeight: "600",
          color: "#333"
        }}
      >
        ITEM SALES REPORT
      </Typography>
    </div>
    <Divider sx={{ mb: 2 }} />
    <Typography
      variant="body2"
      sx={{
        textAlign: "center",
        fontFamily: "monospace",
        color: "#666"
      }}
    >
      <strong>From:</strong> {moment(startDate).format("MMM DD, YYYY h:mm A")}
      <br />
      <strong>To:</strong> {moment(endDate).format("MMM DD, YYYY h:mm A")}
    </Typography>
    <Divider sx={{ mt: 2 }} />
  </Box>
);

const ReportTable = ({ data }) => (
  <TableContainer sx={{ mt: 2, width: "inherit", mb: 2 }}>
    <Table size="small">
      <TableHead>
        <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
          <TableCell
            sx={{
              fontSize: "0.9em",
              padding: "8px",
              fontWeight: "bold",
              color: "#333"
            }}
          >
            Category / Product
          </TableCell>
          <TableCell
            sx={{
              fontSize: "0.9em",
              textAlign: "right",
              fontWeight: "bold",
              padding: "8px",
              color: "#333"
            }}
          >
            Total (KSh)
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data && data.length > 0 ? (
          data.map((item, index) => (
            <React.Fragment key={item.id || index}>
              <TableRow sx={{ backgroundColor: index % 2 === 0 ? "#fafafa" : "white" }}>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    padding: "8px",
                    fontSize: "0.95em"
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {item.name || "Uncategorized"}
                    {item.subscription_breakdown &&
                      item.subscription_breakdown.total_subscription_items > 0 && (
                        <Chip
                          label={`${item.subscription_breakdown.subscription_percentage}% Subscription`}
                          size="small"
                          color="success"
                          sx={{ fontSize: "0.7em", height: "20px" }}
                        />
                      )}
                  </Box>
                </TableCell>
                <TableCell
                  sx={{
                    textAlign: "right",
                    fontWeight: "bold",
                    fontSize: "0.95em",
                    color: "#1976d2"
                  }}
                >
                  {getTotalAmount(item.orderItems).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </TableCell>
              </TableRow>
              {item.orderItems && item.orderItems.length > 0 && (
                <OrderItemsSubTable orderItems={item.orderItems} />
              )}
            </React.Fragment>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={2} sx={{ textAlign: "center", padding: "24px" }}>
              <Typography variant="body2" color="textSecondary">
                No sales data available
              </Typography>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

const OrderItemsSubTable = ({ orderItems }) => (
  <TableRow>
    <TableCell colSpan={2} sx={{ padding: "0 8px 8px 8px", backgroundColor: "#f9f9f9" }}>
      <TableContainer sx={{ width: "inherit" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ padding: "4px 8px", fontSize: "0.85em", fontWeight: "600" }}>
                Qty
              </TableCell>
              <TableCell sx={{ padding: "4px 8px", fontSize: "0.85em", fontWeight: "600" }}>
                Item
              </TableCell>
              <TableCell sx={{ padding: "4px 8px", fontSize: "0.85em", fontWeight: "600", textAlign: "right" }}>
                Stock Cost
              </TableCell>
              <TableCell sx={{ padding: "4px 8px", fontSize: "0.85em", fontWeight: "600", textAlign: "right" }}>
                Unit Price
              </TableCell>
              <TableCell sx={{ padding: "4px 8px", fontSize: "0.85em", fontWeight: "600", textAlign: "right" }}>
                Total
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orderItems.map((orderItem, idx) => (
              <TableRow key={orderItem.id || idx}>
                <TableCell sx={{ borderBottom: "none", padding: "4px 8px", fontSize: "0.85em" }}>
                  {orderItem.quantity?.toFixed(1) || "0.0"}
                </TableCell>
                <TableCell
                  sx={{
                    borderBottom: "none",
                    padding: "4px 8px",
                    fontWeight: "500",
                    fontSize: "0.85em"
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {orderItem.name || "Unknown Item"}
                    {orderItem.is_subscription_item && (
                      <Chip
                        label="Subscription"
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontSize: "0.65em", height: "16px" }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell sx={{ borderBottom: "none", padding: "4px 8px", fontSize: "0.85em", textAlign: "right" }}>
                  {((orderItem.supplier_price || 0) * (orderItem.quantity || 0)).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </TableCell>
                <TableCell sx={{ borderBottom: "none", padding: "4px 8px", fontSize: "0.85em", textAlign: "right" }}>
                  {(orderItem.amount || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </TableCell>
                <TableCell sx={{ borderBottom: "none", padding: "4px 8px", fontSize: "0.85em", textAlign: "right", fontWeight: "600" }}>
                  {(orderItem.total_amount || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </TableCell>
  </TableRow>
);

const ReportFooter = ({
  overallTotal,
  totalCommissionAmount,
  coopName,
  overallSupplierTotal,
  totalSubscriptionItems,
  totalRegularItems
}) => {
  const totalItems = totalSubscriptionItems + totalRegularItems;
  const subscriptionPercentage = totalItems > 0
    ? ((totalSubscriptionItems / totalItems) * 100).toFixed(1)
    : 0;

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Divider sx={{ mb: 2 }} />

      {/* Subscription Breakdown */}
      {totalSubscriptionItems > 0 && (
        <Box sx={{ mb: 2, textAlign: "center" }}>
          <Typography variant="body2" sx={{ fontWeight: "600", mb: 1 }}>
            Sales Breakdown
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Chip
              label={`Subscription: ${totalSubscriptionItems} items (${subscriptionPercentage}%)`}
              color="success"
              size="small"
            />
            <Chip
              label={`Regular: ${totalRegularItems} items (${(100 - parseFloat(subscriptionPercentage)).toFixed(1)}%)`}
              color="primary"
              size="small"
            />
          </Box>
          <Divider sx={{ mt: 2 }} />
        </Box>
      )}

      <Table size="small">
        <TableBody>
          <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
            <TableCell
              colSpan={3}
              sx={{
                fontWeight: "bold",
                textAlign: "center",
                fontSize: "1em",
                padding: "8px",
                borderBottom: "1px solid #ddd"
              }}
            >
              <strong>Overall Total Sales:</strong> KSh. {overallTotal?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }) || "0.00"}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              colSpan={3}
              sx={{
                fontWeight: "bold",
                textAlign: "center",
                fontSize: "0.95em",
                padding: "8px",
                borderBottom: "1px solid #ddd",
                color: "#666"
              }}
            >
              <strong>Overall Stock Cost:</strong> KSh. {overallSupplierTotal?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }) || "0.00"}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              colSpan={3}
              sx={{
                fontWeight: "bold",
                textAlign: "center",
                fontSize: "0.95em",
                padding: "8px",
                color: "#1976d2"
              }}
            >
              <strong>Gross Profit:</strong> KSh. {((overallTotal || 0) - (overallSupplierTotal || 0)).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </TableCell>
          </TableRow>
          {totalCommissionAmount > 0 && (
            <TableRow>
              <TableCell
                colSpan={3}
                sx={{
                  fontWeight: "bold",
                  textAlign: "center",
                  fontSize: "0.95em",
                  padding: "8px",
                  borderTop: "1px solid #ddd"
                }}
              >
                <strong>Overall Commission:</strong> KSh. {totalCommissionAmount?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }) || "0.00"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Typography
          variant="body2"
          sx={{
            fontSize: "0.85em",
            fontFamily: "monospace",
            color: "#666",
            mb: 0.5
          }}
        >
          Powered by: <strong>{coopName}</strong>
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontSize: "0.8em",
            color: "#999"
          }}
        >
          Generated on {moment().format("MMM DD, YYYY [at] h:mm A")}
        </Typography>
      </Box>
    </Box>
  );
};

function getTotalAmount(orderItems) {
  if (!orderItems || !Array.isArray(orderItems)) return 0;
  return orderItems.reduce((total, item) => total + (item.total_amount || 0), 0);
}

function getSupplierTotalAmount(orderItems) {
  if (!orderItems || !Array.isArray(orderItems)) return 0;

  return orderItems.reduce((total, item) => {
    const supplierPrice = Number(item.supplier_price) || 0;
    const quantity = Number(item.quantity) || 0;
    return total + (supplierPrice * quantity);
  }, 0);
}

export default ItemSalesModal;