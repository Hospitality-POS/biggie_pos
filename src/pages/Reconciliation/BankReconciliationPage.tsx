import React, { useRef, useState, useCallback } from "react";
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
    DatePicker,
    Select,
    Alert,
    App,
    Tooltip,
} from "antd";
import {
    PlusOutlined,
    FilterOutlined,
    BankOutlined,
    EyeOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getAllReconciliations,
    BankReconciliation,
    ReconciliationStatus,
} from "@services/accounting/reconciliation";
import { getBankAccounts } from "@services/accounting/accounts";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import OpenReconciliationDrawer from "./OpenReconciliationDrawer";
import ReconciliationWorkspace from "./ReconciliationWorkspace";
import dayjs, { Dayjs } from "dayjs";

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Helpers ───────────────────────────────────────────────────────────────────

const getShopId = (): string => {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        return user?.shop_id || user?.shopId || "";
    } catch {
        return "";
    }
};

const STATUS_CONFIG: Record<ReconciliationStatus, { badge: "success" | "processing" | "warning" | "error" | "default"; color: string }> = {
    Open: { badge: "default", color: "default" },
    "In Progress": { badge: "processing", color: "blue" },
    Completed: { badge: "success", color: "green" },
    Voided: { badge: "error", color: "red" },
};

const ALL_STATUSES: (ReconciliationStatus | "ALL")[] = [
    "ALL", "Open", "In Progress", "Completed", "Voided",
];

// ── Main Page ─────────────────────────────────────────────────────────────────

