import React, { useState, useCallback, useRef } from "react";
import { ProTable, ActionType } from "@ant-design/pro-components";
import {
    Button, Space, Tag, Tooltip, Popconfirm,
    Typography, Badge, Card, Tabs, App, Statistic, Row, Col, Progress,
} from "antd";
import {
    PlusOutlined, FileExcelOutlined, SettingOutlined,
    EyeOutlined, StopOutlined, BankOutlined,
    ThunderboltOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getAllImports,
    getImportSummary,
    voidImport,
    BankStatementImport,
    ImportStatus,
} from "@services/accounting/bankStatementImport";
import { getCurrentTenantId } from "@services/tenants";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import dayjs from "dayjs";
import ImportStatementDrawer from "./ImportStatementDrawer";
import TransactionReviewDrawer from "./TransactionReviewDrawer";
import CategorizationRulesDrawer from "./CategorizationRulesDrawer";

const { Text } = Typography;

const STATUS_CONFIG: Record<ImportStatus, { color: string; label: string }> = {
    Processing: { color: "processing", label: "Processing" },
    Review: { color: "warning", label: "Needs Review" },
    "Partially Pushed": { color: "cyan", label: "Partial" },
    "Fully Pushed": { color: "success", label: "Pushed" },
    Voided: { color: "default", label: "Voided" },
};

const ALL_STATUSES: (ImportStatus | "ALL")[] = [
    "ALL", "Review", "Processing", "Partially Pushed", "Fully Pushed", "Voided",
];

