// import React, { useRef, useState } from "react";
// import {
//   Typography,
//   Card,
//   Button,
//   Space,
//   Alert,
//   Divider,
//   Badge,
//   Form,
// } from "antd";
// import {
//   CalendarOutlined,
//   TagOutlined,
//   FileTextOutlined,
// } from "@ant-design/icons";
// import moment from "moment";
// import { ProTable } from "@ant-design/pro-components";
// import ChangeSubscriptionModal from "@components/MODALS/ChangeSubscription";
// import PaymentModal from "@components/MODALS/ PaymentModal";
// const { Title, Text } = Typography;

// const PaymentSubscriptionPage = () => {
//   const actionRef = useRef();

//   let tenant = JSON.parse(localStorage.getItem("tenant"));

//   tenant.next_billing_date = moment(tenant.next_billing_date).format(
//     "MMMM Do YYYY, h:mm a"
//   );

//   const columns = [
//     {
//       title: "Invoice Code",
//       dataIndex: "invoice_code",
//       key: "invoice_code",
//     },
//     {
//       title: "Description",
//       dataIndex: "desc",
//       key: "desc",
//       ellipsis: true,
//     },
//     {
//       title: "Created Date",
//       dataIndex: "createdAt",
//       hideInSearch: true,
//       valueType: "dateTime",
//       sorter: (a: any, b: any) =>
//         new Date(a.createdAt as string) - new Date(b.createdAt as string),
//     },
//     {
//       title: "Due Date",
//       dataIndex: "due_date",
//       hideInSearch: true,
//       valueType: "dateTime",
//       sorter: (a: any, b: any) =>
//         new Date(a?.due_date as string) - new Date(b?.due_date as string),
//     },
//     {
//       title: "Amount",
//       dataIndex: "amount",
//       key: "amount",
//       render: (amount: any) => `KES ${amount.toFixed(2)}`,
//     },
//     {
//       title: "Status",
//       dataIndex: "payment_status",
//       key: "payment_status",
//       render: (status: any) => (
//         <Badge
//           status={status === "Paid" ? "success" : "warning"}
//           text={status.charAt(0).toUpperCase() + status.slice(1)}
//         />
//       ),
//     },
//     {
//       title: "Action",
//       key: "action",
//       render: (_, record) =>
//         record.payment_status === "Unpaid" && (
//           <PaymentModal data={record} actionRef={actionRef} />
//         ),
//     },
//   ];

//   return (
//     <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
//       {/* Current Subscription */}
//       <Card style={{ marginBottom: "24px" }}>
//         <Space direction="vertical" size="middle" style={{ width: "100%" }}>
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//             }}
//           >
//             <Title level={4}>
//               <Space>
//                 <TagOutlined />
//                 Current Subscription
//               </Space>
//             </Title>
//             <ChangeSubscriptionModal tenant={tenant} actionRef={actionRef} />
//           </div>
//           <Alert
//             message={
//               <Space direction="vertical">
//                 <Text strong>{tenant?.subscription_id?.name} Package</Text>
//                 <Space split={<Divider type="vertical" />}>
//                   <Text>
//                     Kes{" "}
//                     {tenant?.subscription_cycle === "Yearly"
//                       ? tenant?.subscription_id?.price[0]["Yearly"]
//                       : tenant?.subscription_id?.price[0]["Monthly"]}{" "}
//                     / {tenant?.subscription_cycle}
//                   </Text>
//                   <Text>
//                     <CalendarOutlined /> Next billing:{" "}
//                     {tenant?.next_billing_date}
//                   </Text>
//                 </Space>
//               </Space>
//             }
//             type="info"
//             showIcon
//           />
//         </Space>
//       </Card>

//       {/* Invoices Section */}
//       <Card>
//         <Title level={4}>
//           <Space>
//             <FileTextOutlined />
//             Invoices
//           </Space>
//         </Title>
//         <ProTable
//           search={false}
//           columns={columns}
//           dataSource={tenant?.invoices}
//           rowKey="id"
//           pagination={false}
//         />
//       </Card>
//     </div>
//   );
// };

// export default PaymentSubscriptionPage;

import React from "react";
import { ProCard } from "@ant-design/pro-components";
import { Typography, Space, Avatar, Row, Col, Button } from "antd";
import {
  ClockCircleOutlined,
  UserOutlined,
  BuildOutlined,
  ToolOutlined,
  RocketOutlined,
  NotificationOutlined,
} from "@ant-design/icons";

const { Title, Paragraph } = Typography;

const ComingSoon: React.FC = () => {
  const avatarStyle: React.CSSProperties = {
    backgroundColor: "#f5f5f5",
    color: "#1890ff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    padding: "12px",
    fontSize: "24px",
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: "8px",
    marginBottom: "16px",
    backgroundColor: "#ffffff",
    transition: "all 0.3s",
  };

  return (
    <>
      <div style={{ padding: "40px 24px" }}>
        <Space size="middle" style={{ marginBottom: "12px" }}>
          <ClockCircleOutlined style={{ color: "#6c1c2c", fontSize: "24px" }} />
          <Title level={3} style={{ margin: 0 }}>
            Coming Soon
          </Title>
        </Space>
        <Paragraph
          style={{ fontSize: "24px", fontWeight: 500, marginBottom: "48px" }}
        >
          We're cooking up something special for you
        </Paragraph>

        <Row
          gutter={[24, 24]}
          justify="center"
          style={{ marginBottom: "48px" }}
        >
          {[
            {
              icon: (
                <BuildOutlined style={{ fontSize: "32px", color: "#6c1c2c" }} />
              ),
              title: "In Development",
              description: "Crafting the perfect experience",
            },
            {
              icon: (
                <ToolOutlined style={{ fontSize: "32px", color: "#6c1c2c" }} />
              ),
              title: "Fine Tuning",
              description: "Perfecting every detail",
            },
            {
              icon: (
                <RocketOutlined
                  style={{ fontSize: "32px", color: "#6c1c2c" }}
                />
              ),
              title: "Launch Ready",
              description: "Preparing for takeoff",
            },
          ].map((item, index) => (
            <Col xs={24} sm={12} md={8} key={index}>
              <ProCard style={cardStyle} hoverable>
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ width: "100%" }}
                >
                  <Avatar size={64} style={avatarStyle}>
                    {item.icon}
                  </Avatar>
                  <Title level={4} style={{ margin: 0 }}>
                    {item.title}
                  </Title>
                  <Paragraph style={{ margin: 0, color: "#666" }}>
                    {item.description}
                  </Paragraph>
                </Space>
              </ProCard>
            </Col>
          ))}
        </Row>

        <Space
          direction="vertical"
          size="large"
          style={{ width: "100%", maxWidth: "600px", margin: "0 auto" }}
        >
          <div
            style={{
              padding: "24px",
              backgroundColor: "#f0f5ff",
              borderRadius: "8px",
              marginBottom: "24px",
            }}
          >
            <Space size="middle">
              <Avatar.Group>
                {[...Array(4)].map((_, index) => (
                  <Avatar
                    key={index}
                    style={{
                      backgroundColor: index % 2 === 0 ? "#6c1c2c" : "#7f767f",
                    }}
                    icon={<UserOutlined />}
                  />
                ))}
              </Avatar.Group>
              <Paragraph style={{ margin: 0 }}>
                Our team is working hard to bring this to you
              </Paragraph>
            </Space>
          </div>

          <Button type="primary" size="large" icon={<NotificationOutlined />}>
            Notify Me When Ready
          </Button>
        </Space>
      </div>
    </>
  );
};

export default ComingSoon;

