import React, { useRef, useState } from "react";
import {
  Typography,
  Card,
  Button,
  Space,
  Alert,
  Divider,
  Badge,
  Form,
} from "antd";
import {
  CalendarOutlined,
  TagOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import moment from "moment";
import { ProTable } from "@ant-design/pro-components";
import ChangeSubscriptionModal from "@components/MODALS/ChangeSubscription";
import PaymentModal from "@components/MODALS/ PaymentModal";
const { Title, Text } = Typography;

const PaymentSubscriptionPage = () => {
  const actionRef = useRef();

  let tenant = JSON.parse(localStorage.getItem("tenant"));

  tenant.next_billing_date = moment(tenant.next_billing_date).format(
    "MMMM Do YYYY, h:mm a"
  );

  const columns = [
    {
      title: "Invoice Code",
      dataIndex: "invoice_code",
      key: "invoice_code",
    },
    {
      title: "Description",
      dataIndex: "desc",
      key: "desc",
      ellipsis: true,
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
      hideInSearch: true,
      valueType: "dateTime",
      sorter: (a: any, b: any) =>
        new Date(a.createdAt as string) - new Date(b.createdAt as string),
    },
    {
      title: "Due Date",
      dataIndex: "due_date",
      hideInSearch: true,
      valueType: "dateTime",
      sorter: (a: any, b: any) =>
        new Date(a?.due_date as string) - new Date(b?.due_date as string),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: any) => `KES ${amount.toFixed(2)}`,
    },
    {
      title: "Status",
      dataIndex: "payment_status",
      key: "payment_status",
      render: (status: any) => (
        <Badge
          status={status === "Paid" ? "success" : "warning"}
          text={status.charAt(0).toUpperCase() + status.slice(1)}
        />
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) =>
        record.payment_status === "Unpaid" && (
          <PaymentModal data={record} actionRef={actionRef} />
        ),
    },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Current Subscription */}
      <Card style={{ marginBottom: "24px" }}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Title level={4}>
              <Space>
                <TagOutlined />
                Current Subscription
              </Space>
            </Title>
            <ChangeSubscriptionModal tenant={tenant} actionRef={actionRef} />
          </div>
          <Alert
            message={
              <Space direction="vertical">
                <Text strong>{tenant?.subscription_id?.name} Package</Text>
                <Space split={<Divider type="vertical" />}>
                  <Text>
                    Kes{" "}
                    {tenant?.subscription_cycle === "Yearly"
                      ? tenant?.subscription_id?.price[0]["Yearly"]
                      : tenant?.subscription_id?.price[0]["Monthly"]}{" "}
                    / {tenant?.subscription_cycle}
                  </Text>
                  <Text>
                    <CalendarOutlined /> Next billing:{" "}
                    {tenant?.next_billing_date}
                  </Text>
                </Space>
              </Space>
            }
            type="info"
            showIcon
          />
        </Space>
      </Card>

      {/* Invoices Section */}
      <Card>
        <Title level={4}>
          <Space>
            <FileTextOutlined />
            Invoices
          </Space>
        </Title>
        <ProTable
          search={false}
          columns={columns}
          dataSource={tenant?.invoices}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default PaymentSubscriptionPage;