const BankStatementPage: React.FC = () => {
    const primaryColor = usePrimaryColor();
    const queryClient = useQueryClient();
    const actionRef = useRef<ActionType>();
    const { modal } = App.useApp();

    const [activeStatus, setActiveStatus] = useState<ImportStatus | "ALL">("Review");
    const [page, setPage] = useState(1);
    const [importOpen, setImportOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [rulesOpen, setRulesOpen] = useState(false);
    const [selectedImport, setSelectedImport] = useState<BankStatementImport | null>(null);

    const shopId = getCurrentTenantId() || "";

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["bank-imports", shopId, activeStatus, page],
        queryFn: () =>
            getAllImports({
                shop_id: shopId,
                status: activeStatus === "ALL" ? undefined : activeStatus,
                page,
                limit: 20,
            }),
        enabled: !!shopId,
        keepPreviousData: true,
        refetchOnWindowFocus: false,
        onError: (error: any) => {
            console.error('Failed to fetch bank imports:', error);
        },
    });

    const { data: summaryData } = useQuery({
        queryKey: ["bank-imports-summary", shopId],
        queryFn: () => getImportSummary(shopId),
        enabled: !!shopId,
        onError: (error: any) => {
            console.error('Failed to fetch import summary:', error);
        },
    });

    const voidMutation = useMutation({
        mutationFn: (id: string) => voidImport(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bank-imports", shopId] });
            queryClient.invalidateQueries({ queryKey: ["bank-imports-summary", shopId] });
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to void import';
            console.error('Void import failed:', errorMessage);
        },
    });

    const onSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["bank-imports", shopId] });
        queryClient.invalidateQueries({ queryKey: ["bank-imports-summary", shopId] });
    }, [queryClient, shopId]);

    if (!shopId) {
        return <div>Shop not selected. Please select a shop to view bank statements.</div>;
    }

    const handleVoid = (record: BankStatementImport) => {
        modal.confirm({
            title: "Void this import?",
            content: "This will mark the import as voided. Pushed transactions are not reversed.",
            okText: "Void Import",
            okButtonProps: { danger: true },
            onOk: () => voidMutation.mutateAsync(record._id),
        });
    };

    const openReview = (record: BankStatementImport) => {
        setSelectedImport(record);
        setReviewOpen(true);
    };

    const imports = data?.imports || [];
    const totalImports = data?.total || 0;
    const byStatus = summaryData?.by_status || {};

    const summaryStats = {
        totalPending: (byStatus["Review"]?.uncategorized || 0),
        totalImports: Object.values(byStatus).reduce((s, v: { count?: number }) => s + (v.count || 0), 0),
        pushed: byStatus["Fully Pushed"]?.count || 0,
        needsReview: byStatus["Review"]?.count || 0,
    };

    const columns = [
        {
            title: "Import No.",
            dataIndex: "import_no",
            key: "import_no",
            width: 170,
            render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
        },
        {
            title: "Account",
            key: "account",
            width: 200,
            render: (_: unknown, r: BankStatementImport) => {
                const code = r.account_code || (typeof r.account_id === "object" ? r.account_id?.account_code : "");
                const name = r.account_name || (typeof r.account_id === "object" ? r.account_id?.account_name : "");
                return (
                    <Space direction="vertical" size={0}>
                        <Text strong style={{ fontSize: 13 }}>{name}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{code}</Text>
                    </Space>
                );
            },
        },
        {
            title: "File",
            dataIndex: "original_filename",
            key: "original_filename",
            ellipsis: true,
            render: (v: string, r: BankStatementImport) => (
                <Space>
                    <FileExcelOutlined style={{ color: "#52c41a" }} />
                    <Text style={{ fontSize: 12 }}>{v || r.source_type?.toUpperCase()}</Text>
                </Space>
            ),
        },
        {
            title: "Period",
            key: "period",
            width: 200,
            render: (_: unknown, r: BankStatementImport) => (
                <Text style={{ fontSize: 12 }}>
                    {r.statement_from ? dayjs(r.statement_from).format("DD MMM YYYY") : "—"}
                    {" → "}
                    {r.statement_to ? dayjs(r.statement_to).format("DD MMM YYYY") : "—"}
                </Text>
            ),
        },
        {
            title: "Transactions",
            key: "transactions",
            width: 180,
            render: (_: unknown, r: BankStatementImport) => {
                const total = r.imported_rows || 0;
                const categorized = r.categorized_count || 0;
                const pct = total > 0 ? Math.round((categorized / total) * 100) : 0;
                return (
                    <Space direction="vertical" size={2} style={{ width: "100%" }}>
                        <Space>
                            <Text style={{ fontSize: 12 }}>{categorized}/{total} categorized</Text>
                            {r.uncategorized_count > 0 && (
                                <Tag color="warning" style={{ fontSize: 10 }}>
                                    {r.uncategorized_count} pending
                                </Tag>
                            )}
                        </Space>
                        <Progress percent={pct} size="small" showInfo={false} strokeColor={primaryColor} />
                    </Space>
                );
            },
        },
        {
            title: "Debits / Credits",
            key: "amounts",
            width: 170,
            align: "right" as const,
            render: (_: unknown, r: BankStatementImport) => (
                <Space direction="vertical" size={0} style={{ textAlign: "right" }}>
                    <Text style={{ color: "#cf1322", fontSize: 12 }}>
                        DR {(r.total_debits || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                    <Text style={{ color: "#389e0d", fontSize: 12 }}>
                        CR {(r.total_credits || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                </Space>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 120,
            render: (s: ImportStatus) => {
                const cfg = STATUS_CONFIG[s];
                return <Badge status={cfg.color as any} text={cfg.label} />;
            },
        },
        {
            title: "Imported",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 120,
            render: (v: string) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(v).format("DD MMM YYYY")}
                </Text>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 130,
            fixed: "right" as const,
            render: (_: unknown, r: BankStatementImport) => (
                <Space size={4}>
                    <Tooltip title="Review Transactions">
                        <Button icon={<EyeOutlined />} size="small" onClick={() => openReview(r)} />
                    </Tooltip>
                    {r.status !== "Voided" && r.status !== "Fully Pushed" && (
                        <Tooltip title="Void Import">
                            <Popconfirm
                                title="Void this import?"
                                onConfirm={() => handleVoid(r)}
                                okText="Void"
                                okButtonProps={{ danger: true }}
                                cancelText="Cancel"
                            >
                                <Button icon={<StopOutlined />} size="small" danger />
                            </Popconfirm>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    const tabItems = ALL_STATUSES.map((status) => {
        const count = status === "ALL"
            ? totalImports
            : (byStatus[status as ImportStatus]?.count || 0);
        const cfg = status !== "ALL" ? STATUS_CONFIG[status as ImportStatus] : null;
        return {
            key: status,
            label: (
                <Space size={4}>
                    {status === "ALL" ? "All Imports" : cfg?.label}
                    {count > 0 && (
                        <Tag
                            color={cfg?.color || "default"}
                            style={{ fontSize: 10, lineHeight: "16px", padding: "0 5px" }}
                        >
                            {count}
                        </Tag>
                    )}
                </Space>
            ),
        };
    });

    return (
        <App>
            {/* ── Summary Stats ── */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card size="small" bordered>
                        <Statistic
                            title="Total Imports"
                            value={summaryStats.totalImports}
                            prefix={<BankOutlined />}
                            valueStyle={{ fontSize: 20 }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" bordered>
                        <Statistic
                            title="Needs Review"
                            value={summaryStats.needsReview}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ fontSize: 20, color: "#faad14" }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" bordered>
                        <Statistic
                            title="Uncategorized Txns"
                            value={summaryStats.totalPending}
                            prefix={<ThunderboltOutlined />}
                            valueStyle={{ fontSize: 20, color: "#ff4d4f" }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" bordered>
                        <Statistic
                            title="Fully Pushed"
                            value={summaryStats.pushed}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ fontSize: 20, color: "#52c41a" }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* ── Main Table Card ── */}
            <Card
                bordered
                bodyStyle={{ padding: 0 }}
                title={
                    <Space>
                        <BankOutlined style={{ fontSize: 18, color: primaryColor }} />
                        <Text strong style={{ fontSize: 16 }}>Bank Statement Imports</Text>
                    </Space>
                }
                extra={
                    <Space>
                        <Tooltip title="Manage categorization rules and keyword mappings">
                            <Button icon={<SettingOutlined />} onClick={() => setRulesOpen(true)}>
                                Rules & Mappings
                            </Button>
                        </Tooltip>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setImportOpen(true)}
                            style={{ background: primaryColor, borderColor: primaryColor }}
                        >
                            Import Statement
                        </Button>
                    </Space>
                }
            >
                <Tabs
                    activeKey={activeStatus}
                    onChange={(k) => { setActiveStatus(k as ImportStatus | "ALL"); setPage(1); }}
                    items={tabItems}
                    style={{ paddingLeft: 16, paddingRight: 16 }}
                    tabBarStyle={{ marginBottom: 0 }}
                />

                <ProTable<BankStatementImport>
                    rowKey="_id"
                    actionRef={actionRef}
                    dataSource={imports}
                    columns={columns}
                    loading={isLoading}
                    search={false}
                    options={{ reload: () => refetch() }}
                    pagination={{
                        current: page,
                        total: totalImports,
                        pageSize: 20,
                        onChange: (p) => setPage(p),
                        showTotal: (total) => `${total} imports`,
                        showSizeChanger: false,
                    }}
                    scroll={{ x: 1200 }}
                    size="small"
                    cardBordered={false}
                    toolbar={{
                        title: `${imports.length} imports shown`,
                    }}
                    columnsState={{
                        persistenceKey: "bank-imports-table-columns",
                        persistenceType: "localStorage",
                    }}
                />
            </Card>

            <ImportStatementDrawer
                open={importOpen}
                onClose={() => setImportOpen(false)}
                onSuccess={onSuccess}
                shopId={shopId}
            />

            <TransactionReviewDrawer
                open={reviewOpen}
                onClose={() => { setReviewOpen(false); setSelectedImport(null); }}
                onSuccess={onSuccess}
                importRecord={selectedImport}
                shopId={shopId}
            />

            <CategorizationRulesDrawer
                open={rulesOpen}
                onClose={() => setRulesOpen(false)}
                shopId={shopId}
            />
        </App>
    );
};

export default BankStatementPage;