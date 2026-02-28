import { ProDescriptions } from "@ant-design/pro-components";
import { List, Tag } from "antd";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductRef {
  _id: string;
  name: string;
  price: number;
}

interface UserRef {
  _id: string;
  username: string;
}

interface VATDetail {
  rate: number;
  amount: number;
  net: number;
}

interface InvoiceItem {
  _id: string;
  product_id?: ProductRef;
  quantity: number;
  price: number;
  vat_amount: number;
}

export interface InvoiceDetailsInterface {
  _id: string;
  order_no: string;
  createdAt: string;
  served_by?: UserRef;
  created_by?: UserRef;
  items: InvoiceItem[];
  subtotal: number;
  total_vat_amount: number;
  vat_breakdown?: Record<string, VATDetail>;
  discount_amount: number;
  vat_pricing_mode?: string;
  grand_total: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ExpandableInvoice = ({ record }: { record: InvoiceDetailsInterface }) => {
  const {
    items,
    served_by,
    created_by,
    subtotal,
    total_vat_amount,
    vat_breakdown,
    discount_amount,
    vat_pricing_mode,
    grand_total,
    order_no,
    createdAt,
  } = record;

  const vatBreakdownItems = vat_breakdown
    ? Object.entries(vat_breakdown).map(([type, details]) => ({
      label: `VAT (${type})`,
      value: `Ksh.${details?.amount?.toFixed(2) || "0.00"} (${(
        (details?.rate || 0) * 100
      ).toFixed(0)}%)`,
    }))
    : [];

  return (
    <div style={{ padding: 16, background: "#fafafa" }}>
      <ProDescriptions column={2} bordered size="small">
        <ProDescriptions.Item label="Invoice Number">{order_no}</ProDescriptions.Item>
        <ProDescriptions.Item label="Date">
          {new Date(createdAt).toLocaleString()}
        </ProDescriptions.Item>
        <ProDescriptions.Item label="Served By">
          {served_by?.username || "N/A"}
        </ProDescriptions.Item>
        <ProDescriptions.Item label="Created By">
          {created_by?.username || "N/A"}
        </ProDescriptions.Item>

        <ProDescriptions.Item label="Items" span={2}>
          <List
            size="small"
            dataSource={items}
            renderItem={(item) => (
              <List.Item>
                <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                  <span>
                    {item.quantity}x {item.product_id?.name || "—"}
                  </span>
                  <div>
                    <span>Ksh. {item.price.toFixed(2)}</span>
                    {item.vat_amount > 0 && (
                      <Tag color="blue" style={{ marginLeft: 8 }}>
                        VAT: Ksh. {item.vat_amount.toFixed(2)}
                      </Tag>
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </ProDescriptions.Item>

        {vat_pricing_mode && (
          <ProDescriptions.Item label="Pricing Mode" span={2}>
            {vat_pricing_mode}
          </ProDescriptions.Item>
        )}

        <ProDescriptions.Item label="Subtotal" span={2}>
          <strong>Ksh. {subtotal?.toFixed(2) || "0.00"}</strong>
        </ProDescriptions.Item>

        {vatBreakdownItems.map((item, index) => (
          <ProDescriptions.Item key={index} label={item.label}>
            {item.value}
          </ProDescriptions.Item>
        ))}

        {total_vat_amount > 0 && (
          <ProDescriptions.Item label="Total VAT" span={2}>
            <Tag color="blue">Ksh. {total_vat_amount?.toFixed(2) || "0.00"}</Tag>
          </ProDescriptions.Item>
        )}

        {discount_amount > 0 && (
          <ProDescriptions.Item label="Discount" span={2}>
            <Tag color="orange">-Ksh. {discount_amount?.toFixed(2) || "0.00"}</Tag>
          </ProDescriptions.Item>
        )}

        <ProDescriptions.Item label="Grand Total" span={2}>
          <strong style={{ fontSize: 15, color: "#1d39c4" }}>
            Ksh. {grand_total?.toFixed(2) || "0.00"}
          </strong>
        </ProDescriptions.Item>
      </ProDescriptions>
    </div>
  );
};

export default ExpandableInvoice;