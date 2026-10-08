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
}

export const CartCustomerBanner: React.FC<CartCustomerBannerProps> = ({
  customerDetails,
  primaryColor,
  userRole,
  isHotelMode = false,
  delinkingCustomer = false,
  onDelinkCustomer,
  sendingHotelInfo = false,
  onResendHotelInfo,
}) => {
  if (!customerDetails) return null;

  const canDelink = (userRole === "admin" || userRole === "cashier") && !!onDelinkCustomer;

  return (
    <Flex
      align="center"
      gap={8}
      style={{
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: 8,
        padding: "8px 10px",
        marginBottom: 10,
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
  );
};

export default CartCustomerBanner;
