import React, { useState, useRef, useCallback } from "react";
import { ProTable, ActionType } from "@ant-design/pro-components";
import {
    Button, Space, Tag, Tooltip, Popconfirm,
    Typography, Badge, Card, Tabs, App, Statistic, Row, Col,
    DatePicker, Select, Input, Form,
} from "antd";
import { CurrencyDisplay } from "@components/Currency";
import {
    PlusOutlined, EyeOutlined, EditOutlined, CheckCircleOutlined,
    StopOutlined, ReloadOutlined, DollarOutlined, WalletOutlined,
    ClockCircleOutlined, ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getAllPettyCashTransactions,
    getPettyCashSummary,
    getPettyCashBalance,
    approvePettyCashTransaction,
    voidPettyCashTransaction,
    PettyCashTransaction,
    PettyCashStatus,
    PettyCashTransactionType,
    PettyCashPaymentMethod,
    PettyCashCategory,
} from "@services/accounting/pettyCash";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import dayjs from "dayjs";
import PettyCashFormDrawer from "./PettyCashFormDrawer";
import PettyCashDetailDrawer from "./PettyCashDetailDrawer";

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const STATUS_CONFIG: Record<PettyCashStatus, { color: string; label: string }> = {
    Pending: { color: "processing", label: "Pending" },
    Approved: { color: "success", label: "Approved" },
    Voided: { color: "default", label: "Voided" },
};

const TRANSACTION_TYPE_CONFIG: Record<PettyCashTransactionType, { color: string; label: string }> = {
    Deposit: { color: "green", label: "Deposit" },
    Withdrawal: { color: "orange", label: "Withdrawal" },
    Expense: { color: "red", label: "Expense" },
};

