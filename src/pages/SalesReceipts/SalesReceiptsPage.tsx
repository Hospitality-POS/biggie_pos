import React, { useRef, useState, useCallback, useEffect } from "react";
import { ProTable, ProCard, ActionType } from "@ant-design/pro-components";
import {
    Button,
    Space,
    Tag,
    Typography,
    Badge,
    Statistic,
    Row,
    Col,
    App,
    DatePicker,
    Select,
    Tooltip,
    Alert,
    Tabs,
} from "antd";
import {
    PlusOutlined,
    EyeOutlined,
    AccountBookOutlined,
    FilterOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getSalesReceipts,
    getSalesReceiptSummary,
    SalesReceipt,
    SalesReceiptStatus,
    PaymentMethod,
} from "@services/accounting/salesReceipts";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import SalesReceiptFormDrawer from "./SalesReceiptFormDrawer";
import SalesReceiptDetailDrawer from "./SalesReceiptDetailDrawer";
import dayjs, { Dayjs } from "dayjs";

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Helpers ───────────────────────────────────────────────────────────────────

const getShopId = (): string => {
    try {
        return localStorage.getItem("shopId") || "";
    } catch {
        return "";
    }
};

const STATUS_CONFIG: Record<SalesReceiptStatus, { color: string; badge: "success" | "processing" | "error" | "default" }> = {
    Pending: { color: "warning", badge: "processing" },
    Posted: { color: "success", badge: "success" },
    Voided: { color: "error", badge: "error" },
};

const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
    Cash: "green",
    "M-Pesa": "blue",
    Card: "purple",
    Bank_Transfer: "cyan",
    Cheque: "orange",
    Other: "default",
};

const ALL_STATUSES: (SalesReceiptStatus | "ALL")[] = ["ALL", "Pending", "Posted", "Voided"];

