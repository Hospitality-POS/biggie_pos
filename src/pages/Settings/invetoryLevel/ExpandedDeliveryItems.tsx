import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { List, Card, Typography, Space, Avatar, Button } from "antd";
import {
  DollarCircleOutlined,
  FieldTimeOutlined,
  InboxOutlined,
  NumberOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { ModalForm } from "@ant-design/pro-form";
import { useReactToPrint } from "react-to-print";
import "./delivery-note.css";
import useSystemDetails from "@hooks/useSystemDetails";
import { ENTITY_NAME } from "@utils/config";

const { Text } = Typography;

// Print Modal Component
const PrintDeliveryModal = ({ record, trigger }) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const {
    BRAND_NAME1,
    EMAIL_URL,
    PIN,
    PHONE_NO,
    QR_Code,
    Paybill_bs,
    Paybill_ac,
  } = useSystemDetails();
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const headerStyle = {
    fontFamily: "monospace",
    fontSize: "1.2em",
    margin: 0,
  };

  const labelStyle = {
    fontFamily: "monospace",
    fontSize: "1.2em",
    fontWeight: "bold",
  };


  const valueStyle = {
    fontFamily: "monospace",
    fontSize: "1.2em",
  };

  const totalAmount = record.delivery_items.reduce(
    (
      acc,
      value: {
        quantity: number;
        supplier_price: number;
      }
    ) => acc + value.supplier_price * value.quantity,
    0
  );



  return (
    <ModalForm
      className="deliveryNoteModal"
      modalProps={{
        centered: true,
        destroyOnClose: true,
        cancelText: "Cancel",
        okText: "Confirm Print",
        okButtonProps: { icon: <PrinterOutlined /> },
        width: "30%",
      }}
      trigger={trigger}
      onFinish={async () => {
        handlePrint();
        return true;
      }}
    >
      <div className="delivery-note" ref={componentRef}>
        <div className="header-print">
          <Typography.Title
            level={3}
            style={{ margin: "0 0 10px 0", textAlign: "center" }}
          >
            Delivery Note
          </Typography.Title>

          <Typography.Title
            level={3}
            style={{ ...headerStyle, textAlign: "center", margin: "0 0 5px 0" }}
          >
            {BRAND_NAME1}
          </Typography.Title>

          <Typography.Text
            style={{
              ...headerStyle,
              display: "block",
              textAlign: "center",
              marginBottom: "15px",
            }}
          >
            {ENTITY_NAME}
          </Typography.Text>

          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {/* Contact and Code Info */}
            <Space
              style={{ width: "100%", justifyContent: "space-between" }}
              direction="vertical"
            >
              <Space>
                <Typography.Text style={labelStyle}>Phone:</Typography.Text>
                <Typography.Text style={valueStyle}>{PHONE_NO}</Typography.Text>
              </Space>
              <Space>
                <Typography.Text style={labelStyle}>Code:</Typography.Text>
                <Typography.Text style={valueStyle}>
                  {record.code || "DN-" + record.code}
                </Typography.Text>
              </Space>
            </Space>

            {/* Delivery Info */}
            <Space
              style={{ width: "100%", justifyContent: "flex-start" }}
              direction="vertical"
            >
              <Space style={{ width: "100%", justifyContent: "flex-start" }}>
                <Typography.Text style={labelStyle}>
                  Delivered By:
                </Typography.Text>
                <Typography.Text style={valueStyle}>
                  {record.delivered_by}
                </Typography.Text>
              </Space>
              <Space style={{ width: "100%", justifyContent: "flex-start" }}>
                <Typography.Text style={labelStyle}>
                  Received By:
                </Typography.Text>
                <Typography.Text style={valueStyle}>
                  {record?.received_by?.fullname}
                </Typography.Text>
              </Space>
            </Space>

            {/* Supplier Info */}
            <Space style={{ width: "100%" }}>
              <Typography.Text style={labelStyle}>Supplier :</Typography.Text>
              <Typography.Text style={valueStyle}>
                {record.supplier_id?.name}
              </Typography.Text>
            </Space>
          </Space>
        </div>

        {/* Items Table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: 20,
            fontFamily: "monospace",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  padding: 8,
                  borderBottom: "1px solid #ddd",
                  textAlign: "left",
                  fontSize: "1.2em",
                }}
              >
                Item
              </th>

              {/* <th
                style={{
                  padding: 8,
                  borderBottom: "1px solid #ddd",
                  textAlign: "right",
                  fontSize: "1.2em",
                }}
              >
                Unit
              </th> */}
              <th
                style={{
                  padding: 8,
                  borderBottom: "1px solid #ddd",
                  textAlign: "center",
                  fontSize: "1.2em",
                }}
              >
                Qty
              </th>
              <th
                style={{
                  padding: 8,
                  borderBottom: "1px solid #ddd",
                  textAlign: "right",
                  fontSize: "1.2em",
                }}
              >
                Unit Price
              </th>
              <th
                style={{
                  padding: 8,
                  borderBottom: "1px solid #ddd",
                  textAlign: "right",
                  fontSize: "1.2em",
                }}
              >
                Total(Ksh)
              </th>
            </tr>
          </thead>
          <tbody>
            {record.delivery_items.map((item: any, index: number) => (
              <tr key={index}>
                <td
                  style={{
                    padding: 8,
                    borderBottom: "1px solid #ddd",
                    fontSize: "1.1em",
                  }}
                >
                  {item.inventory_id?.name || "N/A"}
                </td>
                {/* 
                <td
                  style={{
                    padding: 8,
                    borderBottom: "1px solid #ddd",
                    textAlign: "right",
                    fontSize: "1.1em",
                  }}
                >
                  {item.unit_id.name}
                </td> */}
                <td
                  style={{
                    padding: 8,
                    borderBottom: "1px solid #ddd",
                    textAlign: "center",
                    fontSize: "1.1em",
                  }}
                >
                  {item.quantity} {item.unit_id.name}
                </td>
                <td
                  style={{
                    padding: 8,
                    borderBottom: "1px solid #ddd",
                    textAlign: "right",
                    fontSize: "1.1em",
                  }}
                >
                  {item.supplier_price?.toLocaleString() || 0}
                </td>
                <td
                  style={{
                    padding: 8,
                    borderBottom: "1px solid #ddd",
                    textAlign: "right",
                    fontSize: "1.1em",
                  }}
                >
                  {(Number(item?.supplier_price) || 0) *
                    (Number(item?.quantity) || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Typography.Text
          strong
          style={{
            ...valueStyle,
            display: "block",
            textAlign: "center",
            marginTop: 10,
          }}
        >
          Total Cost : Ksh. {(Number(totalAmount) || 0).toLocaleString()}
        </Typography.Text>

        {/* QR Code Section */}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <QRCodeCanvas
            value={QR_Code}
            size={80}
            style={{ margin: "0 auto" }}
          />
          <Typography.Text
            style={{ ...valueStyle, display: "block", marginTop: 10 }}
          >
            Delivery Code: {record.code}
          </Typography.Text>
        </div>

        {/* Footer */}
        <Typography.Text
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 20,
            fontFamily: "monospace",
            fontSize: "0.9em",
          }}
        >
          This delivery note was generated on {new Date().toLocaleString()}
        </Typography.Text>
      </div>
    </ModalForm>
  );
};

// Original Expanded Component
const ExpandedDeliveryItems = ({ record }) => {
  return (
    <Card
      title={
        <Space style={{ display: "flex", justifyContent: "space-between" }}>
          <Typography style={{ fontSize: "18px" }}>Delivery Items</Typography>
          <PrintDeliveryModal
            record={record}
            trigger={
              <Button type="primary" icon={<PrinterOutlined />}>
                Print Delivery Note
              </Button>
            }
          />
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
                    <DollarCircleOutlined />
                    <Text strong>Price:</Text>
                    <Text>Ksh. {item?.supplier_price?.toFixed() || 0}</Text>
                  </Space>
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
