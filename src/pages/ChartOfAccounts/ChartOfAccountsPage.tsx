import React, { useRef, useState, useCallback } from "react";
import { ProTable, ActionType } from "@ant-design/pro-components";
import {
    Button, Space, Tag, Tooltip, Popconfirm,
    Typography, Badge, Card, Tabs, App, Dropdown, MenuProps,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    PoweroffOutlined, BookOutlined, ThunderboltOutlined, BankOutlined,
    DownloadOutlined, FilePdfOutlined, FileExcelOutlined,
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

const isMainAccount = (r: ChartOfAccount) => r.is_parent === true;

// ── Export helpers ────────────────────────────────────────────────────────────
const exportToExcel = async (accounts: ChartOfAccount[], activeType: AccountType | "ALL") => {
    const XLSX = await import("xlsx");
    const rows = accounts.map((a) => ({
        Code: a.account_code,
        "Account Name": a.account_name,
        Type: a.account_type,
        Subtype: a.account_subtype || "",
        "Normal Balance": a.normal_balance,
        "Current Balance": a.current_balance ?? 0,
        Status: a.is_active ? "Active" : "Inactive",
        "System Account": a.is_system_account ? "Yes" : "No",
        "Bank/Cash": a.is_bank_account ? "Yes" : "No",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
        wch: Math.max(key.length, ...rows.map((r) => String((r as any)[key]).length)) + 2,
    }));
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeType === "ALL" ? "All Accounts" : `${activeType} Accounts`);
    XLSX.writeFile(wb, `chart-of-accounts-${activeType.toLowerCase()}-${Date.now()}.xlsx`);
};

