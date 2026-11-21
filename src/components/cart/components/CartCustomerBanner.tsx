import React from "react";
import { Flex, Avatar, Typography, Tag, Popconfirm, Tooltip, Button } from "antd";
import { UserOutlined, UserDeleteOutlined, HomeOutlined } from "@ant-design/icons";

const { Text } = Typography;

export interface CustomerDetails {
  customer_id: any;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  client_pin: string | null;
}

interface CartCustomerBannerProps {
  customerDetails: CustomerDetails | null;
  primaryColor: string;
  userRole?: string;
  isHotelMode?: boolean;
  delinkingCustomer?: boolean;
  onDelinkCustomer?: () => void;
  sendingHotelInfo?: boolean;
  onResendHotelInfo?: () => void;
  /** Pay later: the customer's credit limit (0 = none set) and what they owe now */
  creditLimit?: number;
  balanceOwed?: number;
}

const fmt = (n: number) =>
  `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const CartCustomerBanner: React.FC<CartCustomerBannerProps> = ({
  customerDetails,
  primaryColor,
  userRole,
  isHotelMode = false,
  delinkingCustomer = false,
  onDelinkCustomer,
  sendingHotelInfo = false,
  onResendHotelInfo,
  creditLimit = 0,
  balanceOwed = 0,
}) => {
  if (!customerDetails) return null;

  const canDelink = (userRole === "admin" || userRole === "cashier") && !!onDelinkCustomer;

  // Credit line — only for a linked customer with a limit set or a balance owed
  const showCredit = !!customerDetails.customer_id && (creditLimit > 0 || balanceOwed > 0);
  const creditLeft = Math.max(0, creditLimit - balanceOwed);
  const limitReached = creditLimit > 0 && balanceOwed >= creditLimit;

  return (
    <div style={{ marginBottom: 10 }}>
      <Flex
        align="center"
        gap={8}
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: showCredit ? "8px 8px 0 0" : 8,
          padding: "8px 10px",
        }}
      >
        {/* Avatar */}
        <Avatar
          size={28}
          icon={<UserOutlined />}
          style={{ background: primaryColor, flexShrink: 0 }}
        />

        {/* Customer info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ fontSize: 13, display: "block", lineHeight: 1.3 }}>
            {customerDetails.customer_name || "Customer"}
          </Text>
          {(customerDetails.customer_phone || customerDetails.customer_email) && (
            <Text style={{ fontSize: 11, color: "#64748b" }}>
              {customerDetails.customer_phone || customerDetails.customer_email}
              {customerDetails.customer_phone && customerDetails.customer_email
                ? ` · ${customerDetails.customer_email}`
                : ""}
            </Text>
          )}
        </div>

        {/* Linked badge */}
        {customerDetails.customer_id && (
          <Tag color="success" style={{ fontSize: 10, borderRadius: 4, flexShrink: 0, margin: 0 }}>
            Linked
          </Tag>
        )}

        {/* Delink button — admin / cashier only */}
        {canDelink && (
          <Popconfirm
            title="Remove customer from this order?"
            description="The order will continue as a walk-in. This cannot be undone."
            onConfirm={onDelinkCustomer}
            okText="Remove"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            placement="topRight"
          >
            <Tooltip title="Remove customer">
              <Button
                size="small"
                type="text"
                danger
                icon={<UserDeleteOutlined style={{ fontSize: 14 }} />}
                loading={delinkingCustomer}
                style={{
                  flexShrink: 0,
                  borderRadius: 6,
                  padding: "0 6px",
                  height: 26,
                }}
              />
            </Tooltip>
          </Popconfirm>
        )}

        {/* Resend hotel info button — hotel mode only */}
        {isHotelMode && onResendHotelInfo && (
          <Tooltip title="Resend hotel check-in information">
            <Button
              size="small"
              type="text"
              icon={<HomeOutlined style={{ fontSize: 14, color: primaryColor }} />}
              loading={sendingHotelInfo}
              onClick={onResendHotelInfo}
              style={{
                flexShrink: 0,
                borderRadius: 6,
                padding: "0 6px",
                height: 26,
              }}
            />
          </Tooltip>
        )}
      </Flex>

      {/* Credit limit & balance owed (pay later) */}
      {showCredit && (
        <Flex
          align="center"
          justify="space-between"
          wrap="wrap"
          gap={6}
          style={{
            background: limitReached ? "#fef2f2" : "#fff7ed",
            border: `1px solid ${limitReached ? "#fecaca" : "#fed7aa"}`,
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            padding: "6px 10px",
          }}
        >
          <Text style={{ fontSize: 11, color: "#64748b" }}>
            Owes{" "}
            <Text strong style={{ fontSize: 11, color: balanceOwed > 0 ? "#c2410c" : "#334155" }}>
              {fmt(balanceOwed)}
            </Text>
            {creditLimit > 0 && (
              <>
                {" · "}Limit{" "}
                <Text strong style={{ fontSize: 11, color: "#334155" }}>{fmt(creditLimit)}</Text>
              </>
            )}
          </Text>
          {creditLimit > 0 && (
            limitReached ? (
              <Tag color="error" style={{ fontSize: 10, borderRadius: 4, margin: 0 }}>
                Limit reached — no pay later
              </Tag>
            ) : (
              <Text style={{ fontSize: 11, color: "#15803d" }}>{fmt(creditLeft)} credit left</Text>
            )
          )}
        </Flex>
      )}
    </div>
  );
};

export default CartCustomerBanner;
