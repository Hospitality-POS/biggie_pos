import React, { useState, useEffect } from "react";
import {
    Drawer, Table, Typography, Space, Tag, Tooltip,
    Statistic, Row, Col, DatePicker, Button, Dropdown, MenuProps, Pagination,
} from "antd";
import {
    ArrowUpOutlined, ArrowDownOutlined,
    DownloadOutlined, FileExcelOutlined, FilePdfOutlined,
    EditOutlined, ApartmentOutlined, AuditOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getAccountLedger,
    ChartOfAccount,
    LedgerLine,
} from "@services/accounting/accounts";
import JournalEntryFormDrawer from "../JournalEntry/JournalEntryFormDrawer";
import SplitJournalLineModal from "@components/accounting/SplitJournalLineModal";
import ReconcileStatementDrawer from "../Banking/ReconcileStatementDrawer";
import dayjs, { Dayjs } from "dayjs";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

interface Props {
    open: boolean;
    onClose: () => void;
    account: ChartOfAccount | null;
    shopId: string;
    initialFrom?: Dayjs | null;
    initialTo?: Dayjs | null;
}

const SOURCE_COLORS: Record<string, string> = {
    manual: "default",
    journal: "magenta",
    pos_sale: "blue",
    pos_subscription: "cyan",
    invoice: "green",
    bill: "orange",
    payment: "purple",
    reconciliation: "geekblue",
    bank_upload: "gold",
    income: "green",
    expense: "orange",
    payroll: "purple",
    credit_note: "cyan",
    debit_note: "blue",
    note_void: "red",
};

// Readable transaction type for each journal source (Zoho-style "Transaction Type")
const SOURCE_LABELS: Record<string, string> = {
    manual: "Manual Journal",
    journal: "Journal",
    pos_sale: "POS Sale",
    pos_subscription: "POS Subscription",
    invoice: "Invoice",
    bill: "Bill",
    payment: "Payment",
    reconciliation: "Reconciliation",
    bank_upload: "Bank Upload",
    income: "Income",
    expense: "Expense",
    payroll: "Payroll",
    sales_receipt: "Sales Receipt",
    credit_note: "Credit Note",
    debit_note: "Debit Note",
    note_void: "Note Void",
    asset_acquisition: "Asset Acquisition",
    asset_depreciation: "Asset Depreciation",
    asset_revaluation: "Asset Revaluation",
    asset_disposal: "Asset Disposal",
    asset_impairment: "Asset Impairment",
};

