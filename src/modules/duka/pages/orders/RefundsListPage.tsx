import React, { useState, useRef, useCallback } from "react";
import { ProTable, ActionType } from "@ant-design/pro-components";
import {
    Button, Space, Tag, Tooltip, Popconfirm,
    Typography, Badge, Card, Tabs, App, Statistic, Row, Col,
    DatePicker, Select, Input, Form,
} from "antd";
import {
    PlusOutlined, EyeOutlined, EditOutlined, CheckCircleOutlined,
    StopOutlined, ReloadOutlined, DollarOutlined, SwapOutlined,
    ClockCircleOutlined, ExclamationCircleOutlined, FileTextOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getAllRefunds,
    getRefundSummary,
    approveRefund,
    processRefund,
    voidRefund,
    Refund,
    RefundStatus,
    RefundType,
    RefundMethod,
    RefundReason,
} from "@services/accounting/refunds";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import dayjs from "dayjs";
import RefundFormDrawer from "./RefundFormDrawer";
import RefundDetailDrawer from "./RefundDetailDrawer";

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const STATUS_CONFIG: Record<RefundStatus, { color: string; label: string }> = {
    Pending: { color: "processing", label: "Pending" },
    Approved: { color: "warning", label: "Approved" },
    Processed: { color: "success", label: "Processed" },
    Voided: { color: "default", label: "Voided" },
};

const REFUND_TYPE_CONFIG: Record<RefundType, { color: string; label: string }> = {
    Full: { color: "red", label: "Full" },
    Partial: { color: "orange", label: "Partial" },
    Exchange: { color: "blue", label: "Exchange" },
};

