import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Card,
    Radio,
    Space,
    Typography,
    Alert,
    Spin,
    Tag,
    Divider,
    Progress,
    Tooltip,
} from "antd";
import {
    GiftOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    FireOutlined,
    InfoCircleOutlined,
} from "@ant-design/icons";
import {
    fetchCustomerActiveSubscriptions,
    calculateSubscriptionProgress,
    type CustomerSubscription,
} from "@services/subscription";

const { Text, Title } = Typography;

interface SubscriptionPaymentOptionProps {
    customerId?: string;
    onSubscriptionSelect: (subscriptionId: string | null) => void;
    selectedSubscription: string | null;
    orderAmount: number;
}

const SubscriptionPaymentOption: React.FC<SubscriptionPaymentOptionProps> = ({
    customerId,
    onSubscriptionSelect,
    selectedSubscription,
    orderAmount,
}) => {
    const { data: subscriptionsData, isLoading, error } = useQuery({
        queryKey: ["customer-active-subscriptions", customerId],
        queryFn: () =>
            customerId
                ? fetchCustomerActiveSubscriptions(customerId)
                : Promise.resolve({ subscriptions: [] }),
        enabled: !!customerId,
        retry: 2,
    });

    const activeSubscriptions = subscriptionsData?.subscriptions || [];

    // Show customer selection prompt
    if (!customerId) {
        return (
            <Card
                size="small"
                style={{
                    marginTop: 16,
                    borderColor: "#d9d9d9",
                    backgroundColor: "#fafafa",
                }}
            >
                <Space direction="vertical" style={{ width: "100%" }} align="center">
                    <GiftOutlined style={{ fontSize: "32px", color: "#bfbfbf" }} />
                    <Text type="secondary" style={{ textAlign: "center" }}>
                        Select a customer above to view available subscription packages
                    </Text>
                </Space>
            </Card>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <Card
                size="small"
                title={
                    <Space>
                        <GiftOutlined style={{ color: "#1890ff" }} />
                        <span>Checking Subscriptions...</span>
                    </Space>
                }
                style={{ marginTop: 16 }}
            >
                <Space style={{ width: "100%", justifyContent: "center", padding: "20px 0" }}>
                    <Spin size="large" />
                    <Text type="secondary">Loading available subscriptions...</Text>
                </Space>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Alert
                message="Error Loading Subscriptions"
                description="Could not fetch customer subscriptions. Please try again."
                type="error"
                showIcon
                style={{ marginTop: 16 }}
            />
        );
    }

    // No active subscriptions
    if (activeSubscriptions.length === 0) {
        return (
            <Card
                size="small"
                style={{
                    marginTop: 16,
                    borderColor: "#faad14",
                    backgroundColor: "#fffbe6",
                }}
            >
                <Space direction="vertical" style={{ width: "100%" }} align="center">
                    <InfoCircleOutlined style={{ fontSize: "32px", color: "#faad14" }} />
                    <Text strong style={{ textAlign: "center" }}>
                        No Active Subscriptions Available
                    </Text>
                    <Text type="secondary" style={{ textAlign: "center", fontSize: "12px" }}>
                        This customer doesn't have any active subscription packages with remaining visits.
                        They can purchase a package to enjoy prepaid services.
                    </Text>
                </Space>
            </Card>
        );
    }

    return (
        <Card
            size="small"
            title={
                <Space>
                    <GiftOutlined style={{ color: "#52c41a" }} />
                    <span>Use Subscription Visit</span>
                    <Tooltip title="Customer will use one prepaid visit from their subscription package">
                        <InfoCircleOutlined style={{ color: "#8c8c8c", fontSize: "14px" }} />
                    </Tooltip>
                </Space>
            }
            style={{ marginTop: 16, borderColor: "#52c41a" }}
        >
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
                {/* Info Alert */}
                <Alert
                    message={
                        <Space>
                            <Text strong>Subscription Payment</Text>
                            <Tag color="success">KSh. 0</Tag>
                        </Space>
                    }
                    description="Using a subscription visit means this order will be free (KSh. 0). One visit will be deducted from the selected package."
                    type="info"
                    showIcon
                    icon={<GiftOutlined />}
                    style={{ marginBottom: 8 }}
                />

                {/* Payment Options */}
                <Radio.Group
                    value={selectedSubscription}
                    onChange={(e) => onSubscriptionSelect(e.target.value)}
                    style={{ width: "100%" }}
                >
                    <Space direction="vertical" style={{ width: "100%" }} size="middle">
                        {/* Regular Payment Option */}
                        <Card
                            size="small"
                            hoverable
                            style={{
                                borderColor: selectedSubscription === null ? "#1890ff" : "#d9d9d9",
                                backgroundColor: selectedSubscription === null ? "#e6f7ff" : "white",
                                cursor: "pointer",
                            }}
                            onClick={() => onSubscriptionSelect(null)}
                        >
                            <Radio value={null}>
                                <Space direction="vertical" size="small">
                                    <Space>
                                        <Text strong style={{ fontSize: "16px" }}>
                                            Pay Normally
                                        </Text>
                                        <Tag color="blue">KSh. {orderAmount.toLocaleString()}</Tag>
                                    </Space>
                                    <Text type="secondary" style={{ fontSize: "12px" }}>
                                        Customer will pay the full amount using a payment method
                                    </Text>
                                </Space>
                            </Radio>
                        </Card>

                        <Divider style={{ margin: "8px 0" }}>OR</Divider>

                        {/* Subscription Options */}
                        {activeSubscriptions.map((subscription: CustomerSubscription) => {
                            const progress = calculateSubscriptionProgress(subscription);
                            const packageInfo = typeof subscription.package_id === 'object'
                                ? subscription.package_id
                                : null;

                            return (
                                <Card
                                    key={subscription._id}
                                    size="small"
                                    hoverable
                                    style={{
                                        borderColor: selectedSubscription === subscription._id ? "#52c41a" : "#d9d9d9",
                                        backgroundColor: selectedSubscription === subscription._id ? "#f6ffed" : "white",
                                        cursor: "pointer",
                                    }}
                                    onClick={() => onSubscriptionSelect(subscription._id)}
                                >
                                    <Radio value={subscription._id} style={{ width: "100%" }}>
                                        <Space direction="vertical" size="small" style={{ width: "100%" }}>
                                            {/* Package Name and Status */}
                                            <Space style={{ justifyContent: "space-between", width: "100%" }}>
                                                <Space>
                                                    <Text strong style={{ fontSize: "16px" }}>
                                                        {packageInfo?.name || "Subscription Package"}
                                                    </Text>
                                                    <Tag color="green" icon={<CheckCircleOutlined />}>
                                                        Active
                                                    </Tag>
                                                </Space>
                                            </Space>

                                            {/* Subscription Code */}
                                            <Text type="secondary" style={{ fontSize: "12px" }}>
                                                Code: <Text code>{subscription.subscription_code}</Text>
                                            </Text>

                                            {/* Visits Progress */}
                                            <div>
                                                <Space style={{ justifyContent: "space-between", width: "100%", marginBottom: 4 }}>
                                                    <Text strong style={{ fontSize: "13px" }}>
                                                        Visits Remaining
                                                    </Text>
                                                    <Text strong style={{ color: "#52c41a" }}>
                                                        {subscription.visits_remaining} / {subscription.total_visits_allowed}
                                                    </Text>
                                                </Space>
                                                <Progress
                                                    percent={progress.visitPercentage}
                                                    strokeColor={{
                                                        "0%": "#52c41a",
                                                        "100%": "#95de64",
                                                    }}
                                                    status={subscription.visits_remaining > 0 ? "active" : "exception"}
                                                    showInfo={false}
                                                    size="small"
                                                />
                                            </div>

                                            {/* Tags */}
                                            <Space size="small" wrap>
                                                <Tag color="blue" icon={<FireOutlined />}>
                                                    {subscription.visits_remaining} visits left
                                                </Tag>
                                                <Tag color="orange" icon={<ClockCircleOutlined />}>
                                                    {progress.daysRemaining} days left
                                                </Tag>
                                                {progress.visitPercentage > 75 && (
                                                    <Tag color="red">Running Low</Tag>
                                                )}
                                            </Space>

                                            {/* Expiry Date */}
                                            <Text type="secondary" style={{ fontSize: "11px" }}>
                                                Valid until: {new Date(subscription.end_date).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </Text>

                                            {/* Package Description if available */}
                                            {packageInfo?.desc && (
                                                <Text type="secondary" style={{ fontSize: "11px", fontStyle: "italic" }}>
                                                    {packageInfo.desc}
                                                </Text>
                                            )}
                                        </Space>
                                    </Radio>
                                </Card>
                            );
                        })}
                    </Space>
                </Radio.Group>

                {/* Selected Subscription Alert */}
                {selectedSubscription && (
                    <Alert
                        message={
                            <Space>
                                <CheckCircleOutlined />
                                <Text strong>Subscription Visit Selected</Text>
                            </Space>
                        }
                        description={
                            <Space direction="vertical" size="small">
                                <Text>Order amount will be <Text strong style={{ color: "#52c41a" }}>KSh. 0</Text></Text>
                                <Text type="secondary" style={{ fontSize: "12px" }}>
                                    One visit will be deducted from the selected subscription package
                                </Text>
                            </Space>
                        }
                        type="success"
                        showIcon
                        style={{ marginTop: 8 }}
                    />
                )}

                {/* Help Text */}
                {activeSubscriptions.length > 1 && !selectedSubscription && (
                    <Alert
                        message={
                            <Text style={{ fontSize: "12px" }}>
                                <InfoCircleOutlined /> This customer has {activeSubscriptions.length} active subscription packages.
                                Select one to use a prepaid visit for this order.
                            </Text>
                        }
                        type="info"
                        style={{ marginTop: 8 }}
                    />
                )}
            </Space>
        </Card>
    );
};

export default SubscriptionPaymentOption;