const sourceLabel = (s?: string) =>
    (s && SOURCE_LABELS[s]) || (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// The corresponding account(s) — the other side of the entry, e.g. the bank
// it was paid from. Several → the main one plus "+N more".
const counterLabel = (l: LedgerLine) => {
    const list = l.counter_accounts || [];
    if (!list.length) return "";
    return list.length === 1 ? list[0].account_name : `${list[0].account_name} +${list.length - 1} more`;
};
const counterFull = (l: LedgerLine) =>
    (l.counter_accounts || []).map((c) => `${c.account_code ? `${c.account_code} ` : ""}${c.account_name}`).join(", ");

// Entry description plus this account's own line note, when it adds something
const detailsText = (l: LedgerLine) =>
    [l.description, l.line_description].filter(Boolean).join(" — ");

const money = (v: number) => Number(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// A ledger table row — the opening-balance row is a pseudo line
type LedgerRow = LedgerLine & { _opening?: boolean };

// ── Export helpers ────────────────────────────────────────────────────────────

const exportLedgerToExcel = async (
    ledger: LedgerLine[],
    account: ChartOfAccount,
    dateRange: [Dayjs | null, Dayjs | null],
    totals: { totalDebit: number; totalCredit: number; closing: number }
) => {
    const XLSX = await import("xlsx");

    const period = `${dateRange[0]?.format("DD/MM/YYYY")} – ${dateRange[1]?.format("DD/MM/YYYY")}`;

    const rows = ledger.map((l) => ({
        Date: dayjs(l.entry_date).format("DD/MM/YYYY"),
        Account: counterFull(l),
        "Transaction Details": detailsText(l),
        "Transaction Type": sourceLabel(l.source),
        "Transaction #": l.entry_no,
        "Reference #": l.reference || "",
        "Debit (KES)": l.debit || 0,
        "Credit (KES)": l.credit || 0,
        "Balance (KES)": l.balance,
    }));

    // Totals row
    rows.push({
        Date: "",
        Account: "",
        "Transaction Details": "TOTALS",
        "Transaction Type": "",
        "Transaction #": "",
        "Reference #": "",
        "Debit (KES)": totals.totalDebit,
        "Credit (KES)": totals.totalCredit,
        "Balance (KES)": totals.closing,
    } as any);

    // Title block (account + period) above the column headers, like the on-screen report
    const headers = Object.keys(rows[0] || {});
    const dataWs = XLSX.utils.aoa_to_sheet([
        [account.account_name.toUpperCase()],
        [`${account.account_code} · ${period}`],
        [`Generated: ${dayjs().format("DD/MM/YYYY HH:mm")}`],
        [],
        headers,
        ...rows.map((r) => headers.map((h) => (r as any)[h])),
    ]);
    dataWs["!cols"] = [
        { wch: 12 }, { wch: 28 }, { wch: 44 }, { wch: 18 }, { wch: 22 }, { wch: 20 },
        { wch: 14 }, { wch: 14 }, { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataWs, "Ledger");
    XLSX.writeFile(
        wb,
        `ledger-${account.account_code}-${dayjs().format("YYYYMMDD")}.xlsx`
    );
};

const exportLedgerToPdf = async (
    ledger: LedgerLine[],
    account: ChartOfAccount,
    dateRange: [Dayjs | null, Dayjs | null],
    totals: { totalDebit: number; totalCredit: number; closing: number }
) => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("@utils/autoTable");

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const period = `${dateRange[0]?.format("DD/MM/YYYY")} – ${dateRange[1]?.format("DD/MM/YYYY")}`;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`Account Ledger — ${account.account_code} ${account.account_name}`, 14, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Period: ${period}`, 14, 20);
    doc.text(`Generated: ${dayjs().format("DD MMM YYYY HH:mm")}`, 14, 25);
    doc.setTextColor(0);

    // Summary band
    doc.setFontSize(8);
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(14, 28, 268, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.text(`Total Debits: KES ${totals.totalDebit.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`, 18, 34);
    doc.text(`Total Credits: KES ${totals.totalCredit.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`, 110, 34);
    doc.text(
        `Closing Balance: KES ${Math.abs(totals.closing).toLocaleString("en-KE", { minimumFractionDigits: 2 })} ${totals.closing < 0 ? "(CR)" : "(DR)"}`,
        200, 34
    );
    doc.setFont("helvetica", "normal");

    autoTable(doc, {
        startY: 42,
        head: [["Date", "Account", "Transaction Details", "Type", "Transaction #", "Reference #", "Debit (KES)", "Credit (KES)", "Balance (KES)"]],
        body: [
            ...ledger.map((l) => [
                dayjs(l.entry_date).format("DD/MM/YYYY"),
                counterFull(l),
                detailsText(l),
                sourceLabel(l.source),
                l.entry_no,
                l.reference || "",
                l.debit > 0 ? l.debit.toLocaleString("en-KE", { minimumFractionDigits: 2 }) : "—",
                l.credit > 0 ? l.credit.toLocaleString("en-KE", { minimumFractionDigits: 2 }) : "—",
                l.balance.toLocaleString("en-KE", { minimumFractionDigits: 2 }),
            ]),
            // Totals row
            [
                "", "", { content: "TOTALS", styles: { fontStyle: "bold" } }, "", "", "",
                { content: totals.totalDebit.toLocaleString("en-KE", { minimumFractionDigits: 2 }), styles: { fontStyle: "bold", textColor: [207, 19, 34] } },
                { content: totals.totalCredit.toLocaleString("en-KE", { minimumFractionDigits: 2 }), styles: { fontStyle: "bold", textColor: [56, 158, 13] } },
                { content: Math.abs(totals.closing).toLocaleString("en-KE", { minimumFractionDigits: 2 }), styles: { fontStyle: "bold", textColor: totals.closing >= 0 ? [29, 57, 196] : [207, 19, 34] } },
            ],
        ],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [24, 144, 255], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 255] },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 34 },
            2: { cellWidth: 58 },
            3: { cellWidth: 22 },
            4: { cellWidth: 30 },
            5: { cellWidth: 24 },
            6: { halign: "right", cellWidth: 26 },
            7: { halign: "right", cellWidth: 26 },
            8: { halign: "right", cellWidth: 28 },
        },
    });

    // Page numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() - 30,
            doc.internal.pageSize.getHeight() - 5
        );
    }

    doc.save(`ledger-${account.account_code}-${dayjs().format("YYYYMMDD")}.pdf`);
};

// ─────────────────────────────────────────────────────────────────────────────

const AccountLedgerDrawer: React.FC<Props> = ({ open, onClose, account, shopId, initialFrom, initialTo }) => {
    const queryClient = useQueryClient();
    const [editEntryId, setEditEntryId] = useState<string | null>(null);
    const [splitEntryId, setSplitEntryId] = useState<string | null>(null);
    const [verifyOpen, setVerifyOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [exporting, setExporting] = useState(false);
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
        initialFrom ?? null,
        initialTo ?? dayjs().endOf("month"),
    ]);

    useEffect(() => {
        if (open) {
            setPage(1);
            setDateRange([
                initialFrom ?? null,
                initialTo ?? dayjs().endOf("month"),
            ]);
        }
    }, [open, initialFrom, initialTo]);

    const from = dateRange[0]?.startOf("day").toISOString();
    const to = dateRange[1]?.endOf("day").toISOString();

    const { data, isLoading } = useQuery({
        queryKey: ["account-ledger", account?._id, page, pageSize, from, to],
        queryFn: () =>
            getAccountLedger(account!._id, { shop_id: shopId, from, to, page, limit: pageSize }),
        enabled: open && !!account?._id,
        keepPreviousData: true,
    });

    // Fetch all pages for summary statistics
    const { data: allPagesData } = useQuery({
        queryKey: ["account-ledger-all", account?._id, from, to],
        queryFn: async () => {
            const allLedger: LedgerLine[] = [];
            let currentPage = 1;
            let hasMore = true;
            
            while (hasMore) {
                const response = await getAccountLedger(account!._id, { 
                    shop_id: shopId, 
                    from, 
                    to, 
                    page: currentPage, 
                    limit: 100 
                });
                allLedger.push(...response.ledger);
                hasMore = currentPage < response.pagination.totalPages;
                currentPage++;
            }
            
            return allLedger;
        },
        enabled: open && !!account?._id,
    });

    const ledger = data?.ledger || [];
    const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };
    const openingBalance = data?.account?.opening_running_balance ?? data?.account?.opening_balance ?? 0;
    const normalBalance = data?.account?.normal_balance ?? "DEBIT";

    const isDr = (val: number) =>
        (normalBalance === "DEBIT" && val >= 0) || (normalBalance === "CREDIT" && val < 0);

    // Calculate totals from all pages
    const totalDebit = allPagesData?.reduce((s, l) => s + (l.debit || 0), 0) || 0;
    const totalCredit = allPagesData?.reduce((s, l) => s + (l.credit || 0), 0) || 0;
    const closing = normalBalance === "DEBIT"
        ? openingBalance + totalDebit - totalCredit
        : openingBalance + totalCredit - totalDebit;

    // Calculate page totals for current page
    const pageTotalDebit = ledger.reduce((s, l) => s + (l.debit || 0), 0);
    const pageTotalCredit = ledger.reduce((s, l) => s + (l.credit || 0), 0);
    const pageClosing = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;

    // An edit or split moves amounts between accounts — refresh this ledger
    // and the reports / balances behind it
    const refreshBooks = () => {
        queryClient.invalidateQueries({ queryKey: ["account-ledger"] });
        queryClient.invalidateQueries({ queryKey: ["account-ledger-all"] });
        queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
        queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("rpt-") });
    };

    const handleExport = async (type: "excel" | "pdf") => {
        if (!account) return;
        setExporting(true);
        try {
            // Fetch all pages of ledger data
            const allLedger: LedgerLine[] = [];
            let currentPage = 1;
            let hasMore = true;
            
            while (hasMore) {
                const response = await getAccountLedger(account._id, { 
                    shop_id: shopId, 
                    from, 
                    to, 
                    page: currentPage, 
                    limit: 100 
                });
                allLedger.push(...response.ledger);
                hasMore = currentPage < response.pagination.totalPages;
                currentPage++;
            }
            
            // Calculate totals from all data
            const totalDebit = allLedger.reduce((s, l) => s + (l.debit || 0), 0);
            const totalCredit = allLedger.reduce((s, l) => s + (l.credit || 0), 0);
            const closing = allLedger.length > 0 ? allLedger[allLedger.length - 1].balance : 0;
            const allTotals = { totalDebit, totalCredit, closing };
            
            if (type === "excel") await exportLedgerToExcel(allLedger, account, dateRange, allTotals);
            else await exportLedgerToPdf(allLedger, account, dateRange, allTotals);
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

    // Zoho-style column header: small and uppercase (colour comes from the table theme)
    const head = (t: string) => (
        <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>{t}</span>
    );
    const drCr = (v: number) => (isDr(v) ? "Dr" : "Cr");

    const columns = [
        {
            title: head("Date"),
            dataIndex: "entry_date",
            key: "entry_date",
            width: 110,
            render: (d: string) => dayjs(d).format("DD/MM/YYYY"),
        },
        {
            title: head("Account"),
            key: "account",
            width: 200,
            render: (_: unknown, l: LedgerLine) => {
                const label = counterLabel(l);
                if (!label) return <Text type="secondary">—</Text>;
                return (
                    <Tooltip title={(l.counter_accounts || []).length > 1 ? counterFull(l) : undefined}>
                        <Text strong style={{ fontSize: 13, color: "#0f172a" }}>{label}</Text>
                    </Tooltip>
                );
            },
        },
        {
            title: head("Transaction Details"),
            key: "details",
            render: (_: unknown, l: LedgerLine) => (
                <div style={{ lineHeight: 1.35 }}>
                    <Text style={{ fontSize: 13, color: "#1e293b" }}>{l.description || "—"}</Text>
                    {l.line_description && (
                        <div><Text type="secondary" style={{ fontSize: 12 }}>{l.line_description}</Text></div>
                    )}
                </div>
            ),
        },
        {
            title: head("Transaction Type"),
            dataIndex: "source",
            key: "source",
            width: 150,
            render: (s: string) => (
                <Tag color={SOURCE_COLORS[s] || "default"} style={{ fontSize: 11, margin: 0 }}>
                    {sourceLabel(s)}
                </Tag>
            ),
        },
        {
            title: head("Transaction #"),
            dataIndex: "entry_no",
            key: "entry_no",
            width: 170,
            render: (v: string) => <Text style={{ fontSize: 12, color: "#475569", wordBreak: "break-all" }}>{v}</Text>,
        },
        {
            title: head("Reference #"),
            dataIndex: "reference",
            key: "reference",
            width: 150,
            render: (v: string) => v ? <Text style={{ fontSize: 12.5 }}>{v}</Text> : <Text type="secondary">—</Text>,
        },
        {
            title: head("Debit"),
            dataIndex: "debit",
            key: "debit",
            width: 130,
            align: "right" as const,
            render: (v: number) =>
                v > 0 ? <Text style={{ color: "#1d4ed8", fontWeight: 500 }}>{money(v)}</Text> : <Text type="secondary">—</Text>,
        },
        {
            title: head("Credit"),
            dataIndex: "credit",
            key: "credit",
            width: 130,
            align: "right" as const,
            render: (v: number) =>
                v > 0 ? <Text style={{ color: "#1d4ed8", fontWeight: 500 }}>{money(v)}</Text> : <Text type="secondary">—</Text>,
        },
        {
            title: head("Balance"),
            dataIndex: "balance",
            key: "balance",
            width: 150,
            align: "right" as const,
            render: (v: number) => (
                <Text strong style={{ color: "#0f172a" }}>
                    {money(Math.abs(v))} <Text type="secondary" style={{ fontSize: 11 }}>{drCr(v)}</Text>
                </Text>
            ),
        },
        {
            title: "",
            key: "actions",
            width: 72,
            render: (_: unknown, l: LedgerLine) =>
                l.entry_id ? (
                    <Space size={2}>
                        <Tooltip title="Edit transaction">
                            <Button icon={<EditOutlined />} size="small" type="text" onClick={() => setEditEntryId(l.entry_id)} />
                        </Tooltip>
                        <Tooltip title="Split across accounts">
                            <Button icon={<ApartmentOutlined />} size="small" type="text" onClick={() => setSplitEntryId(l.entry_id)} />
                        </Tooltip>
                    </Space>
                ) : null,
        },
    ];

    // Page 1 starts with an "As On <from> · Opening Balance" row, like Zoho.
    // It spans the text columns and shows the opening balance on the right.
    const rows: LedgerRow[] = pagination.page === 1 && ledger.length > 0
        ? [{ _opening: true, entry_id: "", entry_no: "", entry_date: "", description: "", source: "", debit: 0, credit: 0, balance: openingBalance }, ...ledger]
        : ledger;
    const OPENING_TEXT_SPAN = 6; // Date … Reference #
    const tableColumns = columns.map((col, i) => ({
        ...col,
        onCell: (r: LedgerRow) => {
            if (!r._opening) return {};
            if (i === 0) return { colSpan: 1 };
            if (i === 1) return { colSpan: OPENING_TEXT_SPAN - 1 };
            if (i < OPENING_TEXT_SPAN) return { colSpan: 0 };
            return {};
        },
        render: (v: any, r: LedgerRow, idx: number) => {
            if (!r._opening) return (col.render as any)?.(v, r, idx) ?? v;
            if (i === 0) return (dateRange[0] ? <Text strong>As On {dateRange[0].format("DD/MM/YYYY")}</Text> : null);
            if (i === 1) return <Text strong>Opening Balance</Text>;
            if (col.key === "balance") {
                return <Text strong>{money(Math.abs(openingBalance))} <Text type="secondary" style={{ fontSize: 11 }}>{drCr(openingBalance)}</Text></Text>;
            }
            return null;
        },
    }));

    return (
        <Drawer
            title={
                <Space direction="vertical" size={0}>
                    <Title level={5} style={{ margin: 0 }}>Account Ledger</Title>
                    {account && (
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {account.account_code} — {account.account_name}
                        </Text>
                    )}
                </Space>
            }
            open={open}
            onClose={() => { onClose(); setPage(1); }}
            width="100%"
            styles={{ body: { background: "#f1f5f9", padding: 20 } }}
            destroyOnClose
            extra={
                <Space>
                    <Tooltip title="Upload this account's bank statement to see why the ledger doesn't match it">
                        <Button icon={<AuditOutlined />} size="small" onClick={() => setVerifyOpen(true)} disabled={!account}>
                            Verify vs Statement
                        </Button>
                    </Tooltip>
                    <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight" disabled={exporting || ledger.length === 0}>
                        <Button icon={<DownloadOutlined />} loading={exporting} size="small">
                            Export
                        </Button>
                    </Dropdown>
                </Space>
            }
        >
            {/* ── Date Range Filter ── */}
            <Space style={{ marginBottom: 16 }} wrap>
                <Text type="secondary">Period:</Text>
                <RangePicker
                    value={dateRange}
                    onChange={(range) => {
                        setDateRange(range as [Dayjs | null, Dayjs | null]);
                        setPage(1);
                    }}
                    allowClear={false}
                    format="DD MMM YYYY"
                    presets={[
                        { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
                        { label: "Last Month", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
                        { label: "This Year", value: [dayjs().startOf("year"), dayjs().endOf("year")] },
                        { label: "Last 30 Days", value: [dayjs().subtract(30, "day"), dayjs()] },
                        { label: "Last 90 Days", value: [dayjs().subtract(90, "day"), dayjs()] },
                    ]}
                />
            </Space>

            {/* ── Summary Stats ── */}
            <Row gutter={[16, 12]} style={{ marginBottom: 16, background: "#fff", borderRadius: 10, padding: "14px 8px", border: "1px solid #e2e8f0", marginLeft: 0, marginRight: 0 }}>
                <Col xs={12} md={6}>
                    <Statistic
                        title="Opening Balance"
                        value={Math.abs(openingBalance)}
                        precision={2}
                        prefix="KES"
                        valueStyle={{ color: "#64748b", fontSize: 16 }}
                        suffix={isDr(openingBalance) ? "(DR)" : "(CR)"}
                    />
                </Col>
                <Col xs={12} md={6}>
                    <Statistic
                        title="Total Debits"
                        value={totalDebit}
                        precision={2}
                        prefix="KES"
                        valueStyle={{ color: "#cf1322", fontSize: 16 }}
                        suffix={<ArrowUpOutlined />}
                    />
                </Col>
                <Col xs={12} md={6}>
                    <Statistic
                        title="Total Credits"
                        value={totalCredit}
                        precision={2}
                        prefix="KES"
                        valueStyle={{ color: "#389e0d", fontSize: 16 }}
                        suffix={<ArrowDownOutlined />}
                    />
                </Col>
                <Col xs={12} md={6}>
                    <Statistic
                        title="Closing Balance"
                        value={Math.abs(closing)}
                        precision={2}
                        prefix="KES"
                        valueStyle={{ color: closing >= 0 ? "#1d39c4" : "#cf1322", fontSize: 16 }}
                        suffix={isDr(closing) ? "(DR)" : "(CR)"}
                    />
                </Col>
            </Row>

            {/* ── Ledger report — Zoho-style: centred account title, then the table ── */}
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ textAlign: "center", padding: "22px 16px 16px", borderBottom: "1px solid #e2e8f0" }}>
                <Title level={4} style={{ margin: 0, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600 }}>
                    {account?.account_name}
                </Title>
                <Text type="secondary" style={{ fontSize: 13.5 }}>
                    {account?.account_code ? `${account.account_code} · ` : ""}
                    From {dateRange[0] ? dateRange[0].format("DD/MM/YYYY") : "the beginning"} To {dateRange[1]?.format("DD/MM/YYYY")}
                </Text>
            </div>
            <Table<LedgerRow>
                rowKey={(r, i) => (r._opening ? "opening" : `${r.entry_no}-${i}`)}
                columns={tableColumns}
                dataSource={rows}
                loading={isLoading}
                size="middle"
                scroll={{ x: 1400 }}
                onRow={(r) => (r._opening ? { style: { background: "#f8fafc" } } : {})}
                // Paged by the server — a separate Pagination below so the extra
                // opening-balance row never makes the Table trim a transaction
                pagination={false}
                locale={{ emptyText: "No transactions in this period" }}
                summary={() =>
                    ledger.length > 0 ? (
                        <Table.Summary>
                            <Table.Summary.Row style={{ background: "#f8fafc" }}>
                                <Table.Summary.Cell index={0} colSpan={6}>
                                    <Text strong>Page Total</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={6} align="right">
                                    <Text strong>{money(pageTotalDebit)}</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={7} align="right">
                                    <Text strong>{money(pageTotalCredit)}</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={8} align="right">
                                    <Text strong>{money(Math.abs(pageClosing))} <Text type="secondary" style={{ fontSize: 11 }}>{drCr(pageClosing)}</Text></Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={9} />
                            </Table.Summary.Row>
                            {pagination.page >= pagination.totalPages && (
                                <Table.Summary.Row style={{ background: "#eef2ff" }}>
                                    <Table.Summary.Cell index={0}>
                                        <Text strong>As On {dateRange[1]?.format("DD/MM/YYYY")}</Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={1} colSpan={5}>
                                        <Text strong>Closing Balance</Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={6} align="right">
                                        <Text strong>{money(totalDebit)}</Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={7} align="right">
                                        <Text strong>{money(totalCredit)}</Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={8} align="right">
                                        <Text strong style={{ color: "#1d39c4" }}>
                                            {money(Math.abs(closing))} <Text type="secondary" style={{ fontSize: 11 }}>{drCr(closing)}</Text>
                                        </Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={9} />
                                </Table.Summary.Row>
                            )}
                        </Table.Summary>
                    ) : null
                }
            />
            {pagination.total > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px", borderTop: "1px solid #e2e8f0" }}>
                    <Pagination
                        size="small"
                        current={pagination.page}
                        total={pagination.total}
                        pageSize={pageSize}
                        pageSizeOptions={[10, 25, 50, 100]}
                        showSizeChanger
                        showTotal={(total) => `${total} transactions`}
                        onChange={(p, size) => {
                            if (size !== pageSize) {
                                setPageSize(size);
                                setPage(1);
                            } else {
                                setPage(p);
                            }
                        }}
                    />
                </div>
            )}
            </div>

            {/* ── Edit the whole entry behind a ledger row ── */}
            <JournalEntryFormDrawer
                open={!!editEntryId}
                entryId={editEntryId}
                shopId={shopId}
                onClose={() => setEditEntryId(null)}
                onSuccess={() => {
                    setEditEntryId(null);
                    refreshBooks();
                }}
            />

            {/* ── Verify the ledger against an uploaded bank statement ── */}
            <ReconcileStatementDrawer
                mode="ledger"
                open={verifyOpen}
                onClose={() => setVerifyOpen(false)}
                onSuccess={refreshBooks}
                // Imports need a branch — use the current one when the report spans all
                shopId={shopId || localStorage.getItem("shopId") || ""}
                ledgerShopId={shopId}
                presetAccountId={account?._id}
                presetAccountName={account ? `${account.account_code} — ${account.account_name}` : undefined}
            />

            {/* ── Split this account's line across accounts ── */}
            <SplitJournalLineModal
                entryId={splitEntryId}
                accountId={account?._id}
                onClose={() => setSplitEntryId(null)}
                onSaved={refreshBooks}
            />
        </Drawer>
    );
};

export default AccountLedgerDrawer;