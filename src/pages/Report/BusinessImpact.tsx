import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Row, Col, Statistic, Select, Spin, Typography, Button, Space, Tooltip } from "antd";
import {
    ThunderboltOutlined,
    DollarOutlined,
    ShoppingCartOutlined,
    UserOutlined,
    MessageOutlined,
    CheckCircleOutlined,
    TeamOutlined,
    RiseOutlined,
    CloseOutlined,
} from "@ant-design/icons";
import { fetchBusinessImpact, type BusinessImpactData } from "@services/whatsappService";

const { Paragraph, Text, Title } = Typography;
const { Option } = Select;

interface Props {
    hasDuka?: boolean;
    hasPesa?: boolean;
    hasDala?: boolean;
}

const BusinessImpact: React.FC<Props> = ({ hasDuka, hasPesa, hasDala }) => {
    const [days, setDays] = useState(30);
    const [visible, setVisible] = useState(false);

    const shopId = useMemo(() => {
        try {
            const id = localStorage.getItem("shopId");
            return id && id !== "{}" && id !== "null" ? id : "";
        } catch {
            return "";
        }
    }, []);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["business-impact", shopId || "all", days],
        queryFn: () =>
            fetchBusinessImpact(shopId ? { shop_id: shopId, days } : { days }) as Promise<BusinessImpactData>,
        enabled: visible,
    });

    const stats = data;

    // Revenue/Orders only make sense when Duka, Pesa, or Dala are enabled
    const showCommerceStats = !!(hasDuka || hasPesa || hasDala);
    // If Dala is the only commerce-producing module enabled, call it "Sales"
    const ordersLabel = hasDala && !hasDuka && !hasPesa ? "Sales" : "Orders";

    const formatMoney = (val?: number) =>
        val === undefined || val === null
            ? "--"
            : `KES ${val.toLocaleString()}`;

    if (!visible) {
        return (
            <Card
                style={{
                    marginBottom: 24,
                    borderRadius: 14,
                    background: "linear-gradient(135deg, #fef3c7 0%, #fef9e7 60%, #ffffff 100%)",
                    border: "1px solid #fde68a",
                    cursor: "pointer",
                }}
                bodyStyle={{ padding: "20px 24px" }}
                onClick={() => setVisible(true)}
                hoverable
            >
                <Space size={16} align="center">
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #faad14, #fa8c16)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: "0 4px 12px rgba(250,140,22,0.35)",
                        }}
                    >
                        <ThunderboltOutlined style={{ fontSize: 20, color: "#fff" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <Title level={5} style={{ margin: 0 }}>
                            AI Business Impact
                        </Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Get an AI-powered snapshot of how your business is performing
                        </Text>
                    </div>
                    <Button type="primary" ghost icon={<ThunderboltOutlined />}>
                        Analyze
                    </Button>
                </Space>
            </Card>
        );
    }

    return (
        <Card
            title={
                <Space>
                    <ThunderboltOutlined style={{ color: "#faad14" }} />
                    <span>AI Business Impact</span>
                </Space>
            }
            extra={
                <Space>
                    <Select value={days} onChange={setDays} style={{ width: 140 }}>
                        <Option value={7}>Last 7 days</Option>
                        <Option value={30}>Last 30 days</Option>
                        <Option value={90}>Last 90 days</Option>
                    </Select>
                    <Button onClick={() => refetch()} loading={isLoading}>
                        Refresh
                    </Button>
                    <Tooltip title="Hide">
                        <Button icon={<CloseOutlined />} onClick={() => setVisible(false)} />
                    </Tooltip>
                </Space>
            }
            style={{ marginBottom: 24, borderRadius: 12 }}
        >
            {isLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                    <Spin />
                </div>
            ) : stats ? (
                <>
                    <Row gutter={[16, 16]}>
                        {showCommerceStats && (
                            <>
                                <Col xs={24} sm={12} md={8} lg={4}>
                                    <Statistic
                                        title="Revenue"
                                        value={formatMoney(stats.totalRevenue)}
                                        prefix={<DollarOutlined />}
                                    />
                                </Col>
                                <Col xs={24} sm={12} md={8} lg={4}>
                                    <Statistic
                                        title={ordersLabel}
                                        value={stats.totalOrders}
                                        prefix={<ShoppingCartOutlined />}
                                    />
                                </Col>
                            </>
                        )}
                        <Col xs={24} sm={12} md={8} lg={4}>
                            <Statistic
                                title="Customers"
                                value={stats.totalCustomers}
                                prefix={<UserOutlined />}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={4}>
                            <Statistic
                                title="Conversations"
                                value={stats.totalConversations}
                                prefix={<MessageOutlined />}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={4}>
                            <Statistic
                                title="Resolution Rate"
                                value={stats.resolutionRate || 0}
                                suffix="%"
                                prefix={<CheckCircleOutlined />}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={4}>
                            <Statistic
                                title="Active Agents"
                                value={stats.totalAgents}
                                prefix={<TeamOutlined />}
                            />
                        </Col>
                    </Row>

                    <Card
                        size="small"
                        title={
                            <Space>
                                <RiseOutlined />
                                <Text strong>What the numbers mean</Text>
                            </Space>
                        }
                        style={{ marginTop: 24, background: "#fafafa", borderRadius: 10 }}
                    >
                        <Paragraph
                            style={{
                                whiteSpace: "pre-wrap",
                                fontSize: 14,
                                lineHeight: 1.6,
                                marginBottom: 0,
                            }}
                        >
                            {stats.insights || "No insights available."}
                        </Paragraph>
                    </Card>
                </>
            ) : (
                <Paragraph type="secondary">No business impact data available.</Paragraph>
            )}
        </Card>
    );
};

export default BusinessImpact;
