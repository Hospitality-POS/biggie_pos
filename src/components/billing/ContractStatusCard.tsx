import React from "react";
import { Button, Modal, Typography } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  fetchContractStatus,
  formatPaidUntil,
  paymentDetailProps,
  CONTRACT_STATUS_KEY,
  ContractStatus,
} from "@services/smartContract";
import BasePointPaymentDetails from "@components/billing/BasePointPaymentDetails";
import { useAppSelector } from "src/store";

const { Text } = Typography;

const days = (n: number | null | undefined) => (n === 1 ? "1 day" : `${n ?? 0} days`);

type CardContent = {
  color: string;
  bg: string;
  big: string; // the countdown, e.g. "12 days"
  label: string; // what the countdown is for
  detail: string;
  action: string;
};

const NEXT_STATE_TEXT: Record<string, string> = {
  Grace: "the grace period starts",
  Restricted: "reports and admin settings lock",
  Locked: "the system locks",
};

// Countdown to the next payment (or to the next restriction when overdue),
// with what this person should do about it
const contentFor = (s: ContractStatus, isAdmin: boolean): CardContent | null => {
  const next = s.next_state ? NEXT_STATE_TEXT[s.next_state] : null;
  switch (s.state) {
    case "Active":
    case "Due":
      return {
        color: s.state === "Due" ? "#d97706" : "#16a34a",
        bg: s.state === "Due" ? "#fffbeb" : "#f0fdf4",
        big: s.days_until_due === 0 ? "Today" : days(s.days_until_due),
        label: s.days_until_due === 0 ? "Payment due today" : "until payment is due",
        detail: `renewal due by ${formatPaidUntil(s.paid_until)}`,
        action:
          s.state === "Due"
            ? isAdmin
              ? "Pay before the due date to avoid interruptions."
              : "Please remind your admin to pay."
            : "No action needed yet.",
      };
    case "Grace":
    case "Restricted":
      return {
        color: s.state === "Grace" ? "#ea580c" : "#dc2626",
        bg: s.state === "Grace" ? "#fff7ed" : "#fef2f2",
        big: days(s.days_until_next_state),
        label: next ? `until ${next}` : "overdue",
        detail: `renewal is ${days(s.days_overdue)} overdue${
          s.next_state_on ? ` · ${next} on ${formatPaidUntil(s.next_state_on)}` : ""
        }`,
        action: isAdmin ? "Pay now to avoid restrictions." : "Tell your admin to pay.",
      };
    case "Scheduled":
      return {
        color: "#2563eb",
        bg: "#eff6ff",
        big: "—",
        label: "subscription not started",
        detail: `first renewal due by ${formatPaidUntil(s.paid_until)}`,
        action: "No action needed yet.",
      };
    default:
      return null;
  }
};

// Subscription countdown for the admin and POS dashboards. Hidden when the
// smart contract is off.
const ContractStatusCard: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";
  const [showDetails, setShowDetails] = React.useState(false);
  const { data } = useQuery({
    queryKey: CONTRACT_STATUS_KEY,
    queryFn: fetchContractStatus,
    refetchInterval: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const content = data ? contentFor(data, isAdmin) : null;
  if (!data || !content) return null;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderLeft: `4px solid ${content.color}`,
          borderRadius: 10,
          padding: "8px 12px",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: content.bg,
            color: content.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          <CalendarOutlined />
        </div>
        <div style={{ minWidth: 120 }}>
          <Text strong style={{ fontSize: 22, color: content.color, lineHeight: 1.1, display: "block" }}>
            {content.big}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{content.label}</Text>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Text strong style={{ fontSize: 13, display: "block" }}>BasePoint subscription — {content.detail}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{content.action}</Text>
        </div>
        <Button size="small" onClick={() => setShowDetails(true)}>
          How to pay
        </Button>
      </div>
      <Modal
        open={showDetails}
        title="Pay your BasePoint subscription"
        onCancel={() => setShowDetails(false)}
        footer={<Button onClick={() => setShowDetails(false)}>Close</Button>}
      >
        <BasePointPaymentDetails {...paymentDetailProps(data)} />
      </Modal>
    </>
  );
};

export default ContractStatusCard;
