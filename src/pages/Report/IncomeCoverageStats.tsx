import React, { useMemo } from "react";
import { Alert, Empty, Progress, Segmented, Table, Tooltip, Typography } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  PieChartOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { ProfitAndLossResponse } from "@services/accounting/reports";
import { splitProfitAndLoss } from "./ReportTables";

const { Text } = Typography;

// Pesa → Reports → Stats: what share of income each kind of spending takes,
// and how far income covers it. Built from the Profit & Loss for the period.

const GROUPS = {
  cogs: { label: "Cost of Goods Sold", short: "COGS", color: "#f59e0b" },
  opex: { label: "Operating Expenses", short: "Operating", color: "#ef4444" },
  other: { label: "Other Expenses", short: "Other", color: "#8b5cf6" },
  profit: { label: "Net Profit", short: "Profit", color: "#10b981" },
} as const;
type GroupKey = keyof typeof GROUPS;

const INCOME_COLOR = "#2563eb";
const NUM: React.CSSProperties = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

const money = (v: number) =>
  `KES ${(v ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pctText = (v: number | null) =>
  v === null || !isFinite(v) ? "—" : `${v >= 100 || v <= -100 ? v.toFixed(0) : v.toFixed(1)}%`;

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "16px 18px",
};

const SectionHeading: React.FC<{ title: string; hint?: string; extra?: React.ReactNode }> = ({ title, hint, extra }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
    <div>
      <Text strong style={{ fontSize: 15, color: "#0f172a", display: "block" }}>{title}</Text>
      {hint && <Text style={{ fontSize: 12.5, color: "#64748b" }}>{hint}</Text>}
    </div>
    {extra}
  </div>
);

const Kpi: React.FC<{ label: string; value: string; sub?: React.ReactNode; color: string }> = ({ label, value, sub, color }) => (
  <div style={{ ...card, borderTop: `3px solid ${color}` }}>
    <Text style={{ fontSize: 12, color: "#64748b", display: "block" }}>{label}</Text>
    <Text strong style={{ ...NUM, fontSize: 20, color: "#0f172a", display: "block", marginTop: 4 }}>{value}</Text>
    {sub && <div style={{ marginTop: 4, fontSize: 12.5 }}>{sub}</div>}
  </div>
);

interface AccountRow {
  key: string;
  account_code?: string;
  account_name: string;
  group: GroupKey;
  amount: number;
  pctIncome: number | null;
  pctOfGroup: number | null;
}

const IncomeCoverageStats: React.FC<{ data: ProfitAndLossResponse; periodLabel: string }> = ({ data, periodLabel }) => {
  const [view, setView] = React.useState<"expenses" | "income">("expenses");

  const s = useMemo(() => {
    const split = splitProfitAndLoss(data);
    const sum = (rows: any[]) => rows.reduce((t, a) => t + (Number(a.amount) || 0), 0);
    const income = split.totalRevenue;
    const cogs = sum(split.cogsRows);
    const opex = sum(split.opExpRows);
    const other = sum(split.nonOpExpRows);
    const expenses = cogs + opex + other;
    const profit = income - expenses;
    const ofIncome = (v: number) => (income > 0 ? (v / income) * 100 : null);
    const groupTotals: Record<GroupKey, number> = { cogs, opex, other, profit };

    const accountRows: AccountRow[] = [
      ...split.cogsRows.map((a: any) => ({ ...a, group: "cogs" as GroupKey })),
      ...split.opExpRows.map((a: any) => ({ ...a, group: "opex" as GroupKey })),
      ...split.nonOpExpRows.map((a: any) => ({ ...a, group: "other" as GroupKey })),
    ]
      .filter((a) => Math.abs(Number(a.amount) || 0) > 0.004)
      .map((a, i) => ({
        key: `${a.account_code || a.account_name}-${i}`,
        account_code: a.account_code,
        account_name: a.account_name,
        group: a.group,
        amount: Number(a.amount) || 0,
        pctIncome: ofIncome(Number(a.amount) || 0),
        pctOfGroup: expenses > 0 ? ((Number(a.amount) || 0) / expenses) * 100 : null,
      }))
      .sort((a, b) => b.amount - a.amount);

    const incomeRows = split.revenueRows
      .filter((a: any) => Math.abs(Number(a.amount) || 0) > 0.004)
      .map((a: any, i: number) => ({
        key: `${a.account_code || a.account_name}-${i}`,
        account_code: a.account_code,
        account_name: a.account_name,
        amount: Number(a.amount) || 0,
        pct: income > 0 ? ((Number(a.amount) || 0) / income) * 100 : null,
        nonOperating: !!a.is_non_operating,
      }))
      .sort((a: any, b: any) => b.amount - a.amount);

    return {
      income, cogs, opex, other, expenses, profit, groupTotals, accountRows, incomeRows,
      ofIncome,
      coverage: expenses > 0 ? (income / expenses) * 100 : null,
      margin: ofIncome(profit),
    };
  }, [data]);

  if (s.income <= 0 && s.expenses <= 0) {
    return <Empty description={`No income or expenses recorded for ${periodLabel}`} style={{ padding: 40 }} />;
  }

  const overspent = s.profit < 0;
  // The split bar covers income; when spending is higher it covers spending
  // instead, so the parts still add up to 100%.
  const barBase = Math.max(s.income, s.expenses) || 1;
  const barParts: { key: GroupKey; value: number }[] = ([
    { key: "cogs", value: s.cogs },
    { key: "opex", value: s.opex },
    { key: "other", value: s.other },
    ...(overspent ? [] : [{ key: "profit", value: s.profit }]),
  ] as { key: GroupKey; value: number }[]).filter((p) => p.value > 0);

  const coveragePct = s.coverage ?? 0;
  const coverageColor = coveragePct >= 120 ? "#10b981" : coveragePct >= 100 ? "#f59e0b" : "#ef4444";

  const expenseColumns = [
    {
      title: "Account",
      dataIndex: "account_name",
      render: (v: string, r: AccountRow) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: GROUPS[r.group].color, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <Text style={{ fontSize: 13, display: "block" }} ellipsis>{v}</Text>
            <Text style={{ fontSize: 11, color: "#94a3b8" }}>{r.account_code ? `${r.account_code} · ` : ""}{GROUPS[r.group].short}</Text>
          </div>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      align: "right" as const,
      width: 160,
      render: (v: number) => <Text style={{ ...NUM, fontSize: 13 }}>{money(v)}</Text>,
    },
    {
      title: "% of income",
      dataIndex: "pctIncome",
      width: 220,
      render: (v: number | null, r: AccountRow) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Progress
            percent={Math.min(Math.max(v ?? 0, 0), 100)}
            showInfo={false}
            strokeColor={GROUPS[r.group].color}
            trailColor="#f1f5f9"
            size="small"
            style={{ flex: 1, margin: 0 }}
          />
          <Text strong style={{ ...NUM, fontSize: 12.5, width: 52, textAlign: "right" }}>{pctText(v)}</Text>
        </div>
      ),
    },
    {
      title: "% of spending",
      dataIndex: "pctOfGroup",
      align: "right" as const,
      width: 120,
      render: (v: number | null) => <Text style={{ ...NUM, fontSize: 12.5, color: "#64748b" }}>{pctText(v)}</Text>,
    },
  ];

  const incomeColumns = [
    {
      title: "Income account",
      dataIndex: "account_name",
      render: (v: string, r: any) => (
        <div>
          <Text style={{ fontSize: 13, display: "block" }}>{v}</Text>
          <Text style={{ fontSize: 11, color: "#94a3b8" }}>{r.account_code ? `${r.account_code} · ` : ""}{r.nonOperating ? "Other income" : "Operating income"}</Text>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      align: "right" as const,
      width: 160,
      render: (v: number) => <Text style={{ ...NUM, fontSize: 13 }}>{money(v)}</Text>,
    },
    {
      title: "Share of income",
      dataIndex: "pct",
      width: 240,
      render: (v: number | null) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Progress percent={Math.min(Math.max(v ?? 0, 0), 100)} showInfo={false} strokeColor={INCOME_COLOR} trailColor="#f1f5f9" size="small" style={{ flex: 1, margin: 0 }} />
          <Text strong style={{ ...NUM, fontSize: 12.5, width: 52, textAlign: "right" }}>{pctText(v)}</Text>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Headline numbers ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <Kpi label="Total income" value={money(s.income)} color={INCOME_COLOR} sub={<Text style={{ color: "#64748b" }}>{periodLabel}</Text>} />
        <Kpi
          label="Total spending"
          value={money(s.expenses)}
          color="#ef4444"
          sub={<Text style={{ color: "#64748b" }}>{pctText(s.ofIncome(s.expenses))} of income</Text>}
        />
        <Kpi
          label={overspent ? "Net loss" : "Net profit"}
          value={money(Math.abs(s.profit))}
          color={overspent ? "#ef4444" : "#10b981"}
          sub={
            <Text style={{ color: overspent ? "#dc2626" : "#059669", fontWeight: 600 }}>
              {overspent ? <ArrowDownOutlined /> : <ArrowUpOutlined />} {pctText(s.margin)} margin
            </Text>
          }
        />
      </div>

      {s.income <= 0 && (
        <Alert type="warning" showIcon style={{ borderRadius: 10 }} message="No income was recorded in this period, so spending can't be shown as a share of income." />
      )}

      {/* ── Where income goes ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <div style={{ ...card, flex: "2 1 420px", minWidth: 0 }}>
          <SectionHeading
            title={overspent ? "Spending compared with income" : "Where every KES 100 of income goes"}
            hint={overspent
              ? `Spending was ${pctText(s.ofIncome(s.expenses))} of income — ${money(-s.profit)} more than came in.`
              : "Each part of the bar is a share of total income."}
          />

          {/* Split bar */}
          <div style={{ display: "flex", height: 34, borderRadius: 8, overflow: "hidden", background: "#f1f5f9" }}>
            {barParts.map((p) => {
              const w = (p.value / barBase) * 100;
              return (
                <Tooltip key={p.key} title={`${GROUPS[p.key].label}: ${money(p.value)} (${pctText(s.ofIncome(p.value))} of income)`}>
                  <div
                    style={{
                      width: `${w}%`, background: GROUPS[p.key].color, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 600, ...NUM, transition: "width .3s ease",
                    }}
                  >
                    {w >= 9 ? pctText(s.ofIncome(p.value)) : ""}
                  </div>
                </Tooltip>
              );
            })}
          </div>
          {overspent && s.income > 0 && (
            <div style={{ position: "relative", height: 18 }}>
              <div style={{ position: "absolute", left: `${(s.income / barBase) * 100}%`, top: 0, transform: "translateX(-50%)", textAlign: "center" }}>
                <div style={{ width: 2, height: 8, background: "#0f172a", margin: "0 auto" }} />
                <Text style={{ fontSize: 11, color: "#0f172a", whiteSpace: "nowrap" }}>Income</Text>
              </div>
            </div>
          )}

          {/* Breakdown rows */}
          <div style={{ marginTop: overspent ? 10 : 18, display: "flex", flexDirection: "column", gap: 12 }}>
            {(["cogs", "opex", "other", "profit"] as GroupKey[]).map((k) => {
              const value = s.groupTotals[k];
              if (k !== "profit" && value <= 0) return null;
              const pct = s.ofIncome(value);
              const isLoss = k === "profit" && value < 0;
              const color = isLoss ? "#ef4444" : GROUPS[k].color;
              return (
                <div key={k}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                      <Text style={{ fontSize: 13, color: "#334155" }}>{isLoss ? "Net Loss" : GROUPS[k].label}</Text>
                    </span>
                    <span style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                      <Text style={{ ...NUM, fontSize: 12.5, color: "#64748b" }}>{money(Math.abs(value))}</Text>
                      <Text strong style={{ ...NUM, fontSize: 13.5, color, width: 56, textAlign: "right" }}>{pctText(pct === null ? null : Math.abs(pct))}</Text>
                    </span>
                  </div>
                  <Progress percent={Math.min(Math.abs(pct ?? 0), 100)} showInfo={false} strokeColor={color} trailColor="#f1f5f9" size="small" style={{ margin: 0 }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Coverage gauge */}
        <div style={{ ...card, flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <SectionHeading title="Expense coverage" />
          <Progress
            type="dashboard"
            percent={Math.min(coveragePct, 100)}
            strokeColor={coverageColor}
            trailColor="#f1f5f9"
            size={170}
            format={() => (
              <div>
                <div style={{ ...NUM, fontSize: 26, fontWeight: 700, color: "#0f172a" }}>{s.coverage === null ? "—" : pctText(s.coverage)}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>of spending covered</div>
              </div>
            )}
          />
          <Text style={{ fontSize: 13, color: "#334155", marginTop: 8 }}>
            {s.coverage === null
              ? "No spending recorded in this period."
              : s.coverage >= 100
                ? <>Income covers all spending{s.coverage > 100 ? <>, with <b>{money(s.profit)}</b> left over</> : ""}.</>
                : <>Income covers <b>{pctText(s.coverage)}</b> of spending — <b>{money(-s.profit)}</b> short.</>}
          </Text>
          {s.coverage !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12, color: coverageColor, fontWeight: 600 }}>
              <SafetyCertificateOutlined />
              {s.coverage >= 120 ? "Healthy" : s.coverage >= 100 ? "Breaking even — little room" : "Spending more than earning"}
            </div>
          )}
        </div>
      </div>

      {/* ── Account detail ────────────────────────────────────────────────── */}
      <div style={card}>
        <SectionHeading
          title={view === "expenses" ? "Spending by account" : "Income by account"}
          hint={view === "expenses" ? "How much of income each expense account takes, largest first." : "Which accounts the income came from."}
          extra={
            <Segmented
              value={view}
              onChange={(v) => setView(v as "expenses" | "income")}
              options={[
                { value: "expenses", label: <span><PieChartOutlined /> Expenses</span> },
                { value: "income", label: <span><ArrowUpOutlined /> Income</span> },
              ]}
            />
          }
        />
        {view === "expenses" ? (
          <Table
            size="small"
            rowKey="key"
            columns={expenseColumns}
            dataSource={s.accountRows}
            pagination={s.accountRows.length > 15 ? { pageSize: 15, showSizeChanger: false } : false}
            scroll={{ x: 640 }}
            locale={{ emptyText: "No expenses in this period" }}
          />
        ) : (
          <Table
            size="small"
            rowKey="key"
            columns={incomeColumns}
            dataSource={s.incomeRows}
            pagination={s.incomeRows.length > 15 ? { pageSize: 15, showSizeChanger: false } : false}
            scroll={{ x: 560 }}
            locale={{ emptyText: "No income in this period" }}
          />
        )}
      </div>
    </div>
  );
};

/** Rows for the page's CSV / email export */
export const incomeCoverageExportRows = (data: ProfitAndLossResponse) => {
  const split = splitProfitAndLoss(data);
  const sum = (rows: any[]) => rows.reduce((t, a) => t + (Number(a.amount) || 0), 0);
  const income = split.totalRevenue;
  const pct = (v: number) => (income > 0 ? Number(((v / income) * 100).toFixed(2)) : "");
  const groups: [string, any[]][] = [
    ["Cost of Goods Sold", split.cogsRows],
    ["Operating Expenses", split.opExpRows],
    ["Other Expenses", split.nonOpExpRows],
  ];
  const expenses = groups.reduce((t, [, rows]) => t + sum(rows), 0);
  return [
    { Group: "Income", Account: "Total income", "Amount (KES)": income, "% of Income": income > 0 ? 100 : "" },
    ...groups.flatMap(([group, rows]) =>
      rows.map((a: any) => ({ Group: group, Account: a.account_name, "Amount (KES)": Number(a.amount) || 0, "% of Income": pct(Number(a.amount) || 0) }))
    ),
    { Group: "Total", Account: "Total spending", "Amount (KES)": expenses, "% of Income": pct(expenses) },
    { Group: "Total", Account: income - expenses >= 0 ? "Net profit" : "Net loss", "Amount (KES)": income - expenses, "% of Income": pct(income - expenses) },
    { Group: "Total", Account: "Expense coverage (income ÷ spending)", "Amount (KES)": "", "% of Income": expenses > 0 ? Number(((income / expenses) * 100).toFixed(2)) : "" },
  ];
};

export default IncomeCoverageStats;
