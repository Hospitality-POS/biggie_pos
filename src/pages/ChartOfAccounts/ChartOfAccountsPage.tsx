import React, { useRef, useState, useCallback } from "react";
import { ProTable, ActionType } from "@ant-design/pro-components";
import {
    Button, Space, Tag, Tooltip, Popconfirm,
    Typography, Badge, Card, Tabs, App,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    PoweroffOutlined, BookOutlined, ThunderboltOutlined, BankOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getAllAccounts, deleteAccount, toggleAccountActive,
    seedDefaultAccounts, ChartOfAccount, AccountType,
} from "@services/accounting/accounts";
import { getCurrentTenantId } from "@services/tenants";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import AccountFormDrawer from "./AccountFormDrawer";
import AccountLedgerDrawer from "./AccountLedgerDrawer";

const { Text } = Typography;

const TYPE_COLORS: Record<AccountType, string> = {
    ASSET: "blue", LIABILITY: "red", EQUITY: "purple",
    REVENUE: "green", EXPENSE: "orange",
};

const BALANCE_COLOR = (a: ChartOfAccount) => {
    if (a.current_balance === 0) return "#8c8c8c";
    if (a.account_type === "ASSET" || a.account_type === "EXPENSE")
        return a.current_balance > 0 ? "#1d39c4" : "#cf1322";
    return a.current_balance > 0 ? "#389e0d" : "#cf1322";
};

