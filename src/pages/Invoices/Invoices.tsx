
import React from "react";
import { ProCard } from "@ant-design/pro-components";
import { FileDoneOutlined, PrinterFilled } from "@ant-design/icons";
import { Space, Typography } from "antd";
import InvoiceTable from "./InvoiceTable";

const { Title } = Typography;

function Invoices() {
  return (
    <ProCard
      bordered
      title={
        <Space>
          <PrinterFilled style={{ fontSize: "24px", color: "#6c1c2c" }} />
          <Title level={4} style={{ margin: 0 }}>
            List of All Invoices Printed
          </Title>
        </Space>
      }
      tabs={{
        type: "card",
        defaultActiveKey: "invoices",
        size: "large",
      }}
    >
      <ProCard.TabPane
        key="invoices"
        tab={
          <Space>
            <FileDoneOutlined style={{ color: "#52c41a", fontSize: "18px" }} />
            <Typography.Text>Invoices</Typography.Text>
          </Space>
        }
      >
        <InvoiceTable />
      </ProCard.TabPane>
    </ProCard>
  );
}

export default Invoices;