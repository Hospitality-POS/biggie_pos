import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Row, Col, Statistic, Radio, DatePicker, Spin, Typography, Button, Space, Tooltip, Flex, Tag } from "antd";
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
    CalendarOutlined,
    HomeOutlined,
    CustomerServiceOutlined,
    ShopOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { fetchBusinessImpact, fetchBusinessInsights, type BusinessImpactData } from "@services/whatsappService";

const { Paragraph, Text, Title } = Typography;
const { RangePicker } = DatePicker;

const PERIOD_LABELS: Record<string, string> = {
    day: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
    custom: "Custom Period",
};

type ProductType = "duka" | "pesa" | "dala" | "mteja" | "bandu" | "business";

export interface StatItem {
    label: string;
    value: string | number;
    prefix?: string;
    suffix?: string;
    icon?: React.ReactNode;
    color?: string;
}

interface Props {
    hasDuka?: boolean;
    hasPesa?: boolean;
    hasDala?: boolean;
    product?: ProductType;
    periodFilter?: string;
    startDate?: dayjs.Dayjs;
    endDate?: dayjs.Dayjs;
    periodLabel?: string;
    stats?: StatItem[];
    insights?: string;
}

interface ProductConfig {
    shortName: string;
    badgeIcon: React.ReactNode;
    defaultMetricLabels: string[];
}

const PRODUCT_CONFIG: Record<ProductType, ProductConfig> = {
    duka: {
        shortName: "Duka",
        badgeIcon: <ShopOutlined />,
        defaultMetricLabels: ["Revenue", "Orders", "Customers", "Avg Order"],
    },
    pesa: {
        shortName: "Pesa",
        badgeIcon: <DollarOutlined />,
        defaultMetricLabels: ["Revenue", "Expenses", "Net Profit", "Profit Margin", "Total Assets"],
    },
    dala: {
        shortName: "Dala",
        badgeIcon: <HomeOutlined />,
        defaultMetricLabels: ["Revenue", "Sales", "Customers", "Properties"],
    },
    mteja: {
        shortName: "Mteja",
        badgeIcon: <CustomerServiceOutlined />,
        defaultMetricLabels: ["Conversations", "Customers", "Resolution Rate", "Agents"],
    },
    bandu: {
        shortName: "Bandu",
        badgeIcon: <TeamOutlined />,
        defaultMetricLabels: ["Employees", "Active", "On Leave", "New Hires"],
    },
    business: {
        shortName: "Business",
        badgeIcon: <ThunderboltOutlined />,
        defaultMetricLabels: ["Revenue", "Orders", "Customers", "Conversations"],
    },
};

const generateInsights = (product: ProductType, stats: StatItem[]): string => {
    if (!stats || stats.length === 0) {
        return "No data available for this period.";
    }
    const metrics = stats
        .map((s) => `- ${s.label}: ${s.prefix || ""}${s.value}${s.suffix ? ` ${s.suffix}` : ""}`)
        .join("\n");

    const byLabel: Record<string, string | number> = {};
    stats.forEach((s) => { byLabel[s.label] = `${s.prefix || ""}${s.value}${s.suffix ? ` ${s.suffix}` : ""}`; });

    let narrative = "";
    switch (product) {
        case "pesa":
            narrative =
                "The financials show revenue, expenses, and net profitability for the selected period. " +
                "A strong profit margin and healthy asset base support continued operations. " +
                "Review expense trends and asset utilization to maintain this performance.";
            if (byLabel["Profit Margin"]) {
                narrative += ` The current profit margin is ${byLabel["Profit Margin"]}.`;
            }
            break;
        case "duka":
            narrative =
                "Duka activity is driven by orders, revenue, and customer reach. " +
                "Use these metrics to identify best-selling periods and average order trends. " +
                "Focus on converting more customers and increasing basket size.";
            break;
        case "dala":
            narrative =
                "Dala performance reflects property revenue, collections, and customer activity. " +
                "Track occupancy and payment collections to maintain cash flow.";
            break;
        case "mteja":
            narrative =
                "Mteja performance depends on customer conversations and resolution quality. " +
                "Higher resolution rates and faster response times improve customer retention.";
            break;
        case "bandu":
            narrative =
                "Bandu HR metrics show workforce size, active staff, and leave patterns. " +
                "Use this to manage staffing levels and employee availability.";
            break;
        default:
            narrative =
                "Review the key metrics above to understand the current period's performance and identify improvement opportunities.";
    }

    return `**Business Impact**\n\nKey metrics for this period:\n${metrics}\n\n${narrative}`;
};

