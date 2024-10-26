import React from "react";
import { List, Card, Typography, Space, Avatar, Button, message } from "antd";
import {
  FieldTimeOutlined,
  InboxOutlined,
  NumberOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { printDeliveryNote } from "@services/deliveries";

const { Text, Title } = Typography;

const ExpandedDeliveryItems = ({ record }) => {
  const printDeliveryNoteMutation = useMutation(printDeliveryNote, {
    onSuccess: () => {
      message.success("Delivery note printed successfully");
    },
    onError: () => message.error("Failed to print delivery note"),
  });

  return (
    <Card
      title={
        <Space style={{ display: "flex", justifyContent: "space-between" }}>
          <Typography style={{ fontSize: "18px" }}>Delivery Items</Typography>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            loading={printDeliveryNoteMutation.isLoading}
            onClick={() => printDeliveryNoteMutation.mutate(record._id)}
          >
            {printDeliveryNoteMutation.isLoading
              ? "Printing..."
              : "Print Delivery Note"}
          </Button>
        </Space>
      }
      bordered={false}
      style={{ margin: "0 16px", background: "#f0f2f5" }}
    >
      <List
        itemLayout="horizontal"
        dataSource={record.delivery_items}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar icon={<InboxOutlined />} />}
              title={item.inventory_id ? item.inventory_id.name : "N/A"}
              description={
                <Space direction="vertical" size="small">
                  <Space>
                    <NumberOutlined />
                    <Text strong>Quantity:</Text>
                    <Text>
                      {item.quantity} {item.unit_id.name}
                    </Text>
                  </Space>
                  <Space>
                    <FieldTimeOutlined />
                    <Text strong>Created:</Text>
                    <Text>{new Date(item.createdAt).toLocaleString()}</Text>
                  </Space>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default ExpandedDeliveryItems;
