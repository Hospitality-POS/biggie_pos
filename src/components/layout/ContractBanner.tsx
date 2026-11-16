import React from "react";
import { Alert, Button, Modal, Space, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  fetchContractStatus,
  formatPaidUntil,
  paymentDetailProps,
  CONTRACT_STATUS_KEY,
  ContractStatus,
} from "src/services/smartContract";
import BasePointPaymentDetails from "@components/billing/BasePointPaymentDetails";
import { useAppSelector } from "src/store";

const { Text } = Typography;

const REFRESH_MS = 15 * 60 * 1000;

const days = (n: number | null | undefined) => (n === 1 ? "1 day" : `${n ?? 0} days`);

// "in 4 days (on 11 Dec 2026)" / "tomorrow" / "today"
const countdown = (n: number | null | undefined, on: string | null) => {
  const date = on ? ` (${formatPaidUntil(on)})` : "";
  if (n === 0) return `today${date}`;
  if (n === 1) return `tomorrow${date}`;
  return `in ${days(n)}${date}`;
};

type Banner = { type: "info" | "warning" | "error"; headline: string; action: string; closable: boolean };

// What happens next and what this person should do about it. Admins pay;
// everyone else is asked to tell their admin.
const bannerFor = (s: ContractStatus, isAdmin: boolean): Banner | null => {
  const nextAt = countdown(s.days_until_next_state, s.next_state_on);
  switch (s.state) {
    case "Due":
      return {
        type: "info",
        headline:
          s.days_until_due === 0
            ? "Your BasePoint subscription renewal is due today."
            : `Your BasePoint subscription renewal is due ${countdown(s.days_until_due, s.paid_until)} — ${days(s.days_until_due)} remaining.`,
        action: isAdmin
          ? "Pay before the due date to avoid interruptions."
          : "Please remind your admin to pay before the due date.",
        closable: true,
      };
    case "Grace":
      return {
        type: "warning",
        headline: `Subscription renewal is ${days(s.days_overdue)} overdue. Reports and admin settings will be locked ${nextAt}.`,
        action: isAdmin ? "Pay now to avoid restrictions." : "Sales are not affected yet — please tell your admin.",
        closable: false,
      };
    case "Restricted":
      return {
        type: "error",
        headline: `Subscription renewal is ${days(s.days_overdue)} overdue. Reports and admin settings are locked; the whole system locks (no sign-in) ${nextAt}.`,
        action: isAdmin
          ? "Pay now, then ask BasePoint support for your reactivation code."
          : "Sales still work for now — tell your admin to pay before the system locks.",
        closable: false,
      };
    case "Locked":
      return {
        type: "error",
        headline: `Subscription renewal is ${days(s.days_overdue)} overdue. The system is locked.`,
        action: isAdmin
          ? "Pay now, then ask BasePoint support for your reactivation code."
          : "Contact your admin to restore access.",
        closable: false,
      };
    default:
      return null;
  }
};

// A dismissed "payment due" reminder stays hidden for the rest of the day
const dismissKey = (s: ContractStatus) => `contractBannerDismissed:${s.paid_until ?? ""}:${new Date().toDateString()}`;

const wasDismissed = (s: ContractStatus) => {
  try {
    return localStorage.getItem(dismissKey(s)) === "1";
  } catch {
    return false;
  }
};

// Payment reminder shown to every signed-in user (admins and cashiers) while
// the smart contract is due or overdue
const ContractBanner: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";
  const [showDetails, setShowDetails] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const { data } = useQuery({
    queryKey: CONTRACT_STATUS_KEY,
    queryFn: fetchContractStatus,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const banner = data ? bannerFor(data, isAdmin) : null;
  if (!data || !banner) return null;
  if (banner.closable && (dismissed || wasDismissed(data))) return null;

  const handleClose = () => {
    try {
      localStorage.setItem(dismissKey(data), "1");
    } catch {
      // not remembered — it simply shows again next time
    }
    setDismissed(true);
  };

  return (
    <>
      <Alert
        banner
        showIcon
        type={banner.type}
        closable={banner.closable}
        onClose={handleClose}
        message={
          <span>
            <Text strong>{banner.headline}</Text> {banner.action}
          </span>
        }
        action={
          <Space size={8}>
            <Button size="small" type={banner.type === "info" ? "default" : "primary"} onClick={() => setShowDetails(true)}>
              How to pay
            </Button>
            {isAdmin && (
              <Button size="small" onClick={() => navigate("/admin/settings")}>
                Smart Contract
              </Button>
            )}
          </Space>
        }
      />
      <Modal
        open={showDetails}
        title="Pay your BasePoint subscription"
        onCancel={() => setShowDetails(false)}
        footer={<Button onClick={() => setShowDetails(false)}>Close</Button>}
      >
        <BasePointPaymentDetails {...paymentDetailProps(data)} />
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 12 }}>
          Use your account code as the payment reference. Once BasePoint receives the payment,
          support will reactivate your system for the next period.
        </Text>
      </Modal>
    </>
  );
};

export default ContractBanner;
