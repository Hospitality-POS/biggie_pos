import React, { useEffect, useState } from "react";
import { Modal, Typography, InputNumber, message } from "antd";
import { SmileFilled } from "@ant-design/icons";
import { updateCart as updateCartService } from "../../../services/cart";

const { Text } = Typography;

const fmtKsh = (v: number) =>
  `KSH ${v?.toLocaleString("en-KE", { minimumFractionDigits: 0 }) ?? "0"}`;

interface StaffEarningsModalProps {
  open: boolean;
  onClose: () => void;
  cartDetails: any;
  grandTotal: number;
  primaryColor: string;
  onSuccess?: () => void;
}

export const StaffEarningsModal: React.FC<StaffEarningsModalProps> = ({
  open,
  onClose,
  cartDetails,
  grandTotal,
  primaryColor,
  onSuccess,
}) => {
  const [staffEarnings, setStaffEarnings] = useState<Record<string, number>>({});
  const [updatingEarnings, setUpdatingEarnings] = useState(false);

  useEffect(() => {
    if (!open || !cartDetails) return;
    const servedBy = cartDetails.served_by;
    if (!servedBy || !Array.isArray(servedBy) || servedBy.length === 0) return;

    const existingEarnings: Record<string, number> = {};
    if (Array.isArray(cartDetails.staff_earnings)) {
      cartDetails.staff_earnings.forEach((earning: any) => {
        existingEarnings[earning.staff_id] = earning.amount || 0;
      });
    }

    servedBy.forEach((staff: any) => {
      const staffId = typeof staff === "string" ? staff : staff._id;
      if (staffId && existingEarnings[staffId] === undefined) {
        existingEarnings[staffId] = 0;
      }
    });

    setStaffEarnings(existingEarnings);
  }, [open, cartDetails]);

  const totalAllocated = Object.values(staffEarnings).reduce(
    (sum, val) => sum + (val || 0),
    0
  );
  const isOverAllocated = totalAllocated > grandTotal;
  const isZero = totalAllocated === 0;

  const handleSaveEarnings = async () => {
    const cartId = cartDetails?._id ?? cartDetails?.id;
    if (!cartId) return;

    setUpdatingEarnings(true);
    try {
      const staffEarningsArray = Object.entries(staffEarnings).map(([staff_id, amount]) => ({
        staff_id,
        amount,
      }));
      await updateCartService(cartId, { staff_earnings: staffEarningsArray });
      message.success("Earnings saved successfully");
      onClose();
      onSuccess?.();
    } catch (e) {
      console.error("Failed to update earnings", e);
      message.error("Failed to save earnings");
    } finally {
      setUpdatingEarnings(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSaveEarnings}
      confirmLoading={updatingEarnings}
      okText="Save Earnings"
      cancelText="Cancel"
      width={400}
      okButtonProps={{
        disabled: isOverAllocated || isZero,
      }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SmileFilled style={{ color: primaryColor }} />
          <span>Configure Staff Earnings</span>
        </div>
      }
    >
      <div style={{ marginTop: 16 }}>
        <Text style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 12 }}>
          Total Order: {fmtKsh(grandTotal)}
        </Text>
        {Array.isArray(cartDetails?.served_by) &&
          cartDetails.served_by.map((staff: any) => {
            const staffId = typeof staff === "string" ? staff : staff._id;
            const staffName = staff?.username || staff?.fullname || "Staff";
            return (
              <div key={staffId} style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {staffName}
                </Text>
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  max={grandTotal}
                  precision={2}
                  placeholder="0.00"
                  value={staffEarnings[staffId] || 0}
                  onChange={(value) =>
                    setStaffEarnings((prev) => ({ ...prev, [staffId]: value || 0 }))
                  }
                />
              </div>
            );
          })}
        <div
          style={{
            marginTop: 12,
            padding: "8px",
            background: "#f8fafc",
            borderRadius: 6,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: isOverAllocated ? "#ef4444" : isZero ? "#f59e0b" : "#64748b",
            }}
          >
            Total Allocated: {fmtKsh(totalAllocated)}
          </Text>
          {isOverAllocated && (
            <Text style={{ fontSize: 10, color: "#ef4444", display: "block", marginTop: 4 }}>
              Cannot exceed total order value
            </Text>
          )}
          {isZero && (
            <Text style={{ fontSize: 10, color: "#f59e0b", display: "block", marginTop: 4 }}>
              Please configure earnings for at least one staff member
            </Text>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default StaffEarningsModal;
