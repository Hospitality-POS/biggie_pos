import React, { useState } from "react";
import { Drawer, Table, Typography, Space, Tag, Statistic, Row, Col, DatePicker } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
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

const AccountLedgerDrawer: React.FC<Props> = ({ open, onClose, account, shopId }) => {
    const [page, setPage] = useState(1);
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
        dayjs().startOf("month"),
        dayjs().endOf("month"),
    ]);

    const from = dateRange[0]?.startOf("day").toISOString();
    const to = dateRange[1]?.endOf("day").toISOString();

    const { data, isLoading } = useQuery({
        queryKey: ["account-ledger", account?._id, page, from, to],
        queryFn: () =>
            getAccountLedger(account!._id, {
                shop_id: shopId,
                from,
                to,
                page,
                limit: 20,
            }),
        enabled: open && !!account?._id,
        keepPreviousData: true,
    });

    const ledger = data?.ledger || [];
    const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };
    const accountInfo = data?.account;

    // Summary stats
    const totalDebit = ledger.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = ledger.reduce((s, l) => s + (l.credit || 0), 0);
    const closing = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;

    const columns = [
        {
            title: "Date",
            dataIndex: "entry_date",
            key: "entry_date",
            width: 110,
            render: (d: string) => dayjs(d).format("DD MMM YYYY"),
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
                ) : (
                    <Text type="secondary">—</Text>
                ),
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
                ) : (
                    <Text type="secondary">—</Text>
                ),
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
                    <Title level={5} style={{ margin: 0 }}>
                        Account Ledger
                    </Title>
                    {account && (
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {account.account_code} — {account.account_name}
                        </Text>
                    )}
                </Space>
            }
            open={open}
            onClose={() => {
                onClose();
                setPage(1);
            }}
            width={860}
            destroyOnClose
        >
            {/* ── Date Range Filter ── */}
            <Space style={{ marginBottom: 16 }}>
                <Text type="secondary">Period:</Text>
                <RangePicker
                    value={dateRange}
                    onChange={(range) =>
                        setDateRange(range as [Dayjs | null, Dayjs | null])
                    }
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