const PAYMENT_METHOD_OPTIONS: { label: string; value: PaymentMethod }[] = [
    { label: "Cash", value: "Cash" },
    { label: "M-Pesa", value: "M-Pesa" },
    { label: "Card", value: "Card" },
    { label: "Bank Transfer", value: "Bank_Transfer" },
    { label: "Cheque", value: "Cheque" },
    { label: "Other", value: "Other" },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

const SalesReceiptsPage: React.FC = () => {
    const shopId = getShopId();
    const primaryColor = usePrimaryColor();
    const queryClient = useQueryClient();
    const actionRef = useRef<ActionType>();

    const [activeStatus, setActiveStatus] = useState<SalesReceiptStatus | "ALL">("ALL");
    const [formOpen, setFormOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | undefined>();
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
        dayjs().startOf("month"),
        dayjs().endOf("month"),
    ]);

    const from = dateRange[0]?.startOf("day").toISOString();
    const to = dateRange[1]?.endOf("day").toISOString();

    // Fetch sales receipts
    const { data: receiptsData, isLoading } = useQuery({
        queryKey: ["sales-receipts", page, pageSize, activeStatus, paymentMethodFilter, from, to],
        queryFn: () =>
            getSalesReceipts({
                page,
                limit: pageSize,
                status: activeStatus === "ALL" ? undefined : activeStatus,
                payment_method: paymentMethodFilter,
                from,
                to,
            }),
        enabled: !!shopId,
    });

    // Fetch summary
    const { data: summaryData } = useQuery({
        queryKey: ["sales-receipts-summary", from, to],
        queryFn: () => getSalesReceiptSummary({ from, to }),
        enabled: !!shopId,
    });

    const receipts = receiptsData?.receipts || [];
    const total = receiptsData?.total || 0;
    const totalPages = receiptsData?.totalPages || 1;

    const summary = summaryData?.summary || [];
    const byPaymentMethod = summaryData?.by_payment_method || [];

    const handleView = (id: string) => {
        setSelectedReceiptId(id);
        setDetailOpen(true);
    };

    const handleEdit = (id: string) => {
        setSelectedReceiptId(id);
        setFormOpen(true);
    };

    const handleCreate = () => {
        setSelectedReceiptId(null);
        setFormOpen(true);
    };

    const columns = [
        {
            title: "Receipt No",
            dataIndex: "receipt_no",
            key: "receipt_no",
            width: 150,
            render: (text: string) => <Text strong style={{ fontFamily: "monospace" }}>{text}</Text>,
        },
        {
            title: "Date",
            dataIndex: "receipt_date",
            key: "receipt_date",
            width: 120,
            render: (date: string) => dayjs(date).format("DD MMM YYYY"),
        },
        {
            title: "Customer",
            dataIndex: "customer_name",
            key: "customer_name",
            width: 150,
            render: (name: string, record: SalesReceipt) => (
                <Text>{name || record.customer_id?.customer_name || "Cash Sale"}</Text>
            ),
        },
        {
            title: "Amount",
            dataIndex: "grand_total",
            key: "grand_total",
            width: 120,
            align: "right" as const,
            render: (amount: number) => <Text strong>KES {amount.toLocaleString()}</Text>,
        },
        {
            title: "Payment Method",
            dataIndex: "payment_method",
            key: "payment_method",
            width: 120,
            render: (method: PaymentMethod) => (
                <Tag color={PAYMENT_METHOD_COLORS[method]}>{method}</Tag>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 100,
            render: (status: SalesReceiptStatus) => (
                <Tag color={STATUS_CONFIG[status].color}>{status}</Tag>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 120,
            fixed: "right" as const,
            render: (_: any, record: SalesReceipt) => (
                <Space size="small">
                    <Tooltip title="View">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => handleView(record._id)}
                        />
                    </Tooltip>
                    {record.status === "Pending" && (
                        <Tooltip title="Edit">
                            <Button
                                type="text"
                                icon={<AccountBookOutlined />}
                                onClick={() => handleEdit(record._id)}
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <ProCard
                title="Sales Receipts"
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                        New Receipt
                    </Button>
                }
                headerBordered
            >
                {/* Summary Cards */}
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    {summary.map((item) => (
                        <Col span={6} key={item._id}>
                            <Statistic
                                title={item._id}
                                value={item.total_amount}
                                precision={2}
                                prefix="KES"
                                valueStyle={{ color: primaryColor }}
                            />
                        </Col>
                    ))}
                </Row>

                {/* Filters */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                        <Space>
                            <Text strong>Status:</Text>
                            <Select
                                value={activeStatus}
                                onChange={setActiveStatus}
                                style={{ width: 150 }}
                                options={ALL_STATUSES.map((s) => ({ label: s, value: s }))}
                            />
                            <Text strong>Payment Method:</Text>
                            <Select
                                value={paymentMethodFilter}
                                onChange={setPaymentMethodFilter}
                                style={{ width: 150 }}
                                allowClear
                                options={PAYMENT_METHOD_OPTIONS}
                            />
                        </Space>
                    </Col>
                    <Col span={12} style={{ textAlign: "right" }}>
                        <RangePicker
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
                        />
                    </Col>
                </Row>

                {/* Table */}
                <ProTable<SalesReceipt>
                    actionRef={actionRef}
                    columns={columns}
                    dataSource={receipts}
                    loading={isLoading}
                    rowKey="_id"
                    pagination={{
                        current: page,
                        pageSize,
                        total,
                        onChange: (p, ps) => {
                            setPage(p);
                            setPageSize(ps || 20);
                        },
                        showSizeChanger: true,
                        showTotal: (total) => `Total ${total} receipts`,
                    }}
                    search={false}
                    options={false}
                    scroll={{ x: 800 }}
                />
            </ProCard>

            {/* Form Drawer */}
            <SalesReceiptFormDrawer
                open={formOpen}
                setOpen={setFormOpen}
                receiptId={selectedReceiptId}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["sales-receipts"] });
                    queryClient.invalidateQueries({ queryKey: ["sales-receipts-summary"] });
                }}
            />

            {/* Detail Drawer */}
            <SalesReceiptDetailDrawer
                open={detailOpen}
                setOpen={setDetailOpen}
                receiptId={selectedReceiptId}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["sales-receipts"] });
                    queryClient.invalidateQueries({ queryKey: ["sales-receipts-summary"] });
                }}
            />
        </div>
    );
};

export default SalesReceiptsPage;
