import React from "react";
import { Flex, Typography, Tag, Divider, Button } from "antd";
import { RestOutlined, PrinterOutlined, SmileFilled } from "@ant-design/icons";
import { fmtKSH as fmtKsh } from "@utils/formatters";

const { Text } = Typography;

const SummaryRow: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  strong?: boolean;
  accent?: string;
  muted?: boolean;
}> = ({ label, value, strong, accent, muted }) => (
  <Flex align="center" justify="space-between" style={{ padding: "3px 0" }}>
    <Text
      style={{
        fontSize: strong ? 15 : 13,
        fontWeight: strong ? 700 : 400,
        color: muted ? "#94a3b8" : "#374151",
      }}
    >
      {label}
    </Text>
    <Text
      style={{
        fontSize: strong ? 15 : 13,
        fontWeight: strong ? 700 : 400,
        color: accent || (muted ? "#94a3b8" : "#374151"),
      }}
    >
      {value}
    </Text>
  </Flex>
);

const PrintStatusBadge: React.FC<{
  isReprint: boolean;
  printsRemaining: number | null;
  statusLoading: boolean;
}> = ({ isReprint, printsRemaining, statusLoading }) => {
  if (statusLoading || !isReprint) return null;

  return (
    <Flex
      align="center"
      gap={6}
      style={{
        background: "#fff7ed",
        border: "1px solid #fed7aa",
        borderRadius: 8,
        padding: "6px 10px",
        marginBottom: 8,
      }}
    >
      <PrinterOutlined style={{ color: "#f97316", fontSize: 13 }} />
      <Text style={{ fontSize: 12, color: "#c2410c", flex: 1 }}>
        Reprint — previously printed
      </Text>
      {printsRemaining !== null && (
        <Tag
          color={printsRemaining === 0 ? "error" : "warning"}
          style={{ fontSize: 10, borderRadius: 4, margin: 0 }}
        >
          {printsRemaining === 0 ? "Limit reached" : `${printsRemaining} left`}
        </Tag>
      )}
    </Flex>
  );
};

interface CartSummaryProps {
  cartDetails: any;
  subtotal: number;
  grandTotal: number;
  discountAmount: number;
  grossBeforeDiscount: number;
  displayVat: number;
  primaryColor: string;
  isReprint: boolean;
  printsRemaining: number | null;
  statusLoading: boolean;
  staffEarningEnabled?: boolean;
  userRole?: string;
  onOpenEarningsModal?: () => void;
  onOpenAssignStaffModal?: () => void;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  cartDetails,
  grandTotal,
  discountAmount,
  grossBeforeDiscount,
  displayVat,
  primaryColor,
  isReprint,
  printsRemaining,
  statusLoading,
  staffEarningEnabled = false,
  userRole,
  onOpenEarningsModal,
  onOpenAssignStaffModal,
}) => {
  const canManage = userRole === "admin" || userRole === "cashier";

  const servedByName = (() => {
    const servedBy = cartDetails?.served_by;
    if (!servedBy || (Array.isArray(servedBy) && servedBy.length === 0)) {
      return cartDetails?.created_by?.username || "Staff";
    }
    if (Array.isArray(servedBy)) {
      if (servedBy.length === 0) return cartDetails?.created_by?.username || "Staff";
      const staff = servedBy[0];
      if (typeof staff === "string") return "Staff";
      return staff?.username || "Staff";
    }
    return cartDetails?.created_by?.username || "Staff";
  })();

  const extraStaffCount =
    Array.isArray(cartDetails?.served_by) && cartDetails.served_by.length > 1
      ? cartDetails.served_by.length - 1
      : 0;

  return (
    <div
      style={{
        background: "#f8fafc",
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 10,
        border: "1px solid #e2e8f0",
      }}
    >
      {/* Tip */}
      {cartDetails?.tip_amount && (
        <>
          <SummaryRow
            label={
              <>
                <RestOutlined style={{ marginRight: 4 }} />
                Tip
              </>
            }
            value={
              cartDetails.tip_type === "amount"
                ? fmtKsh(cartDetails.tip_amount)
                : `${cartDetails.tip_amount}%`
            }
          />
          <Divider style={{ margin: "6px 0" }} />
        </>
      )}

      {/* Subtotal & Discount */}
      {discountAmount > 0 ? (
        <>
          <SummaryRow label="Subtotal" value={fmtKsh(grossBeforeDiscount)} muted />
          <SummaryRow
            label={
              <Flex align="center" gap={6}>
                Discount
                <Tag color="success" style={{ fontSize: 10, margin: 0, borderRadius: 4 }}>
                  {cartDetails.discount_type === "percentage"
                    ? `${cartDetails.discount}% off`
                    : fmtKsh(cartDetails.discount)}
                </Tag>
              </Flex>
            }
            value={`- ${fmtKsh(discountAmount)}`}
            accent="#10b981"
            muted
          />
        </>
      ) : (
        <SummaryRow label="Subtotal" value={fmtKsh(grandTotal)} muted />
      )}

      <SummaryRow label="VAT" value={fmtKsh(displayVat)} muted />

      <Divider style={{ margin: "8px 0" }} />

      <SummaryRow label="Amount Due" value={fmtKsh(grandTotal)} strong accent={primaryColor} />

      <Divider style={{ margin: "8px 0" }} />
      <PrintStatusBadge
        isReprint={isReprint}
        printsRemaining={printsRemaining}
        statusLoading={statusLoading}
      />

      {/* Served by */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: "8px 10px",
        }}
      >
        <Flex align="center" gap={6}>
          <SmileFilled style={{ color: "#fbbf24", fontSize: 14 }} />
          <div>
            <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", lineHeight: 1.2 }}>
              Served by
            </Text>
            <Flex align="center" gap={4}>
              <Text style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>
                {servedByName}
              </Text>
              {extraStaffCount > 0 && (
                <Tag style={{ fontSize: 10, borderRadius: 4, margin: 0, padding: "0 6px" }}>
                  +{extraStaffCount}
                </Tag>
              )}
            </Flex>
          </div>
        </Flex>

        <Flex gap={4}>
          {staffEarningEnabled &&
            Array.isArray(cartDetails?.served_by) &&
            cartDetails.served_by.length > 0 &&
            canManage &&
            onOpenEarningsModal && (
              <Button
                size="small"
                type="text"
                onClick={onOpenEarningsModal}
                style={{ fontSize: 11, color: primaryColor }}
              >
                Configure Earnings
              </Button>
            )}
          {canManage && cartDetails?._id && onOpenAssignStaffModal && (
            <Button
              size="small"
              type="text"
              onClick={onOpenAssignStaffModal}
              style={{ fontSize: 11, color: primaryColor }}
            >
              Change
            </Button>
          )}
        </Flex>
      </div>
    </div>
  );
};

export default CartSummary;
