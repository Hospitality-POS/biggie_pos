import React from "react";
import { Descriptions, Typography } from "antd";

const { Text } = Typography;

// Where clients pay their BasePoint service fee
const BASEPOINT_PAYMENT_DETAILS: { label: string; value: string; copyable?: boolean }[] = [
  { label: "Bank", value: "Absa Bank Kenya" },
  { label: "Branch", value: "Westlands" },
  { label: "Account name", value: "Relia Tech Solutions" },
  { label: "Paybill", value: "303030", copyable: true },
  { label: "Account no.", value: "2055601316", copyable: true },
  { label: "SWIFT", value: "BARCKENX", copyable: true },
  { label: "Location", value: "Nairobi, Kenya" },
];

interface Props {
  // Monthly fee, already formatted
  amount?: string;
  // Other amounts owed (setup fee etc.), already formatted
  extraLines?: { label: string; amount: string }[];
  // Monthly fee plus the extra lines, shown when there are extra lines
  total?: string;
  // Shown as the payment reference so BasePoint can match the payment
  reference?: string;
}

const BasePointPaymentDetails: React.FC<Props> = ({ amount, extraLines, total, reference }) => {
  const hasExtras = !!extraLines?.length;
  return (
    <Descriptions column={1} size="small" bordered title={<Text style={{ fontSize: 13 }}>Bank / payment details</Text>}>
      {amount && (
        <Descriptions.Item label={hasExtras ? "Monthly fee" : "Amount"}>
          <Text strong={!hasExtras}>{amount}</Text>
        </Descriptions.Item>
      )}
      {extraLines?.map((line, i) => (
        <Descriptions.Item key={`${line.label}-${i}`} label={line.label}>
          {line.amount}
        </Descriptions.Item>
      ))}
      {hasExtras && total && (
        <Descriptions.Item label="Total">
          <Text strong>{total}</Text>
        </Descriptions.Item>
      )}
      {BASEPOINT_PAYMENT_DETAILS.map((row) => (
        <Descriptions.Item key={row.label} label={row.label}>
          <Text copyable={row.copyable}>{row.value}</Text>
        </Descriptions.Item>
      ))}
      {reference && (
        <Descriptions.Item label="Reference">
          <Text copyable>{reference}</Text>
        </Descriptions.Item>
      )}
    </Descriptions>
  );
};

export default BasePointPaymentDetails;
