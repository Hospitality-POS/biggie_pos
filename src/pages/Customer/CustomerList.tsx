import React, { useState, useRef } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
    UserOutlined,
    CalendarOutlined,
    MessageOutlined,
    GiftOutlined,
    StarOutlined,
    CreditCardOutlined,
    UserAddOutlined,
    WalletOutlined,
} from "@ant-design/icons";
import { Space, Typography, Button } from "antd";
import CustomerTable from "./CustomerTable";
import Schedule from "../staff/schedule";
import AdminCustomersTable from "./CustomerTable";
import FeedbackTable from "./FeedbackTable";
import ConsultationTable from "./ConsultationTable";
import SubscriptionPackagesTable from "./SubscriptionPackagesTable";
import CustomerSubscriptionsTable from "./CustomerSubscriptionsTable";
import AddCustomerModal from "./AddCustomerModal";

const { Title } = Typography;

function Customers() {
    const [addCustomerModalVisible, setAddCustomerModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState("customers");
    const customerTableRef = useRef(null);

    const handleCustomerAdded = () => {
        // Refresh customer table after adding
        if (customerTableRef.current) {
            customerTableRef.current.reload();
        }
    };

    return (
        <>
            <ProCard
                bordered={false}
                style={{ borderRadius: 8 }}
                title={
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <Title level={3} style={{ margin: 0, fontWeight: 500 }}>
                            Customer Management
                        </Title>
                        {activeTab === "customers" && (
                            <Button
                                type="primary"
                                icon={<UserAddOutlined />}
                                onClick={() => setAddCustomerModalVisible(true)}
                            >
                                Add Customer
                            </Button>
                        )}
                    </Space>
                }
                tabs={{
                    type: "line",
                    defaultActiveKey: "customers",
                    size: "middle",
                    tabBarStyle: {
                        marginBottom: 24,
                        paddingLeft: 0,
                    },
                    onChange: setActiveTab,
                }}
            >
                <ProCard.TabPane
                    key="customers"
                    tab={
                        <Space size="small">
                            <UserOutlined />
                            <span>Customers</span>
                        </Space>
                    }
                >
                    <CustomerTable ref={customerTableRef} />
                </ProCard.TabPane>

                <ProCard.TabPane
                    key="packages"
                    tab={
                        <Space size="small">
                            <CreditCardOutlined />
                            <span>Packages</span>
                        </Space>
                    }
                >
                    <SubscriptionPackagesTable />
                </ProCard.TabPane>

                <ProCard.TabPane
                    key="subscriptions"
                    tab={
                        <Space size="small">
                            <WalletOutlined />
                            <span>Subscriptions</span>
                        </Space>
                    }
                >
                    <CustomerSubscriptionsTable />
                </ProCard.TabPane>

                <ProCard.TabPane
                    key="schedule"
                    tab={
                        <Space size="small">
                            <CalendarOutlined />
                            <span>Bookings</span>
                        </Space>
                    }
                >
                    <Schedule />
                </ProCard.TabPane>

                <ProCard.TabPane
                    key="consultations"
                    tab={
                        <Space size="small">
                            <StarOutlined />
                            <span>Consultations</span>
                        </Space>
                    }
                >
                    <ConsultationTable />
                </ProCard.TabPane>

                <ProCard.TabPane
                    key="feedback"
                    tab={
                        <Space size="small">
                            <MessageOutlined />
                            <span>Feedback</span>
                        </Space>
                    }
                >
                    <FeedbackTable />
                </ProCard.TabPane>

                <ProCard.TabPane
                    key="giftCards"
                    tab={
                        <Space size="small">
                            <GiftOutlined />
                            <span>Gift Cards</span>
                        </Space>
                    }
                >
                    <AdminCustomersTable nonCustomerEnabled={true} />
                </ProCard.TabPane>
            </ProCard>

            <AddCustomerModal
                visible={addCustomerModalVisible}
                onClose={() => setAddCustomerModalVisible(false)}
                onSuccess={handleCustomerAdded}
            />
        </>
    );
}

export default Customers;