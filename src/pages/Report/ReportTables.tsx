import React, { useState, useRef } from "react";
import {
    Table, Tag, Typography, Space, Alert,
    Divider, Button, Dropdown, MenuProps, Segmented, Descriptions,
} from "antd";
import {
    FileExcelOutlined, FilePdfOutlined, DownloadOutlined,
    PrinterOutlined, UnorderedListOutlined, AppstoreOutlined,
    UserOutlined,
} from "@ant-design/icons";
import {
    TrialBalanceResponse, ProfitAndLossResponse, BalanceSheetResponse,
    GeneralLedgerResponse, VATReportResponse, CashFlowResponse,
    AccountBalancesResponse, CustomerStatementResponse, SupplierStatementResponse,
    ARAgingResponse, APAgingResponse, TrialBalanceRow, GeneralLedgerAccount,
} from "@services/accounting/reports";
import dayjs from "dayjs";

const { Text, Title } = Typography;

const fmt = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPE_COLORS: Record<string, string> = {
    ASSET: "blue", LIABILITY: "red", EQUITY: "purple", REVENUE: "green", EXPENSE: "orange",
};
const SOURCE_COLORS: Record<string, string> = {
    manual: "default", pos_sale: "blue", pos_subscription: "cyan",
    invoice: "green", bill: "orange", payment: "purple", reconciliation: "geekblue",
};

