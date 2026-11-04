import React, { useMemo } from "react";
import { Button, Card, Col, Empty, Progress, Row, Space, Statistic, Table, Tag, Tooltip, Typography } from "antd";
import { FundProjectionScreenOutlined, LineChartOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type {
    ProjectReportAccount,
    ProjectReportProject,
    ProjectsReportResponse,
    ProjectStatus,
} from "@services/accounting/projects";
import { useLedger } from "./ReportTables";

const { Text } = Typography;

const STATUS_COLORS: Record<ProjectStatus, string> = {
    Active: "green",
    "On Hold": "orange",
    Completed: "blue",
    Cancelled: "default",
};

const GREEN = "#389e0d";
const RED = "#cf1322";

const fmt = (v?: number | null) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Money: React.FC<{ v: number; color?: string; strong?: boolean }> = ({ v, color, strong }) => (
    <Text strong={strong} style={{ color, whiteSpace: "nowrap" }}>
        {fmt(v)}
    </Text>
);

/** Revenue / expense lines that make up one project's result. */
const AccountBreakdown: React.FC<{ accounts: ProjectReportAccount[] }> = ({ accounts }) => {
    const { openLedger } = useLedger();
    if (!accounts.length) return <Text type="secondary">No transactions in this period.</Text>;
    return (
        <Table
            size="small"
            rowKey="account_id"
            pagination={false}
            dataSource={accounts}
            columns={[
                {
                    title: "Account",
                    key: "account",
                    render: (_: unknown, a: ProjectReportAccount) => (
                        <Space size={6}>
                            <Tag color={a.account_type === "REVENUE" ? "green" : "orange"} style={{ marginInlineEnd: 0 }}>
                                {a.account_type === "REVENUE" ? "Income" : "Expense"}
                            </Tag>
                            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openLedger(a.account_code)}>
                                {a.account_code} — {a.account_name}
                            </Button>
                        </Space>
                    ),
                },
                {
                    title: "Amount (KES)",
                    dataIndex: "amount",
                    align: "right" as const,
                    width: 160,
                    render: (v: number, a: ProjectReportAccount) => (
                        <Money v={v} color={a.account_type === "REVENUE" ? GREEN : RED} />
                    ),
                },
            ]}
        />
    );
};

interface Props {
    data: ProjectsReportResponse;
    /** Open the P&L tab filtered to this project */
    onViewProfitAndLoss?: (projectId: string) => void;
}

