import { ProDescriptions } from "@ant-design/pro-components";
import { Typography, List, Divider } from "antd";

interface InvoiceDetailsInterface {
  served_by: {
    username: string;
  };
  created_by: {
    username: string;
  };
  items: {
    product_id: {
      name: string;
    };
    price: number;
    quantity: number;
  }[];
}

interface ExpandedRowContentProps {
  record: InvoiceDetailsInterface;
}

const ExpandedRowContent = ({ record }: ExpandedRowContentProps) => {
  const { served_by, created_by, items } = record;

  const data = [
    {
      title: "Served by",
      dataIndex: ["served_by", "username"],
      value: served_by?.username,
    },
    {
      title: "Created by",
      dataIndex: ["created_by", "username"],
      value: created_by?.username,
    },
  ];

  // Calculate total price with NaN check
  const totalPrice = items.reduce((sum: number, item: any) => {
    const itemTotal = item.price * item.quantity;
    return sum + (isNaN(itemTotal) ? 0 : itemTotal);
  }, 0);

  // Function to safely format price
  const formatPrice = (price: number) => {
    return isNaN(price) ? "0" : price.toLocaleString();
  };

  return (
    <>
      <ProDescriptions
        size="small"
        style={{ paddingLeft: 28 }}
        tooltip="Contains more information about the invoice"
        layout="horizontal"
        title="Additional Information"
        dataSource={{
          served_by,
          created_by,
        }}
        columns={data}
      />
      <Typography.Title level={5} style={{ marginTop: 16, paddingLeft: 28 }}>
        Invoice Items
      </Typography.Title>
      <List
        size="small"
        style={{ paddingLeft: 28, paddingRight: 28 }}
        dataSource={items}
        renderItem={(item: any, index: number) => (
          <List.Item
            key={item._id}
            extra={`Ksh.${formatPrice(item.price * item.quantity)}`}
          >
            <List.Item.Meta
              title={
                <span>
                  {index + 1}. {item.product_id?.name}
                </span>
              }
              description={`Ksh.${formatPrice(item.price)} x ${item.quantity}`}
            />
          </List.Item>
        )}
      />
      <Divider />
      <div style={{ paddingLeft: 28, paddingRight: 28, textAlign: "right" }}>
        <Typography.Text strong>
          Total: Ksh.{formatPrice(totalPrice)}
        </Typography.Text>
      </div>
    </>
  );
};

export default ExpandedRowContent;
