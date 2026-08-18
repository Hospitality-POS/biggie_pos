import React from "react";
import { Button, Tooltip } from "antd";
import { PhoneOutlined } from "@ant-design/icons";
import { initiateCall } from "@services/twilio";
import { getPermissionChecker } from "@utils/getPermissionChecker";

interface CallButtonProps {
  phoneNumber: string;
  customerId?: string;
  leadId?: string;
  recordCall?: boolean;
  onSuccess?: () => void;
  size?: "small" | "middle" | "large";
  type?: "primary" | "default" | "text" | "link";
  iconOnly?: boolean;
}

const CallButton: React.FC<CallButtonProps> = ({
  phoneNumber,
  customerId,
  leadId,
  recordCall = true,
  onSuccess,
  size = "small",
  type = "default",
  iconOnly = false,
}) => {
  const can = getPermissionChecker();
  const canMakeCalls = can("TWILIO_MAKE_CALLS");

  const handleCall = async () => {
    if (!canMakeCalls) {
      return;
    }

    const shopId = localStorage.getItem("shopId");
    if (!shopId) {
      return;
    }

    try {
      // Get available phone numbers
      // For now, we'll need to implement phone number selection
      // This is a simplified version - you might want to add a phone number selector
      await initiateCall({
        shop_id: shopId,
        phone_number_id: "", // You'll need to implement phone number selection
        to_number: phoneNumber,
        customer_id: customerId,
        lead_id: leadId,
        record: recordCall,
      });
      onSuccess?.();
    } catch (error) {
      console.error("Failed to initiate call:", error);
    }
  };

  if (!canMakeCalls) {
    return null;
  }

  return (
    <Tooltip title={`Call ${phoneNumber}`}>
      <Button
        icon={<PhoneOutlined />}
        onClick={handleCall}
        size={size}
        type={type}
        style={{ color: "#3b82f6", borderColor: "#3b82f6" }}
      >
        {iconOnly ? "" : "Call"}
      </Button>
    </Tooltip>
  );
};

export default CallButton;