const exportToPdf = async (accounts: ChartOfAccount[], activeType: AccountType | "ALL") => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(activeType === "ALL" ? "Chart of Accounts" : `${activeType} Accounts`, 14, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generated: ${new Date().toLocaleString("en-KE")}`, 14, 20);
    doc.setTextColor(0);
    autoTable(doc, {
        startY: 25,
        head: [["Code", "Account Name", "Type", "Subtype", "Normal Bal.", "Balance (KES)", "Status"]],
        body: accounts.map((a) => [
            a.account_code,
            ("—".repeat(Math.max(0, (a.level || 1) - 1)) + " " + a.account_name).trim(),
            a.account_type,
            a.account_subtype || "—",
            a.normal_balance,
            (a.current_balance ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 }),
            a.is_active ? "Active" : "Inactive",
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [24, 144, 255], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 248, 255] },
        columnStyles: { 0: { cellWidth: 20 }, 5: { halign: "right" } },
    });
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() - 30,
            doc.internal.pageSize.getHeight() - 5,
        );
    }
    doc.save(`chart-of-accounts-${activeType.toLowerCase()}-${Date.now()}.pdf`);
};

// ── Component ─────────────────────────────────────────────────────────────────
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
    const [exporting, setExporting] = useState(false);

    // FIX: declare pagination state that was used but never defined
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["chart-of-accounts", shopId],
        queryFn: () => getAllAccounts({ shop_id: shopId }),
        enabled: !!shopId,
    });

    const allAccounts: ChartOfAccount[] = data?.accounts || [];

    const filteredAccounts = activeType === "ALL"
        ? allAccounts
        : allAccounts.filter((a) => a.account_type === activeType);

    // FIX: reference filteredAccounts (not the undefined `accounts`) for pagination
    const paginatedAccounts = filteredAccounts.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
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

    // FIX: pass filteredAccounts (not undefined `accounts`) to export helpers
    const handleExport = async (type: "excel" | "pdf") => {
        setExporting(true);
        try {
            if (type === "excel") await exportToExcel(filteredAccounts, activeType);
            else await exportToPdf(filteredAccounts, activeType);
        } finally {
            setExporting(false);
        }
    };

    const exportMenuItems: MenuProps["items"] = [
        {
            key: "excel",
            icon: <FileExcelOutlined style={{ color: "#217346" }} />,
            label: "Export to Excel (.xlsx)",
            onClick: () => handleExport("excel"),
        },
        {
            key: "pdf",
            icon: <FilePdfOutlined style={{ color: "#e53935" }} />,
            label: "Export to PDF",
            onClick: () => handleExport("pdf"),
        },
    ];

    const openCreate = () => { setEditingAccount(null); setFormOpen(true); };
    const openEdit = (r: ChartOfAccount) => { setEditingAccount(r); setFormOpen(true); };
    const openLedger = (r: ChartOfAccount) => { setLedgerAccount(r); setLedgerOpen(true); };

    const onFormSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", shopId] });
    }, [queryClient, shopId]);

    const handleTabChange = (key: string) => {
        setActiveType(key as AccountType | "ALL");
        setCurrentPage(1);
    };

    const handlePageChange = (page: number, newPageSize: number) => {
        setCurrentPage(page);
        if (newPageSize !== pageSize) {
            setPageSize(newPageSize);
            setCurrentPage(1);
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
                    {r.is_parent && (
                        <Tag color="geekblue" style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}>
                            MAIN
                        </Tag>
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
            render: (_: any, r: ChartOfAccount) => {
                const isMain = isMainAccount(r);
                return (
                    <Space size={4}>
                        <Tooltip title="View Ledger">
                            <Button icon={<BookOutlined />} size="small" onClick={() => openLedger(r)} />
                        </Tooltip>
                        <Tooltip title={isMain ? "Main accounts cannot be edited" : "Edit"}>
                            <Button
                                icon={<EditOutlined />} size="small"
                                onClick={() => !isMain && openEdit(r)}
                                disabled={isMain}
                            />
                        </Tooltip>
                        <Tooltip title={isMain ? "Main accounts cannot be deactivated" : (r.is_active ? "Deactivate" : "Activate")}>
                            <span>
                                <Popconfirm
                                    title={`${r.is_active ? "Deactivate" : "Activate"} this account?`}
                                    onConfirm={() => toggleMutation.mutate(r._id)}
                                    okText="Yes" cancelText="No" disabled={isMain}
                                >
                                    <Button
                                        icon={<PoweroffOutlined />} size="small"
                                        danger={r.is_active && !isMain}
                                        type={!isMain && !r.is_active ? "primary" : "default"}
                                        ghost={!isMain && !r.is_active}
                                        disabled={isMain}
                                    />
                                </Popconfirm>
                            </span>
                        </Tooltip>
                        {!r.is_system_account && (
                            <Tooltip title={isMain ? "Main accounts cannot be deleted" : "Delete"}>
                                <span>
                                    <Popconfirm
                                        title="Delete this account?"
                                        description="Blocked if used in journal entries."
                                        onConfirm={() => deleteMutation.mutate(r._id)}
                                        okText="Delete" okButtonProps={{ danger: true }}
                                        cancelText="Cancel" disabled={isMain}
                                    >
                                        <Button
                                            icon={<DeleteOutlined />} size="small"
                                            danger={!isMain} disabled={isMain}
                                        />
                                    </Popconfirm>
                                </span>
                            </Tooltip>
                        )}
                    </Space>
                );
            },
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
                        <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight" disabled={exporting}>
                            <Button icon={<DownloadOutlined />} loading={exporting}>Export</Button>
                        </Dropdown>
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
                        pageSize,
                        total: filteredAccounts.length,
                        pageSizeOptions: [10, 20, 50, 100],
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} accounts`,
                        onChange: handlePageChange,
                        onShowSizeChange: (_, size) => {
                            setPageSize(size);
                            setCurrentPage(1);
                        },
                    }}
                    scroll={{ x: 1000 }}
                    size="small"
                    cardBordered={false}
                    toolbar={{
                        // FIX: was `accounts.length` (undefined) — now filteredAccounts.length
                        title: `${filteredAccounts.length} ${activeType === "ALL" ? "total" : activeType.toLowerCase()} accounts`,
                        tooltip: "Main & system accounts cannot be edited, deactivated or deleted",
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
                shopId={shopId}
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