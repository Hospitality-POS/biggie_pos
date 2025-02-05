import React from "react";
import { ProCard } from "@ant-design/pro-components";
import { FileDoneOutlined, PrinterFilled } from "@ant-design/icons";
import { Space, Typography } from "antd";
import AdminCustomersTable from "./CustomerTable";

const { Title } = Typography;

function AdminCustomersList() {
  return (
    <ProCard
      bordered
      tabs={{
        type: "card",
        defaultActiveKey: "customers",
        size: "large",
      }}
    >
      <ProCard.TabPane
        key="customers"
        tab={
          <Space>
            <FileDoneOutlined style={{ color: "#52c41a", fontSize: "18px" }} />
            <Typography.Text>All Customers</Typography.Text>
          </Space>
        }
      >
        <AdminCustomersTable />
      </ProCard.TabPane>
    </ProCard>
  );
}

export default AdminCustomersList;
