import React, { useState } from "react";
import {
    Drawer, Table, Typography, Space, Tag,
    Statistic, Row, Col, DatePicker, Button, Dropdown, MenuProps,
} from "antd";
import {
    ArrowUpOutlined, ArrowDownOutlined,
    DownloadOutlined, FileExcelOutlined, FilePdfOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
    getAccountLedger,
    ChartOfAccount,
    LedgerLine,
} from "@services/accounting/accounts";
import dayjs, { Dayjs } from "dayjs";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

interface Props {
    open: boolean;
    onClose: () => void;
    account: ChartOfAccount | null;
    shopId: string;
}

const SOURCE_COLORS: Record<string, string> = {
    manual: "default",
    pos_sale: "blue",
    pos_subscription: "cyan",
    invoice: "green",
    bill: "orange",
    payment: "purple",
    reconciliation: "geekblue",
};

// ── Export helpers ────────────────────────────────────────────────────────────

const exportLedgerToExcel = async (
    ledger: LedgerLine[],
    account: ChartOfAccount,
    dateRange: [Dayjs | null, Dayjs | null],
    totals: { totalDebit: number; totalCredit: number; closing: number }
) => {
    const XLSX = await import("xlsx");

    const period = `${dateRange[0]?.format("DD-MM-YYYY")} – ${dateRange[1]?.format("DD-MM-YYYY")}`;

    const rows = ledger.map((l) => ({
        Date: dayjs(l.entry_date).format("DD-MM-YYYY"),
        "Entry No.": l.entry_no,
        Description: l.description || "",
        Source: l.source?.replace(/_/g, " ").toUpperCase() || "",
        "Debit (KES)": l.debit || 0,
        "Credit (KES)": l.credit || 0,
        "Balance (KES)": l.balance,
    }));

    // Totals row
    rows.push({
        Date: "",
        "Entry No.": "",
        Description: "TOTALS",
        Source: "",
        "Debit (KES)": totals.totalDebit,
        "Credit (KES)": totals.totalCredit,
        "Balance (KES)": totals.closing,
    } as any);

    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws["!cols"] = [
        { wch: 14 }, { wch: 16 }, { wch: 36 }, { wch: 18 },
        { wch: 14 }, { wch: 14 }, { wch: 14 },
    ];

    // Header meta rows above the data (insert before data)
    XLSX.utils.sheet_add_aoa(ws, [
        [`Account Ledger Report`],
        [`${account.account_code} ${account.account_name}`],
        [`Period: ${period}`],
        [`Generated: ${dayjs().format("DD-MM-YYYY HH:mm")}`],
        [`Company: Biggie POS System`],
        [],
        ["Date", "Entry No.", "Description", "Source", "Debit (KES)", "Credit (KES)", "Balance (KES)"],
    ], { origin: "A1" });

    // Shift data down by 3 rows to make room for the header
    const dataWs = XLSX.utils.json_to_sheet(rows);
    dataWs["!cols"] = ws["!cols"];

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
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const period = `${dateRange[0]?.format("DD-MM-YYYY")} – ${dateRange[1]?.format("DD-MM-YYYY")}`;

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
        head: [["Date", "Entry No.", "Description", "Source", "Debit (KES)", "Credit (KES)", "Balance (KES)"]],
        body: [
            ...ledger.map((l) => [
                dayjs(l.entry_date).format("DD-MM-YYYY"),
                l.entry_no,
                l.description || "",
                (l.source || "").replace(/_/g, " ").toUpperCase(),
                l.debit > 0 ? l.debit.toLocaleString("en-KE", { minimumFractionDigits: 2 }) : "—",
                l.credit > 0 ? l.credit.toLocaleString("en-KE", { minimumFractionDigits: 2 }) : "—",
                l.balance.toLocaleString("en-KE", { minimumFractionDigits: 2 }),
            ]),
            // Totals row
            [
                "", "", { content: "PAGE TOTALS", styles: { fontStyle: "bold" } }, "",
                { content: totals.totalDebit.toLocaleString("en-KE", { minimumFractionDigits: 2 }), styles: { fontStyle: "bold", textColor: [207, 19, 34] } },
                { content: totals.totalCredit.toLocaleString("en-KE", { minimumFractionDigits: 2 }), styles: { fontStyle: "bold", textColor: [56, 158, 13] } },
                { content: Math.abs(totals.closing).toLocaleString("en-KE", { minimumFractionDigits: 2 }), styles: { fontStyle: "bold", textColor: totals.closing >= 0 ? [29, 57, 196] : [207, 19, 34] } },
            ],
        ],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [24, 144, 255], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 255] },
        columnStyles: {
            0: { cellWidth: 24 },
            1: { cellWidth: 28 },
            2: { cellWidth: 80 },
            3: { cellWidth: 28 },
            4: { halign: "right", cellWidth: 30 },
            5: { halign: "right", cellWidth: 30 },
            6: { halign: "right", cellWidth: 32 },
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

const AccountLedgerDrawer: React.FC<Props> = ({ open, onClose, account, shopId }) => {
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
        dayjs().startOf("month"),
        dayjs().endOf("month"),
    ]);

    const from = dateRange[0]?.startOf("day").toISOString();
    const to = dateRange[1]?.endOf("day").toISOString();

    const { data, isLoading } = useQuery({
        queryKey: ["account-ledger", account?._id, page, from, to],
        queryFn: () =>
            getAccountLedger(account!._id, { shop_id: shopId, from, to, page, limit: 20 }),
        enabled: open && !!account?._id,
        keepPreviousData: true,
    });

    const ledger = data?.ledger || [];
    const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };

    const totalDebit = ledger.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = ledger.reduce((s, l) => s + (l.credit || 0), 0);
    const closing = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;
    const totals = { totalDebit, totalCredit, closing };

    const handleExport = async (type: "excel" | "pdf") => {
        if (!account) return;
        setExporting(true);
        try {
            if (type === "excel") await exportLedgerToExcel(ledger, account, dateRange, totals);
            else await exportLedgerToPdf(ledger, account, dateRange, totals);
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

    const columns = [
        {
            title: "Date",
            dataIndex: "entry_date",
            key: "entry_date",
            width: 110,
            render: (d: string) => dayjs(d).format("DD-MM-YYYY"),
        },
        {
            title: "Entry No.",
            dataIndex: "entry_no",
            key: "entry_no",
            width: 120,
            render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
        },
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            ellipsis: true,
        },
        {
            title: "Source",
            dataIndex: "source",
            key: "source",
            width: 130,
            render: (s: string) => (
                <Tag color={SOURCE_COLORS[s] || "default"} style={{ fontSize: 11 }}>
                    {s?.replace(/_/g, " ").toUpperCase()}
                </Tag>
            ),
        },
        {
            title: "Debit",
            dataIndex: "debit",
            key: "debit",
            width: 110,
            align: "right" as const,
            render: (v: number) =>
                v > 0 ? (
                    <Text style={{ color: "#cf1322" }}>
                        {v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                ) : <Text type="secondary">—</Text>,
        },
        {
            title: "Credit",
            dataIndex: "credit",
            key: "credit",
            width: 110,
            align: "right" as const,
            render: (v: number) =>
                v > 0 ? (
                    <Text style={{ color: "#389e0d" }}>
                        {v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                ) : <Text type="secondary">—</Text>,
        },
        {
            title: "Balance",
            dataIndex: "balance",
            key: "balance",
            width: 120,
            align: "right" as const,
            render: (v: number) => (
                <Text strong style={{ color: v >= 0 ? "#1d39c4" : "#cf1322" }}>
                    {v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </Text>
            ),
        },
    ];

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
            width={860}
            destroyOnClose
            extra={
                <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight" disabled={exporting || ledger.length === 0}>
                    <Button icon={<DownloadOutlined />} loading={exporting} size="small">
                        Export
                    </Button>
                </Dropdown>
            }
        >
            {/* ── Date Range Filter ── */}
            <Space style={{ marginBottom: 16 }}>
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
            <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col span={8}>
                    <Statistic
                        title="Total Debits"
                        value={totalDebit}
                        precision={2}
                        prefix="KES"
                        valueStyle={{ color: "#cf1322", fontSize: 16 }}
                        suffix={<ArrowUpOutlined />}
                    />
                </Col>
                <Col span={8}>
                    <Statistic
                        title="Total Credits"
                        value={totalCredit}
                        precision={2}
                        prefix="KES"
                        valueStyle={{ color: "#389e0d", fontSize: 16 }}
                        suffix={<ArrowDownOutlined />}
                    />
                </Col>
                <Col span={8}>
                    <Statistic
                        title="Closing Balance"
                        value={Math.abs(closing)}
                        precision={2}
                        prefix="KES"
                        valueStyle={{ color: closing >= 0 ? "#1d39c4" : "#cf1322", fontSize: 16 }}
                        suffix={closing < 0 ? "(CR)" : "(DR)"}
                    />
                </Col>
            </Row>

            {/* ── Ledger Table ── */}
            <Table
                rowKey={(r, i) => `${r.entry_no}-${i}`}
                columns={columns}
                dataSource={ledger}
                loading={isLoading}
                size="small"
                scroll={{ x: 800 }}
                pagination={{
                    current: pagination.page,
                    total: pagination.total,
                    pageSize: 20,
                    showTotal: (total) => `${total} transactions`,
                    onChange: (p) => setPage(p),
                    showSizeChanger: false,
                }}
                locale={{ emptyText: "No transactions in this period" }}
                summary={() =>
                    ledger.length > 0 ? (
                        <Table.Summary fixed>
                            <Table.Summary.Row style={{ background: "#fafafa" }}>
                                <Table.Summary.Cell index={0} colSpan={4}>
                                    <Text strong>Page Total</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={4} align="right">
                                    <Text strong style={{ color: "#cf1322" }}>
                                        {totalDebit.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={5} align="right">
                                    <Text strong style={{ color: "#389e0d" }}>
                                        {totalCredit.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={6} align="right">
                                    <Text strong style={{ color: closing >= 0 ? "#1d39c4" : "#cf1322" }}>
                                        {Math.abs(closing).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                    </Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        </Table.Summary>
                    ) : null
                }
            />
        </Drawer>
    );
};

export default AccountLedgerDrawer;