const BusinessImpact: React.FC<Props> = ({
    hasDuka,
    hasPesa,
    hasDala,
    product,
    periodFilter: propPeriodFilter,
    startDate: propStartDate,
    endDate: propEndDate,
    periodLabel: propPeriodLabel,
    stats: propStats,
    insights: propInsights,
}) => {
    const [visible, setVisible] = useState(false);

    const productType: ProductType = useMemo(
        () =>
            product ||
            (hasDuka ? "duka" : hasPesa ? "pesa" : hasDala ? "dala" : "business"),
        [product, hasDuka, hasPesa, hasDala]
    );
    const config = PRODUCT_CONFIG[productType];

    const isDataDriven = !!propStats;

    const [internalPeriod, setInternalPeriod] = useState("month");
    const [internalCustomRange, setInternalCustomRange] = useState<dayjs.Dayjs[]>([]);

    const isParentControlled = !!propPeriodFilter && !!propStartDate && !!propEndDate;

    const periodFilter = isParentControlled ? propPeriodFilter! : internalPeriod;
    const customDateRange = isParentControlled ? [] : internalCustomRange;
    const showCustomPicker = periodFilter === "custom";

    const getDateRange = useCallback(() => {
        const today = dayjs();
        let start: dayjs.Dayjs, end: dayjs.Dayjs;
        switch (periodFilter) {
            case "day":
                start = today.startOf("day");
                end = today.endOf("day");
                break;
            case "week":
                start = today.startOf("week");
                end = today.endOf("week");
                break;
            case "month":
                start = today.startOf("month");
                end = today.endOf("month");
                break;
            case "year":
                start = today.startOf("year");
                end = today.endOf("year");
                break;
            case "custom":
                if (customDateRange?.length === 2) {
                    start = customDateRange[0].startOf("day");
                    end = customDateRange[1].endOf("day");
                } else {
                    start = today.startOf("month");
                    end = today.endOf("month");
                }
                break;
            default:
                start = today.startOf("month");
                end = today.endOf("month");
        }
        return { startDate: start, endDate: end };
    }, [periodFilter, customDateRange]);

    const { startDate, endDate } = isParentControlled
        ? { startDate: propStartDate!, endDate: propEndDate! }
        : getDateRange();

    const periodLabel = isParentControlled ? propPeriodLabel : PERIOD_LABELS[periodFilter];

    const getFormattedDateRange = useCallback(() => {
        const fmt = "MMM D, YYYY";
        switch (periodFilter) {
            case "day":
                return startDate.format("MMM D, YYYY");
            case "week":
                return `${startDate.format(fmt)} – ${endDate.format(fmt)}`;
            case "month":
                return startDate.format("MMMM YYYY");
            case "year":
                return startDate.format("YYYY");
            case "custom":
                if (customDateRange?.length === 2) {
                    return `${customDateRange[0].format(fmt)} – ${customDateRange[1].format(fmt)}`;
                }
                return "Custom Range";
            default:
                return startDate.format("MMMM YYYY");
        }
    }, [periodFilter, startDate, endDate, customDateRange]);

    const dateRangeLabel = getFormattedDateRange();
    const computedDays = useMemo(() => endDate.diff(startDate, "day") + 1, [endDate, startDate]);

    const handlePeriodChange = useCallback((value: string) => {
        setInternalPeriod(value);
        if (value !== "custom") {
            setInternalCustomRange([]);
        }
    }, []);

    const shopId = useMemo(() => {
        try {
            const id = localStorage.getItem("shopId");
            return id && id !== "{}" && id !== "null" ? id : "";
        } catch {
            return "";
        }
    }, []);

    const clientName = useMemo(() => {
        const tryName = (key: string, ...paths: string[]) => {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return "";
                const obj = JSON.parse(raw);
                for (const p of paths) {
                    const parts = p.split(".");
                    let val: any = obj;
                    for (const part of parts) val = val?.[part];
                    if (val) return String(val);
                }
            } catch {}
            return "";
        };
        return (
            tryName("tenant", "name") ||
            tryName("shop", "name") ||
            tryName("user", "shop_name", "shop.name", "name") ||
            config.shortName
        );
    }, [config.shortName]);

    const { data: apiData, isLoading: apiLoading, refetch } = useQuery({
        queryKey: [
            "business-impact",
            productType,
            shopId || "all",
            computedDays,
            startDate.format(),
            endDate.format(),
        ],
        queryFn: () =>
            fetchBusinessImpact(
                shopId
                    ? {
                        shop_id: shopId,
                        product: productType,
                        days: computedDays,
                        startDate: startDate.toISOString(),
                        endDate: endDate.toISOString(),
                    }
                    : {
                        product: productType,
                        days: computedDays,
                        startDate: startDate.toISOString(),
                        endDate: endDate.toISOString(),
                    }
            ) as Promise<BusinessImpactData>,
        enabled: visible && !isDataDriven,
    });

    const insightsQueryKey = useMemo(
        () => [
            "business-impact-insights",
            productType,
            shopId || "all",
            computedDays,
            startDate.format(),
            endDate.format(),
            (propStats || []).map((s) => `${s.label}:${s.value}`).join("|"),
        ],
        [productType, shopId, computedDays, startDate, endDate, propStats]
    );

    const { data: insightsData, isLoading: insightsLoading } = useQuery({
        queryKey: insightsQueryKey,
        queryFn: () =>
            fetchBusinessInsights({
                product: productType,
                stats: (propStats || []).map(({ label, value, prefix, suffix }) => ({
                    label,
                    value,
                    prefix,
                    suffix,
                })),
                shop_id: shopId || undefined,
                days: computedDays,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            }),
        enabled: visible && isDataDriven,
    });

    const formatMoney = (val?: number) =>
        val === undefined || val === null ? "--" : `KES ${val.toLocaleString()}`;

    const apiStats: StatItem[] = useMemo(() => {
        if (!apiData) return [];
        const s: StatItem[] = [];
        if (apiData.totalRevenue !== undefined) s.push({ label: "Revenue", value: formatMoney(apiData.totalRevenue), prefix: "", icon: <DollarOutlined /> });
        if (apiData.totalOrders !== undefined) s.push({ label: "Orders", value: apiData.totalOrders, icon: <ShoppingCartOutlined /> });
        if (apiData.totalCustomers !== undefined) s.push({ label: "Customers", value: apiData.totalCustomers, icon: <UserOutlined /> });
        if (apiData.totalConversations !== undefined) s.push({ label: "Conversations", value: apiData.totalConversations, icon: <MessageOutlined /> });
        if (apiData.resolutionRate !== undefined) s.push({ label: "Resolution Rate", value: apiData.resolutionRate, suffix: "%", icon: <CheckCircleOutlined /> });
        if (apiData.totalAgents !== undefined) s.push({ label: "Active Agents", value: apiData.totalAgents, icon: <TeamOutlined /> });
        return s;
    }, [apiData]);

    const stats = isDataDriven ? propStats! : apiStats;
    const localInsights = generateInsights(productType, stats);
    const insights = isDataDriven
        ? (propInsights ?? insightsData?.insights ?? localInsights)
        : (apiData?.insights ?? localInsights);

    const isExpandedLoading = visible && (isDataDriven ? insightsLoading : apiLoading);

    if (!visible) {
        return (
            <Card
                style={{
                    marginBottom: 20,
                    borderRadius: 12,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
                bodyStyle={{ padding: "16px 20px" }}
                onClick={() => setVisible(true)}
                hoverable
            >
                <Flex justify="space-between" align="center" gap={16} wrap="wrap">
                    <Space size={14} align="center" style={{ flex: 1 }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                background: "#eff6ff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <span style={{ fontSize: 18, color: "#3b82f6" }}>{config.badgeIcon}</span>
                        </div>
                        <div>
                            <Title level={5} style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>
                                {periodLabel} · {clientName}
                            </Title>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {dateRangeLabel} · AI Business overview
                            </Text>
                        </div>
                    </Space>
                    <Button type="primary" icon={<ThunderboltOutlined />} style={{ borderRadius: 8 }}>
                        Analyze
                    </Button>
                </Flex>
            </Card>
        );
    }

    return (
        <Card
            title={
                <Space size={8}>
                    <span style={{ color: "#3b82f6" }}>{config.badgeIcon}</span>
                    <span>{periodLabel} · {clientName}</span>
                    <Tag color="blue" icon={<CalendarOutlined />} style={{ marginLeft: 8 }}>
                        AI overview
                    </Tag>
                </Space>
            }
            extra={
                <Space wrap>
                    {!isParentControlled && !isDataDriven && (
                        <>
                            <div
                                style={{
                                    background: "#f8fafc",
                                    borderRadius: 8,
                                    padding: "6px 12px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    border: "1px solid #e2e8f0",
                                }}
                            >
                                <CalendarOutlined style={{ color: "#3b82f6", fontSize: 13 }} />
                                <Radio.Group
                                    value={periodFilter}
                                    onChange={(e) => handlePeriodChange(e.target.value)}
                                    buttonStyle="solid"
                                    size="small"
                                >
                                    <Radio.Button value="day">Day</Radio.Button>
                                    <Radio.Button value="week">Week</Radio.Button>
                                    <Radio.Button value="month">Month</Radio.Button>
                                    <Radio.Button value="year">Year</Radio.Button>
                                    <Radio.Button value="custom">Custom</Radio.Button>
                                </Radio.Group>
                            </div>
                            {showCustomPicker && (
                                <RangePicker
                                    value={customDateRange as any}
                                    onChange={(d) =>
                                        setInternalCustomRange(
                                            (d || []).filter((x): x is dayjs.Dayjs => !!x)
                                        )
                                    }
                                    allowClear
                                    style={{ minWidth: 260 }}
                                />
                            )}
                        </>
                    )}
                    {!isDataDriven && (
                        <Button onClick={() => refetch()} loading={apiLoading}>
                            Refresh
                        </Button>
                    )}
                    {!isParentControlled && isDataDriven && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {dateRangeLabel}
                        </Text>
                    )}
                    <Tooltip title="Hide">
                        <Button icon={<CloseOutlined />} onClick={() => setVisible(false)} />
                    </Tooltip>
                </Space>
            }
            style={{ marginBottom: 24, borderRadius: 12, border: "1px solid #e2e8f0" }}
        >
            {isExpandedLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                    <Spin />
                </div>
            ) : (
                <>
                    <Row gutter={[16, 16]}>
                        {stats.map((stat, index) => (
                            <Col xs={24} sm={12} md={8} lg={4} key={index}>
                                <Statistic
                                    title={stat.label}
                                    value={stat.value}
                                    prefix={
                                        stat.icon ? (
                                            <Space size={4}>
                                                {stat.icon}
                                                <span>{stat.prefix || ""}</span>
                                            </Space>
                                        ) : (
                                            stat.prefix
                                        )
                                    }
                                    suffix={stat.suffix}
                                    valueStyle={{ color: stat.color }}
                                />
                            </Col>
                        ))}
                    </Row>

                    <Card
                        size="small"
                        title={
                            <Space>
                                <RiseOutlined style={{ color: "#3b82f6" }} />
                                <Text strong>What the numbers mean</Text>
                            </Space>
                        }
                        style={{ marginTop: 24, background: "#ffffff", borderRadius: 10, border: "1px solid #f0f0f0" }}
                    >
                        <Paragraph
                            style={{
                                whiteSpace: "pre-wrap",
                                fontSize: 14,
                                lineHeight: 1.6,
                                marginBottom: 0,
                            }}
                        >
                            {insights || "No insights available."}
                        </Paragraph>
                    </Card>
                </>
            )}
        </Card>
    );
};

export default BusinessImpact;
