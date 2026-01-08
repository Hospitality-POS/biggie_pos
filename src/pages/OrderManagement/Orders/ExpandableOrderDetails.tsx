import { ProDescriptions } from "@ant-design/pro-components";
import { Tag } from "antd";


const ExpandedRowContent = ({ record }: {record: OrderDetailsInterface}) => {
  const {
    order_no,
    createdAt,
    served_by,
    order_payments,
    discount,
    discount_type,
    subtotal,
    total_vat_amount,
    vat_breakdown,
  } = record;

  const formattedCreatedAt = new Date(createdAt).toLocaleString();

  const paymentData = order_payments?.map((payment) => ({
    title: payment?.name,
    value: `Ksh.${payment?.amount?.toLocaleString()}`,
  }));

  // Format VAT breakdown for display
  const vatBreakdownItems = vat_breakdown
    ? Object.entries(vat_breakdown).map(([type, details]) => ({
        label: `VAT (${type})`,
        value: `Ksh.${details.amount?.toFixed(2)} (${(
          details.rate * 100
        ).toFixed(0)}%)`,
      }))
    : [];

  const singlePaymentDisplay =
    paymentData?.length === 1 ? (
      <span>
        {paymentData[0]?.title} - Amount: {paymentData[0]?.value}
      </span>
    ) : (
      <ul style={{ listStyleType: "none", paddingLeft: 0, marginTop: 0 }}>
        {paymentData?.map((payment) => (
          <li key={payment?.title}>
            {payment?.title} - {payment?.value}
          </li>
        ))}
      </ul>
    );

  return (
    <div style={{ padding: 16, background: "#fafafa" }}>
      <ProDescriptions column={2} bordered size="small">
        <ProDescriptions.Item label="Order Number">
          {order_no}
        </ProDescriptions.Item>
        <ProDescriptions.Item label="Date">
          {formattedCreatedAt}
        </ProDescriptions.Item>
        <ProDescriptions.Item label="Served By">
          {served_by?.username || "N/A"}
        </ProDescriptions.Item>
        <ProDescriptions.Item label="Payment Method">
          {singlePaymentDisplay}
        </ProDescriptions.Item>

        {/* Subtotal */}
        <ProDescriptions.Item label="Subtotal" span={2}>
          <strong>Ksh. {subtotal?.toFixed(2)}</strong>
        </ProDescriptions.Item>

        {/* VAT Breakdown */}
        {vatBreakdownItems.map((item, index) => (
          <ProDescriptions.Item key={index} label={item.label}>
            {item.value}
          </ProDescriptions.Item>
        ))}

        {/* Total VAT */}
        {total_vat_amount > 0 && (
          <ProDescriptions.Item label="Total VAT" span={2}>
            <Tag color="blue">Ksh. {total_vat_amount?.toFixed(2)}</Tag>
          </ProDescriptions.Item>
        )}

        {/* Discount */}
        {discount > 0 && (
          <ProDescriptions.Item
            label={`Discount (${discount_type || "fixed"})`}
            span={2}
          >
            <Tag color="orange">-Ksh. {discount?.toFixed(2)}</Tag>
          </ProDescriptions.Item>
        )}

        {/* Grand Total */}
        <ProDescriptions.Item label="Grand Total" span={2}>
          <strong>
            Ksh.{" "}
            {(
              (subtotal || 0) +
              (total_vat_amount || 0) -
              (discount || 0)
            ).toFixed(2)}
          </strong>
        </ProDescriptions.Item>
      </ProDescriptions>
    </div>
  );
};

export default ExpandedRowContent;