const BankReconciliationPage: React.FC = () => {
    const shopId = getShopId();
    const primaryColor = usePrimaryColor();
    const queryClient = useQueryClient();
    const actionRef = useRef<ActionType>();

    const [activeStatus, setActiveStatus] = useState<ReconciliationStatus | "ALL">("ALL");
    const [accountFilter, setAccountFilter] = useState<string | undefined>();
    const [openDrawer, setOpenDrawer] = useState(false);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
        dayjs().subtract(3, "month").startOf("month"),
        dayjs().endOf("month"),
    ]);

    const from = dateRange[0]?.startOf("day").toISOString();
    const to = dateRange[1]?.endOf("day").toISOString();

    // ── If workspace is active — render workspace instead ─────────────────────

    if (workspaceId) {
        return (
            <ReconciliationWorkspace
                reconciliationId={workspaceId}
                shopId={shopId}
                onBack={() => {
                    setWorkspaceId(null);
                    queryClient.invalidateQueries({ queryKey: ["reconciliations"] });
                }}
            />
        );
    }

    // ── Data ──────────────────────────────────────────────────────────────────

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["reconciliations", shopId, activeStatus, accountFilter, page, pageSize, from, to],
        queryFn: () =>
            getAllReconciliations({
                shop_id: shopId,
                status: activeStatus === "ALL" ? undefined : activeStatus,
                account_id: accountFilter,
                from,
                to,
                page,
                limit: pageSize,
            }),
        enabled: !!shopId,
    });

    const { data: bankData } = useQuery({
        queryKey: ["bank-accounts", shopId],
        queryFn: () => getBankAccounts(shopId),
        enabled: !!shopId,
    });

    const reconciliations = data?.reconciliations || [];
    const total = data?.total || 0;
    const bankAccounts = bankData?.accounts || [];

    // ── Summary stats ──────────────────────────────────────────────────────────

    const openCount = reconciliations.filter((r) => r.status === "Open").length;
    const inProgressCount = reconciliations.filter((r) => r.status === "In Progress").length;
    const completedCount = reconciliations.filter((r) => r.status === "Completed").length;

    // ── Columns ───────────────────────────────────────────────────────────────

    const columns = [
        {
            title: "Recon. No.",
            dataIndex: "reconciliation_no",
            key: "reconciliation_no",
            width: 140,
            render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
        },
        {
            title: "Account",
            key: "account",
            render: (_: any, r: BankReconciliation) => {
                const acc = r.account_id;
                if (typeof acc === "object")
                    return (
                        <Space size={4}>
                            <Text code style={{ fontSize: 11 }}>{acc.account_code}</Text>
                            <Text style={{ fontSize: 12 }}>{acc.account_name}</Text>
                        </Space>
                    );
                return <Text type="secondary">{r.account_name || r.account_code || acc}</Text>;
            },
        },
        {
            title: "Period",
            key: "period",
            width: 190,
            render: (_: any, r: BankReconciliation) => (
                <Text style={{ fontSize: 12 }}>
                    {dayjs(r.period_start).format("DD MMM YYYY")} — {dayjs(r.period_end).format("DD MMM YYYY")}
                </Text>
            ),
        },
        {
            title: "Book Balance",
            dataIndex: "closing_book_balance",
            key: "closing_book_balance",
            width: 130,
            align: "right" as const,
            render: (v: number) => (
                <Text style={{ fontSize: 12, color: "#1d39c4" }}>
                    {(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </Text>
            ),
        },
        {
            title: "Statement Balance",
            dataIndex: "statement_balance",
            key: "statement_balance",
            width: 140,
            align: "right" as const,
            render: (v: number) => (
                <Text style={{ fontSize: 12, color: "#1890ff" }}>
                    {(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </Text>
            ),
        },
        {
            title: "Difference",
            dataIndex: "difference",
            key: "difference",
            width: 120,
            align: "right" as const,
            render: (v: number) => {
                const balanced = Math.abs(v) < 0.001;
                return (
                    <Text strong style={{ color: balanced ? "#389e0d" : "#cf1322", fontSize: 12 }}>
                        {balanced ? "0.00 ✓" : Math.abs(v).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                );
            },
        },
        {
            title: "Matched",
            key: "matched",
            width: 100,
            render: (_: any, r: BankReconciliation) => (
                <Space size={4}>
                    <Tag color="green" style={{ fontSize: 10 }}>{r.matched_count || 0}</Tag>
                    <Tag color="orange" style={{ fontSize: 10 }}>{r.unmatched_count || 0}</Tag>
                </Space>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 110,
            render: (s: ReconciliationStatus) => {
                const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.Open;
                return <Badge status={cfg.badge} text={s} />;
            },
        },
        {
            title: "Actions",
            key: "actions",
            width: 80,
            fixed: "right" as const,
            render: (_: any, r: BankReconciliation) => (
                <Tooltip title={r.status === "Completed" ? "View" : "Open Workspace"}>
                    <Button
                        icon={<EyeOutlined />}
                        size="small"
                        type={r.status !== "Completed" && r.status !== "Voided" ? "primary" : "default"}
                        ghost={r.status !== "Completed" && r.status !== "Voided"}
                        onClick={() => setWorkspaceId(r._id)}
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <App>
            {/* ── Summary Cards ── */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Open Sessions"
                            value={openCount}
                            valueStyle={{ color: "#8c8c8c", fontSize: 22 }}
                        />
                    </ProCard>
                </Col>
                <Col span={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="In Progress"
                            value={inProgressCount}
                            valueStyle={{ color: inProgressCount > 0 ? "#1890ff" : "#8c8c8c", fontSize: 22 }}
                        />
                    </ProCard>
                </Col>
                <Col span={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Completed"
                            value={completedCount}
                            valueStyle={{ color: "#389e0d", fontSize: 22 }}
                        />
                    </ProCard>
                </Col>
                <Col span={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Bank Accounts"
                            value={bankAccounts.length}
                            prefix={<BankOutlined />}
                            valueStyle={{ fontSize: 22 }}
                        />
                    </ProCard>
                </Col>
            </Row>

            {/* ── Main Table ── */}
            <ProCard
                title={
                    <Space>
                        <BankOutlined style={{ fontSize: 18, color: primaryColor }} />
                        <Typography.Title level={4} style={{ margin: 0 }}>
                            Bank Reconciliation
                        </Typography.Title>
                    </Space>
                }
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setOpenDrawer(true)}
                        style={{ background: primaryColor, borderColor: primaryColor }}
                    >
                        New Session
                    </Button>
                }
                bordered
                tabs={{
                    activeKey: activeStatus,
                    onChange: (k) => { setActiveStatus(k as ReconciliationStatus | "ALL"); setPage(1); },
                    items: ALL_STATUSES.map((s) => ({
                        key: s,
                        label: s === "ALL" ? "All" : s,
                    })),
                }}
            >
                {/* ── Filters ── */}
                <Space style={{ marginBottom: 16 }} wrap>
                    <FilterOutlined style={{ color: "#8c8c8c" }} />
                    <RangePicker
                        value={dateRange}
                        onChange={(r) => { setDateRange(r as [Dayjs, Dayjs]); setPage(1); }}
                        allowClear={false}
                        format="DD MMM YYYY"
                        presets={[
                            { label: "Last 3 Months", value: [dayjs().subtract(3, "month").startOf("month"), dayjs().endOf("month")] },
                            { label: "This Year", value: [dayjs().startOf("year"), dayjs().endOf("year")] },
                            { label: "Last Year", value: [dayjs().subtract(1, "year").startOf("year"), dayjs().subtract(1, "year").endOf("year")] },
                        ]}
                    />
                    <Select
                        placeholder="Filter by account"
                        value={accountFilter}
                        onChange={(v) => { setAccountFilter(v); setPage(1); }}
                        allowClear
                        showSearch
                        style={{ width: 240 }}
                        optionFilterProp="label"
                        options={bankAccounts.map((a) => ({
                            label: `${a.account_code} — ${a.account_name}`,
                            value: a._id,
                        }))}
                    />
                </Space>

                {!shopId && (
                    <Alert type="warning" message="Shop ID not found." showIcon style={{ marginBottom: 12 }} />
                )}

                <ProTable<BankReconciliation>
                    rowKey="_id"
                    actionRef={actionRef}
                    dataSource={reconciliations}
                    columns={columns}
                    loading={isLoading}
                    search={false}
                    options={{ reload: () => refetch(), fullScreen: true }}
                    pagination={{
                        current: page,
                        pageSize,
                        total,
                        showSizeChanger: true,
                        showTotal: (t) => `${t} sessions`,
                        onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                    }}
                    scroll={{ x: 1100 }}
                    size="small"
                    cardBordered={false}
                    rowClassName={(r) =>
                        r.status === "Voided" ? "opacity-50" : ""
                    }
                    onRow={(r) => ({
                        style: { cursor: r.status !== "Voided" ? "pointer" : "default" },
                        onClick: () => r.status !== "Voided" && setWorkspaceId(r._id),
                    })}
                    columnsState={{
                        persistenceKey: "reconciliation-table-columns",
                        persistenceType: "localStorage",
                    }}
                />
            </ProCard>

            {/* ── Open Session Drawer ── */}
            <OpenReconciliationDrawer
                open={openDrawer}
                onClose={() => setOpenDrawer(false)}
                onSuccess={(id) => {
                    setOpenDrawer(false);
                    setWorkspaceId(id); // Go straight into workspace
                }}
                shopId={shopId}
            />
        </App>
    );
};

export default BankReconciliationPage;