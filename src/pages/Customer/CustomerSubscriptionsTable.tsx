import React, { useRef, useState } from "react";
import {
    ProTable,
    ProColumns,
    ActionType,
} from "@ant-design/pro-components";
import {
    Button,
    Space,
    Tag,
    Typography,
    Modal,
    Descriptions,
    Progress,
    Card,
    Statistic,
    Row,
    Col,
} from "antd";
import {
    EyeOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    StopOutlined,
} from "@ant-design/icons";
import {
    fetchAllSubscriptions,
    fetchSubscriptionById,
    CustomerSubscription,
} from "@services/subscription";

const { Text } = Typography;

const CustomerSubscriptionsTable: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<CustomerSubscription | null>(null);
    const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Fetch subscriptions
    const fetchSubscriptions = async (params: any) => {
        try {
            const response = await fetchAllSubscriptions({
                ...params,
                page: params.current,
                limit: params.pageSize,
            });

            return {
                data: response.subscriptions || [],
                success: true,
                total: response.totalSubscriptions || 0,
            };
        } catch (error) {
            return {
                data: [],
                success: false,
                total: 0,
            };
        }
    };

    // View subscription details
    const handleViewDetails = async (record: CustomerSubscription) => {
        setSelectedSubscription(record);
        setDetailsModalVisible(true);
        setLoadingDetails(true);

        try {
            const details = await fetchSubscriptionById(record._id);
            setSubscriptionDetails(details);
        } catch (error) {
            console.error("Error loading subscription details:", error);
        } finally {
            setLoadingDetails(false);
        }
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case "Active":
                return "success";
            case "Expired":
                return "warning";
            case "Exhausted":
                return "default";
            case "Cancelled":
                return "error";
            default:
                return "default";
        }
    };

    // Get status icon
    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Active":
                return <CheckCircleOutlined />;
            case "Expired":
                return <ClockCircleOutlined />;
            case "Exhausted":
            case "Cancelled":
                return <StopOutlined />;
            default:
                return null;
        }
    };

    // Table columns
    const columns: ProColumns<CustomerSubscription>[] = [
        {
            title: "Subscription Code",
            dataIndex: "subscription_code",
            key: "subscription_code",
            width: 150,
            fixed: "left",
            render: (text) => <Text strong copyable>{text}</Text>,
        },
        {
            title: "Customer",
            dataIndex: ["customer_id", "customer_name"],
            key: "customer_name",
            width: 180,
            ellipsis: true,
        },
        {
            title: "Package",
            dataIndex: ["package_id", "name"],
            key: "package_name",
            width: 180,
            ellipsis: true,
        },
        {
            title: "Visits",
            key: "visits",
            width: 180,
            render: (_, record) => {
                const percentage = (record.visits_used / record.total_visits_allowed) * 100;
                return (
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Text>
                            {record.visits_used} / {record.total_visits_allowed} used
                        </Text>
                        <Progress
                            percent={percentage}
                            size="small"
                            status={percentage >= 100 ? "exception" : "active"}
                            showInfo={false}
                        />
                    </Space>
                );
            },
        },
        {
            title: "Visits Remaining",
            dataIndex: "visits_remaining",
            key: "visits_remaining",
            width: 120,
            align: "center",
            render: (remaining) => (
                <Tag color={remaining > 0 ? "blue" : "red"}>
                    {remaining}
                </Tag>
            ),
        },
        {
            title: "Amount",
            dataIndex: "purchase_amount",
            key: "purchase_amount",
            width: 120,
            align: "right",
            render: (amount) => (
                <Text strong style={{ color: "#52c41a" }}>
                    KES {amount?.toLocaleString()}
                </Text>
            ),
        },
        {
            title: "Start Date",
            dataIndex: "start_date",
            key: "start_date",
            width: 120,
            valueType: "date",
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: "End Date",
            dataIndex: "end_date",
            key: "end_date",
            width: 120,
            valueType: "date",
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 120,
            filters: [
                { text: "Active", value: "Active" },
                { text: "Expired", value: "Expired" },
                { text: "Exhausted", value: "Exhausted" },
                { text: "Cancelled", value: "Cancelled" },
            ],
            render: (status) => (
                <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
                    {status}
                </Tag>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 100,
            fixed: "right",
            render: (_, record) => (
                <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDetails(record)}
                >
                    Details
                </Button>
            ),
        },
    ];

    return (
        <>
            <ProTable<CustomerSubscription>
                columns={columns}
                actionRef={actionRef}
                request={fetchSubscriptions}
                rowKey="_id"
                search={{
                    labelWidth: "auto",
                    defaultCollapsed: false,
                }}
                pagination={{
                    defaultPageSize: 20,
                    showSizeChanger: true,
                    showQuickJumper: true,
                }}
                dateFormatter="string"
                headerTitle="Customer Subscriptions"
                scroll={{ x: 1600 }}
            />

            {/* Subscription Details Modal */}
            <Modal
                title="Subscription Details"
                open={detailsModalVisible}
                onCancel={() => {
                    setDetailsModalVisible(false);
                    setSelectedSubscription(null);
                    setSubscriptionDetails(null);
                }}
                footer={[
                    <Button
                        key="close"
                        onClick={() => {
                            setDetailsModalVisible(false);
                            setSelectedSubscription(null);
                            setSubscriptionDetails(null);
                        }}
                    >
                        Close
                    </Button>,
                ]}
                width={800}
            >
                {selectedSubscription && (
                    <Space direction="vertical" style={{ width: "100%" }} size="large">
                        {/* Statistics Cards */}
                        <Row gutter={16}>
                            <Col span={8}>
                                <Card>
                                    <Statistic
                                        title="Total Visits"
                                        value={selectedSubscription.total_visits_allowed}
                                        valueStyle={{ color: "#1890ff" }}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card>
                                    <Statistic
                                        title="Visits Used"
                                        value={selectedSubscription.visits_used}
                                        valueStyle={{ color: "#722ed1" }}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card>
                                    <Statistic
                                        title="Visits Remaining"
                                        value={selectedSubscription.visits_remaining}
                                        valueStyle={{
                                            color: selectedSubscription.visits_remaining > 0
                                                ? "#52c41a"
                                                : "#f5222d",
                                        }}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        {/* Subscription Details */}
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="Subscription Code" span={2}>
                                <Text strong copyable>
                                    {selectedSubscription.subscription_code}
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Customer">
                                {selectedSubscription.customer_id?.customer_name}
                            </Descriptions.Item>
                            <Descriptions.Item label="Package">
                                {selectedSubscription.package_id?.name}
                            </Descriptions.Item>
                            <Descriptions.Item label="Purchase Amount">
                                <Text strong style={{ color: "#52c41a" }}>
                                    KES {selectedSubscription.purchase_amount?.toLocaleString()}
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Payment Status">
                                <Tag color={selectedSubscription.payment_status === "Paid" ? "success" : "warning"}>
                                    {selectedSubscription.payment_status}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Start Date">
                                {new Date(selectedSubscription.start_date).toLocaleDateString()}
                            </Descriptions.Item>
                            <Descriptions.Item label="End Date">
                                {new Date(selectedSubscription.end_date).toLocaleDateString()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Status" span={2}>
                                <Tag
                                    color={getStatusColor(selectedSubscription.status)}
                                    icon={getStatusIcon(selectedSubscription.status)}
                                >
                                    {selectedSubscription.status}
                                </Tag>
                            </Descriptions.Item>
                            {selectedSubscription.cancellation_reason && (
                                <Descriptions.Item label="Cancellation Reason" span={2}>
                                    {selectedSubscription.cancellation_reason}
                                </Descriptions.Item>
                            )}
                        </Descriptions>
                    </Space>
                )}
            </Modal>
        </>
    );
};

export default CustomerSubscriptionsTable;