const PettyCashListPage: React.FC = () => {
    const queryClient = useQueryClient();
    const actionRef = useRef<ActionType>();
    const { modal } = App.useApp();
    const [form] = Form.useForm();

    const [activeStatus, setActiveStatus] = useState<PettyCashStatus | "ALL">("ALL");
    const [page, setPage] = useState(1);
    const [formOpen, setFormOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<PettyCashTransaction | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<PettyCashTransaction | null>(null);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["petty-cash-transactions", activeStatus, page],
        queryFn: () =>
            getAllPettyCashTransactions({
                status: activeStatus === "ALL" ? undefined : activeStatus,
                page,
                limit: 20,
                ...form.getFieldsValue(),
            }),
        keepPreviousData: true,
    });

    const { data: summaryData } = useQuery({
        queryKey: ["petty-cash-summary"],
        queryFn: () => getPettyCashSummary(),
    });

    const { data: balanceData } = useQuery({
        queryKey: ["petty-cash-balance"],
        queryFn: () => getPettyCashBalance(),
    });

    const approveMutation = useMutation({
        mutationFn: approvePettyCashTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["petty-cash-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["petty-cash-summary"] });
            queryClient.invalidateQueries({ queryKey: ["petty-cash-balance"] });
        },
    });

    const voidMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => 
            voidPettyCashTransaction(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["petty-cash-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["petty-cash-summary"] });
            queryClient.invalidateQueries({ queryKey: ["petty-cash-balance"] });
        },
    });

    const handleApprove = (record: PettyCashTransaction) => {
        modal.confirm({
            title: "Approve this transaction?",
            content: `This will approve the ${record.transaction_type.toLowerCase()} of KES ${record.amount.toLocaleString()}`,
            okText: "Approve",
            onOk: () => approveMutation.mutateAsync(record._id),
        });
    };

    const handleVoid = (record: PettyCashTransaction) => {
        let reason = "";
        modal.confirm({
            title: "Void this transaction?",
            okText: "Void Transaction",
            okButtonProps: { danger: true },
            content: (
                <Input.TextArea
                    placeholder="Enter reason for voiding..."
                    onChange={(e) => (reason = e.target.value)}
                    rows={3}
                />
            ),
            onOk: () => {
                if (!reason.trim()) {
                    modal.error({
                        title: "Reason Required",
                        content: "Please provide a reason for voiding this transaction.",
                    });
                    return Promise.reject();
                }
                return voidMutation.mutateAsync({ id: record._id, reason });
            },
        });
    };

    const openDetail = (record: PettyCashTransaction) => {
        setSelectedTransaction(record);
        setDetailOpen(true);
    };

    const openEdit = (record: PettyCashTransaction) => {
        setEditingTransaction(record);
        setFormOpen(true);
    };

    const onSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["petty-cash-transactions"] });
        queryClient.invalidateQueries({ queryKey: ["petty-cash-summary"] });
        queryClient.invalidateQueries({ queryKey: ["petty-cash-balance"] });
        setFormOpen(false);
        setEditingTransaction(null);
    }, [queryClient]);

    const columns = [
        {
            title: "Transaction No",
            dataIndex: "transaction_no",
            key: "transaction_no",
            width: 150,
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: "Date",
            dataIndex: "transaction_date",
            key: "transaction_date",
            width: 120,
            render: (date: string) => dayjs(date).format("DD MMM YYYY"),
        },
        {
            title: "Type",
            dataIndex: "transaction_type",
            key: "transaction_type",
            width: 100,
            render: (type: PettyCashTransactionType) => (
                <Tag color={TRANSACTION_TYPE_CONFIG[type].color}>
                    {TRANSACTION_TYPE_CONFIG[type].label}
                </Tag>
            ),
        },
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            ellipsis: true,
        },
        {
            title: "Category",
            dataIndex: "category",
            key: "category",
            width: 120,
            render: (category: PettyCashCategory) => <Tag>{category}</Tag>,
        },
        {
            title: "Payee/Recipient",
            key: "payee_recipient",
            width: 150,
            render: (record: PettyCashTransaction) => (
                <Text>{record.payee_name || record.recipient_name || "-"}</Text>
            ),
        },
        {
            title: "Amount",
            dataIndex: "amount",
            key: "amount",
            width: 120,
            align: "right" as const,
            render: (amount: number, record: PettyCashTransaction) => (
                <Text strong style={{ color: record.transaction_type === "Deposit" ? "#52c41a" : "#ff4d4f" }}>
                    {record.transaction_type === "Deposit" ? "+" : "-"}
                    <CurrencyDisplay 
                        amount={amount} 
                        currency={record.currency || "KES"}
                        showBaseCurrency={record.currency !== "KES"}
                    />
                </Text>
            ),
        },
        {
            title: "Payment Method",
            dataIndex: "payment_method",
            key: "payment_method",
            width: 120,
            render: (method: PettyCashPaymentMethod) => <Tag>{method.replace("_", " ")}</Tag>,
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 100,
            render: (status: PettyCashStatus) => (
                <Badge
                    status={STATUS_CONFIG[status].color as any}
                    text={STATUS_CONFIG[status].label}
                />
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 150,
            render: (record: PettyCashTransaction) => (
                <Space size="small">
                    <Tooltip title="View Details">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => openDetail(record)}
                        />
                    </Tooltip>
                    {record.status === "Pending" && (
                        <>
                            <Tooltip title="Edit">
                                <Button
                                    type="text"
                                    icon={<EditOutlined />}
                                    onClick={() => openEdit(record)}
                                />
                            </Tooltip>
                            <Tooltip title="Approve">
                                <Button
                                    type="text"
                                    icon={<CheckCircleOutlined />}
                                    onClick={() => handleApprove(record)}
                                />
                            </Tooltip>
                        </>
                    )}
                    {record.status !== "Voided" && (
                        <Tooltip title="Void">
                            <Popconfirm
                                title="Void this transaction?"
                                onConfirm={() => handleVoid(record)}
                                okText="Void"
                                okButtonProps={{ danger: true }}
                            >
                                <Button type="text" icon={<StopOutlined />} danger />
                            </Popconfirm>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            {/* Summary Cards */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Current Balance"
                            value={balanceData?.balance || 0}
                            precision={2}
                            prefix="KES"
                            valueStyle={{ color: "#3f8600" }}
                            suffix={<WalletOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Deposits"
                            value={balanceData?.total_deposits || 0}
                            precision={2}
                            prefix="KES"
                            valueStyle={{ color: "#52c41a" }}
                            suffix={<DollarOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Withdrawals"
                            value={balanceData?.total_withdrawals || 0}
                            precision={2}
                            prefix="KES"
                            valueStyle={{ color: "#ff4d4f" }}
                            suffix={<ExclamationCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Pending Transactions"
                            value={summaryData?.summary?.find(s => s._id === "Pending")?.count || 0}
                            valueStyle={{ color: "#fa8c16" }}
                            suffix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Form form={form} layout="inline">
                    <Form.Item name="dateRange" label="Date Range">
                        <RangePicker />
                    </Form.Item>
                    <Form.Item name="transaction_type" label="Type">
                        <Select placeholder="All Types" allowClear style={{ width: 120 }}>
                            <Option value="Deposit">Deposit</Option>
                            <Option value="Withdrawal">Withdrawal</Option>
                            <Option value="Expense">Expense</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="category" label="Category">
                        <Select placeholder="All Categories" allowClear style={{ width: 150 }}>
                            <Option value="Office Supplies">Office Supplies</Option>
                            <Option value="Transport">Transport</Option>
                            <Option value="Meals">Meals</Option>
                            <Option value="Utilities">Utilities</Option>
                            <Option value="Repairs">Repairs</Option>
                            <Option value="Other">Other</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="search" label="Search">
                        <Input placeholder="Search..." allowClear />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" onClick={() => refetch()}>
                            Search
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            {/* Status Tabs */}
            <Tabs
                activeKey={activeStatus}
                onChange={(key) => setActiveStatus(key as PettyCashStatus | "ALL")}
                items={[
                    { key: "ALL", label: "All Transactions" },
                    ...Object.entries(STATUS_CONFIG).map(([key, config]) => ({
                        key,
                        label: (
                            <Badge
                                count={summaryData?.summary?.find(s => s._id === key)?.count || 0}
                                showZero
                                offset={[10, 0]}
                            >
                                {config.label}
                            </Badge>
                        ),
                    })),
                ]}
            />

            {/* Table */}
            <ProTable<PettyCashTransaction>
                actionRef={actionRef}
                columns={columns}
                dataSource={data?.transactions || []}
                loading={isLoading}
                rowKey="_id"
                search={false}
                pagination={{
                    current: page,
                    total: data?.total || 0,
                    pageSize: 20,
                    onChange: setPage,
                    showSizeChanger: false,
                }}
                toolBarRender={() => [
                    <Button
                        key="refresh"
                        icon={<ReloadOutlined />}
                        onClick={() => refetch()}
                    >
                        Refresh
                    </Button>,
                    <Button
                        key="add"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setEditingTransaction(null);
                            setFormOpen(true);
                        }}
                    >
                        New Transaction
                    </Button>,
                ]}
            />

            {/* Drawers */}
            <PettyCashFormDrawer
                open={formOpen}
                setOpen={setFormOpen}
                transaction={editingTransaction}
                onSuccess={onSuccess}
            />
            <PettyCashDetailDrawer
                open={detailOpen}
                setOpen={setDetailOpen}
                transaction={selectedTransaction}
            />
        </div>
    );
};

export default PettyCashListPage;
