import React from "react";
import { ProCard } from "@ant-design/pro-components";
import {
    FileDoneOutlined,
    PrinterFilled,
    GiftOutlined,
    MessageOutlined,
    CalendarOutlined
} from "@ant-design/icons";
import { Space, Typography } from "antd";
import CustomerTable from "./CustomerTable";
import Schedule from "../staff/schedule";
import AdminCustomersTable from "./CustomerTable";
import FeedbackTable from "./FeedbackTable";
import ConsultationTable from "./ConsultationTable";

const { Title } = Typography;

function Customers() {
    return (
        <ProCard
            bordered
            title={
                <Space>
                    <PrinterFilled style={{ fontSize: "24px", color: "#6c1c2c" }} />
                    <Title level={4} style={{ margin: 0 }}>
                        List of All Customers
                    </Title>
                </Space>
            }
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
                        <Typography.Text>Customers</Typography.Text>
                    </Space>
                }
            >
                <CustomerTable />
            </ProCard.TabPane>
            <ProCard.TabPane
                key="schedule"
                tab={
                    <Space>
                        <FileDoneOutlined style={{ color: "#52c41a", fontSize: "18px" }} />
                        <Typography.Text>Booking Schedule</Typography.Text>
                    </Space>
                }
            >
                <Schedule />
            </ProCard.TabPane>
            <ProCard.TabPane
                key="consultations"
                tab={
                    <Space>
                        <CalendarOutlined style={{ color: "#722ed1", fontSize: "18px" }} />
                        <Typography.Text>Consultations</Typography.Text>
                    </Space>
                }
            >
                <ConsultationTable />
            </ProCard.TabPane>
            <ProCard.TabPane
                key="feedback"
                tab={
                    <Space>
                        <MessageOutlined style={{ color: "#1890ff", fontSize: "18px" }} />
                        <Typography.Text>Customer Feedback</Typography.Text>
                    </Space>
                }
            >
                <FeedbackTable />
            </ProCard.TabPane>
            <ProCard.TabPane
                key="giftCards"
                tab={
                    <Space>
                        <GiftOutlined style={{ color: "#9a6e44", fontSize: "18px" }} />
                        <Typography.Text>Gift Certificates</Typography.Text>
                    </Space>
                }
            >
                <AdminCustomersTable nonCustomerEnabled={true} />
            </ProCard.TabPane>
        </ProCard>
    );
}

export default Customers;