const ProjectsReport: React.FC<Props> = ({ data, onViewProfitAndLoss }) => {
    const { projects, untagged, totals } = data;

    // Projects with activity first, then by net profit
    const rows = useMemo(
        () =>
            [...projects].sort(
                (a, b) =>
                    Number(b.transactions > 0) - Number(a.transactions > 0) || b.net_profit - a.net_profit
            ),
        [projects]
    );

    const active = projects.filter((p) => p.transactions > 0);
    const best = active.length ? active.reduce((m, p) => (p.net_profit > m.net_profit ? p : m)) : null;
    const worst = active.length ? active.reduce((m, p) => (p.net_profit < m.net_profit ? p : m)) : null;
    const overBudget = projects.filter((p) => p.budget_used_pct !== null && p.budget_used_pct > 100);
    const taggedShare = totals.revenue + totals.expenses
        ? ((totals.tagged_revenue + totals.tagged_expenses) / (totals.revenue + totals.expenses)) * 100
        : 0;

    if (!projects.length && !untagged.transactions) {
        return (
            <Empty
                style={{ padding: 48 }}
                description="No projects yet — create one under Projects, then tag invoices, bills, expenses or journal entries to it."
            />
        );
    }

    const columns = [
        {
            title: "Project",
            key: "project",
            render: (_: unknown, p: ProjectReportProject) => (
                <Space direction="vertical" size={0}>
                    <Space size={6} wrap>
                        {p.code && <Tag style={{ marginInlineEnd: 0 }}>{p.code}</Tag>}
                        <Text strong>{p.name}</Text>
                        <Tag color={STATUS_COLORS[p.status]} style={{ marginInlineEnd: 0 }}>{p.status}</Tag>
                        {p.is_archived && <Tag>Archived</Tag>}
                    </Space>
                    {(p.customer_name || p.start_date || p.end_date) && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {[
                                p.customer_name,
                                p.start_date || p.end_date
                                    ? `${p.start_date ? dayjs(p.start_date).format("DD MMM YYYY") : "…"} – ${p.end_date ? dayjs(p.end_date).format("DD MMM YYYY") : "…"}`
                                    : null,
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: "Income",
            dataIndex: "revenue",
            align: "right" as const,
            width: 140,
            sorter: (a: ProjectReportProject, b: ProjectReportProject) => a.revenue - b.revenue,
            render: (v: number) => <Money v={v} color={GREEN} />,
        },
        {
            title: "Expenses",
            dataIndex: "expenses",
            align: "right" as const,
            width: 140,
            sorter: (a: ProjectReportProject, b: ProjectReportProject) => a.expenses - b.expenses,
            render: (v: number) => <Money v={v} color={RED} />,
        },
        {
            title: "Net Profit",
            dataIndex: "net_profit",
            align: "right" as const,
            width: 150,
            sorter: (a: ProjectReportProject, b: ProjectReportProject) => a.net_profit - b.net_profit,
            render: (v: number) => <Money v={v} color={v >= 0 ? GREEN : RED} strong />,
        },
        {
            title: "Margin",
            dataIndex: "margin_pct",
            align: "right" as const,
            width: 90,
            render: (v: number | null) =>
                v === null ? <Text type="secondary">—</Text> : <Text style={{ color: v >= 0 ? GREEN : RED }}>{v.toFixed(1)}%</Text>,
        },
        {
            title: "Budget used",
            key: "budget",
            width: 190,
            render: (_: unknown, p: ProjectReportProject) =>
                p.budget_used_pct === null ? (
                    <Text type="secondary">No budget</Text>
                ) : (
                    <Tooltip title={`KES ${fmt(p.expenses)} of KES ${fmt(p.budget)} budget`}>
                        <Progress
                            percent={Math.min(100, p.budget_used_pct)}
                            size="small"
                            status={p.budget_used_pct > 100 ? "exception" : p.budget_used_pct > 85 ? "active" : "normal"}
                            format={() => `${p.budget_used_pct!.toFixed(0)}%`}
                        />
                    </Tooltip>
                ),
        },
        {
            title: "Txns",
            dataIndex: "transactions",
            align: "right" as const,
            width: 70,
        },
        ...(onViewProfitAndLoss
            ? [
                {
                    title: "",
                    key: "pl",
                    width: 60,
                    render: (_: unknown, p: ProjectReportProject) => (
                        <Tooltip title="Open Profit & Loss for this project">
                            <Button size="small" icon={<LineChartOutlined />} onClick={() => onViewProfitAndLoss(p._id)} />
                        </Tooltip>
                    ),
                },
            ]
            : []),
    ];

    return (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card size="small">
                        <Statistic
                            title="Project income"
                            value={totals.tagged_revenue}
                            precision={2}
                            valueStyle={{ color: GREEN }}
                            prefix={<FundProjectionScreenOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card size="small">
                        <Statistic title="Project expenses" value={totals.tagged_expenses} precision={2} valueStyle={{ color: RED }} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card size="small">
                        <Statistic
                            title="Project net profit"
                            value={totals.tagged_net_profit}
                            precision={2}
                            valueStyle={{ color: totals.tagged_net_profit >= 0 ? GREEN : RED }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card size="small">
                        <Statistic
                            title="Share of P&L tagged to projects"
                            value={taggedShare}
                            precision={1}
                            suffix="%"
                        />
                    </Card>
                </Col>
            </Row>

            {(best || overBudget.length > 0) && (
                <Space wrap size={8}>
                    {best && best.net_profit > 0 && (
                        <Tag color="green">Most profitable: {best.name} (KES {fmt(best.net_profit)})</Tag>
                    )}
                    {worst && worst.net_profit < 0 && (
                        <Tag color="red">Biggest loss: {worst.name} (KES {fmt(worst.net_profit)})</Tag>
                    )}
                    {overBudget.map((p) => (
                        <Tag key={p._id} color="volcano">
                            Over budget: {p.name} ({p.budget_used_pct!.toFixed(0)}%)
                        </Tag>
                    ))}
                </Space>
            )}

            <Table
                size="small"
                rowKey="_id"
                dataSource={rows}
                columns={columns}
                pagination={false}
                scroll={{ x: 1000 }}
                expandable={{
                    expandedRowRender: (p: ProjectReportProject) => <AccountBreakdown accounts={p.accounts} />,
                    rowExpandable: (p: ProjectReportProject) => p.accounts.length > 0,
                }}
                summary={() => (
                    <>
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={2}>
                                <Text type="secondary">Not tagged to a project</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right"><Money v={untagged.revenue} color={GREEN} /></Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right"><Money v={untagged.expenses} color={RED} /></Table.Summary.Cell>
                            <Table.Summary.Cell index={4} align="right">
                                <Money v={untagged.net_profit} color={untagged.net_profit >= 0 ? GREEN : RED} />
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={5} colSpan={onViewProfitAndLoss ? 4 : 3} />
                        </Table.Summary.Row>
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={2}>
                                <Text strong>Total (matches P&L)</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right"><Money v={totals.revenue} color={GREEN} strong /></Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right"><Money v={totals.expenses} color={RED} strong /></Table.Summary.Cell>
                            <Table.Summary.Cell index={4} align="right">
                                <Money v={totals.net_profit} color={totals.net_profit >= 0 ? GREEN : RED} strong />
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={5} colSpan={onViewProfitAndLoss ? 4 : 3} />
                        </Table.Summary.Row>
                    </>
                )}
            />
        </Space>
    );
};

export default ProjectsReport;