// ── Print helper ───────────────────────────────────────────────────────────────
const printSection = (html: string, title: string) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 20px; }
        h1 { font-size: 18px; font-weight: 700; margin-bottom: 2px; color: #1a1a2e; }
        h2 { font-size: 14px; font-weight: 600; margin: 16px 0 6px; color: #333; border-bottom: 2px solid #6c1c2c; padding-bottom: 4px; }
        .subtitle { font-size: 11px; color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #6c1c2c; color: white; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 600; }
        th.num, td.num { text-align: right; }
        td { padding: 5px 8px; border-bottom: 1px solid #e8e8e8; font-size: 10px; }
        tr:nth-child(even) td { background: #f8f8f8; }
        .total-row td { font-weight: 700; background: #f0f0f0 !important; border-top: 2px solid #6c1c2c; }
        .section-header td { font-weight: 700; background: #f5f0f0 !important; color: #6c1c2c; font-size: 11px; }
        .summary-box { border: 1px solid #ddd; border-radius: 4px; padding: 10px 14px; margin-bottom: 14px; display: flex; gap: 24px; flex-wrap: wrap; }
        .summary-item { display: flex; flex-direction: column; }
        .summary-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: .5px; }
        .summary-value { font-size: 13px; font-weight: 700; color: #1a1a2e; }
        .check-row td { font-weight: 700; font-size: 11px; }
        .balanced { color: #389e0d; } .unbalanced { color: #cf1322; }
        .dr { color: #cf1322; } .cr { color: #389e0d; }
        .header-block { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px solid #6c1c2c; }
        .company { font-size: 15px; font-weight: 800; color: #6c1c2c; }
        .meta { text-align: right; font-size: 10px; color: #555; }
        @media print { body { padding: 10px; } }
    </style></head><body>${html}<script>window.onload=()=>window.print();<\/script></body></html>`);
    w.document.close();
};

// ── Export helpers ─────────────────────────────────────────────────────────────
const exportToExcel = async (filename: string, rows: Record<string, any>[]) => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0] || {}).map((k) => ({
        wch: Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)) + 2,
    }));
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}_${dayjs().format("YYYYMMDD")}.xlsx`);
};

const exportToPdf = async (
    filename: string, title: string, subtitle: string,
    head: string[], body: (string | number | object)[][]
) => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text(title, 14, 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120);
    if (subtitle) doc.text(subtitle, 14, 20);
    doc.text(`Generated: ${dayjs().format("DD MMM YYYY HH:mm")}`, 14, subtitle ? 25 : 20);
    doc.setTextColor(0);
    autoTable(doc, {
        startY: subtitle ? 30 : 26, head: [head], body: body as any,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [108, 28, 44], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 255] },
    });
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i); doc.setFontSize(8); doc.setTextColor(160);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 5);
    }
    doc.save(`${filename}_${dayjs().format("YYYYMMDD")}.pdf`);
};

const ExportDropdown: React.FC<{ onExcel: () => void; onPdf: () => void; onPrint?: () => void; disabled?: boolean }> = ({ onExcel, onPdf, onPrint, disabled }) => {
    const items: MenuProps["items"] = [
        { key: "excel", icon: <FileExcelOutlined style={{ color: "#217346" }} />, label: "Export to Excel (.xlsx)", onClick: onExcel },
        { key: "pdf", icon: <FilePdfOutlined style={{ color: "#e53935" }} />, label: "Export to PDF", onClick: onPdf },
        ...(onPrint ? [{ key: "print", icon: <PrinterOutlined style={{ color: "#1890ff" }} />, label: "Print", onClick: onPrint }] : []),
    ];
    return (
        <Dropdown menu={{ items }} placement="bottomRight" disabled={disabled}>
            <Button icon={<DownloadOutlined />} size="small">Export</Button>
        </Dropdown>
    );
};

const BLANK_ROW = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, ""]));

// ── 1. Trial Balance — NO pagination, show all ────────────────────────────────
export const TrialBalanceTable: React.FC<{ data: TrialBalanceResponse }> = ({ data }) => {
    const columns = [
        { title: "Code", dataIndex: "account_code", key: "code", width: 90, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
        {
            title: "Account", dataIndex: "account_name", key: "name", render: (v: string, r: TrialBalanceRow) => (
                <Space size={4}><Text>{v}</Text><Tag color={TYPE_COLORS[r.account_type]} style={{ fontSize: 10, padding: "0 4px" }}>{r.account_type}</Tag></Space>
            )
        },
        { title: "Opening Balance", dataIndex: "opening_balance", key: "ob", width: 130, align: "right" as const, render: (v: number) => <Text style={{ fontSize: 12 }}>{fmt(v)}</Text> },
        { title: "Period Debit", dataIndex: "period_debit", key: "pd", width: 120, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#cf1322" }}>{fmt(v)}</Text> : "—" },
        { title: "Period Credit", dataIndex: "period_credit", key: "pc", width: 120, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> : "—" },
        {
            title: "Closing Balance", dataIndex: "closing_balance", key: "cb", width: 130, align: "right" as const, render: (v: number) => (
                <Text strong style={{ color: (v ?? 0) >= 0 ? "#1d39c4" : "#cf1322", fontSize: 12 }}>
                    {fmt(Math.abs(v ?? 0))}{(v ?? 0) < 0 ? " Cr" : ""}
                </Text>
            )
        },
        { title: "Closing Debit", dataIndex: "closing_debit", key: "cd", width: 120, align: "right" as const, render: (v: number) => v > 0 ? <Text strong style={{ color: "#cf1322" }}>{fmt(v)}</Text> : "—" },
        { title: "Closing Credit", dataIndex: "closing_credit", key: "cc", width: 120, align: "right" as const, render: (v: number) => v > 0 ? <Text strong style={{ color: "#389e0d" }}>{fmt(v)}</Text> : "—" },
    ];

    const COLS = ["Code", "Account", "Type", "Opening Balance", "Period Debit", "Period Credit", "Closing Balance", "Closing Debit", "Closing Credit"];

    const handlePrint = () => {
        const rows = data.rows.map((r) => `
            <tr>
                <td><code>${r.account_code}</code></td>
                <td>${r.account_name} <small>[${r.account_type}]</small></td>
                <td class="num">${fmt(r.opening_balance)}</td>
                <td class="num dr">${r.period_debit > 0 ? fmt(r.period_debit) : "—"}</td>
                <td class="num cr">${r.period_credit > 0 ? fmt(r.period_credit) : "—"}</td>
                <td class="num" style="color:${(r.closing_balance ?? 0) >= 0 ? "#1d39c4" : "#cf1322"}">${fmt(Math.abs(r.closing_balance ?? 0))}${(r.closing_balance ?? 0) < 0 ? " Cr" : ""}</td>
                <td class="num dr">${r.closing_debit > 0 ? fmt(r.closing_debit) : "—"}</td>
                <td class="num cr">${r.closing_credit > 0 ? fmt(r.closing_credit) : "—"}</td>
            </tr>`).join("");
        const html = `
            <div class="header-block">
                <div><div class="company">Trial Balance</div><div class="subtitle">Period: ${data.period?.from || "all time"} to ${data.period?.to || "all time"}</div></div>
                <div class="meta">Generated: ${dayjs().format("DD MMM YYYY HH:mm")}</div>
            </div>
            <div class="summary-box">
                <div class="summary-item"><span class="summary-label">Total Debit</span><span class="summary-value dr">KES ${fmt(data.totals.total_debit)}</span></div>
                <div class="summary-item"><span class="summary-label">Total Credit</span><span class="summary-value cr">KES ${fmt(data.totals.total_credit)}</span></div>
                <div class="summary-item"><span class="summary-label">Status</span><span class="summary-value ${data.is_balanced ? "balanced" : "unbalanced"}">${data.is_balanced ? "✓ Balanced" : "✗ Diff: KES " + fmt(data.totals.difference)}</span></div>
            </div>
            <table>
                <thead><tr>
                    <th>Code</th><th>Account</th>
                    <th class="num">Opening Bal</th><th class="num">Period DR</th><th class="num">Period CR</th>
                    <th class="num">Closing Bal</th><th class="num">Closing DR</th><th class="num">Closing CR</th>
                </tr></thead>
                <tbody>${rows}</tbody>
                <tfoot><tr class="total-row">
                    <td colspan="2">Totals</td><td></td>
                    <td class="num dr">${fmt(data.totals.total_debit)}</td>
                    <td class="num cr">${fmt(data.totals.total_credit)}</td>
                    <td></td>
                    <td class="num dr">${fmt(data.totals.total_debit)}</td>
                    <td class="num cr">${fmt(data.totals.total_credit)}</td>
                </tr></tfoot>
            </table>`;
        printSection(html, "Trial Balance");
    };

    const handleExcel = () => {
        exportToExcel("trial_balance", [
            ...data.rows.map((r) => ({ "Code": r.account_code, "Account": r.account_name, "Type": r.account_type, "Opening Balance": r.opening_balance, "Period Debit": r.period_debit, "Period Credit": r.period_credit, "Closing Balance": r.closing_balance, "Closing Debit": r.closing_debit, "Closing Credit": r.closing_credit })),
            BLANK_ROW(COLS),
            { "Code": "TOTALS", "Account": data.is_balanced ? "Balanced" : `Unbalanced — Diff: KES ${fmt(data.totals.difference)}`, "Type": "", "Opening Balance": "", "Period Debit": data.totals.total_debit, "Period Credit": data.totals.total_credit, "Closing Balance": "", "Closing Debit": data.totals.total_debit, "Closing Credit": data.totals.total_credit },
        ]);
    };

    const handlePdf = () => {
        exportToPdf("trial_balance", "Trial Balance",
            `Period: ${data.period?.from || "all time"} to ${data.period?.to || "all time"}  |  DR: KES ${fmt(data.totals.total_debit)}  |  CR: KES ${fmt(data.totals.total_credit)}`,
            ["Code", "Account", "Type", "Opening", "Period DR", "Period CR", "Closing Bal", "Closing DR", "Closing CR"],
            [
                ...data.rows.map((r) => [r.account_code, r.account_name, r.account_type, fmt(r.opening_balance), fmt(r.period_debit), fmt(r.period_credit), fmt(r.closing_balance ?? 0), fmt(r.closing_debit), fmt(r.closing_credit)]),
                [{ content: "TOTALS", styles: { fontStyle: "bold" } }, { content: data.is_balanced ? "Balanced" : `Diff: KES ${fmt(data.totals.difference)}`, styles: { fontStyle: "bold", textColor: data.is_balanced ? [56, 158, 13] : [207, 19, 34] } }, "", "", { content: fmt(data.totals.total_debit), styles: { fontStyle: "bold", textColor: [207, 19, 34] } }, { content: fmt(data.totals.total_credit), styles: { fontStyle: "bold", textColor: [56, 158, 13] } }, "", { content: fmt(data.totals.total_debit), styles: { fontStyle: "bold", textColor: [207, 19, 34] } }, { content: fmt(data.totals.total_credit), styles: { fontStyle: "bold", textColor: [56, 158, 13] } }],
            ]
        );
    };

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Space size={6}>
                    <Tag color={data.is_balanced ? "success" : "error"} style={{ fontSize: 12, padding: "2px 10px" }}>
                        {data.is_balanced ? "✓ Balanced" : "✗ Unbalanced"}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Total DR: <Text strong style={{ color: "#cf1322" }}>KES {fmt(data.totals.total_debit)}</Text>
                        {" · "}Total CR: <Text strong style={{ color: "#389e0d" }}>KES {fmt(data.totals.total_credit)}</Text>
                        {" · "}Diff: <Text strong>KES {fmt(data.totals.difference)}</Text>
                    </Text>
                </Space>
                <ExportDropdown onExcel={handleExcel} onPdf={handlePdf} onPrint={handlePrint} disabled={!data.rows.length} />
            </div>
            {/* ✅ pagination={false} — show ALL accounts */}
            <Table rowKey={(r) => r.account_code} dataSource={data.rows} columns={columns}
                size="small" pagination={false} scroll={{ x: 1050 }}
                summary={() => (
                    <Table.Summary fixed>
                        <Table.Summary.Row style={{ background: "#fafafa" }}>
                            <Table.Summary.Cell index={0} colSpan={2}><Text strong>Totals</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={2} />
                            <Table.Summary.Cell index={3} align="right"><Text strong style={{ color: "#cf1322" }}>{fmt(data.totals.total_debit)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={4} align="right"><Text strong style={{ color: "#389e0d" }}>{fmt(data.totals.total_credit)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={5} />
                            <Table.Summary.Cell index={6} align="right"><Text strong style={{ color: "#cf1322" }}>{fmt(data.totals.total_debit)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={7} align="right"><Text strong style={{ color: "#389e0d" }}>{fmt(data.totals.total_credit)}</Text></Table.Summary.Cell>
                        </Table.Summary.Row>
                    </Table.Summary>
                )}
            />
        </>
    );
};

// ── 2. Profit & Loss ──────────────────────────────────────────────────────────
export const ProfitAndLossTable: React.FC<{ data: ProfitAndLossResponse }> = ({ data }) => {
    const amountCols = (color: string) => [
        { title: "Code", dataIndex: "account_code", width: 90, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
        { title: "Account", dataIndex: "account_name" },
        { title: "Amount (KES)", dataIndex: "amount", align: "right" as const, width: 150, render: (v: number) => <Text strong style={{ color }}>{fmt(v)}</Text> },
    ];
    const revenueRows = data.revenue.accounts.map((a) => ({ ...a }));
    const expenseRows = data.expenses.accounts.map((a) => ({ ...a }));
    const PL_COLS = ["Section", "Code", "Account", "Amount (KES)"];
    const handleExcel = () => exportToExcel("profit_loss", [
        ...revenueRows.map((r) => ({ Section: "Revenue", Code: r.account_code, Account: r.account_name, "Amount (KES)": r.amount })),
        { Section: "", Code: "", Account: "Total Revenue", "Amount (KES)": data.revenue.total_revenue },
        BLANK_ROW(PL_COLS),
        ...expenseRows.map((r) => ({ Section: "Expense", Code: r.account_code, Account: r.account_name, "Amount (KES)": r.amount })),
        { Section: "", Code: "", Account: "Total Expenses", "Amount (KES)": data.expenses.total_expenses },
        BLANK_ROW(PL_COLS),
        { Section: "", Code: "", Account: data.is_profit ? "NET PROFIT" : "NET LOSS", "Amount (KES)": data.net_profit },
    ]);
    const handlePdf = () => exportToPdf("profit_loss", "Profit & Loss", "", ["Section", "Code", "Account", "Amount (KES)"], [
        ...revenueRows.map((r) => ["Revenue", r.account_code, r.account_name, fmt(r.amount)]),
        ["", "", { content: "Total Revenue", styles: { fontStyle: "bold" } }, { content: fmt(data.revenue.total_revenue), styles: { fontStyle: "bold", textColor: [56, 158, 13] } }],
        ...expenseRows.map((r) => ["Expense", r.account_code, r.account_name, fmt(r.amount)]),
        ["", "", { content: "Total Expenses", styles: { fontStyle: "bold" } }, { content: fmt(data.expenses.total_expenses), styles: { fontStyle: "bold", textColor: [207, 19, 34] } }],
        ["", "", { content: data.is_profit ? "NET PROFIT" : "NET LOSS", styles: { fontStyle: "bold", fontSize: 9 } }, { content: fmt(Math.abs(data.net_profit)), styles: { fontStyle: "bold", fontSize: 9, textColor: data.is_profit ? [56, 158, 13] : [207, 19, 34] } }],
    ]);
    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Space size={6}>
                    <Tag color="green" style={{ fontSize: 12, padding: "2px 10px" }}>Revenue: KES {fmt(data.revenue.total_revenue)}</Tag>
                    <Tag color="red" style={{ fontSize: 12, padding: "2px 10px" }}>Expenses: KES {fmt(data.expenses.total_expenses)}</Tag>
                    <Tag color={data.is_profit ? "success" : "error"} style={{ fontSize: 12, padding: "2px 10px" }}>
                        {data.is_profit ? "Net Profit" : "Net Loss"}: KES {fmt(Math.abs(data.net_profit))}
                    </Tag>
                </Space>
                <ExportDropdown onExcel={handleExcel} onPdf={handlePdf} />
            </div>
            <Text strong style={{ fontSize: 13, display: "block", marginBottom: 6, color: "#389e0d" }}>Revenue</Text>
            <Table rowKey="account_code" dataSource={revenueRows} pagination={false} size="small" style={{ marginBottom: 20 }} columns={amountCols("#389e0d")}
                summary={() => (<Table.Summary.Row style={{ background: "#f6ffed" }}><Table.Summary.Cell index={0} colSpan={2}><Text strong>Total Revenue</Text></Table.Summary.Cell><Table.Summary.Cell index={2} align="right"><Text strong style={{ color: "#389e0d" }}>{fmt(data.revenue.total_revenue)}</Text></Table.Summary.Cell></Table.Summary.Row>)}
            />
            <Text strong style={{ fontSize: 13, display: "block", marginBottom: 6, color: "#cf1322" }}>Expenses</Text>
            <Table rowKey="account_code" dataSource={expenseRows} pagination={false} size="small" columns={amountCols("#cf1322")}
                summary={() => (<Table.Summary.Row style={{ background: "#fff2f0" }}><Table.Summary.Cell index={0} colSpan={2}><Text strong>Total Expenses</Text></Table.Summary.Cell><Table.Summary.Cell index={2} align="right"><Text strong style={{ color: "#cf1322" }}>{fmt(data.expenses.total_expenses)}</Text></Table.Summary.Cell></Table.Summary.Row>)}
            />
        </>
    );
};

// ── 3. Balance Sheet — Print-ready layout ─────────────────────────────────────
export const BalanceSheetTable: React.FC<{ data: BalanceSheetResponse }> = ({ data }) => {
    const bsCols = (color: string) => [
        { title: "Code", dataIndex: "account_code", width: 90, render: (v: string) => v === "NET-INCOME" ? <Tag color="purple" style={{ fontSize: 10 }}>AUTO</Tag> : <Text code style={{ fontSize: 11 }}>{v}</Text> },
        { title: "Account", dataIndex: "account_name", render: (v: string, r: any) => r.is_synthetic ? <Text italic style={{ color: "#722ed1" }}>{v}</Text> : <Text>{v}</Text> },
        { title: "Balance (KES)", dataIndex: "balance", align: "right" as const, width: 160, render: (v: number) => <Text style={{ color: v < 0 ? "#cf1322" : color, fontWeight: 600 }}>{fmt(v)}</Text> },
    ];

    const sectionTable = (title: string, rows: any[], total: number, color: string) => (
        <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 12px", background: `${color}12`, borderLeft: `4px solid ${color}`, borderRadius: "0 6px 6px 0" }}>
                <Text strong style={{ fontSize: 13, color }}>{title}</Text>
            </div>
            <Table rowKey="account_code" dataSource={rows} pagination={false} size="small" columns={bsCols(color)}
                summary={() => (
                    <Table.Summary.Row style={{ background: `${color}08` }}>
                        <Table.Summary.Cell index={0} colSpan={2}>
                            <Text strong style={{ color }}>Total {title}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">
                            <Text strong style={{ color, fontSize: 13 }}>KES {fmt(total)}</Text>
                        </Table.Summary.Cell>
                    </Table.Summary.Row>
                )}
            />
        </div>
    );

    const handlePrint = () => {
        const section = (title: string, rows: any[], total: number, color: string) => `
            <h2>${title}</h2>
            <table>
                <thead><tr><th>Code</th><th>Account</th><th class="num">Balance (KES)</th></tr></thead>
                <tbody>
                    ${rows.map((r) => `<tr><td>${r.account_code === "NET-INCOME" ? "AUTO" : `<code>${r.account_code}</code>`}</td><td>${r.is_synthetic ? `<em>${r.account_name}</em>` : r.account_name}</td><td class="num" style="color:${r.balance < 0 ? "#cf1322" : color}">${fmt(r.balance)}</td></tr>`).join("")}
                </tbody>
                <tfoot><tr class="total-row"><td colspan="2">Total ${title}</td><td class="num" style="color:${color}">KES ${fmt(total)}</td></tr></tfoot>
            </table>`;
        const html = `
            <div class="header-block">
                <div><div class="company">Balance Sheet</div><div class="subtitle">As of ${dayjs(data.as_of).format("DD MMM YYYY")}</div></div>
                <div class="meta">Generated: ${dayjs().format("DD MMM YYYY HH:mm")}</div>
            </div>
            <div class="summary-box">
                <div class="summary-item"><span class="summary-label">Total Assets</span><span class="summary-value" style="color:#1d39c4">KES ${fmt(data.totals.total_assets)}</span></div>
                <div class="summary-item"><span class="summary-label">Total Liabilities + Equity</span><span class="summary-value" style="color:#722ed1">KES ${fmt(data.totals.total_liabilities_and_equity)}</span></div>
                <div class="summary-item"><span class="summary-label">Status</span><span class="summary-value ${data.is_balanced ? "balanced" : "unbalanced"}">${data.is_balanced ? "✓ Balanced" : "✗ Diff: KES " + fmt(data.totals.difference)}</span></div>
                ${data.current_net_income !== undefined ? `<div class="summary-item"><span class="summary-label">Net Income</span><span class="summary-value" style="color:#722ed1">KES ${fmt(data.current_net_income)}</span></div>` : ""}
            </div>
            ${section("Assets", data.assets.accounts, data.assets.total_assets, "#1d39c4")}
            ${section("Liabilities", data.liabilities.accounts, data.liabilities.total_liabilities, "#cf1322")}
            ${section("Equity", data.equity.accounts, data.equity.total_equity, "#722ed1")}
            <table><tbody>
                <tr class="check-row"><td colspan="2"><strong>Total Assets</strong></td><td class="num" style="color:#1d39c4"><strong>KES ${fmt(data.totals.total_assets)}</strong></td></tr>
                <tr class="check-row"><td colspan="2"><strong>Total Liabilities + Equity</strong></td><td class="num" style="color:#722ed1"><strong>KES ${fmt(data.totals.total_liabilities_and_equity)}</strong></td></tr>
                <tr class="check-row"><td colspan="2"><strong>Balance Check</strong></td><td class="num ${data.is_balanced ? "balanced" : "unbalanced"}"><strong>${data.is_balanced ? "✓ Balanced" : "✗ KES " + fmt(data.totals.difference) + " off"}</strong></td></tr>
            </tbody></table>`;
        printSection(html, "Balance Sheet");
    };

    const BS_COLS = ["Section", "Code", "Account", "Balance (KES)"];
    const handleExcel = () => exportToExcel("balance_sheet", [
        ...data.assets.accounts.map((a) => ({ Section: "Assets", Code: a.account_code, Account: a.account_name, "Balance (KES)": a.balance })),
        { Section: "", Code: "", Account: "Total Assets", "Balance (KES)": data.assets.total_assets },
        BLANK_ROW(BS_COLS),
        ...data.liabilities.accounts.map((a) => ({ Section: "Liabilities", Code: a.account_code, Account: a.account_name, "Balance (KES)": a.balance })),
        { Section: "", Code: "", Account: "Total Liabilities", "Balance (KES)": data.liabilities.total_liabilities },
        BLANK_ROW(BS_COLS),
        ...data.equity.accounts.map((a) => ({ Section: "Equity", Code: a.account_code, Account: a.account_name, "Balance (KES)": a.balance })),
        { Section: "", Code: "", Account: "Total Equity", "Balance (KES)": data.equity.total_equity },
        BLANK_ROW(BS_COLS),
        { Section: "CHECK", Code: "", Account: "Total Assets", "Balance (KES)": data.totals.total_assets },
        { Section: "CHECK", Code: "", Account: "Total Liab + Equity", "Balance (KES)": data.totals.total_liabilities_and_equity },
        { Section: "CHECK", Code: "", Account: data.is_balanced ? "BALANCED" : `DIFF: KES ${fmt(data.totals.difference)}`, "Balance (KES)": data.totals.difference },
    ]);
    const handlePdf = () => exportToPdf("balance_sheet", "Balance Sheet",
        `As of: ${dayjs(data.as_of).format("DD MMM YYYY")}  |  ${data.is_balanced ? "BALANCED" : "UNBALANCED — Diff: KES " + fmt(data.totals.difference)}`,
        ["Section", "Code", "Account", "Balance (KES)"],
        [
            ...data.assets.accounts.map((a) => ["Assets", a.account_code, a.account_name, fmt(a.balance)]),
            ["", "", { content: "Total Assets", styles: { fontStyle: "bold" } }, { content: fmt(data.assets.total_assets), styles: { fontStyle: "bold", textColor: [29, 57, 196] } }],
            ...data.liabilities.accounts.map((a) => ["Liabilities", a.account_code, a.account_name, fmt(a.balance)]),
            ["", "", { content: "Total Liabilities", styles: { fontStyle: "bold" } }, { content: fmt(data.liabilities.total_liabilities), styles: { fontStyle: "bold", textColor: [207, 19, 34] } }],
            ...data.equity.accounts.map((a) => ["Equity", a.account_code, a.account_name, fmt(a.balance)]),
            ["", "", { content: "Total Equity", styles: { fontStyle: "bold" } }, { content: fmt(data.equity.total_equity), styles: { fontStyle: "bold", textColor: [114, 46, 209] } }],
            ["", "", { content: data.is_balanced ? "BALANCED" : `DIFF: KES ${fmt(data.totals.difference)}`, styles: { fontStyle: "bold", textColor: data.is_balanced ? [56, 158, 13] : [207, 19, 34], colSpan: 2 } }, ""],
        ]
    );

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Space size={6} wrap>
                    <Tag color="blue" style={{ fontSize: 12, padding: "2px 10px" }}>Assets: KES {fmt(data.totals.total_assets)}</Tag>
                    <Tag color="default" style={{ fontSize: 12, padding: "2px 10px" }}>Liab+Equity: KES {fmt(data.totals.total_liabilities_and_equity)}</Tag>
                    <Tag color={data.is_balanced ? "success" : "error"} style={{ fontSize: 12, padding: "2px 10px" }}>
                        {data.is_balanced ? "✓ Balanced" : `✗ Diff: KES ${fmt(data.totals.difference)}`}
                    </Tag>
                    {data.current_net_income !== undefined && (
                        <Tag color="purple" style={{ fontSize: 12, padding: "2px 10px" }}>Net Income: KES {fmt(data.current_net_income)}</Tag>
                    )}
                </Space>
                <ExportDropdown onExcel={handleExcel} onPdf={handlePdf} onPrint={handlePrint} />
            </div>
            {!data.is_balanced && (
                <Alert type="warning" showIcon style={{ marginBottom: 16 }}
                    message="Balance Sheet is unbalanced"
                    description={`Difference of KES ${fmt(data.totals.difference)}. Check for uncategorised accounts or missing journal entries.`}
                />
            )}
            {sectionTable("Assets", data.assets.accounts, data.assets.total_assets, "#1d39c4")}
            {sectionTable("Liabilities", data.liabilities.accounts, data.liabilities.total_liabilities, "#cf1322")}
            {sectionTable("Equity", data.equity.accounts, data.equity.total_equity, "#722ed1")}
            <div style={{ background: data.is_balanced ? "#f6ffed" : "#fff2f0", border: `1px solid ${data.is_balanced ? "#b7eb8f" : "#ffa39e"}`, borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text strong>Total Assets: <Text strong style={{ color: "#1d39c4", fontSize: 14 }}>KES {fmt(data.totals.total_assets)}</Text></Text>
                <Text strong>Total Liabilities + Equity: <Text strong style={{ color: "#722ed1", fontSize: 14 }}>KES {fmt(data.totals.total_liabilities_and_equity)}</Text></Text>
                <Tag color={data.is_balanced ? "success" : "error"} style={{ fontSize: 12 }}>{data.is_balanced ? "✓ Balanced" : `✗ KES ${fmt(data.totals.difference)} off`}</Tag>
            </div>
        </>
    );
};

// ── 4. General Ledger ─────────────────────────────────────────────────────────
export const GeneralLedgerTable: React.FC<{ data: GeneralLedgerResponse; period?: { from: string; to: string } }> = ({ data, period }) => {
    const [exporting, setExporting] = useState(false);
    const lineColumns = [
        { title: "Date", dataIndex: "entry_date", width: 100, render: (d: string) => dayjs(d).format("DD MMM YYYY") },
        { title: "Entry No.", dataIndex: "entry_no", width: 120, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
        { title: "Description", dataIndex: "description", ellipsis: true },
        { title: "Reference", dataIndex: "reference", width: 110, render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v || "—"}</Text> },
        { title: "Source", dataIndex: "source", width: 120, render: (s: string) => <Tag color={SOURCE_COLORS[s] || "default"} style={{ fontSize: 10 }}>{s?.replace(/_/g, " ").toUpperCase()}</Tag> },
        { title: "Debit", dataIndex: "debit", width: 110, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#cf1322", fontSize: 12 }}>{fmt(v)}</Text> : "—" },
        { title: "Credit", dataIndex: "credit", width: 110, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#389e0d", fontSize: 12 }}>{fmt(v)}</Text> : "—" },
        { title: "Balance", dataIndex: "balance", width: 120, align: "right" as const, render: (v: number) => <Text strong style={{ color: v >= 0 ? "#1d39c4" : "#cf1322", fontSize: 12 }}>{fmt(Math.abs(v))}</Text> },
    ];
    const GL_COLS = ["Account", "Date", "Entry No.", "Description", "Source", "Debit (KES)", "Credit (KES)", "Balance (KES)"];
    const handleExcel = async () => {
        setExporting(true);
        try {
            const rows: Record<string, any>[] = [];
            for (const acc of data.accounts) {
                rows.push({ "Account": `${acc.account_code} — ${acc.account_name}`, "Date": "", "Entry No.": "", "Description": `Opening: KES ${fmt(acc.opening_balance)}`, "Source": "", "Debit (KES)": "", "Credit (KES)": "", "Balance (KES)": acc.opening_balance });
                for (const l of acc.lines) rows.push({ "Account": "", "Date": dayjs(l.entry_date).format("DD MMM YYYY"), "Entry No.": l.entry_no, "Description": l.description || "", "Source": l.source || "", "Debit (KES)": l.debit || 0, "Credit (KES)": l.credit || 0, "Balance (KES)": l.balance });
                rows.push({ "Account": "Account Totals", "Date": "", "Entry No.": "", "Description": `Closing: KES ${fmt(acc.closing_balance)}`, "Source": "", "Debit (KES)": acc.total_debit, "Credit (KES)": acc.total_credit, "Balance (KES)": acc.closing_balance });
                rows.push(BLANK_ROW(GL_COLS));
            }
            await exportToExcel("general_ledger", rows);
        } finally { setExporting(false); }
    };
    const handlePdf = async () => {
        setExporting(true);
        try {
            const body: any[] = [];
            for (const acc of data.accounts) {
                body.push([{ content: `${acc.account_code} — ${acc.account_name}  |  Opening: KES ${fmt(acc.opening_balance)}  |  Closing: KES ${fmt(acc.closing_balance)}`, colSpan: 8, styles: { fontStyle: "bold", fillColor: [240, 245, 255] } }]);
                for (const l of acc.lines) body.push([dayjs(l.entry_date).format("DD MMM YY"), l.entry_no, l.description || "", l.reference || "", (l.source || "").replace(/_/g, " ").toUpperCase(), l.debit > 0 ? fmt(l.debit) : "—", l.credit > 0 ? fmt(l.credit) : "—", fmt(l.balance)]);
                body.push([{ content: "Totals", styles: { fontStyle: "bold" } }, "", "", "", "", { content: fmt(acc.total_debit), styles: { fontStyle: "bold", textColor: [207, 19, 34] } }, { content: fmt(acc.total_credit), styles: { fontStyle: "bold", textColor: [56, 158, 13] } }, { content: fmt(acc.closing_balance), styles: { fontStyle: "bold", textColor: [29, 57, 196] } }]);
            }
            await exportToPdf("general_ledger", "General Ledger", period ? `Period: ${dayjs(period.from).format("DD MMM YYYY")} to ${dayjs(period.to).format("DD MMM YYYY")}` : "", ["Date", "Entry No.", "Description", "Ref", "Source", "Debit", "Credit", "Balance"], body);
        } finally { setExporting(false); }
    };
    return (
        <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <ExportDropdown onExcel={handleExcel} onPdf={handlePdf} disabled={exporting || !data.accounts.length} />
            </div>
            {data.accounts.map((acc: GeneralLedgerAccount) => (
                <div key={acc.account_code} style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <Space size={4} wrap>
                            <Text code style={{ fontSize: 12 }}>{acc.account_code}</Text>
                            <Text strong style={{ fontSize: 13 }}>{acc.account_name}</Text>
                            <Tag color={TYPE_COLORS[acc.account_type]}>{acc.account_type}</Tag>
                        </Space>
                        <Space size={6}>
                            <Tag>Opening: KES {fmt(acc.opening_balance)}</Tag>
                            <Tag color="blue">Closing: KES {fmt(acc.closing_balance)}</Tag>
                            <Tag color="red">DR: {fmt(acc.total_debit)}</Tag>
                            <Tag color="green">CR: {fmt(acc.total_credit)}</Tag>
                        </Space>
                    </div>
                    <Table rowKey={(r, i) => `${r.entry_no}-${i}`} dataSource={acc.lines} columns={lineColumns} pagination={false} size="small" scroll={{ x: 800 }} />
                    <Divider style={{ margin: "8px 0" }} />
                </div>
            ))}
        </>
    );
};

// ── 5. VAT Report ─────────────────────────────────────────────────────────────
export const VATReportTable: React.FC<{ data: VATReportResponse }> = ({ data }) => {
    const { summary, by_source, transactions } = data;
    const sourceRows = Object.entries(by_source).map(([src, vals]) => ({ source: src, collected: vals.collected, paid: vals.paid, net: vals.collected - vals.paid }));
    const VAT_COLS = ["Date", "Entry No.", "Description", "Source", "VAT Collected", "VAT Paid"];
    const handleExcel = () => exportToExcel("vat_report", [...transactions.map((t) => ({ "Date": dayjs(t.entry_date).format("DD MMM YYYY"), "Entry No.": t.entry_no, "Description": t.description || "", "Source": t.source || "", "VAT Collected": t.vat_collected, "VAT Paid": t.vat_paid })), BLANK_ROW(VAT_COLS), { "Date": "TOTALS", "Entry No.": "", "Description": "", "Source": "", "VAT Collected": summary.vat_collected, "VAT Paid": summary.vat_paid }, { "Date": "NET VAT PAYABLE", "Entry No.": "", "Description": "", "Source": "", "VAT Collected": summary.net_vat_payable, "VAT Paid": "" }]);
    const handlePdf = () => exportToPdf("vat_report", "VAT Report", `Collected: KES ${fmt(summary.vat_collected)}  |  Paid: KES ${fmt(summary.vat_paid)}  |  Net Payable: KES ${fmt(summary.net_vat_payable)}`, ["Date", "Entry No.", "Description", "Source", "VAT Collected", "VAT Paid"], [...transactions.map((t) => [dayjs(t.entry_date).format("DD MMM YYYY"), t.entry_no, t.description || "", t.source || "", fmt(t.vat_collected), fmt(t.vat_paid)]), [{ content: "TOTALS", styles: { fontStyle: "bold" } }, "", "", "", { content: fmt(summary.vat_collected), styles: { fontStyle: "bold", textColor: [56, 158, 13] } }, { content: fmt(summary.vat_paid), styles: { fontStyle: "bold", textColor: [250, 140, 22] } }]]);
    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Space size={6} wrap>
                    <Tag color="green" style={{ fontSize: 12, padding: "2px 10px" }}>Collected: KES {fmt(summary.vat_collected)}</Tag>
                    <Tag color="orange" style={{ fontSize: 12, padding: "2px 10px" }}>Paid: KES {fmt(summary.vat_paid)}</Tag>
                    <Tag color={summary.net_vat_payable >= 0 ? "red" : "green"} style={{ fontSize: 12, padding: "2px 10px" }}>Net Payable: KES {fmt(Math.abs(summary.net_vat_payable))}{summary.net_vat_payable < 0 ? " (Refund)" : ""}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>VAT Account: <Text code>{summary.vat_account_code}</Text></Text>
                </Space>
                <ExportDropdown onExcel={handleExcel} onPdf={handlePdf} />
            </div>
            <Text strong style={{ fontSize: 13, display: "block", marginBottom: 6 }}>By Source</Text>
            <Table rowKey="source" dataSource={sourceRows} pagination={false} size="small" style={{ marginBottom: 20 }} columns={[{ title: "Source", dataIndex: "source", render: (s: string) => <Tag color={SOURCE_COLORS[s] || "default"}>{s.replace(/_/g, " ").toUpperCase()}</Tag> }, { title: "Collected", dataIndex: "collected", align: "right" as const, render: (v: number) => <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> }, { title: "Paid", dataIndex: "paid", align: "right" as const, render: (v: number) => <Text style={{ color: "#fa8c16" }}>{fmt(v)}</Text> }, { title: "Net", dataIndex: "net", align: "right" as const, render: (v: number) => <Text strong style={{ color: v >= 0 ? "#cf1322" : "#389e0d" }}>{fmt(Math.abs(v))}</Text> }]} />
            <Text strong style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Transactions</Text>
            <Table rowKey="entry_no" dataSource={transactions} pagination={{ pageSize: 20, showSizeChanger: true }} size="small" scroll={{ x: 700 }} columns={[{ title: "Date", dataIndex: "entry_date", width: 110, render: (d: string) => dayjs(d).format("DD MMM YYYY") }, { title: "Entry No.", dataIndex: "entry_no", width: 120, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> }, { title: "Description", dataIndex: "description", ellipsis: true }, { title: "Source", dataIndex: "source", width: 120, render: (s: string) => <Tag color={SOURCE_COLORS[s] || "default"} style={{ fontSize: 10 }}>{s.replace(/_/g, " ").toUpperCase()}</Tag> }, { title: "VAT Collected", dataIndex: "vat_collected", align: "right" as const, width: 120, render: (v: number) => v > 0 ? <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> : "—" }, { title: "VAT Paid", dataIndex: "vat_paid", align: "right" as const, width: 110, render: (v: number) => v > 0 ? <Text style={{ color: "#fa8c16" }}>{fmt(v)}</Text> : "—" }]} />
        </>
    );
};

// ── 6. Cash Flow ──────────────────────────────────────────────────────────────
export const CashFlowTable: React.FC<{ data: CashFlowResponse }> = ({ data }) => {
    const CF_COLS = ["Code", "Account", "Opening (KES)", "Inflows (KES)", "Outflows (KES)", "Net Cash Flow (KES)", "Closing (KES)"];
    const handleExcel = () => exportToExcel("cash_flow", [...data.accounts.map((a) => ({ "Code": a.account_code, "Account": a.account_name, "Opening (KES)": a.opening_balance, "Inflows (KES)": a.inflows, "Outflows (KES)": a.outflows, "Net Cash Flow (KES)": a.net_cash_flow, "Closing (KES)": a.closing_balance })), BLANK_ROW(CF_COLS), { "Code": "TOTALS", "Account": "", "Opening (KES)": "", "Inflows (KES)": data.totals.total_inflows, "Outflows (KES)": data.totals.total_outflows, "Net Cash Flow (KES)": data.totals.net_cash_flow, "Closing (KES)": "" }]);
    const handlePdf = () => exportToPdf("cash_flow", "Cash Flow Summary", `Inflows: KES ${fmt(data.totals.total_inflows)}  |  Outflows: KES ${fmt(data.totals.total_outflows)}  |  Net: KES ${fmt(data.totals.net_cash_flow)}`, ["Code", "Account", "Opening", "Inflows", "Outflows", "Net", "Closing"], [...data.accounts.map((a) => [a.account_code, a.account_name, fmt(a.opening_balance), fmt(a.inflows), fmt(a.outflows), fmt(a.net_cash_flow), fmt(a.closing_balance)]), [{ content: "TOTALS", styles: { fontStyle: "bold" } }, "", "", { content: fmt(data.totals.total_inflows), styles: { fontStyle: "bold", textColor: [56, 158, 13] } }, { content: fmt(data.totals.total_outflows), styles: { fontStyle: "bold", textColor: [207, 19, 34] } }, { content: fmt(data.totals.net_cash_flow), styles: { fontStyle: "bold" } }, ""]]);
    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Space size={6}>
                    <Tag color="green" style={{ fontSize: 12, padding: "2px 10px" }}>Inflows: KES {fmt(data.totals.total_inflows)}</Tag>
                    <Tag color="red" style={{ fontSize: 12, padding: "2px 10px" }}>Outflows: KES {fmt(data.totals.total_outflows)}</Tag>
                    <Tag color={data.totals.net_cash_flow >= 0 ? "success" : "error"} style={{ fontSize: 12, padding: "2px 10px" }}>Net: KES {fmt(Math.abs(data.totals.net_cash_flow))} {data.totals.net_cash_flow < 0 ? "(Outflow)" : "(Inflow)"}</Tag>
                </Space>
                <ExportDropdown onExcel={handleExcel} onPdf={handlePdf} />
            </div>
            <Table rowKey="account_code" dataSource={data.accounts} pagination={false} size="small" scroll={{ x: 800 }} columns={[{ title: "Code", dataIndex: "account_code", width: 90, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> }, { title: "Account", dataIndex: "account_name" }, { title: "Opening", dataIndex: "opening_balance", width: 120, align: "right" as const, render: (v: number) => fmt(v) }, { title: "Inflows", dataIndex: "inflows", width: 120, align: "right" as const, render: (v: number) => <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> }, { title: "Outflows", dataIndex: "outflows", width: 120, align: "right" as const, render: (v: number) => <Text style={{ color: "#cf1322" }}>{fmt(v)}</Text> }, { title: "Net Cash Flow", dataIndex: "net_cash_flow", width: 130, align: "right" as const, render: (v: number) => <Text strong style={{ color: v >= 0 ? "#389e0d" : "#cf1322" }}>{fmt(Math.abs(v))}</Text> }, { title: "Closing", dataIndex: "closing_balance", width: 120, align: "right" as const, render: (v: number) => <Text strong style={{ color: "#1d39c4" }}>{fmt(v)}</Text> }]} />
        </>
    );
};

// ── 7. Account Balances ───────────────────────────────────────────────────────
export const AccountBalancesTable: React.FC<{ data: AccountBalancesResponse }> = ({ data }) => {
    const handleExcel = () => exportToExcel("account_balances", data.accounts.map((a) => ({ Code: a.account_code, Account: a.account_name, Type: a.account_type, Normal: a.normal_balance, "Opening (KES)": a.opening_balance, "Total DR (KES)": a.total_debit, "Total CR (KES)": a.total_credit, "Balance (KES)": a.balance })));
    const handlePdf = () => exportToPdf("account_balances", "Account Balances", `As of: ${dayjs().format("DD MMM YYYY")}`, ["Code", "Account", "Type", "Opening", "DR", "CR", "Balance"], data.accounts.map((a) => [a.account_code, a.account_name, a.account_type, fmt(a.opening_balance), fmt(a.total_debit), fmt(a.total_credit), fmt(a.balance)]));
    return (
        <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <ExportDropdown onExcel={handleExcel} onPdf={handlePdf} />
            </div>
            <Table rowKey="account_code" dataSource={data.accounts} pagination={{ pageSize: 30, showSizeChanger: true }} size="small" scroll={{ x: 800 }} columns={[{ title: "Code", dataIndex: "account_code", width: 90, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> }, { title: "Account", dataIndex: "account_name" }, { title: "Type", dataIndex: "account_type", width: 100, render: (v: string) => <Tag color={TYPE_COLORS[v]}>{v}</Tag> }, { title: "Normal", dataIndex: "normal_balance", width: 80, render: (v: string) => <Tag color={v === "DEBIT" ? "blue" : "green"} style={{ fontSize: 10 }}>{v}</Tag> }, { title: "Opening", dataIndex: "opening_balance", width: 110, align: "right" as const, render: (v: number) => fmt(v) }, { title: "Total DR", dataIndex: "total_debit", width: 110, align: "right" as const, render: (v: number) => <Text style={{ color: "#cf1322" }}>{fmt(v)}</Text> }, { title: "Total CR", dataIndex: "total_credit", width: 110, align: "right" as const, render: (v: number) => <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> }, { title: "Balance", dataIndex: "balance", width: 120, align: "right" as const, render: (v: number) => <Text strong style={{ color: "#1d39c4" }}>{fmt(v)}</Text> }]} />
        </>
    );
};

// ── 8. Customer Statement ─────────────────────────────────────────────────────
export const CustomerStatementTable: React.FC<{ data: CustomerStatementResponse }> = ({ data }) => {
    const { customer, summary, transactions } = data;
    const TXN_COLORS: Record<string, string> = { Invoice: "blue", Payment: "green", "Credit Note": "cyan" };
    const CS_COLS = ["Date", "Type", "Reference", "Description", "Debit (KES)", "Credit (KES)", "Balance (KES)"];
    const handleExcel = () => exportToExcel("customer_statement", [...transactions.map((t) => ({ "Date": dayjs(t.date).format("DD MMM YYYY"), "Type": t.type, "Reference": t.reference, "Description": t.description, "Debit (KES)": t.debit, "Credit (KES)": t.credit, "Balance (KES)": t.balance })), BLANK_ROW(CS_COLS), { "Date": "SUMMARY", "Type": "", "Reference": "", "Description": "Total Invoiced", "Debit (KES)": summary.total_invoiced, "Credit (KES)": "", "Balance (KES)": "" }, { "Date": "", "Type": "", "Reference": "", "Description": "Total Paid", "Debit (KES)": "", "Credit (KES)": summary.total_paid, "Balance (KES)": "" }, { "Date": "", "Type": "", "Reference": "", "Description": summary.balance_label, "Debit (KES)": "", "Credit (KES)": "", "Balance (KES)": summary.closing_balance }]);
    const handlePdf = () => exportToPdf("customer_statement", `Customer Statement — ${customer.customer_name}`, `Invoiced: KES ${fmt(summary.total_invoiced)}  |  Paid: KES ${fmt(summary.total_paid)}  |  ${summary.balance_label}: KES ${fmt(Math.abs(summary.closing_balance))}`, ["Date", "Type", "Reference", "Description", "Debit", "Credit", "Balance"], transactions.map((t) => [dayjs(t.date).format("DD MMM YYYY"), t.type, t.reference, t.description, fmt(t.debit), fmt(t.credit), fmt(t.balance)]));
    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Space size={6} wrap>
                    <Text strong style={{ fontSize: 14 }}>{customer.customer_name}</Text>
                    {customer.email && <Text type="secondary">{customer.email}</Text>}
                    <Tag color="blue">Invoiced: KES {fmt(summary.total_invoiced)}</Tag>
                    <Tag color="green">Paid: KES {fmt(summary.total_paid)}</Tag>
                    <Tag color={summary.closing_balance > 0 ? "red" : "green"}>{summary.balance_label}: KES {fmt(Math.abs(summary.closing_balance))}</Tag>
                </Space>
                <ExportDropdown onExcel={handleExcel} onPdf={handlePdf} />
            </div>
            <Table rowKey={(r, i) => `${r.document_id}-${i}`} dataSource={transactions} pagination={{ pageSize: 20, showSizeChanger: true }} size="small" scroll={{ x: 700 }} columns={[{ title: "Date", dataIndex: "date", width: 110, render: (d: string) => dayjs(d).format("DD MMM YYYY") }, { title: "Type", dataIndex: "type", width: 110, render: (v: string) => <Tag color={TXN_COLORS[v] || "default"} style={{ fontSize: 10 }}>{v}</Tag> }, { title: "Reference", dataIndex: "reference", width: 120 }, { title: "Description", dataIndex: "description", ellipsis: true }, { title: "Debit", dataIndex: "debit", width: 110, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#cf1322" }}>{fmt(v)}</Text> : "—" }, { title: "Credit", dataIndex: "credit", width: 110, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> : "—" }, { title: "Balance", dataIndex: "balance", width: 120, align: "right" as const, render: (v: number) => <Text strong style={{ color: v > 0 ? "#cf1322" : "#389e0d" }}>{fmt(Math.abs(v))}</Text> }]} />
        </>
    );
};

// ── 9. Supplier Statement ─────────────────────────────────────────────────────
export const SupplierStatementTable: React.FC<{ data: SupplierStatementResponse }> = ({ data }) => {
    const { supplier, summary, transactions } = data;
    const TXN_COLORS: Record<string, string> = { Bill: "orange", Payment: "green", "Debit Note": "red" };
    const SS_COLS = ["Date", "Type", "Reference", "Description", "Debit (KES)", "Credit (KES)", "Balance (KES)"];
    const handleExcel = () => exportToExcel("supplier_statement", [...transactions.map((t) => ({ "Date": dayjs(t.date).format("DD MMM YYYY"), "Type": t.type, "Reference": t.reference, "Description": t.description, "Debit (KES)": t.debit, "Credit (KES)": t.credit, "Balance (KES)": t.balance })), BLANK_ROW(SS_COLS), { "Date": "SUMMARY", "Type": "", "Reference": "", "Description": "Total Billed", "Debit (KES)": "", "Credit (KES)": summary.total_billed, "Balance (KES)": "" }, { "Date": "", "Type": "", "Reference": "", "Description": "Total Paid", "Debit (KES)": summary.total_paid, "Credit (KES)": "", "Balance (KES)": "" }, { "Date": "", "Type": "", "Reference": "", "Description": summary.balance_label, "Debit (KES)": "", "Credit (KES)": "", "Balance (KES)": summary.closing_balance }]);
    const handlePdf = () => exportToPdf("supplier_statement", `Supplier Statement — ${supplier.name}`, `Billed: KES ${fmt(summary.total_billed)}  |  Paid: KES ${fmt(summary.total_paid)}  |  ${summary.balance_label}: KES ${fmt(Math.abs(summary.closing_balance))}`, ["Date", "Type", "Reference", "Description", "Debit", "Credit", "Balance"], transactions.map((t) => [dayjs(t.date).format("DD MMM YYYY"), t.type, t.reference, t.description, fmt(t.debit), fmt(t.credit), fmt(t.balance)]));
    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Space size={6} wrap>
                    <Text strong style={{ fontSize: 14 }}>{supplier.name}</Text>
                    {supplier.email && <Text type="secondary">{supplier.email}</Text>}
                    <Tag color="orange">Billed: KES {fmt(summary.total_billed)}</Tag>
                    <Tag color="green">Paid: KES {fmt(summary.total_paid)}</Tag>
                    <Tag color={summary.closing_balance > 0 ? "orange" : "green"}>{summary.balance_label}: KES {fmt(Math.abs(summary.closing_balance))}</Tag>
                </Space>
                <ExportDropdown onExcel={handleExcel} onPdf={handlePdf} />
            </div>
            <Table rowKey={(r, i) => `${r.document_id}-${i}`} dataSource={transactions} pagination={{ pageSize: 20, showSizeChanger: true }} size="small" scroll={{ x: 700 }} columns={[{ title: "Date", dataIndex: "date", width: 110, render: (d: string) => dayjs(d).format("DD MMM YYYY") }, { title: "Type", dataIndex: "type", width: 110, render: (v: string) => <Tag color={TXN_COLORS[v] || "default"} style={{ fontSize: 10 }}>{v}</Tag> }, { title: "Reference", dataIndex: "reference", width: 120 }, { title: "Description", dataIndex: "description", ellipsis: true }, { title: "Debit", dataIndex: "debit", width: 110, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#cf1322" }}>{fmt(v)}</Text> : "—" }, { title: "Credit", dataIndex: "credit", width: 110, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> : "—" }, { title: "Balance", dataIndex: "balance", width: 120, align: "right" as const, render: (v: number) => <Text strong style={{ color: v > 0 ? "#fa8c16" : "#389e0d" }}>{fmt(Math.abs(v))}</Text> }]} />
        </>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// ── 10. AR AGING — Summary + Detailed views (matching reference screenshots) ──
// ══════════════════════════════════════════════════════════════════════════════
export const ARAgingTable: React.FC<{ data: ARAgingResponse }> = ({ data }) => {
    const [view, setView] = useState<"summary" | "detailed" | "per-client">("summary");

    // ── derive bucket columns dynamically ────────────────────────────────────
    const allBucketLabels = data.buckets || ["Current (not yet due)", "1–30 days", "31–60 days", "61–90 days", "91–120 days", "121+ days"];

    // Build summary rows — one row per customer with bucket columns
    const summaryRows = data.customers.map((c) => {
        const row: any = { customer_id: c.customer_id, customer_name: c.customer_name, total: c.total };
        allBucketLabels.forEach((lbl) => { row[lbl] = c.buckets?.[lbl] || 0; });
        return row;
    });
    const summaryTotals: Record<string, number> = { total: summaryRows.reduce((s, r) => s + r.total, 0) };
    allBucketLabels.forEach((lbl) => { summaryTotals[lbl] = summaryRows.reduce((s, r) => s + (r[lbl] || 0), 0); });

    // ── Summary columns (like image 2) ────────────────────────────────────────
    const summaryColumns = [
        { title: "Customer Name", dataIndex: "customer_name", key: "name", render: (v: string) => <Text strong style={{ color: "#1890ff", cursor: "pointer" }} onClick={() => setView("per-client")}>{v}</Text> },
        ...allBucketLabels.map((lbl) => ({
            title: lbl, dataIndex: lbl, key: lbl, align: "right" as const,
            render: (v: number) => v > 0 ? <Text style={{ color: "#1890ff" }}>KES{fmt(v)}</Text> : <Text type="secondary">KES0.00</Text>,
        })),
        { title: "Total", dataIndex: "total", key: "total", align: "right" as const, render: (v: number) => <Text strong style={{ color: "#1890ff" }}>KES{fmt(v)}</Text> },
    ];

    // ── Detailed view — flat table grouped by customer (like image 3) ─────────
    type DetailRow = { key: string; isGroup?: boolean; isBucket?: boolean; customer_name?: string; customer_total?: number; bucket_label?: string; bucket_total?: number; invoice_no?: string; issue_date?: string; due_date?: string; amount?: number; amount_due?: number; days_overdue?: number; status?: string };
    const detailRows: DetailRow[] = [];
    for (const c of data.customers) {
        detailRows.push({ key: `grp-${c.customer_id}`, isGroup: true, customer_name: c.customer_name, customer_total: c.total });
        // group by bucket
        const byBucket: Record<string, typeof c.invoices> = {};
        for (const inv of c.invoices) { if (!byBucket[inv.bucket]) byBucket[inv.bucket] = []; byBucket[inv.bucket].push(inv); }
        for (const [bkt, invs] of Object.entries(byBucket)) {
            detailRows.push({ key: `bkt-${c.customer_id}-${bkt}`, isBucket: true, bucket_label: bkt, bucket_total: invs.reduce((s, i) => s + i.amount_due, 0) });
            for (const inv of invs) detailRows.push({ key: `inv-${inv.invoice_no}`, invoice_no: inv.invoice_no, issue_date: inv.issue_date, due_date: inv.due_date, amount: inv.grand_total, amount_due: inv.amount_due, days_overdue: inv.days_overdue, status: inv.status });
        }
    }

    const detailColumns = [
        {
            title: "Date", dataIndex: "issue_date", key: "date", width: 110,
            render: (_: any, r: DetailRow) => {
                if (r.isGroup) return <Text strong style={{ fontSize: 13 }}>{r.customer_name}</Text>;
                if (r.isBucket) return <Text type="secondary" style={{ fontSize: 11, paddingLeft: 12 }}>{">"} {r.bucket_label}</Text>;
                return <Text style={{ paddingLeft: 24 }}>{dayjs(r.issue_date).format("DD/MM/YYYY")}</Text>;
            },
        },
        { title: "Transaction #", dataIndex: "invoice_no", key: "inv", width: 140, render: (_: any, r: DetailRow) => r.invoice_no ? <Text style={{ color: "#1890ff", paddingLeft: 24 }}>{r.invoice_no}</Text> : null },
        { title: "Type", key: "type", width: 90, render: (_: any, r: DetailRow) => r.invoice_no ? <Text>Invoice</Text> : null },
        { title: "Status", dataIndex: "status", key: "status", width: 100, render: (_: any, r: DetailRow) => r.status ? <Tag color={r.status === "Overdue" ? "error" : "default"} style={{ fontSize: 10 }}>{r.status}</Tag> : null },
        { title: "Customer Name", key: "cname", width: 160, render: (_: any, r: DetailRow) => r.invoice_no ? <Text type="secondary" style={{ fontSize: 11 }}>{data.customers.find((c) => c.invoices.some((i) => i.invoice_no === r.invoice_no))?.customer_name || ""}</Text> : null },
        { title: "Age", dataIndex: "days_overdue", key: "age", width: 90, align: "right" as const, render: (_: any, r: DetailRow) => r.invoice_no ? <Text>{r.days_overdue}  Days</Text> : (r.isBucket ? null : r.isGroup ? <Text strong style={{ color: "#cf1322" }}>KES{fmt(r.customer_total || 0)}</Text> : null) },
        { title: "Amount (KES)", dataIndex: "amount", key: "amount", align: "right" as const, render: (_: any, r: DetailRow) => r.invoice_no ? <Text style={{ color: "#1890ff" }}>KES{fmt(r.amount || 0)}</Text> : r.isBucket ? <Text type="secondary">KES{fmt(r.bucket_total || 0)}</Text> : null },
        { title: "Balance Due", dataIndex: "amount_due", key: "due", align: "right" as const, render: (_: any, r: DetailRow) => r.invoice_no ? <Text strong style={{ color: "#cf1322" }}>KES{fmt(r.amount_due || 0)}</Text> : r.isBucket ? <Text strong>KES{fmt(r.bucket_total || 0)}</Text> : null },
    ];

    const handlePrint = (mode: "summary" | "detailed") => {
        if (mode === "summary") {
            const bucketHeads = allBucketLabels.map((l) => `<th class="num">${l}</th>`).join("");
            const rows = summaryRows.map((r) => `<tr><td>${r.customer_name}</td>${allBucketLabels.map((l) => `<td class="num" style="color:${r[l] > 0 ? "#1890ff" : "#aaa"}">${r[l] > 0 ? "KES" + fmt(r[l]) : "KES0.00"}</td>`).join("")}<td class="num" style="color:#1890ff;font-weight:700">KES${fmt(r.total)}</td></tr>`).join("");
            const totRow = `<tr class="total-row"><td>TOTALS</td>${allBucketLabels.map((l) => `<td class="num">KES${fmt(summaryTotals[l])}</td>`).join("")}<td class="num">KES${fmt(summaryTotals.total)}</td></tr>`;
            const html = `<div class="header-block"><div><div class="company">AR Aging Summary By Invoice Date</div><div class="subtitle">As of ${dayjs(data.as_of).format("DD/MM/YYYY")}</div></div><div class="meta">Generated: ${dayjs().format("DD MMM YYYY HH:mm")}</div></div>
            <div class="summary-box"><div class="summary-item"><span class="summary-label">Total AR Outstanding</span><span class="summary-value" style="color:#cf1322">KES ${fmt(data.summary?.grand_total || 0)}</span></div><div class="summary-item"><span class="summary-label">Customers</span><span class="summary-value">${data.total_customers_with_outstanding}</span></div></div>
            <table><thead><tr><th>Customer Name</th>${bucketHeads}<th class="num">Total</th></tr></thead><tbody>${rows}</tbody><tfoot>${totRow}</tfoot></table>`;
            printSection(html, "AR Aging Summary");
        } else {
            const rows = data.customers.map((c) => {
                const invRows = c.invoices.map((inv) => `<tr><td style="padding-left:32px">${dayjs(inv.issue_date).format("DD/MM/YYYY")}</td><td style="padding-left:32px;color:#1890ff">${inv.invoice_no}</td><td>Invoice</td><td><span style="color:${inv.status === "Overdue" ? "#cf1322" : "#666"}">${inv.status}</span></td><td class="num">${inv.days_overdue} Days</td><td class="num" style="color:#1890ff">KES${fmt(inv.grand_total)}</td><td class="num dr">KES${fmt(inv.amount_due)}</td></tr>`).join("");
                return `<tr class="section-header"><td colspan="7">${c.customer_name} — KES${fmt(c.total)}</td></tr>${invRows}`;
            }).join("");
            const html = `<div class="header-block"><div><div class="company">AR Aging Details By Invoice Due Date</div><div class="subtitle">As of ${dayjs(data.as_of).format("DD/MM/YYYY")}</div></div><div class="meta">Generated: ${dayjs().format("DD MMM YYYY HH:mm")}</div></div>
            <table><thead><tr><th>Date</th><th>Transaction #</th><th>Type</th><th>Status</th><th class="num">Age</th><th class="num">Amount</th><th class="num">Balance Due</th></tr></thead><tbody>${rows}</tbody></table>`;
            printSection(html, "AR Aging Details");
        }
    };

    const handleExcel = () => exportToExcel("ar_aging_summary", summaryRows.map((r) => {
        const row: any = { "Customer": r.customer_name };
        allBucketLabels.forEach((l) => { row[l] = r[l]; });
        row["Total"] = r.total;
        return row;
    }));
    const handlePdf = () => exportToPdf("ar_aging", "AR Aging Report", `As of: ${dayjs(data.as_of).format("DD MMM YYYY")}  |  Total: KES ${fmt(data.summary?.grand_total || 0)}`, ["Customer", ...allBucketLabels, "Total"], summaryRows.map((r) => [r.customer_name, ...allBucketLabels.map((l) => fmt(r[l])), fmt(r.total)]));

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Space size={6}>
                    <Tag color="red" style={{ fontSize: 12, padding: "2px 10px" }}>Total AR: KES {fmt(data.summary?.grand_total || 0)}</Tag>
                    <Tag color="default" style={{ fontSize: 12, padding: "2px 10px" }}>{data.total_customers_with_outstanding} customers</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>As of {dayjs(data.as_of).format("DD MMM YYYY")}</Text>
                </Space>
                <Space>
                    <Segmented
                        size="small"
                        value={view}
                        onChange={(v) => setView(v as any)}
                        options={[
                            { label: "Summary", value: "summary", icon: <AppstoreOutlined /> },
                            { label: "Detailed", value: "detailed", icon: <UnorderedListOutlined /> },
                            { label: "Per Client", value: "per-client", icon: <UserOutlined /> },
                        ]}
                    />
                    <ExportDropdown
                        onExcel={handleExcel}
                        onPdf={handlePdf}
                        onPrint={() => handlePrint(view === "detailed" || view === "per-client" ? "detailed" : "summary")}
                    />
                </Space>
            </div>

            {/* ── SUMMARY VIEW (like image 2) ── */}
            {view === "summary" && (
                <Table
                    rowKey="customer_id"
                    dataSource={summaryRows}
                    columns={summaryColumns}
                    size="small"
                    pagination={false}
                    scroll={{ x: "max-content" }}
                    summary={() => (
                        <Table.Summary fixed>
                            <Table.Summary.Row style={{ background: "#fafafa", fontWeight: 700 }}>
                                <Table.Summary.Cell index={0}><Text strong>Totals</Text></Table.Summary.Cell>
                                {allBucketLabels.map((lbl, i) => (
                                    <Table.Summary.Cell key={lbl} index={i + 1} align="right">
                                        <Text strong style={{ color: summaryTotals[lbl] > 0 ? "#1890ff" : "#aaa" }}>KES{fmt(summaryTotals[lbl])}</Text>
                                    </Table.Summary.Cell>
                                ))}
                                <Table.Summary.Cell index={allBucketLabels.length + 1} align="right">
                                    <Text strong style={{ color: "#cf1322" }}>KES{fmt(summaryTotals.total)}</Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        </Table.Summary>
                    )}
                />
            )}

            {/* ── DETAILED VIEW (like image 3) ── */}
            {view === "detailed" && (
                <Table
                    rowKey="key"
                    dataSource={detailRows}
                    columns={detailColumns}
                    size="small"
                    pagination={false}
                    scroll={{ x: 900 }}
                    rowClassName={(r: DetailRow) => r.isGroup ? "aging-group-row" : r.isBucket ? "aging-bucket-row" : ""}
                    style={{ "--aging-group-bg": "#f5f0f5" } as any}
                />
            )}

            {/* ── PER CLIENT VIEW ── */}
            {view === "per-client" && data.customers.map((cust) => (
                <div key={cust.customer_id} style={{ marginBottom: 24, border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ background: "#fafafa", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f0f0f0" }}>
                        <Space>
                            <Text strong style={{ fontSize: 14 }}>{cust.customer_name}</Text>
                            {cust.email && <Text type="secondary" style={{ fontSize: 12 }}>{cust.email}</Text>}
                        </Space>
                        <Tag color="red" style={{ fontSize: 12 }}>Outstanding: KES {fmt(cust.total)}</Tag>
                    </div>
                    <Table rowKey="invoice_no" dataSource={cust.invoices} pagination={false} size="small"
                        columns={[
                            { title: "Invoice No.", dataIndex: "invoice_no", width: 130, render: (v: string) => <Text style={{ color: "#1890ff" }}>{v}</Text> },
                            { title: "Issue Date", dataIndex: "issue_date", width: 110, render: (d: string) => dayjs(d).format("DD/MM/YYYY") },
                            { title: "Due Date", dataIndex: "due_date", width: 110, render: (d: string) => d ? dayjs(d).format("DD/MM/YYYY") : "—" },
                            { title: "Amount", dataIndex: "grand_total", width: 120, align: "right" as const, render: (v: number) => <Text style={{ color: "#1890ff" }}>KES{fmt(v)}</Text> },
                            { title: "Paid", dataIndex: "amount_paid", width: 110, align: "right" as const, render: (v: number) => <Text style={{ color: "#389e0d" }}>KES{fmt(v)}</Text> },
                            { title: "Balance Due", dataIndex: "amount_due", width: 120, align: "right" as const, render: (v: number) => <Text strong style={{ color: "#cf1322" }}>KES{fmt(v)}</Text> },
                            { title: "Days Overdue", dataIndex: "days_overdue", width: 110, align: "right" as const, render: (v: number) => <Tag color={v > 90 ? "red" : v > 30 ? "orange" : v > 0 ? "gold" : "default"}>{v} Days</Tag> },
                            { title: "Bucket", dataIndex: "bucket", width: 120, render: (v: string) => <Tag style={{ fontSize: 10 }}>{v}</Tag> },
                            { title: "Status", dataIndex: "status", width: 100, render: (v: string) => <Tag color={v === "Overdue" ? "error" : "default"} style={{ fontSize: 10 }}>{v}</Tag> },
                        ]}
                    />
                </div>
            ))}

            <style>{`
                .aging-group-row td { background: #f9f0f2 !important; font-weight: 700; }
                .aging-bucket-row td { background: #fafafa !important; color: #666; font-style: italic; }
            `}</style>
        </>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// ── 11. AP AGING — Summary + Detailed views (mirrors AR aging) ────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const APAgingTable: React.FC<{ data: APAgingResponse }> = ({ data }) => {
    const [view, setView] = useState<"summary" | "detailed" | "per-supplier">("summary");
    const allBucketLabels = data.buckets || ["Current (not yet due)", "1–30 days", "31–60 days", "61–90 days", "91–120 days", "121+ days"];

    const summaryRows = data.suppliers.map((s) => {
        const row: any = { supplier_id: s.supplier_id, supplier_name: s.supplier_name, total: s.total };
        allBucketLabels.forEach((lbl) => { row[lbl] = s.buckets?.[lbl] || 0; });
        return row;
    });
    const summaryTotals: Record<string, number> = { total: summaryRows.reduce((s, r) => s + r.total, 0) };
    allBucketLabels.forEach((lbl) => { summaryTotals[lbl] = summaryRows.reduce((s, r) => s + (r[lbl] || 0), 0); });

    const summaryColumns = [
        { title: "Supplier Name", dataIndex: "supplier_name", key: "name", render: (v: string) => <Text strong style={{ color: "#fa8c16", cursor: "pointer" }} onClick={() => setView("per-supplier")}>{v}</Text> },
        ...allBucketLabels.map((lbl) => ({
            title: lbl, dataIndex: lbl, key: lbl, align: "right" as const,
            render: (v: number) => v > 0 ? <Text style={{ color: "#fa8c16" }}>KES{fmt(v)}</Text> : <Text type="secondary">KES0.00</Text>,
        })),
        { title: "Total", dataIndex: "total", key: "total", align: "right" as const, render: (v: number) => <Text strong style={{ color: "#fa8c16" }}>KES{fmt(v)}</Text> },
    ];

    type DetailRow = { key: string; isGroup?: boolean; isBucket?: boolean; supplier_name?: string; supplier_total?: number; bucket_label?: string; bucket_total?: number; invoice_no?: string; issue_date?: string; due_date?: string; amount?: number; amount_due?: number; days_overdue?: number; status?: string };
    const detailRows: DetailRow[] = [];
    for (const s of data.suppliers) {
        detailRows.push({ key: `grp-${s.supplier_id}`, isGroup: true, supplier_name: s.supplier_name, supplier_total: s.total });
        const byBucket: Record<string, typeof s.bills> = {};
        for (const b of s.bills) { if (!byBucket[b.bucket]) byBucket[b.bucket] = []; byBucket[b.bucket].push(b); }
        for (const [bkt, bills] of Object.entries(byBucket)) {
            detailRows.push({ key: `bkt-${s.supplier_id}-${bkt}`, isBucket: true, bucket_label: bkt, bucket_total: bills.reduce((sum, b) => sum + b.amount_due, 0) });
            for (const b of bills) detailRows.push({ key: `bill-${b.invoice_no}`, invoice_no: b.invoice_no, issue_date: b.issue_date, due_date: b.due_date, amount: b.grand_total, amount_due: b.amount_due, days_overdue: b.days_overdue, status: b.status });
        }
    }

    const detailColumns = [
        {
            title: "Date", key: "date", width: 110,
            render: (_: any, r: DetailRow) => {
                if (r.isGroup) return <Text strong style={{ fontSize: 13 }}>{r.supplier_name}</Text>;
                if (r.isBucket) return <Text type="secondary" style={{ fontSize: 11, paddingLeft: 12 }}>{">"} {r.bucket_label}</Text>;
                return <Text style={{ paddingLeft: 24 }}>{dayjs(r.issue_date).format("DD/MM/YYYY")}</Text>;
            },
        },
        { title: "Bill #", dataIndex: "invoice_no", key: "bill", width: 130, render: (_: any, r: DetailRow) => r.invoice_no ? <Text style={{ color: "#fa8c16", paddingLeft: 24 }}>{r.invoice_no}</Text> : null },
        { title: "Type", key: "type", width: 70, render: (_: any, r: DetailRow) => r.invoice_no ? <Text>Bill</Text> : null },
        { title: "Status", dataIndex: "status", key: "status", width: 100, render: (_: any, r: DetailRow) => r.status ? <Tag color={r.status === "Overdue" ? "error" : "default"} style={{ fontSize: 10 }}>{r.status}</Tag> : null },
        { title: "Age", dataIndex: "days_overdue", key: "age", align: "right" as const, width: 90, render: (_: any, r: DetailRow) => r.invoice_no ? <Text>{r.days_overdue} Days</Text> : (r.isGroup ? <Text strong style={{ color: "#fa8c16" }}>KES{fmt(r.supplier_total || 0)}</Text> : null) },
        { title: "Amount", dataIndex: "amount", key: "amount", align: "right" as const, render: (_: any, r: DetailRow) => r.invoice_no ? <Text style={{ color: "#fa8c16" }}>KES{fmt(r.amount || 0)}</Text> : r.isBucket ? <Text type="secondary">KES{fmt(r.bucket_total || 0)}</Text> : null },
        { title: "Balance Due", dataIndex: "amount_due", key: "due", align: "right" as const, render: (_: any, r: DetailRow) => r.invoice_no ? <Text strong style={{ color: "#fa8c16" }}>KES{fmt(r.amount_due || 0)}</Text> : r.isBucket ? <Text strong>KES{fmt(r.bucket_total || 0)}</Text> : null },
    ];

    const handlePrint = (mode: "summary" | "detailed") => {
        if (mode === "summary") {
            const bh = allBucketLabels.map((l) => `<th class="num">${l}</th>`).join("");
            const rows = summaryRows.map((r) => `<tr><td>${r.supplier_name}</td>${allBucketLabels.map((l) => `<td class="num" style="color:${r[l] > 0 ? "#fa8c16" : "#aaa"}">${r[l] > 0 ? "KES" + fmt(r[l]) : "KES0.00"}</td>`).join("")}<td class="num" style="color:#fa8c16;font-weight:700">KES${fmt(r.total)}</td></tr>`).join("");
            const html = `<div class="header-block"><div><div class="company">AP Aging Summary</div><div class="subtitle">As of ${dayjs(data.as_of).format("DD/MM/YYYY")}</div></div><div class="meta">Generated: ${dayjs().format("DD MMM YYYY HH:mm")}</div></div>
            <table><thead><tr><th>Supplier Name</th>${bh}<th class="num">Total</th></tr></thead><tbody>${rows}</tbody></table>`;
            printSection(html, "AP Aging Summary");
        } else {
            const rows = data.suppliers.map((s) => {
                const billRows = s.bills.map((b) => `<tr><td style="padding-left:32px">${dayjs(b.issue_date).format("DD/MM/YYYY")}</td><td style="padding-left:32px;color:#fa8c16">${b.invoice_no}</td><td>Bill</td><td><span style="color:${b.status === "Overdue" ? "#cf1322" : "#666"}">${b.status}</span></td><td class="num">${b.days_overdue} Days</td><td class="num" style="color:#fa8c16">KES${fmt(b.grand_total)}</td><td class="num" style="color:#fa8c16">KES${fmt(b.amount_due)}</td></tr>`).join("");
                return `<tr class="section-header"><td colspan="7">${s.supplier_name} — KES${fmt(s.total)}</td></tr>${billRows}`;
            }).join("");
            const html = `<div class="header-block"><div><div class="company">AP Aging Details</div><div class="subtitle">As of ${dayjs(data.as_of).format("DD/MM/YYYY")}</div></div><div class="meta">Generated: ${dayjs().format("DD MMM YYYY HH:mm")}</div></div>
            <table><thead><tr><th>Date</th><th>Bill #</th><th>Type</th><th>Status</th><th class="num">Age</th><th class="num">Amount</th><th class="num">Balance Due</th></tr></thead><tbody>${rows}</tbody></table>`;
            printSection(html, "AP Aging Details");
        }
    };

    const handleExcel = () => exportToExcel("ap_aging_summary", summaryRows.map((r) => { const row: any = { "Supplier": r.supplier_name }; allBucketLabels.forEach((l) => { row[l] = r[l]; }); row["Total"] = r.total; return row; }));
    const handlePdf = () => exportToPdf("ap_aging", "AP Aging Report", `As of: ${dayjs(data.as_of).format("DD MMM YYYY")}  |  Total: KES ${fmt(data.summary?.grand_total || 0)}`, ["Supplier", ...allBucketLabels, "Total"], summaryRows.map((r) => [r.supplier_name, ...allBucketLabels.map((l) => fmt(r[l])), fmt(r.total)]));

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Space size={6}>
                    <Tag color="orange" style={{ fontSize: 12, padding: "2px 10px" }}>Total AP: KES {fmt(data.summary?.grand_total || 0)}</Tag>
                    <Tag color="default" style={{ fontSize: 12, padding: "2px 10px" }}>{data.total_suppliers_with_outstanding} suppliers</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>As of {dayjs(data.as_of).format("DD MMM YYYY")}</Text>
                </Space>
                <Space>
                    <Segmented
                        size="small"
                        value={view}
                        onChange={(v) => setView(v as any)}
                        options={[
                            { label: "Summary", value: "summary", icon: <AppstoreOutlined /> },
                            { label: "Detailed", value: "detailed", icon: <UnorderedListOutlined /> },
                            { label: "Per Supplier", value: "per-supplier", icon: <UserOutlined /> },
                        ]}
                    />
                    <ExportDropdown
                        onExcel={handleExcel}
                        onPdf={handlePdf}
                        onPrint={() => handlePrint(view === "detailed" || view === "per-supplier" ? "detailed" : "summary")}
                    />
                </Space>
            </div>

            {view === "summary" && (
                <Table rowKey="supplier_id" dataSource={summaryRows} columns={summaryColumns} size="small" pagination={false} scroll={{ x: "max-content" }}
                    summary={() => (
                        <Table.Summary fixed>
                            <Table.Summary.Row style={{ background: "#fafafa", fontWeight: 700 }}>
                                <Table.Summary.Cell index={0}><Text strong>Totals</Text></Table.Summary.Cell>
                                {allBucketLabels.map((lbl, i) => (
                                    <Table.Summary.Cell key={lbl} index={i + 1} align="right">
                                        <Text strong style={{ color: summaryTotals[lbl] > 0 ? "#fa8c16" : "#aaa" }}>KES{fmt(summaryTotals[lbl])}</Text>
                                    </Table.Summary.Cell>
                                ))}
                                <Table.Summary.Cell index={allBucketLabels.length + 1} align="right">
                                    <Text strong style={{ color: "#fa8c16" }}>KES{fmt(summaryTotals.total)}</Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        </Table.Summary>
                    )}
                />
            )}

            {view === "detailed" && (
                <Table rowKey="key" dataSource={detailRows} columns={detailColumns} size="small" pagination={false} scroll={{ x: 900 }}
                    rowClassName={(r: DetailRow) => r.isGroup ? "aging-group-row-ap" : r.isBucket ? "aging-bucket-row" : ""}
                />
            )}

            {view === "per-supplier" && data.suppliers.map((sup) => (
                <div key={sup.supplier_id} style={{ marginBottom: 24, border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ background: "#fff7e6", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ffe7ba" }}>
                        <Space>
                            <Text strong style={{ fontSize: 14 }}>{sup.supplier_name}</Text>
                            {sup.email && <Text type="secondary" style={{ fontSize: 12 }}>{sup.email}</Text>}
                        </Space>
                        <Tag color="orange" style={{ fontSize: 12 }}>Outstanding: KES {fmt(sup.total)}</Tag>
                    </div>
                    <Table rowKey="bill_id" dataSource={sup.bills} pagination={false} size="small"
                        columns={[
                            { title: "Bill No.", dataIndex: "invoice_no", width: 130, render: (v: string) => <Text style={{ color: "#fa8c16" }}>{v}</Text> },
                            { title: "Issue Date", dataIndex: "issue_date", width: 110, render: (d: string) => dayjs(d).format("DD/MM/YYYY") },
                            { title: "Due Date", dataIndex: "due_date", width: 110, render: (d: string) => d ? dayjs(d).format("DD/MM/YYYY") : "—" },
                            { title: "Amount", dataIndex: "grand_total", width: 120, align: "right" as const, render: (v: number) => <Text style={{ color: "#fa8c16" }}>KES{fmt(v)}</Text> },
                            { title: "Paid", dataIndex: "amount_paid", width: 110, align: "right" as const, render: (v: number) => <Text style={{ color: "#389e0d" }}>KES{fmt(v)}</Text> },
                            { title: "Balance Due", dataIndex: "amount_due", width: 120, align: "right" as const, render: (v: number) => <Text strong style={{ color: "#fa8c16" }}>KES{fmt(v)}</Text> },
                            { title: "Days Overdue", dataIndex: "days_overdue", width: 110, align: "right" as const, render: (v: number) => <Tag color={v > 90 ? "red" : v > 30 ? "orange" : v > 0 ? "gold" : "default"}>{v} Days</Tag> },
                            { title: "Bucket", dataIndex: "bucket", width: 120, render: (v: string) => <Tag style={{ fontSize: 10 }}>{v}</Tag> },
                            { title: "Status", dataIndex: "status", width: 100, render: (v: string) => <Tag color={v === "Overdue" ? "error" : "default"} style={{ fontSize: 10 }}>{v}</Tag> },
                        ]}
                    />
                </div>
            ))}

            <style>{`
                .aging-group-row td { background: #fff7e6 !important; font-weight: 700; }
                .aging-group-row-ap td { background: #fff7e6 !important; font-weight: 700; }
                .aging-bucket-row td { background: #fafafa !important; color: #888; font-style: italic; }
            `}</style>
        </>
    );
};