const RefundsListPage: React.FC = () => {
    const queryClient = useQueryClient();
    const actionRef = useRef<ActionType>();
    const { modal } = App.useApp();
    const [form] = Form.useForm();

    const [activeStatus, setActiveStatus] = useState<RefundStatus | "ALL">("ALL");
    const [page, setPage] = useState(1);
    const [formOpen, setFormOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
    const [editingRefund, setEditingRefund] = useState<Refund | null>(null);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["refunds", activeStatus, page],
        queryFn: () =>
            getAllRefunds({
                status: activeStatus === "ALL" ? undefined : activeStatus,
                page,
                limit: 20,
                ...form.getFieldsValue(),
            }),
        keepPreviousData: true,
    });

    const { data: summaryData } = useQuery({
        queryKey: ["refund-summary"],
        queryFn: () => getRefundSummary(),
    });

    const approveMutation = useMutation({
        mutationFn: approveRefund,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["refunds"] });
            queryClient.invalidateQueries({ queryKey: ["refund-summary"] });
        },
    });

    const processMutation = useMutation({
        mutationFn: processRefund,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["refunds"] });
            queryClient.invalidateQueries({ queryKey: ["refund-summary"] });
        },
    });

    const voidMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => 
            voidRefund(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["refunds"] });
            queryClient.invalidateQueries({ queryKey: ["refund-summary"] });
        },
    });

    const handleApprove = (record: Refund) => {
        modal.confirm({
            title: "Approve this refund?",
            content: `This will approve the refund of KES ${record.refund_total.toLocaleString()} for ${record.customer_name}`,
            okText: "Approve",
            onOk: () => approveMutation.mutateAsync(record._id),
        });
    };

    const handleProcess = (record: Refund) => {
        modal.confirm({
            title: "Process this refund?",
            content: `This will mark the refund as processed and initiate the refund payment of KES ${record.refund_total.toLocaleString()}`,
            okText: "Process Refund",
            onOk: () => processMutation.mutateAsync(record._id),
        });
    };

    const handleVoid = (record: Refund) => {
        let reason = "";
        modal.confirm({
            title: "Void this refund?",
            okText: "Void Refund",
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
                        content: "Please provide a reason for voiding this refund.",
                    });
                    return Promise.reject();
                }
                return voidMutation.mutateAsync({ id: record._id, reason });
            },
        });
    };

    const openDetail = (record: Refund) => {
        setSelectedRefund(record);
        setDetailOpen(true);
    };

    const openEdit = (record: Refund) => {
        setEditingRefund(record);
        setFormOpen(true);
    };

    const onSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["refunds"] });
        queryClient.invalidateQueries({ queryKey: ["refund-summary"] });
        setFormOpen(false);
        setEditingRefund(null);
    }, [queryClient]);

    const columns = [
        {
            title: "Refund No",
            dataIndex: "refund_no",
            key: "refund_no",
            width: 150,
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: "Date",
            dataIndex: "refund_date",
            key: "refund_date",
            width: 120,
            render: (date: string) => dayjs(date).format("DD MMM YYYY"),
        },
        {
            title: "Type",
            dataIndex: "refund_type",
            key: "refund_type",
            width: 100,
            render: (type: RefundType) => (
                <Tag color={REFUND_TYPE_CONFIG[type].color}>
                    {REFUND_TYPE_CONFIG[type].label}
                </Tag>
            ),
        },
        {
            title: "Customer",
            dataIndex: "customer_name",
            key: "customer_name",
            width: 150,
            render: (name: string, record: Refund) => (
                <div>
                    <Text strong>{name}</Text>
                    {record.customer_contact && (
                        <div>
                            <Text type="secondary" style={{ fontSize: "12px" }}>
                                {record.customer_contact}
                            </Text>
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: "Original Invoice",
            dataIndex: "original_invoice_no",
            key: "original_invoice_no",
            width: 150,
            render: (invoiceNo: string) => (
                <Space>
                    <FileTextOutlined />
                    <Text>{invoiceNo}</Text>
                </Space>
            ),
        },
        {
            title: "Reason",
            dataIndex: "refund_reason",
            key: "refund_reason",
            width: 120,
            render: (reason: RefundReason) => <Tag>{reason.replace("_", " ")}</Tag>,
        },
        {
            title: "Refund Amount",
            dataIndex: "refund_total",
            key: "refund_total",
            width: 120,
            align: "right" as const,
            render: (amount: number) => (
                <Text strong style={{ color: "#ff4d4f" }}>
                    KES {amount.toLocaleString()}
                </Text>
            ),
        },
        {
            title: "Refund Method",
            dataIndex: "refund_method",
            key: "refund_method",
            width: 120,
            render: (method: RefundMethod) => <Tag>{method.replace("_", " ")}</Tag>,
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 100,
            render: (status: RefundStatus) => (
                <Badge
                    status={STATUS_CONFIG[status].color as any}
                    text={STATUS_CONFIG[status].label}
                />
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 180,
            render: (record: Refund) => (
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
                    {record.status === "Approved" && (
                        <Tooltip title="Process">
                            <Button
                                type="text"
                                icon={<SwapOutlined />}
                                onClick={() => handleProcess(record)}
                            />
                        </Tooltip>
                    )}
                    {record.status !== "Voided" && (
                        <Tooltip title="Void">
                            <Popconfirm
                                title="Void this refund?"
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
                            title="Total Refunds"
                            value={summaryData?.summary?.reduce((sum, item) => sum + item.count, 0) || 0}
                            valueStyle={{ color: "#1890ff" }}
                            suffix={<SwapOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Refund Amount"
                            value={summaryData?.summary?.reduce((sum, item) => sum + item.total_amount, 0) || 0}
                            precision={2}
                            prefix="KES"
                            valueStyle={{ color: "#ff4d4f" }}
                            suffix={<DollarOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Pending Refunds"
                            value={summaryData?.summary?.find(s => s._id === "Pending")?.count || 0}
                            valueStyle={{ color: "#fa8c16" }}
                            suffix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Processed Refunds"
                            value={summaryData?.summary?.find(s => s._id === "Processed")?.count || 0}
                            valueStyle={{ color: "#52c41a" }}
                            suffix={<CheckCircleOutlined />}
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
                    <Form.Item name="refund_type" label="Type">
                        <Select placeholder="All Types" allowClear style={{ width: 120 }}>
                            <Option value="Full">Full</Option>
                            <Option value="Partial">Partial</Option>
                            <Option value="Exchange">Exchange</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="refund_method" label="Method">
                        <Select placeholder="All Methods" allowClear style={{ width: 150 }}>
                            <Option value="Cash">Cash</Option>
                            <Option value="M-Pesa">M-Pesa</Option>
                            <Option value="Bank_Transfer">Bank Transfer</Option>
                            <Option value="Card">Card</Option>
                            <Option value="Cheque">Cheque</Option>
                            <Option value="Store_Credit">Store Credit</Option>
                            <Option value="Original_Method">Original Method</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="refund_reason" label="Reason">
                        <Select placeholder="All Reasons" allowClear style={{ width: 150 }}>
                            <Option value="Defective">Defective</Option>
                            <Option value="Wrong Item">Wrong Item</Option>
                            <Option value="Damaged">Damaged</Option>
                            <Option value="Customer Dissatisfaction">Customer Dissatisfaction</Option>
                            <Option value="Return Policy">Return Policy</Option>
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
                onChange={(key) => setActiveStatus(key as RefundStatus | "ALL")}
                items={[
                    { key: "ALL", label: "All Refunds" },
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
            <ProTable<Refund>
                actionRef={actionRef}
                columns={columns}
                dataSource={data?.refunds || []}
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
                            setEditingRefund(null);
                            setFormOpen(true);
                        }}
                    >
                        New Refund
                    </Button>,
                ]}
            />

            {/* Drawers */}
            <RefundFormDrawer
                open={formOpen}
                setOpen={setFormOpen}
                refund={editingRefund}
                onSuccess={onSuccess}
            />
            <RefundDetailDrawer
                open={detailOpen}
                setOpen={setDetailOpen}
                refund={selectedRefund}
            />
        </div>
    );
};

export default RefundsListPage;