const ALL_TYPES: (AccountType | "ALL")[] = ["ALL", "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

const ChartOfAccountsPage: React.FC = () => {
    const primaryColor = usePrimaryColor();
    const queryClient = useQueryClient();
    const actionRef = useRef<ActionType>();
    const { modal } = App.useApp();

    const shopId = getCurrentTenantId();

    const [activeType, setActiveType] = useState<AccountType | "ALL">("ALL");
    const [formOpen, setFormOpen] = useState(false);
    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
    const [ledgerAccount, setLedgerAccount] = useState<ChartOfAccount | null>(null);
    const [seeding, setSeeding] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["chart-of-accounts", shopId],
        queryFn: () => getAllAccounts({ shop_id: shopId }),
        enabled: !!shopId,
    });

    const allAccounts = data?.accounts || [];
    const filteredAccounts = activeType === "ALL"
        ? allAccounts
        : allAccounts.filter((a) => a.account_type === activeType);

    // Calculate paginated data
    const paginatedAccounts = filteredAccounts.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const toggleMutation = useMutation({
        mutationFn: (id: string) => toggleAccountActive(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", shopId] }),
    });
    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteAccount(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", shopId] }),
    });

    const handleSeed = () => {
        modal.confirm({
            title: "Seed Default Chart of Accounts?",
            content: "Creates 40+ standard accounts. Safe on fresh setup — won't overwrite existing.",
            okText: "Seed Accounts",
            onOk: async () => {
                setSeeding(true);
                try {
                    await seedDefaultAccounts(shopId);
                    queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", shopId] });
                } finally {
                    setSeeding(false);
                }
            },
        });
    };

    const openCreate = () => { setEditingAccount(null); setFormOpen(true); };
    const openEdit = (r: ChartOfAccount) => { setEditingAccount(r); setFormOpen(true); };
    const openLedger = (r: ChartOfAccount) => { setLedgerAccount(r); setLedgerOpen(true); };
    const onFormSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", shopId] });
    }, [queryClient, shopId]);

    // Handle tab change - reset to page 1
    const handleTabChange = (key: string) => {
        setActiveType(key as AccountType | "ALL");
        setCurrentPage(1);
    };

    // Handle page change
    const handlePageChange = (page: number, newPageSize: number) => {
        setCurrentPage(page);
        if (newPageSize !== pageSize) {
            setPageSize(newPageSize);
            setCurrentPage(1); // Reset to first page when changing page size
        }
    };

    const columns = [
        {
            title: "Code", dataIndex: "account_code", key: "account_code", width: 90,
            render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
        },
        {
            title: "Account Name", dataIndex: "account_name", key: "account_name",
            render: (name: string, r: ChartOfAccount) => (
                <Space>
                    {r.is_bank_account && (
                        <Tooltip title="Bank / Cash Account">
                            <BankOutlined style={{ color: "#1890ff", fontSize: 13 }} />
                        </Tooltip>
                    )}
                    <Text style={{ fontWeight: r.is_parent ? 600 : 400 }}>
                        {"—".repeat(Math.max(0, (r.level || 1) - 1))} {name}
                    </Text>
                    {r.is_system_account && (
                        <Tag style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}>SYSTEM</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: "Type", dataIndex: "account_type", key: "account_type", width: 110,
            hideInTable: activeType !== "ALL",
            render: (t: AccountType) => <Tag color={TYPE_COLORS[t]}>{t}</Tag>,
        },
        {
            title: "Subtype", dataIndex: "account_subtype", key: "account_subtype", width: 160,
            render: (v: string) => v
                ? <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>
                : <Text type="secondary">—</Text>,
        },
        {
            title: "Normal Balance", dataIndex: "normal_balance", key: "normal_balance", width: 120,
            render: (v: string) => (
                <Tag color={v === "DEBIT" ? "blue" : "green"} style={{ fontSize: 11 }}>{v}</Tag>
            ),
        },
        {
            title: "Current Balance", dataIndex: "current_balance", key: "current_balance",
            width: 150, align: "right" as const,
            render: (v: number, r: ChartOfAccount) => (
                <Text strong style={{ color: BALANCE_COLOR(r) }}>
                    {(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </Text>
            ),
        },
        {
            title: "Status", dataIndex: "is_active", key: "is_active", width: 90,
            render: (v: boolean) => v
                ? <Badge status="success" text="Active" />
                : <Badge status="default" text="Inactive" />,
        },
        {
            title: "Actions", key: "actions", width: 150, fixed: "right" as const,
            render: (_: any, r: ChartOfAccount) => (
                <Space size={4}>
                    <Tooltip title="View Ledger">
                        <Button icon={<BookOutlined />} size="small" onClick={() => openLedger(r)} />
                    </Tooltip>
                    <Tooltip title="Edit">
                        <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
                    </Tooltip>
                    <Tooltip title={r.is_active ? "Deactivate" : "Activate"}>
                        <Popconfirm
                            title={`${r.is_active ? "Deactivate" : "Activate"} this account?`}
                            onConfirm={() => toggleMutation.mutate(r._id)}
                            okText="Yes" cancelText="No"
                        >
                            <Button
                                icon={<PoweroffOutlined />} size="small"
                                danger={r.is_active}
                                type={r.is_active ? "default" : "primary"}
                                ghost={!r.is_active}
                            />
                        </Popconfirm>
                    </Tooltip>
                    {!r.is_system_account && (
                        <Tooltip title="Delete">
                            <Popconfirm
                                title="Delete this account?"
                                description="Blocked if used in journal entries."
                                onConfirm={() => deleteMutation.mutate(r._id)}
                                okText="Delete" okButtonProps={{ danger: true }} cancelText="Cancel"
                            >
                                <Button icon={<DeleteOutlined />} size="small" danger />
                            </Popconfirm>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    const tabItems = ALL_TYPES.map((type) => {
        const count = type === "ALL"
            ? allAccounts.length
            : allAccounts.filter((a) => a.account_type === type).length;
        return {
            key: type,
            label: (
                <Space size={4}>
                    {type === "ALL" ? "All" : type}
                    {count > 0 && (
                        <Tag
                            color={type === "ALL" ? "default" : TYPE_COLORS[type as AccountType]}
                            style={{ fontSize: 10, lineHeight: "16px", padding: "0 5px", marginLeft: 2 }}
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
            <Card
                bordered
                bodyStyle={{ padding: 0 }}
                title={
                    <Space>
                        <BankOutlined style={{ fontSize: 18, color: primaryColor }} />
                        <Text strong style={{ fontSize: 16 }}>Chart of Accounts</Text>
                    </Space>
                }
                extra={
                    <Space>
                        <Tooltip title="Seed 40+ default accounts — safe on a fresh setup">
                            <Button icon={<ThunderboltOutlined />} onClick={handleSeed} loading={seeding}>
                                Seed Defaults
                            </Button>
                        </Tooltip>
                        <Button
                            type="primary" icon={<PlusOutlined />} onClick={openCreate}
                            style={{ background: primaryColor, borderColor: primaryColor }}
                        >
                            New Account
                        </Button>
                    </Space>
                }
            >
                <Tabs
                    activeKey={activeType}
                    onChange={handleTabChange}
                    items={tabItems}
                    style={{ paddingLeft: 16, paddingRight: 16, marginBottom: 0 }}
                    tabBarStyle={{ marginBottom: 0 }}
                />

                <ProTable<ChartOfAccount>
                    rowKey="_id"
                    actionRef={actionRef}
                    dataSource={paginatedAccounts}
                    columns={columns}
                    loading={isLoading}
                    search={false}
                    options={{ reload: () => refetch(), fullScreen: true }}
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: filteredAccounts.length,
                        pageSizeOptions: [10, 20, 50, 100],
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} accounts`,
                        onChange: handlePageChange,
                        onShowSizeChange: (current, size) => {
                            setPageSize(size);
                            setCurrentPage(1);
                        },
                    }}
                    scroll={{ x: 1000 }}
                    size="small"
                    cardBordered={false}
                    toolbar={{
                        title: `${filteredAccounts.length} ${activeType === "ALL" ? "total" : activeType.toLowerCase()} accounts`,
                        tooltip: "System accounts cannot be deleted but can be deactivated",
                    }}
                    rowClassName={(r) => !r.is_active ? "opacity-50" : ""}
                    columnsState={{
                        persistenceKey: "coa-table-columns",
                        persistenceType: "localStorage",
                    }}
                />
            </Card>

            <AccountFormDrawer
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSuccess={onFormSuccess}
                editingAccount={editingAccount}
                accounts={allAccounts}
            />

            <AccountLedgerDrawer
                open={ledgerOpen}
                onClose={() => setLedgerOpen(false)}
                account={ledgerAccount}
            />
        </App>
    );
};

export default ChartOfAccountsPage;